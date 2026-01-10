# Map to Frameworks Workflow

Align threat intelligence to industry frameworks: MITRE ATT&CK, Cyber Kill Chain, and Diamond Model.

## Trigger Phrases
- "map to att&ck"
- "mitre mapping"
- "kill chain phase"
- "diamond model analysis"
- "framework alignment"
- "ttp mapping"

## Input
- `intelligence`: Threat data, TTPs, or behaviors to map
- `frameworks` (optional): Specific frameworks (default: all)
- `depth` (optional): Mapping depth - technique or sub-technique (default: sub-technique)

## Process

### Step 1: Parse Threat Data
```
Extract mappable elements:
- Attack techniques and behaviors
- Tools and malware used
- Infrastructure patterns
- Adversary characteristics
- Victim information
- Timeline data
```

### Step 2: Map to MITRE ATT&CK

**Tactic Identification:**
```
Analyze behavior and determine goal:

TA0043 Reconnaissance - Information gathering about target
TA0042 Resource Development - Establishing attack resources
TA0001 Initial Access - Getting into the network
TA0002 Execution - Running malicious code
TA0003 Persistence - Maintaining access
TA0004 Privilege Escalation - Getting higher permissions
TA0005 Defense Evasion - Avoiding detection
TA0006 Credential Access - Stealing credentials
TA0007 Discovery - Learning the environment
TA0008 Lateral Movement - Moving through network
TA0009 Collection - Gathering target data
TA0011 Command and Control - Remote communication
TA0010 Exfiltration - Stealing data out
TA0040 Impact - Disruption or destruction
```

**Technique Mapping Process:**
```
1. Identify the specific method used
2. Search ATT&CK for matching technique
3. Determine if sub-technique applies
4. Assess confidence level
5. Document evidence/rationale
```

**Common Mappings:**
```yaml
Phishing Email:
  - T1566 Phishing
  - T1566.001 Spearphishing Attachment
  - T1566.002 Spearphishing Link
  - T1566.003 Spearphishing via Service

PowerShell:
  - T1059.001 PowerShell

Registry Persistence:
  - T1547.001 Registry Run Keys

Scheduled Task:
  - T1053.005 Scheduled Task

Credential Dumping:
  - T1003 OS Credential Dumping
  - T1003.001 LSASS Memory

Lateral Movement via RDP:
  - T1021.001 Remote Desktop Protocol

Data Exfiltration:
  - T1041 Exfiltration Over C2 Channel
  - T1048 Exfiltration Over Alternative Protocol
```

**Output Format:**
```json
{
  "attack_mappings": [
    {
      "technique_id": "T1566.001",
      "technique_name": "Spearphishing Attachment",
      "tactic": "Initial Access",
      "confidence": "high",
      "evidence": "Malicious document delivered via email",
      "related_software": ["S0001"],
      "related_groups": ["G0001"]
    }
  ]
}
```

### Step 3: Map to Cyber Kill Chain

**Phase Mapping:**
```
Analyze activity timeline and categorize:

Phase 1 - Reconnaissance:
  - Target research
  - Email harvesting
  - Social engineering prep
  - Network scanning

Phase 2 - Weaponization:
  - Exploit development
  - Payload creation
  - Dropper development
  - (Usually attacker-side, not always visible)

Phase 3 - Delivery:
  - Phishing emails
  - Watering hole attacks
  - USB drops
  - Supply chain compromise

Phase 4 - Exploitation:
  - Vulnerability exploitation
  - Social engineering success
  - Code execution

Phase 5 - Installation:
  - Malware installation
  - Backdoor placement
  - Persistence establishment

Phase 6 - Command & Control:
  - C2 communication
  - Beacon activity
  - Remote access

Phase 7 - Actions on Objectives:
  - Data theft
  - Ransomware deployment
  - Sabotage
  - Espionage
```

**Defensive Opportunities:**
```yaml
Phase 1 - Reconnaissance:
  - Monitor for scanning activity
  - Track information disclosure
  - Honeypots and deception

Phase 2 - Weaponization:
  - Threat intelligence sharing
  - (Limited visibility)

Phase 3 - Delivery:
  - Email filtering
  - Web proxies
  - USB controls
  - User awareness

Phase 4 - Exploitation:
  - Patch management
  - Exploit mitigation (DEP, ASLR)
  - Application whitelisting

Phase 5 - Installation:
  - Endpoint detection
  - Integrity monitoring
  - Application control

Phase 6 - Command & Control:
  - Network monitoring
  - DNS filtering
  - Egress filtering
  - Protocol analysis

Phase 7 - Actions on Objectives:
  - Data loss prevention
  - User behavior analytics
  - Incident response
```

**Output Format:**
```json
{
  "kill_chain_mapping": {
    "primary_phase": 3,
    "primary_phase_name": "Delivery",
    "phases_observed": [3, 4, 5, 6],
    "phase_details": {
      "3": {
        "activities": ["Spearphishing email with malicious attachment"],
        "defensive_opportunity": "Email security gateway, user training"
      },
      "4": {
        "activities": ["Macro exploitation in document"],
        "defensive_opportunity": "Disable macros, application sandboxing"
      }
    },
    "disruption_recommendation": "Focus on Phase 3 (Delivery) - email security"
  }
}
```

### Step 4: Apply Diamond Model

**Feature Extraction:**
```
ADVERSARY:
- Known threat actor name/alias
- Attribution confidence
- Type (nation-state, criminal, hacktivist)
- Motivation
- Historical activity

CAPABILITY:
- Malware used
- Exploits leveraged
- Tools employed
- Sophistication level
- Custom vs commodity

INFRASTRUCTURE:
- Domains
- IP addresses
- Email addresses
- Hosting providers
- C2 servers
- Proxy/VPN services

VICTIM:
- Target organization(s)
- Target sector/industry
- Geographic location
- Specific systems targeted
```

**Meta-Feature Analysis:**
```yaml
Timestamp:
  - When did events occur?
  - Duration of activity
  - Time zone patterns

Phase:
  - Kill chain phase
  - Attack progression

Result:
  - Success
  - Failure
  - Unknown
  - Partial

Direction:
  - Adversary → Infrastructure
  - Infrastructure → Victim
  - Bidirectional (C2)

Methodology:
  - Spearphishing
  - Watering hole
  - Supply chain
  - Insider threat

Resources:
  - Financial investment
  - Time investment
  - Personnel involved
  - External services

Social-Political:
  - Geopolitical context
  - Economic factors
  - Ideological motivation
```

**Pivoting Analysis:**
```
From ADVERSARY, find related:
- Other campaigns by same actor
- Known infrastructure
- Typical capabilities

From CAPABILITY, find related:
- Other actors using same tools
- Historical victims
- Detection signatures

From INFRASTRUCTURE, find related:
- Other domains on same IP
- Registration patterns
- Hosting relationships

From VICTIM, find related:
- Other attacks on same sector
- Related organizations
- Common vulnerabilities
```

**Output Format:**
```json
{
  "diamond_model": {
    "adversary": {
      "name": "APT29",
      "type": "nation-state",
      "confidence": 75,
      "motivation": "espionage"
    },
    "capability": {
      "malware": ["WellMess", "WellMail"],
      "techniques": ["T1566.001", "T1059.001"],
      "sophistication": "expert"
    },
    "infrastructure": {
      "domains": ["evil-c2.com", "malware-host.net"],
      "ips": ["198.51.100.1", "203.0.113.50"],
      "email": ["attacker@evil.com"]
    },
    "victim": {
      "sectors": ["government", "healthcare"],
      "countries": ["US", "UK"],
      "specific_orgs": ["Example Corp"]
    },
    "meta_features": {
      "timestamp": "2025-06-01 to 2026-01-01",
      "phase": "Actions on Objectives",
      "result": "partial success",
      "methodology": "spearphishing"
    }
  }
}
```

### Step 5: Cross-Framework Correlation

```
Link frameworks for comprehensive view:

ATT&CK Technique → Kill Chain Phase → Diamond Feature
T1566.001         → Delivery (3)     → Capability
T1059.001         → Exploitation (4) → Capability
T1547.001         → Installation (5) → Capability
T1071.001         → C2 (6)           → Infrastructure
```

### Step 6: Store to Knowledge Graph

Use the **Knowledge** skill:

```
Store the following as structured episodes:

1. Framework Mapping:
   - Name: "Mapping: {threat_name}"
   - Data: All framework alignments
   - Group: "threat-intel-mappings"

2. ATT&CK Coverage:
   - Name: "ATT&CK: {threat_name}"
   - Data: Technique IDs, tactics, confidence
   - Links to ATT&CK knowledge

3. Kill Chain Analysis:
   - Name: "Kill Chain: {threat_name}"
   - Data: Phases observed, disruption points
   - Defensive recommendations

4. Diamond Analysis:
   - Name: "Diamond: {threat_name}"
   - Data: Four features, meta-features
   - Pivoting opportunities
```

## Output Format

```
📋 FRAMEWORK MAPPING REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 THREAT: [Threat identifier]
📅 ANALYSIS DATE: [timestamp]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔷 MITRE ATT&CK MAPPING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Tactic | Technique | ID | Confidence |
|--------|-----------|-------|------------|
| Initial Access | Spearphishing Attachment | T1566.001 | High |
| Execution | PowerShell | T1059.001 | High |
| Persistence | Registry Run Keys | T1547.001 | Medium |
| Defense Evasion | Obfuscated Files | T1027 | Medium |
| C2 | Web Protocols | T1071.001 | High |

**ATT&CK Navigator Layer:** [Generated/Link]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⛓️ CYBER KILL CHAIN MAPPING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
[1] RECON    [2] WEAPON   [3] DELIVER  [4] EXPLOIT
    ⬜           ⬜          ✅          ✅

[5] INSTALL  [6] C2       [7] ACTIONS
    ✅          ✅          ⬜
```

**Primary Phase:** Delivery
**Defense Focus:** Email security, user awareness

Phase Details:
| Phase | Activity | Defense |
|-------|----------|---------|
| 3 | Phishing email | Email gateway |
| 4 | Macro exploit | Disable macros |
| 5 | Registry persistence | EDR |
| 6 | HTTPS C2 | Proxy inspection |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💎 DIAMOND MODEL ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
            ADVERSARY
           [APT29 - B2]
               /\
              /  \
             /    \
CAPABILITY ◄──────► INFRASTRUCTURE
[WellMess]         [evil-c2.com]
[T1566.001]        [198.51.100.1]
             \    /
              \  /
               \/
            VICTIM
        [Government]
```

**Pivoting Opportunities:**
• From infrastructure → Other campaigns
• From capability → Similar actors
• From victim → Related targets

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 CROSS-FRAMEWORK CORRELATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| ATT&CK | Kill Chain | Diamond |
|--------|------------|---------|
| T1566.001 | Delivery | Capability |
| T1059.001 | Exploitation | Capability |
| T1071.001 | C2 | Infrastructure |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Stored to Knowledge Graph: Yes
🔗 Mapping ID: [mapping_id]
```

## Tools & APIs Used
- MITRE ATT&CK STIX data
- mitreattack-python library
- Knowledge skill for persistence

## Ethical Notes
- Document mapping confidence
- Note gaps in coverage
- Avoid over-attribution
- Update as new information emerges
