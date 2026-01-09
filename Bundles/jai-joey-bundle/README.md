---
name: JAI Joey Bundle
bundle-id: jai-joey-bundle-v1.0.0
version: 1.0.0
author: Joey Barkley
description: Complete personal AI infrastructure for Joey - publishing, finance, trading, and life management
type: bundle
platform: claude-code
pack-count: 12
profiles: [full, headless, minimal]
---

# JAI Joey Bundle

> Joey's complete personal AI infrastructure - from affiliate publishing to financial analysis

This bundle transforms Claude Code into a comprehensive personal AI system covering:
- **Publishing** - Affiliate website content generation and SEO
- **Finance** - Portfolio tracking, market analysis, trading signals
- **Life Management** - Workshop, farm, family context switching

## AI Installation Wizard

Before installing, I need to understand your deployment:

### Question 1: Deployment Profile

**What type of environment is this?**

| Profile | Use Case | What Gets Installed |
|---------|----------|---------------------|
| **Full** | Laptop/Desktop with display | Everything including browser automation |
| **Headless** | VPS/Server, no display | All automation, skip browser/voice |
| **Minimal** | Quick test or single purpose | Core + one domain of your choice |

### Question 2: Domain Selection (Minimal profile only)

If you selected Minimal, which domain?
- Publishing (jai-publishing-*)
- Finance (jai-finance-core, jai-trading-analysis)

### Question 3: Headless Extras (Headless profile only)

If deploying headless:
- **GitLab Runner needed?** For CI/CD automation
- **Scheduled jobs?** For automated market briefs, article generation

---

## Pack Matrix

| Pack | Required | Full | Headless | Minimal | Purpose |
|------|----------|------|----------|---------|---------|
| **Foundation** |
| pai-hook-system | Yes | ✓ | ✓ | ✓ | Event-driven automation |
| pai-history-system | Yes | ✓ | ✓ | ✓ | Context and memory |
| pai-core-install | Yes | ✓ | ✓ | ✓ | Identity and skills |
| **Publishing** |
| jai-publishing-core | Yes | ✓ | ✓ | opt | Calendar, keywords, SEO tools |
| jai-publishing-skill | Yes | ✓ | ✓ | opt | Article generation workflows |
| **Finance** |
| jai-finance-core | No | ✓ | ✓ | opt | Portfolio, market data, trading |
| jai-trading-analysis | No | ✓ | ✓ | opt | Fundamental/technical analysis |
| **Productivity** |
| pai-prompting-skill | No | ✓ | ✓ | - | Meta-prompting templates |
| pai-agents-skill | No | ✓ | ✓ | - | Dynamic agent composition |
| pai-art-skill | No | ✓ | ✓ | - | Image generation (API-based) |
| **Interactive Only** |
| pai-browser-skill | No | ✓ | - | - | Browser automation |
| pai-voice-system | No | ✓ | - | - | Voice notifications |

**Legend:** ✓ = included, - = skipped, opt = optional (ask user)

---

## Installation Order

Packs must be installed in this sequence due to dependencies:

### Phase 1: Foundation (Required)

```
1. pai-hook-system      # Event middleware - enables everything else
2. pai-history-system   # Memory and context capture
3. pai-core-install     # Identity, skills, architecture
```

### Phase 2: Core Capabilities

```
4. pai-prompting-skill  # Template-based prompting
5. pai-agents-skill     # Dynamic agent composition
6. pai-art-skill        # Image generation for publishing
```

### Phase 3: Domain Packs

```
7. jai-publishing-core  # Content calendar, keyword queue, SEO
8. jai-publishing-skill # Article generation workflows
9. jai-finance-core     # Portfolio and market data
10. jai-trading-analysis # Stock analysis and signals
```

### Phase 4: Interactive (Full profile only)

```
11. pai-browser-skill   # Browser automation
12. pai-voice-system    # Voice notifications
```

---

## Deployment Profiles

### Full (Laptop/Desktop)

Complete installation with all capabilities.

**Prerequisites:**
- macOS or Linux with display
- Bun runtime
- Claude Code authenticated

**Post-install:**
- Configure ElevenLabs API key for voice
- Set up browser automation preferences

### Headless (VPS/Server)

Automation-focused installation for servers.

**Prerequisites:**
- Linux server (Ubuntu 22.04+ recommended)
- Bun runtime
- Claude Code authenticated via OAuth

**Post-install configuration:**

1. **GitLab Runner** (if using CI/CD automation):
   ```bash
   # Install runner
   curl -L https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh | sudo bash
   sudo apt-get install gitlab-runner

   # Register with tags: vps, pai, publishing
   sudo gitlab-runner register
   ```

2. **Scheduled Jobs** (if using cron):
   ```bash
   # Morning market brief (6 AM)
   0 6 * * * claude -p "Run morning market analysis" --max-turns 10

   # Check publishing calendar (9 AM)
   0 9 * * * claude -p "Check publishing calendar for due articles" --max-turns 15
   ```

3. **Claude OAuth Token:**
   - Stored in `~/.claude/.credentials.json`
   - Authenticate interactively once, then headless works

### Minimal

Quick setup for testing or single-purpose deployment.

**Includes:** Foundation (3 packs) + one domain of choice

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PAI Foundation                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Hook System │──│   History   │──│ Core Install│          │
│  │  (events)   │  │  (memory)   │  │ (identity)  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   Publishing  │  │    Finance    │  │  Productivity │
│ ┌───────────┐ │  │ ┌───────────┐ │  │ ┌───────────┐ │
│ │   Core    │ │  │ │  Finance  │ │  │ │ Prompting │ │
│ │ Calendar  │ │  │ │   Core    │ │  │ │   Skill   │ │
│ │ Keywords  │ │  │ │ Portfolio │ │  │ └───────────┘ │
│ │   SEO     │ │  │ │  Trading  │ │  │ ┌───────────┐ │
│ └───────────┘ │  │ └───────────┘ │  │ │  Agents   │ │
│ ┌───────────┐ │  │ ┌───────────┐ │  │ │   Skill   │ │
│ │   Skill   │ │  │ │  Trading  │ │  │ └───────────┘ │
│ │ Workflows │ │  │ │ Analysis  │ │  │ ┌───────────┐ │
│ └───────────┘ │  │ └───────────┘ │  │ │    Art    │ │
└───────────────┘  └───────────────┘  │ │   Skill   │ │
                                      │ └───────────┘ │
                                      └───────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
      ┌─────────────┐           ┌─────────────┐
      │   Browser   │           │    Voice    │
      │   (Full)    │           │   (Full)    │
      └─────────────┘           └─────────────┘
```

---

## Data Flow

### Publishing Automation (Headless)

```
GitLab Schedule → Claude CLI → Publishing Skill → Article Generated
       │                              │
       │                              ├── Keyword Queue (select topic)
       │                              ├── Art Skill (hero image)
       │                              ├── SEO Checker (validate)
       │                              └── Calendar (update status)
       │
       └── Git commit → GitLab CI → Cloudflare Pages
```

### Market Analysis (Headless)

```
Cron Job → Claude CLI → Trading Analysis → Discord Webhook
                              │
                              ├── Finance Core (fetch data)
                              ├── Fundamental Analysis
                              ├── Technical Indicators
                              └── Verdict (BUY/HOLD/AVOID)
```

---

## Verification

After installation, verify the bundle:

### Foundation Check

```bash
# Hooks working
ls ~/.claude/hooks/

# History capturing
ls ~/.claude/history/

# Core identity
cat ~/PAI/skills/CORE/SKILL.md
```

### Publishing Check

```bash
# Tools accessible
bun run ~/PAI/packs/jai-publishing-core/Tools/Calendar.ts --help
bun run ~/PAI/packs/jai-publishing-core/Tools/KeywordQueue.ts --help

# Skill routing
# Ask Claude: "Show me the keyword queue for pispy"
```

### Finance Check

```bash
# Tools accessible
bun run ~/PAI/packs/jai-finance-core/Tools/MarketData.ts --help

# Analysis working
# Ask Claude: "Run analysis on AAPL"
```

### Headless Verification

```bash
# Claude CLI works
claude -p "Say hello" --max-turns 1

# GitLab Runner (if configured)
gitlab-runner status
```

---

## Site Configuration

For publishing workflows, each site needs context:

```
~/sites/pispycameras.com/
├── .pai/
│   ├── site-context.md      # Site identity, audience, legal
│   └── article-template.md  # Article structure guide
├── keywords.json
├── content-calendar.json
└── src/pages/articles/
```

Create site context with: `"Initialize site context for pispycameras"`

---

## Related Bundles

- **mai-merlin-bundle** - Work infrastructure (DevSecOps, security, CI/CD)
- **pai-official-bundle** - Upstream PAI foundation

---

## Changelog

### 1.0.0 - 2026-01-09
- Initial bundle release
- 12 packs with 3 deployment profiles
- Publishing, finance, and productivity domains
- Full/Headless/Minimal deployment support
