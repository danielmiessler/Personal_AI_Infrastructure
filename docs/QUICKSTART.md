# PAI Quick Start Guide

**Get PAI running in 5 minutes**

---

## Prerequisites (1 minute)

### Install Bun

```bash
# Install Bun (PAI's package manager)
curl -fsSL https://bun.sh/install | bash

# Restart your terminal or source your profile
source ~/.bashrc  # or ~/.zshrc
```

### Install Claude Code

Follow the installation instructions at [code.claude.com](https://code.claude.com)

---

## Installation (2 minutes)

### 1. Clone PAI

```bash
git clone https://github.com/danielmiessler/Personal_AI_Infrastructure.git
cd Personal_AI_Infrastructure
```

### 2. Configure Environment

```bash
# Copy environment template
cp .claude/.env.example .claude/.env

# Edit with your API keys
nano .claude/.env  # or use your preferred editor

# Required: ANTHROPIC_API_KEY
# Optional: Add other API keys for specific skills
```

### 3. Install to Your System

**Option A: Copy (recommended for beginners)**
```bash
# Copy .claude directory to home
cp -r .claude ~/.claude
```

**Option B: Symlink (for development)**
```bash
# Symlink for live updates
ln -s $(pwd)/.claude ~/.claude
```

---

## First Run (1 minute)

### Start Claude Code

```bash
# PAI loads automatically
claude-code
```

The CORE skill loads at session start via the `SessionStart` hook.

### Try These Commands

```
"What skills are available?"
"Show me my stack preferences"
"What agents do I have access to?"
"Read the CONSTITUTION"
```

---

## Understanding PAI (1 minute)

### The Three Primitives

**1. Skills** (`.claude/skills/`)
- Self-contained AI capabilities
- Auto-activate based on your request
- Package routing, workflows, and documentation

**2. Agents** (`.claude/agents/`)
- Specialized AI personalities
- Engineer, researcher, designer, pentester, etc.
- Each has unique voice and capabilities

**3. Hooks** (`.claude/hooks/`)
- Event-driven automation
- Capture work, provide voice feedback, manage state
- Run automatically on session start/stop, tool use, etc.

### Where Everything Lives

```
~/.claude/
├── skills/
│   └── CORE/              # Main PAI documentation
│       ├── CONSTITUTION.md    # System philosophy & architecture
│       ├── SKILL.md           # Main skill file (loaded at startup)
│       └── *.md               # Reference documentation
├── agents/                # Agent configurations
├── hooks/                 # Event automation scripts
├── voice-server/          # Text-to-speech system
└── .env                   # Your API keys (never commit!)
```

---

## Next Steps

### Learn the System

1. **Read CONSTITUTION.md** - Understand PAI philosophy
   ```
   read ~/.claude/skills/CORE/CONSTITUTION.md
   ```

2. **Explore Skills** - See what's available
   ```
   ls ~/.claude/skills/
   ```

3. **Try Voice Feedback** - Start the voice server (optional)
   ```
   ~/.claude/voice-server/start.sh
   ```

### Create Your First Skill

```bash
# Use the create-skill skill
cd ~/.claude/skills/
mkdir my-first-skill
# See create-skill/ for templates
```

Follow the guide in `.claude/skills/CORE/SKILL-STRUCTURE-AND-ROUTING.md`

### Customize Your Setup

**Hooks** - Add custom automation:
- `.claude/hooks/` - Event-driven scripts

See `.claude/skills/CORE/SKILL.md` for complete configuration options.

---

## Troubleshooting

### PAI Not Loading

**Check hook configuration:**
```bash
# Verify SessionStart hook exists
cat ~/.claude/settings.json | grep SessionStart
```

**Manually load CORE skill:**
```
read ~/.claude/skills/CORE/SKILL.md
```

### Hooks Fail with "$HOME/.claude/..." Error

If you see errors like:
```
/bin/sh: $HOME/.claude/hooks/capture-all-events.ts: No such file or directory
```

**Solution:** PAI_DIR environment variable isn't being expanded. The hooks default to `~/.claude` automatically, so you don't need PAI_DIR at all.

If you previously set PAI_DIR and are having issues:
1. Remove `PAI_DIR` from `~/.claude/settings.json` env section
2. OR set it to an absolute path: `"PAI_DIR": "/Users/yourname/.claude"`

The hooks will automatically use `~/.claude` if PAI_DIR isn't set.

### Voice Server Not Working

```bash
# Check voice server status
~/.claude/voice-server/status.sh

# Restart if needed
~/.claude/voice-server/restart.sh

# Check logs
tail ~/.claude/voice-server/logs/voice-server.log
```

### API Keys Not Working

```bash
# Verify .env file exists
ls -la ~/.claude/.env

# Check format (no spaces around =)
# Correct: ANTHROPIC_API_KEY=sk-ant-...
# Wrong:   ANTHROPIC_API_KEY = sk-ant-...
```

---

## Common Tasks

### Update PAI

```bash
cd ~/Personal_AI_Infrastructure  # or wherever you cloned
git pull origin main

# Copy updates to your system
cp -r .claude/* ~/.claude/
```

### Add New Skills

```bash
# Clone or create in skills directory
cd ~/.claude/skills/
# Add your skill folder
```

Skills auto-activate based on their description triggers.

### Explore CORE Documentation

See `.claude/skills/CORE/` for complete system documentation and configuration guides.

---

## Resources

- **Full Documentation:** `.claude/skills/CORE/`
- **Video Overview:** [PAI Video](https://youtu.be/iKwRWwabkEc)
- **GitHub Issues:** [Report Problems](https://github.com/danielmiessler/Personal_AI_Infrastructure/issues)
- **Discussions:** [Ask Questions](https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions)

---

## Philosophy

PAI follows three principles:

1. **Command Line First** - Build CLI tools, wrap with AI
2. **Deterministic Code First** - Same input → Same output
3. **Prompts Wrap Code** - AI orchestrates, doesn't replace

**Start clean. Start small. Build out from there.**

---

**You're ready! Start exploring and building your personal AI infrastructure.**
