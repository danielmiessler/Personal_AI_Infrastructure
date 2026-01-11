# Detection Workflows

> Workflows for generating detection rules

---

## GenerateYara

Create YARA detection rules for threat hunting and malware detection.

### Trigger Phrases

- "create yara"
- "yara rule"
- "generate yara"
- "detection rule for"
- "malware signature"
- "yara detection"

### Input Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `target` | Yes | Malware sample info, IoCs, or behavior description |
| `name` | No | Rule name (auto-generated if not provided) |
| `severity` | No | Rule severity score (0-100) |
| `context` | No | Additional context for rule generation |

### YARA Rule Structure

```yara
rule RULE_NAME : tag1 tag2
{
    meta:
        description = "Description of what this rule detects"
        author = "PAI ThreatIntelligence"
        date = "2026-01-10"
        version = "1.0"
        reference = "Source reference URL"
        hash = "Sample hash if applicable"
        tlp = "TLP:CLEAR"
        mitre_attack = "T1234"
        severity = 80

    strings:
        // Highly specific strings ($x)
        $x1 = "unique_malware_string" ascii

        // Grouped strings ($s)
        $s1 = "CreateRemoteThread" ascii
        $s2 = "VirtualAllocEx" ascii

        // Anti-FP strings ($fp)
        $fp1 = "Microsoft Corporation" ascii

    condition:
        uint16(0) == 0x5A4D and
        filesize < 5MB and
        (
            any of ($x*) or
            (2 of ($s*) and not any of ($fp*))
        )
}
```

### Naming Convention

```
CATEGORY_TYPE_Family_Platform_Date

Categories:
- MAL_    : Malware
- HKTL_   : Hacking tool
- WEBSHELL_: Web shell
- EXPL_   : Exploit
- VULN_   : Vulnerable software
- SUSP_   : Suspicious activity
- PUA_    : Potentially unwanted application

Examples:
- MAL_Ransomware_LockBit_Win_2024
- HKTL_Mimikatz_x64_Any
- SUSP_PowerShell_Encoded_Command
```

### String Modifiers

| Modifier | Description |
|----------|-------------|
| `ascii` | Match ASCII strings |
| `wide` | Match Unicode (UTF-16LE) |
| `nocase` | Case insensitive |
| `fullword` | Match complete word only |
| `base64` | Match base64 encoded |
| `xor` | Match XOR encoded (0x00-0xFF) |

### Condition Patterns

```yara
// File type checks
uint16(0) == 0x5A4D           // PE file (MZ header)
uint32(0) == 0x464c457f       // ELF file
uint32(0) == 0xfeedface       // Mach-O 32-bit
uint32(0) == 0xfeedfacf       // Mach-O 64-bit

// Size constraints
filesize < 10MB
filesize > 1KB

// String counting
#str > 5                       // More than 5 matches
@str[1] < 100                  // First match within 100 bytes

// PE-specific (requires pe module)
pe.imphash() == "hash"
pe.exports("function")
pe.number_of_sections > 5
```

### YARA Modules

```yara
import "pe"      // PE file analysis
import "elf"     // ELF file analysis
import "hash"    // Hash calculations
import "math"    // Mathematical operations
import "dotnet"  // .NET assembly analysis
import "magic"   // File magic detection
```

### Severity Scoring

| Score | Severity | Description | FP Risk |
|-------|----------|-------------|---------|
| 80-100 | High | Strong indicators | Low |
| 50-79 | Medium | Good indicators | Medium |
| 30-49 | Low | Weak indicators | Higher |
| 0-29 | Info | Informational | High |

### String Categorization

| Prefix | Purpose |
|--------|---------|
| `$x*` | Highly specific (unique to this threat) |
| `$s*` | Grouped strings (need combinations) |
| `$a*` | Pre-selection strings (narrow search space) |
| `$fp*` | False positive filters (exclude benign) |

### Output Format

```
YARA RULE GENERATION
========================================

TARGET: [Threat/sample identifier]
GENERATED: [Timestamp]
TLP: [Classification]

RULE: [rule_name]
----------------------------------------

[Complete YARA rule]

RULE METRICS
----------------------------------------
* Severity Score: [X]/100
* Confidence: [High/Medium/Low]
* False Positive Risk: [Low/Medium/High]
* ATT&CK Coverage: [techniques covered]

DETECTION LOGIC
----------------------------------------
This rule detects:
* [Detection point 1]
* [Detection point 2]
* [Detection point 3]

LIMITATIONS
----------------------------------------
* [Limitation 1]
* [Limitation 2]

USAGE
----------------------------------------
# Scan single file
yara [rule_file] [target_file]

# Scan directory recursively
yara -r [rule_file] [target_dir]

# With module dependencies
yara -m [rule_file] [target]
```

### Example Rules

**Ransomware Detection:**
```yara
rule MAL_Ransomware_Generic_Indicators
{
    meta:
        description = "Detects generic ransomware indicators"
        author = "PAI ThreatIntelligence"
        severity = 85

    strings:
        $ransom1 = "Your files have been encrypted" nocase
        $ransom2 = "Bitcoin" nocase
        $ransom3 = ".onion" ascii
        $ext1 = ".locked" ascii
        $ext2 = ".encrypted" ascii
        $api1 = "CryptEncrypt" ascii
        $api2 = "CryptGenKey" ascii

    condition:
        uint16(0) == 0x5A4D and
        (
            (1 of ($ransom*) and 1 of ($ext*)) or
            (2 of ($api*) and 1 of ($ransom*))
        )
}
```

**Webshell Detection:**
```yara
rule WEBSHELL_PHP_Generic
{
    meta:
        description = "Detects PHP webshells"
        author = "PAI ThreatIntelligence"
        severity = 80

    strings:
        $php = "<?php" nocase
        $func1 = "eval(" nocase
        $func2 = "base64_decode(" nocase
        $func3 = "shell_exec(" nocase
        $func4 = "system(" nocase
        $obf1 = "str_rot13(" nocase
        $obf2 = "gzinflate(" nocase

    condition:
        $php and
        ((2 of ($func*) and 1 of ($obf*)) or (3 of ($func*)))
}
```

### Example Usage

```
User: "Create YARA rule for this malware hash"
       Hash: abc123...
       Context: Emotet loader

User: "Generate YARA detection for PowerShell encoded commands"

User: "Create a ransomware detection rule"
       Behavior: Encrypts files, drops ransom note, contacts .onion site
```

---

## GenerateSigma

Create Sigma detection rules for SIEM and log analysis platforms.

### Trigger Phrases

- "create sigma"
- "sigma rule"
- "log detection"
- "siem rule"
- "splunk detection"
- "elastic detection"
- "detect in logs"

### Input Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `behavior` | Yes | Threat behavior or TTP to detect |
| `logsource` | No | Target log source (auto-detected) |
| `level` | No | Alert level: `informational`, `low`, `medium`, `high`, `critical` |
| `attack_id` | No | MITRE ATT&CK technique ID |

### Sigma Rule Structure

```yaml
title: Descriptive Rule Title
id: 12345678-1234-1234-1234-123456789012
status: experimental  # experimental, test, stable, deprecated
description: |
    Detailed description of what this rule detects.
references:
    - https://attack.mitre.org/techniques/T1234/
author: PAI ThreatIntelligence
date: 2026/01/10
modified: 2026/01/10
tags:
    - attack.execution
    - attack.t1059.001
    - tlp.clear

logsource:
    category: process_creation
    product: windows

detection:
    selection:
        CommandLine|contains:
            - '-encoded'
            - '-enc'
    filter_legitimate:
        ParentImage|endswith:
            - '\legitimate_app.exe'
    condition: selection and not filter_legitimate

falsepositives:
    - Legitimate administrative scripts
level: medium
```

### Log Sources

#### Windows

| Category | Description | Event Source |
|----------|-------------|--------------|
| `process_creation` | Process events | Sysmon 1, Security 4688 |
| `file_event` | File events | Sysmon 11, 23 |
| `network_connection` | Network events | Sysmon 3 |
| `registry_event` | Registry events | Sysmon 12, 13, 14 |
| `ps_script` | PowerShell | Script Block Logging |
| `dns_query` | DNS queries | Sysmon 22 |

#### Linux

| Category | Description |
|----------|-------------|
| `process_creation` | Process events |
| `auditd` | Audit daemon logs |
| `syslog` | System logs |
| `sshd` | SSH daemon logs |

#### Cloud

| Product | Service | Description |
|---------|---------|-------------|
| `aws` | `cloudtrail` | AWS CloudTrail |
| `azure` | `activitylogs` | Azure Activity |
| `gcp` | `gcp.audit` | GCP Audit |
| `m365` | `threat_management` | Microsoft 365 |

### Field Modifiers

| Modifier | Description |
|----------|-------------|
| `contains` | Substring match |
| `startswith` | Prefix match |
| `endswith` | Suffix match |
| `re` | Regular expression |
| `base64` | Match base64 encoded |
| `wide` | UTF-16LE encoding |
| `all` | All values must match |
| `windash` | Handle `-` or `/` prefix |
| `cidr` | CIDR range matching |

### Condition Patterns

```yaml
# Simple
condition: selection

# Multiple selections
condition: selection1 or selection2

# With filters
condition: selection and not filter

# Count-based
condition: selection | count() > 10

# Time-based aggregation
condition: selection | count() by SourceIP > 5 | timespan 5m
```

### Alert Levels

| Level | Description | Action |
|-------|-------------|--------|
| `informational` | Context for investigation | Review during analysis |
| `low` | Worth noting | Review during analysis |
| `medium` | Should be investigated | Investigate |
| `high` | Likely malicious | Prioritize |
| `critical` | Confirmed threat | Immediate response |

### MITRE ATT&CK Tags

```yaml
tags:
    # Tactics
    - attack.initial_access
    - attack.execution
    - attack.persistence

    # Techniques
    - attack.t1059.001      # Sub-technique
    - attack.t1566          # Technique

    # TLP
    - tlp.clear

    # CVE
    - cve.2021.44228
```

### Output Format

```
SIGMA RULE GENERATION
========================================

BEHAVIOR: [Target behavior description]
GENERATED: [Timestamp]
TLP: [Classification]

RULE: [rule_title]
----------------------------------------

[Complete Sigma rule YAML]

RULE METRICS
----------------------------------------
* Alert Level: [level]
* ATT&CK Coverage: [techniques]
* Log Source: [category/product]
* False Positive Risk: [assessment]

DETECTION LOGIC
----------------------------------------
This rule detects:
* [Detection point 1]
* [Detection point 2]

Filters exclude:
* [Filter 1]
* [Filter 2]

PLATFORM CONVERSION
----------------------------------------
# Convert using sigma-cli (install via: pip install sigma-cli)

# Convert to Splunk
sigma convert -t splunk rule.yml

# Convert to Elastic
sigma convert -t elasticsearch rule.yml

# Convert to Microsoft Sentinel (KQL)
sigma convert -t microsoft365defender rule.yml

# List all available backends
sigma list backends
```

### Example Rules

**PowerShell Encoded Command:**
```yaml
title: Suspicious PowerShell Encoded Command Execution
id: a4b2c3d4-e5f6-7890-abcd-ef1234567890
status: stable
description: |
    Detects execution of PowerShell with encoded commands,
    commonly used by malware for obfuscation.
references:
    - https://attack.mitre.org/techniques/T1059/001/
author: PAI ThreatIntelligence
date: 2026/01/10
tags:
    - attack.execution
    - attack.t1059.001
    - tlp.clear

logsource:
    category: process_creation
    product: windows

detection:
    selection_powershell:
        Image|endswith:
            - '\powershell.exe'
            - '\pwsh.exe'
    selection_encoded:
        CommandLine|contains|windash:
            - '-encodedcommand'
            - '-enc'
    condition: all of selection_*

falsepositives:
    - Legitimate administrative scripts
    - Some software installers
level: medium
```

**AWS Root Account Login:**
```yaml
title: AWS Root Account Console Login
id: c6d7e8f9-0a1b-2345-cdef-678901234567
status: stable
description: |
    Detects console login using the AWS root account,
    which should rarely be used in production.
references:
    - https://attack.mitre.org/techniques/T1078/004/
author: PAI ThreatIntelligence
date: 2026/01/10
tags:
    - attack.persistence
    - attack.t1078.004
    - tlp.clear

logsource:
    product: aws
    service: cloudtrail

detection:
    selection:
        eventName: ConsoleLogin
        userIdentity.type: Root
    condition: selection

falsepositives:
    - Initial account setup
    - Break-glass procedures
level: high
```

### Example Usage

```
User: "Create Sigma rule for detecting encoded PowerShell"
       Platform: Windows
       Log source: Sysmon

User: "Generate SIEM detection for lateral movement via RDP"

User: "Create Splunk detection rule for AWS unauthorized API calls"
       Technique: T1078.004
       Level: high
```

---

## See Also

- [YARA Documentation](https://yara.readthedocs.io/)
- [Sigma GitHub Repository](https://github.com/SigmaHQ/sigma)
- [MITRE ATT&CK](https://attack.mitre.org/)
