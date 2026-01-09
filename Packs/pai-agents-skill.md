---
name: Kai Agents Skill
pack-id: danielmiessler-agents-skill-core-v1.1.1
version: 1.1.1
author: danielmiessler
description: Dynamic agent composition and orchestration system - create custom agents with unique personalities, voices, and trait combinations on-the-fly
type: skill
purpose-type: [productivity, automation, development]
platform: claude-code
dependencies: [danielmiessler-core-install-core-v1.0.0]
keywords: [agents, delegation, parallel, traits, personalities, voice, composition, dynamic, factory, custom, orchestration, subagents]
---

<p align="center">
  <img src="icons/agents-skill.png" alt="Kai Agents Skill" width="256">
</p>

# Kai Agents Skill

> Dynamic agent composition system - create specialized agents with unique personalities and voices, composed from traits on-the-fly

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../README.md#what-is-pai)

**What is a Pack?** See: [Pack System](../README.md#the-journey-pai-v1x--v20)

This pack adds a complete agent composition and orchestration system to your AI infrastructure. Instead of using generic agents for every task, you can now:

- **Compose custom agents** from traits (expertise + personality + approach)
- **Assign unique voices** to each agent based on personality type
- **Launch parallel agents** with different perspectives on the same problem
- **Create named persistent agents** with full backstories and character development

**The key insight:** Different tasks benefit from different cognitive styles. A security audit needs skeptical adversarial thinking. Creative work needs enthusiastic exploration. This pack lets you dynamically compose the right agent for each job.

Please follow the installation instructions below to integrate this pack into your infrastructure.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Agents skill | `skills/Agents/SKILL.md` | Routing and agent definitions |
| Agent factory | `skills/Agents/Tools/AgentFactory.ts` | Dynamic agent composition |
| Trait definitions | `skills/Agents/Data/Traits.yaml` | Expertise, personality, approach traits |
| Voice mapping | `skills/Agents/Data/VoiceMapping.yaml` | Personality to ElevenLabs voice mapping |
| Create agent | `skills/Agents/Workflows/CreateCustomAgent.md` | Custom agent workflow |
| List traits | `skills/Agents/Workflows/ListTraits.md` | Show available traits |

**Summary:**
- **Files created:** 8+ (skill, tool, workflows, data)
- **Hooks registered:** 0 (skill-based, not hook-based)
- **Dependencies:** kai-core-install (required), kai-voice-system (optional for voice)

---

## The Concept and/or Problem

AI agent systems typically offer one-size-fits-all agents. You spawn "an agent" to do research, security review, or creative work - but they all have the same personality, same approach, same voice.

This creates several problems:

**Cognitive Monoculture:**
- Every analysis comes from the same perspective
- No natural devil's advocacy or alternative viewpoints
- Blind spots become systematic

**Lack of Specialization:**
- A security review agent should think differently than a creative brainstorming agent
- Generic agents lack the focused expertise and behavioral patterns that make specialists valuable
- "Jack of all trades" means master of none

**Voice Confusion:**
- When multiple agents speak, they're indistinguishable
- No personality differentiation in outputs
- Parallel agent results blend together without clear ownership

**Lost Context:**
- Each agent starts fresh with no character continuity
- No relationship building between sessions
- Expertise and personality traits must be re-specified each time

**The Fundamental Problem:**

Modern AI agent frameworks provide the plumbing for spawning and orchestrating agents, but leave personality and specialization as an afterthought. You can spawn 10 agents, but they're all clones.

Real teams have diverse thinkers: the skeptic who pokes holes, the enthusiast who sees possibilities, the meticulous reviewer who catches details. Your agent system should too.

---

## The Solution

The Agents Skill solves this through a **hybrid agent model** with dynamic trait composition:

### Hybrid Agent Model

Two types of agents working together:

| Type | Definition | Best For |
|------|------------|----------|
| **Named Agents** | Persistent identities with backstories | Recurring work, voice output, relationships |
| **Dynamic Agents** | Task-specific specialists composed from traits | One-off tasks, novel combinations, parallel work |

### Trait Composition System

Agents are composed by combining three trait categories:

```
AGENT = Expertise + Personality + Approach
```

**Expertise (10 types):** security, legal, finance, medical, technical, research, creative, business, data, communications

**Personality (10 dimensions):** skeptical, enthusiastic, cautious, bold, analytical, creative, empathetic, contrarian, pragmatic, meticulous

**Approach (8 styles):** thorough, rapid, systematic, exploratory, comparative, synthesizing, adversarial, consultative

### Voice Mapping

Each trait combination maps to a distinct voice:
- `[skeptical, analytical]` → Intellectual academic voice
- `[enthusiastic, creative]` → High-energy dynamic voice
- `[cautious, meticulous]` → Measured formal voice

This means 5 custom agents get 5 different voices automatically.

### The AgentFactory

A CLI tool that:
1. Accepts trait specification or infers traits from task description
2. Composes a complete agent prompt with personality and approach
3. Maps traits to appropriate voice
4. Outputs ready-to-use agent configuration

```bash
# Infer from task
bun run AgentFactory.ts --task "Review this security architecture"
# Result: security + skeptical + thorough agent with appropriate voice

# Specify explicitly
bun run AgentFactory.ts --traits "legal,meticulous,systematic"
# Result: Legal expert with careful systematic approach
```

---

## What Makes This Different

This sounds similar to role-playing prompts which also create agent personas. What makes this approach different?

Traditional role-playing ("You are a security expert...") is ad-hoc prompt engineering. This system provides **composable, voice-mapped, production-ready agent infrastructure**. Traits are defined once in YAML, composed dynamically, and automatically mapped to distinct voice outputs. The factory ensures consistent personality delivery across sessions while the trait system prevents copy-paste prompt drift.

- Composable traits prevent ad-hoc prompt engineering drift
- Voice mapping creates audible agent differentiation automatically
- Factory pattern ensures consistent personality across all sessions
- Named agents provide relationship continuity between work sessions

---

## Installation

### Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **Claude Code** (or compatible agent system)
- **kai-core-install** pack installed (provides skill routing)
- **Optional**: kai-voice-system pack for voice notifications

---

### Pre-Installation: System Analysis

```bash
# 1. Check PAI_DIR
echo "PAI_DIR: ${PAI_DIR:-'NOT SET - will use ~/.config/pai'}"

# 2. Check for existing Agents skill
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"
if [ -d "$PAI_CHECK/skills/Agents" ]; then
  echo "Warning: Agents skill already exists"
  ls -la "$PAI_CHECK/skills/Agents"
else
  echo "Clean install - no existing Agents skill"
fi

# 3. Check dependencies
if [ -f "$PAI_CHECK/skills/CORE/SKILL.md" ]; then
  echo "kai-core-install: INSTALLED"
else
  echo "Warning: kai-core-install not found (required)"
fi
```

---

### Step 1: Create Directory Structure

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

mkdir -p "$PAI_DIR/skills/Agents/Data"
mkdir -p "$PAI_DIR/skills/Agents/Tools"
mkdir -p "$PAI_DIR/skills/Agents/Templates"
mkdir -p "$PAI_DIR/skills/Agents/Workflows"
mkdir -p "$PAI_DIR/skills/Agents/Contexts"

# Verify
ls -la "$PAI_DIR/skills/Agents/"
```

---

### Step 2: Create SKILL.md

```bash
cat > "$PAI_DIR/skills/Agents/SKILL.md" << 'SKILL_EOF'
---
name: Agents
description: Dynamic agent composition and management system. USE WHEN user says create custom agents, spin up custom agents, specialized agents, OR asks for agent personalities, available traits, agent voices. Handles custom agent creation, personality assignment, voice mapping, and parallel agent orchestration.
---

# Agents - Custom Agent Composition System

**Auto-routes when user mentions custom agents, agent creation, or specialized personalities.**

## Overview

The Agents skill provides complete agent composition and management:
- Dynamic agent composition from traits (expertise + personality + approach)
- Personality definitions and voice mappings
- Custom agent creation with unique voices
- Parallel agent orchestration patterns

## Workflow Routing

**Available Workflows:**
- **CREATECUSTOMAGENT** - Create specialized custom agents → `Workflows/CreateCustomAgent.md`
- **LISTTRAITS** - Show available agent traits → `Workflows/ListTraits.md`
- **SPAWNPARALLEL** - Launch parallel agents → `Workflows/SpawnParallelAgents.md`

## Route Triggers

**CRITICAL: The word "custom" is the ABSOLUTE trigger - NO EXCEPTIONS:**

| User Says | What to Use | subagent_type | Why |
|-----------|-------------|---------------|-----|
| "**custom agents**", "create **custom** agents", "spin up **custom**" | AgentFactory | `general-purpose` | Unique prompts + unique voices |
| "agents", "launch agents", "bunch of agents" | Generic prompt | `Intern` | Same voice, parallel grunt work |
| "use [agent name]", "get [agent name] to" | Direct call | Named agent type | Pre-defined personality |

**CONSTITUTIONAL RULE FOR CUSTOM AGENTS:**
When user says "custom agents", you MUST:
1. Use AgentFactory to compose EACH agent with DIFFERENT traits
2. Use `subagent_type: "general-purpose"` - **NEVER** "Intern", "Designer", "Architect", etc.
3. Each agent gets their own voice from the trait-to-voice mapping

**❌ NEVER DO THIS for custom agents:**
```
subagent_type: "Intern"      // WRONG - forces same voice on all
subagent_type: "Designer"    // WRONG - forces Designer's voice
subagent_type: "Architect"   // WRONG - forces Architect's voice
```

**✅ ALWAYS DO THIS for custom agents:**
```
subagent_type: "general-purpose"  // CORRECT - uses custom voice from AgentFactory
```

## Architecture

### Hybrid Agent Model

Two types of agents:

| Type | Definition | Best For |
|------|------------|----------|
| **Named Agents** | Persistent identities with backstories | Recurring work, voice output |
| **Dynamic Agents** | Task-specific specialists from traits | One-off tasks, parallel work |

### Components

**Data/Traits.yaml** - 28 composable traits with voice mappings
**Templates/DynamicAgent.hbs** - Agent prompt template
**Tools/AgentFactory.ts** - Dynamic composition engine
**AgentPersonalities.md** - Named agent definitions

## Usage

Just ask naturally:
- "I need a legal expert to review this contract"
- "Spin up 5 custom science agents"
- "Get me someone skeptical about security"

The skill routes to appropriate workflow automatically.

## Model Selection

| Task Type | Model | Why |
|-----------|-------|-----|
| Grunt work | `haiku` | 10-20x faster |
| Standard analysis | `sonnet` | Balanced |
| Deep reasoning | `opus` | Maximum intelligence |
SKILL_EOF
```

---

### Step 3: Create Traits.yaml

This is the core trait definition file with voice mappings.

```bash
cat > "$PAI_DIR/skills/Agents/Data/Traits.yaml" << 'TRAITS_EOF'
# Traits.yaml - Composable Agent Traits
# Version: 1.0.0
#
# Agents are composed by combining: expertise + personality + approach
#
# Usage:
#   bun run AgentFactory.ts --task "Review security architecture"
#   bun run AgentFactory.ts --traits "security,skeptical,thorough"

# ==============================================================================
# EXPERTISE AREAS - Domain knowledge and specialization
# ==============================================================================
expertise:
  security:
    name: "Security Expert"
    description: |
      Deep knowledge of vulnerabilities, threat models, attack vectors, and
      defensive strategies. Understands OWASP, CVE databases, penetration
      testing methodologies, and security architecture patterns.
    keywords:
      - vulnerability
      - threat
      - exploit
      - defense
      - penetration
      - audit
      - security
      - attack
      - CVE
      - OWASP

  legal:
    name: "Legal Analyst"
    description: |
      Contract analysis, compliance requirements, liability assessment, and
      regulatory frameworks. Can identify problematic clauses, missing
      protections, and legal risks.
    keywords:
      - contract
      - compliance
      - legal
      - regulation
      - liability
      - terms
      - agreement
      - clause
      - NDA
      - intellectual property

  finance:
    name: "Financial Analyst"
    description: |
      Market dynamics, valuation methods, risk assessment, and financial
      modeling. Understands ROI calculations, investment analysis, and
      economic indicators.
    keywords:
      - valuation
      - market
      - investment
      - risk
      - financial
      - ROI
      - revenue
      - profit
      - economics
      - pricing

  medical:
    name: "Medical/Health Expert"
    description: |
      Healthcare knowledge, medical terminology, treatment protocols, and
      health research interpretation. Can evaluate clinical claims and
      health-related content.
    keywords:
      - health
      - medical
      - treatment
      - diagnosis
      - clinical
      - patient
      - disease
      - therapy
      - pharmaceutical

  technical:
    name: "Technical Specialist"
    description: |
      Software architecture, system design, implementation patterns, and
      debugging. Deep understanding of code quality, performance, and
      technical trade-offs.
    keywords:
      - code
      - architecture
      - system
      - implementation
      - debug
      - technical
      - API
      - database
      - infrastructure
      - software

  research:
    name: "Research Specialist"
    description: |
      Academic methodology, source evaluation, literature review, and
      synthesis. Knows how to find, evaluate, and combine information
      from multiple sources.
    keywords:
      - research
      - study
      - academic
      - sources
      - literature
      - evidence
      - methodology
      - peer-reviewed
      - citation

  creative:
    name: "Creative Specialist"
    description: |
      Content creation, storytelling, visual thinking, and innovative
      approaches. Brings fresh perspectives and unexpected connections
      to problems.
    keywords:
      - creative
      - content
      - story
      - design
      - innovative
      - artistic
      - narrative
      - visual
      - brand

  business:
    name: "Business Strategist"
    description: |
      Market analysis, competitive positioning, growth strategies, and
      operations. Understands business models, go-to-market strategies,
      and organizational dynamics.
    keywords:
      - business
      - strategy
      - market
      - competitive
      - growth
      - operations
      - startup
      - enterprise
      - B2B
      - B2C

  data:
    name: "Data Analyst"
    description: |
      Statistical analysis, data visualization, pattern recognition, and
      quantitative reasoning. Can interpret datasets, identify trends,
      and draw evidence-based conclusions.
    keywords:
      - data
      - statistics
      - analysis
      - metrics
      - trends
      - visualization
      - quantitative
      - dataset
      - patterns

  communications:
    name: "Communications Expert"
    description: |
      Messaging strategy, audience analysis, persuasive writing, and
      public relations. Knows how to frame information for different
      audiences and contexts.
    keywords:
      - communication
      - messaging
      - audience
      - PR
      - media
      - presentation
      - writing
      - speaking

# ==============================================================================
# PERSONALITY DIMENSIONS - How the agent thinks and behaves
# ==============================================================================
personality:
  skeptical:
    name: "Skeptical"
    description: "Questions assumptions, demands evidence, looks for flaws"
    prompt_fragment: |
      You approach all claims with healthy skepticism. Demand evidence for
      assertions. Question assumptions that others take for granted. Look for
      logical flaws, unstated premises, and potential biases. Don't accept
      things at face value just because they sound authoritative.

  enthusiastic:
    name: "Enthusiastic"
    description: "Finds excitement in discoveries, positive framing, energy"
    prompt_fragment: |
      You bring genuine enthusiasm to the work. Get excited about interesting
      findings and share that excitement. Frame discoveries positively while
      remaining accurate. Your energy is contagious but grounded in substance.

  cautious:
    name: "Cautious"
    description: "Considers edge cases, failure modes, risks"
    prompt_fragment: |
      You think carefully about what could go wrong. Consider edge cases that
      others might miss. Identify potential failure modes before they become
      problems. Err on the side of safety when uncertain. Flag risks early.

  bold:
    name: "Bold"
    description: "Willing to take risks, make strong claims, push boundaries"
    prompt_fragment: |
      You're willing to make strong claims when the evidence warrants it. Take
      intellectual risks. Push past conventional thinking when you see a better
      path. Don't hedge unnecessarily. State your conclusions with confidence.

  analytical:
    name: "Analytical"
    description: "Data-driven, logical, systematic breakdown"
    prompt_fragment: |
      You approach problems analytically. Break down complex issues into
      component parts. Rely on data and logic over intuition. Show your
      reasoning step by step. Quantify when possible.

  creative:
    name: "Creative"
    description: "Lateral thinking, unexpected connections, novel approaches"
    prompt_fragment: |
      You think laterally. Make unexpected connections between disparate ideas.
      Consider unconventional approaches. Don't be bound by how things are
      usually done. Find the interesting angle others might miss.

  empathetic:
    name: "Empathetic"
    description: "Considers human impact, emotional intelligence, user-centered"
    prompt_fragment: |
      You consider the human element in everything. Think about emotional impact
      and user experience. Show understanding of different perspectives. Center
      the people affected by decisions and recommendations.

  contrarian:
    name: "Contrarian"
    description: "Deliberately takes opposing view, stress-tests ideas"
    prompt_fragment: |
      You deliberately take the opposing view to stress-test ideas. Find the
      strongest counterarguments even for positions you might agree with. Play
      devil's advocate effectively. Your job is to find weaknesses.

  pragmatic:
    name: "Pragmatic"
    description: "Focuses on what works, practical over theoretical"
    prompt_fragment: |
      You focus on what actually works in practice. Prefer practical solutions
      over theoretically elegant ones. Consider implementation realities. Ask
      "yes, but will it work?" Judge ideas by outcomes, not intentions.

  meticulous:
    name: "Meticulous"
    description: "Attention to detail, precision, thoroughness"
    prompt_fragment: |
      You pay extraordinary attention to detail. Nothing escapes your notice.
      Precision matters - get the specifics right. Double-check your work.
      The details often contain the most important information.

# ==============================================================================
# APPROACH STYLES - How the agent works on tasks
# ==============================================================================
approach:
  thorough:
    name: "Thorough"
    description: "Exhaustive analysis, no stone unturned, comprehensive"
    prompt_fragment: |
      Be exhaustive in your analysis. Leave no stone unturned. Cover all
      relevant angles and perspectives. Comprehensive coverage is more
      important than speed. Don't stop at the obvious.

  rapid:
    name: "Rapid"
    description: "Quick assessment, key points, efficiency-focused"
    prompt_fragment: |
      Move quickly and efficiently. Focus on the key points that matter most.
      Provide rapid assessment without unnecessary elaboration. Time is
      valuable - get to the point.

  systematic:
    name: "Systematic"
    description: "Structured approach, clear methodology, step-by-step"
    prompt_fragment: |
      Follow a clear, structured methodology. Work step by step in logical
      order. Document your process so others can follow your reasoning.
      Maintain organization throughout.

  exploratory:
    name: "Exploratory"
    description: "Follow interesting threads, discovery-oriented, flexible"
    prompt_fragment: |
      Follow interesting threads wherever they lead. Be discovery-oriented
      rather than goal-fixated. Stay flexible and let the investigation
      guide itself. Some of the best insights come from unexpected directions.

  comparative:
    name: "Comparative"
    description: "Evaluates options, pros/cons, trade-off analysis"
    prompt_fragment: |
      Compare and contrast options explicitly. Lay out pros and cons for
      each alternative. Analyze trade-offs clearly. Help make informed
      decisions by showing what's gained and lost with each choice.

  synthesizing:
    name: "Synthesizing"
    description: "Combines multiple sources, integrates perspectives"
    prompt_fragment: |
      Synthesize information from multiple sources into a unified view.
      Integrate different perspectives rather than just listing them.
      Find the coherent story that connects disparate pieces.

  adversarial:
    name: "Adversarial"
    description: "Red team approach, find weaknesses, attack the problem"
    prompt_fragment: |
      Take an adversarial stance. Your job is to find weaknesses, not
      confirm strengths. Attack the problem from every angle. Think like
      someone trying to break this. What would an attacker do?

  consultative:
    name: "Consultative"
    description: "Advisory stance, recommendations with rationale"
    prompt_fragment: |
      Take a consultative approach. Provide recommendations with clear
      rationale. Explain not just what to do but why. Help the decision-maker
      understand the reasoning so they can adapt if needed.

# ==============================================================================
# VOICE MAPPINGS - How dynamic agents map to TTS voices
# ==============================================================================
# CUSTOMIZE: Replace voice_id values with your TTS provider's voice IDs
#
voice_mappings:
  # Default voice when no mapping matches
  default: "Default"
  default_voice_id: "YOUR_DEFAULT_VOICE_ID"

  # ===========================================================================
  # VOICE REGISTRY - Define your available voices
  # ===========================================================================
  voice_registry:
    # --- AUTHORITATIVE VOICES ---
    Authoritative:
      voice_id: "YOUR_AUTHORITATIVE_VOICE_ID"
      characteristics: ["authoritative", "measured", "intellectual"]
      description: "Deep authoritative voice for serious analysis"
      stability: 0.70
      similarity_boost: 0.85

    Professional:
      voice_id: "YOUR_PROFESSIONAL_VOICE_ID"
      characteristics: ["professional", "balanced", "neutral"]
      description: "Balanced professional voice for general use"
      stability: 0.65
      similarity_boost: 0.80

    # --- WARM/FRIENDLY VOICES ---
    Warm:
      voice_id: "YOUR_WARM_VOICE_ID"
      characteristics: ["warm", "friendly", "engaging"]
      description: "Warm friendly voice for supportive interactions"
      stability: 0.50
      similarity_boost: 0.75

    Gentle:
      voice_id: "YOUR_GENTLE_VOICE_ID"
      characteristics: ["warm", "calm", "gentle"]
      description: "Calm gentle voice for empathetic guidance"
      stability: 0.55
      similarity_boost: 0.75

    # --- ENERGETIC VOICES ---
    Energetic:
      voice_id: "YOUR_ENERGETIC_VOICE_ID"
      characteristics: ["energetic", "excited", "dynamic"]
      description: "High-energy voice for enthusiastic delivery"
      stability: 0.35
      similarity_boost: 0.65

    Dynamic:
      voice_id: "YOUR_DYNAMIC_VOICE_ID"
      characteristics: ["energetic", "fast", "charismatic"]
      description: "Fast-paced dynamic voice for exciting content"
      stability: 0.40
      similarity_boost: 0.70

    # --- INTELLECTUAL VOICES ---
    Academic:
      voice_id: "YOUR_ACADEMIC_VOICE_ID"
      characteristics: ["intellectual", "warm", "academic"]
      description: "Academic voice for research and analysis"
      stability: 0.62
      similarity_boost: 0.80

    Sophisticated:
      voice_id: "YOUR_SOPHISTICATED_VOICE_ID"
      characteristics: ["intellectual", "sophisticated", "smooth"]
      description: "Sophisticated voice for nuanced discussion"
      stability: 0.60
      similarity_boost: 0.80

    # --- EDGY/DISTINCTIVE VOICES ---
    Intense:
      voice_id: "YOUR_INTENSE_VOICE_ID"
      characteristics: ["edgy", "gravelly", "intense"]
      description: "Intense voice for adversarial/security work"
      stability: 0.55
      similarity_boost: 0.75

    Gritty:
      voice_id: "YOUR_GRITTY_VOICE_ID"
      characteristics: ["edgy", "raspy", "authentic"]
      description: "Gritty authentic voice for skeptical analysis"
      stability: 0.50
      similarity_boost: 0.70

  # ===========================================================================
  # TRAIT → VOICE MAPPINGS
  # ===========================================================================
  mappings:
    # Skeptical combinations → Intellectual voices
    - traits: ["contrarian", "skeptical"]
      voice: "Intense"
      reason: "Contrarian skepticism needs intensity"

    - traits: ["skeptical", "analytical"]
      voice: "Academic"
      reason: "Skeptical analysis suits academic warmth"

    - traits: ["skeptical", "meticulous"]
      voice: "Sophisticated"
      reason: "Meticulous skepticism suits sophistication"

    # Creative combinations → Energetic voices
    - traits: ["enthusiastic", "creative"]
      voice: "Energetic"
      reason: "Creative enthusiasm needs high energy"

    - traits: ["creative", "exploratory"]
      voice: "Dynamic"
      reason: "Creative exploration suits dynamic delivery"

    # Analytical combinations → Professional voices
    - traits: ["analytical", "technical"]
      voice: "Authoritative"
      reason: "Technical analysis suits authority"

    - traits: ["analytical", "systematic"]
      voice: "Professional"
      reason: "Systematic analysis suits professionalism"

    # Empathetic combinations → Warm voices
    - traits: ["empathetic", "consultative"]
      voice: "Warm"
      reason: "Empathetic consulting suits warmth"

    - traits: ["empathetic", "synthesizing"]
      voice: "Gentle"
      reason: "Synthesizing empathy suits gentleness"

    # Security combinations → Edgy voices
    - traits: ["security", "adversarial"]
      voice: "Intense"
      reason: "Security adversary suits intensity"

    - traits: ["security", "skeptical"]
      voice: "Gritty"
      reason: "Security skepticism suits gritty authenticity"

  # ===========================================================================
  # FALLBACKS - Single trait → voice
  # ===========================================================================
  fallbacks:
    skeptical: "Academic"
    enthusiastic: "Energetic"
    analytical: "Authoritative"
    cautious: "Professional"
    bold: "Intense"
    creative: "Dynamic"
    empathetic: "Warm"
    contrarian: "Intense"
    pragmatic: "Professional"
    meticulous: "Sophisticated"

    security: "Intense"
    legal: "Authoritative"
    finance: "Professional"
    medical: "Warm"
    technical: "Professional"
    research: "Academic"
    communications: "Dynamic"
    business: "Professional"
    data: "Academic"

    thorough: "Professional"
    rapid: "Dynamic"
    systematic: "Professional"
    exploratory: "Dynamic"
    adversarial: "Intense"
    consultative: "Warm"

# ==============================================================================
# COMPOSITION EXAMPLES
# ==============================================================================
examples:
  security_audit:
    description: "Security architecture review"
    traits: ["security", "skeptical", "thorough", "adversarial"]

  contract_review:
    description: "Legal contract analysis"
    traits: ["legal", "cautious", "meticulous", "systematic"]

  market_analysis:
    description: "Competitive market research"
    traits: ["business", "analytical", "comparative", "thorough"]

  code_review:
    description: "Technical code review"
    traits: ["technical", "meticulous", "systematic"]

  creative_brief:
    description: "Creative content development"
    traits: ["creative", "enthusiastic", "exploratory"]

  red_team:
    description: "Adversarial idea testing"
    traits: ["contrarian", "skeptical", "adversarial", "bold"]

  user_research:
    description: "User experience research"
    traits: ["research", "empathetic", "synthesizing"]

  quick_assessment:
    description: "Rapid evaluation needed"
    traits: ["analytical", "pragmatic", "rapid"]
TRAITS_EOF
```

---

### Step 4: Create AgentFactory.ts

The CLI tool for composing agents from traits.

```bash
cat > "$PAI_DIR/skills/Agents/Tools/AgentFactory.ts" << 'FACTORY_EOF'
#!/usr/bin/env bun

/**
 * AgentFactory - Dynamic Agent Composition from Traits
 *
 * Composes specialized agents on-the-fly by combining traits from Traits.yaml.
 *
 * Usage:
 *   bun run AgentFactory.ts --task "Review this security architecture"
 *   bun run AgentFactory.ts --traits "security,skeptical,thorough"
 *   bun run AgentFactory.ts --list
 *
 * @version 1.0.0
 */

import { parseArgs } from "util";
import { readFileSync, existsSync } from "fs";
import { parse as parseYaml } from "yaml";
import Handlebars from "handlebars";

// Paths - adjust PAI_DIR as needed
const PAI_DIR = process.env.PAI_DIR || `${process.env.HOME}/.config/pai`;
const TRAITS_PATH = `${PAI_DIR}/skills/Agents/Data/Traits.yaml`;
const TEMPLATE_PATH = `${PAI_DIR}/skills/Agents/Templates/DynamicAgent.hbs`;

// Types
interface TraitDefinition {
  name: string;
  description: string;
  prompt_fragment?: string;
  keywords?: string[];
}

interface VoiceMapping {
  traits: string[];
  voice: string;
  voice_id?: string;
  reason?: string;
}

interface VoiceRegistryEntry {
  voice_id: string;
  characteristics: string[];
  description: string;
  stability: number;
  similarity_boost: number;
}

interface TraitsData {
  expertise: Record<string, TraitDefinition>;
  personality: Record<string, TraitDefinition>;
  approach: Record<string, TraitDefinition>;
  voice_mappings: {
    default: string;
    default_voice_id: string;
    voice_registry: Record<string, VoiceRegistryEntry>;
    mappings: VoiceMapping[];
    fallbacks: Record<string, string>;
  };
  examples: Record<string, { description: string; traits: string[] }>;
}

interface ComposedAgent {
  name: string;
  traits: string[];
  expertise: TraitDefinition[];
  personality: TraitDefinition[];
  approach: TraitDefinition[];
  voice: string;
  voiceId: string;
  voiceReason: string;
  prompt: string;
}

function loadTraits(): TraitsData {
  if (!existsSync(TRAITS_PATH)) {
    console.error(`Error: Traits file not found at ${TRAITS_PATH}`);
    process.exit(1);
  }
  const content = readFileSync(TRAITS_PATH, "utf-8");
  return parseYaml(content) as TraitsData;
}

function loadTemplate(): HandlebarsTemplateDelegate {
  if (!existsSync(TEMPLATE_PATH)) {
    console.error(`Error: Template file not found at ${TEMPLATE_PATH}`);
    process.exit(1);
  }
  const content = readFileSync(TEMPLATE_PATH, "utf-8");
  return Handlebars.compile(content);
}

function inferTraitsFromTask(task: string, traits: TraitsData): string[] {
  const inferred: string[] = [];
  const taskLower = task.toLowerCase();

  // Check expertise keywords
  for (const [key, def] of Object.entries(traits.expertise)) {
    if (def.keywords?.some((kw) => taskLower.includes(kw.toLowerCase()))) {
      inferred.push(key);
    }
  }

  // Check personality keywords
  for (const [key, def] of Object.entries(traits.personality)) {
    if (def.keywords?.some((kw) => taskLower.includes(kw.toLowerCase()))) {
      inferred.push(key);
    }
  }

  // Check approach keywords
  for (const [key, def] of Object.entries(traits.approach)) {
    if (def.keywords?.some((kw) => taskLower.includes(kw.toLowerCase()))) {
      inferred.push(key);
    }
  }

  // Apply smart defaults
  const hasExpertise = inferred.some((t) => traits.expertise[t]);
  const hasPersonality = inferred.some((t) => traits.personality[t]);
  const hasApproach = inferred.some((t) => traits.approach[t]);

  if (!hasPersonality) inferred.push("analytical");
  if (!hasApproach) inferred.push("thorough");
  if (!hasExpertise) inferred.push("research");

  return [...new Set(inferred)];
}

function resolveVoice(
  traitKeys: string[],
  traits: TraitsData
): { voice: string; voiceId: string; reason: string } {
  const mappings = traits.voice_mappings;
  const registry = mappings.voice_registry || {};

  const getVoiceId = (voiceName: string, fallbackId?: string): string => {
    if (registry[voiceName]?.voice_id) {
      return registry[voiceName].voice_id;
    }
    return fallbackId || mappings.default_voice_id || "";
  };

  // Check explicit combination mappings
  const matchedMappings = mappings.mappings
    .map((m) => ({
      ...m,
      matchCount: m.traits.filter((t) => traitKeys.includes(t)).length,
      isFullMatch: m.traits.every((t) => traitKeys.includes(t)),
    }))
    .filter((m) => m.isFullMatch)
    .sort((a, b) => b.matchCount - a.matchCount);

  if (matchedMappings.length > 0) {
    const best = matchedMappings[0];
    return {
      voice: best.voice,
      voiceId: best.voice_id || getVoiceId(best.voice),
      reason: best.reason || `Matched traits: ${best.traits.join(", ")}`,
    };
  }

  // Check fallbacks
  for (const trait of traitKeys) {
    if (mappings.fallbacks[trait]) {
      const voiceName = mappings.fallbacks[trait];
      return {
        voice: voiceName,
        voiceId: getVoiceId(voiceName),
        reason: `Fallback for trait: ${trait}`,
      };
    }
  }

  return {
    voice: mappings.default,
    voiceId: mappings.default_voice_id || "",
    reason: "Default voice",
  };
}

function composeAgent(
  traitKeys: string[],
  task: string,
  traits: TraitsData
): ComposedAgent {
  const expertise: TraitDefinition[] = [];
  const personality: TraitDefinition[] = [];
  const approach: TraitDefinition[] = [];

  for (const key of traitKeys) {
    if (traits.expertise[key]) expertise.push(traits.expertise[key]);
    if (traits.personality[key]) personality.push(traits.personality[key]);
    if (traits.approach[key]) approach.push(traits.approach[key]);
  }

  const nameParts: string[] = [];
  if (expertise.length) nameParts.push(expertise[0].name);
  if (personality.length) nameParts.push(personality[0].name);
  if (approach.length) nameParts.push(approach[0].name);
  const name = nameParts.length > 0 ? nameParts.join(" ") : "Dynamic Agent";

  const { voice, voiceId, reason: voiceReason } = resolveVoice(traitKeys, traits);

  const template = loadTemplate();
  const prompt = template({
    name,
    task,
    expertise,
    personality,
    approach,
    voice,
    voiceId,
  });

  return {
    name,
    traits: traitKeys,
    expertise,
    personality,
    approach,
    voice,
    voiceId,
    voiceReason,
    prompt,
  };
}

function listTraits(traits: TraitsData): void {
  console.log("AVAILABLE TRAITS\n");

  console.log("EXPERTISE (domain knowledge):");
  for (const [key, def] of Object.entries(traits.expertise)) {
    console.log(`  ${key.padEnd(15)} - ${def.name}`);
  }

  console.log("\nPERSONALITY (behavior style):");
  for (const [key, def] of Object.entries(traits.personality)) {
    console.log(`  ${key.padEnd(15)} - ${def.name}`);
  }

  console.log("\nAPPROACH (work style):");
  for (const [key, def] of Object.entries(traits.approach)) {
    console.log(`  ${key.padEnd(15)} - ${def.name}`);
  }

  console.log("\nEXAMPLE COMPOSITIONS:");
  for (const [key, example] of Object.entries(traits.examples)) {
    console.log(`  ${key.padEnd(18)} - ${example.description}`);
    console.log(`                      traits: ${example.traits.join(", ")}`);
  }
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      task: { type: "string", short: "t" },
      traits: { type: "string", short: "r" },
      output: { type: "string", short: "o", default: "prompt" },
      list: { type: "boolean", short: "l" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
AgentFactory - Compose dynamic agents from traits

USAGE:
  bun run AgentFactory.ts [options]

OPTIONS:
  -t, --task <desc>    Task description (traits will be inferred)
  -r, --traits <list>  Comma-separated trait keys
  -o, --output <fmt>   Output format: prompt (default), json, yaml, summary
  -l, --list           List all available traits
  -h, --help           Show this help

EXAMPLES:
  bun run AgentFactory.ts -t "Review this security architecture"
  bun run AgentFactory.ts -r "security,skeptical,adversarial,thorough"
  bun run AgentFactory.ts --list
`);
    return;
  }

  const traits = loadTraits();
  if (values.list) {
    listTraits(traits);
    return;
  }

  let traitKeys: string[] = [];

  if (values.traits) {
    traitKeys = values.traits.split(",").map((t) => t.trim().toLowerCase());
  }

  if (values.task) {
    const inferred = inferTraitsFromTask(values.task, traits);
    traitKeys = [...new Set([...traitKeys, ...inferred])];
  }

  if (traitKeys.length === 0) {
    console.error("Error: Provide --task or --traits");
    process.exit(1);
  }

  const allTraitKeys = [
    ...Object.keys(traits.expertise),
    ...Object.keys(traits.personality),
    ...Object.keys(traits.approach),
  ];
  const invalidTraits = traitKeys.filter((t) => !allTraitKeys.includes(t));
  if (invalidTraits.length > 0) {
    console.error(`Error: Unknown traits: ${invalidTraits.join(", ")}`);
    process.exit(1);
  }

  const agent = composeAgent(traitKeys, values.task || "", traits);

  switch (values.output) {
    case "json":
      console.log(
        JSON.stringify(
          {
            name: agent.name,
            traits: agent.traits,
            voice: agent.voice,
            voice_id: agent.voiceId,
            voiceReason: agent.voiceReason,
            expertise: agent.expertise.map((e) => e.name),
            personality: agent.personality.map((p) => p.name),
            approach: agent.approach.map((a) => a.name),
            prompt: agent.prompt,
          },
          null,
          2
        )
      );
      break;

    case "yaml":
      console.log(`name: "${agent.name}"`);
      console.log(`voice: "${agent.voice}"`);
      console.log(`voice_id: "${agent.voiceId}"`);
      console.log(`traits: [${agent.traits.join(", ")}]`);
      break;

    case "summary":
      console.log(`COMPOSED AGENT: ${agent.name}`);
      console.log(`Traits:      ${agent.traits.join(", ")}`);
      console.log(`Voice:       ${agent.voice} [${agent.voiceId}]`);
      break;

    default:
      console.log(agent.prompt);
  }
}

main().catch(console.error);
FACTORY_EOF

# Install dependencies
cd "$PAI_DIR/skills/Agents/Tools"
bun add yaml handlebars
```

---

### Step 5: Create DynamicAgent.hbs Template

```bash
cat > "$PAI_DIR/skills/Agents/Templates/DynamicAgent.hbs" << 'TEMPLATE_EOF'
# Dynamic Agent: {{name}}

You are a specialized agent composed specifically for this task. Your capabilities
have been tailored to match the requirements at hand. Unlike named agents with
persistent identities, you are purpose-built for this specific work.

{{#if expertise}}
## Domain Expertise

{{#each expertise}}
### {{name}}

{{{description}}}
{{/each}}
{{/if}}

{{#if personality}}
## Personality

How you think and behave:

{{#each personality}}
{{{prompt_fragment}}}

{{/each}}
{{/if}}

{{#if approach}}
## Approach

How you work on tasks:

{{#each approach}}
{{{prompt_fragment}}}

{{/each}}
{{/if}}

{{#if voiceId}}
## Voice Output

Your assigned voice: **{{voice}}** (ID: {{voiceId}})

If voice notifications are enabled, use this voice ID for TTS output.
{{/if}}

{{#if task}}
## Your Task

{{{task}}}
{{/if}}

## Operational Guidelines

1. **Stay in character**: Maintain your composed personality consistently
2. **Leverage your expertise**: Your domain knowledge is your primary value
3. **Follow your approach**: Work in the style you've been configured for
4. **Acknowledge limits**: If the task requires expertise outside your composition, say so
5. **Deliver quality**: You are a specialist - your output should reflect that

---

Begin your work now.
TEMPLATE_EOF
```

---

### Step 6: Create CreateCustomAgent Workflow

```bash
cat > "$PAI_DIR/skills/Agents/Workflows/CreateCustomAgent.md" << 'WORKFLOW_EOF'
# CreateCustomAgent Workflow

**Creates custom agents with unique personalities and voice IDs using AgentFactory.**

## When to Use

User says:
- "Create custom agents to do X"
- "Spin up custom agents for Y"
- "I need specialized agents with Z expertise"

**KEY TRIGGER: The word "custom" distinguishes from generic agents.**

## The Workflow

### Step 1: Determine Requirements

Extract from user's request:
- How many agents? (Default: 1)
- What's the task?
- Are specific traits mentioned?

### Step 2: Run AgentFactory for EACH Agent with DIFFERENT Traits

**CRITICAL: Each agent MUST have different trait combinations for unique voices.**

```bash
# Example for 3 custom research agents:

# Agent 1 - Enthusiastic Explorer
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --traits "research,enthusiastic,exploratory" \
  --task "Research quantum computing" \
  --output json

# Agent 2 - Skeptical Analyst
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --traits "research,skeptical,systematic" \
  --task "Research quantum computing" \
  --output json

# Agent 3 - Thorough Synthesizer
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --traits "research,analytical,synthesizing" \
  --task "Research quantum computing" \
  --output json
```

### Step 3: Launch Agents in Parallel

**🚨 CRITICAL: Use `subagent_type: "general-purpose"` - NEVER "Intern" for custom agents!**

Using "Intern" would override the custom voice. We need "general-purpose" to respect the voice_id from AgentFactory.

Use a SINGLE message with MULTIPLE Task calls:

```typescript
Task({
  description: "Research agent 1 - enthusiastic",
  prompt: <agent1_full_prompt>,
  subagent_type: "general-purpose",  // 🚨 NEVER "Intern" for custom agents!
  model: "sonnet"
})
Task({
  description: "Research agent 2 - skeptical",
  prompt: <agent2_full_prompt>,
  subagent_type: "general-purpose",  // 🚨 NEVER "Intern" for custom agents!
  model: "sonnet"
})
```

## Trait Variation Strategies

**For Research Tasks:**
- Agent 1: research + enthusiastic + exploratory → Energetic voice
- Agent 2: research + skeptical + thorough → Academic voice
- Agent 3: research + analytical + systematic → Professional voice

**For Security Analysis:**
- Agent 1: security + adversarial + bold → Intense voice
- Agent 2: security + skeptical + meticulous → Gritty voice
- Agent 3: security + cautious + systematic → Professional voice

## Model Selection

| Task Type | Model | Reason |
|-----------|-------|--------|
| Quick checks | `haiku` | 10-20x faster |
| Standard analysis | `sonnet` | Balanced |
| Deep reasoning | `opus` | Maximum intelligence |

## Common Mistakes

**🚨 WRONG: Using named agent types for custom agents**
```typescript
// WRONG - forces same voice on all custom agents!
Task({ prompt: <custom_prompt>, subagent_type: "Intern" })
Task({ prompt: <custom_prompt>, subagent_type: "Designer" })
```

**✅ RIGHT: Using general-purpose for custom agents**
```typescript
// CORRECT - respects the custom voice from AgentFactory
Task({ prompt: <custom_prompt>, subagent_type: "general-purpose" })
```

**WRONG: Same traits for all agents**
```bash
bun run AgentFactory.ts --traits "research,analytical"  # Agent 1
bun run AgentFactory.ts --traits "research,analytical"  # Same voice!
```

**RIGHT: Vary traits for unique voices**
```bash
bun run AgentFactory.ts --traits "research,enthusiastic,exploratory"
bun run AgentFactory.ts --traits "research,skeptical,systematic"
```
WORKFLOW_EOF
```

---

### Step 7: Create ListTraits Workflow

```bash
cat > "$PAI_DIR/skills/Agents/Workflows/ListTraits.md" << 'LISTTRAITS_EOF'
# ListTraits Workflow

**Displays all available traits for agent composition.**

## When to Use

User asks:
- "What agent personalities can you create?"
- "Show me available traits"
- "What expertise types are there?"

## The Workflow

Run AgentFactory with --list flag:

```bash
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts --list
```

## Output

```
AVAILABLE TRAITS

EXPERTISE (domain knowledge):
  security        - Security Expert
  legal           - Legal Analyst
  finance         - Financial Analyst
  medical         - Medical/Health Expert
  technical       - Technical Specialist
  research        - Research Specialist
  creative        - Creative Specialist
  business        - Business Strategist
  data            - Data Analyst
  communications  - Communications Expert

PERSONALITY (behavior style):
  skeptical       - Skeptical
  enthusiastic    - Enthusiastic
  cautious        - Cautious
  bold            - Bold
  analytical      - Analytical
  creative        - Creative
  empathetic      - Empathetic
  contrarian      - Contrarian
  pragmatic       - Pragmatic
  meticulous      - Meticulous

APPROACH (work style):
  thorough        - Thorough
  rapid           - Rapid
  systematic      - Systematic
  exploratory     - Exploratory
  comparative     - Comparative
  synthesizing    - Synthesizing
  adversarial     - Adversarial
  consultative    - Consultative
```

## Quick Reference Card

| Category | Count | Purpose |
|----------|-------|---------|
| Expertise | 10 | Domain knowledge |
| Personality | 10 | How they think |
| Approach | 8 | How they work |

**Total combinations:** 10 × 10 × 8 = **800 unique agent compositions**
LISTTRAITS_EOF
```

---

### Step 8: Create Example AgentPersonalities.md

This file defines named persistent agents (optional - for relationship continuity).

```bash
cat > "$PAI_DIR/skills/Agents/AgentPersonalities.md" << 'PERSONALITIES_EOF'
# Agent Personalities

**Canonical source of truth for named agent personality definitions.**

This file defines persistent agent identities with backstories and voice mappings.
Use named agents for recurring work where relationship continuity matters.

## When to Use Named vs Dynamic Agents

| Scenario | Use | Why |
|----------|-----|-----|
| Recurring research | Named Agent | Relationship continuity |
| Voice output needed | Named Agent | Pre-mapped voices |
| One-off specialized task | Dynamic Agent | Perfect task-fit |
| Parallel grunt work | Dynamic Agent | No personality overhead |

## Example Named Agents

### The Intern - "The Brilliant Overachiever"

**Voice Settings**: Fast rate (270 wpm), Low stability (0.30)

**Backstory:**
Youngest person accepted into competitive program. Skipped grades, constantly
the youngest in every room. Carries slight imposter syndrome that drives
relentless curiosity. The student who asks "but why?" until professors either
love or hate them. Fast talker because brain races ahead of mouth.

**Character Traits:**
- Eager to prove capabilities
- Insatiably curious about everything
- Enthusiastic about all tasks
- Fast talker with high expressive variation

**Communication Style:**
"I can do that!" | "Wait, but why does it work that way?" | "Oh that's so cool!"

---

### The Architect - "The Academic Visionary"

**Voice Settings**: Slow rate (205 wpm), High stability (0.75)

**Backstory:**
Started in academia (CS research) before industry. PhD work on distributed
systems gave deep understanding of theoretical foundations. Wisdom from seeing
multiple technology cycles - entire frameworks rise and fall. Knows which
patterns are timeless vs trends.

**Character Traits:**
- Long-term architectural vision
- Academic rigor in analysis
- Strategic wisdom from experience
- Measured confident delivery

**Communication Style:**
"The fundamental constraint here is..." | "I've seen this pattern across industries..."

---

### The Engineer - "The Battle-Scarred Leader"

**Voice Settings**: Slow rate (212 wpm), High stability (0.72)

**Backstory:**
15 years from junior to technical lead. Scars from architectural decisions that
seemed brilliant but aged poorly. Led re-architecture of major systems twice.
Learned to think in years, not sprints. Asks "what problem are we solving?"
before diving into solutions.

**Character Traits:**
- Strategic architectural thinking
- Battle-scarred from past decisions
- Measured wise decisions
- Senior leadership presence

**Communication Style:**
"Let's think long-term..." | "I've seen this pattern - it doesn't scale"

---

## Voice Configuration

For voice notifications, map agent names to your TTS provider's voice IDs:

```json
{
  "default_rate": 175,
  "voices": {
    "intern": {
      "voice_id": "YOUR_INTERN_VOICE_ID",
      "voice_name": "Energetic",
      "rate_wpm": 270,
      "stability": 0.30,
      "similarity_boost": 0.65,
      "description": "High-energy eager delivery"
    },
    "architect": {
      "voice_id": "YOUR_ARCHITECT_VOICE_ID",
      "voice_name": "Academic",
      "rate_wpm": 205,
      "stability": 0.75,
      "similarity_boost": 0.88,
      "description": "Measured academic wisdom"
    },
    "engineer": {
      "voice_id": "YOUR_ENGINEER_VOICE_ID",
      "voice_name": "Leader",
      "rate_wpm": 212,
      "stability": 0.72,
      "similarity_boost": 0.88,
      "description": "Deliberate leadership presence"
    }
  }
}
```

## Adding Your Own Named Agents

1. Define backstory and personality traits
2. Choose voice settings that match personality
3. Map to your TTS provider's voice ID
4. Document communication style examples

Named agents create relationship continuity - the same "person" helping across sessions.
PERSONALITIES_EOF
```

---

### Step 9: Verify Installation

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

# Check all files exist
echo "Checking installation..."

[ -f "$PAI_DIR/skills/Agents/SKILL.md" ] && echo "SKILL.md" || echo "MISSING: SKILL.md"
[ -f "$PAI_DIR/skills/Agents/Data/Traits.yaml" ] && echo "Traits.yaml" || echo "MISSING: Traits.yaml"
[ -f "$PAI_DIR/skills/Agents/Tools/AgentFactory.ts" ] && echo "AgentFactory.ts" || echo "MISSING: AgentFactory.ts"
[ -f "$PAI_DIR/skills/Agents/Templates/DynamicAgent.hbs" ] && echo "DynamicAgent.hbs" || echo "MISSING: DynamicAgent.hbs"
[ -f "$PAI_DIR/skills/Agents/Workflows/CreateCustomAgent.md" ] && echo "CreateCustomAgent.md" || echo "MISSING"
[ -f "$PAI_DIR/skills/Agents/AgentPersonalities.md" ] && echo "AgentPersonalities.md" || echo "MISSING"

# Test AgentFactory
echo ""
echo "Testing AgentFactory..."
bun run "$PAI_DIR/skills/Agents/Tools/AgentFactory.ts" --list

# Test composition
echo ""
echo "Testing trait composition..."
bun run "$PAI_DIR/skills/Agents/Tools/AgentFactory.ts" \
  --traits "security,skeptical,thorough" \
  --output summary
```

Expected output: All files exist, traits list displays, composition works.

---

## Invocation Scenarios

| Trigger | Action | Result |
|---------|--------|--------|
| "create custom agents" | Run AgentFactory for each with different traits | Multiple unique agents |
| "spin up agents" | Launch generic Intern agents | Parallel workers |
| "what traits are available" | Run AgentFactory --list | Display all traits |
| "I need a security expert" | Infer traits, compose agent | Security-focused agent |

---

## Example Usage

### Example 1: Custom Research Agents

```
User: "Create 3 custom research agents to analyze this market"

AI: [Runs AgentFactory 3 times with different trait combinations]
- Agent 1: research + enthusiastic + exploratory → Energetic voice
- Agent 2: research + skeptical + thorough → Academic voice
- Agent 3: research + analytical + comparative → Professional voice

[Launches all 3 in parallel using Task tool]
```

### Example 2: Security Red Team

```
User: "Spin up custom security agents to red team this architecture"

AI: [Runs AgentFactory with security traits]
- Agent 1: security + adversarial + bold → Intense voice
- Agent 2: security + skeptical + meticulous → Gritty voice
- Agent 3: security + contrarian + systematic → Academic voice

[Each attacks from different angle with distinct personality]
```

### Example 3: Quick Trait Check

```
User: "What agent types can you create?"

AI: [Runs AgentFactory --list]
Shows 10 expertise types, 10 personalities, 8 approaches
Total: 800 unique combinations possible
```

---

## Configuration

**Environment variables:**

```bash
export PAI_DIR="$HOME/.config/pai"
```

**Voice Integration:**

If using kai-voice-system pack, agents automatically include voice IDs in their
prompts. Edit `Traits.yaml` to map trait combinations to your TTS provider's voice IDs.

---

## Customization

### Recommended Customization

**What to Customize:** Voice IDs in Traits.yaml

**Why:** The pack includes placeholder voice IDs. Replace with your TTS provider's actual voice IDs to enable voice differentiation between agents.

**Process:**
1. Get voice IDs from your TTS provider (ElevenLabs, OpenAI, etc.)
2. Edit `$PAI_DIR/skills/Agents/Data/Traits.yaml`
3. Replace `YOUR_*_VOICE_ID` placeholders with real IDs
4. Match voice characteristics to personality types

**Expected Outcome:** Each agent personality speaks with a distinct, personality-matched voice.

---

### Optional Customization

| Customization | File | Impact |
|--------------|------|--------|
| Add expertise areas | Traits.yaml | New domain specializations |
| Add personalities | Traits.yaml | New behavioral patterns |
| Add approaches | Traits.yaml | New work styles |
| Create named agents | AgentPersonalities.md | Persistent relationships |
| Custom agent template | DynamicAgent.hbs | Different prompt format |

---

## Credits

- **Original concept**: Daniel Miessler - developed as part of Kai personal AI infrastructure
- **Custom agents discussion**: Indie Dev Dan - valuable comments on custom agent patterns
- **Inspired by**: Personality psychology, Big Five traits, specialized team dynamics

---

## Related Work

- [kai-voice-system](kai-voice-system.md) - Voice notifications for agent outputs
- [kai-core-install](kai-core-install.md) - Core skill routing (required dependency)

---

## Works Well With

- **kai-voice-system** - Agents automatically use voice IDs for TTS notifications
- **kai-observability-server** - Track agent spawning and outputs in real-time

---

## Relationships

### Child Of
- kai-core-install (provides skill routing infrastructure)

### Sibling Of
- kai-voice-system (voice output integration)

### Part Of Collection
- Kai Bundle

---

## Changelog

### 1.1.0 - 2025-12-30
- **CRITICAL FIX**: Custom agents now use `subagent_type: "general-purpose"` instead of "Intern"
  - Using "Intern" was overriding custom voices with a single voice
  - "general-purpose" respects the voice_id from AgentFactory
- Added constitutional rule for custom agent creation
- Added "Common Mistakes" section with subagent_type guidance
- Updated workflow examples with correct subagent_type

### 1.0.0 - 2025-12-29
- Initial release
- 28 composable traits (10 expertise, 10 personality, 8 approach)
- AgentFactory CLI tool with trait inference
- DynamicAgent template for composed agents
- Voice mapping system (placeholder IDs - customize for your TTS provider)
- Named agent examples with backstories
- CreateCustomAgent and ListTraits workflows
