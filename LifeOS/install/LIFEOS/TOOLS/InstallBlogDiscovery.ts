#!/usr/bin/env bun
/**
 * InstallBlogDiscovery.ts — Materialize com.lifeos.blogdiscovery.plist.template and bootstrap it.
 *
 *   bun ~/.claude/LIFEOS/TOOLS/InstallBlogDiscovery.ts             # install
 *   bun ~/.claude/LIFEOS/TOOLS/InstallBlogDiscovery.ts --uninstall # remove
 *   bun ~/.claude/LIFEOS/TOOLS/InstallBlogDiscovery.ts --status    # check
 *
 * Runs BlogDiscovery harvest once a day (04:30), queueing new indie-blog
 * candidates for review. Promotion to the feed stays manual (`approve`).
 * Mirrors InstallWorkSweep.ts exactly. Idempotent.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";
import * as systemd from "./lib/SystemdUser";
import { homedir } from "node:os";

declare const Bun: { spawn: (cmd: string[], opts?: any) => any };

const HOME = process.env.HOME ?? process.env.USERPROFILE ?? homedir();
const TEMPLATE_PATH = join(HOME, ".claude", "LIFEOS", "TOOLS", "com.lifeos.blogdiscovery.plist.template");
const LAUNCH_AGENTS_DIR = join(HOME, "Library", "LaunchAgents");
const TARGET_PLIST = join(LAUNCH_AGENTS_DIR, "com.lifeos.blogdiscovery.plist");
const LABEL = "com.lifeos.blogdiscovery";

async function uid(): Promise<string> {
  const proc = Bun.spawn(["id", "-u"], { stdout: "pipe", stderr: "ignore" });
  const out = await new Response(proc.stdout).text(); await proc.exited; return out.trim();
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
  const out = await new Response(proc.stdout).text(); await proc.exited;
  const path = out.trim(); if (!path) throw new Error("bun not found in PATH — install bun first");
  return path;
}
async function install(): Promise<void> {
  if (!existsSync(TEMPLATE_PATH)) { console.error(`[InstallBlogDiscovery] template missing at ${TEMPLATE_PATH}`); process.exit(1); }
  const bunPath = await detectBun(); const bunDir = bunPath.replace(/\/bun$/, "");
  console.log(`[InstallBlogDiscovery] detected bun at ${bunPath}`);
  const materialized = readFileSync(TEMPLATE_PATH, "utf-8")
    .replace(/\{\{HOME\}\}/g, HOME).replace(/\{\{BUN\}\}/g, bunPath).replace(/\{\{BUN_DIR\}\}/g, bunDir);
  if (!existsSync(LAUNCH_AGENTS_DIR)) mkdirSync(LAUNCH_AGENTS_DIR, { recursive: true });
  const u = await uid();
  if (existsSync(TARGET_PLIST)) await launchctl(["bootout", `gui/${u}`, TARGET_PLIST]);
  writeFileSync(TARGET_PLIST, materialized);
  console.log(`[InstallBlogDiscovery] wrote ${TARGET_PLIST}`);
  const r = await launchctl(["bootstrap", `gui/${u}`, TARGET_PLIST]);
  if (!r.ok) { console.error(`[InstallBlogDiscovery] bootstrap failed: ${r.err.trim()}`); process.exit(1); }
  console.log(`[InstallBlogDiscovery] launchd bootstrap OK — ${LABEL} active (daily 04:30)`);
  const status = await launchctl(["print", `gui/${u}/${LABEL}`]);
  if (status.ok) console.log(`[InstallBlogDiscovery] ${status.out.split("\n").find((l) => l.includes("state ="))?.trim() ?? "state unknown"}`);
}
async function uninstall(): Promise<void> {
  const u = await uid();
  if (existsSync(TARGET_PLIST)) {
    const r = await launchctl(["bootout", `gui/${u}`, TARGET_PLIST]);
    console.log(`[InstallBlogDiscovery] bootout ${r.ok ? "OK" : "FAILED: " + r.err.trim()}`);
    try { unlinkSync(TARGET_PLIST); console.log(`[InstallBlogDiscovery] removed ${TARGET_PLIST}`); } catch {}
  } else console.log(`[InstallBlogDiscovery] no plist at ${TARGET_PLIST} — nothing to do`);
}
async function status(): Promise<void> {
  const u = await uid(); const r = await launchctl(["print", `gui/${u}/${LABEL}`]);
  if (!r.ok) { console.log(`[InstallBlogDiscovery] ${LABEL} not loaded`); process.exit(1); }
  console.log(r.out);
}
/* ── systemd --user backend (Linux only) ────────────────────────────────────
 * Strictly additive. Every line above is the launchd path and is unchanged;
 * on darwin nothing in this section executes. Translation rules and the
 * reason this is a shared helper rather than per-job unit templates are
 * documented in lib/SystemdUser.ts.
 * ported from public PR #1698, @elhoim
 * ------------------------------------------------------------------------- */

async function linuxSpec(): Promise<systemd.UnitSpec> {
  const bunPath = await systemd.which("bun");
  if (!bunPath) throw new Error("bun not found in PATH - install bun first");
  return {
    label: LABEL,
    description: "LifeOS blog discovery harvest",
    exec: [bunPath, join(HOME, ".claude", "LIFEOS", "TOOLS", "BlogDiscovery.ts"), "harvest", "--batch", "300", "--level", "low", "--sources", "kagi,indieblog,bear"],
    logPath: join(HOME, ".claude", "LIFEOS", "MEMORY", "STATE", "com.lifeos.blogdiscovery.log"),
    workingDirectory: join(HOME, ".claude"),
    schedule: { kind: "calendar", hour: 4, minute: 30 },
  };
}

async function linuxMain(arg: string | undefined): Promise<void> {
  const spec = await linuxSpec();
  const log = (m: string) => console.log(`[InstallBlogDiscovery] ${m}`);
  if (arg === "--uninstall") { await systemd.uninstall(spec, log); return; }
  if (arg === "--status") { if (!(await systemd.status(spec, log))) process.exit(1); return; }
  if (!(await systemd.install(spec, log))) process.exit(1);
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (systemd.isLinux()) return linuxMain(arg);
  if (arg === "--uninstall") return uninstall();
  if (arg === "--status") return status();
  return install();
}
if (import.meta.main) main().catch((err) => { console.error(`[InstallBlogDiscovery] Fatal: ${err}`); process.exit(1); });
