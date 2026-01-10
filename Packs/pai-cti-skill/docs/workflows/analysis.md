# Analysis Workflows

> Workflows for analyzing and understanding threat intelligence

---

## AnalyzeIntelligence

Comprehensive threat intelligence analysis covering technical details, attribution, and context.

### Trigger Phrases

- "analyze threat"
- "analyze intelligence"
- "threat analysis"
- "analyze this report"
- "investigate threat"

### Input Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `source` | Yes | Text, URL, or file containing threat intelligence |
| `context` | No | Additional context (sector, organization, etc.) |
| `depth` | No | Analysis depth: `quick`, `standard`, `comprehensive` |

### Process Overview

1. **Parse Source** - Extract text from URL, file, or direct input
2. **Identify Threat Type** - Categorize as malware, APT, campaign, vulnerability
3. **Extract Indicators** - Use ExtractIoCs workflow
4. **Technical Analysis** - Analyze malware behavior, infrastructure, TTPs
5. **Attribution Analysis** - Identify threat actor with confidence levels
6. **Context Analysis** - Evaluate targeting, motivation, timeline
7. **Framework Mapping** - Map to ATT&CK, Kill Chain, Diamond Model
8. **Store Results** - Save to Knowledge Graph

### Output

```
THREAT INTELLIGENCE ANALYSIS
========================================

THREAT IDENTIFICATION
  Name: [Threat name]
  Type: [APT/Malware/Campaign/Vulnerability]
  TLP: [Classification]
  Analysis Depth: [quick/standard/comprehensive]

EXECUTIVE SUMMARY
  [2-3 sentence summary]

ATTRIBUTION
  Actor: [Name] (Confidence: [High/Medium/Low])
  Type: [Nation-state/Criminal/Hacktivist]
  Motivation: [Espionage/Financial/Disruption]

TECHNICAL ANALYSIS
  Malware: [Families identified]
  Infrastructure: [IPs, domains, C2]
  Capabilities: [Key capabilities]

INDICATORS OF COMPROMISE
  IPs: [count]
  Domains: [count]
  Hashes: [count]
  URLs: [count]

FRAMEWORK MAPPINGS
  ATT&CK Techniques: [count]
  Kill Chain Phases: [phases observed]
  Diamond Features: [completed features]

RISK ASSESSMENT
  Risk Level: [Critical/High/Medium/Low]
  Score: [X/25]

RECOMMENDATIONS
  1. [Immediate action]
  2. [Short-term action]
  3. [Long-term action]
```

### Example Usage

```
User: "Analyze this threat report from Mandiant about APT29"
       [Paste report or provide URL]

User: "Analyze this malware sample targeting the financial sector"
       Hash: abc123...
       Context: Detected on trading platform servers
```

---

## AssessRisk

ISO 27001/27005 aligned risk assessment for threats.

### Trigger Phrases

- "assess risk"
- "risk score"
- "calculate risk"
- "risk assessment"
- "threat risk"
- "evaluate risk"

### Input Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `threat` | Yes | Threat to assess (actor, malware, vulnerability) |
| `context` | No | Organization context for impact assessment |
| `controls` | No | Existing security controls |

### Risk Calculation

**Risk = Likelihood x Impact**

#### Likelihood Factors

| Factor | Scale | Description |
|--------|-------|-------------|
| Capability | 1-5 | Adversary technical capability |
| Intent | 1-5 | Adversary motivation toward target |
| Activity | 1-5 | Current threat activity level |
| Severity | 1-5 | Vulnerability severity |
| Exposure | 1-5 | Asset exposure level |

**Control Effectiveness Multiplier:** 0.3 (very high) to 1.0 (none)

#### Impact Factors

| Factor | Scale | Description |
|--------|-------|-------------|
| Confidentiality | 1-5 | Data disclosure impact |
| Integrity | 1-5 | Data modification impact |
| Availability | 1-5 | Service disruption impact |
| Business | 1-5 | Business operation impact |

### Risk Matrix

```
         IMPACT
         1    2    3    4    5
    +-----------------------------
  5 |  5   10   15   20   25  Critical
L 4 |  4    8   12   16   20  High
I 3 |  3    6    9   12   15  Medium
K 2 |  2    4    6    8   10  Low
E 1 |  1    2    3    4    5  Info
```

### Risk Levels and Response

| Score | Level | Action | Timeline |
|-------|-------|--------|----------|
| 16-25 | Critical | Immediate response | 0-4 hours |
| 10-15 | High | Prioritize remediation | 24-48 hours |
| 5-9 | Medium | Plan response | 1-2 weeks |
| 1-4 | Low | Monitor | Regular maintenance |

### Output

```
RISK ASSESSMENT REPORT
========================================

THREAT: [Threat name]
DATE: [Assessment date]
ASSESSOR: PAI ThreatIntelligence

LIKELIHOOD CALCULATION
  Threat Factors:
    Capability: [score]/5 - [description]
    Intent: [score]/5 - [description]
    Activity: [score]/5 - [description]
    Threat Factor: [calculated]/5

  Vulnerability Factors:
    Severity: [score]/5 - [description]
    Exposure: [score]/5 - [description]
    Vulnerability Factor: [calculated]/5

  Control Effectiveness: [multiplier] ([level])

  RAW LIKELIHOOD: [score]
  ADJUSTED LIKELIHOOD: [score] (after controls)

IMPACT CALCULATION
  Confidentiality: [score]/5 - [description]
  Integrity: [score]/5 - [description]
  Availability: [score]/5 - [description]
  Business: [score]/5 - [description]

  IMPACT SCORE: [max or weighted avg]

RISK CALCULATION
  Risk = Likelihood x Impact
  Risk = [L] x [I] = [SCORE]

  RISK LEVEL: [CRITICAL/HIGH/MEDIUM/LOW]

RISK TREATMENT
  Recommended: [Avoid/Mitigate/Transfer/Accept]
  Response Timeline: [timeline]

TREATMENT OPTIONS
  [Specific recommendations]
```

### Example Usage

```
User: "Assess the risk of this ransomware threat targeting healthcare"
       Threat: LockBit ransomware
       Sector: Healthcare
       Controls: EDR deployed, backups available

User: "Calculate risk score for APT29 campaign"
```

---

## MapToFrameworks

Map threat intelligence to security frameworks: MITRE ATT&CK, Cyber Kill Chain, and Diamond Model.

### Trigger Phrases

- "map to att&ck"
- "mitre mapping"
- "kill chain phase"
- "diamond model analysis"
- "framework alignment"
- "ttp mapping"

### Input Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `intelligence` | Yes | Threat data, TTPs, or behaviors to map |
| `frameworks` | No | Specific frameworks (default: all) |
| `depth` | No | Mapping depth: `technique` or `sub-technique` |

### MITRE ATT&CK Mapping

#### Tactics (14 Enterprise)

| ID | Tactic | Goal |
|----|--------|------|
| TA0043 | Reconnaissance | Gather information |
| TA0042 | Resource Development | Establish resources |
| TA0001 | Initial Access | Get into network |
| TA0002 | Execution | Run malicious code |
| TA0003 | Persistence | Maintain access |
| TA0004 | Privilege Escalation | Get higher permissions |
| TA0005 | Defense Evasion | Avoid detection |
| TA0006 | Credential Access | Steal credentials |
| TA0007 | Discovery | Learn environment |
| TA0008 | Lateral Movement | Move through network |
| TA0009 | Collection | Gather target data |
| TA0011 | Command and Control | Remote communication |
| TA0010 | Exfiltration | Steal data out |
| TA0040 | Impact | Disrupt or destroy |

#### Mapping Process

1. **Identify behavior** - What is the adversary doing?
2. **Determine goal** - Why? (maps to tactic)
3. **Find method** - How? (maps to technique)
4. **Get specific** - What variation? (sub-technique)
5. **Document evidence** - What supports this mapping?

### Cyber Kill Chain Mapping

| Phase | Name | Activities |
|-------|------|------------|
| 1 | Reconnaissance | Target research, scanning |
| 2 | Weaponization | Exploit/payload creation |
| 3 | Delivery | Phishing, watering hole |
| 4 | Exploitation | Vulnerability exploitation |
| 5 | Installation | Malware installation |
| 6 | Command & Control | C2 communication |
| 7 | Actions on Objectives | Data theft, destruction |

### Diamond Model Mapping

```
            ADVERSARY
               /\
              /  \
             /    \
CAPABILITY <------> INFRASTRUCTURE
             \    /
              \  /
               \/
            VICTIM
```

| Feature | Elements |
|---------|----------|
| Adversary | Name, type, motivation, attribution |
| Capability | Malware, tools, techniques |
| Infrastructure | Domains, IPs, email addresses |
| Victim | Organization, sector, geography |

### Output

```
FRAMEWORK MAPPING REPORT
========================================

THREAT: [Threat identifier]
DATE: [Analysis date]

MITRE ATT&CK MAPPING
----------------------------------------
| Tactic | Technique | ID | Confidence |
|--------|-----------|-------|------------|
| Initial Access | Spearphishing | T1566.001 | High |
| Execution | PowerShell | T1059.001 | High |
| Persistence | Registry Keys | T1547.001 | Medium |
| C2 | Web Protocols | T1071.001 | High |

ATT&CK Navigator Layer: [Generated/Link]

CYBER KILL CHAIN MAPPING
----------------------------------------
[1] RECON    [2] WEAPON   [3] DELIVER  [4] EXPLOIT
    [ ]          [ ]          [X]          [X]

[5] INSTALL  [6] C2       [7] ACTIONS
    [X]          [X]          [ ]

Primary Phase: Delivery
Defense Focus: Email security, user awareness

DIAMOND MODEL ANALYSIS
----------------------------------------
ADVERSARY: APT29 (Nation-state, Espionage)
  Confidence: 75%

CAPABILITY:
  - WellMess RAT
  - PowerShell scripts
  - T1566.001, T1059.001

INFRASTRUCTURE:
  - evil-c2.com
  - 198.51.100.1

VICTIM:
  - Government, Healthcare
  - US, UK

CROSS-FRAMEWORK CORRELATION
----------------------------------------
| ATT&CK | Kill Chain | Diamond |
|--------|------------|---------|
| T1566.001 | Delivery | Capability |
| T1059.001 | Exploit | Capability |
| T1071.001 | C2 | Infrastructure |
```

### Example Usage

```
User: "Map this threat to MITRE ATT&CK"
       [Provide threat details or report]

User: "Identify Kill Chain phases for this incident"
       The attacker sent phishing emails, executed PowerShell,
       established persistence via registry, and exfiltrated data.

User: "Create Diamond Model analysis for APT29 campaign"
```

---

## See Also

- [Frameworks Reference](../frameworks/README.md) - Detailed framework documentation
- [MITRE ATT&CK Guide](../frameworks/mitre-attack.md) - ATT&CK mapping guide
- [Risk Assessment Guide](../frameworks/risk-assessment.md) - Risk scoring methodology
