import { expect, test } from "bun:test";
import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { substituteTree } from "../../../../Tools/InstallEngine";

test("substituteTree preserves executable file modes", () => {
  if (process.platform === "win32") return;

  const root = mkdtempSync(join(tmpdir(), "lifeos-substitute-"));
  const hook = join(root, "Example.hook.ts");

  try {
    writeFileSync(hook, "#!/usr/bin/env bun\nHello, {{PRINCIPAL_NAME}}!\n");
    chmodSync(hook, 0o755);
    const modeBefore = statSync(hook).mode & 0o777;

    const result = substituteTree(root, { "{{PRINCIPAL_NAME}}": "Ada" });

    expect(result).toEqual({ scanned: 1, modified: 1, applied: 1 });
    expect(readFileSync(hook, "utf8")).toContain("Hello, Ada!");
    expect(statSync(hook).mode & 0o777).toBe(modeBefore);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
