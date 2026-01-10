# Domain Reconnaissance Workflow

Comprehensive domain investigation including DNS, WHOIS, SSL, and subdomain enumeration.

## Trigger Phrases
- "domain info"
- "investigate domain"
- "whois lookup"
- "dns records"
- "find subdomains"
- "domain reconnaissance"

## Input
- `domain`: The domain to investigate (e.g., example.com)

## Process

### Step 1: WHOIS Lookup
```
Query WHOIS for:
- Registrar
- Registration date
- Expiration date
- Registrant (if not privacy protected)
- Name servers
- Domain status
```

### Step 2: DNS Enumeration
```
Query DNS records:
- A records (IPv4)
- AAAA records (IPv6)
- MX records (mail servers)
- TXT records (SPF, DKIM, DMARC)
- NS records (name servers)
- CNAME records
- SOA record
```

### Step 3: Subdomain Discovery
Methods:
1. **Certificate Transparency (crt.sh)**
   - Query CT logs for issued certificates
   - Extract subdomain names from certificates

2. **DNS Brute Force** (if authorized)
   - Common subdomain wordlist
   - Industry-specific terms

3. **Historical Records**
   - SecurityTrails, ViewDNS history
   - Wayback Machine for past subdomains

### Step 4: SSL Certificate Analysis
```
For main domain and discovered subdomains:
- Certificate issuer
- Validity period
- Subject Alternative Names (SANs)
- Certificate chain
```

### Step 5: Infrastructure Analysis
```
- Reverse IP lookup (other domains on same IP)
- ASN identification
- Hosting provider
- CDN detection (Cloudflare, Akamai, etc.)
- Technology stack detection
```

### Step 6: Historical Analysis
```
- Domain history (ownership changes)
- DNS changes over time
- Previous IP addresses
- Archive.org snapshots
```

### Step 7: Store to Knowledge Graph

Use the **knowledge** skill to persist the findings:

```
Store the following as structured episodes:

1. Domain Entity:
   - Name: "Domain: {domain}"
   - Data: Registrar, registration date, expiration, status, name servers
   - Group: "osint-domains"

2. DNS Records:
   - Name: "DNS: {domain}"
   - Data: A, AAAA, MX, TXT, NS, CNAME records
   - Temporal metadata for change tracking

3. Subdomains:
   - Name: "Subdomains: {domain}"
   - Data: List of discovered subdomains with IPs and status
   - Relationships: subdomain_of parent domain

4. Infrastructure:
   - Name: "Infra: {domain}"
   - Data: IP, ASN, hosting provider, CDN, technology stack
   - Relationships: hosted_on, uses_cdn

5. SSL Certificate:
   - Name: "SSL: {domain}"
   - Data: Issuer, validity period, SANs
   - Expiration tracking
```

## Output Format

```
📋 DOMAIN RECONNAISSANCE REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 DOMAIN: example.com
📅 SCAN DATE: 2026-01-09

📋 WHOIS INFORMATION:
• Registrar: GoDaddy
• Created: 2010-05-15
• Expires: 2026-05-15
• Registrant: REDACTED FOR PRIVACY
• Name Servers: ns1.example.com, ns2.example.com

📡 DNS RECORDS:
• A: 93.184.216.34
• AAAA: 2606:2800:220:1:248:1893:25c8:1946
• MX: mail.example.com (priority: 10)
• TXT: "v=spf1 include:_spf.google.com ~all"
• NS: ns1.example.com, ns2.example.com

🌐 SUBDOMAINS FOUND: 12
• www.example.com → 93.184.216.34
• mail.example.com → 93.184.216.35
• api.example.com → 93.184.216.36
• dev.example.com → 93.184.216.37
• staging.example.com → [Not resolving]
[...]

🔒 SSL CERTIFICATE:
• Issuer: Let's Encrypt
• Valid: 2025-12-01 to 2026-02-28
• SANs: example.com, www.example.com, api.example.com

🏗️ INFRASTRUCTURE:
• IP: 93.184.216.34
• ASN: AS15133 (Edgecast)
• Location: Los Angeles, US
• Hosting: Verizon Digital Media Services
• CDN: Detected (Edgecast)

📜 HISTORY:
• Previous IPs: 93.184.216.119 (2015-2020)
• Ownership changes: 1 (2015)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Stored to Knowledge Graph: Yes
🔗 Entity ID: dom_example_com
```

## Tools & APIs Used
- WHOIS APIs (whois, whoisxml)
- DNS tools (dig, nslookup)
- crt.sh for CT logs
- SecurityTrails for history
- Shodan for infrastructure

## Ethical Notes
- WHOIS queries are public and legal
- Subdomain brute-forcing should be rate-limited
- Do not attempt zone transfers without authorization
- Respect robots.txt for web crawling
