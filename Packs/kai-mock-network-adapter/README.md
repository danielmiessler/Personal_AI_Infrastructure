# kai-mock-network-adapter

Mock network adapter for testing and development in the PAI Infrastructure Pack System.

## Overview

This adapter provides a fully functional mock implementation of `NetworkProvider` with:
- Auto-generated test data (devices, ports, VLANs, clients)
- Configurable latency simulation
- Configurable failure rate for testing error handling
- Test helpers for manipulating state

## Installation

```bash
bun add kai-mock-network-adapter
```

## Configuration

Add to your `providers.yaml`:

```yaml
domains:
  network:
    primary: unifi
    fallback: mock  # Use mock as fallback for testing
    adapters:
      mock:
        devices: 5
        clientsPerDevice: 10
        latencyMs: 0
        failureRate: 0
```

## Usage

### Basic Usage

```typescript
import { getNetworkProvider } from 'kai-network-core';

const provider = await getNetworkProvider({ adapter: 'mock' });

const devices = await provider.getDevices();
console.log(`Found ${devices.length} mock devices`);
```

### Direct Instantiation

```typescript
import MockNetworkAdapter from 'kai-mock-network-adapter';

const adapter = new MockNetworkAdapter({
  devices: 5,
  clientsPerDevice: 10
});

const devices = await adapter.getDevices();
```

### Custom Test Data

```typescript
import MockNetworkAdapter from 'kai-mock-network-adapter';

const adapter = new MockNetworkAdapter({
  customDevices: [
    {
      id: 'test-switch',
      name: 'Test Switch',
      model: 'TEST-24',
      mac: 'aa:bb:cc:dd:ee:ff',
      type: 'switch',
      status: 'online',
      ports: 24
    }
  ],
  customVLANs: [
    { id: 100, name: 'Test VLAN', subnet: '10.0.0.0/24' }
  ]
});
```

### Simulating Latency

```typescript
const adapter = new MockNetworkAdapter({ latencyMs: 100 });

// Or dynamically
adapter.setLatency(500);
```

### Simulating Failures

```typescript
const adapter = new MockNetworkAdapter({ failureRate: 0.1 }); // 10% failure

// Or dynamically
adapter.setFailureRate(0.5); // 50% failure
```

### Test Helpers

```typescript
// Add devices at runtime
adapter.addDevice({
  id: 'dynamic-device',
  name: 'Added Later',
  model: 'DYN',
  mac: 'ff:ff:ff:ff:ff:ff',
  type: 'router',
  status: 'online'
});

// Add clients
adapter.addClient({
  mac: 'aa:aa:aa:aa:aa:aa',
  ip: '192.168.1.200',
  hostname: 'test-client',
  connected: true
});

// Add VLANs
adapter.addVLAN({
  id: 50,
  name: 'Test VLAN'
});

// Remove devices
adapter.removeDevice('dynamic-device');

// Reset to defaults
adapter.reset({ devices: 3 });
```

## Generated Data

### Default Devices

By default, generates 3 devices:
- Switch with 24 ports
- Router with 4 ports
- Access Point

### Default VLANs

- VLAN 1: Default (192.168.1.0/24)
- VLAN 10: Management (192.168.10.0/24)
- VLAN 20: IoT (192.168.20.0/24)
- VLAN 30: Guest (192.168.30.0/24)

### Generated Clients

Clients are distributed across devices and VLANs with:
- Unique MAC addresses
- IP addresses in VLAN subnets
- Realistic traffic statistics

### Generated Ports

Switch ports include:
- PoE information (ports 1-16)
- Link status based on connected clients
- Traffic statistics

## Testing Scenarios

### Offline Device

```typescript
adapter.addDevice({
  id: 'offline-device',
  name: 'Offline Switch',
  model: 'OFF-24',
  mac: '00:00:00:00:00:01',
  type: 'switch',
  status: 'offline'
});
```

### Empty Network

```typescript
const emptyAdapter = new MockNetworkAdapter({
  customDevices: [],
  customClients: [],
  customVLANs: []
});
```

### High Latency

```typescript
const slowAdapter = new MockNetworkAdapter({ latencyMs: 2000 });
```

### Unreliable Network

```typescript
const unstableAdapter = new MockNetworkAdapter({ failureRate: 0.3 });
```

## License

MIT
