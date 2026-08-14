#!/usr/bin/env bun
/**
 * ActivateImports — Setup step 8. Uncomments the identity `@`-imports in the
 * harness CLAUDE.md, each guarded by existsSync of its resolved target. The
 * template ships imports commented (`<!-- @LIFEOS/USER/... -->`) so they don't
 * error before USER is scaffolded; this activates only the ones whose target
 * now resolves. Refuses on a dev tree unless --allow-dev.
 *
 * Usage:
 *   bun ActivateImports.ts [--config-root <dir>] [--apply] [--allow-dev]
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { activateImports, detectDevTree } from "./InstallEngine";

function main(): void {
  const a = process.argv.slice(2);
  const get = (f: string): string | undefined => {
    const i = a.indexOf(f);
    return i >= 0 && a[i + 1] && !a[i + 1].startsWith("--") ? a[i + 1] : undefined;
  };
  const home = process.env.HOME || homedir(); // public issue #1729, @umair-a11y
  const configRoot = get("--config-root") || process.env.CLAUDE_CONFIG_DIR || join(home, ".claude");
  const apply = a.includes("--apply");
  const allowDev = a.includes("--allow-dev");

  if (detectDevTree(configRoot) && !allowDev) {
    console.log(JSON.stringify({ ok: false, refused: "dev-tree", detail: `${configRoot} is a source tree — refusing to edit CLAUDE.md.` }, null, 2));
    process.exit(2);
  }

  const claudeMd = join(configRoot, "CLAUDE.md");

  if (!apply) {
    // Dry-run: report which commented imports WOULD activate without writing.
    // activateImports only writes when activated.length>0, but to stay non-mutating
    // in dry-run we read + classify against a copy by pointing at a temp scan.
    if (!existsSync(claudeMd)) {
      console.log(JSON.stringify({ ok: false, error: `CLAUDE.md not found at ${claudeMd}` }, null, 2));
      process.exit(1);
    }
    const lines = readFileSync(claudeMd, "utf-8").split("\n");
    const commented = /^\s*#\s+(@[\w./-]+)\s*$|^\s*<!--\s*(@[\w./-]+)\s*-->\s*$/;
    const wouldActivate: string[] = [];
    const wouldSkip: string[] = [];
    for (const line of lines) {
      const m = line.match(commented);
      if (!m) continue;
      const imp = m[1] || m[2];
      const rel = imp.replace(/^@/, "");
      (existsSync(join(configRoot, rel)) ? wouldActivate : wouldSkip).push(imp);
    }
    console.log(JSON.stringify({ ok: true, dryRun: true, wouldActivate, wouldSkip }, null, 2));
    process.exit(0);
  }

  // public issue #1728, @rpriven — the --apply path reported ok:true even when
  // CLAUDE.md was absent: activateImports() returns empty rather than throwing,
  // so a missing file looked like a clean no-op. Mirror the dry-run guard.
  if (!existsSync(claudeMd)) {
    console.log(JSON.stringify({ ok: false, error: `CLAUDE.md not found at ${claudeMd}` }, null, 2));
    process.exit(1);
  }

  // `ok` means "ran without error", NOT "work happened" — a re-run over a
  // fully-activated CLAUDE.md is a success with nothing to do. `activated` and
  // `written` are the work signals; the note keeps a re-running agent from
  // reading an empty activation as failure.
  const { activated, skipped } = activateImports(claudeMd, configRoot);
  const written = activated.length > 0;
  const out: Record<string, unknown> = { ok: true, written, activated, skipped };
  if (!written) {
    // Two different no-op causes: nothing left to do (success), or dormant
    // imports whose targets don't resolve yet (success too, but not "done").
    out.note = skipped.length > 0
      ? `all imports already active; ${skipped.length} still dormant — target not found under ${configRoot}`
      : "all imports already active";
  }
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

main();
