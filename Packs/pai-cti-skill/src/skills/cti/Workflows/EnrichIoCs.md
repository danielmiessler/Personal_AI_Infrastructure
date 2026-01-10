# Enrich IoCs Workflow

Enhance Indicators of Compromise with external threat intelligence and context.

## Trigger Phrases
- "enrich indicators"
- "lookup ioc"
- "ioc enrichment"
- "investigate indicator"
- "check reputation"
- "enrich these iocs"

## Input
- `iocs`: List of IoCs to enrich (IPs, domains, hashes, URLs)
- `sources` (optional): Specific enrichment sources to use
- `depth` (optional): Enrichment depth (quick, standard, deep)

## Process

### Step 1: Parse and Categorize IoCs
```
Categorize by type:
- IP addresses (IPv4, IPv6)
- Domains
- URLs
- File hashes (MD5, SHA1, SHA256)
- Email addresses

Validate format for each type
```

### Step 2: IP Address Enrichment

Using **Browser** skill and external APIs:

**Reputation Data:**
```
VirusTotal:
- Detection ratio
- Community score
- Associated URLs
- Associated files

AbuseIPDB:
- Abuse confidence score
- Report count
- Last reported date
- Country of origin

AlienVault OTX:
- Pulse count
- Malware families
- Related indicators
```

**Infrastructure Data:**
```
Shodan:
- Open ports
- Services
- Vulnerabilities
- SSL certificates
- Hostnames

WHOIS:
- Netblock owner
- ASN
- Country
- Registration date

MaxMind/GeoIP:
- Country
- City
- ISP
- Organization
```

**Historical Data:**
```
PassiveTotal:
- Resolution history
- Certificate history
- Components

SecurityTrails:
- Historical DNS
- Associated domains
- Subdomains
```

### Step 3: Domain Enrichment

**Reputation Data:**
```
VirusTotal:
- Detection stats
- Categories
- Popularity rank
- DNS records

URLScan.io:
- Screenshot
- Page content
- Technologies
- Connections

AlienVault OTX:
- Pulse associations
- Malware connections
- Related indicators
```

**Registration Data:**
```
WHOIS:
- Registrar
- Registration date
- Expiration date
- Registrant (if available)
- Name servers

DomainTools:
- Domain age
- Risk score
- Hosting history
- Registrant email
```

**Infrastructure Data:**
```
DNS Records:
- A/AAAA records
- MX records
- TXT records
- NS records
- Historical DNS

SSL Certificate:
- Issuer
- Validity
- SANs
- Certificate transparency
```

### Step 4: Hash Enrichment

**VirusTotal:**
```
Detection results:
- AV engine detections
- Detection names
- First seen
- Last seen
- File type
- File size
- Submissions count

Behavioral analysis:
- Sandbox results
- Registry activity
- Network connections
- File operations
- Process activity
```

**MalwareBazaar:**
```
Sample details:
- Malware family
- Tags
- Signature
- First seen
- Download count
- Comments
```

**Hybrid Analysis:**
```
Sandbox report:
- Threat score
- Verdict
- Extracted IoCs
- Screenshots
- MITRE ATT&CK TTPs
```

**Any.run:**
```
Analysis results:
- Behavior timeline
- Network activity
- Process tree
- File modifications
```

### Step 5: URL Enrichment

**URLScan.io:**
```
Scan results:
- Screenshot
- Final URL (after redirects)
- DOM content
- HTTP transactions
- Certificates
- Cookies
- Technologies detected
```

**VirusTotal:**
```
Detection results:
- Scanner detections
- Categories
- Final URL
- Redirects
```

**PhishTank:**
```
Phishing status:
- Is phishing: Yes/No
- Verification status
- Submission date
- Target brand
```

### Step 6: Aggregate Results

**Combine enrichment data:**
```json
{
  "ioc": "1.2.3.4",
  "type": "ip",
  "enrichment": {
    "reputation": {
      "virustotal": {"malicious": 5, "suspicious": 2, "clean": 60},
      "abuseipdb": {"confidence": 85, "reports": 42},
      "otx": {"pulses": 3}
    },
    "infrastructure": {
      "country": "RU",
      "asn": "AS12345",
      "isp": "Evil Hosting LLC",
      "ports": [22, 80, 443, 4444],
      "hostnames": ["evil.com", "malware.net"]
    },
    "context": {
      "first_seen": "2025-06-01",
      "last_seen": "2026-01-09",
      "malware_families": ["Emotet", "TrickBot"],
      "attack_patterns": ["T1071.001", "T1041"]
    }
  },
  "verdict": "malicious",
  "confidence": 95
}
```

### Step 7: Calculate Verdict

**Scoring Algorithm:**
```python
def calculate_verdict(enrichment):
    scores = []

    # VirusTotal weight: 40%
    if vt_data := enrichment.get('virustotal'):
        total = vt_data['malicious'] + vt_data['suspicious'] + vt_data['clean']
        if total > 0:
            vt_score = ((vt_data['malicious'] * 1.0) + (vt_data['suspicious'] * 0.5)) / total
            scores.append(('virustotal', vt_score, 0.4))

    # AbuseIPDB weight: 25%
    if abuse_data := enrichment.get('abuseipdb'):
        scores.append(('abuseipdb', abuse_data['confidence'] / 100, 0.25))

    # OTX weight: 20%
    if otx_data := enrichment.get('otx'):
        otx_score = min(otx_data['pulses'] / 5, 1.0)  # Cap at 5 pulses
        scores.append(('otx', otx_score, 0.2))

    # Historical context: 15%
    if ctx := enrichment.get('context'):
        if ctx.get('malware_families'):
            scores.append(('context', 1.0, 0.15))

    # Calculate weighted average
    total_weight = sum(s[2] for s in scores)
    weighted_sum = sum(s[1] * s[2] for s in scores)
    final_score = (weighted_sum / total_weight) * 100 if total_weight > 0 else 50

    # Verdict
    if final_score >= 75:
        return 'malicious', final_score
    elif final_score >= 50:
        return 'suspicious', final_score
    elif final_score >= 25:
        return 'uncertain', final_score
    else:
        return 'clean', final_score
```

### Step 8: Store to Knowledge Graph

Use the **Knowledge** skill:

```
Store the following as structured episodes:

1. Enriched IoC:
   - Name: "IoC: {type}:{value}"
   - Data: Full enrichment data
   - Group: "threat-intel-iocs"
   - Verdict and confidence

2. Enrichment Source Data:
   - Name: "Enrichment: {ioc_hash}"
   - Data: Per-source results
   - Temporal: Last updated timestamp

3. Relationships:
   - Name: "Relations: {ioc}"
   - Data: Related indicators, malware families
   - Links to threats and campaigns
```

## Output Format

```
📋 IoC ENRICHMENT REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 ENRICHMENT DATE: [timestamp]
📊 IoCs PROCESSED: [count]
🔍 SOURCES USED: [list of sources]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 MALICIOUS ([count])
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. 198.51.100.1 (IP)**
• Verdict: MALICIOUS (95% confidence)
• VirusTotal: 45/70 detections
• AbuseIPDB: 87% confidence, 156 reports
• OTX: 8 pulses
• Country: Russia (RU)
• ASN: AS12345 (Evil Hosting)
• Malware: Emotet, TrickBot
• First Seen: 2025-06-01
• Last Seen: 2026-01-09

**2. evil-domain.com (Domain)**
• Verdict: MALICIOUS (89% confidence)
• VirusTotal: 38/70 detections
• Age: 45 days (recently registered)
• Registrar: NameCheap
• Hosting: 198.51.100.0/24

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟠 SUSPICIOUS ([count])
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. a1b2c3d4...f5e6 (SHA256)**
• Verdict: SUSPICIOUS (62% confidence)
• VirusTotal: 12/70 detections
• File Type: PE32 executable
• First Seen: 2026-01-05
• Names: setup.exe, installer.exe

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 CLEAN ([count])
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. 8.8.8.8 (IP)**
• Verdict: CLEAN (5% malicious score)
• VirusTotal: 0/70 detections
• Owner: Google LLC
• Known: Google Public DNS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚪ UNCERTAIN ([count])
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. unknown-file.exe (SHA256: xyz...)**
• Verdict: UNCERTAIN (35% confidence)
• VirusTotal: 2/70 detections
• Not in MalwareBazaar
• Requires manual analysis

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ENRICHMENT SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Verdict | Count | Percentage |
|---------|-------|------------|
| Malicious | 15 | 50% |
| Suspicious | 8 | 27% |
| Clean | 5 | 17% |
| Uncertain | 2 | 6% |

**Related Threats:**
• Emotet Campaign (5 indicators)
• TrickBot Infrastructure (3 indicators)

**MITRE ATT&CK Coverage:**
• T1071.001 - Web Protocols
• T1041 - Exfiltration Over C2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Stored to Knowledge Graph: Yes
🔗 Enrichment ID: [enrichment_id]
```

## API Rate Limits

**Free Tier Considerations:**
```yaml
VirusTotal:
  rate_limit: 4 requests/minute
  daily_limit: 500 requests

AbuseIPDB:
  rate_limit: 30 requests/minute
  daily_limit: 1000 requests

OTX:
  rate_limit: 10 requests/second
  daily_limit: unlimited (with API key)

Shodan:
  rate_limit: 1 request/second
  monthly_limit: varies by plan
```

**Rate Limit Handling:**
```
- Implement request queuing
- Cache previous results
- Batch requests where possible
- Respect 429 responses
```

## Tools & APIs Used
- VirusTotal API
- AbuseIPDB API
- AlienVault OTX API
- Shodan API
- URLScan.io API
- Browser skill for web sources
- Knowledge skill for persistence
- osint skill for additional recon

## Ethical Notes
- Respect API rate limits
- Cache results to reduce load
- Use API keys responsibly
- Don't abuse free tiers
- Attribute source data
