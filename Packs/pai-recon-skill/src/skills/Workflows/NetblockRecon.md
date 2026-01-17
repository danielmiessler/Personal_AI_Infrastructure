# Netblock Reconnaissance Workflow

**CIDR range and IP block investigation**

## Purpose

Perform reconnaissance on network blocks (CIDR ranges) to:
- Identify netblock ownership and allocation
- Discover live hosts in range
- Map infrastructure within network blocks
- Enumerate services across ranges
- Assess network segmentation
- Identify patterns and interesting hosts

## When to Use

- Pentesting entire network ranges
- Mapping organization's IP allocations
- Threat intelligence on attacker infrastructure
- Network asset inventory
- ISP/hosting provider investigation
- Called by domain-recon or ip-recon for related networks

## Input

**CIDR notation:**
- `/24` network: `192.168.1.0/24` (256 IPs)
- `/16` network: `10.0.0.0/16` (65,536 IPs)
- `/8` network: `10.0.0.0/8` (16,777,216 IPs)

**IP ranges:**
- Start-End: `192.168.1.1-192.168.1.254`
- Wildcard: `192.168.1.*`

## CRITICAL WARNING

**AUTHORIZATION ABSOLUTELY REQUIRED FOR ACTIVE SCANNING**

Scanning network ranges you don't own is:
- **Illegal** in most jurisdictions
- **Detectable** by IDS/IPS systems
- **Aggressive** and can cause service impact
- **Potentially criminal** (Computer Fraud and Abuse Act in US)

**NEVER perform active netblock scanning without:**
1. Explicit written authorization (pentest SOW)
2. Confirmed scope (target ranges in writing)
3. Coordination with target (contact info, scan window)
4. Rate limiting (respectful scanning)

**Passive reconnaissance OK. Active = MUST HAVE AUTHORIZATION.**

## Workflow Modes

### Passive Mode (Default - Safe)
- WHOIS netblock lookup
- Sample IP investigation (a few IPs only)
- ASN mapping
- Public database queries
- No mass scanning

### Active Mode (Requires Authorization)
- Live host discovery
- Port scanning across range
- Service detection
- Network mapping

## Workflow Steps

### Phase 1: CIDR Validation and Parsing

**Step 1.1: Validate CIDR Notation**

```typescript
interface CIDRInfo {
  cidr: string;
  network: string;
  mask: number;
  firstIP: string;
  lastIP: string;
  totalIPs: number;
  usableIPs: number;
}

function parseCIDR(cidr: string): CIDRInfo {
  const [network, maskStr] = cidr.split('/');
  const mask = parseInt(maskStr);

  if (mask < 0 || mask > 32) {
    throw new Error('Invalid mask: must be 0-32');
  }

  // Calculate total IPs
  const totalIPs = Math.pow(2, 32 - mask);
  const usableIPs = totalIPs - 2; // Exclude network and broadcast

  // Calculate first and last IP
  const ipInt = ipToInt(network);
  const maskInt = ((0xFFFFFFFF << (32 - mask)) >>> 0);
  const networkInt = ipInt & maskInt;
  const broadcastInt = networkInt | (~maskInt >>> 0);

  return {
    cidr,
    network: intToIP(networkInt),
    mask,
    firstIP: intToIP(networkInt + 1),
    lastIP: intToIP(broadcastInt - 1),
    totalIPs,
    usableIPs
  };
}
```

**Step 1.2: Assess Scan Size**

```typescript
function assessScanSize(cidrInfo: CIDRInfo): {
  category: string;
  recommendation: string;
  estimatedTime: string;
} {
  const { mask, totalIPs } = cidrInfo;

  if (mask >= 24) {
    // /24 to /32 (1-256 IPs)
    return {
      category: 'Small',
      recommendation: 'Safe to scan with proper authorization',
      estimatedTime: '< 5 minutes'
    };
  } else if (mask >= 20) {
    // /20 to /23 (257-4096 IPs)
    return {
      category: 'Medium',
      recommendation: 'Scan in batches, use rate limiting',
      estimatedTime: '5-30 minutes'
    };
  } else if (mask >= 16) {
    // /16 to /19 (4097-65536 IPs)
    return {
      category: 'Large',
      recommendation: 'Sample scan only, or use distributed scanning',
      estimatedTime: '1-4 hours'
    };
  } else {
    // /8 to /15 (65537+ IPs)
    return {
      category: 'Extremely Large',
      recommendation: 'DO NOT scan entire range. Sample only.',
      estimatedTime: '> 24 hours'
    };
  }
}
```

### Phase 2: Passive Netblock Intelligence

**Step 2.1: WHOIS Netblock Lookup**

```bash
# WHOIS for CIDR
whois -h whois.arin.net "n 192.168.1.0/24"

# Alternative RIRs based on range
# ARIN (North America): whois.arin.net
# RIPE (Europe): whois.ripe.net
# APNIC (Asia-Pacific): whois.apnic.net
# LACNIC (Latin America): whois.lacnic.net
# AFRINIC (Africa): whois.afrinic.net
```

**Extract:**
- NetRange (start - end IPs)
- CIDR blocks
- Organization name
- Registration date
- Allocation status
- Abuse contact
- Technical contact
- Parent/child allocations

**Step 2.2: ASN Mapping**

```bash
# Get ASN for first IP in range
whois -h whois.cymru.com " -v 192.168.1.1"

# Output format:
# AS | IP | BGP Prefix | CC | Registry | Allocated | AS Name
```

**Step 2.3: Sample IP Investigation**

```typescript
// For large ranges, sample a few representative IPs
function getSampleIPs(cidrInfo: CIDRInfo): string[] {
  const samples = [];

  // Always include network boundaries
  samples.push(cidrInfo.firstIP);
  samples.push(cidrInfo.lastIP);

  // Add middle IP
  const midInt = Math.floor((ipToInt(cidrInfo.firstIP) + ipToInt(cidrInfo.lastIP)) / 2);
  samples.push(intToIP(midInt));

  // Add common offsets
  const firstOctet = cidrInfo.network.split('.').slice(0, 3).join('.');
  samples.push(`${firstOctet}.1`); // Common gateway
  samples.push(`${firstOctet}.10`); // Common server
  samples.push(`${firstOctet}.100`); // Common server
  samples.push(`${firstOctet}.254`); // Common gateway

  return [...new Set(samples)]; // Remove duplicates
}

// Investigate each sample
for (const sampleIP of getSampleIPs(cidrInfo)) {
  const ipInfo = await ipRecon(sampleIP, { passive: true });
  console.log(`Sample IP ${sampleIP}:`, ipInfo.summary);
}
```

### Phase 3: Active Reconnaissance (Authorization Required)

**AUTHORIZATION CHECK:**

```typescript
async function checkNetblockAuthorization(cidr: string): Promise<boolean> {
  console.log("NETWORK BLOCK SCANNING AUTHORIZATION REQUIRED");
  console.log(`Target: ${cidr}`);
  console.log(`This is ACTIVE scanning that will generate significant network traffic.`);
  console.log("");
  console.log("You MUST have:");
  console.log("1. Written authorization (pentest SOW)");
  console.log("2. Confirmed scope (target in writing)");
  console.log("3. Contact information for coordination");
  console.log("4. Scan window approval");

  const response = await askUser("Do you have proper authorization? (yes/no)");

  if (response.toLowerCase() !== 'yes') {
    console.log("Authorization not confirmed. Stopping.");
    return false;
  }

  return true;
}
```

**Step 3.1: Live Host Discovery**

```bash
# For Small Ranges (/24 to /28)
nmap -sn 192.168.1.0/24

# Or using naabu
naabu -host 192.168.1.0/24 -ping
```

**Step 3.2: Port Scanning Live Hosts**

```bash
# Scan only common ports on discovered hosts
while read host; do
  echo "Scanning $host..."
  naabu -host $host -top-ports 100 --rate 100
  sleep 2
done < live_hosts.txt
```

**Step 3.3: Service Detection**

```bash
# HTTP/HTTPS probing
cat live_hosts.txt | httpx -silent -status-code -title

# Or specific ports
for host in $(cat live_hosts.txt); do
  curl -s -I http://$host --max-time 2
  curl -s -I https://$host --max-time 2 -k
done
```

## Rate Limiting and Respectful Scanning

```typescript
// Implement rate limiting to avoid DoS
async function scanWithRateLimit(
  ips: string[],
  scanFunc: (ip: string) => Promise<any>,
  rateLimit: number = 10 // requests per second
): Promise<any[]> {
  const results = [];
  const delayMs = 1000 / rateLimit;

  for (const ip of ips) {
    const result = await scanFunc(ip);
    results.push(result);

    // Rate limit
    await sleep(delayMs);

    // Progress indication
    if (results.length % 10 === 0) {
      console.log(`Progress: ${results.length}/${ips.length}`);
    }
  }

  return results;
}
```

## Integration Examples

### Called by ip-recon

```typescript
// IP recon discovers this IP is in a netblock
const ipInfo = await ipRecon("192.168.1.50");

// Get the netblock
const netblock = ipInfo.cidr; // "192.168.1.0/24"

// Call netblock recon on the entire range
const netblockReport = await netblockRecon(netblock, { passive: true });
```

### Called by domain-recon

```typescript
// Domain recon discovers multiple IPs in same netblock
const domainIPs = await getDomainIPs("example.com");

// Extract common netblocks
const netblocks = findCommonNetblocks(domainIPs);

// Recon each netblock
for (const netblock of netblocks) {
  await netblockRecon(netblock);
}
```

## Success Criteria

### Passive Recon Complete
- CIDR parsed and validated
- WHOIS netblock info retrieved
- ASN identified
- Sample IPs investigated
- BGP prefixes identified
- Report generated

### Active Recon Complete (if authorized)
- Authorization documented
- Live hosts discovered
- Port scans completed
- Services detected
- Patterns identified
- Rate limiting applied (no DoS)
- Coordination maintained (if required)

---

**Critical Reminder:** Never scan networks you don't own. Always get written authorization. Respect rate limits. Coordinate with network owners.
