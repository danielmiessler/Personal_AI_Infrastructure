# Migration Guide: Ollama → Inference Skill

This guide helps you migrate from the Ollama skill to the new multi-backend Inference skill.

## What Changed?

The Ollama skill has been evolved into the **Inference skill**, which supports multiple LLM backends:
- **Ollama** (local, free) - unchanged functionality
- **Claude API** (Anthropic, paid) - new backend for complex reasoning
- **OpenAI** (coming soon) - planned for future release

## Breaking Changes

### 1. Skill Name
- **Old**: `Ollama`
- **New**: `Inference`

### 2. Directory Paths
- **Old**: `$PAI_DIR/skills/Ollama/`
- **New**: `$PAI_DIR/skills/Inference/`

### 3. Package Name
- **Old**: `kai-ollama-skill`
- **New**: `kai-inference-skill`

## Backward Compatibility

These remain unchanged and work identically:

### Environment Variables ✅
All `OLLAMA_*` environment variables still work:
- `OLLAMA_BASE_URL`
- `OLLAMA_DEFAULT_MODEL`
- `OLLAMA_CHAT_MODEL`
- `OLLAMA_CODE_MODEL`
- `OLLAMA_EMBED_MODEL`
- `OLLAMA_TIMEOUT`
- `OLLAMA_ENABLE_ROUTING`

### CLI Interface ✅
All existing command-line flags preserved:
```bash
# All of these still work exactly the same
bun run Generate.ts --prompt "..."
bun run Chat.ts --model llama3.2
bun run Run.ts "prompt" qwen2.5-coder:7b
bun run Embed.ts --text "..."
```

### Default Behavior ✅
Without any configuration changes:
- Defaults to Ollama backend (local)
- All existing workflows continue working
- No API keys required unless you want Claude API

### Tool Names ✅
All tool names unchanged:
- `Generate.ts`
- `Chat.ts`
- `Run.ts`
- `Embed.ts`
- `ListModels.ts`
- `CheckHealth.ts`

## Migration Steps

### Option 1: Clean Migration (Recommended)

1. **Pull latest changes**:
   ```bash
   cd /path/to/Packs/kai-ollama-skill
   git pull
   ```

2. **The skill has already been renamed in the repository** - no manual renaming needed!

3. **Update PAI skill symlink**:
   ```bash
   # Remove old symlink (if exists)
   rm -f $PAI_DIR/skills/Ollama

   # Create new symlink
   ln -s /path/to/Packs/kai-inference-skill/src/skills/Inference $PAI_DIR/skills/Inference
   ```

4. **Install dependencies**:
   ```bash
   cd /path/to/Packs/kai-inference-skill
   bun install
   ```

5. **Update hooks and permissions in `~/.claude/settings.json`**:
   ```bash
   # Replace all occurrences of:
   # skills/Ollama → skills/Inference

   # Example using sed:
   sed -i.bak 's/skills\/Ollama/skills\/Inference/g' ~/.claude/settings.json
   ```

6. **Optionally add Claude API** (optional):
   ```bash
   echo "ANTHROPIC_API_KEY=sk-ant-..." >> $PAI_DIR/.env
   echo "INFERENCE_DEFAULT_BACKEND=ollama" >> $PAI_DIR/.env
   ```

7. **Verify**:
   ```bash
   bun run $PAI_DIR/skills/Inference/Tools/CheckHealth.ts
   bun run $PAI_DIR/skills/Inference/Tools/ListModels.ts
   ```

### Option 2: Keep Old + Install New

If you want to test before migrating:

1. **Install new skill alongside old**:
   ```bash
   ln -s /path/to/Packs/kai-inference-skill/src/skills/Inference $PAI_DIR/skills/Inference
   cd /path/to/Packs/kai-inference-skill && bun install
   ```

2. **Test new skill**:
   ```bash
   bun run $PAI_DIR/skills/Inference/Tools/CheckHealth.ts
   ```

3. **When ready, remove old**:
   ```bash
   rm -rf $PAI_DIR/skills/Ollama
   ```

4. **Update hooks/permissions** as in Option 1 step 5

## New Features

### 1. Multi-Backend Support

Now you can choose between backends:

```bash
# Ollama (local, free)
bun run Run.ts "Review code" --backend ollama --model qwen2.5-coder:7b

# Claude API (best reasoning)
bun run Run.ts "Design a system" --backend anthropic --model claude-sonnet-4.5
```

### 2. Auto-Detection

Model names automatically select the backend:

```bash
# These auto-detect the backend:
bun run Run.ts "Hello" claude-sonnet-4.5    # → Uses Anthropic
bun run Run.ts "Hello" llama3.2             # → Uses Ollama
```

### 3. Unified Model Listing

See models from all backends:

```bash
bun run ListModels.ts                       # All backends
bun run ListModels.ts --backend ollama      # Just Ollama
bun run ListModels.ts --backend anthropic   # Just Claude
```

### 4. Health Checks for All Backends

```bash
bun run CheckHealth.ts
# Shows health status for both Ollama and Claude API
```

## Configuration Updates

### Optional: Migrate to New Variable Names

While `OLLAMA_*` variables still work, you can optionally migrate to the new naming:

**Old (still works)**:
```bash
OLLAMA_DEFAULT_MODEL=llama3.2:latest
OLLAMA_ENABLE_ROUTING=true
```

**New (recommended)**:
```bash
INFERENCE_DEFAULT_BACKEND=ollama
INFERENCE_ENABLE_ROUTING=true

# Backend-specific configs still use original names:
OLLAMA_DEFAULT_MODEL=llama3.2:latest
ANTHROPIC_DEFAULT_MODEL=claude-sonnet-4.5
```

### New Configuration Options

Add these to `$PAI_DIR/.env` to use Claude API:

```bash
# Claude API Backend (optional)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_DEFAULT_MODEL=claude-sonnet-4.5
ANTHROPIC_TIMEOUT=60000

# General Backend Configuration
INFERENCE_DEFAULT_BACKEND=ollama              # Default: ollama
INFERENCE_ENABLE_ROUTING=true                # Smart routing
```

## Troubleshooting

### Issue: "Cannot find skill 'Ollama'"

**Cause**: Skills system is still looking for old path

**Fix**: Update `~/.claude/settings.json` to use `skills/Inference`

### Issue: "Module not found: @anthropic-ai/sdk"

**Cause**: Dependencies not installed

**Fix**:
```bash
cd /path/to/Packs/kai-inference-skill
bun install
```

### Issue: Tools still reference old paths

**Cause**: Using old symlink or wrong directory

**Fix**:
```bash
# Check current symlink
ls -la $PAI_DIR/skills/

# Should point to .../kai-inference-skill/src/skills/Inference
```

### Issue: CheckHealth shows "anthropic backend unhealthy"

**Expected**: If you haven't configured `ANTHROPIC_API_KEY`, this is normal

**Fix**: Either:
1. Ignore (Ollama still works perfectly)
2. Add `ANTHROPIC_API_KEY` to enable Claude API

## Rollback Plan

If you need to rollback:

1. **Check out previous commit** (if using git):
   ```bash
   cd /path/to/Packs/kai-ollama-skill
   git checkout <previous-commit-hash>
   ```

2. **Or restore from backup**:
   ```bash
   # If you kept a backup
   rm -rf $PAI_DIR/skills/Inference
   ln -s /path/to/backup/kai-ollama-skill/src/skills/Ollama $PAI_DIR/skills/Ollama
   ```

3. **Revert settings.json**:
   ```bash
   # Use the .bak file created during migration
   cp ~/.claude/settings.json.bak ~/.claude/settings.json
   ```

## Questions?

- **Repository**: https://github.com/your-repo/kai-inference-skill
- **Issues**: Report problems as GitHub issues
- **Documentation**: See [README.md](README.md), [SKILL.md](src/skills/Inference/SKILL.md)

## Summary

| Aspect | Old (Ollama) | New (Inference) | Impact |
|--------|-------------|-----------------|--------|
| **Skill Name** | `Ollama` | `Inference` | Update paths |
| **Directory** | `skills/Ollama` | `skills/Inference` | Update symlinks |
| **Env Vars** | `OLLAMA_*` | `OLLAMA_*` + `ANTHROPIC_*` | ✅ Backward compatible |
| **CLI Tools** | Same names | Same names | ✅ No changes needed |
| **Default Backend** | Ollama | Ollama | ✅ No changes needed |
| **Functionality** | Local only | Local + API | ✅ Additive only |

**Key Takeaway**: If you only use Ollama and don't need Claude API, the migration is just updating directory paths. All existing functionality works identically.
