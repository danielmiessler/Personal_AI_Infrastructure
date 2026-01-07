# Device Audit Workflow

Audit network devices for issues, outdated firmware, and abnormal status.

## Trigger

- "audit network devices"
- "check device status"
- "network device report"

## Process

1. **Get All Devices**
   ```bash
   bun run Tools/devices.ts --json
   ```

2. **Check Each Device**
   For each device, check:
   - Status (flag if offline or pending)
   - Uptime (flag if recently rebooted < 1 hour)
   - Firmware version (compare to latest)

3. **Generate Report**

## Audit Checks

| Check | Condition | Severity |
|-------|-----------|----------|
| Offline | status != 'online' | High |
| Low Uptime | uptime < 3600 | Medium |
| Unknown Status | status == 'unknown' | Medium |
| No IP | ip is null | Low |

## Output Format

```
DEVICE AUDIT REPORT
═════════════════════════════════════════

Issues Found: 2

[HIGH] Switch-2 is OFFLINE
  - Last seen: 2 hours ago
  - Action: Check power and connectivity

[MEDIUM] AP-Office has low uptime (45 minutes)
  - May have recently rebooted
  - Action: Check logs for reboot reason

Summary:
  - Devices audited: 6
  - Online: 5
  - Offline: 1
  - Recently rebooted: 1
```

## When to Use

- Morning network check
- After power outage
- Scheduled maintenance review
