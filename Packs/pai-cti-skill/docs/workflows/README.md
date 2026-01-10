# CTI Workflows Overview

> Procedural workflows for threat intelligence operations

---

## Overview

The PAI CTI Skill provides 11 workflows that cover the complete threat intelligence lifecycle. These workflows are invoked by natural language triggers and can call each other as needed.

---

## Workflow Categories

### Analysis Workflows

Workflows for analyzing and understanding threat intelligence.

| Workflow | Purpose | Trigger Phrases |
|----------|---------|-----------------|
| [AnalyzeIntelligence](analysis.md#analyzeintelligence) | Comprehensive threat analysis | "analyze threat", "analyze intelligence" |
| [AssessRisk](analysis.md#assessrisk) | ISO 27001/27005 risk scoring | "assess risk", "risk score", "calculate risk" |
| [MapToFrameworks](analysis.md#maptoframeworks) | Map to ATT&CK, Kill Chain, Diamond | "map to attack", "mitre mapping", "framework alignment" |

### Extraction Workflows

Workflows for extracting and enriching indicators.

| Workflow | Purpose | Trigger Phrases |
|----------|---------|-----------------|
| [ExtractIoCs](extraction.md#extractiocs) | Extract indicators from text | "extract iocs", "find indicators" |
| [EnrichIoCs](extraction.md#enrichiocs) | Enrich IoCs with external data | "enrich indicators", "lookup ioc" |

### Detection Workflows

Workflows for generating detection rules.

| Workflow | Purpose | Trigger Phrases |
|----------|---------|-----------------|
| [GenerateYara](detection.md#generateyara) | Create YARA rules | "create yara", "yara rule", "malware signature" |
| [GenerateSigma](detection.md#generatesigma) | Create Sigma rules | "create sigma", "siem rule", "log detection" |

### Sharing Workflows

Workflows for packaging and sharing intelligence.

| Workflow | Purpose | Trigger Phrases |
|----------|---------|-----------------|
| [CreateStixBundle](sharing.md#createstixbundle) | Generate STIX 2.1 bundles | "stix bundle", "export stix", "share intelligence" |
| [ThreatReport](sharing.md#threatreport) | Generate comprehensive reports | "threat report", "intelligence report" |

### Feed Workflows

Workflows for managing threat feeds.

| Workflow | Purpose | Trigger Phrases |
|----------|---------|-----------------|
| [MonitorFeeds](feeds.md#monitorfeeds) | Check threat feeds for new intel | "monitor threats", "check feeds", "latest threats" |
| [ManageFeeds](feeds.md#managefeeds) | Add, remove, configure feeds | "add feed", "list feeds", "configure feeds" |

---

## Workflow Documentation

- [Analysis Workflows](analysis.md) - AnalyzeIntelligence, AssessRisk, MapToFrameworks
- [Extraction Workflows](extraction.md) - ExtractIoCs, EnrichIoCs
- [Detection Workflows](detection.md) - GenerateYara, GenerateSigma
- [Sharing Workflows](sharing.md) - CreateStixBundle, ThreatReport
- [Feeds Workflows](feeds.md) - MonitorFeeds, ManageFeeds

---

## Workflow Architecture

### Location

Workflows are stored in `$PAI_DIR/skills/cti/Workflows/` as Markdown files:

```
Workflows/
    AnalyzeIntelligence.md
    AssessRisk.md
    CreateStixBundle.md
    EnrichIoCs.md
    ExtractIoCs.md
    GenerateSigma.md
    GenerateYara.md
    ManageFeeds.md
    MapToFrameworks.md
    MonitorFeeds.md
    ThreatReport.md
```

### Structure

Each workflow contains:

1. **Trigger Phrases** - Natural language patterns that invoke the workflow
2. **Input** - Required and optional parameters
3. **Process** - Step-by-step procedure
4. **Output Format** - Expected output structure
5. **Tools & APIs Used** - External dependencies
6. **Ethical Notes** - Usage considerations

### Workflow Chaining

Workflows can invoke other workflows:

```
ThreatReport
    MonitorFeeds ------> Latest feed data
    AnalyzeIntelligence  Full analysis
    ExtractIoCs -------> Indicator extraction
    EnrichIoCs --------> IoC enrichment
    MapToFrameworks ---> Framework alignment
    AssessRisk --------> Risk scoring
    GenerateYara ------> Detection rules
    GenerateSigma -----> SIEM rules
    CreateStixBundle --> STIX export
```

---

## Common Inputs

### Intelligence Sources

| Input Type | Description |
|------------|-------------|
| Text | Raw text containing threat intelligence |
| File | Path to a threat report file |
| URL | URL to fetch threat intelligence from |
| IoC List | List of indicators to analyze/enrich |
| STIX Bundle | Existing STIX data to process |

### TLP Classification

All workflows respect Traffic Light Protocol:

| TLP | Description |
|-----|-------------|
| `clear` | Public disclosure allowed |
| `green` | Community sharing |
| `amber` | Limited distribution |
| `red` | Individual recipients only |

---

## Common Outputs

### Knowledge Graph Storage

All workflows can store results to the PAI Knowledge Graph:

```yaml
Knowledge Episode:
  Name: "Analysis: {threat_name}"
  Data: Structured analysis results
  Group: "threat-intel-{category}"
  Relationships: Links to related entities
```

### File Output

Workflows can save results to files:

```
$PAI_DIR/history/research/threat-intel/{threat}/
    report_2026-01-10.md
    iocs_2026-01-10.csv
    bundle_2026-01-10.json
    yara_2026-01-10.yar
    sigma_2026-01-10.yml
```

---

## Using Workflows

### Via Natural Language

Ask your AI assistant using trigger phrases:

```
User: "Extract IoCs from this threat report"
User: "Analyze this malware and map to MITRE ATT&CK"
User: "Create a STIX bundle for these indicators"
User: "Generate YARA rules for this ransomware"
User: "What's the risk assessment for this threat?"
```

### With Context

Provide additional context for better results:

```
User: "Extract IoCs from this report and enrich them"
       [Paste report text]

User: "Analyze this threat targeting the financial sector"
       Intelligence source: Mandiant blog
       TLP: AMBER

User: "Create Sigma rules for detecting this PowerShell behavior"
       Behavior: Encoded command execution
       Target: Windows Sysmon logs
```

---

## Workflow Dependencies

Some workflows depend on other PAI skills:

| Dependency | Required By | Purpose |
|------------|-------------|---------|
| Knowledge Skill | All | Store/retrieve intelligence |
| Browser Skill | MonitorFeeds, EnrichIoCs | Fetch web content |
| OSINT Skill | EnrichIoCs | Additional enrichment |

---

## Best Practices

1. **Provide context** - The more context you provide, the better the analysis
2. **Specify TLP** - Always indicate sharing restrictions
3. **Validate results** - Review generated rules before deployment
4. **Chain workflows** - Combine workflows for comprehensive analysis
5. **Store to Knowledge** - Persist important findings for future reference
