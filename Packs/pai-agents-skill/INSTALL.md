# PAI Agents Skill v1.0.0 - Installation Guide

**This guide is designed for AI agents installing this pack into a user's infrastructure.**

---

## AI Agent Instructions

**This is a wizard-style installation.** Use Claude Code's native tools to guide the user through installation:

1. **AskUserQuestion** - For user decisions and confirmations
2. **TodoWrite** - For progress tracking
3. **Bash/Read/Write** - For actual installation
4. **VERIFY.md** - For final validation

### Welcome Message

Before starting, greet the user:
```
"I'm installing PAI Agents Skill v1.0.0 - Dynamic agent composition and personality system.

Let me analyze your system and guide you through installation."
```

---

## Phase 1: System Analysis

**Execute this analysis BEFORE any file operations.**

### 1.1 Run These Commands

```bash
# Check for PAI directory
PAI_CHECK="${PAI_DIR:-$HOME/.claude}"
echo "PAI_DIR: $PAI_CHECK"

# Check if pai-core-install is installed (REQUIRED)
if [ -f "$PAI_CHECK/skills/CORE/SKILL.md" ]; then
  echo "✓ pai-core-install is installed"
else
  echo "❌ pai-core-install NOT installed - REQUIRED!"
fi

# Check for existing Agents skill
if [ -d "$PAI_CHECK/skills/Agents" ]; then
  echo "⚠️  Existing Agents skill found at: $PAI_CHECK/skills/Agents"
  ls -la "$PAI_CHECK/skills/Agents/"
else
  echo "✓ No existing Agents skill (clean install)"
fi

# Check for Bun runtime
if command -v bun &> /dev/null; then
  echo "✓ Bun is installed: $(bun --version)"
else
  echo "❌ Bun not installed - REQUIRED!"
fi

# Check for pai-voice-system (optional)
if [ -d "$PAI_CHECK/VoiceServer" ]; then
  echo "✓ pai-voice-system is installed (voice features available)"
else
  echo "⚠️  pai-voice-system not installed (voice features unavailable)"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- Existing Agents skill: [Yes at path / No]
- Bun runtime: [installed vX.X / NOT INSTALLED - REQUIRED]
- pai-voice-system: [installed / not installed (optional)]"
```

**STOP if pai-core-install or Bun is not installed.** Tell the user:
```
"pai-core-install and Bun are required. Please install them first, then return to install this pack."
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing found)

**Only ask if existing Agents skill detected:**

```json
{
  "header": "Conflict",
  "question": "Existing Agents skill detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and Replace (Recommended)", "description": "Creates timestamped backup, then installs new version"},
    {"label": "Replace Without Backup", "description": "Overwrites existing without backup"},
    {"label": "Abort Installation", "description": "Cancel installation, keep existing"}
  ]
}
```

### Question 2: Voice Integration

**Only ask if pai-voice-system is installed:**

```json
{
  "header": "Voice",
  "question": "Configure voice personalities for agents?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, set up voices (Recommended)", "description": "Creates voice ID mappings in Traits.yaml"},
    {"label": "Skip for now", "description": "You can configure voice IDs later manually"}
  ]
}
```

### Question 3: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI Agents Skill v1.0.0?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, install now (Recommended)", "description": "Proceeds with installation using choices above"},
    {"label": "Show me what will change", "description": "Lists all files that will be created/modified"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

---

## Phase 3: Backup (If Needed)

**Only execute if user chose "Backup and Replace":**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
BACKUP_DIR="$PAI_DIR/Backups/agents-skill-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
[ -d "$PAI_DIR/skills/Agents" ] && cp -r "$PAI_DIR/skills/Agents" "$BACKUP_DIR/"
echo "Backup created at: $BACKUP_DIR"
```

---

## Phase 4: Installation

**Create a TodoWrite list to track progress:**

```json
{
  "todos": [
    {"content": "Create skill directory structure", "status": "pending", "activeForm": "Creating directory structure"},
    {"content": "Copy skill files from pack", "status": "pending", "activeForm": "Copying skill files"},
    {"content": "Install dependencies", "status": "pending", "activeForm": "Installing dependencies"},
    {"content": "Configure voice IDs", "status": "pending", "activeForm": "Configuring voice IDs"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Skill Directory Structure

**Mark todo "Create skill directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/skills/Agents/Data"
mkdir -p "$PAI_DIR/skills/Agents/Tools"
mkdir -p "$PAI_DIR/skills/Agents/Templates"
mkdir -p "$PAI_DIR/skills/Agents/Workflows"
mkdir -p "$PAI_DIR/skills/Agents/Contexts"
```

**Mark todo as completed.**

### 4.2 Copy Skill Files

**Mark todo "Copy skill files from pack" as in_progress.**

Copy all files from the pack's `src/skills/Agents/` directory:

```bash
# From the pack directory (where this INSTALL.md is located)
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/Agents/SKILL.md" "$PAI_DIR/skills/Agents/"
cp "$PACK_DIR/src/skills/Agents/AgentPersonalities.md" "$PAI_DIR/skills/Agents/"
cp "$PACK_DIR/src/skills/Agents/Data/Traits.yaml" "$PAI_DIR/skills/Agents/Data/"
cp "$PACK_DIR/src/skills/Agents/Tools/AgentFactory.ts" "$PAI_DIR/skills/Agents/Tools/"
cp "$PACK_DIR/src/skills/Agents/Templates/DynamicAgent.hbs" "$PAI_DIR/skills/Agents/Templates/"
cp "$PACK_DIR/src/skills/Agents/Workflows/"*.md "$PAI_DIR/skills/Agents/Workflows/"
```

**Files copied:**
- `SKILL.md` - Main skill routing
- `AgentPersonalities.md` - 10+ pre-built agent personalities
- `Data/Traits.yaml` - 30+ composable traits
- `Tools/AgentFactory.ts` - Agent composition CLI
- `Templates/DynamicAgent.hbs` - Agent prompt template
- `Workflows/*.md` - CreateCustomAgent, ListTraits workflows

**Mark todo as completed.**

### 4.3 Install Dependencies

**Mark todo "Install dependencies" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
cd "$PAI_DIR/skills/Agents/Tools"
bun add yaml handlebars
```

**Mark todo as completed.**

### 4.4 Configure Voice IDs (If User Chose Yes)

**Mark todo "Configure voice IDs" as in_progress.**

**Only execute if user chose to set up voices:**

The `Traits.yaml` file contains placeholder voice IDs. If the user has pai-voice-system installed, help them configure their ElevenLabs voice IDs.

Tell the user:
```
"To enable voice for agents, you'll need to edit the voice mappings in Traits.yaml.
Each agent trait can have a voice ID from your TTS provider (e.g., ElevenLabs).

The file is at: $PAI_DIR/skills/Agents/Data/Traits.yaml
Look for 'voice:' entries and replace 'YOUR_*_VOICE_ID' with actual IDs."
```

**Mark todo as completed (or skip if user declined).**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI Agents Skill Verification ==="

# Check skill files exist
echo "Checking skill files..."
[ -f "$PAI_DIR/skills/Agents/SKILL.md" ] && echo "✓ SKILL.md" || echo "❌ SKILL.md missing"
[ -f "$PAI_DIR/skills/Agents/Data/Traits.yaml" ] && echo "✓ Traits.yaml" || echo "❌ Traits.yaml missing"
[ -f "$PAI_DIR/skills/Agents/Tools/AgentFactory.ts" ] && echo "✓ AgentFactory.ts" || echo "❌ AgentFactory.ts missing"
[ -f "$PAI_DIR/skills/Agents/Templates/DynamicAgent.hbs" ] && echo "✓ DynamicAgent.hbs" || echo "❌ DynamicAgent.hbs missing"

# Test AgentFactory
echo ""
echo "Testing AgentFactory..."
bun run "$PAI_DIR/skills/Agents/Tools/AgentFactory.ts" --list | head -20

# Test trait composition
echo ""
echo "Testing trait composition..."
bun run "$PAI_DIR/skills/Agents/Tools/AgentFactory.ts" \
  --traits "security,skeptical,thorough" \
  --output summary

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Success/Failure Messages

### On Success

```
"PAI Agents Skill v1.0.0 installed successfully!

What's available:
- 'create custom agents' - Compose agents from 30+ traits
- 'spin up agents' / 'interns' - Launch parallel agents
- 'list traits' - See all available personality traits
- 'show agent personalities' - Pre-built agent configurations

Try it: Ask me to 'create a skeptical security researcher agent'"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Verify Bun is installed: `bun --version`
3. Check directory permissions on $PAI_DIR/skills/
4. Run the verification commands in VERIFY.md

Need help? Check the Troubleshooting section below."
```

---

## Troubleshooting

### "pai-core-install not found"

This pack requires pai-core-install. Install it first:
```
Give the AI the pai-core-install pack directory and ask it to install.
```

### "bun: command not found"

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash
# Restart terminal or source ~/.bashrc
```

### "AgentFactory.ts fails to run"

```bash
# Check dependencies are installed
cd $PAI_DIR/skills/Agents/Tools
bun install

# Or reinstall
bun add yaml handlebars
```

### Traits.yaml parsing errors

```bash
# Validate YAML syntax
bun -e "const yaml = require('yaml'); yaml.parse(require('fs').readFileSync('$PAI_DIR/skills/Agents/Data/Traits.yaml', 'utf8'))"
```

---

## What's Included

| File | Purpose |
|------|---------|
| `SKILL.md` | Main skill definition with workflow routing |
| `AgentPersonalities.md` | 10+ pre-built agent personalities |
| `Data/Traits.yaml` | 30+ composable personality traits |
| `Tools/AgentFactory.ts` | CLI for composing agents from traits |
| `Templates/DynamicAgent.hbs` | Handlebars template for agent prompts |
| `Workflows/CreateCustomAgent.md` | Agent creation workflow |
| `Workflows/ListTraits.md` | Trait listing workflow |

---

## Usage

### From Claude Code

```
"Create a skeptical security researcher agent"
"Spin up 3 interns to research these companies"
"List available agent traits"
"Show me the agent personalities"
```

### CLI Examples

```bash
# List all traits
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts --list

# Create agent from traits
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --traits "security,skeptical,thorough" \
  --output full

# Show specific trait details
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --trait security \
  --output details
```
