---
name: cti
description: AI-powered Cyber Threat Intelligence platform for monitoring feeds, analyzing threats, assessing risk, and creating detection rules. USE WHEN threat intelligence, threat analysis, IoC extraction, YARA rules, Sigma rules, STIX/TAXII, MITRE ATT&CK mapping, Cyber Kill Chain, Diamond Model, risk assessment, threat report, malware intelligence, CTI, or threat feed monitoring.
triggers:
  - threat intelligence
  - threat analysis
  - ti analysis
  - analyze threat
  - ioc extraction
  - extract indicators
  - yara rule
  - sigma rule
  - stix bundle
  - taxii
  - mitre attack
  - att&ck mapping
  - kill chain
  - diamond model
  - risk assessment
  - threat report
  - malware intel
  - cti
  - threat feed
  - monitor threats
  - threat hunting
  - indicator enrichment
  - threat prioritization
  - cve enrichment
  - vulnerability intelligence
  - cve lookup
  - analyze cve
---

# Cyber Threat Intelligence (CTI)

AI-powered Cyber Threat Intelligence platform for comprehensive threat analysis, detection rule generation, and intelligence sharing.

## Intent Routing

When the user requests threat intelligence activities, route to the appropriate workflow:

### Monitor Threat Feeds
**Triggers:** "monitor threats", "check threat feeds", "what's new in threat intel", "latest threats"
**Workflow:** MonitorFeeds.md
```
User: Check the latest threat intelligence feeds
→ Execute MonitorFeeds workflow
```

### Analyze Intelligence
**Triggers:** "analyze threat", "threat analysis", "assess this threat", "prioritize threats"
**Workflow:** AnalyzeIntelligence.md
```
User: Analyze this threat report and prioritize findings
→ Execute AnalyzeIntelligence workflow
```

### Extract IoCs
**Triggers:** "extract iocs", "find indicators", "extract indicators", "get iocs from"
**Workflow:** ExtractIoCs.md
```
User: Extract all IoCs from this malware report
→ Execute ExtractIoCs workflow
```

### Map to Frameworks
**Triggers:** "map to att&ck", "mitre mapping", "kill chain phase", "diamond model analysis"
**Workflow:** MapToFrameworks.md
```
User: Map these TTPs to MITRE ATT&CK
→ Execute MapToFrameworks workflow
```

### Risk Assessment
**Triggers:** "assess risk", "risk score", "threat risk", "prioritize by risk"
**Workflow:** AssessRisk.md
```
User: Assess the risk of this threat actor activity
→ Execute AssessRisk workflow (ISO 27001/27005 methodology)
```

### Generate YARA Rules
**Triggers:** "create yara", "yara rule", "generate yara", "detection rule"
**Workflow:** GenerateYara.md
```
User: Create YARA rules for this malware sample
→ Execute GenerateYara workflow
```

### Generate Sigma Rules
**Triggers:** "create sigma", "sigma rule", "log detection", "siem rule"
**Workflow:** GenerateSigma.md
```
User: Create Sigma rules for detecting this behavior
→ Execute GenerateSigma workflow
```

### Create STIX Bundle
**Triggers:** "stix bundle", "taxii", "share intelligence", "export stix", "cti sharing"
**Workflow:** CreateStixBundle.md
```
User: Package this intelligence as a STIX bundle
→ Execute CreateStixBundle workflow
```

### Enrich IoCs
**Triggers:** "enrich indicators", "lookup ioc", "ioc enrichment", "investigate indicator"
**Workflow:** EnrichIoCs.md
```
User: Enrich these IP addresses with threat data
→ Execute EnrichIoCs workflow
```

### Enrich CVEs
**Triggers:** "enrich cve", "lookup vulnerability", "cve enrichment", "analyze cve", "vulnerability correlation"
**Workflow:** EnrichCVE.md
```
User: Analyze CVE-2024-21762 and correlate with threat intelligence
→ Execute EnrichCVE workflow
```

### Threat Report
**Triggers:** "threat report", "intelligence report", "ti summary", "create report"
**Workflow:** ThreatReport.md
```
User: Generate a comprehensive threat intelligence report
→ Execute ThreatReport workflow (meta-workflow combining others)
```

### Manage Feeds
**Triggers:** "add feed", "remove feed", "list feeds", "configure feeds", "manage sources"
**Workflow:** ManageFeeds.md
```
User: Add a new threat feed source
→ Execute ManageFeeds workflow
```

---

## Quick Commands

```bash
# Monitor threat feeds
/ti monitor

# Analyze threat intelligence
/ti analyze <report_url_or_text>

# Extract IoCs
/ti extract <source>

# Map to frameworks
/ti map <threat_data>

# Risk assessment
/ti risk <threat>

# Generate YARA rule
/ti yara <sample_or_behavior>

# Generate Sigma rule
/ti sigma <log_behavior>

# Create STIX bundle
/ti stix <intelligence>

# Enrich IoCs
/ti enrich <iocs>

# Enrich CVEs
/ti cve <cve_ids>

# Generate threat report
/ti report <investigation_name>

# Manage feeds
/cti feeds list                    # List all feeds
/cti feeds add --url <url>         # Add new feed
/cti feeds remove --name <name>    # Remove feed
/cti feeds enable --name <name>    # Enable feed
/cti feeds disable --name <name>   # Disable feed
/cti feeds test --name <name>      # Test feed connection
```

---

## Dependencies

This skill requires:
- **Knowledge skill** - For storing threat intelligence in knowledge graph (MANDATORY)
- **Browser skill** - For fetching threat feeds and reports
- **osint skill** - For reconnaissance and infrastructure analysis

## Framework Alignment

All threat intelligence is automatically aligned to industry frameworks:

### MITRE ATT&CK
- Map adversary TTPs to Tactics, Techniques, Sub-techniques
- Link to threat groups (G####) and software (S####)
- Generate ATT&CK Navigator layers

### Cyber Kill Chain
- Classify activities by kill chain phase (1-7)
- Identify defensive opportunities at each phase
- Track adversary progression

### Diamond Model
- Structure analysis around Adversary, Capability, Infrastructure, Victim
- Capture meta-features (timestamp, phase, result, methodology)
- Enable pivoting between features

### Risk Scoring (ISO 27001/27005)
- Calculate risk using: `Risk = Likelihood × Impact`
- Factor in asset value, control effectiveness, exposure
- Assign priority levels: Critical, High, Medium, Low

---

## TLP Classification

All intelligence is tagged with Traffic Light Protocol (TLP 2.0):

| TLP | Sharing Scope |
|-----|---------------|
| TLP:RED | Individual recipients only |
| TLP:AMBER+STRICT | Organization only |
| TLP:AMBER | Organization and clients |
| TLP:GREEN | Community sharing |
| TLP:CLEAR | Public disclosure |

---

## Confidence Scoring

Intelligence confidence is rated using the NATO Admiralty Code:

**Source Reliability (A-F):**
- A: Completely Reliable
- B: Usually Reliable
- C: Fairly Reliable
- D: Not Usually Reliable
- E: Unreliable
- F: Cannot Be Judged

**Information Credibility (1-6):**
- 1: Confirmed by other sources
- 2: Probably true
- 3: Possibly true
- 4: Doubtful
- 5: Improbable
- 6: Cannot be judged

**Combined Rating:** e.g., A1, B2, C3

---

## Output Format

All TI operations output in structured format:

```
📋 THREAT INTELLIGENCE REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 THREAT: [Threat identifier/name]
📅 DATE: [Analysis timestamp]
🔒 TLP: [TLP classification]
⚡ CONFIDENCE: [Admiralty rating, e.g., B2]

🔴 RISK SCORE: [Critical/High/Medium/Low] ([numeric score])

📊 FRAMEWORK ALIGNMENT:
• ATT&CK: [Tactics/Techniques]
• Kill Chain: [Phase]
• Diamond: [Features identified]

🎯 INDICATORS OF COMPROMISE:
[Extracted IoCs with types]

📝 ANALYSIS:
[Key findings and context]

🛡️ DETECTIONS:
• YARA: [Generated/Available]
• Sigma: [Generated/Available]

🔗 STIX BUNDLE: [Generated/Reference]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Stored to Knowledge Graph: [Yes/No]
🔗 Entity ID: [threat_entity_id]
```

---

## Ethical Guidelines

1. **Authorized Use Only** - Use for defensive security purposes
2. **TLP Compliance** - Respect sharing classifications
3. **No Active Threats** - Never execute malicious code
4. **Attribution Caution** - Note confidence levels for attribution
5. **Source Protection** - Protect sensitive sources and methods
6. **Legal Compliance** - Adhere to applicable laws and regulations

---

## Agent Profiles

For specialized analysis personas, see `CTIAgents.md` which defines:
- **The Threat Analyst** - Named agent for rigorous, evidence-based analysis
- **Dynamic trait formulas** - Composable profiles for different CTI tasks (Rigorous Analyst, Red Team Assessor, Risk Evaluator, etc.)
- **Multi-agent patterns** - Triangulated assessment, speed vs depth, red/blue perspectives

Agent integration uses the Agents skill's AgentFactory.

---

## Reference Documentation

- `Frameworks/MitreAttack.md` - ATT&CK framework reference
- `Frameworks/CyberKillChain.md` - Kill Chain reference
- `Frameworks/DiamondModel.md` - Diamond Model reference
- `Frameworks/RiskScoring.md` - ISO 27001/27005 risk methodology
- `CTIAgents.md` - Specialized agent profiles for CTI work
