# PAI Bundle Template Specification

> **FOR AI AGENTS:** This document contains instructions for creating PAI Bundles. When a user asks you to create a bundle, follow this template exactly. Each section includes HTML comments with detailed instructions - read them carefully and replace the example content with your bundle's actual content.

A bundle is a curated collection of PAI packs designed to work together as a cohesive system. Each bundle is a directory containing a README.md file (which auto-displays on GitHub) and optionally an icon.

**CRITICAL:** Bundles must document COMPLETE systems. A bundle must clearly specify installation order, dependencies between packs, and verification steps for the entire collection.

---

## Bundle vs Pack

| Aspect | Pack | Bundle |
|--------|------|--------|
| **Scope** | Single capability | Multiple capabilities |
| **Structure** | Single markdown file in `Packs/` | Directory with README.md in `Bundles/` |
| **Code** | Contains complete code | References pack files |
| **Installation** | Standalone | Ordered sequence |
| **Value** | Specific function | Curated experience |

---

## Bundle Directory Structure

```
Bundles/
└── YourBundle/
    ├── README.md             # Bundle specification (required, auto-displays on GitHub)
    └── your-bundle-icon.png  # Bundle icon (optional, 256x256 transparent PNG)
```

**Note:** No installation scripts. All installation is AI-driven through the README.

---

## Frontmatter (Metadata)

```yaml
---
# name: (24 words max) Human-readable bundle name
name: The Official PAI Bundle

# bundle-id: (format) {author}-{bundle-name}-v{version}
bundle-id: danielmiessler-pai-bundle-v1.0.0

# version: (format) SemVer major.minor.patch
version: 1.0.0

# author: (1 word) GitHub username or organization
author: danielmiessler

# description: (128 words max) One-line description
description: Complete personal AI infrastructure from Daniel Miessler's production Kai system

# type: (single) Always "bundle" for bundles
type: bundle

# purpose: (single sentence) What this bundle achieves as a whole
purpose: Transform Claude Code into a production-grade personal AI infrastructure with memory, skills, voice, and identity

# tier: (single) starter | intermediate | advanced | complete
tier: complete

# platform: (single) agnostic | claude-code | opencode | cursor | custom
platform: claude-code

# pack-count: (number) Total packs in the bundle
pack-count: 5

# dependencies: (list) External dependencies (not packs), empty [] if none
dependencies: []

# keywords: (24 tags max) Searchable tags for discovery
keywords: [personal-ai, infrastructure, hooks, history, skills, voice, identity, automation, claude-code]
---
```

---

## Bundle Icon (Optional but Recommended)

If your bundle has an icon, place it in the bundle directory and reference it at the top of README.md.

**Icon specs:**
- 256x256 pixels
- **ACTUAL transparent background** (not baked-in checkerboard)
- Blue (#4a90d9) primary color
- Purple (#8b5cf6) accent only (10-15%)
- Simple, recognizable at 64x64

**Format in README.md:**
```markdown
<p align="center">
  <img src="your-bundle-icon.png" alt="Bundle Name" width="256">
</p>
```

---

## Required Sections

> **FOR AI AGENTS:** Every bundle README.md MUST include these sections in order. The HTML comments in each section contain detailed instructions - read them and follow them exactly. Replace the example content with your bundle's actual content.

Below is a template demonstrating COMPLETE bundle structure.

```markdown
<p align="center">
  <img src="bundle-icon.png" alt="Bundle Name" width="256">
</p>

# Bundle Name

> **FOR AI AGENTS:** You are about to install this bundle. Walk your principal through an interactive wizard to configure their system, then install each pack in order.

## AI Installation Wizard

<!--
🚨 THIS SECTION IS REQUIRED - IT MAKES INSTALLATION AI-DRIVEN 🚨

INSTRUCTIONS FOR AI: This section tells the installing AI what questions to ask
the user before installing the bundle. This is how PAI works - no scripts,
just AI reading instructions and executing them.

Include:
1. Numbered list of questions to ask the principal
2. Default values for each question
3. How to set the environment variables from answers
4. Instruction to proceed through each pack in order
-->

**Start by asking your principal these questions:**

1. **Where should PAI be installed?** (default: `~/.config/pai`)
2. **What would you like to name your DA assistant?** (e.g., Kai, Atlas, Nova)
3. **What's your timezone?** (e.g., America/Los_Angeles)
4. [Add bundle-specific questions here]

**After gathering answers, set these variables:**
```bash
export PAI_DIR="[their answer or default]"
export DA="[their AI name]"
# Add other variables as needed
```

**Then proceed through each pack in the Installation Order section, reading each pack file and installing it with the configured variables.**

---

## About This Bundle

<!--
(256 words max)

INSTRUCTIONS FOR AI: Write a brief introduction explaining:
- What this bundle provides as a whole
- Who it's for
- The key value proposition

Keep it welcoming but concise. This is the first thing users see.
-->

[Brief introduction to the bundle - what it provides, who it's for, why they'd want it]

## Why This Is Different
<!--
(128 words max)

INSTRUCTIONS FOR AI: Explain what makes this bundle unique compared to similar solutions.
Format EXACTLY as follows:
1. Opening line: "This sounds similar to [ALTERNATIVE] which also does [CAPABILITY]. What makes this approach different?"
2. A 64-word paragraph explaining the key differentiator
3. Four bullets of exactly 8 words each

This section is REQUIRED and must follow this exact format.
-->

This sounds similar to [ALTERNATIVE] which also does [CAPABILITY]. What makes this approach different?

[64-word paragraph answering the question - what makes your approach fundamentally different from existing solutions? Focus on the architectural insight, the unique methodology, or the problem framing that sets this apart.]

- [First eight-word bullet explaining a key difference]
- [Second eight-word bullet explaining another key difference]
- [Third eight-word bullet explaining another key difference]
- [Fourth eight-word bullet explaining another key difference]

---

## What This Bundle Provides
<!--
(1024 words max)

INSTRUCTIONS FOR AI: List the key capabilities this bundle provides when fully installed.
Use bullet points with bold capability names and brief descriptions.
Focus on USER VALUE, not technical implementation.
-->

When fully installed, this bundle gives you:

- **[Capability Name]** - [What it does and why it matters]
- **[Capability Name]** - [What it does and why it matters]
- **[Capability Name]** - [What it does and why it matters]

---

## Architecture: How the Packs Work Together
<!--
(2048 words max)

🚨 THIS SECTION IS CRITICAL - IT'S WHAT MAKES BUNDLES VALUABLE 🚨

INSTRUCTIONS FOR AI: This is where you explain how the packs in this bundle
interact and build on each other. This is what makes them work together that justifies
the bundle's existence over installing packs individually.

Every bundle MUST explain:
- How data/events flow between packs
- What emergent capabilities arise from the combination
- Why the installation order matters
- What makes this MORE than the sum of its parts

USE VISUAL DIAGRAMS - ASCII art showing the flow is extremely valuable.

Example flow diagram:
```
Hook Events → History Capture → Skill Context → Voice Output
     ↓              ↓                ↓              ↓
  triggers       records          informs        speaks
```

WITHOUT this section, readers won't understand why installing as a bundle
is better than cherry-picking individual packs.
-->

### Data Flow

[ASCII diagram showing how data/events flow between packs]

```
[Pack 1] → triggers → [Pack 2] → feeds → [Pack 3]
                          ↓
                      [Pack 4]
```

### Why Order Matters

[Explain the dependency chain and why packs must be installed in order]

### Emergent Capabilities

[Explain what capabilities emerge from the combination that don't exist in individual packs]

---

## Installation Order (CRITICAL)
<!--
(512 words max)

INSTRUCTIONS FOR AI: List ALL packs in exact installation order.
Include a table with:
- Order number
- Pack name (linked to pack file)
- Purpose (one sentence)
- Dependencies (which previous packs it requires)

Then explain WHY order matters for this specific bundle.
-->

**Install Packs in this exact order** - each depends on the previous:

| # | Pack | Purpose | Dependencies |
|---|------|---------|--------------|
| 1 | [pack-name](../../Packs/pack-name.md) | [Purpose] | None |
| 2 | [pack-name](../../Packs/pack-name.md) | [Purpose] | Pack 1 |
| 3 | [pack-name](../../Packs/pack-name.md) | [Purpose] | Pack 1, 2 |

### Why Order Matters

- **Pack 1** is the foundation because [reason]
- **Pack 2** uses Pack 1 to [how it uses it]
- **Pack 3** combines both to [what it enables]

### Pack Availability

| Pack | Status |
|------|--------|
| pack-name | **Available** |
| another-pack | **Coming Soon** |

---

## Installation
<!--
(4096 words max)

INSTRUCTIONS FOR AI: Provide step-by-step installation instructions.
Include:
- Prerequisites (dependencies, API keys, system requirements)
- Quick start option (wizard if available)
- Manual installation option
- Configuration variables table
- Conflict detection guidance
- Pack installation sequence
- Bundle-level verification steps

Write for an AI assistant that will execute these steps.
-->

### Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **Claude Code** (or compatible agent system with hook support)
- [Any other prerequisites]

### Quick Start: Interactive Wizard (Recommended)

If your bundle includes an installation wizard:

```bash
# Navigate to the bundle directory
cd ~/Projects/PAI/Bundles/YourBundle

# Run the wizard
bun run install.ts
```

**The wizard will:**
1. Prompt for configuration
2. Detect conflicts
3. Create backups
4. Set up directory structure
5. Guide pack installation

### Configuration Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PAI_DIR` | `~/.config/pai` | Where PAI stores files |
| `DA` | `PAI` | Your DA's name |
| [Other variables] | | |

### Manual Installation (Alternative)

If you prefer not to use the wizard:

```bash
# 1. Set up environment
export PAI_DIR="$HOME/.config/pai"
export DA="YourDAName"

# 2. Create directories
mkdir -p $PAI_DIR/{hooks,history,skills,tools}

# 3. Install each pack in order (give to your DA)
```

### Pack Installation Sequence

| # | Pack | Command | Verification |
|---|------|---------|--------------|
| 1 | Pack Name | Give AI: `Packs/pack-name.md` | `[verification command]` |
| 2 | Another Pack | Give AI: `Packs/another-pack.md` | `[verification command]` |

**For each pack, tell your DA:**
```
Install this pack using:
- PAI_DIR: [your configured path]
- DA: [your DA name]
```

---

## Verification
<!--
(512 words max)

INSTRUCTIONS FOR AI: Provide commands to verify the ENTIRE bundle is working.
This is different from individual pack verification - test that the packs
work TOGETHER as expected.
-->

After installing all packs, verify the bundle is working:

```bash
# Check complete directory structure
ls -la $PAI_DIR/

# Expected directories:
# [list expected directories]

# Check hooks are registered
cat ~/.claude/settings.json | grep -A 5 "hooks"

# Bundle-specific verification
[commands that test packs working together]

# Restart Claude Code to activate all hooks
```

---

## Principles / Philosophy
<!--
(1024 words max)

INSTRUCTIONS FOR AI: Document the principles or philosophy behind this bundle.
What design decisions guided the curation? What beliefs about AI infrastructure
does this bundle embody?

This helps users understand not just WHAT the bundle does but WHY it's
designed this way.
-->

This bundle embeds these principles:

1. **[Principle Name]** - [Explanation]
2. **[Principle Name]** - [Explanation]
3. **[Principle Name]** - [Explanation]

---

## Credits
<!--
(256 words max)
INSTRUCTIONS FOR AI: Attribution for ideas, inspiration, and contributions.
-->

**Author:** [Name]
**Origin:** [Where this bundle came from]

---

## Related Bundles
<!--
(256 words max)
INSTRUCTIONS FOR AI: DO NOT FABRICATE. Leave empty or ask the maintainer.
Only fill in if the maintainer provides specific bundles to link.
-->

*None specified - maintainer to provide if applicable.*

---

## Changelog
<!--
INSTRUCTIONS FOR AI: Document version history.
Format: ### {version} - {YYYY-MM-DD}
-->

### 1.0.0 - YYYY-MM-DD
- Initial release
- [List of included packs]
```

---

## Section Summary Table

| Section | Word Limit | Purpose |
|---------|------------|---------|
| `## AI Installation Wizard` | 256 | **REQUIRED** - Questions for AI to ask before installing |
| `## About This Bundle` | 256 | What the bundle provides |
| `## Why This Is Different` | 128 | Differentiation (64-word paragraph + 4 bullets) |
| `## What This Bundle Provides` | 1024 | Capabilities overview |
| `## Architecture` | 2048 | How packs work together |
| `## Installation Order` | 512 | Pack sequence with dependencies |
| `## Prerequisites` | 256 | External dependencies (Bun, etc.) |
| `## Verification` | 512 | Bundle-level testing |
| `## Principles / Philosophy` | 1024 | Design philosophy |
| `## Credits` | 256 | Attribution |
| `## Related Bundles` | 256 | Similar bundles |
| `## Changelog` | - | Version history |

---

## Bundle Completeness Checklist

> **FOR AI AGENTS:** Before publishing, verify your bundle includes ALL of these:

### Required Elements
- [ ] **AI Installation Wizard**: Questions for AI to ask, env var setup, proceed instruction
- [ ] **Why Different**: 64-word paragraph + 4 eight-word bullets
- [ ] **Architecture diagram**: ASCII showing pack relationships
- [ ] **Installation order table**: All packs with dependencies
- [ ] **Pack availability**: Status for each pack (Available/Coming Soon)
- [ ] **Configuration variables**: All required env vars documented
- [ ] **Bundle verification**: Commands that test packs working together
- [ ] **Pack links**: Every pack linked to its file in Packs/
- [ ] **NO install scripts**: Installation is AI-driven through README only

### Quality Checks
- [ ] **Order explained**: WHY the installation order matters
- [ ] **Emergent capabilities**: What the combination creates beyond individual packs
- [ ] **Conflict handling**: How to handle existing installations
- [ ] **Prerequisites listed**: All external dependencies documented

**The test:** Can someone go from fresh Claude Code to fully working bundle using ONLY this README?

---

## Bundle Tiers Reference

| Tier | Description | Typical Size |
|------|-------------|--------------|
| **Starter** | Minimal viable collection | 2-3 packs |
| **Intermediate** | Core functionality | 4-6 packs |
| **Advanced** | Extended capabilities | 7-10 packs |
| **Complete** | Full experience | 10+ packs |

---

## File Naming Convention

- Bundle directory: PascalCase (e.g., `Kai/`, `SecuritySuite/`)
- README file: `README.md` (required, auto-displays on GitHub)
- Icon file: `{bundle-name}-icon.png` or `{bundle-name}.png`
- Install script: `install.ts` (optional)

---

## Versioning

- SemVer: `major.minor.patch`
- Major: Breaking changes, pack removals
- Minor: New packs added, backwards compatible
- Patch: Documentation fixes, pack updates
