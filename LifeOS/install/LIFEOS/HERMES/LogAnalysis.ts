#!/usr/bin/env bun
/**
 * LogAnalysis — deterministic friction analysis over the sidecar guard's audit
 * trail, so the system improves from evidence instead of anecdotes.
 *
 * The guard writes every refused tool call to `plugins/lifeos/blocked.jsonl`.
 * That file is the ground truth for "Hermes keeps saying it can't do things":
 * this module classifies every block, finds the rules that fire on ordinary
 * work, detects retry loops (the agent hitting the same wall repeatedly in one
 * session — pure UX failure), and emits named, deterministic recommendations.
 *
 * Consumed two ways, one implementation:
 *   - Pulse: `GET /api/hermes/log-analysis` (modules/hermes.ts imports this)
 *   - CLI:   `bun LIFEOS/HERMES/LogAnalysis.ts [--days 14] [--json]`
 *
 * Install-generic: no identity, no instance literals; paths resolve from
 * HERMES_HOME. Absent or unreadable logs degrade to an empty analysis — a
 * broken sidecar must never break the dashboard reporting on it.
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const HERMES_HOME = process.env.HERMES_HOME || join(homedir(), ".hermes");
const BLOCKED_LOG = join(HERMES_HOME, "plugins", "lifeos", "blocked.jsonl");

export type BlockClass = "taint" | "deny-rule" | "cron-read" | "credential" | "policy-unavailable" | "other";

export interface BlockRow {
  ts: string;
  tool: string;
  target: string;
  reason: string;
  cls: BlockClass;
  /** The specific rule named in the reason, when one is. */
  rule: string | null;
  /** For taint rows: the untrusted-source rule that started the taint. */
  taintSource: string | null;
  /** For taint rows: how many injection shapes had matched (0 = pure source-shape taint). */
  shapes: number | null;
}

export interface Finding {
  kind: "retry-loop" | "zero-shape-taint" | "hot-rule" | "self-taint";
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  count: number;
  recommendation: string;
}

export interface GuardLogAnalysis {
  available: boolean;
  logPath: string;
  windowDays: number;
  totalBlocks: number;
  firstTs: string | null;
  lastTs: string | null;
  byClass: Record<string, number>;
  byDay: Array<{ day: string; total: number; taint: number; other: number }>;
  topRules: Array<{ rule: string; cls: BlockClass; count: number; lastTs: string }>;
  taintSources: Array<{ source: string; count: number; zeroShape: number }>;
  findings: Finding[];
}

function classify(reason: string): { cls: BlockClass; rule: string | null; taintSource: string | null; shapes: number | null } {
  if (reason.startsWith("tainted session")) {
    const rule = reason.match(/privileged rule '([^']+)'/)?.[1] ?? "privileged tool";
    const taintSource = reason.match(/untrusted-source rule '([^']+)'/)?.[1]
      ?? (reason.includes("third-party content") ? "native untrusted tool" : "unknown");
    const shapes = Number(reason.match(/(\d+) injection shape/)?.[1] ?? "0");
    return { cls: "taint", rule, taintSource, shapes };
  }
  const denyRule = reason.match(/deny rule '([^']+)'/)?.[1];
  if (denyRule) return { cls: "deny-rule", rule: denyRule, taintSource: null, shapes: null };
  if (reason.includes("unattended job definitions")) {
    return { cls: "cron-read", rule: "**/.hermes/cron/**", taintSource: null, shapes: null };
  }
  if (reason.includes("policy unavailable")) {
    return { cls: "policy-unavailable", rule: null, taintSource: null, shapes: null };
  }
  // Everything else is a named read rule ("credential store", "SSH private key material", …)
  return { cls: "credential", rule: reason, taintSource: null, shapes: null };
}

export function readBlockedLog(days: number, path: string = BLOCKED_LOG): BlockRow[] {
  if (!existsSync(path)) return [];
  const cutoff = Date.now() - days * 86_400_000;
  const rows: BlockRow[] = [];
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return [];
  }
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line) as { ts?: string; tool?: string; target?: string; reason?: string };
      const ts = String(r.ts ?? "");
      if (!ts || new Date(ts).getTime() < cutoff) continue;
      const reason = String(r.reason ?? "");
      rows.push({
        ts,
        tool: String(r.tool ?? ""),
        target: String(r.target ?? "").slice(0, 200),
        reason,
        ...classify(reason),
      });
    } catch {
      /* a corrupt line never breaks the analysis */
    }
  }
  return rows;
}

/** Same rule hitting ≥3 times inside a 10-minute window = the agent grinding on a wall. */
function retryLoops(rows: BlockRow[]): Finding[] {
  const byRule = new Map<string, number[]>();
  for (const r of rows) {
    const key = `${r.cls}:${r.rule ?? r.reason}`;
    (byRule.get(key) ?? byRule.set(key, []).get(key)!).push(new Date(r.ts).getTime());
  }
  const out: Finding[] = [];
  for (const [key, times] of byRule) {
    times.sort((a, b) => a - b);
    let bestRun = 0;
    for (let i = 0; i < times.length; i++) {
      let j = i;
      while (j + 1 < times.length && times[j + 1]! - times[i]! <= 600_000) j++;
      bestRun = Math.max(bestRun, j - i + 1);
    }
    if (bestRun >= 3) {
      const rule = key.slice(key.indexOf(":") + 1);
      out.push({
        kind: "retry-loop",
        severity: bestRun >= 6 ? "high" : "medium",
        title: `Retry loop on ${rule}`,
        detail: `${bestRun} identical blocks inside 10 minutes — the agent kept hitting the same wall instead of routing around it.`,
        count: bestRun,
        recommendation:
          "The soul's guard-repair doctrine should cover this case; if it already does, the rule is firing on legitimate work and belongs in a policy review.",
      });
    }
  }
  return out.sort((a, b) => b.count - a.count).slice(0, 8);
}

export function analyzeGuardLog(opts: { days?: number; path?: string } = {}): GuardLogAnalysis {
  const days = opts.days ?? 14;
  const path = opts.path ?? BLOCKED_LOG;
  const rows = readBlockedLog(days, path);

  const byClass: Record<string, number> = {};
  const byDayMap = new Map<string, { total: number; taint: number }>();
  const ruleMap = new Map<string, { cls: BlockClass; count: number; lastTs: string }>();
  const taintMap = new Map<string, { count: number; zeroShape: number }>();

  for (const r of rows) {
    byClass[r.cls] = (byClass[r.cls] ?? 0) + 1;
    const day = r.ts.slice(0, 10);
    const d = byDayMap.get(day) ?? { total: 0, taint: 0 };
    d.total++;
    if (r.cls === "taint") d.taint++;
    byDayMap.set(day, d);
    const ruleKey = r.rule ?? r.reason;
    const rr = ruleMap.get(ruleKey) ?? { cls: r.cls, count: 0, lastTs: r.ts };
    rr.count++;
    if (r.ts > rr.lastTs) rr.lastTs = r.ts;
    ruleMap.set(ruleKey, rr);
    if (r.cls === "taint" && r.taintSource) {
      const t = taintMap.get(r.taintSource) ?? { count: 0, zeroShape: 0 };
      t.count++;
      if (r.shapes === 0) t.zeroShape++;
      taintMap.set(r.taintSource, t);
    }
  }

  const findings: Finding[] = [...retryLoops(rows)];

  for (const [source, t] of taintMap) {
    if (t.zeroShape >= 10) {
      findings.push({
        kind: "zero-shape-taint",
        severity: t.zeroShape >= 100 ? "high" : "medium",
        title: `Taints from '${source}' with zero injection shapes`,
        detail: `${t.zeroShape} of ${t.count} taints from this source matched no injection pattern — likely first-party traffic being treated as hostile.`,
        count: t.zeroShape,
        recommendation:
          source === "*curl*" || source === "*wget*"
            ? "If these calls target owned infrastructure, add the hosts to LIFEOS/USER/CONFIG/hermes-trusted-domains.json and re-mount."
            : "Review whether this source is genuinely third-party; mail and feeds should keep tainting.",
      });
    }
  }

  for (const [rule, rr] of ruleMap) {
    if (rr.cls !== "taint" && rr.count >= 25) {
      findings.push({
        kind: "hot-rule",
        severity: rr.count >= 100 ? "high" : "medium",
        title: `Hot rule: ${rule}`,
        detail: `${rr.count} blocks in ${days} days from one rule — either an attack pattern or a rule shaped wider than its target.`,
        count: rr.count,
        recommendation: "Read a sample of blocked targets in blocked.jsonl; if they are ordinary work, reshape the rule in Policy.ts and re-mount.",
      });
    }
  }

  const selfTaints = rows.filter(
    (r) => r.cls === "taint" && (r.taintSource === "*curl*") && r.shapes === 0,
  ).length;
  if (selfTaints >= 50) {
    findings.push({
      kind: "self-taint",
      severity: "high",
      title: "Sessions self-tainting via curl before doing their job",
      detail: `${selfTaints} privileged calls refused in sessions tainted by curl output that matched no injection shape — the classic shape is a skill's own localhost voice-notification curl poisoning the session that then cannot send.`,
      count: selfTaints,
      recommendation: "Verify loopback is on trustedEgressDomains (policy v4+) and the gateway restarted since the last mount.",
    });
  }

  findings.sort((a, b) => ({ high: 0, medium: 1, low: 2 })[a.severity] - ({ high: 0, medium: 1, low: 2 })[b.severity] || b.count - a.count);

  const sortedDays = [...byDayMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  return {
    available: existsSync(path),
    logPath: path,
    windowDays: days,
    totalBlocks: rows.length,
    firstTs: rows[0]?.ts ?? null,
    lastTs: rows[rows.length - 1]?.ts ?? null,
    byClass,
    byDay: sortedDays.map(([day, d]) => ({ day, total: d.total, taint: d.taint, other: d.total - d.taint })),
    topRules: [...ruleMap.entries()]
      .map(([rule, rr]) => ({ rule, ...rr }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
    taintSources: [...taintMap.entries()]
      .map(([source, t]) => ({ source, ...t }))
      .sort((a, b) => b.count - a.count),
    findings: findings.slice(0, 10),
  };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const daysIdx = argv.indexOf("--days");
  const days = daysIdx !== -1 ? Number(argv[daysIdx + 1]) || 14 : 14;
  const analysis = analyzeGuardLog({ days });
  if (argv.includes("--json")) {
    console.log(JSON.stringify(analysis, null, 2));
  } else {
    console.log(`guard blocks, last ${days}d: ${analysis.totalBlocks}  (${Object.entries(analysis.byClass).map(([k, v]) => `${k} ${v}`).join(" · ")})`);
    for (const f of analysis.findings) {
      console.log(`\n[${f.severity}] ${f.title} (${f.count})\n  ${f.detail}\n  → ${f.recommendation}`);
    }
  }
}
