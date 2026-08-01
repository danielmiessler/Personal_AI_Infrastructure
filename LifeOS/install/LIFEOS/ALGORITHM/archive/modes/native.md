---
status: RETIRED 2026-07-11 — historical doctrine. Modes/tiers were abolished with Algorithm v8 and system prompt v3.0.0 (one adaptive format). Kept as record only; nothing routes here.
last_updated: 2026-05-13
last_updated_by: da
convention: pai-freshness-v1
mode: native
status: response-mode-crossover
---

# Native Mode — Response-Mode Crossover

> **Native is NOT an Algorithm mode.** It's the Layer 1 response mode (MINIMAL / NATIVE / ALGORITHM) surfaced in Pulse for visibility. This file documents how it appears in the Agents page despite not being a true Algorithm mode.

---

## What Native is

Native is the **NATIVE response mode** — set by `TheRouter.hook.ts` (retired 2026-07-11) at UserPromptSubmit when the TheRouter classifier (level `max` via `EFFORT_MODEL`) determines the prompt's ideal state is pre-articulable in one line.

When in NATIVE response mode:
- The output template is the NATIVE template (see `LIFEOS/LIFEOS_SYSTEM_PROMPT.md` § Mode Templates).
- No ISA is created.
- No 7-phase Algorithm runs.
- Full skill / agent / parallel-research / extended-thinking capabilities remain available.

## Why it has a Pulse tab

Even though no ISA is created, NATIVE response runs record session metadata to `MEMORY/STATE/work.json` for observability. The Pulse Agents page surfaces this for parity — {{PRINCIPAL_NAME}} can see all his work in one place regardless of which layer drove it.

## Pulse surface

- Tab: **Native**
- Dashboard: `NativeDashboard` (`LIFEOS/PULSE/Observability/src/components/activity/NativeDashboard.tsx`)
- Filter: `algorithmStates.filter(s => s.currentMode === "native" || s.mode === "native")`
- Row component: `NativeSessionRow`

## When NATIVE response mode is selected

TheRouter classifier rules (from `TheRouter.hook.ts`):

- Fact lookup with one tool call.
- Single-line edit on a named file.
- One command run with no multi-step plan.
- Research with a clear specific question.
- Debug with a known symptom and one suspect file.
- Multi-file change where each step is obvious from the request.

**NATIVE is NOT "shallow."** Picking NATIVE does NOT cap capability — it caps output template shape. NATIVE can invoke any skill, spawn agents, run parallel research, use extended thinking. The constraint is on response format, not capability.

## When NATIVE is wrong → demote to ALGORITHM

The discriminator is whether the **ideal state is pre-articulable in one line**. If the answer to "what does done look like?" requires articulating ISCs first, the prompt needs ALGORITHM mode regardless of how simple it seems.

**A short, clearly-stated *question* is not NATIVE by virtue of being short.** Route by the ANSWER, not the question: if a good answer would be *retrieved* (facts to look up and assemble) it's NATIVE; if it must be *constructed* by analytical synthesis against external/contested evidence, its correctness not checkable at a glance — a hard science / philosophy / technical question whose answer doesn't exist until you build it — it's ALGORITHM (E3 default, E4 across contested fields). The test is VERIFIABILITY, not synthesis: opinion/advice/personal-judgment questions ("should I learn Rust or Go", "why do I procrastinate") stay NATIVE even though they synthesize — the reader can weigh the take at a glance. A one-line question is not a one-line answer. This is the canonical NATIVE→ALGORITHM misroute.

Under-escalation is the failure mode the TheRouter was built to prevent. When in doubt between NATIVE and ALGORITHM E3, the classifier picks ALGORITHM E3.

## ISA frontmatter (not used)

NATIVE response runs do not have ISAs. The `s.mode === "native"` filter in Pulse reads from session metadata (`work.json`), not from an ISA file.

## Relationship to Algorithm modes

| If response mode is... | Then Pulse tab is... | And ISA mode is... |
|------------------------|----------------------|---------------------|
| MINIMAL | (not surfaced in Agents page) | n/a |
| NATIVE | **Native** | n/a (no ISA) |
| ALGORITHM with `mode: iterate` (or unset) | Iterate | iterate |
| ALGORITHM with `mode: optimize` | Optimize | optimize |
| ALGORITHM with `mode: ideate` | Ideate | ideate |
| ALGORITHM with `mode: loop` | Loop | loop |

Five of six Pulse tabs map to ALGORITHM response mode plus an Algorithm-internal mode. **Native is the only tab where the response mode IS the tab.**

## Examples

- "thanks" → MINIMAL (not in Agents page)
- "what time is it" → NATIVE → Native tab
- "fix the typo on line 12 of foo.ts" → NATIVE → Native tab
- "refactor auth to use new SessionStore per PRD.md" → NATIVE → Native tab (multi-file but pre-spec'd)
- "research the differences between BPE and ISD" → NATIVE → Native tab
- "build me a new memory subsystem" → ALGORITHM E4 → Iterate tab (ideal state needs ISC)

## Cross-references

- All modes: [`README.md`](README.md)
- Response mode classifier: `TheRouter.hook.ts` (retired 2026-07-11)
- Mode templates (output shape): `LIFEOS/LIFEOS_SYSTEM_PROMPT.md` § "Mode Templates"
- Constitutional discriminator rule: `LIFEOS/LIFEOS_SYSTEM_PROMPT.md` § "Mode Architecture"
