# Risk Assessment Guide

> ISO 27001/27005 aligned risk scoring methodology

---

## Overview

This guide describes the risk assessment methodology used by the PAI CTI Skill, aligned with ISO 27001:2022 and ISO 27005:2022 standards.

---

## Risk Formula

```
RISK = LIKELIHOOD x IMPACT
```

Where:
- **Likelihood** (1-5): Probability the threat will materialize
- **Impact** (1-5): Consequence if the threat materializes
- **Risk Score** (1-25): Product of likelihood and impact

---

## Likelihood Assessment

Likelihood is calculated from threat factors, vulnerability factors, and control effectiveness.

### Threat Factors

#### Capability (1-5)

Adversary's technical capability level.

| Score | Level | Description | Examples |
|-------|-------|-------------|----------|
| 1 | Minimal | Script kiddie, basic tools | Using public scripts |
| 2 | Low | Some technical skill, commodity tools | Modifying existing malware |
| 3 | Moderate | Professional, commercial tools | Penetration testing tools |
| 4 | High | Expert, custom tools | Custom malware, 0-days |
| 5 | Very High | Nation-state level | APT groups, advanced capabilities |

#### Intent (1-5)

Adversary's motivation and targeting.

| Score | Level | Description |
|-------|-------|-------------|
| 1 | Opportunistic | Random targeting, no specific interest |
| 2 | Casual | Slight interest, targets of opportunity |
| 3 | Moderate | Specific interest in sector/region |
| 4 | Determined | High persistence, specific targeting |
| 5 | Dedicated | Will not stop, mission-critical target |

#### Activity (1-5)

Current threat activity level.

| Score | Level | Description |
|-------|-------|-------------|
| 1 | Historical | Past activity only, no recent campaigns |
| 2 | Dormant | Recently inactive, may resurface |
| 3 | Active | Current campaigns in progress |
| 4 | Escalating | Increasing activity, expanding scope |
| 5 | Imminent | Active targeting of your organization |

### Vulnerability Factors

#### Severity (1-5)

Vulnerability technical severity.

| Score | Level | Description | CVSS Equivalent |
|-------|-------|-------------|-----------------|
| 1 | Minimal | No known exploits, theoretical | 0.0-3.9 |
| 2 | Low | Limited exploitability | 4.0-4.9 |
| 3 | Moderate | Known vulnerability, some exploits | 5.0-6.9 |
| 4 | High | Actively exploited in the wild | 7.0-8.9 |
| 5 | Critical | Weaponized exploit available | 9.0-10.0 |

#### Exposure (1-5)

Asset exposure level.

| Score | Level | Description |
|-------|-------|-------------|
| 1 | Isolated | Air-gapped, no external access |
| 2 | Limited | Strong access controls, limited exposure |
| 3 | Moderate | Standard controls, some exposure |
| 4 | High | Weak controls, significant exposure |
| 5 | Critical | Fully exposed, minimal controls |

### Control Effectiveness (Multiplier)

Existing security controls reduce likelihood.

| Level | Multiplier | Description |
|-------|------------|-------------|
| None | 1.0 | No relevant controls |
| Low | 0.9 | Basic controls (firewall, AV) |
| Moderate | 0.7 | Standard controls (IDS, SIEM) |
| High | 0.5 | Strong controls (EDR, NDR, SOC) |
| Very High | 0.3 | Defense in depth, 24/7 monitoring |

### Likelihood Calculation

```
Threat Factor = (Capability + Intent + Activity) / 3
Vulnerability Factor = (Severity + Exposure) / 2
Raw Likelihood = (Threat Factor + Vulnerability Factor) / 2
Likelihood = Raw Likelihood x Control Effectiveness
```

Round final result to nearest integer (1-5).

---

## Impact Assessment

Impact measures the consequence if the threat materializes.

### Confidentiality (1-5)

Data disclosure impact.

| Score | Level | Data Type | Example |
|-------|-------|-----------|---------|
| 1 | Negligible | Public information | Marketing materials |
| 2 | Minor | Internal information | Non-sensitive emails |
| 3 | Moderate | Sensitive business | Financial reports |
| 4 | Major | Confidential/PII | Customer data, HR records |
| 5 | Severe | Top secret/critical IP | Trade secrets, classified |

### Integrity (1-5)

Data modification impact.

| Score | Level | Recovery | Example |
|-------|-------|----------|---------|
| 1 | Negligible | Cosmetic changes | Website defacement |
| 2 | Minor | Easily correctable | Document changes |
| 3 | Moderate | Significant effort | Database modification |
| 4 | Major | Extended recovery | System configuration |
| 5 | Severe | Irreversible | Destroyed backups |

### Availability (1-5)

Service disruption impact.

| Score | Level | Downtime | Example |
|-------|-------|----------|---------|
| 1 | Negligible | Seconds | Brief network blip |
| 2 | Minor | Minutes | Service restart |
| 3 | Moderate | Hours | System rebuild |
| 4 | Major | Days | Full recovery needed |
| 5 | Severe | Extended/permanent | Business cessation |

### Business (1-5)

Business operation impact.

| Score | Level | Effect | Example |
|-------|-------|--------|---------|
| 1 | Negligible | No business impact | Isolated test system |
| 2 | Minor | Limited operational | Non-critical system |
| 3 | Moderate | Significant operational | Important system |
| 4 | Major | Severe disruption | Critical system |
| 5 | Severe | Existential threat | Core business function |

### Impact Calculation

Two methods:

**Maximum (conservative):**
```
Impact = max(Confidentiality, Integrity, Availability, Business)
```

**Weighted Average:**
```
Impact = (C x 0.25) + (I x 0.25) + (A x 0.25) + (B x 0.25)
```

---

## Risk Matrix

```
              IMPACT
              1     2     3     4     5
         +--------------------------------
       5 |   5    10    15    20    25   <- Critical (Red)
L      4 |   4     8    12    16    20   <- High (Orange)
I      3 |   3     6     9    12    15   <- Medium (Yellow)
K      2 |   2     4     6     8    10   <- Low (Light Green)
E      1 |   1     2     3     4     5   <- Info (Green)
```

---

## Risk Levels

| Score | Level | Color | Action Required |
|-------|-------|-------|-----------------|
| 1-4 | Low | Green | Monitor, routine maintenance |
| 5-9 | Medium | Yellow | Plan response, schedule remediation |
| 10-15 | High | Orange | Prioritize, remediate within 24-48h |
| 16-25 | Critical | Red | Immediate response, 0-4 hours |

---

## Response Timeline

| Risk Level | Response Time | Actions |
|------------|---------------|---------|
| Critical (16-25) | Immediate (0-4h) | Executive notification, incident response, containment |
| High (10-15) | 24-48 hours | Security team engagement, priority patching |
| Medium (5-9) | 1-2 weeks | Planned remediation, risk acceptance decision |
| Low (1-4) | Regular maintenance | Monitor, include in maintenance cycle |

---

## Risk Treatment Options

### Avoid

Eliminate the threat source or remove the vulnerable asset.

- Remove deprecated systems
- Discontinue risky services
- Change business processes

### Mitigate

Reduce likelihood or impact through controls.

- Implement security controls
- Patch vulnerabilities
- Enhance monitoring
- Segment networks

### Transfer

Shift risk to another party.

- Cyber insurance
- Outsource to managed security provider
- Contractual requirements on vendors

### Accept

Acknowledge and document residual risk.

- Executive sign-off required
- Document risk acceptance rationale
- Continue monitoring
- Review periodically

---

## Example Calculation

**Scenario:** Active ransomware campaign targeting healthcare sector

### Likelihood Assessment

```
THREAT FACTORS:
  Capability: 4 (High - professional ransomware operators)
  Intent: 5 (Dedicated - healthcare sector targeting)
  Activity: 4 (Escalating - active campaign)
  Threat Factor: (4 + 5 + 4) / 3 = 4.3

VULNERABILITY FACTORS:
  Severity: 4 (High - exploiting known CVEs)
  Exposure: 3 (Moderate - standard network segmentation)
  Vulnerability Factor: (4 + 3) / 2 = 3.5

CONTROL EFFECTIVENESS: 0.7 (Moderate - EDR deployed, backups exist)

RAW LIKELIHOOD: (4.3 + 3.5) / 2 = 3.9
ADJUSTED LIKELIHOOD: 3.9 x 0.7 = 2.73

LIKELIHOOD: 3 (rounded)
```

### Impact Assessment

```
IMPACT FACTORS:
  Confidentiality: 4 (Major - patient data at risk)
  Integrity: 4 (Major - encryption would corrupt data)
  Availability: 5 (Severe - extended downtime expected)
  Business: 5 (Severe - existential threat to operations)

IMPACT: max(4, 4, 5, 5) = 5
```

### Risk Calculation

```
RISK = LIKELIHOOD x IMPACT
RISK = 3 x 5 = 15

RISK LEVEL: HIGH (Orange)
```

### Recommendations

```
Response Timeline: 24-48 hours
Treatment: Mitigate + Transfer

Immediate Actions:
1. Validate backup integrity and test recovery
2. Block known ransomware IoCs at perimeter
3. Patch exploited CVEs (priority)
4. Enable enhanced EDR monitoring

Short-term (1 week):
1. Implement network segmentation for critical systems
2. Deploy email security enhancements
3. Conduct user awareness training

Long-term (1 month):
1. Review cyber insurance coverage
2. Implement zero-trust architecture
3. Establish incident response retainer
```

---

## Risk Register Template

| ID | Threat | Likelihood | Impact | Risk | Level | Treatment | Owner | Due |
|----|--------|------------|--------|------|-------|-----------|-------|-----|
| R001 | Ransomware | 3 | 5 | 15 | High | Mitigate | CISO | 48h |
| R002 | Phishing | 4 | 3 | 12 | High | Mitigate | SecOps | 1w |
| R003 | Insider | 2 | 4 | 8 | Medium | Monitor | HR/Sec | 2w |

---

## Documentation Requirements

For each risk assessment, document:

1. **Assessment metadata** - Date, assessor, scope
2. **Threat description** - What is the threat?
3. **Factor scoring** - All factors with justification
4. **Calculation** - Show the math
5. **Treatment decision** - What action will be taken?
6. **Residual risk** - Risk after treatment
7. **Owner** - Who is responsible?
8. **Review date** - When to reassess?

---

## References

- ISO/IEC 27001:2022 - Information security management
- ISO/IEC 27005:2022 - Information security risk management
- NIST SP 800-30 - Guide for Conducting Risk Assessments
- FAIR (Factor Analysis of Information Risk)

---

## See Also

- [AssessRisk Workflow](../workflows/analysis.md#assessrisk)
- [Frameworks Overview](README.md)
