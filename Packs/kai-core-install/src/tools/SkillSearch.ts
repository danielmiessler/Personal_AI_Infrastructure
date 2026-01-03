#!/usr/bin/env bun
/**
 * SkillSearch.ts
 *
 * Search the skill index to discover capabilities dynamically.
 *
 * Usage:
 *   bun run $PAI_DIR/tools/SkillSearch.ts <query>
 *   bun run $PAI_DIR/tools/SkillSearch.ts --list
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const PAI_DIR = process.env.PAI_DIR || process.env.PAI_HOME || join(process.env.HOME || '', '.claude');
const INDEX_FILE = join(PAI_DIR, 'skills', 'skill-index.json');

interface SkillEntry {
  name: string;
  path: string;
  fullDescription: string;
  triggers: string[];
  workflows: string[];
  tier: 'always' | 'deferred';
}

interface SkillIndex {
  generated: string;
  totalSkills: number;
  skills: Record<string, SkillEntry>;
}

function searchSkills(query: string, index: SkillIndex) {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  const results: { skill: SkillEntry; score: number }[] = [];

  for (const [key, skill] of Object.entries(index.skills)) {
    let score = 0;

    if (key.includes(query.toLowerCase())) score += 10;

    for (const term of queryTerms) {
      for (const trigger of skill.triggers) {
        if (trigger.includes(term)) score += 5;
      }
      if (skill.fullDescription.toLowerCase().includes(term)) score += 2;
    }

    if (score > 0) results.push({ skill, score });
  }

  return results.sort((a, b) => b.score - a.score);
}

async function main() {
  if (!existsSync(INDEX_FILE)) {
    console.error('❌ Skill index not found. Run GenerateSkillIndex.ts first.');
    process.exit(1);
  }

  const index: SkillIndex = JSON.parse(await readFile(INDEX_FILE, 'utf-8'));
  const args = process.argv.slice(2);

  if (args.includes('--list') || args.length === 0) {
    console.log(`\n📚 Skill Index (${index.totalSkills} skills)\n`);
    for (const skill of Object.values(index.skills).sort((a, b) => a.name.localeCompare(b.name))) {
      const icon = skill.tier === 'always' ? '🔒' : '📦';
      console.log(`  ${icon} ${skill.name.padEnd(20)} │ ${skill.triggers.slice(0, 3).join(', ')}`);
    }
    return;
  }

  const query = args.join(' ');
  const results = searchSkills(query, index).slice(0, 5);

  console.log(`\n🔍 Searching for: "${query}"\n`);
  for (const { skill, score } of results) {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`${skill.tier === 'always' ? '🔒' : '📦'} **${skill.name}** (score: ${score})`);
    console.log(`Path: ${skill.path}`);
    console.log(`Workflows: ${skill.workflows.join(', ')}`);
  }
}

main().catch(console.error);
