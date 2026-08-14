import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { loadCanonicalRecords } from "./Cortex";

export type Severity = "ok" | "warn" | "critical";
export interface HealthFinding { id: string; severity: Severity; message: string; evidence?: any; }
export interface ReviewerEvidence {
  status: "ok" | "skipped" | "failed" | "parse-failed" | "timed-out" | "missing" | "invalid";
  ts?: string; runId?: string; evidence: string; priorSuccesses?: number; error?: string;
}
export interface RetrievalEvidence { status: "ok" | "missing" | "invalid"; ts?: string; queryHash?: string; returnedCount?: number; durationMs?: number; evidence: string; malformedLines?: number[]; }

export const DEFAULT_CORTEX_THRESHOLDS = {
  reviewerStaleMs: 7 * 24 * 60 * 60 * 1000,
  retrievalStaleMs: 24 * 60 * 60 * 1000,
  proposalBacklog: 10,
  observabilityMaxBytes: 256 * 1024 * 1024,
  observabilityMaxAgeMs: 30 * 24 * 60 * 60 * 1000,
  reviewerRunGraceMs: 10 * 60 * 1000,
  indexStaleMs: 7 * 24 * 60 * 60 * 1000,
};
export interface CortexThresholds { reviewerStaleMs: number; retrievalStaleMs: number; proposalBacklog: number; observabilityMaxBytes: number; observabilityMaxAgeMs: number; reviewerRunGraceMs: number; indexStaleMs: number; }

export interface CortexEvidence {
  nowMs: number;
  reviewer?: ReviewerEvidence;
  retrieval?: RetrievalEvidence;
  proposals?: { pending: number; evidence: string; available?: boolean; malformedLines?: number[] };
  observability?: { bytes: number; oldestMs: number | null; evidence: string; files?: number; available?: boolean };
  index?: { status: "absent" | "no-index-v1" | "ok" | "mismatch" | "invalid"; manifest?: string; policy?: string; measuredAt?: number; canonicalHash?: string; manifestCanonicalHash?: string; indexHash?: string; manifestIndexHash?: string; indexPath?: string; indexedAt?: string; ageMs?: number };
  thresholds?: CortexThresholds;
}
export interface CortexAssessment { overall: Severity; findings: HealthFinding[]; thresholds: CortexThresholds; }

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
function hasExactKeys(value: Record<string, unknown>, allowed: readonly string[], required: readonly string[] = allowed): boolean {
  const keys = Object.keys(value);
  return required.every((key) => Object.prototype.hasOwnProperty.call(value, key)) && keys.every((key) => allowed.includes(key));
}
function nonNegativeInteger(value: unknown): value is number { return Number.isInteger(value) && (value as number) >= 0; }
function nonNegativeFinite(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value) && value >= 0; }

function validDispatchSummary(value: unknown): boolean {
  if (!isPlainObject(value) || !hasExactKeys(value, ["total", "by_type", "succeeded", "failed", "failures", "skipped_guard", "skips", "proposals_auto_applied", "proposals_auto_apply_failed"])) return false;
  if (![value.total, value.succeeded, value.failed, value.skipped_guard, value.proposals_auto_applied, value.proposals_auto_apply_failed].every(nonNegativeInteger)) return false;
  // A guard refusal (ESUSPECT_EROSION — the MemoryWriter blocking a net-drop) is a healthy
  // skip, not a failure: a valid run has every item either succeeded or guard-skipped, and
  // zero hard failures. Fail-closed strictness (failed=0, failures empty) is unchanged.
  if (value.failed !== 0 || value.proposals_auto_apply_failed !== 0 || value.total !== (value.succeeded as number) + (value.skipped_guard as number) || !Array.isArray(value.failures) || value.failures.length !== 0 || !Array.isArray(value.skips)) return false;
  if (!isPlainObject(value.by_type) || !Object.keys(value.by_type).every((key) => ["memory", "idea", "knowledge", "proposal"].includes(key)) || !Object.values(value.by_type).every(nonNegativeInteger)) return false;
  const byTypeTotal = Object.values(value.by_type).reduce<number>((sum, count) => sum + (count as number), 0);
  return byTypeTotal === value.total && (value.proposals_auto_applied as number) <= ((value.by_type.proposal as number | undefined) ?? 0);
}

function validReviewerSuccess(row: unknown): row is Record<string, unknown> {
  if (!isPlainObject(row) || !hasExactKeys(row, ["ts", "ok", "runId", "transcript", "exchanges", "inference_duration_ms", "parse_ok", "dispatch_summary"])) return false;
  return row.ok === true && row.parse_ok === true && typeof row.runId === "string" && row.runId.length > 0 &&
    typeof row.ts === "string" && Number.isFinite(Date.parse(row.ts)) && typeof row.transcript === "string" && row.transcript.length > 0 &&
    nonNegativeInteger(row.exchanges) && nonNegativeFinite(row.inference_duration_ms) && validDispatchSummary(row.dispatch_summary);
}

// A skip row is a healthy no-op run (empty/just-cleared transcript — nothing to
// curate). Fail-closed: anything claiming skipped that doesn't match this exact
// shape stays "invalid" (critical), so a broken extractor can't dress up as a skip.
function validReviewerSkip(row: unknown): row is Record<string, unknown> {
  if (!isPlainObject(row) || !hasExactKeys(row, ["ts", "ok", "runId", "transcript", "exchanges", "inference_duration_ms", "parse_ok", "skipped", "error"], ["ts", "ok", "runId", "exchanges", "inference_duration_ms", "parse_ok", "skipped"])) return false;
  return row.ok === true && row.parse_ok === true && row.skipped === true && row.exchanges === 0 &&
    typeof row.runId === "string" && row.runId.length > 0 && typeof row.ts === "string" && Number.isFinite(Date.parse(row.ts)) &&
    (row.transcript === null || row.transcript === undefined || typeof row.transcript === "string") &&
    (row.error === undefined || typeof row.error === "string");
}

function validRetrievalRow(row: unknown): row is Record<string, unknown> {
  if (!isPlainObject(row) || !hasExactKeys(row, ["ts", "query_hash", "returned_count", "duration_ms", "top_score"], ["ts", "query_hash", "returned_count", "duration_ms"])) return false;
  return typeof row.ts === "string" && Number.isFinite(Date.parse(row.ts)) && typeof row.query_hash === "string" && row.query_hash.length > 0 &&
    nonNegativeInteger(row.returned_count) && nonNegativeFinite(row.duration_ms) && (row.top_score === undefined || nonNegativeFinite(row.top_score));
}

export function assessCortexEvidence(input: CortexEvidence): CortexAssessment {
  const findings: HealthFinding[] = [];
  const thresholds = input.thresholds ?? DEFAULT_CORTEX_THRESHOLDS;
  const add = (id: string, severity: Severity, message: string, evidence?: any) => findings.push({ id, severity, message, ...(evidence === undefined ? {} : { evidence }) });
  if (!input.reviewer) add("reviewer-evidence-missing", "warn", "No reviewer evidence supplied.");
  else if (["failed", "parse-failed", "timed-out", "invalid"].includes(input.reviewer.status)) add(input.reviewer.status === "invalid" ? "reviewer-evidence-invalid" : `reviewer-latest-${input.reviewer.status}`, "critical", `Latest reviewer run is ${input.reviewer.status}.`, input.reviewer);
  else if (input.reviewer.status === "missing") add("reviewer-evidence-missing", "warn", "No latest reviewer evidence is available.", { ...input.reviewer, staleThresholdMs: thresholds.reviewerStaleMs });
  else if (!input.reviewer.ts || !Number.isFinite(Date.parse(input.reviewer.ts))) add("reviewer-evidence-invalid", "critical", "Reviewer success lacks a valid timestamp.", input.reviewer);
  else { const ageMs = input.nowMs - Date.parse(input.reviewer.ts); if (ageMs < 0) add("reviewer-future", "warn", "Reviewer timestamp is in the future and cannot prove freshness.", { ...input.reviewer, ageMs }); else if (ageMs > thresholds.reviewerStaleMs) add("reviewer-stale", "warn", `Latest reviewer evidence exceeds ${thresholds.reviewerStaleMs}ms freshness window.`, { ...input.reviewer, ageMs, thresholdMs: thresholds.reviewerStaleMs }); }
  if (!input.retrieval) add("retrieval-evidence-missing", "warn", "No retrieval evidence supplied.");
  else if (input.retrieval.status === "invalid") add("retrieval-evidence-malformed", "warn", "Retrieval evidence is malformed.", input.retrieval);
  else if (input.retrieval.status === "missing") add("retrieval-missing", "warn", `No retrieval evidence within ${thresholds.retrievalStaleMs}ms freshness window.`, { ...input.retrieval, thresholdMs: thresholds.retrievalStaleMs });
  else if (!input.retrieval.ts || !Number.isFinite(Date.parse(input.retrieval.ts)) || typeof input.retrieval.queryHash !== "string" || input.retrieval.queryHash.length === 0 || !nonNegativeInteger(input.retrieval.returnedCount) || !nonNegativeFinite(input.retrieval.durationMs)) add("retrieval-evidence-invalid", "warn", "Retrieval evidence lacks a valid affirmative operation result.", input.retrieval);
  else { const ageMs = input.nowMs - Date.parse(input.retrieval.ts); if (ageMs < 0) add("retrieval-future", "warn", "Retrieval timestamp is in the future and cannot prove freshness.", { ...input.retrieval, ageMs }); else if (ageMs > thresholds.retrievalStaleMs) add("retrieval-stale", "warn", `Retrieval evidence exceeds ${thresholds.retrievalStaleMs}ms freshness window.`, { ...input.retrieval, ageMs, thresholdMs: thresholds.retrievalStaleMs }); }
  if (!input.proposals || input.proposals.available === false) add("proposal-evidence-missing", "warn", "Proposal evidence is absent.", input.proposals); else { if (input.proposals.malformedLines?.length) add("proposal-evidence-malformed", "warn", "Proposal JSONL is malformed.", input.proposals); if (input.proposals.pending > thresholds.proposalBacklog) add("proposal-backlog-high", "warn", `Pending proposal backlog ${input.proposals.pending} exceeds threshold ${thresholds.proposalBacklog}.`, { ...input.proposals, threshold: thresholds.proposalBacklog }); }
  if (!input.observability || input.observability.available === false) add("observability-evidence-missing", "warn", "Observability evidence is absent.", input.observability); else { if (input.observability.bytes > thresholds.observabilityMaxBytes) add("observability-bytes-exceeded", "warn", `Observability logs use ${input.observability.bytes} bytes, above ${thresholds.observabilityMaxBytes}.`, { ...input.observability, maxBytes: thresholds.observabilityMaxBytes }); if (input.observability.oldestMs != null) { const ageMs = input.nowMs - input.observability.oldestMs; if (ageMs > thresholds.observabilityMaxAgeMs) add("observability-age-exceeded", "warn", `Oldest observability log is ${ageMs}ms old, above ${thresholds.observabilityMaxAgeMs}.`, { ...input.observability, ageMs, maxAgeMs: thresholds.observabilityMaxAgeMs }); } }
  if (!input.index || input.index.status === "absent") add("index-evidence-missing", "warn", "Index state is ambiguous.", input.index); else if (input.index.status === "mismatch" || input.index.status === "invalid") add(input.index.status === "mismatch" ? "index-integrity-mismatch" : "index-manifest-invalid", "critical", "Index integrity evidence failed.", input.index); else if (input.index.status === "ok" && (input.index.ageMs == null || input.index.ageMs < 0)) add("index-freshness-invalid", "warn", "Index freshness is not measurable.", input.index); else if (input.index.status === "ok" && input.index.ageMs! > thresholds.indexStaleMs) add("index-stale", "warn", "Index exceeds freshness threshold.", input.index);
  const overall: Severity = findings.some(f => f.severity === "critical") ? "critical" : findings.some(f => f.severity === "warn") ? "warn" : "ok";
  return { overall, findings, thresholds };
}

function readJsonl(path: string): { rows: any[]; malformedLines: number[]; exists: boolean } {
  if (!existsSync(path)) return { rows: [], malformedLines: [], exists: false };
  const rows: any[] = [], malformedLines: number[] = [];
  readFileSync(path, "utf8").split(/\r?\n/).forEach((line, index) => { if (!line.trim()) return; try { rows.push(JSON.parse(line)); } catch { malformedLines.push(index + 1); } });
  return { rows, malformedLines, exists: true };
}

function runMs(runId?: string): number {
  if (!runId) return Number.NaN;
  return Date.parse(runId.replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, "T$1:$2:$3.$4Z"));
}

function reviewerEvidence(obs: string, nowMs: number, thresholds: CortexThresholds): ReviewerEvidence {
  const log = join(obs, "reviewer-runs.jsonl");
  const parsed = readJsonl(log);
  const latest = parsed.rows.at(-1);
  if (parsed.malformedLines.length) return { status: "parse-failed", evidence: log, error: `malformed JSONL lines: ${parsed.malformedLines.join(",")}` };
  const runsDir = join(obs, "reviewer-runs");
  const dirs = existsSync(runsDir) ? readdirSync(runsDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort() : [];
  const latestDir = dirs.at(-1);
  const latestDirMs = runMs(latestDir);
  const latestRowMs = latest?.ts ? Date.parse(latest.ts) : runMs(latest?.runId);
  if (latestDir && Number.isFinite(latestDirMs) && (!Number.isFinite(latestRowMs) || latestDirMs > latestRowMs)) {
    const path = join(runsDir, latestDir);
    if (existsSync(join(path, "parse-error.txt"))) return { status: "parse-failed", ts: new Date(latestDirMs).toISOString(), runId: latestDir, evidence: join(path, "parse-error.txt"), priorSuccesses: parsed.rows.filter((r) => r.ok === true).length };
    if (nowMs - latestDirMs > thresholds.reviewerRunGraceMs) return { status: "timed-out", ts: new Date(latestDirMs).toISOString(), runId: latestDir, evidence: path, error: `no terminal reviewer row within ${thresholds.reviewerRunGraceMs}ms`, priorSuccesses: parsed.rows.filter((r) => r.ok === true).length };
  }
  if (!latest) return { status: "missing", evidence: `${log} and ${runsDir}` };
  const error = String(latest.error ?? "");
  if (latest.skipped === true) {
    const status: ReviewerEvidence["status"] = validReviewerSkip(latest) ? "skipped" : "invalid";
    return { status, ts: latest.ts, runId: latest.runId, evidence: `${log}:latest`, error: latest.error, priorSuccesses: parsed.rows.slice(0, -1).filter((r) => r.ok === true && r.skipped !== true).length };
  }
  const validSuccess = validReviewerSuccess(latest);
  const status: ReviewerEvidence["status"] = latest.ok === false || latest.parse_ok === false ? (/timeout/i.test(error) ? "timed-out" : latest.parse_ok === false ? "parse-failed" : "failed") : validSuccess ? "ok" : "invalid";
  return { status, ts: latest.ts, runId: latest.runId, evidence: `${log}:latest`, error: latest.error, priorSuccesses: parsed.rows.slice(0, -1).filter((r) => r.ok === true).length };
}

function observabilityEvidence(obs: string): CortexEvidence["observability"] {
  if (!existsSync(obs)) return { bytes: 0, oldestMs: null, files: 0, evidence: obs, available: false };
  let bytes = 0; let oldestMs: number | null = null; let files = 0;
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && (entry.name.endsWith(".jsonl") || entry.name.endsWith(".log"))) {
        const st = statSync(path); bytes += st.size; files++; oldestMs = oldestMs == null ? st.mtimeMs : Math.min(oldestMs, st.mtimeMs);
      }
    }
  };
  walk(obs);
  return { bytes, oldestMs, files, evidence: obs, available: files > 0 };
}

export function canonicalCorpusDigest(memoryRoot: string): { digest: string; files: number; bytes: number } {
  const records = loadCanonicalRecords(memoryRoot);
  const normalized = records.slice().sort((a, b) => a.id.localeCompare(b.id)).map((r) => ({ id: r.id, type: r.type, title: r.title, created: r.created, updated: r.updated, provenance: r.provenance, content: r.content, related: r.related, valid_from: r.valid_from ?? null, valid_until: r.valid_until ?? null }));
  const corpus = JSON.stringify(normalized);
  return { digest: createHash("sha256").update(corpus).digest("hex"), files: records.length, bytes: Buffer.byteLength(corpus) };
}
function pathEntryExists(path: string): boolean { try { lstatSync(path); return true; } catch { return false; } }
function isWithin(root: string, path: string): boolean { return path === root || path.startsWith(root + sep); }
function regularRealpath(path: string, root: string): string {
  const rootResolved = resolve(root), candidate = resolve(path);
  if (!isWithin(rootResolved, candidate)) throw new Error("path escapes evidence root");
  const stat = lstatSync(candidate);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("evidence path is not a regular file");
  const rootReal = realpathSync(rootResolved), candidateReal = realpathSync(candidate);
  if (!isWithin(rootReal, candidateReal)) throw new Error("realpath escapes evidence root");
  return candidateReal;
}
function indexEvidence(memoryRoot: string, manifest: string, policy: string, nowMs: number): NonNullable<CortexEvidence["index"]> {
  if (!pathEntryExists(manifest)) {
    if (!pathEntryExists(policy)) return { status: "absent", manifest, policy, measuredAt: nowMs };
    try {
      const policyPath = regularRealpath(policy, dirname(memoryRoot));
      const p = JSON.parse(readFileSync(policyPath, "utf8"));
      return isPlainObject(p) && hasExactKeys(p, ["schema", "policy"]) && p.schema === "lifeos-cortex-index-policy/v1" && p.policy === "no-index-v1"
        ? { status: "no-index-v1", manifest, policy, measuredAt: nowMs }
        : { status: "invalid", manifest, policy, measuredAt: nowMs };
    } catch { return { status: "invalid", manifest, policy, measuredAt: nowMs }; }
  }
  try {
    const manifestPath = regularRealpath(manifest, memoryRoot);
    const m = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (!isPlainObject(m) || !hasExactKeys(m, ["schema", "canonical_sha256", "index_path", "index_sha256", "indexed_at"]) || m.schema !== "lifeos-cortex-index/v1") return { status: "invalid", manifest, measuredAt: nowMs };
    const manifestCanonicalHash = m.canonical_sha256, manifestIndexHash = m.index_sha256, indexRel = m.index_path, indexedAt = m.indexed_at;
    const sha256 = /^[a-f0-9]{64}$/;
    if (typeof manifestCanonicalHash !== "string" || !sha256.test(manifestCanonicalHash) || typeof manifestIndexHash !== "string" || !sha256.test(manifestIndexHash) || typeof indexRel !== "string" || indexRel.length === 0 || typeof indexedAt !== "string" || !Number.isFinite(Date.parse(indexedAt))) return { status: "invalid", manifest, measuredAt: nowMs };
    const base = dirname(manifestPath), indexCandidate = resolve(base, indexRel);
    const indexPath = regularRealpath(indexCandidate, base);
    const canonicalHash = canonicalCorpusDigest(memoryRoot).digest;
    const indexHash = createHash("sha256").update(readFileSync(indexPath)).digest("hex"), ageMs = nowMs - Date.parse(indexedAt);
    return { status: canonicalHash === manifestCanonicalHash && indexHash === manifestIndexHash ? "ok" : "mismatch", manifest, measuredAt: nowMs, canonicalHash, manifestCanonicalHash, indexHash, manifestIndexHash, indexPath, indexedAt, ageMs };
  } catch { return { status: "invalid", manifest, measuredAt: nowMs }; }
}
function validatedThresholds(overrides: Partial<CortexThresholds> = {}): CortexThresholds { for (const [key, value] of Object.entries(overrides)) if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${key} must be finite and > 0`); return { ...DEFAULT_CORTEX_THRESHOLDS, ...overrides }; }

export interface CollectCortexOptions { root: string; nowMs?: number; thresholds?: Partial<CortexThresholds>; indexManifest?: string; }
export function collectCortexEvidence(options: CollectCortexOptions): CortexEvidence {
  const nowMs = options.nowMs ?? Date.now();
  const thresholds = validatedThresholds(options.thresholds);
  const memoryRoot = join(options.root, "LIFEOS/MEMORY"), obs = join(memoryRoot, "OBSERVABILITY");
  const retrievalLog = join(obs, "memory-retrievals.jsonl"), retrieval = readJsonl(retrievalLog), retrievalLast = retrieval.rows.at(-1);
  const proposalLog = join(obs, "pending-proposals.jsonl"), proposals = readJsonl(proposalLog);
  const manifest = options.indexManifest ?? join(memoryRoot, "INDEX/index-manifest.json");
  return { nowMs, thresholds, reviewer: reviewerEvidence(obs, nowMs, thresholds),
    retrieval: retrieval.malformedLines.length ? { status: "invalid", evidence: retrievalLog, malformedLines: retrieval.malformedLines } : validRetrievalRow(retrievalLast) ? { status: "ok", ts: retrievalLast.ts as string, queryHash: retrievalLast.query_hash as string, returnedCount: retrievalLast.returned_count as number, durationMs: retrievalLast.duration_ms as number, evidence: `${retrievalLog}:latest` } : retrievalLast ? { status: "invalid", evidence: `${retrievalLog}:latest` } : { status: "missing", evidence: retrievalLog },
    proposals: { pending: proposals.rows.filter(row => row.status === "pending").length, evidence: proposalLog, available: proposals.exists, malformedLines: proposals.malformedLines }, observability: observabilityEvidence(obs), index: indexEvidence(memoryRoot, manifest, join(options.root, "LIFEOS/CORTEX_INDEX_POLICY.json"), nowMs) };
}
