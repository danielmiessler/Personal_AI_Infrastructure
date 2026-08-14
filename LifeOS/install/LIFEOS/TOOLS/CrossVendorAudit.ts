#!/usr/bin/env bun
/**
 * CrossVendorAudit.ts — Forge audit-mode tool (cross-vendor audit; formerly Cato)
 *
 * Bundles ISA + artifacts + tool-activity tail, pipes to
 * codex exec (gpt-5.6-sol, read-only, --ephemeral), with the verdict JSON
 * schema-enforced via codex --output-schema (strict: additionalProperties:false,
 * all props required). Runs a `codex doctor --json` preflight. Parses the JSON
 * response, appends to MEMORY/VERIFICATION/cato-findings.jsonl (filename kept for
 * track-record continuity), emits parsed JSON to stdout.
 *
 * Usage:
 *   bun CrossVendorAudit.ts --slug <slug> [--artifact <path>]...
 *
 * Algorithm Rule 2a (v3.27-era). Elected during VERIFY on high-stakes runs.
 */

import { spawn } from "node:child_process";
import { readFile, writeFile, appendFile, mkdir, stat, rm, symlink } from "node:fs/promises";
import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve, relative } from "node:path";
import { CROSS_VENDOR } from "./models";

const HOME = homedir();
const LIFEOS_DIR = join(HOME, ".claude", "LIFEOS");
const WORK_DIR = join(LIFEOS_DIR, "MEMORY", "WORK");
const FINDINGS_LOG = join(LIFEOS_DIR, "MEMORY", "VERIFICATION", "cato-findings.jsonl");
const TOOL_ACTIVITY_LOG = join(LIFEOS_DIR, "MEMORY", "OBSERVABILITY", "tool-activity.jsonl");
// Resolve codex robustly: env override → PATH → common install dirs. A single
// hard-coded path silently skipped the whole audit ("skipped" reads like a
// pass) when codex lived elsewhere, e.g. Homebrew (public issue #1500).
function resolveCodexBin(): string {
  const override = process.env.CODEX_BIN;
  if (override && existsSync(override)) return override;
  const fromPath = Bun.which("codex");
  if (fromPath) return fromPath;
  const candidates = [
    join(HOME, ".bun", "bin", "codex"),
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
  ];
  return candidates.find((p) => existsSync(p)) ?? join(HOME, ".bun", "bin", "codex");
}
const CODEX_BIN = resolveCodexBin();

// ISOLATED CODEX HOME — the fix for a lane that was silently not cross-vendor
// (2026-07-25). The user's real $CODEX_HOME hosts a SEPARATE LifeOS-for-Codex
// installation: `AGENTS.md` tells codex to load that install's DA identity and
// system prompt, `hooks.json` has a session_start injector, and the same file
// carries "Never read from ... any LifeOS installation outside ~/.codex".
// Consequences, both reproduced directly before this was written: the auditor
// answered in the DA's persona complete with the LifeOS banner — so it shared
// exactly the Anthropic-family framing the audit exists to escape — and it
// DECLINED to read the ~/.claude artifact it was pointed at. A run like that
// still returns a verdict, which is the dangerous part: "cross-vendor pass" on
// an audit that never read the work and was not independent.
//
// CODEX_HOME is the one lever that drops AGENTS.md, hooks, skills and config in
// a single move. Auth is the only thing worth keeping, and it is SYMLINKED, never
// copied — no credential is duplicated onto disk. Verified: under the isolated
// home the same probe returns the file contents with no persona and no refusal.
// Config-key overrides were tried first and are NOT sufficient — disabling
// `model_instructions_file` + `features.hooks` removed the persona but the
// refusal survived via the still-loaded skills tree.
const AUDIT_CODEX_HOME = join(tmpdir(), "lifeos-audit-codex-home");

async function buildIsolatedCodexHome(): Promise<string> {
  await rm(AUDIT_CODEX_HOME, { recursive: true, force: true });
  await mkdir(AUDIT_CODEX_HOME, { recursive: true });
  const realAuth = join(HOME, ".codex", "auth.json");
  // Absent auth.json = the user authenticates codex via OPENAI_API_KEY, which
  // the env carries anyway. Nothing to link; the isolated home still works.
  if (existsSync(realAuth)) await symlink(realAuth, join(AUDIT_CODEX_HOME, "auth.json"));
  return AUDIT_CODEX_HOME;
}

const BUNDLE_TOKEN_CAP = 80_000;
const CHARS_PER_TOKEN = 4; // rough estimate for bundle sizing
const BUNDLE_CHAR_CAP = BUNDLE_TOKEN_CAP * CHARS_PER_TOKEN;
const CODEX_TIMEOUT_MS = 300_000;
const TOOL_ACTIVITY_TAIL_LINES = 200;
const ARTIFACT_PER_FILE_CAP = 30_000 * CHARS_PER_TOKEN;
const VERDICT_SCHEMA_PATH = join(LIFEOS_DIR, "MEMORY", "VERIFICATION", "audit-verdict.schema.json");

// codex --output-schema enforces OpenAI strict structured-output rules: EVERY
// object needs "additionalProperties": false AND every property in "required"
// (optional fields become nullable via a type-union, never omitted). A permissive
// schema returns HTTP 400 invalid_json_schema and the audit silently skips — so
// this is deliberately strict. Mirrors the AuditResponse shape the model emits.
const VERDICT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "criticality", "findings", "blind_spots_surfaced", "model_used", "tokens_used"],
  properties: {
    verdict: { type: "string", enum: ["pass", "concerns", "fail"] },
    criticality: { type: ["string", "null"], enum: ["high", "medium", "low", null] },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "isc_ref", "issue", "evidence"],
        properties: {
          severity: { type: "string", enum: ["critical", "warning", "info"] },
          isc_ref: { type: ["string", "null"] },
          issue: { type: "string" },
          evidence: { type: "string" },
        },
      },
    },
    blind_spots_surfaced: { type: "array", items: { type: "string" } },
    model_used: { type: "string" },
    tokens_used: { type: "integer" },
  },
} as const;

const AUDIT_PROMPT = `You are an independent cross-vendor auditor. The Claude-family executor and reviewer have already signed off on this work. Your job is to find what THEY missed — specifically Anthropic-family blind spots they share (format conventions, API contract readings, RLHF preferences, constitutional biases).

Audit this ISA against its ISC criteria. For each criterion:
 1. Is there concrete evidence of completion in the artifacts?
 2. Is the evidence consistent with the stated claim?
 3. Are there failure modes the same-family reviewers would share that are present here?

Signal over noise. If there is nothing to flag, say so explicitly with "findings": []. Do not manufacture concerns. Your credibility depends on surfacing real Anthropic-family blind spots, not on inflating finding counts.

Output ONLY this JSON on one line, no markdown, no prose, no preamble:

{"verdict":"pass|concerns|fail","criticality":"high|medium|low","findings":[{"severity":"critical|warning|info","isc_ref":"ISC-N or null","issue":"...","evidence":"..."}],"blind_spots_surfaced":["..."],"model_used":"gpt-5.6-sol","tokens_used":0}`;

const RELEASE_AUDIT_PROMPT = `You are an independent cross-vendor auditor for a public software release. The Claude-family executor, a full set of deterministic security gates, and a Claude-family reviewer have already signed off. Your job is to find what THEY missed — Anthropic-family blind spots they share.

The bundle contains: the gate record (.shadow-state.json), a file manifest of the shipped payload, and the full text of the highest-risk and recently-changed files. Audit against these four criteria:
 1. Identity/secret leakage beyond the known-benign class (public voice IDs, bot handles, model IDs, and public repo URLs are NOT findings).
 2. Dangling internal references — a shipped file referencing a path absent from the manifest.
 3. Retired capabilities presented as live.
 4. Install coherence — version strings consistent across the installer copies shown.

Known-benign by design (NOT findings): the installer's LIFEOS_REPO="\${LIFEOS_REPO:-OWNER/REPO}" placeholder in BOTH install.sh copies — this cut is private staging; the publish workflow (CreateRelease Step 1) substitutes the real owner/name before anything reaches the public repo, and the served installer at the public URL carries the substituted value. Also benign: references to private underscore-skills or private paths that carry the literal qualifier "NOT in the public release payload" with skip-if-absent guidance — that banner is the release gates' sanctioned convention for documenting an optional private integration, not an escaped dangling reference.

Signal over noise. If there is nothing to flag, say so explicitly with "findings": []. Do not manufacture concerns.

Output ONLY this JSON on one line, no markdown, no prose, no preamble:

{"verdict":"pass|concerns|fail","criticality":"high|medium|low","findings":[{"severity":"critical|warning|info","isc_ref":null,"issue":"...","evidence":"..."}],"blind_spots_surfaced":["..."],"model_used":"<model>","tokens_used":0}`;

// Always-bundled high-risk surfaces of a release payload, relative to its root.
// These are where the two proven cross-vendor escapes lived (nested installer
// copies, template files) plus the contract files every install executes.
const RELEASE_CORE_FILES = [
  "SKILL.md",
  "INSTALL.md",
  "install/install.sh",
  "install/CLAUDE.template.md",
  "install/skills/LifeOS/SKILL.md",
  "install/skills/LifeOS/install/install.sh",
  "install/skills/LifeOS/install/CLAUDE.template.md",
];

function walkPayload(root: string): string[] {
  const out: string[] = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) stack.push(full);
      else out.push(relative(root, full));
    }
  }
  return out.sort();
}

async function buildReleaseBundle(payloadDir: string, focus: string[]): Promise<string> {
  const files = walkPayload(payloadDir);
  const manifest = files.map((f) => `${f}`).join("\n");
  const gateRecordPath = join(resolve(payloadDir, ".."), ".shadow-state.json");
  const gateRecord = existsSync(gateRecordPath) ? await readFile(gateRecordPath, "utf8") : "(gate record not found)";

  const sections: string[] = [
    "===== GATE RECORD (.shadow-state.json — independently inspectable; the build gates + emit gates recorded here) =====",
    gateRecord.slice(0, 12_000),
    "",
    `===== PAYLOAD MANIFEST (${files.length} files, sorted, COMPLETE — before reporting any file as absent, re-search this manifest for its exact basename) =====`,
    manifest,
    "",
  ];
  const bundled = new Set<string>();
  for (const rel of [...RELEASE_CORE_FILES, ...focus]) {
    if (bundled.has(rel)) continue;
    const full = join(payloadDir, rel);
    if (!existsSync(full)) { sections.push(`===== FILE ${rel} =====`, "(absent from payload)", ""); continue; }
    bundled.add(rel);
    const text = await readFile(full, "utf8");
    sections.push(`===== FILE ${rel} =====`, text.slice(0, ARTIFACT_PER_FILE_CAP), "");
  }
  sections.push("===== AUDIT INSTRUCTIONS =====", RELEASE_AUDIT_PROMPT);
  let bundle = sections.join("\n");
  if (bundle.length > BUNDLE_CHAR_CAP) bundle = bundle.slice(0, BUNDLE_CHAR_CAP - 200) + "\n[TRUNCATED - bundle size cap]\n" + RELEASE_AUDIT_PROMPT;
  return bundle;
}

interface Args {
  slug: string;
  /** Extra files to bundle beyond the ISA's `## Decisions` references. */
  extraArtifacts: string[];
  /** Release mode: audit an emitted payload directory instead of an ISA. */
  payload?: string;
  /** Release mode: payload-relative files to bundle in full (the cut's delta). */
  focus: string[];
}

interface AuditResponse {
  verdict: "pass" | "concerns" | "fail" | "skipped" | "error";
  criticality?: "high" | "medium" | "low";
  findings?: Array<{ severity: string; isc_ref: string | null; issue: string; evidence: string }>;
  blind_spots_surfaced?: string[];
  model_used?: string;
  tokens_used?: number;
  cost_usd_est?: number;
  reason?: string;
  /** Source files actually bundled for the auditor. 0 means the verdict rests on
   *  the ISA text alone. public issue #1716, @xmasyx */
  artifacts_bundled?: number;
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = { extraArtifacts: [], focus: [] };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--slug") args.slug = argv[++i];
    // --artifact may repeat. The `## Decisions` scrape only finds files the ISA
    // happens to name in backticks, which is fine for a code change and useless
    // for a release cut — the thing under audit there is a payload the ISA never
    // enumerates. This lets the caller point the audit at what actually shipped.
    else if (argv[i] === "--artifact") (args.extraArtifacts as string[]).push(argv[++i]);
    // Release mode: --payload <emitted LifeOS dir> [--focus <payload-relative path>]...
    // Replaces the Forge-agent wrapper for release cuts (2026-08-03): the bundle
    // rides stdin so codex never reads the filesystem — no staged copies, no
    // path-isolation refusals, no mailbox loops. One bounded call, one verdict.
    else if (argv[i] === "--payload") args.payload = argv[++i];
    else if (argv[i] === "--focus") (args.focus as string[]).push(argv[++i]);
  }
  if (args.payload && !args.slug) args.slug = `release-${resolve(args.payload).split("/").filter(Boolean).slice(-2, -1)[0] ?? "unknown"}`;
  if (!args.slug) throw new Error("--slug required (or --payload <dir>)");
  return args as Args;
}

async function readISA(slug: string): Promise<string> {
  // Read order: ISA.md (canonical, v4.1.0+) → PRD.md (legacy alias, retired at v4.2.0).
  const dir = join(WORK_DIR, slug);
  const isaPath = join(dir, "ISA.md");
  const legacyPath = join(dir, "PRD.md");
  const path = existsSync(isaPath) ? isaPath : existsSync(legacyPath) ? legacyPath : null;
  if (!path) throw new Error(`ISA not found in ${dir} (tried ISA.md and legacy PRD.md)`);
  return await readFile(path, "utf8");
}

async function readArtifacts(
  slug: string,
  isa: string,
  extra: string[] = [],
): Promise<{ text: string; count: number }> {
  const paths = new Set<string>();
  for (const e of extra) {
    let p = e;
    if (p.startsWith("~/")) p = join(HOME, p.slice(2));
    paths.add(resolve(p));
  }

  // Extract file paths referenced in ISA ## Decisions section.
  const decisionsMatch = isa.match(/## Decisions\n([\s\S]*?)(?=\n## |\n---|\n*$)/);
  if (decisionsMatch) {
    const decisions = decisionsMatch[1];
    // Source-language coverage: the original alternation was TS/web-only, so an
    // ISA whose Decisions cited only .swift/.py/.go files bundled ZERO source and
    // the audit still returned a verdict — a cross-vendor "pass" on the ISA text
    // alone. public issue #1716, @xmasyx
    const pathPattern =
      /`([~/][^\s`]+\.(?:ts|md|json|yaml|yml|tsx|jsx|js|txt|swift|py|rs|go|java|kt|c|h|cc|cpp|hpp|m|mm|rb|php|sh|sql|toml))`/g;
    let match;
    while ((match = pathPattern.exec(decisions))) {
      let p = match[1];
      if (p.startsWith("~/")) p = join(HOME, p.slice(2));
      paths.add(resolve(p));
    }
  }

  if (paths.size === 0) {
    return {
      text: "(no artifacts: none passed via --artifact and no file references in ## Decisions)",
      count: 0,
    };
  }

  const chunks: string[] = [];
  let totalChars = 0;
  for (const p of paths) {
    if (!existsSync(p)) continue;
    const stats = await stat(p);
    if (!stats.isFile()) continue;
    let content = await readFile(p, "utf8");
    if (content.length > ARTIFACT_PER_FILE_CAP) {
      content = content.slice(0, ARTIFACT_PER_FILE_CAP) + "\n[TRUNCATED]";
    }
    const block = `--- FILE: ${p} ---\n${content}\n`;
    if (totalChars + block.length > BUNDLE_CHAR_CAP / 2) break; // reserve half for other sections
    chunks.push(block);
    totalChars += block.length;
  }
  return chunks.length > 0
    ? { text: chunks.join("\n"), count: chunks.length }
    : { text: "(no readable artifacts found)", count: 0 };
}

async function readToolActivityTail(slug: string): Promise<string> {
  if (!existsSync(TOOL_ACTIVITY_LOG)) return "(tool-activity.jsonl not found)";
  const content = await readFile(TOOL_ACTIVITY_LOG, "utf8");
  const lines = content.trim().split("\n");
  const recent = lines.slice(-500); // look at last 500 lines total
  const filtered = recent.filter((l) => l.includes(slug)).slice(-TOOL_ACTIVITY_TAIL_LINES);
  return filtered.length > 0 ? filtered.join("\n") : "(no tool-activity lines for this slug)";
}

// v6.6.0: extract principal_stated_goal from ISA frontmatter as a leading section
// in every bundle path, so Cato reads the literal anchor before the ISA, artifacts,
// or tool tail. Returns formatted section or empty string when absent.
function extractGoalSection(isa: string): string {
  const frontmatterMatch = isa.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return "";
  const goalLine = frontmatterMatch[1].match(/^principal_stated_goal:\s*"((?:[^"\\]|\\.)*)"/m);
  if (!goalLine || !goalLine[1]) return "";
  return [
    "===== PRINCIPAL STATED GOAL =====",
    "(v6.4.0 literal — evidence anchor, not optimization target. Audit derived content against this.)",
    goalLine[1],
    "",
  ].join("\n");
}

function assembleBundle(isa: string, artifacts: string, toolTail: string): string {
  const goalSection = extractGoalSection(isa);
  let bundle = [
    goalSection,
    "===== ISA =====",
    isa,
    "",
    "===== OUTPUT ARTIFACTS =====",
    artifacts,
    "",
    "===== TOOL ACTIVITY TAIL =====",
    toolTail,
    "",
    "===== AUDIT INSTRUCTIONS =====",
    AUDIT_PROMPT,
  ].filter(s => s !== "").join("\n");

  // If over cap, drop tool-tail first, then trim artifacts.
  if (bundle.length > BUNDLE_CHAR_CAP) {
    bundle = [
      goalSection,
      "===== ISA =====",
      isa,
      "",
      "===== OUTPUT ARTIFACTS =====",
      artifacts,
      "",
      "===== TOOL ACTIVITY TAIL =====",
      "(dropped — bundle size cap)",
      "",
      "===== AUDIT INSTRUCTIONS =====",
      AUDIT_PROMPT,
    ].filter(s => s !== "").join("\n");
  }
  if (bundle.length > BUNDLE_CHAR_CAP) {
    const overshoot = bundle.length - BUNDLE_CHAR_CAP;
    const trimmed = artifacts.slice(0, Math.max(0, artifacts.length - overshoot - 100));
    bundle = [
      goalSection,
      "===== ISA =====",
      isa,
      "",
      "===== OUTPUT ARTIFACTS (trimmed) =====",
      trimmed + "\n[TRUNCATED - bundle size cap]",
      "",
      "===== TOOL ACTIVITY TAIL =====",
      "(dropped — bundle size cap)",
      "",
      "===== AUDIT INSTRUCTIONS =====",
      AUDIT_PROMPT,
    ].filter(s => s !== "").join("\n");
  }
  return bundle;
}

function invokeCodex(bundle: string, schemaPath: string): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolvePromise) => {
    // Env scrub: codex's auth precedence puts OPENAI_API_KEY / OPENAI_BASE_URL
    // above ~/.codex/auth.json and config.toml, so a stray key in the parent
    // shell silently flips the audit from the user's configured codex auth
    // (e.g. ChatGPT subscription) to direct API billing. Only scrub when a
    // configured auth file exists — users who authenticate codex solely via
    // OPENAI_API_KEY keep working unchanged.
    const env = { ...process.env };
    if (existsSync(join(HOME, ".codex", "auth.json"))) {
      delete env.OPENAI_API_KEY;
      delete env.OPENAI_BASE_URL;
    }
    // Isolation (see AUDIT_CODEX_HOME): keeps the separate LifeOS-for-Codex
    // install's identity, hooks and read-refusal out of the audit.
    env.CODEX_HOME = AUDIT_CODEX_HOME;
    const proc = spawn(
      CODEX_BIN,
      ["exec", "--sandbox", "read-only", "--skip-git-repo-check", "--ephemeral", "--output-schema", schemaPath, "--model", CROSS_VENDOR.forge, "-"],
      { stdio: ["pipe", "pipe", "pipe"], env, cwd: tmpdir() }
    );
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      resolvePromise({ stdout, stderr: stderr + `\n[TIMEOUT after ${CODEX_TIMEOUT_MS / 1000}s]`, code: 124 });
    }, CODEX_TIMEOUT_MS);

    proc.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    proc.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    proc.on("close", (code) => {
      clearTimeout(timer);
      resolvePromise({ stdout, stderr, code });
    });
    proc.stdin.write(bundle);
    proc.stdin.end();
  });
}

function extractJSON(rawStdout: string): AuditResponse {
  // Codex CLI wraps output with session metadata. Find the JSON object.
  const jsonMatch = rawStdout.match(/\{[\s\S]*"verdict"[\s\S]*\}/);
  if (!jsonMatch) {
    return { verdict: "skipped", reason: "no JSON in codex output" };
  }
  try {
    return JSON.parse(jsonMatch[0]) as AuditResponse;
  } catch (err) {
    return { verdict: "skipped", reason: `parse error: ${(err as Error).message}` };
  }
}

function estimateCost(tokens: number): number {
  // GPT-5 class rough: $0.015/1K combined. Conservative.
  return +(tokens * 0.000015).toFixed(4);
}

/**
 * Payload-relative path of the file with this basename, but ONLY when exactly one
 * exists. Ambiguous basenames (SKILL.md, README.md, package.json) return null so a
 * collision can never masquerade as a disproof.
 */
function findUniqueBasename(root: string, basename: string): string | null {
  if (!basename) return null;
  const stack = [root];
  const hits: string[] = [];
  while (stack.length) {
    const dir = stack.pop() as string;
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.name === basename) {
        hits.push(relative(root, full));
        if (hits.length > 1) return null;
      }
    }
  }
  return hits[0] ?? null;
}

async function appendFinding(slug: string, response: AuditResponse, tier: string): Promise<void> {
  await mkdir(join(LIFEOS_DIR, "MEMORY", "VERIFICATION"), { recursive: true });
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    slug,
    tier,
    cato_verdict: response.verdict,
    criticality: response.criticality ?? null,
    unique_findings_count: response.findings?.length ?? 0,
    tokens: response.tokens_used ?? 0,
    cost_usd: response.cost_usd_est ?? estimateCost(response.tokens_used ?? 0),
    skipped: response.verdict === "skipped",
    reason: response.reason ?? null,
  });
  await appendFile(FINDINGS_LOG, line + "\n", "utf8");
}

function extractTier(isa: string): string {
  const m = isa.match(/^effort:\s*(\w+)/m);
  return m ? m[1] : "unknown";
}

async function writeVerdictSchema(): Promise<string> {
  await mkdir(join(LIFEOS_DIR, "MEMORY", "VERIFICATION"), { recursive: true });
  await writeFile(VERDICT_SCHEMA_PATH, JSON.stringify(VERDICT_SCHEMA), "utf8");
  return VERDICT_SCHEMA_PATH;
}

// codex 0.137+ preflight. `codex doctor --json` reports overallStatus across the
// install/config/auth/runtime. Fail-OPEN by design: only an explicit overallStatus
// "fail" blocks the audit (a genuinely broken runtime). If doctor itself can't run
// or parse, proceed — the preflight must never become a new failure source. 30s cap.
function codexDoctor(): Promise<{ healthy: boolean; summary: string }> {
  return new Promise((resolvePromise) => {
    const proc = spawn(CODEX_BIN, ["doctor", "--json"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CODEX_HOME: AUDIT_CODEX_HOME },
    });
    let out = "";
    const timer = setTimeout(() => { proc.kill("SIGTERM"); resolvePromise({ healthy: true, summary: "doctor timed out (proceeding)" }); }, 30_000);
    proc.stdout.on("data", (c) => (out += c.toString()));
    proc.on("close", () => {
      clearTimeout(timer);
      try {
        const status = (JSON.parse(out) as { overallStatus?: string }).overallStatus ?? "unknown";
        resolvePromise({ healthy: status !== "fail", summary: `overallStatus=${status}` });
      } catch {
        resolvePromise({ healthy: true, summary: "doctor unparseable (proceeding)" });
      }
    });
    proc.on("error", () => { clearTimeout(timer); resolvePromise({ healthy: true, summary: "doctor unavailable (proceeding)" }); });
  });
}

async function main() {
  let args: Args;
  try {
    args = parseArgs(process.argv);
  } catch (err) {
    console.error(JSON.stringify({ verdict: "error", reason: (err as Error).message }));
    process.exit(2);
  }

  if (!existsSync(CODEX_BIN)) {
    const resp = { verdict: "skipped" as const, reason: "codex CLI not found on PATH, $CODEX_BIN, or common install dirs" };
    await appendFinding(args.slug, resp, "unknown");
    console.log(JSON.stringify(resp));
    process.exit(0);
  }

  await buildIsolatedCodexHome();
  const doctor = await codexDoctor();
  if (!doctor.healthy) {
    const resp = { verdict: "skipped" as const, reason: `codex doctor: ${doctor.summary}` };
    await appendFinding(args.slug, resp, "unknown");
    console.log(JSON.stringify(resp));
    process.exit(0);
  }

  let bundle: string;
  let tier = "release";
  // Zero bundled source is invisible in the verdict otherwise: the audit reads
  // the ISA and passes. Reported alongside the verdict so a zero reads as the
  // warning it is. public issue #1716, @xmasyx
  let artifactCount: number | null = null;
  if (args.payload) {
    if (!existsSync(args.payload)) {
      console.log(JSON.stringify({ verdict: "error", reason: `payload dir not found: ${args.payload}` }));
      process.exit(1);
    }
    bundle = await buildReleaseBundle(resolve(args.payload), args.focus);
  } else {
    let isa: string;
    try {
      isa = await readISA(args.slug);
    } catch (err) {
      const resp = { verdict: "error" as const, reason: (err as Error).message };
      console.log(JSON.stringify(resp));
      process.exit(1);
    }
    tier = extractTier(isa);
    const [artifacts, toolTail] = await Promise.all([
      readArtifacts(args.slug, isa, args.extraArtifacts),
      readToolActivityTail(args.slug),
    ]);
    artifactCount = artifacts.count;
    bundle = assembleBundle(isa, artifacts.text, toolTail);
  }

  const schemaPath = await writeVerdictSchema();
  const { stdout, stderr, code } = await invokeCodex(bundle, schemaPath);
  if (code === 124) {
    const resp = { verdict: "skipped" as const, reason: `codex timeout at ${CODEX_TIMEOUT_MS / 1000}s` };
    await appendFinding(args.slug, resp, tier);
    console.log(JSON.stringify(resp));
    return;
  }
  if (code !== 0) {
    const resp = { verdict: "skipped" as const, reason: `codex exit ${code}: ${stderr.slice(0, 200)}` };
    await appendFinding(args.slug, resp, tier);
    console.log(JSON.stringify(resp));
    return;
  }

  const parsed = extractJSON(stdout);
  // Absence-claim post-check (7.38.2 cut): the carrier asserted a file was
  // "missing from the manifest" that provably ships — an 80K-token bundle makes
  // needle lookups unreliable, and a hallucinated absence blocks a clean cut.
  // Any finding whose evidence names a payload-relative path that DOES exist in
  // the shipped tree gets deterministically annotated as disproven.
  if (args.payload && parsed.findings?.length) {
    const payloadRoot = resolve(args.payload);
    const ABSENCE_CLAIM = /\babsent|\bmissing|contains? no\b|includes? no\b|appears? nowhere|not (?:appear|present|in the (?:payload|manifest))/i;
    let disprovenCount = 0;
    for (const f of parsed.findings as Array<{ evidence: string; issue: string; disproven_paths?: string[] }>) {
      const text = `${f.issue} ${f.evidence}`;
      if (!ABSENCE_CLAIM.test(text)) continue;
      // The absence must be claimed ABOUT A FILE (Max audit, 7.39.7 cut): the
      // keyword alone also matches "X.ts is missing input validation", where the
      // absent thing is code, not a file — that finding names one path, the path
      // exists, and the whole claim got annotated disproven. Require payload-level
      // absence language, so a code-property critique never enters this path.
      // Anchored, not bare keywords (Max audit, 7.39.8 cut): bare "payload" also
      // means the HTTP sense ("missing validation of the request payload") and bare
      // "no file" matches inside "no filesystem", so a code-property critique could
      // re-enter the very path this guard closes.
      // Every alternative stays anchored to FILE-absence phrasing. A free-floating
      // `no file\b` re-opened the hole (Max audit, 7.39.9 cut): it correctly stopped
      // matching "no filesystem" but still matched code-property critiques like
      // "performs no file locking" / "no file size limit".
      if (!/(in|from|to) the (payload|manifest|shipped tree)|ships? nowhere|nowhere in the (payload|manifest|shipped tree)|no file (named|called|matching|at|with)\b/i.test(text)) continue;
      // Every path-like token, absolute (install/...) or relative (Workflows/X.md);
      // relative ones are re-anchored under any install/skills/<Skill>/ named in the finding.
      const tokens = [...text.matchAll(/`?([\w-]+(?:\/[\w.-]+)+\.\w{1,5})`?/g)].map((m) => m[1]);
      const skills = [...text.matchAll(/install\/skills\/([\w-]+)\//g)].map((m) => m[1]);
      // EVERY named path must resolve, not merely one (7.39.6 cut): the carrier
      // writes findings of the form "the manifest contains A but no B", and a
      // first-match rule disproved the claim using A — the file the finding
      // itself said was present — without ever testing B. Outcome happened to be
      // correct that time; the logic would have auto-passed a real absence.
      // Resolution per token is exact path, re-anchored under a named skill, or
      // a UNIQUE basename anywhere (the carrier mangles prefixes like `~/.claude/`).
      // Uniqueness is load-bearing (Max audit, 7.39.7 cut): a bare basename fallback
      // resolves "skills/Foo/SKILL.md" against any of the ~100 other SKILL.md files
      // and hands back a disproof of a claim nobody tested. One match or no match.
      const resolvedPaths: string[] = [];
      let allResolved = tokens.length > 0;
      for (const t of tokens) {
        const variants = [t, ...skills.map((s) => `install/skills/${s}/${t}`)];
        const hit = variants.find((p) => existsSync(join(payloadRoot, p))) ?? findUniqueBasename(payloadRoot, t.split("/").pop() ?? "");
        if (hit) resolvedPaths.push(hit);
        else allResolved = false;
      }
      if (allResolved) { f.disproven_paths = resolvedPaths; disprovenCount++; }
    }
    // Filesystem truth outranks a model's read of a 100K-char manifest: when every
    // finding rests on a disproven absence claim, the verdict is a pass, recorded
    // with the disproof so the override is auditable (two hallucinated-absence
    // blocks on the 7.38.2/7.38.3 cuts drove this).
    if (disprovenCount === parsed.findings.length && parsed.verdict !== "pass") {
      (parsed as { verdict: string }).verdict = "pass";
      (parsed as { override_note?: string }).override_note =
        `verdict downgraded from concerns/fail: all ${disprovenCount} finding(s) claimed absent paths that exist in the payload (see disproven_paths)`;
    }
  }
  if (parsed.tokens_used && !parsed.cost_usd_est) {
    parsed.cost_usd_est = estimateCost(parsed.tokens_used);
  }
  if (artifactCount !== null) parsed.artifacts_bundled = artifactCount;
  await appendFinding(args.slug, parsed, tier);
  console.log(JSON.stringify(parsed));
}

main().catch(async (err) => {
  console.error(JSON.stringify({ verdict: "error", reason: err.message }));
  process.exit(1);
});
