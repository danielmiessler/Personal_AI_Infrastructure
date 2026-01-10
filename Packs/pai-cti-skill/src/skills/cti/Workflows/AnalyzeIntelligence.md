# Analyze Intelligence Workflow

Comprehensive analysis and prioritization of threat intelligence with framework alignment.

## Trigger Phrases
- "analyze threat"
- "threat analysis"
- "assess this threat"
- "prioritize threats"
- "analyze this report"
- "what does this threat mean"

## Input
- `source`: Threat report URL, text, or file path
- `context` (optional): Organizational context for relevance scoring
- `frameworks` (optional): Specific frameworks to map to (default: all)

## Process

### Step 1: Ingest Intelligence
```
Parse input source:
- URL → Fetch using Browser skill
- Text → Direct analysis
- File → Read and extract content

Extract structured data:
- Threat actors mentioned
- Malware families
- TTPs described
- IoCs listed
- Targets/victims
- Timeline of activity
```

### Step 2: Extract Key Elements

**Threat Actor Analysis:**
```
Identify:
- Actor name/aliases
- Known affiliations (nation-state, criminal, hacktivist)
- Motivation (financial, espionage, disruption)
- Capability level (sophisticated, moderate, low)
- Historical activity
```

**TTP Analysis:**
```
Extract:
- Attack techniques described
- Tools and malware used
- Infrastructure patterns
- Persistence methods
- Evasion techniques
```

### Step 3: Map to MITRE ATT&CK

Using reference from `Frameworks/MitreAttack.md`:

```
For each identified TTP:
1. Identify applicable tactic(s):
   - Reconnaissance (TA0043)
   - Resource Development (TA0042)
   - Initial Access (TA0001)
   - Execution (TA0002)
   - Persistence (TA0003)
   - Privilege Escalation (TA0004)
   - Defense Evasion (TA0005)
   - Credential Access (TA0006)
   - Discovery (TA0007)
   - Lateral Movement (TA0008)
   - Collection (TA0009)
   - Command and Control (TA0011)
   - Exfiltration (TA0010)
   - Impact (TA0040)

2. Map to specific technique(s):
   - Technique ID (T####)
   - Sub-technique ID (T####.###)
   - Confidence level

3. Link to known groups/software:
   - Group IDs (G####)
   - Software IDs (S####)
```

### Step 4: Map to Cyber Kill Chain

Using reference from `Frameworks/CyberKillChain.md`:

```
Classify each activity by phase:

1. Reconnaissance - Information gathering
2. Weaponization - Payload creation
3. Delivery - Transmission method
4. Exploitation - Vulnerability exploitation
5. Installation - Persistence establishment
6. Command & Control - Remote access
7. Actions on Objectives - Goal achievement

For each phase:
- Defensive opportunities
- Detection methods
- Mitigation strategies
```

### Step 5: Apply Diamond Model

Using reference from `Frameworks/DiamondModel.md`:

```
Structure analysis:

ADVERSARY:
- Identity (if known)
- Type (individual, group, nation-state)
- Confidence level

CAPABILITY:
- Tools used
- Techniques employed
- Sophistication level

INFRASTRUCTURE:
- Domains
- IP addresses
- Email addresses
- Hosting providers

VICTIM:
- Target organization(s)
- Target sector(s)
- Geographic focus

META-FEATURES:
- Timestamp
- Phase (kill chain)
- Result (success/failure)
- Methodology
- Social-political context
```

### Step 6: Assess Risk

Using methodology from `Frameworks/RiskScoring.md`:

```
Calculate risk score:

Risk = Likelihood × Impact

LIKELIHOOD factors (1-5):
- Threat capability
- Threat intent/motivation
- Vulnerability exposure
- Historical targeting
- Current activity level

IMPACT factors (1-5):
- Data sensitivity
- Business criticality
- Regulatory implications
- Reputational damage
- Recovery difficulty

RISK LEVELS:
- Critical: 20-25 (immediate action required)
- High: 15-19 (prioritize remediation)
- Medium: 8-14 (plan response)
- Low: 1-7 (monitor and document)
```

### Step 7: Assess Confidence

Apply Admiralty Code rating:

```
SOURCE RELIABILITY:
A - Completely Reliable (confirmed attribution)
B - Usually Reliable (reputable source)
C - Fairly Reliable (single credible source)
D - Not Usually Reliable (unverified)
E - Unreliable (known to be inaccurate)
F - Cannot Be Judged (new source)

INFORMATION CREDIBILITY:
1 - Confirmed (multiple sources)
2 - Probably True (logical, consistent)
3 - Possibly True (reasonable)
4 - Doubtful (inconsistent)
5 - Improbable (contradicts known facts)
6 - Cannot Be Judged (insufficient info)

Combined: e.g., B2, C3
```

### Step 8: Generate Recommendations

```
Based on analysis, provide:

1. IMMEDIATE ACTIONS:
   - Block indicators
   - Patch vulnerabilities
   - Hunt for presence

2. SHORT-TERM ACTIONS:
   - Update detection rules
   - Review access controls
   - Brief stakeholders

3. LONG-TERM ACTIONS:
   - Security architecture review
   - Training updates
   - Process improvements
```

### Step 9: Store to Knowledge Graph

Use the **Knowledge** skill:

```
Store the following as structured episodes:

1. Threat Analysis:
   - Name: "Analysis: {threat_name}"
   - Data: Full analysis with framework mappings
   - Group: "threat-intel-analysis"

2. Actor Profile:
   - Name: "Actor: {actor_name}"
   - Data: Attribution, capabilities, motivation
   - Relationships: uses_malware, targets_sector

3. TTP Mappings:
   - Name: "TTPs: {threat_name}"
   - Data: ATT&CK techniques, kill chain phases
   - Relationships: employed_by actor

4. Risk Assessment:
   - Name: "Risk: {threat_name}"
   - Data: Score, factors, recommendations
   - Temporal tracking

5. IoCs:
   - Name: "IoCs: {threat_name}"
   - Data: Extracted indicators
   - Relationships: indicates_threat
```

## Output Format

```
📋 THREAT INTELLIGENCE ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 THREAT: [Threat name/identifier]
📅 ANALYSIS DATE: [timestamp]
🔒 TLP: [classification]
⚡ CONFIDENCE: [Admiralty rating]
🔴 RISK SCORE: [Critical/High/Medium/Low] ([X]/25)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 EXECUTIVE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[2-3 sentence summary of the threat and its significance]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎭 THREAT ACTOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Name: [Actor name/alias]
• Type: [Nation-state/Criminal/Hacktivist]
• Motivation: [Financial/Espionage/Disruption]
• Capability: [Sophisticated/Moderate/Low]
• Confidence: [High/Medium/Low]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔷 MITRE ATT&CK MAPPING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
| Tactic | Technique | ID | Confidence |
|--------|-----------|-------|------------|
| Initial Access | Phishing | T1566 | High |
| Execution | PowerShell | T1059.001 | High |
| Persistence | Registry Run Keys | T1547.001 | Medium |
| ... | ... | ... | ... |

Related Groups: [G0001, G0002]
Related Software: [S0001, S0002]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⛓️ CYBER KILL CHAIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1] Recon    [2] Weapon   [3] Deliver  [4] Exploit
    ⬜           ⬜          ✅          ✅

[5] Install  [6] C2       [7] Actions
    ✅          ✅          ⬜

Primary Phase: [Delivery/Exploitation]
Defense Focus: [Recommended phase to disrupt]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💎 DIAMOND MODEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            ADVERSARY
           [Actor Name]
               /\
              /  \
             /    \
CAPABILITY ◄──────► INFRASTRUCTURE
[Malware X]        [evil.com, 1.2.3.4]
             \    /
              \  /
               \/
            VICTIM
        [Sector/Org]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ RISK ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Likelihood: [X]/5 - [Rationale]
Impact: [X]/5 - [Rationale]
Risk Score: [X]/25 - [Level]

Contributing Factors:
• [Factor 1]
• [Factor 2]
• [Factor 3]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 INDICATORS OF COMPROMISE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
| Type | Value | Confidence |
|------|-------|------------|
| IP | 1.2.3.4 | High |
| Domain | evil.com | High |
| SHA256 | abc123... | Medium |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMMEDIATE:
1. [Action 1]
2. [Action 2]

SHORT-TERM:
1. [Action 1]
2. [Action 2]

LONG-TERM:
1. [Action 1]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Stored to Knowledge Graph: Yes
🔗 Entity ID: [threat_entity_id]
```

## Sub-Workflows Invoked
- ExtractIoCs.md - For indicator extraction
- MapToFrameworks.md - For detailed framework mapping
- AssessRisk.md - For formal risk calculation

## Tools & APIs Used
- Browser skill for fetching reports
- Knowledge skill for persistence
- osint skill for enrichment
- MITRE ATT&CK STIX data

## Ethical Notes
- Document all analysis assumptions
- Note confidence levels honestly
- Avoid speculation beyond evidence
- Protect source information
