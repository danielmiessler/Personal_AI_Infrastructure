/**
 * SecretsError - Base error class for secrets domain
 */
export class SecretsError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider?: string
  ) {
    super(message);
    this.name = 'SecretsError';
  }
}

/**
 * SecretNotFoundError - Thrown when a requested secret doesn't exist
 */
export class SecretNotFoundError extends SecretsError {
  constructor(key: string, provider?: string) {
    super(`Secret not found: ${key}`, 'SECRET_NOT_FOUND', provider);
    this.name = 'SecretNotFoundError';
  }
}

/**
 * AuthenticationError - Thrown when authentication fails
 */
export class AuthenticationError extends SecretsError {
  constructor(message: string, provider?: string) {
    super(message, 'AUTHENTICATION_ERROR', provider);
    this.name = 'AuthenticationError';
  }
}

/**
 * ConfigurationError - Thrown when configuration is invalid
 */
export class ConfigurationError extends SecretsError {
  constructor(message: string, provider?: string) {
    super(message, 'CONFIGURATION_ERROR', provider);
    this.name = 'ConfigurationError';
  }
}

/**
 * AdapterNotFoundError - Thrown when a requested adapter isn't installed
 */
export class AdapterNotFoundError extends SecretsError {
  constructor(adapter: string) {
    super(`Adapter not found: ${adapter}`, 'ADAPTER_NOT_FOUND');
    this.name = 'AdapterNotFoundError';
  }
}

/**
 * ProviderError - Thrown when a provider operation fails
 */
export class ProviderError extends SecretsError {
  constructor(message: string, provider: string, public readonly cause?: Error) {
    super(message, 'PROVIDER_ERROR', provider);
    this.name = 'ProviderError';
  }
}
