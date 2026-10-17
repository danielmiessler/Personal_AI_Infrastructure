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
import { homedir } from "node:os";
import { detectDevTree, filterHooksForHarness, KNOWN_HARNESSES, mergeHooks, type HooksMap, type HookEntry, type MatcherGroup } from "./InstallEngine";
import { atomicWriteText } from "./lib/atomic-write";

interface Args { configRoot: string; skillRoot: string; apply: boolean; allowDev: boolean; harness: string; }

function parseArgs(): Args {
  const a = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const i = a.indexOf(flag);
    return i >= 0 && a[i + 1] && !a[i + 1].startsWith("--") ? a[i + 1] : undefined;
  };
  const home = process.env.HOME || homedir(); // public issue #1729, @umair-a11y
  return {
    configRoot: get("--config-root") || process.env.CLAUDE_CONFIG_DIR || join(home, ".claude"),
    skillRoot: get("--skill-root") || join(import.meta.dir, ".."),
    apply: a.includes("--apply"),
    allowDev: a.includes("--allow-dev"),
    // The target harness (from DetectEnv.harness.name). Defaults to claude-code —
    // the payload's native format — so existing invocations are unchanged.
    harness: get("--harness") || "claude-code",
  };
}

/**
 * hooks.json ships the canonical Claude Code command form (`$HOME/.claude/...`).
 * Any other config root (AdaL's ~/.adal, a CLAUDE_CONFIG_DIR override, an
 * OpenCode/Cursor install) must get those prefixes rewritten to the real root,
 * else the scripts are copied into <configRoot>/hooks/ while settings.json
 * points at $HOME/.claude/hooks/ — every wired hook resolves into the wrong
 * tree. Idempotent: when the root IS ~/.claude the map is returned untouched,
 * so the Claude Code path is byte-identical to before.
 */
function rewriteHookCommandPaths(incoming: HooksMap, configRoot: string, home: string): HooksMap {
  if (configRoot === join(home, ".claude")) return incoming;
  const out: HooksMap = {};
  for (const [event, groups] of Object.entries(incoming)) {
    out[event] = (groups ?? []).map((g: MatcherGroup) => ({
      ...g,
      hooks: (Array.isArray(g.hooks) ? g.hooks : []).map((h: HookEntry) =>
        typeof h.command === "string"
          ? { ...h, command: h.command.split("$HOME/.claude/").join(`${configRoot}/`) }
          : h,
      ),
    }));
  }
  return out;
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
  const { configRoot, skillRoot, apply, allowDev, harness } = parseArgs();

  // A typo'd --harness must fail LOUD, not fall through to "unknown profile →
  // merge everything": an unrecognized name silently disabling the capability
  // filter is exactly the failure mode this flag exists to prevent.
  if (!(KNOWN_HARNESSES as readonly string[]).includes(harness)) {
    console.log(JSON.stringify({ ok: false, error: `unknown harness "${harness}" — expected one of: ${KNOWN_HARNESSES.join(", ")}` }, null, 2));
    process.exit(2);
  }

  if (detectDevTree(configRoot) && !allowDev) {
    console.log(JSON.stringify({ ok: false, refused: "dev-tree", detail: `${configRoot} is a LifeOS source tree (dev-tree marker present) — refusing to mutate. Use --allow-dev only in a sandbox.` }, null, 2));
    process.exit(2);
  }

  const hooksJsonPath = join(skillRoot, "install", "hooks", "hooks.json");
  if (!existsSync(hooksJsonPath)) {
    console.log(JSON.stringify({ ok: false, error: `payload hooks.json not found at ${hooksJsonPath}` }, null, 2));
    process.exit(1);
  }
  const incoming = rewriteHookCommandPaths(JSON.parse(readFileSync(hooksJsonPath, "utf-8"))?.hooks ?? {}, configRoot, process.env.HOME || homedir());

  // Reduce to what the target harness can actually load BEFORE counting or
  // merging. For harnesses with a restricted hook profile (AdaL: six command
  // events only — it rejects unknown event names at startup and supports no
  // non-command hook types) this drops the rest and reports exactly what was
  // dropped, so the trust-gate shows the user the true final state of their
  // settings.json rather than a plan the harness would refuse to boot.
  const { filtered, droppedEvents, droppedEntries } = filterHooksForHarness(incoming, harness as Parameters<typeof filterHooksForHarness>[1]);

  // The hook SCRIPTS (*.hook.ts|sh + lib/**) live beside hooks.json in the payload.
  // Merging hooks.json into settings.json wires commands that point at these files,
  // so they MUST be copied onto disk too — else every hook resolves to a nonexistent
  // file (audit 20260702, RC2). Kept atomic with the settings merge (same opt-in +
  // trust-gate): decline hooks → neither scripts nor settings entries land.
  const hooksPayloadDir = join(skillRoot, "install", "hooks");
  const hooksDestDir = join(configRoot, "hooks");
  const hookFiles = countFilesRec(hooksPayloadDir);

  // Hook SCRIPTS are Claude-Code-root-bound today: most resolve the LifeOS tree
  // as homedir()/.claude in code (no env override), so on any other config root
  // they fail open (no-op on missing paths) — or, if a Claude Code LifeOS
  // install exists, they would act on THAT tree instead of this harness's.
  // Surface both facts in the report so the trust-gate shows real functionality,
  // not just valid settings. (See INSTALL.md §6 "AdaL".)
  const claudeCodeLifeosDetected =
    harness !== "claude-code" && existsSync(join(process.env.HOME || homedir(), ".claude", "LIFEOS", "VERSION"));

  const settingsPath = join(configRoot, "settings.json");
  let settings: Record<string, unknown> = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch (e) {
      // ABORT on an unparseable EXISTING settings.json — never reset to {}.
      // The prior `catch { settings = {} }` silently dropped model / permissions /
      // env / statusLine and wrote a file containing ONLY "hooks", destroying the
      // user's Claude Code config on the most common hand-edit error (a trailing
      // comma). Fresh-install data loss. (Forge cross-vendor audit 2026-08-11)
      console.log(JSON.stringify({
        ok: false, apply, settingsPath,
        error: `settings.json exists but is not valid JSON: ${e instanceof Error ? e.message : String(e)}. Refusing to write — fix the file (a trailing comma or a comment is the usual cause) and re-run. Your settings were NOT modified.`,
      }, null, 2));
      process.exit(1);
    }
  }
  const existingHooks = (settings.hooks && typeof settings.hooks === "object" ? settings.hooks : {}) as Record<string, never>;

  const { merged, added, skipped } = mergeHooks(existingHooks as never, filtered);

  const report = {
    ok: true, apply, harness, settingsPath, added, skipped, droppedEvents, droppedEntries,
    events: Object.keys(merged).length, hooksDestDir, hookFiles,
    ...(harness !== "claude-code"
      ? {
          scriptRootNote: "hook scripts resolve the LifeOS tree as ~/.claude in code (no env override); on this config root they fail open until hooks become root-portable upstream" + (claudeCodeLifeosDetected ? " — WARNING: a Claude Code LifeOS install was detected, so these scripts would act on THAT tree, not this one" : ""),
          claudeCodeLifeosDetected,
        }
      : {}),
  };

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
  // Deploy the hook scripts FIRST, THEN wire settings — the install is not
  // transactional across the two mutations, so ordering is the guard: a copy
  // failure must never leave settings.json pointing at hooks that aren't on
  // disk. The settings write below is the last mutation and is itself atomic
  // (temp+rename), so a kill leaves settings either fully-old or fully-new,
  // never wired-to-absent. (Forge cross-vendor audit 2026-08-11, [D])
  //
  // Recursive copy of the whole payload hooks/ tree (*.hook.ts|sh + lib/**) into
  // <configRoot>/hooks/. ADDITIVE, never clobbering (public issue #1491,
  // @donovan-sec): `force: false` skips any file that already exists on disk — a
  // pre-existing user hook with a colliding name is theirs, not ours. cpSync's
  // default (force: true) silently overwrote every collision.
  mkdirSync(hooksDestDir, { recursive: true });
  const preExisting = countFilesRec(hooksDestDir);
  cpSync(hooksPayloadDir, hooksDestDir, { recursive: true, force: false, errorOnExist: false });
  const hookFilesCopied = countFilesRec(hooksDestDir) - preExisting;
  const skippedExisting = hookFiles - hookFilesCopied;

  settings.hooks = merged;
  // Atomic — a kill mid-write would leave the user with no settings.json at all
  // (public PR #1643, @elhoim)
  atomicWriteText(settingsPath, JSON.stringify(settings, null, 2) + "\n");

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
