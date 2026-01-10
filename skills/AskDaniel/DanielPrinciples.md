# Daniel's Engineering Principles

Codified philosophy checklist for PAI feature design. Every feature must pass this filter before implementation.

---

## The 10 Principles

### 1. Clear Thinking -> Clear Writing -> Clear Prompting

**Question:** Is the feature concept crystal clear? Can you explain it in one sentence?

**Test:** Write the feature description. If it's muddy, the thinking is muddy.

**Failure mode:** Vague features that do "smart things" without defined behavior.

**Daniel quote:** "Clear thinking becomes clear writing and then clear writing is essentially what prompting is and that becomes really good AI."

---

### 2. Scaffolding > Model

**Question:** Does this improve the infrastructure, not just rely on AI being clever?

**Test:** Would this feature work better with a better model? If yes, you're leaning on the model too much.

**Failure mode:** Features that only work because the AI is "smart enough."

**Daniel quote:** "If I had to choose between the latest model with not very good scaffolding or excellent scaffolding with a model from 6 months ago, I would definitely pick the latter."

---

### 3. Code Before Prompts

**Question:** Can any part of this be done deterministically in code?

**Test:** List what the feature does. For each item: can code do it? If yes, use code.

**Failure mode:** Using AI for string manipulation, file operations, or structured data.

**Daniel quote:** "If I have anything that I can do in code, I do it in code first. I don't even use AI at all."

---

### 4. Unix Philosophy

**Question:** Does this do ONE thing well?

**Test:** Can you describe the feature without using "and"?

**Failure mode:** Swiss-army-knife features that try to be everything.

**Daniel quote:** "I try to have each container do one thing well and I build different skills to call each other instead of replicating that functionality inside of each one."

---

### 5. CLI-First Design

**Question:** Does this have a clear command-line interface?

**Test:** Write the `--help` output. Does it make sense? Are flags unambiguous?

**Failure mode:** Features that require "just ask the AI" to invoke.

**Daniel quote:** "There's nothing more clear than how to use a command line tool, assuming it's well documented. AI loves when it doesn't have ambiguity in what it's supposed to do."

---

### 6. Explicit Routing

**Question:** Can the system deterministically decide when to use this?

**Test:** Write the regex/pattern that triggers this. No fuzzy matching.

**Failure mode:** "The AI will figure out when to use it."

**Key concept:** USE WHEN clauses must be explicit. Workflow routing tables must be unambiguous.

---

### 7. Specifications, Tests, and Evals

**Question:** How do we know this is working?

**Test:** Write the acceptance criteria before implementation.

**Failure mode:** "It seems to work" / vibes-based validation.

**Daniel quote:** "There's a big tendency in AI to use vibes... how do we know any of this is working? How do you actually test any of this stuff?"

---

### 8. Skills Calling Skills

**Question:** Does this compose with existing skills?

**Test:** What other skills does this invoke? What skills might invoke this?

**Failure mode:** Isolated features that don't integrate.

**Daniel quote:** "The red team skill calls a first principals skill and breaks that down further into other pieces. It works in a flow."

---

### 9. Self-Updating / Self-Healing

**Question:** Can this improve itself over time?

**Test:** What feedback loop exists? How does it learn from failures?

**Failure mode:** Static features that rot without maintenance.

**Daniel quote:** "I have a whole bunch of capabilities within Kai that are used to update Kai himself. Self-update, self-healing, self-improvement."

---

### 10. History / Learning Capture

**Question:** Does this capture data for future improvement?

**Test:** What gets logged to JSONL? What can be analyzed later?

**Failure mode:** Features with no observability.

**Daniel quote:** "When we get done doing anything, if any agent does anything, Kai thinks about what we did, turns that into a summary and writes it into this history system."

---

## Quick Checklist Format

Copy this into your review:

```
| # | Principle | Pass | Notes |
|---|-----------|------|-------|
| 1 | Clear thinking -> Clear writing | [ ] | |
| 2 | Scaffolding > Model | [ ] | |
| 3 | Code before prompts | [ ] | |
| 4 | Unix philosophy | [ ] | |
| 5 | CLI-first | [ ] | |
| 6 | Explicit routing | [ ] | |
| 7 | Specs/tests/evals | [ ] | |
| 8 | Skills calling skills | [ ] | |
| 9 | Self-updating | [ ] | |
| 10 | History capture | [ ] | |
```

---

## Red Flags (Instant Rejection)

If ANY of these are true, REJECT the feature or require significant revision:

- [ ] "The AI will figure it out"
- [ ] "It's like X but smarter"
- [ ] No clear trigger/routing pattern
- [ ] Can't explain in one sentence
- [ ] Duplicates existing Unix tools
- [ ] No test strategy
- [ ] Scope includes "and then it also..."
- [ ] Requires "vibes" to validate success
- [ ] Outside PAI/Skish scope (not a skill, hook, tool, or workflow)

---

## Passing the Filter

A feature passes the Daniel filter when:

1. All 10 principles score PASS or PARTIAL with mitigation
2. No red flags present
3. Clear implementation path exists
4. Test strategy is defined
5. Observability plan is documented

The output is a refined specification ready for implementation.
