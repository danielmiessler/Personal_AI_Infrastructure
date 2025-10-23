# UFC Context System Documentation

## Overview

The Universal Flexible Context (UFC) system is PAI's intelligent context management framework. It has evolved from a context-file-based system to a **Skills-based architecture** that provides semantic understanding of user intent and dynamically loads relevant skills and agents.

**Current Architecture:** Skills-based (as of v0.5.0)

## Core Concepts

### Semantic Understanding

Unlike traditional keyword matching, UFC understands the **meaning** behind user requests:

- "Help me with my site" → Understands this means website skill
- "What's new with AI" → Recognizes research intent
- "Fix this bug" → Identifies engineering skill needed

### Dynamic Skills Loading

Skills are loaded on-demand based on:
1. User intent analysis
2. Current conversation context
3. Project-specific requirements
4. Task complexity

## How UFC Works (Skills-Based Architecture)

### 1. Intent Recognition Pipeline

```
User Input → Semantic Analysis → Pattern Matching → Skill Selection → Loading
```

**Example Flow:**
```yaml
User: "I need to update my blog with AI research"
↓
Semantic Analysis: [blog, update, AI, research]
↓
Pattern Match:
  - "blog" → website skill
  - "research" → research skill
↓
Skill Load:
  - Skill: website
  - Skill: research
```

### 2. Skills System Architecture

Skills are self-contained units in `${CLAUDE_PLUGIN_ROOT}/skills/` that include:

**Skill Structure:**
```
skills/
  └── skill-name/
      ├── skill.md         # Skill description and metadata
      ├── CLAUDE.md        # Context and instructions
      ├── commands/        # Skill-specific commands
      └── resources/       # Supporting files
```

**Example Skill Declaration (skill.md):**
```yaml
---
name: website
description: Manage danielmiessler.com VitePress blog and website...
---
```

### 3. Global Context Loading

The system loads global context via `${CLAUDE_PLUGIN_ROOT}/PAI.md` on every user prompt through the hook system:

**PAI.md contains:**
- Core identity and personality
- Global stack preferences
- General instructions
- Response format standards
- Key contacts

## Skill Categories

### 1. Website & Blog Skill
**Intent Triggers**: website, blog, site, homepage, navigation, publish
**Skill**: `website`
**Provides**:
- Blog post management
- VitePress configuration
- Cloudflare deployment
- Content management

### 2. Research Skill
**Intent Triggers**: research, investigate, find information, latest news
**Skill**: `research`
**Provides**:
- Multi-source research orchestration
- Perplexity, Claude, Gemini researchers
- Information synthesis

### 3. Development Skill
**Intent Triggers**: build, create, implement, code, feature, application
**Skill**: `development`
**Provides**:
- Spec-driven development workflow
- Architect and engineer agent coordination
- Test-driven development

### 4. Security & Pentesting Skill
**Intent Triggers**: security, vulnerabilities, pentesting, audit
**Skill**: Not yet migrated to skills (uses agent directly)
**Provides**: Security testing via pentester agent

### 5. Financial Skill
**Intent Triggers**: expenses, bills, budget, spending
**Skill**: `finances`
**Provides**:
- Expense tracking
- Budget analysis
- Financial reporting

## Agent System Integration

UFC automatically launches specialized agents based on intent:

```yaml
Available Agents:
- general-purpose: Default for complex tasks
- engineer: Software development (spec-driven)
- architect: System design and specifications
- designer: UI/UX and visual design
- pentester: Security testing
- perplexity-researcher: Web research via Perplexity
- claude-researcher: Web research via Claude WebSearch
- gemini-researcher: Multi-perspective research via Gemini
- artist: AI image generation
- browser: Autonomous UI testing
```

### Agent Selection Logic

Agents are invoked by:
1. **Skills**: Skills invoke agents programmatically
2. **Direct Intent**: User request directly maps to agent
3. **Task Complexity**: Complex tasks trigger general-purpose agent

## Dynamic Requirements Loading

The UFC system uses the `user-prompt-submit-hook` to:

1. **Global Context Load**: Always loads `${CLAUDE_PLUGIN_ROOT}/PAI.md`
2. **Intent Analysis**: Semantic understanding of user request
3. **Skill Selection**: Matching against skill descriptions
4. **Skill Loading**: Reading skill context files
5. **Agent Launch**: Starting specialized agents if needed

### Hook Implementation Flow

```bash
#!/bin/bash
# user-prompt-submit-hook (simplified)

# 1. Always load global context
load_global_context "${CLAUDE_PLUGIN_ROOT}/PAI.md"

# 2. Analyze user intent
INTENT=$(analyze_intent "$USER_PROMPT")

# 3. Load matching skill
case "$INTENT" in
  "website")
    invoke_skill "website"
    ;;
  "research")
    invoke_skill "research"
    ;;
  "development")
    invoke_skill "development"
    ;;
esac
```

## Best Practices

### 1. Skill Design Guidelines

- **Keep it focused**: One domain per skill
- **Clear descriptions**: Enable semantic matching
- **Self-contained**: Include all necessary context
- **Command-driven**: Use commands for complex workflows
- **Update regularly**: Keep skills current

### 2. Semantic Triggers

- **Be comprehensive**: Include synonyms and variations
- **Test patterns**: Verify trigger accuracy
- **Avoid conflicts**: Ensure clear disambiguation

### 3. Performance Optimization

- **Lazy loading**: Load only what's needed
- **Skill descriptions**: Keep descriptions concise for fast matching
- **Agent reuse**: Share agents across skills when appropriate

## Migration from Context-Based to Skills-Based

**Old System (pre-v0.5.0):**
```
context/
  ├── CLAUDE.md                    # Global context
  ├── projects/
  │   ├── website/CLAUDE.md
  │   └── Alma.md
  ├── life/
  │   ├── expenses.md
  │   └── finances/
  └── tools/CLAUDE.md
```

**New System (v0.5.0+):**
```
PAI.md                             # Global context (always loaded)
skills/
  ├── website/
  │   ├── skill.md                # Skill description
  │   └── CLAUDE.md               # Skill context
  ├── research/
  │   ├── skill.md
  │   └── CLAUDE.md
  └── development/
      ├── skill.md
      └── CLAUDE.md
```

**Key Changes:**
1. **Global context**: `context/CLAUDE.md` → `PAI.md`
2. **Project context**: `context/projects/*` → `skills/*`
3. **Agent context**: Moved to `agents/*.md` with PAI.md reference
4. **Loading mechanism**: Hook-based remains, but loads skills not context files

## Troubleshooting

### Skill Not Loading

1. **Check skill description**: Verify semantic triggers match
2. **File paths**: Ensure skill files exist in `${CLAUDE_PLUGIN_ROOT}/skills/`
3. **Permissions**: Check file read permissions
4. **Hook execution**: Verify hooks are running

### Wrong Skill Selected

1. **Review descriptions**: Make skill descriptions more specific
2. **Add disambiguators**: Include negative examples
3. **Test variations**: Try different phrasings

### Debug Mode

Enable debug logging:

```bash
export UFC_DEBUG=true
```

View hook execution:
```bash
# Check hook output in Claude Code console
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Skill not found | Check skill.md exists in skills/ directory |
| Wrong agent selected | Review skill description and agent mapping |
| Slow loading | Optimize skill CLAUDE.md file size |
| Duplicate loading | Check for circular skill dependencies |

## Examples

### Example 1: Website Update

```bash
User: "I need to update my blog with the latest AI news"

UFC Analysis:
- Triggers: ["blog", "update", "AI", "news"]
- Skills: website, research
- Actions:
  1. Load website skill
  2. Load research skill
  3. Coordinate skills to accomplish task
```

### Example 2: Build New Feature

```bash
User: "Build a meditation timer application"

UFC Analysis:
- Triggers: ["build", "application"]
- Skill: development
- Actions:
  1. Load development skill
  2. Invoke architect agent for specs
  3. Invoke engineer agent for implementation
```

### Example 3: Research Task

```bash
User: "Research the latest quantum computing developments"

UFC Analysis:
- Triggers: ["research", "latest", "developments"]
- Skill: research
- Actions:
  1. Load research skill
  2. Launch parallel research agents
  3. Synthesize findings
```

## Future Enhancements

### Planned Features

1. **Skill Marketplace**: Share and discover community skills
2. **Skill Versioning**: Track skill changes and dependencies
3. **Multi-language Support**: Skills in multiple languages
4. **Cloud Sync**: Synchronize skills across devices
5. **Skill Analytics**: Track skill usage and effectiveness

### Experimental Features

- **Auto-skill Generation**: Create skills from documentation
- **Skill Composition**: Combine multiple skills dynamically
- **Predictive Loading**: Pre-load likely skills
- **Skill Inheritance**: Skills extend other skills

---

*UFC Skills-Based Architecture - Version 0.5.0*
*Updated: 2025-10-18*
