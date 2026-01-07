import { describe, it, expect } from 'bun:test';
import LinearAdapter from '../src/LinearAdapter.ts';

describe('LinearAdapter', () => {
  describe('constructor', () => {
    it('creates adapter with config', () => {
      const adapter = new LinearAdapter({ teamId: 'test-team' });
      expect(adapter.name).toBe('linear');
      expect(adapter.version).toBe('1.0.0');
    });

    it('throws error when teamId is missing', () => {
      expect(() => new LinearAdapter({} as { teamId: string })).toThrow();
    });
  });

  describe('interface compliance', () => {
    it('implements IssuesProvider interface', () => {
      const adapter = new LinearAdapter({ teamId: 'test-team' });

      // Check all required methods exist
      expect(typeof adapter.createIssue).toBe('function');
      expect(typeof adapter.getIssue).toBe('function');
      expect(typeof adapter.updateIssue).toBe('function');
      expect(typeof adapter.deleteIssue).toBe('function');
      expect(typeof adapter.listIssues).toBe('function');
      expect(typeof adapter.searchIssues).toBe('function');
      expect(typeof adapter.listProjects).toBe('function');
      expect(typeof adapter.getProject).toBe('function');
      expect(typeof adapter.listLabels).toBe('function');
      expect(typeof adapter.addLabel).toBe('function');
      expect(typeof adapter.removeLabel).toBe('function');
      expect(typeof adapter.healthCheck).toBe('function');
    });
  });
});
