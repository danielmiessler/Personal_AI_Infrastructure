# Feed Manager Documentation

> CLI tool for managing threat intelligence feed sources

---

## Overview

The Feed Manager (`FeedManager.ts`) is a command-line tool for managing threat intelligence feeds. It allows you to list, add, remove, enable, disable, and test feed sources.

---

## Usage

```bash
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts <command> [options]
```

---

## Commands

### list

List all configured feeds, optionally filtered by category.

```bash
# List all feeds
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts list

# List feeds by category
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts list --category malware
```

**Options:**

| Option | Description |
|--------|-------------|
| `--category <category>` | Filter by category |

**Output:**

```
Found 18 feed(s):

NAME                          CATEGORY    FORMAT  ENABLED PRIORITY
-------------------------------------------------------------------------
abuse.ch URLhaus              malware     json    Yes     1
abuse.ch MalwareBazaar        malware     json    Yes     1
abuse.ch ThreatFox            iocs        json    Yes     1
abuse.ch Feodo Tracker        c2          json    Yes     1
OpenPhish                     phishing    txt     Yes     2
PhishTank                     phishing    json    Yes     2
SANS ISC                      general     xml     Yes     2
AlienVault OTX                general     json    No      1
VirusTotal                    reputation  json    No      1
Shodan                        infrastructure json No      1
```

---

### add

Add a new feed to the configuration.

```bash
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts add \
  --name "My Custom Feed" \
  --url "https://feed.example.com/api/v1/indicators" \
  --category apt \
  --format json
```

**Required Options:**

| Option | Description |
|--------|-------------|
| `--name <name>` | Feed name (must be unique) |
| `--url <url>` | Feed URL |
| `--category <category>` | Feed category |
| `--format <format>` | Feed data format |

**Optional Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--api-key-env <env_var>` | Environment variable for API key | `null` |
| `--update-frequency <freq>` | Update frequency | `daily` |
| `--priority <1-10>` | Priority level | `5` |
| `--tlp <level>` | TLP classification | `clear` |
| `--description <desc>` | Feed description | - |

**Example:**

```bash
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts add \
  --name "Corporate TI Feed" \
  --url "https://ti.example.com/api/indicators" \
  --category apt \
  --format json \
  --api-key-env "CORP_TI_API_KEY" \
  --update-frequency hourly \
  --priority 1 \
  --tlp amber \
  --description "Internal corporate threat intelligence"
```

---

### remove

Remove a feed from the configuration.

```bash
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts remove --name "My Custom Feed"
```

**Required Options:**

| Option | Description |
|--------|-------------|
| `--name <name>` | Feed name to remove |

---

### enable

Enable a disabled feed.

```bash
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts enable --name "AlienVault OTX"
```

**Required Options:**

| Option | Description |
|--------|-------------|
| `--name <name>` | Feed name to enable |

---

### disable

Disable an enabled feed.

```bash
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts disable --name "PhishTank"
```

**Required Options:**

| Option | Description |
|--------|-------------|
| `--name <name>` | Feed name to disable |

---

### test

Test feed connectivity and validate response.

```bash
# Test a specific feed
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts test --name "OpenPhish"

# Test all enabled feeds
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts test --all
```

**Options:**

| Option | Description |
|--------|-------------|
| `--name <name>` | Feed name to test |
| `--all` | Test all enabled feeds |

**Output (single feed):**

```
Testing feed "OpenPhish"...

[OK] OpenPhish
     Status: 200
     Response Time: 245ms
     Parseable: Yes
```

**Output (all feeds):**

```
Testing all enabled feeds...

[OK] abuse.ch URLhaus
     Status: 200
     Response Time: 312ms
     Parseable: Yes

[OK] OpenPhish
     Status: 200
     Response Time: 187ms
     Parseable: Yes

[FAIL] VirusTotal
     Error: API key not found in environment variable: PAI_CTI_VIRUSTOTAL_API_KEY

Summary: 7 passed, 1 failed out of 8 feeds
```

---

## Categories

Valid feed categories:

| Category | Description |
|----------|-------------|
| `malware` | Malware samples and distribution URLs |
| `phishing` | Phishing campaigns and URLs |
| `c2` | Command and control infrastructure |
| `apt` | Advanced persistent threat intelligence |
| `general` | General threat intelligence |
| `iocs` | General indicators of compromise |
| `reputation` | Reputation lookup services |
| `infrastructure` | Network infrastructure intelligence |
| `government` | Government and ISAC sources |
| `blog` | Threat intelligence blogs |

---

## Formats

Valid feed formats:

| Format | Description |
|--------|-------------|
| `json` | JSON data |
| `xml` | XML data |
| `csv` | Comma-separated values |
| `rss` | RSS/Atom feed |
| `txt` | Plain text (one indicator per line) |
| `html` | HTML pages (parsed with Browser skill) |
| `markdown` | Markdown content (parsed with Browser skill) |

---

## TLP Levels

Traffic Light Protocol classifications:

| Level | Sharing Scope |
|-------|---------------|
| `clear` | Public disclosure allowed |
| `green` | Community sharing |
| `amber` | Organization and clients |
| `red` | Individual recipients only |

---

## Update Frequencies

| Frequency | Description |
|-----------|-------------|
| `hourly` | Check every hour |
| `daily` | Check once per day |
| `weekly` | Check once per week |
| `on_demand` | Only check when requested |

---

## Feed Configuration Format

Feeds are stored in `$PAI_DIR/skills/cti/Data/TISources.yaml`:

```yaml
feeds:
  - name: abuse.ch URLhaus
    description: Malicious URLs used for malware distribution
    url: https://urlhaus.abuse.ch/downloads/json_recent/
    category: malware
    format: json
    api_key_env: null
    update_frequency: hourly
    enabled: true
    priority: 1
    tlp: clear
    ioc_types:
      - url
    added: 2026-01-10
    last_checked: null

  - name: AlienVault OTX
    description: Open Threat Exchange pulses
    url: https://otx.alienvault.com/api/v1/pulses/subscribed
    category: general
    format: json
    api_key_env: PAI_CTI_OTX_API_KEY
    update_frequency: hourly
    enabled: false
    priority: 1
    tlp: green
    ioc_types:
      - ip
      - domain
      - url
      - sha256
    notes: Get API key from https://otx.alienvault.com/
```

---

## Default Feeds

The CTI skill comes pre-configured with these feeds:

### Free (No API Key Required)

| Feed | Category | IoC Types |
|------|----------|-----------|
| abuse.ch URLhaus | malware | url |
| abuse.ch MalwareBazaar | malware | sha256, sha1, md5 |
| abuse.ch ThreatFox | iocs | ip, domain, url, sha256 |
| abuse.ch Feodo Tracker | c2 | ip |
| OpenPhish | phishing | url |
| PhishTank | phishing | url |
| SANS ISC | general | ip, domain |
| CISA Alerts | government | cve, ip, domain, sha256 |

### Free with API Key

| Feed | Category | API Key Variable |
|------|----------|------------------|
| AlienVault OTX | general | `PAI_CTI_OTX_API_KEY` |
| VirusTotal | reputation | `PAI_CTI_VIRUSTOTAL_API_KEY` |
| Shodan | infrastructure | `PAI_CTI_SHODAN_API_KEY` |
| URLScan.io | reputation | `PAI_CTI_URLSCAN_API_KEY` |

### Blog Sources (Use Browser Skill)

| Feed | Focus |
|------|-------|
| Krebs on Security | Security news |
| The DFIR Report | Intrusion case studies |
| Unit 42 | APT and malware research |
| Mandiant Blog | Nation-state research |
| Securelist | APT and malware analysis |
| BleepingComputer | Security news, ransomware |

---

## Examples

### Add a Custom TAXII Feed

```bash
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts add \
  --name "MITRE ATT&CK TAXII" \
  --url "https://cti-taxii.mitre.org/stix/collections/95ecc380/" \
  --category apt \
  --format json \
  --priority 1 \
  --tlp green
```

### Enable Premium Feeds

After adding your API key to `$PAI_DIR/.env`:

```bash
# Enable AlienVault OTX
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts enable --name "AlienVault OTX"

# Test to verify API key works
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts test --name "AlienVault OTX"
```

### Check Feed Health

```bash
# Test all enabled feeds
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts test --all
```

---

## API Key Configuration

For feeds requiring authentication, set API keys in `$PAI_DIR/.env`:

```bash
# AlienVault OTX - https://otx.alienvault.com/
PAI_CTI_OTX_API_KEY="your-otx-api-key"

# VirusTotal - https://www.virustotal.com/gui/join-us
PAI_CTI_VIRUSTOTAL_API_KEY="your-virustotal-api-key"

# Shodan - https://shodan.io/
PAI_CTI_SHODAN_API_KEY="your-shodan-api-key"

# URLScan.io - https://urlscan.io/user/signup
PAI_CTI_URLSCAN_API_KEY="your-urlscan-api-key"
```

---

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "Configuration file not found" | TISources.yaml missing | Reinstall the CTI skill |
| "Feed already exists" | Duplicate feed name | Use a unique name |
| "API key not found" | Missing environment variable | Add key to .env file |
| "HTTP 401: Unauthorized" | Invalid API key | Verify API key is correct |
| "HTTP 429: Too Many Requests" | Rate limit exceeded | Wait and retry |

---

## See Also

- [Configuration Reference](../configuration.md) - Environment variables and YAML configuration
- [Feeds Workflows](../workflows/feeds.md) - MonitorFeeds and ManageFeeds workflows
