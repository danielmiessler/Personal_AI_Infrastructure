/**
 * PostCompactRecovery.test.ts — Output shape validation for compact recovery hook
 *
 * Validates that the recovery block injected after compaction contains
 * required identity and behavioral context.
 *
 * Run: bun test tests/PostCompactRecovery.test.ts
 */

import { test, expect, describe } from 'bun:test';

// Simulate the recovery block generation (core logic from PostCompactRecovery.hook.ts)
function generateRecoveryBlock(opts: {
  daName: string;
  principalName: string;
  timezone: string;
  algorithmState?: { phase: string; effort: string; prd_path: string };
}): string {
  let algorithmStateStr = '';
  if (opts.algorithmState) {
    algorithmStateStr = `\n**Current Algorithm state:** Phase: ${opts.algorithmState.phase.toUpperCase()} | Effort: ${opts.algorithmState.effort} | PRD: ${opts.algorithmState.prd_path}`;
  }

  return `## POST-COMPACTION CONTEXT RECOVERY

**You are ${opts.daName}**, a Personal AI Infrastructure assistant.
**Principal:** ${opts.principalName} | Timezone: ${opts.timezone}
**Algorithm version:** v3.8.0${algorithmStateStr}

**Response format (MANDATORY — restore after compaction):**
Every response MUST use exactly one mode:
- **ALGORITHM** — for multi-step, complex work (load PAI/Algorithm/v3.8.0.md and follow it)
- **NATIVE** — for simple single-step tasks
- **MINIMAL** — for greetings, ratings, acknowledgments

No freeform output. The format IS the context.`;
}

describe('PostCompactRecovery', () => {
  test('recovery block contains DA name', () => {
    const block = generateRecoveryBlock({
      daName: 'TestDA',
      principalName: 'TestUser',
      timezone: 'America/Los_Angeles',
    });
    expect(block).toContain('You are TestDA');
  });

  test('recovery block contains principal name', () => {
    const block = generateRecoveryBlock({
      daName: 'TestDA',
      principalName: 'TestUser',
      timezone: 'America/Los_Angeles',
    });
    expect(block).toContain('Principal: TestUser');
  });

  test('recovery block contains algorithm version', () => {
    const block = generateRecoveryBlock({
      daName: 'TestDA',
      principalName: 'TestUser',
      timezone: 'UTC',
    });
    expect(block).toContain('v3.8.0');
  });

  test('recovery block contains all three modes', () => {
    const block = generateRecoveryBlock({
      daName: 'TestDA',
      principalName: 'TestUser',
      timezone: 'UTC',
    });
    expect(block).toContain('ALGORITHM');
    expect(block).toContain('NATIVE');
    expect(block).toContain('MINIMAL');
  });

  test('recovery block includes algorithm state when provided', () => {
    const block = generateRecoveryBlock({
      daName: 'TestDA',
      principalName: 'TestUser',
      timezone: 'UTC',
      algorithmState: { phase: 'execute', effort: 'extended', prd_path: 'MEMORY/WORK/test/PRD.md' },
    });
    expect(block).toContain('Phase: EXECUTE');
    expect(block).toContain('Effort: extended');
    expect(block).toContain('PRD: MEMORY/WORK/test/PRD.md');
  });

  test('recovery block omits algorithm state when not provided', () => {
    const block = generateRecoveryBlock({
      daName: 'TestDA',
      principalName: 'TestUser',
      timezone: 'UTC',
    });
    expect(block).not.toContain('Current Algorithm state');
  });

  test('output would be valid hook JSON', () => {
    const block = generateRecoveryBlock({
      daName: 'TestDA',
      principalName: 'TestUser',
      timezone: 'UTC',
    });
    const hookOutput = JSON.stringify({ additionalContext: block });
    const parsed = JSON.parse(hookOutput);
    expect(parsed).toHaveProperty('additionalContext');
    expect(typeof parsed.additionalContext).toBe('string');
    expect(parsed.additionalContext.length).toBeGreaterThan(50);
  });
});
