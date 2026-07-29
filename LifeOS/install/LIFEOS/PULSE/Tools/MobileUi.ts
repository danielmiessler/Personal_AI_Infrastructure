#!/usr/bin/env bun
/**
 * MobileUi — the one control for Pulse's alternate phone interface.
 *
 *   bun LIFEOS/PULSE/Tools/MobileUi.ts status     what's on, and how to remove it
 *   bun LIFEOS/PULSE/Tools/MobileUi.ts disable    turn it off, rebuild, verify
 *   bun LIFEOS/PULSE/Tools/MobileUi.ts enable     turn it back on, rebuild, verify
 *
 * Disabled means: no phone is ever redirected off the desktop UI, the desktop
 * header drops its mobile affordance, and anyone holding a /m bookmark is sent
 * to the desktop route. Desktop Pulse is never altered in either state — the
 * mobile layer is additive, which is what makes the rollback below total.
 *
 * Pass --no-build to flip the flag without rebuilding (the change takes effect
 * on the next build).
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

const PULSE_DIR = join(import.meta.dir, "..");
const APP_DIR = join(PULSE_DIR, "Observability");
const CONFIG = join(APP_DIR, "src", "lib", "mobile", "config.ts");
const FLAG = /^(export const MOBILE_UI_ENABLED = )(true|false)(;.*)$/m;

/** Everything the mobile layer added. `status` prints it so the rollback path
 *  is never something you have to reconstruct from memory. */
const ADDED_PATHS = [
  "Observability/src/app/m/",
  "Observability/src/components/mobile/",
  "Observability/src/lib/mobile/",
  "Observability/src/contexts/DensityContext.tsx",
  "Observability/tests/mobile-registry.test.ts",
  "Tools/MobileUi.ts",
];

/** The only desktop files the mobile layer touched, and what it added to each. */
const TOUCHED_FILES: Array<[string, string]> = [
  ["Observability/src/app/layout.tsx", "<MobileRedirect/>, mobile.css import, viewport export"],
  ["Observability/src/components/AppHeader.tsx", "early return on /m, Smartphone affordance"],
  ["Observability/src/components/ui/chrome.tsx", "useCompact() density branches"],
];

async function readFlag(): Promise<boolean> {
  const src = await Bun.file(CONFIG).text();
  const m = src.match(FLAG);
  if (!m) throw new Error(`MOBILE_UI_ENABLED not found in ${CONFIG}`);
  return m[2] === "true";
}

async function writeFlag(next: boolean): Promise<boolean> {
  const src = await Bun.file(CONFIG).text();
  const m = src.match(FLAG);
  if (!m) throw new Error(`MOBILE_UI_ENABLED not found in ${CONFIG}`);
  if ((m[2] === "true") === next) return false;
  await Bun.write(CONFIG, src.replace(FLAG, `$1${next}$3`));
  return true;
}

async function rebuild(): Promise<void> {
  console.log("→ rebuilding the dashboard export (bun run build)…");
  const res = await $`bun run build`.cwd(APP_DIR).nothrow();
  if (res.exitCode !== 0) {
    console.error(res.stderr.toString().slice(-2000));
    throw new Error(`build failed (exit ${res.exitCode})`);
  }
  console.log("✓ build ok");
}

async function verify(expected: boolean): Promise<void> {
  const routeFile = join(APP_DIR, "out", "m.html");
  const indexFile = join(APP_DIR, "out", "index.html");
  const desktopOk = existsSync(indexFile);
  console.log(`  desktop export present : ${desktopOk ? "yes" : "NO — desktop is broken, investigate"}`);
  console.log(`  /m route built         : ${existsSync(routeFile) ? "yes" : "no"}`);
  console.log(`  redirect active        : ${expected ? "yes (phones land on /m)" : "no (phones stay on desktop)"}`);
}

function printStatus(enabled: boolean): void {
  console.log(`\nPulse mobile interface: ${enabled ? "ENABLED" : "DISABLED"}`);
  console.log(`  flag: MOBILE_UI_ENABLED = ${enabled}  (src/lib/mobile/config.ts)\n`);
  console.log("Full rollback to normal Pulse — delete:");
  for (const p of ADDED_PATHS) console.log(`  rm -rf  ${p}`);
  console.log("\n…and revert these three desktop files:");
  for (const [f, what] of TOUCHED_FILES) console.log(`  ${f}\n      ${what}`);
  console.log("\nThen: cd Observability && bun run build\n");
}

const cmd = process.argv[2] ?? "status";
const doBuild = !process.argv.includes("--no-build");

try {
  if (cmd === "status") {
    printStatus(await readFlag());
  } else if (cmd === "enable" || cmd === "disable") {
    const next = cmd === "enable";
    const changed = await writeFlag(next);
    console.log(changed ? `✓ MOBILE_UI_ENABLED → ${next}` : `· already ${next}, nothing to change`);
    if (doBuild && changed) await rebuild();
    await verify(next);
    printStatus(next);
  } else {
    console.error(`unknown command "${cmd}" — expected status | enable | disable`);
    process.exit(2);
  }
} catch (err) {
  console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
