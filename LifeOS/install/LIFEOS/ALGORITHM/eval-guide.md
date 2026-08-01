## Eval Guide — LLM-as-Judge Evaluation for Optimize Mode

Reference document for eval mode in the optimize loop. Defines how to write, validate, and use binary evaluation criteria for non-numeric optimization targets.

> **Reconciliation (2026-07-16, Evals v2 rewrite).** The canonical eval framework is now the assertion-first `Evals` skill — `skills/Evals/Tools/{Assertions,Judge,EvalRunner}.ts` — aligned to Anthropic's "Demystifying evals for AI agents." A "binary evaluation criterion" here IS an `llm-assert` assertion there (a natural-language check the judge scores TRUE/FALSE), and this guide's 3-question test + mutation taxonomy still apply to authoring those. Use this guide for the **optimize loop's** LLM-as-judge convergence signal; use the Evals skill for suites, pass^k/pass@k, and the config-change regression. The two share the same judge discipline (reason-then-score, distinct judge model, Unknown→miss).

### When to Use Eval Mode

Use eval mode when optimizing targets that produce qualitative output — prompts, skills, agents, or any text where "better" means "higher quality" rather than a faster number.

Use metric mode (existing) when you have a shell command that produces a number: build time, test score, file size, latency.

### The 3-Question Test

Every eval criterion MUST pass all three questions before use. A criterion that fails any question will produce misleading optimization signals.

**Question 1: Would two independent judges agree?**
The criterion must be specific enough that two different LLM instances (or two humans) would reach the same yes/no answer >85% of the time. If reasonable judges would disagree, the criterion is too subjective.

- PASS: "Does the output contain at least 3 specific facts with cited sources?"
- FAIL: "Is the output high quality?" (too vague — judges will disagree)
- FAIL: "Is the writing style good?" (subjective, no anchor)

**Question 2: Could the target game this without genuinely improving?**
If a trivially degenerate mutation could pass the criterion without actually being better, the criterion is gameable and will drive optimization toward garbage.

- PASS: "Does the output address the user's specific question rather than a generic topic?"
- FAIL: "Does the output contain more than 500 words?" (padding with filler passes this)
- FAIL: "Does the output mention all input keywords?" (keyword stuffing passes this)

**Question 3: Does the user actually care about this?**
The criterion must measure something the end user would notice and value. Optimizing for things users don't care about wastes cycles and can degrade what they do care about.

- PASS: "Does the output provide actionable next steps, not just analysis?"
- FAIL: "Does the output use exactly 3 bullet points?" (arbitrary formatting rule)
- FAIL: "Does the output mention the system prompt's instructions?" (meta, not useful)

### Writing Good Eval Criteria

**Structure:** Each criterion is a binary yes/no question about the output. The question must be answerable by reading only the output (and optionally the input).

**Count:** 3-6 criteria per target. Fewer than 3 gives insufficient signal. More than 6 creates noise and slows the loop.

**Template:**
```
"Does the output [observable behavior] [specific threshold/condition]?"
```

**Examples by domain:**

**Prompt optimization:**
```
- "Does the output directly address the user's question in the first paragraph?"
- "Does the output contain specific examples, not just abstract principles?"
- "Does the output avoid repeating the same point in different words?"
- "Is the output structured with clear sections or logical flow?"
```

**Skill optimization:**
```
- "Does the skill route to the correct workflow for the given input?"
- "Does the output contain actionable content, not just meta-commentary?"
- "Does the output follow the specified format constraints?"
- "Does the skill handle edge-case inputs without crashing or producing empty output?"
```

**Agent optimization:**
```
- "Does the agent complete the assigned task without human intervention?"
- "Does the agent use appropriate tools for each step?"
- "Does the agent's final output match the requested format?"
- "Does the agent avoid unnecessary tool calls or redundant work?"
```

**Code-with-eval optimization (non-numeric quality):**
```
- "Does the function handle all documented edge cases?"
- "Does the output match the expected schema?"
- "Does the function complete without throwing unhandled exceptions?"
```

### Anti-Criteria

Anti-criteria define what the output must NOT do. They prevent the optimizer from drifting toward degenerate solutions.

**Template:**
```
"The output must NOT [undesirable behavior]."
```

**Examples:**
```
- "The output must NOT contain placeholder text or TODO markers."
- "The output must NOT repeat the input prompt verbatim."
- "The output must NOT exceed 2000 words for a summary task."
- "The output must NOT hallucinate citations or make up sources."
```

Anti-criteria are checked the same way as regular criteria but with inverted logic: a "yes" answer means failure.

### Common Mistakes

**Too many criteria (>6)**
Creates noise. Each additional criterion dilutes the signal from meaningful ones. The optimizer spends cycles satisfying low-value checks instead of improving what matters.

**Too narrow / too rigid**
Criteria that are overly specific constrain the optimizer from finding creative improvements. "Does the output start with 'Here is'" is too rigid. "Does the output begin with a clear topic sentence?" is better.

**Overlapping criteria**
Two criteria that always pass or fail together provide no additional signal. If "contains specific facts" and "includes evidence" always agree, keep only the more precise one.

**Unmeasurable from output alone**
Criteria that require external context (database lookups, real-time data) cannot be judged from the output. All criteria must be answerable from the output text (and optionally the input).

**Conflicting criteria**
"Be concise" + "include comprehensive details" will create oscillation. Resolve conflicts before starting the loop by adding thresholds: "Under 500 words" + "covers at least 3 key aspects."

### Mutation Taxonomy

When hypothesizing mutations in eval mode, use this taxonomy to guide experiments:

**Good mutations (high signal-to-noise):**

| Type | Description | Example |
|------|-------------|---------|
| `add_instruction` | Add a specific, targeted instruction | "Add: always include a concrete example for each principle" |
| `reword_ambiguity` | Clarify vague language | Change "be thorough" → "cover at least 3 distinct aspects" |
| `add_anti_pattern` | Explicitly forbid an observed failure | "Add: never start with 'In this response I will...'" |
| `reorder_priority` | Move important instructions earlier | Move output format spec from bottom to top |
| `add_example` | Include a concrete example of desired output | Add a 3-line example showing ideal structure |
| `remove_over_optimization` | Strip instructions that cause rigidity | Remove "always use exactly 5 bullet points" |
| `simplify` | Reduce instruction count, merge redundant rules | Consolidate 3 similar formatting rules into 1 |
| `constrain_scope` | Narrow the target's focus | "Focus on the top 3 findings, not all findings" |

**Bad mutations (avoid these):**

| Type | Why it's bad |
|------|-------------|
| `rewrite_from_scratch` | Loses all accumulated improvements, resets to random |
| `add_10_plus_rules` | Overwhelming — causes instruction-following degradation |
| `vague_instructions` | "Be better" adds no signal |
| `copy_from_unrelated` | Importing patterns from a different domain rarely transfers |
| `meta_instructions` | "Think step by step about how to think" — diminishing returns |

### Stall Recovery

When pass rate plateaus, try these in order:

1. **Check for ceiling** — if pass rate is >95%, the current criteria may be saturated. Tighten criteria or add harder ones.
2. **Analyze failure patterns** — which criteria are failing? Focus mutations on those specific areas.
3. **Try subtractive mutations** — remove instructions that may be causing interference.
4. **Swap one criterion** — replace the lowest-discrimination criterion with a harder one.
5. **Vary test inputs** — the current inputs may not stress the right behaviors.

### Scoring

**Per-experiment score:** `passes / (criteria_count x runs_per_experiment)`

Where:
- `passes` = total binary "yes" judgments across all criteria and all runs
- `criteria_count` = number of eval criteria (3-6)
- `runs_per_experiment` = how many times the target is run per experiment (default: 3)

**Example:** 5 criteria, 3 runs, 12 passes out of 15 possible = 80% pass rate.

The score is compared against the current best to determine keep/revert, same as metric mode.

### Relationship to ISC Guard Rails

Eval criteria and ISC guard rails serve different purposes:

- **Eval criteria** = convergence signal. The score drives optimization. Criteria can be rotated, tightened, or graduated.
- **ISC guard rails** = invariant assertions. Must remain true across ALL experiments. Violation triggers automatic revert regardless of pass rate improvement.

Guard rails in eval mode are the same as metric mode: things like "no crashes," "output is non-empty," "no PII in output."

### LifeOS-Specific Guidance

**When to use eval mode vs metric mode:**
- You have a `metric_command` that outputs a number → metric mode
- You want to improve quality of text output → eval mode
- You want to optimize a skill's behavior → eval mode
- You want to reduce build time → metric mode
- Both matter (speed + quality) → run metric mode for speed first, then eval mode for quality

**Eval criteria relate to ISC like this:**
- ISC criteria in eval-mode ISAs are guard rails (invariant assertions)
- Eval criteria in ISA frontmatter are the optimization signal
- Both live in the ISA but serve different roles
