# Release Notes Deep Dive Workflow

Deeply analyze Claude Code `/release-notes` output by researching each feature across multiple authoritative sources, then generate upgrade recommendations for PAI infrastructure.

**Trigger:** "analyze release notes", "deep dive release notes", "research new features"

## Process

### Step 1: Capture Release Notes

Run the `/release-notes` command or use provided release notes content:
```
/release-notes
```

Or accept provided content (YouTube transcript, blog post, changelog).

### Step 2: Extract Features

Parse the release notes to identify individual features:
- New commands/flags
- New skill capabilities
- Hook system changes
- Agent/sub-agent updates
- Performance improvements
- Configuration options
- Breaking changes

### Step 3: Launch Research Agents

**For EACH significant feature, spawn research agents to find deeper documentation.**

Use the BACKGROUNDDELEGATION workflow to launch parallel Intern agents:

```markdown
For each feature:
1. Search Claude Code GitHub repo (anthropics/claude-code)
   - README, CHANGELOG, docs/, examples/
   - Commit messages mentioning the feature
   - Issue discussions

2. Search Anthropic Engineering Blog
   - https://www.anthropic.com/news
   - https://www.anthropic.com/research

3. Search Claude Documentation
   - https://docs.claude.com
   - https://support.claude.com

4. Search Community Resources
   - Claude Developers Discord mentions
   - GitHub Discussions
   - Stack Overflow
```

### Step 4: Synthesize Research

For each feature, compile:
- **Official Documentation** - What Anthropic says about it
- **Implementation Details** - How it works under the hood
- **Use Cases** - Documented examples and patterns
- **Limitations** - Known constraints or caveats
- **Best Practices** - Recommended usage patterns

### Step 5: Map to PAI Architecture

For each researched feature, analyze applicability to:

| PAI Component | Potential Impact |
|---------------|-----------------|
| Skills System | New skill capabilities, context forking |
| Hooks System | New hook types, once triggers, agent-scoped hooks |
| Agent System | New agent types, delegation patterns |
| Workflows | New workflow possibilities |
| Tools | New CLI tools or capabilities |
| Configuration | Settings changes, deny lists |

### Step 6: Generate Upgrade Recommendations

Use the standard priority framework:
- 🔥 **HIGH PRIORITY** - Immediate value, can implement today
- 📌 **MEDIUM PRIORITY** - Good value, requires more work
- 💡 **ASPIRATIONAL** - Future possibilities, research needed

Each recommendation includes:
- Feature being leveraged
- Current PAI gap it fills
- Implementation approach
- Estimated effort
- Dependencies

### Step 7: Output Report

```markdown
# Claude Code Release Deep Dive
**Version:** [version]
**Analysis Date:** [date]

## Executive Summary
[2-3 sentences on major themes and key opportunities]

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

[Repeat for each feature]

## Prioritized Upgrade Roadmap

### 🔥 HIGH PRIORITY (This Week)
1. [Feature] → [Implementation]
2. [Feature] → [Implementation]

### 📌 MEDIUM PRIORITY (This Month)
1. [Feature] → [Implementation]

### 💡 ASPIRATIONAL (Research Further)
1. [Feature] → [Why interesting]

## Research Sources
- [URLs of authoritative sources consulted]

## Next Steps
- [ ] [Specific action item]
```

## Research Agent Template

When spawning research agents, use this prompt template:

```markdown
Research the following Claude Code feature in depth:

**Feature:** [Feature name]
**Brief:** [What the release notes say]

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

## Example Execution

```
User: "analyze the latest Claude Code release"
→ Run /release-notes to get official list
→ Extract 15 features from output
→ Launch 15 research agents in parallel (background)
→ Each agent researches one feature across 4+ sources
→ Collect results when agents complete
→ Map each feature to PAI architecture
→ Generate prioritized upgrade roadmap
→ Output comprehensive report with citations
```

## Integration

**With Other Skills:**
- **Parser** - Extract content from URLs
- **Research** - Deep research on complex features
- **Upgrade** - Apply AnalyzeForUpgrades workflow to findings

**With CORE Workflows:**
- **BACKGROUNDDELEGATION** - Launch parallel research agents
- **GIT** - Commit any upgrades implemented

---

**Last Updated:** 2026-01-08
