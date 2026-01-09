# mai-network-skill

> Network infrastructure monitoring and management skill for PAI

## Overview

User-facing skill for monitoring and managing network infrastructure. Provides CLI tools and workflows for querying devices, ports, VLANs, clients, and performing network diagnostics across UniFi, Cisco, and other network controllers.

## Features

- List and inspect network devices (switches, access points, gateways)
- Query connected clients by VLAN, device, or MAC address
- View port information and link status
- Check network health status
- Audit devices for firmware, uptime, and status issues
- Generate client reports organized by VLAN

## Requirements

- Bun runtime
- `mai-network-core` - Core interfaces and types
- A network adapter (e.g., `mai-unifi-adapter`, `mai-cisco-adapter`, or `mai-mock-network-adapter`)
- `providers.yaml` configuration for network domain

## Quick Start

```bash
# Install dependencies
bun install

# Run tests
bun test

# List all devices
bun run devices

# List connected clients
bun run clients

# Check network health
bun run health
```

## CLI Tools

| Tool | Description |
|------|-------------|
| `devices.ts` | List or inspect network devices |
| `clients.ts` | List connected network clients |
| `vlans.ts` | List or inspect VLANs |
| `ports.ts` | Show port information for a device |
| `health.ts` | Check network health status |

## Workflows

| Workflow | Description |
|----------|-------------|
| `NetworkStatus` | Comprehensive network status overview |
| `DeviceAudit` | Audit devices for issues and outdated firmware |
| `ClientReport` | Generate client inventory by VLAN/device |

## Configuration

Configure in `~/.config/kai/providers.yaml` or `./providers.yaml`:

```yaml
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
```

## Related Packs

- [mai-network-core](../mai-network-core) - Core interfaces and types
- [mai-unifi-adapter](../mai-unifi-adapter) - UniFi controller adapter
- [mai-cisco-adapter](../mai-cisco-adapter) - Cisco adapter
- [mai-mock-network-adapter](../mai-mock-network-adapter) - Mock adapter for testing
