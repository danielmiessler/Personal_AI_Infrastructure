import { describe, it, expect } from 'bun:test';
import {
  SecretsError,
  SecretNotFoundError,
  AuthenticationError,
  ConfigurationError,
  AdapterNotFoundError,
  ProviderError
} from '../src/utils/errors.ts';

describe('SecretsError', () => {
  it('creates error with message and code', () => {
    const error = new SecretsError('Test error', 'TEST_CODE');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('SecretsError');
    expect(error.provider).toBeUndefined();
  });

  it('creates error with provider', () => {
    const error = new SecretsError('Test error', 'TEST_CODE', 'infisical');
    expect(error.provider).toBe('infisical');
  });

  it('is instance of Error', () => {
    const error = new SecretsError('Test', 'CODE');
    expect(error instanceof Error).toBe(true);
    expect(error instanceof SecretsError).toBe(true);
  });
});

describe('SecretNotFoundError', () => {
  it('creates error with key in message', () => {
    const error = new SecretNotFoundError('API_KEY');
    expect(error.message).toBe('Secret not found: API_KEY');
    expect(error.code).toBe('SECRET_NOT_FOUND');
    expect(error.name).toBe('SecretNotFoundError');
  });

  it('includes provider when specified', () => {
    const error = new SecretNotFoundError('API_KEY', 'cyberark');
    expect(error.provider).toBe('cyberark');
  });

  it('extends SecretsError', () => {
    const error = new SecretNotFoundError('KEY');
    expect(error instanceof SecretsError).toBe(true);
  });
});

describe('AuthenticationError', () => {
  it('creates error with message', () => {
    const error = new AuthenticationError('Invalid token');
    expect(error.message).toBe('Invalid token');
    expect(error.code).toBe('AUTHENTICATION_ERROR');
    expect(error.name).toBe('AuthenticationError');
  });

  it('includes provider when specified', () => {
    const error = new AuthenticationError('Invalid token', 'vault');
    expect(error.provider).toBe('vault');
  });
});

describe('ConfigurationError', () => {
  it('creates error with message', () => {
    const error = new ConfigurationError('Missing required field');
    expect(error.message).toBe('Missing required field');
    expect(error.code).toBe('CONFIGURATION_ERROR');
    expect(error.name).toBe('ConfigurationError');
  });
});

describe('AdapterNotFoundError', () => {
  it('creates error with adapter name in message', () => {
    const error = new AdapterNotFoundError('mai-vault-adapter');
    expect(error.message).toBe('Adapter not found: mai-vault-adapter');
    expect(error.code).toBe('ADAPTER_NOT_FOUND');
    expect(error.name).toBe('AdapterNotFoundError');
  });
});

describe('ProviderError', () => {
  it('creates error with message and provider', () => {
    const error = new ProviderError('Connection failed', 'infisical');
    expect(error.message).toBe('Connection failed');
    expect(error.code).toBe('PROVIDER_ERROR');
    expect(error.name).toBe('ProviderError');
    expect(error.provider).toBe('infisical');
  });

  it('includes cause when specified', () => {
    const cause = new Error('Network error');
    const error = new ProviderError('Connection failed', 'infisical', cause);
    expect(error.cause).toBe(cause);
  });
});
