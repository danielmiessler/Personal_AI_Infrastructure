/**
 * mai-init Tests
 *
 * Tests for project creation functionality.
 * Note: Interactive prompts are not tested directly.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, rmSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { generateClaudeMd, createProject, type ProjectConfig } from '../src/Tools/mai-init.ts';

const TEST_DIR = join(import.meta.dir, '.test-output');

beforeEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
});

describe('generateClaudeMd', () => {
  const baseConfig: ProjectConfig = {
    type: 'software',
    name: 'Test Project',
    location: '/tmp/test',
    owner: 'Joey',
    problemStatement: 'Need to test the generator',
    successCriteria: ['Tests pass', 'Code works'],
    constraints: ['Must use TypeScript'],
    mvp: 'Basic functionality working',
    typeSpecific: {
      language: 'TypeScript',
      runtime: 'Bun',
    },
  };

  test('includes project name as title', () => {
    const result = generateClaudeMd(baseConfig);
    expect(result).toContain('# Test Project');
  });

  test('includes project type', () => {
    const result = generateClaudeMd(baseConfig);
    expect(result).toContain('**Project Type:** Software');
  });

  test('includes owner', () => {
    const result = generateClaudeMd(baseConfig);
    expect(result).toContain('**Owner:** Joey');
  });

  test('includes problem statement', () => {
    const result = generateClaudeMd(baseConfig);
    expect(result).toContain('## Problem Statement');
    expect(result).toContain('Need to test the generator');
  });

  test('includes success criteria', () => {
    const result = generateClaudeMd(baseConfig);
    expect(result).toContain('## Success Criteria');
    expect(result).toContain('- Tests pass');
    expect(result).toContain('- Code works');
  });

  test('includes constraints', () => {
    const result = generateClaudeMd(baseConfig);
    expect(result).toContain('## Constraints');
    expect(result).toContain('- Must use TypeScript');
  });

  test('includes MVP for software projects', () => {
    const result = generateClaudeMd(baseConfig);
    expect(result).toContain('## MVP');
    expect(result).toContain('Basic functionality working');
  });

  test('includes gates table', () => {
    const result = generateClaudeMd(baseConfig);
    expect(result).toContain('## Gates');
    expect(result).toContain('| Gate | Status | Date |');
    expect(result).toContain('SPEC_APPROVED');
  });

  test('includes type-specific details', () => {
    const result = generateClaudeMd(baseConfig);
    expect(result).toContain('## Software Details');
    expect(result).toContain('**language:** TypeScript');
    expect(result).toContain('**runtime:** Bun');
  });

  test('handles physical project type', () => {
    const physicalConfig: ProjectConfig = {
      ...baseConfig,
      type: 'physical',
      mvp: undefined,
      typeSpecific: {
        materials: 'Wood, screws',
        budget: '$500',
      },
    };
    const result = generateClaudeMd(physicalConfig);
    expect(result).toContain('**Project Type:** Physical');
    expect(result).toContain('## Physical Details');
    expect(result).toContain('**materials:** Wood, screws');
  });

  test('handles no constraints', () => {
    const noConstraintsConfig: ProjectConfig = {
      ...baseConfig,
      constraints: [],
    };
    const result = generateClaudeMd(noConstraintsConfig);
    expect(result).toContain('None specified.');
  });

  test('handles no type-specific details', () => {
    const noDetailsConfig: ProjectConfig = {
      ...baseConfig,
      typeSpecific: {},
    };
    const result = generateClaudeMd(noDetailsConfig);
    expect(result).not.toContain('## Software Details');
  });
});

describe('createProject', () => {
  test('creates project directory', () => {
    const projectDir = join(TEST_DIR, 'new-project');
    const config: ProjectConfig = {
      type: 'software',
      name: 'New Project',
      location: projectDir,
      owner: 'Joey',
      problemStatement: 'Test problem',
      successCriteria: ['Done'],
      constraints: [],
      typeSpecific: {},
    };

    createProject(config);

    expect(existsSync(projectDir)).toBe(true);
  });

  test('creates CLAUDE.md', () => {
    const projectDir = join(TEST_DIR, 'claude-test');
    const config: ProjectConfig = {
      type: 'documentation',
      name: 'Claude Test',
      location: projectDir,
      owner: 'Joey',
      problemStatement: 'Test',
      successCriteria: ['Done'],
      constraints: [],
      typeSpecific: {},
    };

    createProject(config);

    const claudeMd = join(projectDir, 'CLAUDE.md');
    expect(existsSync(claudeMd)).toBe(true);

    const content = readFileSync(claudeMd, 'utf-8');
    expect(content).toContain('# Claude Test');
  });

  test('creates .gitignore', () => {
    const projectDir = join(TEST_DIR, 'gitignore-test');
    const config: ProjectConfig = {
      type: 'infrastructure',
      name: 'Gitignore Test',
      location: projectDir,
      owner: 'Joey',
      problemStatement: 'Test',
      successCriteria: ['Done'],
      constraints: [],
      typeSpecific: {},
    };

    createProject(config);

    const gitignore = join(projectDir, '.gitignore');
    expect(existsSync(gitignore)).toBe(true);

    const content = readFileSync(gitignore, 'utf-8');
    expect(content).toContain('CLAUDE.local.md');
  });

  test('creates tasks.yaml', () => {
    const projectDir = join(TEST_DIR, 'tasks-test');
    const config: ProjectConfig = {
      type: 'physical',
      name: 'Tasks Test',
      location: projectDir,
      owner: 'Joey',
      problemStatement: 'Test',
      successCriteria: ['Done'],
      constraints: [],
      typeSpecific: {},
    };

    createProject(config);

    const tasksYaml = join(projectDir, 'tasks.yaml');
    expect(existsSync(tasksYaml)).toBe(true);

    const content = readFileSync(tasksYaml, 'utf-8');
    expect(content).toContain('Tasks for Tasks Test');
  });

  test('creates SPEC.md for software projects', () => {
    const projectDir = join(TEST_DIR, 'spec-test');
    const config: ProjectConfig = {
      type: 'software',
      name: 'Spec Test',
      location: projectDir,
      owner: 'Joey',
      problemStatement: 'Test',
      successCriteria: ['Done'],
      constraints: [],
      mvp: 'Works',
      typeSpecific: {},
    };

    createProject(config);

    const specMd = join(projectDir, 'SPEC.md');
    expect(existsSync(specMd)).toBe(true);

    const content = readFileSync(specMd, 'utf-8');
    expect(content).toContain('# Spec Test - Specification');
  });

  test('does not create SPEC.md for non-software projects', () => {
    const projectDir = join(TEST_DIR, 'no-spec-test');
    const config: ProjectConfig = {
      type: 'physical',
      name: 'No Spec Test',
      location: projectDir,
      owner: 'Joey',
      problemStatement: 'Test',
      successCriteria: ['Done'],
      constraints: [],
      typeSpecific: {},
    };

    createProject(config);

    const specMd = join(projectDir, 'SPEC.md');
    expect(existsSync(specMd)).toBe(false);
  });
});
