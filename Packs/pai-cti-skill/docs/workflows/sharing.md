# Sharing Workflows

> Workflows for packaging and sharing threat intelligence

---

## CreateStixBundle

Package threat intelligence as STIX 2.1 bundles for standardized intelligence sharing.

### Trigger Phrases

- "stix bundle"
- "taxii export"
- "share intelligence"
- "export stix"
- "cti sharing"
- "create stix"
- "package intelligence"

### Input Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `intelligence` | Yes | Threat intelligence data to package |
| `tlp` | Yes | Traffic Light Protocol classification |
| `include_relationships` | No | Include relationship objects (default: `true`) |
| `include_sightings` | No | Include sighting objects (default: `false`) |

### STIX 2.1 Object Types

#### Indicators

Pattern-based representation of observable data.

```json
{
    "type": "indicator",
    "spec_version": "2.1",
    "id": "indicator--<uuid>",
    "created": "2026-01-10T00:00:00.000Z",
    "modified": "2026-01-10T00:00:00.000Z",
    "name": "Malicious IP Address",
    "description": "C2 server for Operation ShadowStrike",
    "pattern": "[ipv4-addr:value = '198.51.100.1']",
    "pattern_type": "stix",
    "valid_from": "2026-01-10T00:00:00.000Z",
    "indicator_types": ["malicious-activity"],
    "confidence": 85
}
```

#### Malware

Represents malicious software.

```json
{
    "type": "malware",
    "spec_version": "2.1",
    "id": "malware--<uuid>",
    "name": "ShadowRAT",
    "description": "Remote access trojan",
    "malware_types": ["remote-access-trojan"],
    "is_family": false,
    "capabilities": [
        "communicates-with-c2",
        "exfiltrates-data",
        "captures-credentials"
    ]
}
```

#### Threat Actor

Represents adversaries.

```json
{
    "type": "threat-actor",
    "spec_version": "2.1",
    "id": "threat-actor--<uuid>",
    "name": "ShadowGroup",
    "description": "Financially motivated threat actor",
    "threat_actor_types": ["crime-syndicate"],
    "aliases": ["SG", "Shadow Collective"],
    "roles": ["agent"],
    "goals": ["financial-gain"],
    "sophistication": "expert",
    "resource_level": "organization",
    "primary_motivation": "financial-gain"
}
```

#### Attack Pattern

TTPs aligned with MITRE ATT&CK.

```json
{
    "type": "attack-pattern",
    "spec_version": "2.1",
    "id": "attack-pattern--<uuid>",
    "name": "Spearphishing Link",
    "description": "Adversaries send emails with malicious links",
    "external_references": [
        {
            "source_name": "mitre-attack",
            "external_id": "T1566.002",
            "url": "https://attack.mitre.org/techniques/T1566/002/"
        }
    ],
    "kill_chain_phases": [
        {
            "kill_chain_name": "mitre-attack",
            "phase_name": "initial-access"
        }
    ]
}
```

#### Campaign

Represents adversary operations.

```json
{
    "type": "campaign",
    "spec_version": "2.1",
    "id": "campaign--<uuid>",
    "name": "Operation ShadowStrike",
    "description": "Targeted campaign against financial sector",
    "first_seen": "2025-06-01T00:00:00.000Z",
    "last_seen": "2026-01-01T00:00:00.000Z",
    "objective": "Financial theft and espionage"
}
```

#### Infrastructure

Adversary-controlled systems.

```json
{
    "type": "infrastructure",
    "spec_version": "2.1",
    "id": "infrastructure--<uuid>",
    "name": "ShadowStrike C2 Infrastructure",
    "description": "Command and control servers",
    "infrastructure_types": ["command-and-control"]
}
```

#### Vulnerability

Security vulnerabilities.

```json
{
    "type": "vulnerability",
    "spec_version": "2.1",
    "id": "vulnerability--<uuid>",
    "name": "CVE-2024-1234",
    "description": "Remote code execution vulnerability",
    "external_references": [
        {
            "source_name": "cve",
            "external_id": "CVE-2024-1234",
            "url": "https://nvd.nist.gov/vuln/detail/CVE-2024-1234"
        }
    ]
}
```

### Relationship Types

| Type | Description |
|------|-------------|
| `uses` | Actor uses capability |
| `targets` | Actor/campaign targets victim |
| `attributed-to` | Activity attributed to actor |
| `indicates` | Indicator indicates threat |
| `mitigates` | Course of action mitigates |
| `derived-from` | Derived from another object |
| `related-to` | Generic relationship |
| `hosts` | Infrastructure hosts malware |
| `owns` | Actor owns infrastructure |

### TLP Markings

| TLP Level | STIX ID | Sharing Scope |
|-----------|---------|---------------|
| `clear` | `marking-definition--613f2e26-...` | Public |
| `green` | `marking-definition--34098fce-...` | Community |
| `amber` | `marking-definition--f88d31f6-...` | Organization + clients |
| `amber+strict` | `marking-definition--826578e1-...` | Organization only |
| `red` | `marking-definition--5e57c739-...` | Individual recipients |

### STIX Pattern Syntax

| Pattern | Syntax |
|---------|--------|
| IP | `[ipv4-addr:value = '1.2.3.4']` |
| Domain | `[domain-name:value = 'evil.com']` |
| Hash | `[file:hashes.'SHA-256' = 'abc123...']` |
| URL | `[url:value = 'https://evil.com']` |
| Combined | `[A AND B]` |
| Regex | `[file:name MATCHES '^.*\\.exe$']` |

### Output Format

```
STIX BUNDLE GENERATION
========================================

BUNDLE ID: bundle--[uuid]
CREATED: [Timestamp]
TLP: [Classification]

BUNDLE CONTENTS
----------------------------------------
| Object Type | Count |
|-------------|-------|
| threat-actor | 1 |
| campaign | 1 |
| malware | 2 |
| attack-pattern | 5 |
| indicator | 15 |
| infrastructure | 3 |
| relationship | 12 |
| Total | 39 |

STIX BUNDLE (JSON)
----------------------------------------
{
    "type": "bundle",
    "id": "bundle--[uuid]",
    "objects": [...]
}

VALIDATION
----------------------------------------
* Schema validation: PASSED
* Reference integrity: PASSED
* Pattern syntax: PASSED
* TLP marking: APPLIED

SHARING OPTIONS
----------------------------------------
# Save to file
saved to: ti-bundle-2026-01-10.json

# Publish to TAXII server
taxii2-client publish --url <server> --collection <id> --bundle bundle.json
```

### Example Usage

```
User: "Create STIX bundle for these indicators"
       IPs: 192.168.1.1, 10.0.0.1
       Domains: evil.com, malware.net
       TLP: AMBER

User: "Export this threat actor intelligence as STIX"

User: "Package this campaign for sharing via TAXII"
```

---

## ThreatReport

Generate comprehensive threat intelligence reports by combining multiple analysis workflows.

### Trigger Phrases

- "threat report"
- "intelligence report"
- "ti summary"
- "create report"
- "generate ti report"
- "threat dossier"

### Input Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `threat` | Yes | Threat to report on (actor, campaign, malware, incident) |
| `scope` | No | Report scope: `executive`, `technical`, `comprehensive` |
| `format` | No | Output format: `markdown`, `pdf`, `json` |
| `include` | No | Specific sections to include |

### Report Sections

1. **Executive Summary**
   - Key findings (3-5 bullets)
   - Risk level
   - Recommended actions
   - TLP classification

2. **Threat Overview**
   - Threat identification
   - Attribution (if known)
   - Timeline
   - Scope and scale

3. **Technical Analysis**
   - TTPs (MITRE ATT&CK)
   - Kill Chain mapping
   - Diamond Model analysis
   - Malware analysis

4. **Indicators of Compromise**
   - Network indicators
   - File indicators
   - Behavioral indicators
   - Detection signatures

5. **Risk Assessment**
   - Risk score
   - Impact analysis
   - Likelihood factors
   - Affected assets

6. **Recommendations**
   - Immediate actions
   - Short-term mitigations
   - Long-term improvements

7. **Detection & Response**
   - YARA rules
   - Sigma rules
   - Hunting queries
   - Response playbook

8. **Intelligence Sharing**
   - STIX bundle
   - TLP guidance
   - Attribution caveats

9. **Appendices**
   - Full IoC list
   - References
   - Methodology

### Report Variants

| Scope | Pages | Content |
|-------|-------|---------|
| `executive` | 1-2 | Key findings, risk, recommendations |
| `technical` | 5-10 | Full analysis, IoCs, detection rules |
| `comprehensive` | 15+ | All sections, detailed appendices |

### Workflow Dependencies

The ThreatReport workflow invokes other workflows:

```
ThreatReport
    -> MonitorFeeds (latest feed data)
    -> AnalyzeIntelligence (detailed analysis)
    -> ExtractIoCs (indicator extraction)
    -> EnrichIoCs (IoC enrichment)
    -> MapToFrameworks (framework alignment)
    -> AssessRisk (risk scoring)
    -> GenerateYara (YARA rules)
    -> GenerateSigma (Sigma rules)
    -> CreateStixBundle (STIX export)
```

### Output Format

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

### Risk Level: CRITICAL (Score: 20/25)

### Key Findings
* [Finding 1]
* [Finding 2]
* [Finding 3]

### Recommended Actions
| Priority | Action | Timeline |
|----------|--------|----------|
| 1 | Block IoCs | Immediate |
| 2 | Hunt for presence | 24 hours |
| 3 | Patch vulnerabilities | 72 hours |

---

## 2. THREAT OVERVIEW

### Threat Identification
- Name: [Threat name]
- Type: [APT/Criminal/Hacktivism]
- Aliases: [Known aliases]
- First Observed: [Date]
- Status: [Active/Dormant]

### Attribution
- Actor: [Actor name] (Confidence: [Level])
- Motivation: [Espionage/Financial/Disruption]

---

## 3. TECHNICAL ANALYSIS

### 3.1 MITRE ATT&CK Mapping
[ATT&CK technique table]

### 3.2 Cyber Kill Chain
[Kill chain analysis]

### 3.3 Diamond Model
[Diamond model analysis]

---

## 4. INDICATORS OF COMPROMISE

### Network Indicators
| Type | Value | Context |
|------|-------|---------|
| IP | 198.51.100.1 | C2 Server |
| Domain | evil-c2.com | C2 Domain |

### File Indicators
| Hash (SHA256) | Filename | Type |
|---------------|----------|------|
| abc123... | payload.exe | Malware |

---

## 5. RISK ASSESSMENT

### Risk Score: [X]/25 - [LEVEL]
[Risk factor analysis]

---

## 6. RECOMMENDATIONS

### Immediate Actions (0-24 hours)
1. [Action]

### Short-term (1-7 days)
1. [Action]

---

## 7. DETECTION & RESPONSE

### YARA Rules
[YARA rule]

### Sigma Rules
[Sigma rule]

---

## 8. INTELLIGENCE SHARING

### STIX Bundle
[Bundle reference]

---

**END OF REPORT**

Generated by PAI ThreatIntelligence
```

### File Output

Reports can be saved to:

```
$PAI_DIR/history/research/threat-intel/{threat_name}/
    report_2026-01-10.md
    iocs_2026-01-10.csv
    stix_bundle_2026-01-10.json
    yara_rules_2026-01-10.yar
    sigma_rules_2026-01-10.yml
    attack_layer_2026-01-10.json
```

### Example Usage

```
User: "Create a comprehensive threat report on APT29"
       Scope: comprehensive
       Format: markdown
       TLP: AMBER

User: "Generate executive summary for this malware campaign"
       Scope: executive

User: "Create technical report with detection rules"
       Threat: LockBit ransomware
       Include: IoCs, YARA, Sigma
```

---

## See Also

- [STIX Generator Tool](../tools/stix-generator.md) - CLI tool documentation
- [STIX 2.1 Specification](https://docs.oasis-open.org/cti/stix/v2.1/stix-v2.1.html)
- [TAXII 2.1 Specification](https://docs.oasis-open.org/cti/taxii/v2.1/taxii-v2.1.html)
