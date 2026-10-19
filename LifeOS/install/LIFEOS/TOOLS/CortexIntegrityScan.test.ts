import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { scan, validTimestamp } from "./CortexIntegrityScan";

const note = (dir: string, name: string, fm: string) => writeFileSync(join(dir, name), `---\n${fm}\n---\nbody\n`);

test("reports each integrity class once, all at once", () => {
  const root = mkdtempSync(join(tmpdir(), "cis-")), k = join(root, "KNOWLEDGE");
  mkdirSync(k);
  note(k, "a.md", "id: kb_a\ncreated: 2026-08-31T21:03:08.035Z\nupdated: 2026-08-31");
  note(k, "b.md", "id: kb_b\ncreated: 2026-0606-06-30");
  note(k, "c.md", "id: kb_c\ncreated: 2026-01-01\nvalid_from: null");
  note(k, "d.md", "id: kb_dup\ncreated: 2026-01-01");
  note(k, "e.md", "id: kb_dup\ncreated: 2026-01-01");
  note(k, "ok.md", "id: kb_ok\ncreated: 2026-01-01\nupdated: 2026-01-02");
  const classes = new Set(scan(root).findings.map((f) => f.cls));
  for (const c of ["updated-before-created", "bad-created", "bad-valid_from", "duplicate-id"]) expect(classes.has(c)).toBe(true);
  expect(scan(root).findings.some((f) => f.path.endsWith("ok.md"))).toBe(false);
});

test("clean corpus has no findings; underscore dirs are skipped", () => {
  const root = mkdtempSync(join(tmpdir(), "cis-")), k = join(root, "KNOWLEDGE");
  mkdirSync(join(k, "_backups"), { recursive: true });
  note(k, "ok.md", "id: kb_ok\ncreated: 2026-01-01");
  note(join(k, "_backups"), "bad.md", "id: kb_x\ncreated: nope");
  expect(scan(root)).toEqual({ files: 1, findings: [] });
});

test("validTimestamp rejects impossible dates", () => {
  expect(validTimestamp("2026-02-30")).toBe(false);
  expect(validTimestamp("2026-06-30")).toBe(true);
  expect(validTimestamp("null")).toBe(false);
});

test("flags a corpus over the file limit", () => {
  const root = mkdtempSync(join(tmpdir(), "cis-")), k = join(root, "KNOWLEDGE");
  mkdirSync(k);
  for (const n of ["a", "b", "c"]) note(k, `${n}.md`, `id: kb_${n}\ncreated: 2026-01-01`);
  expect(scan(root, 2).findings.map((f) => f.cls)).toEqual(["file-limit"]);
  expect(scan(root, 3).findings).toEqual([]);
});
