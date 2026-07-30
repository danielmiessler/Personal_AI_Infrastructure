#!/usr/bin/env bun
/**
 * InstallCommitmentSweep.ts — Materialize com.lifeos.commitmentsweep.plist.template and bootstrap.
 *
 *   bun ~/.claude/LIFEOS/TOOLS/InstallCommitmentSweep.ts             # install
 *   bun ~/.claude/LIFEOS/TOOLS/InstallCommitmentSweep.ts --uninstall # remove
 *
 * Reads template, substitutes __HOME__ with $HOME, writes to ~/Library/LaunchAgents/,
 * bootstraps via launchctl bootstrap. Idempotent — re-runs cleanly replace existing.
 *
 * Two backends, chosen by `process.platform` (same pattern as
 * LIFEOS/PULSE/manage.sh and InstallWorkSweep.ts — macOS uses launchd,
 * Linux uses systemd --user):
 *
 *  - darwin: materializes com.lifeos.commitmentsweep.plist.template into
 *    ~/Library/LaunchAgents/ and bootstraps it with launchctl.
 *  - linux: materializes com.lifeos.commitmentsweep.{service,timer}.template
 *    into ~/.config/systemd/user/ and enables the timer with systemctl
 *    --user. Requires `loginctl enable-linger $USER` for the timer to
 *    survive logout (same requirement PULSE/manage.sh documents for
 *    com.lifeos.pulse). Unlike the darwin plist (which hardcodes
 *    /opt/homebrew/bin/bun), the systemd service template uses a {{BUN}}
 *    placeholder resolved via `which bun` at install time — the plist
 *    itself is left untouched.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

const IS_LINUX = process.platform === "linux";
const HOME = process.env.HOME || "";
const LABEL = "com.lifeos.commitmentsweep";
const STATE_DIR = join(HOME, ".claude", "LIFEOS", "MEMORY", "STATE");

// ── darwin (launchd) paths ──
const TEMPLATE = join(HOME, ".claude", "LIFEOS", "TOOLS", "com.lifeos.commitmentsweep.plist.template");
const TARGET_DIR = join(HOME, "Library", "LaunchAgents");
const TARGET = join(TARGET_DIR, "com.lifeos.commitmentsweep.plist");

// ── linux (systemd --user) paths ──
const SERVICE_TEMPLATE_PATH = join(HOME, ".claude", "LIFEOS", "TOOLS", "com.lifeos.commitmentsweep.service.template");
const TIMER_TEMPLATE_PATH = join(HOME, ".claude", "LIFEOS", "TOOLS", "com.lifeos.commitmentsweep.timer.template");
const SYSTEMD_USER_DIR = join(HOME, ".config", "systemd", "user");
const TARGET_SERVICE = join(SYSTEMD_USER_DIR, `${LABEL}.service`);
const TARGET_TIMER = join(SYSTEMD_USER_DIR, `${LABEL}.timer`);
const TIMER_UNIT = `${LABEL}.timer`;

function uid(): string {
  const r = spawnSync("id", ["-u"], { encoding: "utf8" });
  return (r.stdout || "501").trim();
}

function username(): string {
  // Prefer `id -un` over process.env.USER — USER isn't guaranteed to be set
  // in every invoking environment, and an empty string would make
  // `loginctl enable-linger ""` fail silently.
  const r = spawnSync("id", ["-un"], { encoding: "utf8" });
  return (r.stdout || "").trim();
}

function launchctl(args: string[]): { code: number; out: string; err: string } {
  const r = spawnSync("launchctl", args, { encoding: "utf8" });
  return { code: r.status ?? 1, out: r.stdout || "", err: r.stderr || "" };
}

function systemctl(args: string[]): { code: number; out: string; err: string } {
  const r = spawnSync("systemctl", ["--user", ...args], { encoding: "utf8" });
  return { code: r.status ?? 1, out: r.stdout || "", err: r.stderr || "" };
}

function detectBun(): string {
  const r = spawnSync("which", ["bun"], { encoding: "utf8" });
  const path = (r.stdout || "").trim();
  if (!path) throw new Error("bun not found in PATH — install bun first");
  return path;
}

function uninstallDarwin(): void {
  const u = uid();
  const r = launchctl(["bootout", `gui/${u}/${LABEL}`]);
  if (r.code === 0) console.log(`[InstallCommitmentSweep] booted out ${LABEL}`);
  else console.log(`[InstallCommitmentSweep] bootout (likely already-out): ${r.err.trim() || r.code}`);
  if (existsSync(TARGET)) {
    unlinkSync(TARGET);
    console.log(`[InstallCommitmentSweep] removed ${TARGET}`);
  }
}

function installDarwin(): void {
  if (!existsSync(TEMPLATE)) {
    console.error(`[InstallCommitmentSweep] template missing: ${TEMPLATE}`);
    process.exit(1);
  }
  mkdirSync(TARGET_DIR, { recursive: true });
  mkdirSync(STATE_DIR, { recursive: true });

  const raw = readFileSync(TEMPLATE, "utf8");
  const materialized = raw.replaceAll("__HOME__", HOME);
  writeFileSync(TARGET, materialized, { mode: 0o644 });
  console.log(`[InstallCommitmentSweep] wrote ${TARGET}`);

  // Bootout first in case an old version is loaded
  const u = uid();
  launchctl(["bootout", `gui/${u}/${LABEL}`]);
  const r = launchctl(["bootstrap", `gui/${u}`, TARGET]);
  if (r.code === 0) {
    console.log(`[InstallCommitmentSweep] bootstrapped ${LABEL}`);
  } else {
    console.error(`[InstallCommitmentSweep] bootstrap failed: ${r.err.trim() || r.code}`);
    process.exit(2);
  }

  // Verify
  const list = launchctl(["list", LABEL]);
  if (list.code === 0) {
    console.log(`[InstallCommitmentSweep] verified — ${LABEL} is loaded`);
  } else {
    console.error(`[InstallCommitmentSweep] verification failed`);
    process.exit(3);
  }
}

// ── linux (systemd --user) ──

function materializeLinux(templatePath: string, bunPath: string): string {
  const bunDir = bunPath.replace(/\/bun$/, "");
  return readFileSync(templatePath, "utf8")
    .replace(/\{\{HOME\}\}/g, HOME)
    .replace(/\{\{BUN\}\}/g, bunPath)
    .replace(/\{\{BUN_DIR\}\}/g, bunDir);
}

function installLinux(): void {
  if (!existsSync(SERVICE_TEMPLATE_PATH) || !existsSync(TIMER_TEMPLATE_PATH)) {
    console.error(`[InstallCommitmentSweep] template missing — expected ${SERVICE_TEMPLATE_PATH} and ${TIMER_TEMPLATE_PATH}`);
    process.exit(1);
  }
  const bunPath = detectBun();
  console.log(`[InstallCommitmentSweep] detected bun at ${bunPath}`);
  mkdirSync(SYSTEMD_USER_DIR, { recursive: true });
  mkdirSync(STATE_DIR, { recursive: true });

  // Idempotent teardown (ignore failures — first install has nothing to remove)
  systemctl(["disable", "--now", TIMER_UNIT]);

  writeFileSync(TARGET_SERVICE, materializeLinux(SERVICE_TEMPLATE_PATH, bunPath), { mode: 0o644 });
  writeFileSync(TARGET_TIMER, materializeLinux(TIMER_TEMPLATE_PATH, bunPath), { mode: 0o644 });
  console.log(`[InstallCommitmentSweep] wrote ${TARGET_SERVICE}`);
  console.log(`[InstallCommitmentSweep] wrote ${TARGET_TIMER}`);

  systemctl(["daemon-reload"]);

  // Survive logout/reboot, same requirement PULSE/manage.sh documents for com.lifeos.pulse.
  spawnSync("loginctl", ["enable-linger", username()]);

  const r = systemctl(["enable", "--now", TIMER_UNIT]);
  if (r.code === 0) {
    console.log(`[InstallCommitmentSweep] systemd timer enabled — ${TIMER_UNIT} active (daily 07:00)`);
  } else {
    console.error(`[InstallCommitmentSweep] enable --now failed: ${r.err.trim() || r.code}`);
    process.exit(2);
  }

  const list = systemctl(["list-timers", TIMER_UNIT, "--no-pager"]);
  if (list.code === 0) console.log(list.out.trim());
}

function uninstallLinux(): void {
  systemctl(["disable", "--now", TIMER_UNIT]);
  let removed = false;
  for (const f of [TARGET_SERVICE, TARGET_TIMER]) {
    if (existsSync(f)) {
      try { unlinkSync(f); console.log(`[InstallCommitmentSweep] removed ${f}`); removed = true; } catch {}
    }
  }
  if (!removed) console.log(`[InstallCommitmentSweep] no unit files found — nothing to do`);
  systemctl(["daemon-reload"]);
}

// ── dispatch ──

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--uninstall")) {
    if (IS_LINUX) uninstallLinux(); else uninstallDarwin();
    process.exit(0);
  }
  if (IS_LINUX) installLinux(); else installDarwin();
}

if (import.meta.main) main();
