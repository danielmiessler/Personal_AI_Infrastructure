# Threat Intelligence Skill - Research Documentation

This document provides structured documentation for implementing a comprehensive Threat Intelligence (TI) skill, covering risk management frameworks, detection rule formats, intelligence sources, and confidence scoring systems.

---

## Table of Contents

1. [ISO 27001/27005 Risk Management for Threat Intelligence](#1-iso-2700127005-risk-management-for-threat-intelligence)
2. [YARA Rules](#2-yara-rules)
3. [Sigma Rules](#3-sigma-rules)
4. [Threat Intelligence Sources](#4-threat-intelligence-sources)
5. [Confidence Levels and TLP](#5-confidence-levels-and-tlp)
6. [STIX/TAXII Standards](#6-stixtaxii-standards)

---

## 1. ISO 27001/27005 Risk Management for Threat Intelligence

### 1.1 Overview

ISO 27001 establishes requirements for an Information Security Management System (ISMS), while ISO 27005 provides detailed guidance on information security risk assessment. When applied to Threat Intelligence, these frameworks enable systematic prioritization of threats based on quantified risk.

### 1.2 Risk Assessment Methodology

The ISO 27005 risk assessment process follows these phases:

1. **Context Establishment** - Define scope, criteria, and risk evaluation parameters
2. **Risk Identification** - Identify assets, threats, vulnerabilities, and existing controls
3. **Risk Analysis** - Determine likelihood and impact of identified risks
4. **Risk Evaluation** - Compare analyzed risks against acceptance criteria
5. **Risk Treatment** - Select and implement risk response options

### 1.3 Risk Scoring Formula

The fundamental risk calculation is:

```
Risk Score = Likelihood × Impact
```

For more granular scoring, use:

```
Risk Score = (Threat Probability × Vulnerability Severity × Asset Value) / Existing Controls Effectiveness
```

### 1.4 Impact and Likelihood Matrices

#### Likelihood Scale (1-5)

| Level | Label | Description | Annual Probability |
|-------|-------|-------------|-------------------|
| 1 | Rare | Highly unlikely to occur | < 5% |
| 2 | Unlikely | Could occur in exceptional circumstances | 5-20% |
| 3 | Possible | Might occur at some time | 20-50% |
| 4 | Likely | Will probably occur | 50-80% |
| 5 | Almost Certain | Expected to occur regularly | > 80% |

#### Impact Scale (1-5)

| Level | Label | Description | Business Impact |
|-------|-------|-------------|-----------------|
| 1 | Negligible | Minimal disruption | < $10K loss |
| 2 | Minor | Limited impact, easily recoverable | $10K-$100K loss |
| 3 | Moderate | Significant but manageable | $100K-$1M loss |
| 4 | Major | Severe disruption, difficult recovery | $1M-$10M loss |
| 5 | Catastrophic | Business-threatening | > $10M loss |

#### Risk Matrix (5x5)

```
                    IMPACT
         | 1 | 2 | 3 | 4 | 5 |
    -----+---+---+---+---+---+
      5  | 5 |10 |15 |20 |25 | <- Almost Certain
L     4  | 4 | 8 |12 |16 |20 | <- Likely
I     3  | 3 | 6 | 9 |12 |15 | <- Possible
K     2  | 2 | 4 | 6 | 8 |10 | <- Unlikely
E     1  | 1 | 2 | 3 | 4 | 5 | <- Rare
L
I   Risk Levels:
H     1-4:   LOW (Green)      - Accept/Monitor
O     5-9:   MEDIUM (Yellow)  - Mitigate
O     10-15: HIGH (Orange)    - Prioritize
D     16-25: CRITICAL (Red)   - Immediate Action
```

### 1.5 Threat Intelligence Risk Scoring Model

For TI-specific scoring, extend the basic model:

```typescript
interface ThreatIntelRiskScore {
  // Core risk factors
  likelihood: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;

  // TI-specific modifiers
  sourceReliability: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  informationConfidence: 1 | 2 | 3 | 4 | 5 | 6;

  // Contextual factors
  assetExposure: number;        // 0-100
  controlEffectiveness: number; // 0-100
  threatActorCapability: number; // 0-100

  // Calculated scores
  baseRisk: number;             // likelihood × impact
  adjustedRisk: number;         // with modifiers applied
  priorityScore: number;        // normalized 0-100
}
```

### 1.6 Priority Calculation for TI

```typescript
function calculateTIPriority(threat: ThreatIntelRiskScore): number {
  const reliabilityWeight = {
    'A': 1.0, 'B': 0.8, 'C': 0.6, 'D': 0.4, 'E': 0.2, 'F': 0.0
  };

  const confidenceWeight = {
    1: 1.0, 2: 0.8, 3: 0.6, 4: 0.4, 5: 0.2, 6: 0.0
  };

  const baseRisk = threat.likelihood * threat.impact;
  const reliabilityFactor = reliabilityWeight[threat.sourceReliability];
  const confidenceFactor = confidenceWeight[threat.informationConfidence];
  const exposureFactor = threat.assetExposure / 100;
  const controlFactor = 1 - (threat.controlEffectiveness / 100);

  const adjustedRisk = baseRisk * reliabilityFactor * confidenceFactor *
                       exposureFactor * controlFactor;

  // Normalize to 0-100 scale
  return Math.min(100, (adjustedRisk / 25) * 100);
}
```

---

## 2. YARA Rules

### 2.1 Overview

YARA is a pattern-matching tool for malware identification. Rules define text strings, byte sequences, or regular expressions combined with Boolean logic to detect malicious files or memory patterns.

### 2.2 Rule Structure

```yara
rule RuleName : tag1 tag2 {
    meta:
        description = "Detects specific malware family"
        author = "Analyst Name"
        date = "2024-01-15"
        reference = "https://example.com/report"
        hash = "sha256_hash_of_sample"
        score = 75

    strings:
        $text_string = "malicious_string"
        $wide_string = "unicode_string" wide
        $hex_bytes = { E8 ?? ?? ?? ?? 83 C4 }
        $regex = /[A-Za-z0-9]{32}/

    condition:
        uint16(0) == 0x5A4D and
        filesize < 1MB and
        any of ($text*, $wide*) and
        #hex_bytes > 2
}
```

### 2.3 Component Details

#### Rule Naming Convention

Follow the format: `CATEGORY_TYPE_Family_Platform_Date`

Categories:
- `MAL` - Malware
- `HKTL` - Hack tool
- `WEBSHELL` - Web shells
- `EXPL` - Exploits
- `VULN` - Vulnerabilities
- `SUSP` - Suspicious
- `PUA` - Potentially Unwanted Applications

Examples:
```
MAL_Ransomware_LockBit_Win_Jan24
HKTL_Cobalt_Strike_Beacon_x64_Feb24
WEBSHELL_PHP_Generic_Mar24
```

#### Metadata Fields

| Field | Required | Description |
|-------|----------|-------------|
| `description` | Yes | What the rule detects (start with "Detects...") |
| `author` | Yes | Creator name/organization |
| `date` | Yes | Creation date (YYYY-MM-DD) |
| `reference` | Yes | Source URL or "Internal Research" |
| `hash` | No | SHA256 of sample(s) |
| `score` | No | Severity score (0-100) |
| `modified` | No | Last modification date |
| `license` | No | SPDX license identifier |

#### Score Guidelines

| Score Range | Significance | Examples |
|-------------|--------------|----------|
| 0-39 | Very Low | Capabilities, packers |
| 40-59 | Noteworthy | Uncommon packers, PE anomalies |
| 60-79 | Suspicious | Heuristics, obfuscation, generic rules |
| 80-100 | High | Direct malware/tool matches |

### 2.4 String Types

#### Text Strings
```yara
$s1 = "CreateRemoteThread"           // ASCII
$s2 = "VirtualAllocEx" nocase        // Case-insensitive
$s3 = "kernel32.dll" wide            // UTF-16
$s4 = "MZ" ascii wide                // Both ASCII and Unicode
$s5 = "password" fullword            // Match only whole word
```

#### Hex Patterns
```yara
// Wildcards
$h1 = { E8 ?? ?? ?? ?? }              // Any byte
$h2 = { 68 [4] FF 15 }                // Exactly 4 bytes
$h3 = { 68 [2-8] FF 15 }              // 2 to 8 bytes

// Alternatives
$h4 = { 68 ( 00 | 01 | 02 ) 00 00 }   // Byte alternatives

// Jumps
$h5 = { 55 8B EC [0-100] C3 }         // Variable length gap
```

#### Regular Expressions
```yara
$r1 = /https?:\/\/[a-z0-9\-\.]+\.[a-z]{2,}/
$r2 = /[A-Fa-f0-9]{32}/               // MD5 pattern
$r3 = /cmd\.exe/i                      // Case-insensitive
```

### 2.5 Condition Syntax

```yara
condition:
    // File header checks
    uint16(0) == 0x5A4D and              // MZ header (PE)
    uint32(0) == 0x464C457F and          // ELF header

    // File size constraints
    filesize < 10MB and
    filesize > 1KB and

    // String combinations
    any of ($x*) or                      // Any string starting with $x
    all of ($s*) and                     // All strings starting with $s
    2 of ($a*, $b*) and                  // At least 2 from combined sets
    #text_string > 5 and                 // Count occurrences

    // Position checks
    $mz at 0 and                         // String at specific offset
    $sig in (0..1024) and                // String within range

    // Negation for false positive reduction
    not 1 of ($fp*)
```

### 2.6 String Categorization (Best Practice)

```yara
rule Example_Categorized {
    strings:
        // $x* - Highly specific (unique to threat)
        $x1 = "UniqueC2Domain.evil"

        // $s* - Grouped strings (significant together)
        $s1 = "VirtualProtect"
        $s2 = "WriteProcessMemory"
        $s3 = "CreateRemoteThread"

        // $a* - Pre-selection (narrows file type)
        $a1 = "MZ"

        // $fp* - False positive filters
        $fp1 = "Microsoft Corporation"

    condition:
        uint16(0) == 0x5A4D and
        $a1 and
        (1 of ($x*) or all of ($s*)) and
        not 1 of ($fp*)
}
```

### 2.7 YARA Modules

```yara
import "pe"
import "elf"
import "hash"
import "math"

rule PE_Analysis {
    condition:
        pe.is_pe and
        pe.number_of_sections > 5 and
        pe.imports("kernel32.dll", "VirtualAlloc") and
        pe.exports("DllMain") and
        hash.md5(0, filesize) == "abc123..."
}
```

---

## 3. Sigma Rules

### 3.1 Overview

Sigma is a generic signature format for SIEM systems, written in YAML. It provides platform-agnostic detection rules that can be converted to various SIEM query languages (Splunk, Elastic, Microsoft Sentinel, etc.).

### 3.2 Rule Structure

```yaml
title: Suspicious PowerShell Download Cradle
id: 3b6ab547-8ec2-4991-b9d2-2b06d8eae947
status: stable
description: Detects PowerShell download and execution patterns commonly used by malware
references:
    - https://attack.mitre.org/techniques/T1059/001/
author: Security Analyst
date: 2024/01/15
modified: 2024/02/20
tags:
    - attack.execution
    - attack.t1059.001
    - attack.defense_evasion
logsource:
    product: windows
    category: process_creation
detection:
    selection:
        CommandLine|contains|all:
            - 'powershell'
            - 'IEX'
        CommandLine|contains:
            - 'Net.WebClient'
            - 'DownloadString'
            - 'Invoke-WebRequest'
    condition: selection
falsepositives:
    - Administrative scripts
    - Software deployment tools
level: high
```

### 3.3 Metadata Fields

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Short, descriptive rule name |
| `id` | Yes | UUIDv4 for unique identification |
| `status` | Yes | `stable`, `test`, `experimental`, `deprecated`, `unsupported` |
| `description` | Yes | What the rule detects |
| `author` | Yes | Rule creator |
| `date` | Yes | Creation date (YYYY/MM/DD) |
| `references` | No | URLs to related documentation |
| `tags` | No | MITRE ATT&CK, TLP, CVE mappings |
| `modified` | No | Last modification date |
| `level` | Yes | `informational`, `low`, `medium`, `high`, `critical` |
| `falsepositives` | No | Known false positive scenarios |

### 3.4 Log Sources

#### Category-Based (Generic)

```yaml
logsource:
    category: process_creation    # Process execution events
    category: file_event          # File operations
    category: network_connection  # Network activity
    category: registry_event      # Registry modifications
    category: dns_query           # DNS lookups
    category: image_load          # DLL/module loading
    category: driver_load         # Driver loading
    category: firewall            # Firewall logs
    category: proxy               # Proxy logs
    category: webserver           # Web server logs
    category: antivirus           # AV alerts
```

#### Product/Service-Based (Specific)

```yaml
# Windows
logsource:
    product: windows
    service: security           # Security.evtx (4688, 4624, etc.)
    service: system             # System.evtx
    service: powershell         # PowerShell logs
    service: sysmon             # Sysmon events

# Linux
logsource:
    product: linux
    service: auditd             # Audit daemon
    service: syslog             # Syslog
    service: auth               # Authentication logs

# Cloud
logsource:
    product: aws
    service: cloudtrail         # AWS CloudTrail

logsource:
    product: azure
    service: activitylogs       # Azure Activity Logs
    service: signinlogs         # Azure Sign-in Logs

logsource:
    product: gcp
    service: gcp.audit          # GCP Audit Logs

# Other
logsource:
    product: okta
    service: okta               # Okta events

logsource:
    product: zeek
    service: dns                # Zeek DNS logs
    service: http               # Zeek HTTP logs
```

### 3.5 Detection Logic

#### Field Matching

```yaml
detection:
    # Exact match
    selection:
        EventID: 4688

    # Multiple values (OR)
    selection:
        EventID:
            - 4624
            - 4625
            - 4648

    # All values must match (AND within field)
    selection:
        CommandLine|contains|all:
            - 'powershell'
            - '-enc'
            - 'bypass'
```

#### Modifiers

| Modifier | Description | Example |
|----------|-------------|---------|
| `contains` | Substring match | `CommandLine|contains: 'mimikatz'` |
| `startswith` | Prefix match | `Image|startswith: 'C:\Temp'` |
| `endswith` | Suffix match | `Image|endswith: '.exe'` |
| `re` | Regex match | `CommandLine|re: '.*password.*'` |
| `base64` | Base64 decode | `CommandLine|base64|contains: 'IEX'` |
| `base64offset` | B64 with offset | `CommandLine|base64offset|contains: 'http'` |
| `utf16le` | UTF-16 LE encoding | Combined with base64 |
| `wide` | UTF-16 match | For Unicode strings |
| `all` | All values must match | Used with contains |
| `cidr` | CIDR notation | `DestinationIp|cidr: '10.0.0.0/8'` |
| `windash` | Windows dash variants | `-`, `/`, `\u2013`, `\u2014` |

#### Condition Logic

```yaml
detection:
    selection_process:
        Image|endswith: '\powershell.exe'
    selection_cmdline:
        CommandLine|contains:
            - 'IEX'
            - 'Invoke-Expression'
    filter_admin:
        User|contains: 'SYSTEM'
    filter_legit:
        CommandLine|contains: 'legitimate_script.ps1'

    # Condition combinations
    condition: selection_process and selection_cmdline
    condition: selection_process or selection_cmdline
    condition: selection_process and not filter_admin
    condition: (selection_process and selection_cmdline) and not (filter_admin or filter_legit)
    condition: 1 of selection_*                   # At least one selection
    condition: all of selection_*                 # All selections
    condition: all of selection_* and not 1 of filter_*
```

### 3.6 Alert Levels

| Level | Description | Action Required |
|-------|-------------|-----------------|
| `informational` | Compliance/baseline events | Log only |
| `low` | Suspicious but common | Review in context |
| `medium` | Notable activity | Investigate |
| `high` | Likely malicious | Priority investigation |
| `critical` | Confirmed threat indicators | Immediate response |

### 3.7 Tag Conventions

```yaml
tags:
    # MITRE ATT&CK
    - attack.initial_access
    - attack.t1566.001          # Phishing: Spearphishing Attachment
    - attack.execution
    - attack.t1059.001          # Command and Scripting: PowerShell

    # MITRE CAR
    - car.2016-04-005

    # TLP
    - tlp.white
    - tlp.green
    - tlp.amber
    - tlp.red

    # CVE
    - cve.2024.12345
```

### 3.8 Complete Example

```yaml
title: Suspicious LSASS Memory Dump via Procdump
id: 5afee48e-67dd-4f54-a4f7-1e2b6f57b1ae
status: stable
description: |
    Detects the use of procdump to dump LSASS memory, commonly used for
    credential harvesting. This technique is used by threat actors to
    extract credentials from memory.
references:
    - https://attack.mitre.org/techniques/T1003/001/
    - https://docs.microsoft.com/en-us/sysinternals/downloads/procdump
author: Security Team
date: 2024/01/15
modified: 2024/03/01
tags:
    - attack.credential_access
    - attack.t1003.001
    - tlp.green
logsource:
    category: process_creation
    product: windows
detection:
    selection_tool:
        Image|endswith:
            - '\procdump.exe'
            - '\procdump64.exe'
        OriginalFileName: 'procdump'
    selection_lsass:
        CommandLine|contains:
            - 'lsass'
            - '-ma ls'
    condition: selection_tool and selection_lsass
fields:
    - CommandLine
    - ParentCommandLine
    - User
    - Computer
falsepositives:
    - Legitimate debugging by administrators
    - Security tool memory analysis
level: critical
```

---

## 4. Threat Intelligence Sources

### 4.1 Open Source Intelligence (OSINT) Feeds

#### Primary Sources

| Source | Type | URL | Format |
|--------|------|-----|--------|
| **MISP** | Platform | https://www.misp-project.org | STIX, MISP JSON |
| **AlienVault OTX** | Community TI | https://otx.alienvault.com | Pulses, STIX |
| **VirusTotal** | Malware Analysis | https://www.virustotal.com | JSON API |
| **Shodan** | Attack Surface | https://www.shodan.io | JSON API |
| **Censys** | Internet Scan | https://censys.io | JSON API |
| **URLhaus** | Malware URLs | https://urlhaus.abuse.ch | CSV, JSON |
| **MalwareBazaar** | Malware Samples | https://bazaar.abuse.ch | JSON API |
| **ThreatFox** | IOCs | https://threatfox.abuse.ch | STIX, MISP |
| **Feodo Tracker** | C2 IPs | https://feodotracker.abuse.ch | CSV, JSON |
| **SSL Blacklist** | Malicious Certs | https://sslbl.abuse.ch | CSV |
| **SANS ISC** | Attack Trends | https://isc.sans.edu | JSON, XML |
| **Spamhaus** | Spam/Malware | https://www.spamhaus.org | DNS, API |
| **OpenPhish** | Phishing URLs | https://openphish.com | Text, JSON |
| **PhishTank** | Phishing | https://www.phishtank.com | CSV, JSON |

#### Government/ISAC Sources

| Source | Description | Access |
|--------|-------------|--------|
| **CISA AIS** | US Govt TI Sharing | STIX/TAXII |
| **US-CERT** | Alerts & Advisories | Public |
| **CIRCL** | Luxembourg CERT | MISP community |
| **InfraGard** | FBI Partnership | Membership |

### 4.2 API Integration Patterns

#### VirusTotal API

```typescript
interface VirusTotalResponse {
  data: {
    id: string;
    type: 'file' | 'url' | 'domain' | 'ip_address';
    attributes: {
      last_analysis_stats: {
        malicious: number;
        suspicious: number;
        undetected: number;
        harmless: number;
      };
      last_analysis_results: Record<string, {
        category: string;
        result: string | null;
        method: string;
        engine_name: string;
      }>;
      reputation: number;
      tags: string[];
    };
  };
}

async function checkHash(hash: string): Promise<VirusTotalResponse> {
  const response = await fetch(`https://www.virustotal.com/api/v3/files/${hash}`, {
    headers: { 'x-apikey': process.env.VT_API_KEY }
  });
  return response.json();
}
```

#### AlienVault OTX API

```typescript
interface OTXPulse {
  id: string;
  name: string;
  description: string;
  author_name: string;
  created: string;
  modified: string;
  indicators: Array<{
    indicator: string;
    type: 'IPv4' | 'domain' | 'URL' | 'FileHash-SHA256' | 'email';
    created: string;
    is_active: boolean;
  }>;
  tags: string[];
  targeted_countries: string[];
  malware_families: string[];
  attack_ids: Array<{
    id: string;
    name: string;
    display_name: string;
  }>;
}

async function getPulse(pulseId: string): Promise<OTXPulse> {
  const response = await fetch(
    `https://otx.alienvault.com/api/v1/pulses/${pulseId}`,
    { headers: { 'X-OTX-API-KEY': process.env.OTX_API_KEY } }
  );
  return response.json();
}
```

#### Shodan API

```typescript
interface ShodanHost {
  ip_str: string;
  ports: number[];
  hostnames: string[];
  org: string;
  isp: string;
  asn: string;
  country_code: string;
  vulns?: string[];
  data: Array<{
    port: number;
    transport: string;
    product?: string;
    version?: string;
    cpe?: string[];
  }>;
  tags?: string[];
}

async function lookupIP(ip: string): Promise<ShodanHost> {
  const response = await fetch(
    `https://api.shodan.io/shodan/host/${ip}?key=${process.env.SHODAN_API_KEY}`
  );
  return response.json();
}
```

### 4.3 IOC Types and Normalization

```typescript
enum IOCType {
  // Network
  IPv4 = 'ipv4',
  IPv6 = 'ipv6',
  Domain = 'domain',
  URL = 'url',
  Email = 'email',

  // File
  MD5 = 'md5',
  SHA1 = 'sha1',
  SHA256 = 'sha256',
  SHA512 = 'sha512',
  SSDEEP = 'ssdeep',
  IMPHASH = 'imphash',

  // Other
  CVE = 'cve',
  YARA = 'yara',
  Sigma = 'sigma',
  JA3 = 'ja3',
  JA3S = 'ja3s',
  JARM = 'jarm',
}

interface NormalizedIOC {
  value: string;
  type: IOCType;
  confidence: number;
  tlp: TLPLevel;
  firstSeen: Date;
  lastSeen: Date;
  sources: string[];
  tags: string[];
  relatedIOCs: string[];
  context: Record<string, unknown>;
}

function normalizeIOC(raw: string, type: IOCType): string {
  switch (type) {
    case IOCType.IPv4:
    case IOCType.IPv6:
      return raw.trim().toLowerCase();
    case IOCType.Domain:
      return raw.trim().toLowerCase().replace(/^www\./, '');
    case IOCType.URL:
      return raw.trim().toLowerCase();
    case IOCType.MD5:
    case IOCType.SHA1:
    case IOCType.SHA256:
    case IOCType.SHA512:
      return raw.trim().toLowerCase();
    case IOCType.Email:
      return raw.trim().toLowerCase();
    default:
      return raw.trim();
  }
}
```

---

## 5. Confidence Levels and TLP

### 5.1 Traffic Light Protocol (TLP) v2.0

TLP is the standard for information sharing boundaries, maintained by FIRST.org.

#### TLP Levels

| Level | Color Code | Sharing Boundary |
|-------|------------|------------------|
| **TLP:RED** | `#FF2B2B` | Individual recipients only, no further disclosure |
| **TLP:AMBER+STRICT** | `#FFC000` | Organization only, no clients |
| **TLP:AMBER** | `#FFC000` | Organization and clients on need-to-know basis |
| **TLP:GREEN** | `#33FF00` | Community sharing, not public |
| **TLP:CLEAR** | `#FFFFFF` | No restrictions, public disclosure allowed |

#### TLP Implementation

```typescript
enum TLPLevel {
  RED = 'TLP:RED',
  AMBER_STRICT = 'TLP:AMBER+STRICT',
  AMBER = 'TLP:AMBER',
  GREEN = 'TLP:GREEN',
  CLEAR = 'TLP:CLEAR',
}

interface TLPColors {
  font: string;
  background: string;
}

const TLP_COLORS: Record<TLPLevel, TLPColors> = {
  [TLPLevel.RED]: { font: '#FF2B2B', background: '#000000' },
  [TLPLevel.AMBER_STRICT]: { font: '#FFC000', background: '#000000' },
  [TLPLevel.AMBER]: { font: '#FFC000', background: '#000000' },
  [TLPLevel.GREEN]: { font: '#33FF00', background: '#000000' },
  [TLPLevel.CLEAR]: { font: '#FFFFFF', background: '#000000' },
};

function canShare(tlp: TLPLevel, audience: 'individual' | 'org' | 'client' | 'community' | 'public'): boolean {
  switch (tlp) {
    case TLPLevel.RED:
      return audience === 'individual';
    case TLPLevel.AMBER_STRICT:
      return audience === 'individual' || audience === 'org';
    case TLPLevel.AMBER:
      return audience !== 'community' && audience !== 'public';
    case TLPLevel.GREEN:
      return audience !== 'public';
    case TLPLevel.CLEAR:
      return true;
    default:
      return false;
  }
}
```

### 5.2 NATO Admiralty Code (Source Reliability & Information Credibility)

The Admiralty System provides a two-character rating combining source reliability and information credibility.

#### Source Reliability Scale

| Code | Label | Description |
|------|-------|-------------|
| **A** | Completely Reliable | Trusted source with proven track record |
| **B** | Usually Reliable | Generally accurate, minor past discrepancies |
| **C** | Fairly Reliable | Used successfully in the past |
| **D** | Not Usually Reliable | Significant past inaccuracies |
| **E** | Unreliable | New or untested source |
| **F** | Cannot Be Judged | No basis for evaluation |

#### Information Credibility Scale

| Code | Label | Description |
|------|-------|-------------|
| **1** | Confirmed | Verified by multiple independent sources |
| **2** | Probably True | Logical, consistent with known facts |
| **3** | Possibly True | Plausible but not verified |
| **4** | Doubtfully True | Possible but improbable |
| **5** | Improbable | Contradicts known facts |
| **6** | Cannot Be Judged | No basis for evaluation |

#### Combined Rating Examples

| Rating | Interpretation |
|--------|---------------|
| A1 | Highly reliable source, confirmed information |
| B2 | Usually reliable source, probably true information |
| C3 | Fairly reliable source, possibly true information |
| E5 | Unreliable source, improbable information |
| F6 | Unknown source, cannot judge information |

### 5.3 Confidence Scoring Implementation

```typescript
interface ConfidenceScore {
  // Admiralty Code
  sourceReliability: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  informationCredibility: 1 | 2 | 3 | 4 | 5 | 6;
  admiraltyCode: string;  // e.g., "B2"

  // Numeric Confidence (0-100)
  numericConfidence: number;

  // Descriptive Level
  level: 'confirmed' | 'high' | 'medium' | 'low' | 'unknown';
}

function calculateConfidenceScore(
  reliability: 'A' | 'B' | 'C' | 'D' | 'E' | 'F',
  credibility: 1 | 2 | 3 | 4 | 5 | 6
): ConfidenceScore {
  const reliabilityScores = { A: 100, B: 80, C: 60, D: 40, E: 20, F: 0 };
  const credibilityScores = { 1: 100, 2: 80, 3: 60, 4: 40, 5: 20, 6: 0 };

  const numericConfidence = Math.round(
    (reliabilityScores[reliability] + credibilityScores[credibility]) / 2
  );

  let level: ConfidenceScore['level'];
  if (numericConfidence >= 90) level = 'confirmed';
  else if (numericConfidence >= 70) level = 'high';
  else if (numericConfidence >= 50) level = 'medium';
  else if (numericConfidence >= 20) level = 'low';
  else level = 'unknown';

  return {
    sourceReliability: reliability,
    informationCredibility: credibility,
    admiraltyCode: `${reliability}${credibility}`,
    numericConfidence,
    level,
  };
}
```

### 5.4 Objective Confidence Scale (Alternative)

For teams preferring objective over subjective assessment:

| Level | Label | Description |
|-------|-------|-------------|
| 0 | Cannot be judged | No data on credibility |
| 25 | Told | Information relayed, not verified |
| 50 | Induced | Inferred from similar patterns |
| 75 | Deduced | Logical conclusion from verified data |
| 100 | Witnessed | Directly observed by source |

```typescript
type ObjectiveConfidence = 0 | 25 | 50 | 75 | 100;

interface ObjectiveConfidenceLevel {
  value: ObjectiveConfidence;
  label: 'cannot_be_judged' | 'told' | 'induced' | 'deduced' | 'witnessed';
  description: string;
}

const OBJECTIVE_LEVELS: ObjectiveConfidenceLevel[] = [
  { value: 0, label: 'cannot_be_judged', description: 'No data regarding credibility' },
  { value: 25, label: 'told', description: 'Information told to source, not verified' },
  { value: 50, label: 'induced', description: 'Inferred from similar information' },
  { value: 75, label: 'deduced', description: 'Logical conclusion from verified data' },
  { value: 100, label: 'witnessed', description: 'Directly observed by source' },
];
```

---

## 6. STIX/TAXII Standards

### 6.1 STIX 2.1 Overview

Structured Threat Information Expression (STIX) is a standardized JSON-based language for expressing cyber threat intelligence.

#### STIX Domain Objects (SDOs)

| Object | Description |
|--------|-------------|
| **Attack Pattern** | TTP describing attack methods |
| **Campaign** | Set of adversarial activities |
| **Course of Action** | Recommended response/mitigation |
| **Grouping** | Context assertion for related objects |
| **Identity** | Individuals, organizations, groups |
| **Indicator** | Pattern for detecting threats |
| **Infrastructure** | Systems supporting attacks |
| **Intrusion Set** | Adversarial behaviors/resources |
| **Location** | Geographic location |
| **Malware** | Malicious code/software |
| **Malware Analysis** | Analysis results |
| **Note** | Additional context |
| **Observed Data** | Raw observations |
| **Opinion** | Assessment of STIX object |
| **Report** | Threat intelligence collection |
| **Threat Actor** | Individuals/groups with malicious intent |
| **Tool** | Legitimate software used maliciously |
| **Vulnerability** | Exploitable weakness |

#### STIX Relationship Objects (SROs)

| Object | Description |
|--------|-------------|
| **Relationship** | Links two SDOs/SCOs |
| **Sighting** | Belief that something was seen |

### 6.2 STIX Object Structure

```typescript
interface STIXObject {
  type: string;
  spec_version: '2.1';
  id: string;  // Format: "type--uuid"
  created: string;  // ISO 8601
  modified: string;
  created_by_ref?: string;
  revoked?: boolean;
  labels?: string[];
  confidence?: number;
  lang?: string;
  external_references?: ExternalReference[];
  object_marking_refs?: string[];
  granular_markings?: GranularMarking[];
}

interface ExternalReference {
  source_name: string;
  description?: string;
  url?: string;
  hashes?: Record<string, string>;
  external_id?: string;
}

// Example: Indicator
interface STIXIndicator extends STIXObject {
  type: 'indicator';
  name?: string;
  description?: string;
  indicator_types?: string[];
  pattern: string;
  pattern_type: 'stix' | 'pcre' | 'sigma' | 'snort' | 'suricata' | 'yara';
  pattern_version?: string;
  valid_from: string;
  valid_until?: string;
  kill_chain_phases?: KillChainPhase[];
}

// Example: Malware
interface STIXMalware extends STIXObject {
  type: 'malware';
  name: string;
  description?: string;
  malware_types: string[];
  is_family: boolean;
  aliases?: string[];
  kill_chain_phases?: KillChainPhase[];
  first_seen?: string;
  last_seen?: string;
  operating_system_refs?: string[];
  architecture_execution_envs?: string[];
  implementation_languages?: string[];
  capabilities?: string[];
  sample_refs?: string[];
}
```

### 6.3 STIX Patterns

```
// IP Address
[ipv4-addr:value = '198.51.100.0/24']

// Domain
[domain-name:value = 'malicious.example.com']

// File Hash
[file:hashes.'SHA-256' = 'abc123...']

// URL
[url:value = 'http://malicious.example.com/malware']

// Combined with AND
[file:name = 'malware.exe' AND file:hashes.'MD5' = 'abc123...']

// Observation window
[file:name = 'malware.exe'] REPEATS 5 TIMES WITHIN 10 MINUTES

// Negation
[process:name != 'explorer.exe']

// Regular expression
[file:name MATCHES '^.*\\.exe$']
```

### 6.4 TAXII 2.1 Overview

Trusted Automated Exchange of Intelligence Information (TAXII) is an application protocol for exchanging STIX data over HTTPS.

#### TAXII Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/taxii2/` | GET | Discovery endpoint |
| `/taxii2/collections/` | GET | List collections |
| `/taxii2/collections/{id}/` | GET | Get collection info |
| `/taxii2/collections/{id}/objects/` | GET | Get objects from collection |
| `/taxii2/collections/{id}/objects/` | POST | Add objects to collection |
| `/taxii2/collections/{id}/manifest/` | GET | Get object manifests |

#### TAXII Client Example

```typescript
interface TAXIICollection {
  id: string;
  title: string;
  description?: string;
  can_read: boolean;
  can_write: boolean;
  media_types?: string[];
}

interface TAXIIEnvelope {
  more?: boolean;
  next?: string;
  objects?: STIXObject[];
}

class TAXIIClient {
  constructor(
    private baseUrl: string,
    private username: string,
    private password: string
  ) {}

  private async request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Accept': 'application/taxii+json;version=2.1',
        'Content-Type': 'application/taxii+json;version=2.1',
        'Authorization': `Basic ${btoa(`${this.username}:${this.password}`)}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.json();
  }

  async getCollections(): Promise<TAXIICollection[]> {
    const response = await this.request<{ collections: TAXIICollection[] }>(
      '/taxii2/collections/'
    );
    return response.collections;
  }

  async getObjects(collectionId: string, options?: {
    addedAfter?: string;
    types?: string[];
    limit?: number;
  }): Promise<TAXIIEnvelope> {
    const params = new URLSearchParams();
    if (options?.addedAfter) params.set('added_after', options.addedAfter);
    if (options?.types) params.set('match[type]', options.types.join(','));
    if (options?.limit) params.set('limit', options.limit.toString());

    return this.request<TAXIIEnvelope>(
      `/taxii2/collections/${collectionId}/objects/?${params}`
    );
  }

  async addObjects(collectionId: string, objects: STIXObject[]): Promise<void> {
    await this.request(
      `/taxii2/collections/${collectionId}/objects/`,
      'POST',
      { objects }
    );
  }
}
```

---

## Implementation Checklist

### Core Components

- [ ] Risk scoring engine with ISO 27005 methodology
- [ ] YARA rule parser and generator
- [ ] Sigma rule parser and SIEM converter
- [ ] TLP handling and enforcement
- [ ] Confidence scoring (Admiralty + Numeric)
- [ ] STIX 2.1 object model
- [ ] TAXII 2.1 client

### Data Sources Integration

- [ ] VirusTotal API client
- [ ] AlienVault OTX integration
- [ ] Shodan/Censys lookups
- [ ] abuse.ch feeds (URLhaus, MalwareBazaar, etc.)
- [ ] MISP feed consumption
- [ ] CISA AIS integration

### IOC Management

- [ ] IOC type detection and validation
- [ ] Normalization pipeline
- [ ] Deduplication logic
- [ ] Enrichment workflow
- [ ] Aging and decay rules

### Output Formats

- [ ] STIX 2.1 bundle generation
- [ ] YARA rule generation from IOCs
- [ ] Sigma rule generation from behaviors
- [ ] CSV/JSON export for SIEM ingestion
- [ ] Human-readable reports

---

## References

1. [ISO/IEC 27001:2022](https://www.iso.org/standard/27001)
2. [ISO/IEC 27005:2022](https://www.iso.org/standard/80585.html)
3. [YARA Documentation](https://yara.readthedocs.io/)
4. [Neo23x0 YARA Style Guide](https://github.com/Neo23x0/YARA-Style-Guide)
5. [Sigma HQ Documentation](https://sigmahq.io/docs/)
6. [FIRST TLP v2.0](https://www.first.org/tlp/)
7. [STIX 2.1 Specification](https://oasis-open.github.io/cti-documentation/)
8. [TAXII 2.1 Specification](https://docs.oasis-open.org/cti/taxii/v2.1/)
9. [NATO Admiralty Code](https://en.wikipedia.org/wiki/Admiralty_code)
10. [OpenCTI Reliability and Confidence](https://docs.opencti.io/latest/usage/reliability-confidence/)
