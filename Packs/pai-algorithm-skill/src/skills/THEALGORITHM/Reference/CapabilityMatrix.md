# Capability Matrix

**Source of Truth:** `Data/Capabilities.yaml`

This document describes what capabilities are unlocked at each effort level. Effort classification happens FIRST and determines which tools are available.

## The Matrix

| Effort Level | Models | Thinking | Debate | Analysis | Research | Execution | Verification | Parallel |
|--------------|--------|----------|--------|----------|----------|-----------|--------------|----------|
| **TRIVIAL** | — | — | — | — | — | — | — | 0 |
| **QUICK** | haiku | — | — | — | — | Intern | — | 1 |
| **STANDARD** | haiku, sonnet | deep thinking | — | FirstPrinciples, Science | single | Engineer, QA, Designer | Browser, Skeptical | 1-3 |
| **THOROUGH** | haiku, sonnet | All | Council | All | parallel | All + Architect, Pentester | All | 3-5 |
| **DETERMINED** | all + opus | All | Council + RedTeam | All | all | unlimited | All | 10 |

## Detailed Breakdown

### TRIVIAL (Skip Algorithm)
- **When:** Greetings, simple Q&A, acknowledgments
- **Capabilities:** None - direct response, no ISC
- **ISC Rows:** 0
- **Example:** "Hello", "Thanks", "What's 2+2?"

### QUICK
- **When:** Single-step tasks, simple lookups, quick fixes
- **Capabilities:**
  - `models.haiku` - Fast, cheap execution
  - `execution.intern` - Parallel grunt work, simple tasks
- **ISC Rows:** Typically 1-3, but can be more if needed
- **Traits Added:** rapid, pragmatic
- **Max Parallel:** 1
- **Example:** "Fix the typo in README", "What does this function do?"

### STANDARD
- **When:** Multi-step tasks, bounded scope, most development work
- **Capabilities:**
  - `models.haiku` - For spotchecks, parallel work
  - `models.sonnet` - Main reasoning model
  - `thinking.deep thinking` - BeCreative for creative solutions
  - `analysis.first_principles` - Challenge assumptions
  - `analysis.science` - Hypothesis-driven exploration
  - `research.*` (single) - One research agent at a time
  - `execution.engineer` - Implementation
  - `execution.qa_tester` - Testing
  - `execution.designer` - UX/UI
  - `verification.browser` - Web validation
  - `verification.skeptical_verifier` - Independent verification
  - `agent_composition` - AgentFactory for custom agents
- **ISC Rows:** As many as needed to capture ideal state
- **Traits Added:** analytical, systematic
- **Max Parallel:** 3
- **Example:** "Add dark mode to settings", "Create a new API endpoint"

### THOROUGH
- **When:** Complex work, multi-file changes, architectural decisions
- **Capabilities:**
  - All STANDARD capabilities
  - `thinking.tree_of_thought` - Branching exploration
  - `thinking.plan_mode` - EnterPlanMode for approval
  - `debate.council` - 4-agent collaborative analysis
  - `research.*` (parallel) - Multiple research agents simultaneously
  - `execution.architect` - System design decisions
  - `execution.pentester` - Security testing
- **ISC Rows:** Dozens typically, can be hundreds for complex projects
- **Traits Added:** thorough, meticulous
- **Max Parallel:** 5
- **Example:** "Refactor the authentication system", "Design a new microservice"

### DETERMINED
- **When:** Mission-critical, "until done", overnight tasks, unlimited iteration
- **Capabilities:**
  - All capabilities unlocked
  - `models.opus` - Maximum intelligence model
  - `debate.redteam` - 32-agent adversarial analysis
  - Unlimited agents
  - Unlimited iterations
- **ISC Rows:** Can be hundreds or thousands for major projects
- **Traits Added:** thorough, meticulous, adversarial
- **Max Parallel:** 10
- **Example:** "Build the entire feature from scratch", "Security audit everything"

## ISC Scale by Effort

**ISC size is NOT strictly bounded by effort level.** The effort level determines QUALITY expectations and available capabilities, not a hard limit on rows.

| Effort | Typical ISC Size | Quality Standard | Notes |
|--------|------------------|------------------|-------|
| QUICK | 1-5 rows | Good enough | Fast execution, minimal verification |
| STANDARD | 5-20 rows | High | Thorough verification, single-pass research |
| THOROUGH | 20-100 rows | Very high | Multiple research passes, council debate |
| DETERMINED | 50-1000+ rows | Exceptional | Unlimited iteration until perfect |

**Key insight:** A complex problem at DETERMINED effort might have hundreds of ISC rows covering:
- Research findings (what to do)
- Anti-patterns (what to avoid)
- Best practices (how to do it well)
- Edge cases (what to handle)
- Verification criteria (how to confirm)
- Security considerations (what to protect)

## Capability Categories Explained

### Models
Compute resources for reasoning. Higher effort unlocks more powerful models.

| Model | Cost | Speed | Use For |
|-------|------|-------|---------|
| haiku | Low | Fast | Parallel grunt work, spotchecks, simple execution |
| sonnet | Medium | Medium | Analysis, planning, research, standard work |
| opus | High | Slower | Architecture, critical decisions, complex reasoning |

### Thinking Modes
Enhanced reasoning approaches.

| Mode | Skill | When |
|------|-------|------|
| deep thinking | BeCreative | Creative solutions, novel approaches |
| tree_of_thought | BeCreative (workflow) | Complex multi-factor decisions |
| plan_mode | EnterPlanMode tool | Multi-step implementations needing approval |

### Debate Systems
Multi-agent discussion for better decisions.

| System | Agents | Mode | When |
|--------|--------|------|------|
| council | 4 | Collaborative | Design decisions, trade-offs, perspectives |
| redteam | 32 | Adversarial | Stress-testing, find weaknesses, attack surface |

### Analysis Modes
Structured analytical approaches.

| Mode | Skill | When |
|------|-------|------|
| first_principles | FirstPrinciples | Challenge assumptions, find root truths |
| science | Science | Hypothesis-driven exploration, experiments |

### Research Agents
Multi-source information gathering.

| Agent | Model | Strength |
|-------|-------|----------|
| perplexity | PerplexityResearcher | Web research, current events, citations |
| gemini | GeminiResearcher | Multi-perspective, parallel decomposition |
| grok | GrokResearcher | Contrarian analysis, fact-checking |
| claude | ClaudeResearcher | Academic research, scholarly sources |
| codex | CodexResearcher | Technical archaeology, code patterns |

### Execution Agents
Work performers.

| Agent | Model | When |
|-------|-------|------|
| intern | haiku | Parallel grunt work, simple tasks |
| engineer | sonnet | Implementation, coding |
| qa_tester | sonnet | Testing, validation |
| designer | sonnet | UX/UI design |
| architect | opus | System design, architecture |
| pentester | sonnet | Security testing |

### Verification
Validation approaches.

| Method | How | When |
|--------|-----|------|
| browser | Browser skill | Web application validation |
| skeptical_verifier | Custom agent | Independent verification, different from executor |

## Override Methods

### CLI Override
```bash
bun run EffortClassifier.ts --request "any request" --override DETERMINED
```

### Inline Override
```
algorithm effort THOROUGH: build this complex feature
```

The inline pattern is stripped from the request and effort is forced to the specified level.

## Commands

```bash
# Classify effort for a request
bun run ~/.claude/skills/THEALGORITHM/Tools/EffortClassifier.ts --request "your request"

# Load capabilities for an effort level
bun run ~/.claude/skills/THEALGORITHM/Tools/CapabilityLoader.ts --effort STANDARD

# List all capabilities
bun run ~/.claude/skills/THEALGORITHM/Tools/CapabilityLoader.ts --list-all

# Select capabilities for an ISC row
bun run ~/.claude/skills/THEALGORITHM/Tools/CapabilitySelector.ts --row "Research best practices" --effort STANDARD
```
