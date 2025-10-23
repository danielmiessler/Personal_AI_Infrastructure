# Plugins - Claude Code

## Overview

Claude Code's plugin system enables extensions through custom commands, agents, hooks, and MCP servers that can be shared across projects and teams.

## Quickstart

### Prerequisites
- Claude Code installed locally
- Basic command-line familiarity

### Create Your First Plugin

1. **Set up marketplace structure:**
```bash
mkdir test-marketplace
cd test-marketplace
mkdir my-first-plugin
cd my-first-plugin
```

2. **Create plugin manifest** (`.claude-plugin/plugin.json`):
Contains metadata like name, description, version, and author information.

3. **Add custom command** (`commands/hello.md`):
Create markdown files defining slash commands with descriptions and instructions.

4. **Create marketplace manifest** (`.claude-plugin/marketplace.json`):
Lists available plugins and their sources.

5. **Install and test:**
- Start Claude Code from parent directory
- Add marketplace: `/plugin marketplace add ./test-marketplace`
- Install plugin: `/plugin install my-first-plugin@test-marketplace`
- Try command: `/hello`

### Plugin Structure

Basic layout includes:
- `.claude-plugin/plugin.json` - Metadata
- `commands/` - Slash commands
- `agents/` - Custom agents
- `skills/` - Agent Skills
- `hooks/` - Event handlers

## Install and Manage Plugins

### Add Marketplaces
```bash
/plugin marketplace add your-org/claude-plugins
/plugin
```

### Installation Methods

**Interactive menu** (recommended for discovery):
- Run `/plugin`
- Select "Browse Plugins"

**Direct commands**:
```bash
/plugin install formatter@your-org
/plugin enable plugin-name@marketplace-name
/plugin disable plugin-name@marketplace-name
/plugin uninstall plugin-name@marketplace-name
```

### Verification
- Check `/help` for new commands
- Test plugin features
- Review details via `/plugin` → "Manage Plugins"

## Team Plugin Workflows

Configure plugins at repository level in `.claude/settings.json` for automatic installation when team members trust the folder.

## Develop Complex Plugins

### Add Skills
Create `skills/` directory with `SKILL.md` files for model-invoked capabilities.

### Organize Structure
Use functional subdirectories for plugins with multiple components.

### Test Locally

1. Set up development structure with marketplace and plugin directories
2. Create marketplace manifest
3. Add marketplace: `/plugin marketplace add ./dev-marketplace`
4. Install: `/plugin install my-plugin@dev-marketplace`
5. Test components individually
6. Iterate: Uninstall and reinstall after changes

### Debug Issues
- Verify directory structure (at plugin root, not in `.claude-plugin/`)
- Test each component separately
- Use validation tools

### Share Plugins
- Add README documentation
- Use semantic versioning
- Distribute through marketplaces
- Test with others before wider release

## Next Steps

**For users**: Discover plugins, adopt team plugins, explore combinations

**For developers**: Create marketplaces, build advanced components (commands, agents, Skills, hooks, MCP), establish distribution strategies

**For administrators**: Configure repository-level plugins, establish governance, maintain catalogs, train team members

## See Also
- Plugin marketplaces
- Slash commands
- Subagents
- Agent Skills
- Hooks
- MCP
- Settings
