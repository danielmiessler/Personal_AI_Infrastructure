<!--
================================================================================
PAI CORE - SYSTEM/THEFABRICSYSTEM.md
================================================================================

PURPOSE:
Native Fabric patterns execution reference. Documents how to use the 248+
Fabric patterns for content analysis, extraction, and transformation.

LOCATION:
- Kai (Private): ${PAI_DIR}/skills/CORE/SYSTEM/THEFABRICSYSTEM.md
- PAI Pack: Packs/pai-core-install/src/skills/CORE/SYSTEM/THEFABRICSYSTEM.md

CUSTOMIZATION:
- [ ] Update patterns with: fabric -U
- [ ] Add custom patterns to Patterns/ directory
- [ ] Configure pattern aliases

RELATED FILES:
- TOOLS.md - CLI utilities reference
- PAISYSTEMARCHITECTURE.md - Core architecture

LAST UPDATED: 2026-01-08
VERSION: 1.1.0
================================================================================
-->

---
name: FabricReference
description: Native Fabric patterns execution details and CLI usage. Reference material for on-demand loading.
---

# Native Fabric Patterns Reference

**Quick reference for Fabric pattern execution.**

---

## Native Fabric Patterns (Always Active)

**Location:** `${PAI_DIR}/skills/CORE/Tools/fabric/Patterns/`

PAI maintains 248+ Fabric patterns locally for native execution—no CLI spawning needed.

### Route Triggers
- "use extract_wisdom" / "run extract_wisdom" → Native pattern execution
- "use fabric pattern X" / "apply pattern X" → Native pattern execution
- Any pattern name (summarize, analyze_claims, create_summary, etc.) → Native execution

### How Native Patterns Work

Instead of calling `fabric -p pattern_name`, PAI:
1. Reads `tools/fabric/Patterns/{pattern_name}/system.md`
2. Applies the pattern instructions directly as a prompt
3. Returns results without external CLI calls

**Example:**
```
User: "Extract wisdom from this transcript"
→ PAI reads tools/fabric/Patterns/extract_wisdom/system.md
→ Applies pattern to content
→ Returns structured output (IDEAS, INSIGHTS, QUOTES, etc.)
```

### When to Still Use Fabric CLI

Only use `fabric` command for:
- **`-U`** - Update patterns: `fabric -U`
- **`-y`** - YouTube transcripts: `fabric -y "URL"`
- **`-l`** - List patterns: `fabric -l`

### Updating Patterns

```bash
${PAI_DIR}/skills/CORE/Tools/fabric/update-patterns.sh
```

Or directly:

```bash
fabric -U
```

---

## Popular Patterns

| Pattern | Purpose |
|---------|---------|
| `extract_wisdom` | Extract key insights from content |
| `summarize` | Create concise summary |
| `analyze_claims` | Fact-check claims |
| `create_summary` | Structured summary with sections |
| `improve_writing` | Enhance prose quality |
| `explain_code` | Explain code functionality |
| `create_mermaid_diagram` | Generate Mermaid diagrams |

---

## Pattern Structure

Each pattern directory contains:
```
Patterns/{pattern_name}/
├── system.md    # The pattern prompt
└── user.md      # Optional: user prompt template
```

**system.md format:**
```markdown
# IDENTITY and PURPOSE

You are an expert at [domain]. Your task is to [purpose].

# STEPS

1. [Step one]
2. [Step two]
...

# OUTPUT INSTRUCTIONS

- Output in [format]
- Include [sections]

# INPUT

INPUT:
```

---

## See Also

- Fabric GitHub: https://github.com/danielmiessler/fabric
- `${PAI_DIR}/skills/CORE/Tools/fabric/Patterns/` - All pattern definitions
