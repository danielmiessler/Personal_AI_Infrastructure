#!/usr/bin/env bun
/**
 * CI PAI Setup — Configures PAI for CI environments
 *
 * Run AFTER copying Releases/v3.0/.claude/ to ~/.claude/
 * Resolves template variables (${PAI_DIR}) and sets CI identity.
 *
 * Usage: bun run tests/ci-setup-pai.ts [--name NAME] [--ai-name AI_NAME] [--timezone TZ]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { spawnSync } from 'child_process';

const PAI_DIR = join(homedir(), '.claude');
const SETTINGS_PATH = join(PAI_DIR, 'settings.json');

// ─── Parse CLI args ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(flag: string, fallback: string): string {
  const idx = args.indexOf(flag);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}

const principalName = getArg('--name', 'CI-Tester');
const aiName = getArg('--ai-name', 'CI-JAI');
const timezone = getArg('--timezone', 'UTC');

// ─── Setup ───────────────────────────────────────────────────────────────────

console.log('PAI CI Setup');
console.log('════════════════════════════════════');
console.log(`  Platform:  ${process.platform} (${process.arch})`);
console.log(`  PAI_DIR:   ${PAI_DIR}`);
console.log(`  Principal: ${principalName}`);
console.log(`  AI Name:   ${aiName}`);
console.log(`  Timezone:  ${timezone}`);
console.log();

if (!existsSync(SETTINGS_PATH)) {
  console.error(`ERROR: ${SETTINGS_PATH} not found`);
  console.error('  Copy Releases/v3.0/.claude/ to ~/.claude/ first.');
  process.exit(1);
}

// ─── 1. Update settings.json ─────────────────────────────────────────────────

console.log('1. Updating settings.json...');
const raw = readFileSync(SETTINGS_PATH, 'utf-8');
// Strip BOM if present (Windows PowerShell can add this)
const clean = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
const settings = JSON.parse(clean);

// Resolve template variables to actual paths
settings.env = {
  ...settings.env,
  PAI_DIR: PAI_DIR,
  PROJECTS_DIR: resolve(homedir()),
  PAI_CONFIG_DIR: join(homedir(), '.config', 'PAI'),
};

// Set CI identity
settings.principal = {
  ...settings.principal,
  name: principalName,
  timezone,
};

settings.daidentity = {
  ...settings.daidentity,
  name: aiName,
  fullName: `${aiName} — Personal AI`,
  displayName: aiName.toUpperCase(),
};

writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
console.log(`  Done — ${SETTINGS_PATH}`);

// ─── 2. Create required directories ──────────────────────────────────────────

console.log('2. Ensuring directory structure...');
const dirs = [
  'MEMORY', 'MEMORY/STATE', 'MEMORY/WORK',
  'MEMORY/LEARNING', 'MEMORY/LEARNING/REFLECTIONS',
  '.prd', 'Plans',
];
for (const dir of dirs) {
  const fullPath = join(PAI_DIR, dir);
  if (!existsSync(fullPath)) {
    mkdirSync(fullPath, { recursive: true });
    console.log(`  Created ${dir}/`);
  }
}
console.log('  Done');

// ─── 3. Rebuild SKILL.md ─────────────────────────────────────────────────────

console.log('3. Running RebuildPAI.ts...');
const rebuildPath = join(PAI_DIR, 'skills', 'PAI', 'Tools', 'RebuildPAI.ts');
if (existsSync(rebuildPath)) {
  const result = spawnSync('bun', ['run', rebuildPath], {
    encoding: 'utf-8',
    timeout: 30_000,
    cwd: PAI_DIR,
    env: process.env,
  });
  if (result.status === 0) {
    console.log('  Done — SKILL.md rebuilt with identity variables');
  } else {
    console.warn(`  WARNING: RebuildPAI.ts exited with code ${result.status}`);
    if (result.stderr) console.warn(`  ${result.stderr.slice(0, 300)}`);
  }
} else {
  console.warn(`  WARNING: RebuildPAI.ts not found at ${rebuildPath}`);
}

// ─── 4. Verify ───────────────────────────────────────────────────────────────

console.log('4. Verification...');
const verify = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
const checks: [string, boolean][] = [
  ['env.PAI_DIR resolved (no ${...})', !String(verify.env?.PAI_DIR || '').includes('${')],
  [`principal.name = "${principalName}"`, verify.principal?.name === principalName],
  [`daidentity.name = "${aiName}"`, verify.daidentity?.name === aiName],
  ['hooks section present', !!verify.hooks && Object.keys(verify.hooks).length > 0],
  ['contextFiles present', Array.isArray(verify.contextFiles) && verify.contextFiles.length > 0],
];

let allPass = true;
for (const [label, pass] of checks) {
  console.log(`  ${pass ? 'PASS' : 'FAIL'}: ${label}`);
  if (!pass) allPass = false;
}

if (allPass) {
  console.log('\nPAI configured for CI successfully');
} else {
  console.error('\nSome checks failed — CI tests may not work correctly');
  process.exit(1);
}
