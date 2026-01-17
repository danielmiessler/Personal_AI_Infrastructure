---
name: FabricReference
description: Native Fabric patterns execution details and CLI usage. Reference material extracted from SKILL.md for on-demand loading.
created: 2025-12-17
extracted_from: SKILL.md lines 950-991
---

# Native Fabric Patterns Reference

**Quick reference in SKILL.md** → For full details, see this file

---

## 🧵 Native Fabric Patterns (Always Active)

**Location:** `~/.claude/skills/CORE/Tools/fabric/Patterns/`

PAI maintains 248 Fabric patterns locally for native execution—no CLI spawning needed.

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
~/.claude/skills/CORE/Tools/fabric/update-patterns.sh
```

---

**See Also:**
- SKILL.md > Fabric Patterns - Condensed reference
- Prompting.md - Native Fabric Patterns section (comprehensive)
- Tools/fabric/Patterns/ - All 248 pattern definitions
