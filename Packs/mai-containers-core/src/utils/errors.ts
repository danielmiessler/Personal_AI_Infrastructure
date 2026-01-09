/**
 * Base error class for Platform domain
 */
export class PlatformError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider?: string
  ) {
    super(message);
    this.name = 'PlatformError';
  }
}

/**
 * Thrown when a namespace is not found
 */
export class NamespaceNotFoundError extends PlatformError {
  constructor(namespace: string, provider?: string) {
    super(`Namespace not found: ${namespace}`, 'NAMESPACE_NOT_FOUND', provider);
    this.name = 'NamespaceNotFoundError';
  }
}

/**
 * Thrown when a deployment is not found
 */
export class DeploymentNotFoundError extends PlatformError {
  constructor(deployment: string, provider?: string) {
    super(`Deployment not found: ${deployment}`, 'DEPLOYMENT_NOT_FOUND', provider);
    this.name = 'DeploymentNotFoundError';
  }
}

/**
 * Thrown when a container/pod is not found
 */
export class ContainerNotFoundError extends PlatformError {
  constructor(container: string, provider?: string) {
    super(`Container not found: ${container}`, 'CONTAINER_NOT_FOUND', provider);
    this.name = 'ContainerNotFoundError';
  }
}

/**
 * Thrown when a service is not found
 */
export class ServiceNotFoundError extends PlatformError {
  constructor(service: string, provider?: string) {
    super(`Service not found: ${service}`, 'SERVICE_NOT_FOUND', provider);
    this.name = 'ServiceNotFoundError';
  }
}

/**
 * Thrown when authentication fails
 */
export class AuthenticationError extends PlatformError {
  constructor(message: string, provider?: string) {
    super(message, 'AUTHENTICATION_ERROR', provider);
    this.name = 'AuthenticationError';
  }
}

/**
 * Thrown when configuration is invalid
 */
export class ConfigurationError extends PlatformError {
  constructor(message: string, provider?: string) {
    super(message, 'CONFIGURATION_ERROR', provider);
    this.name = 'ConfigurationError';
  }
}

/**
 * Thrown when an adapter is not found
 */
export class AdapterNotFoundError extends PlatformError {
  constructor(adapter: string) {
    super(`Adapter not found: ${adapter}`, 'ADAPTER_NOT_FOUND');
    this.name = 'AdapterNotFoundError';
  }
}

/**
 * Thrown when a rate limit is exceeded
 */
export class RateLimitError extends PlatformError {
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
 * Thrown when a general provider error occurs
 */
export class ProviderError extends PlatformError {
  constructor(message: string, provider?: string) {
    super(message, 'PROVIDER_ERROR', provider);
    this.name = 'ProviderError';
  }
}

/**
 * Thrown when command execution fails
 */
export class ExecError extends PlatformError {
  public readonly exitCode: number;
  public readonly stderr: string;

  constructor(command: string, exitCode: number, stderr: string, provider?: string) {
    super(`Command failed (exit ${exitCode}): ${stderr.slice(0, 200)}`, 'EXEC_ERROR', provider);
    this.name = 'ExecError';
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}

/**
 * Thrown when scaling fails
 */
export class ScaleError extends PlatformError {
  constructor(deployment: string, reason: string, provider?: string) {
    super(`Failed to scale ${deployment}: ${reason}`, 'SCALE_ERROR', provider);
    this.name = 'ScaleError';
  }
}

/**
 * Thrown when connection to provider fails
 */
export class ConnectionError extends PlatformError {
  constructor(provider: string, message: string) {
    super(message, 'CONNECTION_ERROR', provider);
    this.name = 'ConnectionError';
  }
}
