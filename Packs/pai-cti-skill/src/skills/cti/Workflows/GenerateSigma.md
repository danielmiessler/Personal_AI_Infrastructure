# Generate Sigma Rules Workflow

Create detection rules in Sigma format for SIEM and log analysis platforms.

## Trigger Phrases
- "create sigma"
- "sigma rule"
- "log detection"
- "siem rule"
- "splunk detection"
- "elastic detection"
- "detect in logs"

## Input
- `behavior`: Threat behavior or TTP to detect
- `logsource`: Target log source (optional, auto-detected)
- `level`: Alert level (optional: informational, low, medium, high, critical)
- `attack_id`: MITRE ATT&CK technique ID (optional)

## Process

### Step 1: Analyze Behavior
```
Identify detection requirements:
- What activity needs to be detected?
- What log sources would capture this?
- What fields are relevant?
- What distinguishes malicious from benign?
```

### Step 2: Select Log Source

**Windows Log Sources:**
```yaml
# Process Events
logsource:
    category: process_creation
    product: windows
# Source: Sysmon EventID 1, Security 4688

# File Events
logsource:
    category: file_event
    product: windows
# Source: Sysmon EventID 11, 23

# Network Connections
logsource:
    category: network_connection
    product: windows
# Source: Sysmon EventID 3

# Registry Events
logsource:
    category: registry_event
    product: windows
# Source: Sysmon EventID 12, 13, 14

# PowerShell
logsource:
    category: ps_script
    product: windows
# Source: PowerShell ScriptBlock Logging

# Windows Security
logsource:
    product: windows
    service: security
# Source: Windows Security Event Log

# DNS
logsource:
    category: dns_query
    product: windows
# Source: Sysmon EventID 22
```

**Linux Log Sources:**
```yaml
# Process Events
logsource:
    category: process_creation
    product: linux

# Auditd
logsource:
    product: linux
    service: auditd

# Syslog
logsource:
    product: linux
    service: syslog

# SSH
logsource:
    product: linux
    service: sshd
```

**Cloud Log Sources:**
```yaml
# AWS CloudTrail
logsource:
    product: aws
    service: cloudtrail

# Azure Activity
logsource:
    product: azure
    service: activitylogs

# GCP Audit
logsource:
    product: gcp
    service: gcp.audit

# Microsoft 365
logsource:
    product: m365
    service: threat_management
```

**Network Log Sources:**
```yaml
# Firewall
logsource:
    category: firewall

# Proxy
logsource:
    category: proxy

# DNS
logsource:
    category: dns

# Web Server
logsource:
    category: webserver
```

### Step 3: Generate Rule Structure

**Rule Template:**
```yaml
title: Descriptive Rule Title
id: 12345678-1234-1234-1234-123456789012  # UUID
status: experimental  # experimental, test, stable, deprecated
description: |
    Detailed description of what this rule detects and why it's important.
    Include context about the threat and any relevant references.
references:
    - https://attack.mitre.org/techniques/T1234/
    - https://example.com/threat-report
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
    - Security tools that use encoded commands
level: medium
```

### Step 4: Apply Detection Logic

**Field Modifiers:**
```yaml
# String operations
field|contains: value        # Substring match
field|startswith: value      # Prefix match
field|endswith: value        # Suffix match
field|re: regex              # Regular expression

# Encoding handling
field|base64: value          # Match base64 encoded
field|base64offset: value    # With offset variants
field|wide: value            # UTF-16LE encoding

# Case handling
field|contains|all:          # All values must match
    - value1
    - value2

# Numeric operations
field|gt: 100                # Greater than (Sigma 2.0)
field|gte: 100               # Greater than or equal
field|lt: 50                 # Less than
field|lte: 50                # Less than or equal

# Windows-specific
field|windash:               # Handle - or / prefix
    - '-enc'
field|cidr: 10.0.0.0/8      # CIDR range matching
```

**Condition Patterns:**
```yaml
# Simple conditions
condition: selection

# Multiple selections
condition: selection1 or selection2

# With filters
condition: selection and not filter

# Count-based
condition: selection | count() > 10

# Time-based aggregation
condition: selection | count() by SourceIP > 5 | timespan 5m

# Near operator (proximity)
condition: selection1 | near selection2
```

### Step 5: Add MITRE ATT&CK Tags

**Tag Format:**
```yaml
tags:
    # Tactics
    - attack.initial_access
    - attack.execution
    - attack.persistence
    - attack.privilege_escalation
    - attack.defense_evasion
    - attack.credential_access
    - attack.discovery
    - attack.lateral_movement
    - attack.collection
    - attack.command_and_control
    - attack.exfiltration
    - attack.impact

    # Techniques
    - attack.t1059          # Technique
    - attack.t1059.001      # Sub-technique

    # TLP
    - tlp.clear
    - tlp.green
    - tlp.amber
    - tlp.red

    # CVE
    - cve.2021.44228

    # CAR
    - car.2016-03-002
```

### Step 6: Set Alert Levels

```yaml
# Alert levels with guidance
level: informational  # Context for investigation, no direct action
level: low            # Worth noting, review during analysis
level: medium         # Should be investigated, possible threat
level: high           # Likely malicious, prioritize investigation
level: critical       # Confirmed threat, immediate response required
```

### Step 7: Validate Rule

```
Validation checks:
1. YAML syntax validation
2. Sigma schema compliance
3. Field name accuracy for log source
4. Condition logic review
5. False positive assessment
6. ATT&CK mapping accuracy
```

### Step 8: Store to Knowledge Graph

Use the **Knowledge** skill:

```
Store the following as structured episodes:

1. Sigma Rule:
   - Name: "Sigma: {rule_title}"
   - Data: Complete rule YAML, metadata
   - Group: "threat-intel-detections"
   - Relationships: detects_technique, for_logsource

2. Detection Coverage:
   - Name: "Coverage: {attack_id}"
   - Data: Rule provides coverage for technique
   - Links to ATT&CK framework

3. Rule Analytics:
   - Name: "Sigma Analytics: {rule_id}"
   - Data: FP rate, tune history, deployment status
   - Temporal tracking
```

## Output Format

```
📋 SIGMA RULE GENERATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 BEHAVIOR: [Target behavior description]
📅 GENERATED: [timestamp]
🔒 TLP: [classification]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 RULE: [rule_title]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```yaml
[Complete Sigma rule]
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RULE METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Alert Level: [level]
• ATT&CK Coverage: [techniques]
• Log Source: [category/product]
• False Positive Risk: [assessment]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 DETECTION LOGIC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This rule detects:
• [Detection point 1]
• [Detection point 2]

Filters exclude:
• [Filter 1]
• [Filter 2]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 PLATFORM CONVERSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Convert to Splunk
sigmac -t splunk rule.yml

# Convert to Elastic
sigmac -t es-qs rule.yml

# Convert to Microsoft Sentinel
sigmac -t ala rule.yml

# Convert to QRadar
sigmac -t qradar rule.yml

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Stored to Knowledge Graph: Yes
🔗 Rule ID: [sigma_rule_id]
```

## Example Rules

### PowerShell Encoded Command
```yaml
title: Suspicious PowerShell Encoded Command Execution
id: a4b2c3d4-e5f6-7890-abcd-ef1234567890
status: stable
description: |
    Detects execution of PowerShell with encoded commands,
    a common technique used by malware and adversaries to
    obfuscate malicious scripts.
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
            - '-e'
    filter_short_param:
        CommandLine|re: '-e\s+[A-Za-z0-9+/]{1,20}$'
    condition: all of selection_* and not filter_short_param

falsepositives:
    - Legitimate administrative scripts
    - Some software installers
    - Security tools
level: medium
```

### Suspicious DNS Query
```yaml
title: DNS Query to Known Malicious Domain
id: b5c6d7e8-f9a0-1234-bcde-f56789012345
status: experimental
description: |
    Detects DNS queries to domains associated with
    malware command and control infrastructure.
references:
    - https://attack.mitre.org/techniques/T1071/004/
author: PAI ThreatIntelligence
date: 2026/01/10
tags:
    - attack.command_and_control
    - attack.t1071.004
    - tlp.amber

logsource:
    category: dns_query
    product: windows

detection:
    selection:
        QueryName|endswith:
            - '.malware-c2.com'
            - '.evil-dns.net'
            - '.badactor.io'
    condition: selection

falsepositives:
    - Security research
    - Threat intelligence lookups
level: high
```

### Cloud - AWS Root Account Usage
```yaml
title: AWS Root Account Console Login
id: c6d7e8f9-0a1b-2345-cdef-678901234567
status: stable
description: |
    Detects console login using the AWS root account,
    which should rarely be used in production environments.
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
    filter_mfa:
        additionalEventData.MFAUsed: 'Yes'
    condition: selection

falsepositives:
    - Initial account setup
    - Break-glass procedures
level: high
```

## Tools & APIs Used
- Sigma rule validator
- sigmac for conversions
- Knowledge skill for persistence

## Ethical Notes
- Rules are for defensive monitoring only
- Test in non-production first
- Consider privacy implications
- Document tuning requirements
- Share responsibly (respect TLP)
