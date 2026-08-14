#!/usr/bin/env bun
import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { activeCortexRecords, canonicalCorpusDigest, enumerateCanonicalCorpus, LIMITS, rankBM25, toCortexCard, type CortexCard, type CortexRecord } from "./Cortex";

export interface BenchmarkLabelProvenance {
  schema: "lifeos-cortex-benchmark-label-provenance/v1";
  query_execution: { method: "live-cortex-cli"; command: string[]; executed_at: string; query: string; returned_ids: string[] };
  expected_ids_verification: { method: "manual-corpus-verification"; verified_at: string; verifier: "upgrade-validation"; verified_ids: string[] };
}
export interface BenchmarkLabel { id: string; query: string; expected_ids: string[]; temporal_expected_order?: string[]; false_ids?: string[]; provenance: BenchmarkLabelProvenance }
export interface BenchmarkMetrics { name: "bm25-baseline" | "progressive"; recall_at_5: number; mrr: number; temporal_accuracy: number; false_recall: number; injected_tokens: number; p95_latency_ms: number; latency_samples: number; disk_bytes: number; disk_growth_bytes: number; process_count: number; peak_rss_bytes: number; execution_path: "rank-full-records" | "rank-cards-expand-selected" }
export interface BenchmarkReport {
  schema: "lifeos-cortex-benchmark/v1"; generated_at: string; labels: number; configs: BenchmarkMetrics[]; vector_config: null;
  measurements: { corpus_tokenizations: number; ranking_runs: number; latency_samples_per_query: number };
  provenance: { corpus_digest: string; labels_digest: string; command: string; generated_at: string; config: { ranker: "Cortex.rankBM25"; validity: "Cortex.activeCortexRecords"; disclosure_payloads: ["full-fetch", "cards-expand-selected"]; top_k: 5; latency_samples_per_query: number } };
}

type Ranked = ReturnType<typeof rankBM25>;
export interface BenchmarkOptions { diskBytes?: number; measureDiskBytes?: () => number; command?: string; generatedAt?: string; now?: Date }
const LATENCY_SAMPLES = 25;
let benchmarkSink = 0;

function sha256(value: unknown): string { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
const LABEL_LIMITS = { FILE_BYTES: 1024 * 1024, ROWS: 1000, IDS_PER_ARRAY: LIMITS.IDS, ID_CHARS: 256, COMMAND_PARTS: 32, COMMAND_BYTES: 16_384 } as const;
const LABEL_FIELDS = new Set(["id", "query", "expected_ids", "temporal_expected_order", "false_ids", "provenance"]);
const PROVENANCE_FIELDS = new Set(["schema", "query_execution", "expected_ids_verification"]);
const EXECUTION_FIELDS = new Set(["method", "command", "executed_at", "query", "returned_ids"]);
const VERIFICATION_FIELDS = new Set(["method", "verified_at", "verifier", "verified_ids"]);
function objectRow(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function exactFields(value: Record<string, unknown>, allowed: Set<string>, description: string): void {
  if (Object.keys(value).some((key) => !allowed.has(key)) || [...allowed].some((key) => !(key in value))) throw new Error(`${description} has unknown or missing fields`);
}
function evidenceTimestamp(value: unknown, description: string): void {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error(`${description} must be a canonical UTC timestamp`);
}
function idArray(value: unknown, field: string, number: number, required = false): string[] {
  if (!Array.isArray(value) || (required && value.length === 0) || value.some((id) => typeof id !== "string" || !id.trim() || id.length > LABEL_LIMITS.ID_CHARS)) throw new Error(`Malformed ${field} in benchmark label ${number}`);
  if (value.length > LABEL_LIMITS.IDS_PER_ARRAY) throw new Error(`${field} exceeds ${LABEL_LIMITS.IDS_PER_ARRAY} IDs in benchmark label ${number}`);
  if (new Set(value).size !== value.length) throw new Error(`${field} contains duplicate IDs in benchmark label ${number}`);
  return value as string[];
}
function validateEvidence(label: BenchmarkLabel, number: number): void {
  const provenance = label.provenance;
  if (!objectRow(provenance)) throw new Error(`Malformed provenance in benchmark label ${number}`);
  exactFields(provenance, PROVENANCE_FIELDS, `Benchmark label ${number} provenance`);
  if (provenance.schema !== "lifeos-cortex-benchmark-label-provenance/v1") throw new Error(`Malformed provenance schema in benchmark label ${number}`);
  const execution = provenance.query_execution;
  const verification = provenance.expected_ids_verification;
  if (!objectRow(execution) || !objectRow(verification)) throw new Error(`Malformed provenance in benchmark label ${number}`);
  exactFields(execution, EXECUTION_FIELDS, `Benchmark label ${number} query_execution provenance`);
  exactFields(verification, VERIFICATION_FIELDS, `Benchmark label ${number} expected_ids_verification provenance`);
  if (execution.method !== "live-cortex-cli" || execution.query !== label.query) throw new Error(`Benchmark label ${number} provenance does not match a live Cortex query execution`);
  evidenceTimestamp(execution.executed_at, `Benchmark label ${number} query execution time`);
  if (!Array.isArray(execution.command) || execution.command.length === 0 || execution.command.length > LABEL_LIMITS.COMMAND_PARTS || execution.command.some((part) => typeof part !== "string" || !part.trim()) || Buffer.byteLength(execution.command.join("\0")) > LABEL_LIMITS.COMMAND_BYTES || !execution.command.includes("search") || !execution.command.includes(label.query)) throw new Error(`Malformed query command provenance in benchmark label ${number}`);
  const returned = idArray(execution.returned_ids, "provenance returned_ids", number);
  if (label.expected_ids.some((id) => !returned.includes(id))) throw new Error(`Benchmark label ${number} provenance has no observed expected ID`);
  if (verification.method !== "manual-corpus-verification" || verification.verifier !== "upgrade-validation") throw new Error(`Benchmark label ${number} provenance must record upgrade-validation manual corpus verification`);
  evidenceTimestamp(verification.verified_at, `Benchmark label ${number} expected-ID verification time`);
  const verified = idArray(verification.verified_ids, "provenance verified_ids", number, true);
  if (JSON.stringify(verified) !== JSON.stringify(label.expected_ids)) throw new Error(`Benchmark label ${number} provenance verified_ids must exactly match expected_ids`);
}
function validateLabelShape(labels: BenchmarkLabel[]): void {
  if (labels.length === 0) throw new Error("Benchmark requires at least one label");
  if (labels.length > LABEL_LIMITS.ROWS) throw new Error(`Benchmark labels exceed ${LABEL_LIMITS.ROWS} rows`);
  const labelIds = new Set<string>();
  labels.forEach((label, index) => {
    const number = index + 1;
    if (!objectRow(label)) throw new Error(`Malformed benchmark label ${number}`);
    if (Object.keys(label).some((key) => !LABEL_FIELDS.has(key))) throw new Error(`Benchmark label ${number} has unknown fields`);
    if (typeof label.id !== "string" || !label.id.trim() || label.id.length > LABEL_LIMITS.ID_CHARS || typeof label.query !== "string" || !label.query.trim()) throw new Error(`Malformed benchmark label ${number}`);
    if (labelIds.has(label.id)) throw new Error(`Duplicate benchmark label ID: ${label.id}`);
    labelIds.add(label.id);
    if (label.query.length > LIMITS.QUERY_CHARS) throw new Error(`Benchmark label ${label.id} query exceeds Cortex query cap of ${LIMITS.QUERY_CHARS} characters`);
    const terms = label.query.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    if (terms.length === 0 || terms.length > LIMITS.QUERY_TERMS) throw new Error(`Benchmark label ${label.id} query exceeds Cortex query term cap or has no searchable terms`);
    label.expected_ids = idArray(label.expected_ids, "expected_ids", number, true);
    if (label.temporal_expected_order !== undefined) label.temporal_expected_order = idArray(label.temporal_expected_order, "temporal_expected_order", number);
    if (label.false_ids !== undefined) label.false_ids = idArray(label.false_ids, "false_ids", number);
    validateEvidence(label, number);
  });
}
function validateLabels(records: CortexRecord[], labels: BenchmarkLabel[]): void {
  validateLabelShape(labels);
  const recordIds = new Set(records.map((record) => record.id));
  for (const label of labels) for (const field of ["expected_ids", "temporal_expected_order", "false_ids"] as const) for (const id of label[field] ?? []) if (!recordIds.has(id)) throw new Error(`Benchmark label ${label.id} references missing ${field === "expected_ids" ? "expected" : field} ID: ${id}`);
}

function productionCard(row: Ranked[number]): CortexCard { return toCortexCard(row.record, row.score); }

function disclosurePayload(name: BenchmarkMetrics["name"], top: Ranked): string {
  if (name === "bm25-baseline") return JSON.stringify({ format: "lifeos-cortex-export/v1", items: top.map((row) => row.record) });
  const cards = top.map(productionCard);
  return JSON.stringify({ search: { items: cards, total: cards.length, page: 1, page_size: 5 }, fetch: { format: "lifeos-cortex-export/v1", items: top[0] ? [top[0].record] : [] } });
}

function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)]!;
}

function temporalAccuracy(ranking: string[], expected: string[]): number {
  if (expected.length < 2) return expected.every((id) => ranking.includes(id)) ? 1 : 0;
  let correct = 0, pairs = 0;
  for (let left = 0; left < expected.length; left++) for (let right = left + 1; right < expected.length; right++) {
    pairs++;
    const a = ranking.indexOf(expected[left]!); const b = ranking.indexOf(expected[right]!);
    if (a >= 0 && b >= 0 && a < b) correct++;
  }
  return correct / Math.max(1, pairs);
}

function processCount(): number {
  try {
    const output = Bun.spawnSync(["/bin/ps", "-axo", "pid=,ppid=,comm="]).stdout.toString();
    const rows = output.split(/\r?\n/).map((line) => { const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/); return match ? { pid: Number(match[1]), ppid: Number(match[2]), command: match[3]! } : null; }).filter((row): row is { pid: number; ppid: number; command: string } => row !== null);
    const helperPids = new Set(rows.filter((row) => basename(row.command) === "ps").map((row) => row.pid));
    const descendants = new Set([process.pid]);
    let changed = true;
    while (changed) { changed = false; for (const row of rows) if (!helperPids.has(row.pid) && descendants.has(row.ppid) && !descendants.has(row.pid)) { descendants.add(row.pid); changed = true; } }
    return descendants.size;
  } catch { return 1; }
}

function measure(name: BenchmarkMetrics["name"], rankings: Ranked[], labels: BenchmarkLabel[], latencies: number[], diskBytes: number, diskGrowth: number, processes: number, peakRss: number): BenchmarkMetrics {
  let recall = 0, reciprocalRank = 0, temporal = 0, falseRecall = 0, injectedTokens = 0;
  rankings.forEach((ranked, index) => {
    const label = labels[index]!; const top = ranked.slice(0, 5); const ids = top.map((row) => row.record.id);
    recall += label.expected_ids.filter((id) => ids.includes(id)).length / label.expected_ids.length;
    const first = ids.findIndex((id) => label.expected_ids.includes(id)); reciprocalRank += first < 0 ? 0 : 1 / (first + 1);
    temporal += temporalAccuracy(ids, label.temporal_expected_order ?? label.expected_ids);
    const falseIds = label.false_ids ?? []; falseRecall += falseIds.length === 0 ? 0 : falseIds.filter((id) => ids.includes(id)).length / falseIds.length;
    injectedTokens += Math.ceil(Buffer.byteLength(disclosurePayload(name, top)) / 4);
  });
  const divisor = labels.length;
  return { name, recall_at_5: recall / divisor, mrr: reciprocalRank / divisor, temporal_accuracy: temporal / divisor, false_recall: falseRecall / divisor, injected_tokens: injectedTokens, p95_latency_ms: p95(latencies), latency_samples: latencies.length, disk_bytes: diskBytes, disk_growth_bytes: diskGrowth, process_count: processes, peak_rss_bytes: peakRss, execution_path: name === "bm25-baseline" ? "rank-full-records" : "rank-cards-expand-selected" };
}

export function runRetrievalBenchmark(records: CortexRecord[], labels: BenchmarkLabel[], options: BenchmarkOptions = {}): BenchmarkReport {
  validateLabels(records, labels);
  const now = options.now ?? new Date();
  const diskBefore = options.measureDiskBytes?.() ?? options.diskBytes ?? Buffer.byteLength(JSON.stringify(records));
  const baselineLatencies: number[] = [], progressiveLatencies: number[] = [];
  let rankings: Ranked[] = [];
  for (let sample = 0; sample < LATENCY_SAMPLES; sample++) {
    const sampleRankings: Ranked[] = [];
    for (const label of labels) {
      const rankStarted = performance.now();
      const ranked = rankBM25(activeCortexRecords(records, now), label.query);
      const rankingMs = performance.now() - rankStarted;
      sampleRankings.push(ranked);
      const top = ranked.slice(0, 5);
      let payloadStarted = performance.now(); let encoded = disclosurePayload("bm25-baseline", top); benchmarkSink ^= encoded.length;
      baselineLatencies.push(rankingMs + performance.now() - payloadStarted);
      payloadStarted = performance.now(); encoded = disclosurePayload("progressive", top); benchmarkSink ^= encoded.length;
      progressiveLatencies.push(rankingMs + performance.now() - payloadStarted);
    }
    if (sample === 0) rankings = sampleRankings;
  }
  const diskAfter = options.measureDiskBytes?.() ?? options.diskBytes ?? Buffer.byteLength(JSON.stringify(records));
  const diskGrowth = diskAfter - diskBefore;
  const processes = processCount();
  const peakRss = process.resourceUsage().maxRSS;
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const rankingRuns = labels.length * LATENCY_SAMPLES;
  return {
    schema: "lifeos-cortex-benchmark/v1", generated_at: generatedAt, labels: labels.length,
    configs: [measure("bm25-baseline", rankings, labels, baselineLatencies, diskAfter, diskGrowth, processes, peakRss), measure("progressive", rankings, labels, progressiveLatencies, diskAfter, diskGrowth, processes, peakRss)],
    vector_config: null,
    measurements: { corpus_tokenizations: rankingRuns, ranking_runs: rankingRuns, latency_samples_per_query: LATENCY_SAMPLES },
    provenance: { corpus_digest: canonicalCorpusDigest(records), labels_digest: sha256(labels), command: options.command ?? "runRetrievalBenchmark", generated_at: generatedAt, config: { ranker: "Cortex.rankBM25", validity: "Cortex.activeCortexRecords", disclosure_payloads: ["full-fetch", "cards-expand-selected"], top_k: 5, latency_samples_per_query: LATENCY_SAMPLES } },
  };
}

function readLabels(path: string): BenchmarkLabel[] {
  const stat = lstatSync(path);
  if (!stat.isFile()) throw new Error("Benchmark labels must be a regular file");
  if (stat.size === 0) throw new Error("Benchmark labels file is empty");
  if (stat.size > LABEL_LIMITS.FILE_BYTES) throw new Error(`Benchmark labels file exceeds ${LABEL_LIMITS.FILE_BYTES} bytes`);
  const bytes = readFileSync(path);
  if (bytes.byteLength === 0) throw new Error("Benchmark labels file is empty");
  if (bytes.byteLength > LABEL_LIMITS.FILE_BYTES) throw new Error(`Benchmark labels file exceeds ${LABEL_LIMITS.FILE_BYTES} bytes`);
  let content: string;
  try { content = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { throw new Error("Benchmark labels file must be valid UTF-8"); }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u.test(content)) throw new Error("Benchmark labels file contains forbidden controls");
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) throw new Error("Benchmark labels file is empty");
  if (lines.length > LABEL_LIMITS.ROWS) throw new Error(`Benchmark labels file exceeds ${LABEL_LIMITS.ROWS} rows`);
  const labels = lines.map((line, index) => { try { return JSON.parse(line) as BenchmarkLabel; } catch { throw new Error(`Malformed benchmark label JSON at line ${index + 1}`); } });
  validateLabelShape(labels);
  return labels;
}

function corpusBytes(files: string[]): number { return files.reduce((bytes, path) => bytes + statSync(path).size, 0); }

function checkedOutputPath(value: string, memoryRoot: string): string {
  const benchmarks = resolve(realpathSync(memoryRoot), "BENCHMARKS"); const requested = resolve(value); const output = resolve(realpathSync(dirname(requested)), basename(requested)); const rel = relative(benchmarks, output);
  if (!rel || rel.startsWith(".." + sep) || rel === ".." || resolve(benchmarks, rel) !== output) throw new Error("--output must be under MEMORY/BENCHMARKS");
  if (!/^cortex-benchmark-v\d+[-._][A-Za-z0-9._-]+\.json$/.test(basename(output))) throw new Error("--output filename must be a versioned cortex-benchmark-vN-*.json report");
  return output;
}

interface CliArguments { labelsPath: string; memoryRoot: string; outputPath?: string; raw: string[] }
const CLI_VALUE_OPTIONS = new Set(["--labels", "--memory-root", "--output"]);
function parseCliArguments(args: string[]): CliArguments {
  const options = new Map<string, string>();
  for (let index = 0; index < args.length; index++) {
    const option = args[index]!;
    if (!option.startsWith("--")) throw new Error(`Unexpected positional argument: ${option}`);
    if (!CLI_VALUE_OPTIONS.has(option)) throw new Error(`Unknown or inapplicable benchmark option: ${option}`);
    if (options.has(option)) throw new Error(`Duplicate option: ${option}`);
    const value = args[++index];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${option}`);
    options.set(option, value);
  }
  const labelsPath = options.get("--labels");
  const memoryRoot = options.get("--memory-root");
  if (!labelsPath || !memoryRoot) throw new Error("--labels and --memory-root are required");
  return { labelsPath: resolve(labelsPath), memoryRoot: resolve(memoryRoot), outputPath: options.get("--output"), raw: args };
}

if (import.meta.main || resolve(process.argv[1] ?? "") === resolve(import.meta.path)) {
  try {
    const parsed = parseCliArguments(process.argv.slice(2));
    const labels = readLabels(parsed.labelsPath);
    const corpus = enumerateCanonicalCorpus(parsed.memoryRoot); const records = corpus.records;
    const report = runRetrievalBenchmark(records, labels, { measureDiskBytes: () => corpusBytes(corpus.files), command: ["bun", "LIFEOS/TOOLS/CortexBenchmark.ts", ...parsed.raw].join(" ") });
    if (parsed.outputPath !== undefined) { const path = checkedOutputPath(parsed.outputPath, parsed.memoryRoot); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify(report, null, 2) + "\n", { flag: "wx" }); }
    process.stdout.write(JSON.stringify(report) + "\n");
  } catch (error) {
    process.stdout.write(JSON.stringify({ schema: "lifeos-cortex-benchmark/v1", ok: false, error: error instanceof Error ? error.message : String(error) }) + "\n");
    process.exit(4);
  }
}
