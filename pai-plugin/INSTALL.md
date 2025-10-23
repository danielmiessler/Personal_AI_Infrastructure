# PAI-Boilerplate Plugin - Installation Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Installation (5 Minutes)](#quick-installation)
3. [Configuration](#configuration)
4. [Verification](#verification)
5. [Optional Features](#optional-features)
6. [Troubleshooting](#troubleshooting)
7. [Updating](#updating)
8. [Uninstallation](#uninstallation)

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

## Quick Installation

### Step 1: Install Plugin

**Option A: Via Plugin Marketplace (Recommended)**
```bash
# Start Claude Code
claude

# In Claude Code, add the marketplace
/plugin marketplace add https://github.com/evenromo/PAI-Boilerplate

# Install plugin
/plugin install PAI-Boilerplate
```

**Option B: Local Development**
```bash
# Clone repository
git clone https://github.com/evenromo/PAI-Boilerplate.git
cd PAI-Boilerplate

# Add as local plugin
claude
/plugin marketplace add /path/to/PAI-Boilerplate
/plugin install PAI-Boilerplate@local
```

### Step 2: Run Setup Script

```bash
# Navigate to plugin directory
cd pai-plugin

# Run automated setup
./install.sh

# Follow the interactive prompts:
# - Enter your AI assistant name
# - Choose voice notifications (y/n)
# - Configuration applied automatically
```

### Step 3: Verify Installation

```bash
# Validate installation
./scripts/validate-installation.sh

# Start Claude Code
claude

# Test plugin
/plugin  # Should show PAI-Boilerplate
/help    # Should show new commands
```

✅ **Installation complete! See [QUICKSTART.md](./QUICKSTART.md) for usage.**

---

## Configuration

### Environment Variables

Edit `~/.claude/settings.json`:

#### Required
```json
{
  "env": {
    "DA": "Kai"
  }
}
```

> **Note:** `CLAUDE_PLUGIN_ROOT` is automatically set by Claude Code and points to the plugin installation directory. You don't need to configure it manually.

#### Optional
```json
{
  "env": {
    "ENABLE_VOICE": "false",
    "VOICE_SERVER_URL": "http://localhost:8888",
    "VOICE_ENABLED_AGENTS": "engineer,architect",
    "PERPLEXITY_API_KEY": "your_key",
    "GOOGLE_API_KEY": "your_key"
  }
}
```

### MCP Servers

Edit `~/.claude/.mcp.json` with your API keys:

```json
{
  "mcpServers": {
    "brightdata": {
      "env": {
        "API_TOKEN": "[YOUR_BRIGHTDATA_TOKEN]"
      }
    },
    "apify": {
      "env": {
        "APIFY_TOKEN": "[YOUR_APIFY_TOKEN]"
      }
    }
  }
}
```

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
   /conduct-research "test"  # Should work
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

---

## Optional Features

### 1. Voice Notifications

See [Voice Server Setup](#voice-server-setup-optional) above.

### 2. Research Agents

Requires API keys:
- Perplexity: https://www.perplexity.ai/settings/api
- Google (Gemini): https://aistudio.google.com/app/apikey

Add to `~/.claude/settings.json`:
```json
{
  "env": {
    "PERPLEXITY_API_KEY": "your_key",
    "GOOGLE_API_KEY": "your_key"
  }
}
```

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
1. Check hooks.json exists in plugin
2. Verify hook paths use `${CLAUDE_PLUGIN_ROOT}`
3. Check TypeScript files are executable
4. Review Claude Code debug logs: `claude --debug`

### Commands Not Available

**Symptom:** `/conduct-research` not found

**Solutions:**
1. Verify plugin installed correctly
2. Check commands/ directory exists in plugin
3. Restart Claude Code
4. Run `/help` to see available commands

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

# Pull latest changes (if using git)
git pull origin main

# Reinstall
claude
/plugin uninstall PAI-Boilerplate
/plugin install PAI-Boilerplate

# Review changes
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
claude
/plugin uninstall PAI-Boilerplate

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
- GitHub Issues: https://github.com/evenromo/PAI-Boilerplate/issues
- Discussions: https://github.com/evenromo/PAI-Boilerplate/discussions
