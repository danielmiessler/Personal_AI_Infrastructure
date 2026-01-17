---
name: PAI Recon Skill
pack-id: danielmiessler-recon-skill-core-v2.3.0
version: 2.3.0
author: danielmiessler
description: Security reconnaissance skill for infrastructure and network mapping. Combines passive intelligence gathering with authorized active scanning.
type: skill
purpose-type: security
platform: claude-code
dependencies:
  - curl
  - dig
  - whois
  - bun
keywords:
  - reconnaissance
  - security
  - network
  - infrastructure
  - osint
  - domain
  - ip
  - dns
  - whois
  - certificate-transparency
  - bug-bounty
---

<!-- Pack Icon: Generate with Art/Workflows/CreatePAIPackIcon.md -->
<!-- 256x256 transparent PNG, blue/purple palette, centered below -->

# PAI Recon Skill

> Infrastructure and Network Reconnaissance for Security Professionals

---

## Installation Prompt

```
I want to install the PAI Recon Skill pack. This adds security reconnaissance
capabilities to my PAI system including passive and active infrastructure
mapping, domain enumeration, IP investigation, and bug bounty program discovery.
Please install it following the INSTALL.md instructions.
```

---

## What's Included

| Component | Description |
|-----------|-------------|
| `src/skills/SKILL.md` | Main skill definition with workflow routing |
| `src/skills/Workflows/PassiveRecon.md` | Safe reconnaissance using public sources |
| `src/skills/Workflows/DomainRecon.md` | Full domain mapping and enumeration |
| `src/skills/Workflows/IpRecon.md` | Comprehensive IP address investigation |
| `src/skills/Workflows/NetblockRecon.md` | CIDR range scanning and analysis |
| `src/skills/Workflows/BountyPrograms.md` | Bug bounty program discovery workflow |
| `src/tools/BountyPrograms.ts` | CLI for bug bounty program discovery |
| `src/tools/IpinfoClient.ts` | IPInfo API client with caching |
| `src/tools/DnsUtils.ts` | DNS enumeration utilities |
| `src/tools/CidrUtils.ts` | CIDR notation parsing and validation |
| `src/tools/WhoisParser.ts` | WHOIS response parser |

---

## The Problem

Security reconnaissance is fragmented across dozens of tools, APIs, and manual processes:

1. **Tool Sprawl** - DNS tools, WHOIS clients, port scanners, certificate searchers are all separate
2. **Authorization Confusion** - Easy to accidentally perform active scans without proper authorization
3. **Inconsistent Output** - Each tool produces different formats, making correlation difficult
4. **Context Loss** - Findings aren't connected to other security workflows (OSINT, web assessment)
5. **Manual Correlation** - Connecting IPs to domains to netblocks to organizations requires manual work

---

## The Solution

The Recon skill provides **unified infrastructure reconnaissance** with:

### Clear Authorization Model
- **Passive techniques** (WHOIS, DNS, cert transparency) run without authorization
- **Active techniques** (port scanning, service detection) require explicit confirmation
- Every workflow clearly marks authorization requirements

### Integrated Workflows
- **PassiveRecon** - Safe intelligence gathering using only public sources
- **DomainRecon** - Complete domain mapping (DNS, subdomains, mail security, technologies)
- **IpRecon** - IP investigation (geolocation, ASN, reverse DNS, optional port scan)
- **NetblockRecon** - CIDR range analysis and live host discovery

### TypeScript CLI Tools
- **BountyPrograms.ts** - Discover and search bug bounty programs from ProjectDiscovery Chaos
- **IpinfoClient.ts** - IPInfo API with intelligent caching
- **DnsUtils.ts** - DNS enumeration with all record types
- **CidrUtils.ts** - CIDR parsing and IP range calculation
- **WhoisParser.ts** - Structured WHOIS data extraction

### Skill Integration
- **OSINT to Recon**: OSINT identifies entities, Recon maps their infrastructure
- **Recon to WebAssessment**: Recon finds web apps, WebAssessment tests them
- Findings flow naturally between security workflows

---

## What Makes This Different

| Feature | Traditional Tools | PAI Recon Skill |
|---------|-------------------|-----------------|
| **Authorization** | Often unclear | Explicit passive/active separation |
| **Integration** | Standalone tools | Connected to OSINT and WebAssessment |
| **Output** | Various formats | Consistent Markdown reports |
| **Bug Bounty** | Separate research | Integrated program discovery |
| **Caching** | Usually none | 24-hour intelligent caching |
| **Invocation** | CLI flags to remember | Natural language triggers |

### Authorization-First Design

```
# Passive (no authorization needed)
"Do passive recon on example.com"
"Look up this IP: 1.2.3.4"

# Active (requires explicit authorization)
"Port scan 1.2.3.4 - this is my server"
"Do active recon on example.com - I have pentest authorization"
```

The skill will ALWAYS ask for confirmation before any active technique.

---

## Installation

See `INSTALL.md` for complete step-by-step installation instructions.

**Quick Overview:**
1. Copy skill files to `~/.claude/skills/Recon/`
2. Copy tools to `~/.claude/skills/Recon/Tools/`
3. Create Data directory for caching
4. Optional: Set up IPInfo API key for enhanced IP lookups
5. Verify with `VERIFY.md` checklist

---

## Invocation Scenarios

### Scenario 1: Domain Investigation
```
User: "Do recon on example.com"

PAI: I'll perform reconnaissance on example.com. Starting with passive
     techniques (no authorization required).

     [Performs WHOIS, DNS enumeration, certificate transparency search]

     Found:
     - 15 subdomains via CT logs
     - 3 mail servers with SPF/DMARC configured
     - Primary IP: 93.184.216.34 (Edgecast CDN)

     Would you like me to perform active reconnaissance? This requires
     authorization (pentest engagement, bug bounty, or owned asset).
```

### Scenario 2: IP Investigation
```
User: "Investigate IP 192.0.2.1"

PAI: Running IP reconnaissance on 192.0.2.1...

     IPInfo Results:
     - Organization: Example Corp
     - ASN: AS64496
     - Location: San Francisco, CA, US
     - Reverse DNS: server.example.com

     Netblock: 192.0.2.0/24 (Example Corp allocation)

     This is passive information. Would you like a port scan?
     (Requires authorization)
```

### Scenario 3: Bug Bounty Research
```
User: "Find bug bounty programs for crypto companies"

PAI: Searching bug bounty programs...

     Found 12 crypto-related programs:
     - Coinbase (bounty + swag) - coinbase.com
     - Binance (bounty) - binance.com
     - Kraken (bounty) - kraken.com
     ...

     Use "check example.com" to verify if a specific domain has a program.
```

### Scenario 4: OSINT Integration
```
User: "Do OSINT on Acme Corp and map their infrastructure"

PAI: [OSINT skill identifies company domains: acme.com, acmecorp.io]

     Now mapping infrastructure with Recon skill...

     acme.com:
     - 23 subdomains discovered
     - Primary hosting: AWS (us-east-1)
     - Mail: Google Workspace

     acmecorp.io:
     - 5 subdomains discovered
     - Hosting: Cloudflare

     Total attack surface: 28 web applications identified
```

---

## Example Usage

### BountyPrograms CLI

```bash
# List all bounty programs
bun ~/.claude/skills/Recon/Tools/BountyPrograms.ts list --bounty-only

# Search for specific programs
bun ~/.claude/skills/Recon/Tools/BountyPrograms.ts search "finance"

# Check if domain has bounty program
bun ~/.claude/skills/Recon/Tools/BountyPrograms.ts check hackerone.com

# Update local cache
bun ~/.claude/skills/Recon/Tools/BountyPrograms.ts update

# JSON output for scripting
bun ~/.claude/skills/Recon/Tools/BountyPrograms.ts list --json
```

### Natural Language Commands

```
# Passive reconnaissance
"Do passive recon on example.com"
"Look up IP 1.2.3.4"
"Find subdomains of example.com"
"WHOIS example.com"

# Active reconnaissance (with authorization)
"Port scan 192.168.1.0/24 - this is my home network"
"Do active recon on target.com - I have pentest authorization"
"Scan my server at 1.2.3.4"

# Bug bounty research
"Find bug bounty programs"
"Search bounty programs for 'crypto'"
"Does example.com have a bug bounty?"
```

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `IPINFO_API_KEY` | Optional | IPInfo API key for enhanced lookups |

### Optional Integrations

**IPInfo API** (Recommended)
- Sign up at https://ipinfo.io
- Free tier: 50,000 requests/month
- Set in `~/.zshrc`: `export IPINFO_API_KEY="your_key"`

**Security MCP Profile** (For Active Scanning)
```bash
# Enable security tools (httpx, naabu)
~/.claude/MCPs/swap-mcp security
# Restart Claude Code to apply
```

### Cache Configuration

The BountyPrograms tool caches data for 24 hours at:
```
~/.claude/skills/Recon/Data/BountyPrograms.json
```

To force refresh:
```bash
bun ~/.claude/skills/Recon/Tools/BountyPrograms.ts update
```

---

## Customization

### User Customizations

Create customizations at:
```
~/.claude/skills/CORE/USER/SKILLCUSTOMIZATIONS/Recon/
```

**PREFERENCES.md** - Override default behaviors:
```markdown
# Recon Preferences

## Default Mode
- Always start with passive recon
- Require explicit confirmation for active techniques

## Report Location
- Save reports to: ~/.claude/MEMORY/RESEARCH/

## Rate Limiting
- Maximum 10 requests/second for active scanning
```

### Adding New Data Sources

The skill is designed for extension. Future integrations:
- **Shodan** - Exposed service search
- **Censys** - Certificate and host discovery
- **SecurityTrails** - Historical DNS/WHOIS
- **VirusTotal** - Reputation and passive DNS

---

## Credits

- **ProjectDiscovery** - Chaos bug bounty list, httpx, naabu
- **IPInfo** - IP intelligence API
- **crt.sh** - Certificate transparency search
- **IANA** - WHOIS infrastructure

---

## Related Work

| Project | Relationship |
|---------|--------------|
| [theHarvester](https://github.com/laramies/theHarvester) | Similar passive recon, Python-based |
| [Amass](https://github.com/OWASP/Amass) | Comprehensive subdomain enumeration |
| [Recon-ng](https://github.com/lanmaster53/recon-ng) | Modular recon framework |
| [ProjectDiscovery tools](https://github.com/projectdiscovery) | Individual specialized tools |

---

## Works Well With

| Pack | Integration |
|------|-------------|
| `pai-osint-skill` | OSINT identifies entities, Recon maps infrastructure |
| `pai-browser-skill` | Visual verification of discovered web applications |
| `pai-brightdata-skill` | Scraping content from discovered domains |

---

## Recommended

**For security researchers and penetration testers:**
- Start every engagement with PassiveRecon
- Use BountyPrograms to verify scope
- Document all active scanning authorization

**For bug bounty hunters:**
- Check program scope before any scanning
- Use certificate transparency for subdomain discovery
- Integrate with OSINT for comprehensive coverage

---

## Relationships

```
                    ┌─────────────┐
                    │    OSINT    │
                    │   Skill     │
                    └──────┬──────┘
                           │ Identifies entities
                           ▼
┌──────────────────────────────────────────────────┐
│                   RECON SKILL                     │
│                                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │  Domain    │  │    IP      │  │  Netblock  │ │
│  │   Recon    │  │   Recon    │  │   Recon    │ │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘ │
│        │               │               │        │
│        └───────────────┼───────────────┘        │
│                        ▼                        │
│              ┌─────────────────┐                │
│              │   Bug Bounty    │                │
│              │    Programs     │                │
│              └─────────────────┘                │
└──────────────────────┬───────────────────────────┘
                       │ Discovers web apps
                       ▼
               ┌──────────────┐
               │    Web       │
               │  Assessment  │
               └──────────────┘
```

---

## Changelog

### v2.3.0 (2026-01-14)
- Initial pack release extracted from production PAI system
- Complete passive reconnaissance workflows
- BountyPrograms CLI with ProjectDiscovery Chaos integration
- IPInfo client with 24-hour caching
- DNS, CIDR, and WHOIS utilities
- Clear authorization model for active vs passive techniques

---

## License

MIT License - See LICENSE file in the PAI repository.
