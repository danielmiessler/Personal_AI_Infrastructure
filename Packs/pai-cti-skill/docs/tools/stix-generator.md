# STIX Generator Documentation

> CLI tool for generating STIX 2.1 bundles for intelligence sharing

---

## Overview

The STIX Generator (`StixGenerator.ts`) creates valid STIX 2.1 JSON bundles from threat intelligence data. It supports indicators, malware, threat actors, attack patterns, and relationships with proper TLP markings.

---

## Usage

```bash
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts [options]
```

---

## Options

| Option | Short | Description |
|--------|-------|-------------|
| `--input <file>` | `-i` | Input JSON file with threat intelligence |
| `--output <file>` | `-o` | Output file for STIX bundle (default: stdout) |
| `--indicator <ioc>` | - | Single indicator (format: `type:value` or just `value`) |
| `--name <name>` | `-n` | Name for the indicator |
| `--iocs <file>` | - | CSV file with IoCs |
| `--threat <name>` | `-t` | Threat/campaign name for IoC context |
| `--tlp <level>` | - | TLP marking: `clear`, `green`, `amber`, `amber+strict`, `red` |
| `--help` | `-h` | Show help message |

---

## STIX 2.1 Object Types Supported

### Indicators

Indicators represent patterns that match observable data.

```bash
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts \
  --indicator "ip:203.0.113.42" \
  --name "APT29 C2 Server"
```

### Malware

Malware objects describe malicious software.

Created via input JSON file:

```json
{
  "malware": [
    {
      "name": "WellMess",
      "types": ["remote-access-trojan"],
      "description": "RAT used by APT29"
    }
  ]
}
```

### Threat Actors

Threat actor objects represent adversaries.

```json
{
  "threatActors": [
    {
      "name": "APT29",
      "types": ["nation-state"],
      "description": "Russian threat actor"
    }
  ]
}
```

### Attack Patterns

Attack patterns represent TTPs (aligned with MITRE ATT&CK).

```json
{
  "attackPatterns": [
    {
      "name": "Spearphishing Attachment",
      "description": "T1566.001"
    }
  ]
}
```

### Relationships

Relationships connect objects.

```json
{
  "relationships": [
    {
      "source": "threat-actor--uuid",
      "target": "malware--uuid",
      "type": "uses"
    }
  ]
}
```

---

## TLP Markings

Traffic Light Protocol (TLP 2.0) markings are applied to objects:

| TLP Level | Sharing Scope | STIX ID |
|-----------|---------------|---------|
| `clear` | Public disclosure | `marking-definition--613f2e26-...` |
| `green` | Community sharing | `marking-definition--34098fce-...` |
| `amber` | Organization + clients | `marking-definition--f88d31f6-...` |
| `amber+strict` | Organization only | `marking-definition--826578e1-...` |
| `red` | Individual recipients | `marking-definition--5e57c739-...` |

```bash
# Apply TLP:AMBER marking
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts \
  --indicator "domain:evil.com" \
  --tlp amber
```

---

## Indicator Types

The generator supports these indicator types:

| Type | STIX Pattern | Example Input |
|------|--------------|---------------|
| `ip` or `ipv4` | `[ipv4-addr:value = '...']` | `ip:192.168.1.1` |
| `ipv6` | `[ipv6-addr:value = '...']` | `ipv6:2001:db8::1` |
| `domain` | `[domain-name:value = '...']` | `domain:evil.com` |
| `url` | `[url:value = '...']` | `url:https://evil.com` |
| `md5` | `[file:hashes.'MD5' = '...']` | `md5:d41d8cd...` |
| `sha1` | `[file:hashes.'SHA-1' = '...']` | `sha1:da39a3...` |
| `sha256` | `[file:hashes.'SHA-256' = '...']` | `sha256:e3b0c4...` |
| `sha512` | `[file:hashes.'SHA-512' = '...']` | `sha512:cf83e1...` |
| `email` | `[email-addr:value = '...']` | `email:bad@evil.com` |

### Auto-Detection

If no type is specified, the generator auto-detects:

```bash
# Auto-detects as IPv4
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts --indicator "192.168.1.1"

# Auto-detects as domain
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts --indicator "evil.com"

# Auto-detects as SHA256
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts --indicator "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
```

---

## Input Formats

### Single Indicator

```bash
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts \
  --indicator "ip:203.0.113.42" \
  --name "Malicious IP" \
  --tlp amber
```

### Input JSON File

Create a JSON file with threat intelligence:

```json
{
  "indicators": [
    { "type": "ip", "value": "203.0.113.42", "description": "C2 server" },
    { "type": "domain", "value": "evil.com", "description": "Phishing domain" },
    { "value": "d41d8cd98f00b204e9800998ecf8427e", "description": "Malware hash" }
  ],
  "malware": [
    {
      "name": "ShadowRAT",
      "types": ["remote-access-trojan"],
      "description": "Custom RAT"
    }
  ],
  "threatActors": [
    {
      "name": "APT-X",
      "types": ["crime-syndicate"],
      "description": "Financial threat actor"
    }
  ],
  "attackPatterns": [
    {
      "name": "Spearphishing Attachment",
      "description": "Initial access via phishing"
    }
  ],
  "tlp": "amber"
}
```

Generate bundle:

```bash
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts \
  --input intel.json \
  --output bundle.json
```

### CSV File with IoCs

Create a CSV file:

```csv
type,value,description
ip,203.0.113.42,C2 server
domain,evil.com,Phishing domain
sha256,e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855,Malware sample
```

Or simple format (type auto-detected):

```csv
192.168.1.1
evil.com
d41d8cd98f00b204e9800998ecf8427e
```

Generate bundle:

```bash
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts \
  --iocs iocs.csv \
  --threat "APT29 Campaign" \
  --tlp amber \
  --output bundle.json
```

---

## Output

### To Stdout (Default)

```bash
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts \
  --indicator "ip:1.2.3.4"
```

Outputs valid STIX 2.1 JSON to stdout.

### To File

```bash
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts \
  --indicator "ip:1.2.3.4" \
  --output bundle.json
```

Outputs:
```
STIX bundle written to: bundle.json
Objects: 2
```

---

## STIX Bundle Structure

Generated bundles follow STIX 2.1 specification:

```json
{
  "type": "bundle",
  "id": "bundle--<uuid>",
  "objects": [
    {
      "type": "indicator",
      "spec_version": "2.1",
      "id": "indicator--<uuid>",
      "created": "2026-01-10T12:00:00.000Z",
      "modified": "2026-01-10T12:00:00.000Z",
      "name": "IP Indicator: 203.0.113.42",
      "pattern": "[ipv4-addr:value = '203.0.113.42']",
      "pattern_type": "stix",
      "valid_from": "2026-01-10T12:00:00.000Z",
      "object_marking_refs": [
        "marking-definition--f88d31f6-486f-44da-b317-01333bde0b82"
      ]
    },
    {
      "type": "marking-definition",
      "spec_version": "2.1",
      "id": "marking-definition--f88d31f6-486f-44da-b317-01333bde0b82",
      "created": "2017-01-20T00:00:00.000Z",
      "definition_type": "tlp",
      "name": "TLP:AMBER",
      "definition": { "tlp": "amber" }
    }
  ]
}
```

---

## Examples

### Single IP Indicator

```bash
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts \
  --indicator "ip:203.0.113.42" \
  --name "APT29 C2 Server" \
  --tlp red
```

### Domain with Description

```bash
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts \
  --indicator "domain:evil-phishing.com" \
  --name "Phishing Domain" \
  --tlp amber \
  --output phishing-indicator.json
```

### Hash Indicator

```bash
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts \
  --indicator "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" \
  --name "Malware Sample" \
  --tlp amber
```

### Comprehensive Intelligence File

```bash
# Create intel.json with threat actors, malware, etc.
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts \
  --input intel.json \
  --output campaign-bundle.json
```

### Batch IoCs from CSV

```bash
bun run $PAI_DIR/skills/cti/Tools/StixGenerator.ts \
  --iocs indicators.csv \
  --threat "Operation ShadowStrike" \
  --tlp amber \
  --output operation-iocs.json
```

---

## STIX Pattern Syntax

The generator creates patterns in STIX 2.1 pattern language:

| Pattern Type | Syntax |
|--------------|--------|
| IPv4 | `[ipv4-addr:value = '1.2.3.4']` |
| IPv6 | `[ipv6-addr:value = '2001:db8::1']` |
| Domain | `[domain-name:value = 'evil.com']` |
| URL | `[url:value = 'https://evil.com']` |
| MD5 | `[file:hashes.'MD5' = 'abc123...']` |
| SHA-1 | `[file:hashes.'SHA-1' = 'abc123...']` |
| SHA-256 | `[file:hashes.'SHA-256' = 'abc123...']` |
| SHA-512 | `[file:hashes.'SHA-512' = 'abc123...']` |
| Email | `[email-addr:value = 'bad@evil.com']` |

---

## Programmatic Usage

The STIX Generator exports functions for use in other TypeScript files:

```typescript
import {
  createIndicator,
  createMalware,
  createThreatActor,
  createBundle,
  getTlpDefinition,
  generatePattern,
  parseIndicatorString
} from './StixGenerator.ts';

// Create an indicator
const ioc = parseIndicatorString("ip:1.2.3.4");
const indicator = createIndicator(ioc, {
  name: "Malicious IP",
  tlp: "amber"
});

// Create malware
const malware = createMalware("WellMess", {
  malwareTypes: ["remote-access-trojan"],
  description: "RAT used by APT29"
});

// Create a bundle
const bundle = createBundle([indicator, malware, getTlpDefinition("amber")]);

console.log(JSON.stringify(bundle, null, 2));
```

---

## TAXII Publishing

After generating a STIX bundle, you can publish to a TAXII server using external tools. The following Python example demonstrates integration with TAXII 2.1 servers:

```python
# Requires: pip install taxii2-client
from taxii2client.v21 import Collection
import json

# Load bundle generated by StixGenerator
with open('bundle.json') as f:
    bundle = json.load(f)

# Connect and publish
collection = Collection(
    "https://taxii.example.com/collections/12345/",
    user="api_user",
    password="api_key"
)

for obj in bundle['objects']:
    collection.add_objects([obj])
```

> **Note:** This is an external integration example. The StixGenerator.ts tool creates the STIX bundle; publishing to TAXII servers requires additional tooling.

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "No input provided" | Missing input | Use --indicator, --input, or --iocs |
| "Unsupported IoC type" | Unknown type | Use supported type prefix |
| "Invalid TLP level" | Invalid TLP value | Use clear, green, amber, amber+strict, or red |

---

## See Also

- [CreateStixBundle Workflow](../workflows/sharing.md) - Workflow documentation
- [STIX 2.1 Specification](https://docs.oasis-open.org/cti/stix/v2.1/stix-v2.1.html) - Official STIX documentation
