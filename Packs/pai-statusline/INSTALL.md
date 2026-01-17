# PAI Status Line - Installation Guide

> AI-assisted installation wizard for the PAI Status Line pack

## Prerequisites

Before installing, verify:

1. **Claude Code** is installed and working
2. **PAI directory** exists at `~/.claude` (or your custom `$PAI_DIR`)
3. **jq** is installed (required for JSON parsing): `brew install jq` or `apt install jq`
4. **curl** is available (for weather/location/quotes)

## Installation Steps

### Step 1: Copy the Status Line Script

Copy `statusline-command.sh` from `src/` to your PAI directory:

```bash
# From this pack directory:
cp src/statusline-command.sh ~/.claude/statusline-command.sh

# Make executable
chmod +x ~/.claude/statusline-command.sh
```

**Verification:**
```bash
ls -la ~/.claude/statusline-command.sh
# Should show: -rwxr-xr-x ... statusline-command.sh
```

### Step 2: Configure settings.json

Add the statusLine configuration to your `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "${PAI_DIR}/statusline-command.sh"
  }
}
```

**If settings.json doesn't exist**, create it:
```json
{
  "statusLine": {
    "type": "command",
    "command": "${PAI_DIR}/statusline-command.sh"
  }
}
```

**If settings.json exists**, add the `statusLine` block to the existing JSON object.

### Step 3: Create Required Directories

The status line reads from several MEMORY subdirectories. Ensure they exist:

```bash
mkdir -p ~/.claude/MEMORY/LEARNING/SIGNALS
mkdir -p ~/.claude/MEMORY/WORK
mkdir -p ~/.claude/MEMORY/RESEARCH
mkdir -p ~/.claude/MEMORY/STATE
```

### Step 4: Initialize Ratings File (Optional)

If you want learning sparklines immediately, create an initial ratings file:

```bash
# Create empty ratings file
touch ~/.claude/MEMORY/LEARNING/SIGNALS/ratings.jsonl

# Or add a sample rating
echo '{"timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","rating":7,"source":"explicit"}' >> ~/.claude/MEMORY/LEARNING/SIGNALS/ratings.jsonl
```

### Step 5: Configure Quote API (Optional)

For unlimited inspirational quotes, get a free API key from [ZenQuotes](https://zenquotes.io/):

Add to `~/.claude/.env`:
```bash
ZENQUOTES_API_KEY=your_api_key_here
```

Without an API key, quotes still work but are rate-limited.

## Post-Installation

### Restart Claude Code

The status line will appear after restarting Claude Code or starting a new session.

### Test the Script Manually

You can test the script directly:

```bash
echo '{"workspace":{"current_dir":"'$(pwd)'"},"model":{"display_name":"claude-3-opus"},"version":"1.0.17","cost":{"total_duration_ms":5000},"context_window":{"current_usage":{"input_tokens":1000,"output_tokens":500},"context_window_size":200000}}' | ~/.claude/statusline-command.sh
```

This should output a colorful status line display.

## Troubleshooting

### Status line not appearing

1. **Check settings.json syntax**: Validate JSON with `jq . ~/.claude/settings.json`
2. **Check script permissions**: Ensure `chmod +x` was applied
3. **Check script path**: Verify `~/.claude/statusline-command.sh` exists

### Colors not displaying

1. **Terminal compatibility**: Requires true color support (24-bit)
2. **Check TERM**: Should be `xterm-256color` or similar
3. **Kitty/iTerm2**: Both support true color out of the box

### Weather/location not showing

1. **Check network**: `curl -s http://ip-api.com/json/`
2. **Check cache**: Remove stale cache with `rm ~/.claude/MEMORY/STATE/location-cache.json`
3. **Firewall**: Ensure outbound HTTP is allowed

### Sparklines empty

1. **No ratings yet**: Add ratings to populate sparklines
2. **Check ratings file**: `cat ~/.claude/MEMORY/LEARNING/SIGNALS/ratings.jsonl`
3. **jq installed**: Verify with `which jq`

## Customization

### Adjust Context Baseline

If your context percentage seems off, adjust `CONTEXT_BASELINE` in the script:

```bash
# Line ~35 in statusline-command.sh
CONTEXT_BASELINE=22600  # Adjust based on your system prompt size
```

### Change Colors

Colors are defined in the `COLOR PALETTE` section (~line 147). Modify RGB values to match your terminal theme.

### Disable Sections

Comment out sections in the script to disable them. Each section is marked with a header:
```bash
# ═══════════════════════════════════════════════════════════════════════════════
# LINE 5: MEMORY
# ═══════════════════════════════════════════════════════════════════════════════
```

---

**Next:** See [VERIFY.md](./VERIFY.md) for verification checklist
