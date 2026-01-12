# Installation Guide - pai-multi-llm

**This guide is designed for AI agents installing this pack into a user's infrastructure.**

## Prerequisites

- PAI Core installed (`pai-core-install`)
- Bun >= 1.0.0

---

## Upgrade Path

**If upgrading from a previous version, follow these steps:**

### Detect Upgrade vs Fresh Install

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

if [ -f "$PAI_DIR/skills/MultiLLM/SKILL.md" ]; then
  echo "UPGRADE: Existing MultiLLM found"
  ls -la "$PAI_DIR/skills/MultiLLM/"
else
  echo "FRESH INSTALL: No existing MultiLLM"
fi
```

### What Gets Preserved During Upgrade

| Item | Preserved? | Notes |
|------|------------|-------|
| `team.yaml` | ✅ Yes | Your provider configuration - NOT overwritten |
| Session history | ✅ Yes | Stored in `~/.claude/multi-llm/sessions/` |
| Custom provider roles | ✅ Yes | Part of team.yaml |
| Tool files | ⚠️ Replaced | New versions installed |

### Upgrade Steps

**1. Backup current installation:**
```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
BACKUP_DIR="$HOME/.pai-backups/multi-llm-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r "$PAI_DIR/skills/MultiLLM" "$BACKUP_DIR/"
cp "$PAI_DIR/config/team.yaml" "$BACKUP_DIR/" 2>/dev/null
echo "Backup created: $BACKUP_DIR"
```

**2. Preserve team configuration:**
```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
# team.yaml is preserved automatically - installer won't overwrite it
if [ -f "$PAI_DIR/config/team.yaml" ]; then
  echo "✓ team.yaml exists - will be preserved"
fi
```

**3. Install new version:**
Follow Phase 1 (Install Skill Files) below - only tool files are replaced.

**4. Re-run provider detection (recommended):**
```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
bun run "$PAI_DIR/skills/MultiLLM/Tools/DetectProviders.ts" --verbose
```

**5. Verify upgrade:**
```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
bun run "$PAI_DIR/skills/MultiLLM/Tools/Query.ts" --list
```

### Breaking Changes by Version

| From → To | Breaking Changes | Migration |
|-----------|------------------|-----------|
| v1.x → v2.0 | None | Just reinstall tool files |

---

## Phase 1: Install Skill Files

**First, navigate to the pack directory:**
```bash
cd /path/to/pai-multi-llm
```

**Verify you're in the right directory:**
```bash
ls src/skills/MultiLLM/SKILL.md && echo "✓ Correct directory" || echo "✗ Wrong directory - navigate to pai-multi-llm pack"
```

**Copy all skill files:**
```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}" && mkdir -p "$PAI_DIR/skills/MultiLLM/Tools" "$PAI_DIR/skills/MultiLLM/types" "$PAI_DIR/config" && cp src/skills/MultiLLM/SKILL.md "$PAI_DIR/skills/MultiLLM/" && cp src/skills/MultiLLM/Tools/*.ts "$PAI_DIR/skills/MultiLLM/Tools/" && cp src/types/Provider.ts "$PAI_DIR/skills/MultiLLM/types/" && echo "✓ Skill files installed to: $PAI_DIR/skills/MultiLLM"
```

**Verify files copied:**
```bash
ls -la ~/.claude/skills/MultiLLM/Tools/
```

Note: If tools fail with "Module not found: yaml", run: `bun add yaml -g`

## Phase 2: System Detection

Run provider detection to see what's available:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
bun run "$PAI_DIR/skills/MultiLLM/Tools/DetectProviders.ts" --verbose
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
═══════════════════════════════════════════════════════════════
```

## Phase 3: Generate Team Configuration

**Always run this command (it auto-detects and generates appropriate config):**
```bash
bun run ~/.claude/skills/MultiLLM/Tools/GenerateTeam.ts
```

**Verify team.yaml was created:**
```bash
cat ~/.claude/config/team.yaml
```

If no providers were detected, the tool creates `team.example.yaml` instead. Install providers and re-run:

```bash
# Claude CLI
npm install -g @anthropic-ai/claude-code

# Codex CLI (OpenAI)
npm install -g @openai/codex

# Gemini CLI
pip install google-generativeai

# Ollama (local models)
brew install ollama && ollama pull deepseek-r1:14b && ollama pull qwen3:4b

# OpenCode
go install github.com/sst/opencode@latest
```

**After installing providers, re-run detection and generation:**
```bash
bun run ~/.claude/skills/MultiLLM/Tools/DetectProviders.ts --verbose && bun run ~/.claude/skills/MultiLLM/Tools/GenerateTeam.ts
```

## Phase 4: Customize Team Roles

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

## Phase 5: Copy Config Files (Optional)

**Only run if src/config/ exists in pack directory:**
```bash
cp src/config/* ~/.claude/config/ 2>/dev/null && echo "✓ Config files copied" || echo "No config files to copy (this is OK)"
```

## Phase 6: Verify Installation

**Check team configuration:**
```bash
bun run ~/.claude/skills/MultiLLM/Tools/Query.ts --list
```

**Check session tracking:**
```bash
bun run ~/.claude/skills/MultiLLM/Tools/SessionManager.ts --list
```

**Verify all tools are present:**
```bash
ls -la ~/.claude/skills/MultiLLM/Tools/
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No team.yaml found" | Run `bun run ~/.claude/skills/MultiLLM/Tools/GenerateTeam.ts` |
| Provider not detected | Check `which <provider>` works |
| Session not continuing | Check provider supports sessions |
| Ollama models missing | Run `ollama list` to verify |

## Uninstall

```bash
rm -rf ~/.claude/skills/MultiLLM && rm ~/.claude/config/team.yaml && rm -rf ~/.claude/multi-llm && echo "✓ MultiLLM uninstalled"
```
