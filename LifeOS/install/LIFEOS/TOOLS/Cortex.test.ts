import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { enumerateCanonicalCorpus, runCortex } from "./Cortex";

const note = (dir: string, name: string, fm: string, body = "widget") => writeFileSync(join(dir, name), `---\n${fm}\n---\n${body}\n`);
function corpus() {
  const root = mkdtempSync(join(tmpdir(), "cortex-")), k = join(root, "KNOWLEDGE");
  mkdirSync(k);
  note(k, "a.md", "id: kb_a\ncreated: 2026-01-01", "alpha widget");
  note(k, "garbled.md", "id: kb_b\ncreated: 2026-0606-06-30");
  note(k, "dup.md", "id: kb_a\ncreated: 2026-01-02");
  note(k, "order.md", "id: kb_c\ncreated: 2026-02-01\nupdated: 2026-01-01");
  return { root, k };
}

test("default read skips bad notes, keeps good ones, and reports each skip", async () => {
  const { root } = corpus();
  const r = await runCortex(["status", "--memory-root", root]);
  expect(r.exitCode).toBe(0);
  const data = r.envelope.data as any;
  expect(data.canonical.records).toBe(1);
  expect(data.skipped.count).toBe(3);
  expect(data.skipped.items.map((i: any) => i.path).sort()).toEqual(["KNOWLEDGE/dup.md", "KNOWLEDGE/garbled.md", "KNOWLEDGE/order.md"]);
});

test("a duplicate ID keeps the first file in path order and skips the later one", () => {
  const { root } = corpus();
  const { records, skipped } = enumerateCanonicalCorpus(root, { strict: false });
  expect(records.map((x) => x.id)).toEqual(["kb_a"]);
  expect(skipped.find((s) => s.path.endsWith("dup.md"))?.reason).toContain("Duplicate canonical ID kb_a");
});

test("--strict keeps the fail-closed read, and the library default is strict", async () => {
  const { root } = corpus();
  const r = await runCortex(["status", "--memory-root", root, "--strict"]);
  expect(r.exitCode).toBe(4);
  expect(r.envelope.error?.code).toBe("integrity_error");
  expect(() => enumerateCanonicalCorpus(root)).toThrow();
});

test("search still ranks the good notes when others are skipped", async () => {
  const { root } = corpus();
  const r = await runCortex(["search", "widget", "--memory-root", root]);
  expect(r.exitCode).toBe(0);
  expect((r.envelope.data as any).items.map((i: any) => i.id)).toEqual(["kb_a"]);
});

test("a bad JSONL row skips only that row", () => {
  const root = mkdtempSync(join(tmpdir(), "cortex-")), k = join(root, "KNOWLEDGE");
  mkdirSync(k);
  const row = (id: string) => JSON.stringify({ id, type: "memory", title: id, created: "2026-01-01", updated: "2026-01-01", content: "c" });
  writeFileSync(join(k, "rows.jsonl"), [row("r1"), "{not json", row("r3")].join("\n"));
  const { records, skipped } = enumerateCanonicalCorpus(root, { strict: false });
  expect(records.map((x) => x.id)).toEqual(["r1", "r3"]);
  expect(skipped.map((s) => s.path)).toEqual(["KNOWLEDGE/rows.jsonl:2"]);
});

test("structure problems stay fatal even when reads are lenient", async () => {
  const { root, k } = corpus();
  symlinkSync(join(k, "a.md"), join(k, "link.md"));
  const r = await runCortex(["status", "--memory-root", root]);
  expect(r.exitCode).toBe(4);
  expect(r.envelope.error?.message).toContain("symlink");
});
