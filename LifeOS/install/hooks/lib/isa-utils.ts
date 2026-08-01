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
import { join, basename } from 'path';
import { createHash } from 'crypto';
import { paiPath } from './paths';
import { appendWorkEvents, diffRegistry, foldToSnapshot, readLiveRegistry, workEventsPath } from './work-events';
import { PHASE_TO_ASCENT, ascentTag, deriveAscent, isRunActive } from '../../LIFEOS/TOOLS/ascent';

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
  // No Decisions section yet — append before the learning-trail section if present
  // (## Learning, or the legacy ## Changelog alias for pre-rename ISAs), else end.
  const learningIdx = content.indexOf('\n## Learning');
  const trailIdx = learningIdx > 0 ? learningIdx : content.indexOf('\n## Changelog');
  const insertAt = trailIdx > 0 ? trailIdx : content.length;
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
//   ## Claims                    (Algorithm v8 vocabulary)
//   ## Features                  (spec v2.16.0 — feature-block ISAs: claims live
//                                 in `### F<n>` blocks under `## Features`)
// Case-insensitive. Section ends at the next `## ` (H2) heading, `---`, or EOF.
// `## Claims` must anchor at "Claims" so `## Anti-claims` never matches as the
// section start (anti-claims are a separate H2 in v8 ISAs and stay excluded).
//
// The regex INCLUDES `### Criteria` so ISAs using the v4.0 template layout
// (`## IDEAL STATE CRITERIA` + `### Criteria` sub-heading) parse correctly.
// Without the Claims variant, every v8-vocabulary ISA parsed as zero criteria:
// no claim cards, no body-count progress, no criteria fallback on the board
// (found 2026-07-22 — the "essence of hill climbing" gap was largely this).
//
// `## Features` is LAST in the alternation and only wins when no earlier
// criteria heading exists. In feature-block ISAs (v2.16.0) `## Features` holds
// the ISCs (nested under `### F<n>` sub-headings, which are H3 so the section
// runs to the next H2); legacy ISAs keep a `## Claims`/`## Criteria` section
// that sorts before their `## Features` pointer table, so they are unaffected —
// and a legacy pointer table has no `- [ ]` lines to mis-parse regardless.
export const CRITERIA_HEADING_RE =
  /^(?:##\s+(?:ISC\s+)?Criteria\b[^\n]*|##\s+Claims\b[^\n]*|##\s+IDEAL\s+STATE\s+CRITERIA\b[^\n]*|###\s+Criteria\b[^\n]*|##\s+Features\b[^\n]*)$/im;

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
  started: string;
  updatedAt: string;
  criteria?: CriterionEntry[];
  iteration?: number;
  ratings?: RatingPulse[];
  // Enriched pipeline data
  capabilities?: string[];      // Skills/capabilities selected for this session
  agents?: AgentEntry[];        // Agents active in this session
  // 2026-07-14 deep strip: effort/mode/currentMode/modeHistory/minimalCount/
  // phaseHistory are no longer written. Legacy rows may still carry them;
  // readers must tolerate unknown keys (they already do — JSON passthrough).
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
      // Algorithm v8 vocabulary (2026-07-22): short claim IDs — `C1`, `R3`,
      // `EQ-12` — are the live convention (`- [x] C1: description`). Without
      // them every v8 ISA parsed as all-dropped: zero claim cards, no body
      // progress, the climb invisible on the board.
      // ISC-N | domain-prefixed (ADM-1, CH-10, H-AVAIL, CRS-PAGE) | short (C1, A3).
      // The domain-prefixed alt accepts a LETTER suffix (H-AVAIL) not just digits
      // — H3/Vector use alphabetic claim IDs that the digits-only pattern missed.
      const ID_RE = '(ISC-[\\w-]+|[A-Z]{1,6}-[A-Z0-9][\\w-]*|[A-Z]{1,4}-?\\d+)';
      let textMatch = line.match(new RegExp(`^- \\[[ x]\\]\\s*${ID_RE}(?:\\s+\\[([A-Za-z]+)\\](?:\\[\\w+\\])?)?:\\s*(.*)`));

      // Fallback: no trailing `:` — e.g. `- [x] ISC-1 description`,
      // `- [x] C1 — description` (em-dash separator), or
      // `- [x] ISC-1 [COMPLETE] description` (status word in brackets, no colon).
      // Accept the line but strip separator dashes and non-category bracket tokens.
      if (!textMatch) {
        const loose = line.match(new RegExp(`^- \\[[ x]\\]\\s*${ID_RE}\\s+(.*)`));
        if (loose) {
          const rest = loose[2]
            .replace(/^[—–-]\s*/, '')
            .replace(/\[[A-Za-z]+\]\s*/g, '')
            .trim();
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

/**
 * Recompute a row's denormalized `ascent` blob from its OWN phase + progress.
 * Returns true when the blob changed.
 *
 * THE one derivation site for the field. It exists because `ascent` is derived
 * state stored on the row (so the bash status line can be a pure `jq` read),
 * which means every writer that moves `phase` or `progress` must recompute it —
 * and two of the three writers didn't (found 2026-07-30): `WorkReconcile` moved
 * a row to `climbing 6/7` while its blob still said 📐 Marking, and
 * `SessionCleanup` stamped `complete` while the blob still said 🧗 Ascending.
 * A row that disagrees with itself makes the tab, the status line and the board
 * disagree with each other, which is the exact failure the one-table design
 * exists to prevent. Call this instead of building the blob by hand.
 */
export function applyAscent(session: Record<string, any>): boolean {
  const [done, total] = String(session.progress || '0/0')
    .split('/')
    .map((n) => parseInt(n, 10) || 0);
  // `tracked` comes from the row, never hardcoded: a placeholder row (no `isa`)
  // is a TRAVERSE row, and hardcoding true derived 📐 Marking for it. That was
  // harmless only by evaluation order — SessionCleanup stamps phase=complete
  // first, and deriveAscent's cairn early-return precedes its tracked check, so
  // a coincidence was carrying a correctness burden (Max review 2026-07-30, F2).
  //
  // `active` likewise comes from the row's own recency, through the table's
  // shared thresholds. Hardcoding it true made ⛺ Camped unreachable on the
  // status line — a permanent state with a defined meaning that no row could
  // ever hold, so a run whose session died kept claiming 🧗 Ascending forever
  // (Forge audit M2). Pulse already derived this correctly from the same fields;
  // now both read the same constants.
  const next = ascentTag(
    deriveAscent({
      phase: session.phase,
      tracked: !!session.isa,
      active: isRunActive(session),
      done,
      total,
    }),
  );
  // Full-tag compare, not key-only: a table edit (icon, label, colour) must
  // propagate to live rows too, or the board keeps rendering last week's glyph.
  if (JSON.stringify(session.ascent) === JSON.stringify(next)) return false;
  session.ascent = next;
  return true;
}

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
 *
 * Derived from the ascent phase map rather than hand-listed: the hand-listed
 * version silently lost `scoping` and `climbing` when the vocabulary moved in
 * 8.x, which made every current-vocabulary run invisible here (found 2026-07-27).
 */
const ACTIVE_LOOKUP_PHASES = new Set(
  Object.keys(PHASE_TO_ASCENT).filter((p) => !['native', 'idle', 'starting'].includes(p)),
);

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
// 2026-07-14 (agents-dashboard deep strip): the per-transition phaseHistory
// pipeline (PhaseEntry/appendPhase) was removed with the phase ceremony —
// `session.phase` (the minimal lifecycle value from ISA frontmatter) is the
// only phase state written. Run-progress history lives in work-events.jsonl,
// which the ClimbChart folds. Legacy rows still carrying phaseHistory parse
// fine; nothing reads the field.

export function syncToWorkJson(fm: Record<string, string>, isaPath: string, content?: string, sessionId?: string): void {
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
      if (session.sessionUUID === sessionId && (session.phase === 'starting' || session.phase === 'native') && slug !== fm.slug) {
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
  // bypass.
  let incomingBodyHash = content ? hashBody(content) : (existing.bodyHash || '');
  let persistedBodyLength = content ? content.length : 0;
  const isFrozen = fm.frozen === 'true' || fm.frozen === true as unknown as string;
  const bodyChanged = !existing.bodyHash || existing.bodyHash !== incomingBodyHash;
  const completeInRegistry = existing.phase === 'complete';
  const completeInFrontmatter = (fm.phase || '').toLowerCase() === 'complete';
  const shouldResume = completeInRegistry && completeInFrontmatter && bodyChanged && !isFrozen && !!content;

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
      // Invariant: the persisted bodyHash must describe the body actually on
      // disk. The rewind just mutated it — rehash, or the next sync reads our
      // own append as a fresh bodyChanged (public issue #1503).
      incomingBodyHash = hashBody(updated);
      persistedBodyLength = updated.length;
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
  // 2026-07-20: H1 fallback added. Quick ISAs often carry neither task: nor
  // title: frontmatter; without this, rows ship nameless and the dashboard
  // falls back to slugs (or worse — it used to leak the intent snippet).
  const h1Title = content ? (content.match(/^#\s+(.+)$/m)?.[1]?.trim() || '') : '';
  const sessionName =
    fm.sessionName ||
    existing.sessionName ||
    fm.task ||
    fm.title ||
    h1Title ||
    '';


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

  // Parse capabilities from ISA content
  const capabilities: string[] = content
    ? parseCapabilities(content)
    : (existing.capabilities || []);

  // Get agents from subagent-events.jsonl for this session
  const resolvedSessionId = sessionId || existing.sessionUUID;
  const agents: AgentEntry[] = resolvedSessionId
    ? getSessionAgents(resolvedSessionId)
    : (existing.agents || []);

  // Intent snippet — UI fallback when no criteria render on the current phase.
  const intent = content ? extractIntentSnippet(content) : (existing.intent || '');

  // Derive task from frontmatter OR the H1 title line OR the existing task.
  // Algorithm ISAs use `title:` not `task:`; keep backward compat.
  const taskValue = fm.task || fm.title || existing.task || '';

  // Progress is always X/Y for the registry. Non-fraction frontmatter values
  // (e.g. `progress: true`) previously leaked through and rendered as 0/0 on
  // the dashboard (2026-07-14 agents-dashboard review) — derive from criteria
  // counts whenever the frontmatter value isn't a fraction.
  const progressValue = /^\d+\s*\/\s*\d+$/.test(String(fm.progress || ''))
    ? String(fm.progress).replace(/\s+/g, '')
    : `${criteria.filter((c) => c.status === 'completed').length}/${criteria.length}`;

  // Resolved run state, denormalized onto the row so the bash status line is a
  // pure `jq` read with zero duplicated derivation. Pulse re-derives instead of
  // reading this — it has the live tool stream and can be more precise — but
  // both go through `deriveAscent`, so they always agree on the bracket.
  // Computed by `applyAscent` below, from the row's own phase + progress.
  const row: Record<string, any> = {
    isa: relativeIsa,
    task: taskValue,
    sessionName: sessionName || undefined,
    sessionUUID: sessionId || existing.sessionUUID || undefined,
    phase: newPhase,
    progress: progressValue,
    started: fm.started || timestamp,
    updatedAt: timestamp,
    criteria,
    ratings: existing.ratings || [],
    capabilities: capabilities.length > 0 ? capabilities : undefined,
    agents: agents.length > 0 ? agents : undefined,
    intent: intent || undefined,
    criteriaParseWarning: criteriaParseWarning || undefined,
    ...(fm.iteration ? { iteration: parseInt(fm.iteration) || 1 } : {}),
    // v6.9.0: body diff gate for Resume After Complete (B2).
    ...(incomingBodyHash ? { bodyHash: incomingBodyHash, lastBodySize: persistedBodyLength } : {}),
    ...(fm.resumed_at ? { resumedAt: fm.resumed_at } : {}),
    ...(fm.resumed_from_phase ? { resumedFromPhase: fm.resumed_from_phase } : {}),
    ...(fm.frozen ? { frozen: true } : {}),
  };
  applyAscent(row);
  registry.sessions[fm.slug] = row;

  // Cleanup against unbounded growth. Thresholds are read against the newer of
  // `lastToolActivity` and `updatedAt` so idle tabs (no tool calls) eventually
  // age out even if prompts still bump updatedAt.
  //
  // Wave 1 (2026-05-23): lifted from 30min/2h/2h → 4h/24h/7d. The prior
  // thresholds were quietly deleting sessions the principal wanted to resume
  // (e.g. a learn-phase session from 24h ago was GONE from work.json, so the
  // dashboard had nothing to render). The 50-session cap (below) is the real
  // upper bound — these thresholds just decide cadence.
  //   - native/starting: 4h  (terminal closed, no recent prompts)
  //   - complete:        24h (one day to revisit before archival)
  //   - everything else: 7d  ("Open Sessions to Resume" cadence is days)
  const now = Date.now();
  const FOUR_HOURS = 4 * 60 * 60 * 1000;
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

  for (const [slug, session] of Object.entries(registry.sessions) as [string, any][]) {
    const updatedMs = new Date(session.updatedAt || session.started || 0).getTime();
    const toolMs = session.lastToolActivity ? new Date(session.lastToolActivity).getTime() : 0;
    const lastAlive = Math.max(updatedMs, toolMs);
    const age = now - lastAlive;
    const phase = (session.phase || '').toLowerCase();

    if ((phase === 'native' || phase === 'starting') && age > FOUR_HOURS) {
      delete registry.sessions[slug];
    } else if (phase === 'complete' && age > ONE_DAY) {
      delete registry.sessions[slug];
    } else if (age > SEVEN_DAYS) {
      delete registry.sessions[slug];
    }
  }

  // Cap at 50 most recent sessions to prevent unbounded growth
  const entries = Object.entries(registry.sessions) as [string, any][];
  if (entries.length > 50) {
    entries.sort((a, b) => {
      const aTime = new Date(a[1].updatedAt || a[1].started || 0).getTime();
      const bTime = new Date(b[1].updatedAt || b[1].started || 0).getTime();
      return bTime - aTime; // newest first
    });
    const toRemove = entries.slice(50);
    for (const [slug] of toRemove) {
      delete registry.sessions[slug];
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
      if (session.phase === 'native' || session.phase === 'starting') continue;
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
        if (other.sessionUUID === sessionUUID && (other.phase === 'starting' || other.phase === 'native')) {
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

/**
 * Bump `lastToolActivity` on the session row owned by this harness UUID.
 * The per-tool-call heartbeat for TRACKED runs (2026-07-14): without it, a
 * run doing real work between ISA edits went "inactive" after 10 minutes and
 * fell off the board's active lanes — the exact "I'm working right now and I
 * don't see it" failure. Called by ISASync for every file event, ISA or not.
 * Debounced via the row's own timestamp; prefers the tracked row when a
 * UUID owns both a tracked row and a placeholder.
 */
export function bumpLastToolActivityByUUID(sessionUUID: string): boolean {
  if (!sessionUUID) return false;
  try {
    const registry = readRegistry();
    let target: any = null;
    for (const session of Object.values(registry.sessions) as any[]) {
      if (session.sessionUUID !== sessionUUID) continue;
      if (session.phase === 'complete') continue;
      if (typeof session.isa === 'string') { target = session; break; }
      if (!target) target = session;
    }
    if (!target) return false;

    const current = target.lastToolActivity;
    if (current && Date.now() - new Date(current).getTime() < BUMP_DEBOUNCE_MS) return false;

    target.lastToolActivity = new Date().toISOString();
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
      if (session.phase !== 'native' && session.phase !== 'starting') continue;
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
 * 2026-07-14 deep strip: placeholder rows are phase-only — the retired
 * mode/currentMode/modeHistory markers are no longer written; `phase:
 * 'native'|'starting'` IS the marker, and tracked rows are identified by the
 * `isa` pointer everywhere. The legacy `currentMode` param is accepted and
 * ignored so callers didn't need a lockstep change.
 */
export function upsertSession(sessionUUID: string, sessionName: string, task: string, mode: 'native' | 'starting' = 'native', _currentMode?: 'minimal' | 'native' | 'algorithm'): void {
  try {
    const registry = readRegistry();
    const timestamp = new Date().toISOString();

    // Check if this UUID already has ANY non-complete entry. ISA sessions
    // are authoritative — if one exists, bail so PromptProcessing doesn't
    // create a duplicate native row that splits tool-activity bumps.
    // Placeholder rows are recognized by phase (legacy rows may also carry
    // the old mode field; phase is present on both generations).
    let existingSlug: string | null = null;
    let existingISASlug: string | null = null;
    for (const [slug, session] of Object.entries(registry.sessions) as [string, any][]) {
      if (session.sessionUUID !== sessionUUID) continue;
      if (session.phase === 'complete') continue;
      if (session.phase === 'native' || session.phase === 'starting') {
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
      // Debounced bump (2026-07-15 efficiency pass): per-prompt updatedAt
      // writes were ~half of all work-events volume (444/920 measured).
      // A bare aliveness bump within the debounce window carries no new
      // information — skip the write entirely. Name upgrades always land.
      const nameChanged = !!sessionName && session.sessionName !== sessionName;
      const updMs = new Date(session.updatedAt || 0).getTime();
      if (!nameChanged && Date.now() - updMs < BUMP_DEBOUNCE_MS) return;
      session.updatedAt = timestamp;
      if (sessionName) session.sessionName = sessionName;
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
        started: timestamp,
        updatedAt: timestamp,
        ratings: [],
      };
    }

    writeRegistry(registry);
  } catch {}
}

/** @deprecated Use upsertSession instead */
export const upsertNativeSession = upsertSession;


/**
 * Add a RatingPulse to a session in work.json. Called by PromptProcessing fast-path.
 * If sessionUUID matches an existing session, appends to its ratings array.
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
          started: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ratings: [],
        };
      }
      const strip = registry.sessions['__pulse_strip'];
      if (!strip.ratings) strip.ratings = [];
      strip.ratings.push(pulse);
      strip.updatedAt = new Date().toISOString();
      // Cap orphan ratings to prevent unbounded growth (keep last 50)
      if (strip.ratings.length > 50) strip.ratings = strip.ratings.slice(-50);
    }

    writeRegistry(registry);
  } catch {}
}
