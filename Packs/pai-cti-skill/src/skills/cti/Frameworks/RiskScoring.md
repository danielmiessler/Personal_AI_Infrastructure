# Risk Scoring Reference

ISO 27001/27005 based risk assessment methodology.

## Risk Formula

```
RISK = LIKELIHOOD × IMPACT
```

## Likelihood Assessment

### Threat Factors

**Capability (1-5):**
| Score | Level | Description |
|-------|-------|-------------|
| 1 | Minimal | Script kiddie, basic tools |
| 2 | Low | Some technical skill, commodity tools |
| 3 | Moderate | Professional, commercial tools |
| 4 | High | Expert, custom tools |
| 5 | Very High | Nation-state level |

**Intent (1-5):**
| Score | Level | Description |
|-------|-------|-------------|
| 1 | Opportunistic | Random targeting |
| 2 | Casual | Slight interest |
| 3 | Moderate | Specific interest |
| 4 | Determined | High persistence |
| 5 | Dedicated | Will not stop |

**Activity (1-5):**
| Score | Level | Description |
|-------|-------|-------------|
| 1 | Historical | Past activity only |
| 2 | Dormant | Recently inactive |
| 3 | Active | Current campaigns |
| 4 | Escalating | Increasing activity |
| 5 | Imminent | Active targeting |

### Vulnerability Factors

**Severity (1-5):**
| Score | Level | Description |
|-------|-------|-------------|
| 1 | Minimal | No known exploits |
| 2 | Low | Theoretical risk |
| 3 | Moderate | Known vulnerability |
| 4 | High | Actively exploited |
| 5 | Critical | Weaponized exploit |

**Exposure (1-5):**
| Score | Level | Description |
|-------|-------|-------------|
| 1 | Isolated | Air-gapped |
| 2 | Limited | Strong controls |
| 3 | Moderate | Standard controls |
| 4 | High | Weak controls |
| 5 | Critical | Fully exposed |

### Control Effectiveness (Multiplier)

| Level | Multiplier | Description |
|-------|------------|-------------|
| None | 1.0 | No relevant controls |
| Low | 0.9 | Basic controls |
| Moderate | 0.7 | Standard controls |
| High | 0.5 | Strong controls |
| Very High | 0.3 | Defense in depth |

### Likelihood Calculation

```
Threat Factor = (Capability + Intent + Activity) / 3
Vulnerability Factor = (Severity + Exposure) / 2
Raw Likelihood = (Threat Factor + Vulnerability Factor) / 2
Likelihood = Raw Likelihood × Control Effectiveness
```

---

## Impact Assessment

**Confidentiality (1-5):**
| Score | Level | Data Type |
|-------|-------|-----------|
| 1 | Negligible | Public information |
| 2 | Minor | Internal information |
| 3 | Moderate | Sensitive business |
| 4 | Major | Confidential/PII |
| 5 | Severe | Top secret/critical IP |

**Integrity (1-5):**
| Score | Level | Recovery |
|-------|-------|----------|
| 1 | Negligible | Cosmetic changes |
| 2 | Minor | Easily correctable |
| 3 | Moderate | Significant effort |
| 4 | Major | Extended recovery |
| 5 | Severe | Irreversible |

**Availability (1-5):**
| Score | Level | Downtime |
|-------|-------|----------|
| 1 | Negligible | Seconds |
| 2 | Minor | Minutes |
| 3 | Moderate | Hours |
| 4 | Major | Days |
| 5 | Severe | Extended/permanent |

**Business (1-5):**
| Score | Level | Effect |
|-------|-------|--------|
| 1 | Negligible | No business impact |
| 2 | Minor | Limited operational |
| 3 | Moderate | Significant operational |
| 4 | Major | Severe disruption |
| 5 | Severe | Existential threat |

### Impact Calculation

```
Impact = max(Confidentiality, Integrity, Availability, Business)
```

Or weighted average:
```
Impact = (C × 0.25) + (I × 0.25) + (A × 0.25) + (B × 0.25)
```

---

## Risk Matrix

```
         IMPACT
         1    2    3    4    5
    ┌─────────────────────────────
  5 │  5   10   15   20   25     ← Critical
L 4 │  4    8   12   16   20     ← High
I 3 │  3    6    9   12   15     ← Medium
K 2 │  2    4    6    8   10     ← Low
E 1 │  1    2    3    4    5     ← Info
```

## Risk Levels

| Score | Level | Color | Action |
|-------|-------|-------|--------|
| 1-4 | Low | 🟢 Green | Monitor |
| 5-9 | Medium | 🟡 Yellow | Plan response |
| 10-15 | High | 🟠 Orange | Prioritize |
| 16-25 | Critical | 🔴 Red | Immediate |

---

## Response Timeline

| Risk Level | Response Time |
|------------|---------------|
| Critical | Immediate (0-4h) |
| High | 24-48 hours |
| Medium | 1-2 weeks |
| Low | Regular maintenance |

---

## Risk Treatment Options

**AVOID:**
- Eliminate threat source
- Remove vulnerable asset
- Change process

**MITIGATE:**
- Implement controls
- Patch vulnerabilities
- Enhance monitoring

**TRANSFER:**
- Cyber insurance
- Outsource
- Contracts

**ACCEPT:**
- Document residual risk
- Executive sign-off
- Monitor

---

## Example Calculation

**Scenario:** Active ransomware targeting your sector

```
LIKELIHOOD:
- Capability: 4 (High - professional)
- Intent: 5 (Dedicated - ransomware gangs)
- Activity: 4 (Escalating - active campaign)
- Threat Factor: (4+5+4)/3 = 4.3

- Severity: 4 (High - known vulnerabilities)
- Exposure: 3 (Moderate - standard controls)
- Vulnerability Factor: (4+3)/2 = 3.5

- Control Effectiveness: 0.7 (Moderate)

Raw Likelihood = (4.3 + 3.5) / 2 = 3.9
Likelihood = 3.9 × 0.7 = 2.7 → Round to 3

IMPACT:
- Confidentiality: 4 (Customer data at risk)
- Integrity: 4 (Encryption would corrupt)
- Availability: 5 (Extended downtime)
- Business: 5 (Existential threat)
- Impact: max(4,4,5,5) = 5

RISK = 3 × 5 = 15 (HIGH)

ACTION: Prioritize remediation within 24-48 hours
```

---

## References

- ISO/IEC 27001:2022
- ISO/IEC 27005:2022
- NIST SP 800-30
