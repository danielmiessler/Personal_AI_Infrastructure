/**
 * NetworkError - Base error class for network domain
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly device?: string
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * DeviceNotFoundError - Thrown when a device doesn't exist
 */
export class DeviceNotFoundError extends NetworkError {
  constructor(deviceId: string) {
    super(`Device not found: ${deviceId}`, 'DEVICE_NOT_FOUND', deviceId);
    this.name = 'DeviceNotFoundError';
  }
}

/**
 * PortNotFoundError - Thrown when a port doesn't exist
 */
export class PortNotFoundError extends NetworkError {
  constructor(deviceId: string, portId: string) {
    super(`Port not found: ${portId} on device ${deviceId}`, 'PORT_NOT_FOUND', deviceId);
    this.name = 'PortNotFoundError';
  }
}

/**
 * VLANNotFoundError - Thrown when a VLAN doesn't exist
 */
export class VLANNotFoundError extends NetworkError {
  constructor(vlanId: number) {
    super(`VLAN not found: ${vlanId}`, 'VLAN_NOT_FOUND');
    this.name = 'VLANNotFoundError';
  }
}

/**
 * ClientNotFoundError - Thrown when a client doesn't exist
 */
export class ClientNotFoundError extends NetworkError {
  constructor(mac: string) {
    super(`Client not found: ${mac}`, 'CLIENT_NOT_FOUND');
    this.name = 'ClientNotFoundError';
  }
}

/**
 * DeviceUnreachableError - Thrown when a device can't be reached
 */
export class DeviceUnreachableError extends NetworkError {
  constructor(deviceId: string, reason?: string) {
    super(
      `Device unreachable: ${deviceId}${reason ? ` (${reason})` : ''}`,
      'DEVICE_UNREACHABLE',
      deviceId
    );
    this.name = 'DeviceUnreachableError';
  }
}

/**
 * AuthenticationError - Thrown when authentication fails
 */
export class AuthenticationError extends NetworkError {
  constructor(message: string, device?: string) {
    super(message, 'AUTHENTICATION_ERROR', device);
    this.name = 'AuthenticationError';
  }
}

/**
 * ConnectionError - Thrown when connection fails
 */
export class ConnectionError extends NetworkError {
  constructor(message: string, device?: string) {
    super(message, 'CONNECTION_ERROR', device);
    this.name = 'ConnectionError';
  }
}

/**
 * ConfigurationError - Thrown when configuration is invalid
 */
export class ConfigurationError extends NetworkError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}

/**
 * AdapterNotFoundError - Thrown when adapter isn't installed
 */
export class AdapterNotFoundError extends NetworkError {
  constructor(adapter: string) {
    super(`Adapter not found: ${adapter}`, 'ADAPTER_NOT_FOUND');
    this.name = 'AdapterNotFoundError';
  }
}

/**
 * ProviderError - Thrown when a provider operation fails
 */
export class ProviderError extends NetworkError {
  constructor(message: string, provider: string, public readonly cause?: Error) {
    super(message, 'PROVIDER_ERROR', provider);
    this.name = 'ProviderError';
  }
}
