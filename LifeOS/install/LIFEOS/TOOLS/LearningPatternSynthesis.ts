#!/usr/bin/env bun
/**
 * LearningPatternSynthesis - Aggregate ratings into actionable patterns
 *
 * Analyzes LEARNING/SIGNALS/ratings.jsonl to find recurring patterns
 * and generates synthesis reports for continuous improvement.
 *
 * Commands:
 *   --week         Analyze last 7 days (default)
 *   --month        Analyze last 30 days
 *   --all          Analyze all ratings
 *   --dry-run      Show analysis without writing
 *   --hypothesize  Run proactive deriver loop — emit ≤3 hypothesis notes
 *                  to MEMORY/WISDOM/FRAMES/_hypotheses/. See deriver section
 *                  below.
 *   --window <Nd>  Window for --hypothesize, e.g. 7d, 30d, 90d (default 7d)
 *   --no-inference Skip the patch-proposal inference step (deriver v2)
 *
 * Deriver v3 (2026-07-13, true-healing-loop ISA): intake widened beyond
 * ratings.jsonl to the observability failure streams via RecurrenceLedger
 * (gate blocks, tool failures, healer events). A recurring failure class that
 * crosses HEALING_RECURRENCE_THRESHOLD gets a HEALING FIXTURE drafted — a RED
 * replay fixture (DATA, never code) proving the class isn't caught, landed in
 * test/regression/pending/. The fix is done through the normal Algorithm;
 * PromoteFixture.ts moves a now-green fixture into the blocking corpus. The
 * deriver never authors code that touches a hook.
 *
 * Examples:
 *   bun run LearningPatternSynthesis.ts --week
 *   bun run LearningPatternSynthesis.ts --month --dry-run
 *   bun run LearningPatternSynthesis.ts --hypothesize
 *   bun run LearningPatternSynthesis.ts --hypothesize --window 14d --dry-run
 */

import { parseArgs } from "util";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {
  FRUSTRATION_PATTERNS, SUCCESS_PATTERNS,
  collectObservabilityClusters, readPatchRegistry,
  type ObservabilityCluster,
} from "./RecurrenceLedger";

// ============================================================================
// Configuration
// ============================================================================

const CLAUDE_DIR = path.join(process.env.HOME!, ".claude");
const LIFEOS_DIR = path.join(CLAUDE_DIR, "LIFEOS");
const MEMORY_DIR = path.join(LIFEOS_DIR, "MEMORY");
const LEARNING_DIR = path.join(MEMORY_DIR, "LEARNING");
const RATINGS_FILE = path.join(LEARNING_DIR, "SIGNALS", "ratings.jsonl");
// v2 (2026-07-13): observability streams are now an intake source via
// RecurrenceLedger.collectObservabilityClusters. REFLECTIONS/WORK fusion
// remains future work.
const SYNTHESIS_DIR = path.join(LEARNING_DIR, "SYNTHESIS");
const KNOWLEDGE_PEOPLE_DIR = path.join(MEMORY_DIR, "KNOWLEDGE", "People");
const FRAMES_DIR = path.join(MEMORY_DIR, "WISDOM", "FRAMES");
const HYPOTHESES_DIR = path.join(FRAMES_DIR, "_hypotheses");
const HYPOTHESES_ARCHIVE_DIR = path.join(HYPOTHESES_DIR, "_archive");
const HYPOTHESES_STATE_FILE = path.join(HYPOTHESES_DIR, ".state.json");
const DERIVER_LOG = path.join(MEMORY_DIR, "OBSERVABILITY", "deriver.log");
const PENDING_DIR = path.join(CLAUDE_DIR, "test", "regression", "pending");

// Deriver doctrine — non-negotiable floors
const HYPO_CONFIDENCE_FLOOR = 0.6;
const HYPO_SAMPLE_FLOOR = 5;
const HYPO_MAX_PER_RUN = 3;
const HYPO_EXPIRY_DAYS = 30;
const HYPO_DEDUP_RETENTION_DAYS = 30; // claim-hashes kept post-archival

// Deriver v3 — observability intake + healing-fixture proposals
const OBS_SAMPLE_FLOOR = 3;               // hard failures are rarer than ratings
const HEALING_RECURRENCE_THRESHOLD = 2;   // class recurrence before a fixture is drafted
const HEALING_MAX_PER_RUN = 1;            // one drafted fixture per nightly run

// ============================================================================
// Types
// ============================================================================

interface Rating {
  timestamp: string;
  rating: number;
  session_id: string;
  source: "explicit" | "implicit";
  sentiment_summary: string;
  confidence: number;
  comment?: string;
}

interface PatternGroup {
  pattern: string;
  count: number;
  avgRating: number;
  avgConfidence: number;
  examples: string[];
}

interface SynthesisResult {
  period: string;
  totalRatings: number;
  avgRating: number;
  frustrations: PatternGroup[];
  successes: PatternGroup[];
  topIssues: string[];
  recommendations: string[];
}

// ============================================================================
// Pattern Detection
// ============================================================================

// Pattern dictionaries live in RecurrenceLedger.ts (single source — the ledger
// classifies failure captures with the same regexes; imported at top).

function detectPatterns(summaries: string[], patterns: Record<string, RegExp>): Map<string, string[]> {
  const results = new Map<string, string[]>();

  for (const summary of summaries) {
    for (const [name, pattern] of Object.entries(patterns)) {
      if (pattern.test(summary)) {
        if (!results.has(name)) {
          results.set(name, []);
        }
        results.get(name)!.push(summary);
      }
    }
  }

  return results;
}

function groupToPatternGroups(
  grouped: Map<string, string[]>,
  ratings: Rating[]
): PatternGroup[] {
  const groups: PatternGroup[] = [];

  for (const [pattern, examples] of grouped.entries()) {
    // Find ratings that match these examples
    const matchingRatings = ratings.filter(r =>
      examples.some(e => e === r.sentiment_summary)
    );

    const avgRating = matchingRatings.length > 0
      ? matchingRatings.reduce((sum, r) => sum + r.rating, 0) / matchingRatings.length
      : 5;

    const avgConfidence = matchingRatings.length > 0
      ? matchingRatings.reduce((sum, r) => sum + r.confidence, 0) / matchingRatings.length
      : 0.5;

    groups.push({
      pattern,
      count: examples.length,
      avgRating,
      avgConfidence,
      examples: examples.slice(0, 3), // Top 3 examples
    });
  }

  return groups.sort((a, b) => b.count - a.count);
}

// ============================================================================
// Analysis
// ============================================================================

function analyzeRatings(ratings: Rating[], period: string): SynthesisResult {
  if (ratings.length === 0) {
    return {
      period,
      totalRatings: 0,
      avgRating: 0,
      frustrations: [],
      successes: [],
      topIssues: [],
      recommendations: [],
    };
  }

  const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

  // Separate frustrations (rating <= 4) and successes (rating >= 7)
  const frustrationRatings = ratings.filter(r => r.rating <= 4);
  const successRatings = ratings.filter(r => r.rating >= 7);

  const frustrationSummaries = frustrationRatings.map(r => r.sentiment_summary);
  const successSummaries = successRatings.map(r => r.sentiment_summary);

  // Detect patterns
  const frustrationGroups = detectPatterns(frustrationSummaries, FRUSTRATION_PATTERNS);
  const successGroups = detectPatterns(successSummaries, SUCCESS_PATTERNS);

  const frustrations = groupToPatternGroups(frustrationGroups, frustrationRatings);
  const successes = groupToPatternGroups(successGroups, successRatings);

  // Generate top issues (most common frustrations)
  const topIssues = frustrations
    .slice(0, 3)
    .map(f => `${f.pattern} (${f.count} occurrences, avg rating ${f.avgRating.toFixed(1)})`);

  // Generate recommendations based on patterns
  const recommendations: string[] = [];

  if (frustrations.some(f => f.pattern === "Time/Performance Issues")) {
    recommendations.push("Consider setting clearer time expectations and progress updates");
  }
  if (frustrations.some(f => f.pattern === "Wrong Approach")) {
    recommendations.push("Ask clarifying questions before starting complex tasks");
  }
  if (frustrations.some(f => f.pattern === "Over-engineering")) {
    recommendations.push("Default to simpler solutions; only add complexity when justified");
  }
  if (frustrations.some(f => f.pattern === "Communication Problems")) {
    recommendations.push("Summarize understanding before implementation");
  }

  if (recommendations.length === 0) {
    recommendations.push("Continue current patterns - no major issues detected");
  }

  return {
    period,
    totalRatings: ratings.length,
    avgRating,
    frustrations,
    successes,
    topIssues,
    recommendations,
  };
}

// ============================================================================
// File Generation
// ============================================================================

function formatSynthesisReport(result: SynthesisResult): string {
  const date = new Date().toISOString().split('T')[0];

  let content = `# Learning Pattern Synthesis

**Period:** ${result.period}
**Generated:** ${date}
**Total Ratings:** ${result.totalRatings}
**Average Rating:** ${result.avgRating.toFixed(1)}/10

---

## Top Issues

${result.topIssues.length > 0
    ? result.topIssues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')
    : 'No significant issues detected'}

## Frustration Patterns

`;

  if (result.frustrations.length === 0) {
    content += '*No frustration patterns detected*\n\n';
  } else {
    for (const f of result.frustrations) {
      content += `### ${f.pattern}

- **Occurrences:** ${f.count}
- **Avg Rating:** ${f.avgRating.toFixed(1)}
- **Confidence:** ${(f.avgConfidence * 100).toFixed(0)}%
- **Examples:**
${f.examples.map(e => `  - "${e}"`).join('\n')}

`;
    }
  }

  content += `## Success Patterns

`;

  if (result.successes.length === 0) {
    content += '*No success patterns detected*\n\n';
  } else {
    for (const s of result.successes) {
      content += `### ${s.pattern}

- **Occurrences:** ${s.count}
- **Avg Rating:** ${s.avgRating.toFixed(1)}
- **Examples:**
${s.examples.map(e => `  - "${e}"`).join('\n')}

`;
    }
  }

  content += `## Recommendations

${result.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

---

*Generated by LearningPatternSynthesis tool*
`;

  return content;
}

function writeSynthesis(result: SynthesisResult, period: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const monthDir = path.join(SYNTHESIS_DIR, `${year}-${month}`);
  if (!fs.existsSync(monthDir)) {
    fs.mkdirSync(monthDir, { recursive: true });
  }

  const dateStr = now.toISOString().split('T')[0];
  const filename = `${dateStr}_${period.toLowerCase().replace(/\s+/g, '-')}-patterns.md`;
  const filepath = path.join(monthDir, filename);

  const content = formatSynthesisReport(result);
  fs.writeFileSync(filepath, content);

  return filepath;
}

// ============================================================================
// Hypothesis Generation (Proactive Deriver Loop)
// ============================================================================
//
// Reads recent LEARNING/SIGNALS, REFLECTIONS, FAILURES, and WORK/*/ISA.md
// content within a window. Clusters by lexical overlap. Emits ≤3 hypothesis
// notes per run that meet floors (confidence ≥ 0.6, sample ≥ 5).
// Idempotent via claim-hash dedup against the prior 30 days.
// Writes to MEMORY/WISDOM/FRAMES/_hypotheses/.

interface HypothesisFrontmatter {
  status: "hypothesis" | "graduated" | "rejected" | "expired";
  slug: string;
  target_frame: string;
  confidence: number;
  generated: string;
  expires: string;
  evidence_signals: string[];
  falsifier: string;
}

// The deriver's drafted output is DATA, never code (iteration-3 pivot): a red
// replay fixture that PROVES the class isn't handled yet. The fix is done
// through the normal Algorithm; a now-green fixture is promoted into the
// blocking corpus by PromoteFixture.ts. No model-authored code touches a hook.
interface HealingFixtureProposal {
  rationale: string;
  surface: "hook" | "rule" | "skill" | "settings";
  fixture: object;      // ReplayFixture-shaped, validated + verified RED at draft
  pending_slug: string; // where it landed under test/regression/pending/
}

interface HypothesisCandidate {
  slug: string;
  claim: string;
  target_frame: string;
  confidence: number;
  evidence_signals: string[];
  falsifier: string;
  pattern: string; // source pattern name for context
  cluster_size: number;
  source: "ratings" | "observability";
  class_id?: string; // observability candidates only
  dedup_key: string; // stable identity for claim-hash dedup
  enforcement_surface: "context" | "hook" | "rule" | "settings" | "skill";
  healing?: HealingFixtureProposal;
}

interface DeriverState {
  schema_version: number;
  last_run: string | null;
  claim_hashes: Record<string, { hash: string; archived_at: string | null; status: string }>;
}

function parseWindow(arg: string | undefined): number {
  if (!arg) return 7;
  const m = arg.match(/^(\d+)d$/);
  if (!m) throw new Error(`Invalid --window format: ${arg}. Use Nd (e.g. 7d, 30d, 90d).`);
  const n = parseInt(m[1], 10);
  if (n < 1 || n > 365) throw new Error(`--window out of range: ${arg}. Use 1d–365d.`);
  return n;
}

function readDeriverState(): DeriverState {
  if (!fs.existsSync(HYPOTHESES_STATE_FILE)) {
    return { schema_version: 1, last_run: null, claim_hashes: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(HYPOTHESES_STATE_FILE, "utf-8"));
  } catch {
    return { schema_version: 1, last_run: null, claim_hashes: {} };
  }
}

function writeDeriverState(state: DeriverState): void {
  const tmp = HYPOTHESES_STATE_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, HYPOTHESES_STATE_FILE);
}

function pruneStateClaimHashes(state: DeriverState): DeriverState {
  const cutoff = Date.now() - HYPO_DEDUP_RETENTION_DAYS * 86400 * 1000;
  for (const [slug, entry] of Object.entries(state.claim_hashes)) {
    if (entry.archived_at) {
      const archivedMs = new Date(entry.archived_at).getTime();
      if (archivedMs < cutoff) delete state.claim_hashes[slug];
    }
  }
  return state;
}

function claimHash(claim: string): string {
  const normalized = claim.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

function loadJsonl<T>(filepath: string): T[] {
  if (!fs.existsSync(filepath)) return [];
  return fs.readFileSync(filepath, "utf-8")
    .split("\n")
    .filter(line => line.trim())
    .map(line => { try { return JSON.parse(line); } catch { return null; } })
    .filter((x): x is T => x !== null);
}

function listPeopleSlugs(): Set<string> {
  if (!fs.existsSync(KNOWLEDGE_PEOPLE_DIR)) return new Set();
  const slugs = new Set<string>();
  for (const f of fs.readdirSync(KNOWLEDGE_PEOPLE_DIR)) {
    if (f.endsWith(".md")) slugs.add(f.replace(/\.md$/, "").toLowerCase());
  }
  return slugs;
}

function violatesPrivacy(text: string, peopleSlugs: Set<string>): boolean {
  const norm = text.toLowerCase();
  for (const slug of peopleSlugs) {
    // Slug typically `firstname-lastname`; check for both joined and space-separated.
    const flat = slug.replace(/-/g, "");
    const spaced = slug.replace(/-/g, " ");
    if (norm.includes(spaced) || norm.includes(flat)) return true;
  }
  return false;
}

function listExistingFrames(): { name: string; body: string }[] {
  if (!fs.existsSync(FRAMES_DIR)) return [];
  const out: { name: string; body: string }[] = [];
  for (const f of fs.readdirSync(FRAMES_DIR)) {
    if (!f.endsWith(".md") || f.startsWith("_")) continue;
    if (f.toUpperCase() === "README.MD") continue;
    const name = f.replace(/\.md$/, "");
    const body = fs.readFileSync(path.join(FRAMES_DIR, f), "utf-8");
    out.push({ name, body });
  }
  return out;
}

function suggestTargetFrame(claim: string, frames: { name: string; body: string }[]): string {
  const claimTokens = new Set(claim.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 3));
  let best = { name: "new", overlap: 0 };
  for (const f of frames) {
    const titleTokens = new Set(f.name.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 3));
    let overlap = 0;
    for (const t of claimTokens) if (titleTokens.has(t)) overlap += 2;
    // Body token overlap (cheap top-line heuristic — count claim tokens appearing in body)
    const bodyLower = f.body.toLowerCase();
    for (const t of claimTokens) if (bodyLower.includes(t)) overlap += 1;
    if (overlap > best.overlap) best = { name: f.name, overlap };
  }
  return best.overlap >= 3 ? best.name : "new";
}

function alreadyInFrame(claim: string, frames: { name: string; body: string }[]): boolean {
  const claimTokens = claim.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 3);
  if (claimTokens.length === 0) return false;
  for (const f of frames) {
    const bodyLower = f.body.toLowerCase();
    let hits = 0;
    for (const t of claimTokens) if (bodyLower.includes(t)) hits++;
    // ≥70% of claim tokens already in this frame body → consider it covered
    if (hits / claimTokens.length >= 0.7) return true;
  }
  return false;
}

function slugifyClaim(claim: string): string {
  return claim.toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join("-")
    .slice(0, 60) || "untitled";
}

function buildHypothesisFromCluster(
  patternName: string,
  examples: string[],
  ratings: Rating[],
  frames: { name: string; body: string }[]
): HypothesisCandidate | null {
  if (examples.length < HYPO_SAMPLE_FLOOR) return null;

  const matching = ratings.filter(r => examples.includes(r.sentiment_summary));
  if (matching.length < HYPO_SAMPLE_FLOOR) return null;

  const avgConfidence = matching.reduce((s, r) => s + r.confidence, 0) / matching.length;
  const sizeFactor = Math.min(matching.length / 20, 1); // saturate at 20 signals
  const confidence = Math.min(avgConfidence * 0.6 + sizeFactor * 0.4, 1.0);
  if (confidence < HYPO_CONFIDENCE_FLOOR) return null;

  const avgRating = matching.reduce((s, r) => s + r.rating, 0) / matching.length;
  const direction = avgRating <= 4 ? "frustration" : avgRating >= 7 ? "satisfaction" : "mixed";

  const claim = `Recurring ${patternName.toLowerCase()} pattern (${matching.length} signals, avg rating ${avgRating.toFixed(1)}/10) — ${direction} cluster.`;

  if (alreadyInFrame(claim, frames)) return null;

  const evidence = matching.slice(0, Math.min(matching.length, 10)).map(r => `sig:${r.timestamp}`);
  const falsifier =
    direction === "frustration"
      ? `Refuted if next ${matching.length} signals matching "${patternName}" average rating ≥ 6.`
      : direction === "satisfaction"
      ? `Refuted if next ${matching.length} signals matching "${patternName}" average rating ≤ 4.`
      : `Refuted if next ${matching.length} signals matching "${patternName}" cluster confidence < ${HYPO_CONFIDENCE_FLOOR}.`;

  return {
    slug: slugifyClaim(`${patternName}-${direction}`),
    claim,
    target_frame: suggestTargetFrame(claim, frames),
    confidence: Number(confidence.toFixed(2)),
    evidence_signals: evidence,
    falsifier,
    pattern: patternName,
    cluster_size: matching.length,
    source: "ratings",
    dedup_key: claim,
    enforcement_surface: "context",
  };
}

function buildObservabilityCandidate(
  cluster: ObservabilityCluster,
  windowDays: number,
  frames: { name: string; body: string }[]
): HypothesisCandidate | null {
  if (cluster.count < OBS_SAMPLE_FLOOR) return null;
  // Deterministic confidence: recurrence-driven, saturating well below 1.
  const confidence = Math.min(0.6 + cluster.count * 0.02, 0.95);
  const topExample = cluster.examples[0] ? ` Top example: ${cluster.examples[0].slice(0, 160)}` : "";
  const claim = `Recurring failure class ${cluster.classId} — ${cluster.count} events in ${windowDays}d, last ${cluster.lastSeen.slice(0, 10)}.${topExample}`;
  return {
    slug: slugifyClaim(cluster.classId.replace(/[:]/g, " ")),
    claim,
    target_frame: suggestTargetFrame(claim, frames),
    confidence: Number(confidence.toFixed(2)),
    evidence_signals: cluster.sigRefs,
    falsifier: `Refuted if class ${cluster.classId} logs zero events over the next ${windowDays}d of normal operation.`,
    pattern: cluster.classId,
    cluster_size: cluster.count,
    source: "observability",
    class_id: cluster.classId,
    // Stable identity: the class ID — the claim text embeds counts/dates that
    // change nightly and would defeat claim-hash dedup.
    dedup_key: `obs-class:${cluster.classId}`,
    enforcement_surface: "context", // upgraded to a code surface iff a patch is drafted
  };
}

// ── Healing-fixture proposal (deriver v3 — draft a RED test, never a patch) ──
// The pivot (2026-07-13): a model authoring diffs to enforcement code is in
// tension with the standing rule "security-sensitive code must be deterministic,
// simple, auditable, not open to prompt injection." So the deriver now drafts a
// DATA-ONLY replay fixture that PROVES the class isn't handled — one inference
// call, output is a ReplayFixture (JSON), run by the fixed/audited hook-replay
// runner. The fixture is verified RED at draft time (proof the gap is real) and
// lands in test/regression/pending/ (quarantine, never blocking). The fix is
// done through the normal Algorithm; PromoteFixture moves a now-green fixture
// into the blocking corpus. No model-authored code ever reaches a hook.

const HOOK_REF_RE = /^hooks\/[A-Za-z0-9_]+\.hook\.ts$/;

function hookInventory(): string {
  const hooksDir = path.join(CLAUDE_DIR, "hooks");
  const hooks = fs.existsSync(hooksDir)
    ? fs.readdirSync(hooksDir).filter(f => f.endsWith(".hook.ts")).sort()
    : [];
  return `Existing Stop/PreToolUse hooks (a fixture targets exactly one): ${hooks.join(", ")}`;
}

/** Structural validation of a model-drafted fixture. Returns the fixture typed,
 *  or null with a logged reason. NEVER trusts the model's `hook` field beyond
 *  this gate + the runner's own assertHookRef. */
function validateDraftedFixture(raw: any, log: string[], classId: string): any | null {
  if (!raw || typeof raw !== "object") { log.push(`fixture-not-object: ${classId}`); return null; }
  if (raw.mode !== "stop-hook") { log.push(`fixture-bad-mode: ${classId} — ${raw.mode}`); return null; }
  if (typeof raw.hook !== "string" || !HOOK_REF_RE.test(raw.hook) || !fs.existsSync(path.join(CLAUDE_DIR, raw.hook))) {
    log.push(`fixture-bad-hook: ${classId} — ${JSON.stringify(raw.hook)}`); return null;
  }
  if (raw.expect !== "block" && raw.expect !== "pass") { log.push(`fixture-bad-expect: ${classId} — ${raw.expect}`); return null; }
  if (!Array.isArray(raw.transcript)) { log.push(`fixture-bad-transcript: ${classId}`); return null; }
  // Keep only the known data fields — strip anything else the model emitted.
  return {
    class_id: classId,
    incident: String(raw.incident ?? "").slice(0, 400),
    mode: "stop-hook",
    hook: raw.hook,
    expect: raw.expect,
    last_assistant_message: String(raw.last_assistant_message ?? ""),
    transcript: raw.transcript,
  };
}

export async function proposeHealingFixture(c: HypothesisCandidate, log: string[]): Promise<HealingFixtureProposal | null> {
  const { inference } = await import("./Inference");
  // The hook-replay harness lives in test/, which does not ship in the public
  // payload — degrade gracefully instead of crashing the deriver on installs
  // without it (Forge 7.10.0 audit finding, dangling-dynamic-import class).
  const replayPath = new URL("../../test/lib/hook-replay.ts", import.meta.url).pathname;
  if (!fs.existsSync(replayPath)) {
    log.push("hook-replay harness not present in this install — skipping healing-fixture proposal");
    return null;
  }
  const { runFixture } = await import("../../test/lib/hook-replay");
  const evidence = [
    `Failure class: ${c.class_id}`,
    `Recurrence: ${c.cluster_size} events`,
    `Claim: ${c.claim}`,
    `Evidence refs: ${c.evidence_signals.join(", ")}`,
  ].join("\n");

  // ONE ideal-state call. Output is DATA (a fixture) plus a surface + rationale.
  const res = await inference({
    systemPrompt: [
      "You are the LifeOS self-healing fixture author. A failure class keeps recurring.",
      "Your job is NOT to write a fix — it is to write a FAILING REGRESSION FIXTURE that",
      "proves the class is not yet caught, so a human/agent can then fix it and the",
      "fixture turns green. Output is DATA ONLY, never code.",
      "The fixture is a replay of a Stop hook: it feeds a transcript + final assistant",
      "message to ONE existing hook and asserts the outcome that SHOULD hold once the",
      "class is handled (expect:\"block\" for something that should be blocked but isn't",
      "yet; expect:\"pass\" for a false-positive that should stop firing).",
      "Pick the single hook whose job it is to catch this class. If no deterministic",
      "hook could ever catch it (pure taste/judgment failures, external-service errors,",
      'gates already doing their job correctly), answer {"surface":"context"} with no fixture.',
      "TOOL LIMIT: the replay harness only exercises STOP hooks (it feeds a final",
      "assistant message + transcript and reads the block/pass decision). If the class",
      "is best caught by a PreToolUse guard (SystemFileGuard, PreToolGuard, Safety) or",
      'any non-Stop surface, that cannot be replayed yet — answer {"surface":"<x>"} with',
      "NO fixture and say so in rationale. Only draft a fixture for a genuine Stop hook.",
      "Answer ONLY as JSON:",
      '{"surface":"hook|rule|skill|settings|context","rationale":"one paragraph",',
      '"fixture":{"incident":"...","mode":"stop-hook","hook":"hooks/<Name>.hook.ts",',
      '"expect":"block|pass","last_assistant_message":"...","transcript":[ {"type":"user","message":{"role":"user","content":[{"type":"text","text":"..."}]}}, {"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","id":"e1","name":"Bash","input":{"command":"..."}}]}}, {"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"e1","content":"...","is_error":false}]}} ]}}',
      "The transcript must realistically reproduce the failure class. `hook` must be one",
      "of the existing hooks listed in the user message.",
    ].join("\n"),
    userPrompt: `${evidence}\n\n${hookInventory()}`,
    level: "high",
    expectJson: true,
    timeout: 120_000,
  });
  if (!res.success) { log.push(`fixture-inference-failed: ${c.class_id} — ${res.error ?? "unknown"}`); return null; }

  let out: { surface?: string; rationale?: string; fixture?: any };
  try { out = (res.parsed as any) ?? JSON.parse(res.output); }
  catch { log.push(`fixture-unparseable: ${c.class_id}`); return null; }

  if (!out.surface || out.surface === "context" || !out.fixture) {
    log.push(`fixture-context-only: ${c.class_id}`);
    return null;
  }
  const fixture = validateDraftedFixture(out.fixture, log, c.class_id!);
  if (!fixture) return null;

  // Verify the fixture is RED right now — that IS the proof the gap is real.
  // A green fixture means the class is already handled; don't file it.
  const result = runFixture(fixture);
  if (result.ok) { log.push(`fixture-already-green: ${c.class_id} (class already handled)`); return null; }

  // Land it in the quarantine dir (non-blocking). Slug is class-derived + safe.
  const pendingSlug = slugifyClaim(c.class_id!.replace(/[:]/g, " ")).slice(0, 60) || "unknown";
  const dir = path.join(PENDING_DIR, pendingSlug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "fixture.json"), JSON.stringify(fixture, null, 2) + "\n");
  log.push(`fixture-drafted: ${c.class_id} → pending/${pendingSlug} (hook=${fixture.hook}, expect=${fixture.expect}, RED)`);
  c.enforcement_surface = out.surface as HypothesisCandidate["enforcement_surface"];
  return { rationale: out.rationale ?? "", surface: c.enforcement_surface as any, fixture, pending_slug: pendingSlug };
}

function renderHypothesisFile(c: HypothesisCandidate, priorChangelog: string[] = []): string {
  const generated = new Date();
  const expires = new Date(generated.getTime() + HYPO_EXPIRY_DAYS * 86400 * 1000);

  const fm: HypothesisFrontmatter = {
    status: "hypothesis",
    slug: c.slug,
    target_frame: c.target_frame,
    confidence: c.confidence,
    generated: generated.toISOString(),
    expires: expires.toISOString(),
    evidence_signals: c.evidence_signals,
    falsifier: c.falsifier,
  };

  const fmYaml = [
    "---",
    `status: ${fm.status}`,
    `slug: ${fm.slug}`,
    `target_frame: ${fm.target_frame}`,
    `confidence: ${fm.confidence}`,
    `generated: ${fm.generated}`,
    `expires: ${fm.expires}`,
    `source: ${c.source}`,
    `enforcement_surface: ${c.enforcement_surface}`,
    ...(c.class_id ? [`class_id: ${c.class_id}`] : []),
    "evidence_signals:",
    ...fm.evidence_signals.map(s => `  - ${s}`),
    `falsifier: "${fm.falsifier.replace(/"/g, '\\"')}"`,
    "---",
    "",
  ].join("\n");

  const body = [
    "## Claim",
    "",
    c.claim,
    "",
    "## Evidence",
    "",
    ...c.evidence_signals.map(s => `- ${s}`),
    `- (cluster size: ${c.cluster_size}; pattern: ${c.pattern})`,
    "",
    "## Falsifier",
    "",
    c.falsifier,
    "",
    ...(c.healing ? [
      "## Proposed Healing Fixture (RED — proves the gap is real)",
      "",
      c.healing.rationale,
      "",
      `Target hook: \`${(c.healing.fixture as any).hook}\` · surface: ${c.enforcement_surface} · pending: \`test/regression/pending/${c.healing.pending_slug}/\``,
      "",
      "This is a FAILING replay fixture (data, not a patch). Fixing the class through the normal Algorithm turns it green; PromoteFixture then moves it into the blocking corpus. No code was authored by the deriver.",
      "",
      "```json",
      JSON.stringify(c.healing.fixture, null, 2),
      "```",
      "",
    ] : []),
    "## Suggested Action",
    "",
    c.healing
      ? `Graduating this in Pulse promotes the fixture IF it is already green (the class got fixed); if still red, it stays a pending healing task. The deriver never writes code — it wrote a failing test. Fix the class through normal work, then \`bun LIFEOS/TOOLS/PromoteFixture.ts ${c.healing.pending_slug}\`.`
      : c.target_frame === "new"
      ? `Start a new frame at \`MEMORY/WISDOM/FRAMES/${c.slug}.md\` if {{PRINCIPAL_NAME}} reviews and confirms the pattern.`
      : `Append a section to \`MEMORY/WISDOM/FRAMES/${c.target_frame}.md\` under \`## Hypothesis-Sourced\` if {{PRINCIPAL_NAME}} graduates this hypothesis.`,
    "",
    "## Changelog",
    "",
    ...(priorChangelog.length > 0
      ? [...priorChangelog, `- ${generated.toISOString()} — updated in place by deriver loop (samples: ${c.cluster_size}, conf: ${c.confidence})`]
      : [`- ${generated.toISOString()} — emitted by deriver loop`]),
    "",
  ].join("\n");

  return fmYaml + body;
}

// A hypothesis's stable identity is its slug (patternName-direction for rating
// clusters, slugified classId for observability). The dated filename prefix
// records first emission; a re-derivation of the same slug updates that file in
// place instead of spawning a new dated copy. Slugs never contain "_" (the date
// separator), so `_<slug>.md` uniquely identifies the file.
function findLiveHypothesisFile(slug: string): string | null {
  if (!fs.existsSync(HYPOTHESES_DIR)) return null;
  const suffix = `_${slug}.md`;
  for (const f of fs.readdirSync(HYPOTHESES_DIR)) {
    if (f === "README.md" || !f.endsWith(suffix)) continue;
    const fp = path.join(HYPOTHESES_DIR, f);
    const statusMatch = fs.readFileSync(fp, "utf-8").match(/^status:\s*(\S+)/m);
    if (statusMatch && statusMatch[1] === "hypothesis") return fp;
  }
  return null;
}

function priorChangelogLines(content: string): string[] {
  const idx = content.indexOf("## Changelog");
  if (idx === -1) return [];
  return content.slice(idx).split("\n").filter(l => l.startsWith("- "));
}

function expirySweep(state: DeriverState, log: string[]): number {
  if (!fs.existsSync(HYPOTHESES_DIR)) return 0;
  let moved = 0;
  const now = Date.now();
  for (const f of fs.readdirSync(HYPOTHESES_DIR)) {
    if (!f.endsWith(".md") || f === "README.md") continue;
    const fp = path.join(HYPOTHESES_DIR, f);
    const content = fs.readFileSync(fp, "utf-8");
    const expiresMatch = content.match(/^expires:\s*(\S+)/m);
    const statusMatch = content.match(/^status:\s*(\S+)/m);
    if (!expiresMatch || !statusMatch) continue;
    if (statusMatch[1] !== "hypothesis") continue;
    const expiresMs = new Date(expiresMatch[1]).getTime();
    if (expiresMs > now) continue;

    const newContent = content.replace(/^status:\s*hypothesis/m, "status: expired") +
      `\n- ${new Date().toISOString()} — auto-expired by deriver sweep\n`;
    const archivePath = path.join(HYPOTHESES_ARCHIVE_DIR, f);
    fs.writeFileSync(archivePath, newContent);
    fs.unlinkSync(fp);

    const slugMatch = content.match(/^slug:\s*(\S+)/m);
    if (slugMatch && state.claim_hashes[slugMatch[1]]) {
      state.claim_hashes[slugMatch[1]].archived_at = new Date().toISOString();
      state.claim_hashes[slugMatch[1]].status = "expired";
    }
    log.push(`expired: ${f}`);
    moved++;
  }
  return moved;
}

function appendDeriverLog(lines: string[]): void {
  if (lines.length === 0) return;
  fs.mkdirSync(path.dirname(DERIVER_LOG), { recursive: true });
  const stamp = new Date().toISOString();
  const entry = lines.map(l => `[${stamp}] ${l}`).join("\n") + "\n";
  fs.appendFileSync(DERIVER_LOG, entry);
}

export async function runDeriver(opts: { window: number; dryRun: boolean; noInference?: boolean }): Promise<{ emitted: number; updated: number; expired: number }> {
  const log: string[] = [];
  log.push(`run: window=${opts.window}d dry-run=${opts.dryRun}`);

  fs.mkdirSync(HYPOTHESES_DIR, { recursive: true });
  fs.mkdirSync(HYPOTHESES_ARCHIVE_DIR, { recursive: true });

  let state = readDeriverState();
  state = pruneStateClaimHashes(state);

  const expired = opts.dryRun ? 0 : expirySweep(state, log);

  // Load signals within window
  const cutoff = Date.now() - opts.window * 86400 * 1000;
  const allRatings = loadJsonl<Rating>(RATINGS_FILE);
  const ratings = allRatings.filter(r => new Date(r.timestamp).getTime() >= cutoff);
  const obsClusters = collectObservabilityClusters(opts.window);
  log.push(`signals: total=${allRatings.length} in_window=${ratings.length} obs_clusters=${obsClusters.length}`);

  if (ratings.length === 0 && obsClusters.length === 0) {
    log.push("no signals in window — nothing to do");
    if (!opts.dryRun) appendDeriverLog(log);
    return { emitted: 0, updated: 0, expired };
  }

  const summaries = ratings.map(r => r.sentiment_summary);
  const frustrationGroups = detectPatterns(summaries.filter((_, i) => ratings[i].rating <= 4), FRUSTRATION_PATTERNS);
  const successGroups = detectPatterns(summaries.filter((_, i) => ratings[i].rating >= 7), SUCCESS_PATTERNS);
  const allGroups = new Map<string, string[]>();
  for (const [k, v] of frustrationGroups) allGroups.set(k, v);
  for (const [k, v] of successGroups) {
    const existing = allGroups.get(k) || [];
    allGroups.set(k, [...existing, ...v]);
  }
  log.push(`clusters: ${allGroups.size}`);

  const frames = listExistingFrames();
  const peopleSlugs = listPeopleSlugs();

  const rawCandidates: HypothesisCandidate[] = [];
  for (const [pattern, examples] of allGroups.entries()) {
    const c = buildHypothesisFromCluster(pattern, examples, ratings, frames);
    if (c) rawCandidates.push(c);
  }
  for (const cluster of obsClusters) {
    const c = buildObservabilityCandidate(cluster, opts.window, frames);
    if (c) rawCandidates.push(c);
  }

  const candidates: HypothesisCandidate[] = [];
  for (const c of rawCandidates) {
    if (violatesPrivacy(c.claim + " " + c.evidence_signals.join(" ") + " " + c.dedup_key, peopleSlugs)) {
      log.push(`privacy-block: ${c.pattern}`);
      continue;
    }
    // Dedup on the STABLE key (class ID for observability candidates — claim
    // text embeds counts/dates that change nightly and would defeat dedup).
    // Only skip a claim-hash match that is ARCHIVED within retention (don't
    // immediately re-propose a recently expired hypothesis). A match to a LIVE
    // entry is allowed through — emission finds its file by slug and updates it
    // in place rather than spawning a new dated duplicate.
    const h = claimHash(c.dedup_key);
    const existing = Object.values(state.claim_hashes).find(e => e.hash === h);
    if (existing && existing.archived_at) {
      log.push(`dedup-skip (archived within retention): ${c.pattern}`);
      continue;
    }
    candidates.push(c);
  }

  candidates.sort((a, b) => (b.confidence * b.cluster_size) - (a.confidence * a.cluster_size));
  const emit = candidates.slice(0, HYPO_MAX_PER_RUN);

  if (opts.dryRun) {
    log.push(`dry-run: would emit ${emit.length} hypotheses`);
    for (const c of emit) log.push(`  ${c.slug} (src=${c.source}, conf=${c.confidence}, samples=${c.cluster_size})`);
    appendDeriverLog(log);
    return { emitted: emit.length, updated: 0, expired };
  }

  // Patch proposals (v2): for recurring observability classes not yet patched,
  // draft ≤PATCH_MAX_PER_RUN diffs. Failures degrade to prose-only notes.
  if (!opts.noInference) {
    // Already-healed classes (a fixture landed and was promoted) are skipped.
    const healed = new Set(readPatchRegistry().map(p => p.class_id));
    let drafted = 0;
    for (const c of emit) {
      if (drafted >= HEALING_MAX_PER_RUN) break;
      if (c.source !== "observability" || !c.class_id) continue;
      if (c.cluster_size < HEALING_RECURRENCE_THRESHOLD || healed.has(c.class_id)) continue;
      try {
        const h = await proposeHealingFixture(c, log);
        if (h) { c.healing = h; drafted++; }
      } catch (e: any) {
        log.push(`fixture-step-error: ${c.class_id} — ${String(e?.message ?? e).split("\n")[0]}`);
      }
    }
  }

  let emitted = 0;
  let updated = 0;
  for (const c of emit) {
    // Update-in-place: a live file already carries this slug → refresh it
    // (evidence window, counts, confidence, generated, changelog) instead of
    // spawning a new dated duplicate.
    const livePath = findLiveHypothesisFile(c.slug);
    if (livePath) {
      const prior = priorChangelogLines(fs.readFileSync(livePath, "utf-8"));
      const content = renderHypothesisFile(c, prior);
      const tmp = livePath + ".tmp";
      fs.writeFileSync(tmp, content);
      fs.renameSync(tmp, livePath);
      state.claim_hashes[c.slug] = {
        hash: claimHash(c.dedup_key),
        archived_at: null,
        status: "hypothesis",
      };
      log.push(`updated: ${path.basename(livePath)} (src=${c.source}, conf=${c.confidence}, samples=${c.cluster_size}${c.healing ? ", healing-fixture attached" : ""})`);
      updated++;
      continue;
    }

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `${dateStr}_${c.slug}.md`;
    const filepath = path.join(HYPOTHESES_DIR, filename);
    const content = renderHypothesisFile(c);
    const tmp = filepath + ".tmp";
    fs.writeFileSync(tmp, content);
    fs.renameSync(tmp, filepath);
    state.claim_hashes[c.slug] = {
      hash: claimHash(c.dedup_key),
      archived_at: null,
      status: "hypothesis",
    };
    log.push(`emitted: ${filename} (src=${c.source}, conf=${c.confidence}, samples=${c.cluster_size}${c.healing ? ", healing-fixture attached" : ""})`);
    emitted++;
  }

  state.last_run = new Date().toISOString();
  writeDeriverState(state);
  appendDeriverLog(log);

  return { emitted, updated, expired };
}

// ============================================================================
// CLI
// ============================================================================

// CLI — guarded so the module is importable (tests, direct proposeHealingFixture
// probes) without executing a synthesis run as an import side effect.
if (!import.meta.main) {
  // no-op: exports only
} else {

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    week: { type: "boolean" },
    month: { type: "boolean" },
    all: { type: "boolean" },
    "dry-run": { type: "boolean" },
    hypothesize: { type: "boolean" },
    window: { type: "string" },
    "no-inference": { type: "boolean" },
    "once-daily": { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help) {
  console.log(`
LearningPatternSynthesis - Aggregate ratings into actionable patterns

Usage:
  bun run LearningPatternSynthesis.ts --week                Analyze last 7 days (default)
  bun run LearningPatternSynthesis.ts --month               Analyze last 30 days
  bun run LearningPatternSynthesis.ts --all                 Analyze all ratings
  bun run LearningPatternSynthesis.ts --dry-run             Preview without writing
  bun run LearningPatternSynthesis.ts --hypothesize         Run proactive deriver loop
  bun run LearningPatternSynthesis.ts --hypothesize \\
                                       --window 14d          Override deriver window
  bun run LearningPatternSynthesis.ts --hypothesize \\
                                       --dry-run             Show would-emit hypotheses

Synthesis output: MEMORY/LEARNING/SYNTHESIS/YYYY-MM/
Deriver output:   MEMORY/WISDOM/FRAMES/_hypotheses/
Deriver log:      MEMORY/OBSERVABILITY/deriver.log
`);
  process.exit(0);
}

// Hypothesize mode short-circuits — runs the proactive deriver loop and exits.
if (values.hypothesize) {
  // --once-daily: idempotence guard for the launchd RunAtLoad trigger. The
  // plist fires at 03:00 AND at load; this stamp makes at most one real run
  // per local date, so the pair can't double-run and a cold-booted machine
  // still gets its run at login. Public issue #1612, @xmasyx.
  const onceStamp = path.join(MEMORY_DIR, "OBSERVABILITY", "deriver-lastrun.date");
  const localToday = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local tz
  if (values["once-daily"] && !values["dry-run"]) {
    try {
      if (fs.existsSync(onceStamp) && fs.readFileSync(onceStamp, "utf-8").trim() === localToday) {
        console.log(`🌙 deriver: already ran ${localToday} (--once-daily) — skipping`);
        process.exit(0);
      }
    } catch { /* unreadable stamp → run */ }
  }
  let windowDays = 7;
  try {
    windowDays = parseWindow(values.window);
  } catch (e: any) {
    console.error("error:", e.message);
    process.exit(1);
  }
  const { emitted, updated, expired } = await runDeriver({ window: windowDays, dryRun: !!values["dry-run"], noInference: !!values["no-inference"] });
  if (values["once-daily"] && !values["dry-run"]) {
    try { fs.writeFileSync(onceStamp, `${localToday}\n`); } catch { /* stamp failure never fails the run */ }
  }
  console.log(`🌙 deriver: window=${windowDays}d expired=${expired} emitted=${emitted} updated=${updated}${values["dry-run"] ? " (dry-run)" : ""}`);
  process.exit(0);
}

// Check ratings file exists
if (!fs.existsSync(RATINGS_FILE)) {
  console.log("No ratings file found at:", RATINGS_FILE);
  process.exit(0);
}

// Read all ratings
const content = fs.readFileSync(RATINGS_FILE, 'utf-8');
const allRatings: Rating[] = content
  .split('\n')
  .filter(line => line.trim())
  .map(line => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  })
  .filter((r): r is Rating => r !== null);

console.log(`📊 Loaded ${allRatings.length} total ratings`);

// Determine period and filter
let period = 'Weekly';
let cutoffDate = new Date();

if (values.month) {
  period = 'Monthly';
  cutoffDate.setDate(cutoffDate.getDate() - 30);
} else if (values.all) {
  period = 'All Time';
  cutoffDate = new Date(0); // Beginning of time
} else {
  // Default: week
  cutoffDate.setDate(cutoffDate.getDate() - 7);
}

const filteredRatings = allRatings.filter(r => {
  const ratingDate = new Date(r.timestamp);
  return ratingDate >= cutoffDate;
});

console.log(`🔍 Analyzing ${filteredRatings.length} ratings for ${period.toLowerCase()} period`);

if (filteredRatings.length === 0) {
  console.log("✅ No ratings in this period");
  process.exit(0);
}

// Analyze
const result = analyzeRatings(filteredRatings, period);

console.log(`\n📈 Analysis Results:`);
console.log(`   Average Rating: ${result.avgRating.toFixed(1)}/10`);
console.log(`   Frustration Patterns: ${result.frustrations.length}`);
console.log(`   Success Patterns: ${result.successes.length}`);

if (result.topIssues.length > 0) {
  console.log(`\n⚠️  Top Issues:`);
  for (const issue of result.topIssues) {
    console.log(`   - ${issue}`);
  }
}

if (values["dry-run"]) {
  console.log("\n🔍 DRY RUN - Would write synthesis report");
  console.log("\nRecommendations:");
  for (const rec of result.recommendations) {
    console.log(`   - ${rec}`);
  }
} else {
  const filepath = writeSynthesis(result, period);
  console.log(`\n✅ Created synthesis report: ${path.basename(filepath)}`);
}

} // import.meta.main CLI guard
