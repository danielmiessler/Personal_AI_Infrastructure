import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import InfisicalAdapter from '../src/InfisicalAdapter.ts';
import { SecretNotFoundError, AuthenticationError, ProviderError } from 'kai-secrets-core';

// Mock fetch globally
const originalFetch = globalThis.fetch;
let mockFetch: ReturnType<typeof mock>;

describe('InfisicalAdapter', () => {
  const mockConfig = {
    url: 'https://app.infisical.com',
    auth: { type: 'env' as const, var: 'INFISICAL_TOKEN' },
    environment: 'development',
    project: 'test-project-id'
  };

  const mockSecret = {
    _id: 'secret-123',
    secretKey: 'API_KEY',
    secretValue: 'super-secret-value',
    version: 1,
    type: 'shared',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-07T00:00:00.000Z',
    environment: 'development',
    tags: [{ _id: 'tag-1', name: 'Production', slug: 'production' }]
  };

  beforeEach(() => {
    process.env.INFISICAL_TOKEN = 'test-token-12345';
    mockFetch = mock(async (url: string, options?: RequestInit) => {
      // Default mock - return 200 with secret
      return new Response(JSON.stringify({ secret: mockSecret }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.INFISICAL_TOKEN;
  });

  describe('constructor', () => {
    it('accepts valid config', () => {
      const adapter = new InfisicalAdapter(mockConfig);
      expect(adapter.name).toBe('infisical');
      expect(adapter.version).toBe('1.0.0');
    });

    it('throws when url is missing', () => {
      expect(() => new InfisicalAdapter({
        ...mockConfig,
        url: ''
      })).toThrow(ProviderError);
    });

    it('throws when auth is missing', () => {
      expect(() => new InfisicalAdapter({
        ...mockConfig,
        auth: undefined as any
      })).toThrow(ProviderError);
    });

    it('removes trailing slash from url', () => {
      const adapter = new InfisicalAdapter({
        ...mockConfig,
        url: 'https://app.infisical.com/'
      });
      expect(adapter.name).toBe('infisical');
    });
  });

  describe('get', () => {
    it('retrieves a secret successfully', async () => {
      const adapter = new InfisicalAdapter(mockConfig);
      const secret = await adapter.get('API_KEY');

      expect(secret.key).toBe('API_KEY');
      expect(secret.value.reveal()).toBe('super-secret-value');
      expect(secret.metadata?.version).toBe('1');
    });

    it('wraps value in SecretValue', async () => {
      const adapter = new InfisicalAdapter(mockConfig);
      const secret = await adapter.get('API_KEY');

      expect(secret.value.toString()).toBe('[REDACTED]');
      expect(JSON.stringify({ v: secret.value })).toBe('{"v":"[REDACTED]"}');
    });

    it('throws SecretNotFoundError on 404', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response('Not found', { status: 404 }))
      );

      const adapter = new InfisicalAdapter(mockConfig);
      await expect(adapter.get('NONEXISTENT')).rejects.toBeInstanceOf(SecretNotFoundError);
    });

    it('throws ProviderError when project is missing', async () => {
      const adapter = new InfisicalAdapter({
        ...mockConfig,
        project: undefined
      });

      await expect(adapter.get('API_KEY')).rejects.toThrow('Project ID is required');
    });

    it('includes metadata from API response', async () => {
      const adapter = new InfisicalAdapter(mockConfig);
      const secret = await adapter.get('API_KEY');

      expect(secret.metadata?.createdAt).toBeInstanceOf(Date);
      expect(secret.metadata?.updatedAt).toBeInstanceOf(Date);
      expect(secret.metadata?.tags?.production).toBe('Production');
    });
  });

  describe('token refresh on 401', () => {
    it('refreshes token on 401 and retries', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(new Response('Unauthorized', { status: 401 }));
        }
        return Promise.resolve(new Response(
          JSON.stringify({ secret: mockSecret }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        ));
      });

      const adapter = new InfisicalAdapter(mockConfig);
      const secret = await adapter.get('API_KEY');

      expect(secret.key).toBe('API_KEY');
      expect(callCount).toBe(2); // First call failed, retry succeeded
    });

    it('throws AuthenticationError on persistent 401', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response('Unauthorized', { status: 401 }))
      );

      const adapter = new InfisicalAdapter(mockConfig);
      await expect(adapter.get('API_KEY')).rejects.toBeInstanceOf(AuthenticationError);
    });
  });

  describe('getBatch', () => {
    it('retrieves multiple secrets', async () => {
      const adapter = new InfisicalAdapter(mockConfig);
      const results = await adapter.getBatch(['API_KEY', 'DATABASE_URL']);

      expect(results.size).toBeGreaterThanOrEqual(1);
    });

    it('skips missing secrets', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(new Response('Not found', { status: 404 }));
        }
        return Promise.resolve(new Response(
          JSON.stringify({ secret: mockSecret }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        ));
      });

      const adapter = new InfisicalAdapter(mockConfig);
      const results = await adapter.getBatch(['MISSING', 'API_KEY']);

      expect(results.size).toBe(1);
      expect(results.has('API_KEY')).toBe(true);
    });
  });

  describe('list', () => {
    const mockSecrets = {
      secrets: [
        { ...mockSecret, secretKey: 'API_KEY' },
        { ...mockSecret, secretKey: 'API_SECRET' },
        { ...mockSecret, secretKey: 'DATABASE_URL' }
      ]
    };

    beforeEach(() => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(
          JSON.stringify(mockSecrets),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        ))
      );
    });

    it('lists all secrets', async () => {
      const adapter = new InfisicalAdapter(mockConfig);
      const keys = await adapter.list();

      expect(keys).toContain('API_KEY');
      expect(keys).toContain('DATABASE_URL');
      expect(keys.length).toBe(3);
    });

    it('filters by pattern', async () => {
      const adapter = new InfisicalAdapter(mockConfig);
      const keys = await adapter.list('API_*');

      expect(keys).toContain('API_KEY');
      expect(keys).toContain('API_SECRET');
      expect(keys).not.toContain('DATABASE_URL');
    });

    it('respects limit option', async () => {
      const adapter = new InfisicalAdapter(mockConfig);
      const keys = await adapter.list(undefined, { limit: 1 });

      expect(keys.length).toBe(1);
    });

    it('respects offset option', async () => {
      const adapter = new InfisicalAdapter(mockConfig);
      const keys = await adapter.list(undefined, { offset: 1 });

      expect(keys.length).toBe(2);
    });

    it('throws ProviderError when project is missing', async () => {
      const adapter = new InfisicalAdapter({
        ...mockConfig,
        project: undefined
      });

      await expect(adapter.list()).rejects.toThrow('Project ID is required');
    });
  });

  describe('healthCheck', () => {
    it('returns healthy when API is accessible', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/status')) {
          return Promise.resolve(new Response('OK', { status: 200 }));
        }
        return Promise.resolve(new Response(
          JSON.stringify({ secret: mockSecret }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        ));
      });

      const adapter = new InfisicalAdapter(mockConfig);
      const status = await adapter.healthCheck();

      expect(status.healthy).toBe(true);
      expect(status.message).toBe('Infisical API accessible');
      expect(status.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('returns unhealthy on API error', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response('Server Error', { status: 500 }))
      );

      const adapter = new InfisicalAdapter(mockConfig);
      const status = await adapter.healthCheck();

      expect(status.healthy).toBe(false);
    });

    it('returns unhealthy on network error', async () => {
      mockFetch.mockImplementation(() =>
        Promise.reject(new Error('Network error'))
      );

      const adapter = new InfisicalAdapter(mockConfig);
      const status = await adapter.healthCheck();

      expect(status.healthy).toBe(false);
      expect(status.message).toContain('Network error');
    });
  });

  describe('retry behavior', () => {
    it('retries on 503', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve(new Response('Service Unavailable', { status: 503 }));
        }
        return Promise.resolve(new Response(
          JSON.stringify({ secret: mockSecret }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        ));
      });

      const adapter = new InfisicalAdapter(mockConfig);
      const secret = await adapter.get('API_KEY');

      expect(secret.key).toBe('API_KEY');
      expect(callCount).toBeGreaterThan(2);
    });
  });
});

describe('InfisicalAdapter - SecretValue redaction', () => {
  const mockConfig = {
    url: 'https://app.infisical.com',
    auth: { type: 'env' as const, var: 'INFISICAL_TOKEN' },
    project: 'test-project'
  };

  beforeEach(() => {
    process.env.INFISICAL_TOKEN = 'test-token';
    const mockSecret = {
      _id: 'id',
      secretKey: 'SECRET_KEY',
      secretValue: 'super-secret-password-123',
      version: 1,
      type: 'shared',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      environment: 'development'
    };

    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(
        JSON.stringify({ secret: mockSecret }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ))
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.INFISICAL_TOKEN;
  });

  it('never exposes secret value accidentally', async () => {
    const adapter = new InfisicalAdapter(mockConfig);
    const secret = await adapter.get('SECRET_KEY');

    // These should all be redacted
    const stringified = JSON.stringify(secret);
    expect(stringified).not.toContain('super-secret-password-123');
    expect(stringified).toContain('[REDACTED]');

    const toString = String(secret.value);
    expect(toString).toBe('[REDACTED]');

    // Only reveal() should return the actual value
    expect(secret.value.reveal()).toBe('super-secret-password-123');
  });
});
