import { describe, test, expect } from 'bun:test';
import { K8sAdapter } from '../src/index.ts';

describe('K8sAdapter', () => {
  describe('constructor', () => {
    test('should create with default config', () => {
      const adapter = new K8sAdapter();
      expect(adapter.name).toBe('kubernetes');
      expect(adapter.version).toBe('1.0.0');
    });

    test('should accept custom kubeconfig path', () => {
      const adapter = new K8sAdapter({ kubeconfig: '/custom/kubeconfig' });
      expect(adapter.name).toBe('kubernetes');
    });

    test('should accept context override', () => {
      const adapter = new K8sAdapter({ context: 'my-cluster' });
      expect(adapter.name).toBe('kubernetes');
    });

    test('should accept direct server and token', () => {
      const adapter = new K8sAdapter({
        server: 'https://k8s.example.com:6443',
        token: 'my-token',
      });
      expect(adapter.name).toBe('kubernetes');
    });

    test('should accept namespace override', () => {
      const adapter = new K8sAdapter({ namespace: 'production' });
      expect(adapter.name).toBe('kubernetes');
    });

    test('should accept insecureSkipTlsVerify', () => {
      const adapter = new K8sAdapter({ insecureSkipTlsVerify: true });
      expect(adapter.name).toBe('kubernetes');
    });
  });

  describe('type exports', () => {
    test('should export K8sConfig type', () => {
      const config: import('../src/index.ts').K8sConfig = {
        kubeconfig: '/path/to/config',
        context: 'my-context',
        namespace: 'default',
        insecureSkipTlsVerify: false,
        token: 'bearer-token',
        server: 'https://api.k8s.local:6443',
      };
      expect(config.kubeconfig).toBeDefined();
    });
  });

  // Note: Most tests require a running Kubernetes cluster
  // Integration tests should be run separately with cluster access
  describe('healthCheck (integration)', () => {
    test.skipIf(true)('should check Kubernetes availability', async () => {
      const adapter = new K8sAdapter();
      const health = await adapter.healthCheck();
      // This test is skipped by default as it requires Kubernetes
      expect(health).toBeDefined();
    });
  });
});
