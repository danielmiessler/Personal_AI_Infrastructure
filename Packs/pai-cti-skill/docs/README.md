# PAI CTI Skill Documentation

> Comprehensive documentation for the PAI Cyber Threat Intelligence Skill Pack

---

## Documentation Index

### Getting Started

- [Getting Started Guide](getting-started.md) - Quick start, prerequisites, and first steps

### Configuration

- [Configuration Reference](configuration.md) - Environment variables, YAML configuration, custom feeds

### Troubleshooting

- [Troubleshooting Guide](troubleshooting.md) - Common issues and solutions

---

## Tools

The CTI skill includes three CLI tools for threat intelligence operations.

| Tool | Purpose | Documentation |
|------|---------|---------------|
| **FeedManager** | Manage threat intelligence feed sources | [Feed Manager](tools/feed-manager.md) |
| **IoCExtractor** | Extract indicators of compromise from text | [IoC Extractor](tools/ioc-extractor.md) |
| **StixGenerator** | Generate STIX 2.1 bundles for intelligence sharing | [STIX Generator](tools/stix-generator.md) |

- [Tools Overview](tools/README.md)

---

## Workflows

The CTI skill provides 11 workflows covering the complete threat intelligence lifecycle.

| Category | Workflows |
|----------|-----------|
| **Analysis** | AnalyzeIntelligence, AssessRisk, MapToFrameworks |
| **Extraction** | ExtractIoCs, EnrichIoCs |
| **Detection** | GenerateYara, GenerateSigma |
| **Sharing** | CreateStixBundle, ThreatReport |
| **Feeds** | MonitorFeeds, ManageFeeds |

- [Workflows Overview](workflows/README.md)
- [Analysis Workflows](workflows/analysis.md)
- [Extraction Workflows](workflows/extraction.md)
- [Detection Workflows](workflows/detection.md)
- [Sharing Workflows](workflows/sharing.md)
- [Feeds Workflows](workflows/feeds.md)

---

## Frameworks

Reference documentation for threat intelligence frameworks.

| Framework | Purpose | Documentation |
|-----------|---------|---------------|
| **MITRE ATT&CK** | Adversary tactics and techniques mapping | [MITRE ATT&CK Guide](frameworks/mitre-attack.md) |
| **Risk Scoring** | ISO 27001/27005 risk assessment methodology | [Risk Assessment Guide](frameworks/risk-assessment.md) |
| **Cyber Kill Chain** | Attack phase identification | [Frameworks Overview](frameworks/README.md) |
| **Diamond Model** | Intrusion analysis structuring | [Frameworks Overview](frameworks/README.md) |

- [Frameworks Overview](frameworks/README.md)

---

## Quick Reference

### Common Commands

```bash
# List all threat feeds
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts list

# Extract IoCs from a file
bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts report.txt --format table

# Generate a STIX indicator
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts --indicator "ip:1.2.3.4" --tlp amber

# Test all feeds
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts test --all
```

### Natural Language Triggers

Ask your AI assistant using phrases like:

- "Extract IoCs from this malware report"
- "Analyze this threat and map to MITRE ATT&CK"
- "Create YARA rules for this malware sample"
- "Generate a STIX bundle for these indicators"
- "Assess the risk of this threat actor"
- "List all threat intelligence feeds"

---

## Architecture

```
$PAI_DIR/skills/cti/
    SKILL.md              # Skill routing and configuration
    Tools/
        FeedManager.ts    # CLI for managing feeds
        IoCExtractor.ts   # CLI for extracting indicators
        StixGenerator.ts  # CLI for generating STIX bundles
    Workflows/
        *.md              # 11 workflow procedures
    Frameworks/
        *.md              # 4 framework references
    Data/
        TISources.yaml    # Feed configuration
        IoCPatterns.yaml  # IoC regex patterns
```

---

## Version

- **Pack Version:** 1.0.0
- **Documentation Version:** 1.0.0
- **Last Updated:** 2026-01-10

---

## Support

For issues or questions:

1. Check the [Troubleshooting Guide](troubleshooting.md)
2. Review the [Configuration Reference](configuration.md)
3. Consult the source files in the pack directory
