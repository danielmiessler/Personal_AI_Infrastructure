#!/usr/bin/env bun
/**
 * InstallDerivedSync.ts - Materialize com.lifeos.derivedsync.plist.template and bootstrap it.
 *
 *   bun ~/.claude/LIFEOS/TOOLS/InstallDerivedSync.ts             # install
 *   bun ~/.claude/LIFEOS/TOOLS/InstallDerivedSync.ts --uninstall # remove
 *   bun ~/.claude/LIFEOS/TOOLS/InstallDerivedSync.ts --status    # check
 *
 * Two backends, chosen by `process.platform` (same pattern as
 * LIFEOS/PULSE/manage.sh and InstallWorkSweep.ts — macOS uses launchd,
 * Linux uses systemd --user):
 *
 *  - darwin: materializes com.lifeos.derivedsync.plist.template into
 *    ~/Library/LaunchAgents/ and bootstraps it with launchctl.
 *  - linux: materializes com.lifeos.derivedsync.{service,path}.template into
 *    ~/.config/systemd/user/ and enables the .path unit with systemctl
 *    --user. Requires `loginctl enable-linger $USER` for the unit to
 *    survive logout (same requirement PULSE/manage.sh documents for
 *    com.lifeos.pulse). The .path unit is started once at install time to
 *    match the launchd plist's RunAtLoad true.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, realpathSync } from "fs";
import { join } from "path";

const IS_LINUX = process.platform === "linux";

type SpawnProcess = {
  stdout: ReadableStream<Uint8Array> | null;
  stderr: ReadableStream<Uint8Array> | null;
  exited: Promise<number>;
  kill: (signal?: string) => void;
};

declare const Bun: { spawn: (cmd: string[], opts?: { stdout?: "pipe" | "ignore"; stderr?: "pipe" | "ignore" }) => SpawnProcess };

type CommandExit = {
  exit: number;
  ms: number;
  timedOut: boolean;
};

type LaunchctlResult = {
  ok: boolean;
  out: string;
  err: string;
  exit: number;
  ms: number;
};

const HOME = process.env.HOME || "";
const LABEL = "com.lifeos.derivedsync";
const COMMAND_TIMEOUT_MS = 30 * 1000;

// ── darwin (launchd) paths ──
const TEMPLATE_PATH = join(HOME, ".claude", "LIFEOS", "TOOLS", "com.lifeos.derivedsync.plist.template");
const LAUNCH_AGENTS_DIR = join(HOME, "Library", "LaunchAgents");
const TARGET_PLIST = join(LAUNCH_AGENTS_DIR, "com.lifeos.derivedsync.plist");

// ── linux (systemd --user) paths ──
const SERVICE_TEMPLATE_PATH = join(HOME, ".claude", "LIFEOS", "TOOLS", "com.lifeos.derivedsync.service.template");
const PATH_TEMPLATE_PATH = join(HOME, ".claude", "LIFEOS", "TOOLS", "com.lifeos.derivedsync.path.template");
const SYSTEMD_USER_DIR = join(HOME, ".config", "systemd", "user");
const TARGET_SERVICE = join(SYSTEMD_USER_DIR, `${LABEL}.service`);
const TARGET_PATH = join(SYSTEMD_USER_DIR, `${LABEL}.path`);
const PATH_UNIT = `${LABEL}.path`;

async function exitedWithTimeout(proc: SpawnProcess): Promise<CommandExit> {
  const started = Date.now();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill("SIGTERM");
  }, COMMAND_TIMEOUT_MS);
  const exit = await proc.exited;
  clearTimeout(timer);
  return { exit, ms: Date.now() - started, timedOut };
}

async function uid(): Promise<string> {
  const proc = Bun.spawn(["id", "-u"], { stdout: "pipe", stderr: "ignore" });
  const out = await new Response(proc.stdout).text();
  const result = await exitedWithTimeout(proc);
  if (result.timedOut) throw new Error(`id -u timed out after ${result.ms}ms`);
  if (result.exit !== 0) throw new Error(`id -u failed with exit ${result.exit} after ${result.ms}ms`);
  return out.trim();
}

async function launchctl(args: string[]): Promise<LaunchctlResult> {
  const proc = Bun.spawn(["launchctl", ...args], { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const result = await exitedWithTimeout(proc);
  return { ok: result.exit === 0 && !result.timedOut, out, err, exit: result.exit, ms: result.ms };
}

async function systemctl(args: string[]): Promise<LaunchctlResult> {
  const proc = Bun.spawn(["systemctl", "--user", ...args], { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const result = await exitedWithTimeout(proc);
  return { ok: result.exit === 0 && !result.timedOut, out, err, exit: result.exit, ms: result.ms };
}

async function username(): Promise<string> {
  // Prefer `id -un` over process.env.USER — USER isn't guaranteed to be set
  // in every invoking environment, and an empty string would make
  // `loginctl enable-linger ""` fail silently.
  const proc = Bun.spawn(["id", "-un"], { stdout: "pipe", stderr: "ignore" });
  const out = await new Response(proc.stdout).text();
  await exitedWithTimeout(proc);
  return out.trim();
}

async function detectBun(): Promise<string> {
  const proc = Bun.spawn(["which", "bun"], { stdout: "pipe", stderr: "ignore" });
  const out = await new Response(proc.stdout).text();
  const result = await exitedWithTimeout(proc);
  if (result.timedOut) throw new Error(`which bun timed out after ${result.ms}ms`);
  if (result.exit !== 0) throw new Error(`which bun failed with exit ${result.exit} after ${result.ms}ms`);
  const path = out.trim();
  if (!path) throw new Error("bun not found in PATH - install bun first");
  return path;
}

// ── darwin (launchd) ──

async function installDarwin(): Promise<void> {
  if (!existsSync(TEMPLATE_PATH)) {
    console.error(`[InstallDerivedSync] template missing at ${TEMPLATE_PATH}`);
    process.exit(1);
  }
  const bunPath = await detectBun();
  const bunDir = bunPath.replace(/\/bun$/, "");
  const userDir = realpathSync(join(HOME, ".claude", "LIFEOS", "USER"));
  console.log(`[InstallDerivedSync] detected bun at ${bunPath}`);
  const template = readFileSync(TEMPLATE_PATH, "utf-8");
  const materialized = template
    .replace(/\{\{HOME\}\}/g, HOME)
    .replace(/\{\{BUN\}\}/g, bunPath)
    .replace(/\{\{BUN_DIR\}\}/g, bunDir)
    .replace(/\{\{USER_DIR\}\}/g, userDir);
  if (!existsSync(LAUNCH_AGENTS_DIR)) mkdirSync(LAUNCH_AGENTS_DIR, { recursive: true });

  const u = await uid();
  if (existsSync(TARGET_PLIST)) {
    await launchctl(["bootout", `gui/${u}`, TARGET_PLIST]);
  }

  writeFileSync(TARGET_PLIST, materialized);
  console.log(`[InstallDerivedSync] wrote ${TARGET_PLIST}`);

  const r = await launchctl(["bootstrap", `gui/${u}`, TARGET_PLIST]);
  if (!r.ok) {
    console.error(`[InstallDerivedSync] bootstrap failed: ${r.err.trim()}`);
    process.exit(1);
  }
  console.log(`[InstallDerivedSync] launchd bootstrap OK - ${LABEL} active`);

  const status = await launchctl(["print", `gui/${u}/${LABEL}`]);
  if (status.ok) {
    const stateLine = status.out.split("\n").find((l) => l.includes("state ="));
    console.log(`[InstallDerivedSync] ${stateLine?.trim() ?? "state unknown"}`);
  } else {
    console.log(`[InstallDerivedSync] bootstrap succeeded but status check failed: ${status.err.trim()}`);
  }
}

async function uninstallDarwin(): Promise<void> {
  const u = await uid();
  if (existsSync(TARGET_PLIST)) {
    const r = await launchctl(["bootout", `gui/${u}`, TARGET_PLIST]);
    console.log(`[InstallDerivedSync] bootout ${r.ok ? "OK" : "FAILED: " + r.err.trim()}`);
    try { unlinkSync(TARGET_PLIST); console.log(`[InstallDerivedSync] removed ${TARGET_PLIST}`); } catch { /* bootout result is already reported */ }
  } else {
    console.log(`[InstallDerivedSync] no plist at ${TARGET_PLIST} - nothing to do`);
  }
}

async function statusDarwin(): Promise<void> {
  const u = await uid();
  const r = await launchctl(["print", `gui/${u}/${LABEL}`]);
  if (!r.ok) {
    console.log(`[InstallDerivedSync] ${LABEL} not loaded`);
    process.exit(1);
  }
  console.log(r.out);
}

// ── linux (systemd --user) ──

async function installLinux(): Promise<void> {
  if (!existsSync(SERVICE_TEMPLATE_PATH) || !existsSync(PATH_TEMPLATE_PATH)) {
    console.error(`[InstallDerivedSync] template missing — expected ${SERVICE_TEMPLATE_PATH} and ${PATH_TEMPLATE_PATH}`);
    process.exit(1);
  }
  const bunPath = await detectBun();
  const bunDir = bunPath.replace(/\/bun$/, "");
  const userDir = realpathSync(join(HOME, ".claude", "LIFEOS", "USER"));
  console.log(`[InstallDerivedSync] detected bun at ${bunPath}`);

  const materialize = (templatePath: string) =>
    readFileSync(templatePath, "utf-8")
      .replace(/\{\{HOME\}\}/g, HOME)
      .replace(/\{\{BUN\}\}/g, bunPath)
      .replace(/\{\{BUN_DIR\}\}/g, bunDir)
      .replace(/\{\{USER_DIR\}\}/g, userDir);

  if (!existsSync(SYSTEMD_USER_DIR)) mkdirSync(SYSTEMD_USER_DIR, { recursive: true });

  // Idempotent teardown (ignore failures — first install has nothing to remove)
  await systemctl(["disable", "--now", PATH_UNIT]);

  writeFileSync(TARGET_SERVICE, materialize(SERVICE_TEMPLATE_PATH));
  writeFileSync(TARGET_PATH, materialize(PATH_TEMPLATE_PATH));
  console.log(`[InstallDerivedSync] wrote ${TARGET_SERVICE}`);
  console.log(`[InstallDerivedSync] wrote ${TARGET_PATH}`);

  await systemctl(["daemon-reload"]);

  // Survive logout/reboot, same requirement PULSE/manage.sh documents for com.lifeos.pulse.
  await Bun.spawn(["loginctl", "enable-linger", await username()], { stdout: "ignore", stderr: "ignore" }).exited;

  const r = await systemctl(["enable", "--now", PATH_UNIT]);
  if (!r.ok) {
    console.error(`[InstallDerivedSync] enable --now failed: ${r.err.trim()}`);
    process.exit(1);
  }
  console.log(`[InstallDerivedSync] systemd path unit enabled — ${PATH_UNIT} active`);

  // RunAtLoad true equivalent — fire the service once immediately.
  await systemctl(["start", `${LABEL}.service`]);

  const list = await systemctl(["status", PATH_UNIT, "--no-pager"]);
  if (list.ok || list.out) console.log(list.out.trim());
}

async function uninstallLinux(): Promise<void> {
  await systemctl(["disable", "--now", PATH_UNIT]);
  let removed = false;
  for (const f of [TARGET_SERVICE, TARGET_PATH]) {
    if (existsSync(f)) {
      try { unlinkSync(f); console.log(`[InstallDerivedSync] removed ${f}`); removed = true; } catch {}
    }
  }
  if (!removed) console.log(`[InstallDerivedSync] no unit files found — nothing to do`);
  await systemctl(["daemon-reload"]);
}

async function statusLinux(): Promise<void> {
  const r = await systemctl(["status", PATH_UNIT, "--no-pager"]);
  console.log(r.out || r.err);
  if (!r.ok) process.exit(1);
}

// ── dispatch ──

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (arg === "--uninstall") return IS_LINUX ? uninstallLinux() : uninstallDarwin();
  if (arg === "--status") return IS_LINUX ? statusLinux() : statusDarwin();
  return IS_LINUX ? installLinux() : installDarwin();
}

main().catch((err) => { console.error(`[InstallDerivedSync] Fatal: ${err}`); process.exit(1); });
