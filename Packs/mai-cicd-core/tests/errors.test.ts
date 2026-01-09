import { describe, test, expect } from 'bun:test';
import {
  CICDError,
  PipelineNotFoundError,
  RunNotFoundError,
  JobNotFoundError,
  ArtifactNotFoundError,
  AuthenticationError,
  ConfigurationError,
  AdapterNotFoundError,
  RateLimitError,
  ProviderError,
  TriggerError,
} from '../src/utils/errors.ts';

describe('CICDError', () => {
  test('should create base error', () => {
    const error = new CICDError('Test error', 'TEST_ERROR', 'github');

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.provider).toBe('github');
    expect(error.name).toBe('CICDError');
  });

  test('should work without provider', () => {
    const error = new CICDError('Test error', 'TEST_ERROR');

    expect(error.provider).toBeUndefined();
  });
});

describe('PipelineNotFoundError', () => {
  test('should create with pipeline ID', () => {
    const error = new PipelineNotFoundError('ci.yml', 'github');

    expect(error.message).toBe('Pipeline not found: ci.yml');
    expect(error.code).toBe('PIPELINE_NOT_FOUND');
    expect(error.provider).toBe('github');
    expect(error.name).toBe('PipelineNotFoundError');
  });
});

describe('RunNotFoundError', () => {
  test('should create with run ID', () => {
    const error = new RunNotFoundError('run-123', 'gitlab');

    expect(error.message).toBe('Run not found: run-123');
    expect(error.code).toBe('RUN_NOT_FOUND');
    expect(error.provider).toBe('gitlab');
    expect(error.name).toBe('RunNotFoundError');
  });
});

describe('JobNotFoundError', () => {
  test('should create with job ID', () => {
    const error = new JobNotFoundError('job-456');

    expect(error.message).toBe('Job not found: job-456');
    expect(error.code).toBe('JOB_NOT_FOUND');
    expect(error.name).toBe('JobNotFoundError');
  });
});

describe('ArtifactNotFoundError', () => {
  test('should create with artifact ID', () => {
    const error = new ArtifactNotFoundError('artifact-789', 'github');

    expect(error.message).toBe('Artifact not found: artifact-789');
    expect(error.code).toBe('ARTIFACT_NOT_FOUND');
    expect(error.name).toBe('ArtifactNotFoundError');
  });
});

describe('AuthenticationError', () => {
  test('should create with message', () => {
    const error = new AuthenticationError('Invalid token', 'github');

    expect(error.message).toBe('Invalid token');
    expect(error.code).toBe('AUTHENTICATION_ERROR');
    expect(error.provider).toBe('github');
    expect(error.name).toBe('AuthenticationError');
  });
});

describe('ConfigurationError', () => {
  test('should create with message', () => {
    const error = new ConfigurationError('Missing required config: apiUrl');

    expect(error.message).toBe('Missing required config: apiUrl');
    expect(error.code).toBe('CONFIGURATION_ERROR');
    expect(error.name).toBe('ConfigurationError');
  });
});

describe('AdapterNotFoundError', () => {
  test('should create with adapter name', () => {
    const error = new AdapterNotFoundError('jenkins');

    expect(error.message).toBe('Adapter not found: jenkins');
    expect(error.code).toBe('ADAPTER_NOT_FOUND');
    expect(error.name).toBe('AdapterNotFoundError');
  });
});

describe('RateLimitError', () => {
  test('should create without retry time', () => {
    const error = new RateLimitError(undefined, 'github');

    expect(error.message).toBe('Rate limit exceeded');
    expect(error.code).toBe('RATE_LIMIT');
    expect(error.name).toBe('RateLimitError');
  });

  test('should create with retry time', () => {
    const error = new RateLimitError(60, 'github');

    expect(error.message).toBe('Rate limit exceeded. Retry after 60s');
    expect(error.code).toBe('RATE_LIMIT');
  });
});

describe('ProviderError', () => {
  test('should create with cause', () => {
    const cause = new Error('Network error');
    const error = new ProviderError('Failed to fetch runs', 'github', cause);

    expect(error.message).toBe('Failed to fetch runs');
    expect(error.code).toBe('PROVIDER_ERROR');
    expect(error.provider).toBe('github');
    expect(error.cause).toBe(cause);
    expect(error.name).toBe('ProviderError');
  });
});

describe('TriggerError', () => {
  test('should create with message', () => {
    const error = new TriggerError('Workflow does not support dispatch', 'github');

    expect(error.message).toBe('Workflow does not support dispatch');
    expect(error.code).toBe('TRIGGER_ERROR');
    expect(error.provider).toBe('github');
    expect(error.name).toBe('TriggerError');
  });
});

describe('Error inheritance', () => {
  test('all errors should extend CICDError', () => {
    const errors = [
      new PipelineNotFoundError('id'),
      new RunNotFoundError('id'),
      new JobNotFoundError('id'),
      new ArtifactNotFoundError('id'),
      new AuthenticationError('msg'),
      new ConfigurationError('msg'),
      new AdapterNotFoundError('name'),
      new RateLimitError(),
      new ProviderError('msg', 'provider'),
      new TriggerError('msg'),
    ];

    for (const error of errors) {
      expect(error).toBeInstanceOf(CICDError);
      expect(error).toBeInstanceOf(Error);
    }
  });
});
