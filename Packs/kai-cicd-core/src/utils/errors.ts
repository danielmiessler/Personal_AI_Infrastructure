/**
 * CICDError - Base error class for CI/CD domain
 */
export class CICDError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider?: string
  ) {
    super(message);
    this.name = 'CICDError';
  }
}

/**
 * PipelineNotFoundError - Thrown when a requested pipeline doesn't exist
 */
export class PipelineNotFoundError extends CICDError {
  constructor(pipelineId: string, provider?: string) {
    super(`Pipeline not found: ${pipelineId}`, 'PIPELINE_NOT_FOUND', provider);
    this.name = 'PipelineNotFoundError';
  }
}

/**
 * RunNotFoundError - Thrown when a requested run doesn't exist
 */
export class RunNotFoundError extends CICDError {
  constructor(runId: string, provider?: string) {
    super(`Run not found: ${runId}`, 'RUN_NOT_FOUND', provider);
    this.name = 'RunNotFoundError';
  }
}

/**
 * JobNotFoundError - Thrown when a requested job doesn't exist
 */
export class JobNotFoundError extends CICDError {
  constructor(jobId: string, provider?: string) {
    super(`Job not found: ${jobId}`, 'JOB_NOT_FOUND', provider);
    this.name = 'JobNotFoundError';
  }
}

/**
 * ArtifactNotFoundError - Thrown when a requested artifact doesn't exist
 */
export class ArtifactNotFoundError extends CICDError {
  constructor(artifactId: string, provider?: string) {
    super(`Artifact not found: ${artifactId}`, 'ARTIFACT_NOT_FOUND', provider);
    this.name = 'ArtifactNotFoundError';
  }
}

/**
 * AuthenticationError - Thrown when authentication fails
 */
export class AuthenticationError extends CICDError {
  constructor(message: string, provider?: string) {
    super(message, 'AUTHENTICATION_ERROR', provider);
    this.name = 'AuthenticationError';
  }
}

/**
 * ConfigurationError - Thrown when configuration is invalid
 */
export class ConfigurationError extends CICDError {
  constructor(message: string, provider?: string) {
    super(message, 'CONFIGURATION_ERROR', provider);
    this.name = 'ConfigurationError';
  }
}

/**
 * AdapterNotFoundError - Thrown when a requested adapter isn't installed
 */
export class AdapterNotFoundError extends CICDError {
  constructor(adapter: string) {
    super(`Adapter not found: ${adapter}`, 'ADAPTER_NOT_FOUND');
    this.name = 'AdapterNotFoundError';
  }
}

/**
 * RateLimitError - Thrown when API rate limit is exceeded
 */
export class RateLimitError extends CICDError {
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
export class ProviderError extends CICDError {
  constructor(message: string, provider: string, public readonly cause?: Error) {
    super(message, 'PROVIDER_ERROR', provider);
    this.name = 'ProviderError';
  }
}

/**
 * TriggerError - Thrown when triggering a run fails
 */
export class TriggerError extends CICDError {
  constructor(message: string, provider?: string) {
    super(message, 'TRIGGER_ERROR', provider);
    this.name = 'TriggerError';
  }
}
