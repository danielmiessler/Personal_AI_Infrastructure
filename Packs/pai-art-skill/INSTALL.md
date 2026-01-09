# PAI Art Skill v1.0.0 - Installation Guide

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
"I'm installing PAI Art Skill v1.0.0 - Visual content generation with multiple AI models (Flux, Nano Banana, GPT-image-1).

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

# Check for existing Art skill
if [ -d "$PAI_CHECK/skills/Art" ]; then
  echo "⚠️  Existing Art skill found at: $PAI_CHECK/skills/Art"
  ls -la "$PAI_CHECK/skills/Art/"
else
  echo "✓ No existing Art skill (clean install)"
fi

# Check for Bun runtime
if command -v bun &> /dev/null; then
  echo "✓ Bun is installed: $(bun --version)"
else
  echo "❌ Bun not installed - REQUIRED!"
fi

# Check for API keys
echo ""
echo "API Key Status:"
[ -n "$REPLICATE_API_TOKEN" ] && echo "✓ REPLICATE_API_TOKEN: Set" || echo "⚠️  REPLICATE_API_TOKEN: NOT SET (needed for Flux, Nano Banana)"
[ -n "$GOOGLE_API_KEY" ] && echo "✓ GOOGLE_API_KEY: Set" || echo "⚠️  GOOGLE_API_KEY: NOT SET (needed for Nano Banana Pro)"
[ -n "$OPENAI_API_KEY" ] && echo "✓ OPENAI_API_KEY: Set" || echo "⚠️  OPENAI_API_KEY: NOT SET (needed for GPT-image-1)"
[ -n "$REMOVEBG_API_KEY" ] && echo "✓ REMOVEBG_API_KEY: Set" || echo "⚠️  REMOVEBG_API_KEY: NOT SET (needed for background removal)"
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- Existing Art skill: [Yes at path / No]
- Bun runtime: [installed vX.X / NOT INSTALLED - REQUIRED]
- API Keys:
  - REPLICATE_API_TOKEN: [set / not set]
  - GOOGLE_API_KEY: [set / not set]
  - OPENAI_API_KEY: [set / not set]
  - REMOVEBG_API_KEY: [set / not set]

Note: At least one image generation API key is required."
```

**STOP if pai-core-install or Bun is not installed.** Tell the user:
```
"pai-core-install and Bun are required. Please install them first, then return to install this pack."
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing found)

**Only ask if existing Art skill detected:**

```json
{
  "header": "Conflict",
  "question": "Existing Art skill detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and Replace (Recommended)", "description": "Creates timestamped backup, then installs new version"},
    {"label": "Replace Without Backup", "description": "Overwrites existing without backup"},
    {"label": "Abort Installation", "description": "Cancel installation, keep existing"}
  ]
}
```

### Question 2: API Key Setup

**Only ask if any API keys are missing:**

```json
{
  "header": "API Keys",
  "question": "Some API keys are missing. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Create .env template (Recommended)", "description": "Creates template file for you to add keys later"},
    {"label": "I'll set them manually", "description": "Skip .env creation, set keys in shell profile"},
    {"label": "Continue without all keys", "description": "Some generation models won't work"}
  ]
}
```

### Question 3: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI Art Skill v1.0.0?",
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
BACKUP_DIR="$PAI_DIR/Backups/art-skill-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
[ -d "$PAI_DIR/skills/Art" ] && cp -r "$PAI_DIR/skills/Art" "$BACKUP_DIR/"
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
    {"content": "Set up environment template", "status": "pending", "activeForm": "Setting up environment template"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Skill Directory Structure

**Mark todo "Create skill directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/skills/Art/Workflows"
mkdir -p "$PAI_DIR/skills/Art/Tools"
```

**Mark todo as completed.**

### 4.2 Copy Skill Files

**Mark todo "Copy skill files from pack" as in_progress.**

Copy all files from the pack's `src/skills/Art/` directory:

```bash
# From the pack directory (where this INSTALL.md is located)
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/Art/SKILL.md" "$PAI_DIR/skills/Art/"
cp "$PACK_DIR/src/skills/Art/Aesthetic.md" "$PAI_DIR/skills/Art/"
cp "$PACK_DIR/src/skills/Art/Workflows/TechnicalDiagrams.md" "$PAI_DIR/skills/Art/Workflows/"
cp "$PACK_DIR/src/skills/Art/Workflows/Essay.md" "$PAI_DIR/skills/Art/Workflows/"
cp "$PACK_DIR/src/skills/Art/Workflows/Comics.md" "$PAI_DIR/skills/Art/Workflows/"
cp "$PACK_DIR/src/skills/Art/Tools/Generate.ts" "$PAI_DIR/skills/Art/Tools/"
```

**Files copied:**
- `SKILL.md` - Main skill routing and model selection
- `Aesthetic.md` - Visual style guidelines and principles
- `Workflows/TechnicalDiagrams.md` - Technical diagram generation workflow
- `Workflows/Essay.md` - Essay illustration workflow
- `Workflows/Comics.md` - Comic strip generation workflow
- `Tools/Generate.ts` - Image generation CLI tool

**Mark todo as completed.**

### 4.3 Install Dependencies

**Mark todo "Install dependencies" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
cd "$PAI_DIR/skills/Art/Tools"
bun add replicate openai @google/genai
```

**Mark todo as completed.**

### 4.4 Set Up Environment Template (If User Chose Yes)

**Mark todo "Set up environment template" as in_progress.**

**Only execute if user chose to create .env template:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Create .env if it doesn't exist
if [ ! -f "$PAI_DIR/.env" ]; then
  cat > "$PAI_DIR/.env" << 'EOF'
# Art Skill API Keys
# Uncomment and fill in the keys you have

# For Flux and Nano Banana models (Replicate)
# REPLICATE_API_TOKEN=r8_your_token_here

# For Nano Banana Pro (Gemini 3)
# GOOGLE_API_KEY=your_google_api_key_here

# For GPT-image-1 (OpenAI)
# OPENAI_API_KEY=your_openai_api_key_here

# For background removal
# REMOVEBG_API_KEY=your_removebg_key_here
EOF
  echo "Created $PAI_DIR/.env - Please add your API keys"
else
  echo ".env already exists at $PAI_DIR/.env"
fi
```

Tell the user:
```
"Created .env template at $PAI_DIR/.env
Please edit this file and add your API keys:
- REPLICATE_API_TOKEN from replicate.com
- GOOGLE_API_KEY from Google AI Studio
- OPENAI_API_KEY from OpenAI
- REMOVEBG_API_KEY from remove.bg (optional)"
```

**Mark todo as completed (or skip if user declined).**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI Art Skill Verification ==="

# Check skill files exist
echo "Checking skill files..."
[ -f "$PAI_DIR/skills/Art/SKILL.md" ] && echo "✓ SKILL.md" || echo "❌ SKILL.md missing"
[ -f "$PAI_DIR/skills/Art/Aesthetic.md" ] && echo "✓ Aesthetic.md" || echo "❌ Aesthetic.md missing"
[ -f "$PAI_DIR/skills/Art/Workflows/TechnicalDiagrams.md" ] && echo "✓ TechnicalDiagrams.md" || echo "❌ TechnicalDiagrams.md missing"
[ -f "$PAI_DIR/skills/Art/Workflows/Essay.md" ] && echo "✓ Essay.md" || echo "❌ Essay.md missing"
[ -f "$PAI_DIR/skills/Art/Workflows/Comics.md" ] && echo "✓ Comics.md" || echo "❌ Comics.md missing"
[ -f "$PAI_DIR/skills/Art/Tools/Generate.ts" ] && echo "✓ Generate.ts" || echo "❌ Generate.ts missing"

# Test CLI tool
echo ""
echo "Testing Generate.ts CLI..."
bun run "$PAI_DIR/skills/Art/Tools/Generate.ts" --help | head -10

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Success/Failure Messages

### On Success

```
"PAI Art Skill v1.0.0 installed successfully!

What's available:
- 'create image' - Generate images with Flux, Nano Banana, or GPT-image-1
- 'technical diagram' - Create architecture and flow diagrams
- 'essay illustration' - Generate illustrations for blog posts
- 'comic strip' - Create comic-style sequences
- '--remove-bg' flag - Remove backgrounds from generated images

Try it: Ask me to 'create a header image for a blog post about AI agents'"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Verify Bun is installed: `bun --version`
3. Check at least one API key is set (REPLICATE_API_TOKEN, OPENAI_API_KEY, or GOOGLE_API_KEY)
4. Check directory permissions on $PAI_DIR/skills/
5. Run the verification commands in VERIFY.md

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

### "No API keys found"

```bash
# Check your .env file
cat $PAI_DIR/.env

# Or export directly
export REPLICATE_API_TOKEN="YOUR_REPLICATE_TOKEN"
export OPENAI_API_KEY="YOUR_OPENAI_KEY"
```

### "Generate.ts fails to run"

```bash
# Check dependencies are installed
cd $PAI_DIR/skills/Art/Tools
bun install

# Or reinstall
bun add replicate openai @google/genai
```

### "Background removal not working"

```bash
# Check REMOVEBG_API_KEY is set
echo $REMOVEBG_API_KEY

# Get a key from remove.bg if needed
```

---

## What's Included

| File | Purpose |
|------|---------|
| `SKILL.md` | Main skill definition with model selection |
| `Aesthetic.md` | Visual style guidelines and principles |
| `Workflows/TechnicalDiagrams.md` | Technical diagram workflow |
| `Workflows/Essay.md` | Essay illustration workflow |
| `Workflows/Comics.md` | Comic strip workflow |
| `Tools/Generate.ts` | Image generation CLI tool |

---

## Usage

### From Claude Code

```
"Create a header image for my blog post about AI"
"Generate a technical diagram showing microservices architecture"
"Create an illustration for an essay about consciousness"
"Make a comic strip about debugging code"
```

### CLI Examples

```bash
# Generate with Flux (default)
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --prompt "A futuristic AI interface" \
  --model flux

# Generate with background removal
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --prompt "A robot mascot" \
  --model flux \
  --remove-bg

# Generate with GPT-image-1
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --prompt "A detailed technical diagram" \
  --model gpt-image-1

# List available models
bun run $PAI_DIR/skills/Art/Tools/Generate.ts --list-models
```

---

## Environment Variables

| Variable | Required For | Description |
|----------|-------------|-------------|
| `REPLICATE_API_TOKEN` | Flux, Nano Banana | Replicate API access |
| `GOOGLE_API_KEY` | Nano Banana Pro | Google Gemini API access |
| `OPENAI_API_KEY` | GPT-image-1 | OpenAI API access |
| `REMOVEBG_API_KEY` | Background removal | remove.bg API access |
| `PAI_DIR` | All | Custom PAI directory (optional, default: ~/.claude) |
