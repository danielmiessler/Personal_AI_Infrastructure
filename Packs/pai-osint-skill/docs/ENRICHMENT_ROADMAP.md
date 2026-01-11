# OSINT Enrichment Roadmap

Technical recommendations for enhancing the OSINT skill with automated enrichment capabilities.

## Current State

The OSINT skill provides 13 comprehensive workflows covering person, domain, and company intelligence. This document outlines enrichment techniques to automate data collection and improve intelligence quality.

---

## 1. API Integration Layer

### Priority 1: Core OSINT APIs

| API | Purpose | Free Tier | Integration Priority |
|-----|---------|-----------|---------------------|
| **Shodan** | Infrastructure/IoT scanning | 100 queries/month | HIGH |
| **SecurityTrails** | DNS history, subdomains | Limited | HIGH |
| **Hunter.io** | Email enumeration | 25 searches/month | HIGH |
| **HaveIBeenPwned** | Breach checking | Free (rate limited) | HIGH |
| **VirusTotal** | Domain/IP reputation | 4 req/min | MEDIUM |

### Priority 2: Enhanced Intelligence

| API | Purpose | Free Tier | Integration Priority |
|-----|---------|-----------|---------------------|
| **Censys** | Certificate transparency | Limited | MEDIUM |
| **BuiltWith** | Technology stack detection | Limited | MEDIUM |
| **Clearbit** | Company enrichment | 50 req/month | MEDIUM |
| **FullContact** | Person enrichment | Limited | LOW |
| **Pipl** | Identity resolution | Paid only | LOW |

### Implementation Approach

```typescript
// Proposed structure: src/skills/osint/Tools/EnrichmentEngine.ts
interface EnrichmentProvider {
  name: string;
  apiKey: string | undefined;
  rateLimit: { requests: number; window: string };
  enrich(target: Target): Promise<EnrichmentResult>;
}

// Configuration in .env
SHODAN_API_KEY="..."
SECURITYTRAILS_API_KEY="..."
HUNTER_API_KEY="..."
HIBP_API_KEY="..."
```

---

## 2. Automated Data Pipeline

### Collection Layer
```
┌─────────────────────────────────────────────────────────┐
│                   COLLECTION SOURCES                     │
├──────────────┬──────────────┬──────────────┬────────────┤
│ Web Scraping │ API Queries  │ DNS/WHOIS    │ Feeds      │
│ (Browser)    │ (Shodan etc) │ (dig, whois) │ (RSS/STIX) │
└──────┬───────┴──────┬───────┴──────┬───────┴─────┬──────┘
       │              │              │             │
       └──────────────┴──────────────┴─────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   NORMALIZATION LAYER                    │
│  • Deduplicate records                                  │
│  • Standardize formats (dates, names, identifiers)      │
│  • Extract entities (NER for people, orgs, locations)   │
│  • Assign confidence scores                              │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   ENRICHMENT LAYER                       │
│  • Cross-reference with breach databases                │
│  • Resolve identities across platforms                  │
│  • Geolocate IPs and domains                            │
│  • Calculate risk scores                                 │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   STORAGE LAYER                          │
│  • Knowledge Graph (entities + relationships)           │
│  • File Reports (human-readable)                        │
│  • Temporal metadata (validity tracking)                 │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Entity Resolution Engine

### Cross-Platform Identity Linking

**Technique**: Build unified "digital persona" from fragmented platform data.

```yaml
resolution_signals:
  strong:
    - Same email across platforms (weight: 0.95)
    - Same phone number (weight: 0.90)
    - Linked accounts (OAuth connections) (weight: 0.85)

  medium:
    - Username consistency (weight: 0.60)
    - Profile photo similarity (weight: 0.55)
    - Bio text overlap (weight: 0.50)
    - Posting time patterns (weight: 0.45)

  weak:
    - Similar display names (weight: 0.30)
    - Geographic overlap (weight: 0.25)
    - Interest/topic correlation (weight: 0.20)
```

### Graph-Based Resolution

Leverage the knowledge skill's graph capabilities:

```typescript
// Entity resolution query pattern
interface IdentityCluster {
  primary_entity: Entity;
  linked_entities: Entity[];
  confidence: number;
  resolution_path: ResolutionSignal[];
}

// Store resolution results
add_memory({
  name: "Identity Resolution",
  episode_body: JSON.stringify({
    cluster_id: "...",
    entities: [...],
    confidence: 0.85,
    signals: [...]
  }),
  source: "json",
  group_id: "osint_identities"
});
```

---

## 4. Missing Workflow Recommendations

Based on the skill review, these workflows would enhance coverage:

### 4.1 Email OSINT Workflow

**File**: `Workflows/EmailRecon.md`

```markdown
## Email Reconnaissance Workflow

### Collection Steps
1. **Email Validation** - Verify deliverability
2. **Breach Check** - HaveIBeenPwned lookup
3. **Email-to-Social** - Find linked accounts (Gravatar, GitHub, etc.)
4. **Domain Analysis** - MX records, organization identification
5. **Header Analysis** - For provided email samples

### Enrichment APIs
- Hunter.io (email finder/verifier)
- HaveIBeenPwned (breach data)
- Gravatar (avatar hash lookup)
- GitHub API (email-to-user resolution)
```

### 4.2 Phone Number OSINT Workflow

**File**: `Workflows/PhoneRecon.md`

```markdown
## Phone Number Reconnaissance Workflow

### Collection Steps
1. **Carrier Lookup** - Identify carrier and line type
2. **VOIP Detection** - Distinguish landline/mobile/VOIP
3. **Caller ID** - Name association lookups
4. **Reverse Lookup** - Associated addresses
5. **Social Correlation** - Platform phone verification

### Enrichment Sources
- NumVerify API
- Twilio Lookup
- Open carrier databases
```

### 4.3 Image/Photo OSINT Workflow

**File**: `Workflows/ImageRecon.md`

```markdown
## Image OSINT Workflow

### Collection Steps
1. **Reverse Image Search** - Google, TinEye, Yandex
2. **EXIF Extraction** - Metadata, GPS, camera info
3. **Facial Recognition** - PimEyes, similar services
4. **Manipulation Detection** - Deepfake/edit detection
5. **Context Analysis** - Background location identification

### Tools
- ExifTool
- TinEye API
- Google Vision API
```

---

## 5. Real-Time Monitoring

### Alert-Based Collection

```yaml
monitoring_capabilities:
  username_monitoring:
    - New account creation alerts
    - Username availability changes
    - Paste site mentions (Pastebin, etc.)

  domain_monitoring:
    - DNS record changes
    - SSL certificate updates
    - New subdomain discovery
    - WHOIS changes

  company_monitoring:
    - SEC filing alerts
    - News/press mentions
    - Job posting changes (growth signals)
    - Domain portfolio changes
```

### Implementation

```typescript
// Proposed: src/skills/osint/Tools/Monitor.ts
interface MonitoringRule {
  target_type: "username" | "domain" | "company" | "person";
  target_value: string;
  check_interval: string;  // "1h", "24h", etc.
  alert_conditions: AlertCondition[];
}

// Store rules in knowledge graph
add_memory({
  name: "OSINT Monitor Rule",
  episode_body: JSON.stringify(rule),
  source: "json",
  group_id: "osint_monitors"
});
```

---

## 6. Threat Intelligence Integration

### STIX/TAXII Support

For CTI use cases, integrate standard threat intel formats:

```yaml
threat_intel_enrichment:
  feeds:
    - AlienVault OTX (free)
    - Abuse.ch (free)
    - CIRCL (free)

  enrichment_types:
    - IP reputation
    - Domain reputation
    - File hash lookup
    - MITRE ATT&CK mapping
```

### Integration with CTI Skill

The OSINT skill can feed indicators to the CTI skill for analysis:

```markdown
OSINT discovers → IOC → CTI analyzes → MITRE mapping → Risk score
```

---

## 7. Implementation Priorities

### Phase 1: Core API Integration (Recommended First)
1. Create `EnrichmentEngine.ts` abstraction layer
2. Integrate Shodan for InfraMapping workflow
3. Integrate Hunter.io for email enumeration
4. Integrate HaveIBeenPwned for breach checking

### Phase 2: Missing Workflows
1. EmailRecon.md workflow
2. PhoneRecon.md workflow
3. ImageRecon.md workflow

### Phase 3: Advanced Capabilities
1. Entity resolution engine
2. Real-time monitoring framework
3. STIX/TAXII integration

### Phase 4: AI Enhancement
1. NLP-based entity extraction
2. Automated confidence scoring
3. Pattern detection across investigations
4. Anomaly detection in timelines

---

## 8. Security Considerations

### API Key Management
- Store all API keys in `.env` (never commit)
- Implement key rotation reminders
- Rate limit tracking to avoid bans

### OPSEC
- Proxy support for sensitive queries
- User-agent rotation for web scraping
- Request timing randomization

### Data Protection
- Encrypt stored intelligence at rest
- Implement retention policies
- Access logging for audit trails

---

## References

- [theHarvester](https://github.com/laramies/theHarvester) - Multi-source OSINT tool
- [SpiderFoot](https://www.spiderfoot.net/) - Automated OSINT platform
- [Recon-ng](https://github.com/lanmaster53/recon-ng) - Web reconnaissance framework
- [Maltego](https://www.maltego.com/) - Graph-based OSINT visualization
- [OSINT Framework](https://osintframework.com/) - Collection of OSINT tools

---

*Last updated: 2026-01-11*
*Version: 1.0.0*
