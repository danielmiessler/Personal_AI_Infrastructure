#!/usr/bin/env bun
/**
 * Mount — install (or re-sync) the LifeOS sidecar into a Hermes install.
 *
 * Turns a stock Hermes into a second front door onto THIS LifeOS instance:
 * same constitution, same identity, same skills, same understanding of what is
 * sensitive — with credential material blocked in code rather than by prompt.
 *
 * What it does, all idempotent:
 *   1. Renders the constitution + identity into `$HERMES_HOME/SOUL.md`.
 *   2. Installs the guard plugin and its generated policy into
 *      `$HERMES_HOME/plugins/lifeos/`.
 *   3. Patches `config.yaml`: soul cap, skills mount, approval policy.
 *   4. Writes the write-sandbox root so the LifeOS tree stays read-only.
 *
 * Code/content separation: this file and everything beside it are install-
 * generic — no identity, no home paths, no instance literals. Everything
 * personal is READ from `LIFEOS/USER/` at render time and WRITTEN into
 * `$HERMES_HOME`, which is outside the LifeOS repo entirely.
 *
 * Usage:
 *   bun LIFEOS/HERMES/Mount.ts              # install / re-sync
 *   bun LIFEOS/HERMES/Mount.ts --check      # report drift, change nothing
 *   bun LIFEOS/HERMES/Mount.ts --keep-output-format
 */

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { emitPolicy, SHELL_DENY_GLOBS } from "./Policy.ts";
import { daName, skillIndex } from "./RenderSoul.ts";
import { INSTALL_ROOT, renderSoul, scrubPaths } from "./RenderSoul.ts";

const HOME = homedir();
const HERMES_HOME = process.env.HERMES_HOME || join(HOME, ".hermes");
const WORKSPACE = process.env.HERMES_WORKSPACE || join(HOME, "HermesWorkspace");
const PLUGIN_SRC = join(import.meta.dir, "plugin");
const PLUGIN_DEST = join(HERMES_HOME, "plugins", "lifeos");

/**
 * Soul cap. The stock default (20,000) truncates silently, and the constitution
 * alone is close to that — so an explicit, generous cap is required, not a
 * nicety. Sized to hold constitution + identity + the skills capability index
 * (~70k as of 2026-08-01) with room to grow.
 */
const CONTEXT_FILE_MAX_CHARS = 100_000;

const MANAGED_BEGIN = "# ── LIFEOS-MANAGED (Mount.ts) — do not hand-edit ─────────────────────────";
const MANAGED_END = "# ── end LIFEOS-MANAGED ───────────────────────────────────────────────────";

interface Change {
  what: string;
  detail: string;
}

/** Set or replace a top-level scalar key without creating a duplicate. */
function setTopLevelKey(yaml: string, key: string, value: string): { yaml: string; changed: boolean } {
  const re = new RegExp(`^${key}\\s*:.*$`, "m");
  if (re.test(yaml)) {
    const next = yaml.replace(re, `${key}: ${value}`);
    return { yaml: next, changed: next !== yaml };
  }
  return { yaml: `${yaml.replace(/\n*$/, "")}\n${key}: ${value}\n`, changed: true };
}

/**
 * Add `external_dirs` under an existing `skills:` block, or create the block.
 * Duplicate top-level keys are a YAML hazard, so never blindly append.
 */
function setSkillsExternalDirs(yaml: string, dirs: string[]): { yaml: string; changed: boolean } {
  const list = dirs.map((d) => `    - ${d}`).join("\n");
  if (/^skills:\s*$/m.test(yaml) || /^skills:\s*\n/m.test(yaml)) {
    if (/^\s+external_dirs\s*:/m.test(yaml)) {
      // Replace the existing list wholesale.
      const next = yaml.replace(
        /^(\s+)external_dirs\s*:\s*\n(?:\s+-\s+.*\n)*/m,
        `  external_dirs:\n${list}\n`,
      );
      return { yaml: next, changed: next !== yaml };
    }
    const next = yaml.replace(/^skills:\s*$/m, `skills:\n  external_dirs:\n${list}`);
    return { yaml: next, changed: next !== yaml };
  }
  return { yaml: `${yaml.replace(/\n*$/, "")}\nskills:\n  external_dirs:\n${list}\n`, changed: true };
}

/**
 * The deny list is RECONCILED, not merely seeded. Skipping whenever an `approvals:` block
 * already existed meant an installed sidecar could never be corrected: the first mount wrote
 * the list, anything later edited it, and every re-run — including `--check` — reported the
 * install clean. That is how `*.claude*` survived in a live config while this file was the
 * stated source of truth. Only the deny list is claimed; mode, timeout, and cron_mode stay
 * whatever the operator set.
 */
function ensureApprovals(yaml: string): { yaml: string; changed: boolean } {
  if (/^approvals:/m.test(yaml)) {
    // Line-based, not a regex. A multiline regex spanning a YAML block is one greedy quantifier
    // away from eating the rest of the document, and it did: the first attempt at this deleted
    // 190 lines of a live config. Walk the block instead — it is the same amount of code and it
    // cannot match past the section it is editing.
    const lines = yaml.split("\n");
    const start = lines.findIndex((l) => /^approvals:\s*$/.test(l));
    if (start === -1) return { yaml, changed: false };

    let end = start + 1;
    while (end < lines.length && (lines[end]!.trim() === "" || /^\s/.test(lines[end]!))) end++;

    const denyAt = lines.slice(start + 1, end).findIndex((l) => /^\s{2}deny:\s*$/.test(l));
    if (denyAt === -1) return { yaml, changed: false }; // no deny list to own
    const denyLine = start + 1 + denyAt;

    let after = denyLine + 1;
    while (after < end && /^\s+-\s/.test(lines[after]!)) after++;

    const next = [
      ...lines.slice(0, denyLine + 1),
      ...SHELL_DENY_GLOBS.map((g) => `    - ${JSON.stringify(g)}`),
      ...lines.slice(after),
    ].join("\n");
    return { yaml: next, changed: next !== yaml };
  }
  const block = [
    "approvals:",
    "  mode: manual",
    "  timeout: 300",
    "  cron_mode: deny",
    "  deny:",
    ...SHELL_DENY_GLOBS.map((g) => `    - ${JSON.stringify(g)}`),
  ].join("\n");
  return { yaml: `${yaml.replace(/\n*$/, "")}\n\n${MANAGED_BEGIN}\n${block}\n${MANAGED_END}\n`, changed: true };
}

function installPlugin(): Change[] {
  const changes: Change[] = [];
  mkdirSync(PLUGIN_DEST, { recursive: true });

  for (const file of ["__init__.py", "guard.py", "plugin.yaml"]) {
    const src = join(PLUGIN_SRC, file);
    const dest = join(PLUGIN_DEST, file);
    const before = existsSync(dest) ? readFileSync(dest, "utf8") : null;
    copyFileSync(src, dest);
    if (before !== readFileSync(dest, "utf8")) {
      changes.push({ what: `plugins/lifeos/${file}`, detail: before === null ? "installed" : "updated" });
    }
  }

  const policyPath = join(PLUGIN_DEST, "policy.json");
  const beforePolicy = existsSync(policyPath) ? readFileSync(policyPath, "utf8") : null;
  const policy = emitPolicy(policyPath, { launcherName: daName() });
  if (beforePolicy !== readFileSync(policyPath, "utf8")) {
    changes.push({
      what: "plugins/lifeos/policy.json",
      detail: `${policy.denyRules.length} read rules, ${policy.shellDenyGlobs.length} shell globs`,
    });
  }
  return changes;
}

/**
 * Hermes plugins are opt-in — an installed-but-disabled guard looks present in
 * every listing while enforcing nothing. Enabling is part of installing, never
 * a step left to the operator.
 *
 * Enabling is done HERE, in the config we already own, rather than by shelling out to
 * `hermes plugins enable lifeos`. That command rewrote config.yaml from a stock template:
 * a 236-line install came back as 46 lines of defaults and comments, losing the model and
 * agent blocks, the skills mount, the approvals deny list, and the enabled telegram and
 * photon platforms. Mount ran it AFTER writing its own patched config, so every mount
 * silently discarded everything it had just done and took the chat channels down with it.
 * One writer for this file, and it is this script.
 */
function ensurePluginEnabled(yaml: string): { yaml: string; changed: boolean } {
  const lines = yaml.split("\n");
  const start = lines.findIndex((l) => /^plugins:\s*$/.test(l));
  if (start === -1) {
    return { yaml: `${yaml.replace(/\n*$/, "")}\nplugins:\n  enabled:\n    - lifeos\n`, changed: true };
  }

  let end = start + 1;
  while (end < lines.length && (lines[end]!.trim() === "" || /^\s/.test(lines[end]!))) end++;

  const enabledAt = lines.slice(start + 1, end).findIndex((l) => /^\s{2}enabled:\s*$/.test(l));
  if (enabledAt === -1) {
    return { yaml: [...lines.slice(0, start + 1), "  enabled:", "    - lifeos", ...lines.slice(start + 1)].join("\n"), changed: true };
  }
  const enabledLine = start + 1 + enabledAt;

  let after = enabledLine + 1;
  const entries: string[] = [];
  while (after < end && /^\s+-\s/.test(lines[after]!)) entries.push(lines[after++]!);
  if (entries.some((e) => /^\s+-\s+lifeos\s*$/.test(e))) return { yaml, changed: false };

  const next = [...lines.slice(0, enabledLine + 1), "    - lifeos", ...lines.slice(enabledLine + 1)].join("\n");
  return { yaml: next, changed: true };
}

function main(): void {
  const args = new Set(process.argv.slice(2));
  const check = args.has("--check");
  const keepOutputFormat = args.has("--keep-output-format");

  if (!existsSync(HERMES_HOME)) {
    throw new Error(`no Hermes install at ${scrubPaths(HERMES_HOME)} — install Hermes first`);
  }

  const soul = renderSoul({ keepOutputFormat });
  const soulPath = join(HERMES_HOME, "SOUL.md");
  const soulCurrent = existsSync(soulPath) ? readFileSync(soulPath, "utf8") : "";
  const soulDrifted = soulCurrent !== soul;
  const digest = createHash("sha256").update(soul).digest("hex").slice(0, 12);

  if (soul.length > CONTEXT_FILE_MAX_CHARS) {
    throw new Error(
      `soul is ${soul.length} chars, over the configured cap of ${CONTEXT_FILE_MAX_CHARS} — ` +
        `raise CONTEXT_FILE_MAX_CHARS or tighten a section budget. Hermes truncates silently.`,
    );
  }

  const configPath = join(HERMES_HOME, "config.yaml");
  let yaml = readFileSync(configPath, "utf8");
  const yamlBefore = yaml;

  ({ yaml } = setTopLevelKey(yaml, "context_file_max_chars", String(CONTEXT_FILE_MAX_CHARS)));
  ({ yaml } = setSkillsExternalDirs(yaml, [join(INSTALL_ROOT, "skills")]));
  ({ yaml } = ensureApprovals(yaml));
  ({ yaml } = ensurePluginEnabled(yaml));
  const configDrifted = yaml !== yamlBefore;

  if (check) {
    console.log(`soul       ${soul.length} chars, digest ${digest}`);
    console.log(`           ${soulDrifted ? "STALE — re-run Mount.ts" : "current"}`);
    console.log(`config     ${configDrifted ? "STALE — re-run Mount.ts" : "current"}`);
    process.exit(soulDrifted || configDrifted ? 1 : 0);
  }

  writeFileSync(soulPath, soul, "utf8");
  if (configDrifted) writeFileSync(configPath, yaml, "utf8");
  const pluginChanges = [...installPlugin()];

  mkdirSync(WORKSPACE, { recursive: true });
  const envPath = join(HERMES_HOME, ".env");
  const env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  if (!/^HERMES_WRITE_SAFE_ROOT=/m.test(env)) {
    writeFileSync(
      envPath,
      `${env.replace(/\n*$/, "")}\n\n# Writes are hard-blocked outside these roots. The LifeOS tree is\n` +
        `# READ-only to the sidecar; persistence goes through the memory API.\n` +
        `HERMES_WRITE_SAFE_ROOT=${WORKSPACE}:${HERMES_HOME}\n`,
      "utf8",
    );
    pluginChanges.push({ what: ".env", detail: "write-sandbox root set" });
  }

  console.log(`✓ SOUL.md            ${soul.length} chars (cap ${CONTEXT_FILE_MAX_CHARS}), digest ${digest}`);
  console.log(`✓ skills mounted     ${scrubPaths(join(INSTALL_ROOT, "skills"))} (${skillIndex().length} indexed in soul — the default routing path)`);
  console.log(`✓ config.yaml        ${configDrifted ? "patched" : "already current"}`);
  for (const c of pluginChanges) console.log(`✓ ${c.what.padEnd(18)} ${c.detail}`);
  if (!pluginChanges.length) console.log("✓ plugin             already current");
}

main();
