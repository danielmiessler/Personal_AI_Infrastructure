# Parallel Task Workflow

## Trigger
User says: "parallel example", "parallel task", "show me agent orchestration"

## Purpose
Demonstrate using multiple agents for parallel execution of independent tasks.

## Workflow

### Step 1: Analyze Task for Parallelization
Determine if task can be split into independent subtasks:
- Are subtasks independent?
- Can they run simultaneously?
- Is there a common pattern?
- Will parallel execution provide benefit?

### Step 2: Design Agent Fleet
```
Main Task
  ├─ Subtask 1 → Agent 1
  ├─ Subtask 2 → Agent 2
  ├─ Subtask 3 → Agent 3
  └─ Subtask N → Agent N
```

### Step 3: Launch Agents in Parallel
```typescript
// Conceptual example
const agents = [
  {task: "Process file 1", agent: "intern"},
  {task: "Process file 2", agent: "intern"},
  {task: "Process file 3", agent: "intern"}
];

// Launch all at once
const results = await Promise.all(
  agents.map(({task, agent}) => launchAgent(agent, task))
);
```

### Step 4: Provide Full Context to Each Agent
Each agent needs:
- Complete understanding of their specific subtask
- Access to necessary resources
- Clear success criteria
- Knowledge of the overall goal

**CRITICAL:** Never send agents into work without full context!

### Step 5: Wait for Completion
All agents complete simultaneously (not sequentially).

### Step 6: Spotcheck Results
Launch ONE additional agent to verify:
- All tasks completed successfully
- Results are consistent
- No errors or issues
- Quality meets requirements

### Step 7: Consolidate and Return
- Combine agent results
- Format final output
- Provide summary to user

## Example Scenario

**Task:** Update 5 configuration files with new format

**Parallel Execution:**
```
Launch 5 agents simultaneously:
  Agent 1 → Update config1.yml
  Agent 2 → Update config2.yml
  Agent 3 → Update config3.yml
  Agent 4 → Update config4.yml
  Agent 5 → Update config5.yml

All complete in parallel (not sequential)

Then:
  Spotcheck Agent → Verify all 5 files correct

Result: 5 files updated in time of 1
```

## When to Use Parallel Agents

**Use parallel agents when:**
- 3+ similar independent tasks
- Tasks have no dependencies
- Results need to be logged/saved
- Speed matters
- Task can be parallelized

**Don't use parallel agents when:**
- Tasks are dependent (must run sequentially)
- Only 1-2 tasks total
- Interactive user feedback needed
- Tasks are too quick to benefit from parallelization

## Parallel Agent Patterns

### Pattern 1: Same Operation, Different Targets
```
Task: Update 10 files with same pattern
→ Launch 10 agents, each updates 1 file
→ Spotcheck verifies consistency
```

### Pattern 2: Different Operations, Independent
```
Task: Gather data from 5 APIs
→ Launch 5 agents, each calls 1 API
→ Consolidate results
```

### Pattern 3: Analysis and Research
```
Task: Research topic from multiple perspectives
→ Launch N agents with different angles
→ Combine insights
```

## Best Practices

### Providing Context
```markdown
Good Agent Prompt:
"Update config1.yml following this pattern:
[detailed pattern explanation]
[example of correct format]
[success criteria]
[reference file to match]"

Bad Agent Prompt:
"Update config1.yml"
```

### Spotcheck Agent
```markdown
Spotcheck Prompt:
"Verify these 10 files were updated correctly:
[list of files]
[what correct looks like]
[what to check for]
[common mistakes to catch]"
```

### Error Handling
- If 1 agent fails, investigate before proceeding
- Spotcheck catches inconsistencies
- Can rerun individual agent if needed
- Log all agent outputs for debugging

## Performance Benefits

**Sequential:**
```
Task 1: 2 minutes
Task 2: 2 minutes
Task 3: 2 minutes
Total: 6 minutes
```

**Parallel:**
```
Task 1, 2, 3: All 2 minutes (simultaneously)
Total: 2 minutes
```

**Speedup:** 3x faster with parallel agents

## Template

```markdown
# Parallel Workflow Name

## Parallelization Check
- [ ] Tasks are independent
- [ ] No dependencies between tasks
- [ ] 3+ similar operations
- [ ] Speed benefit expected

## Agent Fleet Design
- Agent 1: [specific task]
- Agent 2: [specific task]
- Agent N: [specific task]

## Launch Pattern
1. Prepare full context for each agent
2. Launch all agents simultaneously
3. Wait for completion
4. Launch spotcheck agent
5. Consolidate results

## Spotcheck Criteria
- [ ] All tasks completed
- [ ] Results consistent
- [ ] Quality verified
- [ ] No errors detected
```

## Key Insight
Parallel agents are about **SPEED** through **SIMULTANEITY** - not about delegation or complexity. Use them when multiple independent tasks can happen at once.

---

**This pattern is one of PAI's most powerful features for high-velocity work.**
