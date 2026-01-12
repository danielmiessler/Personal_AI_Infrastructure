---
name: PAI Second Brain
pack-id: nabilbamoh-pai-second-brain-core-v2.0.0
version: 2.0.0
author: nabilbamoh
description: Cognitive philosophy with TypeScript tools for delegation patterns and debate orchestration
type: feature
purpose-type: [productivity, analysis, decision-making]
platform: claude-code
dependencies: [danielmiessler-pai-core-install-core-v1.4.0]
optional-dependencies: [pai-multi-llm]
keywords: [second-brain, delegation, debate, sparring-partner, cognitive-diversity]
---

# PAI Second Brain

> Cognitive philosophy that transforms Claude from assistant to director through delegation patterns and multi-perspective debate orchestration.

**v2.0.0** - Now with TypeScript tools for deterministic logic + optional `pai-multi-llm` integration.

---

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../README.md#what-is-pai)

**What is a Pack?** See: [Pack System](../README.md#the-journey-pai-v1x--v20)

This pack transforms your AI from a task executor into a **cognitive amplification system**. The PAI Second Brain implements a radical philosophy:

- **Never Execute Directly** - AI delegates ALL work to subagents
- **Sparring Partner Mode** - Challenge assumptions, seek friction, attack ideas
- **PARA as Cognition** - Knowledge architecture mirrors biological brain structure
- **Archives = Subconscious** - Old patterns are living memory for breakthrough synthesis
- **Cognitive Diversity** - Multiple AI models create breakthrough insights through "conceptual arbitrage"
- **Context Protection** - 200K token budget actively managed for strategic thinking

**Core principle:** Your AI becomes a DIRECTOR who coordinates a team, not an executor who does tasks.

This is not about better note-taking. This is about **superhuman strategic thinking**.

Please follow the installation instructions in `INSTALL.md` to integrate this pack into your infrastructure.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Second Brain skill | `src/skills/SecondBrain/SKILL.md` | Main routing and philosophy reference |
| Delegation protocol | `src/skills/SecondBrain/Philosophy/DELEGATION.md` | Never-execute-directly rules |
| Sparring mode | `src/skills/SecondBrain/Philosophy/SPARRING.md` | Challenge and friction guidelines |
| Authorization | `src/skills/SecondBrain/Philosophy/AUTHORIZATION.md` | Full freedom command |
| Cognitive diversity | `src/skills/SecondBrain/Philosophy/COGNITIVE-DIVERSITY.md` | Multi-AI arbitrage patterns |
| Delegate workflow | `src/skills/SecondBrain/Workflows/Delegate.md` | Multi-agent delegation workflow |
| Debate workflow | `src/skills/SecondBrain/Workflows/Debate.md` | Team friction and synthesis |
| Archive synthesis | `src/skills/SecondBrain/Workflows/ArchiveSynthesis.md` | Subconscious retrieval patterns |
| PARA mapping | `src/config/para-mapping.yaml` | PARA to PAI Memory integration |
| Context thresholds | `src/config/context-thresholds.json` | Budget alert configuration |
| Delegation rules | `src/config/delegation-rules.yaml` | Agent routing configuration |

**Summary:**
- **Files created:** 11
- **Hooks registered:** 0 (philosophy-based, not event-driven)
- **Dependencies:** pai-core-install (required)

---

## The Problem

AI assistants are powerful but operate at 30-40% of their potential:

**The Execution Trap:**
```
User asks question
  → AI executes task directly
  → Clean answer returned
  → No friction, no debate, no breakthrough
  → Context window fills with execution details
  → Strategic thinking capacity degrades
```

**Problems this creates:**

1. **Single Perspective Blindness**
   - One AI model = one cognitive framework
   - Blind spots remain invisible
   - Obvious solutions missed

2. **Context Pollution**
   - AI reads files directly → context fills
   - Strategic synthesis degrades
   - Pattern recognition becomes shallow

3. **Assistant Mode Lock**
   - AI agrees instead of challenges
   - "You're right" instead of "You're wrong because X"
   - Safe answers instead of breakthrough insights

4. **Dead Archives**
   - Completed projects = forgotten
   - Past learnings never retrieved
   - Patterns don't synthesize into breakthroughs

5. **No Cognitive Diversity**
   - Claude thinks one way
   - Codex thinks another way
   - Gemini thinks another way
   - **But they never argue with each other**

**The Fundamental Problem:**

Your AI is brilliant but operates as a lone executor. It should be a **director coordinating a cognitive team** where different AI models challenge each other's reasoning and synthesize breakthrough insights through friction.

---

## The Solution

The Second Brain pack transforms your AI through **philosophy as architecture**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    USER REQUEST ARRIVES                                 │
└──────────────────────┬──────────────────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │  ASSESS REQUEST COMPLEXITY  │
         └──────────┬──────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
   ┌─────────┐            ┌──────────┐
   │ SIMPLE  │            │ COMPLEX  │
   └────┬────┘            └─────┬────┘
        │                       │
        ▼                       ▼
┌───────────────────┐   ┌───────────────────────────────┐
│ Minimum 1 subagent│   │ Minimum 3 subagents           │
│                   │   │ (debate, diverse perspectives)│
└────────┬──────────┘   └────────┬──────────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────────────┐
         │  MAIN CLAUDE COORDINATES      │
         │                               │
         │  ❌ NEVER EXECUTES DIRECTLY   │
         │  ✅ ALWAYS DELEGATES          │
         │  ✅ SYNTHESIZES RESULTS       │
         │  ✅ MANAGES TEAM DEBATE       │
         └───────────────────────────────┘
```

**Key Innovations:**

1. **Delegation as Doctrine**
   - Main Claude = Director, never executor
   - Simple tasks: minimum 1 subagent
   - Complex tasks: minimum 3 subagents with debate

2. **Sparring Partner Mode**
   - Challenge assumptions proactively
   - Say "you're wrong" when needed
   - Attack ideas, not person
   - Seek disagreement, not agreement

3. **PARA as Cognitive Architecture**
   - `_00_Inbox/` = Working memory (hot capture)
   - `_01_Projects/` = Frontal cortex (active focus)
   - `_02_Areas/` = Procedural memory (ongoing responsibilities)
   - `_03_Resources/` = Semantic memory (knowledge base)
   - `_04_Archives/` = **Subconscious** (living pattern library)

4. **Context Budget Protection**
   - 0-50%: Optimal - full strategic capacity
   - 50-75%: Caution - increase delegation
   - 75-90%: Warning - pure coordination mode
   - 90%+: Critical - recommend new session

5. **Cognitive Diversity Engine**
   - Claude: Narrative, dialogue, semantic relationships
   - Codex: Syntax, logic, executable commands
   - Gemini: Multi-modal, cross-domain patterns
   - Ollama: Niche datasets, outlier perspectives
   - **Breakthroughs emerge from translation errors between models**

---

## What Makes This Different

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SECOND BRAIN ARCHITECTURE                            │
│              (Philosophy as Executable Infrastructure)                  │
└─────────────────────────────────────────────────────────────────────────┘

LAYER 1: PHILOSOPHY LAYER
═════════════════════════
┌─────────────────────────────────────────────────────────────────────────┐
│  DELEGATION.md     │  SPARRING.md       │  AUTHORIZATION.md             │
│  ────────────────  │  ───────────────   │  ─────────────────            │
│  • Never execute   │  • Challenge mode  │  • Full freedom               │
│  • Always delegate │  • Seek friction   │  • 100% utilization           │
│  • Min 1/3 agents  │  • Attack ideas    │  • Guard rails                │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
LAYER 2: COGNITIVE ARCHITECTURE
═══════════════════════════════
┌─────────────────────────────────────────────────────────────────────────┐
│                        PARA AS BRAIN STRUCTURE                          │
│                                                                         │
│   _00_Inbox/     →  Working Memory (sensory capture)                    │
│   _01_Projects/  →  Frontal Cortex (conscious attention)                │
│   _02_Areas/     →  Procedural Memory (ongoing responsibilities)        │
│   _03_Resources/ →  Semantic Memory (knowledge networks)                │
│   _04_Archives/  →  SUBCONSCIOUS (dormant patterns for synthesis)       │
│                                                                         │
│   KEY INSIGHT: Archives are LIVING memory, not dead storage             │
│   "Stale" patterns wait for catalysts → Breakthrough synthesis          │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
LAYER 3: MULTI-AI COORDINATION
══════════════════════════════
┌─────────────────────────────────────────────────────────────────────────┐
│                     COGNITIVE DIVERSITY ENGINE                          │
│                                                                         │
│   Claude  ──┬──  Codex  ──┬──  Gemini  ──┬──  Ollama                   │
│      │      │      │      │       │      │      │                       │
│      ▼      ▼      ▼      ▼       ▼      ▼      ▼                       │
│   ┌─────────────────────────────────────────────────┐                   │
│   │              CONCEPTUAL ARBITRAGE               │                   │
│   │                                                 │                   │
│   │  Same problem → 4 cognitive frameworks          │                   │
│   │  Translation errors → Creative insights         │                   │
│   │  One model's hallucination = another's prompt   │                   │
│   │  Friction + Debate → Breakthrough synthesis     │                   │
│   └─────────────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
LAYER 4: CONTEXT PROTECTION
═══════════════════════════
┌─────────────────────────────────────────────────────────────────────────┐
│                    200K TOKEN BUDGET MANAGEMENT                         │
│                                                                         │
│   🟢 0-50%   │ OPTIMAL  │ Full strategic capacity                      │
│   🟡 50-75%  │ CAUTION  │ Increase delegation aggressiveness           │
│   🟠 75-90%  │ WARNING  │ Pure coordination mode only                  │
│   🔴 90%+    │ CRITICAL │ Recommend new session immediately            │
│                                                                         │
│   Protected context = Sharp strategic thinking                          │
│   Bloated context = Degraded director capabilities                     │
└─────────────────────────────────────────────────────────────────────────┘
```

**What makes this FUNDAMENTALLY DIFFERENT:**

This is NOT "custom instructions" or "system prompts". This is **philosophy as executable infrastructure**:

1. **Workflows enforce delegation** - The Delegate.md workflow makes it impossible to execute directly
2. **Config files route decisions** - delegation-rules.yaml determines agent routing automatically
3. **PARA integrates with MEMORY** - Your vault structure maps to PAI's three-tier memory system
4. **Subconscious retrieval is active** - Archive patterns are regularly cross-referenced with new work

Without this pack, your AI is a brilliant lone worker.
With this pack, your AI becomes a **director coordinating a cognitive team**.

---

## Why This Is Different

This sounds similar to "custom system prompts" which also configure AI behavior. What makes this approach different?

Philosophy as infrastructure means the system physically cannot operate in "assistant mode." Delegation workflows force subagent spawning. PARA mapping integrates with PAI's memory tiers. Context thresholds trigger automatic behavioral changes. The architecture enforces the philosophy rather than hoping the AI follows instructions.

- Philosophy files are loaded and referenced by workflows
- Delegation rules route tasks to appropriate agent counts
- PARA folders map to PAI memory system automatically
- Context budget triggers behavioral mode switches actively

---

## Installation

See `INSTALL.md` for the complete wizard-style installation guide.

**Prerequisites:**
- pai-core-install (required)
- Claude Code or compatible agent system
- Obsidian vault with PARA structure (optional but recommended)

**Quick Overview:**
1. System analysis (detect conflicts, dependencies)
2. User questions (vault location, customization)
3. Backup existing files (if any)
4. Install skill files and config
5. Verify installation

---

## Invocation Scenarios

The Second Brain philosophy is **always active** once installed. It changes HOW your AI operates, not just what it can do.

| Trigger | Behavior Change |
|---------|-----------------|
| Any user request | AI assesses complexity, delegates to subagents |
| Simple task | Minimum 1 subagent spawned |
| Complex task | Minimum 3 subagents with debate |
| User presents problem | AI proposes solutions AND attacks its own reasoning |
| Context at 50%+ | AI increases delegation aggressiveness |
| Context at 75%+ | AI switches to pure coordination mode |
| Context at 90%+ | AI recommends new session |
| Research request | AI retrieves from archives for synthesis |

---

## Example Usage

### Example 1: Simple Task with Delegation

**User:** "What's in this file?"

**Before Second Brain:**
```
AI reads file directly
→ Context fills with file contents
→ Returns summary
```

**After Second Brain:**
```
AI spawns file-reader subagent
→ Subagent reads file (isolated context)
→ Returns summary to director
→ Director context stays clean for strategic work
```

### Example 2: Complex Decision with Debate

**User:** "Should I use microservices or monolith for this project?"

**Before Second Brain:**
```
AI gives balanced answer
→ "Both have pros and cons"
→ No friction, no breakthrough
```

**After Second Brain:**
```
AI spawns 3 subagents:
  - Microservices advocate (attacks monolith)
  - Monolith advocate (attacks microservices)
  - Devil's advocate (attacks both)
→ Subagents debate with friction
→ Director synthesizes breakthrough insight
→ User sees the full cognitive collision
→ Better decision emerges from friction
```

### Example 3: Archive Synthesis

**User:** "I'm designing a new user onboarding flow"

**Before Second Brain:**
```
AI helps design from scratch
→ Past learnings ignored
→ Reinvents the wheel
```

**After Second Brain:**
```
AI retrieves from _04_Archives/:
  - 2023 behavioral psychology course
  - 2024 UX patterns research
  - Old client project with similar challenge
→ Cross-references patterns
→ "That psychology pattern from 2023 solves your 2025 UX problem"
→ Breakthrough synthesis from dormant knowledge
```

---

## Configuration

**Environment variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `PAI_DIR` | `~/.claude` | PAI installation directory |
| `SECOND_BRAIN_VAULT` | `~/Documents/SecondBrain` | Obsidian vault location |
| `CONTEXT_WARNING_THRESHOLD` | `75` | Percentage for context warning |
| `CONTEXT_CRITICAL_THRESHOLD` | `90` | Percentage for context critical |

**Option 1: `.env` file** (recommended):
```bash
# $PAI_DIR/.env
SECOND_BRAIN_VAULT="$HOME/Documents/MyVault"
CONTEXT_WARNING_THRESHOLD=70
CONTEXT_CRITICAL_THRESHOLD=85
```

**Option 2: Shell profile**:
```bash
# Add to ~/.zshrc or ~/.bashrc
export SECOND_BRAIN_VAULT="$HOME/Documents/MyVault"
```

---

## Customization

### Recommended Customization

**What to Customize:** Authorization level and sparring intensity

**Why:** Different users need different levels of challenge and autonomy

**Process:**
1. Read `Philosophy/AUTHORIZATION.md`
2. Adjust the authorization statement to your comfort level
3. Read `Philosophy/SPARRING.md`
4. Tune the challenge intensity (stronger/weaker)
5. Test with a complex decision and observe friction level

**Expected Outcome:** AI challenges at a level that pushes your thinking without feeling adversarial

---

### Optional Customization

| Customization | File | Impact |
|---------------|------|--------|
| Delegation thresholds | `config/delegation-rules.yaml` | When to spawn 1 vs 3 agents |
| Context budget alerts | `config/context-thresholds.json` | When warnings trigger |
| PARA folder mapping | `config/para-mapping.yaml` | Custom folder names |
| External AI routing | `Philosophy/COGNITIVE-DIVERSITY.md` | Which AIs for which tasks |

---

## Credits

- **Original concept:** Nabil Bamoh - cognitive amplification system for human augmentation
- **Inspired by:** PARA method (Tiago Forte), Zettelkasten, Daniel Miessler's PAI, biological brain architecture
- **Built on:** PAI infrastructure by Daniel Miessler

---

## Related Work

- **PARA Method** - Tiago Forte's organizational system (this pack extends it as cognitive architecture)
- **Building a Second Brain** - The book that popularized the concept
- **PAI** - Daniel Miessler's Personal AI Infrastructure (this pack extends it)

---

## Works Well With

- **pai-core-install** (required) - Foundation for identity and memory
- **pai-hook-system** - Event capture for context monitoring
- **pai-voice-system** - Voice notifications for sparring partner mode
- **pai-agents-skill** - Dynamic agent composition for delegation

---

## Recommended

- **pai-algorithm-skill** - For structured task execution within Second Brain philosophy
- **pai-observability-server** - Monitor delegation patterns and context usage

---

## Relationships

### Parent Of
*None specified.*

### Child Of
- **pai-core-install** - Requires CORE for identity and memory system

### Sibling Of
- **pai-agents-skill** - Complementary agent management

### Part Of Collection
- **PAI Cognitive Enhancement** - Future bundle for human augmentation packs

---

## Changelog

### 1.0.0 - 2025-01-12
- Initial release
- Philosophy layer: DELEGATION, SPARRING, AUTHORIZATION, COGNITIVE-DIVERSITY
- Workflows: Delegate, Debate, ArchiveSynthesis
- Config: para-mapping, context-thresholds, delegation-rules
- Full PARA integration with PAI Memory System
- Context budget management with automatic mode switching
