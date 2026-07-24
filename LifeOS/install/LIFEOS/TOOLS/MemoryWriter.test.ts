/**
 * MemoryWriter.test.ts — corruption-shape fixtures for the canonical-rebuild
 * parser/serializer (task 359, 2026-07-23 marker-corruption fix).
 *
 * Write-path tests use temp fixtures via the constrained .memtest.md escape
 * (OS temp dir only) — the LIVE memory files are never touched.
 */

import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  BEGIN_MARKER,
  END_MARKER,
  parseMemoryContent,
  serializeMemoryContent,
  setEntries,
  read,
} from "./MemoryWriter";

const stripStamp = (s: string) => s.replace(/^last_updated: .*$/m, "last_updated: X");
const markerCount = (s: string, m: string) => s.split("\n").filter((l) => l.trim() === m).length;

const CORRUPTED = [
  "---",
  "schema_version: 1",
  "last_updated: 2026-07-01T00:00:00.000Z",
  "---",
  "# Hot-Layer Memory",
  "",
  "<!-- template comment -->",
  END_MARKER,
  BEGIN_MARKER,
  END_MARKER,
  END_MARKER,
  END_MARKER,
  "FACT: legacy invalid-prefix orphan ~explicit",
  "NAME: Fixture User",
  "PREFERENCE: prefers fixtures over live files",
  `RULE: keep the ${END_MARKER} marker pair intact`,
  END_MARKER,
].join("\n") + "\n";

describe("parseMemoryContent — corrupted shapes", () => {
  test("END-before-BEGIN + END stack: recovers all valid-prefix entries, keeps orphan in body", () => {
    const p = parseMemoryContent(CORRUPTED);
    expect(p.entries).toEqual([
      "NAME: Fixture User",
      "PREFERENCE: prefers fixtures over live files",
      `RULE: keep the ${END_MARKER} marker pair intact`,
    ]);
    expect(p.bodyLines.some((l) => l.trim().startsWith("FACT: "))).toBe(true);
    expect(p.bodyLines.some((l) => l.trim() === BEGIN_MARKER || l.trim() === END_MARKER)).toBe(false);
  });

  test("entry containing a literal marker parses whole (no truncation)", () => {
    const p = parseMemoryContent(CORRUPTED);
    expect(p.entries[2]).toContain(END_MARKER);
  });

  test("CRLF file parses and canonicalizes with frontmatter intact", () => {
    const crlf = "---\r\nschema_version: 1\r\n---\r\nNAME: Crlf User\r\n";
    const p = parseMemoryContent(crlf);
    expect(p.entries).toEqual(["NAME: Crlf User"]);
    const s = serializeMemoryContent(p, p.entries, "test");
    expect(s).toMatch(/^last_updated: /m);
    expect(s).not.toContain("\r");
  });

  test("frontmatter-less file parses; serialize is stable", () => {
    const bare = `NAME: Bare User\n${END_MARKER}\n`;
    const p = parseMemoryContent(bare);
    expect(p.frontmatter).toBe("");
    expect(p.entries).toEqual(["NAME: Bare User"]);
    const s1 = serializeMemoryContent(p, p.entries, "test");
    const p2 = parseMemoryContent(s1);
    const s2 = serializeMemoryContent(p2, p2.entries, "test");
    expect(s1).toBe(s2);
  });

  test("frontmatter-only file yields empty entries and canonical empty block", () => {
    const fmOnly = "---\nschema_version: 1\n---\n";
    const p = parseMemoryContent(fmOnly);
    expect(p.entries).toEqual([]);
    const s = serializeMemoryContent(p, [], "test");
    expect(markerCount(s, BEGIN_MARKER)).toBe(1);
    expect(markerCount(s, END_MARKER)).toBe(1);
  });
});

describe("serializeMemoryContent — canonical rebuild", () => {
  test("one write converges any corruption to exactly one ordered marker pair", () => {
    const p = parseMemoryContent(CORRUPTED);
    const s = serializeMemoryContent(p, p.entries, "test");
    expect(markerCount(s, BEGIN_MARKER)).toBe(1);
    expect(markerCount(s, END_MARKER)).toBe(1);
    const lines = s.split("\n").map((l) => l.trim());
    expect(lines.indexOf(BEGIN_MARKER)).toBeLessThan(lines.indexOf(END_MARKER));
    expect(s.endsWith("\n")).toBe(true);
  });

  test("idempotent: serialize∘parse∘serialize is byte-stable (modulo timestamp)", () => {
    const p1 = parseMemoryContent(CORRUPTED);
    const s1 = serializeMemoryContent(p1, p1.entries, "test");
    const p2 = parseMemoryContent(s1);
    const s2 = serializeMemoryContent(p2, p2.entries, "test");
    expect(stripStamp(s2)).toBe(stripStamp(s1));
  });

  test("zero entry loss through canonicalization (verbatim set-diff empty)", () => {
    const before = parseMemoryContent(CORRUPTED).entries;
    const after = parseMemoryContent(
      serializeMemoryContent(parseMemoryContent(CORRUPTED), before, "test"),
    ).entries;
    expect(new Set(after)).toEqual(new Set(before));
  });
});

describe("setEntries write path — temp fixtures only", () => {
  const tmp = mkdtempSync(join(tmpdir(), "memwriter-test-"));

  test("heals a corrupted on-disk file in one write, stable in two, orphan untouched", () => {
    const f = join(tmp, "heal.memtest.md");
    writeFileSync(f, CORRUPTED, "utf8");
    const entries = parseMemoryContent(readFileSync(f, "utf8")).entries;

    // Production path note: the reviewer submits read() output, which excludes
    // the marker-substring entry BEFORE the write — the write-side
    // dropped_malformed below only shows up because this test submits the raw
    // parse. read().dropped_invalid is the signal production relies on.
    const pre = read(f);
    if ("dropped_invalid" in pre) {
      expect(pre.dropped_invalid).toEqual([
        { entry: `RULE: keep the ${END_MARKER} marker pair intact`, reason: "malformed" },
      ]);
    }

    const w1 = setEntries(f, entries, { updatedBy: "test" });
    expect(w1.ok).toBe(true);
    if (w1.ok) {
      expect(w1.accepted).toBe(2);
      expect(w1.dropped_malformed).toBe(1);
    }
    const healed = readFileSync(f, "utf8");
    expect(markerCount(healed, BEGIN_MARKER)).toBe(1);
    expect(markerCount(healed, END_MARKER)).toBe(1);
    expect(healed).toContain("FACT: legacy invalid-prefix orphan");
    expect(healed).not.toContain(`RULE: keep the ${END_MARKER}`);

    const w2 = setEntries(f, parseMemoryContent(healed).entries, { updatedBy: "test" });
    expect(w2.ok).toBe(true);
    expect(stripStamp(readFileSync(f, "utf8"))).toBe(stripStamp(healed));

    const r = read(f);
    expect("count" in r && r.count).toBe(2);
  });

  test("rejects a submitted entry containing marker text as malformed", () => {
    const f = join(tmp, "marker-entry.memtest.md");
    writeFileSync(f, `---\nx: 1\n---\n${BEGIN_MARKER}\n${END_MARKER}\n`, "utf8");
    const w = setEntries(f, ["NAME: Ok", `RULE: sneaky ${BEGIN_MARKER} inside`], { updatedBy: "test" });
    expect(w.ok).toBe(true);
    if (w.ok) {
      expect(w.accepted).toBe(1);
      expect(w.dropped_malformed).toBe(1);
    }
  });

  test("catastrophic-shrink guard still trips on near-wipe of a populated file", () => {
    const f = join(tmp, "shrink.memtest.md");
    const many = Array.from({ length: 12 }, (_, i) => `PREFERENCE: entry number ${i}`);
    writeFileSync(f, `---\nx: 1\n---\n${BEGIN_MARKER}\n${many.join("\n")}\n${END_MARKER}\n`, "utf8");
    const w = setEntries(f, ["PREFERENCE: entry number 0"], { updatedBy: "test" });
    expect(w.ok).toBe(false);
    if (!w.ok) expect(w.code).toBe("ESUSPECT_SHRINK");
  });

  test("temp escape stays confined: vault-shaped path outside tmpdir is rejected", () => {
    const w = setEntries("/Users/laptop/Desktop/evil.memtest.md", ["NAME: x"], { updatedBy: "test" });
    expect(w.ok).toBe(false);
    if (!w.ok) expect(w.code).toBe("EINVAL_PATH");
  });

  test("temp escape stays confined: tmpdir symlink pointing outside is rejected", () => {
    const link = join(tmp, "sneaky.memtest.md");
    symlinkSync("/etc/hosts", link);
    const w = setEntries(link, ["NAME: x"], { updatedBy: "test" });
    expect(w.ok).toBe(false);
    if (!w.ok) expect(w.code).toBe("EINVAL_PATH");
  });

  test("read() reports over-length on-disk entries as pending drops, not silently", () => {
    const f = join(tmp, "overlength.memtest.md");
    const big = `PREFERENCE: ${"Y".repeat(300)}`;
    writeFileSync(f, `---\nx: 1\n---\n${BEGIN_MARKER}\nNAME: Ok\n${big}\n${END_MARKER}\n`, "utf8");
    const r = read(f);
    expect("dropped_invalid" in r).toBe(true);
    if ("dropped_invalid" in r) {
      expect(r.count).toBe(1);
      expect(r.dropped_invalid).toEqual([{ entry: big, reason: "overlength" }]);
    }
  });

  test("symlink at the .tmp write-target cannot be written through (O_EXCL)", () => {
    const f = join(tmp, "wt.memtest.md");
    const victim = join(tmp, "victim-not-memtest.txt");
    writeFileSync(f, `---\nx: 1\n---\n${BEGIN_MARKER}\nNAME: Seed\n${END_MARKER}\n`, "utf8");
    writeFileSync(victim, "ORIGINAL", "utf8");
    symlinkSync(victim, `${f}.tmp`);
    const w = setEntries(f, ["NAME: Seed", "RULE: written via the real file"], { updatedBy: "test" });
    // The write must still succeed (O_EXCL unlinks the stale symlink first) and
    // the victim must be untouched — never written through the symlink.
    expect(w.ok).toBe(true);
    expect(readFileSync(victim, "utf8")).toBe("ORIGINAL");
    expect(readFileSync(f, "utf8")).toContain("RULE: written via the real file");
  });

  test("embedded-newline entry is rejected, keeping one entry = one line", () => {
    const f = join(tmp, "nl.memtest.md");
    writeFileSync(f, `---\nx: 1\n---\n${BEGIN_MARKER}\n${END_MARKER}\n`, "utf8");
    const w = setEntries(f, ["NAME: A\nRULE: smuggled second line"], { updatedBy: "test" });
    expect(w.ok).toBe(true);
    if (w.ok) {
      expect(w.accepted).toBe(0);
      expect(w.dropped_malformed).toBe(1);
    }
    expect(read(f)).toMatchObject({ count: 0 });
  });

  test("near-total wipe with one added entry still trips the shrink guard", () => {
    const f = join(tmp, "wipe.memtest.md");
    const many = Array.from({ length: 20 }, (_, i) => `PREFERENCE: durable fact number ${i}`);
    writeFileSync(f, `---\nx: 1\n---\n${BEGIN_MARKER}\n${many.join("\n")}\n${END_MARKER}\n`, "utf8");
    // Keep 2 + add 1 rephrased = 3 new entries (defeats the old floor<3 + additions>0 escape).
    const w = setEntries(f, [many[0], many[1], "PREFERENCE: a rephrased consolidation"], { updatedBy: "test" });
    expect(w.ok).toBe(false);
    if (!w.ok) expect(w.code).toBe("ESUSPECT_SHRINK");
  });

  test("cleanup", () => {
    rmSync(tmp, { recursive: true, force: true });
    expect(true).toBe(true);
  });
});

describe("parseMemoryContent — frontmatter mis-close does not swallow the entries block", () => {
  test("unterminated frontmatter closing on a body --- still recovers entries", () => {
    // Opening --- with no proper close; a later body '---' would let the greedy
    // frontmatter regex swallow the marker block. Demotion recovers the entries.
    const bad = [
      "---",
      "schema_version: 1",
      "",
      BEGIN_MARKER,
      "NAME: Should Be Found",
      "RULE: also found",
      END_MARKER,
      "---",
    ].join("\n") + "\n";
    const p = parseMemoryContent(bad);
    expect(p.entries).toEqual(["NAME: Should Be Found", "RULE: also found"]);
  });
});
