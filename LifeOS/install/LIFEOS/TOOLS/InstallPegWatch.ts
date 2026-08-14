#!/usr/bin/env bun
/**
 * InstallPegWatch.ts - Materialize com.lifeos.pegwatch.plist.template and bootstrap it.
 *
 *   bun ~/.claude/LIFEOS/TOOLS/InstallPegWatch.ts             # install
 *   bun ~/.claude/LIFEOS/TOOLS/InstallPegWatch.ts --uninstall # remove
 *   bun ~/.claude/LIFEOS/TOOLS/InstallPegWatch.ts --status    # check
 */

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const HOME = homedir();
const LABEL = "com.lifeos.pegwatch";
const TEMPLATE = join(HOME, ".claude", "LIFEOS", "TOOLS", `${LABEL}.plist.template`);
const TARGET = join(HOME, "Library", "LaunchAgents", `${LABEL}.plist`);

async function sh(cmd: string[]): Promise<{ exit: number; out: string }> {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const out = (await new Response(proc.stdout).text()) + (await new Response(proc.stderr).text());
  return { exit: await proc.exited, out };
}

const uid = (await sh(["id", "-u"])).out.trim();
const domain = `gui/${uid}`;

if (process.argv.includes("--status")) {
  const listed = await sh(["launchctl", "print", `${domain}/${LABEL}`]);
  console.log(existsSync(TARGET) ? `plist: ${TARGET}` : "plist: not installed");
  console.log(listed.exit === 0 ? "launchd: loaded" : "launchd: not loaded");
  process.exit(0);
}

if (process.argv.includes("--uninstall")) {
  await sh(["launchctl", "bootout", domain, TARGET]);
  if (existsSync(TARGET)) unlinkSync(TARGET);
  console.log(`Uninstalled ${LABEL}`);
  process.exit(0);
}

const bunBin = process.execPath;
const plist = readFileSync(TEMPLATE, "utf8")
  .replaceAll("{{BUN}}", bunBin)
  .replaceAll("{{BUN_DIR}}", dirname(bunBin))
  .replaceAll("{{HOME}}", HOME);

mkdirSync(dirname(TARGET), { recursive: true });
writeFileSync(TARGET, plist);
await sh(["launchctl", "bootout", domain, TARGET]); // idempotent reinstall
const boot = await sh(["launchctl", "bootstrap", domain, TARGET]);
if (boot.exit !== 0) {
  console.error(`bootstrap failed: ${boot.out}`);
  process.exit(1);
}
console.log(`Installed ${LABEL} (every 960s) → ${TARGET}`);
