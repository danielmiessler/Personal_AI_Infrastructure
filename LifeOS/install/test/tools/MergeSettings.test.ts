/**
 * MergeSettings writes the harness settings file at SessionStart under a 15s
 * hook timeout. This asserts the write is all-or-nothing end to end: when the
 * write cannot complete, the previous settings.json is still there and still
 * loadable, instead of the truncated prefix a plain writeFileSync leaves.
 */
import { describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const MERGE_SETTINGS = join(import.meta.dir, "../../LIFEOS/TOOLS/MergeSettings.ts");

const SYSTEM = {
  hooks: { SessionStart: [{ matcher: "*", hooks: [{ type: "command", command: "true" }] }] },
  permissions: { allow: ["Read(**)"] },
  env: { EXAMPLE_VAR: "1" },
};
const USER = { permissions: { allow: ["Read(**)", "Write(**)"] } };

/** Disposable fake config root — never point a test at a real one. */
function fakeConfigRoot(): { home: string; configRoot: string } & Disposable {
  const home = mkdtempSync(join(tmpdir(), "lifeos-merge-settings-"));
  const configRoot = join(home, ".claude");
  mkdirSync(configRoot, { recursive: true });
  writeFileSync(join(configRoot, "settings.system.json"), JSON.stringify(SYSTEM, null, 2));
  writeFileSync(join(configRoot, "settings.user.json"), JSON.stringify(USER, null, 2));
  return {
    home,
    configRoot,
    [Symbol.dispose]() {
      rmSync(home, { recursive: true, force: true });
    },
  };
}

async function runMerge(root: { home: string; configRoot: string }, outputPath: string) {
  await using proc = Bun.spawn({
    cmd: [
      process.execPath,
      MERGE_SETTINGS,
      "--system",
      join(root.configRoot, "settings.system.json"),
      "--user",
      join(root.configRoot, "settings.user.json"),
      "--output",
      outputPath,
    ],
    // Scrubbed env: HOME is redirected so the merge snapshot lands in the
    // fixture, never in a real config root.
    env: { HOME: root.home, PATH: process.env.PATH ?? "", CI: "1", NO_COLOR: "1", TZ: "Etc/UTC" },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    proc.stdout.text(),
    proc.stderr.text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
}

describe("MergeSettings --output", () => {
  test("writes a settings file that parses", async () => {
    using root = fakeConfigRoot();
    const output = join(root.configRoot, "settings.json");

    const { exitCode } = await runMerge(root, output);

    expect(exitCode).toBe(0);
    expect(JSON.parse(readFileSync(output, "utf8")).permissions.allow).toEqual([
      "Read(**)",
      "Write(**)",
    ]);
  });

  test("a failed write leaves the previous settings.json byte-identical and valid", async () => {
    using root = fakeConfigRoot();
    const outDir = join(root.configRoot, "generated");
    mkdirSync(outDir, { recursive: true });
    const output = join(outDir, "settings.json");

    const previous = JSON.stringify({ hooks: {}, permissions: { allow: ["Read(**)"] } }, null, 2) + "\n";
    writeFileSync(output, previous);

    chmodSync(outDir, 0o500);
    let result;
    try {
      result = await runMerge(root, output);
    } finally {
      chmodSync(outDir, 0o700);
    }

    expect(result.exitCode).not.toBe(0);
    expect(readFileSync(output, "utf8")).toBe(previous);
    expect(() => JSON.parse(readFileSync(output, "utf8"))).not.toThrow();
  });
});
