#!/usr/bin/env bun
/**
 * RetagSweepTypes.ts — one-shot backfill of canonical Type:* labels onto the
 * auto-sweep / auto-native issues that WorkSweep created with the generic
 * Type:queue. Companion to the classifyType() fix in WorkSweep.ts: that stops
 * NEW swept issues from being mislabeled; this cleans the existing backlog.
 *
 * For each auto-sweep/auto-native issue it classifies the real work type from
 * the title, then adds the right Type:* label and drops the redundant
 * Type:queue. Issues whose text is genuinely uncategorizable (classifyType →
 * Type:queue) are left untouched.
 *
 * Dry-run by default. `--apply` mutates via `gh issue edit`.
 *
 * Usage:
 *   bun RetagSweepTypes.ts           # dry-run: print the planned label changes
 *   bun RetagSweepTypes.ts --apply   # apply the changes via `gh issue edit`
 */
import { classifyType } from "./WorkSweep";
import { loadWorkConfig } from "../../hooks/lib/work-config";

const APPLY = process.argv.includes("--apply");

function cleanTitle(t: string): string {
  return t
    .replace(/^\[(Sweep|Native)\]\s*/i, "")
    .replace(/\s*\[slug:[^\]]+\]\s*$/, "")
    .trim();
}

interface Issue { number: number; title: string; labels: string[]; }

async function ghJson(args: string[]): Promise<any[]> {
  const p = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(p.stdout).text();
  const code = await p.exited;
  if (code !== 0) throw new Error(`gh failed (${code}): ${await new Response(p.stderr).text()}`);
  return JSON.parse(out);
}

async function main() {
  const cfg = loadWorkConfig();
  const repo = cfg.repo;
  if (!repo) { console.error("no work repo configured"); process.exit(1); }

  const raw = await ghJson(["gh", "issue", "list", "--repo", repo, "--state", "all", "--limit", "1000", "--json", "number,title,labels"]);
  const issues: Issue[] = raw.map((i: any) => ({ number: i.number, title: i.title, labels: (i.labels || []).map((l: any) => l.name) }));
  const targets = issues.filter((i) => i.labels.some((l) => l === "auto-sweep" || l === "auto-native"));

  const plan: { n: number; add: string | null; remove: string | null; type: string; title: string }[] = [];
  const distAll: Record<string, number> = {};
  for (const it of targets) {
    const type = classifyType(cleanTitle(it.title));
    distAll[type] = (distAll[type] || 0) + 1;
    const add = type !== "Type:queue" && !it.labels.includes(type) ? type : null;
    const remove = type !== "Type:queue" && it.labels.includes("Type:queue") ? "Type:queue" : null;
    if (!add && !remove) continue;
    plan.push({ n: it.number, add, remove, type, title: cleanTitle(it.title).slice(0, 58) });
  }

  console.log(`repo=${repo} targets=${targets.length} changes=${plan.length} mode=${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log("classified type distribution (all targets):", JSON.stringify(distAll));
  for (const p of plan.slice(0, 18)) console.log(`  #${p.n}  +${p.add ?? "—"}  −${p.remove ?? "—"}  | ${p.title}`);
  if (plan.length > 18) console.log(`  … +${plan.length - 18} more`);

  if (!APPLY) { console.log("\nDRY-RUN — re-run with --apply to mutate."); return; }

  let done = 0, fail = 0;
  for (const p of plan) {
    const args = ["gh", "issue", "edit", String(p.n), "--repo", repo];
    if (p.add) args.push("--add-label", p.add);
    if (p.remove) args.push("--remove-label", p.remove);
    const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" });
    const code = await proc.exited;
    if (code === 0) { done++; if (done % 50 === 0) console.log(`  …${done}/${plan.length}`); }
    else { fail++; if (fail <= 5) console.error(`  fail #${p.n}: ${await new Response(proc.stderr).text()}`); }
  }
  console.log(`APPLIED done=${done} fail=${fail}`);
}

main();
