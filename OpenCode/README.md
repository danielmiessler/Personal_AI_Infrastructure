# PAI for OpenCode

> **Personal AI Infrastructure adapted for OpenCode**

This directory contains OpenCode-specific installation scripts and adapters for running PAI with OpenCode instead of Claude Code.

---

## 🔄 Key Differences: Claude Code vs OpenCode

| Feature | Claude Code | OpenCode |
|---------|-------------|----------|
| **Config File** | `~/.claude/settings.json` | `~/.opencode.json` |
| **Data Storage** | Various directories | `.opencode/` (SQLite) |
| **Extension System** | Hook System (SessionStart, PreToolUse, PostToolUse) | MCP Servers (Model Context Protocol) |
| **Environment Vars** | Via `settings.json` | Via MCP server env config |
| **Platform** | macOS, Linux | macOS, Linux, **Windows** |

---

## 🚀 Quick Start

### Prerequisites

- **OpenCode** installed ([opencode.ai](https://opencode.ai))
- **Bun** runtime (for TypeScript scripts)
- **Windows PowerShell 5.1+** (Windows) or **Bash** (Linux/macOS)

### Installation

#### Windows (PowerShell)

```powershell
cd OpenCode
.\install.ps1
```

#### Linux/macOS (Bash)

```bash
cd OpenCode
chmod +x install.sh
./install.sh
```

The installer will:
1. Detect your platform (Windows/Linux/macOS)
2. Create OpenCode configuration
3. Set up PAI directory structure
4. Configure MCP servers
5. Generate starter templates

---

## 📦 What Gets Installed

### Directory Structure

```
~/.opencode/
├── pai/                    # PAI installation root
│   ├── skills/
│   │   └── CORE/
│   │       ├── SKILL.md
│   │       ├── Contacts.md
│   │       └── CoreStack.md
│   ├── history/            # Session history
│   ├── tools/              # CLI tools
│   └── .env                # Environment variables
│
~/.opencode.json            # OpenCode configuration
```

### Windows-Specific Paths

On Windows, paths use:
- `%USERPROFILE%\.opencode\`
- `%USERPROFILE%\.opencode.json`

---

## 🔌 MCP Server Adapters

Since OpenCode doesn't have hooks, PAI capabilities are provided through **MCP (Model Context Protocol) servers**:

| PAI Feature | Claude Code Implementation | OpenCode Implementation |
|-------------|---------------------------|------------------------|
| **Session Initialization** | `SessionStart` hook | Context files loaded via MCP |
| **Security Validation** | `PreToolUse` hook | Not applicable (OpenCode has built-in validation) |
| **History Tracking** | `PostToolUse` hook | MCP server with SQLite integration |
| **Voice Notifications** | Custom server + hooks | MCP server wrapper |

### Available MCP Servers

#### 1. PAI Context Server

Loads your CORE skill, contacts, and stack preferences automatically.

**Configuration in `.opencode.json`:**
```json
{
  "mcpServers": {
    "pai-context": {
      "command": "bun",
      "args": ["run", "${HOME}/.opencode/pai/mcp-servers/context-server.ts"],
      "env": {
        "PAI_DIR": "${HOME}/.opencode/pai"
      }
    }
  }
}
```

#### 2. PAI History Server (Optional)

Tracks conversation history and learnings.

```json
{
  "mcpServers": {
    "pai-history": {
      "command": "bun",
      "args": ["run", "${HOME}/.opencode/pai/mcp-servers/history-server.ts"],
      "env": {
        "PAI_DIR": "${HOME}/.opencode/pai"
      }
    }
  }
}
```

---

## ⚠️ Limitations vs Claude Code

### What Works
- ✅ CORE skill system (identity, contacts, stack preferences)
- ✅ Custom prompts and workflows
- ✅ CLI tools and scripts
- ✅ Cross-platform (Windows, Linux, macOS)
- ✅ Environment variable management

### What's Different
- 🔄 **No hook system** - OpenCode uses MCP servers instead
- 🔄 **No PreToolUse validation** - OpenCode has built-in security
- 🔄 **History tracking** - Different implementation using OpenCode's SQLite DB
- 🔄 **Voice notifications** - Requires separate MCP server

### What Requires Adaptation
- ⚙️ **Observability Server** - Needs rewrite for OpenCode's conversation API
- ⚙️ **Complex multi-hook workflows** - Must be restructured as MCP servers
- ⚙️ **Real-time monitoring** - Different approach needed

---

## 🛠️ Customization

### Editing Your Configuration

**OpenCode config:**
```bash
# Windows
notepad %USERPROFILE%\.opencode.json

# Linux/macOS
nano ~/.opencode.json
```

**PAI environment:**
```bash
# Windows
notepad %USERPROFILE%\.opencode\pai\.env

# Linux/macOS
nano ~/.opencode/pai/.env
```

### Adding Custom MCP Servers

1. Create your server in `~/.opencode/pai/mcp-servers/`
2. Add to `.opencode.json`:

```json
{
  "mcpServers": {
    "my-custom-server": {
      "command": "bun",
      "args": ["run", "${HOME}/.opencode/pai/mcp-servers/my-server.ts"],
      "env": {
        "PAI_DIR": "${HOME}/.opencode/pai",
        "CUSTOM_VAR": "value"
      }
    }
  }
}
```

---

## 🪟 Windows Support

PAI for OpenCode includes first-class Windows support:

- ✅ PowerShell installation wizard
- ✅ Windows path resolution (`%USERPROFILE%`)
- ✅ Cross-platform TypeScript tools
- ✅ Windows-compatible MCP servers

### Windows-Specific Notes

1. **Use PowerShell, not CMD** - The installer requires PowerShell 5.1+
2. **Execution Policy** - You may need to allow script execution:
   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
   ```
3. **Bun on Windows** - Ensure Bun is installed and in PATH

---

## 🔗 Migration from Claude Code

If you have an existing PAI installation for Claude Code:

1. **Your data is safe** - The installer creates a separate directory
2. **Skills transfer easily** - Copy `~/.claude/skills/` to `~/.opencode/pai/skills/`
3. **Hooks need conversion** - Use the MCP server templates provided
4. **Environment variables** - Copy `.env` file and add to MCP server configs

**Migration helper:**
```bash
# Backup Claude Code config
cp -r ~/.claude ~/.claude-backup

# Copy skills to OpenCode
cp -r ~/.claude/skills ~/.opencode/pai/skills

# Copy environment
cp ~/.claude/.env ~/.opencode/pai/.env
```

---

## 📚 Documentation

- [OpenCode Documentation](https://opencode.ai/docs/)
- [MCP Protocol Specification](https://opencode.ai/docs/agents/)
- [PAI Main README](../README.md)
- [PAI Pack System](../PACKS.md)

---

## 🆘 Troubleshooting

### OpenCode not finding config

**Issue:** OpenCode doesn't load `.opencode.json`

**Solution:** Check file location order:
1. Current directory: `./.opencode.json`
2. XDG config: `$XDG_CONFIG_HOME/opencode/.opencode.json`
3. Home directory: `~/.opencode.json` (recommended)

### MCP server not starting

**Issue:** Server fails to start or crashes

**Debug:**
```bash
# Test server manually
bun run ~/.opencode/pai/mcp-servers/context-server.ts

# Check OpenCode logs
cat ~/.opencode/logs/latest.log
```

### Windows path issues

**Issue:** Paths not resolving correctly

**Fix:** Ensure you use Windows-style paths in `.opencode.json`:
```json
{
  "data": {
    "directory": "%USERPROFILE%\\.opencode"
  }
}
```

---

## 🤝 Contributing

This OpenCode adapter is experimental. Contributions welcome:

- 🐛 Report bugs specific to OpenCode integration
- 💡 Suggest MCP server improvements
- 📝 Improve Windows compatibility
- 🧪 Test on different platforms

---

## 📜 License

MIT License - same as PAI

---

**Built for the OpenCode community**

*Making PAI work everywhere, on every platform.*
