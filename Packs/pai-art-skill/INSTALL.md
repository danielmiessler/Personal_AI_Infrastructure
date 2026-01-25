# PAI Art Skill v2.3.0 - Installation Guide

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
"I'm installing PAI Art Skill v2.3.0 - Visual content creation system. This skill generates images using FAL AI (Flux, Nano-Banana) for editorial illustrations, technical diagrams, and visual content.

Let me analyze your system and guide you through installation."
```

---

## Phase 1: System Analysis

**Execute this analysis BEFORE any file operations.**

### 1.1 Run These Commands

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.claude}"
echo "PAI_DIR: $PAI_CHECK"

# Check if pai-core-install is installed (REQUIRED)
if [ -f "$PAI_CHECK/skills/CORE/SKILL.md" ]; then
  echo "OK pai-core-install is installed"
else
  echo "ERROR pai-core-install NOT installed - REQUIRED!"
fi

# Check for existing Art skill
if [ -d "$PAI_CHECK/skills/Art" ]; then
  echo "WARNING Existing Art skill found at: $PAI_CHECK/skills/Art"
  ls "$PAI_CHECK/skills/Art/"
else
  echo "OK No existing Art skill (clean install)"
fi

# Check for Bun runtime (REQUIRED)
if command -v bun &> /dev/null; then
  echo "OK Bun is installed: $(bun --version)"
else
  echo "ERROR Bun not installed - REQUIRED!"
fi

# Check for FAL_KEY environment variable
if [ -n "$FAL_KEY" ]; then
  echo "OK FAL_KEY is set"
else
  # Check .env files
  if grep -q "FAL_KEY" ~/.env 2>/dev/null || grep -q "FAL_KEY" "$PAI_CHECK/.env" 2>/dev/null; then
    echo "OK FAL_KEY found in .env file"
  else
    echo "NOTE FAL_KEY not set - required for image generation"
  fi
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- Existing Art skill: [Yes / No]
- Bun runtime: [installed vX.X / NOT INSTALLED - REQUIRED]
- FAL_KEY: [set / not set - REQUIRED for image generation]"
```

**STOP if pai-core-install or Bun is not installed.** Tell the user:
```
"pai-core-install and Bun are required. Please install them first, then return to install this pack."
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing skill found)

**Only ask if existing Art directory detected:**

```json
{
  "header": "Conflict",
  "question": "Existing Art skill detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and replace (Recommended)", "description": "Creates timestamped backup, then installs fresh"},
    {"label": "Replace without backup", "description": "Overwrites existing skill files"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

### Question 2: FAL API Key (if not set)

**Only ask if FAL_KEY is not detected:**

```json
{
  "header": "API Key",
  "question": "FAL_KEY is required for image generation. Do you have a FAL AI account?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, I'll provide my key", "description": "I have a FAL AI API key ready"},
    {"label": "Help me get one", "description": "Guide me through FAL AI signup"},
    {"label": "Skip for now", "description": "Install without key - will configure later"}
  ]
}
```

**If user chooses "Help me get one":**
```
"Here's how to get a FAL API key:
1. Go to https://fal.ai
2. Create an account or sign in
3. Navigate to API Keys in your dashboard
4. Generate a new key
5. Come back and we'll configure it"
```

### Question 3: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI Art Skill v2.3.0?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, install now (Recommended)", "description": "Proceeds with installation"},
    {"label": "Show me what will change", "description": "Lists all files that will be created"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

---

## Phase 3: Backup (If Needed)

**Only execute if user chose "Backup and replace":**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
BACKUP_DIR="$PAI_DIR/Backups/art-skill-$(date +%Y%m%d-%H%M%S)"

if [ -d "$PAI_DIR/skills/Art" ]; then
  mkdir -p "$BACKUP_DIR"
  cp -r "$PAI_DIR/skills/Art" "$BACKUP_DIR/"
  echo "Backup created at: $BACKUP_DIR"
fi
```

---

## Phase 4: Installation

**Create a TodoWrite list to track progress:**

```json
{
  "todos": [
    {"content": "Create directory structure", "status": "pending", "activeForm": "Creating directory structure"},
    {"content": "Copy skill files from pack", "status": "pending", "activeForm": "Copying skill files"},
    {"content": "Install dependencies", "status": "pending", "activeForm": "Installing dependencies"},
    {"content": "Configure FAL_KEY", "status": "pending", "activeForm": "Configuring FAL_KEY"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Directory Structure

**Mark todo "Create directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/skills/Art/"{Workflows,Tools}
```

**Mark todo as completed.**

### 4.2 Copy Skill Files

**Mark todo "Copy skill files from pack" as in_progress.**

Copy all files from the pack's `src/skills/Art/` directory:

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp -r "$PACK_DIR/src/skills/Art/"* "$PAI_DIR/skills/Art/"
```

**Files included:**
- `SKILL.md` - Main skill definition
- `Tools/Generate.ts` - Image generation CLI tool
- `Workflows/Essay.md` - Editorial illustration workflow
- `Workflows/Visualize.md` - General visualization workflow
- `Workflows/TechnicalDiagrams.md` - Technical diagram creation
- `Workflows/Mermaid.md` - Mermaid diagram workflow
- `Workflows/Frameworks.md` - Framework visualization
- `Workflows/Stats.md` - Statistics visualization
- `Workflows/CreatePAIPackIcon.md` - PAI pack icon creation

**Mark todo as completed.**

### 4.3 Install Dependencies

**Mark todo "Install dependencies" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
cd "$PAI_DIR/skills/Art/Tools"

# Initialize if needed
if [ ! -f package.json ]; then
  bun init -y
fi

# Install FAL AI client
bun add @fal-ai/serverless-client
```

**Mark todo as completed.**

### 4.4 Configure FAL_KEY

**Mark todo "Configure FAL_KEY" as in_progress.**

**If user provided a key, add it to .env:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Check if key already exists
if ! grep -q "FAL_KEY" ~/.env 2>/dev/null; then
  echo 'FAL_KEY="USER_PROVIDED_KEY"' >> ~/.env
  echo "Added FAL_KEY to ~/.env"
fi
```

**If user skipped, tell them:**
```
"Skipping FAL_KEY configuration. To enable image generation later:
1. Get a key from https://fal.ai
2. Add to ~/.env: FAL_KEY=\"your-key-here\""
```

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI Art Skill v2.3.0 Verification ==="

# Check skill files
echo "Checking skill files..."
[ -f "$PAI_DIR/skills/Art/SKILL.md" ] && echo "OK SKILL.md" || echo "ERROR SKILL.md missing"
[ -f "$PAI_DIR/skills/Art/Tools/Generate.ts" ] && echo "OK Tools/Generate.ts" || echo "ERROR Tools/Generate.ts missing"

# Check workflows
echo ""
echo "Checking workflows..."
for workflow in Essay Visualize TechnicalDiagrams Mermaid Frameworks Stats CreatePAIPackIcon; do
  [ -f "$PAI_DIR/skills/Art/Workflows/${workflow}.md" ] && echo "OK Workflows/${workflow}.md" || echo "ERROR Workflows/${workflow}.md missing"
done

# Check dependencies
echo ""
echo "Checking dependencies..."
[ -d "$PAI_DIR/skills/Art/Tools/node_modules/@fal-ai" ] && echo "OK @fal-ai/serverless-client installed" || echo "ERROR @fal-ai/serverless-client not installed"

# Test tool execution
echo ""
echo "Testing tool execution..."
bun run "$PAI_DIR/skills/Art/Tools/Generate.ts" --help && echo "OK Tool executes" || echo "ERROR Tool execution failed"

# Check FAL_KEY
echo ""
echo "Checking FAL_KEY..."
if [ -n "$FAL_KEY" ] || grep -q "FAL_KEY" ~/.env 2>/dev/null; then
  echo "OK FAL_KEY configured"
else
  echo "WARNING FAL_KEY not configured - image generation will fail"
fi

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Success/Failure Messages

### On Success

```
"PAI Art Skill v2.3.0 installed successfully!

What's available:
- Image generation using FAL AI (Flux, Nano-Banana models)
- Editorial illustration workflow for essays and articles
- Technical diagram creation
- Mermaid diagram generation
- Statistics visualization
- PAI pack icon creation

Usage:
- 'Create an illustration for [topic]' - Editorial style image
- 'Generate a technical diagram for [concept]' - Technical visualization
- 'Visualize this data: [stats]' - Statistics chart
- 'Create a PAI pack icon for [skill]' - Pack iconography"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Verify Bun is installed: `bun --version`
3. Check FAL_KEY is configured: `echo $FAL_KEY`
4. Install dependencies: `cd $PAI_DIR/skills/Art/Tools && bun add @fal-ai/serverless-client`
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
curl -fsSL https://bun.sh/install | bash
source ~/.zshrc  # or restart terminal
```

### "FAL_KEY not set"

```bash
# Add to ~/.env
echo 'FAL_KEY="your-key-here"' >> ~/.env

# Or export directly
export FAL_KEY="your-key-here"
```

### Image generation fails

```bash
# Test FAL API connectivity
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model nano-banana-pro \
  --prompt "Simple test image" \
  --size 1K \
  --output ~/Downloads/test.png
```

### "Cannot find module '@fal-ai/serverless-client'"

```bash
cd $PAI_DIR/skills/Art/Tools
bun add @fal-ai/serverless-client
```

---

## What's Included

### Skill Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Skill definition and routing |
| `Tools/Generate.ts` | Image generation CLI |

### Workflows

| File | Purpose |
|------|---------|
| `Workflows/Essay.md` | Editorial illustration |
| `Workflows/Visualize.md` | General visualization |
| `Workflows/TechnicalDiagrams.md` | Technical diagrams |
| `Workflows/Mermaid.md` | Mermaid diagrams |
| `Workflows/Frameworks.md` | Framework visualization |
| `Workflows/Stats.md` | Statistics charts |
| `Workflows/CreatePAIPackIcon.md` | PAI pack icons |

---

## Usage

### Image Generation Models

| Model | Best For | Speed |
|-------|----------|-------|
| `flux-pro` | High quality editorial images | Slower |
| `flux-dev` | Development/testing | Medium |
| `nano-banana-pro` | Quick iterations | Fast |

### Example Commands

```bash
# Generate editorial image
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model flux-pro \
  --prompt "Abstract visualization of AI neural networks" \
  --size 2K \
  --aspect-ratio 16:9 \
  --output ~/Downloads/neural-networks.png

# Quick test image
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model nano-banana-pro \
  --prompt "Simple geometric pattern" \
  --size 1K \
  --output ~/Downloads/test.png
```

### Natural Language Usage

```
"Create an illustration for my essay about AI safety"
"Generate a technical diagram showing the authentication flow"
"Visualize this data as a chart: [data]"
"Create a header image for my blog post about [topic]"
```
