# PAI Upgrades Skill v1.0.0 - Installation Guide

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
"I'm installing PAI Upgrades Skill v1.0.0 - Monitor Anthropic ecosystem and AI YouTube channels for updates.

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

# Check for existing Upgrades skill
if [ -d "$PAI_CHECK/skills/Upgrades" ]; then
  echo "⚠️  Existing Upgrades skill found at: $PAI_CHECK/skills/Upgrades"
  ls -la "$PAI_CHECK/skills/Upgrades/"
else
  echo "✓ No existing Upgrades skill (clean install)"
fi

# Check for yt-dlp (optional)
if command -v yt-dlp &> /dev/null; then
  echo "✓ yt-dlp is installed: $(yt-dlp --version)"
else
  echo "⚠️  yt-dlp not installed (optional - needed for YouTube monitoring)"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- Existing Upgrades skill: [Yes at path / No]
- yt-dlp: [installed vX.X / NOT INSTALLED (optional)]"
```

**STOP if pai-core-install is not installed.** Tell the user:
```
"pai-core-install is required. Please install it first, then return to install this pack."
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: yt-dlp Installation (if missing)

**Only ask if yt-dlp is NOT installed:**

```json
{
  "header": "yt-dlp",
  "question": "yt-dlp is not installed. It's needed for YouTube channel monitoring. Should I install it?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, install yt-dlp (Recommended)", "description": "Installs via Homebrew for YouTube video detection"},
    {"label": "Skip - I'll install manually", "description": "YouTube monitoring won't work until you install it"}
  ]
}
```

### Question 2: Conflict Resolution (if existing found)

**Only ask if existing Upgrades skill detected:**

```json
{
  "header": "Conflict",
  "question": "Existing Upgrades skill detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and Replace (Recommended)", "description": "Creates timestamped backup, then installs new version"},
    {"label": "Replace Without Backup", "description": "Overwrites existing without backup"},
    {"label": "Abort Installation", "description": "Cancel installation, keep existing"}
  ]
}
```

### Question 3: YouTube Channels

```json
{
  "header": "Channels",
  "question": "Would you like to configure YouTube channels for AI development content?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, set up channels (Recommended)", "description": "Creates customization file with example channel"},
    {"label": "Skip for now", "description": "You can add channels later via SKILLCUSTOMIZATIONS"}
  ]
}
```

### Question 4: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI Upgrades Skill v1.0.0?",
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
BACKUP_DIR="$PAI_DIR/Backups/upgrades-skill-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
[ -d "$PAI_DIR/skills/Upgrades" ] && cp -r "$PAI_DIR/skills/Upgrades" "$BACKUP_DIR/"
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
    {"content": "Initialize state files", "status": "pending", "activeForm": "Initializing state files"},
    {"content": "Set up YouTube customization", "status": "pending", "activeForm": "Setting up YouTube customization"},
    {"content": "Install yt-dlp", "status": "pending", "activeForm": "Installing yt-dlp"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Skill Directory Structure

**Mark todo "Create skill directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p $PAI_DIR/skills/Upgrades/{Workflows,Tools,State}
mkdir -p $PAI_DIR/SKILLCUSTOMIZATIONS/Upgrades
```

**Mark todo as completed.**

### 4.2 Copy Skill Files

**Mark todo "Copy skill files from pack" as in_progress.**

Copy all files from the pack's `src/skills/Upgrades/` directory:

```bash
# From the pack directory (where this INSTALL.md is located)
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/Upgrades/SKILL.md" "$PAI_DIR/skills/Upgrades/"
cp "$PACK_DIR/src/skills/Upgrades/sources.json" "$PAI_DIR/skills/Upgrades/"
cp "$PACK_DIR/src/skills/Upgrades/youtube-channels.json" "$PAI_DIR/skills/Upgrades/"
cp "$PACK_DIR/src/skills/Upgrades/Workflows/"*.md "$PAI_DIR/skills/Upgrades/Workflows/"
cp "$PACK_DIR/src/skills/Upgrades/Tools/"*.ts "$PAI_DIR/skills/Upgrades/Tools/"
```

**Files copied:**
- `SKILL.md` - Main skill routing
- `sources.json` - 30+ Anthropic sources configuration
- `youtube-channels.json` - Base channels template
- `Workflows/Anthropic.md` - Anthropic update check workflow
- `Workflows/YouTube.md` - YouTube monitoring workflow
- `Workflows/ReleaseNotesDeepDive.md` - Deep research workflow
- `Tools/Anthropic.ts` - Source checking CLI tool

**Mark todo as completed.**

### 4.3 Initialize State Files

**Mark todo "Initialize state files" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
echo '{"last_check_timestamp": null, "sources": {}}' > "$PAI_DIR/skills/Upgrades/State/last-check.json"
echo '{"last_check_timestamp": null, "channels": {}}' > "$PAI_DIR/skills/Upgrades/State/youtube-videos.json"
```

**Mark todo as completed.**

### 4.4 Set Up YouTube Customization (If User Chose Yes)

**Mark todo "Set up YouTube customization" as in_progress.**

**Only execute if user chose to set up channels:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
cat > "$PAI_DIR/SKILLCUSTOMIZATIONS/Upgrades/youtube-channels.json" << 'EOF'
{
  "_customization": {
    "description": "Your personal YouTube channels for AI development content",
    "merge_strategy": "append"
  },
  "channels": [
    {
      "name": "Indy Dev Dan",
      "channel_id": "@indydevdan",
      "url": "https://www.youtube.com/@indydevdan",
      "priority": "HIGH",
      "description": "Claude Code tutorials and AI development"
    }
  ]
}
EOF
```

**Mark todo as completed (or skip if user declined).**

### 4.5 Install yt-dlp (If User Chose Yes)

**Mark todo "Install yt-dlp" as in_progress.**

**Only execute if user chose to install yt-dlp:**

```bash
brew install yt-dlp
```

**Mark todo as completed (or skip if user declined).**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI Upgrades Skill Verification ==="

# Check skill directory
echo "Checking skill directory..."
ls -la "$PAI_DIR/skills/Upgrades/" || echo "❌ Skill directory missing"

# Check workflow files
echo "Checking workflows..."
ls "$PAI_DIR/skills/Upgrades/Workflows/" || echo "❌ Workflows missing"

# Check tools
echo "Checking tools..."
ls "$PAI_DIR/skills/Upgrades/Tools/" || echo "❌ Tools missing"

# Check state files
echo "Checking state files..."
cat "$PAI_DIR/skills/Upgrades/State/last-check.json" | head -1 || echo "❌ State files missing"

# Verify JSON validity
python3 -c "import json; json.load(open('$PAI_DIR/skills/Upgrades/State/last-check.json'))" && echo "✓ State JSON valid"

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Success/Failure Messages

### On Success

```
"PAI Upgrades Skill v1.0.0 installed successfully!

What's available:
- 'check for updates' - Monitor 30+ Anthropic sources
- 'check YouTube' - Monitor AI development channels
- 'deep dive release notes' - Research new features in depth

Try it: Ask me to 'check for Anthropic updates'"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Check directory permissions on ~/.claude/skills/
3. Run the verification commands in VERIFY.md

Need help? Check the Troubleshooting section below."
```

---

## Troubleshooting

### "pai-core-install not found"

This pack requires pai-core-install. Install it first:
```
Give the AI the pai-core-install pack directory and ask it to install.
```

### "yt-dlp not found" (after installation)

```bash
# Verify Homebrew installation
brew install yt-dlp

# Or use pip
pip install yt-dlp
```

### State files not updating

Check permissions:
```bash
ls -la ~/.claude/skills/Upgrades/State/
chmod 644 ~/.claude/skills/Upgrades/State/*.json
```

### YouTube channels not loading

Verify customization file:
```bash
cat ~/.claude/SKILLCUSTOMIZATIONS/Upgrades/youtube-channels.json
# Should show valid JSON with channels array
```

---

## What's Included

| File | Purpose |
|------|---------|
| `SKILL.md` | Main skill definition with workflow routing |
| `sources.json` | 30+ Anthropic sources (blogs, repos, changelogs) |
| `youtube-channels.json` | Base template for channel monitoring |
| `Workflows/Anthropic.md` | Check all Anthropic sources |
| `Workflows/YouTube.md` | Monitor configured channels |
| `Workflows/ReleaseNotesDeepDive.md` | Deep research workflow |
| `Tools/Anthropic.ts` | CLI tool for source checking |

---

## Usage

### From Claude Code

```
"Check for Anthropic updates"
"Any new AI development videos?"
"Deep dive the latest Claude Code release notes"
```

### Testing Installation

```
"What sources does the Upgrades skill monitor?"
# Should list blogs, GitHub repos, changelogs, documentation
```
