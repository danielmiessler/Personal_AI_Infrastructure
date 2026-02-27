# Research Upgrade

Deeply research a discovered upgrade opportunity to understand implementation details, best practices, and PAI integration approach.

**Trigger:** "research this upgrade", "deep dive on [feature]", "analyze release notes", "further research"

---

## Overview

When CheckForUpgrades discovers something interesting, use this workflow to:
1. Research the feature across multiple authoritative sources
2. Understand implementation details and best practices
3. Map to PAI architecture for integration opportunities
4. Generate actionable implementation recommendations

---

## Process

### Step 1: Identify Research Target

Accept input in various forms:
- Feature name from CheckForUpgrades results
- Release notes content (from `/release-notes` command)
- Blog post or documentation URL
- YouTube video transcript
- Changelog entry

---

### Step 2: Launch Parallel Research

**For each significant feature, research across sources:**

Use BACKGROUNDDELEGATION to spawn parallel Intern agents:

```markdown
For feature: [Feature Name]

Search these sources:
1. GitHub: anthropics/claude-code
   - README, CHANGELOG, docs/, examples/
   - Commit messages mentioning the feature
   - Issue discussions

2. Anthropic Engineering Blog
   - https://www.anthropic.com/news
   - https://www.anthropic.com/research

3. Claude Documentation
   - https://docs.claude.com
   - https://support.claude.com

4. MCP Documentation (if relevant)
   - https://modelcontextprotocol.io
   - https://spec.modelcontextprotocol.io

5. Community Resources
   - GitHub Discussions
   - Stack Overflow
```

---

### Step 3: Synthesize Research

For each feature, compile:

| Aspect | Details |
|--------|---------|
| **Official Documentation** | What Anthropic says about it |
| **Implementation Details** | How it works under the hood |
| **Use Cases** | Documented examples and patterns |
| **Limitations** | Known constraints or caveats |
| **Best Practices** | Recommended usage patterns |

---

### Step 4: Map to PAI Architecture

Analyze applicability to PAI components:

| Component | Potential Impact |
|-----------|-----------------|
| Skills System | New skill capabilities, context forking |
| Hooks System | New hook types, triggers, agent-scoped hooks |
| Agent System | New agent types, delegation patterns |
| Workflows | New workflow possibilities |
| Tools | New CLI tools or capabilities |
| Configuration | Settings changes, deny lists |

---

### Step 5: Generate Recommendations

Use priority framework:
- 🔥 **HIGH PRIORITY** - Immediate value, can implement today
- 📌 **MEDIUM PRIORITY** - Good value, requires more work
- 💡 **ASPIRATIONAL** - Future possibilities, research needed

Each recommendation includes:
- Feature being leveraged
- Current PAI gap it fills
- Implementation approach
- Estimated effort
- Dependencies

---

### Step 6: Output Report

```markdown
# Upgrade Research: [Feature/Topic]
**Research Date:** [date]

## Executive Summary
[2-3 sentences on findings and key opportunities]

## Features Researched

### [Feature Name]
**Category:** [hooks/skills/agents/config/etc]
**Official Docs:** [URL if found]

**What It Does:**
[Clear explanation from research]

**Technical Details:**
[Implementation specifics from GitHub/docs]

**PAI Opportunity:**
[How we can use this]

**Implementation:**
- [ ] [Step 1]
- [ ] [Step 2]

---

## Prioritized Upgrade Roadmap

### 🔥 HIGH PRIORITY (This Week)
1. [Feature] → [Implementation]

### 📌 MEDIUM PRIORITY (This Month)
1. [Feature] → [Implementation]

### 💡 ASPIRATIONAL (Research Further)
1. [Feature] → [Why interesting]

## Research Sources
- [URLs consulted]

## Next Steps
- [ ] [Specific action item]
```

---

## Research Agent Template

When spawning research agents:

```markdown
Research the following Claude Code feature in depth:

**Feature:** [Feature name]
**Brief:** [What we know so far]

Search these sources:
1. GitHub: anthropics/claude-code - README, CHANGELOG, docs/, commits
2. Anthropic blog: anthropic.com/news
3. Claude docs: docs.claude.com
4. MCP docs: modelcontextprotocol.io

Find:
- Official documentation or examples
- Implementation details
- Use cases and best practices
- Limitations or caveats
- Related features or dependencies

Return a structured summary with source URLs.
```

---

## Examples

**Deep dive on release notes:**
```
User: "analyze the latest Claude Code release"
→ Run /release-notes to get official list
→ Extract significant features
→ Launch parallel research agents
→ Compile findings into upgrade roadmap
```

**Research specific feature:**
```
User: "research the new context forking feature"
→ Spawn research agents for that feature
→ Search GitHub, docs, blog
→ Map to PAI skills architecture
→ Output implementation recommendations
```

---

## Integration

**With Other Workflows:**
- **CheckForUpgrades** - Discovers items to research
- **FindSources** - Identifies new sources to monitor

**With CORE:**
- **BACKGROUNDDELEGATION** - Launch parallel research agents
- **GIT** - Commit any implemented upgrades
