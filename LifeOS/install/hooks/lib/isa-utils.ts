// isa-utils.ts -- Shared ISA functions for hooks
//
// Used by: ISASync.hook.ts (PostToolUse), and any other hook that reads or
// writes the per-session Ideal State Artifact.
//
// Functions:
//   findArtifactPath(slug)   -- prefer ISA.md, fall back to legacy PRD.md
//   findLatestISA()          -- scan MEMORY/WORK/[slug]/ISA.md (or legacy PRD.md) by mtime
//   parseFrontmatter()       -- extract YAML frontmatter to object
//   writeFrontmatterField()  -- update single field in existing frontmatter
//   countCriteria()          -- count checked/unchecked in Criteria section
//   syncToWorkJson()         -- upsert session into work.json from frontmatter
//
// Naming history: pre-v4.1.0 the artifact was called PRD ("Product Requirements
// Document") and lived at MEMORY/WORK/{slug}/PRD.md. From v4.1.0 onward the
// canonical name is ISA ("Ideal State Artifact") and the file is ISA.md. This
// module reads ISA.md first and falls back to PRD.md for sessions created
// before the rename. New sessions always write ISA.md.

import { writeFileSync, readdirSync, statSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join, basename, resolve } from 'path';
import { createHash } from 'crypto';
import { paiPath } from './paths';
import { effortToCanonicalELevel } from './effort';
import { appendWorkEvents, diffRegistry, foldToSnapshot, readLiveRegistry, workEventsPath } from './work-events';
import {
  archiveWorkRows,
  indexKeyForArtifact,
  loadPickupKnobs,
  upsertIsaEntries,
  type IsaIndexEntry,
  type IsaKind,
  type IsaEntrySource,
} from './isa-index';

// ── v6.9.0: Resume After Complete tunables ────────────────────────────────
// Constants live here per v6.9.0 doctrine "Tunable Parameters" section.
const BUMP_COMPLETE_TIME_BOUND_MS = 24 * 60 * 60 * 1000; // 24h — bumpLastToolActivity skip threshold for complete sessions
const ISA_REWORK_JSONL = paiPath('MEMORY', 'OBSERVABILITY', 'isa-rework.jsonl');

/** SHA-256 of the post-frontmatter body. Stable input for v6.9.0 B2 diff gate. */
export function hashBody(content: string): string {
  const fmMatch = content.match(/^---\n[\s\S]*?\n---\n?/);
  const body = fmMatch ? content.slice(fmMatch[0].length) : content;
  // Normalize line endings to immunize against CRLF/LF flips on save.
  const normalized = body.replace(/\r\n/g, '\n');
  return createHash('sha256').update(normalized).digest('hex');
}

/** Append one Decisions row to the body. Inserts under `## Decisions` heading,
 *  creating the section if missing. v6.9.0 invariant: every auto-rewind logs
 *  one row so the principal can audit the rewind inline. */
function appendDecisionRow(content: string, ts: string, newIteration: number): string {
  const row = `- D-auto-${ts}: Auto-resumed from complete to learn at ${ts} — iteration ${newIteration}`;
  const decisionsRe = /(\n## Decisions\n)([\s\S]*?)(\n## |\n---\n|$)/;
  const match = content.match(decisionsRe);
  if (match) {
    return content.replace(decisionsRe, `${match[1]}${match[2].trimEnd()}\n${row}\n${match[3]}`);
  }
  // No Decisions section yet — append before Changelog if present, else end.
  const changelogIdx = content.indexOf('\n## Changelog');
  const insertAt = changelogIdx > 0 ? changelogIdx : content.length;
  return content.slice(0, insertAt) + `\n## Decisions\n\n${row}\n` + content.slice(insertAt);
}

/** Append one observability event to isa-rework.jsonl. Best-effort — failure
 *  must never block the sync. */
function appendISAReworkEvent(record: Record<string, unknown>): void {
  try {
    mkdirSync(join(paiPath('MEMORY'), 'OBSERVABILITY'), { recursive: true });
    appendFileSync(ISA_REWORK_JSONL, JSON.stringify(record) + '\n');
  } catch { /* silent — observability must not break sync */ }
}

export const WORK_DIR = paiPath('MEMORY', 'WORK');
export const WORK_JSON = paiPath('MEMORY', 'STATE', 'work.json');

// Canonical artifact filename (v4.1.0+) and the legacy fallback we still read.
export const ARTIFACT_FILENAME = 'ISA.md';
export const LEGACY_ARTIFACT_FILENAME = 'PRD.md';

/**
 * Resolve the ideal-state artifact path for a session slug.
 *
 * Read order: ISA.md (canonical) → PRD.md (legacy). Returns null if neither
 * exists. This is the SINGLE place the read fallback lives — every hook that
 * reads the per-session artifact must route through here.
 */
export function findArtifactPath(slug: string): string | null {
  const dir = join(WORK_DIR, slug);
  const isa = join(dir, ARTIFACT_FILENAME);
  if (existsSync(isa)) return isa;
  const legacy = join(dir, LEGACY_ARTIFACT_FILENAME);
  if (existsSync(legacy)) return legacy;
  return null;
}

/**
 * Scan MEMORY/WORK/* for the most recently-modified ideal-state artifact and
 * return its absolute path. Prefers ISA.md per directory, falls back to
 * legacy PRD.md.
 */
export function findLatestISA(): string | null {
  if (!existsSync(WORK_DIR)) return null;
  let latest: string | null = null;
  let latestMtime = 0;
  for (const dir of readdirSync(WORK_DIR)) {
    const candidate = findArtifactPath(dir);
    if (!candidate) continue;
    try {
      const s = statSync(candidate);
      if (s.mtimeMs > latestMtime) { latestMtime = s.mtimeMs; latest = candidate; }
    } catch {}
  }
  return latest;
}

/** @deprecated use findLatestISA — alias kept so older imports keep compiling. */
export const findLatestPRD = findLatestISA;

export function parseFrontmatter(content: string): Record<string, string> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
  }
  return fm;
}

/**
 * Frontmatter for the INDEX path — tolerant where the strict parser is not.
 *
 * `parseFrontmatter` requires the `---` block to be the very first bytes. A
 * large share of live ISAs put the H1 title first and the block underneath
 * (a seventh of the artifacts in one real tree). Under the strict
 * parser those ISAs parse to null, and any consumer that skips on null makes
 * them invisible — the exact defect this index removes. So: strict first,
 * then the first `---` fenced block in the head, accepted only if it actually
 * contains `key: value` lines (a prose horizontal rule never qualifies).
 *
 * Deliberately a SEPARATE function: the strict parser stays byte-identical for
 * ISASync and every other writer. This one only ever informs a read.
 */
export function parseFrontmatterTolerant(content: string): Record<string, string> {
  const strict = parseFrontmatter(content);
  if (strict) return strict;

  const head = content.slice(0, 4000);
  const block = head.match(/(?:^|\n)---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!block) return {};
  const fm: Record<string, string> = {};
  for (const line of block[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
  }
  return Object.keys(fm).length > 0 ? fm : {};
}

/**
 * Collapse a phase/status value to a single comparable token.
 * Live ISAs write prose statuses (`status: CLOSED — built, audited, pushed`);
 * without this every such ISA gets its own unique "phase" and no terminal check
 * can ever match. First token, lowercased, punctuation stripped.
 */
export function normalizePhase(raw: string | undefined): string {
  const first = (raw || '').trim().split(/[\s,;:—–|(]/)[0] || '';
  return first.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'unknown';
}

export function writeFrontmatterField(content: string, field: string, value: string): string {
  const fmMatch = content.match(/^(---\n)([\s\S]*?)(\n---)/);
  if (!fmMatch) return content;
  const lines = fmMatch[2].split('\n');
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(`${field}:`)) {
      lines[i] = `${field}: ${value}`;
      found = true;
      break;
    }
  }
  if (!found) lines.push(`${field}: ${value}`);
  return fmMatch[1] + lines.join('\n') + fmMatch[3] + content.slice(fmMatch[0].length);
}

// ── Criteria section parsing ──────────────────────────────────────────────
//
// One canonical regex, centralized. Matches every historical heading variant:
//   ## Criteria
//   ## ISC Criteria
//   ## IDEAL STATE CRITERIA (Verification Criteria)
//     ### Criteria               (sub-heading inside IDEAL STATE block)
// Case-insensitive. Section ends at the next `## ` (H2) heading, `---`, or EOF.
//
// The regex INCLUDES `### Criteria` so ISAs using the v4.0 template layout
// (`## IDEAL STATE CRITERIA` + `### Criteria` sub-heading) parse correctly.
export const CRITERIA_HEADING_RE =
  /^(?:##\s+(?:ISC\s+)?Criteria\b[^\n]*|##\s+IDEAL\s+STATE\s+CRITERIA\b[^\n]*|###\s+Criteria\b[^\n]*)$/im;

// Canonical heading the template emits and migrations target.
// Short, unambiguous, what most live ISAs already use.
export const CANONICAL_CRITERIA_HEADING = '## ISC Criteria';

// Returns the criteria-section body (without the heading line), or null if no
// recognized heading was found. Used by both countCriteria and parseCriteriaList
// so they stay in lockstep.
export function extractCriteriaSection(content: string): string | null {
  const headingMatch = CRITERIA_HEADING_RE.exec(content);
  if (!headingMatch || headingMatch.index === undefined) return null;
  const startOfBody = headingMatch.index + headingMatch[0].length;
  const rest = content.slice(startOfBody);
  // End at the next H2 (`## ` but not `### `), a YAML doc terminator, or EOF.
  const endMatch = rest.match(/\n##\s+(?!#)|\n---\s*\n/);
  const body = endMatch ? rest.slice(0, endMatch.index) : rest;
  return body;
}

export function countCriteria(content: string): { checked: number; total: number } {
  const body = extractCriteriaSection(content);
  if (body === null) return { checked: 0, total: 0 };
  const lines = body.split('\n').filter(l => l.match(/^- \[[ x]\]/));
  const checked = lines.filter(l => l.startsWith('- [x]')).length;
  return { checked, total: lines.length };
}

// ── Backlog section ───────────────────────────────────────────────────────

/**
 * The `## Remaining Work` section — the sanctioned per-ISA backlog. Returns
 * whether the section exists and how many `- [ ]` items are still open inside
 * it. Section
 * ends at the next H2, a YAML terminator, or EOF — same boundary rule as
 * extractCriteriaSection, so the two stay in lockstep.
 */
export function remainingWorkSection(content: string): { present: boolean; open: number } {
  const m = content.match(/^#{2,3}\s+Remaining\s+Work\b[^\n]*$/im);
  if (!m || m.index === undefined) return { present: false, open: 0 };
  const rest = content.slice(m.index + m[0].length);
  const end = rest.match(/\n##\s+(?!#)|\n---\s*\n/);
  const body = end ? rest.slice(0, end.index) : rest;
  const open = body.split('\n').filter(l => /^\s*- \[ \]/.test(l)).length;
  return { present: true, open };
}

/**
 * Build the index entry for one ISA. SINGLE definition of "how an ISA becomes
 * a backlog-index entry" — the full sweep (IsaReconcile) and the live edit path
 * (syncToWorkJson) both go through here, so they can never drift apart.
 */
export function isaIndexEntryFrom(
  fm: Record<string, string>,
  rawIsaPath: string,
  content: string,
  opts: { kind?: IsaKind; mtimeMs?: number; source?: IsaEntrySource; strandedAfterDays?: number } = {},
): IsaIndexEntry {
  // Index entries are permanent. Resolve once, here, so a relative path from
  // any caller can never mint a malformed key or an unusable `path`.
  const isaPath = resolve(rawIsaPath);
  const nowIso = new Date().toISOString();
  const mtimeMs = opts.mtimeMs ?? (() => {
    try { return statSync(isaPath).mtimeMs; } catch { return Date.now(); }
  })();
  const ageDays = (Date.now() - mtimeMs) / 86_400_000;
  const strandedAfter = opts.strandedAfterDays ?? loadPickupKnobs().strandedAfterDays;
  const dirName = basename(join(isaPath, '..'));
  const slug = fm.slug || dirName;
  const phase = normalizePhase(fm.phase || fm.status);
  const { checked, total } = countCriteria(content);
  const rw = remainingWorkSection(content);
  // Title fallback for ISAs with no frontmatter title: the H1, which every
  // live ISA has. Keeps an unparseable ISA legible in the stalled block. The
  // `ISA — ` / `PRD — ` prefix is noise once the surface says "ISA".
  const h1 = content.match(/^#\s+(.+?)\s*$/m)?.[1]?.replace(/^(?:ISA|PRD)\s*[—–-]\s*/i, '');
  // `task:` holds an external tracker code as often as a title (`task: 359`).
  // A bare number is a reference, never a name — read it as the reference.
  // An instance wired to an issue tracker can name it explicitly with
  // `task_ref:` / `project_ref:`; both are optional everywhere.
  const taskRaw = (fm.task || '').trim();
  const taskIsCode = /^\d+$/.test(taskRaw);
  const threadRaw = (fm.thread || '').trim();
  const cardCode = fm.task_ref || fm.card
    || (taskIsCode ? taskRaw : '')
    || (/^\d+$/.test(threadRaw) ? threadRaw : '');

  return {
    key: indexKeyForArtifact(isaPath),
    kind: opts.kind ?? (isaPath.includes('/LIFEOS/TOOLS/') ? 'tool' : 'work'),
    slug,
    title: fm.title || (taskIsCode ? '' : taskRaw) || h1 || slug.replace(/-/g, ' '),
    artifact: basename(isaPath),
    path: isaPath,
    phase,
    checked,
    total,
    unchecked: Math.max(0, total - checked),
    remainingWork: rw.present,
    remainingOpen: rw.open,
    taskRef: cardCode || undefined,
    projectRef: fm.project_ref || undefined,
    stranded: phase === 'verify' && ageDays > strandedAfter ? true : undefined,
    lastTouched: new Date(mtimeMs).toISOString(),
    firstIndexed: nowIso,
    lastIndexed: nowIso,
    source: opts.source ?? 'sync',
  };
}

export interface ModeTransition {
  mode: 'minimal' | 'native' | 'algorithm';
  startedAt: number;       // epoch ms
  endedAt?: number;        // undefined = current
}

export interface RatingPulse {
  value: number;           // 1-10
  timestamp: number;       // epoch ms
  message?: string;        // the short message that triggered it (optional, max 32 chars)
}

export interface AgentEntry {
  name: string;
  agentType: string;
  status: 'active' | 'idle' | 'completed';
  task?: string;
  phase: string;  // Which phase the agent was spawned in
}

export interface SessionEntry {
  isa?: string;
  /** @deprecated use `isa` — kept for sessions written before v4.1.0 */
  prd?: string;
  task: string;
  sessionName?: string;
  sessionUUID?: string;
  phase: string;
  progress: string;
  effort: string;
  mode: string;
  started: string;
  updatedAt: string;
  criteria?: CriterionEntry[];
  phaseHistory?: any[];
  iteration?: number;
  // Mode transition tracking
  currentMode?: 'minimal' | 'native' | 'algorithm';
  modeHistory?: ModeTransition[];
  // MINIMAL session tracking
  ratings?: RatingPulse[];
  minimalCount?: number;
  // Enriched pipeline data
  capabilities?: string[];      // Skills/capabilities selected for this session
  agents?: AgentEntry[];        // Agents active in this session
}

export interface CriterionEntry {
  id: string;
  description: string;
  type: 'criterion' | 'anti-criterion';
  status: 'pending' | 'completed';
  createdInPhase?: string;  // Phase when first added to ISA
  /**
   * Legacy category code from pre-v5.3.0 ISAs ([F]/[S]/[B]/[N]/[E]/[A]).
   * Algorithm v5.3.0 dropped bracketed category tags from the on-disk format;
   * new ISAs leave this `undefined`. Retained for backward-compat parsing of
   * historical ISAs in MEMORY/WORK/.
   */
  category?: string;
}

// ── Category tokens (legacy, pre-v5.3.0) ──────────────────────────────────
// Algorithm v5.3.0 dropped category tags from the surface format. This set is
// retained ONLY to recognize legacy bracketed letters in pre-v5.3.0 ISAs so the
// parser remains backward-compatible. New ISAs do not emit brackets — the
// criterion phrasing carries the meaning, and the two doctrinal gates
// (anti-criteria, antecedent) are now expressed as prose prefixes.
// Anything else in brackets (e.g. `[COMPLETE]`, `[DONE]`, `[WIP]`) is a status
// tag from prose, not a category — we strip it rather than capture it.
const VALID_CATEGORIES = new Set(['F', 'S', 'B', 'N', 'E', 'A']);

export function parseCriteriaList(content: string): CriterionEntry[] {
  const body = extractCriteriaSection(content);
  if (body === null) return [];
  return body.split('\n')
    .filter(l => l.match(/^- \[[ x]\]/))
    .map((line): CriterionEntry | null => {
      const checked = line.startsWith('- [x]');

      // Primary parse (Algorithm v5.3.0+): `- [x] ISC-1: description` — bare ISC ID, `:` required.
      // Backward-compat: also accepts pre-v5.3.0 bracketed format `- [x] ISC-1 [F]: description`
      // and legacy nested `- [x] ISC-1 [F][grep]: description`.
      let textMatch = line.match(/^- \[[ x]\]\s*(ISC-[\w-]+)(?:\s+\[([A-Za-z]+)\](?:\[\w+\])?)?:\s*(.*)/);

      // Fallback: no trailing `:` — e.g. `- [x] ISC-1 description` or
      // `- [x] ISC-1 [COMPLETE] description` (status word in brackets, no colon).
      // Accept the line but strip any non-category bracket tokens from the text.
      if (!textMatch) {
        const loose = line.match(/^- \[[ x]\]\s*(ISC-[\w-]+)\s+(.*)/);
        if (loose) {
          const rest = loose[2].replace(/\[[A-Za-z]+\]\s*/g, '').trim();
          if (rest.length > 0) {
            textMatch = [line, loose[1], undefined as unknown as string, rest] as RegExpMatchArray;
          }
        }
      }
      if (!textMatch) return null;

      const id = textMatch[1];
      const rawCategory = textMatch[2];
      // Only accept real category codes; drop captured status words like COMPLETE/DONE/WIP.
      const category = rawCategory && VALID_CATEGORIES.has(rawCategory.toUpperCase())
        ? rawCategory.toUpperCase()
        : undefined;
      const description = textMatch[3].trim();
      // Algorithm v5.5.0+: anti-criteria detected by `Anti:` prose prefix on the description.
      // Backward-compat: legacy ISAs (v5.3.0–v5.4.0) used `ISC-A-N` numbering; the `id.includes('-A-')`
      // fallback keeps those classified correctly. Domain-prefixed IDs like `ISC-CLI-3` are unaffected.
      const isAnti = /^Anti:\s/i.test(description) || id.includes('-A-');
      return {
        id,
        description,
        type: isAnti ? 'anti-criterion' as const : 'criterion' as const,
        status: checked ? 'completed' as const : 'pending' as const,
        category,
      };
    })
    .filter((c): c is CriterionEntry => c !== null);
}

// ── Intent/context extraction (empty-state UI fallback) ──────────────────
// When an ISA has no parseable ISCs, the dashboard still needs something
// meaningful to show on the card. In priority order:
//   1. `## Intent` section body (1–2 sentences)
//   2. `## Context` section body
//   3. H1 title line (after frontmatter)
// Returns trimmed text capped at ~280 chars.
export function extractIntentSnippet(content: string): string {
  const after = content.replace(/^---[\s\S]*?\n---\n/, '');

  // Try H2 sections in priority order.
  for (const heading of ['Intent', 'Context', 'Problem Space', 'Overview']) {
    const re = new RegExp(`^##\\s+${heading}\\s*$`, 'im');
    const m = re.exec(after);
    if (m && m.index !== undefined) {
      const rest = after.slice(m.index + m[0].length);
      const end = rest.match(/\n##\s+|\n---\s*\n/);
      const body = (end ? rest.slice(0, end.index) : rest)
        .replace(/^\s*\*[^*]*\*\s*$/gm, '')   // drop placeholder italics like `*OBSERVE.*`
        .replace(/\n{2,}/g, '\n')
        .trim();
      if (body.length > 0) {
        return body.length > 280 ? body.slice(0, 277).trimEnd() + '…' : body;
      }
    }
  }

  // Fallback: first non-empty line after H1 that isn't a heading or blockquote.
  const lines = after.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#') || line.startsWith('>')) continue;
    return line.length > 280 ? line.slice(0, 277) + '…' : line;
  }
  return '';
}

// ── Loud-fail signal for non-parseable ISAs ───────────────────────────────
// Emits one of:
//   'missing-section'   — no recognized Criteria heading at all
//   'empty-section'     — heading present, zero `- [ ]` checkbox lines
//   'all-dropped'       — checkbox lines present, ALL failed to parse (regex miss)
//   null                — healthy
// ISASync uses this to stamp `criteriaParseWarning` on the session so the
// dashboard can surface the condition visually instead of going silent.
export type CriteriaParseWarning =
  | 'missing-section'
  | 'empty-section'
  | 'all-dropped'
  | null;

export function diagnoseCriteria(content: string): CriteriaParseWarning {
  const body = extractCriteriaSection(content);
  if (body === null) return 'missing-section';
  const checkboxLines = body.split('\n').filter(l => l.match(/^- \[[ x]\]/));
  if (checkboxLines.length === 0) return 'empty-section';
  const parsed = parseCriteriaList(content);
  if (parsed.length === 0) return 'all-dropped';
  return null;
}

/**
 * Parse capabilities from ISA content.
 * The Algorithm writes a section like:
 *   🏹 CAPABILITIES SELECTED:
 *    🏹 [capability name] ...
 * Also handles inline " 🏹 CapName | reason" format.
 * Returns capability names only (stripped of reasoning text).
 */
export function parseCapabilities(content: string): string[] {
  const capabilities: string[] = [];
  const lines = content.split('\n');
  let inCapabilitiesBlock = false;
  // Wave 1 (2026-05-23): when the block is opened by a markdown header (not
  // the 🏹 emoji), bullet items don't need the 🏹 prefix — they're just normal
  // markdown bullets. This flag tells the per-line parser which mode it's in.
  let blockOpenedByHeader = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect start of capabilities block
    // Form A (legacy): `🏹 CAPABILITIES SELECTED` or `🏹 CAPABILITY SELECTED`
    if (trimmed.match(/🏹\s*CAPABILIT(?:IES|Y)\s*SELECTED/i)) {
      inCapabilitiesBlock = true;
      blockOpenedByHeader = false;
      continue;
    }
    // Form B (Wave 1): markdown header. Examples:
    //   ## Capabilities
    //   ### Capabilities Selected
    //   ## CAPABILITIES SELECTED
    // We tolerate H2/H3 and the same wording variants the legacy regex caught.
    if (trimmed.match(/^#{2,3}\s+CAPABILIT(?:IES|Y)(?:\s+SELECTED)?\s*$/i)) {
      inCapabilitiesBlock = true;
      blockOpenedByHeader = true;
      continue;
    }

    // Inside capabilities block, parse individual capability lines
    if (inCapabilitiesBlock) {
      // Blank line or new section header ends the block
      if (trimmed === '' || (trimmed.startsWith('#') && !trimmed.startsWith('##'))) {
        // Allow blank lines within the block, but a section header ends it
        if (trimmed.startsWith('#')) {
          inCapabilitiesBlock = false;
        }
        continue;
      }
      // ## or ### that ISN'T a continuation of this capabilities block also closes it.
      if (trimmed.startsWith('##')) {
        inCapabilitiesBlock = false;
        continue;
      }
      // Another non-capability line also ends the block — unless this block was
      // opened by a markdown header and the line is a normal markdown bullet.
      const looksLikeBullet = trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('+');
      if (!trimmed.includes('🏹') && !looksLikeBullet) {
        inCapabilitiesBlock = false;
        continue;
      }

      // Extract the capability text. Priority:
      //   1. `🏹 CapName ...`         (legacy emoji prefix)
      //   2. `- CapName ...`          (markdown bullet, when header-opened)
      //   3. `* CapName ...` etc.
      let capText: string | null = null;
      const emojiMatch = trimmed.match(/🏹\s+(.+)/);
      if (emojiMatch) {
        capText = emojiMatch[1].trim();
      } else if (blockOpenedByHeader && looksLikeBullet) {
        // Strip bullet marker(s) and any nested emphasis.
        capText = trimmed.replace(/^[-*+]+\s+/, '').replace(/^\*\*|\*\*$/g, '').trim();
      }
      if (!capText) continue;

      // Strip reasoning after | or — or : (same as legacy)
      capText = capText.split(/\s*[|—:]\s*/)[0].trim();
      // Skip if it's the header line text accidentally captured
      if (capText.match(/^CAPABILITIES?\s*SELECTED/i) || capText.length === 0) continue;
      // Clean up: remove leading/trailing brackets
      capText = capText.replace(/^\[|\]$/g, '').trim();
      // Real capability names are typically 1-4 words, under 50 chars
      const wordCount = capText.split(/\s+/).length;
      if (capText.length > 0 && capText.length < 50 && wordCount <= 6) {
        capabilities.push(capText);
      }
    }
  }

  return capabilities;
}

/**
 * Read subagent events for a given session UUID.
 * Uses tail approach: only reads last 200 lines to stay fast (<50ms).
 * Returns unique agents with name, type, status, task, phase.
 */
export function getSessionAgents(sessionUUID: string): AgentEntry[] {
  try {
    const eventsPath = paiPath('MEMORY', 'OBSERVABILITY', 'subagent-events.jsonl');
    if (!existsSync(eventsPath)) return [];

    // Use execSync with tail for performance — only read last 200 lines
    const { execSync } = require('child_process');
    const raw: string = execSync(`tail -200 "${eventsPath}"`, {
      encoding: 'utf-8',
      timeout: 30, // 30ms hard cap
    });

    const agents: Map<string, AgentEntry> = new Map();

    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        if (event.session_id !== sessionUUID) continue;

        // Build a unique key from subagent_id (or fallback to timestamp for unknown)
        const agentKey = event.subagent_id && event.subagent_id !== 'unknown'
          ? event.subagent_id
          : `agent-${event.timestamp}`;

        const name = event.subagent_id && event.subagent_id !== 'unknown'
          ? event.subagent_id
          : (event.prompt_preview ? event.prompt_preview.slice(0, 40) : 'Subagent');

        const agentType = event.subagent_type && event.subagent_type !== 'unknown'
          ? event.subagent_type
          : (event.subagent_model && event.subagent_model !== 'unknown' ? event.subagent_model : 'agent');

        // Determine status based on event type
        let status: 'active' | 'idle' | 'completed' = 'active';
        if (event.event === 'subagent_complete' || event.event === 'subagent_end') {
          status = 'completed';
        }

        // Infer phase from the timestamp relative to the session's phase history
        // For now, use the event type as a proxy
        const phase = event.phase || 'BUILD';

        agents.set(agentKey, {
          name,
          agentType,
          status,
          task: event.prompt_preview && event.prompt_preview.length > 0
            ? event.prompt_preview.slice(0, 80)
            : undefined,
          phase,
        });
      } catch {
        // Skip malformed lines
      }
    }

    return Array.from(agents.values());
  } catch {
    return [];
  }
}

// Pre-write baseline for diff-based event emission (2026-06-10, work-events).
// Keyed by the object identity readRegistry returned (WeakMap, not a module
// scalar) so concurrent read→write interleavings in a long-lived process each
// diff against THEIR OWN baseline — a shared slot would emit phantom diffs.
const registryBaselines = new WeakMap<object, { sessions: Record<string, any> }>();

export function readRegistry(): { sessions: Record<string, any> } {
  // Live view: derived snapshot + replay of appended-but-unfolded events.
  // Read-only — never appends, never folds.
  const live = readLiveRegistry(WORK_JSON, workEventsPath());
  registryBaselines.set(live, JSON.parse(JSON.stringify(live)));
  return live;
}

/**
 * Phases that count as "active work" for SessionEnd-time lookups. Includes
 * `complete` because a session that JUST completed in this same harness turn
 * still wants to be matched at SessionEnd (so completion hooks can act on it).
 * Excludes `native` and `starting` — those are placeholder phases.
 */
const ACTIVE_LOOKUP_PHASES = new Set([
  'observe', 'think', 'plan', 'build', 'execute', 'verify', 'learn', 'complete',
]);

/** Numeric timestamp from a session's `updatedAt` (falling back to `started`). */
function sessionAliveMs(session: Record<string, any>): number {
  const updated = Date.parse(session.updatedAt || '');
  if (Number.isFinite(updated)) return updated;
  const started = Date.parse(session.started || '');
  return Number.isFinite(started) ? started : 0;
}

/**
 * Resolve the active work-session row owned by a hook session UUID.
 *
 * Returns the {slug, session} pair from work.json whose `sessionUUID` matches
 * AND whose `phase` is in the active set, picking the most recently updated
 * row when multiple match. Returns null when no row matches.
 *
 * Replaces the legacy `current-work.json` / `current-work-${uuid}.json` lookup
 * that no hook ever wrote — the registry IS the source of truth.
 */
export function findActiveSessionByUUID(
  sessionUUID: string,
): { slug: string; session: Record<string, any> } | null {
  if (!sessionUUID) return null;
  const registry = readRegistry();
  let winner: { slug: string; session: Record<string, any>; ms: number } | null = null;
  for (const [slug, session] of Object.entries(registry.sessions) as [string, any][]) {
    if (session.sessionUUID !== sessionUUID) continue;
    if (!ACTIVE_LOOKUP_PHASES.has((session.phase || '').toLowerCase())) continue;
    const ms = sessionAliveMs(session);
    if (!winner || ms > winner.ms) winner = { slug, session, ms };
  }
  return winner ? { slug: winner.slug, session: winner.session } : null;
}

export function writeRegistry(reg: { sessions: Record<string, any> }, src?: string): void {
  mkdirSync(join(paiPath('MEMORY'), 'STATE'), { recursive: true });
  // Event-sourced write path (2026-06-10): emit field-level diff events to
  // work-events.jsonl, then fold log → snapshot under the lock. work.json is
  // now a DERIVED view — hand-edits to it are erased by the next fold.
  const writer = src || basename(process.argv[1] || '') || 'unknown';
  const baseline = registryBaselines.get(reg);
  const prev = baseline ?? readLiveRegistry(WORK_JSON, workEventsPath());
  let events = diffRegistry(prev, reg, writer);
  if (!baseline) {
    // FALLBACK BASELINE (caller wrote a registry object it didn't get from
    // readRegistry). Diffing against CURRENT live state can't distinguish
    // "deliberately removed" from "never knew about" — so suppress deletes
    // and unsets entirely (upserts only) and leave a tripwire in the log.
    // This is the advisor-flagged path most likely to eat a row otherwise.
    const suppressed = events.filter((e) => e.op === 'delete' || e.unset?.length);
    events = events
      .filter((e) => e.op !== 'delete')
      .map((e) => (e.unset?.length ? { ...e, unset: undefined } : e));
    if (suppressed.length > 0) {
      try {
        appendFileSync(
          join(paiPath('MEMORY'), 'OBSERVABILITY', 'work-anomalies.jsonl'),
          JSON.stringify({
            ts: new Date().toISOString(),
            type: 'work-events.fallback-baseline-suppressed',
            src: writer,
            suppressed: suppressed.map((e) => ({ slug: e.slug, op: e.op, unset: e.unset })),
          }) + '\n',
        );
      } catch {}
    }
  }
  if (events.length > 0) appendWorkEvents(events);
  // A lock-contended fold is safely skipped: events are durable in the log,
  // every reader replays the suffix, and the next writer folds them in.
  foldToSnapshot(WORK_JSON, workEventsPath());
  registryBaselines.set(reg, JSON.parse(JSON.stringify(reg)));
}

// ── Phase tracking (single-source: ISA frontmatter) ───────────────────────
//
// 2026-04-27: Voice phase capture was removed. ISA frontmatter is the SOLE
// writer of phaseHistory and `session.phase`. The PhaseSource type retains
// 'voice' and 'merged' for BACKWARD READ compatibility — work.json files
// written before this change still contain those values, and parsing must
// not crash on them. New writes only emit 'isa'.

export type PhaseSource = 'voice' | 'isa' | 'merged';

export interface PhaseEntry {
  phase: string;          // uppercased (OBSERVE, THINK, PLAN, BUILD, EXECUTE, VERIFY, LEARN, COMPLETE)
  startedAt: number;      // epoch ms — set when ISASync sees the new phase
  completedAt?: number;   // epoch ms — set when next phase arrives
  criteriaCount: number;  // enriched by ISASync
  agentCount: number;     // enriched by ISASync
  source?: PhaseSource;   // new entries: 'isa'. Legacy 'voice'/'merged'/'prd' parse as historical.
}

/**
 * Append a phase transition to phaseHistory with dual-source dedup.
 *
 * - Same phase, same/legacy source → no-op (duplicate guard)
 * - Same phase, different source   → upgrade source to 'merged' (voice+ISA confirmed)
 * - Different phase                → close previous (completedAt = now), push new entry
 *
 * Mutates `phaseHistory` in place AND returns it for chaining.
 * `startedAt` is set from the first source to arrive — subsequent confirmations don't overwrite.
 *
 * Legacy 'prd' source values written by older builds are treated as 'isa' for
 * dedup purposes — same semantic meaning, just renamed.
 */
export function appendPhase(
  phaseHistory: PhaseEntry[],
  newPhase: string,
  source: PhaseSource
): PhaseEntry[] {
  const upperPhase = newPhase.toUpperCase();
  const now = Date.now();
  const last = phaseHistory.length > 0 ? phaseHistory[phaseHistory.length - 1] : null;

  // Normalize legacy 'prd' source to 'isa' so old phase entries dedup cleanly
  // against new ISA-sourced ones.
  const normalize = (s: PhaseSource | undefined): PhaseSource =>
    (s as unknown as string) === 'prd' ? 'isa' : (s ?? 'isa');

  const incomingSource = normalize(source);

  if (last && last.phase === upperPhase) {
    // Same phase — dedup/upgrade
    const existingSource: PhaseSource = normalize(last.source);
    if (existingSource !== incomingSource && existingSource !== 'merged') {
      last.source = 'merged';
    }
    return phaseHistory;
  }

  // New phase transition — close previous
  if (last && !last.completedAt) {
    last.completedAt = now;
  }

  phaseHistory.push({
    phase: upperPhase,
    startedAt: now,
    criteriaCount: 0,
    agentCount: 0,
    source: incomingSource,
  });

  return phaseHistory;
}

/** Caller context for syncToWorkJson. */
export interface SyncOptions {
  /**
   * STRUCTURAL guarantee for observer callers (the IsaReconcile sweep): this
   * call will not write to the ISA file, full stop.
   *
   * Why a flag and not a gate: the v6.9.0 Resume After Complete path below
   * writes ISA frontmatter (`writeFileSync(isaPath, …)`). The sweep is a pure
   * observer and must never resurrect a session — but before this flag, every
   * reason it did not was a gate living in a DIFFERENT FILE from the write
   * (IsaReconcile's old-completed skip, and its `status !== "in-sync"` gate).
   * Any future change to those classifiers silently re-arms an artifact write
   * from a reconciler.
   *
   * Measured 2026-07-30: the resume is currently unreachable from that sweep
   * by construction, because the arming state (registry phase and frontmatter
   * phase both exactly `complete`) is the same state `classify()` calls
   * "in-sync" and skips. So this flag is defense in depth — which is the point.
   * Unreachability is an emergent property of a caller's classifier; this flag
   * is a property of the callee, and only the callee owns the write.
   *
   * Suppresses the whole resume, not just its write: no phase flip, no
   * iteration bump, no `fm` mutation, no rework event. An observer observes.
   */
  artifactReadOnly?: boolean;
}

export function syncToWorkJson(
  fm: Record<string, string>,
  isaPath: string,
  content?: string,
  sessionId?: string,
  opts: SyncOptions = {},
): void {
  if (!fm.slug) return;
  const paiDir = paiPath();
  const relativeIsa = isaPath.replace(paiDir + '/', '');
  const registry = readRegistry();

  // Wave 1 (2026-05-23): frontmatter field-name normalization. ISAs in the wild
  // use both `iteration:` and `revision:` for the per-ISA iteration counter
  // (v6.9.0 doctrine standardized on `iteration:` but older / hand-written ISAs
  // still use `revision:`). Same data, two names — without aliasing, Resume
  // After Complete never fires for `revision:`-style ISAs.
  if (!fm.iteration && fm.revision) fm.iteration = fm.revision;

  // Migration: if there's a 'starting' or 'native' placeholder entry for this session UUID,
  // remove it. ISASync replaces it with the full ISA-based entry keyed by fm.slug.
  // This prevents duplicates when Algorithm sessions initially get a lightweight entry
  // from SessionAutoName, then get a full entry from ISASync.
  if (sessionId) {
    for (const [slug, session] of Object.entries(registry.sessions) as [string, any][]) {
      if (session.sessionUUID === sessionId && (session.mode === 'starting' || session.mode === 'native') && slug !== fm.slug) {
        delete registry.sessions[slug];
        break;
      }
    }
  }

  const existing = registry.sessions[fm.slug] || {};
  let newPhase = fm.phase || 'observe';
  const timestamp = new Date().toISOString();

  // ── v6.9.0: Resume After Complete ────────────────────────────────────────
  // Edit landed on a complete ISA AND body content changed → auto-rewind to
  // phase=learn, iteration++, write-back to ISA frontmatter, append Decisions
  // row, append observability event. Frozen ISAs (frontmatter `frozen: true`)
  // bypass. Observer callers (`artifactReadOnly`) bypass structurally — this is
  // the ONLY path in this module that writes an ISA file, so the flag beside it
  // is what makes "a sweep never mutates an artifact" a property of the code
  // rather than of a gate in another file.
  const incomingBodyHash = content ? hashBody(content) : (existing.bodyHash || '');
  const isFrozen = fm.frozen === 'true' || fm.frozen === true as unknown as string;
  const bodyChanged = !existing.bodyHash || existing.bodyHash !== incomingBodyHash;
  const completeInRegistry = existing.phase === 'complete';
  const completeInFrontmatter = (fm.phase || '').toLowerCase() === 'complete';
  const shouldResume = !opts.artifactReadOnly
    && completeInRegistry && completeInFrontmatter && bodyChanged && !isFrozen && !!content;

  if (shouldResume) {
    const prevIteration = parseInt(fm.iteration as string) || existing.iteration || 1;
    const newIteration = prevIteration + 1;
    newPhase = 'learn';
    // Mutate fm so the rest of the sync sees the new state.
    fm.phase = 'learn';
    fm.iteration = String(newIteration);
    fm.resumed_at = timestamp;
    fm.resumed_from_phase = 'complete';

    // Write back to the ISA file: frontmatter fields + Decisions row.
    try {
      let updated = content;
      updated = writeFrontmatterField(updated, 'phase', 'learn');
      updated = writeFrontmatterField(updated, 'iteration', String(newIteration));
      updated = writeFrontmatterField(updated, 'resumed_at', timestamp);
      updated = writeFrontmatterField(updated, 'resumed_from_phase', 'complete');
      updated = appendDecisionRow(updated, timestamp, newIteration);
      writeFileSync(isaPath, updated);
    } catch (err) {
      console.error('[ISASync] resume write-back failed:', err);
      // Continue with sync anyway — work.json mutation still helps the dashboard.
    }

    appendISAReworkEvent({
      ts: timestamp,
      session_id: sessionId || existing.sessionUUID || null,
      slug: fm.slug,
      algo_version: '6.9.0',
      prev_phase: 'complete',
      new_phase: 'learn',
      prev_iteration: prevIteration,
      new_iteration: newIteration,
      trigger_kind: 'edit',
      body_delta_bytes: content ? content.length - (existing.lastBodySize || 0) : 0,
      had_legacy_bodyhash: !existing.bodyHash,
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Frontmatter is authoritative for sessionName. The session-names.json file
  // is keyed by the harness conversation UUID, which can span multiple Algorithm
  // runs / multiple ISAs; reading it here clobbered the ISA's own sessionName
  // with the most-recent Haiku-derived prompt title. session-names.json remains
  // in use by PromptProcessing for the Pulse tab title — just not here.
  //
  // Wave 1 (2026-05-23): fallback chain extended to derive a sessionName from
  // fm.task / fm.title when no explicit sessionName is present. Previously most
  // ISA sessions wrote `sessionName: null` to work.json because Algorithm
  // scaffolds rarely emit an explicit sessionName field; the dashboard then
  // showed bare slugs instead of human-readable titles.
  const sessionName =
    fm.sessionName ||
    existing.sessionName ||
    fm.task ||
    fm.title ||
    '';

  // Build phaseHistory via shared appendPhase utility (dual-source aware)
  const phaseHistory: PhaseEntry[] = existing.phaseHistory || [];
  appendPhase(phaseHistory, newPhase, 'isa');

  // Parse criteria from ISA content if available, with createdInPhase tracking
  const currentPhaseUpper = newPhase.toUpperCase();
  let criteria: CriterionEntry[];
  let criteriaParseWarning: CriteriaParseWarning = null;
  if (content) {
    const freshCriteria = parseCriteriaList(content);
    criteriaParseWarning = diagnoseCriteria(content);

    // Loud-fail: non-empty ISA with no parseable criteria is a bug signal.
    // Per feedback_loud_fail_env_token_lookup: critical lookups must emit
    // stderr on miss; never silently no-op. Same principle here.
    if (criteriaParseWarning) {
      const reason = {
        'missing-section': 'no `## ISC Criteria` / `## Criteria` / `## IDEAL STATE CRITERIA` heading found',
        'empty-section':   'criteria heading present but no `- [ ]` / `- [x]` lines inside it',
        'all-dropped':     'checkbox lines present but all failed to parse (regex miss — investigate line format)',
      }[criteriaParseWarning];
      console.error(`[ISASync] criteriaParseWarning=${criteriaParseWarning} slug=${fm.slug} isa=${relativeIsa}: ${reason}`);
    }

    const existingCriteria: CriterionEntry[] = existing.criteria || [];
    // Build lookup of existing criteria by id to preserve createdInPhase
    const existingById = new Map<string, CriterionEntry>();
    for (const c of existingCriteria) {
      existingById.set(c.id, c);
    }
    // Merge: preserve createdInPhase for known criteria, set current phase for new ones
    criteria = freshCriteria.map(c => {
      const prev = existingById.get(c.id);
      return {
        ...c,
        createdInPhase: prev?.createdInPhase || currentPhaseUpper,
        category: c.category || prev?.category,
      };
    });

    // Wave 1 (2026-05-23): loud-fail when frontmatter `progress: X/Y` disagrees
    // with the body checkbox count. The ISA has two ways to express completion
    // (frontmatter progress field + body checkbox status) and the prior parser
    // silently preferred body checkboxes — so when an Algorithm wrote
    // `progress: 32/32` in frontmatter without ticking the body boxes (a
    // common pattern at LEARN/COMPLETE phases), the dashboard rendered 0/32.
    // We don't fix the conflict here (that's an ISA author decision), but we
    // surface it so the principal sees the drift.
    if (fm.progress) {
      const fmMatch = fm.progress.match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
      if (fmMatch) {
        const fmDone = parseInt(fmMatch[1], 10);
        const fmTotal = parseInt(fmMatch[2], 10);
        const bodyDone = criteria.filter(c => c.status === 'completed').length;
        const bodyTotal = criteria.length;
        const totalMismatch = fmTotal !== bodyTotal;
        const doneMismatch = fmDone !== bodyDone;
        if (totalMismatch || doneMismatch) {
          console.error(
            `[ISASync] progressMismatch slug=${fm.slug} ` +
            `frontmatter=${fmDone}/${fmTotal} body=${bodyDone}/${bodyTotal} ` +
            `isa=${relativeIsa}: frontmatter and body disagree — one is stale`,
          );
        }
      }
    }
  } else {
    criteria = existing.criteria || [];
    criteriaParseWarning = existing.criteriaParseWarning ?? null;
  }

  // Update criteriaCount on current phase entry
  if (phaseHistory.length > 0) {
    phaseHistory[phaseHistory.length - 1].criteriaCount = criteria.length;
  }

  // Parse capabilities from ISA content
  const capabilities: string[] = content
    ? parseCapabilities(content)
    : (existing.capabilities || []);

  // Get agents from subagent-events.jsonl for this session
  const resolvedSessionId = sessionId || existing.sessionUUID;
  const agents: AgentEntry[] = resolvedSessionId
    ? getSessionAgents(resolvedSessionId)
    : (existing.agents || []);

  // Update agentCount on current phase entry
  if (phaseHistory.length > 0) {
    phaseHistory[phaseHistory.length - 1].agentCount = agents.length;
  }

  // Track mode transitions: ISASync always means 'algorithm' mode
  const existingModeHistory: ModeTransition[] = existing.modeHistory || [];
  const existingCurrentMode: string = existing.currentMode || '';
  const newCurrentMode: 'minimal' | 'native' | 'algorithm' = 'algorithm';

  if (existingCurrentMode !== newCurrentMode) {
    // Close previous mode entry if open
    if (existingModeHistory.length > 0) {
      const last = existingModeHistory[existingModeHistory.length - 1];
      if (!last.endedAt) last.endedAt = Date.now();
    }
    // Push new mode transition
    existingModeHistory.push({ mode: newCurrentMode, startedAt: Date.now() });
  } else if (existingModeHistory.length === 0) {
    // First time — initialize with algorithm
    existingModeHistory.push({ mode: newCurrentMode, startedAt: Date.now() });
  }

  // Intent snippet — UI fallback when no criteria render on the current phase.
  const intent = content ? extractIntentSnippet(content) : (existing.intent || '');

  // Derive task from frontmatter OR the H1 title line OR the existing task.
  // Algorithm ISAs use `title:` not `task:`; keep backward compat.
  const taskValue = fm.task || fm.title || existing.task || '';

  registry.sessions[fm.slug] = {
    isa: relativeIsa,
    task: taskValue,
    sessionName: sessionName || undefined,
    sessionUUID: sessionId || existing.sessionUUID || undefined,
    phase: newPhase,
    progress: fm.progress || '0/0',
    effort: effortToCanonicalELevel(fm.effort),
    mode: fm.mode || 'interactive',
    started: fm.started || timestamp,
    updatedAt: timestamp,
    criteria,
    phaseHistory,
    currentMode: newCurrentMode,
    modeHistory: existingModeHistory,
    ratings: existing.ratings || [],
    minimalCount: existing.minimalCount || 0,
    capabilities: capabilities.length > 0 ? capabilities : undefined,
    agents: agents.length > 0 ? agents : undefined,
    intent: intent || undefined,
    criteriaParseWarning: criteriaParseWarning || undefined,
    ...(fm.iteration ? { iteration: parseInt(fm.iteration) || 1 } : {}),
    // v6.9.0: body diff gate for Resume After Complete (B2).
    ...(incomingBodyHash ? { bodyHash: incomingBodyHash, lastBodySize: content ? content.length : 0 } : {}),
    ...(fm.resumed_at ? { resumedAt: fm.resumed_at } : {}),
    ...(fm.resumed_from_phase ? { resumedFromPhase: fm.resumed_from_phase } : {}),
    ...(fm.frozen ? { frozen: true } : {}),
  };

  // ── Expiry moves rows INTO the index, never into the void ──
  //
  // Cleanup against unbounded growth. Thresholds are read against the newer of
  // `lastToolActivity` and `updatedAt` so idle tabs (no tool calls) eventually
  // age out even if prompts still bump updatedAt.
  //
  // Wave 1 (2026-05-23): lifted from 30min/2h/2h → 4h/24h/7d. The prior
  // thresholds were quietly deleting sessions the principal wanted to resume
  // (e.g. a learn-phase session from 24h ago was GONE from work.json, so the
  // dashboard had nothing to render). The index closes the class instead of
  // loosening again: work.json stays a bounded VIEW at these windows, and every
  // evicted row is first archived to the persistent backlog index. The windows
  // are now knobs (settings `isaPickup.workJson`); the index has no window.
  //
  // FAIL-SAFE: a row is deleted only after its archive write SUCCEEDS. If the
  // index write is skipped (lock contention, I/O), the eviction is deferred to
  // the next sync — a row never leaves memory because a write lost a race.
  const wj = loadPickupKnobs().workJson;
  const now = Date.now();
  const nativeStartingMs = wj.nativeStartingHours * 60 * 60 * 1000;
  const completeMs = wj.completeHours * 60 * 60 * 1000;
  const defaultMs = wj.defaultDays * 24 * 60 * 60 * 1000;

  const evictions: Array<{ slug: string; session: Record<string, any> }> = [];

  for (const [slug, session] of Object.entries(registry.sessions) as [string, any][]) {
    const updatedMs = new Date(session.updatedAt || session.started || 0).getTime();
    const toolMs = session.lastToolActivity ? new Date(session.lastToolActivity).getTime() : 0;
    const lastAlive = Math.max(updatedMs, toolMs);
    const age = now - lastAlive;
    const phase = (session.phase || '').toLowerCase();

    const expired =
      (phase === 'native' || phase === 'starting') ? age > nativeStartingMs
      : phase === 'complete' ? age > completeMs
      : age > defaultMs;

    if (expired) evictions.push({ slug, session });
  }

  // Cap the view at the most recent N sessions. Overflow rows are evicted on
  // the same archive-then-delete contract as the TTL rows above.
  const remaining = (Object.entries(registry.sessions) as [string, any][])
    .filter(([slug]) => !evictions.some(e => e.slug === slug));
  if (remaining.length > wj.capRows) {
    remaining.sort((a, b) => {
      const aTime = new Date(a[1].updatedAt || a[1].started || 0).getTime();
      const bTime = new Date(b[1].updatedAt || b[1].started || 0).getTime();
      return bTime - aTime; // newest first
    });
    for (const [slug, session] of remaining.slice(wj.capRows)) {
      evictions.push({ slug, session });
    }
  }

  if (evictions.length > 0) {
    // archiveWorkRows returns true when every row that carries recoverable
    // memory is in the index (or when none of them did — placeholder rows).
    const archived = archiveWorkRows(evictions);
    if (archived) {
      for (const { slug } of evictions) delete registry.sessions[slug];
    } else {
      // A row leaves work.json only after it is retrievable from the index.
      // The two exceptions are named where they live (isa-index.ts header):
      // placeholder rows carry no memory, and with the index disabled there is
      // nothing to archive into. Everything else defers.
      //
      // A partial rule ("evict it anyway if its ISA file still exists") would be
      // safe in practice but makes the invariant conditional on a sweep that may
      // not run, and an invariant you cannot state plainly is one nobody can
      // verify.
      //
      // COST, HONESTLY: work.json may exceed its cap while the index is
      // unwritable. If the cause is transient (a writer holding the lock, a full
      // disk that clears) the next sync drains the backlog. If it is PERMANENT —
      // an invalid configured destination, a read-only volume, corruption that
      // cannot be quarantined, or a lock left behind by a writer that died — then
      // nothing drains it and work.json grows until the cause is fixed. That is
      // deliberate: unbounded growth is recoverable, deleted memory is not.
      //
      // WHERE TO LOOK. isa-index logs permanent I/O causes here, distinctly. It
      // does NOT log ordinary lock contention, which is expected and would be
      // noise on every contended sync — a lock held long enough to matter is
      // reported instead on the SessionStart ACTIVE WORK banner
      // (isa-index stuckLockNotice), which names the owner and the manual clear.
      console.error(`[ISASync] index archive skipped — deferring eviction of ${evictions.length} work.json row(s); if no isa-index diagnostic accompanies this, the index lock is held — a stuck one is reported on the next SessionStart banner`);
    }
  }

  // UUID-collision detection — surface when multiple ISA-mode rows share one
  // sessionUUID. ISA-mode = mode !== 'native' && mode !== 'starting'. Native
  // and starting rows legitimately share the harness UUID with their ISA
  // counterpart, so they are excluded. Native sessions themselves use the
  // deterministic slug `native-${UUID}` and cannot collide.
  // Best-effort observability — failure here MUST NOT break the sync.
  try {
    const uuidSlugs = new Map<string, string[]>();
    for (const [slug, session] of Object.entries(registry.sessions) as [string, any][]) {
      if (!session.sessionUUID) continue;
      if (session.mode === 'native' || session.mode === 'starting') continue;
      const slugs = uuidSlugs.get(session.sessionUUID) || [];
      slugs.push(slug);
      uuidSlugs.set(session.sessionUUID, slugs);
    }

    const collisionGroups = Array.from(uuidSlugs.entries()).filter(([, slugs]) => slugs.length >= 2);
    if (collisionGroups.length > 0) {
      const observabilityDir = join(paiPath('MEMORY'), 'OBSERVABILITY');
      mkdirSync(observabilityDir, { recursive: true });
      for (const [uuid, slugs] of collisionGroups) {
        console.error('[work-anomaly] UUID collision', uuid, '→', slugs.join(', '));
        appendFileSync(join(observabilityDir, 'work-anomalies.jsonl'), JSON.stringify({
          ts: new Date().toISOString(),
          kind: 'uuid-collision',
          uuid,
          slugs,
        }) + '\n');
      }
    }
  } catch { /* silent — observability must not break sync */ }

  writeRegistry(registry);

  // Live index upsert. Every ISA edit refreshes this ISA's entry in
  // the persistent backlog index, so anything actively worked on is current
  // there without waiting for the next full sweep. Best-effort: the index is a
  // read-optimized memory surface, and the ISA file on disk (which the sweep
  // re-reads) is ground truth — a failure here must never break the sync.
  try {
    if (content && loadPickupKnobs().enabled) {
      upsertIsaEntries([isaIndexEntryFrom(fm, isaPath, content, { source: 'sync' })]);
    }
  } catch { /* silent — index capture must not break sync */ }
}

/**
 * Bump `lastToolActivity` on the slug whose ISA file the tool actually touched.
 *
 * Debounced 30s (see BUMP_DEBOUNCE_MS in `bumpLastToolActivityBySlug`).
 *
 * Replaces the prior UUID-scan version (which picked "best by UUID match" and
 * kept stale sessions artificially alive whenever the conversation UUID
 * collided across Algorithm runs). Bump is now strictly path-derived: if the
 * tool's `file_path` resolves to `MEMORY/WORK/<slug>/...`, bump that slug;
 * otherwise no-op.
 */
const BUMP_DEBOUNCE_MS = 30 * 1000;

/**
 * Map a filesystem path to the work-session slug that owns it, or null if the
 * path doesn't live under any session's work dir.
 */
export function slugFromPath(filePath: string): string | null {
  if (!filePath) return null;
  const workDir = paiPath('MEMORY', 'WORK') + '/';
  if (!filePath.startsWith(workDir)) return null;
  const rest = filePath.slice(workDir.length);
  const slug = rest.split('/')[0];
  return slug || null;
}

export function bumpLastToolActivity(filePath: string): boolean {
  const slug = slugFromPath(filePath);
  if (!slug) return false;
  return bumpLastToolActivityBySlug(slug);
}

/**
 * v6.9.0: Bump `lastToolActivity` by slug (not by sessionUUID). Used by the
 * Read-trigger path in ISASync — a fresh session UUID reading an ISA still
 * registers as a heartbeat for that ISA's slug. Also rebinds `sessionUUID`
 * to the current session and collapses any orphan placeholder native rows
 * that shared the new UUID.
 *
 * Returns true if a bump was written.
 */
export function bumpLastToolActivityBySlug(slug: string, sessionUUID?: string): boolean {
  if (!slug) return false;
  try {
    const registry = readRegistry();
    const session = registry.sessions[slug];
    if (!session) return false;

    // Skip only if complete AND genuinely stale (mirror bumpLastToolActivity).
    if (session.phase === 'complete') {
      const updMs = new Date(session.updatedAt || session.started || 0).getTime();
      if (Date.now() - updMs > BUMP_COMPLETE_TIME_BOUND_MS) return false;
    }

    // Debounce against last bump.
    const current = session.lastToolActivity;
    if (current) {
      const currentMs = new Date(current).getTime();
      if (Date.now() - currentMs < BUMP_DEBOUNCE_MS) return false;
    }

    session.lastToolActivity = new Date().toISOString();

    // Rebind sessionUUID + collapse placeholder for the current session.
    if (sessionUUID && session.sessionUUID !== sessionUUID) {
      session.sessionUUID = sessionUUID;
      for (const [otherSlug, other] of Object.entries(registry.sessions) as [string, any][]) {
        if (otherSlug === slug) continue;
        if (other.sessionUUID === sessionUUID && (other.mode === 'starting' || other.mode === 'native')) {
          delete registry.sessions[otherSlug];
        }
      }
    }

    writeRegistry(registry);
    return true;
  } catch {
    return false;
  }
}

/** Update sessionName in work.json for a NATIVE session by UUID.
 *  Called by SessionAutoName when the Haiku-derived label upgrades the fallback.
 *  ISA-owned sessions are skipped — their sessionName comes from frontmatter,
 *  not from the per-prompt autonamer (which would cross-pollinate across the
 *  multiple ISAs that can share one conversation UUID). */
export function updateSessionNameInWorkJson(sessionUUID: string, sessionName: string): void {
  try {
    const registry = readRegistry();
    let bestSlug: string | null = null;
    let bestTime = 0;
    for (const [slug, session] of Object.entries(registry.sessions) as [string, any][]) {
      if (session.sessionUUID !== sessionUUID) continue;
      if (session.phase === 'complete') continue;
      // Native/starting only — never overwrite an ISA session's sessionName.
      if (session.mode !== 'native' && session.mode !== 'starting') continue;
      const t = new Date(session.updatedAt || session.started || 0).getTime();
      if (t > bestTime) { bestTime = t; bestSlug = slug; }
    }
    if (bestSlug) {
      registry.sessions[bestSlug].sessionName = sessionName;
      registry.sessions[bestSlug].updatedAt = new Date().toISOString();
      writeRegistry(registry);
    }
  } catch {}
}

/**
 * Upsert a session into work.json — handles BOTH native and algorithm modes.
 * Called by PromptProcessing on first prompt for ALL sessions.
 *
 * For native mode: phase='native', stays as-is (updated by subsequent prompts).
 * For algorithm mode: phase='starting', replaced by ISASync when ISA.md is written.
 *
 * On subsequent prompts, only updates `updatedAt` to keep the session "alive".
 * Tracks mode transitions via currentMode and modeHistory.
 */
export function upsertSession(sessionUUID: string, sessionName: string, task: string, mode: 'native' | 'starting' = 'native', currentMode?: 'minimal' | 'native' | 'algorithm'): void {
  try {
    const registry = readRegistry();
    const timestamp = new Date().toISOString();

    // Derive currentMode from the legacy mode param if not explicitly provided
    const resolvedMode: 'minimal' | 'native' | 'algorithm' = currentMode || (mode === 'starting' ? 'algorithm' : 'native');

    // Check if this UUID already has ANY non-complete entry. ISA sessions
    // (mode='normal'/'interactive') are authoritative — if one exists, just
    // bump updatedAt on it and bail so PromptProcessing doesn't create a
    // duplicate native row that splits tool-activity bumps.
    let existingSlug: string | null = null;
    let existingISASlug: string | null = null;
    for (const [slug, session] of Object.entries(registry.sessions) as [string, any][]) {
      if (session.sessionUUID !== sessionUUID) continue;
      if (session.phase === 'complete') continue;
      if (session.mode === 'native' || session.mode === 'starting') {
        existingSlug = slug;
      } else {
        existingISASlug = slug;
      }
    }

    if (existingISASlug && !existingSlug) {
      // An ISA session already owns this UUID — bail out so we don't create
      // a duplicate native row. Do NOT bump updatedAt: aliveness is driven by
      // real tool activity on the ISA's slug (via bumpLastToolActivityBySlug
      // / syncToWorkJson), not by every user prompt. Bumping here was what
      // kept stale ISA sessions phantom-active in the Pulse Observe column.
      return;
    }

    if (existingSlug) {
      const session = registry.sessions[existingSlug];
      // Session exists — bump updatedAt
      session.updatedAt = timestamp;
      if (sessionName) session.sessionName = sessionName;

      // Track mode transition if mode changed.
      // 2026-05-24 (realtime-phase-tracking): one-way upgrade for `algorithm`.
      // When TheRouter's classifier already declared this session as
      // currentMode='algorithm', PromptProcessing's local `isNativeMode` regex
      // must NOT silently downgrade it back to 'native' a tick later. The
      // classifier is authoritative; this guard preserves its decision.
      // 2026-07-01: the LEGITIMATE algorithm→native downgrade is recorded by
      // TheRouter (the authoritative classifier) via markSessionNative() —
      // this guard only blocks PromptProcessing's WEAK regex, never the classifier.
      const prevMode = session.currentMode || (session.mode === 'starting' ? 'algorithm' : 'native');
      const isDowngradeFromAlgorithm = prevMode === 'algorithm' && resolvedMode === 'native';
      if (prevMode !== resolvedMode && !isDowngradeFromAlgorithm) {
        const modeHistory: ModeTransition[] = session.modeHistory || [];
        // Close previous mode entry
        if (modeHistory.length > 0) {
          const last = modeHistory[modeHistory.length - 1];
          if (!last.endedAt) last.endedAt = Date.now();
        }
        modeHistory.push({ mode: resolvedMode, startedAt: Date.now() });
        session.modeHistory = modeHistory;
        session.currentMode = resolvedMode;
      } else if (!session.currentMode) {
        // Initialize currentMode if missing
        session.currentMode = resolvedMode;
        if (!session.modeHistory || session.modeHistory.length === 0) {
          session.modeHistory = [{ mode: resolvedMode, startedAt: Date.now() }];
        }
      }
    } else {
      // New session — create lightweight entry.
      // Native mode uses a deterministic slug (`native-${sessionUUID}`) so a
      // single harness UUID produces exactly one native row no matter how many
      // PromptProcessing calls fire across the session's life. Without this,
      // each prompt minted a fresh `${datePrefix}_${taskSlug}` row and the
      // dashboard accumulated duplicate native entries per session.
      // Algorithm-mode ('starting') keeps the date-prefixed slug because
      // ISASync immediately rewrites the row to the ISA's real slug on the
      // first phase write, so collision is not a concern there.
      let slug: string;
      if (mode === 'native') {
        slug = `native-${sessionUUID}`;
      } else {
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const datePrefix = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}00`;
        const taskSlug = (task || sessionName || 'session')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 40);
        slug = `${datePrefix}_${taskSlug}`;
      }

      registry.sessions[slug] = {
        task: task || sessionName || (mode === 'native' ? 'Native session' : 'Starting...'),
        sessionName: sessionName || undefined,
        sessionUUID: sessionUUID,
        phase: mode === 'native' ? 'native' : 'starting',
        progress: '0/0',
        effort: mode === 'native' ? '' : 'E1',
        mode: mode,
        started: timestamp,
        updatedAt: timestamp,
        currentMode: resolvedMode,
        modeHistory: [{ mode: resolvedMode, startedAt: Date.now() }],
        ratings: [],
        minimalCount: 0,
      };
    }

    writeRegistry(registry);
  } catch {}
}

/** @deprecated Use upsertSession instead */
export const upsertNativeSession = upsertSession;

/**
 * Mark a session as algorithm-starting in work.json. Called by
 * TheRouter.hook.ts the instant the classifier emits MODE=ALGORITHM, so
 * the Pulse dashboard shows the session as an algorithm session BEFORE the
 * model receives the prompt — no "phase: native" wrong-display window.
 *
 * Behavior:
 *   - If a row exists for this UUID:
 *       - currentMode='algorithm' AND not phase='complete' → no-op (idempotent)
 *       - otherwise: upgrade currentMode→'algorithm', mode→'starting',
 *         and phase→'starting' (only when phase was 'native' — never stomps
 *         a real algorithm phase like 'observe' from a resumed session)
 *   - If no row exists: create a fresh `${datePrefix}_starting-${prefix}` slug
 *     with currentMode='algorithm', mode='starting', phase='starting'
 *
 * Side-effect: writes work.json atomically via writeRegistry.
 * Best-effort: failures must not break the TheRouter classification path.
 */
/**
 * Authoritatively record a session switching BACK to native (algorithm→native),
 * updating `currentMode` + pushing a `modeHistory` transition so the Pulse
 * Agents/Lattice dashboard re-lanes the session to the native view and the
 * ModeTimeline shows the switch. Called by TheRouter (the authoritative
 * classifier) on NATIVE turns.
 *
 * This is the DOWNGRADE path that `upsertSession` deliberately refuses: that
 * guard exists to stop PromptProcessing's WEAK 8-verb regex from clobbering the
 * classifier's decision a tick later. TheRouter's classifier is authoritative,
 * so it IS allowed to record the return to native. `currentMode` is what every
 * dashboard `inferMode`/`resolveMode` reads FIRST, so this alone re-categorizes
 * the session without touching `phase`/`mode` — safe to resume the algorithm later
 * (markAlgorithmStarting re-upgrades). Idempotent; failure-silent.
 */
export function markSessionNative(sessionUUID: string): void {
  if (!sessionUUID) return;
  try {
    const registry = readRegistry();
    // Deterministic targeting: the MOST-RECENT non-complete row for this uuid.
    // Usually there is exactly one (upsertSession dedupes per uuid); on the rare
    // "finished-but-unmarked ISA + fresh row" edge, most-recent picks the live one
    // so we never flicker the wrong dashboard lane. No matching row → no-op (never
    // create a row for a pure-native session that never entered work tracking).
    let targetSlug: string | null = null;
    let bestT = -1;
    for (const [slug, session] of Object.entries(registry.sessions) as [string, any][]) {
      if (session.sessionUUID !== sessionUUID) continue;
      if (session.phase === 'complete') continue;
      const t = new Date(session.updatedAt || session.started || 0).getTime();
      if (t >= bestT) { bestT = t; targetSlug = slug; }
    }
    if (!targetSlug) return;
    const session = registry.sessions[targetSlug];
    if (session.currentMode === 'native') return; // idempotent — already native
    const modeHistory: ModeTransition[] = session.modeHistory || [];
    const last = modeHistory.length ? modeHistory[modeHistory.length - 1] : null;
    if (last && !last.endedAt) last.endedAt = Date.now();
    modeHistory.push({ mode: 'native', startedAt: Date.now() });
    // Cap growth on a long oscillating session — the timeline only needs recent history.
    session.modeHistory = modeHistory.length > 50 ? modeHistory.slice(-50) : modeHistory;
    session.currentMode = 'native';
    session.updatedAt = new Date().toISOString();
    writeRegistry(registry);
  } catch { /* silent — dashboard mode is best-effort */ }
}

export function markAlgorithmStarting(sessionUUID: string, taskHint: string, tier?: number): void {
  if (!sessionUUID) return;
  // Resolved tier ("E1".."E5") persisted onto the row so the Pulse Agents/Lattice
  // page shows the correct tier the instant TheRouter classifies — before any
  // ISA exists. Undefined tier leaves the existing effort untouched.
  const effortStr = (typeof tier === 'number' && tier >= 1 && tier <= 5) ? `E${tier}` : undefined;
  try {
    const registry = readRegistry();
    const timestamp = new Date().toISOString();

    // Look for any non-complete row owning this UUID.
    let targetSlug: string | null = null;
    for (const [slug, session] of Object.entries(registry.sessions) as [string, any][]) {
      if (session.sessionUUID !== sessionUUID) continue;
      if (session.phase === 'complete') continue;
      targetSlug = slug;
      break;
    }

    if (targetSlug) {
      const session = registry.sessions[targetSlug];
      const alreadyAlgorithm = session.currentMode === 'algorithm';
      const phaseIsNative = (session.phase || '').toLowerCase() === 'native';

      // Idempotent: already algorithm AND not native-placeholder → just bump.
      if (alreadyAlgorithm && !phaseIsNative) {
        if (effortStr) session.effort = effortStr;
        session.updatedAt = timestamp;
        writeRegistry(registry);
        return;
      }

      // Upgrade in place — preserve sessionUUID and slug; only flip mode/phase.
      const modeHistory: ModeTransition[] = session.modeHistory || [];
      if (modeHistory.length > 0) {
        const last = modeHistory[modeHistory.length - 1];
        if (!last.endedAt && last.mode !== 'algorithm') last.endedAt = Date.now();
      }
      if (!alreadyAlgorithm) {
        modeHistory.push({ mode: 'algorithm', startedAt: Date.now() });
        session.modeHistory = modeHistory;
      }
      session.currentMode = 'algorithm';
      if (effortStr) session.effort = effortStr;
      // Only flip the surface phase when it was the native placeholder.
      // Real algorithm phases (observe/think/plan/build/execute/verify/learn/complete)
      // are owned by ISASync / AlgoPhase and must not be stomped here.
      if (phaseIsNative) {
        session.phase = 'starting';
        session.mode = 'starting';
      }
      session.updatedAt = timestamp;
      writeRegistry(registry);
      return;
    }

    // No row exists yet — create a fresh starting row.
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const datePrefix = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
    const taskSlug = (taskHint || 'starting')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'starting';
    const slug = `${datePrefix}_${taskSlug}`;

    registry.sessions[slug] = {
      task: taskHint || 'Starting...',
      sessionUUID,
      phase: 'starting',
      progress: '0/0',
      effort: effortStr || 'E1',
      mode: 'starting',
      started: timestamp,
      updatedAt: timestamp,
      currentMode: 'algorithm',
      modeHistory: [{ mode: 'algorithm', startedAt: Date.now() }],
      ratings: [],
      minimalCount: 0,
    };
    writeRegistry(registry);
  } catch {}
}

/**
 * Add a RatingPulse to a session in work.json. Called by PromptProcessing fast-path.
 * If sessionUUID matches an existing session, appends to its ratings array and increments minimalCount.
 * If no session exists, writes to a __pulse_strip array for orphan ratings.
 * Designed to stay under 10ms — simple JSON read-modify-write.
 */
export function addRatingPulse(sessionUUID: string, pulse: RatingPulse): void {
  try {
    const registry = readRegistry();

    // Find existing session by UUID
    let found = false;
    for (const [, session] of Object.entries(registry.sessions) as [string, any][]) {
      if (session.sessionUUID === sessionUUID) {
        if (!session.ratings) session.ratings = [];
        session.ratings.push(pulse);
        session.minimalCount = (session.minimalCount || 0) + 1;
        // Set currentMode to 'minimal' if first interaction was a rating
        if (!session.currentMode) {
          session.currentMode = 'minimal';
          session.modeHistory = [{ mode: 'minimal' as const, startedAt: Date.now() }];
        }
        found = true;
        break;
      }
    }

    if (!found) {
      // Orphan rating — store in __pulse_strip
      if (!registry.sessions['__pulse_strip']) {
        registry.sessions['__pulse_strip'] = {
          task: '__pulse_strip',
          sessionName: '__pulse_strip',
          sessionUUID: '__pulse_strip',
          phase: 'minimal',
          progress: '0/0',
          effort: '',
          mode: 'minimal',
          started: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          currentMode: 'minimal' as const,
          ratings: [],
          minimalCount: 0,
        };
      }
      const strip = registry.sessions['__pulse_strip'];
      if (!strip.ratings) strip.ratings = [];
      strip.ratings.push(pulse);
      strip.minimalCount = (strip.minimalCount || 0) + 1;
      strip.updatedAt = new Date().toISOString();
      // Cap orphan ratings to prevent unbounded growth (keep last 50)
      if (strip.ratings.length > 50) strip.ratings = strip.ratings.slice(-50);
    }

    writeRegistry(registry);
  } catch {}
}
