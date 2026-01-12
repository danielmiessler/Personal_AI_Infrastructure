# Installation Guide - pai-multi-llm

**This guide is designed for AI agents installing this pack into a user's infrastructure.**

## Prerequisites

- PAI Core installed (`pai-core-install`)
- Bun >= 1.0.0

## Phase 1: Install Skill Files

**Copy all skill files to PAI directory first:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Create directory structure
mkdir -p "$PAI_DIR/skills/MultiLLM/Tools"
mkdir -p "$PAI_DIR/config"

# Copy from pack source to PAI directory
PACK_DIR="$(pwd)"
cp "$PACK_DIR/src/skills/MultiLLM/SKILL.md" "$PAI_DIR/skills/MultiLLM/"
cp "$PACK_DIR/src/skills/MultiLLM/Tools/"*.ts "$PAI_DIR/skills/MultiLLM/Tools/"
cp "$PACK_DIR/package.json" "$PAI_DIR/skills/MultiLLM/"

# Copy types
mkdir -p "$PAI_DIR/skills/MultiLLM/types"
cp "$PACK_DIR/src/types/Provider.ts" "$PAI_DIR/skills/MultiLLM/types/"

# Install dependencies in destination (NOT in pack source)
cd "$PAI_DIR/skills/MultiLLM"
bun install

echo "Skill files installed to: $PAI_DIR/skills/MultiLLM"
```

## Phase 2: System Detection

Run provider detection to see what's available:

```bash
cd "$PAI_DIR/skills/MultiLLM"
bun run detect --verbose
```

Expected output:
```
═══════════════════════════════════════════════════════════════
                    LLM PROVIDER DETECTION
═══════════════════════════════════════════════════════════════

✓ claude       DETECTED
    Version: 1.0.34
    Command: claude
✓ codex        DETECTED
    Version: 0.1.0
    Command: codex
✓ ollama       DETECTED
    Version: 0.5.4
    Command: ollama
    Models (3):
      - deepseek-r1:14b
      - qwen3:4b
      - llama3.2:latest
✗ gemini       NOT FOUND
✗ opencode     NOT FOUND

───────────────────────────────────────────────────────────────
SUMMARY: 3/5 providers detected

Ready to generate team.yaml with detected providers.
Run: bun run generate-team
═══════════════════════════════════════════════════════════════
```

## Phase 2: Generate Team Configuration

### If providers were detected:

```bash
bun run generate-team
```

This creates `$PAI_DIR/config/team.yaml` with:
- All detected providers
- Pre-configured session management
- Default role assignments

### If NO providers were detected:

The installer creates `$PAI_DIR/config/team.example.yaml` with:
- Template for all supported providers
- Installation instructions for each provider
- Example configurations

**To install providers:**

```bash
# Claude CLI
npm install -g @anthropic-ai/claude-code

# Codex CLI (OpenAI)
npm install -g @openai/codex

# Gemini CLI
pip install google-generativeai

# Ollama (local models)
brew install ollama
ollama pull deepseek-r1:14b
ollama pull qwen3:4b

# OpenCode
go install github.com/sst/opencode@latest
```

After installing providers, run detection again:
```bash
bun run detect
bun run generate-team
```

## Phase 3: Customize Team Roles

Edit `$PAI_DIR/config/team.yaml` to customize:

```yaml
team:
  providers:
    - name: claude
      role: coordinator           # Change this!
      use_for:                    # Customize this!
        - Strategic decisions
        - Final synthesis
        - User communication

    - name: deepseek-r1-14b
      role: deep_reasoner         # Your label
      use_for:
        - Complex analysis
        - Multi-step reasoning
        - Strategic problems
```

## Phase 4: Copy Config Files

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
PACK_DIR="$(pwd)"

# Copy config files if any exist
if [ -d "$PACK_DIR/src/config" ]; then
  cp -r "$PACK_DIR/src/config/"* "$PAI_DIR/config/" 2>/dev/null || true
fi
```

## Phase 5: Verify Installation

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
cd "$PAI_DIR/skills/MultiLLM"

# Check team configuration
bun run query --list

# Test a query
bun run query -p "Hello, what can you do?" --provider claude

# Check session tracking
bun run session --list

# Verify all tools are present
echo "Checking tool files..."
ls -la "$PAI_DIR/skills/MultiLLM/Tools/"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No team.yaml found" | Run `bun run generate-team` |
| Provider not detected | Check `which <provider>` works |
| Session not continuing | Check provider supports sessions |
| Ollama models missing | Run `ollama list` to verify |

## Uninstall

```bash
# Remove skill files
rm -rf "$PAI_DIR/skills/MultiLLM"
rm "$PAI_DIR/config/team.yaml"

# Remove session data
rm -rf "$PAI_DIR/multi-llm"
```
