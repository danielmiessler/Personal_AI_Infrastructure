#!/usr/bin/env bun
/**
 * PaiArchitecture.ts
 *
 * Scans the PAI installation and generates Architecture.md
 * tracking all installed packs, bundles, plugins, and upgrades.
 *
 * Usage:
 *   bun $PAI_DIR/tools/PaiArchitecture.ts generate    # Generate/refresh Architecture.md
 *   bun $PAI_DIR/tools/PaiArchitecture.ts status      # Show current state (stdout)
 *   bun $PAI_DIR/tools/PaiArchitecture.ts check       # Verify installation health
 *   bun $PAI_DIR/tools/PaiArchitecture.ts log-upgrade "description"  # Add upgrade entry
 */

import { readdir, readFile, writeFile, appendFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const PAI_DIR = process.env.PAI_DIR || process.env.PAI_HOME || join(process.env.HOME || '', '.claude');
const ARCHITECTURE_FILE = join(PAI_DIR, 'skills', 'CORE', 'PaiArchitecture.md');
const BUNDLES_FILE = join(PAI_DIR, '.installed-bundles.json');
const UPGRADES_FILE = join(PAI_DIR, 'history', 'Upgrades.jsonl');

interface PackInfo {
  name: string;
  version: string;
  installedDate: string;
  status: 'healthy' | 'warning' | 'error';
}

interface BundleInfo {
  name: string;
  packs: string[];
  installedDate: string;
}

interface UpgradeEntry {
  date: string;
  type: 'pack' | 'config' | 'bundle' | 'plugin';
  description: string;
}

async function detectInstalledPacks(): Promise<PackInfo[]> {
  const packs: PackInfo[] = [];
  const skillsDir = join(PAI_DIR, 'skills');

  if (!existsSync(skillsDir)) return packs;

  const entries = await readdir(skillsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

    const skillFile = join(skillsDir, entry.name, 'SKILL.md');
    if (!existsSync(skillFile)) continue;

    const content = await readFile(skillFile, 'utf-8');
    const nameMatch = content.match(/^name:\s*(.+)$/m);

    packs.push({
      name: nameMatch?.[1]?.trim() || entry.name,
      version: '1.0.0',
      installedDate: new Date().toISOString().split('T')[0],
      status: 'healthy'
    });
  }

  return packs;
}

async function detectInstalledBundles(): Promise<BundleInfo[]> {
  if (!existsSync(BUNDLES_FILE)) return [];

  try {
    const content = await readFile(BUNDLES_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function loadUpgradeHistory(): Promise<UpgradeEntry[]> {
  if (!existsSync(UPGRADES_FILE)) return [];

  try {
    const content = await readFile(UPGRADES_FILE, 'utf-8');
    return content.trim().split('\n').filter(l => l).map(l => JSON.parse(l));
  } catch {
    return [];
  }
}

async function checkSystemHealth(): Promise<Record<string, string>> {
  const health: Record<string, string> = {};

  // Check hooks
  const hooksDir = join(PAI_DIR, 'hooks');
  health['Hook System'] = existsSync(hooksDir) ? '✓ Healthy' : '✗ Not installed';

  // Check history
  const historyDir = join(PAI_DIR, 'history');
  health['History System'] = existsSync(historyDir) ? '✓ Healthy' : '✗ Not installed';

  // Check skills
  const skillsDir = join(PAI_DIR, 'skills');
  if (existsSync(skillsDir)) {
    const skills = (await readdir(skillsDir)).filter(f => !f.startsWith('.') && !f.endsWith('.json'));
    health['Skills'] = `✓ ${skills.length} loaded`;
  } else {
    health['Skills'] = '✗ Not installed';
  }

  return health;
}

async function generateArchitectureMd(): Promise<string> {
  const packs = await detectInstalledPacks();
  const bundles = await detectInstalledBundles();
  const upgrades = await loadUpgradeHistory();
  const health = await checkSystemHealth();

  let md = `# PAI Architecture

> Auto-generated tracking file. Run \`bun $PAI_DIR/Tools/PaiArchitecture.ts generate\` to refresh.

**Last Updated:** ${new Date().toISOString()}

## Installation Summary

| Category | Count |
|----------|-------|
| Packs | ${packs.length} |
| Bundles | ${bundles.length} |
| Upgrades | ${upgrades.length} |

## Installed Packs

| Pack | Version | Status |
|------|---------|--------|
${packs.map(p => `| ${p.name} | ${p.version} | ${p.status} |`).join('\n')}

## Upgrade History

| Date | Type | Description |
|------|------|-------------|
${upgrades.slice(-10).reverse().map(u => `| ${u.date} | ${u.type} | ${u.description} |`).join('\n') || '| - | - | No upgrades recorded |'}

## System Health

${Object.entries(health).map(([k, v]) => `- **${k}:** ${v}`).join('\n')}

---

*This file is auto-generated. Do not edit manually.*
`;

  return md;
}

async function logUpgrade(description: string, type: string = 'pack'): Promise<void> {
  const entry: UpgradeEntry = {
    date: new Date().toISOString().split('T')[0],
    type: type as any,
    description
  };

  const dir = join(PAI_DIR, 'history');
  if (!existsSync(dir)) {
    const { mkdir } = await import('fs/promises');
    await mkdir(dir, { recursive: true });
  }

  await appendFile(UPGRADES_FILE, JSON.stringify(entry) + '\n');
  console.log(`✓ Logged upgrade: ${description}`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';

  switch (command) {
    case 'generate':
      const md = await generateArchitectureMd();
      await writeFile(ARCHITECTURE_FILE, md);
      console.log(`✓ Generated: ${ARCHITECTURE_FILE}`);
      break;

    case 'status':
      console.log(await generateArchitectureMd());
      break;

    case 'check':
      const health = await checkSystemHealth();
      console.log('\n📊 System Health Check\n');
      for (const [k, v] of Object.entries(health)) {
        console.log(`  ${k}: ${v}`);
      }
      break;

    case 'log-upgrade':
      if (!args[1]) {
        console.error('Usage: PaiArchitecture.ts log-upgrade "description"');
        process.exit(1);
      }
      await logUpgrade(args[1], args[2] || 'pack');
      break;

    default:
      console.log('Usage: PaiArchitecture.ts [generate|status|check|log-upgrade]');
  }
}

main().catch(console.error);
