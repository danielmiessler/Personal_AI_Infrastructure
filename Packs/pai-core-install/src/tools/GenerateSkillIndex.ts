#!/usr/bin/env bun
/**
 * GenerateSkillIndex.ts
 *
 * Parses all SKILL.md files and builds a searchable index.
 *
 * Usage: bun run $PAI_DIR/tools/GenerateSkillIndex.ts
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const PAI_DIR = process.env.PAI_DIR || process.env.PAI_HOME || join(process.env.HOME || '', '.claude');
const SKILLS_DIR = join(PAI_DIR, 'skills');
const OUTPUT_FILE = join(SKILLS_DIR, 'skill-index.json');

const ALWAYS_LOADED_SKILLS = ['CORE'];

async function findSkillFiles(dir: string): Promise<string[]> {
  const skillFiles: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const skillMdPath = join(dir, entry.name, 'SKILL.md');
      if (existsSync(skillMdPath)) skillFiles.push(skillMdPath);
    }
  }
  return skillFiles;
}

function parseFrontmatter(content: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const nameMatch = match[1].match(/^name:\s*(.+)$/m);
  const descMatch = match[1].match(/^description:\s*(.+)$/m);

  return {
    name: nameMatch?.[1]?.trim() || '',
    description: descMatch?.[1]?.trim() || ''
  };
}

function extractTriggers(description: string): string[] {
  const triggers: string[] = [];
  const useWhenMatch = description.match(/USE WHEN[^.]+/gi);

  if (useWhenMatch) {
    for (const match of useWhenMatch) {
      const words = match.replace(/USE WHEN/gi, '').split(/[,\s]+/)
        .map(w => w.toLowerCase().trim())
        .filter(w => w.length > 2);
      triggers.push(...words);
    }
  }
  return [...new Set(triggers)];
}

async function main() {
  console.log('Generating skill index...\n');

  const skillFiles = await findSkillFiles(SKILLS_DIR);
  const index: any = {
    generated: new Date().toISOString(),
    totalSkills: 0,
    alwaysLoadedCount: 0,
    deferredCount: 0,
    skills: {}
  };

  for (const filePath of skillFiles) {
    const content = await readFile(filePath, 'utf-8');
    const fm = parseFrontmatter(content);
    if (!fm?.name) continue;

    const tier = ALWAYS_LOADED_SKILLS.includes(fm.name) ? 'always' : 'deferred';
    const key = fm.name.toLowerCase();

    index.skills[key] = {
      name: fm.name,
      path: filePath.replace(SKILLS_DIR, '').replace(/^\//, ''),
      fullDescription: fm.description,
      triggers: extractTriggers(fm.description),
      workflows: [],
      tier
    };

    index.totalSkills++;
    if (tier === 'always') index.alwaysLoadedCount++;
    else index.deferredCount++;

    console.log(`  ${tier === 'always' ? '🔒' : '📦'} ${fm.name}`);
  }

  await writeFile(OUTPUT_FILE, JSON.stringify(index, null, 2));
  console.log(`\n✅ Index generated: ${OUTPUT_FILE}`);
  console.log(`   Total: ${index.totalSkills} skills`);
}

main().catch(console.error);
