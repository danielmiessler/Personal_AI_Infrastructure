# Frameworks Reference

> Reference documentation for threat intelligence frameworks

---

## Overview

The PAI CTI Skill uses four industry-standard frameworks for threat intelligence analysis:

| Framework | Purpose | Use Case |
|-----------|---------|----------|
| **MITRE ATT&CK** | Adversary tactics and techniques | TTP mapping, coverage analysis |
| **Cyber Kill Chain** | Attack phase identification | Defense planning, disruption |
| **Diamond Model** | Intrusion analysis structuring | Attribution, pivoting |
| **Risk Scoring** | ISO 27001/27005 risk assessment | Prioritization, treatment |

---

## Framework Documentation

- [MITRE ATT&CK Guide](mitre-attack.md) - Comprehensive ATT&CK mapping guide
- [Risk Assessment Guide](risk-assessment.md) - ISO 27001/27005 risk scoring methodology

---

## MITRE ATT&CK

### Overview

MITRE ATT&CK is a knowledge base of adversary tactics and techniques based on real-world observations.

### Key Concepts

| Concept | Description | ID Format |
|---------|-------------|-----------|
| Tactic | Why - Adversary's goal | TA0001 |
| Technique | How - Method to achieve goal | T1566 |
| Sub-technique | Specific variation | T1566.001 |
| Group | Threat actor | G0016 |
| Software | Malware/tool | S0154 |

### Enterprise Tactics (14)

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

### Resources

- Website: https://attack.mitre.org
- Navigator: https://mitre-attack.github.io/attack-navigator/
- STIX Data: https://github.com/mitre-attack/attack-stix-data

See [MITRE ATT&CK Guide](mitre-attack.md) for detailed mapping instructions.

---

## Cyber Kill Chain

### Overview

Lockheed Martin's Intelligence Driven Defense framework describes 7 phases of an intrusion.

### The 7 Phases

```
1. RECONNAISSANCE -> 2. WEAPONIZATION -> 3. DELIVERY
                                              |
4. EXPLOITATION <-----------------------------+
       |
5. INSTALLATION -> 6. COMMAND & CONTROL -> 7. ACTIONS ON OBJECTIVES
```

| Phase | Goal | Defense Focus |
|-------|------|---------------|
| 1. Reconnaissance | Gather target information | OSINT monitoring, honeypots |
| 2. Weaponization | Create deliverable payload | (Limited visibility) |
| 3. Delivery | Transmit weapon to target | Email security, web filtering |
| 4. Exploitation | Trigger malicious code | Patching, exploit mitigation |
| 5. Installation | Install backdoor | EDR, application control |
| 6. Command & Control | Remote control channel | Network monitoring, DNS filtering |
| 7. Actions on Objectives | Achieve mission | DLP, incident response |

### Defensive Strategy

**Break the chain early:** Focus defenses on:
1. **Delivery (Phase 3)** - Email security, user training
2. **C2 (Phase 6)** - Network monitoring, DNS filtering
3. **Installation (Phase 5)** - EDR, application control

### Resources

- Original Paper: Lockheed Martin (2011)
- https://www.lockheedmartin.com/en-us/capabilities/cyber/cyber-kill-chain.html

---

## Diamond Model

### Overview

Framework for structuring intrusion analysis around four core features.

### Core Features

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

| Feature | Elements | Questions |
|---------|----------|-----------|
| **Adversary** | Name, type, motivation | Who is conducting this? |
| **Capability** | Malware, tools, techniques | What tools are used? |
| **Infrastructure** | Domains, IPs, email | What resources support it? |
| **Victim** | Organization, sector, assets | Who is being targeted? |

### Meta-Features

| Meta-Feature | Description |
|--------------|-------------|
| Timestamp | When did events occur? |
| Phase | Kill chain phase |
| Result | Success, failure, unknown |
| Direction | Adv->Infra, Infra->Victim |
| Methodology | Attack method |

### Analytical Pivoting

From one feature, discover others:

```
ADVERSARY -> Capabilities, Infrastructure, Typical Victims
CAPABILITY -> Other actors using same, Historical victims
INFRASTRUCTURE -> Related domains/IPs, Registration patterns
VICTIM -> Similar targets, Common adversaries
```

### Resources

- Original Paper: "The Diamond Model of Intrusion Analysis" (2013)
- https://apps.dtic.mil/sti/pdfs/ADA586960.pdf

---

## Risk Scoring (ISO 27001/27005)

### Overview

Risk assessment methodology aligned with ISO 27001/27005 standards.

### Risk Formula

```
RISK = LIKELIHOOD x IMPACT
```

### Likelihood Factors

| Factor | Scale | Description |
|--------|-------|-------------|
| Capability | 1-5 | Adversary technical capability |
| Intent | 1-5 | Adversary motivation |
| Activity | 1-5 | Current threat activity |
| Severity | 1-5 | Vulnerability severity |
| Exposure | 1-5 | Asset exposure level |

### Impact Factors

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

### Risk Levels

| Score | Level | Action | Timeline |
|-------|-------|--------|----------|
| 16-25 | Critical | Immediate response | 0-4 hours |
| 10-15 | High | Prioritize | 24-48 hours |
| 5-9 | Medium | Plan response | 1-2 weeks |
| 1-4 | Low | Monitor | Regular maintenance |

### Resources

- ISO/IEC 27001:2022
- ISO/IEC 27005:2022
- NIST SP 800-30

See [Risk Assessment Guide](risk-assessment.md) for detailed methodology.

---

## Framework Integration

The CTI skill integrates these frameworks in the MapToFrameworks workflow:

```
Threat Intelligence
        |
        v
+----------------+
| MapToFrameworks|
+----------------+
        |
        +---> MITRE ATT&CK (TTPs)
        |
        +---> Kill Chain (Phases)
        |
        +---> Diamond Model (Features)
        |
        +---> Risk Scoring (Priority)
```

### Cross-Framework Correlation

| ATT&CK | Kill Chain | Diamond |
|--------|------------|---------|
| T1566.001 | Delivery | Capability |
| T1059.001 | Exploitation | Capability |
| T1071.001 | C2 | Infrastructure |
| T1041 | Actions | Capability |

---

## See Also

- [MapToFrameworks Workflow](../workflows/analysis.md#maptoframeworks)
- [AssessRisk Workflow](../workflows/analysis.md#assessrisk)
