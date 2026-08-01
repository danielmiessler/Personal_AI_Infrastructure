#!/usr/bin/env bun
/**
 * InstallHooks — Setup step 7 (trust-gated). Additively merges the payload's
 * `install/hooks/hooks.json` into the harness `settings.json`: per matcher
 * bucket, idempotent by normalized command (and url for http entries), never
 * touching foreign entries. Backs up settings.json before writing. REFUSES on a
 * dev tree (the author's live source) unless --allow-dev.
 *
 * The skill's Setup workflow shows the user the exact change (from the dry-run
 * counts) and gets explicit permission BEFORE calling this with --apply.
 *
 * Usage:
 *   bun InstallHooks.ts [--config-root <dir>] [--skill-root <dir>] [--apply] [--allow-dev]
 *   (dry-run by default — reports added/skipped without writing)
 */

import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { detectDevTree, mergeHooks } from "./InstallEngine";
import { atomicWriteText } from "./lib/atomic-write";

interface Args { configRoot: string; skillRoot: string; apply: boolean; allowDev: boolean; }

function parseArgs(): Args {
  const a = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const i = a.indexOf(flag);
    return i >= 0 && a[i + 1] && !a[i + 1].startsWith("--") ? a[i + 1] : undefined;
  };
  const home = process.env.HOME || "";
  return {
    configRoot: get("--config-root") || process.env.CLAUDE_CONFIG_DIR || join(home, ".claude"),
    skillRoot: get("--skill-root") || join(import.meta.dir, ".."),
    apply: a.includes("--apply"),
    allowDev: a.includes("--allow-dev"),
  };
}

function countFilesRec(dir: string): number {
  if (!existsSync(dir)) return 0;
  let n = 0;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) n += countFilesRec(p);
    else n += 1;
  }
  return n;
}

function main(): void {
  const { configRoot, skillRoot, apply, allowDev } = parseArgs();

  if (detectDevTree(configRoot) && !allowDev) {
    console.log(JSON.stringify({ ok: false, refused: "dev-tree", detail: `${configRoot} is a LifeOS source tree (dev-tree marker present) — refusing to mutate. Use --allow-dev only in a sandbox.` }, null, 2));
    process.exit(2);
  }

  const hooksJsonPath = join(skillRoot, "install", "hooks", "hooks.json");
  if (!existsSync(hooksJsonPath)) {
    console.log(JSON.stringify({ ok: false, error: `payload hooks.json not found at ${hooksJsonPath}` }, null, 2));
    process.exit(1);
  }
  const incoming = JSON.parse(readFileSync(hooksJsonPath, "utf-8"))?.hooks ?? {};

  // The hook SCRIPTS (*.hook.ts|sh + lib/**) live beside hooks.json in the payload.
  // Merging hooks.json into settings.json wires commands that point at these files,
  // so they MUST be copied onto disk too — else every hook resolves to a nonexistent
  // file (audit 20260702, RC2). Kept atomic with the settings merge (same opt-in +
  // trust-gate): decline hooks → neither scripts nor settings entries land.
  const hooksPayloadDir = join(skillRoot, "install", "hooks");
  const hooksDestDir = join(configRoot, "hooks");
  const hookFiles = countFilesRec(hooksPayloadDir);

  const settingsPath = join(configRoot, "settings.json");
  let settings: Record<string, unknown> = {};
  if (existsSync(settingsPath)) {
    try { settings = JSON.parse(readFileSync(settingsPath, "utf-8")); } catch { settings = {}; }
  }
  const existingHooks = (settings.hooks && typeof settings.hooks === "object" ? settings.hooks : {}) as Record<string, never>;

  const { merged, added, skipped } = mergeHooks(existingHooks as never, incoming);

  const report = { ok: true, apply, settingsPath, added, skipped, events: Object.keys(merged).length, hooksDestDir, hookFiles };

  if (!apply) {
    console.log(JSON.stringify({ ...report, dryRun: true, note: "no changes written; re-run with --apply after permission" }, null, 2));
    process.exit(0);
  }

  // Back up settings.json before writing (only if it exists).
  let backup: string | undefined;
  if (existsSync(settingsPath)) {
    backup = `${settingsPath}.lifeos-backup-${Date.now()}`;
    copyFileSync(settingsPath, backup);
  }
  settings.hooks = merged;
  // Atomic — a kill mid-write would leave the user with no settings.json at all
  // (public PR #1643, @elhoim)
  atomicWriteText(settingsPath, JSON.stringify(settings, null, 2) + "\n");

  // Deploy the hook scripts next to the merged settings (RC2): recursive copy of
  // the whole payload hooks/ tree (*.hook.ts|sh + lib/**) into <configRoot>/hooks/.
  // ADDITIVE, never clobbering (public issue #1491, @donovan-sec): `force: false`
  // skips any file that already exists on disk — a pre-existing user hook with a
  // colliding name is theirs, not ours. cpSync's default (force: true) silently
  // overwrote every collision, contradicting the documented contract.
  mkdirSync(hooksDestDir, { recursive: true });
  const preExisting = countFilesRec(hooksDestDir);
  cpSync(hooksPayloadDir, hooksDestDir, { recursive: true, force: false, errorOnExist: false });
  const hookFilesCopied = countFilesRec(hooksDestDir) - preExisting;
  const skippedExisting = hookFiles - hookFilesCopied;

  // Copying hook scripts and merging the manifest are two independent operations;
  // a hook can land on disk without any settings entry naming it. Ask the shipped
  // reconciler whether every copied hook is actually reachable, so an unwired hook
  // is loud at install time rather than silent until someone runs Doctor by hand.
  // (public PR #1540 + issue #1539, @tzioup)
  const doctorPath = join(configRoot, "LIFEOS", "TOOLS", "Doctor.ts");
  let unwired: string[] | undefined;
  let reconcile: string | undefined;
  if (existsSync(doctorPath)) {
    try {
      const out = execFileSync("bun", [doctorPath, "--reconcile"], {
        encoding: "utf-8",
        env: { ...process.env, CLAUDE_CONFIG_DIR: configRoot },
      });
      unwired = JSON.parse(out).unwired ?? [];
    } catch (err) {
      reconcile = `reconciler failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  } else {
    reconcile = `Doctor.ts not found at ${doctorPath} — hooks copied but not reconciled`;
  }

  console.log(JSON.stringify({ ...report, written: true, backup, hookFilesCopied, skippedExisting, unwired, reconcile }, null, 2));
  process.exit(0);
}

main();
