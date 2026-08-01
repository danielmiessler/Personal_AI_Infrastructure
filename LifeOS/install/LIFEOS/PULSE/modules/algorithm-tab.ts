/**
 * Algorithm Pulse module — the complete thinking chain of the running system,
 * visible, summarized, and editable. Everything the Algorithm pertains to:
 * the constitutional context (system prompt, CLAUDE.md, operational rules),
 * the context-injection hooks, the versioned doctrine, the on-demand rule
 * files, the ISA system (format spec, system doc, skill), and the run-layer
 * enforcement hooks.
 *
 * Serves the /algorithm tab:
 *   GET  /api/algorithm-tab                       — composed payload: version, the
 *        full chain catalog (every file with role, stage, per-file AI summary +
 *        staleness), live claims/teeth counts parsed from the doctrine, version
 *        history, and the cached overview explanation. When anything is stale,
 *        the GET itself kicks background regeneration (cooldown-guarded) — the
 *        page self-updates whenever the algorithm changes; no manual step.
 *   GET  /api/algorithm-tab/file?id=<id>[&version=vX.Y.Z]
 *        — content + mtime for one chain file (doctrine history via version=).
 *   POST /api/algorithm-tab/file                  — save an editable chain file in
 *        place: mtime conflict check, TS syntax gate for hook source
 *        (Bun.Transpiler — a hook that doesn't parse never reaches disk),
 *        freshness-frontmatter bump for markdown, git commit in the file's REAL
 *        repo (USER symlink targets commit in the USER repo). Kicks summary regen.
 *   POST /api/algorithm-tab/doctrine              — the versioned doctrine workflow:
 *        write v{next}.md (H1 bumped, prior v-files never touched), prepend a
 *        changelog entry, update LATEST, one git commit. Kicks summary regen.
 *   POST /api/algorithm-tab/summary/regenerate    — force a full regeneration pass.
 *
 * Summaries (MEMORY/STATE/algorithm-tab-summary.json, schema v2):
 *   overview — the simple how-it-all-works explanation (Inference level high).
 *   files[id] — per-file card: what it performs, when it fires, how it affects
 *   the overall system (Inference level low), cached by content sha256.
 *
 * Security: file access is a fixed server-side whitelist keyed by id — client
 * paths are never accepted. Git runs via arg-array spawn only (no shell
 * interpolation). Tagged doctrine versions are immutable by construction: the
 * writer refuses to overwrite an existing v*.md.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const MODULE_NAME = "algorithm-tab";
const HOME = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
const LIFEOS_DIR = join(HOME, "LIFEOS");
const ALGO_DIR = join(LIFEOS_DIR, "ALGORITHM");
const STATE_PATH = join(LIFEOS_DIR, "MEMORY", "STATE", "algorithm-tab-summary.json");
const INFERENCE = join(LIFEOS_DIR, "TOOLS", "Inference.ts");
// The USER tree is a symlink into the private USER-data repo — commits for
// files that resolve there must land in THAT repo, not ~/.claude.
const USER_REPO = join(homedir(), ".config", "LIFEOS", "USER");

// Failed auto-regeneration attempts back off so a broken inference call can't
// loop on every page poll.
const FAIL_COOLDOWN_MS = 30 * 60_000;

const state: {
  running: boolean;
  generating: boolean;
  lastAttempt: { hash: string; at: number; ok: boolean } | null;
} = { running: false, generating: false, lastAttempt: null };

/* ── The chain catalog — the fixed whitelist of thinking-chain files ── */

type Stage = "context" | "doctrine" | "isa" | "run" | "ondemand";

interface ChainSpec {
  id: string;
  name: string;
  /** Display path, relative to ~/.claude */
  rel: string;
  role: string;
  loaded: string;
  stage: Stage;
  editable: boolean;
  kind: "markdown" | "code";
}

const CHAIN: ChainSpec[] = [
  /* ── Every turn: the standing context ── */
  {
    id: "system-prompt", name: "System Prompt", rel: "LIFEOS/LIFEOS_SYSTEM_PROMPT.md",
    role: "The constitutional layer — the five constitutional rules, the ONE output format, verification doctrine, security protocol, hard prohibitions. Highest authority; wins every conflict.",
    loaded: "Every turn (appended system prompt)", stage: "context", editable: true, kind: "markdown",
  },
  {
    id: "claude-md", name: "CLAUDE.md", rel: "CLAUDE.md",
    role: "The routing table — where everything lives. Pulls the always-on @-imports: architecture summary, TELOS, principal + DA identity, projects, operational rules.",
    loaded: "Every turn (auto-loaded + @-imports)", stage: "context", editable: true, kind: "markdown",
  },
  {
    id: "operational-rules", name: "Operational Rules", rel: "LIFEOS/USER/CONFIG/OPERATIONAL_RULES.md",
    role: "Principal-specific operating rules — model selection, versioning, deploy doctrine, design variety, releases, autonomy boundaries. @-imported every turn.",
    loaded: "Every turn (@-import via CLAUDE.md)", stage: "context", editable: true, kind: "markdown",
  },
  {
    id: "load-context-hook", name: "LoadContext hook", rel: "hooks/LoadContext.hook.ts",
    role: "SessionStart injection — builds the LifeOS dynamic context block (learning frames, active work, architecture pointers) the session opens with.",
    loaded: "SessionStart (every new session)", stage: "context", editable: true, kind: "code",
  },
  {
    id: "load-memory-hook", name: "LoadMemory hook", rel: "hooks/LoadMemory.hook.ts",
    role: "Every-prompt injection of the hot-layer memory files (PRINCIPAL_MEMORY, DA_MEMORY) so each turn sees current memory.",
    loaded: "Every prompt (UserPromptSubmit)", stage: "context", editable: true, kind: "code",
  },

  /* ── The doctrine ── */
  {
    id: "doctrine", name: "The Algorithm (doctrine)", rel: "LIFEOS/ALGORITHM/v{LATEST}.md",
    role: "The thinking loop itself — euphoric surprise as the target, the ISA as hill + instrument, the 16 done-claims with their teeth (HOOK/CHECK/SELF), the event nudge table, spend doctrine. Read at the start of any substantial run.",
    loaded: "On any substantial run (first action)", stage: "doctrine", editable: true, kind: "markdown",
  },
  {
    id: "changelog", name: "Algorithm Changelog", rel: "LIFEOS/ALGORITHM/changelog.md",
    role: "Every doctrine version's full history: what changed, why, migration and rollback recipes. Doctrine files stay lean; history lives here.",
    loaded: "On demand", stage: "doctrine", editable: true, kind: "markdown",
  },

  /* ── The ISA system ── */
  {
    id: "isa-format", name: "ISA Format Spec", rel: "LIFEOS/DOCUMENTATION/ISA/ISAFormat.md",
    role: "The contract for the Ideal State Artifact — section order, claim shapes, ID stability, the Splitting and Variation tests. The ISA is where 'done' gets written down before building.",
    loaded: "During a run (ISA work)", stage: "isa", editable: true, kind: "markdown",
  },
  {
    id: "isa-system", name: "ISA System doc", rel: "LIFEOS/DOCUMENTATION/ISA/ISASystem.md",
    role: "How the ISA subsystem works end to end — lifecycle, homes (repo ISA vs MEMORY/WORK), sync to Pulse, resume semantics.",
    loaded: "On demand (ISA architecture)", stage: "isa", editable: true, kind: "markdown",
  },
  {
    id: "isa-skill", name: "ISA skill", rel: "skills/ISA/SKILL.md",
    role: "The skill that scaffolds, interviews, scores completeness, reconciles, and appends to ISAs — the operational front door to the ISA system.",
    loaded: "On invocation (ISA operations)", stage: "isa", editable: true, kind: "markdown",
  },
  {
    id: "isasync-hook", name: "ISASync hook", rel: "hooks/ISASync.hook.ts",
    role: "Mirrors every ISA write to the work registry (work.json) → Pulse. This write IS the run telemetry — claim 13's carrier.",
    loaded: "Event-driven (ISA writes)", stage: "isa", editable: true, kind: "code",
  },
  {
    id: "checkpoint-hook", name: "CheckpointPerISC hook", rel: "hooks/CheckpointPerISC.hook.ts",
    role: "Auto git-commit on every claim close (`[ ]`→`[x]`) — evidence trail per closed claim, part of claim 8's teeth.",
    loaded: "Event-driven (ISA claim edits)", stage: "isa", editable: true, kind: "code",
  },
  {
    id: "isa-render-hook", name: "ISARenderOnStop hook", rel: "hooks/ISARenderOnStop.hook.ts",
    role: "Re-renders edited ISAs at end-of-turn so the HTML mirror stays current with the artifact.",
    loaded: "Stop (turn end, when ISAs changed)", stage: "isa", editable: true, kind: "code",
  },

  /* ── The run layer: live nudges + gates ── */
  {
    id: "nudge-hook", name: "AlgorithmNudge hook", rel: "hooks/AlgorithmNudge.hook.ts",
    role: "The live event layer — deterministic nudges fired at the moment they're answerable: skill-routing, late-ISA, depth directives (always-on); probe-failure, mid-run messages, spend checks (run-scoped).",
    loaded: "Event-driven (every prompt / tool result)", stage: "run", editable: true, kind: "code",
  },
  {
    id: "verification-gate", name: "VerificationGate hook", rel: "hooks/VerificationGate.hook.ts",
    role: "Mechanical teeth for claim 8 — no claim closes without tool evidence of the right modality; web/UI claims need a real browser, appearance claims need viewed pixels.",
    loaded: "Event-driven (claim close / stop)", stage: "run", editable: true, kind: "code",
  },
  {
    id: "stop-gates", name: "StopGates hook", rel: "hooks/StopGates.hook.ts",
    role: "The ONE Stop-event gate runner — merges the per-turn gate spawns into a single process reading stdin once; each gate file stays owner of its logic.",
    loaded: "Stop (every turn end)", stage: "run", editable: true, kind: "code",
  },
  {
    id: "format-gate", name: "FormatGate hook", rel: "hooks/FormatGate.hook.ts",
    role: "Deterministic Stop-hook teeth for the ONE output format — banner first, closer last, hook-fed memory lines echoed verbatim.",
    loaded: "Stop (every turn end)", stage: "run", editable: true, kind: "code",
  },
  {
    id: "spend-auditor", name: "SpendAuditor hook", rel: "hooks/SpendAuditor.hook.ts",
    role: "Outcome-side spend verification (claim 15) — catches the heavy ask answered inline with zero capability use and no stated reason.",
    loaded: "Event-driven (turn analysis)", stage: "run", editable: true, kind: "code",
  },
  {
    id: "writing-gate", name: "WritingGate hook", rel: "hooks/WritingGate.hook.ts",
    role: "Publication gate — prose authored for the principal that will be published must pass the _WRITING audit + a real Pangram run, SHA-verified; typing the audit line without running the tool does not pass.",
    loaded: "Stop (publication signals)", stage: "run", editable: true, kind: "code",
  },
  {
    id: "drift-reminder", name: "DriftReminder hook", rel: "hooks/DriftReminder.hook.ts",
    role: "Voice/format drift nudge — flags when output slides away from the DA voice contract so the next turn corrects.",
    loaded: "Every prompt (UserPromptSubmit)", stage: "run", editable: true, kind: "code",
  },

  /* ── On demand: the rule files the Algorithm loads by trigger ── */
  {
    id: "philosophy", name: "Philosophy", rel: "LIFEOS/RULES/Philosophy.md",
    role: "Why the system works this way — Deutsch epistemology, hard-to-vary claims, ideal-state prompting, the bitter-lesson stance on scaffolding.",
    loaded: "On demand (explaining / documenting)", stage: "ondemand", editable: true, kind: "markdown",
  },
  {
    id: "verification-expanded", name: "Verification Doctrine", rel: "LIFEOS/RULES/Verification.md",
    role: "The ONE home of the six incident-derived verification rules (modality fidelity, defer-never-substitute, appearance ≠ existence, reproduce-before-fixing, temporal fidelity, restore-parity). Cites incidents by INC-ID.",
    loaded: "On demand (web/UI verification)", stage: "ondemand", editable: true, kind: "markdown",
  },
  {
    id: "incidents", name: "Incidents", rel: "LIFEOS/MEMORY/LEARNING/INCIDENTS/README.md",
    role: "The self-improvement loop's evidence base — one INC-YYYYMMDD-<slug>.md per verified LifeOS failure, cited by ID from rules and doctrine; narratives live here and only here.",
    loaded: "On demand (following an INC citation)", stage: "ondemand", editable: true, kind: "markdown",
  },
  {
    id: "self-healing", name: "Self-Healing", rel: "LIFEOS/RULES/SelfHealing.md",
    role: "Where a new rule or fix structurally lives — hooks for enforcement, CLAUDE.md for routing, skills for domain behavior, KNOWLEDGE for facts. Fix the system, not your notes.",
    loaded: "On demand (encoding a learning / degraded state)", stage: "ondemand", editable: true, kind: "markdown",
  },
  {
    id: "operational-rules-expanded", name: "Operational Rules Expanded", rel: "LIFEOS/USER/CONFIG/OperationalRulesExpanded.md",
    role: "The mechanics behind every operational rule — full rationale, incident history, procedures, same section names as the operative core. Read when a rule fires and you need the how.",
    loaded: "On demand (a rule fires)", stage: "ondemand", editable: true, kind: "markdown",
  },
  {
    id: "writing-style-backstop", name: "Writing Style Backstop", rel: "LIFEOS/USER/DIGITAL_ASSISTANT/REFERENCE/WritingStyleBackstop.md",
    role: "The complete voice doctrine — ban lists, banned rhythms, the pre-emit checks, long-form exemplars. Loaded when auditing writing or a drift flag fires.",
    loaded: "On demand (writing audit / drift flag)", stage: "ondemand", editable: true, kind: "markdown",
  },
];

const STAGE_ORDER: Stage[] = ["context", "doctrine", "isa", "run", "ondemand"];

function chainPath(spec: ChainSpec, version?: string): string {
  if (spec.id === "doctrine") {
    const v = version ?? readLatestSync();
    return join(ALGO_DIR, `v${v}.md`);
  }
  return join(HOME, spec.rel);
}

function readLatestSync(): string {
  try {
    return readFileSync(join(ALGO_DIR, "LATEST"), "utf8").trim();
  } catch {
    return "0.0.0";
  }
}

/* ── Doctrine parsing — claims + teeth, live from the file ── */

function parseClaims(doctrine: string): { total: number; hook: number; check: number; self: number } {
  const m = doctrine.match(/## A run is complete when([\s\S]*?)(?=\n## )/);
  const body = m ? m[1] : "";
  const items = body.match(/^\d+\.\s/gm) ?? [];
  return {
    total: items.length,
    hook: (body.match(/\(HOOK/g) ?? []).length,
    check: (body.match(/\(CHECK/g) ?? []).length,
    self: (body.match(/\(SELF/g) ?? []).length,
  };
}

function listVersions(): { version: string; mtime: string }[] {
  const out: { version: string; mtime: string; _k: number[] }[] = [];
  for (const f of readdirSync(ALGO_DIR)) {
    const m = f.match(/^v(\d+)\.(\d+)\.(\d+)\.md$/);
    if (!m) continue;
    out.push({
      version: `${m[1]}.${m[2]}.${m[3]}`,
      mtime: statSync(join(ALGO_DIR, f)).mtime.toISOString(),
      _k: [Number(m[1]), Number(m[2]), Number(m[3])],
    });
  }
  out.sort((a, b) => b._k[0] - a._k[0] || b._k[1] - a._k[1] || b._k[2] - a._k[2]);
  return out.map(({ _k, ...r }) => r);
}

/* ── Summary store (schema v2: overview + per-file cards) ── */

interface FileSummary { hash: string; generated_at: string; markdown: string }
interface SummaryStore {
  overview: { generated_at: string; chain_hash: string; level: string; markdown: string } | null;
  files: Record<string, FileSummary>;
}

async function readStore(): Promise<SummaryStore> {
  try {
    const raw = JSON.parse(await Bun.file(STATE_PATH).text());
    if (raw && typeof raw === "object" && "files" in raw) return raw as SummaryStore;
    // v1 migration: the old file WAS the overview.
    if (raw && raw.markdown) {
      return { overview: { generated_at: raw.generated_at, chain_hash: raw.chain_hash, level: raw.level ?? "high", markdown: raw.markdown }, files: {} };
    }
  } catch { /* fresh store */ }
  return { overview: null, files: {} };
}

async function writeStore(store: SummaryStore): Promise<void> {
  await Bun.write(STATE_PATH, JSON.stringify(store, null, 2));
}

function contentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

async function chainHash(): Promise<string> {
  const h = createHash("sha256");
  for (const spec of CHAIN) {
    try {
      h.update(await Bun.file(chainPath(spec)).text());
    } catch { h.update(`missing:${spec.id}`); }
  }
  return h.digest("hex");
}

/* ── Inference ── */

async function inference(level: "low" | "high", system: string, user: string, timeoutMs: number): Promise<string | null> {
  const proc = Bun.spawn(
    ["bun", INFERENCE, "--level", level, "--timeout", String(timeoutMs), system, user],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0 || !out.trim()) {
    console.log(`[${MODULE_NAME}] inference(${level}) failed (exit ${code}): ${err.slice(0, 300)}`);
    return null;
  }
  // Strip trailing meta-commentary paragraphs the subprocess sometimes appends.
  const paras = out.trim().split(/\n{2,}/);
  while (paras.length > 1 && /^[*_(\s]*Note[:\s]/i.test(paras[paras.length - 1])) paras.pop();
  return paras.join("\n\n").trim();
}

const OVERVIEW_PROMPT = `You are writing the "How this system works" panel for the Pulse Algorithm dashboard — the page where the principal inspects how his AI system thinks. You are given the live contents of every file in the thinking chain.

Write it SIMPLE. The reader is smart but should not need to already know the system.

Shape:
- Open with ONE plain paragraph (3-5 sentences, no header) that explains the whole thing to someone with zero context: what happens when a message arrives, how the system decides whether it's a quick answer or real work, what an ISA is in plain words (a written definition of "done" made of testable claims), and why nothing counts as done without tool evidence.
- Then exactly these sections, each 2-4 short sentences of plain language:
  ## Every turn — what loads before the first token and what wins conflicts.
  ## When work is real — how a run works: write done down, climb, close claims on evidence.
  ## The teeth — hooks that block mechanically vs checks vs self-attestation; name the actual hook files.
  ## Where the rules live — which files carry what, so the reader knows what to edit to change behavior.

250-450 words total. Plain words a Paul Graham essay would use — no jargon without a five-word gloss, no marketing register, no bullet spam. Ground every statement in the provided files; name real filenames so the reader can jump to them.

Output ONLY the markdown. No preamble, no closing notes, no meta-commentary.`;

const FILE_PROMPT = `You are writing the summary card for ONE file in the Pulse Algorithm dashboard. The reader wants to quickly and deeply understand what this file is doing in his AI system.

Write 3-5 short sentences of plain language covering: (1) what this file actually performs — what happens when it loads or fires; (2) when it runs; (3) how it affects the overall Algorithm system — what would change or break if it vanished. If it's a hook, say what event triggers it and what it blocks or injects. No headers, no lists, no preamble — just the sentences.`;

/* ── Regeneration — per-file cards first, then the overview ── */

async function regenerateAll(force = false): Promise<void> {
  if (state.generating) return;
  state.generating = true;
  const overallHash = await chainHash();
  let anyFailure = false;
  try {
    const store = await readStore();

    for (const spec of CHAIN) {
      let content: string;
      try { content = await Bun.file(chainPath(spec)).text(); } catch { continue; }
      const hash = contentHash(content);
      if (!force && store.files[spec.id]?.hash === hash) continue;
      const body = content.length > 14000 ? `${content.slice(0, 14000)}\n\n[…truncated]` : content;
      const md = await inference(
        "low",
        FILE_PROMPT,
        `FILE: ${spec.rel}\nSTATED ROLE: ${spec.role}\nLOADS: ${spec.loaded}\n\n${body}`,
        120_000,
      );
      if (md) {
        store.files[spec.id] = { hash, generated_at: new Date().toISOString(), markdown: md };
        await writeStore(store); // persist incrementally — a crash keeps finished cards
      } else {
        anyFailure = true;
      }
    }

    if (force || !store.overview || store.overview.chain_hash !== overallHash) {
      const parts: string[] = [];
      for (const spec of CHAIN) {
        try {
          const content = await Bun.file(chainPath(spec)).text();
          const body = spec.kind === "code" ? content.slice(0, 4000) : content;
          parts.push(`===== FILE: ${spec.rel} (${spec.role}) =====\n${body}`);
        } catch { /* missing file — skip */ }
      }
      const md = await inference("high", OVERVIEW_PROMPT, parts.join("\n\n"), 300_000);
      if (md) {
        store.overview = { generated_at: new Date().toISOString(), chain_hash: overallHash, level: "high", markdown: md };
        await writeStore(store);
      } else {
        anyFailure = true;
      }
    }

    state.lastAttempt = { hash: overallHash, at: Date.now(), ok: !anyFailure };
    console.log(`[${MODULE_NAME}] regeneration pass done${anyFailure ? " (with failures)" : ""}`);
  } catch (e: any) {
    state.lastAttempt = { hash: overallHash, at: Date.now(), ok: false };
    console.log(`[${MODULE_NAME}] regeneration pass FAILED: ${String(e?.message ?? e)}`);
  } finally {
    state.generating = false;
  }
}

/** Fire-and-forget regeneration when something is stale. Failure-cooldown guarded. */
function kickIfStale(overallHash: string, store: SummaryStore): void {
  if (state.generating) return;
  const overviewStale = !store.overview || store.overview.chain_hash !== overallHash;
  const anyFileMissing = CHAIN.some((s) => !store.files[s.id]);
  if (!overviewStale && !anyFileMissing) return;
  const la = state.lastAttempt;
  if (la && !la.ok && la.hash === overallHash && Date.now() - la.at < FAIL_COOLDOWN_MS) return;
  regenerateAll().catch((e) => console.log(`[${MODULE_NAME}] kick failed: ${e}`));
}

/* ── Git — arg-array spawn only, repo chosen from the file's REAL path ── */

function repoFor(absPath: string): string {
  try {
    const real = realpathSync(absPath);
    if (real.startsWith(realpathSync(USER_REPO))) return USER_REPO;
  } catch { /* fall through */ }
  return HOME;
}

async function git(repo: string, ...args: string[]): Promise<{ code: number; out: string; err: string }> {
  const proc = Bun.spawn(["git", "-C", repo, ...args], { stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, out: out.trim(), err: err.trim() };
}

async function commitFiles(absPaths: string[], message: string): Promise<{ committed: boolean; detail: string }> {
  const repo = repoFor(absPaths[0]);
  const real = absPaths.map((p) => { try { return realpathSync(p); } catch { return p; } });
  const add = await git(repo, "add", ...real);
  if (add.code !== 0) return { committed: false, detail: `git add failed: ${add.err}` };
  const commit = await git(repo, "commit", "-m", message);
  if (commit.code !== 0) return { committed: false, detail: `git commit: ${commit.err || commit.out}` };
  const sha = await git(repo, "rev-parse", "--short", "HEAD");
  return { committed: true, detail: `${sha.out} in ${repo === HOME ? "~/.claude" : "USER repo"}` };
}

/* ── Frontmatter freshness — bump what the file actually carries ── */

function bumpFrontmatter(content: string): string {
  const fm = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return content;
  let head = fm[1];
  const now = new Date().toISOString();
  if (/^last_updated:/m.test(head)) {
    head = head.replace(/^last_updated:.*$/m, `last_updated: ${now}`);
    head = head.replace(/^last_updated_by:.*$/m, "last_updated_by: pulse-algorithm-tab");
  }
  if (/^version:\s*\d+\.\d+\.\d+\s*$/m.test(head)) {
    head = head.replace(/^version:\s*(\d+)\.(\d+)\.(\d+)\s*$/m, (_, a, b, c) => `version: ${a}.${b}.${Number(c) + 1}`);
  }
  return content.replace(fm[0], `---\n${head}\n---`);
}

/* ── TS syntax gate — a hook that doesn't parse never reaches disk ── */

function syntaxCheck(content: string): string | null {
  try {
    new Bun.Transpiler({ loader: "ts" }).transformSync(content);
    return null;
  } catch (e: any) {
    return String(e?.message ?? e);
  }
}

/* ── The versioned doctrine save ── */

async function saveDoctrine(body: { content?: string; bump?: string; note?: string }): Promise<Response> {
  const { content, bump, note } = body;
  if (!content || typeof content !== "string" || content.length < 500) {
    return Response.json({ error: "content missing or implausibly short" }, { status: 400 });
  }
  if (bump !== "patch" && bump !== "feature") {
    return Response.json({ error: "bump must be 'patch' or 'feature'" }, { status: 400 });
  }
  if (!note || typeof note !== "string" || note.trim().length < 10) {
    return Response.json({ error: "a changelog note (≥10 chars) is required — edits are noted and versioned, always" }, { status: 400 });
  }

  const cur = readLatestSync();
  const [maj, feat, patch] = cur.split(".").map(Number);
  if ([maj, feat, patch].some(Number.isNaN)) {
    return Response.json({ error: `LATEST unparsable: ${cur}` }, { status: 500 });
  }
  const next = bump === "patch" ? `${maj}.${feat}.${patch + 1}` : `${maj}.${feat + 1}.0`;
  const nextPath = join(ALGO_DIR, `v${next}.md`);
  if (existsSync(nextPath)) {
    // Tagged versions are immutable — refuse rather than overwrite.
    return Response.json({ error: `v${next}.md already exists — refusing to touch a tagged version` }, { status: 409 });
  }

  // H1 carries the version; force it to the new one.
  let doctrine = content;
  if (/^# The Algorithm .*/m.test(doctrine)) {
    doctrine = doctrine.replace(/^# The Algorithm .*$/m, `# The Algorithm ${next}`);
  } else {
    doctrine = `# The Algorithm ${next}\n\n${doctrine}`;
  }
  await Bun.write(nextPath, doctrine);

  // Changelog entry — inserted above the newest existing entry, intro preserved.
  const clPath = join(ALGO_DIR, "changelog.md");
  const cl = await Bun.file(clPath).text();
  const stamp = new Date().toISOString().slice(0, 10);
  const entry = `- **v${next} changelog (${note.trim().split(/[.\n]/)[0].slice(0, 80)}, ${bump.toUpperCase()}):** edited via the Pulse Algorithm tab, ${stamp}. ${note.trim()} Migration: \`echo ${next} > LATEST\` (done). Rollback: \`echo ${cur} > LATEST\`.\n\n`;
  const firstEntry = cl.search(/^- \*\*v/m);
  const newCl = firstEntry === -1 ? cl + "\n" + entry : cl.slice(0, firstEntry) + entry + cl.slice(firstEntry);
  await Bun.write(clPath, newCl);

  await Bun.write(join(ALGO_DIR, "LATEST"), `${next}\n`);

  const commit = await commitFiles(
    [nextPath, clPath, join(ALGO_DIR, "LATEST")],
    `algorithm: v${next} (${bump}) via Pulse Algorithm tab — ${note.trim().split("\n")[0].slice(0, 100)}`,
  );

  // The algorithm changed — refresh the explanations.
  setTimeout(() => { readStore().then((s) => chainHash().then((h) => kickIfStale(h, s))); }, 500);

  return Response.json({ ok: true, version: next, previous: cur, commit });
}

/* ── The in-place chain-file save ── */

async function saveFile(body: { id?: string; content?: string; expectedMtime?: string }): Promise<Response> {
  const spec = CHAIN.find((s) => s.id === body.id);
  if (!spec) return Response.json({ error: "unknown file id" }, { status: 404 });
  if (!spec.editable) return Response.json({ error: `${spec.name} is view-only` }, { status: 403 });
  if (spec.id === "doctrine") return Response.json({ error: "doctrine edits go through /api/algorithm-tab/doctrine (versioned)" }, { status: 400 });
  if (!body.content || typeof body.content !== "string" || body.content.length < 50) {
    return Response.json({ error: "content missing or implausibly short" }, { status: 400 });
  }
  const path = chainPath(spec);
  const st = statSync(path);
  if (body.expectedMtime && st.mtime.toISOString() !== body.expectedMtime) {
    return Response.json({ error: "file changed on disk since you loaded it — reload and re-apply", mtime: st.mtime.toISOString() }, { status: 409 });
  }
  if (spec.kind === "code") {
    const syntaxErr = syntaxCheck(body.content);
    if (syntaxErr) {
      return Response.json({ error: `TS syntax check failed — not saved: ${syntaxErr.slice(0, 300)}` }, { status: 422 });
    }
  }
  const finalContent = spec.kind === "markdown" ? bumpFrontmatter(body.content) : body.content;
  await Bun.write(path, finalContent);
  const commit = await commitFiles([path], `${spec.kind === "code" ? "hooks" : "rules"}: edit ${spec.rel} via Pulse Algorithm tab`);

  // Refresh this file's summary card (and the overview) in the background.
  setTimeout(() => { readStore().then((s) => chainHash().then((h) => kickIfStale(h, s))); }, 500);

  return Response.json({ ok: true, mtime: statSync(path).mtime.toISOString(), commit });
}

/* ── Compose the main payload ── */

async function compose(): Promise<unknown> {
  const errors: Record<string, string> = {};
  const version = readLatestSync();

  let doctrine = "";
  try { doctrine = await Bun.file(join(ALGO_DIR, `v${version}.md`)).text(); }
  catch (e: any) { errors.doctrine = String(e?.message ?? e); }

  const store = await readStore();
  const hash = await chainHash();

  const chain = await Promise.all(CHAIN.map(async (spec) => {
    const path = chainPath(spec);
    let bytes = 0, mtime: string | null = null, fileHash: string | null = null;
    try {
      const st = statSync(path);
      bytes = st.size;
      mtime = st.mtime.toISOString();
      fileHash = contentHash(await Bun.file(path).text());
    } catch { errors[spec.id] = "missing on disk"; }
    const card = store.files[spec.id] ?? null;
    return {
      id: spec.id, name: spec.name,
      rel: spec.id === "doctrine" ? `LIFEOS/ALGORITHM/v${version}.md` : spec.rel,
      role: spec.role, loaded: spec.loaded, stage: spec.stage, editable: spec.editable, kind: spec.kind,
      bytes, mtime,
      summary: card ? { markdown: card.markdown, generated_at: card.generated_at, stale: fileHash !== null && card.hash !== fileHash } : null,
    };
  }));

  // Self-updating page: a stale explanation kicks its own regeneration.
  kickIfStale(hash, store);

  return {
    generated_at: new Date().toISOString(),
    version,
    claims: parseClaims(doctrine),
    stages: STAGE_ORDER,
    chain,
    versions: listVersions().slice(0, 20),
    summary: store.overview
      ? { generated_at: store.overview.generated_at, level: store.overview.level, stale: store.overview.chain_hash !== hash, markdown: store.overview.markdown }
      : null,
    generating: state.generating,
    errors: Object.keys(errors).length ? errors : null,
  };
}

/* ── Module surface ── */

export function start(): void {
  state.running = true;
  console.log(`[${MODULE_NAME}] Started — serving /api/algorithm-tab (${CHAIN.length} chain files)`);
}

export async function handleRequest(req: Request, pathname: string): Promise<Response | null> {
  if (!pathname.startsWith("/api/algorithm-tab")) return null;
  const sub = pathname.replace(/^\/api\/algorithm-tab/, "").replace(/\/$/, "");

  try {
    if (sub === "" && req.method === "GET") {
      return Response.json(await compose());
    }

    if (sub === "/file" && req.method === "GET") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id") ?? "";
      const spec = CHAIN.find((s) => s.id === id);
      if (!spec) return Response.json({ error: "unknown file id" }, { status: 404 });
      let version: string | undefined;
      if (spec.id === "doctrine") {
        const v = url.searchParams.get("version");
        if (v) {
          if (!/^\d+\.\d+\.\d+$/.test(v)) return Response.json({ error: "bad version" }, { status: 400 });
          version = v;
        }
      }
      const path = chainPath(spec, version);
      if (!existsSync(path)) return Response.json({ error: "file missing on disk" }, { status: 404 });
      const st = statSync(path);
      return Response.json({ id, content: await Bun.file(path).text(), mtime: st.mtime.toISOString(), editable: spec.editable && !version });
    }

    if (sub === "/file" && req.method === "POST") {
      return saveFile(await req.json());
    }

    if (sub === "/doctrine" && req.method === "POST") {
      return saveDoctrine(await req.json());
    }

    if (sub === "/summary/regenerate" && req.method === "POST") {
      // Generation takes minutes; kick it off and return — the page polls
      // the main payload's `generating` flag.
      if (state.generating) return Response.json({ error: "generation already in progress" }, { status: 409 });
      regenerateAll(true).then(() => {
        console.log(`[${MODULE_NAME}] forced regeneration finished`);
      });
      return Response.json({ ok: true, started: true }, { status: 202 });
    }

    return Response.json({ error: "not found" }, { status: 404 });
  } catch (e: any) {
    return Response.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export function health(): { running: boolean; generating: boolean } {
  return { running: state.running, generating: state.generating };
}
