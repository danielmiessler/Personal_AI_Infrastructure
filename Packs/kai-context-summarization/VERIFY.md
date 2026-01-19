# Verification Guide: Kai Context Summarization

## Quick Verification

Run these 5 commands to confirm basic functionality:

```bash
# 1. Check library files exist
ls -la $PAI_DIR/lib/context-summarization/
# Expected: summarizer.ts, context-builder.ts

# 2. Check tool files exist
ls -la $PAI_DIR/tools/SummarizeHistory.ts $PAI_DIR/tools/BenchmarkSummarization.ts
# Expected: Both files exist

# 3. Test help command
bun run $PAI_DIR/tools/SummarizeHistory.ts --help 2>&1 | head -5
# Expected: Usage information

# 4. Test summarization (may show "No recent history" if no events yet)
bun run $PAI_DIR/tools/SummarizeHistory.ts --strategy minimal
# Expected: Summary output or "No recent history available"

# 5. Check file sizes (approximate)
wc -c $PAI_DIR/lib/context-summarization/*.ts $PAI_DIR/tools/*.ts 2>/dev/null | tail -1
# Expected: ~15000-25000 total bytes
```

## Mandatory Completion Checklist

### File Verification

- [ ] `$PAI_DIR/lib/context-summarization/summarizer.ts` exists
- [ ] `$PAI_DIR/lib/context-summarization/context-builder.ts` exists
- [ ] `$PAI_DIR/tools/SummarizeHistory.ts` exists
- [ ] `$PAI_DIR/tools/BenchmarkSummarization.ts` exists

### Directory Verification

- [ ] `$PAI_DIR/lib/context-summarization/` directory exists
- [ ] `$PAI_DIR/tools/` directory exists

### Functional Verification

- [ ] `SummarizeHistory.ts --help` shows usage information
- [ ] `SummarizeHistory.ts --list-sessions` runs without error
- [ ] `BenchmarkSummarization.ts --help` shows usage information

### Code Integrity Check

```bash
# Verify file sizes are reasonable (not truncated)
wc -c $PAI_DIR/lib/context-summarization/summarizer.ts
# Expected: ~7000-9000 bytes

wc -c $PAI_DIR/lib/context-summarization/context-builder.ts
# Expected: ~3500-4500 bytes

wc -c $PAI_DIR/tools/SummarizeHistory.ts
# Expected: ~4000-5000 bytes

wc -c $PAI_DIR/tools/BenchmarkSummarization.ts
# Expected: ~3500-4500 bytes
```

## Functional Tests

### Test 1: Summarize with Each Strategy

```bash
# Create test data (if no history exists)
mkdir -p $PAI_DIR/history/raw-outputs/$(date +%Y-%m)

echo '{"source_app":"main","session_id":"test-123","hook_event_type":"PostToolUse","payload":{"tool_name":"Read","tool_input":{"file_path":"/test/file.ts"},"tool_result":{"success":true,"lines_read":100}},"timestamp":'$(date +%s)'000,"timestamp_local":"'$(date +%Y-%m-%d\ %H:%M:%S)'"}' >> $PAI_DIR/history/raw-outputs/$(date +%Y-%m)/$(date +%Y-%m-%d)_all-events.jsonl

echo '{"source_app":"main","session_id":"test-123","hook_event_type":"Stop","payload":{"summary":"Test session completed"},"timestamp":'$(date +%s)'000,"timestamp_local":"'$(date +%Y-%m-%d\ %H:%M:%S)'"}' >> $PAI_DIR/history/raw-outputs/$(date +%Y-%m)/$(date +%Y-%m-%d)_all-events.jsonl
```

```bash
# Test each strategy
for strategy in narrative grouped structured minimal delta; do
  echo "=== Testing $strategy ==="
  bun run $PAI_DIR/tools/SummarizeHistory.ts --strategy $strategy
  echo ""
done
```

**Expected:** Each strategy produces output (different formats)

### Test 2: JSON Output

```bash
bun run $PAI_DIR/tools/SummarizeHistory.ts --json
```

**Expected:** Valid JSON output with `strategy`, `rawEventCount`, `summary` fields

### Test 3: Benchmark Tool

```bash
bun run $PAI_DIR/tools/BenchmarkSummarization.ts
```

**Expected:** Table showing token counts and compression ratios for each strategy

### Test 4: List Sessions

```bash
bun run $PAI_DIR/tools/SummarizeHistory.ts --list-sessions --days 7
```

**Expected:** List of session IDs or "No sessions found"

## Integration Test

### Test with Real History

If kai-history-system has been capturing events:

```bash
# Count events in recent history
wc -l $PAI_DIR/history/raw-outputs/$(date +%Y-%m)/*.jsonl 2>/dev/null

# Summarize and check compression
bun run $PAI_DIR/tools/SummarizeHistory.ts --json | head -10
```

**Expected:** Shows event count and summarized output

### Verify Token Savings

```bash
# Get raw token estimate
RAW=$(cat $PAI_DIR/history/raw-outputs/$(date +%Y-%m)/*.jsonl 2>/dev/null | wc -c)
RAW_TOKENS=$((RAW / 4))

# Get summarized token estimate
SUMMARY=$(bun run $PAI_DIR/tools/SummarizeHistory.ts --strategy narrative 2>/dev/null | wc -c)
SUMMARY_TOKENS=$((SUMMARY / 4))

echo "Raw tokens (est): $RAW_TOKENS"
echo "Summary tokens (est): $SUMMARY_TOKENS"
echo "Compression: $(( (RAW_TOKENS - SUMMARY_TOKENS) * 100 / RAW_TOKENS ))%"
```

**Expected:** Compression ~80-90% for narrative strategy

## Invocation Scenarios

| Action | Command | Output |
|--------|---------|--------|
| Summarize today | `bun run $PAI_DIR/tools/SummarizeHistory.ts` | Markdown summary |
| Maximum compression | `bun run $PAI_DIR/tools/SummarizeHistory.ts -s minimal` | Minimal JSON |
| JSON output | `bun run $PAI_DIR/tools/SummarizeHistory.ts --json` | JSON with metadata |
| Specific session | `bun run $PAI_DIR/tools/SummarizeHistory.ts --session abc123` | Session summary |
| Benchmark | `bun run $PAI_DIR/tools/BenchmarkSummarization.ts` | Comparison table |
| List sessions | `bun run $PAI_DIR/tools/SummarizeHistory.ts -l` | Session IDs |

## Troubleshooting

### "Cannot find module" Error

**Cause:** Import path resolution issue

**Solution:**
```bash
# Check Bun version
bun --version
# Expected: 1.0+

# Try running with explicit path
cd $PAI_DIR/tools && bun run SummarizeHistory.ts --help
```

### Empty Output

**Cause:** No history events found

**Solution:**
```bash
# Check if history exists
find $PAI_DIR/history/raw-outputs -name "*.jsonl" -type f

# Check recent file content
tail -5 $PAI_DIR/history/raw-outputs/$(date +%Y-%m)/$(date +%Y-%m-%d)_all-events.jsonl
```

### Benchmark Shows 0 Events

**Cause:** No JSONL files in expected location

**Solution:**
1. Verify kai-history-system is installed
2. Check hook registration in `$PAI_DIR/../settings.json`
3. Trigger some events (run tools, edit files)
4. Re-run benchmark

### Unexpected Token Counts

**Cause:** Token estimation is approximate (4 chars/token)

**Note:** Actual token counts depend on the tokenizer used by the LLM. The benchmark uses a conservative approximation. Real savings may be higher.

## Success Criteria

Installation is complete when:

1. ✅ All 4 files are installed at correct paths
2. ✅ `--help` commands work for both tools
3. ✅ At least one strategy produces output
4. ✅ File sizes match expected ranges
5. ✅ No import/module errors when running tools
