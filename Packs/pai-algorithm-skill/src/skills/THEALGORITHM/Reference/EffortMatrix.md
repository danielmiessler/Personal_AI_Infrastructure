# Effort Matrix Reference

Quick reference for effort level characteristics and when to use each.

## Effort Levels Overview

| Level | Thinking | Agents | Iteration | Model | Use When |
|-------|----------|--------|-----------|-------|----------|
| TRIVIAL | None | None | None | - | Skip THE ALGORITHM entirely |
| QUICK | Minimal | haiku | 1 | haiku | Simple, fast, low-risk |
| STANDARD | Normal | sonnet | 1-2 | sonnet | Default for most work |
| THOROUGH | Extended | sonnet | 2-3 | sonnet | Important, complex |
| DETERMINED | UltraThink | opus | Until done | opus | Critical, unlimited |

## Detection Keywords

### TRIVIAL (Skip Algorithm)
- "quick", "just", "simple", "tiny", "minor"
- Single-line fixes, typos, obvious changes
- **Action:** Do immediately, no ISC needed

### QUICK
- "fast", "brief", "quickly", "don't overthink"
- "straightforward", "obvious"
- Simple features, quick fixes, low complexity

### STANDARD (Default)
- Most requests without explicit effort markers
- Normal features, typical bugs, standard implementation
- **This is the default if no signals detected**

### THOROUGH
- "thorough", "careful", "comprehensive", "detailed"
- "important", "critical path", "production"
- Complex features, sensitive changes, architectural work

### DETERMINED
- "until done", "don't stop", "keep going"
- "overnight", "whatever it takes", "unlimited"
- Mission-critical, must succeed, no time limit

## Trait Modifiers by Effort

```typescript
const EFFORT_TRAITS = {
  QUICK: {
    traits: ["rapid", "pragmatic"],
    model: "haiku",
  },
  STANDARD: {
    traits: ["analytical", "systematic"],
    model: "sonnet",
  },
  THOROUGH: {
    traits: ["thorough", "meticulous"],
    model: "sonnet",
  },
  DETERMINED: {
    traits: ["thorough", "meticulous", "adversarial"],
    model: "opus",
  },
};
```

## Phase-Specific Traits

Some phases override default traits:

| Phase | Override Traits | Reason |
|-------|-----------------|--------|
| THINK | analytical, exploratory | Need divergent thinking |
| VERIFY | skeptical, meticulous, adversarial | Independent validation |
| LEARN | reflective, analytical | Pattern recognition |

## Model Selection

| Model | Use For | Characteristics |
|-------|---------|-----------------|
| haiku | QUICK tasks, simple execution | Fast, cheap, good enough |
| sonnet | STANDARD/THOROUGH tasks | Balanced, reliable |
| opus | DETERMINED tasks, complex analysis | Deep thinking, highest quality |

## Cost/Speed Tradeoffs

```
QUICK:    haiku  = lowest cost, fastest
STANDARD: sonnet = balanced
THOROUGH: sonnet = same cost, more iterations
DETERMINED: opus = highest cost, slowest, best quality
```

## Override Examples

User can override detected effort:

```
"Do this thoroughly" → THOROUGH (even if task seems simple)
"Quick fix please" → QUICK (even if task seems complex)
"Take your time" → THOROUGH
"Don't overthink it" → QUICK
```

## Confidence Levels

The EffortClassifier reports confidence:

| Confidence | Meaning | Action |
|------------|---------|--------|
| HIGH | Clear signals detected | Use detected level |
| MEDIUM | Some signals, ambiguous | Use detected, note uncertainty |
| LOW | No clear signals | Default to STANDARD |

## ISC Row Counts by Effort

Typical ISC complexity:

| Effort | Typical Rows | Phases Used |
|--------|--------------|-------------|
| TRIVIAL | 0 | None (skip algorithm) |
| QUICK | 2-4 | Light OBSERVE → EXECUTE → VERIFY |
| STANDARD | 5-10 | Full cycle |
| THOROUGH | 10-20 | Full cycle with deep THINK |
| DETERMINED | 15-50+ | Multiple iterations |

## Quick Decision Guide

```
Is it a typo/one-liner? → TRIVIAL (skip)
Is it low-risk and simple? → QUICK
Is it normal work? → STANDARD
Is it important or complex? → THOROUGH
Is it mission-critical? → DETERMINED
```
