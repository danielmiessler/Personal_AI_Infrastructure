# mai-unifi-adapter

UniFi Network Controller adapter for the PAI Infrastructure Pack System.

## Overview

This adapter implements the `NetworkProvider` interface from `mai-network-core` for UniFi controllers, supporting both UniFi OS (UDM, UDM Pro, UDR) and classic UniFi controllers.

## Installation

```bash
bun add mai-unifi-adapter
```

## Configuration

Add to your `providers.yaml`:

```yaml
domains:
  network:
    primary: unifi
    adapters:
      unifi:
        url: https://192.168.1.1
        site: default
        timeout: 30000
        verifySSL: false
        auth:
          type: keychain
          service: unifi-controller
```

### Authentication Options

#### macOS Keychain (Recommended)
```yaml
auth:
  type: keychain
  service: unifi-controller
```

Store credentials:
```bash
security add-generic-password -s unifi-controller -a admin -w 'your-password'
```

#### Environment Variables
```yaml
auth:
  type: env
  var: UNIFI_USER:UNIFI_PASS
```

#### Direct (Development Only)
```yaml
auth:
  type: direct
  username: admin
  password: your-password
```

## Usage

```typescript
import { getNetworkProvider } from 'mai-network-core';

const provider = await getNetworkProvider({ adapter: 'unifi' });

// List all devices
const devices = await provider.getDevices();
for (const device of devices) {
  console.log(`${device.name} (${device.type}): ${device.status}`);
}

// Get switch ports
const ports = await provider.getPorts('switch-device-id');
for (const port of ports) {
  console.log(`Port ${port.number}: ${port.link ? 'up' : 'down'}`);
}

// List connected clients
const clients = await provider.getClients({ vlan: 10 });
console.log(`${clients.length} clients on VLAN 10`);

// Check health
const health = await provider.healthCheck();
console.log(`Controller: ${health.healthy ? 'OK' : health.message}`);
```

## Supported Features

| Feature | Support |
|---------|---------|
| List devices | ✅ |
| Get device details | ✅ |
| List ports | ✅ |
| Get port details | ✅ |
| List VLANs | ✅ |
| Get VLAN details | ✅ |
| List clients | ✅ |
| Filter clients | ✅ |
| Get client by MAC | ✅ |
| Health check | ✅ |

## Device Type Mapping

| UniFi Type | Mapped Type |
|------------|-------------|
| USW | switch |
| UGW | gateway |
| UAP | access_point |
| UXG | gateway |
| UDM | gateway |

## Controller Compatibility

- **UniFi OS** (UDM, UDM Pro, UDR, UDM SE): Full support
- **Classic Controllers** (Cloud Key Gen1, self-hosted): Full support

The adapter auto-detects controller type and uses the appropriate API paths.

## Error Handling

```typescript
import {
  DeviceNotFoundError,
  ClientNotFoundError,
  AuthenticationError
} from 'mai-network-core';

try {
  const client = await provider.getClient('unknown-mac');
} catch (error) {
  if (error instanceof ClientNotFoundError) {
    console.log('Client not found');
  } else if (error instanceof AuthenticationError) {
    console.log('Check your credentials');
  }
}
```

## License

MIT
