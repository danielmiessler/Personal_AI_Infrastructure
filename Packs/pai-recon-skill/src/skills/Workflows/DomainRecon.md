# Domain Reconnaissance Workflow

**Comprehensive domain infrastructure mapping and enumeration**

## Purpose

Perform full reconnaissance on a domain to discover:
- Domain registration and ownership details
- DNS configuration and records
- Subdomains and related assets
- Mail infrastructure and email security
- IP addresses and hosting providers
- Technology stack and web applications
- Certificate details and history
- Attack surface mapping

## When to Use

- Investigating target domains for pentesting
- Mapping organization's internet-facing infrastructure
- Bug bounty reconnaissance
- Attack surface assessment
- Called by OSINT for entity infrastructure mapping
- Threat intelligence on malicious domains
- Domain acquisition due diligence

## Input

**Domain name (FQDN):**
- Root domain: `example.com`
- Subdomain: `api.example.com`
- Internationalized domain: `example.de`

## Workflow Modes

### Passive Mode (Default)
- WHOIS lookup
- DNS enumeration
- Certificate transparency
- Public database searches
- No direct probing of subdomains

### Active Mode (Requires Authorization)
- Subdomain brute forcing
- HTTP/HTTPS probing
- Technology detection
- Vulnerability scanning
- Service fingerprinting

## Workflow Steps

### Phase 1: Domain Validation & WHOIS

**Step 1.1: Validate Domain Name**
```typescript
function isValidDomain(domain: string): boolean {
  const regex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
  return regex.test(domain);
}
```

**Step 1.2: WHOIS Lookup**
```bash
whois example.com
```

**Extract:**
- **Registrar:** Company that registered the domain
- **Registration Date:** When domain was first registered
- **Expiration Date:** When domain registration expires
- **Updated Date:** Last modification
- **Status:** Domain status flags (clientTransferProhibited, etc.)
- **Name Servers:** Authoritative DNS servers
- **Registrant:** Domain owner (if not privacy-protected)
- **Admin Contact:** Administrative contact
- **Tech Contact:** Technical contact
- **DNSSEC:** Whether DNSSEC is enabled

### Phase 2: DNS Enumeration

**Step 2.1: Core DNS Records**

```bash
# A records (IPv4)
dig example.com A +short

# AAAA records (IPv6)
dig example.com AAAA +short

# MX records (mail servers)
dig example.com MX +short

# NS records (name servers)
dig example.com NS +short

# SOA record (zone authority)
dig example.com SOA +short

# TXT records (various metadata)
dig example.com TXT

# CNAME records (for www typically)
dig www.example.com CNAME +short

# All records (attempt)
dig example.com ANY
```

**Step 2.2: Mail Infrastructure Analysis**

```bash
# MX records with priority
dig example.com MX

# Get IPs for mail servers
dig mail1.example.com A +short
dig mail2.example.com A +short

# SPF record
dig example.com TXT | grep "v=spf1"

# DMARC policy
dig _dmarc.example.com TXT

# DKIM selectors (common ones)
dig default._domainkey.example.com TXT
dig google._domainkey.example.com TXT
dig k1._domainkey.example.com TXT
dig selector1._domainkey.example.com TXT
dig selector2._domainkey.example.com TXT
```

**Email Security Assessment:**
- **SPF:** Check for sender policy framework
- **DMARC:** Check for domain-based message authentication
- **DKIM:** Check for domain keys identified mail
- **MTA-STS:** Check for mail transfer agent strict transport security

**Step 2.3: Name Server Analysis**

```bash
# Get authoritative name servers
dig example.com NS +short

# Get IPs for each name server
for ns in $(dig example.com NS +short); do
  echo "=== $ns ==="
  dig $ns A +short
  dig $ns AAAA +short
done

# Check if name servers are in same domain (potential SPOF)
```

**Step 2.4: Zone Transfer Attempt**

```bash
# Attempt zone transfer (usually fails but worth trying)
dig @ns1.example.com example.com AXFR

# If successful, you get ALL DNS records
# If failed, continue with enumeration
```

### Phase 3: Subdomain Enumeration

**Step 3.1: Certificate Transparency**

```bash
# Query crt.sh for all certificates
curl -s "https://crt.sh/?q=%.example.com&output=json" | jq

# Extract unique subdomains
curl -s "https://crt.sh/?q=%.example.com&output=json" | \
  jq -r '.[].name_value' | \
  sed 's/\*\.//g' | \
  sort -u > subdomains_ct.txt

# Count
wc -l subdomains_ct.txt
```

**Categorize interesting subdomains:**
```bash
# Administrative interfaces
grep -E "(admin|panel|dashboard|manage|control)" subdomains_ct.txt

# API endpoints
grep -E "(api|rest|graphql|v1|v2)" subdomains_ct.txt

# Development/staging
grep -E "(dev|test|staging|uat|qa|demo)" subdomains_ct.txt

# Internal systems
grep -E "(internal|intranet|vpn|private)" subdomains_ct.txt

# Mail systems
grep -E "(mail|smtp|imap|pop|mx|webmail)" subdomains_ct.txt

# Databases
grep -E "(db|database|mysql|postgres|mongo)" subdomains_ct.txt
```

**Step 3.2: Common Subdomain Enumeration**

```bash
# Create wordlist of common subdomains
cat > common_subdomains.txt << 'EOF'
www
mail
ftp
localhost
webmail
smtp
pop
ns1
ns2
webdisk
ns
cpanel
whm
autodiscover
autoconfig
m
imap
test
mx
blog
dev
www2
admin
forum
news
vpn
ns3
mail2
new
mysql
old
lists
support
mobile
mx1
static
api
cdn
media
email
portal
beta
stage
staging
demo
intranet
git
shop
app
apps
files
dashboard
secure
login
panel
EOF

# Test each subdomain (DNS only - passive)
while read subdomain; do
  result=$(dig ${subdomain}.example.com A +short)
  if [ ! -z "$result" ]; then
    echo "${subdomain}.example.com -> $result"
  fi
done < common_subdomains.txt
```

### Phase 4: IP Address Enumeration

**Step 4.1: Resolve All Discovered Domains**

```bash
# For root domain
echo "=== example.com ===" > domain_ips.txt
dig example.com A +short >> domain_ips.txt
dig example.com AAAA +short >> domain_ips.txt

# For each subdomain found
while read subdomain; do
  echo "=== $subdomain ===" >> domain_ips.txt
  dig $subdomain A +short >> domain_ips.txt
  dig $subdomain AAAA +short >> domain_ips.txt
done < subdomains_ct.txt

# Extract unique IPs
grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' domain_ips.txt | sort -u > unique_ips.txt
```

**Step 4.2: Call IP-Recon for Each IP**

```typescript
// For each discovered IP, perform IP reconnaissance
const uniqueIPs = await extractUniqueIPs(domainReport);

for (const ip of uniqueIPs) {
  // Call ip-recon workflow
  const ipInfo = await ipRecon(ip, { passive: true });

  domainReport.infrastructure.push({
    ip: ip,
    asn: ipInfo.asn,
    organization: ipInfo.organization,
    location: ipInfo.location,
    hosting: ipInfo.hostingType
  });
}
```

**Step 4.3: Identify Hosting Providers**

```typescript
// Group IPs by hosting provider
const hostingProviders = {};

for (const ipInfo of domainReport.infrastructure) {
  const provider = ipInfo.organization;

  if (!hostingProviders[provider]) {
    hostingProviders[provider] = [];
  }

  hostingProviders[provider].push(ipInfo.ip);
}
```

### Phase 5: Active Probing (Authorization Required)

**AUTHORIZATION CHECK:**
```typescript
if (activeMode && !isAuthorized()) {
  console.log("Active subdomain probing requires authorization");
  console.log("Passive enumeration complete. Switch to passive-only mode.");
  return passiveReport;
}
```

**Step 5.1: HTTP/HTTPS Probing**

```bash
# Probe all discovered subdomains
cat subdomains_ct.txt | httpx -silent

# With details
cat subdomains_ct.txt | httpx -status-code -title -tech-detect -server

# Save live web applications
cat subdomains_ct.txt | httpx -silent > live_webapps.txt
```

**Step 5.2: Technology Detection**

```bash
# Detect technologies on each live webapp
while read webapp; do
  echo "=== $webapp ==="
  whatweb $webapp
done < live_webapps.txt

# Or using httpx
cat live_webapps.txt | httpx -tech-detect -cdn -server
```

### Phase 6: Certificate Analysis

**Step 6.1: Current Certificates**

```bash
# For each HTTPS endpoint
for domain in $(cat live_webapps.txt | grep https); do
  echo "=== $domain ==="

  # Certificate details
  echo | openssl s_client -connect ${domain}:443 -servername $domain 2>/dev/null | \
    openssl x509 -noout -dates -subject -issuer -ext subjectAltName

done
```

**Extract:**
- Common Name (CN)
- Subject Alternative Names (SANs) - additional domains on cert
- Issuer (Let's Encrypt, DigiCert, etc.)
- Validity period
- Certificate transparency logs
- Serial number

**Step 6.2: Historical Certificates**

```bash
# Get certificate history from crt.sh
curl -s "https://crt.sh/?q=example.com&output=json" | \
  jq -r '.[] | "\(.issuer_name) | \(.not_before) | \(.not_after)"' | \
  sort -u
```

## Integration Examples

### Called by OSINT

```typescript
// OSINT discovers company domains
const company = await osintInvestigate("Acme Corporation");

// Recon each domain
for (const domain of company.domains) {
  const domainReport = await domainRecon(domain, { mode: 'passive' });

  // Add to company infrastructure map
  company.infrastructure.domains.push(domainReport);
}
```

### Calling ip-recon for discovered IPs

```typescript
// After domain recon discovers IPs
const uniqueIPs = domainReport.uniqueIPs;

for (const ip of uniqueIPs) {
  const ipInfo = await ipRecon(ip, { passive: true });

  domainReport.infrastructure.push({
    ip: ip,
    info: ipInfo
  });
}
```

### Calling webassessment

```typescript
// After discovering live web applications
const liveApps = domainReport.liveWebApps;
const interestingApps = liveApps.filter(app =>
  app.url.includes('admin') ||
  app.url.includes('api') ||
  app.status === 403 // Forbidden - something to hide?
);

if (authorized) {
  for (const app of interestingApps) {
    await webAssessment(app.url);
  }
}
```

## Success Criteria

### Passive Recon Complete
- WHOIS data retrieved
- DNS records enumerated (A, AAAA, MX, NS, TXT, SOA)
- Email security assessed (SPF, DMARC, DKIM)
- Certificate transparency searched
- Subdomains enumerated (passive methods)
- IP addresses identified
- Hosting providers mapped
- Report generated

### Active Recon Complete (if authorized)
- Authorization documented
- Live web applications probed
- Technology stack detected
- Screenshots captured
- Comprehensive attack surface mapped
- No aggressive techniques used

---

**Key Principle:** Domain recon provides the foundation for all subsequent security testing. Be thorough in enumeration and careful about what you expose.
