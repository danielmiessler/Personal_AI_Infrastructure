# DeviceAudit Workflow

**Purpose:** Audit network devices for firmware currency, uptime anomalies, status issues, and configuration drift to identify maintenance needs.

**Triggers:** audit network devices, device audit, check device status, network device report, device health check, maintenance check

---

## Steps

1. Retrieve all devices with full details
```bash
bun run Tools/devices.ts --json
```

2. For each device, inspect detailed status
```bash
bun run Tools/devices.ts <device-id>
```

3. Evaluate each device against audit criteria:
   - Status: online, offline, pending, unknown
   - Uptime: flag if < 1 hour (unexpected reboot) or suspiciously high (needs reboot)
   - Firmware: compare against known current versions
   - IP assignment: flag if missing

4. Aggregate issues by severity (High, Medium, Low, Info)

5. Generate prioritized audit report

---

## Audit Criteria

| Check | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Device Offline | status == 'offline' | HIGH | Investigate immediately |
| Unknown Status | status == 'unknown' | HIGH | Check device connectivity |
| Pending Status | status == 'pending' | MEDIUM | May be adopting/provisioning |
| Recent Reboot | uptime < 3600 (1 hour) | MEDIUM | Check logs for cause |
| Extended Uptime | uptime > 7776000 (90 days) | LOW | Consider scheduled reboot |
| No IP Assigned | ip is null/undefined | LOW | Check DHCP/static config |
| High Client Count | clients > threshold | INFO | Monitor for overload |

---

## Examples

**Example 1: Routine maintenance audit**
```
User: "Audit the network devices"

Process:
1. Run: bun run Tools/devices.ts --json
2. Parse JSON response into device list
3. For each device:
   - Check status (online/offline/pending/unknown)
   - Calculate uptime in human-readable format
   - Flag any audit criteria matches
4. Sort findings by severity (HIGH first)
5. Return: Prioritized audit report with recommended actions
```

**Example 2: Post-outage verification**
```
User: "Check all devices after the storm last night"

Process:
1. Run: bun run Tools/devices.ts --status offline
2. Run: bun run Tools/devices.ts --json (for uptime check)
3. Identify devices that:
   - Are still offline
   - Rebooted within last 12 hours
   - Have status 'pending' (may be recovering)
4. Return: Recovery status report with action items
```

**Example 3: Firmware review**
```
User: "Which devices need firmware updates?"

Process:
1. Run: bun run Tools/devices.ts --json
2. Extract firmware version from each device
3. Group by model and firmware version
4. Flag any devices running older firmware
5. Return: Firmware status by device with update recommendations
```

**Example 4: Switch-specific audit**
```
User: "Audit just the switches"

Process:
1. Run: bun run Tools/devices.ts --type switch --json
2. For each switch:
   - Run: bun run Tools/ports.ts <switch-id> --json
   - Check for port errors, high utilization
3. Return: Switch-specific audit with port health included
```

---

## Output Format

```
DEVICE AUDIT REPORT
═══════════════════════════════════════════════════
Generated: 2026-01-08 14:32:15
Devices Audited: 6

ISSUES FOUND: 3
───────────────────────────────────────────────────

[HIGH] USW-24-PoE (switch-abc123) - OFFLINE
  Last Status: offline
  Last Seen: 2 hours ago
  Action: Check power and network connectivity
          Verify PoE budget not exceeded

[MEDIUM] UAP-AC-Pro (ap-def456) - Recent Reboot
  Status: online
  Uptime: 47 minutes
  Action: Check controller logs for reboot reason
          Monitor for recurring reboots

[LOW] UDM-Pro (gateway-789) - Extended Uptime
  Status: online
  Uptime: 127 days
  Action: Schedule maintenance reboot during low-usage window

HEALTHY DEVICES
───────────────────────────────────────────────────
  ✓ USW-Lite-16-PoE (switch-111)   Online, 45d uptime
  ✓ USW-Flex-Mini (switch-222)     Online, 45d uptime
  ✓ UAP-FlexHD (ap-333)            Online, 45d uptime

SUMMARY
───────────────────────────────────────────────────
  Total Devices: 6
  Online: 5 (83%)
  Offline: 1 (17%)
  Issues: 3 (1 high, 1 medium, 1 low)

RECOMMENDED ACTIONS
───────────────────────────────────────────────────
  1. Investigate USW-24-PoE offline status (HIGH priority)
  2. Review UAP-AC-Pro reboot cause in controller logs
  3. Schedule UDM-Pro reboot for next maintenance window
```

---

## Error Handling

- **Single device unreachable** -> Continue audit, note device in report as "Unable to query"
- **Controller offline** -> Report error, suggest running health check first
- **Timeout on device details** -> Use cached/summary data, note incomplete audit
- **API rate limiting** -> Add delays between device queries, report partial results

---

## Notes

- Run this workflow weekly for proactive maintenance
- After firmware updates, run audit to verify all devices updated successfully
- Uptime thresholds are configurable based on environment stability needs
- For UniFi environments, extended uptime (>90 days) may indicate missed firmware updates
- Consider correlating recent reboots with power events or controller changes
- Document known issues to avoid repeated alerts (e.g., test device intentionally offline)
