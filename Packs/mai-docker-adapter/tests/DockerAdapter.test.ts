import { describe, test, expect } from 'bun:test';
import { DockerAdapter } from '../src/index.ts';

describe('DockerAdapter', () => {
  describe('constructor', () => {
    test('should create with default config', () => {
      const adapter = new DockerAdapter();
      expect(adapter.name).toBe('docker');
      expect(adapter.version).toBe('1.0.0');
    });

    test('should accept custom socket path', () => {
      const adapter = new DockerAdapter({ socketPath: '/custom/docker.sock' });
      expect(adapter.name).toBe('docker');
    });

    test('should accept remote host', () => {
      const adapter = new DockerAdapter({ host: 'tcp://remote:2375' });
      expect(adapter.name).toBe('docker');
    });

    test('should accept compose project filter', () => {
      const adapter = new DockerAdapter({ composeProject: 'myapp' });
      expect(adapter.name).toBe('docker');
    });
  });

  describe('type exports', () => {
    test('should export DockerConfig type', () => {
      const config: import('../src/index.ts').DockerConfig = {
        socketPath: '/var/run/docker.sock',
        host: undefined,
        composeProject: 'test'
      };
      expect(config.socketPath).toBeDefined();
    });
  });

  // Note: Most tests require a running Docker daemon
  // Integration tests should be run separately with Docker available
  describe('healthCheck (integration)', () => {
    test.skipIf(true)('should check Docker availability', async () => {
      const adapter = new DockerAdapter();
      const health = await adapter.healthCheck();
      // This test is skipped by default as it requires Docker
      expect(health).toBeDefined();
    });
  });
});
