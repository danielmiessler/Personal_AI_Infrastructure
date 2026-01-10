# Extract IoCs Workflow

Automated extraction of Indicators of Compromise from unstructured threat intelligence.

## Trigger Phrases
- "extract iocs"
- "find indicators"
- "extract indicators"
- "get iocs from"
- "parse indicators"
- "extract threat indicators"

## Input
- `source`: Text, URL, or file containing threat intelligence
- `refang` (optional): Convert defanged indicators to original format (default: true)
- `validate` (optional): Validate extracted IoCs (default: true)
- `enrich` (optional): Enrich with external sources (default: false)

## Process

### Step 1: Ingest Content
```
Parse source content:
- URL → Fetch using Browser skill, extract text
- File → Read content
- Text → Direct processing

Preserve context for each extraction (surrounding text)
```

### Step 2: Detect and Extract IoCs

**IP Addresses:**
```
IPv4 Pattern: \b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b

Defanged variants:
- 192[.]168[.]1[.]1
- 192(.)168(.)1(.)1
- 192{.}168{.}1{.}1

IPv6 Pattern: Extended regex for full and abbreviated formats
```

**Domains:**
```
Domain Pattern: \b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b

Defanged variants:
- evil[.]com
- evil(.)com
- evil[dot]com
```

**URLs:**
```
URL Pattern: (?:https?|ftp|sftp)://[^\s<>\"{}|\\^`\[\]]+

Defanged variants:
- hxxp://
- hxxps://
- http[:]//
- http__
```

**Email Addresses:**
```
Email Pattern: \b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b

Defanged variants:
- user[@]domain[.]com
- user[at]domain[dot]com
```

**File Hashes:**
```
MD5: \b[a-fA-F0-9]{32}\b
SHA1: \b[a-fA-F0-9]{40}\b
SHA256: \b[a-fA-F0-9]{64}\b
SHA512: \b[a-fA-F0-9]{128}\b
```

**File Paths:**
```
Windows: [a-zA-Z]:\\(?:[^\\/:*?\"<>|\r\n]+\\)*[^\\/:*?\"<>|\r\n]*
Unix: (?:/[^/\0\s]+)+
```

**Registry Keys:**
```
Pattern: (?:HKEY_[A-Z_]+|HK[A-Z]{2})(?:\\[^\\]+)+
Common roots: HKLM, HKCU, HKCR, HKU, HKCC
```

**CVE Identifiers:**
```
Pattern: CVE-\d{4}-\d{4,7}
```

**Cryptocurrency Addresses:**
```
Bitcoin: \b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b
Ethereum: \b0x[a-fA-F0-9]{40}\b
Monero: \b4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}\b
```

**YARA Rule Names:**
```
Pattern: rule\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[:{]
```

**MITRE ATT&CK IDs:**
```
Technique: T\d{4}(?:\.\d{3})?
Tactic: TA\d{4}
Group: G\d{4}
Software: S\d{4}
```

### Step 3: Refang Indicators

Convert defanged indicators to original format:

```typescript
function refang(text: string): string {
  // URL protocols
  text = text.replace(/hxxps?/gi, m => m.replace(/xx/gi, 'tt'));
  text = text.replace(/\[:\]/g, ':');
  text = text.replace(/\[\/\]/g, '/');

  // Dots
  text = text.replace(/\[\.\]|\(\.\)|\{\.\}/g, '.');
  text = text.replace(/\[dot\]|\(dot\)/gi, '.');

  // At symbol
  text = text.replace(/\[@\]|\[at\]|\(at\)/gi, '@');

  // Protocol separator
  text = text.replace(/(\w+)__/g, '$1://');
  text = text.replace(/(https?):\\\\/gi, '$1://');

  return text;
}
```

### Step 4: Validate Extracted IoCs

```
For each extracted IoC:

IP Addresses:
- Check if valid IP format
- Exclude private ranges (optional)
- Exclude reserved ranges
- Validate against known good (e.g., 8.8.8.8, 1.1.1.1)

Domains:
- Check valid TLD
- Exclude known good domains (google.com, microsoft.com)
- Check for typosquatting patterns
- Validate DNS resolution (optional)

URLs:
- Valid URL format
- Domain validation
- Check for known malicious patterns

Hashes:
- Correct length for type
- Valid hex characters
- Not all zeros or common patterns

File Paths:
- Valid format for OS type
- Contains file extension
- Not system paths without context
```

### Step 5: Deduplicate and Categorize

```
Deduplicate:
- Remove exact duplicates
- Normalize case (domains, hashes)
- Preserve unique context

Categorize by type:
- Network: IP, Domain, URL
- File: Hash, Path
- Identity: Email
- Reference: CVE, ATT&CK ID
- Other: Registry, Mutex, Crypto
```

### Step 6: Enrich (if requested)

Using **EnrichIoCs** workflow:

```
For network indicators:
- VirusTotal reputation
- Shodan data
- WHOIS information
- Passive DNS

For file hashes:
- VirusTotal detection
- MalwareBazaar data
- Sandbox reports

For CVEs:
- NIST NVD data
- CVSS scores
- Known exploits
```

### Step 7: Store to Knowledge Graph

Use the **Knowledge** skill:

```
Store the following as structured episodes:

1. IoC Collection:
   - Name: "IoCs: {source_name}"
   - Data: All extracted IoCs by type
   - Group: "threat-intel-iocs"
   - Source attribution

2. Individual High-Value IoCs:
   - Name: "IoC: {type}:{value}"
   - Data: Full context, validation status, enrichment
   - Relationships: extracted_from, indicates_threat

3. Extraction Metadata:
   - Name: "Extraction: {timestamp}"
   - Data: Source, method, counts by type
   - Audit trail
```

## Output Format

```
📋 IoC EXTRACTION REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 SOURCE: [Source identifier]
📅 EXTRACTION DATE: [timestamp]
📊 TOTAL IoCs: [count]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 NETWORK INDICATORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IP Addresses ([count]):
| IP | Validation | Context |
|----|------------|---------|
| 1.2.3.4 | ✅ Valid | C2 server |
| 5.6.7.8 | ✅ Valid | Exfiltration |

Domains ([count]):
| Domain | Validation | Context |
|--------|------------|---------|
| evil.com | ✅ Valid | Phishing |
| malware.net | ✅ Valid | Malware hosting |

URLs ([count]):
| URL | Validation | Context |
|-----|------------|---------|
| hxxp://evil.com/payload | ✅ Valid | Payload delivery |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 FILE INDICATORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SHA256 Hashes ([count]):
| Hash | Validation | Context |
|------|------------|---------|
| a1b2c3... | ✅ Valid | Malware sample |

File Paths ([count]):
| Path | OS | Context |
|------|-------|---------|
| C:\Users\...\malware.exe | Windows | Dropped file |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 IDENTITY INDICATORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Email Addresses ([count]):
| Email | Validation | Context |
|-------|------------|---------|
| attacker@evil.com | ✅ Valid | Sender |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 REFERENCE INDICATORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CVEs ([count]):
| CVE | CVSS | Context |
|-----|------|---------|
| CVE-2023-1234 | 9.8 | Exploited |

ATT&CK IDs ([count]):
| ID | Name | Context |
|----|------|---------|
| T1566 | Phishing | Delivery method |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 SUMMARY BY TYPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• IP Addresses: [count]
• Domains: [count]
• URLs: [count]
• SHA256: [count]
• SHA1: [count]
• MD5: [count]
• Email: [count]
• File Paths: [count]
• CVEs: [count]
• ATT&CK IDs: [count]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 DEFANGED INDICATORS REFANGED: [count]
⚠️ INVALID INDICATORS EXCLUDED: [count]
🔄 DUPLICATES REMOVED: [count]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Stored to Knowledge Graph: Yes
🔗 Collection ID: [ioc_collection_id]
```

## Exportable Formats

### CSV Export
```csv
type,value,context,validation,source,timestamp
ip,1.2.3.4,C2 server,valid,report.pdf,2026-01-10
domain,evil.com,Phishing,valid,report.pdf,2026-01-10
```

### JSON Export
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

### STIX Export
See CreateStixBundle.md workflow for STIX 2.1 format export.

## Tools & APIs Used
- Regex patterns from Data/IoCPatterns.yaml
- Browser skill for URL fetching
- Knowledge skill for persistence
- Validation APIs (optional)

## Ethical Notes
- Preserve source attribution
- Handle defanged indicators carefully
- Validate before operational use
- Consider false positive potential
