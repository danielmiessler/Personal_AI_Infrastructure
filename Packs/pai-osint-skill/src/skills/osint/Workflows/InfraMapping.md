# Infrastructure Mapping Workflow

Map network infrastructure including ports, services, and hosting details.

## Trigger Phrases
- "map infrastructure"
- "scan ports"
- "shodan lookup"
- "find services"
- "infrastructure recon"

## Input
- `target`: IP address, IP range (CIDR), or domain

## Process

### Step 1: Resolve Target
```
If domain provided:
- Resolve to IP addresses
- Note all A/AAAA records

If IP range:
- Enumerate all IPs in range
- Note: Only scan authorized targets
```

### Step 2: Port Discovery
```
Common ports to check:
- 21 (FTP)
- 22 (SSH)
- 23 (Telnet)
- 25 (SMTP)
- 53 (DNS)
- 80 (HTTP)
- 443 (HTTPS)
- 3306 (MySQL)
- 5432 (PostgreSQL)
- 6379 (Redis)
- 8080 (HTTP Alt)
- 27017 (MongoDB)
```

### Step 3: Service Fingerprinting
```
For each open port:
- Service name
- Version (if detectable)
- Banner information
- SSL/TLS version (if applicable)
```

### Step 4: Shodan/Censys Query (if API available)
```
Query for:
- Historical port scans
- Known vulnerabilities
- SSL certificate info
- Organization info
- Related hosts
```

### Step 5: ASN and Network Analysis
```
Identify:
- ASN (Autonomous System Number)
- Organization owner
- IP block allocation
- Geographic location
- Hosting provider
```

### Step 6: Technology Detection
```
Detect:
- Web server (Apache, Nginx, IIS)
- CMS (WordPress, Drupal)
- Frameworks (React, Angular)
- CDN (Cloudflare, Akamai)
- WAF presence
```

### Step 7: Store to Knowledge Graph

Use the **knowledge** skill to persist the infrastructure data:

```
Store the following as structured episodes:

1. Infrastructure Entity:
   - Name: "Infra: {IP or domain}"
   - Data: IP address, ASN, organization, location, IP range
   - Group: "osint-infrastructure"

2. Open Ports:
   - Name: "Ports: {IP}"
   - Data: Port number, service, version, banner info
   - Security notes for each service

3. Technology Stack:
   - Name: "Tech: {IP or domain}"
   - Data: Web server, CMS, frameworks, CDN, WAF
   - Relationships: runs_on, protected_by

4. Network Context:
   - Name: "Network: {ASN}"
   - Data: ASN owner, related hosts, IP block allocation
   - Relationships: part_of ASN, same_network_as

5. Historical Data:
   - Name: "History: {IP}"
   - Data: First seen, port changes, known CVEs
   - Temporal metadata
```

## Output Format

```
📋 INFRASTRUCTURE MAPPING REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 TARGET: 93.184.216.34 (example.com)
📅 SCAN DATE: 2026-01-09

🌐 NETWORK INFO:
• ASN: AS15133 (Edgecast Inc)
• Organization: Verizon Digital Media Services
• Location: Los Angeles, CA, US
• IP Range: 93.184.216.0/24

📡 OPEN PORTS:
┌──────┬──────────┬─────────────────────────┐
│ Port │ Service  │ Details                 │
├──────┼──────────┼─────────────────────────┤
│ 80   │ HTTP     │ ECS (dcb/7F84)         │
│ 443  │ HTTPS    │ TLS 1.3, Let's Encrypt │
└──────┴──────────┴─────────────────────────┘

🔒 SSL/TLS:
• Protocol: TLS 1.3
• Certificate: Let's Encrypt
• Expires: 2026-02-28
• Grade: A

🏗️ TECHNOLOGY STACK:
• Web Server: ECS (Edgecast)
• CDN: Yes (Edgecast)
• WAF: Not detected
• CMS: Not detected

📜 HISTORICAL DATA:
• First seen: 2010-05-15
• Port changes: None in 90 days
• Known CVEs: None current

🔗 RELATED HOSTS:
• Same ASN: 1,234 hosts
• Same /24: 12 hosts

⚠️ SECURITY NOTES:
• All services appear properly configured
• No known vulnerabilities detected
• Standard web hosting configuration

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Stored to Knowledge Graph: Yes
🔗 Entity ID: infra_93.184.216.34
```

## Tools & APIs
- Shodan API (if key available)
- Censys API (if key available)
- BGP/ASN lookup (bgp.he.net)
- Builtwith/Wappalyzer for tech detection

## Ethical Notes
**IMPORTANT:**
- Only scan targets you're authorized to scan
- Active port scanning may be detected
- Use passive sources (Shodan, Censys) when possible
- Respect rate limits
- Do not exploit discovered vulnerabilities
