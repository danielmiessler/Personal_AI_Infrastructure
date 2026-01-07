import { describe, test, expect } from 'bun:test';
import {
  PlatformError,
  NamespaceNotFoundError,
  DeploymentNotFoundError,
  ContainerNotFoundError,
  ServiceNotFoundError,
  AuthenticationError,
  ConfigurationError,
  AdapterNotFoundError,
  RateLimitError,
  ProviderError,
  ExecError,
  ScaleError,
} from '../src/index.ts';

describe('Errors', () => {
  describe('PlatformError', () => {
    test('should create base error', () => {
      const error = new PlatformError('Test error', 'TEST_CODE', 'kubernetes');

      expect(error.name).toBe('PlatformError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.provider).toBe('kubernetes');
      expect(error).toBeInstanceOf(Error);
    });

    test('should work without provider', () => {
      const error = new PlatformError('Test error', 'TEST_CODE');

      expect(error.provider).toBeUndefined();
    });
  });

  describe('NamespaceNotFoundError', () => {
    test('should create namespace not found error', () => {
      const error = new NamespaceNotFoundError('production', 'kubernetes');

      expect(error.name).toBe('NamespaceNotFoundError');
      expect(error.message).toBe('Namespace not found: production');
      expect(error.code).toBe('NAMESPACE_NOT_FOUND');
      expect(error.provider).toBe('kubernetes');
    });
  });

  describe('DeploymentNotFoundError', () => {
    test('should create deployment not found error', () => {
      const error = new DeploymentNotFoundError('my-app', 'docker');

      expect(error.name).toBe('DeploymentNotFoundError');
      expect(error.message).toBe('Deployment not found: my-app');
      expect(error.code).toBe('DEPLOYMENT_NOT_FOUND');
    });
  });

  describe('ContainerNotFoundError', () => {
    test('should create container not found error', () => {
      const error = new ContainerNotFoundError('my-pod-abc123');

      expect(error.name).toBe('ContainerNotFoundError');
      expect(error.message).toBe('Container not found: my-pod-abc123');
      expect(error.code).toBe('CONTAINER_NOT_FOUND');
    });
  });

  describe('ServiceNotFoundError', () => {
    test('should create service not found error', () => {
      const error = new ServiceNotFoundError('my-service', 'kubernetes');

      expect(error.name).toBe('ServiceNotFoundError');
      expect(error.message).toBe('Service not found: my-service');
      expect(error.code).toBe('SERVICE_NOT_FOUND');
    });
  });

  describe('AuthenticationError', () => {
    test('should create authentication error', () => {
      const error = new AuthenticationError('Invalid kubeconfig', 'kubernetes');

      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe('Invalid kubeconfig');
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('ConfigurationError', () => {
    test('should create configuration error', () => {
      const error = new ConfigurationError('Missing context');

      expect(error.name).toBe('ConfigurationError');
      expect(error.message).toBe('Missing context');
      expect(error.code).toBe('CONFIGURATION_ERROR');
    });
  });

  describe('AdapterNotFoundError', () => {
    test('should create adapter not found error', () => {
      const error = new AdapterNotFoundError('kubernetes');

      expect(error.name).toBe('AdapterNotFoundError');
      expect(error.message).toBe('Adapter not found: kubernetes');
      expect(error.code).toBe('ADAPTER_NOT_FOUND');
    });
  });

  describe('RateLimitError', () => {
    test('should create rate limit error with retry', () => {
      const error = new RateLimitError(60, 'kubernetes');

      expect(error.name).toBe('RateLimitError');
      expect(error.message).toBe('Rate limit exceeded. Retry after 60s');
      expect(error.code).toBe('RATE_LIMIT');
    });

    test('should create rate limit error without retry', () => {
      const error = new RateLimitError();

      expect(error.message).toBe('Rate limit exceeded');
    });
  });

  describe('ProviderError', () => {
    test('should create provider error', () => {
      const error = new ProviderError('API error: 500', 'kubernetes');

      expect(error.name).toBe('ProviderError');
      expect(error.message).toBe('API error: 500');
      expect(error.code).toBe('PROVIDER_ERROR');
    });
  });

  describe('ExecError', () => {
    test('should create exec error', () => {
      const error = new ExecError('ls -la', 1, 'Permission denied', 'docker');

      expect(error.name).toBe('ExecError');
      expect(error.message).toContain('Command failed (exit 1)');
      expect(error.message).toContain('Permission denied');
      expect(error.code).toBe('EXEC_ERROR');
      expect(error.exitCode).toBe(1);
      expect(error.stderr).toBe('Permission denied');
    });

    test('should truncate long stderr', () => {
      const longError = 'x'.repeat(300);
      const error = new ExecError('cmd', 1, longError, 'docker');

      expect(error.message.length).toBeLessThan(longError.length + 50);
    });
  });

  describe('ScaleError', () => {
    test('should create scale error', () => {
      const error = new ScaleError('my-app', 'Insufficient resources', 'kubernetes');

      expect(error.name).toBe('ScaleError');
      expect(error.message).toBe('Failed to scale my-app: Insufficient resources');
      expect(error.code).toBe('SCALE_ERROR');
    });
  });

  describe('Error inheritance', () => {
    test('all errors should extend PlatformError', () => {
      const errors = [
        new NamespaceNotFoundError('test'),
        new DeploymentNotFoundError('test'),
        new ContainerNotFoundError('test'),
        new ServiceNotFoundError('test'),
        new AuthenticationError('test'),
        new ConfigurationError('test'),
        new AdapterNotFoundError('test'),
        new RateLimitError(),
        new ProviderError('test'),
        new ExecError('cmd', 1, 'err'),
        new ScaleError('dep', 'reason'),
      ];

      for (const error of errors) {
        expect(error).toBeInstanceOf(PlatformError);
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});
