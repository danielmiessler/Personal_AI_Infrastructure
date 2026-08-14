#!/usr/bin/env bun
/**
 * InstallAtlas.ts — Materialize the Atlas tick unit(s) and bootstrap them.
 *
 *   bun ~/.claude/LIFEOS/ATLAS/InstallAtlas.ts             # install
 *   bun ~/.claude/LIFEOS/ATLAS/InstallAtlas.ts --uninstall # remove
 *   bun ~/.claude/LIFEOS/ATLAS/InstallAtlas.ts --status    # check
 *
 * Same two-backend pattern as LIFEOS/TOOLS/InstallWorkSweep.ts:
 *
 *   darwin: substitutes into com.lifeos.atlas.plist.template, writes
 *     ~/Library/LaunchAgents/com.lifeos.atlas.plist, runs `launchctl bootstrap`.
 *     15-minute StartInterval plus WatchPaths on the hint file, so a mutation
 *     captured by AtlasEventCapture.hook.ts triggers a targeted sync at once.
 *   linux: substitutes into com.lifeos.atlas.{service,timer}.template, writes them
 *     to ~/.config/systemd/user/, enables the timer with `systemctl --user`, and
 *     runs `loginctl enable-linger` so it survives logout. systemd has no WatchPaths
 *     equivalent here — hints wait for the next tick, which only costs latency.
 *
 * The darwin path is a second branch beside linux, never a replacement. Both are
 * idempotent: install tears down the prior unit before bootstrapping the fresh one.
 *
 * ported from public PR #1743, @schmetti-dev
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";

declare const Bun: { spawn: (cmd: string[], opts?: any) => any };

const HOME = process.env.HOME || "";
const LABEL = "com.lifeos.atlas";
const IS_LINUX = process.platform === "linux";
const IS_MACOS = process.platform === "darwin";

// darwin (launchd)
const TEMPLATE_PATH = join(HOME, ".claude", "LIFEOS", "ATLAS", "com.lifeos.atlas.plist.template");
const LAUNCH_AGENTS_DIR = join(HOME, "Library", "LaunchAgents");
const TARGET_PLIST = join(LAUNCH_AGENTS_DIR, `${LABEL}.plist`);

// linux (systemd --user)
const SERVICE_TEMPLATE_PATH = join(HOME, ".claude", "LIFEOS", "ATLAS", "com.lifeos.atlas.service.template");
const TIMER_TEMPLATE_PATH = join(HOME, ".claude", "LIFEOS", "ATLAS", "com.lifeos.atlas.timer.template");
const SYSTEMD_USER_DIR = join(HOME, ".config", "systemd", "user");
const TARGET_SERVICE = join(SYSTEMD_USER_DIR, `${LABEL}.service`);
const TARGET_TIMER = join(SYSTEMD_USER_DIR, `${LABEL}.timer`);
const TIMER_UNIT = `${LABEL}.timer`;

async function run(cmd: string[]): Promise<{ ok: boolean; out: string; err: string }> {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const exit = await proc.exited;
  return { ok: exit === 0, out, err };
}

async function uid(): Promise<string> {
  const proc = Bun.spawn(["id", "-u"], { stdout: "pipe", stderr: "ignore" });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out.trim();
}

async function username(): Promise<string> {
  // `id -un` rather than process.env.USER — USER isn't guaranteed to be set in a
  // non-interactive shell, and `loginctl enable-linger ""` fails on the empty string.
  const proc = Bun.spawn(["id", "-un"], { stdout: "pipe", stderr: "ignore" });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out.trim();
}

/** `which <bin>`, or null when it isn't on PATH. */
async function which(bin: string): Promise<string | null> {
  const proc = Bun.spawn(["which", bin], { stdout: "pipe", stderr: "ignore" });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out.trim() || null;
}

async function detectBun(): Promise<string> {
  // Survives different install paths (homebrew, ~/.bun, asdf). Hard requirement:
  // the unit's ExecStart IS bun, so there is nothing to degrade to.
  const path = await which("bun");
  if (!path) throw new Error("bun not found in PATH — install bun first");
  return path;
}

async function detectGh(): Promise<string | null> {
  // The github collector shells out to `gh`, so its directory is worth putting on
  // the unit's PATH — but a missing `gh` is a normal state, not a fault: Github.ts
  // already degrades to an incomplete run when the binary is absent, exactly like
  // Launchd.ts does for a missing ~/Library/LaunchAgents. Refusing to install the
  // whole Atlas tick because one of eight collectors can't reach its source would
  // be strictly worse than installing it and letting that collector report PARTIAL.
  const path = await which("gh");
  if (!path) console.warn("[InstallAtlas] gh not found in PATH — installing anyway; the github collector will report incomplete until it is installed");
  return path;
}

/**
 * Unit PATH: the detected tool dirs first, then the usual install prefixes.
 * Deduped in order, so a bun and gh that share a prefix (the common homebrew case)
 * don't emit that prefix twice, and an absent gh simply contributes nothing.
 */
function unitPath(bunDir: string, ghDir: string | null): string {
  const parts = [bunDir, ghDir, join(HOME, ".local/bin"), "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"];
  const seen = new Set<string>();
  return parts.filter((p): p is string => !!p && !seen.has(p) && (seen.add(p), true)).join(":");
}

function materialize(templatePath: string, bunPath: string, path: string): string {
  return readFileSync(templatePath, "utf-8")
    .replace(/\{\{HOME\}\}/g, HOME)
    .replace(/\{\{BUN\}\}/g, bunPath)
    .replace(/\{\{PATH\}\}/g, path);
}

async function detected(): Promise<{ bunPath: string; path: string }> {
  const bunPath = await detectBun();
  const ghPath = await detectGh();
  const path = unitPath(bunPath.replace(/\/bun$/, ""), ghPath?.replace(/\/gh$/, "") ?? null);
  console.log(`[InstallAtlas] detected bun at ${bunPath}${ghPath ? `, gh at ${ghPath}` : ""}`);
  return { bunPath, path };
}

// ── darwin (launchd) ──

async function install(): Promise<void> {
  if (!existsSync(TEMPLATE_PATH)) {
    console.error(`[InstallAtlas] template missing at ${TEMPLATE_PATH}`);
    process.exit(1);
  }
  const { bunPath, path } = await detected();
  const materialized = materialize(TEMPLATE_PATH, bunPath, path);
  if (!existsSync(LAUNCH_AGENTS_DIR)) mkdirSync(LAUNCH_AGENTS_DIR, { recursive: true });

  // Idempotent bootout (ignore failures — first install has nothing to remove)
  const u = await uid();
  if (existsSync(TARGET_PLIST)) {
    await run(["launchctl", "bootout", `gui/${u}`, TARGET_PLIST]);
  }

  writeFileSync(TARGET_PLIST, materialized);
  console.log(`[InstallAtlas] wrote ${TARGET_PLIST}`);

  const r = await run(["launchctl", "bootstrap", `gui/${u}`, TARGET_PLIST]);
  if (!r.ok) {
    console.error(`[InstallAtlas] bootstrap failed: ${r.err.trim()}`);
    process.exit(1);
  }
  console.log(`[InstallAtlas] launchd bootstrap OK — ${LABEL} active`);

  const status = await run(["launchctl", "print", `gui/${u}/${LABEL}`]);
  if (status.ok) {
    const stateLine = status.out.split("\n").find((l) => l.includes("state ="));
    console.log(`[InstallAtlas] ${stateLine?.trim() ?? "state unknown"}`);
  }
}

async function uninstall(): Promise<void> {
  const u = await uid();
  if (existsSync(TARGET_PLIST)) {
    const r = await run(["launchctl", "bootout", `gui/${u}`, TARGET_PLIST]);
    console.log(`[InstallAtlas] bootout ${r.ok ? "OK" : "FAILED: " + r.err.trim()}`);
    try { unlinkSync(TARGET_PLIST); console.log(`[InstallAtlas] removed ${TARGET_PLIST}`); } catch {}
  } else {
    console.log(`[InstallAtlas] no plist at ${TARGET_PLIST} — nothing to do`);
  }
}

async function status(): Promise<void> {
  const u = await uid();
  const r = await run(["launchctl", "print", `gui/${u}/${LABEL}`]);
  if (!r.ok) {
    console.log(`[InstallAtlas] ${LABEL} not loaded`);
    process.exit(1);
  }
  console.log(r.out);
}

// ── linux (systemd --user) ──

async function installLinux(): Promise<void> {
  if (!existsSync(SERVICE_TEMPLATE_PATH) || !existsSync(TIMER_TEMPLATE_PATH)) {
    console.error(`[InstallAtlas] template missing — expected ${SERVICE_TEMPLATE_PATH} and ${TIMER_TEMPLATE_PATH}`);
    process.exit(1);
  }
  const { bunPath, path } = await detected();

  if (!existsSync(SYSTEMD_USER_DIR)) mkdirSync(SYSTEMD_USER_DIR, { recursive: true });

  // Idempotent teardown (ignore failures — first install has nothing to remove)
  await run(["systemctl", "--user", "disable", "--now", TIMER_UNIT]);

  writeFileSync(TARGET_SERVICE, materialize(SERVICE_TEMPLATE_PATH, bunPath, path));
  writeFileSync(TARGET_TIMER, materialize(TIMER_TEMPLATE_PATH, bunPath, path));
  console.log(`[InstallAtlas] wrote ${TARGET_SERVICE}`);
  console.log(`[InstallAtlas] wrote ${TARGET_TIMER}`);

  await run(["systemctl", "--user", "daemon-reload"]);

  // Survive logout/reboot. An empty username would make `enable-linger` fail, so skip loudly.
  const lingerUser = await username();
  if (lingerUser) await run(["loginctl", "enable-linger", lingerUser]);
  else console.warn("[InstallAtlas] could not resolve username via 'id -un' — skipping loginctl enable-linger (timer may not survive logout)");

  const r = await run(["systemctl", "--user", "enable", "--now", TIMER_UNIT]);
  if (!r.ok) {
    console.error(`[InstallAtlas] enable --now failed: ${r.err.trim()}`);
    process.exit(1);
  }
  console.log(`[InstallAtlas] systemd timer enabled — ${TIMER_UNIT} active`);

  const list = await run(["systemctl", "--user", "list-timers", TIMER_UNIT, "--no-pager"]);
  if (list.ok) console.log(list.out.trim());
}

async function uninstallLinux(): Promise<void> {
  await run(["systemctl", "--user", "disable", "--now", TIMER_UNIT]);
  let removed = false;
  for (const f of [TARGET_SERVICE, TARGET_TIMER]) {
    if (existsSync(f)) {
      try { unlinkSync(f); console.log(`[InstallAtlas] removed ${f}`); removed = true; } catch {}
    }
  }
  if (!removed) console.log(`[InstallAtlas] no unit files found — nothing to do`);
  await run(["systemctl", "--user", "daemon-reload"]);
}

async function statusLinux(): Promise<void> {
  const r = await run(["systemctl", "--user", "status", TIMER_UNIT, "--no-pager"]);
  console.log(r.out || r.err);
  const list = await run(["systemctl", "--user", "list-timers", TIMER_UNIT, "--no-pager"]);
  if (list.ok) console.log(list.out.trim());
  if (!r.ok) process.exit(1);
}

function unsupported(): never {
  console.error(`[InstallAtlas] unsupported platform: ${process.platform} (macOS and Linux only)`);
  process.exit(1);
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (!IS_LINUX && !IS_MACOS) unsupported();
  if (arg === "--uninstall") return IS_LINUX ? uninstallLinux() : uninstall();
  if (arg === "--status") return IS_LINUX ? statusLinux() : status();
  return IS_LINUX ? installLinux() : install();
}

if (import.meta.main) {
  main().catch((err) => { console.error(`[InstallAtlas] Fatal: ${err}`); process.exit(1); });
}
