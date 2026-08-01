---
last_updated: 2026-08-01T23:05:54.397Z
last_updated_by: ArchitectureSummaryGenerator
convention: pai-freshness-v1
derived_from: LIFEOS/DOCUMENTATION/LifeosSystemArchitecture.md
generator: LIFEOS/TOOLS/ArchitectureSummaryGenerator.ts
---

# LifeOS Architecture Summary

> Auto-generated — do not edit (source + generator in frontmatter).

## Overview

LifeOS — the **Life Operating System** — is the AI harness that moves you from your current state to your ideal state: an intent engineering platform that captures what you're ultimately trying to achieve and conveys that intent to your AI on every task, then verifies the output against it.
Everything below is the machinery of that one loop: Current State → Ideal State via verifiable iteration (ISC). Canonical thesis: `LIFEOS/DOCUMENTATION/LifeOs/LifeOsThesis.md`.

**Current versions:** LifeOS 7.28.3 | Algorithm v8.17.3 | System Prompt v3.6.1 | Cortex (Memory) v8.3.0

Doc routing lives in CLAUDE.md; founding principles + full section map in the master doc.

## Pipeline Router

One line per pipeline. Full wiring, file inventories, and incident notes: master doc § Pipeline Topology.

| Pipeline | What it is | Doc |
|----------|------------|-----|
| **Security** | Constitutional security protocol, native denylist, safety-classifier hooks; deployed estate scanned hourly server-side by the Arbol scanner = the Bunker Security plane | `LIFEOS/DOCUMENTATION/Security/README.md` |
| **Algorithm** | Outcome-driven ISA execution — articulate done, hill-climb, close claims on tool evidence | `LIFEOS/DOCUMENTATION/Algorithm/AlgorithmSystem.md` |
| **Cortex (Memory)** | Cortex, the memory system — autonomic capture, tiered curation, and retrieval across hot-layer, KNOWLEDGE, LEARNING | `LIFEOS/DOCUMENTATION/Memory/MemorySystem.md` |
| **Hooks** | Deterministic enforcement and context injection at Claude Code events | `LIFEOS/DOCUMENTATION/Hooks/HookSystem.md` |
| **Observability** | Tool activity and failures appended to JSONL, read by Pulse | `LIFEOS/DOCUMENTATION/Observability/ObservabilitySystem.md` |
| **Pulse** | The Life Dashboard server on :31337 — voice, work kanban, wiki, iMessage/Siri | `LIFEOS/DOCUMENTATION/Pulse/PulseSystem.md` |
| **Bunker** | Universal application harness — canonical repo ~/.claude/LIFEOS/PULSE/Bunker; app state-of-record bunker.isa.md; Pulse /bunker tab; Security plane IS the Arbol infra-security scanner (server-side, hourly) | `LIFEOS/DOCUMENTATION/LifeosSystemArchitecture.md` |
| **Work System** | Four capture surfaces feeding private GitHub Issues as system of record | `LIFEOS/DOCUMENTATION/Work/WorkSystem.md` |
| **Skills** | Domain capabilities: SKILL.md + workflows + deterministic tools | `LIFEOS/DOCUMENTATION/Skills/SkillSystem.md` |
| **Config** | settings.json, CLAUDE.md, system prompt; release tooling stages public artifacts | `LIFEOS/DOCUMENTATION/Config/ConfigSystem.md` |
| **Notifications** | Voice notifications via Pulse to ElevenLabs, logged to VOICE events | `LIFEOS/DOCUMENTATION/Notifications/NotificationSystem.md` |
| **Doc Integrity** | SessionEnd-hook cross-reference checks; regenerates this summary from the master doc | `LIFEOS/DOCUMENTATION/Hooks/HookSystem.md` |
| **Atlas** | Graph-based asset management — the current state of everything owned; `atlas` CLI (owns/blast/unregistered), Pulse /atlas | `LIFEOS/DOCUMENTATION/Atlas/AtlasSystem.md` |
| **Ledger** | Change-tracking authority — versioning, update registry, integrity gate, deploy events (the APPLIED half of the change pipeline) | `LIFEOS/DOCUMENTATION/Ledger/LedgerSystem.md` |

## Cross-References

- Full architecture: `LIFEOS/DOCUMENTATION/LifeosSystemArchitecture.md`
- Algorithm spec: `LIFEOS/ALGORITHM/v8.17.3.md`
- ISA format: `LIFEOS/DOCUMENTATION/ISA/ISAFormat.md`
- Config system: `LIFEOS/DOCUMENTATION/Config/ConfigSystem.md`
