# ParallelDispatch Workflow

> **Trigger:** Multiple independent problems that can be investigated concurrently
> **Input:** 2+ independent problem domains
> **Output:** All problems solved with no conflicts

## Checklist

- [ ] Identify all independent problem domains
- [ ] Verify problems are truly independent (no shared state)
- [ ] Create focused agent task for each domain
- [ ] Dispatch all agents in parallel (single message with multiple Task calls)
- [ ] Wait for all agents to return
- [ ] Review each summary
- [ ] Check for conflicts between changes
- [ ] Run full test suite
- [ ] Integrate all fixes

## Process

### 1. Identify Domains
Group failures by what's broken. Each domain should be independent.

### 2. Verify Independence
- Fixes in one domain shouldn't affect others
- Agents won't edit same files
- No shared state between investigations

### 3. Create Agent Tasks
Each agent gets:
- Specific scope (one domain)
- Clear goal
- Constraints (what NOT to change)
- Expected output format

### 4. Parallel Dispatch
```typescript
// Single message with multiple Task calls
Task("Fix problem-domain-1")
Task("Fix problem-domain-2")
Task("Fix problem-domain-3")
// All run concurrently
```

### 5. Integration
When agents return:
- Review summaries
- Check for conflicts
- Run full test suite
- Integrate changes

## Red Flags

- **Related failures** - Investigate together instead
- **Shared state** - Use sequential agents
- **Vague scope** - Make agent tasks more specific
- **No output format** - Always specify what agent should return

## Completion

Parallel dispatch is complete when:
1. All agents have returned with summaries
2. No conflicts detected between changes
3. Full test suite passes
4. All changes integrated

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| Per-agent debugging | SystematicDebugging |
| Per-agent TDD | TestDrivenDevelopment |
