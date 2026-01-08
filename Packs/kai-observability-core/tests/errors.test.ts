import { describe, test, expect } from 'bun:test';
import {
  ObservabilityError,
  QueryError,
  QueryTimeoutError,
  AlertNotFoundError,
  MetricNotFoundError,
  AuthenticationError,
  ConfigurationError,
  AdapterNotFoundError,
  RateLimitError,
  ConnectionError,
  ProviderError,
} from '../src/index.ts';

describe('ObservabilityError', () => {
  test('should create base error with code', () => {
    const error = new ObservabilityError('Test error', 'TEST_CODE', 'prometheus');

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.provider).toBe('prometheus');
    expect(error.name).toBe('ObservabilityError');
  });

  test('should be instanceof Error', () => {
    const error = new ObservabilityError('Test', 'CODE');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('QueryError', () => {
  test('should create with message', () => {
    const error = new QueryError('Invalid expression', 'prometheus');

    expect(error.message).toBe('Invalid expression');
    expect(error.code).toBe('QUERY_ERROR');
    expect(error.name).toBe('QueryError');
  });
});

describe('QueryTimeoutError', () => {
  test('should include timeout in message', () => {
    const error = new QueryTimeoutError(30, 'prometheus');

    expect(error.message).toBe('Query timed out after 30s');
    expect(error.code).toBe('QUERY_TIMEOUT');
    expect(error.name).toBe('QueryTimeoutError');
  });
});

describe('AlertNotFoundError', () => {
  test('should include alert name in message', () => {
    const error = new AlertNotFoundError('HighMemory', 'prometheus');

    expect(error.message).toBe('Alert not found: HighMemory');
    expect(error.code).toBe('ALERT_NOT_FOUND');
    expect(error.name).toBe('AlertNotFoundError');
  });
});

describe('MetricNotFoundError', () => {
  test('should include metric name in message', () => {
    const error = new MetricNotFoundError('nonexistent_metric', 'prometheus');

    expect(error.message).toBe('Metric not found: nonexistent_metric');
    expect(error.code).toBe('METRIC_NOT_FOUND');
    expect(error.name).toBe('MetricNotFoundError');
  });
});

describe('AuthenticationError', () => {
  test('should create with message', () => {
    const error = new AuthenticationError('Invalid token', 'prometheus');

    expect(error.message).toBe('Invalid token');
    expect(error.code).toBe('AUTHENTICATION_ERROR');
    expect(error.name).toBe('AuthenticationError');
  });
});

describe('ConfigurationError', () => {
  test('should create with message', () => {
    const error = new ConfigurationError('Missing prometheusUrl', 'prometheus');

    expect(error.message).toBe('Missing prometheusUrl');
    expect(error.code).toBe('CONFIGURATION_ERROR');
    expect(error.name).toBe('ConfigurationError');
  });
});

describe('AdapterNotFoundError', () => {
  test('should include adapter name in message', () => {
    const error = new AdapterNotFoundError('datadog');

    expect(error.message).toBe('Adapter not found: datadog');
    expect(error.code).toBe('ADAPTER_NOT_FOUND');
    expect(error.name).toBe('AdapterNotFoundError');
  });
});

describe('RateLimitError', () => {
  test('should create without retry time', () => {
    const error = new RateLimitError(undefined, 'prometheus');

    expect(error.message).toBe('Rate limit exceeded');
    expect(error.code).toBe('RATE_LIMIT');
  });

  test('should include retry time in message', () => {
    const error = new RateLimitError(60, 'prometheus');

    expect(error.message).toBe('Rate limit exceeded. Retry after 60s');
  });
});

describe('ConnectionError', () => {
  test('should create with message', () => {
    const error = new ConnectionError('Connection refused', 'prometheus');

    expect(error.message).toBe('Connection refused');
    expect(error.code).toBe('CONNECTION_ERROR');
    expect(error.name).toBe('ConnectionError');
  });
});

describe('ProviderError', () => {
  test('should include cause error', () => {
    const cause = new Error('Original error');
    const error = new ProviderError('Provider failed', 'prometheus', cause);

    expect(error.message).toBe('Provider failed');
    expect(error.code).toBe('PROVIDER_ERROR');
    expect(error.cause).toBe(cause);
    expect(error.name).toBe('ProviderError');
  });
});
