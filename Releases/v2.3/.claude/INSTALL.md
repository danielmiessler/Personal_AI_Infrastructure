# PAI Installation Guide

Welcome to PAI (Personal AI Infrastructure) - a framework for maximizing AI assistance across all domains of your life.

## Prerequisites

Before installing, ensure you have:

1. **Bun** - JavaScript/TypeScript runtime
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Claude Code** - Anthropic's CLI for Claude
   ```bash
   npm install -g @anthropic-ai/claude-code
   # or
   brew install claude-code
   ```

3. **API Keys** (optional but recommended)
   - **ElevenLabs** - For voice synthesis ([elevenlabs.io](https://elevenlabs.io))
   - **Anthropic** - Only needed if not using Claude Code subscription

   API keys are stored in `${PAI_DIR}/.env` (defaults to `~/.claude/.env`). You can either:
   - Run the wizard (`bun run install.ts`) to set keys interactively, or
   - Edit `.env` directly with your API keys

### Optional: Kitty Terminal (Recommended)

For the full PAI experience with dynamic tab states, install Kitty:

```bash
# Install Kitty terminal
brew install --cask kitty

# Install Hack Nerd Font (required for icons)
brew install --cask font-hack-nerd-font

# Copy PAI's Kitty configuration
mkdir -p ~/.config/kitty
cp ~/.claude/skills/CORE/USER/TERMINAL/kitty.conf ~/.config/kitty/

# Add PAI alias to your shell
cat ~/.claude/skills/CORE/USER/TERMINAL/ZSHRC >> ~/.zshrc
source ~/.zshrc
```

**What Kitty provides:**
- Dynamic tab colors showing AI state (thinking, working, complete)
- Tab titles showing current task summary
- Background image and Tokyo Night Storm theme
- Vim-style keyboard navigation
- Remote control for programmatic updates

See `~/.claude/skills/CORE/USER/TERMINAL/README.md` for full documentation.

---

## Installation Methods

### Method 1: Full Installation (Recommended)

The complete PAI experience with all skills, hooks, and infrastructure.

```bash
# Clone or download the PAI release
cd ~/.claude

# Run the installation wizard
bun run install.ts
```

The wizard will:
- Fix permissions automatically (chmod/chown)
- Ask for your name and preferences
- Start voice server and test it live
- Let you choose voice (male/female/neutral)
- Set up `pai` command alias
- Migrate personal content from backups
- Validate the installation

### Method 2: Pack Installation

Install specific capabilities as modular packs:

```bash
# List available packs
ls Packs/

# Read a pack to see what it does
cat Packs/pai-voice-system.md

# Follow pack instructions to install specific capabilities
```

### Method 3: Just Use It

PAI works out of the box:

1. Copy the `.claude/` directory to your home folder
2. Start Claude Code: `cd ~/.claude && claude`
3. It works immediately with default settings
4. Run `bun run install.ts` later to customize your name and voice

---

## Configuration

### settings.json

**PAI comes with a working settings.json** - no configuration needed to start.

The wizard (`bun run install.ts`) will help you customize:
- Your name (`principal.name`)
- AI voice (male/female/neutral)
- Timezone

Everything else is pre-configured:
- Full permissions (no "dangerously skip" prompts)
- All hooks enabled
- Default voice ID
- Security settings

### What's Pre-Configured

| Setting | Default | Purpose |
|---------|---------|---------|
| `principal.name` | "User" | Your name (customize via wizard) |
| `daidentity.voiceId` | Male voice | AI voice (change via wizard) |
| `permissions.allow` | All tools | No permission prompts needed |
| `permissions.ask` | Dangerous ops | Security for destructive commands |

---

## Migration from Existing Installation

If you have an existing `~/.claude/` or `~/.claude-BACKUP/`, the wizard will:

1. **Detect** your existing installation
2. **Scan** for transferable content:
   - settings.json (your identity, API keys)
   - USER/ content (personal customizations)
   - Personal skills (_ALLCAPS named)
   - Agent configurations
   - MEMORY/STATE (work in progress)
   - Plans (in-progress plans)

3. **Merge** intelligently:
   - Preserves your personal data
   - Updates system components
   - Handles conflicts gracefully

To force migration mode:
```bash
bun run install.ts --migrate
```

---

## Verification

After installation, verify everything works:

```bash
# Run validation checks
bun run install.ts --validate

# Expected output:
# ✓ settings.json: Valid
# ✓ CORE skill: Found
# ✓ Skills: 50+ found
# ✓ Hooks: 15 found
# ✓ Bun runtime: v1.x
# ✓ Claude Code: Installed
```

### Quick Test

Start Claude Code in your PAI directory:

```bash
cd ~/.claude
claude
```

Claude should greet you by name and display the PAI banner.

---

## Directory Structure

After installation, your `~/.claude/` will contain:

```
.claude/
├── settings.json          # Your configuration
├── .env                   # API keys (ELEVENLABS_API_KEY, etc.)
├── CLAUDE.md              # Entry point for Claude
├── skills/                # Skill modules
│   ├── CORE/              # Core system skill
│   │   ├── USER/          # Your personal content
│   │   └── SYSTEM/        # System documentation
│   └── [OtherSkills]/     # Additional skills
├── MEMORY/                # Session history & learnings
├── hooks/                 # Lifecycle event handlers
├── agents/                # Named agent configurations
├── Plans/                 # Plan mode working files
├── WORK/                  # Active work sessions
├── tools/                 # CLI utilities
└── bin/                   # Executable scripts
```

---

## Troubleshooting

### "settings.json not found"

Run the installation wizard:
```bash
bun run install.ts
```

### "CORE skill not found"

Your installation may be incomplete. Re-run:
```bash
bun run install.ts --fresh
```

### "Bun not installed"

Install Bun:
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # or ~/.zshrc
```

### Voice not working

1. Check ElevenLabs API key in `${PAI_DIR}/.env` (set `ELEVENLABS_API_KEY`)
2. Verify voice server is running: `curl http://localhost:8888/health`
3. Check voice ID is valid in `settings.json` (`daidentity.voiceId`)

### Migration didn't find my data

The wizard looks in these locations:
- `~/.claude-BACKUP/`
- `~/.claude-old/`

If your backup is elsewhere:
```bash
# Manually copy before running wizard
cp -r /path/to/your/backup ~/.claude-BACKUP
bun run install.ts --migrate
```

---

## Getting Help

- **In Claude Code**: Ask "Help me with PAI" or "/help"
- **Documentation**: See `skills/CORE/SKILL.md`
- **GitHub**: [github.com/danielmiessler/PAI](https://github.com/danielmiessler/PAI)

---

## What's Next?

After installation:

1. **Run**: `source ~/.zshrc` then use `pai` command from anywhere
2. **Explore skills**: Ask "What skills do I have?"
3. **Create personal skills**: Add `_YOURSKILL` directories for private workflows
4. **Learn the system**: Read `skills/CORE/SKILL.md` for full documentation

Welcome to PAI!
