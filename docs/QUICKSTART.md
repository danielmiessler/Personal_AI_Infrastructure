# PAI Quick Start Guide

**Get PAI running in 5 minutes**

---

## Installation

Choose your platform:

<details>
<summary><strong>macOS</strong></summary>

### 1. Clone PAI

```bash
git clone https://github.com/danielmiessler/PAI.git ~/.claude
```

### 2. Run the Setup Wizard

```bash
~/.claude/.claude/tools/setup/bootstrap.sh
```

The bootstrap script handles everything:
- **Shell check** — Recommends zsh or bash if you're using something else
- **Bun install** — Offers to install Bun if not found (PAI's package manager)
- **Claude Code check** — Reminds you to install Claude Code if missing
- **Setup wizard** — Launches the interactive configuration

### 3. Add Your API Keys

```bash
# Copy environment template
cp ~/.claude/.env.example ~/.claude/.env

# Edit with your API keys
nano ~/.claude/.env

# Required: ANTHROPIC_API_KEY
# Optional: ELEVENLABS_API_KEY for voice
```

### 4. Reload Your Shell

```bash
source ~/.zshrc
```

</details>

<details>
<summary><strong>Linux</strong></summary>

### 1. Clone PAI

```bash
git clone https://github.com/danielmiessler/PAI.git ~/.claude
```

### 2. Run the Setup Wizard

```bash
~/.claude/.claude/tools/setup/bootstrap.sh
```

The bootstrap script handles everything:
- **Shell check** — Recommends zsh or bash if you're using something else
- **Bun install** — Offers to install Bun if not found (PAI's package manager)
- **Claude Code check** — Reminds you to install Claude Code if missing
- **Setup wizard** — Launches the interactive configuration

### 3. Add Your API Keys

```bash
# Copy environment template
cp ~/.claude/.env.example ~/.claude/.env

# Edit with your API keys
nano ~/.claude/.env

# Required: ANTHROPIC_API_KEY
# Optional: ELEVENLABS_API_KEY for voice
```

### 4. Reload Your Shell

```bash
source ~/.bashrc  # or ~/.zshrc if using zsh
```

</details>

<details>
<summary><strong>Windows</strong></summary>

### 1. Clone PAI

```powershell
git clone https://github.com/danielmiessler/PAI.git $env:USERPROFILE\.claude
```

### 2. Run the Setup Wizard

```powershell
& "$env:USERPROFILE\.claude\.claude\tools\setup\bootstrap.ps1"
```

The bootstrap script handles everything:
- **Bun install** — Offers to install Bun if not found (PAI's package manager)
- **Claude Code check** — Reminds you to install Claude Code if missing
- **Setup wizard** — Launches the interactive configuration

### 3. Add Your API Keys

```powershell
# Copy environment template
Copy-Item "$env:USERPROFILE\.claude\.env.example" "$env:USERPROFILE\.claude\.env"

# Edit with your API keys (use your preferred editor)
notepad "$env:USERPROFILE\.claude\.env"

# Required: ANTHROPIC_API_KEY
# Optional: ELEVENLABS_API_KEY for voice
```

### 4. Reload Your Shell

Close and reopen PowerShell, or run:

```powershell
. $PROFILE
```

</details>

---

## Setup Wizard Options

The interactive wizard configures:

| Option | Description | Default |
|--------|-------------|---------|
| **PAI Directory** | Where to install | `~/.claude` |
| **Your Name** | Auto-detected from git config | — |
| **Your Email** | Auto-detected from git config | — |
| **Assistant Name** | Name your AI | `Assistant` |
| **Color Theme** | blue, purple, green, cyan, red | `blue` |
| **Voice Server** | Text-to-speech (macOS only) | Enabled |
| **Shell Profile** | Add environment variables | Yes |

### Non-Interactive Mode

For automation or scripting:

**macOS/Linux:**
```bash
cd ~/.claude/.claude/tools/setup
bun run setup.ts \
  --pai-dir ~/.claude \
  --name "Your Name" \
  --email you@example.com \
  --assistant-name "Nova" \
  --force
```

**Windows:**
```powershell
cd "$env:USERPROFILE\.claude\.claude\tools\setup"
bun run setup.ts `
  --pai-dir "$env:USERPROFILE\.claude" `
  --name "Your Name" `
  --email you@example.com `
  --assistant-name "Nova" `
  --force
```

### Dry Run

Preview changes without applying them:

```bash
bun run setup.ts --dry-run
```

---

## First Run

### Start Claude Code

```bash
claude
```

PAI loads automatically via the `SessionStart` hook.

### Try These Commands

```
"What skills are available?"
"Show me my stack preferences"
"What agents do I have access to?"
"Read the CONSTITUTION"
```

---

## Understanding PAI

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
│   └── CORE/                 # Main PAI documentation
│       ├── CONSTITUTION.md   # System philosophy & architecture
│       ├── SKILL.md          # Main skill file (loaded at startup)
│       └── *.md              # Reference documentation
├── agents/                   # Agent configurations
├── hooks/                    # Event automation scripts
├── voice-server/             # Text-to-speech system (macOS)
└── .env                      # Your API keys (never commit!)
```

---

## Troubleshooting

<details>
<summary><strong>PAI Not Loading</strong></summary>

**Check hook configuration:**
```bash
cat ~/.claude/settings.json | grep SessionStart
```

**Manually load CORE skill:**
```
read ~/.claude/skills/CORE/SKILL.md
```

</details>

<details>
<summary><strong>Hooks Not Running</strong></summary>

Hooks require Bun to be installed and in your PATH.

**macOS/Linux:**
```bash
which bun
# Should show: ~/.bun/bin/bun or /opt/homebrew/bin/bun
```

**Windows:**
```powershell
Get-Command bun
# Should show the bun executable path
```

If Bun isn't found, reinstall it and restart your terminal.

</details>

<details>
<summary><strong>Hook Errors Mentioning "__HOME__"</strong></summary>

If you see errors like `No such file or directory: __HOME__/.claude/...`, the `PAI_DIR` variable wasn't configured correctly.

**Fix: Re-run the setup script**
```bash
bash ~/.claude/.claude/setup.sh
```

This automatically configures `PAI_DIR` with your actual home directory path.

**Manual fix (if setup script doesn't work):**
```bash
# Edit settings.json
nano ~/.claude/settings.json

# Find this line:
"PAI_DIR": "__HOME__/.claude"

# Replace with your actual path (examples):
# macOS: "PAI_DIR": "/Users/yourusername/.claude"
# Linux: "PAI_DIR": "/home/yourusername/.claude"
```

</details>

<details>
<summary><strong>Voice Server Not Working (macOS only)</strong></summary>

```bash
# Check voice server status
~/.claude/voice-server/status.sh

# Restart if needed
~/.claude/voice-server/restart.sh

# Check logs
tail ~/.claude/voice-server/logs/voice-server.log
```

</details>

<details>
<summary><strong>API Keys Not Working</strong></summary>

```bash
# Verify .env file exists
ls -la ~/.claude/.env

# Check format (no spaces around =)
# Correct: ANTHROPIC_API_KEY=sk-ant-...
# Wrong:   ANTHROPIC_API_KEY = sk-ant-...
```

</details>

---

## Next Steps

1. **Read CONSTITUTION.md** — Understand PAI philosophy
2. **Explore Skills** — See what's available in `~/.claude/skills/`
3. **Try Voice Feedback** — Start the voice server (macOS)
4. **Create Your First Skill** — Follow the skill structure guide

---

## Resources

- **Full Documentation:** `~/.claude/skills/CORE/`
- **Video Overview:** [PAI Video](https://youtu.be/iKwRWwabkEc)
- **GitHub Issues:** [Report Problems](https://github.com/danielmiessler/PAI/issues)
- **Discussions:** [Ask Questions](https://github.com/danielmiessler/PAI/discussions)

---

## Philosophy

PAI follows three principles:

1. **Command Line First** — Build CLI tools, wrap with AI
2. **Deterministic Code First** — Same input → Same output
3. **Prompts Wrap Code** — AI orchestrates, doesn't replace

**Start clean. Start small. Build out from there.**
