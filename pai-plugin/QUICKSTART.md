# PAI-Boilerplate Quick Start Guide

**⏱️ Get started in 5 minutes**

---

## First Steps

### 1. Verify Installation

```bash
claude
/plugin  # Should show PAI-Boilerplate
/help    # Should show new commands
```

✅ If you see the plugin, you're ready!

---

## Try These Commands

### Research Commands

#### Multi-Source Research
```bash
/conduct-research "latest developments in quantum computing"
```

**What happens:**
- Launches 10 parallel research agents
- Uses Perplexity, Claude WebSearch, Gemini
- Returns comprehensive report in < 1 minute

---

## Use Specialized Agents

### Engineer Agent
```bash
"Use the engineer agent to analyze this code and suggest improvements"
```

### Architect Agent
```bash
"Use the architect agent to create a PRD for a task management app"
```

### Researcher Agent
```bash
"Use the researcher agent to find information about AI safety"
```

---

## Invoke Skills

### Research Skill
```bash
"Do research on artificial general intelligence"
```

Auto-activates research skill → Parallel agents → Comprehensive report

### Fabric Skill
```bash
"Create a threat model for our authentication system"
```

Auto-selects pattern from 242+ Fabric patterns

### Alex Hormozi Pitch Skill
```bash
"Create an irresistible offer for my SaaS product"
```

Uses $100M Offers framework

---

## Test Hooks

### SessionStart Hook
```bash
# Start Claude Code
claude
# → Hook loads core context automatically
```

### Stop Hook
```bash
# Complete any task with 🎯 COMPLETED line
# → Hook triggers voice notification (if enabled)
# → Hook saves session summary
```

---

## Common Workflows

### Workflow 1: Research & Write

```bash
# 1. Research topic
/conduct-research "blockchain scalability solutions"

# 2. Create content
"Write a blog post about blockchain scalability using the research"
```

### Workflow 2: Development with Agents

```bash
# 1. Create PRD
"Use architect agent to create a PRD for user authentication system"

# 2. Implement
"Use engineer agent to implement the authentication system from the PRD"
```

---

## Tips & Tricks

### Tip 1: Use Response Format
Agents automatically format responses:
- 📋 SUMMARY
- 🔍 ANALYSIS
- ⚡ ACTIONS
- ✅ RESULTS
- 🎯 COMPLETED (triggers voice notification)

### Tip 2: Parallel Research
Research skill launches up to 10 agents simultaneously for 10x speed

### Tip 3: Context Loading
PAI skill loads automatically - provides identity, preferences, stack

### Tip 4: Scratchpad
Test things safely:
```bash
"Create a test script in ~/.claude/scratchpad/"
```

---

## Next Steps

1. **Read full docs:** [INSTALL.md](./INSTALL.md)
2. **Understand architecture:** [documentation/architecture.md](./documentation/architecture.md)
3. **Customize:** Edit `~/.claude/settings.json`
4. **Contribute:** [CONTRIBUTING.md](./CONTRIBUTING.md)

---

**Need Help?**
- Issues: https://github.com/evenromo/PAI-Boilerplate/issues
- Discussions: https://github.com/evenromo/PAI-Boilerplate/discussions
