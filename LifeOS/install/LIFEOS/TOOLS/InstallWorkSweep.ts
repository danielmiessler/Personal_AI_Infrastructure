#!/usr/bin/env bun
/**
 * InstallWorkSweep.ts — Materialize the WorkSweep scheduler unit(s) and bootstrap them.
 *
 *   bun ~/.claude/LIFEOS/TOOLS/InstallWorkSweep.ts             # install
 *   bun ~/.claude/LIFEOS/TOOLS/InstallWorkSweep.ts --uninstall # remove
 *   bun ~/.claude/LIFEOS/TOOLS/InstallWorkSweep.ts --status    # check
 *
 * Two backends, chosen by `process.platform` (same pattern as
 * LIFEOS/PULSE/manage.sh — macOS uses launchd, Linux uses systemd --user):
 *
 *  - darwin: materializes com.lifeos.worksweep.plist.template into
 *    ~/Library/LaunchAgents/ and bootstraps it with launchctl.
 *  - linux: materializes com.lifeos.worksweep.{service,timer}.template into
 *    ~/.config/systemd/user/ and enables the timer with systemctl --user.
 *    Requires `loginctl enable-linger $USER` for the timer to survive logout
 *    (same requirement PULSE/manage.sh documents for com.lifeos.pulse).
 *
 * Both back ends read $HOME + `which bun` at install time, substitute
 * {{HOME}}/{{BUN}}/{{BUN_DIR}} placeholders, and are idempotent — re-running
 * install tears down the prior unit before installing the fresh one.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";

declare const Bun: { spawn: (cmd: string[], opts?: any) => any };

const HOME = process.env.HOME || "";
const LABEL = "com.lifeos.worksweep";
const IS_LINUX = process.platform === "linux";

// ── darwin (launchd) paths ──
const PLIST_TEMPLATE_PATH = join(HOME, ".claude", "LIFEOS", "TOOLS", "com.lifeos.worksweep.plist.template");
const LAUNCH_AGENTS_DIR = join(HOME, "Library", "LaunchAgents");
const TARGET_PLIST = join(LAUNCH_AGENTS_DIR, `${LABEL}.plist`);

// ── linux (systemd --user) paths ──
const SERVICE_TEMPLATE_PATH = join(HOME, ".claude", "LIFEOS", "TOOLS", "com.lifeos.worksweep.service.template");
const TIMER_TEMPLATE_PATH = join(HOME, ".claude", "LIFEOS", "TOOLS", "com.lifeos.worksweep.timer.template");
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
  const r = await run(["id", "-u"]);
  return r.out.trim();
}

async function username(): Promise<string> {
  // Prefer `id -un` over process.env.USER — USER isn't guaranteed to be set
  // in every invoking environment (e.g. some non-interactive shells), and an
  // empty string would make `loginctl enable-linger ""` fail silently.
  const r = await run(["id", "-un"]);
  return r.out.trim();
}

async function detectBun(): Promise<string> {
  // Detect bun via `which bun` — survives different install paths (homebrew, ~/.bun, asdf).
  const r = await run(["which", "bun"]);
  const path = r.out.trim();
  if (!path) throw new Error("bun not found in PATH — install bun first");
  return path;
}

function materialize(templatePath: string, bunPath: string, bunDir: string): string {
  const template = readFileSync(templatePath, "utf-8");
  return template
    .replace(/\{\{HOME\}\}/g, HOME)
    .replace(/\{\{BUN\}\}/g, bunPath)
    .replace(/\{\{BUN_DIR\}\}/g, bunDir);
}

// ── darwin (launchd) ──

async function installDarwin(): Promise<void> {
  if (!existsSync(PLIST_TEMPLATE_PATH)) {
    console.error(`[InstallWorkSweep] template missing at ${PLIST_TEMPLATE_PATH}`);
    process.exit(1);
  }
  const bunPath = await detectBun();
  const bunDir = bunPath.replace(/\/bun$/, "");
  console.log(`[InstallWorkSweep] detected bun at ${bunPath}`);
  const materialized = materialize(PLIST_TEMPLATE_PATH, bunPath, bunDir);
  if (!existsSync(LAUNCH_AGENTS_DIR)) mkdirSync(LAUNCH_AGENTS_DIR, { recursive: true });

  // Idempotent bootout (ignore failures — first install has nothing to remove)
  const u = await uid();
  if (existsSync(TARGET_PLIST)) {
    await run(["launchctl", "bootout", `gui/${u}`, TARGET_PLIST]);
  }

  writeFileSync(TARGET_PLIST, materialized);
  console.log(`[InstallWorkSweep] wrote ${TARGET_PLIST}`);

  const r = await run(["launchctl", "bootstrap", `gui/${u}`, TARGET_PLIST]);
  if (!r.ok) {
    console.error(`[InstallWorkSweep] bootstrap failed: ${r.err.trim()}`);
    process.exit(1);
  }
  console.log(`[InstallWorkSweep] launchd bootstrap OK — ${LABEL} active`);

  const status = await run(["launchctl", "print", `gui/${u}/${LABEL}`]);
  if (status.ok) {
    const stateLine = status.out.split("\n").find((l) => l.includes("state ="));
    console.log(`[InstallWorkSweep] ${stateLine?.trim() ?? "state unknown"}`);
  }
}

async function uninstallDarwin(): Promise<void> {
  const u = await uid();
  if (existsSync(TARGET_PLIST)) {
    const r = await run(["launchctl", "bootout", `gui/${u}`, TARGET_PLIST]);
    console.log(`[InstallWorkSweep] bootout ${r.ok ? "OK" : "FAILED: " + r.err.trim()}`);
    try { unlinkSync(TARGET_PLIST); console.log(`[InstallWorkSweep] removed ${TARGET_PLIST}`); } catch {}
  } else {
    console.log(`[InstallWorkSweep] no plist at ${TARGET_PLIST} — nothing to do`);
  }
}

async function statusDarwin(): Promise<void> {
  const u = await uid();
  const r = await run(["launchctl", "print", `gui/${u}/${LABEL}`]);
  if (!r.ok) {
    console.log(`[InstallWorkSweep] ${LABEL} not loaded`);
    process.exit(1);
  }
  console.log(r.out);
}

// ── linux (systemd --user) ──

async function installLinux(): Promise<void> {
  if (!existsSync(SERVICE_TEMPLATE_PATH) || !existsSync(TIMER_TEMPLATE_PATH)) {
    console.error(`[InstallWorkSweep] template missing — expected ${SERVICE_TEMPLATE_PATH} and ${TIMER_TEMPLATE_PATH}`);
    process.exit(1);
  }
  const bunPath = await detectBun();
  const bunDir = bunPath.replace(/\/bun$/, "");
  console.log(`[InstallWorkSweep] detected bun at ${bunPath}`);

  if (!existsSync(SYSTEMD_USER_DIR)) mkdirSync(SYSTEMD_USER_DIR, { recursive: true });

  // Idempotent teardown (ignore failures — first install has nothing to remove)
  await run(["systemctl", "--user", "disable", "--now", TIMER_UNIT]);

  writeFileSync(TARGET_SERVICE, materialize(SERVICE_TEMPLATE_PATH, bunPath, bunDir));
  writeFileSync(TARGET_TIMER, materialize(TIMER_TEMPLATE_PATH, bunPath, bunDir));
  console.log(`[InstallWorkSweep] wrote ${TARGET_SERVICE}`);
  console.log(`[InstallWorkSweep] wrote ${TARGET_TIMER}`);

  await run(["systemctl", "--user", "daemon-reload"]);

  // Survive logout/reboot, same requirement PULSE/manage.sh documents for com.lifeos.pulse.
  await run(["loginctl", "enable-linger", await username()]);

  const r = await run(["systemctl", "--user", "enable", "--now", TIMER_UNIT]);
  if (!r.ok) {
    console.error(`[InstallWorkSweep] enable --now failed: ${r.err.trim()}`);
    process.exit(1);
  }
  console.log(`[InstallWorkSweep] systemd timer enabled — ${TIMER_UNIT} active`);

  const list = await run(["systemctl", "--user", "list-timers", TIMER_UNIT, "--no-pager"]);
  if (list.ok) console.log(list.out.trim());
}

async function uninstallLinux(): Promise<void> {
  await run(["systemctl", "--user", "disable", "--now", TIMER_UNIT]);
  let removed = false;
  for (const f of [TARGET_SERVICE, TARGET_TIMER]) {
    if (existsSync(f)) {
      try { unlinkSync(f); console.log(`[InstallWorkSweep] removed ${f}`); removed = true; } catch {}
    }
  }
  if (!removed) console.log(`[InstallWorkSweep] no unit files found — nothing to do`);
  await run(["systemctl", "--user", "daemon-reload"]);
}

async function statusLinux(): Promise<void> {
  const r = await run(["systemctl", "--user", "status", TIMER_UNIT, "--no-pager"]);
  console.log(r.out || r.err);
  const list = await run(["systemctl", "--user", "list-timers", TIMER_UNIT, "--no-pager"]);
  if (list.ok) console.log(list.out.trim());
  if (!r.ok) process.exit(1);
}

// ── dispatch ──

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (arg === "--uninstall") return IS_LINUX ? uninstallLinux() : uninstallDarwin();
  if (arg === "--status") return IS_LINUX ? statusLinux() : statusDarwin();
  return IS_LINUX ? installLinux() : installDarwin();
}

if (import.meta.main) {
  main().catch((err) => { console.error(`[InstallWorkSweep] Fatal: ${err}`); process.exit(1); });
}
