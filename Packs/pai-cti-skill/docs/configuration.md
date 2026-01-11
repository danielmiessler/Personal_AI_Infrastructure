# Configuration Reference

> Environment variables and configuration files for the PAI CTI Skill

---

## Overview

The CTI skill uses environment variables for API keys and YAML files for feed and pattern configuration.

---

## Environment Variables

### API Keys

Store API keys in `$PAI_DIR/.env` (typically `~/.claude/.env`):

```bash
# AlienVault OTX
# Get key: https://otx.alienvault.com/
PAI_CTI_OTX_API_KEY="your-otx-api-key"

# VirusTotal
# Get key: https://www.virustotal.com/gui/join-us
PAI_CTI_VIRUSTOTAL_API_KEY="your-virustotal-api-key"

# Shodan
# Get key: https://shodan.io/
PAI_CTI_SHODAN_API_KEY="your-shodan-api-key"

# URLScan.io
# Get key: https://urlscan.io/user/signup
PAI_CTI_URLSCAN_API_KEY="your-urlscan-api-key"

# AbuseIPDB
# Get key: https://www.abuseipdb.com/account/api
PAI_CTI_ABUSEIPDB_API_KEY="your-abuseipdb-api-key"

# NIST NVD (optional but recommended for higher rate limits)
# Get key: https://nvd.nist.gov/developers/request-an-api-key
PAI_CTI_NVD_API_KEY="your-nvd-api-key"

# Spamhaus Intelligence API
# Get key: https://www.spamhaus.com/developer/sia/
PAI_CTI_SPAMHAUS_API_KEY="your-spamhaus-api-key"

# Hybrid Analysis
# Get key: https://www.hybrid-analysis.com/apikeys/info
PAI_CTI_HYBRID_ANALYSIS_API_KEY="your-hybrid-analysis-api-key"

# Custom/Corporate Feeds
PAI_CTI_CUSTOM_FEED_API_KEY="your-custom-key"
```

### Naming Convention

All CTI-related environment variables should use the prefix `PAI_CTI_`:

```
PAI_CTI_<SERVICE>_API_KEY
```

### System Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `PAI_DIR` | PAI installation directory | `~/.claude` |
| `TIME_ZONE` | Timezone for timestamps | System timezone |

---

## TISources.yaml Format

Feed configuration is stored in `$PAI_DIR/skills/cti/Data/TISources.yaml`:

```yaml
version: "1.0"
last_updated: 2026-01-10

feeds:
  - name: "abuse.ch URLhaus"
    description: "Malicious URLs used for malware distribution"
    url: "https://urlhaus.abuse.ch/downloads/json_recent/"
    category: "malware"
    format: "json"
    api_key_env: null
    update_frequency: "hourly"
    enabled: true
    priority: 1
    tlp: "clear"
    ioc_types:
      - url
    added: "2026-01-10"
    last_checked: null

  - name: "AlienVault OTX"
    description: "Open Threat Exchange pulses"
    url: "https://otx.alienvault.com/api/v1/pulses/subscribed"
    category: "general"
    format: "json"
    api_key_env: "PAI_CTI_OTX_API_KEY"
    update_frequency: "hourly"
    enabled: false
    priority: 1
    tlp: "green"
    ioc_types:
      - ip
      - domain
      - url
      - sha256
      - md5
      - email
    added: "2026-01-10"
    last_checked: null
    notes: "Get API key from https://otx.alienvault.com/"

settings:
  default_update_frequency: "hourly"
  max_concurrent_fetches: 3
  request_timeout: 30
  retry_attempts: 3
  retry_delay: 5
  cache_ttl: 3600
  storage_path: "$PAI_DIR/data/threat-intel/"
  max_iocs_per_feed: 10000
  retention_days: 90
  notify_on_critical: true
  notify_on_high: true
  notification_channels:
    - knowledge_graph

categories:
  - name: "malware"
    description: "Malware samples and distribution"
    color: "red"
  - name: "phishing"
    description: "Phishing campaigns and URLs"
    color: "orange"
  - name: "c2"
    description: "Command and control infrastructure"
    color: "red"
  - name: "iocs"
    description: "General indicators of compromise"
    color: "yellow"
  - name: "reputation"
    description: "Reputation lookup services"
    color: "blue"
  - name: "infrastructure"
    description: "Network infrastructure intelligence"
    color: "purple"
  - name: "government"
    description: "Government and ISAC sources"
    color: "green"
  - name: "general"
    description: "General threat intelligence"
    color: "gray"
  - name: "blog"
    description: "Threat intelligence blogs"
    color: "blue"
  - name: "vulnerability"
    description: "CVE and vulnerability intelligence"
    color: "orange"
```

### Feed Configuration Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | Yes | string | Unique feed identifier |
| `description` | No | string | Feed description |
| `url` | Yes | string | Feed URL |
| `category` | Yes | string | Feed category |
| `format` | Yes | string | Data format: `json`, `xml`, `csv`, `rss`, `txt`, `markdown` |
| `api_key_env` | No | string | Environment variable name for API key |
| `update_frequency` | No | string | `hourly`, `daily`, `weekly`, `on_demand` |
| `enabled` | No | boolean | Whether feed is active (default: `true`) |
| `priority` | No | integer | Priority level 1-10 (1 = highest) |
| `tlp` | No | string | TLP classification: `clear`, `green`, `amber`, `red` |
| `ioc_types` | No | array | IoC types provided by feed |
| `rate_limit` | No | string | API rate limit (e.g., "4/min") |
| `daily_limit` | No | integer | Daily request limit |
| `added` | No | string | Date feed was added |
| `last_checked` | No | string | Last successful check timestamp |
| `notes` | No | string | Additional notes |

### Settings Fields

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `default_update_frequency` | string | Default check frequency | `hourly` |
| `max_concurrent_fetches` | integer | Parallel feed fetches | `3` |
| `request_timeout` | integer | HTTP timeout (seconds) | `30` |
| `retry_attempts` | integer | Retry count on failure | `3` |
| `retry_delay` | integer | Delay between retries (seconds) | `5` |
| `cache_ttl` | integer | Cache time-to-live (seconds) | `3600` |
| `storage_path` | string | IoC storage location | `$PAI_DIR/data/threat-intel/` |
| `max_iocs_per_feed` | integer | Maximum IoCs to store per feed | `10000` |
| `retention_days` | integer | Days to retain IoCs | `90` |
| `notify_on_critical` | boolean | Alert on critical findings | `true` |
| `notify_on_high` | boolean | Alert on high findings | `true` |

### Cache Configuration

The `cache` section provides fine-grained caching control:

```yaml
cache:
  enabled: true
  backend: file  # Options: file, redis
  default_ttl: 3600  # 1 hour default

  # TTL by IOC type (seconds)
  ttl_by_ioc_type:
    ip: 3600        # 1 hour - IPs change quickly
    domain: 14400   # 4 hours - more stable
    sha256: 86400   # 24 hours - immutable
    cve: 86400      # 24 hours

  # TTL by source (overrides ioc_type)
  ttl_by_source:
    virustotal: 14400
    urlhaus: 1800   # 30 min - frequently updated

  max_cache_size_mb: 500
  compression: true
```

### Rate Limiting Configuration

The `rate_limiting` section manages API quotas:

```yaml
rate_limiting:
  enabled: true
  tracking_backend: file  # Options: file, redis

  services:
    virustotal:
      requests_per_minute: 4
      daily_limit: 500
      backoff_strategy: exponential
      max_backoff_seconds: 300

    abuseipdb:
      requests_per_minute: 30
      daily_limit: 1000
      backoff_strategy: linear

  queue:
    enabled: true
    max_queued_requests: 100
    priority_levels:
      critical: 1
      high: 2
      normal: 3
      low: 4

  alerts:
    warn_at_percent: 80
    critical_at_percent: 95
```

---

## IoCPatterns.yaml Format

IoC extraction patterns are stored in `$PAI_DIR/skills/cti/Data/IoCPatterns.yaml`:

```yaml
version: "1.0"
last_updated: "2026-01-10"

patterns:
  # Network Indicators
  ipv4:
    name: "IPv4 Address"
    pattern: '(?<![0-9])(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?![0-9])'
    defanged_patterns:
      - '(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\[?\.\]?){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)'
    validation:
      - exclude_private: true
      - exclude_reserved: true
    examples:
      - "192.168.1.1"
      - "8.8.8.8"

  domain:
    name: "Domain Name"
    pattern: '(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+(?:[a-zA-Z]{2,})'
    defanged_patterns:
      - '(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\[?\.\]?)+(?:[a-zA-Z]{2,})'
      - '(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\[dot\])+(?:[a-zA-Z]{2,})'
    validation:
      - valid_tld: true
      - exclude_known_good:
        - "google.com"
        - "microsoft.com"

  url:
    name: "URL"
    pattern: '(?:https?|ftp|sftp)://[^\s<>"{}|\\^`\[\]]+'
    defanged_patterns:
      - 'hxxps?://[^\s<>"{}|\\^`\[\]]+'
      - '(?:https?)\[:\]//[^\s<>"{}|\\^`\[\]]+'

  # File Indicators
  md5:
    name: "MD5 Hash"
    pattern: '(?<![a-fA-F0-9])[a-fA-F0-9]{32}(?![a-fA-F0-9])'
    validation:
      - exclude_all_zeros: true

  sha256:
    name: "SHA256 Hash"
    pattern: '(?<![a-fA-F0-9])[a-fA-F0-9]{64}(?![a-fA-F0-9])'

  # Reference Indicators
  cve:
    name: "CVE Identifier"
    pattern: 'CVE-\d{4}-\d{4,7}'

  mitre_technique:
    name: "MITRE ATT&CK Technique"
    pattern: 'T\d{4}(?:\.\d{3})?'

# Defanging/Refanging Rules
defanging:
  refang:
    - pattern: 'hxxp'
      replacement: 'http'
    - pattern: '\[\.\]'
      replacement: '.'
    - pattern: '\[@\]'
      replacement: '@'

  defang:
    - pattern: 'http'
      replacement: 'hxxp'
    - pattern: '\.'
      replacement: '[.]'

# Validation Lists
validation:
  private_ip_ranges:
    - "10.0.0.0/8"
    - "172.16.0.0/12"
    - "192.168.0.0/16"

  known_good_domains:
    - "google.com"
    - "microsoft.com"
    - "amazon.com"
    - "cloudflare.com"
    - "github.com"

  valid_tlds:
    - "com"
    - "net"
    - "org"
    # ... additional TLDs
```

### Pattern Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Human-readable name |
| `pattern` | string | Regex pattern |
| `defanged_patterns` | array | Patterns for defanged variants |
| `validation` | array | Validation rules |
| `context_required` | boolean | Whether surrounding context is needed |
| `examples` | array | Example matches |

---

## Adding Custom Feeds

### Via CLI

```bash
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts add \
  --name "Corporate TI Feed" \
  --url "https://ti.corp.com/api/v1/indicators" \
  --category apt \
  --format json \
  --api-key-env "PAI_CTI_CORP_API_KEY" \
  --priority 1 \
  --tlp amber
```

### Via YAML

Add directly to `TISources.yaml`:

```yaml
feeds:
  # ... existing feeds ...

  - name: "Corporate TI Feed"
    description: "Internal corporate threat intelligence"
    url: "https://ti.corp.com/api/v1/indicators"
    category: "apt"
    format: "json"
    api_key_env: "PAI_CTI_CORP_API_KEY"
    update_frequency: "hourly"
    enabled: true
    priority: 1
    tlp: "amber"
    ioc_types:
      - ip
      - domain
      - sha256
    added: "2026-01-10"
```

### Via Natural Language

Ask the AI assistant:

```
User: "Add a new threat feed"
       Name: Corporate TI Feed
       URL: https://ti.corp.com/api/v1/indicators
       Category: apt
       API Key Variable: PAI_CTI_CORP_API_KEY
       TLP: amber
```

---

## File Locations

| File | Location | Purpose |
|------|----------|---------|
| API Keys | `$PAI_DIR/.env` | Secret storage |
| Feed Config | `$PAI_DIR/skills/cti/Data/TISources.yaml` | Feed definitions |
| IoC Patterns | `$PAI_DIR/skills/cti/Data/IoCPatterns.yaml` | Extraction patterns |
| IoC Storage | `$PAI_DIR/data/threat-intel/` | Collected IoCs |
| Reports | `$PAI_DIR/history/research/threat-intel/` | Generated reports |

---

## Rate Limit Handling

### API Rate Limits

| Service | Free Tier Limit |
|---------|-----------------|
| VirusTotal | 4 requests/min, 500/day |
| AbuseIPDB | 30 requests/min, 1000/day |
| OTX | 10 requests/sec, unlimited |
| Shodan | 1 request/sec, varies |
| URLScan | Varies by plan |
| NIST NVD | 5 requests/30sec (50/30sec with key) |
| EmailRep.io | 10 requests/min (no key) |
| Hybrid Analysis | 5 requests/min |

### Configuration

Rate limits can be specified per feed:

```yaml
- name: "VirusTotal"
  rate_limit: "4/min"
```

### Best Practices

1. **Enable caching** - Set appropriate `cache_ttl`
2. **Batch requests** - Use bulk APIs where available
3. **Schedule checks** - Spread checks over time
4. **Monitor usage** - Track API consumption

---

## Troubleshooting Configuration

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "API key not found" | Missing env var | Add to `.env` file |
| "Feed parse error" | Wrong format specified | Check `format` field |
| "Connection timeout" | Network/firewall | Check URL accessibility |
| "Rate limit exceeded" | Too many requests | Reduce frequency, enable caching |

### Validation Commands

```bash
# Test feed connectivity
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts test --name "Feed Name"

# Test all feeds
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts test --all

# Validate YAML syntax
bun run $PAI_DIR/skills/cti/Tools/FeedManager.ts list
```

---

## See Also

- [Feed Manager Tool](tools/feed-manager.md) - CLI tool documentation
- [Feeds Workflows](workflows/feeds.md) - MonitorFeeds and ManageFeeds
- [Troubleshooting Guide](troubleshooting.md) - Common issues
