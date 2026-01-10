# IoC Extractor Documentation

> CLI tool for extracting Indicators of Compromise from text

---

## Overview

The IoC Extractor (`IoCExtractor.ts`) is a command-line tool that extracts various types of Indicators of Compromise (IoCs) from text input. It supports both normal and defanged indicators, with options for validation and output formatting.

---

## Usage

```bash
bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts <input> [options]
```

Where `<input>` can be:
- A file path
- Direct text input (quoted string)
- `--stdin` flag to read from standard input

---

## Options

| Option | Description |
|--------|-------------|
| `--stdin` | Read input from stdin |
| `--refang` | Convert defanged IoCs to their real form |
| `--validate` | Validate each extracted IoC and exclude invalid ones |
| `--format <type>` | Output format: `json`, `csv`, or `table` (default: `json`) |
| `--help`, `-h` | Show help message |

---

## Supported IoC Types

The extractor recognizes the following indicator types:

### Network Indicators

| Type | Description | Example |
|------|-------------|---------|
| `ipv4` | IPv4 addresses | `192.168.1.1` |
| `ipv6` | IPv6 addresses | `2001:0db8:85a3::8a2e:0370:7334` |
| `domain` | Domain names | `evil.com` |
| `url` | URLs (http, https, ftp) | `https://evil.com/malware` |
| `email` | Email addresses | `attacker@evil.com` |

### File Indicators

| Type | Description | Example |
|------|-------------|---------|
| `md5` | MD5 hashes (32 hex chars) | `d41d8cd98f00b204e9800998ecf8427e` |
| `sha1` | SHA1 hashes (40 hex chars) | `da39a3ee5e6b4b0d3255bfef95601890afd80709` |
| `sha256` | SHA256 hashes (64 hex chars) | `e3b0c44298fc1c149afbf4c8996fb...` |
| `sha512` | SHA512 hashes (128 hex chars) | `cf83e1357eefb8bdf1542850d66d...` |

### Reference Indicators

| Type | Description | Example |
|------|-------------|---------|
| `cve` | CVE identifiers | `CVE-2021-44228` |
| `mitre_attack` | MITRE ATT&CK IDs | `T1566.001`, `TA0001` |

---

## Defanging and Refanging

### Defanged Formats Recognized

The extractor automatically recognizes defanged indicators:

| Type | Defanged Format | Refanged |
|------|-----------------|----------|
| Dots | `evil[.]com`, `evil(.)com` | `evil.com` |
| URLs | `hxxp://`, `hxxps://` | `http://`, `https://` |
| Email @ | `user[@]domain`, `user[at]domain` | `user@domain` |

### Using --refang

When `--refang` is specified, all defanged indicators in the output are converted to their real form:

```bash
echo "Check hxxps://evil[.]com/malware" | \
  bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts --stdin --refang --format json
```

Output will show `https://evil.com/malware` instead of the defanged form.

---

## Output Formats

### JSON Format (Default)

```bash
bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts report.txt --format json
```

```json
{
  "extracted_at": "2026-01-10T12:00:00.000Z",
  "source": "report.txt",
  "total_iocs": 5,
  "iocs": {
    "ipv4": ["192.168.1.100", "10.0.0.50"],
    "ipv6": [],
    "domain": ["evil.com"],
    "url": ["https://evil.com/payload.exe"],
    "email": [],
    "md5": ["d41d8cd98f00b204e9800998ecf8427e"],
    "sha1": [],
    "sha256": [],
    "sha512": [],
    "cve": [],
    "mitre_attack": []
  }
}
```

### CSV Format

```bash
bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts report.txt --format csv
```

```csv
type,value
ipv4,"192.168.1.100"
ipv4,"10.0.0.50"
domain,"evil.com"
url,"https://evil.com/payload.exe"
md5,"d41d8cd98f00b204e9800998ecf8427e"
```

### Table Format

```bash
bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts report.txt --format table
```

```
================================================================================
IoC Extraction Report
Extracted at: 2026-01-10T12:00:00.000Z
Source: report.txt
Total IoCs: 5
================================================================================

[IPV4] (2)
----------------------------------------
  192.168.1.100
  10.0.0.50

[DOMAIN] (1)
----------------------------------------
  evil.com

[URL] (1)
----------------------------------------
  https://evil.com/payload.exe

[MD5] (1)
----------------------------------------
  d41d8cd98f00b204e9800998ecf8427e

================================================================================
```

---

## Validation

When `--validate` is specified, each extracted IoC is validated and invalid ones are excluded:

```bash
bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts report.txt --validate --format json
```

### Validation Rules

| IoC Type | Validation |
|----------|------------|
| IPv4 | Valid octet values (0-255), correct format |
| IPv6 | Valid hex groups, correct format |
| Domain | Valid TLD, not reserved (local, localhost, etc.) |
| URL | Valid URL format |
| Email | Valid email format |
| Hashes | Correct length, valid hex chars, not all zeros |
| CVE | Valid year range (1999 to current+1) |
| MITRE | Valid ID format (T#### or TA####) |

### Private IP Ranges

IPv4 addresses in private ranges are marked but still included:
- `10.0.0.0/8`
- `172.16.0.0/12`
- `192.168.0.0/16`
- `127.0.0.0/8` (loopback)

---

## Examples

### Extract from File

```bash
bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts /path/to/threat-report.txt --format table
```

### Extract from Direct Text

```bash
bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts \
  "The malware connects to 192.168.1.1 and evil.com" \
  --format json
```

### Extract from Stdin

```bash
# From echo
echo "Check IP 8.8.8.8 and domain evil.com" | \
  bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts --stdin --format table

# From file via cat
cat report.txt | \
  bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts --stdin --format json

# From curl output
curl -s https://example.com/threat-report | \
  bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts --stdin --format csv
```

### Extract Defanged IoCs

```bash
echo "Malicious URL: hxxps://evil[.]com/payload[.]exe" | \
  bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts --stdin --refang --format table
```

### Validate Extracted IoCs

```bash
bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts report.txt --validate --format json
```

### Export to CSV for Further Processing

```bash
bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts report.txt --format csv > iocs.csv
```

---

## Deduplication

The extractor automatically:

1. **Removes duplicates** - Same IoC appearing multiple times
2. **Normalizes case** - Hashes are lowercased, domains are case-insensitive
3. **Avoids overlaps** - Domains are not extracted if they appear in URLs or emails

---

## Hash Detection Order

Hashes are detected in order of length to avoid false positives:

1. SHA512 (128 chars)
2. SHA256 (64 chars)
3. SHA1 (40 chars)
4. MD5 (32 chars)

Shorter hashes that are substrings of longer hashes are excluded.

---

## Integration with Other Tools

### Pipe to STIX Generator

```bash
# Extract IoCs and create STIX bundle
bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts report.txt --format json | \
  jq '.iocs.ipv4[]' | \
  xargs -I {} bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts --indicator "ip:{}"
```

### Save Results for Analysis

```bash
# Extract and save as JSON
bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts report.txt --format json > iocs.json

# Extract and save as CSV
bun run $PAI_DIR/skills/cti/Tools/IoCExtractor.ts report.txt --format csv > iocs.csv
```

---

## Programmatic Usage

The IoC Extractor exports functions that can be imported in other TypeScript files:

```typescript
import { extractIoCs, refang, defang, validateIoC } from './IoCExtractor.ts';

// Extract IoCs from text
const result = extractIoCs("Check IP 192.168.1.1 and domain evil.com", "source");

// Refang defanged text
const clean = refang("hxxps://evil[.]com");  // Returns "https://evil.com"

// Defang text
const defanged = defang("https://evil.com");  // Returns "hxxps://evil[.]com"

// Validate an IoC
const validation = validateIoC("ipv4", "192.168.1.1");
if (validation.valid) {
  console.log("Valid IoC");
} else {
  console.log(`Invalid: ${validation.reason}`);
}
```

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "No input provided" | Missing file/text/stdin | Provide input or use --stdin |
| "Invalid format" | Unknown format type | Use json, csv, or table |
| File not found | Invalid file path | Check file exists |

---

## See Also

- [ExtractIoCs Workflow](../workflows/extraction.md) - Workflow documentation
- [IoCPatterns.yaml](../configuration.md#iocpatternsyaml-format) - Pattern configuration
