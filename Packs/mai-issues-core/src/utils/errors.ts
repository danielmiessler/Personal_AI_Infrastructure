/**
 * IssuesError - Base error class for issues domain
 */
export class IssuesError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider?: string
  ) {
    super(message);
    this.name = 'IssuesError';
  }
}

/**
 * IssueNotFoundError - Thrown when a requested issue doesn't exist
 */
export class IssueNotFoundError extends IssuesError {
  constructor(issueId: string, provider?: string) {
    super(`Issue not found: ${issueId}`, 'ISSUE_NOT_FOUND', provider);
    this.name = 'IssueNotFoundError';
  }
}

/**
 * ProjectNotFoundError - Thrown when a requested project doesn't exist
 */
export class ProjectNotFoundError extends IssuesError {
  constructor(projectId: string, provider?: string) {
    super(`Project not found: ${projectId}`, 'PROJECT_NOT_FOUND', provider);
    this.name = 'ProjectNotFoundError';
  }
}

/**
 * LabelNotFoundError - Thrown when a requested label doesn't exist
 */
export class LabelNotFoundError extends IssuesError {
  constructor(labelId: string, provider?: string) {
    super(`Label not found: ${labelId}`, 'LABEL_NOT_FOUND', provider);
    this.name = 'LabelNotFoundError';
  }
}

/**
 * AuthenticationError - Thrown when authentication fails
 */
export class AuthenticationError extends IssuesError {
  constructor(message: string, provider?: string) {
    super(message, 'AUTHENTICATION_ERROR', provider);
    this.name = 'AuthenticationError';
  }
}

/**
 * ConfigurationError - Thrown when configuration is invalid
 */
export class ConfigurationError extends IssuesError {
  constructor(message: string, provider?: string) {
    super(message, 'CONFIGURATION_ERROR', provider);
    this.name = 'ConfigurationError';
  }
}

/**
 * AdapterNotFoundError - Thrown when a requested adapter isn't installed
 */
export class AdapterNotFoundError extends IssuesError {
  constructor(adapter: string) {
    super(`Adapter not found: ${adapter}`, 'ADAPTER_NOT_FOUND');
    this.name = 'AdapterNotFoundError';
  }
}

/**
 * RateLimitError - Thrown when API rate limit is exceeded
 */
export class RateLimitError extends IssuesError {
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
 * ProviderError - Thrown when a provider operation fails
 */
export class ProviderError extends IssuesError {
  constructor(message: string, provider: string, public readonly cause?: Error) {
    super(message, 'PROVIDER_ERROR', provider);
    this.name = 'ProviderError';
  }
}
