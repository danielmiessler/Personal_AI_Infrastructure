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
├── scripts/                 # Utility scripts
├── settings.example.json   # Settings template
├── .mcp.example.json       # MCP template
├── install.sh              # Installation script
└── INSTALL.md              # Installation guide
```

---

## Adding Components

### Adding a New Agent

1. **Create agent file:**
   ```bash
   touch pai-plugin/agents/my-agent.md
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
   touch pai-plugin/commands/my-command.md
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
   mkdir -p pai-plugin/skills/my-skill
   touch pai-plugin/skills/my-skill/SKILL.md
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

4. **Test:**
   ```bash
   "Trigger phrase that matches intent"
   ```

### Adding a New Hook

1. **Create hook script:**
   ```bash
   touch pai-plugin/hooks/my-hook.ts
   chmod +x pai-plugin/hooks/my-hook.ts
   ```

2. **Register in hooks.json:**
   ```json
   {
     "hooks": {
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
   }
   ```

   > **Note:** All hook registrations must be wrapped in a top-level `"hooks"` object. See `hooks/hooks.json` for complete schema.

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

   // Force exit to prevent hanging on open handles (recommended for Stop hooks)
   process.exit(0);
   ```

   > **Important:** For Stop and SessionEnd hooks, add `process.exit(0)` at the end to prevent the hook from hanging due to open handles (e.g., HTTP connections, timers).

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

- GitHub Issues: https://github.com/evenromo/PAI-Boilerplate/issues
- Discussions: https://github.com/evenromo/PAI-Boilerplate/discussions

---

**Thank you for contributing!** 🚀
