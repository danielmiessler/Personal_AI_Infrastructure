# Client Report Workflow

Generate a report of connected clients organized by VLAN or device.

## Trigger

- "client report"
- "who's on my network"
- "list network clients"

## Process

1. **Get All Clients**
   ```bash
   bun run Tools/clients.ts --json
   ```

2. **Get VLANs for Context**
   ```bash
   bun run Tools/vlans.ts --json
   ```

3. **Group and Summarize**
   - Group by VLAN
   - Count per device
   - Calculate bandwidth usage

## Output Format

```
CLIENT REPORT
═════════════════════════════════════════

VLAN 1 - Default (15 clients)
───────────────────────────────────────
  192.168.1.100  laptop-joey        aa:bb:cc:dd:ee:ff  Switch-1/5
  192.168.1.101  iphone-joey        11:22:33:44:55:66  AP-Living
  ...

VLAN 20 - IoT (23 clients)
───────────────────────────────────────
  192.168.20.10  thermostat         ff:ee:dd:cc:bb:aa  Switch-1/8
  192.168.20.11  doorbell           ab:cd:ef:01:23:45  AP-Front
  ...

Top Bandwidth Consumers:
  1. laptop-joey     12.5 GB RX / 3.2 GB TX
  2. smart-tv        8.1 GB RX / 0.5 GB TX
  3. desktop-office  5.2 GB RX / 1.8 GB TX

Summary:
  - Total clients: 51
  - Wired: 18
  - Wireless: 33
```

## Options

- `--vlan <id>` - Filter to specific VLAN
- `--device <id>` - Filter to specific device
- `--top <n>` - Show top N bandwidth consumers

## When to Use

- Reviewing network usage
- Finding unknown devices
- VLAN population review
