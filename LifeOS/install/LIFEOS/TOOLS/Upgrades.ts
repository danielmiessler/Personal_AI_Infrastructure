#!/usr/bin/env bun
/**
 * @version 1.0.0
 * Upgrades.ts — the Upgrades store: every system-improvement candidate as one
 * typed record with a lifecycle, regardless of where it came from.
 *
 * Store:   LIFEOS/MEMORY/UPGRADES/records/<id>.md   (frontmatter + body)
 * Sidecar: LIFEOS/MEMORY/UPGRADES/.state.json       (claim-hash dedup)
 *
 * Lifecycle: recommended → accepted → applied → verified | rejected | expired
 * Sources:   directive | correction | upgrade-skill | algo-run | autonomous | manual
 *            (autonomous records live in WISDOM/FRAMES/_hypotheses/ and are
 *             merged in at the Pulse layer — the deriver's format is unchanged)
 *
 * The Ledger (MEMORY/SYSTEMUPDATES/) stays applied-only; `apply` here stamps
 * ledger_id so the pending half and the applied half point at each other.
 *
 * Consumed by: SatisfactionCapture.hook.ts (directive/correction capture),
 * PULSE/modules/upgrades.ts (dashboard), skills/Upgrade + /algo workflows
 * (persist recommendations), LIFEOS/TOOLS/CreateUpdate.ts (--upgrade-id).
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

// Normalize env path vars that Claude Code injects without shell expansion (LifeOS#1404)
for (const k of ["LIFEOS_DIR", "LIFEOS_CONFIG_DIR", "PROJECTS_DIR"]) {
  const v = process.env[k];
  if (v && /^\$\{?HOME\}?(\/|$)/.test(v)) process.env[k] = v.replace(/^\$\{?HOME\}?/, process.env.HOME ?? "~");
}

const BASE_DIR = process.env.LIFEOS_DIR || join(process.env.HOME!, ".claude", "LIFEOS");
const UPGRADES_DIR = join(BASE_DIR, "MEMORY", "UPGRADES");
const RECORDS_DIR = join(UPGRADES_DIR, "records");
const STATE_FILE = join(UPGRADES_DIR, ".state.json");
const EXPIRY_DAYS = 30;

export type UpgradeStatus = "recommended" | "accepted" | "applied" | "verified" | "rejected" | "expired";
export type UpgradeSource = "directive" | "correction" | "upgrade-skill" | "algo-run" | "autonomous" | "manual";

export interface UpgradeInput {
  claim: string;                 // what should change (one sentence is fine)
  source: UpgradeSource;
  current_state?: string;        // what happens today
  recommendation?: string;       // the proposed encoding
  target_surface?: string;       // hook | doctrine | rule | skill | settings | context
  confidence?: number;           // 0-1
  session_id?: string;
  evidence?: string[];           // session ids, incident dirs, report paths, URLs
}

export interface UpgradeRecord extends UpgradeInput {
  id: string;
  slug: string;
  status: UpgradeStatus;
  created: string;
  expires: string;
  ledger_id: string | null;
  notes: string[];
  filename: string;
}

interface StoreState {
  schema_version: number;
  claim_hashes: Record<string, { id: string; created: string }>;
}

// ── State sidecar ──

function loadState(): StoreState {
  try {
    if (existsSync(STATE_FILE)) return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  } catch {}
  return { schema_version: 1, claim_hashes: {} };
}

function saveState(st: StoreState): void {
  mkdirSync(UPGRADES_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(st, null, 2));
}

export function claimHash(claim: string): string {
  const norm = claim.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  return createHash("sha256").update(norm).digest("hex").slice(0, 16);
}

// ── Record I/O ──

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").split("-").slice(0, 8).join("-") || "upgrade";
}

function esc(s: string): string {
  return s.replace(/"/g, '\\"').replace(/\n/g, " ");
}

function renderRecord(r: UpgradeRecord): string {
  const evidence = (r.evidence ?? []).map((e) => `  - "${esc(e)}"`).join("\n");
  return `---
id: ${r.id}
slug: ${r.slug}
status: ${r.status}
source: ${r.source}
created: ${r.created}
expires: ${r.expires}
confidence: ${r.confidence ?? 0.5}
target_surface: ${r.target_surface ?? "unknown"}
session_id: ${r.session_id ?? ""}
ledger_id: ${r.ledger_id ?? ""}
evidence:
${evidence}
---

## Claim

${r.claim}

## Current State

${r.current_state ?? "(not stated)"}

## Recommendation

${r.recommendation ?? "(not yet drafted)"}

## Notes
${r.notes.map((n) => `\n- ${n}`).join("")}
`;
}

function parseRecord(filename: string): UpgradeRecord | null {
  const fp = join(RECORDS_DIR, filename);
  if (!existsSync(fp)) return null;
  const content = readFileSync(fp, "utf-8");
  const m = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return null;
  const fm: Record<string, any> = {};
  let arrKey: string | null = null;
  for (const line of m[1].split("\n")) {
    if (arrKey && /^\s+-\s/.test(line)) {
      fm[arrKey].push(line.replace(/^\s+-\s/, "").trim().replace(/^"|"$/g, ""));
      continue;
    }
    arrKey = null;
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!kv) continue;
    if (kv[2].trim() === "" && kv[1] === "evidence") { fm[kv[1]] = []; arrKey = kv[1]; }
    else fm[kv[1]] = kv[2].trim();
  }
  const body = m[2];
  const section = (h: string) => {
    const re = new RegExp(`^##\\s+${h}\\s*\\n([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, "m");
    const sm = body.match(re);
    return sm ? sm[1].trim() : "";
  };
  if (!fm.id || !fm.status) return null;
  return {
    id: String(fm.id),
    slug: String(fm.slug ?? fm.id),
    status: fm.status as UpgradeStatus,
    source: (fm.source ?? "manual") as UpgradeSource,
    created: String(fm.created ?? ""),
    expires: String(fm.expires ?? ""),
    confidence: Number(fm.confidence ?? 0.5),
    target_surface: String(fm.target_surface ?? "unknown"),
    session_id: String(fm.session_id ?? ""),
    ledger_id: fm.ledger_id ? String(fm.ledger_id) : null,
    evidence: Array.isArray(fm.evidence) ? fm.evidence : [],
    claim: section("Claim"),
    current_state: section("Current State"),
    recommendation: section("Recommendation"),
    notes: section("Notes").split("\n").map((l) => l.replace(/^-\s*/, "").trim()).filter(Boolean),
    filename,
  };
}

// ── Public API ──

export function addUpgrade(input: UpgradeInput): { created: boolean; id: string; reason?: string } {
  if (!input.claim || input.claim.trim().length < 10) return { created: false, id: "", reason: "claim_too_short" };
  const st = loadState();
  const hash = claimHash(input.claim);
  if (st.claim_hashes[hash]) return { created: false, id: st.claim_hashes[hash].id, reason: "duplicate" };

  mkdirSync(RECORDS_DIR, { recursive: true });
  const now = new Date();
  const stamp = now.toISOString();
  const idStamp = stamp.slice(0, 19).replace(/[-:T]/g, "").replace(/^(\d{8})(\d{6})$/, "$1-$2");
  const slug = slugify(input.claim);
  const id = `${idStamp}_${slug}`;
  const record: UpgradeRecord = {
    ...input,
    claim: input.claim.trim().slice(0, 1000),
    id,
    slug,
    status: "recommended",
    created: stamp,
    expires: new Date(now.getTime() + EXPIRY_DAYS * 86400000).toISOString(),
    ledger_id: null,
    notes: [`${stamp} — created (source: ${input.source})`],
    filename: `${id}.md`,
  };
  writeFileSync(join(RECORDS_DIR, record.filename), renderRecord(record));
  st.claim_hashes[hash] = { id, created: stamp };
  saveState(st);
  return { created: true, id };
}

export function listUpgrades(filter?: { status?: string; source?: string }): UpgradeRecord[] {
  if (!existsSync(RECORDS_DIR)) return [];
  const out: UpgradeRecord[] = [];
  for (const f of readdirSync(RECORDS_DIR).filter((f) => f.endsWith(".md"))) {
    const r = parseRecord(f);
    if (!r) continue;
    if (filter?.status && r.status !== filter.status) continue;
    if (filter?.source && r.source !== filter.source) continue;
    out.push(r);
  }
  return out.sort((a, b) => b.created.localeCompare(a.created));
}

export function getUpgrade(id: string): UpgradeRecord | null {
  return parseRecord(`${id}.md`);
}

const TRANSITIONS: Record<string, UpgradeStatus[]> = {
  recommended: ["accepted", "rejected", "expired", "applied"],
  accepted: ["applied", "rejected"],
  applied: ["verified"],
};

export function setStatus(
  id: string,
  status: UpgradeStatus,
  opts?: { note?: string; ledger_id?: string }
): { ok: boolean; reason?: string } {
  const r = getUpgrade(id);
  if (!r) return { ok: false, reason: "not_found" };
  const allowed = TRANSITIONS[r.status] ?? [];
  if (!allowed.includes(status)) return { ok: false, reason: `illegal_transition_${r.status}_to_${status}` };
  r.status = status;
  if (opts?.ledger_id) r.ledger_id = opts.ledger_id;
  const stamp = new Date().toISOString();
  r.notes.push(`${stamp} — ${status}${opts?.ledger_id ? ` (ledger: ${opts.ledger_id})` : ""}${opts?.note ? `: ${opts.note}` : ""}`);
  writeFileSync(join(RECORDS_DIR, r.filename), renderRecord(r));
  return { ok: true };
}

export function expireSweep(): number {
  const now = Date.now();
  let n = 0;
  for (const r of listUpgrades({ status: "recommended" })) {
    if (r.expires && new Date(r.expires).getTime() < now) {
      if (setStatus(r.id, "expired", { note: "TTL sweep" }).ok) n++;
    }
  }
  return n;
}

// ── CLI ──

function argVal(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

function argAll(args: string[], flag: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) if (args[i] === flag && args[i + 1]) out.push(args[i + 1]);
  return out;
}

if (import.meta.main) {
  const [cmd, ...args] = process.argv.slice(2);
  const json = args.includes("--json");
  switch (cmd) {
    case "add": {
      const res = addUpgrade({
        claim: argVal(args, "--claim") ?? "",
        source: (argVal(args, "--source") ?? "manual") as UpgradeSource,
        current_state: argVal(args, "--current"),
        recommendation: argVal(args, "--recommendation"),
        target_surface: argVal(args, "--target"),
        confidence: argVal(args, "--confidence") ? Number(argVal(args, "--confidence")) : undefined,
        session_id: argVal(args, "--session"),
        evidence: argAll(args, "--evidence"),
      });
      console.log(JSON.stringify(res));
      process.exit(res.created || res.reason === "duplicate" ? 0 : 1);
    }
    case "list": {
      const rows = listUpgrades({ status: argVal(args, "--status"), source: argVal(args, "--source") });
      if (json) console.log(JSON.stringify(rows.map(({ notes, ...r }) => r), null, 2));
      else for (const r of rows) console.log(`${r.status.padEnd(11)} ${r.source.padEnd(13)} ${r.id}  ${r.claim.slice(0, 80)}`);
      process.exit(0);
    }
    case "show": {
      const r = getUpgrade(args[0] ?? "");
      console.log(r ? JSON.stringify(r, null, 2) : "not found");
      process.exit(r ? 0 : 1);
    }
    case "accept":
    case "reject": {
      const res = setStatus(args[0] ?? "", cmd === "accept" ? "accepted" : "rejected", { note: argVal(args, "--note") });
      console.log(JSON.stringify(res));
      process.exit(res.ok ? 0 : 1);
    }
    case "apply": {
      const res = setStatus(args[0] ?? "", "applied", { ledger_id: argVal(args, "--ledger"), note: argVal(args, "--note") });
      console.log(JSON.stringify(res));
      process.exit(res.ok ? 0 : 1);
    }
    case "verify": {
      const res = setStatus(args[0] ?? "", "verified", { note: argVal(args, "--note") });
      console.log(JSON.stringify(res));
      process.exit(res.ok ? 0 : 1);
    }
    case "expire": {
      console.log(JSON.stringify({ expired: expireSweep() }));
      process.exit(0);
    }
    case "stats": {
      const all = listUpgrades();
      const by = (k: "status" | "source") =>
        all.reduce<Record<string, number>>((acc, r) => ((acc[r[k] as string] = (acc[r[k] as string] ?? 0) + 1), acc), {});
      console.log(JSON.stringify({ total: all.length, by_status: by("status"), by_source: by("source") }, null, 2));
      process.exit(0);
    }
    default:
      console.log("usage: Upgrades.ts add|list|show|accept|reject|apply|verify|expire|stats");
      process.exit(cmd ? 1 : 0);
  }
}
