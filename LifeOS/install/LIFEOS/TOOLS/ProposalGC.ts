#!/usr/bin/env bun
/**
 * ProposalGC — self-healing garbage collection for auto-appended memory proposals.
 *
 * The memory reviewer appends proposals to always-loaded files under a
 * `## Memory-System Proposals` section. Without cleanup they accrete (dups,
 * superseded entries, proposals already absorbed into the file body), re-bloating
 * the every-turn context. This job REMOVES only the provably-redundant, on
 * cadence, with no human step — the self-healing counterpart to the reviewer's
 * add loop.
 *
 * SAFETY (non-negotiable): only three removal classes, each PROVABLE, never a
 * judgment call. It never merges meaning and never touches a distinct rule, so
 * the worst case is a no-op — it cannot drop a live directive. `--dry-run` is
 * the default; `--apply` writes; git makes every heal reversible.
 *
 *   1. SUPERSEDED — entry contains a self-marked `[SUPERSEDED` tag.
 *   2. EXACT-DUP  — normalized text identical to another entry; keep newest ts.
 *   3. ABSORBED   — the entry's substantive text already appears verbatim in the
 *                   file's canonical body (above the proposals section).
 *
 * ROUTING (checkpoint-OUT, advisory only — `--route`): a proposal whose directive
 * is already enforced by a named hook, or is scoped to a single skill, does not
 * belong in an always-loaded file — its home is the hook (delete the prose) or the
 * skill's SKILL.md (relocate). Detection is by NAME (the entry literally references
 * an existing hook or skill), so it is precise, but it is NEVER auto-applied: it
 * only FLAGS candidates for a human/Trim decision. The auto-heal path above keeps
 * its provable-only invariant untouched.
 *
 * Usage:
 *   bun ProposalGC.ts                # dry-run: report provable removals per file
 *   bun ProposalGC.ts --apply        # write the cleaned files (provable removals only)
 *   bun ProposalGC.ts --route        # advisory: flag hook-enforced / skill-scoped entries
 *   bun ProposalGC.ts --json
 */
import { readFileSync, writeFileSync, renameSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";

const CLAUDE_DIR = join(dirname(new URL(import.meta.url).pathname), "..", "..");
const OBS_LOG = join(CLAUDE_DIR, "LIFEOS/MEMORY/OBSERVABILITY/proposal-gc.jsonl");
const SECTION = "## Memory-System Proposals";

// Always-loaded files that carry an auto-appended proposals section.
const TARGETS = [
  "LIFEOS/USER/CONFIG/OPERATIONAL_RULES.md",
  "LIFEOS/USER/PROJECTS.md",
  "LIFEOS/USER/PRINCIPAL/PRINCIPAL_IDENTITY.md",
  "LIFEOS/USER/DIGITAL_ASSISTANT/DA_IDENTITY.md",
];

type Removal = { file: string; reason: "superseded" | "exact-dup" | "absorbed"; text: string };

/** Normalize an entry for equality: drop the applied-comment, bullet, ws, case. */
function normalize(entry: string): string {
  return entry
    .replace(/<!--\s*applied:[^>]*-->/gi, "")
    .replace(/^[-*]\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Timestamp from an `<!-- applied: ISO -->` marker (for keep-newest). */
function appliedTs(entry: string): string {
  const m = entry.match(/<!--\s*applied:\s*([^>]+?)\s*-->/i);
  return m ? m[1].trim() : "";
}

/** Substantive core of an entry (first ~60 normalized chars) for absorption test. */
function core(entry: string): string {
  return normalize(entry).slice(0, 60);
}

function gcFile(relPath: string): { removals: Removal[]; nextContent: string | null } {
  const abs = join(CLAUDE_DIR, relPath);
  if (!existsSync(abs)) return { removals: [], nextContent: null };
  const content = readFileSync(abs, "utf8");
  const idx = content.indexOf(SECTION);
  if (idx === -1) return { removals: [], nextContent: null };

  const head = content.slice(0, idx); // canonical body (for absorption test)
  const sectionBlock = content.slice(idx);
  const lines = sectionBlock.split("\n");
  const bodyNorm = normalize(head);

  const entryLines: { i: number; text: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*[-*]\s+/.test(lines[i]) && lines[i].length > 3) entryLines.push({ i, text: lines[i] });
  }

  const removals: Removal[] = [];
  const removeIdx = new Set<number>();

  // Pass 1: superseded + absorbed
  for (const e of entryLines) {
    if (/\[SUPERSEDED/i.test(e.text)) {
      removals.push({ file: relPath, reason: "superseded", text: e.text.trim() });
      removeIdx.add(e.i);
    } else if (core(e.text).length >= 30 && bodyNorm.includes(core(e.text))) {
      removals.push({ file: relPath, reason: "absorbed", text: e.text.trim() });
      removeIdx.add(e.i);
    }
  }

  // Pass 2: exact-dup (keep newest applied ts among a normalized group)
  const groups = new Map<string, { i: number; ts: string }[]>();
  for (const e of entryLines) {
    if (removeIdx.has(e.i)) continue;
    const key = normalize(e.text);
    if (!key) continue;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push({ i: e.i, ts: appliedTs(e.text) });
  }
  for (const [, grp] of groups) {
    if (grp.length < 2) continue;
    grp.sort((a, b) => (a.ts < b.ts ? 1 : -1)); // newest first
    for (const g of grp.slice(1)) {
      removals.push({ file: relPath, reason: "exact-dup", text: lines[g.i].trim() });
      removeIdx.add(g.i);
    }
  }

  if (removeIdx.size === 0) return { removals, nextContent: null };
  const keptLines = lines.filter((_, i) => !removeIdx.has(i));
  const nextContent = head + keptLines.join("\n");
  return { removals, nextContent };
}

// ── Routing (checkpoint-OUT, advisory) ─────────────────────────────────────
type Route = { file: string; kind: "hook" | "skill"; dest: string; text: string };

/** Hook basenames present under hooks/ (e.g. "OutputFormatGate"). */
function listHooks(): string[] {
  try {
    return readdirSync(join(CLAUDE_DIR, "hooks"))
      .filter((f) => f.endsWith(".hook.ts"))
      .map((f) => f.replace(/\.hook\.ts$/, ""));
  } catch { return []; }
}

/** Skill dir names present under skills/ (e.g. "_VIDEO", "Research"). */
function listSkills(): string[] {
  try {
    return readdirSync(join(CLAUDE_DIR, "skills"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch { return []; }
}

/**
 * Flag entries whose home is elsewhere. Precise by construction — the entry must
 * NAME an existing hook or skill. Hook match wins (enforcement > relocation).
 * Advisory only: returns candidates, never removes.
 */
function routeFile(relPath: string, hooks: string[], skills: string[]): Route[] {
  const abs = join(CLAUDE_DIR, relPath);
  if (!existsSync(abs)) return [];
  const content = readFileSync(abs, "utf8");
  const idx = content.indexOf(SECTION);
  if (idx === -1) return [];
  const lines = content.slice(idx).split("\n");
  const routes: Route[] = [];
  // A hook match only means "delete the prose" if the entry CLAIMS the hook
  // enforces it — not if it merely mentions the hook in a design record.
  const ENFORCES = /\b(enforc|block[s|ed]?|reject|gate[sd]?|rewrite|hard[- ]?stop|refus)/i;
  for (const line of lines) {
    if (!/^\s*[-*]\s+/.test(line) || line.length <= 3) continue;
    const hook = hooks.find((h) => new RegExp(`\\b${h}\\b`).test(line));
    if (hook && ENFORCES.test(line)) { routes.push({ file: relPath, kind: "hook", dest: hook, text: line.trim() }); continue; }
    // skill: `_ALLCAPS` token that is a real skill dir, or "<Skill> skill" for a real dir
    const skill = skills.find((s) =>
      s.startsWith("_")
        ? new RegExp(`\\b${s}\\b`).test(line)
        : new RegExp(`\\b${s}\\s+skill\\b`, "i").test(line));
    if (skill) routes.push({ file: relPath, kind: "skill", dest: skill, text: line.trim() });
  }
  return routes;
}

function runRoute(json: boolean) {
  const hooks = listHooks();
  const skills = listSkills();
  const all: Route[] = [];
  for (const t of TARGETS) all.push(...routeFile(t, hooks, skills));
  if (json) { console.log(JSON.stringify({ routes: all }, null, 2)); return; }
  console.log("── ProposalGC (route — advisory, no removals) ──");
  if (all.length === 0) { console.log("  no hook-enforced or skill-scoped proposals found ✅"); return; }
  const byFile = new Map<string, Route[]>();
  for (const r of all) (byFile.get(r.file) ?? byFile.set(r.file, []).get(r.file)!).push(r);
  for (const [file, rs] of byFile) {
    console.log(`\n  ${file} — ${rs.length} candidate(s):`);
    for (const r of rs) console.log(`    → ${r.kind}:${r.dest}  ${r.text.slice(0, 90)}${r.text.length > 90 ? "…" : ""}`);
  }
  console.log(`\n${all.length} candidate(s) for a better home. HOOK = the entry claims a hook enforces it → delete the prose if confirmed. SKILL = scoped to one skill → relocate to its SKILL.md. Human-gated — nothing removed.`);
}

function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has("--route")) return runRoute(args.has("--json"));
  const apply = args.has("--apply");
  const all: Removal[] = [];
  const writes: { path: string; content: string }[] = [];

  for (const t of TARGETS) {
    const { removals, nextContent } = gcFile(t);
    all.push(...removals);
    if (nextContent && apply) writes.push({ path: join(CLAUDE_DIR, t), content: nextContent });
  }

  if (args.has("--json")) {
    console.log(JSON.stringify({ dryRun: !apply, removals: all }, null, 2));
  } else {
    console.log(`── ProposalGC ${apply ? "(APPLY)" : "(dry-run)"} ──`);
    if (all.length === 0) console.log("  nothing to collect — all proposal sections clean ✅");
    const byFile = new Map<string, Removal[]>();
    for (const r of all) (byFile.get(r.file) ?? byFile.set(r.file, []).get(r.file)!).push(r);
    for (const [file, rs] of byFile) {
      console.log(`\n  ${file} — ${rs.length} removable:`);
      for (const r of rs) console.log(`    [${r.reason}] ${r.text.slice(0, 100)}${r.text.length > 100 ? "…" : ""}`);
    }
  }

  if (apply) {
    for (const w of writes) {
      const tmp = `${w.path}.tmp`;
      writeFileSync(tmp, w.content, "utf8");
      renameSync(tmp, w.path);
      stampTarget(w.path);
    }
    try {
      appendLog({ ts: new Date().toISOString(), applied: true, removed: all.length, byReason: countBy(all) });
    } catch {}
    console.log(`\n✅ applied — removed ${all.length} redundant entries across ${writes.length} file(s). Commit to persist.`);
  } else if (all.length) {
    console.log(`\n${all.length} entries would be removed. Re-run with --apply to heal.`);
  }
}

/**
 * Stamp a healed file's frontmatter so the header stops contradicting the body.
 * A GC pass is still a programmatic write to an always-loaded context file: it must
 * move `last_updated`, and a file the memory loop is maintaining is not a pristine
 * template, so `provenance: template` flips too. Best-effort — a stamping failure
 * must not undo a heal that already landed on disk.
 */
function stampTarget(absPath: string): void {
  try {
    const mod = require("./TelosFreshness") as typeof import("./TelosFreshness");
    mod.stampContextWrite(absPath, "proposal-gc");
  } catch {
    // best-effort — see doc above
  }
}

function countBy(rs: Removal[]): Record<string, number> {
  const o: Record<string, number> = {};
  for (const r of rs) o[r.reason] = (o[r.reason] ?? 0) + 1;
  return o;
}
function appendLog(obj: unknown) {
  const { appendFileSync } = require("node:fs");
  appendFileSync(OBS_LOG, JSON.stringify(obj) + "\n", "utf8");
}

main();
