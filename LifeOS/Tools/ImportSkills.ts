#!/usr/bin/env bun
/**
 * ImportSkills — copy the portable LifeOS skills from the install payload into the
 * unified Hermes skill body ($HERMES_HOME/skills/) as `source: local` skills.
 *
 * Three boundaries are enforced, in order:
 *   1. Private (`_ALLCAPS`) skills are skipped UNCONDITIONALLY — they carry real
 *      names, credentials, and identity-bound preferences. Reported by COUNT only,
 *      never by name (names may leak context).
 *   2. Claude/macOS-specific skills (Interceptor, Daemon, Art, Remotion — plus any
 *      the manifest marks non-portable) are skipped.
 *   3. TitleCase dir names are normalized to lowercase-kebab (WorldThreatModel →
 *      world-threat-model; ISA → isa; USMetrics → us-metrics).
 *
 * Collisions are resolved by SHA-256 of SKILL.md: identical → skip; different →
 * reported as a conflict and NOT overwritten (the operator decides).
 *
 * Read-only in --dry-run: prints the full plan, writes nothing.
 *
 * Usage:
 *   bun ImportSkills.ts [--dry-run]
 */

import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { detectHarness, getHarnessSkillsDir } from "./InstallEngine";

// ── Skip lists ───────────────────────────────────────────────────────────────
/** Claude/macOS-only skills that cannot run under Hermes/Windows. */
const PLATFORM_SKIP = new Set(["Interceptor", "Daemon", "Art", "Remotion"]);

/** Subdirs a skill may carry — copied wholesale by cpSync's recursive walk. */
const SRC_SKILLS = join(import.meta.dir, "..", "install", "skills");
const MANIFEST = join(import.meta.dir, "..", "install", "SKILL_MANIFEST.md");

// ── Normalization: TitleCase/PascalCase → lowercase-kebab ─────────────────────
/**
 * WorldThreatModel → world-threat-model · ISA → isa · HTML → html ·
 * USMetrics → us-metrics · CreateCLI → create-cli · Research → research.
 * Acronym runs stay together; a hyphen is inserted only at real word boundaries.
 */
export function normalizeName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2") // camel boundary:  worldT → world-T
    .replace(/([A-Z]+)([A-Z][a-z0-9]+)/g, "$1-$2") // acronym→word: USMetrics → US-Metrics
    .toLowerCase();
}

// ── Manifest parse (augments PLATFORM_SKIP with any non-portable entries) ──────
function nonPortableFromManifest(): Set<string> {
  const skip = new Set<string>();
  if (!existsSync(MANIFEST)) return skip;
  const text = readFileSync(MANIFEST, "utf-8");
  const marker = text.indexOf("not ported");
  if (marker === -1) return skip;
  // Bold skill names (`**Name**`) appearing after the "not ported" heading.
  for (const m of text.slice(marker).matchAll(/\*\*([A-Za-z0-9_]+)\*\*/g)) skip.add(m[1]);
  return skip;
}

// ── Hashing ──────────────────────────────────────────────────────────────────
function sha256(path: string): string | null {
  try {
    return createHash("sha256").update(readFileSync(path)).digest("hex");
  } catch {
    return null;
  }
}

// ── Result types ─────────────────────────────────────────────────────────────
interface Plan {
  installed: Array<{ from: string; to: string }>;
  skippedPrivate: number;
  skippedPlatform: string[];
  collisionsIdentical: string[];
  collisionsConflict: string[];
  invalid: string[];
}

function buildPlan(skillsDir: string): Plan {
  const plan: Plan = {
    installed: [],
    skippedPrivate: 0,
    skippedPlatform: [],
    collisionsIdentical: [],
    collisionsConflict: [],
    invalid: [],
  };
  if (!existsSync(SRC_SKILLS)) {
    console.error(`✗ source skills dir not found: ${SRC_SKILLS}`);
    process.exit(1);
  }
  const platformSkip = new Set([...PLATFORM_SKIP, ...nonPortableFromManifest()]);

  for (const entry of readdirSync(SRC_SKILLS, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;

    // 1. Private boundary — unconditional, counted only (never named).
    if (name.startsWith("_")) {
      plan.skippedPrivate++;
      continue;
    }
    // 2. Platform boundary.
    if (platformSkip.has(name)) {
      plan.skippedPlatform.push(name);
      continue;
    }
    // A skill dir without a SKILL.md is not a skill.
    const srcSkillMd = join(SRC_SKILLS, name, "SKILL.md");
    if (!existsSync(srcSkillMd)) {
      plan.invalid.push(name);
      continue;
    }
    // 3. Normalize + collision-check on SKILL.md hash.
    const normalized = normalizeName(name);
    const targetDir = join(skillsDir, normalized);
    const targetSkillMd = join(targetDir, "SKILL.md");
    if (existsSync(targetSkillMd)) {
      const same = sha256(srcSkillMd) === sha256(targetSkillMd);
      (same ? plan.collisionsIdentical : plan.collisionsConflict).push(normalized);
      continue; // never overwrite an existing target
    }
    plan.installed.push({ from: join(SRC_SKILLS, name), to: targetDir });
  }
  return plan;
}

// ── Apply ────────────────────────────────────────────────────────────────────
function apply(plan: Plan, skillsDir: string): void {
  mkdirSync(skillsDir, { recursive: true });
  for (const { from, to } of plan.installed) {
    cpSync(from, to, { recursive: true });
  }
  // Record provenance: imported skills are `source: local` (survive Hermes curator
  // lifecycle, clearly marked as imported — distinct from `builtin`/`official`).
  const manifestPath = join(skillsDir, ".lifeos-import.json");
  let prior: Record<string, unknown> = {};
  if (existsSync(manifestPath)) {
    try {
      prior = JSON.parse(readFileSync(manifestPath, "utf-8"));
    } catch {
      prior = {};
    }
  }
  const skills = { ...((prior.skills as Record<string, string>) ?? {}) };
  for (const { to } of plan.installed) skills[to.split(/[\\/]/).pop()!] = "local";
  writeFileSync(
    manifestPath,
    JSON.stringify({ source: "lifeos", trust: "local", skills }, null, 2),
  );
}

// ── Report ───────────────────────────────────────────────────────────────────
function report(plan: Plan, skillsDir: string, dryRun: boolean): void {
  const tag = dryRun ? "[dry-run] " : "";
  console.log(`\n${tag}LifeOS → Hermes skill import`);
  console.log(`  target: ${skillsDir}\n`);

  console.log(`  ${dryRun ? "would install" : "installed"}: ${plan.installed.length}`);
  for (const { from, to } of plan.installed) {
    console.log(`    ${from.split(/[\\/]/).pop()}  →  ${to.split(/[\\/]/).pop()}`);
  }
  console.log(`  skipped (private):  ${plan.skippedPrivate}`);
  console.log(`  skipped (platform): ${plan.skippedPlatform.length}${plan.skippedPlatform.length ? `  (${plan.skippedPlatform.join(", ")})` : ""}`);
  console.log(`  collisions (identical, skipped): ${plan.collisionsIdentical.length}${plan.collisionsIdentical.length ? `  (${plan.collisionsIdentical.join(", ")})` : ""}`);
  console.log(`  collisions (CONFLICT, not written): ${plan.collisionsConflict.length}${plan.collisionsConflict.length ? `  (${plan.collisionsConflict.join(", ")})` : ""}`);
  if (plan.invalid.length) console.log(`  skipped (no SKILL.md): ${plan.invalid.join(", ")}`);

  const total =
    plan.installed.length +
    plan.skippedPrivate +
    plan.skippedPlatform.length +
    plan.collisionsIdentical.length +
    plan.collisionsConflict.length +
    plan.invalid.length;
  console.log(`  total scanned: ${total}`);

  if (plan.collisionsConflict.length) {
    console.log(`\n  ⚠ ${plan.collisionsConflict.length} conflict(s): a differing SKILL.md already exists.`);
    console.log(`    Resolve by hand — nothing was overwritten.`);
  }

  console.log(`\n  Next steps:`);
  console.log(`    hermes skills list        # verify the imported LifeOS skills appear`);
  console.log(`    /reload-skills            # load the new skill body into an active session`);
  if (dryRun) console.log(`\n  Re-run without --dry-run to write.`);
}

// ── Entrypoint ───────────────────────────────────────────────────────────────
function main(): void {
  const dryRun = process.argv.includes("--dry-run");
  const home = homedir();
  // detectHarness resolves where skills load from; force the Hermes convention
  // ($HERMES_HOME/skills or ~/.hermes/skills) since this importer targets Hermes.
  const harness = detectHarness(home);
  const skillsDir =
    harness.name === "hermes" && harness.skillsDir
      ? harness.skillsDir
      : getHarnessSkillsDir("hermes", home);

  const plan = buildPlan(skillsDir);
  if (!dryRun) apply(plan, skillsDir);
  report(plan, skillsDir, dryRun);
  process.exit(0);
}

main();
