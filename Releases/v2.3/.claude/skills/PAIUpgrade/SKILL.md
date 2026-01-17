---
name: PAIUpgrade
description: Extract system improvements from content AND monitor external sources (Anthropic ecosystem, YouTube). USE WHEN upgrade, improve system, system upgrade, analyze for improvements, check Anthropic, Anthropic changes, new Claude features, check YouTube, new videos. SkillSearch('upgrade') for docs.
context: fork
---

## Customization

**Before executing, check for user customizations at:**
`~/.claude/skills/CORE/USER/SKILLCUSTOMIZATIONS/PAIUpgrade/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.

# PAIUpgrade Skill

Universal system upgrade skill with two modes:
1. **Analysis Mode** - Analyze ANY content to identify system improvement opportunities
2. **Monitoring Mode** - Proactively monitor Anthropic ecosystem and YouTube for updates


## Voice Notification

**When executing a workflow, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running the WORKFLOWNAME workflow from the PAIUpgrade skill"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow from the **PAIUpgrade** skill...
   ```

**Full documentation:** `~/.claude/skills/CORE/SkillNotifications.md`

## Workflow Routing

Route to the appropriate workflow based on the request.

**When executing a workflow, output this notification directly:**

```
Running the **WorkflowName** workflow from the **PAIUpgrade** skill...
```

| Workflow | Trigger | File |
|----------|---------|------|
| **CheckForUpgrades** | "check for upgrades", "check sources", "any updates", "check Anthropic", "check YouTube" | `Workflows/CheckForUpgrades.md` |
| **ResearchUpgrade** | "research this upgrade", "deep dive on [feature]", "further research" | `Workflows/ResearchUpgrade.md` |
| **ReleaseNotesDeepDive** | "analyze release notes", "deep dive release" | `Workflows/ReleaseNotesDeepDive.md` |
| **FindSources** | "find upgrade sources", "find new sources", "discover channels" | `Workflows/FindSources.md` |

---

## When to Activate This Skill

### Check for Upgrades Triggers
- "check for upgrades", "check upgrade sources"
- "any new updates", "what's new"
- "check Anthropic", "check YouTube"
- "any new Claude features"

### Research Triggers
- "research this upgrade", "dig deeper on this"
- "further research on [feature]"
- "analyze release notes", "deep dive the latest release"

### Source Discovery Triggers
- "find upgrade sources", "find new sources"
- "discover new channels", "expand monitoring"

### Contextual Triggers
- After reading interesting technical content, articles, or documentation
- When discovering new tools, libraries, or techniques
- During competitive analysis or research into other systems
- After watching technical talks, tutorials, or demonstrations
- When exploring new AI/LLM capabilities or patterns

---

## Part 1: Content Analysis Mode

**Universal Input -> System Upgrade Recommendations**

Takes ANY content type and performs deep thinking analysis to extract insights and identify concrete system infrastructure improvement opportunities.

### Analysis Dimensions

Analyzes content across 10 dimensions:
- **Architectural Patterns** - Could improve the system's structure
- **Tool/Library Innovations** - New integrations to consider
- **Workflow Optimizations** - Better processes and patterns
- **Agent Enhancements** - Improved agent designs or capabilities
- **Performance Techniques** - Speed and efficiency gains
- **UX Improvements** - Better user experience patterns
- **Security Enhancements** - Stronger security approaches
- **Integration Opportunities** - New services or APIs to connect
- **Automation Possibilities** - More automation opportunities
- **Testing Strategies** - Better testing and quality approaches

### Supported Content Types

- URLs (articles, blog posts, documentation, GitHub repos)
- Files (markdown, code, PDFs, transcripts, text)
- YouTube videos (automatic transcript extraction)
- Raw text or code snippets
- Research papers
- Tool documentation

### Output Format

**"No Gaps Found" is a VALID and often CORRECT output.**

If analysis shows the system already implements everything in the content:
- Say "No gaps found - we already do this"
- Briefly note what the content covers and how the system addresses it
- **STOP.** Do not generate recommendations.

**Only if genuine gaps exist**, output prioritized recommendations:
- **HIGH PRIORITY** - High impact, reasonable effort (do this soon)
- **MEDIUM PRIORITY** - Good ideas with more complexity or moderate impact
- **ASPIRATIONAL** - Interesting long-term possibilities

**What is NOT a valid recommendation:**
- "Document what we already do"
- "Formalize existing patterns"
- "Add awareness of features we have"

These are busywork, not upgrades. If the system does it, we don't need to "document" it as an upgrade.

---

## Part 2: Source Monitoring Mode

**Proactive ecosystem monitoring for PAI-relevant updates**

### Anthropic Monitoring (30+ sources)

**Sources Monitored:**
1. **Blogs & News** (4) - Main blog, Alignment, Research, Interpretability
2. **GitHub Repositories** (21+) - claude-code, skills, MCP, SDKs, cookbooks
3. **Changelogs** (5) - Claude Code CHANGELOG, releases, docs notes
4. **Documentation** (6) - Claude docs, API docs, MCP docs, spec, registry
5. **Community** (1) - Discord server

**Tool:** `Tools/Anthropic.ts`

### YouTube Monitoring

YouTube channels are configured via the **Skill Customization Layer**.
See `~/.claude/skills/CORE/USER/SKILLCUSTOMIZATIONS/PAIUpgrade/` for user-specific channels.

**Features:**
- Detection of new videos via yt-dlp
- Transcript extraction via **VideoTranscript** skill
- State tracking to avoid duplicate processing
- User-customizable channel list

---

## Tool Reference

| Tool | Purpose |
|------|---------|
| `Tools/Anthropic.ts` | Check Anthropic sources for updates |

## Configuration

**Skill Files:**
- `sources.json` - Anthropic sources config (30+ sources)
- `youtube-channels.json` - Base YouTube channels (empty - uses customization)
- `State/last-check.json` - Anthropic state
- `State/youtube-videos.json` - YouTube state

**User Customizations** (`~/.claude/skills/CORE/USER/SKILLCUSTOMIZATIONS/PAIUpgrade/`):
- `EXTEND.yaml` - Extension manifest
- `youtube-channels.json` - User's personal YouTube channels

Use `bun ~/.claude/skills/CORE/Tools/LoadSkillConfig.ts` to load configs with customizations merged.

---

## Core Workflow Overview

The skill has four complementary workflows:

| Workflow | Purpose |
|----------|---------|
| **CheckForUpgrades** | Monitor configured sources (Anthropic + YouTube) for new content |
| **ResearchUpgrade** | Deep dive on discovered features to understand implementation |
| **ReleaseNotesDeepDive** | Specialized research on Claude Code release notes |
| **FindSources** | Discover and evaluate new sources to add to monitoring |

**Typical flow:**
1. Run **CheckForUpgrades** to discover new content
2. Use **ResearchUpgrade** to dig deeper on interesting items
3. Use **FindSources** to expand monitoring over time

---

## Advanced Features

### Synergy Detection

Identifies combinations of improvements that multiply value:
- Cross-component synergies
- Cascading benefits from combined implementations
- Enablement chains (implementing X enables Y and Z)

### Trend Tracking

When analyzing multiple pieces of content over time:
- Tracks recurring themes and patterns
- Identifies emerging industry trends
- Spots opportunities before they're obvious
- Builds upgrade momentum around trends

### Gap Analysis

Compares content insights to the system's current capabilities:
- What capabilities do we lack
- What problems others solve that we face
- Future needs to prepare for
- Opportunity cost of not implementing

### Meta-Learning

The skill improves its own recommendations over time:
- Tracks which recommendations get implemented
- Learns what types of improvements are most valuable
- Refines impact/effort estimation accuracy
- Improves component mapping precision

---

## Integration Points

### With Other Skills

**parser:**
- Use for URL and content extraction
- Handles multiple content types automatically

**research:**
- For deep-dive analysis on specific topics
- When upgrade requires additional research before recommendation

**be-creative:**
- For creative application of insights
- When brainstorming unconventional approaches to implementation

**development:**
- When ready to implement recommendations
- For spec-driven development of new features

**VideoTranscript:**
- For YouTube transcript extraction
- Used in YouTube monitoring workflow

### With System Components

**History Capture:**
- Log all upgrade analyses to `~/.claude/History/research/YYYY-MM/`
- Build searchable archive of improvement ideas
- Track implementation status over time

**Todo System:**
- Can auto-generate todos from HIGH PRIORITY recommendations
- Track upgrade backlog and priorities
- Monitor progress on implementation roadmap

**Agent Delegation:**
- Can delegate research on specific upgrades to research agents
- Can parallelize implementation of multiple improvements with engineer agents

---

## Examples

**Example 1: Check for upgrades**
```
User: "check for upgrades"
→ Invokes CheckForUpgrades workflow
→ Runs Anthropic.ts tool (30+ sources)
→ Checks YouTube channels (from USER config)
→ Combines into prioritized upgrade report
```

**Example 2: Research a discovered feature**
```
User: "research the new context forking feature"
→ Invokes ResearchUpgrade workflow
→ Spawns parallel research agents
→ Searches GitHub, docs, blog for details
→ Maps to PAI architecture opportunities
→ Outputs implementation recommendations
```

**Example 3: Deep dive on release notes**
```
User: "deep dive the latest release notes"
→ Invokes ReleaseNotesDeepDive workflow
→ Runs /release-notes to capture features
→ Launches parallel research agents for each feature
→ Maps to PAI architecture opportunities
→ Outputs prioritized upgrade roadmap with citations
```

**Example 4: Find new sources**
```
User: "find new upgrade sources"
→ Invokes FindSources workflow
→ Searches for relevant YouTube channels
→ Evaluates and ranks findings
→ Outputs recommendations with add instructions
```

---

## Key Principles

1. **Universal Input** - Accept any content type without restriction
2. **Deep Analysis** - Use extended thinking for thorough examination
3. **System-Aware** - Understand current system state and constraints
4. **Action-Oriented** - Every insight maps to concrete next steps
5. **Prioritized** - Clear ranking by impact vs effort
6. **Learning System** - Improve recommendations over time
7. **Synergy-Seeking** - Find combinations that multiply value
8. **Stack-Aligned** - Respect TypeScript > Python, CLI-First, bun > npm
9. **NO GAPS = NO RECOMMENDATIONS** - If the system already does everything in the content, say so and STOP

---

## Output Quality Standards

**Every recommendation must have:**
- Clear value proposition (why this matters)
- Concrete implementation steps (how to do it)
- Realistic effort estimate (based on system context)
- Component mapping (what parts of the system affected)
- Actionable next steps (specific tasks)

**Avoid:**
- Vague suggestions without clear value
- Recommendations without implementation path
- Ignoring stack preferences or constraints
- Aspirational ideas in high priority
- Duplicate existing capabilities without noting enhancement

---

## Workflows

- **CheckForUpgrades.md** - Monitor all configured sources for updates
- **ResearchUpgrade.md** - Deep dive on discovered upgrade opportunities
- **ReleaseNotesDeepDive.md** - Specialized research on release notes
- **FindSources.md** - Discover and evaluate new sources to monitor

---

**This skill embodies the system's commitment to continuous improvement and learning from the broader ecosystem while maintaining our architectural principles and preferences.**
