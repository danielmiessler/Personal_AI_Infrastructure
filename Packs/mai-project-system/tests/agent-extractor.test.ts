/**
 * Agent Extractor Tests
 */

import { describe, test, expect } from 'bun:test';
import { parseTranscript } from '../src/parsers/transcript.ts';
import {
  extractAgentInfo,
  getRunningAgents,
  getCompletedAgents,
  formatAgentsAsMarkdown,
  getAgentSummary,
} from '../src/parsers/agent-extractor.ts';

describe('extractAgentInfo', () => {
  test('returns empty array when no Task calls', () => {
    const transcript = parseTranscript('');
    const agents = extractAgentInfo(transcript);
    expect(agents).toEqual([]);
  });

  test('extracts agent from Task call', () => {
    const content = JSON.stringify({
      type: 'tool_use',
      tool: 'Task',
      params: {
        description: 'Build the project',
        subagent_type: 'Bash',
      }
    });

    const transcript = parseTranscript(content);
    const agents = extractAgentInfo(transcript);

    expect(agents).toHaveLength(1);
    expect(agents[0].task).toBe('Build the project');
    expect(agents[0].subagentType).toBe('Bash');
    expect(agents[0].status).toBe('running');
  });

  test('generates ID from description', () => {
    const content = JSON.stringify({
      type: 'tool_use',
      tool: 'Task',
      params: { description: 'Run unit tests' }
    });

    const transcript = parseTranscript(content);
    const agents = extractAgentInfo(transcript);

    expect(agents[0].id).toBe('agent-run-unit-tests');
  });

  test('truncates long task descriptions', () => {
    const longDescription = 'A'.repeat(100);
    const content = JSON.stringify({
      type: 'tool_use',
      tool: 'Task',
      params: { description: longDescription }
    });

    const transcript = parseTranscript(content);
    const agents = extractAgentInfo(transcript);

    expect(agents[0].task.length).toBe(50);
  });

  test('extracts multiple agents', () => {
    const content = [
      JSON.stringify({ type: 'tool_use', tool: 'Task', params: { description: 'Task one' } }),
      JSON.stringify({ type: 'tool_use', tool: 'Task', params: { description: 'Task two' } }),
    ].join('\n');

    const transcript = parseTranscript(content);
    const agents = extractAgentInfo(transcript);

    expect(agents).toHaveLength(2);
  });

  test('uses prompt if description missing', () => {
    const content = JSON.stringify({
      type: 'tool_use',
      tool: 'Task',
      params: { prompt: 'Do something important' }
    });

    const transcript = parseTranscript(content);
    const agents = extractAgentInfo(transcript);

    expect(agents[0].task).toBe('Do something important');
  });
});

describe('getRunningAgents', () => {
  test('filters running agents', () => {
    const agents = [
      { id: 'a1', task: 'Task 1', status: 'running' as const },
      { id: 'a2', task: 'Task 2', status: 'completed' as const },
      { id: 'a3', task: 'Task 3', status: 'running' as const },
    ];

    const running = getRunningAgents(agents);
    expect(running).toHaveLength(2);
    expect(running[0].id).toBe('a1');
    expect(running[1].id).toBe('a3');
  });
});

describe('getCompletedAgents', () => {
  test('filters completed agents', () => {
    const agents = [
      { id: 'a1', task: 'Task 1', status: 'running' as const },
      { id: 'a2', task: 'Task 2', status: 'completed' as const },
    ];

    const completed = getCompletedAgents(agents);
    expect(completed).toHaveLength(1);
    expect(completed[0].id).toBe('a2');
  });
});

describe('formatAgentsAsMarkdown', () => {
  test('returns placeholder for empty list', () => {
    const result = formatAgentsAsMarkdown([]);
    expect(result).toBe('| - | No agents spawned | - |');
  });

  test('formats agents as table rows', () => {
    const agents = [
      { id: 'agent-1', task: 'Build project', status: 'running' as const },
      { id: 'agent-2', task: 'Run tests', status: 'completed' as const },
    ];

    const result = formatAgentsAsMarkdown(agents);
    expect(result).toContain('| agent-1 | Build project | running |');
    expect(result).toContain('| agent-2 | Run tests | completed |');
  });
});

describe('getAgentSummary', () => {
  test('returns zeros for empty list', () => {
    const summary = getAgentSummary([]);
    expect(summary).toEqual({ total: 0, running: 0, completed: 0 });
  });

  test('counts agent statuses correctly', () => {
    const agents = [
      { id: 'a1', task: 'Task 1', status: 'running' as const },
      { id: 'a2', task: 'Task 2', status: 'completed' as const },
      { id: 'a3', task: 'Task 3', status: 'completed' as const },
      { id: 'a4', task: 'Task 4', status: 'running' as const },
    ];

    const summary = getAgentSummary(agents);
    expect(summary).toEqual({ total: 4, running: 2, completed: 2 });
  });
});
