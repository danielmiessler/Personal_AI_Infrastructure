# Algorithm Preferences

**Customize how THE ALGORITHM operates for you.**

THE ALGORITHM is PAI's universal execution engine: **Current State → Ideal State** via verifiable iteration. This file customizes how it operates for your specific needs.

---

## Verification Preferences

### How thorough should verification be?

- [ ] **Quick** - Basic checks, trust common patterns
- [x] **Standard** - Verify key assertions, spot-check details
- [ ] **Thorough** - Verify everything, multiple validation passes

### Verification Methods
Preferred verification approaches:
- [x] Automated tests when available
- [x] Manual spot-checks for UI/UX
- [x] Browser verification for web changes
- [ ] Require screenshots for visual changes

---

## Iteration Style

### Iteration Speed
- [ ] **Fast** - Make multiple changes per iteration
- [x] **Standard** - One logical change per iteration
- [ ] **Careful** - Small incremental changes only

### When to Pause
Stop and ask before:
- [x] Breaking changes
- [x] Production deployments
- [x] Database migrations
- [x] Security-sensitive changes
- [ ] Any file deletion

---

## Problem-Solving Approach

### When to Plan vs Execute
- **Simple tasks** (< 3 steps): Execute directly
- **Medium tasks** (3-10 steps): Brief plan, then execute
- **Complex tasks** (> 10 steps): Detailed plan, get approval

### Research vs Action
- [ ] **Research-first** - Investigate thoroughly before acting
- [x] **Balanced** - Quick research, then iterative action
- [ ] **Action-first** - Try things, adjust based on results

---

## Quality Thresholds

### Acceptable Quality Levels
| Context | Minimum Quality |
|---------|-----------------|
| Production code | High (tested, reviewed) |
| Prototypes | Medium (functional) |
| Scripts/tools | Medium (working) |
| Documentation | High (accurate, clear) |

### Definition of "Done"
A task is complete when:
- [x] Core functionality works
- [x] Edge cases handled
- [x] Tests pass (if applicable)
- [x] No regressions introduced
- [ ] Documentation updated
- [ ] Code reviewed

---

## Communication During Execution

### Progress Updates
- [ ] **Minimal** - Only report completion
- [x] **Standard** - Report at major milestones
- [ ] **Verbose** - Report every step

### When Something Goes Wrong
- [x] Explain what happened
- [x] Propose solutions
- [x] Ask before major recovery actions
- [ ] Attempt auto-recovery first

---

## Learning & Improvement

### Capture Insights
- [x] Capture significant learnings
- [x] Note patterns that worked well
- [x] Record mistakes to avoid

### Feedback Integration
- [x] Learn from explicit ratings
- [x] Detect implicit satisfaction signals
- [x] Adjust approach based on feedback

---

*These preferences guide THE ALGORITHM's behavior. Adjust based on your working style.*
