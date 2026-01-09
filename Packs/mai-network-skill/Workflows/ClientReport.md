# ClientReport Workflow

**Purpose:** Generate a comprehensive report of connected network clients, organized by VLAN, device, or bandwidth usage to support network management and troubleshooting.

**Triggers:** client report, who's on my network, list network clients, show connected devices, network clients, client summary

---

## Steps

1. Retrieve VLAN definitions for context
```bash
bun run Tools/vlans.ts --json
```

2. Get all connected clients
```bash
bun run Tools/clients.ts --json
```

3. Optionally filter by VLAN
```bash
bun run Tools/clients.ts --vlan <vlan-id>
```

4. Optionally filter by device
```bash
bun run Tools/clients.ts --device <device-id>
```

5. Get specific client details by MAC
```bash
bun run Tools/clients.ts <mac-address>
```

6. Process and organize data:
   - Group by VLAN with VLAN names
   - Identify connection type (wired/wireless)
   - Calculate bandwidth usage
   - Sort by relevant criteria

---

## Examples

**Example 1: Full network client report**
```
User: "Who's on my network?"

Process:
1. Run: bun run Tools/vlans.ts --json (get VLAN names)
2. Run: bun run Tools/clients.ts --json (get all clients)
3. Group clients by VLAN ID
4. Map VLAN IDs to friendly names
5. Calculate totals: wired vs wireless, per-VLAN counts
6. Return: Organized client list by VLAN
```

**Example 2: IoT device inventory**
```
User: "Show me all IoT devices"

Process:
1. Run: bun run Tools/vlans.ts (identify IoT VLAN ID, typically 20 or similar)
2. Run: bun run Tools/clients.ts --vlan 20 --json
3. Sort by hostname or IP
4. Return: IoT VLAN client list with device details
```

**Example 3: Find unknown devices**
```
User: "Are there any unknown devices on the network?"

Process:
1. Run: bun run Tools/clients.ts --json
2. Filter for clients where hostname is null/empty AND name is null/empty
3. Check VLAN assignment (unknown on trusted VLANs = higher concern)
4. Return: List of unnamed clients with MAC, IP, VLAN, and connection point
```

**Example 4: Bandwidth hogs**
```
User: "What's using the most bandwidth?"

Process:
1. Run: bun run Tools/clients.ts --json
2. Sort by (rxBytes + txBytes) descending
3. Take top 10
4. Return: Top bandwidth consumers with totals
```

**Example 5: Clients on specific switch**
```
User: "Show clients connected to the office switch"

Process:
1. Run: bun run Tools/devices.ts (find switch device ID)
2. Run: bun run Tools/clients.ts --device <switch-id> --json
3. Include port information for each client
4. Return: Client list with port assignments
```

**Example 6: Investigate specific device**
```
User: "Tell me about the device at aa:bb:cc:dd:ee:ff"

Process:
1. Run: bun run Tools/clients.ts aa:bb:cc:dd:ee:ff
2. Return: Full client details including history, bandwidth, signal strength
```

---

## Output Format

```
CLIENT REPORT
═══════════════════════════════════════════════════
Generated: 2026-01-08 14:32:15

VLAN 1 - Default (15 clients)
───────────────────────────────────────────────────
IP               HOSTNAME            MAC                 CONNECTED VIA
192.168.1.100    laptop-joey         aa:bb:cc:dd:ee:ff   Switch-Office/5
192.168.1.101    iphone-joey         11:22:33:44:55:66   AP-Living (WiFi)
192.168.1.102    desktop-office      22:33:44:55:66:77   Switch-Office/1
192.168.1.103    macbook-christina   33:44:55:66:77:88   AP-Office (WiFi)
...

VLAN 10 - Management (5 clients)
───────────────────────────────────────────────────
IP               HOSTNAME            MAC                 CONNECTED VIA
192.168.10.1     udm-pro             44:55:66:77:88:99   -
192.168.10.2     switch-office       55:66:77:88:99:aa   Uplink
192.168.10.3     switch-barn         66:77:88:99:aa:bb   Uplink
...

VLAN 20 - IoT (23 clients)
───────────────────────────────────────────────────
IP               HOSTNAME            MAC                 CONNECTED VIA
192.168.20.10    thermostat          ff:ee:dd:cc:bb:aa   Switch-Office/8
192.168.20.11    doorbell            ab:cd:ef:01:23:45   AP-Front (WiFi)
192.168.20.12    smart-tv            bc:de:f0:12:34:56   Switch-Living/2
...

VLAN 30 - Guest (8 clients)
───────────────────────────────────────────────────
IP               HOSTNAME            MAC                 CONNECTED VIA
192.168.30.101   -                   cd:ef:01:23:45:67   AP-Living (WiFi)
192.168.30.102   android-guest       de:f0:12:34:56:78   AP-Living (WiFi)
...

TOP BANDWIDTH CONSUMERS (Last 24h)
───────────────────────────────────────────────────
  1. smart-tv           45.2 GB RX  /  2.1 GB TX
  2. laptop-joey        12.5 GB RX  /  3.2 GB TX
  3. desktop-office      8.7 GB RX  /  1.8 GB TX
  4. macbook-christina   5.2 GB RX  /  0.9 GB TX
  5. gaming-console      4.8 GB RX  /  0.6 GB TX

SUMMARY
───────────────────────────────────────────────────
  Total Clients: 51
  Wired: 18 (35%)
  Wireless: 33 (65%)
  Unknown/Unnamed: 3

  By VLAN:
    Default (1): 15
    Management (10): 5
    IoT (20): 23
    Guest (30): 8
```

---

## Error Handling

- **No clients found** -> Verify controller connectivity, check if clients are actually connected
- **VLAN not found** -> List available VLANs, suggest correct VLAN ID
- **Client MAC not found** -> May be disconnected, suggest checking historical data
- **Incomplete client data** -> Note which fields are missing, continue with available data
- **High client count** -> Paginate output or summarize by default, offer detailed view

---

## Notes

- Unknown/unnamed devices on trusted VLANs warrant investigation
- Guest VLAN clients are expected to be unnamed - this is normal
- Bandwidth statistics reset periodically (check controller settings)
- WiFi signal strength (dBm) available for wireless clients: -30 to -50 = excellent, -50 to -60 = good, -60 to -70 = fair, below -70 = poor
- For large networks, consider filtering by VLAN to reduce output
- MAC addresses can be used to identify device manufacturers (OUI lookup)
- Consider setting up device aliases in the controller for easier identification
