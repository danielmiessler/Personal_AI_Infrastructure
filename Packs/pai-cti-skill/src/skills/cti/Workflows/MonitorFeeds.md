# Monitor Threat Feeds Workflow

Automated monitoring and collection of threat intelligence from multiple feeds and sources.

## Trigger Phrases
- "monitor threats"
- "check threat feeds"
- "what's new in threat intel"
- "latest threats"
- "threat feed update"
- "ti monitoring"

## Input
- `sources` (optional): Specific feeds to check (default: all configured)
- `timeframe` (optional): How far back to check (default: 24h)
- `category` (optional): Filter by threat category (malware, phishing, c2, etc.)

## Process

### Step 1: Load Feed Configuration
```
Load TI sources from Data/TISources.yaml:
- OSINT feeds (AlienVault OTX, abuse.ch, SANS ISC)
- Government sources (CISA, US-CERT)
- Research sources (threat blogs, vendor reports)
- Commercial feeds (if configured)
```

### Step 2: Fetch Feed Data

Using the **Browser** skill to access threat feeds:

```
For each configured feed:
1. Navigate to feed URL
2. Extract new entries since last check
3. Parse feed format (JSON, XML, CSV, RSS)
4. Normalize data to common schema
```

**Key Feeds:**
| Feed | Type | URL |
|------|------|-----|
| AlienVault OTX | Pulses | otx.alienvault.com |
| abuse.ch URLhaus | Malware URLs | urlhaus.abuse.ch |
| abuse.ch MalwareBazaar | Samples | bazaar.abuse.ch |
| abuse.ch ThreatFox | IoCs | threatfox.abuse.ch |
| SANS ISC | Diary | isc.sans.edu |
| CISA Alerts | Government | cisa.gov/uscert |
| Feodo Tracker | C2 | feodotracker.abuse.ch |
| OpenPhish | Phishing | openphish.com |
| PhishTank | Phishing | phishtank.org |

### Step 3: Normalize and Deduplicate
```
For each entry:
1. Extract core fields:
   - Timestamp
   - IoC type and value
   - Threat type/category
   - Source attribution
   - TLP classification

2. Normalize IoC format:
   - Refang defanged indicators
   - Standardize hash formats
   - Validate IP/domain formats

3. Deduplicate against:
   - Previously collected entries
   - Cross-feed duplicates
```

### Step 4: Initial Triage
```
For each unique entry:
1. Assign preliminary priority:
   - Critical: Active campaigns, zero-days, targeting your sector
   - High: New malware families, widespread threats
   - Medium: Known threats with new indicators
   - Low: Stale or low-impact threats

2. Tag with categories:
   - Threat type (malware, phishing, c2, exploit)
   - Target sector (if known)
   - Threat actor (if attributed)
```

### Step 5: Enrich Top Findings

Using the **osint** skill and **EnrichIoCs** workflow:

```
For high-priority entries:
1. Check reputation databases
2. Lookup infrastructure details
3. Cross-reference with existing intelligence
4. Add context from related reports
```

### Step 6: Store to Knowledge Graph

Use the **Knowledge** skill to persist findings:

```
Store the following as structured episodes:

1. Feed Collection:
   - Name: "TI Feed Collection: {timestamp}"
   - Data: Feed sources checked, entries collected, new vs. known
   - Group: "threat-intel-feeds"

2. New IoCs:
   - Name: "IoCs: {date}"
   - Data: Type, value, source, confidence, TLP
   - Relationships: from_feed, related_to_threat

3. Threat Updates:
   - Name: "Threat Update: {threat_name}"
   - Data: New indicators, updated TTPs, source
   - Links to existing threat entities

4. Priority Alerts:
   - Name: "Priority Alert: {description}"
   - Data: Critical/high findings requiring attention
   - Actionable intelligence summary
```

### Step 7: Generate Alerts
```
For critical and high-priority findings:
1. Format alert notification
2. Include actionable context
3. Suggest immediate actions
4. Link to detailed analysis
```

## Output Format

```
📋 THREAT FEED MONITORING REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 COLLECTION PERIOD: [start] to [end]
📊 FEEDS CHECKED: [count]
📈 NEW ENTRIES: [count]

🔴 CRITICAL ALERTS: [count]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Critical finding 1 with context]
[Critical finding 2 with context]

🟠 HIGH PRIORITY: [count]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[High priority summary table]

📊 CATEGORY BREAKDOWN:
• Malware: [count] new indicators
• Phishing: [count] new indicators
• C2 Infrastructure: [count] new indicators
• Exploits: [count] new indicators

🆕 NEW IoCs BY TYPE:
• IP Addresses: [count]
• Domains: [count]
• URLs: [count]
• File Hashes: [count]

📚 FEED STATUS:
| Feed | Status | Entries | New |
|------|--------|---------|-----|
| OTX | ✅ | 150 | 23 |
| URLhaus | ✅ | 89 | 45 |
| ... | ... | ... | ... |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Stored to Knowledge Graph: Yes
📊 Total IoCs in Graph: [count]
⏰ Next Check: [scheduled time]
```

## Automation Support

This workflow supports scheduled execution:

```yaml
# Example cron configuration
schedule:
  - cron: "0 */4 * * *"  # Every 4 hours
    action: monitor_feeds
    params:
      sources: all
      notify_on: critical,high
```

## Tools & APIs Used
- Browser skill for web fetching
- Knowledge skill for persistence
- osint skill for enrichment
- External APIs: OTX, abuse.ch, Shodan

## Ethical Notes
- Respect API rate limits
- Cache responses to reduce load
- Attribute all sources properly
- Only collect from authorized feeds
