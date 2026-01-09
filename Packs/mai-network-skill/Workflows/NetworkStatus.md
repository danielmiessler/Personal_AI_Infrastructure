# NetworkStatus Workflow

**Purpose:** Provide a comprehensive overview of network health, device status, and client distribution across VLANs.

**Triggers:** network status, show network overview, how's my network, network health check, network summary

---

## Steps

1. Check overall network health
```bash
bun run Tools/health.ts
```

2. List all network devices with status
```bash
bun run Tools/devices.ts
```

3. Get VLAN information for context
```bash
bun run Tools/vlans.ts
```

4. Get client counts by VLAN
```bash
bun run Tools/clients.ts --json
```

5. Compile results into formatted report with:
   - Health status (healthy/unhealthy with latency)
   - Device summary by type and status
   - Client distribution across VLANs
   - Any alerts or warnings

---

## Examples

**Example 1: Morning health check**
```
User: "How's my network looking?"

Process:
1. Run: bun run Tools/health.ts
2. Run: bun run Tools/devices.ts
3. Run: bun run Tools/clients.ts --json
4. Aggregate device counts by type (switch, access_point, gateway)
5. Count online vs offline devices
6. Group clients by VLAN ID
7. Return formatted status report
```

**Example 2: Quick status after power outage**
```
User: "Network status - we just had a power flicker"

Process:
1. Run: bun run Tools/health.ts (check controller connectivity)
2. Run: bun run Tools/devices.ts --status offline (check for down devices)
3. Run: bun run Tools/devices.ts --json (get uptime for all devices)
4. Flag any devices with uptime < 300 seconds (recent reboot)
5. Return: status with emphasis on offline devices and recent reboots
```

**Example 3: Detailed network overview**
```
User: "Give me a full network overview"

Process:
1. Run all data gathering commands
2. Calculate totals: devices by type, clients by VLAN, bandwidth totals
3. Identify any anomalies (offline devices, VLANs with 0 clients)
4. Return: comprehensive report with all metrics
```

---

## Output Format

```
NETWORK STATUS REPORT
═══════════════════════════════════════════════════

Health: ✓ Healthy (latency: 45ms)

DEVICES
───────────────────────────────────────────────────
  Gateway:       1 online
  Switches:      3 online, 0 offline
  Access Points: 2 online, 0 offline
  Total:         6 devices

CLIENTS BY VLAN
───────────────────────────────────────────────────
  VLAN 1  (Default):     15 clients
  VLAN 10 (Management):   5 clients
  VLAN 20 (IoT):         23 clients
  VLAN 30 (Guest):        8 clients
  Total:                 51 clients

ALERTS
───────────────────────────────────────────────────
  (none)

Last updated: 2026-01-08 14:32:15
```

---

## Error Handling

- **Controller unreachable** -> Report "Network controller offline" with troubleshooting steps (check network connectivity, verify controller IP, check firewall rules)
- **API timeout** -> Retry once, then report partial results with warning
- **No devices found** -> Verify controller configuration, check API credentials
- **Mixed online/offline** -> Highlight offline devices prominently in report

---

## Notes

- This workflow is the default "what's happening" check and should be the first thing run when investigating network issues
- If health check fails, skip detailed queries and focus on connectivity troubleshooting
- Consider running this as a scheduled check (cron) to catch issues early
- The health.ts tool returns exit code 1 if unhealthy - use this for alerting
