# Installation Guide - Kai Agents Skill

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **Claude Code** (or compatible agent system)
- **kai-core-install** pack installed (provides skill routing)
- **Optional**: kai-voice-system pack for voice notifications

## Pre-Installation: System Analysis

```bash
# 1. Check PAI_DIR
echo "PAI_DIR: ${PAI_DIR:-'NOT SET - will use ~/.config/pai'}"

# 2. Check for existing Agents skill
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"
if [ -d "$PAI_CHECK/skills/Agents" ]; then
  echo "Warning: Agents skill already exists"
  ls -la "$PAI_CHECK/skills/Agents"
else
  echo "Clean install - no existing Agents skill"
fi

# 3. Check dependencies
if [ -f "$PAI_CHECK/skills/CORE/SKILL.md" ]; then
  echo "kai-core-install: INSTALLED"
else
  echo "Warning: kai-core-install not found (required)"
fi
```

---

## Installation Steps

### Step 1: Create Directory Structure

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

mkdir -p "$PAI_DIR/skills/Agents/Data"
mkdir -p "$PAI_DIR/skills/Agents/Tools"
mkdir -p "$PAI_DIR/skills/Agents/Templates"
mkdir -p "$PAI_DIR/skills/Agents/Workflows"
mkdir -p "$PAI_DIR/skills/Agents/Contexts"

ls -la "$PAI_DIR/skills/Agents/"
```

### Step 2: Copy Skill Files

Copy from this pack's `src/` directory to your PAI installation:

| Source | Destination |
|--------|-------------|
| `src/skills/Agents/SKILL.md` | `$PAI_DIR/skills/Agents/SKILL.md` |
| `src/skills/Agents/Data/Traits.yaml` | `$PAI_DIR/skills/Agents/Data/Traits.yaml` |
| `src/skills/Agents/Tools/AgentFactory.ts` | `$PAI_DIR/skills/Agents/Tools/AgentFactory.ts` |
| `src/skills/Agents/Templates/DynamicAgent.hbs` | `$PAI_DIR/skills/Agents/Templates/DynamicAgent.hbs` |
| `src/skills/Agents/Workflows/CreateCustomAgent.md` | `$PAI_DIR/skills/Agents/Workflows/CreateCustomAgent.md` |
| `src/skills/Agents/Workflows/ListTraits.md` | `$PAI_DIR/skills/Agents/Workflows/ListTraits.md` |
| `src/skills/Agents/AgentPersonalities.md` | `$PAI_DIR/skills/Agents/AgentPersonalities.md` |

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
PACK_DIR="[PATH_TO_THIS_PACK]"

cp "$PACK_DIR/src/skills/Agents/SKILL.md" "$PAI_DIR/skills/Agents/"
cp "$PACK_DIR/src/skills/Agents/Data/Traits.yaml" "$PAI_DIR/skills/Agents/Data/"
cp "$PACK_DIR/src/skills/Agents/Tools/AgentFactory.ts" "$PAI_DIR/skills/Agents/Tools/"
cp "$PACK_DIR/src/skills/Agents/Templates/DynamicAgent.hbs" "$PAI_DIR/skills/Agents/Templates/"
cp "$PACK_DIR/src/skills/Agents/Workflows/CreateCustomAgent.md" "$PAI_DIR/skills/Agents/Workflows/"
cp "$PACK_DIR/src/skills/Agents/Workflows/ListTraits.md" "$PAI_DIR/skills/Agents/Workflows/"
cp "$PACK_DIR/src/skills/Agents/AgentPersonalities.md" "$PAI_DIR/skills/Agents/"
```

### Step 3: Install Dependencies

```bash
cd "$PAI_DIR/skills/Agents/Tools"
bun add yaml handlebars
```

### Step 4: Configure Voice Environment Variables (Optional)

If using kai-voice-system for voice notifications, add voice IDs to your `.env` file.

> **Important:** Voice IDs MUST be configured in `$PAI_DIR/.env`, NOT in `settings.json` or other config files. The voice server reads ElevenLabs voice IDs exclusively from environment variables.

**$PAI_DIR/.env:**
```bash
# Required: ElevenLabs API key
ELEVENLABS_API_KEY=sk_your_api_key_here

# Dynamic agent voices (from trait mapping)
ELEVENLABS_VOICE_PROFESSIONAL=<your_elevenlabs_voice_id>
ELEVENLABS_VOICE_AUTHORITATIVE=<your_elevenlabs_voice_id>
ELEVENLABS_VOICE_ACADEMIC=<your_elevenlabs_voice_id>
ELEVENLABS_VOICE_WARM=<your_elevenlabs_voice_id>
ELEVENLABS_VOICE_GENTLE=<your_elevenlabs_voice_id>
ELEVENLABS_VOICE_ENERGETIC=<your_elevenlabs_voice_id>
ELEVENLABS_VOICE_DYNAMIC=<your_elevenlabs_voice_id>
ELEVENLABS_VOICE_SOPHISTICATED=<your_elevenlabs_voice_id>
ELEVENLABS_VOICE_INTENSE=<your_elevenlabs_voice_id>
ELEVENLABS_VOICE_GRITTY=<your_elevenlabs_voice_id>

# Named agent voices
ELEVENLABS_VOICE_PAI=<your_elevenlabs_voice_id>
ELEVENLABS_VOICE_INTERN=<your_elevenlabs_voice_id>
ELEVENLABS_VOICE_ARCHITECT=<your_elevenlabs_voice_id>
ELEVENLABS_VOICE_ENGINEER=<your_elevenlabs_voice_id>

# Fallback voice (used when specific voice not configured)
ELEVENLABS_VOICE_ID=<your_default_voice_id>
```

**Configuration Split:**
| What | Where | Example |
|------|-------|---------|
| Voice IDs (secrets) | `$PAI_DIR/.env` | `ELEVENLABS_VOICE_ACADEMIC=dCnu06FiOZma2KVNUoPZ` |
| Voice settings | `kai-voice-system/config/voice-personalities.json` | `{ "stability": 0.62, "similarity_boost": 0.80 }` |

> **Note:** Get your voice IDs from the [ElevenLabs Voice Library](https://elevenlabs.io/voice-library). Each voice has a unique ID like `dCnu06FiOZma2KVNUoPZ`.

---

## Verification

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

echo "Checking installation..."

[ -f "$PAI_DIR/skills/Agents/SKILL.md" ] && echo "[OK] SKILL.md" || echo "[MISSING] SKILL.md"
[ -f "$PAI_DIR/skills/Agents/Data/Traits.yaml" ] && echo "[OK] Traits.yaml" || echo "[MISSING] Traits.yaml"
[ -f "$PAI_DIR/skills/Agents/Tools/AgentFactory.ts" ] && echo "[OK] AgentFactory.ts" || echo "[MISSING] AgentFactory.ts"
[ -f "$PAI_DIR/skills/Agents/Templates/DynamicAgent.hbs" ] && echo "[OK] DynamicAgent.hbs" || echo "[MISSING] DynamicAgent.hbs"

echo ""
echo "Testing AgentFactory..."
bun run "$PAI_DIR/skills/Agents/Tools/AgentFactory.ts" --list | head -20

echo ""
echo "Testing trait composition..."
bun run "$PAI_DIR/skills/Agents/Tools/AgentFactory.ts" \
  --traits "security,skeptical,thorough" \
  --output summary
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PAI_DIR` | No | Custom PAI directory (default: `~/.config/pai`) |
