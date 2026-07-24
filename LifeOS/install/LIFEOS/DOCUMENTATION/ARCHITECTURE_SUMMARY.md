---
last_updated: 2026-07-13T03:29:33.591Z
last_updated_by: ArchitectureSummaryGenerator
convention: pai-freshness-v1
derived_from: LIFEOS/DOCUMENTATION/LifeosSystemArchitecture.md
generator: LIFEOS/TOOLS/ArchitectureSummaryGenerator.ts
---

# LifeOS Architecture Summary

> Auto-generated — do not edit (source + generator in frontmatter).

## Overview

LifeOS — the **Life Operating System**, built on the LifeOS (LifeOS) layer — is the framework that knows your goals, people, and current state, and continuously hill-climbs you toward your ideal state.
Everything below is the machinery of that one loop: Current State → Ideal State via verifiable iteration (ISC). Canonical thesis: `LIFEOS/DOCUMENTATION/LifeOs/LifeOsThesis.md`.

**Current versions:** LifeOS 7.1.1 | Algorithm v8.4.0 | System Prompt v3.0.1 | Memory v8.2.0

Doc routing lives in CLAUDE.md; founding principles + full section map in the master doc.

## Pipeline Router

One line per pipeline. Full wiring, file inventories, and incident notes: master doc § Pipeline Topology.

| Pipeline | What it is | Doc |
|----------|------------|-----|
| **Security** | Constitutional security protocol, native denylist, safety-classifier hooks | `LIFEOS/DOCUMENTATION/Security/README.md` |
| **Algorithm** | Outcome-driven ISA execution — articulate done, hill-climb, close claims on tool evidence | `LIFEOS/DOCUMENTATION/Algorithm/AlgorithmSystem.md` |
| **Memory** | Autonomic capture, tiered curation, and retrieval across hot-layer, KNOWLEDGE, LEARNING | `LIFEOS/DOCUMENTATION/Memory/MemorySystem.md` |
| **Hooks** | Deterministic enforcement and context injection at Claude Code events | `LIFEOS/DOCUMENTATION/Hooks/HookSystem.md` |
| **Observability** | Tool activity and failures appended to JSONL, read by Pulse | `LIFEOS/DOCUMENTATION/Observability/ObservabilitySystem.md` |
| **Pulse** | The Life Dashboard server on :31337 — voice, work kanban, wiki, Telegram | `LIFEOS/DOCUMENTATION/Pulse/PulseSystem.md` |
| **Bunker** | Universal application harness — canonical repo ~/Projects/bunker; app state-of-record bunker.isa.md; Pulse /bunker tab | `LIFEOS/DOCUMENTATION/LifeosSystemArchitecture.md` |
| **Work System** | Four capture surfaces feeding private GitHub Issues as system of record | `LIFEOS/DOCUMENTATION/Work/WorkSystem.md` |
| **Skills** | Domain capabilities: SKILL.md + workflows + deterministic tools | `LIFEOS/DOCUMENTATION/Skills/SkillSystem.md` |
| **Config** | settings.json, CLAUDE.md, system prompt; release tooling stages public artifacts | `LIFEOS/DOCUMENTATION/Config/ConfigSystem.md` |
| **Notifications** | Voice notifications via Pulse to ElevenLabs, logged to VOICE events | `LIFEOS/DOCUMENTATION/Notifications/NotificationSystem.md` |
| **Telegram Dynamic Voice** | Per-turn Telegram pipeline: identity-injected replies plus voice bubbles | `LIFEOS/DOCUMENTATION/Pulse/PulseSystem.md` |
| **Doc Integrity** | SessionEnd cross-reference checks; regenerates this summary from the master doc | `LIFEOS/DOCUMENTATION/Hooks/HookSystem.md` |

## Cross-References

- Full architecture: `LIFEOS/DOCUMENTATION/LifeosSystemArchitecture.md`
- Algorithm spec: `LIFEOS/ALGORITHM/v8.4.0.md`
- ISA format: `LIFEOS/DOCUMENTATION/Isa/IsaFormat.md`
- Config system: `LIFEOS/DOCUMENTATION/Config/ConfigSystem.md`
