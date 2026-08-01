#!/usr/bin/env bun
/**
 * CommitmentLog.ts — Manual capture CLI. Creates a GitHub Issue tagged Type:commitment.
 *
 *   bun ~/.claude/LIFEOS/TOOLS/CommitmentLog.ts \
 *     --beneficiary "Alex" \
 *     --subject "send Surface threat-model brief" \
 *     --due 2026-05-30 \
 *     [--channel imessage|email|inperson|other] \
 *     [--source-link <url-or-quote>] \
 *     [--priority P0|P1|P2|P3]
 *
 * Reads repo from USER/WORK/config.yaml (loadWorkConfig). Idempotent at the gh level
 * (re-running creates a second issue — caller's responsibility to dedup).
 *
 * Prints the issue URL on success. Exits non-zero on failure.
 */

import { spawnSync } from "child_process";
import { loadWorkConfig } from "../../hooks/lib/work-config";

interface Args {
  beneficiary: string;
  subject: string;
  due: string; // YYYY-MM-DD
  channel: string;
  sourceLink: string;
  priority: "P0" | "P1" | "P2" | "P3";
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string, fallback = ""): string => {
    const idx = argv.indexOf(flag);
    return idx >= 0 && argv[idx + 1] ? argv[idx + 1] : fallback;
  };
  const beneficiary = get("--beneficiary");
  const subject = get("--subject");
  const due = get("--due");
  const channel = get("--channel", "manual");
  const sourceLink = get("--source-link", "");
  const priority = (get("--priority", "P2") as Args["priority"]);

  if (!beneficiary || !subject || !due) {
    console.error("usage: CommitmentLog.ts --beneficiary <name> --subject <what> --due YYYY-MM-DD [--channel x] [--source-link x] [--priority Pn]");
    process.exit(1);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) {
    console.error(`CommitmentLog: --due must be YYYY-MM-DD, got "${due}"`);
    process.exit(1);
  }
  if (!["P0", "P1", "P2", "P3"].includes(priority)) {
    console.error(`CommitmentLog: --priority must be P0..P3, got "${priority}"`);
    process.exit(1);
  }
  return { beneficiary, subject, due, channel, sourceLink, priority };
}

function gh(args: string[]): { code: number; stdout: string; stderr: string } {
  const r = spawnSync("gh", args, { encoding: "utf8" });
  return { code: r.status ?? 1, stdout: r.stdout || "", stderr: r.stderr || "" };
}

function ensureLabel(repo: string): void {
  // Idempotent — gh label create returns non-zero if it exists; we ignore.
  gh(["label", "create", "Type:commitment", "--repo", repo, "--color", "F2A93B", "--description", "Outbound promise — swept daily for due/overdue"]);
}

function main() {
  const args = parseArgs();
  const cfg = loadWorkConfig();
  if (!cfg.enabled || !cfg.repo) {
    console.error(`CommitmentLog: WORK.REPO not configured — ${cfg.reason || "unknown"}`);
    process.exit(2);
  }
  const repo = cfg.repo;

  ensureLabel(repo);

  const title = `[Commitment] ${args.beneficiary}: ${args.subject}`.slice(0, 240);
  const body = [
    "## Commitment",
    "",
    `**To:** ${args.beneficiary}`,
    `**Promise:** ${args.subject}`,
    `**Due:** ${args.due}`,
    `**Channel:** ${args.channel}`,
    ...(args.sourceLink ? [`**Source:** ${args.sourceLink}`] : []),
    "",
    "## Metadata",
    "",
    `<!-- commitment-due: ${args.due} -->`,
    `<!-- commitment-beneficiary: ${args.beneficiary} -->`,
    `<!-- commitment-channel: ${args.channel} -->`,
    "",
    "*Logged by CommitmentLog.ts*",
  ].join("\n");

  const labels = [
    "Type:commitment",
    `Priority:${args.priority}`,
    "Property:internal",
    "Status:ready",
    cfg.agentLabel,
  ].join(",");

  const r = gh([
    "issue", "create",
    "--repo", repo,
    "--title", title,
    "--body", body,
    "--label", labels,
  ]);

  if (r.code !== 0) {
    console.error(`CommitmentLog: gh issue create failed (${r.code}): ${r.stderr.trim()}`);
    process.exit(3);
  }
  const url = r.stdout.trim();
  console.log(JSON.stringify({ ok: true, url, due: args.due, beneficiary: args.beneficiary }));
}

if (import.meta.main) {
  try {
    main();
  } catch (err) {
    console.error(`CommitmentLog: fatal — ${String(err)}`);
    process.exit(4);
  }
}
