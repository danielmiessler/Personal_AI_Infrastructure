# Network Status Workflow

Get a comprehensive overview of network status.

## Trigger

- "network status"
- "show network overview"
- "how's my network"

## Process

1. **Check Health**
   ```bash
   bun run Tools/health.ts
   ```

2. **List Devices**
   ```bash
   bun run Tools/devices.ts
   ```

3. **Summarize Clients**
   ```bash
   bun run Tools/clients.ts --json | jq 'group_by(.vlan) | map({vlan: .[0].vlan, count: length})'
   ```

## Output Format

```
NETWORK STATUS REPORT
═════════════════════════════════════════

Health: ✓ Healthy

Devices:
  - 3 switches (3 online)
  - 2 access points (2 online)
  - 1 gateway (1 online)

Clients by VLAN:
  - VLAN 1 (Default): 15 clients
  - VLAN 10 (Management): 5 clients
  - VLAN 20 (IoT): 23 clients
  - VLAN 30 (Guest): 8 clients

Total: 6 devices, 51 clients
```

## When to Use

- Daily network health check
- After network changes
- Troubleshooting connectivity issues
