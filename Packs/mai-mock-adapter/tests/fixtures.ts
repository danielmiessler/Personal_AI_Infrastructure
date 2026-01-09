import MockAdapter from '../src/MockAdapter.ts';
import type { MockConfig } from '../src/MockAdapter.ts';

/**
 * Create a test provider with pre-populated secrets
 *
 * @param secrets - Key-value pairs to populate
 * @param config - Additional configuration
 */
export function createTestProvider(
  secrets: Record<string, string> = {},
  config: Omit<MockConfig, 'secrets'> = {}
): MockAdapter {
  return new MockAdapter({
    secrets,
    ...config
  });
}

/**
 * Create a slow provider for timeout testing
 *
 * @param latencyMs - Delay in milliseconds
 * @param secrets - Optional pre-populated secrets
 */
export function createSlowProvider(
  latencyMs: number,
  secrets: Record<string, string> = {}
): MockAdapter {
  return new MockAdapter({
    secrets,
    latencyMs
  });
}

/**
 * Create a flaky provider for retry testing
 *
 * @param failureRate - Probability of failure (0-1)
 * @param secrets - Optional pre-populated secrets
 * @param failureError - Error message to throw
 */
export function createFlakyProvider(
  failureRate: number,
  secrets: Record<string, string> = {},
  failureError = 'ECONNRESET'
): MockAdapter {
  return new MockAdapter({
    secrets,
    failureRate,
    failureError
  });
}

/**
 * Standard test secrets for common scenarios
 */
export const TEST_SECRETS = {
  API_KEY: 'test-api-key-12345',
  DATABASE_URL: 'postgres://localhost:5432/testdb',
  JWT_SECRET: 'super-secret-jwt-signing-key',
  REDIS_URL: 'redis://localhost:6379',
  AWS_ACCESS_KEY: 'AKIAIOSFODNN7EXAMPLE',
  AWS_SECRET_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
};

/**
 * Create a provider with standard test secrets
 */
export function createStandardTestProvider(
  additionalSecrets: Record<string, string> = {}
): MockAdapter {
  return createTestProvider({
    ...TEST_SECRETS,
    ...additionalSecrets
  });
}
