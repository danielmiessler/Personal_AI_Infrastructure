# Feeds Workflows

> Workflows for managing and monitoring threat intelligence feeds

---

## MonitorFeeds

Automated monitoring and collection of threat intelligence from multiple feeds and sources.

### Trigger Phrases

- "monitor threats"
- "check threat feeds"
- "what's new in threat intel"
- "latest threats"
- "threat feed update"
- "ti monitoring"

### Input Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `sources` | No | Specific feeds to check (default: all configured) |
| `timeframe` | No | How far back to check (default: `24h`) |
| `category` | No | Filter by threat category |

### Process Overview

1. **Load Feed Configuration** - Read from `Data/TISources.yaml`
2. **Fetch Feed Data** - Use Browser skill to access feeds
3. **Normalize and Deduplicate** - Standardize format, remove duplicates
4. **Initial Triage** - Assign priority levels
5. **Enrich Top Findings** - Query external sources for high-priority items
6. **Store to Knowledge Graph** - Persist new intelligence
7. **Generate Alerts** - Notify on critical/high findings

### Key Feeds Monitored

| Feed | Type | Content |
|------|------|---------|
| AlienVault OTX | Pulses | Comprehensive intelligence |
| abuse.ch URLhaus | URLs | Malware distribution |
| abuse.ch MalwareBazaar | Samples | Malware hashes |
| abuse.ch ThreatFox | IoCs | General indicators |
| abuse.ch Feodo Tracker | C2 | Botnet infrastructure |
| OpenPhish | URLs | Phishing sites |
| PhishTank | URLs | Verified phishing |
| SANS ISC | Mixed | Daily threat diary |
| CISA Alerts | Advisories | Government alerts |

### Priority Levels

| Priority | Description | Criteria |
|----------|-------------|----------|
| Critical | Immediate action needed | Active campaigns targeting your sector, zero-days |
| High | Prioritize investigation | New malware families, widespread threats |
| Medium | Standard processing | Known threats with new indicators |
| Low | Monitor | Stale or low-impact threats |

### Output Format

```
THREAT FEED MONITORING REPORT
========================================

COLLECTION PERIOD: [start] to [end]
FEEDS CHECKED: [count]
NEW ENTRIES: [count]

CRITICAL ALERTS: [count]
----------------------------------------
[Critical finding 1 with context]
[Critical finding 2 with context]

HIGH PRIORITY: [count]
----------------------------------------
| Threat | Type | Source | Action |
|--------|------|--------|--------|
| APT29 C2 | IP | OTX | Block |
| Emotet | Hash | Bazaar | Hunt |

CATEGORY BREAKDOWN
----------------------------------------
* Malware: [count] new indicators
* Phishing: [count] new indicators
* C2 Infrastructure: [count] new indicators
* Exploits: [count] new indicators

NEW IoCs BY TYPE
----------------------------------------
* IP Addresses: [count]
* Domains: [count]
* URLs: [count]
* File Hashes: [count]

FEED STATUS
----------------------------------------
| Feed | Status | Entries | New |
|------|--------|---------|-----|
| OTX | OK | 150 | 23 |
| URLhaus | OK | 89 | 45 |
| ThreatFox | OK | 234 | 67 |
| Feodo | OK | 42 | 8 |

Stored to Knowledge Graph: Yes
Total IoCs in Graph: [count]
Next Check: [scheduled time]
```

### Automation

The workflow supports scheduled execution:

```yaml
schedule:
  - cron: "0 */4 * * *"  # Every 4 hours
    action: monitor_feeds
    params:
      sources: all
      notify_on: critical,high
```

### Example Usage

```
User: "Check the threat feeds for any new intelligence"

User: "What's new in malware threats today?"
       Category: malware

User: "Monitor APT feeds for the last 48 hours"
       Category: apt
       Timeframe: 48h

User: "Check CISA alerts for new advisories"
       Sources: CISA Alerts
```

---

## ManageFeeds

Add, remove, and configure threat intelligence feed sources.

### Trigger Phrases

- "add feed"
- "add ti source"
- "remove feed"
- "remove ti source"
- "list feeds"
- "configure feeds"
- "manage ti sources"

### Input Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `action` | Yes | `add`, `remove`, `list`, `enable`, `disable`, `test` |
| `feed` | Conditional | Feed configuration (add) or identifier (remove/enable/disable) |
| `category` | No | Filter feeds by category |

### Actions

#### List Feeds

Display all configured feeds with status.

```
User: "List all threat feeds"
User: "Show malware feeds"
       Category: malware
```

#### Add Feed

Add a new feed source.

**Required fields:**
- `name` - Unique feed name
- `url` - Feed URL
- `category` - Feed category
- `format` - Data format

**Optional fields:**
- `api_key_env` - Environment variable for API key (use `PAI_CTI_` prefix)
- `update_frequency` - Check frequency
- `priority` - Priority level (1-10)
- `tlp` - TLP classification
- `description` - Feed description

```
User: "Add a new threat feed"
       Name: Custom APT Feed
       URL: https://feed.example.com/api/apt
       Category: apt
       Format: json
       API Key: PAI_CTI_CUSTOM_API_KEY
       Priority: 1
```

#### Remove Feed

Remove a feed from configuration.

```
User: "Remove the Custom APT Feed"
```

#### Enable/Disable Feed

Toggle feed status.

```
User: "Enable AlienVault OTX feed"
User: "Disable PhishTank feed"
```

#### Test Feed

Verify feed connectivity and content.

```
User: "Test the OpenPhish feed"
User: "Test all enabled feeds"
```

### Feed Configuration Format

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
    notes: Get API key from https://otx.alienvault.com/
```

### Categories

| Category | Description |
|----------|-------------|
| `malware` | Malware samples and distribution |
| `phishing` | Phishing campaigns and URLs |
| `c2` | Command and control infrastructure |
| `apt` | Advanced persistent threats |
| `iocs` | General indicators |
| `reputation` | Reputation services |
| `infrastructure` | Network infrastructure |
| `government` | Government/ISAC sources |
| `general` | General threat intelligence |
| `blog` | Threat intelligence blogs |

### Formats

| Format | Description |
|--------|-------------|
| `json` | JSON data |
| `xml` | XML data |
| `csv` | Comma-separated values |
| `rss` | RSS/Atom feeds |
| `txt` | Plain text (one per line) |
| `markdown` | Blog content (Browser skill) |

### Update Frequencies

| Frequency | Description |
|-----------|-------------|
| `hourly` | Check every hour |
| `daily` | Check once per day |
| `weekly` | Check once per week |
| `on_demand` | Only when requested |

### Output Formats

#### List Output

```
THREAT INTELLIGENCE FEEDS
========================================

CONFIGURED FEEDS: 18
ENABLED: 14
DISABLED: 4

ENABLED FEEDS
----------------------------------------
| Name | Category | Freq | Last Check | Status |
|------|----------|------|------------|--------|
| abuse.ch URLhaus | malware | hourly | 2h ago | OK |
| OpenPhish | phishing | hourly | 1h ago | OK |
| AlienVault OTX | general | hourly | 45m ago | OK |

DISABLED FEEDS
----------------------------------------
| Name | Category | Reason |
|------|----------|--------|
| Custom Feed | apt | API key expired |

FEED STATISTICS
----------------------------------------
* Total IoCs collected: 45,230
* Last 24h new IoCs: 1,247
* Top category: Malware (18,450)
```

#### Add Output

```
ADD THREAT INTELLIGENCE FEED
========================================

Feed added successfully!

Name: Custom APT Feed
URL: https://custom.feed.com/api/apt
Category: apt
Format: json
Priority: 2
TLP: amber

Testing connection...
* Connection successful
* Authentication valid
* Format parseable
* Sample entries: 150

Configuration saved
Feed ID: feed_custom_apt_001
```

#### Test Output

```
TEST THREAT INTELLIGENCE FEED
========================================

Testing: AlienVault OTX

Step 1: Connection
* URL accessible (HTTP 200)
* Response time: 245ms

Step 2: Authentication
* API key valid
* Account: user@example.com

Step 3: Content Parsing
* Format: JSON (valid)
* Sample entries: 50

Step 4: Data Quality
* IoC types detected: IP, Domain, Hash
* Timestamps present
* TLP markings present

FEED STATUS: HEALTHY
```

### CLI Commands

```bash
# List all feeds
bun run FeedManager.ts list

# List feeds by category
bun run FeedManager.ts list --category malware

# Add a feed
bun run FeedManager.ts add \
  --name "Custom Feed" \
  --url "https://feed.example.com/api" \
  --category apt \
  --format json

# Remove a feed
bun run FeedManager.ts remove --name "Custom Feed"

# Enable/disable
bun run FeedManager.ts enable --name "AlienVault OTX"
bun run FeedManager.ts disable --name "PhishTank"

# Test feeds
bun run FeedManager.ts test --name "OpenPhish"
bun run FeedManager.ts test --all
```

### Default Feeds

#### Free (No API Key)

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

#### Free with API Key

| Feed | API Key Variable |
|------|------------------|
| AlienVault OTX | `PAI_CTI_OTX_API_KEY` |
| VirusTotal | `PAI_CTI_VIRUSTOTAL_API_KEY` |
| Shodan | `PAI_CTI_SHODAN_API_KEY` |
| URLScan.io | `PAI_CTI_URLSCAN_API_KEY` |

#### Blogs (Browser Skill)

| Feed | Focus |
|------|-------|
| Krebs on Security | Security news |
| The DFIR Report | Intrusion case studies |
| Unit 42 | APT and malware research |
| Mandiant Blog | Nation-state research |
| Securelist | APT and malware analysis |
| BleepingComputer | Security news |

### Example Usage

```
User: "Add a corporate threat feed"
       Name: Corp TI Feed
       URL: https://ti.corp.com/api/v1/indicators
       Category: apt
       API Key Env: CORP_TI_API_KEY
       TLP: amber

User: "Enable AlienVault OTX and test it"

User: "What feeds do I have configured for malware?"
       Action: list
       Category: malware

User: "Test all my feeds to make sure they're working"
```

---

## See Also

- [Feed Manager Tool](../tools/feed-manager.md) - CLI tool documentation
- [Configuration Reference](../configuration.md) - TISources.yaml format
