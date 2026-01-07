import { describe, it, expect } from 'bun:test';
import {
  IssuesError,
  IssueNotFoundError,
  ProjectNotFoundError,
  LabelNotFoundError,
  AuthenticationError,
  ConfigurationError,
  AdapterNotFoundError,
  RateLimitError,
  ProviderError
} from '../src/utils/errors.ts';

describe('IssuesError', () => {
  it('creates error with message and code', () => {
    const error = new IssuesError('Test error', 'TEST_CODE');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('IssuesError');
    expect(error.provider).toBeUndefined();
  });

  it('creates error with provider', () => {
    const error = new IssuesError('Test error', 'TEST_CODE', 'joplin');
    expect(error.provider).toBe('joplin');
  });

  it('is instance of Error', () => {
    const error = new IssuesError('Test', 'CODE');
    expect(error instanceof Error).toBe(true);
    expect(error instanceof IssuesError).toBe(true);
  });
});

describe('IssueNotFoundError', () => {
  it('creates error with issueId in message', () => {
    const error = new IssueNotFoundError('issue-123');
    expect(error.message).toBe('Issue not found: issue-123');
    expect(error.code).toBe('ISSUE_NOT_FOUND');
    expect(error.name).toBe('IssueNotFoundError');
  });

  it('includes provider when specified', () => {
    const error = new IssueNotFoundError('issue-123', 'linear');
    expect(error.provider).toBe('linear');
  });

  it('extends IssuesError', () => {
    const error = new IssueNotFoundError('issue-123');
    expect(error instanceof IssuesError).toBe(true);
  });
});

describe('ProjectNotFoundError', () => {
  it('creates error with projectId in message', () => {
    const error = new ProjectNotFoundError('project-456');
    expect(error.message).toBe('Project not found: project-456');
    expect(error.code).toBe('PROJECT_NOT_FOUND');
    expect(error.name).toBe('ProjectNotFoundError');
  });

  it('includes provider when specified', () => {
    const error = new ProjectNotFoundError('project-456', 'jira');
    expect(error.provider).toBe('jira');
  });
});

describe('LabelNotFoundError', () => {
  it('creates error with labelId in message', () => {
    const error = new LabelNotFoundError('label-789');
    expect(error.message).toBe('Label not found: label-789');
    expect(error.code).toBe('LABEL_NOT_FOUND');
    expect(error.name).toBe('LabelNotFoundError');
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
    const error = new AuthenticationError('Invalid token', 'linear');
    expect(error.provider).toBe('linear');
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
    const error = new AdapterNotFoundError('kai-jira-adapter');
    expect(error.message).toBe('Adapter not found: kai-jira-adapter');
    expect(error.code).toBe('ADAPTER_NOT_FOUND');
    expect(error.name).toBe('AdapterNotFoundError');
  });
});

describe('RateLimitError', () => {
  it('creates error without retryAfter', () => {
    const error = new RateLimitError();
    expect(error.message).toBe('Rate limit exceeded');
    expect(error.code).toBe('RATE_LIMIT');
    expect(error.name).toBe('RateLimitError');
  });

  it('creates error with retryAfter', () => {
    const error = new RateLimitError(60);
    expect(error.message).toBe('Rate limit exceeded. Retry after 60s');
  });

  it('includes provider when specified', () => {
    const error = new RateLimitError(30, 'linear');
    expect(error.provider).toBe('linear');
  });
});

describe('ProviderError', () => {
  it('creates error with message and provider', () => {
    const error = new ProviderError('Connection failed', 'joplin');
    expect(error.message).toBe('Connection failed');
    expect(error.code).toBe('PROVIDER_ERROR');
    expect(error.name).toBe('ProviderError');
    expect(error.provider).toBe('joplin');
  });

  it('includes cause when specified', () => {
    const cause = new Error('Network error');
    const error = new ProviderError('Connection failed', 'joplin', cause);
    expect(error.cause).toBe(cause);
  });
});
