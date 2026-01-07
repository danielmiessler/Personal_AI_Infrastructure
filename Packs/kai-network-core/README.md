# kai-network-core

Core interfaces and discovery for network infrastructure adapters in the PAI Infrastructure Pack System.

## Overview

This package provides:
- `NetworkProvider` interface that all network adapters must implement
- Adapter discovery and loading via `adapter.yaml` manifests
- Configuration loading from `providers.yaml`
- Provider factory with fallback support
- Standard error types for network operations

## Installation

```bash
bun add kai-network-core
```

## Usage

### Get a Network Provider

```typescript
import { getNetworkProvider } from 'kai-network-core';

// Uses primary adapter from providers.yaml
const provider = await getNetworkProvider();

// Or specify an adapter explicitly
const unifi = await getNetworkProvider({ adapter: 'unifi' });

// Get devices
const devices = await provider.getDevices();
console.log(`Found ${devices.length} devices`);
```

### With Fallback Support

```typescript
import { getNetworkProviderWithFallback } from 'kai-network-core';

// Tries primary, falls back to secondary if unhealthy
const provider = await getNetworkProviderWithFallback();
```

### List Available Adapters

```typescript
import { listAvailableAdapters } from 'kai-network-core';

const adapters = await listAvailableAdapters();
// ['unifi', 'cisco', 'mock']
```

## Configuration

Create `providers.yaml` in your project root or `~/.config/kai/providers.yaml`:

```yaml
version: "1.0"
domains:
  network:
    primary: unifi
    fallback: mock
    adapters:
      unifi:
        url: https://192.168.1.1
        auth:
          type: keychain
          service: unifi-controller
      cisco:
        url: https://cisco.example.com
        auth:
          type: env
          var: CISCO_TOKEN
```

### Config Search Order

1. `$PROVIDERS_CONFIG` environment variable
2. `./providers.yaml` (project root)
3. `~/.config/kai/providers.yaml` (user config)
4. `/etc/kai/providers.yaml` (system config)

## NetworkProvider Interface

All adapters implement this interface:

```typescript
interface NetworkProvider {
  readonly name: string;
  readonly version: string;

  // Devices
  getDevices(options?: ListOptions): Promise<Device[]>;
  getDevice(id: string): Promise<Device>;

  // Ports
  getPorts(deviceId: string): Promise<Port[]>;
  getPort(deviceId: string, portId: string): Promise<Port>;

  // VLANs
  getVLANs(): Promise<VLAN[]>;
  getVLAN(id: number): Promise<VLAN>;

  // Clients
  getClients(options?: ClientOptions): Promise<Client[]>;
  getClient(mac: string): Promise<Client>;

  // Health
  healthCheck(): Promise<NetworkHealth>;
}
```

## Data Types

### Device

```typescript
interface Device {
  id: string;
  name: string;
  model: string;
  mac: string;
  ip?: string;
  type: 'switch' | 'router' | 'access_point' | 'gateway' | 'firewall' | 'other';
  status: 'online' | 'offline' | 'pending' | 'adopting' | 'unknown';
  firmware?: string;
  uptime?: number;
  ports?: number;
  clients?: number;
  metadata?: Record<string, unknown>;
}
```

### Port

```typescript
interface Port {
  id: string;
  name?: string;
  number: number;
  enabled: boolean;
  speed?: number;
  duplex?: 'full' | 'half' | 'auto';
  poe?: {
    enabled: boolean;
    power?: number;
    mode?: string;
  };
  vlan?: number;
  trunk?: boolean;
  link: boolean;
  stats?: {
    rxBytes: number;
    txBytes: number;
    rxPackets: number;
    txPackets: number;
    errors?: number;
  };
}
```

### Client

```typescript
interface Client {
  mac: string;
  ip?: string;
  hostname?: string;
  name?: string;
  deviceId?: string;
  port?: number;
  vlan?: number;
  connected: boolean;
  firstSeen?: Date;
  lastSeen?: Date;
  rxBytes?: number;
  txBytes?: number;
  signal?: number;
  metadata?: Record<string, unknown>;
}
```

## Error Handling

```typescript
import {
  NetworkError,
  DeviceNotFoundError,
  DeviceUnreachableError,
  AuthenticationError
} from 'kai-network-core';

try {
  const device = await provider.getDevice('unknown-id');
} catch (error) {
  if (error instanceof DeviceNotFoundError) {
    console.log(`Device not found: ${error.deviceId}`);
  } else if (error instanceof AuthenticationError) {
    console.log('Authentication failed - check credentials');
  }
}
```

## Creating an Adapter

See [kai-unifi-adapter](../kai-unifi-adapter) or [kai-mock-network-adapter](../kai-mock-network-adapter) for examples.

Each adapter needs:
1. `adapter.yaml` manifest
2. Default export class implementing `NetworkProvider`
3. Tests

### adapter.yaml

```yaml
name: my-adapter
version: "1.0.0"
domain: network
interface: NetworkProvider
entry: src/MyAdapter.ts
description: My custom network adapter
config:
  required:
    - url
  optional:
    timeout: 30000
```

## License

MIT
