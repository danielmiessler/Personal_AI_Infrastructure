import { describe, test, expect } from 'bun:test';
import {
  NetworkError,
  DeviceNotFoundError,
  PortNotFoundError,
  VLANNotFoundError,
  ClientNotFoundError,
  DeviceUnreachableError,
  AuthenticationError,
  ConnectionError,
  ConfigurationError,
  AdapterNotFoundError,
  ProviderError
} from '../src/index.ts';

describe('NetworkError', () => {
  test('creates error with message and code', () => {
    const error = new NetworkError('test error', 'TEST_CODE');
    expect(error.message).toBe('test error');
    expect(error.name).toBe('NetworkError');
    expect(error.code).toBe('TEST_CODE');
    expect(error instanceof Error).toBe(true);
  });

  test('creates error with optional device', () => {
    const error = new NetworkError('test error', 'TEST_CODE', 'device-123');
    expect(error.device).toBe('device-123');
  });
});

describe('DeviceNotFoundError', () => {
  test('creates error with device ID', () => {
    const error = new DeviceNotFoundError('device-123');
    expect(error.message).toBe('Device not found: device-123');
    expect(error.device).toBe('device-123');
    expect(error.code).toBe('DEVICE_NOT_FOUND');
    expect(error.name).toBe('DeviceNotFoundError');
  });

  test('extends NetworkError', () => {
    const error = new DeviceNotFoundError('device-123');
    expect(error instanceof NetworkError).toBe(true);
  });
});

describe('PortNotFoundError', () => {
  test('creates error with device and port IDs', () => {
    const error = new PortNotFoundError('device-123', 'port-1');
    expect(error.message).toBe('Port not found: port-1 on device device-123');
    expect(error.device).toBe('device-123');
    expect(error.code).toBe('PORT_NOT_FOUND');
    expect(error.name).toBe('PortNotFoundError');
  });
});

describe('VLANNotFoundError', () => {
  test('creates error with VLAN ID', () => {
    const error = new VLANNotFoundError(100);
    expect(error.message).toBe('VLAN not found: 100');
    expect(error.code).toBe('VLAN_NOT_FOUND');
    expect(error.name).toBe('VLANNotFoundError');
  });
});

describe('ClientNotFoundError', () => {
  test('creates error with MAC address', () => {
    const error = new ClientNotFoundError('aa:bb:cc:dd:ee:ff');
    expect(error.message).toBe('Client not found: aa:bb:cc:dd:ee:ff');
    expect(error.code).toBe('CLIENT_NOT_FOUND');
    expect(error.name).toBe('ClientNotFoundError');
  });
});

describe('DeviceUnreachableError', () => {
  test('creates error with device ID', () => {
    const error = new DeviceUnreachableError('device-123');
    expect(error.message).toBe('Device unreachable: device-123');
    expect(error.device).toBe('device-123');
    expect(error.code).toBe('DEVICE_UNREACHABLE');
    expect(error.name).toBe('DeviceUnreachableError');
  });

  test('creates error with reason', () => {
    const error = new DeviceUnreachableError('device-123', 'timeout');
    expect(error.message).toBe('Device unreachable: device-123 (timeout)');
  });
});

describe('AuthenticationError', () => {
  test('creates error with message', () => {
    const error = new AuthenticationError('Invalid token');
    expect(error.message).toBe('Invalid token');
    expect(error.code).toBe('AUTHENTICATION_ERROR');
    expect(error.name).toBe('AuthenticationError');
  });

  test('creates error with device', () => {
    const error = new AuthenticationError('Invalid token', 'device-123');
    expect(error.device).toBe('device-123');
  });
});

describe('ConnectionError', () => {
  test('creates error with message', () => {
    const error = new ConnectionError('Connection refused');
    expect(error.message).toBe('Connection refused');
    expect(error.code).toBe('CONNECTION_ERROR');
    expect(error.name).toBe('ConnectionError');
  });

  test('creates error with device', () => {
    const error = new ConnectionError('Connection refused', 'device-123');
    expect(error.device).toBe('device-123');
  });
});

describe('ConfigurationError', () => {
  test('creates error with message', () => {
    const error = new ConfigurationError('Missing required field');
    expect(error.message).toBe('Missing required field');
    expect(error.code).toBe('CONFIGURATION_ERROR');
    expect(error.name).toBe('ConfigurationError');
  });
});

describe('AdapterNotFoundError', () => {
  test('creates error with adapter name', () => {
    const error = new AdapterNotFoundError('unknown-adapter');
    expect(error.message).toBe('Adapter not found: unknown-adapter');
    expect(error.code).toBe('ADAPTER_NOT_FOUND');
    expect(error.name).toBe('AdapterNotFoundError');
  });
});

describe('ProviderError', () => {
  test('creates error with message and provider name', () => {
    const error = new ProviderError('API error', 'unifi');
    expect(error.message).toBe('API error');
    expect(error.device).toBe('unifi');
    expect(error.code).toBe('PROVIDER_ERROR');
    expect(error.name).toBe('ProviderError');
  });

  test('creates error with cause', () => {
    const cause = new Error('underlying error');
    const error = new ProviderError('API error', 'unifi', cause);
    expect(error.cause).toBe(cause);
  });
});
