# PortUtilization Workflow

**Purpose:** Display port utilization, link status, speed negotiation, and PoE power consumption for network switches to support capacity planning and troubleshooting.

**Triggers:** port utilization, switch ports, show ports, PoE status, port status, switch capacity, port report

---

## Steps

1. List all switch devices
```bash
bun run Tools/devices.ts --type switch
```

2. Get port details for a specific switch
```bash
bun run Tools/ports.ts <device-id>
```

3. Filter to active ports only
```bash
bun run Tools/ports.ts <device-id> --link up
```

4. Get specific port details
```bash
bun run Tools/ports.ts <device-id> --port <port-number>
```

5. Aggregate and analyze:
   - Port utilization percentage
   - PoE power budget and consumption
   - Speed negotiation issues
   - Error rates

---

## Examples

**Example 1: Full switch port overview**
```
User: "Show me port status on the office switch"

Process:
1. Run: bun run Tools/devices.ts --type switch (identify switch ID)
2. Run: bun run Tools/ports.ts <office-switch-id>
3. Calculate utilization: (ports with link up) / (total ports)
4. Sum PoE consumption vs budget
5. Return: Port table with utilization summary
```

**Example 2: PoE power audit**
```
User: "How much PoE power am I using?"

Process:
1. Run: bun run Tools/devices.ts --type switch --json
2. For each PoE-capable switch:
   - Run: bun run Tools/ports.ts <switch-id> --json
   - Sum port.poe.power for all ports where poe.enabled = true
3. Compare to switch PoE budget (from device specs)
4. Return: PoE consumption report by switch with headroom
```

**Example 3: Find available ports**
```
User: "Which ports are available on the barn switch?"

Process:
1. Run: bun run Tools/devices.ts --type switch (find barn switch ID)
2. Run: bun run Tools/ports.ts <barn-switch-id> --link down --json
3. Filter for ports that are enabled but not linked
4. Return: List of available ports with their configuration
```

**Example 4: Troubleshoot slow connection**
```
User: "Port 5 on the office switch seems slow"

Process:
1. Run: bun run Tools/ports.ts <office-switch-id> --port 5
2. Check: speed negotiation (expecting 1G, got 100M?)
3. Check: duplex (should be full)
4. Check: error counters (errors > 0 indicates cable/hardware issue)
5. Check: RX/TX stats for activity
6. Return: Port diagnostic with recommendations
```

**Example 5: VLAN assignment review**
```
User: "What VLANs are assigned to ports on the living room switch?"

Process:
1. Run: bun run Tools/ports.ts <living-switch-id> --json
2. Group ports by VLAN assignment
3. Identify trunk ports (multiple VLANs)
4. Return: Port-to-VLAN mapping table
```

**Example 6: Capacity planning**
```
User: "Do I have room for more devices?"

Process:
1. Run: bun run Tools/devices.ts --type switch --json
2. For each switch:
   - Run: bun run Tools/ports.ts <switch-id> --json
   - Count: total ports, ports in use (link up), available
   - Calculate: PoE headroom
3. Return: Capacity report with recommendations
```

---

## Output Format

```
PORT UTILIZATION REPORT
═══════════════════════════════════════════════════
Switch: USW-24-PoE (switch-office)
Generated: 2026-01-08 14:32:15

PORT STATUS
───────────────────────────────────────────────────
PORT  NAME           LINK   SPEED   POE     VLAN   TRAFFIC
1     desktop-main   ▲ Up   1G      -       1      45.2 GB / 12.1 GB
2     voip-phone     ▲ Up   100M    4.2W    10     1.2 GB / 0.8 GB
3     printer        ▲ Up   1G      -       1      0.5 GB / 0.1 GB
4     (unused)       ▽ Down -       -       1      -
5     ap-office      ▲ Up   1G      12.5W   1      125.4 GB / 89.2 GB
6     camera-front   ▲ Up   100M    8.1W    20     45.8 GB / 2.1 GB
7     camera-back    ▲ Up   100M    7.9W    20     42.1 GB / 1.9 GB
8     thermostat     ▲ Up   100M    0.8W    20     0.1 GB / 0.05 GB
...
24    (unused)       ▽ Down -       -       1      -

SFP+
───────────────────────────────────────────────────
25    uplink-udm     ▲ Up   10G     -       T      512.4 GB / 489.1 GB
26    (unused)       ▽ Down -       -       -      -

UTILIZATION SUMMARY
───────────────────────────────────────────────────
  Ports Used:    18 / 24 (75%)
  Ports Available: 6

  SFP+ Used:     1 / 2 (50%)
  SFP+ Available: 1

POE SUMMARY
───────────────────────────────────────────────────
  Budget:        95W
  In Use:        33.5W (35%)
  Available:     61.5W

  Active PoE Ports: 5
    - Access Point:  12.5W
    - Cameras (2):   16.0W
    - VoIP Phone:     4.2W
    - Thermostat:     0.8W

ALERTS
───────────────────────────────────────────────────
  [INFO] Port 2 negotiated at 100M - verify cable if 1G expected
  [WARN] Port 6 has 127 errors - check cable or device

SPEED DISTRIBUTION
───────────────────────────────────────────────────
  10G:   1 port  (SFP+ uplink)
  1G:   12 ports
  100M:  5 ports
```

---

## Error Handling

- **Device not found** -> List available switches, suggest correct device ID
- **No ports returned** -> Verify device is a switch (not AP or gateway)
- **Port number out of range** -> Report valid port range for device
- **PoE data unavailable** -> Note switch may not support PoE, continue with other metrics
- **Stats unavailable** -> Device may not support detailed statistics, show available data

---

## Notes

- Speed negotiation below expected (e.g., 100M instead of 1G) often indicates cable issues
- PoE power fluctuates - values shown are current draw, not maximum
- PoE budgets vary by switch model - check manufacturer specs
- Trunk ports show "T" in VLAN column
- Error counts > 0 warrant investigation - could be cable, port, or device issue
- For capacity planning, reserve ~20% PoE headroom for power spikes
- Port naming in controller helps identify connections quickly
- Consider documenting port assignments in Joplin for reference
- Traffic statistics may reset on device reboot or controller update
