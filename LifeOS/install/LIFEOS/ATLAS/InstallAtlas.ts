#!/usr/bin/env bun
/**
 * InstallAtlas.ts — Materialize the Atlas tick unit(s) and bootstrap them.
 *
 *   bun ~/.claude/LIFEOS/ATLAS/InstallAtlas.ts             # install
 *   bun ~/.claude/LIFEOS/ATLAS/InstallAtlas.ts --uninstall # remove
 *   bun ~/.claude/LIFEOS/ATLAS/InstallAtlas.ts --status    # check
 *
 * Same two-backend pattern as LIFEOS/TOOLS/InstallWorkSweep.ts (macOS launchd,
 * Linux systemd --user, `id -un` + loginctl enable-linger so the Linux timer
 * survives logout — the gap found in InstallWorkSweep.ts on 2026-08-03).
 *
 * macOS: materializes com.lifeos.atlas.plist.template into ~/Library/LaunchAgents/.
 * Linux: materializes com.lifeos.atlas.{service,timer}.template into
 * ~/.config/systemd/user/ — the timer fires `atlas tick` every 15 minutes;
 * Atlas.ts's own lastFullSyncAt() gate means most ticks just process hint
 * events cheaply and only run a real full sync once an hour is due.
 * Other platforms: unsupported, exits loud rather than silently no-op.
 *
 * Idempotent. Re-running install bootouts/stops the prior load before
 * bootstrapping/starting the fresh unit(s).
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";

declare const Bun: { spawn: (cmd: string[], opts?: any) => any };

const HOME = process.env.HOME || "";
const LABEL = "com.lifeos.atlas";
const IS_LINUX = process.platform === "linux";
const IS_MACOS = process.platform === "darwin";

// macOS (launchd)
const TEMPLATE_PATH = join(HOME, ".claude", "LIFEOS", "ATLAS", "com.lifeos.atlas.plist.template");
const LAUNCH_AGENTS_DIR = join(HOME, "Library", "LaunchAgents");
const TARGET_PLIST = join(LAUNCH_AGENTS_DIR, "com.lifeos.atlas.plist");

// Linux (systemd --user)
const SYSTEMD_USER_DIR = join(HOME, ".config", "systemd", "user");
const SERVICE_TEMPLATE_PATH = join(HOME, ".claude", "LIFEOS", "ATLAS", "com.lifeos.atlas.service.template");
const TIMER_TEMPLATE_PATH = join(HOME, ".claude", "LIFEOS", "ATLAS", "com.lifeos.atlas.timer.template");
const TARGET_SERVICE = join(SYSTEMD_USER_DIR, "com.lifeos.atlas.service");
const TARGET_TIMER = join(SYSTEMD_USER_DIR, "com.lifeos.atlas.timer");

async function uid(): Promise<string> {
  const proc = Bun.spawn(["id", "-u"], { stdout: "pipe", stderr: "ignore" });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out.trim();
}

async function username(): Promise<string> {
  // `id -un` over process.env.USER — see InstallWorkSweep.ts's 2026-08-03 fix.
  const proc = Bun.spawn(["id", "-un"], { stdout: "pipe", stderr: "ignore" });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out.trim();
}

async function launchctl(args: string[]): Promise<{ ok: boolean; out: string; err: string }> {
  const proc = Bun.spawn(["launchctl", ...args], { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const exit = await proc.exited;
  return { ok: exit === 0, out, err };
}

async function detectBun(): Promise<string> {
  const proc = Bun.spawn(["which", "bun"], { stdout: "pipe", stderr: "ignore" });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  const path = out.trim();
  if (!path) throw new Error("bun not found in PATH — install bun first");
  return path;
}

async function detectGh(): Promise<string> {
  // The github collector shells out to `gh`; widen the unit's PATH the same
  // way InstallWorkSweep.ts does for WorkSweep.ts's own gh calls.
  const proc = Bun.spawn(["which", "gh"], { stdout: "pipe", stderr: "ignore" });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  const path = out.trim();
  if (!path) throw new Error("gh not found in PATH — install the GitHub CLI first");
  return path;
}

async function systemctl(args: string[]): Promise<{ ok: boolean; out: string; err: string }> {
  const proc = Bun.spawn(["systemctl", "--user", ...args], { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const exit = await proc.exited;
  return { ok: exit === 0, out, err };
}

async function installLaunchd(): Promise<void> {
  if (!existsSync(TEMPLATE_PATH)) {
    console.error(`[InstallAtlas] template missing at ${TEMPLATE_PATH}`);
    process.exit(1);
  }
  const bunPath = await detectBun();
  const bunDir = bunPath.replace(/\/bun$/, "");
  const ghPath = await detectGh();
  const ghDir = ghPath.replace(/\/gh$/, "");
  console.log(`[InstallAtlas] detected bun at ${bunPath}, gh at ${ghPath}`);
  const template = readFileSync(TEMPLATE_PATH, "utf-8");
  const materialized = template
    .replace(/\{\{HOME\}\}/g, HOME)
    .replace(/\{\{BUN\}\}/g, bunPath)
    .replace(/\{\{BUN_DIR\}\}/g, bunDir)
    .replace(/\{\{GH_DIR\}\}/g, ghDir);
  if (!existsSync(LAUNCH_AGENTS_DIR)) mkdirSync(LAUNCH_AGENTS_DIR, { recursive: true });

  const u = await uid();
  if (existsSync(TARGET_PLIST)) {
    await launchctl(["bootout", `gui/${u}`, TARGET_PLIST]);
  }

  writeFileSync(TARGET_PLIST, materialized);
  console.log(`[InstallAtlas] wrote ${TARGET_PLIST}`);

  const r = await launchctl(["bootstrap", `gui/${u}`, TARGET_PLIST]);
  if (!r.ok) {
    console.error(`[InstallAtlas] bootstrap failed: ${r.err.trim()}`);
    process.exit(1);
  }
  console.log(`[InstallAtlas] launchd bootstrap OK — ${LABEL} active`);

  const status = await launchctl(["print", `gui/${u}/${LABEL}`]);
  if (status.ok) {
    const stateLine = status.out.split("\n").find((l) => l.includes("state ="));
    console.log(`[InstallAtlas] ${stateLine?.trim() ?? "state unknown"}`);
  }
}

async function installSystemd(): Promise<void> {
  if (!existsSync(SERVICE_TEMPLATE_PATH) || !existsSync(TIMER_TEMPLATE_PATH)) {
    console.error(`[InstallAtlas] template(s) missing at ${SERVICE_TEMPLATE_PATH} / ${TIMER_TEMPLATE_PATH}`);
    process.exit(1);
  }
  const bunPath = await detectBun();
  const bunDir = bunPath.replace(/\/bun$/, "");
  const ghPath = await detectGh();
  const ghDir = ghPath.replace(/\/gh$/, "");
  console.log(`[InstallAtlas] detected bun at ${bunPath}, gh at ${ghPath}`);
  const sub = (s: string) => s.replace(/\{\{HOME\}\}/g, HOME).replace(/\{\{BUN\}\}/g, bunPath).replace(/\{\{BUN_DIR\}\}/g, bunDir).replace(/\{\{GH_DIR\}\}/g, ghDir);
  const service = sub(readFileSync(SERVICE_TEMPLATE_PATH, "utf-8"));
  const timer = sub(readFileSync(TIMER_TEMPLATE_PATH, "utf-8"));
  if (!existsSync(SYSTEMD_USER_DIR)) mkdirSync(SYSTEMD_USER_DIR, { recursive: true });

  await systemctl(["stop", `${LABEL}.timer`]);

  writeFileSync(TARGET_SERVICE, service);
  writeFileSync(TARGET_TIMER, timer);
  console.log(`[InstallAtlas] wrote ${TARGET_SERVICE} and ${TARGET_TIMER}`);

  await systemctl(["daemon-reload"]);

  // Survive logout/reboot — see InstallWorkSweep.ts's 2026-08-03 fix for why.
  const lingerUser = await username();
  if (lingerUser) {
    const linger = Bun.spawn(["loginctl", "enable-linger", lingerUser], { stdout: "ignore", stderr: "pipe" });
    await linger.exited;
  } else {
    console.error(`[InstallAtlas] could not resolve username via 'id -un' — skipping loginctl enable-linger (timer may not survive logout)`);
  }

  const r = await systemctl(["enable", "--now", `${LABEL}.timer`]);
  if (!r.ok) {
    console.error(`[InstallAtlas] systemctl enable failed: ${r.err.trim()}`);
    process.exit(1);
  }
  console.log(`[InstallAtlas] systemd timer enabled — ${LABEL}.timer active`);

  const status = await systemctl(["is-active", `${LABEL}.timer`]);
  console.log(`[InstallAtlas] ${LABEL}.timer state: ${status.out.trim() || "unknown"}`);
}

async function uninstallLaunchd(): Promise<void> {
  const u = await uid();
  if (existsSync(TARGET_PLIST)) {
    const r = await launchctl(["bootout", `gui/${u}`, TARGET_PLIST]);
    console.log(`[InstallAtlas] bootout ${r.ok ? "OK" : "FAILED: " + r.err.trim()}`);
    try { unlinkSync(TARGET_PLIST); console.log(`[InstallAtlas] removed ${TARGET_PLIST}`); } catch {}
  } else {
    console.log(`[InstallAtlas] no plist at ${TARGET_PLIST} — nothing to do`);
  }
}

async function uninstallSystemd(): Promise<void> {
  if (existsSync(TARGET_TIMER) || existsSync(TARGET_SERVICE)) {
    const r = await systemctl(["disable", "--now", `${LABEL}.timer`]);
    console.log(`[InstallAtlas] disable ${r.ok ? "OK" : "FAILED: " + r.err.trim()}`);
    try { unlinkSync(TARGET_TIMER); } catch {}
    try { unlinkSync(TARGET_SERVICE); } catch {}
    await systemctl(["daemon-reload"]);
    console.log(`[InstallAtlas] removed ${TARGET_SERVICE} and ${TARGET_TIMER}`);
  } else {
    console.log(`[InstallAtlas] no unit at ${TARGET_TIMER} — nothing to do`);
  }
}

async function statusLaunchd(): Promise<void> {
  const u = await uid();
  const r = await launchctl(["print", `gui/${u}/${LABEL}`]);
  if (!r.ok) {
    console.log(`[InstallAtlas] ${LABEL} not loaded`);
    process.exit(1);
  }
  console.log(r.out);
}

async function statusSystemd(): Promise<void> {
  const r = await systemctl(["status", `${LABEL}.timer`, "--no-pager"]);
  if (!r.out.trim() && !r.err.trim()) {
    console.log(`[InstallAtlas] ${LABEL}.timer not found`);
    process.exit(1);
  }
  console.log(r.out || r.err);
}

async function install(): Promise<void> {
  if (IS_LINUX) return installSystemd();
  if (IS_MACOS) return installLaunchd();
  console.error(`[InstallAtlas] unsupported platform: ${process.platform} (macOS and Linux only)`);
  process.exit(1);
}

async function uninstall(): Promise<void> {
  if (IS_LINUX) return uninstallSystemd();
  if (IS_MACOS) return uninstallLaunchd();
  console.error(`[InstallAtlas] unsupported platform: ${process.platform} (macOS and Linux only)`);
  process.exit(1);
}

async function status(): Promise<void> {
  if (IS_LINUX) return statusSystemd();
  if (IS_MACOS) return statusLaunchd();
  console.error(`[InstallAtlas] unsupported platform: ${process.platform} (macOS and Linux only)`);
  process.exit(1);
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (arg === "--uninstall") return uninstall();
  if (arg === "--status") return status();
  return install();
}

if (import.meta.main) {
  main().catch((err) => { console.error(`[InstallAtlas] Fatal: ${err}`); process.exit(1); });
}
