---
name: PAI Private Investigator Skill
pack-id: danielmiessler-pai-privateinvestigator-skill-v2.3.0
version: 2.3.0
author: danielmiessler
description: Ethical people-finding using only public data sources - locate lost contacts, verify identities, and search public records
type: skill
purpose-type: [research, analysis, productivity]
platform: claude-code
dependencies: []
keywords: [people-search, osint, public-records, social-media, reverse-lookup, identity-verification, skip-trace, reconnection, investigation, ethical-research]
---

<p align="center">
  <img src="../icons/pai-privateinvestigator-skill.png" alt="PAI Private Investigator Skill" width="256">
</p>

# PAI Private Investigator Skill

> Ethical people-finding using only public data sources - locate lost contacts, verify identities, and search public records with parallel AI research agents

> **Installation:** This pack is designed for AI-assisted installation. Give this directory to your AI and ask it to install using `INSTALL.md`.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Main Skill | `src/skills/PrivateInvestigator/SKILL.md` | Skill routing, capabilities, ethical boundaries |
| Find Person | `src/skills/PrivateInvestigator/Workflows/FindPerson.md` | Full investigation workflow with parallel agents |
| Social Media Search | `src/skills/PrivateInvestigator/Workflows/SocialMediaSearch.md` | Cross-platform social investigation |
| Public Records | `src/skills/PrivateInvestigator/Workflows/PublicRecordsSearch.md` | Government and official records search |
| Reverse Lookup | `src/skills/PrivateInvestigator/Workflows/ReverseLookup.md` | Phone, email, image, username searches |
| Identity Verification | `src/skills/PrivateInvestigator/Workflows/VerifyIdentity.md` | Confirm correct person matches |

**Summary:**
- **Files created:** 6
- **Workflows included:** 5
- **Dependencies:** None (standalone skill)

---

## The Problem

People lose touch. College roommates drift apart. Former colleagues change companies. Childhood friends move away. When you want to reconnect, the challenge is finding someone in a world of 8 billion people where many share common names.

**The Challenges:**

1. **Name Ambiguity**: "John Smith" returns thousands of results across platforms
2. **Data Fragmentation**: Information is scattered across dozens of databases and platforms
3. **Privacy Variations**: Some people are highly visible; others have minimal online presence
4. **Verification Difficulty**: How do you know you found the RIGHT John Smith?
5. **Ethical Boundaries**: What methods are legitimate vs. crossing the line?

**Without a systematic approach:**
- Searches are random and incomplete
- You might contact the wrong person
- You miss obvious data sources
- You don't know when to stop searching
- You risk crossing ethical/legal lines

---

## The Solution

The Private Investigator skill provides a **systematic, ethical framework** for people-finding using only publicly available data. It coordinates multiple AI research agents in parallel to search across:

- People search aggregators (TruePeopleSearch, Spokeo, etc.)
- Social media platforms (LinkedIn, Facebook, Instagram, Twitter/X)
- Public records (property, voter, court, business filings)
- Reverse lookup services (phone, email, image, username)

**Core Architecture:**

```
User Request: "Find my college roommate John Smith from Austin, 2005"
                                    |
                                    v
                    +---------------------------+
                    |    Subject Profile Build   |
                    |  Name, age, location, etc  |
                    +---------------------------+
                                    |
                    +---------------+---------------+
                    |               |               |
                    v               v               v
        +----------+    +----------+    +----------+
        | People   |    | Social   |    | Public   |
        | Search   |    | Media    |    | Records  |
        | Agents   |    | Agents   |    | Agents   |
        +----------+    +----------+    +----------+
                    |               |               |
                    +---------------+---------------+
                                    |
                                    v
                    +---------------------------+
                    |   Cross-Reference Engine   |
                    |  Timeline, family, photos  |
                    +---------------------------+
                                    |
                                    v
                    +---------------------------+
                    |  Confidence Scoring System |
                    |  HIGH / MEDIUM / LOW       |
                    +---------------------------+
                                    |
                                    v
                    +---------------------------+
                    |   Investigation Report     |
                    |  Contact info, sources     |
                    +---------------------------+
```

**Key Features:**

1. **Parallel Research Agents**: 9-15 AI agents search simultaneously across different data sources
2. **Ethical Boundaries**: Clear GREEN ZONE (allowed) and RED ZONE (never) guidelines
3. **Confidence Scoring**: HIGH/MEDIUM/LOW assessment based on multi-source verification
4. **Systematic Methodology**: Four-tier information hierarchy ensures thorough coverage
5. **Identity Verification**: Dedicated workflow to confirm you found the correct person

---

## What Makes This Different

This sounds similar to hiring a PI or using a people search site, which also finds people. What makes this approach different?

This skill orchestrates multiple AI research agents in parallel, searching 15+ data sources simultaneously while maintaining strict ethical boundaries. Unlike single-source lookups that give you raw data, this provides cross-referenced, confidence-scored results with verification methodology. The AI understands context and can disambiguate common names using timeline analysis and family network mapping.

- Parallel agents search fifteen plus sources simultaneously
- Confidence scoring prevents false positive contact mistakes
- Timeline analysis disambiguates very common name matches
- Ethical boundaries are built in not afterthought

---

## Credits

- **Author**: Daniel Miessler
- **Origin**: Extracted from production PAI system
- **License**: MIT
- **Methodology**: Based on legitimate skip-tracing and OSINT techniques

---

## Changelog

### 2.3.0 - 2026-01-14
- Initial pack release
- Five comprehensive workflows for people-finding
- Parallel research agent architecture
- Confidence scoring system
- Ethical boundary framework
