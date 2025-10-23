---
name: skill-name
description: Capability using specialized agents. Supports parallel execution of up to 10 agents. USE WHEN user requests [domain] work, [capability], or says 'trigger phrase'.
---

# Skill Name - Agent-Powered Capability

## When to Activate This Skill
- Task requiring specialized agent expertise
- Complex multi-step workflows in [domain]
- Requests for [specific capability]
- User mentions [domain keywords]
- Work that benefits from parallel execution

## Available Agents

### Agent 1 Name (Role)
**Training:** [Specialization and methodology]
**Voice:** [ElevenLabs Voice ID]
**Configuration:** `${CLAUDE_PLUGIN_ROOT}/agents/[agent-name].md`
**Parallel Execution:** Can launch up to 10 agents for [work type]

**Primary Responsibilities:**
- Responsibility 1
- Responsibility 2
- Responsibility 3

**Use when:**
- Scenario 1
- Scenario 2
- Scenario 3

### Agent 2 Name (Role)
**Training:** [Specialization and methodology]
**Voice:** [ElevenLabs Voice ID]
**Configuration:** `${CLAUDE_PLUGIN_ROOT}/agents/[agent-name].md`
**Parallel Execution:** Can launch up to 10 agents for [work type]

**Primary Responsibilities:**
- Responsibility 1
- Responsibility 2
- Responsibility 3

**Use when:**
- Scenario 1
- Scenario 2
- Scenario 3

## Execution Workflow

### Single Agent Execution

**When to use:**
- Sequential work required
- Shared state dependencies
- Foundation work that blocks others

**Process:**
```markdown
1. Launch agent with specific task
2. Agent completes work
3. Review results
4. Proceed to next step
```

### Parallel Agent Execution (Up to 10 Agents)

**When to use:**
- Independent tasks can run simultaneously
- No shared state dependencies
- Maximum throughput needed

**Parallelizable Work:**
- Independent [work type] 1
- Independent [work type] 2
- Independent [work type] 3
- Multiple [domain objects] without dependencies

**Sequential Work (DO NOT PARALLELIZE):**
- Tasks with shared state
- Foundation setup blocking other work
- Dependencies requiring strict ordering
- Work requiring synchronization

**How to launch parallel agents:**
```
Launch multiple agents in SINGLE message with multiple Task tool calls:
- Task: "Agent 1 - Work item A"
- Task: "Agent 1 - Work item B"
- Task: "Agent 2 - Work item C"
[Up to 10 total agents]
```

**Best Practices:**
1. Identify parallelizable work upfront
2. Launch all parallel agents in ONE message
3. Wait for all to complete before proceeding
4. Use synchronization points between phases
5. Monitor progress and collect results

## Agent Collaboration Protocol

### Workflow Handoff

1. **Agent 1** completes [phase]:
   - Deliverable 1
   - Deliverable 2
   - All artifacts complete
   - Can parallelize [work type]

2. **Agent 2** begins [next phase]:
   - Validates Agent 1 artifacts exist
   - Asks Agent 1 for clarifications if needed
   - Can parallelize [work type marked for parallel]

3. **Handoff Protocol:**
   - Agent 1 announces: "Agent 1 completed [deliverable]"
   - Agent 2 validates all artifacts
   - Agent 2 asks questions during work if needed
   - Both validate [quality standard] at each phase

4. **Parallel Execution Protocol:**
   - Identify all [parallel markers] in work breakdown
   - Launch multiple agents in SINGLE message
   - Maximum 10 agents simultaneously
   - Wait for all to complete before dependent work
   - Synchronize at phase boundaries

### Communication Standards

- **Voice notifications:** Agents use ElevenLabs voices for completion
- **Progress updates:** Every 60-90 seconds during active work
- **Explicit uncertainty:** Use [NEEDS CLARIFICATION] markers
- **Quality validation:** Check standards before proceeding

### Collaboration Examples

**Scenario 1: [Common Issue]**
- Agent 2 encounters [problem] during work
- Agent 2 asks: "[Specific question]"
- Agent 1 [resolution approach]
- Agent 2 proceeds with [next step]

**Scenario 2: [Another Issue]**
- Agent 1 finds [condition requiring adjustment]
- Agent 1 documents [justification]
- Agent 2 reviews and approves/rejects
- Both update [shared resource] if approved

**Scenario 3: [Technical Challenge]**
- Agent 2 hits [blocker] not in plan
- Agent 2 asks: "[Question about approach]"
- Agent 1 evaluates options, updates [plan/spec]
- Agent 2 implements updated approach

## Main Workflow

### Step 1: [Initialization]
[Setup instructions]

### Step 2: [Agent Launch]
[Instructions for launching appropriate agents]

### Step 3: [Monitoring]
[How to monitor agent progress]

### Step 4: [Results Collection]
[How to collect and synthesize agent outputs]

### Step 5: [Validation]
[How to validate final results]

## Speed Benefits

- ❌ **Old approach:** Sequential execution → [timeframe]
- ✅ **New approach:** Parallel agents → [improved timeframe]

## Supplementary Resources

For agent configurations: `read ${CLAUDE_PLUGIN_ROOT}/agents/[agent-name].md`
For full methodology: `read ${CLAUDE_PLUGIN_ROOT}/skills/[skill-name]/CLAUDE.md`
For workflow details: `read ${CLAUDE_PLUGIN_ROOT}/commands/[command-name].md`

## Key Principles

1. **Parallel when possible** - Maximize throughput with concurrent agents
2. **Sequential when necessary** - Don't parallelize dependent work
3. **Clear handoffs** - Explicit communication between agents
4. **Quality gates** - Validation at each phase transition
5. **Synchronization points** - Coordinate at phase boundaries
