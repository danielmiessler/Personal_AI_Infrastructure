---
last_updated: 2026-07-05
last_updated_by: kai
last_reviewed: 2026-07-05
last_reviewed_by: kai
convention: pai-freshness-v1
version: 1.0.4
---

# LifeOS Core Components

LifeOS is a Life Operating System: it moves you from where you are now to where you want to be. Every task — shipping code, writing an essay, making a decision — is the same move, from **current state to ideal state**, pursued through verifiable iteration.

That one loop is built from a set of components. They fall into two tiers. The **unique features** are the parts that make LifeOS what it is — you won't find this combination anywhere else. The **supporting components** are the subsystems that make the unique ones work.

This doc is the canonical map. Each component links to its full reference.

---

## The Unique Features

The twelve things that make LifeOS LifeOS.

### 1. Current State → Ideal State

The whole philosophy in one line: name where you are, name where you want to be, then close the gap with steps you can check. Ideal state is written down as testable criteria, so "done" can't drift — you either meet the criteria or you don't. Everything else in the system serves this move.

→ `LifeOs/LifeOsThesis.md`

### 2. General Hill Climbing

The loop under everything. Your ideal state is the top of the hill, broken into testable criteria that tell up from down. On every task the system picks the next move that reduces the gap, checks it against those criteria, and keeps what moves uphill. It's general because the same climb works for any goal — code, writing, health, a hard decision — not just one kind of work. No check means no gradient, so verification is what makes the climb real.

→ `LifeOs/LifeOsThesis.md`

### 3. Euphoric Surprise

The metric the whole climb aims at: a response so good you say it out loud, "OMG, this is brilliant," rated a 9 or 10. Naming Euphoric Surprise as the target keeps the bar higher than merely good enough, and it holds across everything you do, code, writing, a decision, a design, because every task climbs toward an ideal state, and this is what reaching it feels like.

→ `LifeOs/LifeOsThesis.md`

### 4. TELOS

Where you write down who you are and what you're trying to do: your mission, goals, problems, strategies, beliefs, and challenges. You don't start from a blank file — LifeOS interviews you to draw it out, asking what you're building, who matters to you, and where you want to go, then writes it down for you. From then on every recommendation is framed against it, so the system works toward your actual life, not a generic answer.

→ `LifeOs/LifeOsThesis.md`

### 5. The Algorithm

The centerpiece. The unified thinking system that takes a vague request, turns it into a hard-to-vary spec (the ISA), and climbs toward it with verified iteration, closing each claim only on real evidence. It scales its own effort to the work — a fast lane for simple asks, full depth for hard ones — discovered from the task rather than a fixed set of phases. This is where current-state-to-ideal-state actually happens.

→ `Algorithm/AlgorithmSystem.md`

### 6. The ISA

The Ideal State Artifact — one document that captures what "done" looks like as verifiable criteria. It works like a product spec, but general, for any task from code to art to strategy. It breaks the ideal state into discrete Ideal State Criteria (ISCs) that double as the test harness, so every Algorithm run reads, extends, and checks against one living document.

→ `ISA/IsaSystem.md`

### 7. The Skill System

Self-activating, composable units of domain expertise. A skill is deterministic code wrapped in a natural-language trigger, so the right capability fires the moment you describe the task — no menu, no command to remember. There are over a hundred of them, and they compose.

→ `Skills/SkillSystem.md`

### 8. The Hook System

Deterministic lifecycle interception. Hooks run at fixed points across a session — before a tool call, after output, at session start and stop — and enforce the rules a model can't be trusted to remember every time. This is how the system stays honest: the guardrails are code, not good intentions.

→ `Hooks/HookSystem.md`

### 9. Pulse

The Life Dashboard — the live surface onto the whole system. Pulse shows your current-to-ideal progress, what the system is working on right now, your memory and freshness state, and the health of every subsystem. It's how you *see* LifeOS run.

→ `Pulse/PulseSystem.md`

### 10. Custom Spinner Verbs

The small touch that makes the system feel alive. While LifeOS works, the statusline shows a custom animated working-verb — your own vocabulary, colors, and animation — alongside rotating tips about the system. A distinctive, personal detail most tools never bother with.

→ `Spinner/SpinnerSystem.md`

### 11. Custom Tooltips

Context where you need it. The dashboard's tooltips and freshness indicators explain what each number, chart, and badge means the moment you hover — so the surface teaches itself instead of sending you to a manual.

→ `Pulse/Tooltips.md`

---

## Supporting Components

The subsystems the unique features are built on.

### Memory

Memory that compounds across sessions. What the system learns about you and your work moves from active work into durable knowledge, so every session starts smarter than the last.

→ `Memory/MemorySystem.md`

### Agents

Parallel delegation. Hard work fans out to specialized agents — researchers, builders, adversarial reviewers — that run concurrently and report back, so the system thinks in parallel instead of one step at a time.

→ `Agents/AgentSystem.md`

### Voice

Spoken notifications. The system talks to you — phase transitions, completions, alerts — in a voice you choose, so you can stay in flow without watching the terminal.

→ `Notifications/NotificationSystem.md`

### Learning

Every run reflects on itself. What worked, what didn't, and what a smarter version would have done gets captured and fed back into how the system behaves next time.

→ `Memory/MemorySystem.md`

### Security

Privacy and safety are enforced, not assumed. Deterministic gates keep private data private, treat outside content as read-only, and block anything unsafe before it runs.

→ `Security/README.md`

---

## How they fit together

Current-state-to-ideal-state is the **why**, and Euphoric Surprise is the **bar** it aims for. The Algorithm is the **engine** that runs it. Skills and hooks are the **machinery** that make each run capable, safe, and correctly-scoped. Pulse, spinner verbs, and tooltips are how you **see and feel** it. Memory, agents, voice, learning, and security are the **foundation** underneath. Together they're the whole of what makes LifeOS work.
