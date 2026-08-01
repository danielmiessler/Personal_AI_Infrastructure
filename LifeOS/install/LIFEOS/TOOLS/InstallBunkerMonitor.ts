#!/usr/bin/env bun
/**
 * InstallBunkerMonitor.ts — Materialize com.lifeos.bunkermonitor.plist.template and bootstrap it.
 *
 *   bun ~/.claude/LIFEOS/TOOLS/InstallBunkerMonitor.ts             # install
 *   bun ~/.claude/LIFEOS/TOOLS/InstallBunkerMonitor.ts --uninstall # remove
 *   bun ~/.claude/LIFEOS/TOOLS/InstallBunkerMonitor.ts --status    # check
 *
 * Schedules `bunker monitor` (every app's ISA Test Strategy probes, alert email
 * on state transitions) every 30 minutes. Without this job the monitor only
 * runs when invoked by hand — the harness is only real if it watches.
 *
 * Substitutes {{HOME}}, {{BUN}}, {{BUN_DIR}}, {{BUNKER}} in the template.
 * Bunker's repo location defaults to ~/.claude/LIFEOS/PULSE/Bunker (its canonical home);
 * override with BUNKER_DIR env at install time.
 *
 * Idempotent. Re-running install bootouts the prior load before bootstrapping.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";

declare const Bun: { spawn: (cmd: string[], opts?: any) => any };

const HOME = process.env.HOME || "";
const BUNKER_DIR = process.env.BUNKER_DIR || join(HOME, ".claude", "LIFEOS", "PULSE", "Bunker");
const BUNKER_DATA_DIR = join(HOME, ".config", "LIFEOS", "USER", "PULSE", "Bunker");
const TEMPLATE_PATH = join(HOME, ".claude", "LIFEOS", "TOOLS", "com.lifeos.bunkermonitor.plist.template");
const LAUNCH_AGENTS_DIR = join(HOME, "Library", "LaunchAgents");
const TARGET_PLIST = join(LAUNCH_AGENTS_DIR, "com.lifeos.bunkermonitor.plist");
const LABEL = "com.lifeos.bunkermonitor";

async function uid(): Promise<string> {
  const proc = Bun.spawn(["id", "-u"], { stdout: "pipe", stderr: "ignore" });
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

async function install(): Promise<void> {
  if (!existsSync(TEMPLATE_PATH)) {
    console.error(`[InstallBunkerMonitor] template missing at ${TEMPLATE_PATH}`);
    process.exit(1);
  }
  if (!existsSync(join(BUNKER_DIR, "bin", "bunker.ts"))) {
    console.error(
      `[InstallBunkerMonitor] bunker not found at ${BUNKER_DIR}.\n` +
      `  On a public LifeOS install this is expected: LIFEOS/PULSE/Bunker is a private\n` +
      `  component (the concept ships via DOCUMENTATION, the implementation does not).\n` +
      `  There is no monitor to install. If you DO have Bunker elsewhere, set BUNKER_DIR.`,
    );
    process.exit(1);
  }
  const bunPath = await detectBun();
  const bunDir = bunPath.replace(/\/bun$/, "");
  console.log(`[InstallBunkerMonitor] detected bun at ${bunPath}, bunker at ${BUNKER_DIR}`);
  const template = readFileSync(TEMPLATE_PATH, "utf-8");
  const materialized = template
    .replace(/\{\{HOME\}\}/g, HOME)
    .replace(/\{\{BUN\}\}/g, bunPath)
    .replace(/\{\{BUN_DIR\}\}/g, bunDir)
    .replace(/\{\{BUNKER\}\}/g, BUNKER_DIR);
  if (!existsSync(LAUNCH_AGENTS_DIR)) mkdirSync(LAUNCH_AGENTS_DIR, { recursive: true });
  mkdirSync(BUNKER_DATA_DIR, { recursive: true });

  const u = await uid();
  if (existsSync(TARGET_PLIST)) {
    await launchctl(["bootout", `gui/${u}`, TARGET_PLIST]);
  }

  writeFileSync(TARGET_PLIST, materialized);
  console.log(`[InstallBunkerMonitor] wrote ${TARGET_PLIST}`);

  const r = await launchctl(["bootstrap", `gui/${u}`, TARGET_PLIST]);
  if (!r.ok) {
    console.error(`[InstallBunkerMonitor] bootstrap failed: ${r.err.trim()}`);
    process.exit(1);
  }
  console.log(`[InstallBunkerMonitor] launchd bootstrap OK — ${LABEL} active`);

  const status = await launchctl(["print", `gui/${u}/${LABEL}`]);
  if (status.ok) {
    const stateLine = status.out.split("\n").find((l) => l.includes("state ="));
    console.log(`[InstallBunkerMonitor] ${stateLine?.trim() ?? "state unknown"}`);
  }
}

async function uninstall(): Promise<void> {
  const u = await uid();
  if (existsSync(TARGET_PLIST)) {
    const r = await launchctl(["bootout", `gui/${u}`, TARGET_PLIST]);
    console.log(`[InstallBunkerMonitor] bootout ${r.ok ? "OK" : "FAILED: " + r.err.trim()}`);
    try { unlinkSync(TARGET_PLIST); console.log(`[InstallBunkerMonitor] removed ${TARGET_PLIST}`); } catch {}
  } else {
    console.log(`[InstallBunkerMonitor] no plist at ${TARGET_PLIST} — nothing to do`);
  }
}

async function status(): Promise<void> {
  const u = await uid();
  const r = await launchctl(["print", `gui/${u}/${LABEL}`]);
  if (!r.ok) {
    console.log(`[InstallBunkerMonitor] ${LABEL} not loaded`);
    process.exit(1);
  }
  console.log(r.out);
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (arg === "--uninstall") return uninstall();
  if (arg === "--status") return status();
  return install();
}

if (import.meta.main) {
  main().catch((err) => { console.error(`[InstallBunkerMonitor] Fatal: ${err}`); process.exit(1); });
}
