---
name: PAI OSINT Skill
pack-id: danielmiessler-osint-skill-core-v2.3.0
version: 2.3.0
author: danielmiessler
description: Open source intelligence gathering system with ethical framework, multi-domain workflows, and parallel researcher fleet deployment
type: skill
purpose-type: [security, research, analysis]
platform: agnostic
dependencies: []
keywords: [osint, intelligence, research, due-diligence, people-search, company-research, threat-intel, investigation, security, reconnaissance, background-check, vetting]
---

<p align="center">
  <img src="../icons/osint-skill.png" alt="PAI OSINT Skill" width="256">
</p>

# PAI OSINT Skill

> Comprehensive open source intelligence gathering system with ethical framework, domain-first methodology, and parallel researcher fleet deployment for authorized investigations

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../README.md#what-is-pai)

**What is a Pack?** See: [Pack System](../README.md#the-journey-pai-v1x--v20)

This pack adds professional OSINT (Open Source Intelligence) capabilities to your AI system. The OSINT Skill provides structured workflows for ethical intelligence gathering across three domains:

- **People Intelligence**: Professional backgrounds, credentials verification, digital footprint mapping
- **Company Intelligence**: Business registration, domain discovery, technical infrastructure, investment due diligence
- **Entity/Threat Intelligence**: Domain analysis, IP reputation, malware intelligence, C2 detection

**Core principle:** Authorization first, ethics always, multiple source verification mandatory.

The skill includes comprehensive tool references, parallel researcher fleet deployment patterns, and strict ethical guardrails that ensure all investigations stay within legal and ethical boundaries.

Please follow the installation instructions in INSTALL.md to integrate this pack into your infrastructure.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Main Skill File | `src/skills/SKILL.md` | Workflow routing, authorization checks, integration points |
| Ethical Framework | `src/skills/EthicalFramework.md` | Legal requirements, red lines, data handling standards |
| Methodology | `src/skills/Methodology.md` | Intelligence cycle, source hierarchy, confidence levels |
| People Tools | `src/skills/PeopleTools.md` | 30+ tools for people research |
| Company Tools | `src/skills/CompanyTools.md` | 25+ tools for company research |
| Entity Tools | `src/skills/EntityTools.md` | 35+ tools for threat intelligence |
| People Lookup | `src/skills/Workflows/PeopleLookup.md` | 7-phase people investigation workflow |
| Company Lookup | `src/skills/Workflows/CompanyLookup.md` | 7-phase company investigation workflow |
| Due Diligence | `src/skills/Workflows/CompanyDueDiligence.md` | 5-phase investment vetting (32+ agents) |
| Entity Lookup | `src/skills/Workflows/EntityLookup.md` | 9-phase threat intelligence workflow |

**Summary:**
- **Files created:** 10
- **Workflows:** 4 (People, Company, Due Diligence, Entity)
- **Dependencies:** None (standalone skill)

---

## The Concept and/or Problem

Intelligence gathering without structure leads to:

**Ethical Failures:**
- Investigators exceed authorized scope
- Privacy laws violated accidentally
- Questionable data sources used without awareness
- No documentation of methodology for legal review

**Quality Failures:**
- Single-source claims presented as fact
- Confirmation bias drives investigation direction
- Critical sources missed (like investor portals on alternative TLDs)
- Contradictory information not reconciled

**Efficiency Failures:**
- Manual, sequential research takes hours
- Same tools discovered independently each time
- No reusable patterns across investigation types
- Context lost between sessions

**The Real Risk:**

Bad OSINT can destroy careers (false accusations), lose investments (missed red flags), or create legal liability (unauthorized access). Good OSINT requires rigorous methodology, not just access to tools.

Traditional "OSINT guides" provide tool lists without:
- Authorization frameworks
- Quality gates between phases
- Multi-source verification requirements
- Parallel execution patterns
- Confidence level assignments
- Ethical boundaries

## The Solution

The OSINT Skill provides a **complete intelligence gathering system** with:

**1. Authorization-First Architecture**

Every workflow starts with mandatory authorization verification:
- Explicit written permission
- Defined scope boundaries
- Legal compliance confirmation
- Documentation requirements

The system blocks execution until authorization is confirmed.

**2. Domain-Specific Workflows**

Four specialized workflows for different investigation types:
- **PeopleLookup**: 7 phases from identifier collection to verification
- **CompanyLookup**: 7 phases with domain enumeration and technical recon
- **CompanyDueDiligence**: 5-phase investment vetting with 32+ parallel agents
- **EntityLookup**: 9 phases for threat intelligence and malware analysis

**3. Parallel Researcher Fleet**

Deploy multiple AI researchers simultaneously:
- Quick lookup: 4-6 agents
- Standard investigation: 8-16 agents
- Comprehensive due diligence: 24-32 agents

Each researcher type has strengths:
- PerplexityResearcher: Current web data, social media
- ClaudeResearcher: Academic depth, professional analysis
- GeminiResearcher: Multi-perspective, cross-domain
- GrokResearcher: Contrarian analysis, fact-checking

**4. Quality Gates**

Phase transitions require verification:
- Confidence thresholds met
- Multiple sources confirmed
- Gaps documented
- Red flags noted

**5. Tool References**

90+ tools categorized by domain with:
- Purpose and data available
- Pricing information
- Coverage scope
- Selection guidance

---

## What Makes This Different

```
User Request
     |
     v
+--------------------+
| AUTHORIZATION      |  <-- MANDATORY first gate
| - Written approval |
| - Scope defined    |
| - Legal compliance |
+--------------------+
     |
     v
+--------------------+
| WORKFLOW ROUTER    |
| - People lookup    |
| - Company lookup   |
| - Due diligence    |
| - Entity lookup    |
+--------------------+
     |
     v
+--------------------+
| PARALLEL FLEET     |  <-- Multiple researchers
| - Perplexity (web) |      simultaneously
| - Claude (depth)   |
| - Gemini (cross)   |
| - Grok (verify)    |
+--------------------+
     |
     v
+--------------------+
| QUALITY GATES      |  <-- Must pass to proceed
| - 3+ sources       |
| - Confidence level |
| - Gaps documented  |
+--------------------+
     |
     v
+--------------------+
| ETHICAL GUARDRAILS |  <-- Continuous check
| - Public sources   |
| - No pretexting    |
| - Data handling    |
+--------------------+
     |
     v
Verified Report
```

**What makes this architecture superior:**

1. **Authorization is blocking**: Cannot skip ethical review
2. **Parallel execution**: 32 agents vs. sequential manual research
3. **Quality gates prevent**: Single-source claims, confirmation bias
4. **Tool references provide**: Immediate access to 90+ vetted resources
5. **Domain-first protocol**: Discovers all digital assets before deep research

---

## Why This Is Different

This sounds similar to "OSINT framework guides" which also provide tool lists and methodology. What makes this approach different?

The OSINT Skill integrates authorization, parallel execution, and quality gates into an executable system. While guides provide reference material to read, this skill provides workflows your AI executes with built-in ethical checkpoints. The difference is active enforcement versus passive documentation.

- Authorization verification blocks execution until confirmed
- Parallel researcher fleets reduce hours to minutes
- Quality gates enforce multi-source verification automatically
- Domain-first protocol prevents common intelligence gaps
