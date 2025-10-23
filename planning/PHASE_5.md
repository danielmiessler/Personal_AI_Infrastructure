# Phase 5: Documentation

**Duration:** ~2-3 hours
**Priority:** High (Essential for distribution)
**Dependencies:** Phase 1-4 complete

---

## Objective

Create comprehensive, user-friendly documentation covering installation, usage, architecture, and contribution guidelines to enable both users and developers to work with the plugin effectively.

---

## Tasks

### Task 5.1: Create INSTALL.md

**File:** `pai-plugin/INSTALL.md`

**Target Audience:** New users installing the plugin
**Length:** ~800-1000 lines
**Sections:**

```markdown
# PAI-Boilerplate Plugin - Installation Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Installation (5 Minutes)](#quick-installation)
3. [Manual Installation](#manual-installation)
4. [Configuration](#configuration)
5. [Verification](#verification)
6. [Optional Features](#optional-features)
7. [Troubleshooting](#troubleshooting)
8. [Updating](#updating)
9. [Uninstallation](#uninstallation)

---

## Prerequisites

### Required
- **Claude Code** (v1.0+)
  - Install: https://claude.ai/code
  - Verify: `claude --version`

- **Bun** (v1.0+)
  - Install: `curl -fsSL https://bun.sh/install | bash`
  - Verify: `bun --version`

### Optional
- **Git** (for cloning repository)
- **Voice Server** (for voice notifications)
- **API Keys** (for MCP servers and research agents)

---

## Quick Installation (5 Minutes)

### Step 1: Add Plugin Marketplace

```bash
# Start Claude Code
claude

# In Claude Code, add the marketplace
/plugin marketplace add [your-marketplace-url]

# Browse available plugins
/plugin
```

### Step 2: Install Plugin

```bash
# Install PAI-Boilerplate plugin
/plugin install PAI-Boilerplate@[marketplace-name]

# Verify installation
/plugin
```

### Step 3: Run Setup Script

```bash
# Navigate to plugin directory
cd [plugin-installation-path]

# Run automated setup
./install.sh

# Or using Bun:
bun setup.ts
```

### Step 4: Configure API Keys (Optional)

```bash
# Edit MCP configuration
vim ~/.claude/.mcp.json

# Add your API keys for research agents:
# - PERPLEXITY_API_KEY (for perplexity-researcher)
# - GOOGLE_API_KEY (for gemini-researcher)
```

### Step 5: Test Installation

```bash
# Start Claude Code
claude

# Try a command
/conduct-research "latest AI developments"

# Use an agent
"Use the engineer agent to analyze this code"

# Invoke a skill
"Do research on quantum computing"
```

✅ **Installation complete! See [Quick Start](./QUICKSTART.md) for usage examples.**

---

## Manual Installation

### Step 1: Install Claude Code

```bash
# Visit https://claude.ai/code for installation instructions
# After installation, verify:
claude --version
```

### Step 2: Install Bun

```bash
curl -fsSL https://bun.sh/install | bash

# Add to PATH (if needed)
export PATH="$HOME/.bun/bin:$PATH"

# Verify
bun --version
```

### Step 3: Clone Plugin Repository

```bash
# Clone the repository
git clone https://github.com/[username]/PAI-Boilerplate.git
cd PAI-Boilerplate
```

### Step 4: Create Marketplace Structure

```bash
# Create marketplace directory
mkdir -p ~/claude-plugins
cd ~/claude-plugins

# Create marketplace.json
cat > .claude-plugin/marketplace.json <<'EOF'
{
  "name": "my-local-marketplace",
  "owner": { "name": "Your Name" },
  "plugins": [
    {
      "name": "PAI-Boilerplate",
      "source": "/path/to/PAI-Boilerplate",
      "description": "Personal AI Infrastructure"
    }
  ]
}
EOF
```

### Step 5: Add Marketplace to Claude Code

```bash
claude

# In Claude Code:
/plugin marketplace add ~/claude-plugins
/plugin install PAI-Boilerplate@my-local-marketplace
```

### Step 6: Copy Configuration Files

```bash
# Copy template files
cp PAI-Boilerplate/settings.example.json ~/.claude/settings.json
cp PAI-Boilerplate/.mcp.example.json ~/.claude/.mcp.json
cp PAI-Boilerplate/.env.example ~/.claude/.env

# Edit with your preferences
vim ~/.claude/settings.json
```

### Step 7: Update Configuration

Edit `~/.claude/settings.json`:

```json
{
  "env": {
    "DA": "Kai",  // Your assistant name
    "ENABLE_VOICE": "false",  // Voice notifications
    "PAI_DIR": "$HOME/.claude"
  }
}
```

Edit `~/.claude/.mcp.json`:

```json
{
  "mcpServers": {
    "brightdata": {
      "args": [...],
      "env": {
        "API_TOKEN": "[YOUR_BRIGHTDATA_TOKEN]"
      }
    }
  }
}
```

---

## Configuration

### Environment Variables

#### Required
```bash
DA="Kai"  # Your AI assistant name
PAI_DIR="$HOME/.claude"  # PAI directory
```

#### Optional
```bash
ENABLE_VOICE="false"  # Enable voice notifications
VOICE_SERVER_URL="http://localhost:8888"  # Voice server endpoint
VOICE_ENABLED_AGENTS="engineer,architect"  # Agents with voice

# API Keys for Research Agents
PERPLEXITY_API_KEY="your_key"  # Perplexity researcher
GOOGLE_API_KEY="your_key"  # Gemini researcher

# MCP Server Keys
API_TOKEN="your_token"  # BrightData
APIFY_TOKEN="your_token"  # Apify
```

### MCP Servers

#### Required for Full Functionality
- **BrightData**: Web scraping with CAPTCHA bypass
- **Playwright**: Browser automation

#### Optional Enhancements
- **httpx**: Server stack detection
- **naabu**: Port scanning
- **Stripe**: Payment processing
- **Apify**: Web automation
- **Ref**: Documentation search

### Voice Server Setup (Optional)

```bash
# Navigate to voice server directory
cd ~/.claude/voice-server

# Install dependencies
bun install

# Start server
bun server.ts &

# Test voice
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message":"Voice test","voice_enabled":true}'
```

---

## Verification

### Test Checklist

1. **Plugin Loaded**
   ```bash
   claude
   /plugin  # Should show PAI-Boilerplate as installed
   ```

2. **Commands Available**
   ```bash
   /help  # Should show new commands
   /conduct-research  # Should be available
   ```

3. **Agents Accessible**
   ```bash
   "Use the engineer agent"  # Should work
   ```

4. **Skills Active**
   ```bash
   "Do research on AI"  # Should trigger research skill
   ```

5. **Hooks Firing**
   - Start session → SessionStart hook loads context
   - Submit prompt → UserPromptSubmit hook updates tab
   - Complete task → Stop hook fires

6. **MCP Connections**
   - Check MCP server status
   - Test individual servers

---

## Optional Features

### 1. Voice Notifications

See [Voice Server Setup](#voice-server-setup-optional) above.

### 2. Research Agents

Requires API keys:
- Perplexity: https://www.perplexity.ai/settings/api
- Google (Gemini): https://aistudio.google.com/app/apikey

### 3. Web Scraping

Requires BrightData token:
- Sign up: https://brightdata.com
- Add token to `~/.claude/.mcp.json`

---

## Troubleshooting

### Plugin Not Loading

**Symptom:** `/plugin` doesn't show PAI-Boilerplate

**Solutions:**
1. Verify marketplace added: `/plugin marketplace list`
2. Check plugin installation: `/plugin`
3. Restart Claude Code
4. Check plugin.json syntax

### Hooks Not Firing

**Symptom:** SessionStart hook doesn't run

**Solutions:**
1. Check hooks.json exists: `ls ~/.claude/hooks/hooks.json`
2. Verify hook paths use `${CLAUDE_PLUGIN_ROOT}`
3. Check TypeScript files are executable
4. Review Claude Code debug logs: `claude --debug`

### Commands Not Available

**Symptom:** `/conduct-research` not found

**Solutions:**
1. Verify plugin installed correctly
2. Check commands/ directory exists
3. Restart Claude Code
4. Run `/help` to see available commands

### MCP Servers Not Connecting

**Symptom:** `mcp__brightdata__*` tools unavailable

**Solutions:**
1. Check .mcp.json syntax
2. Verify API keys are correct
3. Test MCP server manually
4. Check firewall/network settings

### Voice Notifications Not Working

**Symptom:** No voice after task completion

**Solutions:**
1. Check `ENABLE_VOICE="true"` in settings.json
2. Verify voice server is running: `curl http://localhost:8888/health`
3. Check voice server logs
4. Test voice endpoint manually

---

## Updating

### Update Plugin

```bash
# Navigate to plugin directory
cd [plugin-directory]

# Pull latest changes
git pull origin main

# Reinstall
/plugin uninstall PAI-Boilerplate@[marketplace]
/plugin install PAI-Boilerplate@[marketplace]

# Update configuration if needed
diff settings.example.json ~/.claude/settings.json
```

### Migration Notes

When updating between major versions, review:
- CHANGELOG.md for breaking changes
- settings.example.json for new configuration options
- .mcp.example.json for new MCP servers

---

## Uninstallation

### Option 1: Using Script

```bash
cd [plugin-directory]
./uninstall.sh
```

### Option 2: Manual Removal

```bash
# Backup configuration
cp -r ~/.claude ~/.claude.backup

# Remove plugin
/plugin uninstall PAI-Boilerplate@[marketplace]

# Remove configuration (optional)
rm ~/.claude/settings.json
rm ~/.claude/.mcp.json

# Keep: ~/.claude/scratchpad/ (your data)
```

---

## Next Steps

- [Quick Start Guide](./QUICKSTART.md) - Usage examples
- [Architecture](./documentation/architecture.md) - System design
- [Contributing](./CONTRIBUTING.md) - Developer guide

---

**Questions or Issues?**
- GitHub Issues: https://github.com/[username]/PAI-Boilerplate/issues
- Discussions: https://github.com/[username]/PAI-Boilerplate/discussions
```

---

### Task 5.2: Create QUICKSTART.md

**File:** `pai-plugin/QUICKSTART.md`

**Target Audience:** New users wanting to try features quickly
**Length:** ~200-300 lines

```markdown
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

#### Web Research
```bash
/web-research "best practices for API design"
```

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

## Explore MCP Tools

### BrightData (Web Scraping)
```bash
"Scrape the latest news from https://news.ycombinator.com"
```

### Playwright (Browser Automation)
```bash
"Take a screenshot of https://example.com"
```

---

## Common Workflows

### Workflow 1: Research & Write

```bash
# 1. Research topic
/conduct-research "blockchain scalability solutions"

# 2. Capture learnings
/capture-learning

# 3. Create content
"Write a blog post about blockchain scalability using the research"
```

### Workflow 2: Development with Agents

```bash
# 1. Create PRD
"Use architect agent to create a PRD for user authentication system"

# 2. Implement
"Use engineer agent to implement the authentication system from the PRD"

# 3. Review
"Use the code-reviewer agent to review the implementation"
```

### Workflow 3: Create Marketing Pitch

```bash
# 1. Research market
/conduct-research "customer pain points in project management"

# 2. Create offer
/create-hormozi-pitch

# 3. Refine
"Refine the pitch to emphasize time-saving benefits"
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
2. **Understand architecture:** [Architecture](./documentation/architecture.md)
3. **Customize:** Edit `~/.claude/settings.json`
4. **Contribute:** [CONTRIBUTING.md](./CONTRIBUTING.md)

---

**Need Help?**
- Issues: https://github.com/[username]/PAI-Boilerplate/issues
- Discussions: https://github.com/[username]/PAI-Boilerplate/discussions
```

---

### Task 5.3: Update ARCHITECTURE.md

**File:** `pai-plugin/documentation/architecture.md`

**Add new sections:**

```markdown
## Plugin Structure (v0.7.0)

### Directory Layout
```
PAI-Boilerplate/
├── .claude-plugin/
│   ├── plugin.json          # Plugin manifest
│   └── marketplace.json     # Marketplace config
├── agents/                  # 8 specialized agents
├── commands/                # 5 slash commands
├── skills/                  # 7 skill packages
├── hooks/
│   ├── hooks.json          # Hook registration
│   └── *.ts                # Hook implementations
├── templates/
│   └── context/            # Context templates
├── settings.example.json   # Settings template
├── .mcp.example.json       # MCP template
├── install.sh              # Installation script
├── INSTALL.md              # Installation guide
├── QUICKSTART.md           # Quick start guide
└── CONTRIBUTING.md         # Developer guide
```

### Plugin vs User Configuration

**Plugin Directory** (`${CLAUDE_PLUGIN_ROOT}`):
- agents/, commands/, skills/, hooks/
- Templates and examples
- Scripts and utilities
- Documentation

**User Directory** (`~/.claude/`):
- settings.json (from template)
- .mcp.json (from template)
- .env (from template)
- scratchpad/ (user data)
- context/ (user data)

### Variable Standards

- **${CLAUDE_PLUGIN_ROOT}**: Plugin installation directory (Claude Code standard)
- **${PAI_DIR}**: Legacy, replaced in v0.7.0
- **$HOME**: User home directory

### Distribution Model

1. **Development**: Local plugin directory
2. **Marketplace**: GitHub-based plugin marketplace
3. **Installation**: Automated via `/plugin install`
4. **Configuration**: Template-based with guided setup
```

---

### Task 5.4: Create CONTRIBUTING.md

**File:** `pai-plugin/CONTRIBUTING.md`

**Target Audience:** Developers wanting to extend the plugin
**Length:** ~400-500 lines

```markdown
# Contributing to PAI-Boilerplate

Thank you for your interest in contributing! This guide will help you add new features, fix bugs, and improve the plugin.

---

## Table of Contents
1. [Development Setup](#development-setup)
2. [Project Structure](#project-structure)
3. [Adding Components](#adding-components)
4. [Testing](#testing)
5. [Submitting Changes](#submitting-changes)
6. [Code Standards](#code-standards)

---

## Development Setup

### Prerequisites
- Claude Code installed
- Bun installed
- Git configured

### Setup Development Environment

```bash
# Fork and clone repository
git clone https://github.com/[your-username]/PAI-Boilerplate.git
cd PAI-Boilerplate

# Create feature branch
git checkout -b feature/your-feature-name

# Install as local plugin
claude
/plugin marketplace add /path/to/PAI-Boilerplate
/plugin install PAI-Boilerplate@local
```

---

## Project Structure

See [Architecture](./documentation/architecture.md) for detailed structure.

**Key Directories:**
- `agents/` - Specialized subagents
- `commands/` - Slash commands
- `skills/` - Intent-based capabilities
- `hooks/` - Event handlers
- `templates/` - Configuration templates

---

## Adding Components

### Adding a New Agent

1. **Create agent file:**
   ```bash
   touch agents/my-agent.md
   ```

2. **Add frontmatter:**
   ```yaml
   ---
   name: my-agent
   description: Use this agent when you need [specific capability]
   model: sonnet
   tools: Bash, Read, Write, Edit
   ---
   ```

3. **Write system prompt:**
   - Define agent role and expertise
   - Specify behavior and constraints
   - Include response format
   - Add examples

4. **Test:**
   ```bash
   "Use the my-agent agent to [task]"
   ```

### Adding a New Command

1. **Create command file:**
   ```bash
   touch commands/my-command.md
   ```

2. **Add frontmatter:**
   ```yaml
   ---
   description: Brief description of command
   globs: ""
   alwaysApply: false
   ---
   ```

3. **Write command content:**
   - Clear instructions
   - Step-by-step workflow
   - Examples
   - Expected outcomes

4. **Test:**
   ```bash
   /my-command [arguments]
   ```

### Adding a New Skill

1. **Create skill directory:**
   ```bash
   mkdir -p skills/my-skill
   touch skills/my-skill/SKILL.md
   ```

2. **Add frontmatter:**
   ```yaml
   ---
   name: my-skill
   description: USE WHEN user requests [specific intent]
   ---
   ```

3. **Write skill content:**
   - Intent triggers
   - Execution workflow
   - Supporting files reference
   - Examples

4. **Add supporting files (optional):**
   ```bash
   touch skills/my-skill/CLAUDE.md
   touch skills/my-skill/templates/example.md
   ```

5. **Test:**
   ```bash
   "Trigger phrase that matches intent"
   ```

### Adding a New Hook

1. **Create hook script:**
   ```bash
   touch hooks/my-hook.ts
   chmod +x hooks/my-hook.ts
   ```

2. **Register in hooks.json:**
   ```json
   {
     "SessionStart": [
       {
         "hooks": [
           {
             "type": "command",
             "command": "${CLAUDE_PLUGIN_ROOT}/hooks/my-hook.ts"
           }
         ]
       }
     ]
   }
   ```

3. **Implement hook:**
   ```typescript
   #!/usr/bin/env bun

   // Read input from stdin
   const input = await Bun.stdin.text();
   const data = JSON.parse(input);

   // Process hook event
   // ...

   // Output result (optional)
   console.log(JSON.stringify({ result: "success" }));
   ```

4. **Test:**
   - Trigger event that fires hook
   - Verify hook executes

---

## Testing

### Manual Testing Checklist

- [ ] Agent loads and responds correctly
- [ ] Command executes without errors
- [ ] Skill activates on intent match
- [ ] Hook fires on expected event
- [ ] No breaking changes to existing features
- [ ] Documentation updated

### Test with Fresh Install

```bash
# Remove existing installation
/plugin uninstall PAI-Boilerplate@local

# Reinstall
/plugin install PAI-Boilerplate@local

# Test your changes
```

---

## Submitting Changes

### Before Submitting

1. **Test thoroughly:**
   - All new features work
   - No regressions in existing features
   - Documentation is updated

2. **Follow code standards:**
   - Use `${CLAUDE_PLUGIN_ROOT}` for paths
   - Follow existing file naming conventions
   - Include proper frontmatter

3. **Update documentation:**
   - Add to CHANGELOG.md
   - Update relevant docs
   - Include usage examples

### Pull Request Process

1. **Create PR:**
   - Clear title describing change
   - Detailed description
   - Link related issues
   - Include testing notes

2. **PR Template:**
   ```markdown
   ## Description
   [Clear description of changes]

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Tested manually
   - [ ] Tested fresh install
   - [ ] No regressions

   ## Checklist
   - [ ] Follows code standards
   - [ ] Documentation updated
   - [ ] CHANGELOG.md updated
   ```

3. **Review Process:**
   - Address review comments
   - Make requested changes
   - Retest after changes

---

## Code Standards

### File Naming
- Agents: `kebab-case.md`
- Commands: `kebab-case.md`
- Skills: `kebab-case/SKILL.md`
- Hooks: `kebab-case.ts`

### Frontmatter Requirements
- All components must have valid YAML frontmatter
- Required fields must be present
- Use descriptive names and descriptions

### Path References
- ✅ Use: `${CLAUDE_PLUGIN_ROOT}`
- ❌ Avoid: Hardcoded paths, `${PAI_DIR}`

### Documentation
- Every component needs usage examples
- Complex features need detailed docs
- Update architecture docs for structural changes

---

## Questions?

- GitHub Issues: https://github.com/[username]/PAI-Boilerplate/issues
- Discussions: https://github.com/[username]/PAI-Boilerplate/discussions

---

**Thank you for contributing!** 🚀
```

---

## Verification Checklist

- [ ] INSTALL.md created (comprehensive installation guide)
- [ ] QUICKSTART.md created (5-minute getting started)
- [ ] ARCHITECTURE.md updated (plugin structure section)
- [ ] CONTRIBUTING.md created (developer guide)
- [ ] All documentation uses `${CLAUDE_PLUGIN_ROOT}`
- [ ] Examples are clear and tested
- [ ] Links between docs work correctly
- [ ] Markdown formatting is correct

---

## Files Created/Modified Summary

**Created (3 files):**
1. `pai-plugin/INSTALL.md` - Installation guide
2. `pai-plugin/QUICKSTART.md` - Quick start guide
3. `pai-plugin/CONTRIBUTING.md` - Developer guide

**Modified (1 file):**
1. `pai-plugin/documentation/architecture.md` - Plugin structure section

---

## Next Phase

Once Phase 5 is complete, proceed to:
→ [Phase 6: Testing & Validation](./PHASE_6.md)

This will create comprehensive testing procedures and validation.
