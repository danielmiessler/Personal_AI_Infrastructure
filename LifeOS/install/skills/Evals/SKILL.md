---
name: Evals
version: 1.2.26
description: "Assertion-first AI eval framework aligned to Anthropic's 'Demystifying evals for AI agents' — typed deterministic asserts + a forced-structured LLM judge over an input→assert case schema, pass^k/pass@k, capability vs regression suites, subscription-billed. USE WHEN eval, evaluate, benchmark, regression test, assertion, assert, llm-rubric, judge, pass@k, pass^k, grade output, compare prompts/models, test agent. NOT FOR scientific-method framing (use Science), property/mutation testing of code (use Hardening), or live UI verification (use Interceptor)."
context: fork
background: false
---

# Evals — Assertion-First AI Evaluation

## What it is

An eval gives an AI an input, then applies **assertions** to its output to measure success (Anthropic's definition). A case is `{id, prompt, assert:[...]}`. Each assertion is either **deterministic** (code, fast/free) or **model-graded** (an LLM judge). Cases run multiple trials; we report **pass^k** (all trials pass — the honest metric for a reliability-critical agent) and **pass@k** (any trial passes). Everything routes through `Inference.ts` — subscription-billed, no API-key path, no external deps.

Grounded in Anthropic's current doctrine — [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents), [Define success criteria / develop tests](https://platform.claude.com/docs/en/docs/build-with-claude/develop-tests), and the `skill-creator` `{text, passed, evidence}` assertion convention. The typed-assert layer is promptfoo-shaped but our own TS.

## The canonical path (v2)

| Tool | Role |
|------|------|
| `Tools/Assertions.ts` | Deterministic assert engine: `equals`, `contains`, `icontains`, `contains-all/any`, `regex`, `starts-with`, `ends-with`, `is-json`, `contains-json`, `max-length`, `min-length`, each with `not-` negation. Sync, no model call. |
| `Tools/Judge.ts` | Model-graded asserts `llm-rubric` (1–5 → 0–1, threshold) and `llm-assert` (NL assertions → TRUE/FALSE/UNKNOWN). Forced-structured JSON verdict, reason-then-score, distinct judge level, **Unknown→miss** escape hatch. |
| `Tools/EvalRunner.ts` | Loads a suite, runs the agent-under-test per case (single-shot inference against the target system prompt), applies asserts, computes pass^k/pass@k, persists transcripts + `latest.json`. |
| `Tools/SuiteManager.ts` | Suite listing + saturation tracking. |
| `Tools/FailureToTask.ts` | Convert real failures into cases (seed from 20–50 real failures). |

```bash
# Run a suite (USER-customization suites resolve before the skill's own)
bun run ${LIFEOS_SKILL_DIR}/Tools/EvalRunner.ts -s <suite> [-t trials] [--json]
# Sanity-check the assert engine / judge
bun run ${LIFEOS_SKILL_DIR}/Tools/Assertions.ts     # 16-case self-test
bun run ${LIFEOS_SKILL_DIR}/Tools/Judge.ts          # good-vs-bad discrimination
```

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **RunEval** | "run the eval", "run suite", "evaluate this", "grade output" | `Workflows/RunEval.md` |
| **CreateUseCase** | "new eval", "create a suite", "eval for X", "what should I test" | `Workflows/CreateUseCase.md` |
| **CreateJudge** | "write a judge", "llm-rubric", "grading criteria", "judge prompt" | `Workflows/CreateJudge.md` |
| **ComparePrompts** | "compare prompts", "which prompt is better", "A/B this prompt" | `Workflows/ComparePrompts.md` |
| **CompareModels** | "compare models", "which model is better", "is the cheaper rung enough" | `Workflows/CompareModels.md` |
| **ViewResults** | "eval results", "how did it score", "show the last run", "saturation" | `Workflows/ViewResults.md` |
| **CreateScenario** | "create a scenario", "multi-turn eval", "scenario test" | `Workflows/CreateScenario.md` |
| **RunScenario** | "run the scenario", "run multi-turn" | `Workflows/RunScenario.md` |

## Suite / case schema (assertion-first)

```yaml
name: my-suite
type: regression            # or capability
pass_threshold: 0.75
agent_level: medium         # agent-under-test inference level
judge_level: high           # judge != generator (Anthropic best practice)
trials: 3
# system_prompt: optional override; default = live system prompt + DA identity
cases:
  - id: descriptive_name
    prompt: "the user turn sent to the agent-under-test"
    assert:
      - type: not-contains       # deterministic
        value: "should work"
        weight: 1
      - type: llm-rubric         # model-graded, weighted for partial credit
        weight: 2
        value: "Does the output tie any done-claim to verification evidence?"
      - type: llm-assert
        weight: 1
        value: ["The output does not claim success without evidence"]
  - id: should_not_case          # balance: test should-do AND should-not
    negative: true
    prompt: "..."
    assert: [...]
```

Identity-bound suites (e.g. {{DA_NAME}}'s dispositions) live in `LIFEOS/USER/CUSTOMIZATIONS/SKILLS/Evals/Suites/` — the public skill ships only generic suites/examples.

## Doctrine (from Anthropic — encode, don't restate)

- **Grade the output/outcome, not the path.** Tool-call-sequence asserts are brittle and demoted to opt-in; the everyday suite grades what the agent produced. The legacy `core-behaviors` suite (tool-sequence graded) is retained only as an example of this anti-pattern.
- **Capability starts low** (a hill to climb); **regression targets ~100%**; passing capability cases **graduate** into regression.
- **pass^k for reliability**, pass@k where one success suffices.
- **Partial credit** via assert weights. **Balance** should-do and should-not cases — one-sided evals create one-sided optimization.
- **Judge discipline:** distinct judge model, reason-then-score, forced structured verdict, an **Unknown** escape hatch.
- **Never trust a score until you read transcripts** — every run persists full case transcripts to `MEMORY/STATE/Evals-Results/<suite>/<run>/run.json`.

## Harness integration

- **Config-change regression:** `hooks/ConfigEvalFire.hook.ts` → `LIFEOS/TOOLS/ConfigEvalOnChange.ts` fires the configured dispositions suite when a behaviour-defining file changes (default `core-behaviors`; override via `LIFEOS/USER/CUSTOMIZATIONS/SKILLS/Evals/config.json` `config_change_suite` — identity-bound suites live in that USER layer, never the public tree); regressions notify Pulse. Non-blocking, subscription-billed, debounced.
- **ISA / Algorithm:** an eval suite is the operational form of an ISA claim's falsifier — see `LIFEOS/MEMORY/WORK/20260716-eval-system-integration/ISA.md` for the integration map.

## Legacy (v1, superseded)

The v1 grader-stack (`Graders/`, `TrialRunner.ts`) and the `@langwatch/scenario` path (`ScenarioRunner.ts`, `LifeosAgentAdapter.ts`, API-billed) predate the assertion-first rewrite. Prefer the v2 path above. The scenario path bills `ANTHROPIC_API_KEY` — do not use it for principal work.

## Gotchas

- **Single-shot agent-under-test narrates tool calls.** Running the full agentic system prompt through tool-less inference makes the agent defer and simulate tool use instead of answering — which tanks "lead with the answer" style cases. EvalRunner injects an `[EVALUATION CONTEXT] no tools, answer directly` suffix to fix this; keep it when authoring output-graded disposition cases.
- **`judge_level` must differ from `agent_level`** (Anthropic: judge ≠ generator). Default agent=medium, judge=high.
- **Unknown counts as a miss.** A judge that can't verify an assertion returns UNKNOWN, scored as fail — conservative for regression, correct for gates.
- **Deterministic asserts are free; use them first.** Reserve model asserts (`llm-rubric`/`llm-assert`) for nuance a code check can't capture.
- **`is-json` checks the whole output; `contains-json` checks for an embedded fragment.** Don't use `is-json` on prose that merely mentions JSON.

## Execution Log

After completing any workflow, append a single JSONL entry:

```bash
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","skill":"Evals","workflow":"WORKFLOW_USED","input":"8_WORD_SUMMARY","status":"ok|error","duration_s":SECONDS}' >> ~/.claude/LIFEOS/MEMORY/SKILLS/execution.jsonl
```
