# Enrich CVE Workflow

Enhance CVE identifiers with vulnerability intelligence from NIST NVD and correlate with threat intelligence.

## Trigger Phrases
- "enrich cve"
- "lookup vulnerability"
- "cve enrichment"
- "vulnerability correlation"
- "analyze cve"
- "check cve"

## Input
- `cves`: List of CVE identifiers (e.g., CVE-2024-1234)
- `depth` (optional): Enrichment depth (quick, standard, deep)
- `correlate` (optional): Whether to correlate with threat intelligence (default: true)

## Process

### Step 1: Validate CVE Identifiers

```
Parse and validate CVE format:
- Pattern: CVE-YYYY-NNNNN (4-7 digit ID)
- Validate year is reasonable (1999-current)
- Deduplicate input list

Example valid CVEs:
- CVE-2024-21762
- CVE-2023-44487
- CVE-2021-44228
```

### Step 2: Query NIST NVD

Using the **NIST NVD API** (https://services.nvd.nist.gov/rest/json/cves/2.0):

```
For each CVE, retrieve:

Basic Information:
- CVE ID
- Description
- Published date
- Last modified date
- Source identifier
- Vulnerability status

CVSS Scores:
- CVSS v3.1 base score
- CVSS v3.1 vector string
- CVSS v2.0 score (if available)
- CVSS v4.0 score (if available)
- Exploitability score
- Impact score

Weakness Enumeration:
- CWE IDs
- CWE descriptions

Configuration/CPE:
- Affected products (CPE)
- Version ranges
- Vendor information

References:
- Advisory URLs
- Patch URLs
- Exploit references
```

**Rate Limit Handling:**
```yaml
NVD API Limits:
  without_key: 5 requests per 30 seconds
  with_key: 50 requests per 30 seconds

Strategy:
- Batch requests where possible
- Implement exponential backoff on 429
- Cache results for 24 hours (CVE data stable)
```

### Step 3: Enrich with Exploit Intelligence

Check for known exploits and weaponization:

**CISA KEV (Known Exploited Vulnerabilities):**
```
Query: https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json

If CVE in KEV:
- Due date for remediation
- Required action
- Notes on exploitation
- Mark as ACTIVELY EXPLOITED
```

**Exploit-DB / ExploitDB:**
```
Check for public exploits:
- Exploit availability
- Exploit type (local, remote, webapps, etc.)
- Metasploit module availability
```

**GitHub Advisory Database:**
```
Query for security advisories:
- Package-specific advisories
- Severity ratings
- Patched versions
```

### Step 4: Correlate with Threat Intelligence

Cross-reference CVEs with threat intelligence data:

**Threat Actor Association:**
```
Check knowledge graph and TI feeds for:
- Threat actors known to exploit this CVE
- APT campaigns using this vulnerability
- Ransomware groups targeting this CVE
- Exploitation timeline
```

**Malware Correlation:**
```
Search for:
- Malware samples exploiting this CVE
- Exploit kits incorporating this vulnerability
- Proof-of-concept code availability
```

**MITRE ATT&CK Mapping:**
```
Map CVE exploitation to ATT&CK:
- Initial Access techniques
- Execution techniques
- Privilege Escalation techniques
- Specific sub-techniques
```

### Step 5: Calculate Risk Priority

Apply risk scoring methodology:

**EPSS (Exploit Prediction Scoring System):**
```
Query FIRST EPSS API for:
- Probability of exploitation in next 30 days
- Percentile ranking
- Historical EPSS trends
```

**Combined Risk Score:**
```python
def calculate_cve_risk(cve_data):
    score = 0
    factors = []

    # CVSS Base Score (0-10 scaled to 0-30)
    cvss = cve_data.get('cvss_v3_score', 0)
    score += (cvss / 10) * 30
    factors.append(f"CVSS: {cvss}")

    # EPSS Score (0-1 scaled to 0-25)
    epss = cve_data.get('epss_score', 0)
    score += epss * 25
    factors.append(f"EPSS: {epss:.2%}")

    # CISA KEV (binary - adds 20)
    if cve_data.get('in_kev'):
        score += 20
        factors.append("CISA KEV: Yes")

    # Public Exploit (binary - adds 15)
    if cve_data.get('public_exploit'):
        score += 15
        factors.append("Public Exploit: Yes")

    # Threat Actor Usage (binary - adds 10)
    if cve_data.get('threat_actor_usage'):
        score += 10
        factors.append("Threat Actor Usage: Yes")

    return {
        'score': min(score, 100),
        'factors': factors,
        'priority': get_priority(score)
    }

def get_priority(score):
    if score >= 80: return 'CRITICAL'
    elif score >= 60: return 'HIGH'
    elif score >= 40: return 'MEDIUM'
    elif score >= 20: return 'LOW'
    else: return 'INFORMATIONAL'
```

### Step 6: Generate Remediation Guidance

Compile remediation recommendations:

```
For each CVE:

1. Patch Information:
   - Vendor patch availability
   - Patch release date
   - Affected version ranges
   - Fixed versions

2. Mitigation Options:
   - Workarounds if no patch
   - Configuration changes
   - Network segmentation
   - Detection rules

3. Detection Guidance:
   - Sigma rules for exploitation detection
   - Snort/Suricata signatures
   - Log indicators
   - EDR queries

4. Prioritization:
   - Business impact assessment
   - Asset exposure evaluation
   - Compensating controls
```

### Step 7: Store to Knowledge Graph

Use the **Knowledge** skill:

```
Store the following as structured episodes:

1. CVE Entity:
   - Name: "CVE: {cve_id}"
   - Data: Full enrichment data
   - Group: "threat-intel-vulnerabilities"
   - Risk score and priority

2. Relationships:
   - CVE → affects → Product/CPE
   - CVE → exploited_by → Threat Actor
   - CVE → used_in → Malware
   - CVE → maps_to → ATT&CK Technique

3. Temporal Data:
   - Published date
   - Exploitation first seen
   - Patch availability date
```

## Output Format

```
📋 CVE ENRICHMENT REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 ENRICHMENT DATE: [timestamp]
📊 CVEs PROCESSED: [count]
🔍 SOURCES USED: NVD, CISA KEV, EPSS, Knowledge Graph

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 CRITICAL PRIORITY ([count])
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. CVE-2024-21762**
• Description: FortiOS out-of-bounds write vulnerability
• CVSS v3.1: 9.8 (Critical)
• EPSS: 97.2% (Top 0.1%)
• CISA KEV: Yes (Due: 2024-02-09)
• Public Exploit: Yes (Metasploit available)
• Threat Actors: Volt Typhoon, APT28
• ATT&CK: T1190 (Exploit Public-Facing Application)
• Affected: FortiOS 7.4.0-7.4.2, 7.2.0-7.2.6
• Patch: Upgrade to FortiOS 7.4.3 or 7.2.7
• Risk Score: 95/100

**2. CVE-2023-44487**
• Description: HTTP/2 Rapid Reset Attack
• CVSS v3.1: 7.5 (High)
• EPSS: 89.5%
• CISA KEV: Yes
• Public Exploit: Yes
• Impact: Denial of Service
• Affected: Multiple HTTP/2 implementations
• Mitigation: Rate limiting, connection limits
• Risk Score: 82/100

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟠 HIGH PRIORITY ([count])
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. CVE-2024-1234**
• Description: [vulnerability description]
• CVSS v3.1: 7.8 (High)
• EPSS: 45.2%
• CISA KEV: No
• Public Exploit: No
• Affected: [products]
• Patch: [patch info]
• Risk Score: 65/100

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟡 MEDIUM PRIORITY ([count])
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Medium priority CVEs...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 LOW/INFORMATIONAL ([count])
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Low priority CVEs...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 SUMMARY STATISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Priority | Count | % |
|----------|-------|---|
| Critical | 2 | 20% |
| High | 3 | 30% |
| Medium | 4 | 40% |
| Low | 1 | 10% |

**Key Findings:**
• 5 CVEs in CISA KEV (immediate action required)
• 3 CVEs with known threat actor exploitation
• 4 CVEs with public exploits
• Average EPSS: 62.3%

**Top Affected Vendors:**
• Fortinet (3 CVEs)
• Microsoft (2 CVEs)
• Apache (2 CVEs)

**ATT&CK Coverage:**
• T1190 - Exploit Public-Facing Application (4)
• T1068 - Exploitation for Privilege Escalation (2)
• T1210 - Exploitation of Remote Services (1)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 RECOMMENDED ACTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **Immediate (24-48 hours):**
   - Patch CVE-2024-21762 (Fortinet)
   - Apply HTTP/2 mitigations for CVE-2023-44487

2. **Short-term (1 week):**
   - Prioritize remaining CISA KEV items
   - Deploy detection rules for all critical CVEs

3. **Ongoing:**
   - Monitor for new exploitation activity
   - Track patch deployment status

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Stored to Knowledge Graph: Yes
🔗 Enrichment ID: [enrichment_id]
```

## API Endpoints Used

| Service | Endpoint | Rate Limit | Auth Required |
|---------|----------|------------|---------------|
| NIST NVD | `/rest/json/cves/2.0` | 5/30s (50/30s with key) | Optional |
| CISA KEV | `/feeds/known_exploited_vulnerabilities.json` | None | No |
| FIRST EPSS | `/epss/v1/` | None | No |

## Environment Variables

```bash
# Optional but recommended for higher rate limits
PAI_CTI_NVD_API_KEY="your-nvd-api-key"
```

## Sub-Workflows

This workflow may invoke:
- **MapToFrameworks** - For ATT&CK technique mapping
- **AssessRisk** - For detailed risk assessment
- **GenerateSigma** - For detection rule generation

## Tools & APIs Used
- NIST NVD API
- CISA KEV Feed
- FIRST EPSS API
- Knowledge skill for persistence
- Browser skill for reference fetching

## Ethical Notes
- Use CVE data for defensive purposes
- Share vulnerability intelligence responsibly
- Respect disclosure timelines
- Follow coordinated vulnerability disclosure principles
