# Getting Started with PAI CTI Skill

> Quick start guide for the PAI Cyber Threat Intelligence Skill Pack

---

## Prerequisites

Before installing the CTI skill, ensure you have:

### Required

- **Bun runtime** - JavaScript/TypeScript runtime
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```

- **Claude Code** (or compatible AI agent system)

- **Write access** to `$PAI_DIR/` (typically `~/.claude`)

### Recommended

- **pai-knowledge-system** - For storing intelligence in the knowledge graph
- **Browser skill** - For fetching threat feeds and reports

### Optional (for premium feeds)

- AlienVault OTX API key
- VirusTotal API key
- Shodan API key
- URLScan API key

---

## Installation Summary

Installation is performed by your AI assistant using the wizard in `INSTALL.md`. The basic steps are:

1. **Create directory structure**
   ```bash
   mkdir -p $PAI_DIR/skills/cti/{Tools,Workflows,Frameworks,Data}
   ```

2. **Copy skill files** from the pack's `src/skills/cti/` directory

3. **Install dependencies**
   ```bash
   cd $PAI_DIR/skills/cti/Tools
   bun install
   ```

4. **Verify installation**
   ```bash
   bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts list
   ```

For detailed installation instructions, see the `INSTALL.md` file in the pack root.

---

## First Steps

Once installed, try these commands to verify everything is working:

### 1. List Available Threat Feeds

```bash
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts list
```

Expected output:
```
Found 18 feed(s):

NAME                          CATEGORY    FORMAT  ENABLED PRIORITY
-------------------------------------------------------------------------
abuse.ch URLhaus              malware     json    Yes     1
abuse.ch MalwareBazaar        malware     json    Yes     1
abuse.ch ThreatFox            iocs        json    Yes     1
...
```

### 2. Extract IoCs from Text

```bash
echo "Malicious IP 192.168.1.100 connects to evil.com and drops hash d41d8cd98f00b204e9800998ecf8427e" | \
  bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts --stdin --format table
```

Expected output:
```
================================================================================
IoC Extraction Report
Extracted at: 2026-01-10T12:00:00.000Z
Source: stdin
Total IoCs: 3
================================================================================

[IPV4] (1)
----------------------------------------
  192.168.1.100

[DOMAIN] (1)
----------------------------------------
  evil.com

[MD5] (1)
----------------------------------------
  d41d8cd98f00b204e9800998ecf8427e
```

### 3. Generate a STIX Indicator

```bash
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts \
  --indicator "ip:203.0.113.42" \
  --name "Test C2 Server" \
  --tlp green
```

Expected output: A valid STIX 2.1 JSON bundle.

### 4. Test a Threat Feed

```bash
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts test --name "OpenPhish"
```

Expected output:
```
Testing feed "OpenPhish"...

[OK] OpenPhish
     Status: 200
     Response Time: 245ms
     Parseable: Yes
```

---

## Common Use Cases

### Extract IoCs from a Threat Report

When you receive a threat report (PDF, text, or URL), extract all indicators:

```bash
# From a file
bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts report.txt --format json

# From a URL (via AI assistant)
# Ask: "Extract IoCs from https://example.com/threat-report"
```

### Analyze a Threat

Ask your AI assistant to perform comprehensive analysis:

```
User: "Analyze this threat report and map to MITRE ATT&CK"
```

The AI will:
1. Extract IoCs
2. Map TTPs to ATT&CK techniques
3. Identify Kill Chain phases
4. Apply Diamond Model analysis
5. Calculate risk score

### Create Detection Rules

Generate YARA or Sigma rules from threat intelligence:

```
User: "Create YARA rules for detecting the malware described in this report"
User: "Generate Sigma rules for detecting this PowerShell behavior"
```

### Monitor Threat Feeds

Check for new threat intelligence:

```
User: "Check the latest threat intelligence feeds"
User: "What's new in threat intel today?"
```

### Share Intelligence

Package intelligence for sharing:

```
User: "Create a STIX bundle for these indicators with TLP:AMBER"
```

---

## Natural Language Triggers

The CTI skill responds to various natural language requests. Examples:

| Request | Workflow Triggered |
|---------|-------------------|
| "Extract IoCs from this report" | ExtractIoCs |
| "Analyze this threat" | AnalyzeIntelligence |
| "Map to MITRE ATT&CK" | MapToFrameworks |
| "Assess the risk" | AssessRisk |
| "Create YARA rule" | GenerateYara |
| "Create Sigma rule" | GenerateSigma |
| "Generate STIX bundle" | CreateStixBundle |
| "Enrich these IPs" | EnrichIoCs |
| "Generate threat report" | ThreatReport |
| "Monitor threat feeds" | MonitorFeeds |
| "Add a new feed" | ManageFeeds |

---

## Directory Structure After Installation

```
$PAI_DIR/skills/cti/
    SKILL.md                    # Skill routing configuration
    Tools/
        FeedManager.ts          # Feed management CLI
        IoCExtractor.ts         # IoC extraction CLI
        StixGenerator.ts        # STIX generation CLI
        package.json            # Dependencies
        node_modules/           # Installed packages
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
    Frameworks/
        CyberKillChain.md
        DiamondModel.md
        MitreAttack.md
        RiskScoring.md
    Data/
        TISources.yaml          # Feed configuration
        IoCPatterns.yaml        # IoC regex patterns
```

---

## Next Steps

1. **Configure API keys** for premium feeds - See [Configuration](configuration.md)
2. **Explore the tools** - See [Tools Documentation](tools/README.md)
3. **Learn the workflows** - See [Workflows Documentation](workflows/README.md)
4. **Understand the frameworks** - See [Frameworks Documentation](frameworks/README.md)

---

## Troubleshooting

If you encounter issues:

1. Verify Bun is installed: `bun --version`
2. Check dependencies are installed: `cd $PAI_DIR/skills/cti/Tools && bun install`
3. Verify SKILL.md exists: `ls $PAI_DIR/skills/cti/SKILL.md`

For more help, see the [Troubleshooting Guide](troubleshooting.md).
