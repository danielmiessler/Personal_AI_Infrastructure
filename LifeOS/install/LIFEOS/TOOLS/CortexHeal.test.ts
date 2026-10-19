import { expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { apply, plan, revert } from "./CortexHeal";
import { runCortex } from "./Cortex";

const note = (dir: string, name: string, fm: string, body = "widget body") => writeFileSync(join(dir, name), `---\n${fm}\n---\n${body}\n`);
function corpus() {
  const root = mkdtempSync(join(tmpdir(), "heal-")), k = join(root, "KNOWLEDGE");
  mkdirSync(k);
  note(k, "ok.md", "id: kb_ok\ncreated: 2026-01-01");
  note(k, "order.md", "id: kb_order\ncreated: 2026-08-31T21:03:08.035Z\nupdated: 2026-08-31");
  note(k, "nulls.md", "id: kb_nulls\ncreated: 2026-01-01\nvalid_from: null\nvalid_until: ~");
  note(k, "garbled.md", "id: kb_garbled\ncreated: 2026-0606-06-30");
  note(k, "dup1.md", "id: kb_dup\ncreated: 2026-01-01");
  note(k, "dup2.md", "id: kb_dup\ncreated: 2026-01-02");
  note(k, "ctl.md", "id: kb_ctl\ncreated: 2026-01-01", "a\u0001b");
  return { root, k };
}
const snapshot = (k: string) => Object.fromEntries(readdirSync(k).filter((n) => n.endsWith(".md")).map((n) => [n, readFileSync(join(k, n), "utf8")]));

test("dry run changes nothing and names every action", () => {
  const { root, k } = corpus(), before = snapshot(k);
  const { actions } = plan(root);
  expect(actions.map((a) => `${a.cls}:${a.action}`).sort()).toEqual(["bad-created:quarantine", "bad-updated:quarantine", "bad-valid_from:fix", "bad-valid_until:fix", "control-char:fix", "duplicate-id:fix", "updated-before-created:fix"]);
  expect(snapshot(k)).toEqual(before);
});

test("apply heals the corpus so a strict Cortex read passes, and quarantines only the uninferable date", async () => {
  const { root, k } = corpus();
  const healDir = apply(root, plan(root).actions);
  expect(plan(root).actions).toEqual([]);
  expect(existsSync(join(k, "garbled.md"))).toBe(false);
  expect(existsSync(join(healDir, "quarantine/KNOWLEDGE/garbled.md"))).toBe(true);
  expect(readFileSync(join(k, "order.md"), "utf8")).toContain("updated: 2026-08-31T21:03:08.035Z");
  expect(readFileSync(join(k, "nulls.md"), "utf8")).not.toContain("valid_");
  const r = await runCortex(["status", "--memory-root", root, "--strict"]);
  expect(r.exitCode).toBe(0);
  expect((r.envelope.data as any).canonical.records).toBe(6);
});

test("revert restores every touched file byte for byte", () => {
  const { root, k } = corpus(), before = snapshot(k);
  const healDir = apply(root, plan(root).actions, "t1");
  expect(healDir.endsWith("t1")).toBe(true);
  revert(root, "t1");
  expect(snapshot(k)).toEqual(before);
});

test("a clean corpus produces no actions and symlinks are reported, never touched", () => {
  const root = mkdtempSync(join(tmpdir(), "heal-")), k = join(root, "KNOWLEDGE");
  mkdirSync(k);
  note(k, "ok.md", "id: kb_ok\ncreated: 2026-01-01");
  expect(plan(root)).toEqual({ actions: [], untouched: [], files: 1 });
});
