#!/usr/bin/env bun
/**
 * PAI Pack Validator
 *
 * Validates that PAI packs meet completeness requirements:
 * - Skill packs have SKILL.md with valid workflow references
 * - All referenced workflows exist
 * - Required files (README.md, INSTALL.md, VERIFY.md) present
 *
 * Usage:
 *   bun run Tools/validate-pack.ts                    # Validate all packs
 *   bun run Tools/validate-pack.ts kai-agents-skill   # Validate specific pack
 *   bun run Tools/validate-pack.ts --changed-only     # Validate changed packs (for CI)
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, basename } from 'path';

const PACKS_DIR = join(import.meta.dir, '..', 'Packs');

// Pack type classification
const SYSTEM_PACKS = [
  'kai-hook-system',
  'kai-history-system',
  'kai-voice-system',
  'kai-observability-server',
  'icons'
];

interface ValidationResult {
  pack: string;
  type: 'skill' | 'system';
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function findSkillMd(packDir: string): string | null {
  // Check common locations for SKILL.md
  const locations = [
    join(packDir, 'SKILL.md'),
    join(packDir, 'src', 'skills'),
  ];

  // Direct SKILL.md at root
  if (existsSync(locations[0])) {
    return locations[0];
  }

  // Search in src/skills/*/SKILL.md
  const skillsDir = locations[1];
  if (existsSync(skillsDir)) {
    const skills = readdirSync(skillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => join(skillsDir, d.name, 'SKILL.md'))
      .filter(p => existsSync(p));

    if (skills.length > 0) {
      return skills[0];
    }
  }

  return null;
}

function extractWorkflowRefs(skillMdContent: string): string[] {
  const refs: string[] = [];

  // Match patterns like: `Workflows/SomeName.md` or Workflows/SomeName.md
  const workflowPattern = /Workflows\/([A-Za-z0-9_-]+\.md)/g;
  let match;

  while ((match = workflowPattern.exec(skillMdContent)) !== null) {
    refs.push(match[1]);
  }

  return [...new Set(refs)]; // Deduplicate
}

function validatePack(packName: string): ValidationResult {
  const packDir = join(PACKS_DIR, packName);
  const result: ValidationResult = {
    pack: packName,
    type: SYSTEM_PACKS.includes(packName) ? 'system' : 'skill',
    valid: true,
    errors: [],
    warnings: []
  };

  // Check pack directory exists
  if (!existsSync(packDir)) {
    result.valid = false;
    result.errors.push(`Pack directory not found: ${packDir}`);
    return result;
  }

  // Check required files
  const requiredFiles = ['README.md', 'INSTALL.md', 'VERIFY.md'];
  for (const file of requiredFiles) {
    if (!existsSync(join(packDir, file))) {
      result.warnings.push(`Missing recommended file: ${file}`);
    }
  }

  // System packs don't need SKILL.md validation
  if (result.type === 'system') {
    return result;
  }

  // Skill packs: validate SKILL.md and workflow references
  const skillMdPath = findSkillMd(packDir);

  if (!skillMdPath) {
    result.valid = false;
    result.errors.push('Skill pack missing SKILL.md');
    return result;
  }

  const skillMdContent = readFileSync(skillMdPath, 'utf-8');
  const workflowRefs = extractWorkflowRefs(skillMdContent);

  if (workflowRefs.length === 0) {
    result.warnings.push('No workflow references found in SKILL.md');
    return result;
  }

  // Check each workflow reference exists
  const skillDir = join(skillMdPath, '..');
  const workflowsDir = join(skillDir, 'Workflows');

  for (const ref of workflowRefs) {
    const workflowPath = join(workflowsDir, ref);
    if (!existsSync(workflowPath)) {
      result.valid = false;
      result.errors.push(`Missing workflow: Workflows/${ref} (referenced in SKILL.md)`);
    }
  }

  return result;
}

function validateAllPacks(): ValidationResult[] {
  const results: ValidationResult[] = [];

  if (!existsSync(PACKS_DIR)) {
    console.error(`Packs directory not found: ${PACKS_DIR}`);
    process.exit(1);
  }

  const packs = readdirSync(PACKS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .filter(name => !name.startsWith('.'));

  for (const pack of packs) {
    results.push(validatePack(pack));
  }

  return results;
}

function printResults(results: ValidationResult[]): boolean {
  let hasErrors = false;

  console.log('\n📦 PAI Pack Validation Results\n');
  console.log('═'.repeat(60));

  for (const result of results) {
    const icon = result.valid ? '✅' : '❌';
    const typeIcon = result.type === 'skill' ? '🎯' : '⚙️';

    console.log(`\n${icon} ${result.pack} ${typeIcon} (${result.type})`);

    if (result.errors.length > 0) {
      hasErrors = true;
      for (const error of result.errors) {
        console.log(`   ❌ ${error}`);
      }
    }

    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        console.log(`   ⚠️  ${warning}`);
      }
    }

    if (result.valid && result.errors.length === 0 && result.warnings.length === 0) {
      console.log('   All checks passed');
    }
  }

  console.log('\n' + '═'.repeat(60));

  const valid = results.filter(r => r.valid).length;
  const total = results.length;
  console.log(`\n📊 Summary: ${valid}/${total} packs valid`);

  if (hasErrors) {
    console.log('\n❌ Validation FAILED - fix errors before merging\n');
  } else {
    console.log('\n✅ Validation PASSED\n');
  }

  return !hasErrors;
}

// Main
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
PAI Pack Validator

Usage:
  bun run Tools/validate-pack.ts                    # Validate all packs
  bun run Tools/validate-pack.ts kai-agents-skill   # Validate specific pack
  bun run Tools/validate-pack.ts --changed-only     # Validate changed packs (for CI)

Pack Types:
  - Skill packs (🎯): Must have SKILL.md with valid workflow references
  - System packs (⚙️): Infrastructure packs, no SKILL.md required
`);
  process.exit(0);
}

let results: ValidationResult[];

if (args.length > 0 && !args[0].startsWith('--')) {
  // Validate specific pack
  results = [validatePack(args[0])];
} else {
  // Validate all packs
  results = validateAllPacks();
}

const success = printResults(results);
process.exit(success ? 0 : 1);
