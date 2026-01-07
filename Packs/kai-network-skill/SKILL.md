---
name: Network
description: Network infrastructure monitoring and management. USE WHEN querying devices, ports, VLANs, clients, or performing network diagnostics.
triggers:
  - network status
  - list devices
  - show clients
  - check network
  - network health
---

# Network Skill

Monitor and manage network infrastructure across UniFi, Cisco, and other network controllers.

## Quick Reference

| Command | Description |
|---------|-------------|
| `network devices` | List all network devices |
| `network clients` | List connected clients |
| `network vlans` | List configured VLANs |
| `network health` | Check network health |
| `network device <id>` | Show device details |
| `network ports <device>` | Show device ports |

## CLI Tools

### devices.ts
List or inspect network devices.

```bash
# List all devices
bun run Tools/devices.ts

# Get specific device
bun run Tools/devices.ts device-id

# Filter by type
bun run Tools/devices.ts --type switch

# Filter by status
bun run Tools/devices.ts --status online
```

### clients.ts
List connected network clients.

```bash
# List all clients
bun run Tools/clients.ts

# Filter by VLAN
bun run Tools/clients.ts --vlan 10

# Filter by device
bun run Tools/clients.ts --device switch-id

# Find specific client by MAC
bun run Tools/clients.ts aa:bb:cc:dd:ee:ff
```

### vlans.ts
List or inspect VLANs.

```bash
# List all VLANs
bun run Tools/vlans.ts

# Get specific VLAN
bun run Tools/vlans.ts 10
```

### ports.ts
Show port information for a device.

```bash
# List all ports on a device
bun run Tools/ports.ts <device-id>

# Get specific port
bun run Tools/ports.ts <device-id> --port 1

# Filter by link status
bun run Tools/ports.ts <device-id> --link up
```

### health.ts
Check network health status.

```bash
bun run Tools/health.ts
```

## Workflows

### NetworkStatus
Get comprehensive network status overview.

### DeviceAudit
Audit devices for firmware, uptime, and status issues.

### ClientReport
Generate report of connected clients by VLAN/device.

### PortUtilization
Show port utilization and PoE status for switches.

## Configuration

Requires `providers.yaml` with network domain configured:

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

## Examples

### Get all switch devices
```
User: "Show me all switches on the network"
Tool: bun run Tools/devices.ts --type switch
Output: Lists all switch devices with status
```

### Find client by hostname
```
User: "Find the laptop on my network"
Tool: bun run Tools/clients.ts | grep -i laptop
Output: Client details with IP, MAC, VLAN
```

### Check network health
```
User: "Is my network healthy?"
Tool: bun run Tools/health.ts
Output: Health status with latency and device counts
```

## Integration

- Depends on `kai-network-core` for interfaces
- Works with `kai-unifi-adapter`, `kai-cisco-adapter`, or `kai-mock-network-adapter`
- Uses `providers.yaml` for configuration
