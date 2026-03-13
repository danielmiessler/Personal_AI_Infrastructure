import { test, expect, describe } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';

/**
 * AgentExecutionGuard integration tests.
 *
 * Tests the guard logic for Task tool calls:
 * - Background agents pass silently
 * - Fast agents (Explore, haiku) pass silently
 * - Foreground non-fast agents get a warning
 *
 * Pure logic — no external dependencies needed.
 */

describe('AgentExecutionGuard', () => {
  const hook = 'hooks/AgentExecutionGuard.hook.ts';

  test('passes when run_in_background is true', async () => {
    const result = await runHook(hook, {
      tool_name: 'Task',
      tool_input: {
        run_in_background: true,
        subagent_type: 'Engineer',
        description: 'Build feature',
        prompt: 'Build the auth module',
      },
    });

    expect(result.exitCode).toBe(0);
    // No warning output
    expect(result.stdout).not.toContain('WARNING');
  });

  test('passes for Explore agent type (fast-tier)', async () => {
    const result = await runHook(hook, {
      tool_name: 'Task',
      tool_input: {
        subagent_type: 'Explore',
        description: 'Find auth files',
        prompt: 'Search for authentication code',
      },
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('WARNING');
  });

  test('passes for haiku model (fast-tier)', async () => {
    const result = await runHook(hook, {
      tool_name: 'Task',
      tool_input: {
        model: 'haiku',
        subagent_type: 'general-purpose',
        description: 'Quick lookup',
        prompt: 'Find the config file',
      },
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('WARNING');
  });

  test('warns for foreground non-fast agent', async () => {
    const result = await runHook(hook, {
      tool_name: 'Task',
      tool_input: {
        subagent_type: 'Engineer',
        description: 'Build entire feature',
        prompt: 'Implement the full auth system with tests',
      },
    });

    expect(result.exitCode).toBe(0);
    // Should contain warning about foreground agent
    expect(result.stdout).toContain('WARNING');
    expect(result.stdout).toContain('FOREGROUND AGENT');
    expect(result.stdout).toContain('run_in_background');
  });

  test('warns when run_in_background is false', async () => {
    const result = await runHook(hook, {
      tool_name: 'Task',
      tool_input: {
        run_in_background: false,
        subagent_type: 'general-purpose',
        description: 'Research task',
        prompt: 'Investigate the bug',
      },
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('WARNING');
  });

  test('handles empty input gracefully', async () => {
    const result = await runHook(hook, {
      tool_name: 'Task',
      tool_input: {},
    });

    expect(result.exitCode).toBe(0);
    // Empty tool_input → no background, no fast agent → warning
    expect(result.stdout).toContain('WARNING');
  });

  test('passes for FAST timing in prompt', async () => {
    const result = await runHook(hook, {
      tool_name: 'Task',
      tool_input: {
        subagent_type: 'general-purpose',
        description: 'Quick check',
        prompt: '## Scope\nTiming: FAST\n\nCheck if the file exists',
      },
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('WARNING');
  });

  test('always exits 0 (never blocks agents)', async () => {
    // Even on violations, the guard only warns — never blocks
    const result = await runHook(hook, {
      tool_name: 'Task',
      tool_input: {
        subagent_type: 'Engineer',
        description: 'Long running task',
        prompt: 'Refactor the entire codebase',
        max_turns: 50,
      },
    });

    expect(result.exitCode).toBe(0);
  });
});
