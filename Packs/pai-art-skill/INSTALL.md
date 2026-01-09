# Installation Guide - Kai Art Skill

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **Claude Code** (or compatible agent system with skill support)
- **Write access** to `$PAI_DIR/` (default: `~/.config/pai`)
- **API Keys** (at least one required):
  - `REPLICATE_API_TOKEN` - For Flux and Nano Banana models
  - `GOOGLE_API_KEY` - For Nano Banana Pro (Gemini 3) model
  - `OPENAI_API_KEY` - For GPT-image-1 model
  - `REMOVEBG_API_KEY` - For background removal feature

## Pre-Installation: System Analysis

### Step 0.1: Detect Current Configuration

```bash
# 1. Check PAI_DIR
echo "PAI_DIR: ${PAI_DIR:-'NOT SET - will use ~/.config/pai'}"

# 2. Check for existing Skills directory
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"
if [ -d "$PAI_CHECK/skills/Art" ]; then
  echo "WARNING: Art skill already exists at: $PAI_CHECK/skills/Art"
  ls -la "$PAI_CHECK/skills/Art" 2>/dev/null || echo "  (empty)"
else
  echo "OK: No existing Art skill (clean install)"
fi

# 3. Check for API keys
echo ""
echo "API Key Status:"
[ -n "$REPLICATE_API_TOKEN" ] && echo "  REPLICATE_API_TOKEN: Set" || echo "  REPLICATE_API_TOKEN: NOT SET"
[ -n "$GOOGLE_API_KEY" ] && echo "  GOOGLE_API_KEY: Set" || echo "  GOOGLE_API_KEY: NOT SET"
[ -n "$OPENAI_API_KEY" ] && echo "  OPENAI_API_KEY: Set" || echo "  OPENAI_API_KEY: NOT SET"
[ -n "$REMOVEBG_API_KEY" ] && echo "  REMOVEBG_API_KEY: Set" || echo "  REMOVEBG_API_KEY: NOT SET"
```

### Step 0.2: Conflict Resolution Matrix

| Scenario | Existing State | Action |
|----------|---------------|--------|
| **Clean Install** | No Art skill exists | Proceed with Step 1 |
| **Skill Exists** | Art skill already present | Backup existing, then replace |
| **No API Keys** | Missing all API keys | Add at least one key to .env |

### Step 0.3: Backup Existing Configuration (If Needed)

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"
if [ -d "$PAI_CHECK/skills/Art" ]; then
  BACKUP_DIR="$HOME/.pai-backup/$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$BACKUP_DIR"
  cp -r "$PAI_CHECK/skills/Art" "$BACKUP_DIR/Art"
  echo "Backed up existing Art skill to: $BACKUP_DIR/Art"
fi
```

---

## Installation Steps

### Step 1: Create Directory Structure

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

mkdir -p "$PAI_DIR/skills/Art/Workflows"
mkdir -p "$PAI_DIR/skills/Art/Tools"

echo "Created directories:"
ls -la "$PAI_DIR/skills/Art/"
```

### Step 2: Copy Skill Files

Copy from this pack's `src/` directory to your PAI installation:

| Source | Destination |
|--------|-------------|
| `src/skills/Art/SKILL.md` | `$PAI_DIR/skills/Art/SKILL.md` |
| `src/skills/Art/Aesthetic.md` | `$PAI_DIR/skills/Art/Aesthetic.md` |
| `src/skills/Art/Workflows/TechnicalDiagrams.md` | `$PAI_DIR/skills/Art/Workflows/TechnicalDiagrams.md` |
| `src/skills/Art/Workflows/Essay.md` | `$PAI_DIR/skills/Art/Workflows/Essay.md` |
| `src/skills/Art/Workflows/Comics.md` | `$PAI_DIR/skills/Art/Workflows/Comics.md` |
| `src/skills/Art/Tools/Generate.ts` | `$PAI_DIR/skills/Art/Tools/Generate.ts` |

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
PACK_DIR="[PATH_TO_THIS_PACK]"

cp "$PACK_DIR/src/skills/Art/SKILL.md" "$PAI_DIR/skills/Art/"
cp "$PACK_DIR/src/skills/Art/Aesthetic.md" "$PAI_DIR/skills/Art/"
cp "$PACK_DIR/src/skills/Art/Workflows/TechnicalDiagrams.md" "$PAI_DIR/skills/Art/Workflows/"
cp "$PACK_DIR/src/skills/Art/Workflows/Essay.md" "$PAI_DIR/skills/Art/Workflows/"
cp "$PACK_DIR/src/skills/Art/Workflows/Comics.md" "$PAI_DIR/skills/Art/Workflows/"
cp "$PACK_DIR/src/skills/Art/Tools/Generate.ts" "$PAI_DIR/skills/Art/Tools/"
```

### Step 3: Set Up Environment Variables

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

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
# OPENAI_API_KEY=sk-your_openai_key_here

# For background removal
# REMOVEBG_API_KEY=your_removebg_key_here
EOF
  echo "Created $PAI_DIR/.env - Please add your API keys"
else
  echo ".env already exists at $PAI_DIR/.env"
fi
```

### Step 4: Install Dependencies

```bash
cd "$PAI_DIR/skills/Art/Tools"
bun install replicate openai @google/genai
```

---

## Verification

Run the verification script:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

echo "Verifying Art Skill installation..."

# Check files
echo "Files:"
[ -f "$PAI_DIR/skills/Art/SKILL.md" ] && echo "  [OK] SKILL.md" || echo "  [MISSING] SKILL.md"
[ -f "$PAI_DIR/skills/Art/Aesthetic.md" ] && echo "  [OK] Aesthetic.md" || echo "  [MISSING] Aesthetic.md"
[ -f "$PAI_DIR/skills/Art/Workflows/TechnicalDiagrams.md" ] && echo "  [OK] TechnicalDiagrams.md" || echo "  [MISSING] TechnicalDiagrams.md"
[ -f "$PAI_DIR/skills/Art/Workflows/Essay.md" ] && echo "  [OK] Essay.md" || echo "  [MISSING] Essay.md"
[ -f "$PAI_DIR/skills/Art/Workflows/Comics.md" ] && echo "  [OK] Comics.md" || echo "  [MISSING] Comics.md"
[ -f "$PAI_DIR/skills/Art/Tools/Generate.ts" ] && echo "  [OK] Generate.ts" || echo "  [MISSING] Generate.ts"

# Test CLI tool
echo ""
echo "Test CLI tool:"
bun run "$PAI_DIR/skills/Art/Tools/Generate.ts" --help | head -5

echo ""
echo "Installation complete!"
```

---

## Environment Variables

| Variable | Required For | Description |
|----------|-------------|-------------|
| `REPLICATE_API_TOKEN` | Flux, Nano Banana | Replicate API access |
| `GOOGLE_API_KEY` | Nano Banana Pro | Google Gemini API access |
| `OPENAI_API_KEY` | GPT-image-1 | OpenAI API access |
| `REMOVEBG_API_KEY` | Background removal | remove.bg API access |
| `PAI_DIR` | All | Custom PAI directory (optional) |
