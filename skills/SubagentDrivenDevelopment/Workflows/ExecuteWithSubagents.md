# ExecuteWithSubagents Workflow

> **Trigger:** Have implementation plan with independent tasks, execute in current session
> **Input:** Implementation plan from WritingPlans
> **Output:** Implemented features with all reviews passed

## Checklist

- [ ] Announce: "I'm using SubagentDrivenDevelopment to execute this plan."
- [ ] Read plan file once, extract ALL tasks with full text
- [ ] Note context needed for each task
- [ ] Create TodoWrite with all tasks

### Per Task:
- [ ] Dispatch implementer subagent with full task text + context
- [ ] Answer any questions from implementer
- [ ] Wait for implementer to complete (implement, test, commit, self-review)
- [ ] Dispatch spec reviewer subagent
- [ ] If spec issues: implementer fixes, re-review until ✅
- [ ] Dispatch code quality reviewer subagent
- [ ] If quality issues: implementer fixes, re-review until ✅
- [ ] Mark task complete in TodoWrite

### After All Tasks:
- [ ] Dispatch final code reviewer for entire implementation
- [ ] Use FinishingBranch skill

## Process

### 1. Plan Extraction
Read plan once, extract all tasks upfront. Don't make subagents read the file.

### 2. Per-Task Execution
One implementer subagent per task. Fresh context = no pollution.

### 3. Two-Stage Review
1. **Spec compliance** - Does code match spec? (nothing missing, nothing extra)
2. **Code quality** - Is code well-built? (clean, tested, maintainable)

### 4. Review Loops
If reviewer finds issues → implementer fixes → reviewer re-reviews → repeat until ✅

## Prompt Templates

- `./implementer-prompt.md` - For dispatching implementer
- `./spec-reviewer-prompt.md` - For spec compliance review
- `./code-quality-reviewer-prompt.md` - For code quality review

## Completion

Execution is complete when:
1. All tasks from plan implemented
2. All spec compliance reviews passed
3. All code quality reviews passed
4. Final code review approved
5. Ready to merge

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| Per-task TDD | TestDrivenDevelopment |
| All tasks complete | FinishingBranch |
