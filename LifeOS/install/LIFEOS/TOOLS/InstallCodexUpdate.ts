#!/usr/bin/env bun
/**
 * InstallCodexUpdate.ts — Materialize com.lifeos.codexupdate.plist.template and bootstrap it.
 *
 *   bun ~/.claude/LIFEOS/TOOLS/InstallCodexUpdate.ts             # install
 *   bun ~/.claude/LIFEOS/TOOLS/InstallCodexUpdate.ts --uninstall # remove
 *   bun ~/.claude/LIFEOS/TOOLS/InstallCodexUpdate.ts --status    # check
 *
 * Reads $HOME, substitutes {{HOME}}/{{BUN}}/{{BUN_DIR}} in the template, writes
 * ~/Library/LaunchAgents/com.lifeos.codexupdate.plist, and runs `launchctl bootstrap`.
 * Idempotent — re-running install bootouts the prior load first. Mirrors
 * InstallWorkSweep.ts exactly.
 *
 * Two backends, chosen by `process.platform` (same pattern as
 * LIFEOS/PULSE/manage.sh and InstallWorkSweep.ts — macOS uses launchd,
 * Linux uses systemd --user):
 *
 *  - darwin: materializes com.lifeos.codexupdate.plist.template into
 *    ~/Library/LaunchAgents/ and bootstraps it with launchctl.
 *  - linux: materializes com.lifeos.codexupdate.{service,timer}.template
 *    into ~/.config/systemd/user/ and enables the timer with systemctl
 *    --user. Requires `loginctl enable-linger $USER` for the timer to
 *    survive logout (same requirement PULSE/manage.sh documents for
 *    com.lifeos.pulse).
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";

declare const Bun: { spawn: (cmd: string[], opts?: any) => any };

const IS_LINUX = process.platform === "linux";
const HOME = process.env.HOME || "";
const LABEL = "com.lifeos.codexupdate";

// ── darwin (launchd) paths ──
const TEMPLATE_PATH = join(HOME, ".claude", "LIFEOS", "TOOLS", "com.lifeos.codexupdate.plist.template");
const LAUNCH_AGENTS_DIR = join(HOME, "Library", "LaunchAgents");
const TARGET_PLIST = join(LAUNCH_AGENTS_DIR, "com.lifeos.codexupdate.plist");

// ── linux (systemd --user) paths ──
const SERVICE_TEMPLATE_PATH = join(HOME, ".claude", "LIFEOS", "TOOLS", "com.lifeos.codexupdate.service.template");
const TIMER_TEMPLATE_PATH = join(HOME, ".claude", "LIFEOS", "TOOLS", "com.lifeos.codexupdate.timer.template");
const SYSTEMD_USER_DIR = join(HOME, ".config", "systemd", "user");
const TARGET_SERVICE = join(SYSTEMD_USER_DIR, `${LABEL}.service`);
const TARGET_TIMER = join(SYSTEMD_USER_DIR, `${LABEL}.timer`);
const TIMER_UNIT = `${LABEL}.timer`;

async function uid(): Promise<string> {
  const proc = Bun.spawn(["id", "-u"], { stdout: "pipe", stderr: "ignore" });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out.trim();
}

async function username(): Promise<string> {
  // Prefer `id -un` over process.env.USER — USER isn't guaranteed to be set
  // in every invoking environment, and an empty string would make
  // `loginctl enable-linger ""` fail silently.
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

async function systemctl(args: string[]): Promise<{ ok: boolean; out: string; err: string }> {
  const proc = Bun.spawn(["systemctl", "--user", ...args], { stdout: "pipe", stderr: "pipe" });
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

// ── darwin (launchd) ──

async function installDarwin(): Promise<void> {
  if (!existsSync(TEMPLATE_PATH)) {
    console.error(`[InstallCodexUpdate] template missing at ${TEMPLATE_PATH}`);
    process.exit(1);
  }
  const bunPath = await detectBun();
  const bunDir = bunPath.replace(/\/bun$/, "");
  console.log(`[InstallCodexUpdate] detected bun at ${bunPath}`);
  const template = readFileSync(TEMPLATE_PATH, "utf-8");
  const materialized = template
    .replace(/\{\{HOME\}\}/g, HOME)
    .replace(/\{\{BUN\}\}/g, bunPath)
    .replace(/\{\{BUN_DIR\}\}/g, bunDir);
  if (!existsSync(LAUNCH_AGENTS_DIR)) mkdirSync(LAUNCH_AGENTS_DIR, { recursive: true });

  const u = await uid();
  if (existsSync(TARGET_PLIST)) {
    await launchctl(["bootout", `gui/${u}`, TARGET_PLIST]);
  }

  writeFileSync(TARGET_PLIST, materialized);
  console.log(`[InstallCodexUpdate] wrote ${TARGET_PLIST}`);

  const r = await launchctl(["bootstrap", `gui/${u}`, TARGET_PLIST]);
  if (!r.ok) {
    console.error(`[InstallCodexUpdate] bootstrap failed: ${r.err.trim()}`);
    process.exit(1);
  }
  console.log(`[InstallCodexUpdate] launchd bootstrap OK — ${LABEL} active`);

  const status = await launchctl(["print", `gui/${u}/${LABEL}`]);
  if (status.ok) {
    const stateLine = status.out.split("\n").find((l) => l.includes("state ="));
    console.log(`[InstallCodexUpdate] ${stateLine?.trim() ?? "state unknown"}`);
  }
}

async function uninstallDarwin(): Promise<void> {
  const u = await uid();
  if (existsSync(TARGET_PLIST)) {
    const r = await launchctl(["bootout", `gui/${u}`, TARGET_PLIST]);
    console.log(`[InstallCodexUpdate] bootout ${r.ok ? "OK" : "FAILED: " + r.err.trim()}`);
    try { unlinkSync(TARGET_PLIST); console.log(`[InstallCodexUpdate] removed ${TARGET_PLIST}`); } catch {}
  } else {
    console.log(`[InstallCodexUpdate] no plist at ${TARGET_PLIST} — nothing to do`);
  }
}

async function statusDarwin(): Promise<void> {
  const u = await uid();
  const r = await launchctl(["print", `gui/${u}/${LABEL}`]);
  if (!r.ok) {
    console.log(`[InstallCodexUpdate] ${LABEL} not loaded`);
    process.exit(1);
  }
  console.log(r.out);
}

// ── linux (systemd --user) ──

async function installLinux(): Promise<void> {
  if (!existsSync(SERVICE_TEMPLATE_PATH) || !existsSync(TIMER_TEMPLATE_PATH)) {
    console.error(`[InstallCodexUpdate] template missing — expected ${SERVICE_TEMPLATE_PATH} and ${TIMER_TEMPLATE_PATH}`);
    process.exit(1);
  }
  const bunPath = await detectBun();
  const bunDir = bunPath.replace(/\/bun$/, "");
  console.log(`[InstallCodexUpdate] detected bun at ${bunPath}`);

  const materialize = (templatePath: string) =>
    readFileSync(templatePath, "utf-8")
      .replace(/\{\{HOME\}\}/g, HOME)
      .replace(/\{\{BUN\}\}/g, bunPath)
      .replace(/\{\{BUN_DIR\}\}/g, bunDir);

  if (!existsSync(SYSTEMD_USER_DIR)) mkdirSync(SYSTEMD_USER_DIR, { recursive: true });

  // Idempotent teardown (ignore failures — first install has nothing to remove)
  await systemctl(["disable", "--now", TIMER_UNIT]);

  writeFileSync(TARGET_SERVICE, materialize(SERVICE_TEMPLATE_PATH));
  writeFileSync(TARGET_TIMER, materialize(TIMER_TEMPLATE_PATH));
  console.log(`[InstallCodexUpdate] wrote ${TARGET_SERVICE}`);
  console.log(`[InstallCodexUpdate] wrote ${TARGET_TIMER}`);

  await systemctl(["daemon-reload"]);

  // Survive logout/reboot, same requirement PULSE/manage.sh documents for com.lifeos.pulse.
  await Bun.spawn(["loginctl", "enable-linger", await username()], { stdout: "ignore", stderr: "ignore" }).exited;

  const r = await systemctl(["enable", "--now", TIMER_UNIT]);
  if (!r.ok) {
    console.error(`[InstallCodexUpdate] enable --now failed: ${r.err.trim()}`);
    process.exit(1);
  }
  console.log(`[InstallCodexUpdate] systemd timer enabled — ${TIMER_UNIT} active (daily 04:00)`);

  const list = await systemctl(["list-timers", TIMER_UNIT, "--no-pager"]);
  if (list.ok) console.log(list.out.trim());
}

async function uninstallLinux(): Promise<void> {
  await systemctl(["disable", "--now", TIMER_UNIT]);
  let removed = false;
  for (const f of [TARGET_SERVICE, TARGET_TIMER]) {
    if (existsSync(f)) {
      try { unlinkSync(f); console.log(`[InstallCodexUpdate] removed ${f}`); removed = true; } catch {}
    }
  }
  if (!removed) console.log(`[InstallCodexUpdate] no unit files found — nothing to do`);
  await systemctl(["daemon-reload"]);
}

async function statusLinux(): Promise<void> {
  const r = await systemctl(["status", TIMER_UNIT, "--no-pager"]);
  console.log(r.out || r.err);
  const list = await systemctl(["list-timers", TIMER_UNIT, "--no-pager"]);
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
  main().catch((err) => { console.error(`[InstallCodexUpdate] Fatal: ${err}`); process.exit(1); });
}
