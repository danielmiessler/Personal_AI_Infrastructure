---
name: fabric
description: Native Fabric pattern execution for Claude Code. USE WHEN processing content with Fabric patterns (extract_wisdom, summarize, analyze_claims, threat modeling, etc.). Patterns run natively in Claude's context - no CLI spawning needed. Only use fabric CLI for YouTube transcripts (-y) or pattern updates (-U).
---

# Fabric Skill - Native Pattern Execution

## The Key Insight

**Fabric patterns are just markdown prompts.** Instead of spawning `fabric -p pattern_name` for every task, Claude Code reads and applies patterns directly from `tools/patterns/`. This gives you:

- **Your Claude subscription's full power** - Opus/Sonnet intelligence, not Fabric's default model
- **Full conversation context** - Patterns work with your entire session
- **No CLI overhead** - Faster execution, no process spawning
- **Same 248 patterns** - All the patterns you know, just applied natively

## When to Use Native Patterns (Default)

For any pattern-based processing:
1. Read `tools/patterns/{pattern_name}/system.md`
2. Apply the pattern instructions directly to the content
3. Return results without external CLI calls

**Examples:**
```
User: "Extract wisdom from this transcript"
→ Read tools/patterns/extract_wisdom/system.md
→ Apply pattern to content
→ Return structured output (IDEAS, INSIGHTS, QUOTES, etc.)

User: "Create a threat model for this API"
→ Read tools/patterns/create_threat_model/system.md
→ Apply pattern to the API description
→ Return threat model

User: "Summarize this article"
→ Read tools/patterns/summarize/system.md
→ Apply pattern to article
→ Return summary
```

## When to Still Use Fabric CLI

Only use the `fabric` command for operations that require external services:

| Operation | Command | Why CLI Needed |
|-----------|---------|----------------|
| YouTube transcripts | `fabric -y "URL"` | Downloads video, extracts transcript |
| Update patterns | `fabric -U` | Pulls from GitHub |
| List patterns | `fabric -l` | Quick reference |

**For everything else, use native patterns.**

## Pattern Categories (248 Total)

### Threat Modeling & Security
- `create_threat_model` - General threat modeling
- `create_stride_threat_model` - STRIDE methodology
- `create_threat_scenarios` - Threat scenario generation
- `analyze_threat_report` - Threat report analysis
- `create_sigma_rules` - SIGMA detection rules
- `write_nuclei_template_rule` - Nuclei scanner templates
- `write_semgrep_rule` - Semgrep static analysis rules

### Summarization
- `summarize` - General summarization
- `create_5_sentence_summary` - Ultra-concise summary
- `summarize_paper` - Academic paper summary
- `summarize_meeting` - Meeting notes
- `youtube_summary` - Video summary

### Wisdom Extraction
- `extract_wisdom` - General wisdom extraction
- `extract_insights` - Key insights
- `extract_main_idea` - Core message
- `extract_recommendations` - Actionable recommendations
- `extract_alpha` - High-value insights

### Analysis
- `analyze_claims` - Claim verification
- `analyze_code` - Code analysis
- `analyze_malware` - Malware analysis
- `analyze_paper` - Academic paper analysis
- `analyze_debate` - Debate analysis

### Content Creation
- `create_prd` - Product Requirements Document
- `create_design_document` - Design documentation
- `create_mermaid_visualization` - Mermaid diagrams
- `write_essay` - Essay writing
- `create_report_finding` - Security findings

### Improvement
- `improve_writing` - Writing enhancement
- `improve_prompt` - Prompt engineering
- `review_code` - Code review
- `humanize` - Humanize AI text

## Updating Patterns

Run the update script to sync latest patterns from upstream:

```bash
./tools/update-patterns.sh
```

This will:
1. Run `fabric -U` to fetch upstream updates
2. Sync patterns to `tools/patterns/`

**Requirements:** `fabric` CLI must be installed (`go install github.com/danielmiessler/fabric@latest`)

## Pattern Structure

Each pattern directory contains:
- `system.md` - The main prompt/instructions (this is what gets applied)
- `README.md` - Documentation (optional)
- `user.md` - Example user input (optional)

## Why Native > CLI

| Aspect | Native Patterns | fabric CLI |
|--------|-----------------|------------|
| Model | Your subscription (Opus/Sonnet) | Fabric's configured model |
| Context | Full conversation history | Just the input |
| Speed | Instant (no process spawn) | ~1-2s CLI overhead |
| Integration | Seamless with Claude Code | External tool call |

**The patterns are identical.** The difference is execution context and model power.

## Full Pattern List

See all available patterns:
```bash
ls tools/patterns/
```

Or browse: `tools/patterns/{pattern_name}/system.md`
