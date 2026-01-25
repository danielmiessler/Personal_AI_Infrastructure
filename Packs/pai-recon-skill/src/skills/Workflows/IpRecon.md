# IP Address Reconnaissance Workflow

**Comprehensive investigation of individual IP addresses**

## Purpose

Perform detailed reconnaissance on a specific IP address to gather:
- Geolocation and hosting information
- Network ownership and ASN details
- Reverse DNS and hostnames
- Open ports and running services (with authorization)
- Associated domains and certificates
- Historical data and reputation

## When to Use

- Investigating suspicious IP addresses
- Mapping infrastructure for known IPs
- Pentest reconnaissance on target IPs
- Threat intelligence on malicious IPs
- Network asset inventory
- Called by domain-recon for discovered IPs
- Called by OSINT for entity infrastructure mapping

## Input

**Single IP address in IPv4 or IPv6 format:**
- IPv4: `1.2.3.4`
- IPv6: `2001:0db8:85a3:0000:0000:8a2e:0370:7334`

## Authorization Levels

### Passive Mode (Default - No Authorization Required)
- IPInfo API lookup
- Reverse DNS
- WHOIS netblock information
- Certificate transparency search
- Public database queries
- No packets sent to target

### Active Mode (Requires Authorization)
- Port scanning
- Service detection
- Banner grabbing
- Technology fingerprinting
- SSL/TLS probing

**Always start with passive. Only proceed to active with explicit authorization.**

## Workflow Steps

### Phase 1: Validation

**Step 1.1: Validate IP Address**
```typescript
function isValidIP(ip: string): boolean {
  // IPv4 regex
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 regex
  const ipv6 = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/;

  if (ipv4.test(ip)) {
    // Validate octets are 0-255
    return ip.split('.').every(octet => parseInt(octet) <= 255);
  }

  return ipv6.test(ip);
}
```

**Step 1.2: Check for Special IP Ranges**
```typescript
function isSpecialIP(ip: string): string | null {
  const first = parseInt(ip.split('.')[0]);

  if (ip.startsWith('127.')) return 'Loopback';
  if (ip.startsWith('10.')) return 'Private (RFC1918)';
  if (ip.startsWith('172.') && first >= 16 && first <= 31) return 'Private (RFC1918)';
  if (ip.startsWith('192.168.')) return 'Private (RFC1918)';
  if (ip.startsWith('169.254.')) return 'Link-local';
  if (first >= 224 && first <= 239) return 'Multicast';

  return null; // Public IP
}
```

### Phase 2: Passive Intelligence Gathering

**Step 2.1: IPInfo API Lookup**

```bash
curl "https://ipinfo.io/1.2.3.4/json?token=$IPINFO_API_KEY" | jq
```

**Response includes:**
```json
{
  "ip": "1.2.3.4",
  "hostname": "server.example.com",
  "city": "San Francisco",
  "region": "California",
  "country": "US",
  "loc": "37.7749,-122.4194",
  "postal": "94102",
  "timezone": "America/Los_Angeles",
  "asn": {
    "asn": "AS12345",
    "name": "Example Hosting Inc",
    "domain": "examplehosting.com",
    "route": "1.2.3.0/24",
    "type": "hosting"
  },
  "company": {
    "name": "Example Hosting Inc",
    "domain": "examplehosting.com",
    "type": "hosting"
  },
  "privacy": {
    "vpn": false,
    "proxy": false,
    "tor": false,
    "relay": false,
    "hosting": true
  },
  "abuse": {
    "address": "123 Hosting St, San Francisco, CA",
    "country": "US",
    "email": "abuse@examplehosting.com",
    "name": "Example Hosting Abuse",
    "network": "1.2.3.0/24",
    "phone": "+1-415-555-0100"
  }
}
```

**Extract and save:**
- Geographic location
- ASN and organization
- Hosting provider type
- Privacy/proxy indicators
- Abuse contact
- Network range

**Step 2.2: Reverse DNS Lookup**

```bash
# Standard reverse DNS
dig -x 1.2.3.4 +short

# Detailed query
dig -x 1.2.3.4

# Multiple resolvers for verification
dig @8.8.8.8 -x 1.2.3.4 +short
dig @1.1.1.1 -x 1.2.3.4 +short
```

**Extract:**
- PTR records (hostnames)
- Compare with IPInfo hostname
- Note discrepancies (could indicate misconfiguration)

**Step 2.3: WHOIS Netblock Information**

```bash
whois 1.2.3.4
```

**Extract:**
- CIDR netblock (e.g., 1.2.3.0/24)
- NetRange
- Organization name
- Registration date
- Abuse email
- Technical contact
- RIR (ARIN, RIPE, APNIC, etc.)

**Step 2.4: Certificate Transparency Search**

```bash
# Search for certificates with this IP
curl -s "https://crt.sh/?q=1.2.3.4&output=json" | jq

# Extract domains from certificates
curl -s "https://crt.sh/?q=1.2.3.4&output=json" | \
  jq -r '.[].name_value' | \
  sort -u
```

**Discovers:**
- Domains hosted on this IP
- Hostnames associated
- Certificate issuers
- Validity periods

**Step 2.5: DNS Forward Lookups**

```bash
# If reverse DNS found hostname, verify forward
hostname=$(dig -x 1.2.3.4 +short)
dig $hostname A
dig $hostname AAAA

# Check if it resolves back to our IP
```

**Validates:**
- Forward-reverse DNS match
- Additional IPs for same hostname
- IPv6 presence

**Step 2.6: Related IP Discovery**

```typescript
// Check IPs in same /24 subnet
const subnet = ip.split('.').slice(0, 3).join('.');
const relatedIPs = [];

// Sample common offsets
const offsets = [1, 2, 10, 50, 100, 254];
for (const offset of offsets) {
  const testIP = `${subnet}.${offset}`;
  const info = await ipinfoLookup(testIP);
  if (info.org === originalIPInfo.org) {
    relatedIPs.push(testIP);
  }
}
```

### Phase 3: Active Reconnaissance (Authorization Required)

**AUTHORIZATION CHECK:**
```typescript
function checkAuthorization(): boolean {
  console.log("ACTIVE RECONNAISSANCE REQUIRES AUTHORIZATION");
  console.log("Do you have authorization to scan this IP? (pentest engagement, bug bounty, owned asset)");

  const authorized = await askUserConfirmation();

  if (authorized) {
    console.log("Documenting authorization for audit trail");
    logAuthorizationEvent({
      target: ip,
      timestamp: new Date(),
      authType: "user-confirmed",
      techniques: ["port-scan", "service-detection"]
    });
  }

  return authorized;
}
```

**Step 3.1: Port Scanning (naabu)**

**Requires:** Security MCP profile

```bash
# Quick common ports scan
naabu -host 1.2.3.4 -top-ports 100

# Full TCP scan (all 65535 ports)
naabu -host 1.2.3.4 -p -

# Specific ports
naabu -host 1.2.3.4 -p 80,443,22,21,25,3306,5432

# With version detection
naabu -host 1.2.3.4 -top-ports 1000 -version
```

**Output:**
```
1.2.3.4:22 [ssh]
1.2.3.4:80 [http]
1.2.3.4:443 [https]
```

**Step 3.2: Service Detection (httpx)**

**Requires:** Security MCP profile

```bash
# HTTP/HTTPS service detection
echo "1.2.3.4" | httpx

# With technology detection
echo "1.2.3.4" | httpx -tech-detect

# With response headers and status
echo "1.2.3.4" | httpx -status-code -title -tech-detect -server

# Full probe
echo "1.2.3.4" | httpx -status-code -title -tech-detect -server -cdn -method
```

**Output:**
```
https://1.2.3.4:443 [200] [nginx/1.20.1] [Example Site] [Cloudflare]
http://1.2.3.4:80 [301] [nginx/1.20.1] [Redirect]
```

**Step 3.3: Banner Grabbing**

```bash
# SSH banner
nc -v 1.2.3.4 22

# HTTP banner
curl -I http://1.2.3.4

# HTTPS banner and certificate
curl -vI https://1.2.3.4 2>&1 | grep -E "Server:|X-|CN="

# Or using openssl for cert details
echo | openssl s_client -connect 1.2.3.4:443 2>/dev/null | \
  openssl x509 -noout -text
```

**Step 3.4: SSL/TLS Analysis**

```bash
# Certificate details
echo | openssl s_client -connect 1.2.3.4:443 -servername example.com 2>/dev/null | \
  openssl x509 -noout -dates -subject -issuer

# TLS version support
nmap --script ssl-enum-ciphers -p 443 1.2.3.4
```

**Extract:**
- TLS versions supported
- Cipher suites
- Certificate details
- Security vulnerabilities (weak ciphers, expired certs)

**Step 3.5: Technology Fingerprinting**

```bash
# Comprehensive tech stack detection
whatweb http://1.2.3.4
whatweb https://1.2.3.4

# Or using httpx
echo "1.2.3.4" | httpx -tech-detect -cdn -method
```

**Identifies:**
- Web server (nginx, Apache, IIS)
- Application framework (PHP, Node.js, Python)
- CMS (WordPress, Drupal, Joomla)
- CDN usage
- Analytics platforms
- JavaScript libraries

## Integration Examples

### Called by domain-recon

```typescript
// domain-recon discovers IPs
const ips = await getDomainIPs("example.com");

// For each IP, call ip-recon
for (const ip of ips) {
  const ipReport = await ipRecon(ip, { passive: true });
  domainReport.infrastructure.push(ipReport);
}
```

### Called by OSINT

```typescript
// OSINT finds company infrastructure
const company = await osintInvestigate("Acme Corp");

// Recon all discovered IPs
for (const ip of company.ipAddresses) {
  const ipReport = await ipRecon(ip);
  company.technicalIntel.push(ipReport);
}
```

### Calling webassessment

```typescript
// After ip-recon finds web services
if (ipReport.ports.includes(80) || ipReport.ports.includes(443)) {
  const webApps = ipReport.domains;

  if (authorized) {
    await webAssessment(webApps);
  }
}
```

## Success Criteria

### Passive Recon Complete
- IPInfo data retrieved
- Reverse DNS checked
- WHOIS netblock info gathered
- Certificate search performed
- Related IPs identified
- Report generated

### Active Recon Complete (if authorized)
- Authorization documented
- Port scan completed
- Service detection performed
- Technology fingerprinting done
- SSL/TLS analyzed
- Security assessment included
- No DoS or destructive techniques used

---

**Key Principle:** Always start passive. Only go active with explicit authorization and documentation.
