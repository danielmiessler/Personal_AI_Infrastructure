# Installation Guide: Kai Context Summarization

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../../README.md#what-is-pai)

**What is a Pack?** See: [Pack System](../../README.md#pack-system)

## Prerequisites

- **Bun runtime** (v1.0+): `curl -fsSL https://bun.sh/install | bash`
- **Claude Code** (or compatible agent system)
- **kai-history-system** installed and capturing events

## Pre-Installation: System Analysis

### Step 0.1: Verify Dependencies

Confirm kai-history-system is installed:

```bash
# Check history system hooks exist
ls -la $PAI_DIR/hooks/capture-all-events.ts
ls -la $PAI_DIR/hooks/stop-hook.ts

# Expected: Files exist
```

### Step 0.2: Verify History Directory

Confirm history is being captured:

```bash
# Check for JSONL files
ls -la $PAI_DIR/history/raw-outputs/

# Expected: YYYY-MM directories with .jsonl files
```

### Step 0.3: Set Environment Variables

Ensure PAI_DIR is set:

```bash
echo $PAI_DIR
# Expected: /path/to/your/pai/directory (e.g., ~/.config/pai)

# If not set, add to your shell profile:
export PAI_DIR="$HOME/.config/pai"
```

## Step 1: Create Directory Structure

Create the required directories:

```bash
mkdir -p $PAI_DIR/lib/context-summarization
mkdir -p $PAI_DIR/tools
```

## Step 2: Install Library Files

Copy the summarization library:

```bash
# Copy summarizer.ts
cp src/lib/summarizer.ts $PAI_DIR/lib/context-summarization/summarizer.ts

# Copy context-builder.ts
cp src/lib/context-builder.ts $PAI_DIR/lib/context-summarization/context-builder.ts
```

Verify library files:

```bash
ls -la $PAI_DIR/lib/context-summarization/
# Expected:
# summarizer.ts
# context-builder.ts
```

## Step 3: Install CLI Tools

Copy the CLI tools:

```bash
# Copy SummarizeHistory tool
cp src/tools/SummarizeHistory.ts $PAI_DIR/tools/SummarizeHistory.ts

# Copy BenchmarkSummarization tool
cp src/tools/BenchmarkSummarization.ts $PAI_DIR/tools/BenchmarkSummarization.ts

# Make executable
chmod +x $PAI_DIR/tools/SummarizeHistory.ts
chmod +x $PAI_DIR/tools/BenchmarkSummarization.ts
```

Verify tools:

```bash
ls -la $PAI_DIR/tools/
# Expected:
# SummarizeHistory.ts
# BenchmarkSummarization.ts
```

## Step 4: Verify Installation

Run the verification steps in [VERIFY.md](VERIFY.md).

Quick smoke test:

```bash
# Test summarization tool
bun run $PAI_DIR/tools/SummarizeHistory.ts --help

# Expected: Help output with usage information
```

## Step 5: (Optional) Run Benchmark

Validate token savings with your actual history:

```bash
bun run $PAI_DIR/tools/BenchmarkSummarization.ts
```

Expected output shows compression ratios for each strategy.

## Post-Installation Notes

### No Hooks Required

This is a library pack - it does not register any hooks. It provides tools and libraries that can be used:

1. **Manually** via CLI tools
2. **Programmatically** by importing the libraries
3. **In custom hooks** that inject context

### Integration with Context Injection

To use summarized context in your prompts:

```typescript
import { buildContext } from '$PAI_DIR/lib/context-summarization/context-builder';

// In your context injection hook or tool:
const context = buildContext({
  strategy: 'narrative',
  daysBack: 1,
  maxEvents: 50
});

// Inject context.summary instead of raw events
```

### Recommended Strategy

Start with `narrative` strategy (default):
- 86.7% token reduction
- 100% information preserved
- Human-readable output

Switch to `minimal` only if:
- You need maximum cost savings
- You can tolerate some information loss
- Context is supplementary, not critical

## Anti-Simplification Directive

**CRITICAL FOR AI AGENTS:**

This installation MUST be completed EXACTLY as specified. DO NOT:
- Skip any files
- Summarize or simplify code
- Modify file paths
- Skip verification steps

All four files must be installed:
1. `$PAI_DIR/lib/context-summarization/summarizer.ts`
2. `$PAI_DIR/lib/context-summarization/context-builder.ts`
3. `$PAI_DIR/tools/SummarizeHistory.ts`
4. `$PAI_DIR/tools/BenchmarkSummarization.ts`

## Troubleshooting

### "No JSONL file found"

The benchmark tool couldn't find history files.

**Solution:** Ensure kai-history-system is installed and has captured events:
```bash
ls $PAI_DIR/history/raw-outputs/*/
```

### "No recent history available"

The summarize tool found no events.

**Solution:**
1. Check if history exists: `ls $PAI_DIR/history/raw-outputs/`
2. Try increasing days: `--days 7`
3. Ensure kai-history-system hooks are registered

### Import errors

TypeScript import paths may need adjustment.

**Solution:** Ensure Bun can resolve the lib path:
```bash
# Test import
bun -e "import { summarize } from '$PAI_DIR/lib/context-summarization/summarizer'; console.log(summarize)"
```
