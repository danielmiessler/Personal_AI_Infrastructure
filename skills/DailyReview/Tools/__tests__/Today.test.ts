// TDD: Tests written first, implementation follows
// All 13 tests passing - creating SKILL.md and command
import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

// Test against the module we'll create
// These imports will fail until we implement the module
import {
  extractProjects,
  extractGoals,
  extractChallenges,
  getActivePlans,
  getFutureIdeas,
  generateTodayContent,
} from '../Today';

const TEST_DIR = '/tmp/daily-review-test';

describe('DailyReview Today Tool', () => {
  beforeEach(() => {
    // Create test directory structure
    mkdirSync(join(TEST_DIR, 'skills', 'CORE'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'plans'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'docs'), { recursive: true });
  });

  afterEach(() => {
    // Clean up
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('extractProjects', () => {
    test('extracts projects from Telos PROJECTS section', () => {
      const telosContent = `
## PROJECTS

- **PAI System**: Building Personal AI Infrastructure
- **Crypto Agents**: Exploring what to build

## OTHER SECTION
- This should not be extracted
`;
      const projects = extractProjects(telosContent);

      expect(projects).toHaveLength(2);
      expect(projects[0].name).toBe('PAI System');
      expect(projects[1].name).toBe('Crypto Agents');
    });

    test('returns empty array when no PROJECTS section', () => {
      const telosContent = `
## GOALS
- Some goal
`;
      const projects = extractProjects(telosContent);
      expect(projects).toHaveLength(0);
    });

    test('handles nested bullet points under projects', () => {
      const telosContent = `
## PROJECTS

- **Main Project**: Description
  - Sub-item 1
  - Sub-item 2
- **Second Project**: Another one
`;
      const projects = extractProjects(telosContent);

      // Should only extract top-level projects, not sub-items
      expect(projects).toHaveLength(2);
      expect(projects[0].name).toBe('Main Project');
      expect(projects[1].name).toBe('Second Project');
    });
  });

  describe('extractGoals', () => {
    test('extracts goals with G prefix from Telos', () => {
      const telosContent = `
## GOALS

### Professional
- **G1**: Build and ship crypto agents
- **G2**: Work on open source projects

### Personal
- **G3**: Fix health issues
`;
      const goals = extractGoals(telosContent);

      expect(goals).toHaveLength(3);
      expect(goals[0]).toBe('Build and ship crypto agents');
      expect(goals[1]).toBe('Work on open source projects');
      expect(goals[2]).toBe('Fix health issues');
    });

    test('returns empty array when no goals', () => {
      const telosContent = `## PROJECTS\n- Something`;
      const goals = extractGoals(telosContent);
      expect(goals).toHaveLength(0);
    });
  });

  describe('extractChallenges', () => {
    test('extracts challenges with C prefix from Telos', () => {
      const telosContent = `
## CHALLENGES

- **C1**: Landing on the right problem
- **C2**: Isolation and motivation
`;
      const challenges = extractChallenges(telosContent);

      expect(challenges).toHaveLength(2);
      expect(challenges[0]).toBe('Landing on the right problem');
      expect(challenges[1]).toBe('Isolation and motivation');
    });
  });

  describe('getActivePlans', () => {
    test('returns plans modified within last 7 days', () => {
      // Create test plan files
      const recentPlan = join(TEST_DIR, 'plans', 'recent-plan.md');
      writeFileSync(recentPlan, '# Recent Plan\n\nContent here');

      const plans = getActivePlans(TEST_DIR);

      expect(plans.length).toBeGreaterThanOrEqual(1);
      expect(plans[0].name).toBe('recent-plan');
    });

    test('returns empty array when plans directory does not exist', () => {
      const plans = getActivePlans('/nonexistent/path');
      expect(plans).toHaveLength(0);
    });

    test('limits to top 5 most recent plans', () => {
      // Create 7 plan files
      for (let i = 0; i < 7; i++) {
        const planPath = join(TEST_DIR, 'plans', `plan-${i}.md`);
        writeFileSync(planPath, `# Plan ${i}`);
      }

      const plans = getActivePlans(TEST_DIR);

      expect(plans.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getFutureIdeas', () => {
    test('extracts ideas from future-ideas.md', () => {
      const ideasContent = `# Future Ideas

## CallMe - Phone Notifications

**Link:** https://github.com/example
**Added:** 2026-01-09
**Priority:** Medium

Description here.

## Another Idea

**Priority:** High
**Added:** 2026-01-08
`;
      writeFileSync(join(TEST_DIR, 'docs', 'future-ideas.md'), ideasContent);

      const ideas = getFutureIdeas(TEST_DIR);

      expect(ideas.length).toBeGreaterThanOrEqual(1);
      expect(ideas[0].title).toBe('CallMe - Phone Notifications');
      expect(ideas[0].priority).toBe('Medium');
    });

    test('returns empty array when file does not exist', () => {
      const ideas = getFutureIdeas('/nonexistent/path');
      expect(ideas).toHaveLength(0);
    });
  });

  describe('generateTodayContent', () => {
    test('generates markdown with all sections', () => {
      // Set up test data
      const telosContent = `
## PROJECTS
- **Test Project**: Description

## GOALS
- **G1**: Test goal

## CHALLENGES
- **C1**: Test challenge
`;
      writeFileSync(join(TEST_DIR, 'skills', 'CORE', 'Telos.md'), telosContent);
      writeFileSync(join(TEST_DIR, 'plans', 'test-plan.md'), '# Test Plan');
      writeFileSync(
        join(TEST_DIR, 'docs', 'future-ideas.md'),
        '# Future Ideas\n\n## Test Idea\n\n**Priority:** Low'
      );

      const content = generateTodayContent(TEST_DIR);

      expect(content).toContain('# Today');
      expect(content).toContain('## Active Projects');
      expect(content).toContain('Test Project');
      expect(content).toContain('## Goals');
      expect(content).toContain('Test goal');
      expect(content).toContain('## Challenges');
      expect(content).toContain('Test challenge');
    });

    test('handles missing Telos.md gracefully', () => {
      const content = generateTodayContent(TEST_DIR);

      // Should still generate valid markdown, just without projects/goals
      expect(content).toContain('# Today');
    });
  });
});
