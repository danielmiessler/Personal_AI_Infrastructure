#!/usr/bin/env bun
/**
 * mai-init - Project Creation CLI
 *
 * Deterministic prompts guide user through project setup.
 * Generates CLAUDE.md from collected inputs.
 */

import { select, input, confirm } from '@inquirer/prompts';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createGatesForProject } from 'mai-project-core';

const PROJECT_TYPES = ['software', 'physical', 'documentation', 'infrastructure'] as const;
type ProjectType = typeof PROJECT_TYPES[number];

export interface ProjectConfig {
  type: ProjectType;
  name: string;
  location: string;
  owner: string;
  problemStatement: string;
  successCriteria: string[];
  constraints: string[];
  mvp?: string;
  typeSpecific: Record<string, string>;
}

async function main() {
  const args = process.argv.slice(2);
  const isExisting = args.includes('--existing');
  const typeArg = args.find(a => a.startsWith('--type='))?.split('=')[1] as ProjectType | undefined;

  console.log('\n=== MAI Project Initialization ===\n');

  if (isExisting) {
    await initExisting(typeArg);
    return;
  }

  // 1. PROJECT TYPE (Required)
  const type = typeArg || await select({
    message: '1. Project Type',
    choices: PROJECT_TYPES.map(t => ({ value: t, name: t.charAt(0).toUpperCase() + t.slice(1) })),
  }) as ProjectType;

  // 2. PROJECT IDENTITY
  const name = await input({
    message: '2. Project Name',
    validate: (v) => v.length > 0 || 'Name is required',
  });

  const defaultLocation = join(
    process.env.HOME || '',
    'workshop/projects',
    name.toLowerCase().replace(/\s+/g, '-')
  );
  const location = await input({
    message: '   Location',
    default: defaultLocation,
  });

  const owner = await input({
    message: '   Owner',
    default: 'Joey',
  });

  // 3. PROBLEM STATEMENT (Required)
  const problemStatement = await input({
    message: '3. Problem Statement - What problem are we solving?',
    validate: (v) => v.length > 0 || 'Problem statement is required',
  });

  // 4. SUCCESS CRITERIA (Required, at least one)
  const successCriteria: string[] = [];
  console.log('4. Success Criteria - How do we know we\'re done? (Enter blank line when done)');
  while (true) {
    const criterion = await input({
      message: `   Criterion ${successCriteria.length + 1}`,
    });
    if (!criterion && successCriteria.length > 0) break;
    if (!criterion && successCriteria.length === 0) {
      console.log('   At least one success criterion is required.');
      continue;
    }
    successCriteria.push(criterion);
  }

  // 5. CONSTRAINTS (Optional)
  const constraints: string[] = [];
  console.log('5. Constraints - What are the boundaries? (Enter blank line when done)');
  while (true) {
    const constraint = await input({
      message: `   Constraint ${constraints.length + 1}`,
    });
    if (!constraint) break;
    constraints.push(constraint);
  }

  // 6. MVP DEFINITION (Required for software)
  let mvp: string | undefined;
  if (type === 'software') {
    mvp = await input({
      message: '6. MVP Definition - What\'s the minimum viable product?',
      validate: (v) => v.length > 0 || 'MVP is required for software projects',
    });
  }

  // 7. TYPE-SPECIFIC SECTIONS
  const typeSpecific: Record<string, string> = {};
  console.log(`7. ${type.charAt(0).toUpperCase() + type.slice(1)}-Specific Details`);

  if (type === 'software') {
    typeSpecific.language = await input({ message: '   Language', default: 'TypeScript' });
    typeSpecific.runtime = await input({ message: '   Runtime', default: 'Bun' });
    typeSpecific.packageManager = await input({ message: '   Package Manager', default: 'bun' });
    typeSpecific.security = await input({ message: '   Security Considerations' });
  } else if (type === 'physical') {
    typeSpecific.materials = await input({ message: '   Materials needed' });
    typeSpecific.safety = await input({ message: '   Safety considerations' });
    typeSpecific.budget = await input({ message: '   Budget allocation' });
  } else if (type === 'documentation') {
    typeSpecific.audience = await input({ message: '   Target audience' });
    typeSpecific.format = await input({ message: '   Format requirements' });
  } else if (type === 'infrastructure') {
    typeSpecific.dependencies = await input({ message: '   Dependencies' });
    typeSpecific.rollback = await input({ message: '   Rollback plan' });
  }

  const config: ProjectConfig = {
    type,
    name,
    location,
    owner,
    problemStatement,
    successCriteria,
    constraints,
    mvp,
    typeSpecific,
  };

  // 8. REVIEW & CONFIRM
  console.log('\n=== Review ===\n');
  console.log(generateClaudeMd(config));

  const confirmed = await confirm({
    message: '\nCreate project with this configuration?',
    default: true,
  });

  if (confirmed) {
    createProject(config);
    console.log(`\nProject created at: ${config.location}`);
  } else {
    console.log('\nProject creation cancelled.');
  }
}

async function initExisting(typeHint?: ProjectType): Promise<void> {
  const cwd = process.cwd();

  // Check for existing project markers
  const hasPackageJson = existsSync(join(cwd, 'package.json'));
  const hasGit = existsSync(join(cwd, '.git'));
  const hasClaude = existsSync(join(cwd, 'CLAUDE.md'));

  if (hasClaude) {
    console.log('CLAUDE.md already exists in this directory.');
    const overwrite = await confirm({
      message: 'Overwrite existing CLAUDE.md?',
      default: false,
    });
    if (!overwrite) {
      console.log('Cancelled.');
      return;
    }
  }

  // Infer project type
  let inferredType: ProjectType = typeHint || 'software';
  if (!typeHint) {
    if (hasPackageJson) {
      inferredType = 'software';
      console.log('Detected: package.json - assuming software project');
    } else if (existsSync(join(cwd, 'ansible.cfg')) || existsSync(join(cwd, 'terraform'))) {
      inferredType = 'infrastructure';
      console.log('Detected: infrastructure configuration');
    }
  }

  const type = await select({
    message: 'Confirm project type',
    choices: PROJECT_TYPES.map(t => ({ value: t, name: t.charAt(0).toUpperCase() + t.slice(1) })),
    default: inferredType,
  }) as ProjectType;

  const name = await input({
    message: 'Project name',
    default: cwd.split('/').pop() || 'project',
  });

  const problemStatement = await input({
    message: 'Problem statement',
    validate: v => v.length > 0 || 'Required',
  });

  const config: ProjectConfig = {
    type,
    name,
    location: cwd,
    owner: 'Joey',
    problemStatement,
    successCriteria: ['To be defined'],
    constraints: [],
    typeSpecific: {},
  };

  writeFileSync(join(cwd, 'CLAUDE.md'), generateClaudeMd(config));

  if (!existsSync(join(cwd, '.gitignore'))) {
    writeFileSync(join(cwd, '.gitignore'), 'CLAUDE.local.md\n');
  } else {
    // Append to existing .gitignore
    const gitignore = Bun.file(join(cwd, '.gitignore'));
    const content = await gitignore.text();
    if (!content.includes('CLAUDE.local.md')) {
      writeFileSync(join(cwd, '.gitignore'), content + '\nCLAUDE.local.md\n');
    }
  }

  console.log(`\nCLAUDE.md created in ${cwd}`);
}

export function generateClaudeMd(config: ProjectConfig): string {
  const gates = createGatesForProject(config.type);
  const gatesTable = gates.map(g => `| ${g.name} | Pending | - |`).join('\n');

  return `# ${config.name}

**Project Type:** ${config.type.charAt(0).toUpperCase() + config.type.slice(1)}
**Owner:** ${config.owner}
**Status:** Planning

## Problem Statement

${config.problemStatement}

## Success Criteria

${config.successCriteria.map(c => `- ${c}`).join('\n')}

## Constraints

${config.constraints.length > 0 ? config.constraints.map(c => `- ${c}`).join('\n') : 'None specified.'}

${config.mvp ? `## MVP\n\n${config.mvp}\n` : ''}
## Current Phase

**Phase:** SPEC
**Gate Required:** SPEC_APPROVED

## Gates

| Gate | Status | Date |
|------|--------|------|
${gatesTable}

## Task List Location

File: ./tasks.yaml

${Object.keys(config.typeSpecific).length > 0 ? `## ${config.type.charAt(0).toUpperCase() + config.type.slice(1)} Details\n\n${Object.entries(config.typeSpecific).map(([k, v]) => `- **${k}:** ${v}`).join('\n')}` : ''}
`;
}

export function createProject(config: ProjectConfig): void {
  // Create directory
  if (!existsSync(config.location)) {
    mkdirSync(config.location, { recursive: true });
  }

  // Write CLAUDE.md
  writeFileSync(join(config.location, 'CLAUDE.md'), generateClaudeMd(config));

  // Write .gitignore
  writeFileSync(join(config.location, '.gitignore'), 'CLAUDE.local.md\n');

  // Write empty tasks.yaml
  writeFileSync(join(config.location, 'tasks.yaml'), `# Tasks for ${config.name}\ntasks: []\n`);

  // For software projects, create SPEC.md template
  if (config.type === 'software') {
    writeFileSync(join(config.location, 'SPEC.md'), `# ${config.name} - Specification

**Status:** DRAFT

## 1. Overview

(To be completed)

## 2. Requirements

(To be completed)

## 3. Architecture

(To be completed)
`);
  }
}

main().catch(console.error);
