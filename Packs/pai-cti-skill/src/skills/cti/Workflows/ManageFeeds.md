# Manage Feeds Workflow

Add, remove, and configure threat intelligence feed sources.

## Trigger Phrases
- "add feed"
- "add ti source"
- "remove feed"
- "remove ti source"
- "list feeds"
- "configure feeds"
- "manage ti sources"

## Input
- `action`: add, remove, list, enable, disable, test
- `feed`: Feed configuration (for add) or identifier (for remove/enable/disable)
- `category` (optional): Filter feeds by category

## Process

### Step 1: Load Current Configuration
```
Load feed configuration from:
$PAI_DIR/skills/ThreatIntelligence/Data/TISources.yaml

Parse existing feeds:
- Feed name and URL
- Category
- Status (enabled/disabled)
- API key requirement
- Update frequency
- Last checked timestamp
```

### Step 2: Execute Action

**List Feeds:**
```
Display all configured feeds:
- Name
- Category
- Status
- URL
- Last checked
- Entry count (if available)
```

**Add Feed:**
```yaml
Required fields:
  name: "Feed Name"
  url: "https://feed.example.com/api/v1/indicators"
  category: "malware|phishing|c2|apt|exploit|general"

Optional fields:
  api_key_env: "PAI_CTI_FEED_API_KEY"  # Environment variable name (use PAI_CTI_ prefix)
  format: "json|xml|csv|rss|stix"
  update_frequency: "hourly|daily|weekly"
  parser: "custom_parser_name"
  enabled: true
  priority: 1-10
  tlp: "clear|green|amber|red"
```

**Remove Feed:**
```
- Lookup feed by name or URL
- Confirm removal
- Remove from configuration
- Optionally archive historical data
```

**Enable/Disable Feed:**
```
- Toggle enabled status
- Preserve configuration
- Update last_modified timestamp
```

**Test Feed:**
```
- Attempt connection
- Verify authentication
- Parse sample response
- Report status and entry count
```

### Step 3: Validate Configuration

```
For new feeds, validate:
1. URL is accessible
2. Format is parseable
3. API key works (if required)
4. No duplicate entries
5. Category is valid
```

### Step 4: Update Configuration File

```yaml
# TISources.yaml structure
feeds:
  - name: "AlienVault OTX"
    url: "https://otx.alienvault.com/api/v1/pulses/subscribed"
    category: "general"
    format: "json"
    api_key_env: "PAI_CTI_OTX_API_KEY"
    update_frequency: "hourly"
    enabled: true
    priority: 1
    tlp: "green"
    added: "2026-01-10"
    last_checked: null

  - name: "abuse.ch URLhaus"
    url: "https://urlhaus.abuse.ch/downloads/json_recent/"
    category: "malware"
    format: "json"
    api_key_env: null
    update_frequency: "hourly"
    enabled: true
    priority: 1
    tlp: "clear"
    added: "2026-01-10"
    last_checked: null
```

### Step 5: Store to Knowledge Graph

Use the **Knowledge** skill:

```
Store the following as structured episodes:

1. Feed Configuration Change:
   - Name: "Feed Config: {action} {feed_name}"
   - Data: Action performed, feed details
   - Group: "threat-intel-config"
   - Audit trail

2. Feed Status:
   - Name: "Feed Status: {feed_name}"
   - Data: Current status, last check, entry count
   - Temporal tracking
```

## Output Format

### List Feeds
```
📋 THREAT INTELLIGENCE FEEDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 CONFIGURED FEEDS: [count]
✅ ENABLED: [count]
❌ DISABLED: [count]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 ENABLED FEEDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Name | Category | Frequency | Last Check | Status |
|------|----------|-----------|------------|--------|
| AlienVault OTX | general | hourly | 2h ago | ✅ OK |
| URLhaus | malware | hourly | 1h ago | ✅ OK |
| ThreatFox | iocs | hourly | 45m ago | ✅ OK |
| SANS ISC | general | daily | 8h ago | ✅ OK |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 DISABLED FEEDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Name | Category | Reason |
|------|----------|--------|
| Custom Feed | apt | API key expired |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 FEED STATISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Total IoCs collected: 45,230
• Last 24h new IoCs: 1,247
• Top category: Malware (18,450)
```

### Add Feed
```
📋 ADD THREAT INTELLIGENCE FEED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Feed added successfully!

Name: Custom APT Feed
URL: https://custom.feed.com/api/apt
Category: apt
Format: json
Priority: 2
TLP: amber

🔍 Testing connection...
✅ Connection successful
✅ Authentication valid
✅ Format parseable
📊 Sample entries: 150

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Configuration saved
🔗 Feed ID: feed_custom_apt_001
```

### Remove Feed
```
📋 REMOVE THREAT INTELLIGENCE FEED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Removing feed: Custom APT Feed

This will:
• Remove feed from monitoring
• Archive collected IoCs (optional)
• Update configuration

Confirm removal? [Confirmed]

✅ Feed removed successfully
📦 Historical data archived: Yes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Test Feed
```
📋 TEST THREAT INTELLIGENCE FEED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Testing: AlienVault OTX

Step 1: Connection
✅ URL accessible (HTTP 200)
⏱️ Response time: 245ms

Step 2: Authentication
✅ API key valid
👤 Account: user@example.com

Step 3: Content Parsing
✅ Format: JSON (valid)
📊 Sample entries: 50

Step 4: Data Quality
✅ IoC types detected: IP, Domain, Hash
✅ Timestamps present
✅ TLP markings present

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 FEED STATUS: HEALTHY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## CLI Commands

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

# Enable/disable a feed
bun run FeedManager.ts enable --name "Custom Feed"
bun run FeedManager.ts disable --name "Custom Feed"

# Test a feed
bun run FeedManager.ts test --name "Custom Feed"

# Test all feeds
bun run FeedManager.ts test --all
```

## Default Feeds

The skill comes pre-configured with these OSINT feeds:

```yaml
# Free, no API key required
- abuse.ch URLhaus (malware URLs)
- abuse.ch MalwareBazaar (malware samples)
- abuse.ch ThreatFox (IoCs)
- abuse.ch Feodo Tracker (C2 botnet)
- OpenPhish (phishing URLs)
- SANS ISC (daily threat diary)

# Free with API key
- AlienVault OTX (comprehensive)
- VirusTotal (file/URL reputation)
- Shodan (infrastructure)
- URLScan.io (URL analysis)

# Government/ISAC (registration required)
- CISA AIS (automated indicator sharing)
- US-CERT (alerts and advisories)
```

## Tools & APIs Used
- FeedManager.ts CLI tool
- YAML parser
- HTTP client for testing
- Knowledge skill for audit trail

## Ethical Notes
- Only add legitimate TI sources
- Respect API rate limits
- Store API keys securely
- Document feed sources
