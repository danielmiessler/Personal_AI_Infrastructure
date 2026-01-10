# Assess Risk Workflow

Formal risk assessment using ISO 27001/27005 methodology for threat prioritization.

## Trigger Phrases
- "assess risk"
- "risk score"
- "threat risk"
- "prioritize by risk"
- "risk assessment"
- "calculate risk"

## Input
- `threat`: Threat intelligence to assess
- `context` (optional): Organizational context for relevance
- `assets` (optional): Specific assets to consider
- `controls` (optional): Existing security controls

## Process

### Step 1: Establish Context (ISO 27005 5.3)
```
Define assessment scope:
- Organization profile
- Industry/sector
- Regulatory environment
- Risk appetite/tolerance
- Critical assets
- Existing controls
```

### Step 2: Assess Threat Factors

**Threat Capability (1-5):**
```
1 - Minimal: Script kiddie, limited resources
2 - Low: Basic tools, limited expertise
3 - Moderate: Commercial tools, some expertise
4 - High: Custom tools, significant expertise
5 - Very High: Nation-state level, unlimited resources
```

**Threat Intent (1-5):**
```
1 - Opportunistic: Random targeting, low motivation
2 - Casual: Slight interest, easily deterred
3 - Moderate: Specific interest, moderate persistence
4 - Determined: Strong motivation, high persistence
5 - Dedicated: Will not stop, unlimited persistence
```

**Threat Activity Level (1-5):**
```
1 - Historical: Past activity only
2 - Dormant: Recently inactive
3 - Active: Current campaigns
4 - Escalating: Increasing activity
5 - Imminent: Active targeting of your org
```

### Step 3: Assess Vulnerability Factors

**Vulnerability Severity (1-5):**
```
1 - Minimal: No known exploits, difficult to exploit
2 - Low: Theoretical vulnerability, limited exposure
3 - Moderate: Known vulnerability, some exposure
4 - High: Actively exploited, significant exposure
5 - Critical: Weaponized exploit, widespread exposure
```

**Exposure Level (1-5):**
```
1 - Isolated: Air-gapped, no external access
2 - Limited: Strong controls, minimal exposure
3 - Moderate: Standard controls, some exposure
4 - High: Weak controls, significant exposure
5 - Critical: No controls, fully exposed
```

**Control Effectiveness (reduces risk):**
```
None: No relevant controls (1.0 multiplier)
Low: Basic controls (0.9 multiplier)
Moderate: Standard controls (0.7 multiplier)
High: Strong controls (0.5 multiplier)
Very High: Defense in depth (0.3 multiplier)
```

### Step 4: Assess Impact Factors

**Confidentiality Impact (1-5):**
```
1 - Negligible: Public information
2 - Minor: Internal information
3 - Moderate: Sensitive business data
4 - Major: Confidential/PII
5 - Severe: Top secret/critical IP
```

**Integrity Impact (1-5):**
```
1 - Negligible: Cosmetic changes
2 - Minor: Easily correctable
3 - Moderate: Significant correction effort
4 - Major: Extended recovery
5 - Severe: Irreversible damage
```

**Availability Impact (1-5):**
```
1 - Negligible: Seconds of downtime
2 - Minor: Minutes of downtime
3 - Moderate: Hours of downtime
4 - Major: Days of downtime
5 - Severe: Extended/permanent loss
```

**Business Impact (1-5):**
```
1 - Negligible: No business impact
2 - Minor: Limited operational impact
3 - Moderate: Significant operational impact
4 - Major: Severe business disruption
5 - Severe: Existential threat
```

### Step 5: Calculate Risk Score

**Likelihood Calculation:**
```
Threat Factor = (Capability + Intent + Activity) / 3
Vulnerability Factor = (Severity + Exposure) / 2
Likelihood = (Threat Factor + Vulnerability Factor) / 2 × Control Effectiveness

Scale: 1-5
```

**Impact Calculation:**
```
Impact = max(Confidentiality, Integrity, Availability, Business)

Or weighted average:
Impact = (C×0.25 + I×0.25 + A×0.25 + B×0.25)

Scale: 1-5
```

**Risk Score:**
```
Risk = Likelihood × Impact

Risk Matrix:
         Impact
         1   2   3   4   5
    ┌────────────────────────
  5 │  5  10  15  20  25
  4 │  4   8  12  16  20
L 3 │  3   6   9  12  15
  2 │  2   4   6   8  10
  1 │  1   2   3   4   5

Risk Levels:
1-4:   Low (Green)     - Monitor
5-9:   Medium (Yellow) - Plan response
10-15: High (Orange)   - Prioritize remediation
16-25: Critical (Red)  - Immediate action
```

### Step 6: Determine Priority

**Priority Assignment:**
```
CRITICAL (Risk 16-25):
- Immediate escalation required
- Executive notification
- Activate incident response
- Block indicators immediately

HIGH (Risk 10-15):
- Prioritize remediation within 24-48 hours
- Security team notification
- Implement compensating controls
- Active monitoring

MEDIUM (Risk 5-9):
- Plan remediation within 1-2 weeks
- Add to security backlog
- Update detection rules
- Monitor for escalation

LOW (Risk 1-4):
- Document and track
- Address during regular maintenance
- Include in awareness training
- Periodic review
```

### Step 7: Generate Risk Treatment Options

**ISO 27005 Risk Treatment:**
```
AVOID:
- Eliminate the threat source
- Remove the vulnerable asset
- Change business process

MITIGATE:
- Implement security controls
- Patch vulnerabilities
- Enhance monitoring
- User training

TRANSFER:
- Cyber insurance
- Outsource to specialist
- Contractual requirements

ACCEPT:
- Document residual risk
- Executive sign-off
- Monitor for changes
```

### Step 8: Calculate Confidence

**Assessment Confidence:**
```
Factors affecting confidence:
- Intelligence source reliability
- Information age
- Corroboration level
- Analysis depth

Confidence Levels:
High (80-100%): Multiple reliable sources, verified
Medium (50-79%): Single reliable source or partial corroboration
Low (20-49%): Unverified or limited information
Very Low (<20%): Speculation or incomplete data
```

### Step 9: Store to Knowledge Graph

Use the **Knowledge** skill:

```
Store the following as structured episodes:

1. Risk Assessment:
   - Name: "Risk: {threat_name}"
   - Data: Score, factors, treatment options
   - Group: "threat-intel-risk"

2. Factor Analysis:
   - Name: "Risk Factors: {threat_name}"
   - Data: All factor scores with rationale
   - Temporal tracking for changes

3. Treatment Plan:
   - Name: "Treatment: {threat_name}"
   - Data: Recommended actions, timeline
   - Links to controls

4. Assessment Record:
   - Name: "Assessment Record: {date}"
   - Data: Full methodology, assessor
   - Audit trail
```

## Output Format

```
📋 RISK ASSESSMENT REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 THREAT: [Threat identifier]
📅 ASSESSMENT DATE: [timestamp]
👤 ASSESSOR: PAI ThreatIntelligence
📊 METHODOLOGY: ISO 27001/27005

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 RISK SCORE: [CRITICAL/HIGH/MEDIUM/LOW]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
RISK MATRIX
         Impact
         1   2   3   4   5
    ┌────────────────────────
  5 │  ○   ○   ○   ○   ○
  4 │  ○   ○   ○   ●   ○    ← Current: [L] × [I] = [Score]
L 3 │  ○   ○   ○   ○   ○
  2 │  ○   ○   ○   ○   ○
  1 │  ○   ○   ○   ○   ○
```

**Likelihood: [X]/5**
**Impact: [X]/5**
**Risk Score: [X]/25**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ THREAT FACTORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Factor | Score | Rationale |
|--------|-------|-----------|
| Capability | [X]/5 | [Explanation] |
| Intent | [X]/5 | [Explanation] |
| Activity | [X]/5 | [Explanation] |
| **Threat Average** | **[X]/5** | |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔓 VULNERABILITY FACTORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Factor | Score | Rationale |
|--------|-------|-----------|
| Severity | [X]/5 | [Explanation] |
| Exposure | [X]/5 | [Explanation] |
| Control Eff. | [X]% | [Controls in place] |
| **Vuln Average** | **[X]/5** | |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💥 IMPACT FACTORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Factor | Score | Rationale |
|--------|-------|-----------|
| Confidentiality | [X]/5 | [Explanation] |
| Integrity | [X]/5 | [Explanation] |
| Availability | [X]/5 | [Explanation] |
| Business | [X]/5 | [Explanation] |
| **Impact Score** | **[X]/5** | |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 RISK TREATMENT OPTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**RECOMMENDED: [MITIGATE/AVOID/TRANSFER/ACCEPT]**

MITIGATE:
1. [Action 1] - [Timeline]
2. [Action 2] - [Timeline]
3. [Action 3] - [Timeline]

TRANSFER:
• [Insurance or outsourcing option]

ACCEPT:
• [Conditions for acceptance]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 PRIORITY ACTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Priority | Action | Timeline | Owner |
|----------|--------|----------|-------|
| 1 | [Action] | Immediate | [Team] |
| 2 | [Action] | 24h | [Team] |
| 3 | [Action] | 1 week | [Team] |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ASSESSMENT CONFIDENCE: [HIGH/MEDIUM/LOW]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Confidence factors:
• Source reliability: [Rating]
• Information age: [Days old]
• Corroboration: [Level]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Stored to Knowledge Graph: Yes
🔗 Assessment ID: [risk_assessment_id]
```

## Risk Score Examples

**Critical Risk (Score: 20):**
```
Threat: Active ransomware targeting your sector
Likelihood: 4 (High threat, vulnerable systems)
Impact: 5 (Business-critical systems)
Risk: 4 × 5 = 20 (CRITICAL)
Action: Immediate incident response activation
```

**High Risk (Score: 12):**
```
Threat: Phishing campaign using new techniques
Likelihood: 4 (Active campaign, some exposure)
Impact: 3 (Email systems, potential data access)
Risk: 4 × 3 = 12 (HIGH)
Action: Prioritize user awareness, enhance email security
```

**Medium Risk (Score: 6):**
```
Threat: Commodity malware with limited capabilities
Likelihood: 3 (Known threat, moderate controls)
Impact: 2 (Non-critical systems)
Risk: 3 × 2 = 6 (MEDIUM)
Action: Update AV signatures, monitor
```

## Tools & APIs Used
- ISO 27005 risk framework
- Knowledge skill for persistence
- Context from threat intelligence

## Ethical Notes
- Document all assumptions
- Note confidence levels
- Update as new information arrives
- Involve business stakeholders
- Maintain audit trail
