# Create STIX Bundle Workflow

Package threat intelligence as STIX 2.1 bundles for standardized intelligence sharing.

## Trigger Phrases
- "stix bundle"
- "taxii export"
- "share intelligence"
- "export stix"
- "cti sharing"
- "create stix"
- "package intelligence"

## Input
- `intelligence`: Threat intelligence data to package
- `tlp`: Traffic Light Protocol classification
- `include_relationships` (optional): Include relationship objects (default: true)
- `include_sightings` (optional): Include sighting objects (default: false)

## Process

### Step 1: Parse Intelligence Data
```
Extract from input:
- Threat actors
- Malware samples
- Attack patterns (TTPs)
- Indicators of Compromise
- Infrastructure
- Campaigns
- Vulnerabilities
- Observed behaviors
```

### Step 2: Create STIX Domain Objects (SDOs)

**Attack Pattern (TTPs):**
```json
{
    "type": "attack-pattern",
    "spec_version": "2.1",
    "id": "attack-pattern--<uuid>",
    "created": "2026-01-10T00:00:00.000Z",
    "modified": "2026-01-10T00:00:00.000Z",
    "name": "Spearphishing Link",
    "description": "Adversaries send spearphishing emails with a malicious link.",
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

**Campaign:**
```json
{
    "type": "campaign",
    "spec_version": "2.1",
    "id": "campaign--<uuid>",
    "created": "2026-01-10T00:00:00.000Z",
    "modified": "2026-01-10T00:00:00.000Z",
    "name": "Operation ShadowStrike",
    "description": "Targeted campaign against financial sector",
    "first_seen": "2025-06-01T00:00:00.000Z",
    "last_seen": "2026-01-01T00:00:00.000Z",
    "objective": "Financial theft and espionage"
}
```

**Indicator:**
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

**Infrastructure:**
```json
{
    "type": "infrastructure",
    "spec_version": "2.1",
    "id": "infrastructure--<uuid>",
    "created": "2026-01-10T00:00:00.000Z",
    "modified": "2026-01-10T00:00:00.000Z",
    "name": "ShadowStrike C2 Infrastructure",
    "description": "Command and control servers",
    "infrastructure_types": ["command-and-control"]
}
```

**Malware:**
```json
{
    "type": "malware",
    "spec_version": "2.1",
    "id": "malware--<uuid>",
    "created": "2026-01-10T00:00:00.000Z",
    "modified": "2026-01-10T00:00:00.000Z",
    "name": "ShadowRAT",
    "description": "Remote access trojan used in Operation ShadowStrike",
    "malware_types": ["remote-access-trojan"],
    "is_family": false,
    "capabilities": [
        "communicates-with-c2",
        "exfiltrates-data",
        "captures-credentials"
    ]
}
```

**Threat Actor:**
```json
{
    "type": "threat-actor",
    "spec_version": "2.1",
    "id": "threat-actor--<uuid>",
    "created": "2026-01-10T00:00:00.000Z",
    "modified": "2026-01-10T00:00:00.000Z",
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

**Vulnerability:**
```json
{
    "type": "vulnerability",
    "spec_version": "2.1",
    "id": "vulnerability--<uuid>",
    "created": "2026-01-10T00:00:00.000Z",
    "modified": "2026-01-10T00:00:00.000Z",
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

### Step 3: Create Relationship Objects (SROs)

**Relationship Types:**
```
uses           - Actor uses capability
targets        - Actor/campaign targets victim
attributed-to  - Activity attributed to actor
indicates      - Indicator indicates threat
mitigates      - Course of action mitigates
derived-from   - Derived from another object
related-to     - Generic relationship
based-on       - Based on another object
variant-of     - Variant of malware
hosts          - Infrastructure hosts malware
owns           - Actor owns infrastructure
```

**Relationship Object:**
```json
{
    "type": "relationship",
    "spec_version": "2.1",
    "id": "relationship--<uuid>",
    "created": "2026-01-10T00:00:00.000Z",
    "modified": "2026-01-10T00:00:00.000Z",
    "relationship_type": "uses",
    "source_ref": "threat-actor--<uuid>",
    "target_ref": "malware--<uuid>",
    "description": "ShadowGroup uses ShadowRAT in their operations"
}
```

**Sighting Object:**
```json
{
    "type": "sighting",
    "spec_version": "2.1",
    "id": "sighting--<uuid>",
    "created": "2026-01-10T00:00:00.000Z",
    "modified": "2026-01-10T00:00:00.000Z",
    "sighting_of_ref": "indicator--<uuid>",
    "first_seen": "2026-01-09T12:00:00.000Z",
    "last_seen": "2026-01-09T18:00:00.000Z",
    "count": 5,
    "where_sighted_refs": ["identity--<organization-uuid>"]
}
```

### Step 4: Add Marking Definitions

**TLP Markings:**
```json
{
    "type": "marking-definition",
    "spec_version": "2.1",
    "id": "marking-definition--613f2e26-407d-48c7-9eca-b8e91df99dc9",
    "created": "2017-01-20T00:00:00.000Z",
    "definition_type": "tlp",
    "definition": {
        "tlp": "clear"
    }
}
```

**Standard TLP IDs:**
```
TLP:CLEAR  - marking-definition--613f2e26-407d-48c7-9eca-b8e91df99dc9
TLP:GREEN  - marking-definition--34098fce-860f-48ae-8e50-ebd3cc5e41da
TLP:AMBER  - marking-definition--f88d31f6-486f-44da-b317-01333bde0b82
TLP:AMBER+STRICT - marking-definition--826578e1-40ad-459f-bc73-ede076f81f37
TLP:RED    - marking-definition--5e57c739-391a-4eb3-b6be-7d15ca92d5ed
```

### Step 5: Create Bundle

**STIX Bundle Structure:**
```json
{
    "type": "bundle",
    "id": "bundle--<uuid>",
    "objects": [
        { /* threat-actor */ },
        { /* campaign */ },
        { /* malware */ },
        { /* attack-pattern */ },
        { /* indicator */ },
        { /* infrastructure */ },
        { /* relationship objects */ },
        { /* marking-definition */ }
    ]
}
```

### Step 6: Validate Bundle

```
Validation checks:
1. Valid JSON structure
2. All required fields present
3. Valid STIX 2.1 types
4. UUID format correct
5. Timestamp format correct
6. Relationship refs exist
7. Pattern syntax valid (for indicators)
8. External references valid
```

### Step 7: Store to Knowledge Graph

Use the **Knowledge** skill:

```
Store the following as structured episodes:

1. STIX Bundle:
   - Name: "STIX Bundle: {bundle_id}"
   - Data: Complete bundle, object count
   - Group: "threat-intel-stix"

2. Bundle Contents:
   - Name: "STIX Objects: {bundle_id}"
   - Data: Object types and counts
   - Relationships preserved

3. Sharing Record:
   - Name: "STIX Share: {bundle_id}"
   - Data: TLP, recipients, timestamp
   - Audit trail
```

## Output Format

```
📋 STIX BUNDLE GENERATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 BUNDLE ID: bundle--[uuid]
📅 CREATED: [timestamp]
🔒 TLP: [classification]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 BUNDLE CONTENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
| Object Type | Count |
|-------------|-------|
| threat-actor | 1 |
| campaign | 1 |
| malware | 2 |
| attack-pattern | 5 |
| indicator | 15 |
| infrastructure | 3 |
| relationship | 12 |
| **Total** | **39** |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 STIX BUNDLE (JSON)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```json
{
    "type": "bundle",
    "id": "bundle--[uuid]",
    "objects": [
        ...
    ]
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Schema validation: PASSED
• Reference integrity: PASSED
• Pattern syntax: PASSED
• TLP marking: APPLIED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 SHARING OPTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Save to file
saved to: ti-bundle-[date].json

# Publish to TAXII server
taxii2-client publish --url <server> --collection <id> --bundle bundle.json

# Share via API
POST /collections/{collection_id}/objects/
Content-Type: application/stix+json;version=2.1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Stored to Knowledge Graph: Yes
🔗 Bundle ID: [bundle_uuid]
```

## TAXII Integration

### Publishing to TAXII Server
```python
from taxii2client.v21 import Collection
import json

# Load bundle
with open('bundle.json') as f:
    bundle = json.load(f)

# Connect to collection
collection = Collection(
    "https://taxii.example.com/collections/12345/",
    user="api_user",
    password="api_key"
)

# Publish objects
for obj in bundle['objects']:
    collection.add_objects([obj])
```

### Consuming from TAXII Server
```python
from taxii2client.v21 import Collection, as_pages

collection = Collection(
    "https://cti-taxii.mitre.org/stix/collections/95ecc380/",
    user="guest",
    password="guest"
)

# Fetch all objects
for bundle in as_pages(collection.get_objects, per_request=100):
    for obj in bundle.get('objects', []):
        print(f"{obj['type']}: {obj.get('name', obj['id'])}")
```

## STIX Pattern Examples

**IP Address:**
```
[ipv4-addr:value = '198.51.100.1']
```

**Domain:**
```
[domain-name:value = 'evil.com']
```

**File Hash:**
```
[file:hashes.'SHA-256' = 'abc123...']
```

**URL:**
```
[url:value = 'https://evil.com/malware']
```

**Combined Pattern (AND):**
```
[network-traffic:dst_ref.type = 'ipv4-addr' AND network-traffic:dst_ref.value = '198.51.100.1']
```

**With MATCHES (regex):**
```
[file:name MATCHES '^.*\\.exe$']
```

## Tools & APIs Used
- stix2 Python library
- taxii2-client library
- Knowledge skill for persistence
- STIX validator

## Ethical Notes
- Respect TLP classifications
- Only share authorized intelligence
- Validate before sharing
- Document source attribution
- Comply with sharing agreements
