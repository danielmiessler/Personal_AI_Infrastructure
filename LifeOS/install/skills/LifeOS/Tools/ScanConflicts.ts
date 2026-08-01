#!/usr/bin/env bun
/**
 * ScanConflicts — Setup step 2. READ-ONLY conflict report. Surfaces everything
 * the Setup workflow must reconcile before any write: existing settings hooks,
 * a populated user config tree, LifeOS skill-name collisions, and discoverable
 * API keys (names only — never values). Produces no mutations.
 *
 * Thin entry point over InstallEngine; the branch decision for LinkUser/Install
 * is made by the workflow from this JSON.
 *
 * Usage: bun ScanConflicts.ts [--json]
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  detectEnv,
  detectExistingUserContent,
  scanApiKeys,
  scanSettingsHooks,
} from "./InstallEngine";

interface SkillCollision {
  payload: string;
  existing: string;
  /** true = same exact name (prior install / user skill with identical name); false = case-variant foreign dir. */
  exact: boolean;
}

interface ConflictReport {
  configRoot: string;
  settingsHooks: ReturnType<typeof scanSettingsHooks>;
  existingUserContent: ReturnType<typeof detectExistingUserContent>;
  /** A LifeOS skill dir already present at the target (would be re-installed over). */
  lifeosSkillPresent: boolean;
  /**
   * Payload skills whose target name collides (case-insensitively) with a
   * pre-existing entry in the skills dir (public issue #1506, @mygirleatsmayo).
   * Case-variant collisions block those skills at DeployCore; exact matches
   * merge file-additively. Either way the user decides BEFORE writes.
   */
  skillCollisions: SkillCollision[];
  /** Provider names with a discoverable key in shell/config (VALUES never emitted). */
  apiKeyProviders: string[];
  /** True if any conflict needs a human decision before setup writes. */
  needsReconciliation: boolean;
}

/** Case-insensitive intersection of payload skill names vs existing skills-dir entries. */
function scanSkillCollisions(skillsDir: string): SkillCollision[] {
  const payloadSkills = join(import.meta.dir, "..", "install", "skills");
  if (!existsSync(payloadSkills) || !existsSync(skillsDir)) return [];
  const existingByLower = new Map<string, string>();
  for (const e of readdirSync(skillsDir)) existingByLower.set(e.toLowerCase(), e);
  const out: SkillCollision[] = [];
  for (const p of readdirSync(payloadSkills).sort()) {
    if (p === "LifeOS") continue; // reported separately as lifeosSkillPresent
    const m = existingByLower.get(p.toLowerCase());
    if (m !== undefined) out.push({ payload: p, existing: m, exact: m === p });
  }
  return out;
}

function main(): void {
  const env = detectEnv();
  const configRoot = env.configRoot;
  const skillsDir = env.harness.skillsDir || join(configRoot, "skills");
  const userDir = join(configRoot, "LIFEOS", "USER");

  const settingsHooks = scanSettingsHooks(join(configRoot, "settings.json"));
  const existingUserContent = detectExistingUserContent(userDir);
  const lifeosSkillPresent = existsSync(join(skillsDir, "LifeOS"));
  const skillCollisions = scanSkillCollisions(skillsDir);

  // Names only — scanApiKeys returns values, but we surface ONLY the provider keys.
  const apiKeyProviders = Object.keys(scanApiKeys(env.homeDir, join(configRoot, "LIFEOS", "USER", "CONFIG")));

  const report: ConflictReport = {
    configRoot,
    settingsHooks,
    existingUserContent,
    lifeosSkillPresent,
    skillCollisions,
    apiKeyProviders,
    needsReconciliation:
      settingsHooks.hookEntryCount > 0 || existingUserContent.populated || lifeosSkillPresent ||
      skillCollisions.length > 0,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

main();
