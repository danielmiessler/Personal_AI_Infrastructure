/**
 * Transcript Parser Tests
 */

import { describe, test, expect } from 'bun:test';
import {
  parseTranscript,
  getModifiedFiles,
  getReadFiles,
  getToolUsageSummary,
} from '../src/parsers/transcript.ts';

describe('parseTranscript', () => {
  test('parses empty content', () => {
    const result = parseTranscript('');
    expect(result.toolCalls).toEqual([]);
    expect(result.decisions).toEqual([]);
    expect(result.messageCount).toBe(0);
  });

  test('extracts tool calls', () => {
    const content = [
      JSON.stringify({ type: 'tool_use', tool: 'Read', params: { file_path: '/test.ts' } }),
      JSON.stringify({ type: 'tool_use', tool: 'Edit', params: { file_path: '/test.ts' } }),
    ].join('\n');

    const result = parseTranscript(content);
    expect(result.toolCalls).toHaveLength(2);
    expect(result.toolCalls[0].tool).toBe('Read');
    expect(result.toolCalls[1].tool).toBe('Edit');
  });

  test('extracts assistant messages', () => {
    const content = [
      JSON.stringify({ type: 'assistant', content: 'Hello, I will help you.' }),
      JSON.stringify({ type: 'assistant', content: 'I decided to use TypeScript.' }),
    ].join('\n');

    const result = parseTranscript(content);
    expect(result.assistantMessages).toHaveLength(2);
    expect(result.assistantMessages[0]).toBe('Hello, I will help you.');
  });

  test('extracts user messages', () => {
    const content = [
      JSON.stringify({ type: 'user', content: 'Please help me.' }),
      JSON.stringify({ type: 'user', content: 'Thanks!' }),
    ].join('\n');

    const result = parseTranscript(content);
    expect(result.userMessages).toHaveLength(2);
    expect(result.userMessages[0]).toBe('Please help me.');
  });

  test('extracts decisions from patterns', () => {
    const content = [
      JSON.stringify({ type: 'assistant', content: 'I decided to use Bun for the runtime.' }),
      JSON.stringify({ type: 'assistant', content: 'I am choosing TypeScript because it has better types.' }),
      JSON.stringify({ type: 'assistant', content: 'I went with the functional approach.' }),
    ].join('\n');

    const result = parseTranscript(content);
    expect(result.decisions.length).toBeGreaterThan(0);
  });

  test('limits decisions to last 5', () => {
    const content = Array(10)
      .fill(null)
      .map((_, i) => JSON.stringify({ type: 'assistant', content: `I decided to do task ${i}.` }))
      .join('\n');

    const result = parseTranscript(content);
    expect(result.decisions).toHaveLength(5);
  });

  test('handles malformed JSON lines', () => {
    const content = [
      JSON.stringify({ type: 'user', content: 'Valid message' }),
      'not valid json {{{',
      JSON.stringify({ type: 'assistant', content: 'Another valid message' }),
    ].join('\n');

    const result = parseTranscript(content);
    expect(result.userMessages).toHaveLength(1);
    expect(result.assistantMessages).toHaveLength(1);
    expect(result.messageCount).toBe(3);
  });

  test('handles object content in messages', () => {
    const content = JSON.stringify({
      type: 'assistant',
      content: { text: 'Hello', nested: true }
    });

    const result = parseTranscript(content);
    expect(result.assistantMessages).toHaveLength(1);
    expect(result.assistantMessages[0]).toContain('Hello');
  });
});

describe('getModifiedFiles', () => {
  test('extracts Edit file paths', () => {
    const transcript = parseTranscript([
      JSON.stringify({ type: 'tool_use', tool: 'Edit', params: { file_path: '/a.ts' } }),
      JSON.stringify({ type: 'tool_use', tool: 'Edit', params: { file_path: '/b.ts' } }),
    ].join('\n'));

    const files = getModifiedFiles(transcript);
    expect(files).toContain('/a.ts');
    expect(files).toContain('/b.ts');
  });

  test('extracts Write file paths', () => {
    const transcript = parseTranscript([
      JSON.stringify({ type: 'tool_use', tool: 'Write', params: { file_path: '/new.ts' } }),
    ].join('\n'));

    const files = getModifiedFiles(transcript);
    expect(files).toContain('/new.ts');
  });

  test('extracts NotebookEdit paths', () => {
    const transcript = parseTranscript([
      JSON.stringify({ type: 'tool_use', tool: 'NotebookEdit', params: { notebook_path: '/test.ipynb' } }),
    ].join('\n'));

    const files = getModifiedFiles(transcript);
    expect(files).toContain('/test.ipynb');
  });

  test('deduplicates file paths', () => {
    const transcript = parseTranscript([
      JSON.stringify({ type: 'tool_use', tool: 'Edit', params: { file_path: '/a.ts' } }),
      JSON.stringify({ type: 'tool_use', tool: 'Edit', params: { file_path: '/a.ts' } }),
    ].join('\n'));

    const files = getModifiedFiles(transcript);
    expect(files).toHaveLength(1);
  });
});

describe('getReadFiles', () => {
  test('extracts Read file paths', () => {
    const transcript = parseTranscript([
      JSON.stringify({ type: 'tool_use', tool: 'Read', params: { file_path: '/a.ts' } }),
      JSON.stringify({ type: 'tool_use', tool: 'Read', params: { file_path: '/b.ts' } }),
    ].join('\n'));

    const files = getReadFiles(transcript);
    expect(files).toContain('/a.ts');
    expect(files).toContain('/b.ts');
  });

  test('ignores non-Read tools', () => {
    const transcript = parseTranscript([
      JSON.stringify({ type: 'tool_use', tool: 'Edit', params: { file_path: '/a.ts' } }),
    ].join('\n'));

    const files = getReadFiles(transcript);
    expect(files).toHaveLength(0);
  });
});

describe('getToolUsageSummary', () => {
  test('counts tool usage', () => {
    const transcript = parseTranscript([
      JSON.stringify({ type: 'tool_use', tool: 'Read', params: {} }),
      JSON.stringify({ type: 'tool_use', tool: 'Read', params: {} }),
      JSON.stringify({ type: 'tool_use', tool: 'Edit', params: {} }),
      JSON.stringify({ type: 'tool_use', tool: 'Bash', params: {} }),
    ].join('\n'));

    const summary = getToolUsageSummary(transcript);
    expect(summary['Read']).toBe(2);
    expect(summary['Edit']).toBe(1);
    expect(summary['Bash']).toBe(1);
  });

  test('returns empty object for no tools', () => {
    const transcript = parseTranscript('');
    const summary = getToolUsageSummary(transcript);
    expect(Object.keys(summary)).toHaveLength(0);
  });
});
