---
name: WisdomSynthesis
description: Multi-skill orchestration for deep content analysis pipelines. USE WHEN user says 'wisdom synthesis', 'deep analysis pipeline', 'multi-skill analysis', 'orchestrate skills', 'chain skills', 'synthesize wisdom', OR requests complex analysis requiring multiple PAI skills in sequence.
---

# WisdomSynthesis Skill

Multi-skill orchestration system for deep content analysis. Chains PAI skills in intelligent pipelines to extract maximum insight from content.

**Domain**: Meta-skill orchestration, knowledge synthesis, deep analysis

---

## Philosophy

Most content deserves deeper analysis than a single skill provides. WisdomSynthesis orchestrates PAI skills in curated sequences:

- **Research** → Gather comprehensive information
- **Fabric** → Extract structured wisdom
- **FirstPrinciples** → Decompose to fundamentals
- **Council** → Multi-perspective debate
- **RedTeam** → Adversarial critique

Each step builds on the previous, creating emergent insights impossible from any single skill.

---

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **ExtractWisdom** | "wisdom synthesis", "deep analysis", "synthesize wisdom" | `Workflows/ExtractWisdom.md` |
| **ThreatAnalysis** | "threat synthesis", "deep threat analysis" | `Workflows/ThreatAnalysis.md` |
| **TopicMastery** | "master this topic", "comprehensive understanding" | `Workflows/TopicMastery.md` |
| **ControversialTopic** | "controversial topic", "balanced analysis" | `Workflows/ControversialTopic.md` |
| **CustomPipeline** | "custom pipeline", "orchestrate [skills]" | `Workflows/CustomPipeline.md` |

---

## Pre-Built Pipelines

**Pipelines defined in:** `Data/Pipelines.yaml`

| Pipeline | Skills Chain | Best For |
|----------|-------------|----------|
| **ExtractWisdom** | Research → Fabric(extract_wisdom) → FirstPrinciples | Articles, essays, long-form content |
| **ThreatAnalysis** | Research → Fabric(create_threat_model) → RedTeam → Council | Security analysis, risk assessment |
| **TopicMastery** | Research(extensive) → Fabric(extract_wisdom) → FirstPrinciples → Council → BeCreative | Learning new topics deeply |
| **ControversialTopic** | Research(multiple perspectives) → Council → RedTeam → FirstPrinciples | Nuanced, multi-faceted issues |
| **CustomPipeline** | User-defined skill sequence | Custom analysis workflows |

---

## Examples

**Example 1: Deep wisdom extraction**
```
User: "Use wisdom synthesis to analyze this AI safety paper"
→ Invokes ExtractWisdom workflow
→ Step 1: Research (gather context on AI safety)
→ Step 2: Fabric extract_wisdom (structured extraction)
→ Step 3: FirstPrinciples (fundamental decomposition)
→ Returns: Multi-layered synthesis report
```

**Example 2: Security threat analysis**
```
User: "Run threat synthesis on this API architecture"
→ Invokes ThreatAnalysis workflow
→ Step 1: Research (gather attack patterns, CVEs)
→ Step 2: Fabric create_threat_model (STRIDE)
→ Step 3: RedTeam (adversarial critique)
→ Step 4: Council (security perspectives)
→ Returns: Comprehensive threat analysis
```

**Example 3: Topic mastery**
```
User: "I want to master quantum computing"
→ Invokes TopicMastery workflow
→ Step 1: Research extensive (parallel agents)
→ Step 2: Fabric extract_wisdom (concepts, insights)
→ Step 3: FirstPrinciples (core fundamentals)
→ Step 4: Council (teaching perspectives)
→ Step 5: BeCreative (deep synthesis)
→ Returns: Structured learning path + deep understanding
```

**Example 4: Custom pipeline**
```
User: "Chain Research, Fabric analyze_claims, and RedTeam"
→ Invokes CustomPipeline workflow
→ Dynamically composes specified skill sequence
→ Passes output from each step to next
→ Returns: Final synthesis
```

---

## Architecture

### Pipeline Definition (YAML)

Pipelines are defined in `Data/Pipelines.yaml`:

```yaml
pipelines:
  extract_wisdom:
    name: "Extract and Synthesize Wisdom"
    description: "Deep wisdom extraction from content"
    steps:
      - skill: Research
        mode: standard
        output_key: research_findings

      - skill: Fabric
        pattern: extract_wisdom
        input_from: research_findings
        output_key: extracted_wisdom

      - skill: FirstPrinciples
        input_from: extracted_wisdom
        output_key: fundamental_insights
```

### Workflow Execution (Markdown)

Workflows in `Workflows/*.md` execute pipelines using Task delegation:

```typescript
// Step 1: Research
Task({
  subagent_type: "ClaudeResearcher",
  description: "Research phase",
  prompt: "Research [topic]..."
})

// Step 2: Fabric (uses output from Step 1)
Task({
  subagent_type: "general-purpose",
  description: "Extract wisdom",
  prompt: "Using Fabric extract_wisdom pattern on: [research_output]"
})
```

### Data Handoff

Each step produces structured output passed to the next:

```json
{
  "step": "research",
  "output": "[research findings]",
  "metadata": {
    "sources": 5,
    "confidence": "high"
  }
}
```

---

## Integration

### Dependencies
- **Research** - Information gathering phase
- **Fabric** - Pattern-based extraction (240+ patterns)
- **FirstPrinciples** - Fundamental decomposition
- **Council** - Multi-perspective debate
- **RedTeam** - Adversarial critique (32 agents)
- **BeCreative** - Extended reasoning synthesis

All dependencies are standard PAI skills. No external services required.

---

## Quick Reference

### When to Use WisdomSynthesis

| Situation | Use WisdomSynthesis? | Why |
|-----------|---------------------|-----|
| Simple question | ❌ No | Single skill sufficient |
| Quick summary | ❌ No | Just use Fabric |
| Deep analysis needed | ✅ Yes | Multi-skill synthesis |
| Controversial topic | ✅ Yes | Need multiple perspectives |
| Security assessment | ✅ Yes | Research + threat model + critique |
| Learning mastery | ✅ Yes | Research + extraction + synthesis |

### Performance Characteristics

| Pipeline | Skills | Time | Token Cost |
|----------|--------|------|------------|
| ExtractWisdom | 3 | ~30-45s | Medium |
| ThreatAnalysis | 4 | ~45-60s | High |
| TopicMastery | 5 | ~60-90s | Very High |
| ControversialTopic | 4 | ~45-60s | High |
| CustomPipeline | Variable | Variable | Variable |

---

## File Organization

| Path | Purpose |
|------|---------|
| `SKILL.md` | Skill documentation (this file) |
| `Data/Pipelines.yaml` | Pipeline definitions |
| `Workflows/ExtractWisdom.md` | Wisdom extraction workflow |
| `Workflows/ThreatAnalysis.md` | Security threat analysis workflow |
| `Workflows/TopicMastery.md` | Deep learning workflow |
| `Workflows/ControversialTopic.md` | Balanced analysis workflow |
| `Workflows/CustomPipeline.md` | User-defined pipeline workflow |

---

## Design Principles

**PAI-Native Architecture:**
- Markdown workflows for human-readable orchestration
- YAML configs for machine-readable pipeline definitions
- Task delegation for parallel agent execution
- No code modifications to existing skills required

**Why This Approach:**
- **Clean merges** - Pure data files, no code conflicts
- **Extensible** - Add pipelines without changing core system
- **Maintainable** - Clear separation of concerns
- **Testable** - Each pipeline independently verifiable

---

## Changelog

### 2026-01-25 - v1.0.0
- Initial creation following PAI-native architecture
- Markdown workflows + YAML pipeline configs + Task delegation
- 5 pre-built pipelines (ExtractWisdom, ThreatAnalysis, TopicMastery, ControversialTopic, CustomPipeline)
- Designed for upstream PAI compatibility
- Zero external dependencies - uses only standard PAI skills
