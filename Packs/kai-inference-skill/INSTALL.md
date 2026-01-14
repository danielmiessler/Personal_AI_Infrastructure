# Ollama Skill Installation Guide

This guide walks you through installing the Ollama skill for your Personal AI Infrastructure (PAI).

## Prerequisites

- **PAI Core** installed (`kai-core-install`)
- **Hook System** installed (`kai-hook-system`)
- **Bun** runtime installed
- **Ollama** installed on your system

## Installation Steps

### 1. Install Ollama

If you don't have Ollama installed:

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows
# Download from https://ollama.com/download
```

Verify installation:
```bash
ollama --version
```

### 2. Start Ollama Server

```bash
# Start in background
ollama serve

# Or run as service (macOS)
brew services start ollama

# Linux systemd
systemctl --user start ollama
```

Verify server is running:
```bash
curl http://localhost:11434/api/tags
```

### 3. Pull Initial Models

Download some recommended models:

```bash
# General purpose (3GB)
ollama pull llama3.2:latest

# Fast model (1.9GB)
ollama pull llama3.2:3b

# Code model (4.7GB)
ollama pull qwen2.5-coder:7b

# Embeddings (274MB)
ollama pull nomic-embed-text
```

Verify models:
```bash
ollama list
```

### 4. Copy Skill Files

Copy the Ollama skill to your PAI directory:

```bash
# Set PAI_DIR if not already set
export PAI_DIR="${PAI_DIR:-$HOME/.claude/pai}"

# Copy skill files
cp -r src/skills/Ollama $PAI_DIR/skills/

# Verify
ls -la $PAI_DIR/skills/Ollama
```

### 5. Configure Environment

Add Ollama configuration to `$PAI_DIR/.env`:

```bash
cat >> $PAI_DIR/.env << 'EOF'

# ============================================================================
# Ollama Configuration
# ============================================================================

# Server
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_TIMEOUT=30000

# Default Models
OLLAMA_DEFAULT_MODEL=llama3.2:latest
OLLAMA_CHAT_MODEL=llama3.2:3b
OLLAMA_CODE_MODEL=qwen2.5-coder:7b
OLLAMA_EMBED_MODEL=nomic-embed-text:latest

# Features
OLLAMA_ENABLE_ROUTING=true

EOF
```

### 6. Register Hooks

Merge the hook configuration into your Claude Code settings:

```bash
# Location: ~/.claude/settings.json

# Add to the "hooks" section:
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "~/.bun/bin/bun run $PAI_DIR/skills/Ollama/Tools/CheckHealth.ts"
          }
        ]
      }
    ]
  }
}
```

### 7. Add Permissions

Merge the permissions into your Claude Code settings:

```bash
# Location: ~/.claude/settings.json

# Add to the "permissions.allow" array:
{
  "permissions": {
    "allow": [
      "Read(//$PAI_DIR/skills/Ollama/**)",
      "Bash(bun run $PAI_DIR/skills/Ollama/Tools/*.ts:*)",
      "Bash(ollama:*)",
      "Bash(ollama serve:*)",
      "Bash(ollama list:*)",
      "Bash(ollama pull:*)"
    ]
  }
}
```

### 8. Test Installation

Verify everything works:

```bash
# Test health check
bun run $PAI_DIR/skills/Ollama/Tools/CheckHealth.ts
echo "Exit code: $?"

# Test text generation
bun run $PAI_DIR/skills/Ollama/Tools/Generate.ts \
  --prompt "Say hello in 5 words"

# Test model listing
bun run $PAI_DIR/skills/Ollama/Tools/ListModels.ts

# Test embeddings
bun run $PAI_DIR/skills/Ollama/Tools/Embed.ts \
  --text "Test embedding" \
  --output length
```

Expected output:
- ✅ Health check exits with code 0
- ✅ Generate.ts produces text response
- ✅ ListModels.ts shows installed models
- ✅ Embed.ts shows vector dimensions

### 9. Start Claude Code Session

Start a new Claude Code session to trigger the SessionStart hook:

```bash
claude-code
```

You should see the skill context loaded. Try:
```
You: "List my local ollama models"
You: "Generate text locally: explain recursion"
You: "Review this function locally"
```

## Troubleshooting

### Ollama Not Running

**Error**: `Cannot connect to Ollama`

**Solution**:
```bash
# Check if running
ps aux | grep ollama

# Start if not running
ollama serve

# Or as service
brew services start ollama  # macOS
systemctl start ollama      # Linux
```

### Models Not Found

**Error**: `model not found`

**Solution**:
```bash
# List available models
ollama list

# Pull missing model
ollama pull llama3.2
```

### Permission Denied

**Error**: `Permission denied` when running tools

**Solution**:
```bash
# Make tools executable
chmod +x $PAI_DIR/skills/Ollama/Tools/*.ts

# Or run with bun explicitly
bun run $PAI_DIR/skills/Ollama/Tools/Generate.ts --help
```

### Slow Performance

**Issue**: Generation is very slow

**Solutions**:
1. **Use smaller models**: `llama3.2:3b` instead of `:latest`
2. **Enable GPU**: Ollama auto-detects GPU, verify with `ollama ps`
3. **Use quantized models**: Q4_K_M versions are faster
4. **Check CPU usage**: Close other applications
5. **Increase RAM**: Large models need more memory

### Hook Not Firing

**Issue**: SessionStart hook doesn't run

**Solution**:
```bash
# Verify hook registration
cat ~/.claude/settings.json | grep -A 10 SessionStart

# Verify file exists
ls -la $PAI_DIR/skills/Ollama/Tools/CheckHealth.ts

# Test hook manually
~/.bun/bin/bun run $PAI_DIR/skills/Ollama/Tools/CheckHealth.ts
```

## Configuration Tips

### Model Selection

**For Speed**: Use 3B parameter models
```bash
OLLAMA_DEFAULT_MODEL=llama3.2:3b
OLLAMA_CHAT_MODEL=llama3.2:3b
```

**For Quality**: Use 7B+ parameter models
```bash
OLLAMA_DEFAULT_MODEL=mistral:latest
OLLAMA_CODE_MODEL=qwen2.5-coder:14b
```

**For Balance**: Mix and match
```bash
OLLAMA_CHAT_MODEL=llama3.2:3b          # Fast for chat
OLLAMA_CODE_MODEL=qwen2.5-coder:7b     # Quality for code
OLLAMA_EMBED_MODEL=nomic-embed-text    # Efficient embeddings
```

### Custom Ollama Location

If Ollama runs on different port or host:

```bash
# Remote Ollama server
OLLAMA_BASE_URL=http://192.168.1.100:11434

# Custom port
OLLAMA_BASE_URL=http://localhost:8080
```

### Timeout Adjustment

For large models or slow machines:

```bash
# Increase timeout to 60 seconds
OLLAMA_TIMEOUT=60000

# Very large models
OLLAMA_TIMEOUT=120000
```

## Verification Checklist

After installation, verify:

- [ ] Ollama is installed and running
- [ ] At least one model is pulled
- [ ] Skill files copied to `$PAI_DIR/skills/Ollama`
- [ ] Environment variables added to `$PAI_DIR/.env`
- [ ] Hooks registered in `~/.claude/settings.json`
- [ ] Permissions added to `~/.claude/settings.json`
- [ ] CheckHealth.ts runs successfully
- [ ] Generate.ts produces output
- [ ] ListModels.ts shows models
- [ ] Claude Code session loads skill

## Next Steps

1. **Read SKILL.md**: Learn about available workflows
2. **Try Workflows**: Test CodeReview, Summarize, Experiment
3. **Customize Models**: Download models for your use case
4. **Optimize Config**: Tune timeouts and model selection
5. **Explore Tools**: Try Chat.ts, Embed.ts
6. **Check VERIFY.md**: Run comprehensive verification tests

## Uninstallation

To remove the Ollama skill:

```bash
# Remove skill files
rm -rf $PAI_DIR/skills/Ollama

# Remove from settings.json
# - Remove SessionStart hook for CheckHealth.ts
# - Remove permissions for Ollama tools

# Remove from .env
# - Delete Ollama configuration section

# Optional: Uninstall Ollama
brew uninstall ollama               # macOS
sudo rm -rf /usr/local/bin/ollama   # Linux
```

## Support

- **Ollama Docs**: https://github.com/ollama/ollama
- **Model Library**: https://ollama.com/library
- **PAI Issues**: Report in PAI repository
- **Ollama Issues**: Report in Ollama repository

## Advanced Configuration

### GPU Acceleration

Ollama automatically uses GPU if available. Verify:

```bash
# Check GPU usage during generation
watch -n 1 nvidia-smi  # NVIDIA

# Check Ollama is using GPU
ollama ps
```

### Model Customization

Create custom models with Modelfile:

```bash
# Create Modelfile
cat > Modelfile << 'EOF'
FROM llama3.2
PARAMETER temperature 0.5
SYSTEM You are a helpful coding assistant specialized in TypeScript.
EOF

# Create model
ollama create my-ts-assistant -f Modelfile

# Use in PAI
OLLAMA_CODE_MODEL=my-ts-assistant
```

### Memory Management

For systems with limited RAM:

```bash
# Use smaller models
ollama pull llama3.2:3b
ollama pull qwen2.5-coder:1.5b

# Limit concurrent models
# Ollama loads one model at a time by default
```

### Background Service

Run Ollama as system service:

**macOS**:
```bash
brew services start ollama
brew services enable ollama
```

**Linux (systemd)**:
```bash
systemctl --user enable ollama
systemctl --user start ollama
```

## Resources

- Ollama: https://ollama.com
- Model cards: https://ollama.com/library
- API reference: https://github.com/ollama/ollama/blob/main/docs/api.md
- Discord: https://discord.gg/ollama
