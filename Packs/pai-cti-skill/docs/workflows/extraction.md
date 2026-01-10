# Extraction Workflows

> Workflows for extracting and enriching Indicators of Compromise

---

## ExtractIoCs

Automated extraction of Indicators of Compromise from unstructured threat intelligence.

### Trigger Phrases

- "extract iocs"
- "find indicators"
- "extract indicators"
- "get iocs from"
- "parse indicators"
- "extract threat indicators"

### Input Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `source` | Yes | Text, URL, or file containing threat intelligence |
| `refang` | No | Convert defanged indicators to original format (default: `true`) |
| `validate` | No | Validate extracted IoCs (default: `true`) |
| `enrich` | No | Enrich with external sources (default: `false`) |

### Supported IoC Types

#### Network Indicators

| Type | Pattern Example | Defanged Variants |
|------|-----------------|-------------------|
| IPv4 | `192.168.1.1` | `192[.]168[.]1[.]1`, `192(.)168(.)1(.)1` |
| IPv6 | `2001:db8::1` | Standard format |
| Domain | `evil.com` | `evil[.]com`, `evil[dot]com` |
| URL | `https://evil.com/malware` | `hxxps://evil[.]com/malware` |
| Email | `bad@evil.com` | `bad[@]evil[.]com`, `bad[at]evil[dot]com` |

#### File Indicators

| Type | Length | Example |
|------|--------|---------|
| MD5 | 32 hex | `d41d8cd98f00b204e9800998ecf8427e` |
| SHA1 | 40 hex | `da39a3ee5e6b4b0d3255bfef95601890afd80709` |
| SHA256 | 64 hex | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| SHA512 | 128 hex | Full SHA512 hash |

#### System Indicators

| Type | Pattern |
|------|---------|
| Windows Path | `C:\Users\Public\malware.exe` |
| Unix Path | `/tmp/malware` |
| Registry Key | `HKEY_LOCAL_MACHINE\SOFTWARE\...` |
| Mutex | `Global\MyMutex` |

#### Reference Indicators

| Type | Pattern | Example |
|------|---------|---------|
| CVE | `CVE-YYYY-NNNNN` | `CVE-2021-44228` |
| ATT&CK Technique | `T####.###` | `T1566.001` |
| ATT&CK Tactic | `TA####` | `TA0001` |
| ATT&CK Group | `G####` | `G0016` |
| ATT&CK Software | `S####` | `S0154` |

#### Cryptocurrency

| Type | Pattern |
|------|---------|
| Bitcoin | `1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2` |
| Ethereum | `0x742d35Cc6634C0532925a3b844Bc9e7595f5b5f5` |
| Monero | 95-character address starting with `4` |

### Process

1. **Ingest Content** - Parse source (URL, file, or text)
2. **Detect and Extract** - Apply regex patterns for each IoC type
3. **Refang Indicators** - Convert defanged to real format (if enabled)
4. **Validate** - Check format validity, exclude known-good
5. **Deduplicate** - Remove exact duplicates, normalize case
6. **Enrich** - Query external sources (if enabled)
7. **Store** - Save to Knowledge Graph

### Refanging Rules

| Defanged | Refanged |
|----------|----------|
| `hxxp://` | `http://` |
| `hxxps://` | `https://` |
| `[.]` | `.` |
| `(.)` | `.` |
| `[dot]` | `.` |
| `[@]` | `@` |
| `[at]` | `@` |
| `[:]` | `:` |

### Validation Rules

| IoC Type | Validation |
|----------|------------|
| IPv4 | Valid octets (0-255), not private/reserved by default |
| IPv6 | Valid hex groups, proper format |
| Domain | Valid TLD, not in known-good list |
| URL | Valid URL format |
| Hash | Correct length, valid hex, not all zeros |
| CVE | Valid year (1999 to current+1) |

### Output Format

```
IoC EXTRACTION REPORT
========================================

SOURCE: [Source identifier]
EXTRACTED: [Timestamp]
TOTAL IoCs: [Count]

NETWORK INDICATORS
----------------------------------------

IP Addresses ([count]):
| IP | Validation | Context |
|----|------------|---------|
| 1.2.3.4 | Valid | C2 server |
| 5.6.7.8 | Valid | Exfil |

Domains ([count]):
| Domain | Validation | Context |
|--------|------------|---------|
| evil.com | Valid | Phishing |

URLs ([count]):
| URL | Validation | Context |
|-----|------------|---------|
| https://evil.com/payload | Valid | Payload delivery |

FILE INDICATORS
----------------------------------------

SHA256 Hashes ([count]):
| Hash | Validation | Context |
|------|------------|---------|
| abc123... | Valid | Malware sample |

REFERENCE INDICATORS
----------------------------------------

CVEs ([count]):
| CVE | CVSS | Context |
|-----|------|---------|
| CVE-2023-1234 | 9.8 | Exploited |

ATT&CK IDs ([count]):
| ID | Name | Context |
|----|------|---------|
| T1566 | Phishing | Delivery |

SUMMARY BY TYPE
----------------------------------------
* IP Addresses: [count]
* Domains: [count]
* URLs: [count]
* SHA256: [count]
* MD5: [count]
* CVEs: [count]
* ATT&CK IDs: [count]

Defanged Refanged: [count]
Invalid Excluded: [count]
Duplicates Removed: [count]

Stored to Knowledge Graph: Yes
Collection ID: [ioc_collection_id]
```

### Export Formats

**CSV:**
```csv
type,value,context,validation,source,timestamp
ip,1.2.3.4,C2 server,valid,report.pdf,2026-01-10
domain,evil.com,Phishing,valid,report.pdf,2026-01-10
```

**JSON:**
```json
{
  "extraction_date": "2026-01-10T12:00:00Z",
  "source": "report.pdf",
  "iocs": {
    "ip": [{"value": "1.2.3.4", "context": "C2 server"}],
    "domain": [{"value": "evil.com", "context": "Phishing"}]
  }
}
```

### Example Usage

```
User: "Extract IoCs from this malware report"
       [Paste report text or provide URL]

User: "Find all indicators in this blog post"
       URL: https://thedfirreport.com/recent-post

User: "Extract and validate IoCs from attached file"
       File: /path/to/threat-report.pdf
```

---

## EnrichIoCs

Enhance Indicators of Compromise with external threat intelligence and context.

### Trigger Phrases

- "enrich indicators"
- "lookup ioc"
- "ioc enrichment"
- "investigate indicator"
- "check reputation"
- "enrich these iocs"

### Input Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `iocs` | Yes | List of IoCs to enrich (IPs, domains, hashes, URLs) |
| `sources` | No | Specific enrichment sources to use |
| `depth` | No | Enrichment depth: `quick`, `standard`, `deep` |

### Enrichment Sources

#### IP Address Enrichment

| Source | Data Provided |
|--------|---------------|
| VirusTotal | Detection ratio, community score, associated files |
| AbuseIPDB | Abuse confidence, report count, last reported |
| AlienVault OTX | Pulse count, malware families, related indicators |
| Shodan | Open ports, services, vulnerabilities, SSL certs |
| WHOIS | Netblock owner, ASN, country |
| GeoIP | Country, city, ISP, organization |

#### Domain Enrichment

| Source | Data Provided |
|--------|---------------|
| VirusTotal | Detection stats, categories, popularity |
| URLScan.io | Screenshot, content, technologies |
| WHOIS | Registrar, registration/expiration dates |
| DNS | A, AAAA, MX, TXT, NS records |
| SSL | Certificate issuer, validity, SANs |

#### Hash Enrichment

| Source | Data Provided |
|--------|---------------|
| VirusTotal | AV detections, file type, first/last seen |
| MalwareBazaar | Malware family, tags, signature |
| Hybrid Analysis | Sandbox results, MITRE ATT&CK TTPs |

#### URL Enrichment

| Source | Data Provided |
|--------|---------------|
| URLScan.io | Screenshot, DOM, HTTP transactions |
| VirusTotal | Scanner detections, final URL, redirects |
| PhishTank | Phishing status, target brand |

### Verdict Calculation

The workflow calculates a confidence-weighted verdict:

```
VirusTotal (40%) + AbuseIPDB (25%) + OTX (20%) + Context (15%) = Score

Score >= 75: MALICIOUS
Score 50-74: SUSPICIOUS
Score 25-49: UNCERTAIN
Score < 25:  CLEAN
```

### API Rate Limits

| Source | Free Tier Limit |
|--------|-----------------|
| VirusTotal | 4 requests/minute, 500/day |
| AbuseIPDB | 30 requests/minute, 1000/day |
| OTX | 10 requests/second, unlimited |
| Shodan | 1 request/second, varies by plan |

### Output Format

```
IoC ENRICHMENT REPORT
========================================

ENRICHMENT DATE: [Timestamp]
IoCs PROCESSED: [Count]
SOURCES USED: VirusTotal, AbuseIPDB, OTX, Shodan

MALICIOUS ([count])
----------------------------------------

1. 198.51.100.1 (IP)
   Verdict: MALICIOUS (95% confidence)
   VirusTotal: 45/70 detections
   AbuseIPDB: 87% confidence, 156 reports
   OTX: 8 pulses
   Country: Russia (RU)
   ASN: AS12345 (Evil Hosting)
   Malware: Emotet, TrickBot
   First Seen: 2025-06-01
   Last Seen: 2026-01-09

2. evil-domain.com (Domain)
   Verdict: MALICIOUS (89% confidence)
   VirusTotal: 38/70 detections
   Age: 45 days (recently registered)
   Registrar: NameCheap
   Hosting: 198.51.100.0/24

SUSPICIOUS ([count])
----------------------------------------

1. abc123...def456 (SHA256)
   Verdict: SUSPICIOUS (62% confidence)
   VirusTotal: 12/70 detections
   File Type: PE32 executable
   First Seen: 2026-01-05
   Names: setup.exe, installer.exe

CLEAN ([count])
----------------------------------------

1. 8.8.8.8 (IP)
   Verdict: CLEAN (5% malicious score)
   VirusTotal: 0/70 detections
   Owner: Google LLC
   Known: Google Public DNS

ENRICHMENT SUMMARY
----------------------------------------
| Verdict | Count | Percentage |
|---------|-------|------------|
| Malicious | 15 | 50% |
| Suspicious | 8 | 27% |
| Clean | 5 | 17% |
| Uncertain | 2 | 6% |

Related Threats:
* Emotet Campaign (5 indicators)
* TrickBot Infrastructure (3 indicators)

MITRE ATT&CK Coverage:
* T1071.001 - Web Protocols
* T1041 - Exfiltration Over C2

Stored to Knowledge Graph: Yes
Enrichment ID: [enrichment_id]
```

### Example Usage

```
User: "Enrich these IP addresses"
       192.168.1.100
       203.0.113.42
       198.51.100.1

User: "Check reputation for evil.com"

User: "Investigate this hash"
       e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855

User: "Deep enrichment for all IoCs in this report"
       [Provide report or IoC list]
       Depth: deep
```

---

## See Also

- [IoC Extractor Tool](../tools/ioc-extractor.md) - CLI tool documentation
- [IoCPatterns.yaml](../configuration.md#iocpatternsyaml-format) - Pattern configuration
