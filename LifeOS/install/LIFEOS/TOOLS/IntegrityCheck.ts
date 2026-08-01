#!/usr/bin/env bun
/**
 * IntegrityCheck.ts — Full-system integrity orchestrator for the LifeOS system.
 *
 * The deterministic backbone behind `/ic`. Runs one fast pass across every
 * LifeOS surface and emits a single consolidated report + a single exit code:
 *
 *   1. references       — every file reference resolves (delegates to ReferenceCheck.ts;
 *                          covers docs, hooks, skills, CLAUDE.md, workflows — the whole tree)
 *   2. version_anchors  — every Algorithm spec-file ref in DOCUMENTATION points at LATEST
 *   3. hook_registration— settings.json and the hooks directory agree (bidirectional)
 *   4. hook_wiring      — each hook's declared TRIGGER event matches its actual registration
 *   5. carrier-probe    — model-carrier facts in models.ts are fresh (CarrierProbe --check)
 *   5b. rule-duplication— every rule has ONE home: no long verbatim run of rule
 *                         prose appears in 2+ always-on/doctrine rule surfaces
 *   6. replay-corpus    — test/regression fixtures still catch their original incidents
 *   7. claude_imports   — every @-import in every CLAUDE.md resolves
 *   8. skills           — every skill's SKILL.md has name+description frontmatter
 *   9. workflows        — every skill workflow file is referenced by its SKILL.md
 *  10. retired-tokens   — no live doc references a retired harness API
 *  11. gate_counts      — numeric "N gates" prose matches the GateKey roster in ShadowRelease.ts
 *  12. commands/agents  — frontmatter validation for self-registering markdown units
 *  13. skill-hygiene    — skills tree is publishable-clean (SkillHygieneGate.ts vs DENY_LIST.txt)
 *  14. credential-registry — every .env key has a curated blast-radius classification and the
 *                          generated incident-response registry is current (GenerateRegistry --check)
 *  15. permission-rule-shape — every permission rule in the settings cascade is a shape the
 *                          harness honors (no inert Write()/MultiEdit() path rules)
 *
 * This is an ORCHESTRATOR. It does NOT re-implement ReferenceCheck's tree-walk —
 * it shells out to it. The expensive 12-agent deep audit is NOT run here; `--deep`
 * only prints how to run it (agents are the workflow's job, not this tool's).
 *
 * Change window: every run stamps MEMORY/STATE/integrity/last-run.json (+ appends
 * runs.jsonl). The previous stamp anchors a report of everything committed in both
 * repos (~/.claude + ~/.config/LIFEOS/USER) since the last run, aggregated into
 * touched areas — the deterministic focus list for the workflow's contextual review.
 *
 * Usage:
 *   bun IntegrityCheck.ts              # human report, all checks
 *   bun IntegrityCheck.ts --json       # structured JSON
 *   bun IntegrityCheck.ts --quiet      # findings only (suppress OK lines)
 *   bun IntegrityCheck.ts --deep       # append the deep-audit invocation hint
 *   bun IntegrityCheck.ts --help
 *
 * Exit codes:
 *   0 — no blocking findings (stale/orphan/unregistered/orphan-workflow are non-blocking)
 *   1 — ≥1 blocking finding (missing ref, anchor drift, missing hook file, broken @-import, bad skill frontmatter)
 *   2 — scan error
 */

import { readFileSync, existsSync, readdirSync, statSync, mkdirSync, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import { findRuleDuplicates } from './lib/rule-duplication';
import { ASCENT, type AscentState } from './ascent';

const HOME = process.env.HOME || '';
const CLAUDE_DIR = join(HOME, '.claude');
const LIFEOS_DIR = join(CLAUDE_DIR, 'LIFEOS');
const TOOLS_DIR = join(LIFEOS_DIR, 'TOOLS');
const DOC_DIR = join(LIFEOS_DIR, 'DOCUMENTATION');
const STATE_DIR = join(LIFEOS_DIR, 'MEMORY', 'STATE', 'integrity');
const USER_REPO = join(HOME, '.config', 'LIFEOS', 'USER');

// ── Arg parsing (manual, zero deps — llcli style) ──
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`IntegrityCheck — full-system integrity orchestrator (the /ic backbone)

Usage: bun IntegrityCheck.ts [flags]

Flags:
  --json     Structured JSON output
  --quiet    Suppress OK lines; findings only
  --deep     Print how to run the 12-agent deep audit (does not run agents)
  --help     This message

Checks: references, version_anchors, hook_registration, hook_wiring, carrier-probe,
        replay-corpus, claude_imports, skills, workflows, retired-tokens, gate_counts,
        commands/agents frontmatter, skill-hygiene, credential-registry
Exit codes: 0 clean, 1 blocking findings, 2 scan error`);
  process.exit(0);
}
const jsonOutput = args.includes('--json');
const quiet = args.includes('--quiet');
const deep = args.includes('--deep');
const verbose = args.includes('--verbose');

// ── Result model ──
interface Finding {
  detail: string;
  blocking: boolean;
}
interface CheckResult {
  name: string;
  ok: boolean;            // true when no blocking findings
  blockingCount: number;
  infoCount: number;
  findings: Finding[];
  note?: string;          // one-line summary for the human report
}
const checks: CheckResult[] = [];

// Scan errors are distinct from blocking findings: a scan error means a check could NOT
// run (missing dependency, unreadable source of truth) — the tool malfunctioned, not the
// system. Any scan error forces exit 2, never exit 1. This keeps the 0/1/2 contract honest:
// a real scan failure must never look like a clean-but-blocking result. (Forge audit 2026-07-06.)
const scanErrors: string[] = [];
function scanError(msg: string): void { scanErrors.push(msg); }

/**
 * Ceiling on non-blocking findings per check.
 *
 * "Non-blocking" was read as "never has to be fixed," and the pile reached 497 items —
 * 445 of them from one miscalibrated class — while the verdict still said CLEAN. Nobody
 * ignored the findings; the check was built so ignoring them was the only option. A budget
 * turns info into a ratchet: today's count is the ceiling, and growth past it fails.
 *
 * Raising a number here is a deliberate act with a reason. Absent = uncapped (yet).
 */
const INFO_BUDGET: Record<string, number> = {
  references: 0,
  hook_registration: 0,
  workflows: 0,
  'skill-hygiene': 0,
  'permission-rule-shape': 0,
  'credential-registry': 1,
  'prose-in-code': 0,
  'model-rung-pin': 0,
};

function record(name: string, findings: Finding[], note?: string): void {
  let blockingCount = findings.filter(f => f.blocking).length;
  const infoCount = findings.length - blockingCount;
  const budget = INFO_BUDGET[name];
  if (budget !== undefined && infoCount > budget) {
    findings.push({
      detail: `${name}: ${infoCount} non-blocking findings exceeds its budget of ${budget} — fix them or raise the budget on purpose`,
      blocking: true,
    });
    blockingCount++;
  }
  checks.push({ name, ok: blockingCount === 0, blockingCount, infoCount, findings, note });
}

// ── helpers ──
// Enumerate files via `find` (guaranteed-available, recurses at any depth, no reimplemented
// tree walker). `extraArgs` are appended to the base `find <root>` invocation.
// install-payload copies and build/cache noise are pruned so counts reflect the LIVE system.
function findFiles(root: string, extraArgs: string[]): string[] {
  try {
    const out = execFileSync('find', [
      root,
      '(', '-path', '*/node_modules', '-o', '-path', '*/.git', '-o', '-path', '*/install',
      '-o', '-path', '*/LIFEOS_RELEASES', '-o', '-path', '*/Backups', '-o', '-path', '*/Archive',
      '-o', '-path', '*/dist', '-o', '-path', '*/.next',
      // Third-party plugin payloads (marketplace caches) are not the live
      // system — their internal files are vendor-owned and get overwritten
      // on plugin updates, so their broken refs are not ours to fix.
      '-o', '-path', '*/Plugins/cache', '-o', '-path', '*/Plugins/marketplaces',
      ')', '-prune', '-o',
      ...extraArgs, '-print',
    ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return out.split('\n').filter(Boolean);
  } catch { return []; }
}

// ── ascent vocabulary (hand-spelled state names/glyphs in consumer surfaces) ──
// The ONE table (ascent.ts) names every run state; every consumer resolves through it.
// The class has drifted four times (private vocab → 07-27 fix; lucide icon twins →
// deleted 07-28; hand-listed lanes ×2 → table policy 07-28; the board's "Done" label +
// ClimbChart's literal "🏔️ summit" → 07-29, {{PRINCIPAL_NAME}}'s fourth flag). This gate makes the
// fifth recurrence a blocking /ic failure: any ascent LABEL or ICON appearing as a
// literal in a consumer file (Pulse src, hooks) fails — resolve through the table.
// Colors are deliberately OUT of scope: the state hexes double as general palette
// values (#565f89 is also the muted-text color), and a gate that cries wolf gets
// demoted to non-blocking, which is how gates die. Comment lines are stripped so
// documentation may name the states.
function checkAscentVocabulary(): void {
  const findings: Finding[] = [];
  const roots = [join(LIFEOS_DIR, 'PULSE/Observability/src'), join(CLAUDE_DIR, 'hooks')];
  // 'idle' excluded: its label collides with unrelated liveness vocabulary (agent
  // idle states) and it renders on no surface (board: hidden).
  const states = (Object.keys(ASCENT) as AscentState[]).filter((s) => s !== 'idle');
  const needles: { state: string; kind: 'label' | 'icon'; re: RegExp }[] = [];
  for (const s of states) {
    const { label, icon } = ASCENT[s];
    needles.push({ state: s, kind: 'label', re: new RegExp(`["'\`>]${label}["'\`<]`) });
    if (icon) needles.push({ state: s, kind: 'icon', re: new RegExp(icon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
  }
  let scanned = 0;
  for (const root of roots) {
    for (const f of findFiles(root, ['-type', 'f', '(', '-name', '*.ts', '-o', '-name', '*.tsx', ')'])) {
      scanned++;
      const lines = readFileSync(f, 'utf8').split('\n');
      lines.forEach((raw, i) => {
        const trimmed = raw.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('{/*')) return;
        const line = raw.replace(/\/\/.*$/, '').replace(/\{\/\*.*?\*\/\}/g, '');
        for (const n of needles) {
          if (n.re.test(line)) {
            findings.push({
              detail: `${f.replace(HOME, '~')}:${i + 1} — hand-spelled ascent ${n.kind} for '${n.state}' — resolve through ascent.ts (LIFECYCLE_META/ASCENT)`,
              blocking: true,
            });
          }
        }
      });
    }
  }
  // DOC LANE (Max audit 2026-07-30: the 9→6 fold landed in code while three
  // LIVING doc contracts kept teaching the retired vocabulary — the code lane
  // above is structurally blind to prose). Needles derive from
  // LEGACY_ASCENT_ALIASES, so a future fold extends this automatically. Lines
  // that mark themselves historical are exempt; only current-truth prose fails.
  let docScanned = 0;
  try {
    const { LEGACY_ASCENT_ALIASES } = require('./ascent') as { LEGACY_ASCENT_ALIASES: Record<string, string> };
    const retired = Object.keys(LEGACY_ASCENT_ALIASES);
    if (retired.length > 0) {
      const latest = readFileSync(join(LIFEOS_DIR, 'ALGORITHM/LATEST'), 'utf8').trim();
      const livingDocs = [
        join(LIFEOS_DIR, `ALGORITHM/v${latest}.md`),
        join(LIFEOS_DIR, 'DOCUMENTATION/ISA/ISAFormat.md'),
        join(LIFEOS_DIR, 'DOCUMENTATION/Pulse/TerminalTabs.md'),
        join(LIFEOS_DIR, 'DOCUMENTATION/Algorithm/AscentStates.md'),
      ];
      // Any dated line reads as historical context (a hardcoded fold date would
      // exempt nothing for future folds — Max audit 2026-07-30). Coverage note,
      // stated honestly: needles are Capitalized-only by design — lowercase
      // mentions are usually key references in history tables, and the
      // metaphorical "marks the summit" would false-positive case-insensitively.
      // Lowercase current-truth drift is an accepted open lane.
      const historical = /legacy|folded|retired|superseded|merged|history|was\b|before\b|20\d\d-\d\d-\d\d/i;
      const needleRes = retired.map((k) => ({
        key: k,
        re: new RegExp(`\\b${k[0]!.toUpperCase()}${k.slice(1)}\\b`),
      }));
      for (const doc of livingDocs) {
        let text = '';
        try { text = readFileSync(doc, 'utf8'); } catch { continue; }
        docScanned++;
        text.split('\n').forEach((line, i) => {
          if (historical.test(line)) return;
          for (const n of needleRes) {
            if (n.re.test(line)) {
              findings.push({
                detail: `${doc.replace(HOME, '~')}:${i + 1} — retired ascent state '${n.key}' presented as current in a living doc contract — fix the prose or mark the line historical`,
                blocking: true,
              });
            }
          }
        });
      }
    }
  } catch (e: any) {
    scanError(`ascent-vocabulary doc lane: ${e.message}`);
  }
  // PHASE-KEY LANE (2026-07-30, 5th recurrence). The two lanes above catch
  // hand-spelled LABELS and ICONS and are structurally blind to the third
  // vocabulary the table owns: the ISA frontmatter `phase:` KEYS. That blind
  // spot is what left `AlgorithmNudge`'s run-liveness gate holding the retired
  // 8-station enum while live ISAs wrote marking/climbing — both ISA nudge rows
  // silent for a week, unnoticed because nothing fails when a nudge doesn't fire.
  // Doctrine (v8.17.2 § Telemetry): "Never hand-list phase names anywhere."
  // A literal enumerating 3+ phase keys IS a private vocabulary; resolve through
  // PHASE_TO_ASCENT / deriveAscent instead. Exempt: any literal whose statement
  // already references the table (a filter applied to derived keys is derivation,
  // not a second spelling — e.g. isa-utils' ACTIVE_LOOKUP_PHASES).
  let phaseScanned = 0;
  try {
    const { PHASE_TO_ASCENT } = require('./ascent') as { PHASE_TO_ASCENT: Record<string, string> };
    const phaseKeys = Object.keys(PHASE_TO_ASCENT);
    const derivesFromTable = /PHASE_TO_ASCENT|deriveAscent|ASCENT_STATES|ascentMeta|phaseBracket|phaseHasWorkStarted|applyAscent/;
    const phaseRoots = [join(CLAUDE_DIR, 'hooks'), join(LIFEOS_DIR, 'TOOLS'), join(LIFEOS_DIR, 'PULSE/Observability/src')];
    for (const root of phaseRoots) {
      for (const f of findFiles(root, ['-type', 'f', '(', '-name', '*.ts', '-o', '-name', '*.tsx', ')'])) {
        if (f.endsWith('/ascent.ts') || f.endsWith('.test.ts')) continue; // the table itself, and its guards
        phaseScanned++;
        const raw = readFileSync(f, 'utf8');
        const rawLines = raw.split('\n');
        const src = raw
          .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))  // block comments → blanks, line numbers preserved
          .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
        // FOUR shapes, because the class is a private vocabulary, not one syntax:
        //   [...]      array / Set literal (4 of the first 5 instances)
        //   {...}      innermost brace block — an if-chain or a function body;
        //              how the 3rd ULWorkSync instance hid, since
        //              `if (p === "verify" || p === "execute")` has no bracket
        //   'a' | 'b'  string-union type, the natural TS spelling
        //   case 'a':  switch label cluster, which brace-matching alone misses
        //              because `{[^{}]*}` only ever sees the innermost block
        // (shapes 3 and 4 from the Forge cross-vendor audit, 2026-07-30)
        //
        // CONTEXT REQUIREMENT — the thing that keeps this from crying wolf.
        // Phase keys are ordinary English (build, plan, learn, verify, complete,
        // native, idle, think), so a raw 3-key floor blocks `/ic` on any CI step
        // list or status enum that happens to use three of them. Every real
        // instance found so far names `phase` within its statement; none of the
        // synthetic false positives do. So the window must ALSO look like it is
        // about phases. Deliberate consequence: a hand-listed set that never says
        // "phase" is a documented miss, and that beats a gate that gets demoted.
        //
        // Remaining known bounds, stated rather than papered over: a list spread
        // past 600 chars, `.split(',')` / `.concat()` construction, and a literal
        // sitting one line under an unrelated table reference (exemption abuse).
        const unionRe = /(?:['"`][a-z]+['"`]\s*\|\s*){2,}['"`][a-z]+['"`]/g;
        const candidates: Array<{ 0: string; index?: number; kind?: string }> = [
          ...src.matchAll(/\[[^\]]{0,600}\]/g),
          ...src.matchAll(/\{[^{}]{0,600}\}/g),
          ...src.matchAll(unionRe),
        ];
        // Switch clusters are built by proximity, not by one regex: `case 'x': {
        // … }` bodies sit between the labels, so a consecutive-label pattern
        // never matches, and brace-matching sees only the innermost body. Labels
        // are chained from a cluster's START (not from the previous label) and
        // `i` advances past what a cluster consumed — chaining pairwise meant a
        // realistic switch, ~500 chars of body per case, reported ZERO clusters:
        // its first window never reached 3 labels and every later label was
        // skipped as mid-cluster (Forge delta audit M-D, measured).
        const labels = [...src.matchAll(/case\s+['"`][a-z]+['"`]\s*:/g)];
        for (let i = 0; i < labels.length; i++) {
          const start = labels[i].index ?? 0;
          let end = start + labels[i][0].length;
          let last = i;
          for (let j = i + 1; j < labels.length && (labels[j].index ?? 0) - (labels[j - 1].index ?? 0) <= 600; j++) {
            end = (labels[j].index ?? 0) + labels[j][0].length;
            last = j;
          }
          if (last - i + 1 >= 3) candidates.push({ 0: src.slice(start, end), index: start, kind: 'switch' });
          i = last; // consume the cluster — one switch reports once
        }
        const reported = new Set<string>();
        for (const m of candidates) {
          const hits = phaseKeys.filter((k) => new RegExp(`['"\`]${k}['"\`]`).test(m[0]));
          if (hits.length < 3) continue;
          const before = src.slice(0, m.index ?? 0);
          const line = before.split('\n').length;
          // Window = the ENCLOSING STATEMENT (back to the previous `;`/`{`/`}`)
          // plus the candidate itself. Two raw lines was too loose in both
          // directions: it let any `phase` parameter within two lines qualify an
          // unrelated literal, and it reported WorkSweep's array one line off
          // (Forge delta audit M-C). A switch also carries its `switch (…)`
          // header, which sits before the brace the statement scan stops at.
          const stmtStart = Math.max(
            before.lastIndexOf(';'), before.lastIndexOf('{'), before.lastIndexOf('}'),
          ) + 1;
          let window = src.slice(stmtStart, (m.index ?? 0) + m[0].length);
          if ((m as { kind?: string }).kind === 'switch') {
            const head = before.lastIndexOf('switch');
            if (head >= 0 && (m.index ?? 0) - head <= 600) window += src.slice(head, before.length);
          }
          if (derivesFromTable.test(window)) continue;
          if (!/phase/i.test(window)) continue;
          // One defect, one finding: the brace shape and the case-label cluster
          // both match a one-line-body switch, which produced two identical
          // blocking findings on the same line (Forge delta audit M-D).
          // ESCAPE HATCH. Some literals are genuinely indistinguishable from a
          // phase list by any text heuristic — `const deployPhase = ['build',
          // 'verify','complete']` is three phase words in a phase-named const,
          // and the two real instances were `ACTIVE_PHASES` / `COMPLETION_PHASES`,
          // so no identifier rule separates them. Rather than a cleverer proxy
          // that will be wrong in a new way, the human says so once: put
          // `ascent-gate:allow` in a comment on the line or the line above.
          // Checked against the RAW text, since the scan blanks comments.
          const pragma = /ascent-gate:allow/;
          if (pragma.test(rawLines[line - 1] ?? '') || pragma.test(rawLines[line - 2] ?? '')) continue;
          const key = `${line}:${hits.join(',')}`;
          if (reported.has(key)) continue;
          reported.add(key);
          findings.push({
            detail: `${f.replace(HOME, '~')}:${line} — hand-listed phase vocabulary [${hits.slice(0, 4).join(', ')}…] — resolve through ascent.ts (PHASE_TO_ASCENT / deriveAscent)`,
            blocking: true,
          });
        }
      }
    }
  } catch (e: any) {
    scanError(`ascent-vocabulary phase lane: ${e.message}`);
  }
  record('ascent-vocabulary', findings, `${scanned} consumer files + ${docScanned} living docs + ${phaseScanned} phase-key files scanned against ${states.length} table states`);
}

// ── prose-in-code (delegate to ProseInCode.ts) ──
// BPE exempts `.ts`, so doctrine that drifts into a source comment is invisible to every
// other check here. Budget 0: the class is at zero and stays there.
function checkProseInCode(): void {
  const findings: Finding[] = [];
  let note = '';
  try {
    const tool = join(TOOLS_DIR, 'ProseInCode.ts');
    let raw = '';
    try {
      raw = execFileSync('bun', [tool, '--json'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    } catch (e: any) {
      raw = e.stdout?.toString() || '';   // exit 1 when hits exist; stdout still holds the JSON
      if (!raw) throw e;
    }
    const r = JSON.parse(raw);
    note = `${r.scanned ?? '?'} source files scanned, ${(r.hits || []).length} doctrine-prose hits`;
    for (const h of r.hits || []) {
      findings.push({ detail: `${h.kind}: ${h.file}:${h.line} — ${h.why}`, blocking: false });
    }
  } catch (e: any) {
    scanError(`prose-in-code: ProseInCode delegation failed — ${e.message}`);
    note = 'SCAN ERROR (delegation failed)';
  }
  record('prose-in-code', findings, note);
}

// ── block messages (every red box states the problem AND the fix) ──
// A gate that stops the work without naming the way out invites the cheapest
// possible response: rewording the claim until it stops firing. Contract and
// reference shape: hooks/README.md § Block messages.
function checkBlockMessages(): void {
  const findings: Finding[] = [];
  let note = '';
  try {
    const tool = join(TOOLS_DIR, 'BlockMessageGate.ts');
    let raw = '';
    try {
      raw = execFileSync('bun', [tool, '--json'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    } catch (e: any) {
      raw = e.stdout?.toString() || '';   // exit 1 when violations exist; stdout still holds the JSON
      if (!raw) throw e;
    }
    const r = JSON.parse(raw);
    const hits = r.findings || [];
    note = `${hits.length} block message(s) missing a problem or fix clause`;
    for (const h of hits) {
      findings.push({ detail: `${h.file}:${h.line} — missing ${(h.missing || []).join(' + ')}`, blocking: true });
    }
  } catch (e: any) {
    scanError(`block-messages: BlockMessageGate delegation failed — ${e.message}`);
    note = 'SCAN ERROR (delegation failed)';
  }
  record('block-messages', findings, note);
}

// ── Check 1: references (delegate to ReferenceCheck.ts) ──
function checkReferences(): void {
  const findings: Finding[] = [];
  let note = '';
  try {
    const rcPath = join(TOOLS_DIR, 'ReferenceCheck.ts');
    let raw = '';
    try {
      // No --stale. Staleness is an mtime heuristic ("target changed after the doc did")
      // and it cannot tell a description that rotted from a pointer that is simply older
      // than what it points at. Every one of the 418 findings it produced on 2026-07-27 was
      // a routing reference — "see X", "the script is at X" — that mtime can never judge.
      // A class that only emits noise does not belong in a verdict; `ReferenceCheck.ts
      // --stale` remains available for a manual look. missing/orphan stay: both are
      // deterministic and both are real.
      raw = execFileSync('bun', [rcPath, '--json', '--orphans'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    } catch (e: any) {
      // ReferenceCheck exits 1 when missing refs exist — stdout still holds the JSON
      raw = e.stdout?.toString() || '';
      if (!raw) throw e;
    }
    const rc = JSON.parse(raw);
    const s = rc.summary || {};
    note = `${rc.scannedRefs ?? '?'} refs across ${rc.scannedFiles ?? '?'} files: ${s.missing ?? 0} missing, ${s.stale ?? 0} stale, ${s.orphan ?? 0} orphan`;
    for (const f of rc.findings || []) {
      const isMissing = (f.kind || f.type) === 'missing';
      findings.push({
        detail: `${f.kind || f.type}: ${f.ref ?? f.reference ?? ''} in ${f.file ?? f.referrer ?? '?'}`,
        blocking: isMissing,
      });
    }
  } catch (e: any) {
    // Delegation failure = the check could not RUN (ReferenceCheck missing/unparseable output).
    // That is a scan error (exit 2), NOT a blocking finding (exit 1) — never let a broken tool
    // masquerade as a clean-but-blocking result. (Forge audit 2026-07-06.)
    scanError(`references: ReferenceCheck delegation failed — ${e.message}`);
    note = 'SCAN ERROR (delegation failed)';
  }
  record('references', findings, note);
}

// ── Check 2: version_anchors ──
function checkVersionAnchors(): void {
  const findings: Finding[] = [];
  let latest = '';
  try { latest = readFileSync(join(LIFEOS_DIR, 'ALGORITHM', 'LATEST'), 'utf8').trim(); }
  catch { scanError('version_anchors: ALGORITHM/LATEST unreadable'); record('version_anchors', [], 'SCAN ERROR (no LATEST)'); return; }

  const specRefRe = /(?:Algorithm|LIFEOS\/ALGORITHM)\/v(\d+\.\d+\.\d+)\.md/g;
  const docFiles = findFiles(DOC_DIR, ['-name', '*.md', '-type', 'f']);
  for (const file of docFiles) {
    let content = '';
    try { content = readFileSync(file, 'utf8'); } catch { continue; }
    let m: RegExpExecArray | null;
    specRefRe.lastIndex = 0;
    while ((m = specRefRe.exec(content)) !== null) {
      if (m[1] !== latest) {
        findings.push({ detail: `${file.replace(CLAUDE_DIR + '/', '')}: spec ref v${m[1]}.md ≠ LATEST v${latest}`, blocking: true });
      }
    }
  }
  // The master architecture doc's current-versions line must agree with LATEST
  // (Max audit 2026-07-30: v8.17.1 shipped while this line said v8.17.0 — the
  // spec-file-ref regex above never sees a bare "Algorithm vX.Y.Z" mention).
  try {
    const master = readFileSync(join(DOC_DIR, 'LifeosSystemArchitecture.md'), 'utf8');
    const vLine = master.match(/\*\*Version:\*\*[^\n]*Algorithm v(\d+\.\d+\.\d+)/);
    if (vLine && vLine[1] !== latest) {
      findings.push({ detail: `LifeosSystemArchitecture.md current-versions line says Algorithm v${vLine[1]} ≠ LATEST v${latest}`, blocking: true });
    }
  } catch { scanError('version_anchors: LifeosSystemArchitecture.md unreadable'); }
  record('version_anchors', findings, `LATEST=v${latest}; ${findings.length} drifted refs (spec files + master current-versions line)`);
}

// ── Check 3: hook_registration (bidirectional + parse-guard + exec-bit) ──
function checkHookRegistration(): void {
  const findings: Finding[] = [];
  const hooksDir = join(CLAUDE_DIR, 'hooks');
  const settingsPath = join(CLAUDE_DIR, 'settings.json');
  let settings = '';
  try { settings = readFileSync(settingsPath, 'utf8'); }
  catch { scanError('hook_registration: settings.json unreadable'); record('hook_registration', [], 'SCAN ERROR (no settings)'); return; }

  // settings.json must be valid JSON — a malformed settings.json breaks the whole harness.
  try { JSON.parse(settings); }
  catch (e: any) { findings.push({ detail: `settings.json does not parse as JSON: ${e.message}`, blocking: true }); }

  const registered = new Set<string>();
  const re = /([A-Za-z0-9_]+\.hook\.ts)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(settings)) !== null) registered.add(m[1]);

  let onDisk = new Set<string>();
  // If the hooks dir is unreadable, onDisk stays empty and the whole
  // registered-vs-onDisk reconciliation silently degrades (it would report
  // every registered hook as "file missing" or skip dead-hook detection). A
  // scan error must surface as exit 2, never masquerade as clean (public
  // issue #1508 finding #13 — the swallowed catch that hollowed this check).
  try { onDisk = new Set(readdirSync(hooksDir).filter(f => f.endsWith('.hook.ts'))); }
  catch (e: any) { scanError(`hook_registration: hooks dir unreadable: ${e?.message ?? e}`); }

  // registered but file missing → BLOCKING
  for (const r of registered) {
    if (!onDisk.has(r)) findings.push({ detail: `registered in settings.json but file missing: hooks/${r}`, blocking: true });
    else {
      // registered hooks with a shebang are exec'd directly by the harness — a missing +x bit is a silent no-fire.
      try {
        const st = statSync(join(hooksDir, r));
        const isExec = (st.mode & 0o111) !== 0;
        if (!isExec) findings.push({ detail: `registered hook not executable (chmod +x): hooks/${r}`, blocking: false });
      } catch (e: any) {
        // A stat failure on a registered hook means the exec-bit check couldn't
        // run — surface it rather than silently drop the finding (#1508 #13).
        findings.push({ detail: `registered hook ${r} could not be stat'd (exec-bit check skipped): ${e?.message ?? e}`, blocking: false });
      }
    }
  }
  // On disk but not in settings.json is NOT dormant when an aggregator calls it. The 2026
  // consolidation moved ten guards behind StopGates / PreToolGuard / MemoryTurnStart, and this
  // check kept reporting all ten as unregistered — false positives are how a real finding gets
  // tuned out, so resolve the actual call graph before flagging.
  const aggregatorSource = onDisk.size
    ? [...onDisk].map(h => { try { return readFileSync(join(hooksDir, h), 'utf8'); } catch { return ''; } }).join('\n')
    : '';
  for (const d of onDisk) {
    if (registered.has(d)) continue;
    const stem = d.replace(/\.hook\.ts$/, '');
    // Called by another hook (import or spawn) → wired, just not directly registered.
    if (new RegExp(`['"\`./]${stem}(\\.hook)?['"\`]|\\b${stem}\\b\\s*\\(`).test(aggregatorSource)) continue;
    findings.push({ detail: `on disk, not registered, and no hook calls it: hooks/${d}`, blocking: false });
  }
  record('hook_registration', findings, `${registered.size} registered, ${onDisk.size} on disk`);
}

// ── Check 3b: hook_wiring (SEMANTIC — registered event must match declared TRIGGER) ──
// Count/filename parity (check 3) provably misses a hook wired to the WRONG event or to
// NO event: AlgorithmNudge/PostToolObserver/DriftReminder each declared an event in their
// header yet shipped registered nowhere on it, silently dead on every fresh install
// (public issue #1508 findings #1/#3/#4). This check parses each hook's `TRIGGER: <Event>`
// docstring line and asserts the hook is actually registered on that event — directly, or
// indirectly via a dispatcher hook that imports it and is itself registered on that event.
function checkHookWiring(): void {
  const findings: Finding[] = [];
  const hooksDir = join(CLAUDE_DIR, 'hooks');
  let settings: any;
  try { settings = JSON.parse(readFileSync(join(CLAUDE_DIR, 'settings.json'), 'utf8')); }
  catch { record('hook_wiring', [], 'skipped (settings unreadable)'); return; }

  // event -> Set<hook filename> registered DIRECTLY on that event
  const directByEvent = new Map<string, Set<string>>();
  for (const [event, groups] of Object.entries(settings.hooks ?? {})) {
    const set = new Set<string>();
    for (const g of (groups as any[]) ?? []) {
      for (const h of g?.hooks ?? []) {
        const mm = /([A-Za-z0-9_]+\.hook\.ts)/.exec(h?.command ?? '');
        if (mm) set.add(mm[1]);
      }
    }
    directByEvent.set(event, set);
  }

  // Dispatcher expansion: a registered hook that imports "./X.hook" and runs it makes X
  // effectively registered on the dispatcher's event(s). Resolve one level (dispatchers
  // don't nest today: PostToolObserver→AlgorithmNudge/LoopDetector, PreToolGuard→guards).
  const importsOf = (file: string): string[] => {
    try {
      const src = readFileSync(join(hooksDir, file), 'utf8');
      return [...src.matchAll(/from\s+["']\.\/([A-Za-z0-9_]+\.hook)["']/g)].map(m => `${m[1]}.ts`);
    } catch { return []; }
  };
  const effectiveByEvent = new Map<string, Set<string>>();
  for (const [event, set] of directByEvent) {
    const eff = new Set(set);
    for (const f of set) for (const imp of importsOf(f)) eff.add(imp);
    effectiveByEvent.set(event, eff);
  }

  let declared = 0;
  let onDisk: string[] = [];
  try { onDisk = readdirSync(hooksDir).filter(f => f.endsWith('.hook.ts')); } catch {}
  for (const file of onDisk) {
    let src = '';
    try { src = readFileSync(join(hooksDir, file), 'utf8'); } catch { continue; }
    // TRIGGER: <Event> — first alphabetic token is the primary declared event.
    const t = /TRIGGER:\s*([A-Za-z]+)/.exec(src);
    if (!t) continue;               // no declared event → can't check, skip
    const event = t[1];
    if (event.toLowerCase() === 'na' || event.toLowerCase() === 'none') continue;
    declared++;
    const eff = effectiveByEvent.get(event);
    if (!eff || !eff.has(file)) {
      findings.push({
        detail: `hooks/${file} declares TRIGGER: ${event} but is not registered on ${event} (directly or via a dispatcher) — silently dead`,
        blocking: true,
      });
    }
  }
  record('hook_wiring', findings, `${declared} hooks declare an event; ${findings.length} mis-wired`);
}

// ── Check 3b: frontmatter validation for self-describing units (commands, agents) ──
// Class-sweep sibling of the skills check: every markdown unit that registers itself
// by frontmatter must carry name + description, or it decays silently.
function checkFrontmatterUnits(name: string, dir: string, requireName: boolean): void {
  const findings: Finding[] = [];
  let files: string[] = [];
  // Every .md here is a self-registering unit and must carry frontmatter. The
  // companion-doc exclusion (*Context.md) is GONE as of 2026-07-27: agent files
  // are self-contained — content shared between agents is inlined in each and
  // held identical by checkAgentSharedBlocks() below, not split into a file the
  // agent has to remember to Read.
  try { files = readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'README.md'); } catch {
    record(name, [], `${dir.replace(CLAUDE_DIR + '/', '')} absent`); return;
  }
  for (const f of files) {
    let content = '';
    try { content = readFileSync(join(dir, f), 'utf8'); } catch { continue; }
    const fm = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fm) { findings.push({ detail: `${name}/${f}: no frontmatter block`, blocking: true }); continue; }
    if (requireName && !/^name:\s*\S/m.test(fm[1])) findings.push({ detail: `${name}/${f}: missing frontmatter 'name:'`, blocking: true });
    if (!/^description:\s*\S/m.test(fm[1])) findings.push({ detail: `${name}/${f}: missing frontmatter 'description:'`, blocking: true });
  }
  record(name, findings, `${files.length} ${name} validated`);
}

// ── Check 3c: shared agent blocks stay byte-identical ──
// Agent files are self-contained (no companion Context files). Content that MUST
// read the same across agents — today the Max/Forge scrutiny character — is
// inlined in each file between markers and held identical by this check, so the
// guarantee costs a gate rather than a runtime Read the agent might skip.
// Marker form: <!-- SHARED:<KEY> … --> … <!-- /SHARED:<KEY> -->
// A key present in only one file is fine (a block can be introduced before its
// second home exists); two or more copies that disagree is blocking.
const SHARED_BLOCK_RE = /<!--\s*SHARED:([A-Z0-9-]+)[\s\S]*?-->\n([\s\S]*?)<!--\s*\/SHARED:\1\s*-->/g;

function checkAgentSharedBlocks(): void {
  const findings: Finding[] = [];
  const dir = join(CLAUDE_DIR, 'agents');
  let files: string[] = [];
  try { files = readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'README.md'); } catch {
    record('agent-shared-blocks', [], 'agents/ absent'); return;
  }
  // key → [{file, sha}]
  const blocks = new Map<string, { file: string; sha: string }[]>();
  for (const f of files) {
    let content = '';
    try { content = readFileSync(join(dir, f), 'utf8'); } catch { continue; }
    for (const m of content.matchAll(SHARED_BLOCK_RE)) {
      const [, key, body] = m;
      const sha = createHash('sha256').update(body).digest('hex');
      if (!blocks.has(key)) blocks.set(key, []);
      blocks.get(key)!.push({ file: f, sha });
    }
  }
  for (const [key, copies] of blocks) {
    const shas = new Set(copies.map(c => c.sha));
    if (shas.size > 1) {
      findings.push({
        detail: `SHARED:${key} diverged across ${copies.map(c => `${c.file}=${c.sha.slice(0, 8)}`).join(', ')} — edit every copy or none`,
        blocking: true,
      });
    }
  }
  const copyCount = [...blocks.values()].reduce((n, c) => n + c.length, 0);
  // Summary states what was actually observed — a failing check must never read
  // "identical" (that inversion is exactly the clean-but-blocking masquerade the
  // exit-code precedence elsewhere in this file exists to prevent).
  const verdict = findings.length ? `${findings.length} diverged` : 'identical';
  record('agent-shared-blocks', findings, `${blocks.size} shared block(s), ${copyCount} copies, ${verdict}`);
}

// ── Check 4: claude_imports (@-imports across every CLAUDE.md) ──
function checkClaudeImports(): void {
  const findings: Finding[] = [];
  const claudeMds = findFiles(CLAUDE_DIR, ['(', '-name', 'CLAUDE.md', '-o', '-name', 'CLAUDE.user.md', ')', '-type', 'f']);
  let importCount = 0;
  for (const file of claudeMds) {
    let content = '';
    try { content = readFileSync(file, 'utf8'); } catch { continue; }
    for (const line of content.split('\n')) {
      const im = line.match(/^@([^\s]+)/);
      if (!im) continue;
      importCount++;
      const target = join(CLAUDE_DIR, im[1]);
      if (!existsSync(target)) {
        findings.push({ detail: `${file.replace(CLAUDE_DIR + '/', '')}: broken @-import → ${im[1]}`, blocking: true });
      }
    }
  }
  record('claude_imports', findings, `${claudeMds.length} CLAUDE.md files, ${importCount} @-imports`);
}

// ── Check 5: skills (SKILL.md frontmatter name+description, all depths) ──
function checkSkills(): void {
  const findings: Finding[] = [];
  const skillsDir = join(CLAUDE_DIR, 'skills');
  const skillMds = findFiles(skillsDir, ['-name', 'SKILL.md', '-type', 'f']);
  for (const skillMd of skillMds) {
    const rel = skillMd.replace(CLAUDE_DIR + '/', '');
    let content = '';
    try { content = readFileSync(skillMd, 'utf8'); } catch { continue; }
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) { findings.push({ detail: `${rel}: no frontmatter block`, blocking: true }); continue; }
    const fm = fmMatch[1];
    if (!/^name:\s*\S/m.test(fm)) findings.push({ detail: `${rel}: missing frontmatter 'name:'`, blocking: true });
    if (!/^description:\s*\S/m.test(fm)) findings.push({ detail: `${rel}: missing frontmatter 'description:'`, blocking: true });
  }
  // Structural: a Workflows/ or Tools/ dir with no sibling SKILL.md is a broken skill.
  const structureDirs = findFiles(skillsDir, ['(', '-name', 'Workflows', '-o', '-name', 'Tools', ')', '-type', 'd']);
  const flagged = new Set<string>();
  for (const sd of structureDirs) {
    const skillRoot = sd.slice(0, sd.lastIndexOf('/'));
    // Only a top-level skill root (skills/<name>) must carry SKILL.md. A nested content dir that
    // merely happens to contain a Tools/ or Workflows/ subdir (e.g. skills/Prompting/Templates/Tools)
    // is not a skill and is exempt.
    const afterSkills = skillRoot.split('/skills/')[1];
    if (!afterSkills || afterSkills.includes('/')) continue;
    if (flagged.has(skillRoot)) continue;
    if (!existsSync(join(skillRoot, 'SKILL.md'))) {
      flagged.add(skillRoot);
      findings.push({ detail: `${skillRoot.replace(CLAUDE_DIR + '/', '')}/: has Workflows/Tools but no SKILL.md`, blocking: true });
    }
  }
  record('skills', findings, `${skillMds.length} SKILL.md validated`);
}

// ── Check 6: workflows (referenced by their SKILL.md, nested paths included) ──
function checkWorkflows(): void {
  const findings: Finding[] = [];
  const skillsDir = join(CLAUDE_DIR, 'skills');
  const wfFiles = findFiles(skillsDir, ['-path', '*/Workflows/*', '-name', '*.md', '-type', 'f']);
  const cache = new Map<string, string>();
  for (const wf of wfFiles) {
    const rel = wf.replace(CLAUDE_DIR + '/', '');
    const idx = wf.indexOf('/Workflows/');
    const skillMd = join(wf.slice(0, idx), 'SKILL.md');
    let sc = cache.get(skillMd);
    if (sc === undefined) { try { sc = readFileSync(skillMd, 'utf8'); } catch { sc = ''; } cache.set(skillMd, sc); }
    const bn = wf.slice(wf.lastIndexOf('/') + 1);
    const base = bn.replace(/\.md$/, '');
    // referenced if the SKILL.md mentions the filename or the bare workflow name
    if (!sc.includes(bn) && !sc.includes(base)) {
      findings.push({ detail: `${rel}: not referenced by its SKILL.md (orphan workflow)`, blocking: false });
    }
  }
  record('workflows', findings, `${wfFiles.length} workflow files, ${findings.length} orphaned`);
}

// ── Check: carrier-probe freshness (CarrierProbe --check, zero spend) ──
// The DISPATCH_EXECUTES_FABLE fact in models.ts underpins the Fable-carrier
// rule, the statusline dispatch mapping, and Algorithm §Spend. It flipped
// silently on a harness update once (2026-07-12); this gate keeps it probed.
function checkCarrierProbe(): void {
  const findings: Finding[] = [];
  try {
    execFileSync('bun', [join(CLAUDE_DIR, 'LIFEOS', 'TOOLS', 'CarrierProbe.ts'), '--check'], { encoding: 'utf8' });
  } catch (e: any) {
    const msg = (e.stderr || e.stdout || e.message || '').toString().trim().split('\n')[0];
    findings.push({ detail: msg || 'CarrierProbe --check failed', blocking: true });
  }
  record('carrier-probe', findings, findings.length === 0 ? 'fact fresh' : undefined);
}

// ── Check: rule duplication — every rule has ONE home ──
// The 2026-07-26 rule-structure consolidation gave every rule exactly one file
// (system prompt = constitution + pointers; LIFEOS/RULES/<Subject>.md = the sole
// full statement; doctrine cites incidents by ID). Multi-homed rules drift into
// contradictions the Context Hierarchy silently resolves against the newer rule
// (the 2026-07-26 role-routing outranking incident). This check keeps rules
// single-homed mechanically: any run of RULE_SHINGLE_WORDS identical words
// appearing in two different rule surfaces is a duplicate — the fix is one full
// statement + a pointer, never a second copy.
const RULE_SURFACES: readonly string[] = [
  'LIFEOS/LIFEOS_SYSTEM_PROMPT.md',
  'CLAUDE.md',
  'LIFEOS/ALGORITHM/LATEST', // sentinel — expands to the current doctrine file
  'LIFEOS/RULES', // sentinel — expands to every .md in the dir
  'LIFEOS/USER/CONFIG/OPERATIONAL_RULES.md',
  'LIFEOS/USER/CONFIG/OperationalRulesExpanded.md',
];

function ruleSurfaceFiles(): string[] {
  const out: string[] = [];
  for (const rel of RULE_SURFACES) {
    const abs = join(CLAUDE_DIR, rel);
    if (rel === 'LIFEOS/ALGORITHM/LATEST') {
      if (!existsSync(abs)) continue;
      const v = readFileSync(abs, 'utf8').trim();
      const doctrine = join(CLAUDE_DIR, 'LIFEOS', 'ALGORITHM', `v${v}.md`);
      if (existsSync(doctrine)) out.push(doctrine);
    } else if (rel === 'LIFEOS/RULES') {
      if (!existsSync(abs)) continue;
      for (const f of readdirSync(abs)) if (f.endsWith('.md')) out.push(join(abs, f));
    } else if (existsSync(abs)) {
      out.push(abs);
    }
  }
  return out;
}

function checkRuleDuplication(): void {
  const findings: Finding[] = [];
  const files = ruleSurfaceFiles().map((abs) => ({
    rel: abs.startsWith(CLAUDE_DIR) ? abs.slice(CLAUDE_DIR.length + 1) : abs,
    content: readFileSync(abs, 'utf8'),
  }));
  for (const d of findRuleDuplicates(files)) {
    findings.push({ detail: `${d.pair} — "${d.snippet.split(' ').slice(0, 16).join(' ')}…" stated in both; keep ONE home + a pointer`, blocking: true });
  }
  record('rule-duplication', findings, findings.length === 0 ? `${files.length} rule surfaces, single-homed` : undefined);
}

// ── Check: incident-replay corpus (executable immune memory) ──
// Every applied self-healing patch ships a replay fixture proving the original
// incident is still caught (test/regression/). A red fixture means a gate
// regressed on the exact failure that created it — always blocking. The gates
// rotted silently before this wire-up (the golden corpus's block-assertions
// were vacuous for an unknown period — 2026-07-13 piped-stdio finding).
function checkReplayCorpus(): void {
  const findings: Finding[] = [];
  let note: string | undefined;
  try {
    const out = execFileSync('bun', ['test', join(CLAUDE_DIR, 'test', 'regression')], {
      encoding: 'utf8', cwd: CLAUDE_DIR, stdio: ['ignore', 'pipe', 'pipe'], timeout: 120_000,
    });
    note = (out.match(/\d+ pass/)?.[0] ?? 'pass') + ', 0 fail';
  } catch (e: any) {
    const out = ((e.stdout || '') + (e.stderr || '')).toString();
    const fails = out.match(/^\(fail\).*$/gm) ?? [];
    if (fails.length === 0 && !/\d+ fail/.test(out)) {
      findings.push({ detail: `replay corpus could not run: ${(e.message || '').split('\n')[0]}`, blocking: true });
    }
    for (const f of fails.slice(0, 10)) {
      findings.push({ detail: `replay regression: ${f.replace(/^\(fail\)\s*/, '')}`, blocking: true });
    }
    if (findings.length === 0) findings.push({ detail: 'replay corpus failed (unparsed bun test output)', blocking: true });
  }
  record('replay-corpus', findings, note);
}

// ── Check: retired harness-API tokens (BPE capability-surfacing cleanup, 2026-07-21) ──
// Hand-maintained capability manuals rot against the live tool surface: the Delegation
// skill was still teaching Task()/TeamCreate/max_turns months after the harness retired
// them, and the routing index sent parallel-work prompts straight to it. Live doc surfaces
// must not reference retired harness APIs. History is exempt by marker, not by path list:
// a file whose first 1KB contains "RETIRED" is a history document and may describe the past.
// Add tokens here when the harness retires an API; never add live tool names (TaskList,
// TaskCreate, TaskStop, TaskOutput are current — "TeamCreate" is not a prefix collision).
// `Task({` was added 2026-07-27: the existing `Task(subagent_type` token only
// matched the single-line form, so 113 dispatches written as `Task({ subagent_type:`
// or `Task({\n  subagent_type:` sat in live workflows (all six _OSINT lookups, four
// Research workflows, AgentSystem.md itself) teaching a tool that no longer exists.
// The `(?<![A-Za-z])` guard in the fix pass is the reason `createTask({` is not a
// collision here — indexOf is substring-based, so the token must stay this specific.
const RETIRED_TOKENS = ['TeamCreate', 'Task(subagent_type', 'Task({', 'max_turns', 'team_name='];
function checkRetiredTokens(): void {
  const findings: Finding[] = [];
  const roots: string[] = [
    join(CLAUDE_DIR, 'skills'),
    join(CLAUDE_DIR, 'LIFEOS', 'DOCUMENTATION'),
    join(CLAUDE_DIR, 'agents'),
    join(CLAUDE_DIR, 'commands'),
  ];
  const files: string[] = [];
  for (const root of roots) {
    files.push(...findFiles(root, ['-type', 'f', '(', '-name', '*.md', '-o', '-name', '*.hbs', ')']));
  }
  files.push(join(CLAUDE_DIR, 'CLAUDE.md'), join(CLAUDE_DIR, 'LIFEOS', 'LIFEOS_SYSTEM_PROMPT.md'));
  // Only the CURRENT doctrine file is live; old versions, modes/, and the changelog are history.
  try {
    const v = readFileSync(join(CLAUDE_DIR, 'LIFEOS', 'ALGORITHM', 'LATEST'), 'utf8').trim();
    if (v) files.push(join(CLAUDE_DIR, 'LIFEOS', 'ALGORITHM', `v${v}.md`));
  } catch { scanError('retired-tokens: could not read ALGORITHM/LATEST'); }

  let scanned = 0;
  for (const f of files) {
    let text = '';
    try { text = readFileSync(f, 'utf8'); } catch { continue; }
    if (text.slice(0, 1024).includes('RETIRED')) continue; // history marker — exempt
    scanned++;
    for (const token of RETIRED_TOKENS) {
      let idx = text.indexOf(token);
      while (idx !== -1 && findings.length < 20) {
        const line = text.slice(0, idx).split('\n').length;
        findings.push({ detail: `${f.replace(CLAUDE_DIR + '/', '')}:${line} references retired harness API "${token}"`, blocking: true });
        idx = text.indexOf(token, idx + 1);
      }
    }
  }
  record('retired-tokens', findings, `${scanned} live files scanned, ${RETIRED_TOKENS.length} tokens`);
}

// ── Check: retirement-registry (G19's registry is not starved) ──
// G19 in ShadowRelease.ts blocks the cut when a RETIRED capability still reads
// as LIVE in the shipped payload. It is registry-driven: it only scans for the
// tokens listed in RETIRED_CAPABILITIES.json. On 2026-07-25 that registry held
// 4 entries while doctrine declared 49 retirements, so G19 passed three cuts in
// one night while the payload advertised a deleted CLI, agents removed
// 2026-06-10, a never-shipped command, and the whole retired mode/tier system.
// The gate never failed — it was never fed.
//
// Registration was a manual step with nothing enforcing it, so it only happened
// after an incident or a cross-vendor catch. This closes that: every
// retirement DATE that doctrine declares must appear in the registry. Date is a
// coarse but sound join key — it needs no prose parsing and cannot be gamed by
// wording. A declared retirement with no registry entry means G19 is blind to
// that whole capability, which is the exact hole this check exists to surface.
function checkRetirementRegistry(): void {
  const findings: Finding[] = [];
  const REGISTRY = join(CLAUDE_DIR, 'skills', '_LIFEOS', 'RETIRED_CAPABILITIES.json');

  // The retirement registry belongs to the private release-tooling skill, which is
  // stripped from every public release. Without this guard the catch below fired on
  // every public install and recorded a BLOCKING finding for a file that is not
  // supposed to exist there — turning a clean install into a permanent red integrity
  // check. Absent tooling is "not applicable", not "broken".
  if (!existsSync(join(CLAUDE_DIR, 'skills', '_LIFEOS'))) {
    record('retirement-registry', [], 'skipped — release tooling not installed');
    return;
  }

  const registered = new Set<string>();
  try {
    const parsed = JSON.parse(readFileSync(REGISTRY, 'utf8'));
    for (const e of parsed.capabilities ?? []) if (e?.retired) registered.add(String(e.retired));
  } catch {
    record('retirement-registry', [{ detail: `cannot read ${REGISTRY.replace(CLAUDE_DIR + '/', '')} — G19 has no registry to scan`, blocking: true }], 'registry unreadable');
    return;
  }

  // Doctrine surfaces only. Archive Algorithm versions and modes/ are history by
  // construction and declare retirements that are already accounted for.
  const roots = [join(CLAUDE_DIR, 'LIFEOS', 'DOCUMENTATION'), join(CLAUDE_DIR, 'LIFEOS', 'RULES')];
  const files: string[] = [];
  for (const root of roots) files.push(...findFiles(root, ['-type', 'f', '-name', '*.md']));
  files.push(join(CLAUDE_DIR, 'CLAUDE.md'), join(CLAUDE_DIR, 'LIFEOS', 'LIFEOS_SYSTEM_PROMPT.md'));

  // date -> first place it was declared, so the finding names where to look.
  const declared = new Map<string, string>();
  const DECL = /\b[Rr]etired\s+(\d{4}-\d{2}-\d{2})/g;
  for (const f of files) {
    let text = '';
    try { text = readFileSync(f, 'utf8'); } catch { continue; }
    for (const m of text.matchAll(DECL)) {
      const date = m[1];
      if (declared.has(date)) continue;
      const line = text.slice(0, m.index ?? 0).split('\n').length;
      declared.set(date, `${f.replace(CLAUDE_DIR + '/', '')}:${line}`);
    }
  }

  for (const [date, where] of [...declared].sort()) {
    if (registered.has(date)) continue;
    findings.push({
      detail: `retirement dated ${date} is declared at ${where} but has NO entry in RETIRED_CAPABILITIES.json — G19 cannot see it, so its dangling references ship silently`,
      blocking: true,
    });
  }

  record('retirement-registry', findings,
    `${declared.size} retirement dates declared in doctrine, ${registered.size} registered`);
}

// ── Check: x_token_ownership (single-owner X OAuth chain) ──
// The X bookmark pipeline died repeatedly (2026-05-20, 2026-07-21, 2026-07-22)
// because local code and the arbol-f-x-bookmarks-summarize worker each ran a
// refresh chain of the same grant: X refresh tokens are single-use, so the
// second chain's refresh trips reuse detection and X revokes the whole family.
// The worker is the ONLY legitimate owner of the refresh chain (it lives under
// LIFEOS/USER/CUSTOMIZATIONS/ARBOL, outside these roots). Any local .ts that
// calls X's token endpoint with a refresh grant, or recreates the retired
// local token store, reintroduces the exact failure class — block it.
function checkXTokenOwnership(): void {
  const findings: Finding[] = [];
  const roots = [
    join(CLAUDE_DIR, 'skills'),
    join(CLAUDE_DIR, 'LIFEOS', 'TOOLS'),
    join(CLAUDE_DIR, 'hooks'),
  ];
  const files: string[] = [];
  for (const root of roots) files.push(...findFiles(root, ['-type', 'f', '-name', '*.ts']));
  // The refresh GRANT specifically — the authorize flow's authorization_code
  // exchange also touches the token endpoint and stores refresh_token, and
  // that is legitimate (it seeds the worker's KV).
  const refreshGrant = /grant_type["'\s:=,]+refresh_token/;
  const retiredStore = 'x-oauth2-tokens' + '.json'; // split so this file never self-matches
  let scanned = 0;
  for (const f of files) {
    if (f.endsWith('IntegrityCheck.ts')) continue; // the checker's own patterns
    let text = '';
    try { text = readFileSync(f, 'utf8'); } catch { continue; }
    scanned++;
    const rel = f.replace(CLAUDE_DIR + '/', '');
    if (text.includes('api.twitter.com/2/oauth2/token') && refreshGrant.test(text)) {
      findings.push({ detail: `${rel} refreshes X OAuth tokens locally — the worker owns the chain; a second refresh chain gets the whole grant revoked`, blocking: true });
    }
    if (text.includes(retiredStore)) {
      findings.push({ detail: `${rel} references the retired local X token store — tokens live only in the worker's X_TOKENS KV`, blocking: true });
    }
  }
  record('x_token_ownership', findings, `${scanned} ts files scanned`);
}

// ── Check: gate_counts (release-gate count drift) ──
// The build-gate roster (GateKey in ShadowRelease.ts) has grown three times
// (15 → 16 → 17); each growth left stale "N gates" counts in rc.md,
// CreateShadowRelease.md, and SKILL.md prose with no deterministic catch.
// This check parses the GateKey union — the declared source of truth — and
// flags any live numeric "N gates" mention that disagrees. Files whose first
// 1KB contains "RETIRED" are history and exempt (same convention as
// retired-tokens). Word-form counts ("seventeen") are invisible to this
// check by design: write gate counts as digits.
function checkGateCounts(): void {
  const findings: Finding[] = [];
  let gateCount = 0;
  // Same reason as checkRetirementRegistry: GateKey lives in the private release
  // tooling. On a public install this raised a scan error for a file that is
  // correctly absent.
  if (!existsSync(join(CLAUDE_DIR, 'skills', '_LIFEOS'))) {
    record('gate_counts', [], 'skipped — release tooling not installed');
    return;
  }
  try {
    const src = readFileSync(join(CLAUDE_DIR, 'skills', '_LIFEOS', 'Tools', 'ShadowRelease.ts'), 'utf8');
    const typeLine = src.match(/type GateKey =[^;]+;/);
    if (!typeLine) throw new Error('GateKey type not found');
    gateCount = (typeLine[0].match(/"G\d+_/g) ?? []).length;
    if (gateCount === 0) throw new Error('GateKey parsed to zero members');
  } catch (e: any) {
    scanError(`gate_counts: could not parse GateKey from ShadowRelease.ts — ${e?.message ?? e}`);
    record('gate_counts', [], 'SCAN ERROR (no GateKey)');
    return;
  }
  const roots = [
    join(CLAUDE_DIR, 'skills', '_LIFEOS'),
    join(CLAUDE_DIR, 'commands'),
    join(CLAUDE_DIR, 'LIFEOS', 'DOCUMENTATION'),
  ];
  const files: string[] = [];
  for (const root of roots) files.push(...findFiles(root, ['-name', '*.md', '-type', 'f']));
  files.push(join(CLAUDE_DIR, 'CLAUDE.md'), join(CLAUDE_DIR, 'LIFEOS', 'LIFEOS_SYSTEM_PROMPT.md'));
  // Up to two intervening lowercase words so "15 security scrub gates" is caught too.
  // Negative lookbehind kills date fragments ("2026-07-16 after both gates").
  const countRe = /(?<![\d-])\b(\d{1,2})[ -](?:[a-z-]+ ){0,2}gates?\b/g;
  let scanned = 0;
  for (const f of files) {
    let text = '';
    try { text = readFileSync(f, 'utf8'); } catch { continue; }
    if (text.slice(0, 1024).includes('RETIRED')) continue; // history marker — exempt
    scanned++;
    let m: RegExpExecArray | null;
    countRe.lastIndex = 0;
    while ((m = countRe.exec(text)) !== null) {
      const n = parseInt(m[1], 10);
      // Only build-gate-plausible numbers are gated (≥10): small counts refer to
      // other gate families (boundary gates, emit-time gates) with their own rosters.
      if (n >= 10 && n !== gateCount) {
        const line = text.slice(0, m.index).split('\n').length;
        findings.push({ detail: `${f.replace(CLAUDE_DIR + '/', '')}:${line} says "${m[0]}" but GateKey declares ${gateCount} build gates`, blocking: true });
      }
    }
  }
  record('gate_counts', findings, `GateKey=${gateCount} gates; ${scanned} live files scanned, ${findings.length} drifted counts`);
}

// ── Change window (memory sweep anchor) ──
// Every run stamps last-run.json + appends runs.jsonl. Before overwriting, the
// previous stamp anchors a change window: everything committed in BOTH repos
// (~/.claude system + ~/.config/LIFEOS/USER data) since the last /ic run,
// aggregated into touched areas. This is the deterministic input for the
// workflow's contextual review — "we just reworked Pulse" shows up here as
// LIFEOS/PULSE/... churn, telling the model where integrity drift is likeliest.
interface ChangeWindow {
  lastRun: string | null;      // ISO ts of previous run (null = first stamped run)
  commits: number;             // total commits across both repos since lastRun
  areas: { path: string; files: number }[];  // touched areas, most-churned first
}

function gitChangedFiles(repo: string, sinceIso: string): string[] {
  try {
    const out = execFileSync('git', ['-C', repo, 'log', `--since=${sinceIso}`, '--name-only', '--pretty=format:'],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return out.split('\n').filter(Boolean);
  } catch { return []; }
}
function gitCommitCount(repo: string, sinceIso: string): number {
  try {
    const out = execFileSync('git', ['-C', repo, 'rev-list', '--count', `--since=${sinceIso}`, 'HEAD'], { encoding: 'utf8' });
    return parseInt(out.trim(), 10) || 0;
  } catch { return 0; }
}

// 13. skill-hygiene — every skill (public AND private) is publishable-clean code:
// no deny-list identity strings, no home paths, no vendored deps tracked in git.
// Delegates to SkillHygieneGate.ts (which consumes LIFEOS/USER/SECURITY/DENY_LIST.txt —
// one pattern source of truth). Added 2026-07-23 with the private-skill
// code/data-separation doctrine: sensitive data lives under LIFEOS/USER/, skills
// reference it by path.
function checkSkillHygiene(): void {
  const gate = join(TOOLS_DIR, 'SkillHygieneGate.ts');
  if (!existsSync(gate)) { scanError('skill-hygiene: SkillHygieneGate.ts missing'); return; }
  let parsed: any;
  try {
    const out = execFileSync('bun', [gate, '--json'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
    parsed = JSON.parse(out);
  } catch (e: any) {
    // exit 1 = violations (stdout still valid JSON); anything unparseable = scan error
    try { parsed = JSON.parse(e.stdout ?? ''); } catch { scanError(`skill-hygiene: gate failed: ${e.message}`); return; }
  }
  if (parsed.error) { scanError(`skill-hygiene: ${parsed.error}`); return; }
  const findings: Finding[] = [];
  for (const s of parsed.skills ?? []) {
    findings.push({ detail: `${s.skill}: ${s.count} deny-list hits in ${s.files} files (bun LIFEOS/TOOLS/SkillHygieneGate.ts --skill ${s.skill})`, blocking: true });
  }
  for (const d of parsed.vendoredDeps ?? []) {
    findings.push({ detail: `vendored deps tracked in git: ${d}`, blocking: true });
  }
  record('skill-hygiene', findings, `${parsed.totalViolations ?? '?'} violations, ${parsed.allowedHits ?? 0} allowlisted`);
}

// 14. credential-registry — the incident-response credential registry still describes
// reality: every key in .env has a curated blast-radius classification, and the generated
// registry/orphan documents are current. Added 2026-07-24 after the hand-maintained
// registry drifted to 22 of 124 keys — an unclassified credential is one nobody has
// decided how bad losing would be, which is exactly what you don't want to discover
// mid-incident. Non-blocking: it reports drift, it doesn't stop a release.
function checkCredentialRegistry(): void {
  const gen = join(CLAUDE_DIR, 'skills', '_INCIDENT_RESPONSE', 'Tools', 'GenerateRegistry.ts');
  if (!existsSync(gen)) return; // skill not installed — nothing to check
  const findings: Finding[] = [];
  let note = 'registry current';
  try {
    note = execFileSync('bun', [gen, '--check'], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
      .replace(/^CLEAN — /, '').trim();
  } catch (e: any) {
    const detail = `${e.stderr ?? ''}`.split('\n').filter((l: string) => l.trim().startsWith('- ')).map((l: string) => l.trim().slice(2));
    if (detail.length === 0) { scanError(`credential-registry: ${e.message}`); return; }
    for (const d of detail) findings.push({ detail: d, blocking: false });
    note = 'drift — run GenerateRegistry.ts';
  }
  // Estate-wide leg: credentials Atlas knows about (worker secret bindings) that the registry
  // has never classified. The 2026-07-24 join found 64 of these — a credential with no
  // blast-radius decision is invisible to incident response even though it's deployed.
  const atlas = join(LIFEOS_DIR, 'ATLAS', 'Atlas.ts');
  if (existsSync(atlas)) {
    try {
      const out = execFileSync('bun', [atlas, 'sql',
        "SELECT count(*) AS n FROM asset WHERE kind='credential' AND (attrs='{}' OR attrs IS NULL)"],
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      const n = JSON.parse(out)[0]?.n ?? 0;
      if (n > 0) {
        findings.push({
          detail: `${n} credential(s) in the Atlas graph carry no attributes at all — not even where they live (bun LIFEOS/ATLAS/Atlas.ts sql "SELECT display_name FROM asset WHERE kind='credential' AND attrs='{}'"). A deployed-only secret should still arrive with its vendor and holder from its collector; an empty stub means some collector emitted an edge without the asset.`,
          blocking: false,
        });
        note += ` · ${n} unclassified in graph`;
      }
    } catch { /* graph unavailable — env-file leg still reported */ }
  }
  record('credential-registry', findings, note);
}

// 15. permission-rule-shape — every permission rule in the settings cascade is a shape the
// harness actually honors. File permission checks match ONLY Edit(path) rules; Edit covers
// all file-editing tools (Write included), and a Write(...)/MultiEdit(...) entry is silently
// inert. Added 2026-07-26 after the 2026-07-25 "restore the Write() rules" commit acted on an
// audit finding that Write and Edit were distinct permission surfaces, and verified it by
// COUNTING entries in the file ("deny 42, 0 Edit rules without a Write twin") rather than
// probing behavior — shipping 19 dead rules the CLI then warned about at every startup.
// A shape check is cheap; the expensive part was believing a config-shape count was evidence.
// Two legs, because the dead rule and the real hole look identical in a diff:
//   - a deny/ask path guarded ONLY by Write(...) with no Edit twin is a REAL hole
//   - a Write(...)/MultiEdit(...) entry that does have an Edit twin is dead weight
// BOTH block as of 2026-07-27. The dead-weight leg shipped as info, and info is what an
// audit ignores: on 2026-07-27 the same wrong fix landed a THIRD time (145c86cd5), from
// the same false reading of the same file, while /ic sat at exit 0 reporting 30 of them.
// The recurring half is the FINDING, not the config, so the finding has to be the thing
// that stops. MergeSettings now prunes the shape out of the generated settings.json, so a
// hit here is always a SOURCE layer someone is re-polluting — never the harness's problem.
function checkPermissionRuleShape(): void {
  const layers: Array<[string, string]> = [
    ['settings.json', join(CLAUDE_DIR, 'settings.json')],
    ['settings.system.json', join(CLAUDE_DIR, 'settings.system.json')],
    ['settings.user.json', join(LIFEOS_DIR, 'USER', 'CONFIG', 'settings.user.json')],
  ];
  const findings: Finding[] = [];
  let scanned = 0, dead = 0;
  for (const [label, path] of layers) {
    if (!existsSync(path)) continue;
    let perms: Record<string, unknown>;
    try {
      perms = (JSON.parse(readFileSync(path, 'utf8'))?.permissions ?? {}) as Record<string, unknown>;
    } catch (e: any) { scanError(`permission-rule-shape: ${label} unparseable — ${e.message}`); continue; }
    scanned++;
    for (const bucket of ['allow', 'deny', 'ask']) {
      const rules = perms[bucket];
      if (!Array.isArray(rules)) continue;
      for (const rule of rules) {
        if (typeof rule !== 'string') continue;
        const m = /^(Write|MultiEdit)\((.*)\)$/.exec(rule);
        if (!m) continue;
        dead++;
        const twin = `Edit(${m[2]})`;
        const covered = rules.includes(twin);
        findings.push({
          detail: covered
            // Carry the evidence in the finding: whoever reads this line is, on the
            // record, about to re-derive "Write and Edit are distinct surfaces" from
            // the missing twin and re-add it. Name the probe that says otherwise.
            ? `${label} ${bucket}: ${rule} is inert — file permissions match Edit(...) ONLY (live probe, commit b68b1a5c4); ${twin} already guards this path. DELETE it. Do not "restore" Write twins — that finding has been wrong 3x (07-16, 07-25, 07-27); a config-shape count is not a behavior probe.`
            : `${label} ${bucket}: ${rule} is inert and has NO ${twin} — this path is UNGUARDED; add ${twin} (not a Write rule).`,
          blocking: true,
        });
      }
    }
  }
  record('permission-rule-shape', findings,
    dead === 0
      ? `${scanned} settings layers, no inert rules`
      : `${scanned} settings layers, ${dead} inert Write/MultiEdit rule(s)`);
}

// 16. model-rung-pin — the main loop actually runs the rung doctrine claims it runs.
//
// Algorithm §Spend and OPERATIONAL_RULES § Model selection both state the main loop is
// pinned to the top rung "by config, not by election". v8.17.0 shipped the `//model`
// RATIONALE STRING into settings.json and never wrote the `model` key beside it, so every
// session since ran a rung below doctrine while both documents asserted otherwise, and
// nothing observed the gap (INC-20260730). A comment explaining a pin is not a pin.
function checkModelRungPin(): void {
  const findings: Finding[] = [];
  const settingsPath = join(CLAUDE_DIR, 'settings.json');

  let settings: any;
  try { settings = JSON.parse(readFileSync(settingsPath, 'utf8')); }
  catch (e: any) { scanError(`model-rung-pin: settings.json unreadable — ${e.message}`); record('model-rung-pin', [], 'SCAN ERROR'); return; }

  // The top rung's alias, resolved from the registry so a lineup bump never edits this.
  // Anchored to the EFFORT_MODEL declaration: the file's doc comment above it contains a
  // worked example reading `max: "opus"`, and an unanchored match reads the prose instead
  // of the code — the same comment-mistaken-for-config fault this check exists to catch.
  let topRung = '';
  try {
    const models = readFileSync(join(CLAUDE_DIR, 'LIFEOS/TOOLS/models.ts'), 'utf8');
    const decl = models.split(/export const EFFORT_MODEL[^=]*=/)[1] ?? '';
    topRung = decl.split('}')[0]?.match(/\bmax:\s*"([a-z0-9-]+)"/)?.[1] ?? '';
  } catch { /* handled below */ }

  if (!topRung) {
    findings.push({ detail: 'could not resolve EFFORT_MODEL.max from LIFEOS/TOOLS/models.ts', blocking: true });
  } else if (settings.model === undefined) {
    findings.push({
      detail: `settings.json has no "model" key — the main loop runs the harness default, while doctrine claims the top rung (${topRung}). This is the INC-20260730 shape.`,
      blocking: true,
    });
  } else if (settings.model !== topRung) {
    findings.push({
      detail: `settings.json pins model="${settings.model}" but EFFORT_MODEL.max is "${topRung}" — config and the rung registry disagree`,
      blocking: true,
    });
  }

  // A pinned ID rots on the next lineup bump; the alias auto-tracks.
  if (typeof settings.model === 'string' && /\d{6,}|claude-/.test(settings.model)) {
    findings.push({ detail: `settings.json pins a model ID ("${settings.model}") rather than a tier alias — it will rot on the next lineup bump`, blocking: true });
  }

  record('model-rung-pin', findings,
    findings.length === 0 ? `main loop pinned to "${settings.model}" (top rung)` : 'doctrine and config disagree on the main-loop rung');
}

function computeChangeWindow(): ChangeWindow {
  let lastRun: string | null = null;
  for (const f of ['last-run.json', 'last-pass.json']) {
    try {
      const ts = JSON.parse(readFileSync(join(STATE_DIR, f), 'utf8')).ts;
      if (typeof ts === 'string' && ts) { lastRun = ts; break; }
    } catch { /* try next */ }
  }
  if (!lastRun) return { lastRun: null, commits: 0, areas: [] };

  const areaCounts = new Map<string, number>();
  const bump = (prefix: string, file: string) => {
    const segs = file.split('/').filter(Boolean);
    const area = prefix + segs.slice(0, Math.min(segs.length - 1, 3)).join('/');
    areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
  };
  for (const f of gitChangedFiles(CLAUDE_DIR, lastRun)) bump('', f);
  for (const f of gitChangedFiles(USER_REPO, lastRun)) bump('USER-repo:', f);
  const areas = [...areaCounts.entries()]
    .map(([path, files]) => ({ path, files }))
    .sort((a, b) => b.files - a.files)
    .slice(0, 15);
  const commits = gitCommitCount(CLAUDE_DIR, lastRun) + gitCommitCount(USER_REPO, lastRun);
  return { lastRun, commits, areas };
}

const changeWindow = computeChangeWindow();

// ── Run all ──
try {
  checkReferences();
  checkVersionAnchors();
  checkHookRegistration();
  checkHookWiring();
  checkCarrierProbe();
  checkModelRungPin();
  checkRuleDuplication();
  checkReplayCorpus();
  checkClaudeImports();
  checkSkills();
  checkWorkflows();
  checkRetiredTokens();
  checkRetirementRegistry();
  checkGateCounts();
  checkXTokenOwnership();
  checkFrontmatterUnits('commands', join(CLAUDE_DIR, 'commands'), true);
  checkFrontmatterUnits('agents', join(CLAUDE_DIR, 'agents'), false);
  checkAgentSharedBlocks();
  checkSkillHygiene();
  checkCredentialRegistry();
  checkPermissionRuleShape();
  checkProseInCode();
  checkAscentVocabulary();
  checkBlockMessages();
} catch (e: any) {
  if (jsonOutput) console.log(JSON.stringify({ error: e.message }, null, 2));
  else console.error(`SCAN ERROR: ${e.message}`);
  process.exit(2);
}

const totalBlocking = checks.reduce((n, c) => n + c.blockingCount, 0);
const totalInfo = checks.reduce((n, c) => n + c.infoCount, 0);
// Exit-code precedence (Forge audit 2026-07-06): scan error (2) outranks blocking (1) outranks clean (0).
// A check that could not RUN is exit 2 — never collapsed into a blocking finding, so a broken
// tool can never masquerade as a clean-but-blocking result.
const exitCode = scanErrors.length > 0 ? 2 : totalBlocking > 0 ? 1 : 0;

// ── Stamp this run (always — success or findings, the run itself is the anchor) ──
// last-pass.json (clean-pass stamp, version-bump gate) is the workflow's job and
// only written after a clean/triaged pass; last-run.json records that /ic RAN.
try {
  mkdirSync(STATE_DIR, { recursive: true });
  let head = '';
  try { head = execFileSync('git', ['-C', CLAUDE_DIR, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch {}
  const runRecord = { ts: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), head, exitCode, blocking: totalBlocking, info: totalInfo };
  writeFileSync(join(STATE_DIR, 'last-run.json'), JSON.stringify(runRecord) + '\n');
  appendFileSync(join(STATE_DIR, 'runs.jsonl'), JSON.stringify(runRecord) + '\n');
} catch (e: any) {
  console.error(`warn: could not write run stamp: ${e?.message ?? e}`);
}

if (jsonOutput) {
  console.log(JSON.stringify({
    ok: exitCode === 0,
    exitCode,
    scanErrors,
    totalBlocking,
    totalInfo,
    changeWindow,
    checks: checks.map(c => ({ name: c.name, ok: c.ok, blocking: c.blockingCount, info: c.infoCount, note: c.note, findings: c.findings })),
  }, null, 2));
} else {
  const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', DIM = '\x1b[2m', RST = '\x1b[0m';
  console.log(`\n🔎 LifeOS Integrity Check\n${'─'.repeat(60)}`);
  if (changeWindow.lastRun) {
    console.log(`${DIM}Change window: last run ${changeWindow.lastRun} · ${changeWindow.commits} commits since (both repos)${RST}`);
    for (const a of changeWindow.areas) console.log(`${DIM}  ${String(a.files).padStart(4)} files  ${a.path}${RST}`);
    if (changeWindow.areas.length > 0) console.log(`${DIM}  → focus the contextual review on the most-churned areas above${RST}`);
    console.log('─'.repeat(60));
  } else {
    console.log(`${DIM}Change window: no prior run stamp — first stamped run, full-tree scope${RST}\n${'─'.repeat(60)}`);
  }
  for (const c of checks) {
    const icon = c.blockingCount > 0 ? `${R}✗${RST}` : c.infoCount > 0 ? `${Y}!${RST}` : `${G}✓${RST}`;
    if (quiet && c.blockingCount === 0 && c.infoCount === 0) continue;
    console.log(`${icon} ${c.name.padEnd(20)} ${DIM}${c.note ?? ''}${RST}`);
    // Blocking findings always print. Non-blocking print only with --verbose (default rolls them to the note count).
    for (const f of c.findings) {
      if (!f.blocking && !verbose) continue;
      console.log(`    ${f.blocking ? R + 'BLOCK' : Y + 'info '}${RST} ${f.detail}`);
    }
    if (!verbose && c.infoCount > 0) console.log(`    ${DIM}(${c.infoCount} non-blocking — run --verbose to list)${RST}`);
  }
  console.log(`${'─'.repeat(60)}`);
  for (const se of scanErrors) console.log(`${R}⚠ SCAN ERROR${RST} ${se}`);
  const verdict = scanErrors.length > 0 ? `${R}SCAN ERROR (exit 2)${RST}` : totalBlocking > 0 ? `${R}${totalBlocking} BLOCKING${RST}` : `${G}CLEAN${RST}`;
  console.log(`Verdict: ${verdict}  ${DIM}(${totalInfo} non-blocking info)${RST}`);
  console.log(`${DIM}Tier: deterministic (structural + reference integrity). Semantic drift — docs describing changed behavior — is only caught by /ic --deep.${RST}\n`);
  if (deep) {
    console.log(`${DIM}--deep: run the 12-agent deep audit via the release/maintenance skill's integrity-check workflow.${RST}\n`);
  }
}

process.exit(exitCode);
