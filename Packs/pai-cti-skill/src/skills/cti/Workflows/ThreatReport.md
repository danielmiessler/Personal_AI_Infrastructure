# Threat Report Workflow

Generate comprehensive threat intelligence reports by combining multiple analysis workflows.

## Trigger Phrases
- "threat report"
- "intelligence report"
- "ti summary"
- "create report"
- "generate ti report"
- "threat dossier"

## Input
- `threat`: Threat to report on (actor, campaign, malware, incident)
- `scope` (optional): Report scope (executive, technical, comprehensive)
- `format` (optional): Output format (markdown, pdf, json)
- `include` (optional): Specific sections to include

## Process

### Step 1: Gather Intelligence

**Query Knowledge Graph:**
```
Search for existing intelligence:
- Previous analyses
- Stored IoCs
- Framework mappings
- Risk assessments
- Related threats
```

**Collect Fresh Data:**
```
If needed, invoke sub-workflows:
- MonitorFeeds.md - Latest feed data
- AnalyzeIntelligence.md - Detailed analysis
- ExtractIoCs.md - Indicator extraction
- EnrichIoCs.md - IoC enrichment
- MapToFrameworks.md - Framework alignment
- AssessRisk.md - Risk scoring
```

### Step 2: Structure Report

**Report Sections:**
```
1. Executive Summary
   - Key findings (3-5 bullets)
   - Risk level
   - Recommended actions
   - TLP classification

2. Threat Overview
   - Threat identification
   - Attribution (if known)
   - Timeline
   - Scope and scale

3. Technical Analysis
   - TTPs (MITRE ATT&CK)
   - Kill Chain mapping
   - Diamond Model analysis
   - Malware analysis

4. Indicators of Compromise
   - Network indicators
   - File indicators
   - Behavioral indicators
   - Detection signatures

5. Risk Assessment
   - Risk score
   - Impact analysis
   - Likelihood factors
   - Affected assets

6. Recommendations
   - Immediate actions
   - Short-term mitigations
   - Long-term improvements

7. Detection & Response
   - YARA rules
   - Sigma rules
   - Hunting queries
   - Response playbook

8. Intelligence Sharing
   - STIX bundle
   - TLP guidance
   - Attribution caveats

9. Appendices
   - Full IoC list
   - References
   - Methodology
```

### Step 3: Generate Executive Summary

```
Synthesize key findings:

1. THREAT IDENTIFICATION
   - What: [Threat name/type]
   - Who: [Actor attribution + confidence]
   - When: [Timeline]
   - Where: [Geographic/sector targeting]

2. RISK ASSESSMENT
   - Risk Level: [Critical/High/Medium/Low]
   - Score: [X/25]
   - Primary concern: [Key risk factor]

3. KEY FINDINGS
   - [Finding 1]
   - [Finding 2]
   - [Finding 3]

4. RECOMMENDED ACTIONS
   - [Action 1] - [Priority]
   - [Action 2] - [Priority]
   - [Action 3] - [Priority]
```

### Step 4: Compile Technical Analysis

**MITRE ATT&CK Section:**
```yaml
Tactics Used:
  - Initial Access (TA0001)
  - Execution (TA0002)
  - Persistence (TA0003)

Techniques:
  - T1566.001: Spearphishing Attachment
    Evidence: [Description]
    Confidence: High

  - T1059.001: PowerShell
    Evidence: [Description]
    Confidence: High

ATT&CK Navigator Layer: [Generated]
```

**Kill Chain Section:**
```
Phase Progression:
1. Reconnaissance ✓ - Target research via LinkedIn
2. Weaponization ✓ - Malicious document creation
3. Delivery ✓ - Spearphishing email
4. Exploitation ✓ - Macro execution
5. Installation ✓ - Registry persistence
6. C2 ✓ - HTTPS beacon
7. Actions ○ - [Not observed/In progress]

Disruption Point: Phase 3 (Delivery) - Email security
```

**Diamond Model Section:**
```
Adversary: APT29 (Cozy Bear)
  - Type: Nation-state
  - Motivation: Espionage
  - Confidence: Medium

Capability: Custom toolset
  - WellMess malware
  - Cobalt Strike
  - Living-off-the-land

Infrastructure:
  - C2: 198.51.100.1, evil-c2.com
  - Hosting: Bulletproof hosting
  - Email: spoof@legitimate.com

Victim:
  - Sector: Government, Healthcare
  - Region: US, UK, EU
  - Assets: Research data
```

### Step 5: Compile IoC Section

**Network Indicators:**
```markdown
| Type | Value | First Seen | Confidence | Context |
|------|-------|------------|------------|---------|
| IP | 198.51.100.1 | 2025-06-01 | High | C2 Server |
| Domain | evil-c2.com | 2025-07-15 | High | C2 Domain |
| URL | hxxps://evil-c2.com/beacon | 2025-08-01 | Medium | Beacon URL |
```

**File Indicators:**
```markdown
| Hash (SHA256) | Filename | Type | Family |
|---------------|----------|------|--------|
| abc123... | payload.exe | PE32 | WellMess |
| def456... | stage2.dll | DLL | Cobalt Strike |
```

### Step 6: Generate Detection Rules

**Include YARA Rule:**
```yara
rule MAL_WellMess_Loader
{
    meta:
        description = "Detects WellMess loader"
        author = "PAI ThreatIntelligence"
        reference = "This report"
        date = "2026-01-10"

    strings:
        $s1 = "WellMess" ascii
        $s2 = { 4D 5A 90 00 }

    condition:
        uint16(0) == 0x5A4D and all of them
}
```

**Include Sigma Rule:**
```yaml
title: WellMess C2 Communication
id: 12345678-1234-1234-1234-123456789012
status: experimental
logsource:
    category: proxy
detection:
    selection:
        c-uri|contains: '/beacon'
        cs-host: 'evil-c2.com'
    condition: selection
level: high
```

### Step 7: Generate STIX Bundle

**Invoke CreateStixBundle workflow:**
```
Create STIX 2.1 bundle containing:
- Threat actor object
- Campaign object
- Malware objects
- Indicator objects
- Attack pattern objects
- Relationships
- TLP marking
```

### Step 8: Store Report

**File Output:**
```
Save to: $PAI_DIR/history/research/threat-intel/[threat_name]/
- report_[date].md
- iocs_[date].csv
- stix_bundle_[date].json
- yara_rules_[date].yar
- sigma_rules_[date].yml
- attack_layer_[date].json
```

**Knowledge Graph:**
```
Store the following as structured episodes:

1. Threat Report:
   - Name: "Report: {threat_name}"
   - Data: Full report content
   - Group: "threat-intel-reports"

2. Report Metadata:
   - Name: "Report Meta: {report_id}"
   - Data: Date, scope, author, TLP
   - Links to all referenced entities
```

## Output Format

```markdown
# THREAT INTELLIGENCE REPORT

## Report Metadata
| Field | Value |
|-------|-------|
| Report ID | TI-2026-001 |
| Date | 2026-01-10 |
| TLP | TLP:AMBER |
| Confidence | B2 (High) |
| Author | PAI ThreatIntelligence |

---

## 1. EXECUTIVE SUMMARY

### Threat Overview
[2-3 sentence summary of the threat]

### Risk Level: 🔴 CRITICAL (Score: 20/25)

### Key Findings
• [Finding 1]
• [Finding 2]
• [Finding 3]
• [Finding 4]

### Recommended Actions
| Priority | Action | Timeline |
|----------|--------|----------|
| 1 | Block IoCs | Immediate |
| 2 | Hunt for presence | 24 hours |
| 3 | Patch vulnerabilities | 72 hours |

---

## 2. THREAT OVERVIEW

### Threat Identification
- **Name:** [Threat name]
- **Type:** [APT/Criminal/Hacktivism]
- **Aliases:** [Known aliases]
- **First Observed:** [Date]
- **Status:** [Active/Dormant]

### Attribution
- **Actor:** [Actor name] (Confidence: [Level])
- **Motivation:** [Espionage/Financial/Disruption]
- **Capability Level:** [Sophisticated/Moderate/Low]

### Timeline
| Date | Event |
|------|-------|
| 2025-06-01 | First observed activity |
| 2025-08-15 | New malware variant |
| 2026-01-09 | Current campaign |

---

## 3. TECHNICAL ANALYSIS

### 3.1 MITRE ATT&CK Mapping

[ATT&CK technique table]

### 3.2 Cyber Kill Chain

[Kill chain diagram and analysis]

### 3.3 Diamond Model

[Diamond model diagram and analysis]

### 3.4 Malware Analysis

[Technical malware details]

---

## 4. INDICATORS OF COMPROMISE

### 4.1 Network Indicators
[IoC tables]

### 4.2 File Indicators
[Hash tables]

### 4.3 Behavioral Indicators
[TTP-based indicators]

---

## 5. RISK ASSESSMENT

### Risk Score: [X]/25 - [LEVEL]

### Risk Factors
[Factor analysis table]

### Impact Analysis
[Impact details]

---

## 6. RECOMMENDATIONS

### Immediate Actions (0-24 hours)
1. [Action]
2. [Action]

### Short-term (1-7 days)
1. [Action]
2. [Action]

### Long-term (1-3 months)
1. [Action]

---

## 7. DETECTION & RESPONSE

### 7.1 YARA Rules
```yara
[YARA rules]
```

### 7.2 Sigma Rules
```yaml
[Sigma rules]
```

### 7.3 Hunting Queries
[Queries for various platforms]

---

## 8. INTELLIGENCE SHARING

### STIX Bundle
[Bundle reference]

### TLP Guidance
[Sharing instructions]

---

## 9. APPENDICES

### A. Full IoC List
[Complete IoC listing]

### B. References
[Source references]

### C. Methodology
[Analysis methodology]

---

**END OF REPORT**

Generated by PAI ThreatIntelligence
Report ID: [ID]
```

## Report Variants

**Executive Summary (1-2 pages):**
- Key findings
- Risk level
- Recommended actions
- No technical details

**Technical Report (5-10 pages):**
- Full technical analysis
- All IoCs
- Detection rules
- Implementation guidance

**Comprehensive Report (15+ pages):**
- All sections
- Detailed analysis
- Full appendices
- Historical context

## Tools & APIs Used
- All sub-workflows
- Knowledge skill for data retrieval
- Browser skill for fresh data
- STIX generator for bundles

## Ethical Notes
- Respect TLP classifications
- Document confidence levels
- Protect source methods
- Appropriate caveats for attribution
