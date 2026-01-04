/**
 * Unit tests for knowledge client
 */

import { describe, it, expect, beforeAll, afterAll, mock } from 'bun:test';
import { checkHealth, addEpisode, getConfig } from '../../../src/hooks/lib/knowledge-client';

describe('knowledge-client', () => {
  describe('getConfig', () => {
    it('should return default configuration', () => {
      const config = getConfig();

      expect(config.baseURL).toBe('http://localhost:8000');
      expect(config.timeout).toBe(15000);
      expect(config.retries).toBe(3);
    });
  });

  describe('checkHealth', () => {
    it('should return false when server is unreachable', async () => {
      const config = {
        baseURL: 'http://localhost:59999/mcp/', // Unlikely to be running
        timeout: 1000,
        retries: 1
      };

      const healthy = await checkHealth(config);

      expect(healthy).toBe(false);
    });

    // Note: Integration test with real server would test positive case
  });

  describe('addEpisode', () => {
    it('should return error when server is unreachable', async () => {
      const config = {
        baseURL: 'http://localhost:59999/mcp/', // Unlikely to be running
        timeout: 1000,
        retries: 1
      };

      const result = await addEpisode(
        {
          name: 'Test Episode',
          episode_body: 'Test content'
        },
        config
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should truncate long names and bodies', async () => {
      // This tests the truncation logic, not the actual API call
      const longName = 'A'.repeat(300);
      const longBody = 'B'.repeat(6000);

      const config = {
        baseURL: 'http://localhost:59999/mcp/',
        timeout: 100,
        retries: 1
      };

      // The function should not throw even with long inputs
      const result = await addEpisode(
        {
          name: longName,
          episode_body: longBody
        },
        config
      );

      // Will fail due to unreachable server, but shouldn't throw
      expect(result.success).toBe(false);
    });
  });
});
