# CTI Tools Overview

> Command-line tools for threat intelligence operations

---

## Available Tools

The PAI CTI Skill includes three CLI tools, each designed for specific threat intelligence tasks:

| Tool | File | Purpose |
|------|------|---------|
| **Feed Manager** | `FeedManager.ts` | Manage threat intelligence feed sources |
| **IoC Extractor** | `IoCExtractor.ts` | Extract indicators of compromise from text |
| **STIX Generator** | `StixGenerator.ts` | Generate STIX 2.1 bundles for sharing |

---

## Tool Documentation

- [Feed Manager](feed-manager.md) - Complete guide to managing threat feeds
- [IoC Extractor](ioc-extractor.md) - Complete guide to extracting indicators
- [STIX Generator](stix-generator.md) - Complete guide to generating STIX bundles

---

## Running Tools

All tools are TypeScript files that run with Bun. The general pattern is:

```bash
bun run $PAI_DIR/skills/cti/Tools/<ToolName>.ts [command] [options]
```

### Quick Reference

```bash
# Feed Manager
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts list
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts test --all
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts add --name "My Feed" --url "..." --category malware --format json

# IoC Extractor
bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts report.txt --format table
echo "text with IoCs" | bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts --stdin --format json

# STIX Generator
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts --indicator "ip:1.2.3.4" --name "Malicious IP" --tlp amber
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts --input intel.json --output bundle.json
```

---

## Common Options

### Output Formats

Most tools support multiple output formats:

| Format | Description |
|--------|-------------|
| `json` | Machine-readable JSON output |
| `table` | Human-readable tabular output |
| `csv` | Comma-separated values (IoC Extractor) |

### Help

All tools support `--help` or `-h` to display usage information:

```bash
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts --help
bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts --help
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts --help
```

---

## Tool Integration

These tools are typically invoked by the AI assistant when processing threat intelligence requests. However, they can also be used directly from the command line for:

- **Scripting** - Integrate into automated workflows
- **Batch processing** - Process multiple files
- **Testing** - Verify feed connectivity
- **Development** - Debug and extend functionality

---

## Dependencies

The tools require the `yaml` package for parsing configuration files. Install dependencies with:

```bash
cd $PAI_DIR/skills/cti/Tools
bun install
```

The `package.json` specifies:

```json
{
  "dependencies": {
    "yaml": "^2.3.4"
  }
}
```

---

## Environment Variables

Tools use these environment variables:

| Variable | Purpose |
|----------|---------|
| `PAI_DIR` | Base directory for PAI installation (default: `~/.claude`) |
| `PAI_CTI_OTX_API_KEY` | AlienVault OTX API key |
| `PAI_CTI_VIRUSTOTAL_API_KEY` | VirusTotal API key |
| `PAI_CTI_SHODAN_API_KEY` | Shodan API key |
| `PAI_CTI_URLSCAN_API_KEY` | URLScan.io API key |

See [Configuration](../configuration.md) for details on setting up API keys.
