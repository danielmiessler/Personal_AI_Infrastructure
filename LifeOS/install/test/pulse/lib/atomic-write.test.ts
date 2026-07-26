/**
 * Atomicity contract for LIFEOS/PULSE/lib/atomic-write.ts.
 *
 * The property under test: a write either lands whole or not at all. Every
 * settings writer (MergeSettings, SettingsBackport, SyncIdentityToSettings,
 * the installers) routes through this module, so an interrupted or failed
 * write must leave the previous file byte-identical and still parseable —
 * never the truncated prefix a plain writeFileSync leaves behind.
 */
import { describe, expect, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { atomicWriteJSON, atomicWriteText } from "../../../LIFEOS/PULSE/lib/atomic-write";

/** Disposable scratch dir — doctrine forbids touching a real config root. */
function scratch(): { path: string } & Disposable {
  const path = mkdtempSync(join(tmpdir(), "lifeos-atomic-write-"));
  return {
    path,
    [Symbol.dispose]() {
      rmSync(path, { recursive: true, force: true });
    },
  };
}

/** Settings-shaped payload, big enough that a partial write would be visible. */
const PREVIOUS = JSON.stringify(
  { hooks: { SessionStart: ["a".repeat(4096)] }, permissions: { allow: [] } },
  null,
  2,
) + "\n";

describe("atomicWriteText", () => {
  test("writes the exact content it was given", () => {
    using dir = scratch();
    const target = join(dir.path, "settings.json");

    atomicWriteText(target, PREVIOUS);

    expect(readFileSync(target, "utf8")).toBe(PREVIOUS);
  });

  test("replaces an existing file with the exact new content", () => {
    using dir = scratch();
    const target = join(dir.path, "settings.json");
    writeFileSync(target, "{}\n");

    atomicWriteText(target, PREVIOUS);

    expect(readFileSync(target, "utf8")).toBe(PREVIOUS);
  });

  test("a failed write leaves the previous file byte-identical and valid JSON", () => {
    using dir = scratch();
    const target = join(dir.path, "settings.json");
    writeFileSync(target, PREVIOUS);

    // Read-only directory => creating the temp file fails, standing in for the
    // ENOSPC / mid-write-kill class. A truncate-then-write does NOT fail here
    // (write permission on the file is enough) and destroys the target — which
    // is exactly the property this asserts against.
    let threw = false;
    chmodSync(dir.path, 0o500);
    try {
      atomicWriteText(target, '{"replacement":true}\n');
    } catch {
      threw = true;
    } finally {
      chmodSync(dir.path, 0o700);
    }

    expect(readFileSync(target, "utf8")).toBe(PREVIOUS);
    expect(() => JSON.parse(readFileSync(target, "utf8"))).not.toThrow();
    expect(threw).toBe(true); // the failure surfaces rather than being swallowed
  });

  test("a failed write leaves no temp file behind", () => {
    using dir = scratch();
    const target = join(dir.path, "settings.json");
    writeFileSync(target, PREVIOUS);

    // Target path occupied by a directory => the rename fails after the temp
    // file was already created, exercising the cleanup path.
    const blocked = join(dir.path, "blocked.json");
    mkdirSync(join(blocked, "child"), { recursive: true });

    expect(() => atomicWriteText(blocked, PREVIOUS)).toThrow();
    expect(readdirSync(dir.path).filter((n) => n.includes(".tmp."))).toEqual([]);
  });

  test("a successful write leaves no temp file behind", () => {
    using dir = scratch();

    atomicWriteText(join(dir.path, "settings.json"), PREVIOUS);

    expect(readdirSync(dir.path)).toEqual(["settings.json"]);
  });

  test("Anti: no temp file is ever named so it could be read back as config", () => {
    using dir = scratch();
    const blocked = join(dir.path, "settings.json");
    mkdirSync(blocked, { recursive: true });

    // Whatever the rename failure strands, it must not look like the target.
    expect(() => atomicWriteText(blocked, PREVIOUS)).toThrow();
    for (const name of readdirSync(dir.path)) {
      if (name === "settings.json") continue;
      expect(name.endsWith(".json")).toBe(false);
    }
  });

  test("creates missing parent directories", () => {
    using dir = scratch();
    const target = join(dir.path, "nested", "deeper", "settings.json");

    atomicWriteText(target, PREVIOUS);

    expect(existsSync(target)).toBe(true);
  });
});

describe("atomicWriteJSON", () => {
  test("serializes with two-space indent and a trailing newline", () => {
    using dir = scratch();
    const target = join(dir.path, "state.json");

    atomicWriteJSON(target, { a: 1, b: [2, 3] });

    expect(readFileSync(target, "utf8")).toBe('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}\n');
  });

  test("a failed write leaves the previous file byte-identical", () => {
    using dir = scratch();
    const target = join(dir.path, "state.json");
    const previous = '{\n  "keep": true\n}\n';
    writeFileSync(target, previous);

    let threw = false;
    chmodSync(dir.path, 0o500);
    try {
      atomicWriteJSON(target, { keep: false });
    } catch {
      threw = true;
    } finally {
      chmodSync(dir.path, 0o700);
    }

    expect(readFileSync(target, "utf8")).toBe(previous);
    expect(threw).toBe(true);
  });
});
