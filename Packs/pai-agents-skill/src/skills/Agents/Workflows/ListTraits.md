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

**Total combinations:** 10 x 10 x 8 = **800 unique agent compositions**
