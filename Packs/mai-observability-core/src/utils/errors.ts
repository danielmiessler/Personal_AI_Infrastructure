/**
 * ObservabilityError - Base error class for Observability domain
 */
export class ObservabilityError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider?: string
  ) {
    super(message);
    this.name = 'ObservabilityError';
  }
}

/**
 * QueryError - Thrown when a query fails to execute
 */
export class QueryError extends ObservabilityError {
  constructor(message: string, provider?: string) {
    super(message, 'QUERY_ERROR', provider);
    this.name = 'QueryError';
  }
}

/**
 * QueryTimeoutError - Thrown when a query times out
 */
export class QueryTimeoutError extends ObservabilityError {
  constructor(timeout: number, provider?: string) {
    super(`Query timed out after ${timeout}s`, 'QUERY_TIMEOUT', provider);
    this.name = 'QueryTimeoutError';
  }
}

/**
 * AlertNotFoundError - Thrown when a requested alert doesn't exist
 */
export class AlertNotFoundError extends ObservabilityError {
  constructor(alertName: string, provider?: string) {
    super(`Alert not found: ${alertName}`, 'ALERT_NOT_FOUND', provider);
    this.name = 'AlertNotFoundError';
  }
}

/**
 * MetricNotFoundError - Thrown when a requested metric doesn't exist
 */
export class MetricNotFoundError extends ObservabilityError {
  constructor(metric: string, provider?: string) {
    super(`Metric not found: ${metric}`, 'METRIC_NOT_FOUND', provider);
    this.name = 'MetricNotFoundError';
  }
}

/**
 * AuthenticationError - Thrown when authentication fails
 */
export class AuthenticationError extends ObservabilityError {
  constructor(message: string, provider?: string) {
    super(message, 'AUTHENTICATION_ERROR', provider);
    this.name = 'AuthenticationError';
  }
}

/**
 * ConfigurationError - Thrown when configuration is invalid
 */
export class ConfigurationError extends ObservabilityError {
  constructor(message: string, provider?: string) {
    super(message, 'CONFIGURATION_ERROR', provider);
    this.name = 'ConfigurationError';
  }
}

/**
 * AdapterNotFoundError - Thrown when a requested adapter isn't installed
 */
export class AdapterNotFoundError extends ObservabilityError {
  constructor(adapter: string) {
    super(`Adapter not found: ${adapter}`, 'ADAPTER_NOT_FOUND');
    this.name = 'AdapterNotFoundError';
  }
}

/**
 * RateLimitError - Thrown when API rate limit is exceeded
 */
export class RateLimitError extends ObservabilityError {
  constructor(retryAfter?: number, provider?: string) {
    super(
      `Rate limit exceeded${retryAfter ? `. Retry after ${retryAfter}s` : ''}`,
      'RATE_LIMIT',
      provider
    );
    this.name = 'RateLimitError';
  }
}

/**
 * ConnectionError - Thrown when connection to backend fails
 */
export class ConnectionError extends ObservabilityError {
  constructor(message: string, provider?: string) {
    super(message, 'CONNECTION_ERROR', provider);
    this.name = 'ConnectionError';
  }
}

/**
 * ProviderError - Thrown when a provider operation fails
 */
export class ProviderError extends ObservabilityError {
  constructor(message: string, provider: string, public readonly cause?: Error) {
    super(message, 'PROVIDER_ERROR', provider);
    this.name = 'ProviderError';
  }
}
