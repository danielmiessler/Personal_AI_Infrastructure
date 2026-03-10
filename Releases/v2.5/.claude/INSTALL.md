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

   API keys are stored in `${PAI_DIR}/.env`. See `.env.example` for template.

---

## Installation Methods

### Method 1: Full Installation (Recommended)

The complete PAI experience with all skills, hooks, and infrastructure.

```bash
# Clone or download the PAI release
cd ~/.claude

# Run the installation wizard
bun run INSTALL.ts
```

The wizard will:
- Detect any existing PAI installations
- Ask for your name and preferences
- Configure API keys (ElevenLabs, etc.)
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
4. Run `bun run INSTALL.ts` later to customize your name and voice

---

## Configuration

### settings.json

The main configuration file. Required fields:

```json
{
  "paiVersion": "2.5",
  "principal": {
    "name": "Your Name",
    "timezone": "America/Los_Angeles"
  },
  "daidentity": {
    "name": "{DAIDENTITY.NAME}",
    "fullName": "{DAIDENTITY.NAME} - Personal AI",
    "voiceId": "your-elevenlabs-voice-id"
  }
}
```

**Note:** API keys go in `${PAI_DIR}/.env`, not in settings.json. See `.env.example` for the template.

### Optional Configuration

| Setting | Purpose | Default |
|---------|---------|---------|
| `techStack.runtime` | JavaScript runtime | `bun` |
| `techStack.browser` | Preferred browser | `arc` |
| `contextualNotifications` | Enable voice alerts | `true` |

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

The wizard handles migration automatically when it detects an existing installation.

---

## Verification

After installation, verify everything works:

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
│   ├── PAI/               # Core system skill
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
bun run INSTALL.ts
```

### "PAI skill not found"

Your installation may be incomplete. Re-run the wizard:
```bash
bun run INSTALL.ts
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
bun run INSTALL.ts
```

---

## Getting Help

- **In Claude Code**: Ask "Help me with PAI" or "/help"
- **Documentation**: See `skills/PAI/SKILL.md`
- **GitHub**: [github.com/danielmiessler/PAI](https://github.com/danielmiessler/PAI)

---

## What's Next?

After installation:

1. **Explore skills**: Ask Claude "What skills do I have?"
2. **Set up voice**: Configure ElevenLabs for voice responses
3. **Create personal skills**: Add `_YOURSKILL` directories for private workflows
4. **Learn the system**: Read `skills/PAI/SKILL.md` for full documentation

Welcome to PAI!
