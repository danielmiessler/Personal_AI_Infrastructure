# PAI Status Line - Verification Checklist

> Verify your PAI Status Line installation is complete and working

## Quick Verification

Run this one-liner to check all components:

```bash
echo "1. Script exists: $(test -f ~/.claude/statusline-command.sh && echo '✓' || echo '✗')"
echo "2. Script executable: $(test -x ~/.claude/statusline-command.sh && echo '✓' || echo '✗')"
echo "3. Settings configured: $(grep -q 'statusLine' ~/.claude/settings.json 2>/dev/null && echo '✓' || echo '✗')"
echo "4. jq installed: $(command -v jq >/dev/null && echo '✓' || echo '✗')"
echo "5. MEMORY dirs exist: $(test -d ~/.claude/MEMORY/STATE && echo '✓' || echo '✗')"
```

Expected output:
```
1. Script exists: ✓
2. Script executable: ✓
3. Settings configured: ✓
4. jq installed: ✓
5. MEMORY dirs exist: ✓
```

## Detailed Verification

### 1. Script Installation

**Check file exists and is executable:**
```bash
ls -la ~/.claude/statusline-command.sh
```

Expected: `-rwxr-xr-x` permissions, ~45KB file size

**Check script syntax:**
```bash
bash -n ~/.claude/statusline-command.sh && echo "Syntax OK"
```

Expected: `Syntax OK` with no errors

### 2. Settings Configuration

**Check settings.json contains statusLine:**
```bash
jq '.statusLine' ~/.claude/settings.json
```

Expected:
```json
{
  "type": "command",
  "command": "${PAI_DIR}/statusline-command.sh"
}
```

### 3. Dependencies

**Check jq is installed:**
```bash
jq --version
```

Expected: `jq-1.6` or similar

**Check curl is available:**
```bash
curl --version | head -1
```

Expected: `curl 8.x.x` or similar

### 4. Test Script Output

**Run with sample input:**
```bash
echo '{"workspace":{"current_dir":"'$(pwd)'"},"model":{"display_name":"opus"},"version":"1.0.17","cost":{"total_duration_ms":5000},"context_window":{"current_usage":{"input_tokens":1000},"context_window_size":200000}}' | ~/.claude/statusline-command.sh
```

Expected: Colorful status line output with:
- PAI STATUSLINE header
- Location and time
- Environment info (CC version, PAI version)
- Context bar with percentage
- Git status (if in a git repo)
- Memory statistics
- Learning section

### 5. Location/Weather (Optional)

**Test location API:**
```bash
curl -s "http://ip-api.com/json/?fields=city,regionName" | jq .
```

Expected: Your city and region

**Test weather API:**
```bash
curl -s "https://api.open-meteo.com/v1/forecast?latitude=37.77&longitude=-122.42&current=temperature_2m" | jq '.current'
```

Expected: Temperature data

### 6. Ratings/Sparklines (Optional)

**Check ratings file exists:**
```bash
ls -la ~/.claude/MEMORY/LEARNING/SIGNALS/ratings.jsonl 2>/dev/null || echo "No ratings file yet"
```

**Check ratings count:**
```bash
wc -l ~/.claude/MEMORY/LEARNING/SIGNALS/ratings.jsonl 2>/dev/null || echo "0 ratings"
```

### 7. Live Test in Claude Code

1. Start a new Claude Code session
2. The status line should appear after the first response
3. Verify all sections are populated:
   - [ ] PAI header with location/time
   - [ ] Environment line with versions
   - [ ] Context bar with percentage
   - [ ] Git status (if in repo)
   - [ ] Memory statistics
   - [ ] Learning section with ratings (if available)
   - [ ] Quote (if API key configured)

## Common Issues

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| No output | Script not found | Check path in settings.json |
| No colors | Terminal doesn't support true color | Use Kitty/iTerm2/modern terminal |
| "jq: not found" | jq not installed | `brew install jq` |
| Empty context bar | No context data passed | Normal on first response |
| No sparklines | No ratings in file | Add ratings via explicit rating capture |
| No weather | API unreachable or cached | Check network, clear cache |

## Success Criteria

Your installation is successful when:

1. ✓ Status line appears after Claude Code responses
2. ✓ Context bar shows usage percentage
3. ✓ Git status reflects current repo state
4. ✓ Memory counts are displayed
5. ✓ No error messages in terminal

## Support

If verification fails:
1. Check the [Troubleshooting section in INSTALL.md](./INSTALL.md#troubleshooting)
2. Review script output for error messages
3. Ensure all prerequisites are met
