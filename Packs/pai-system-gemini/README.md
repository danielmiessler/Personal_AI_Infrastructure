---
name: PAI System Gemini
pack-id: fabiendostie-system-gemini-v0.1.0-alpha.1
version: 0.1.0-alpha.1
author: fabiendostie
description: System Pack enabling the Google Gemini CLI as a fully-featured PAI driver with automatic context loading and hook integration.
type: feature
purpose-type: [integration, automation, productivity]
platform: gemini
dependencies: [pai-core-install, pai-hook-system]
keywords: [gemini, google, cli, driver, integration, context, hooks, memory, automation]
---

<p align="center">
  <img src="../icons/pai-system-architecture-v3.png" alt="PAI System Gemini" width="256">
</p>

# PAI System Gemini

> **Enables Google Gemini CLI as a first-class PAI driver.**
> Automatically loads Identity, Memory, Skills, and TELOS context into every session.

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for your AI infrastructure.

**What is PAI?** See: [PAI Project Overview](../README.md#what-is-pai)

This pack integrates the Google Gemini CLI into your Personal AI Infrastructure. It effectively turns Gemini into a fully capable PAI driver, just like Claude Code.

- **Auto-Context Loading**: Identity, Skills, Memory, and TELOS are injected into every session.
- **Hook Integration**: Native support for PAI hooks (`SessionStart`, `PreToolUse`, etc.).
- **Observability**: Maps Gemini events to the PAI observability dashboard.
- **Unified Experience**: Use Gemini with the same persistent memory and tools as Claude.

If you use the Gemini CLI, this pack is essential for bringing it into your PAI ecosystem.

---

## What's Included

| Component         | File                              | Purpose                                             |
| ----------------- | --------------------------------- | --------------------------------------------------- |
| Gemini Adapter    | `src/hooks/adapter.ts`            | Bridges Gemini hooks to PAI system                  |
| Wrapper Script    | `src/scripts/gemini-wrapper.sh`   | CLI wrapper for enhanced startup (optional)         |
| Settings Template | `src/config/settings.json`        | Configuration for `~/.gemini/settings.json`         |

**Summary:**

- **Files created:** 3
- **Hooks registered:** 4 (SessionStart, BeforeTool, AfterTool, BeforeAgent)
- **Dependencies:** `pai-core-install`, `pai-hook-system`

---

## The Concept and/or Problem

The default Google Gemini CLI is a powerful tool, but it operates as a stateless agent.

**The Problem:**

- **Amnesia**: Every session starts fresh. It doesn't know who you are, what you're working on, or your long-term goals.
- **Disconnected**: It can't access your PAI Memory System, Skills, or Contact lists defined in `~/.claude`.
- **Inconsistent**: It doesn't follow the operating principles or persona defined in your `CORE` skill.
- **Blind Spots**: It operates outside the PAI observability and logging systems.

Using Gemini without this pack means losing the "Personal" in Personal AI Infrastructure. You get a generic assistant instead of _your_ assistant.

## The Solution

This pack builds a bridge between the Gemini CLI and your PAI Core.

**How it works:**

1.  **Hook Adapter**: We inject a specialized adapter (`adapter.ts`) into Gemini's native hook system.
2.  **Context Injection**: On `SessionStart`, the adapter reads your `DAIDENTITY.md`, `SKILL.md`, `TELOS.md`, and `active-work.json`.
3.  **System Prompt Assembly**: It dynamically constructs a system prompt containing your full context and injects it into the Gemini session.
4.  **Event Mapping**: As you work, tool use and agent events are captured and logged to the PAI observability system, treating Gemini just like Claude Code.

This ensures that whether you use Claude or Gemini, your AI knows **you**.

## Why This Is Different

This sounds similar to using a custom system prompt which also provides context. What makes this approach different?

While system prompts are static text, this pack creates a live, bidirectional runtime bridge. It actively monitors the CLI execution lifecycle, intercepting tool calls and session events to trigger external PAI systems like Observability and Memory. Instead of just reading files once, it maintains continuous synchronization between the ephemeral CLI session and your persistent personal infrastructure, enabling true agentic continuity.

- Active runtime bridging between CLI and PAI
- Bi-directional event synchronization for continuous learning
- Native lifecycle hook integration for seamless operation
- Dynamic context injection based on active state

---

## Invocation Scenarios

The integration is automatic once installed.

| Event        | Trigger               | Action                                                        |
| ------------ | --------------------- | ------------------------------------------------------------- |
| **Launch**   | User runs `gemini`    | **SessionStart Hook**: Loads Identity, Memory, Skills, TELOS. |
| **Tool Use** | Agent calls a tool    | **BeforeTool/AfterTool Hooks**: Logs to PAI observability.    |
| **Agent**    | Agent sub-task starts | **BeforeAgent Hook**: Logs agent activity.                    |

## Example Usage

### 1. Daily Standup
```bash
$ gemini
> "What's on my plate today?"
[System loads active-work.json from PAI Memory]
Gemini: "Based on your active work state, you're focused on the Refactor task..."
```

### 2. Using PAI Skills
```bash
$ gemini
> "Run the algorithm on this problem"
[System loads THEALGORITHM skill definition]
Gemini: "Understood. Initiating The Algorithm. Phase 1: Observe..."
```

---

## Configuration

**Environment variables** (via `~/.claude/settings.json` or Shell):

- `PAI_DIR`: Path to your PAI installation (Default: `~/.claude`)
- `TIME_ZONE`: Your local timezone (Default: `America/New_York`)

**Gemini Configuration** (`~/.gemini/settings.json`):
This pack manages the `hooks` section of your Gemini settings to point to the adapter.

## Customization

### Recommended Customization

**What to Customize:** The `gemini-wrapper.sh` alias.

**Why:** To make the experience seamless and replace the default command.

**Process:**
1. Open your shell profile (`~/.zshrc` or `~/.bashrc`).
2. Add `alias gem="path/to/gemini-wrapper.sh"`.
3. Reload your shell.

**Expected Outcome:** Typing `gem` launches Gemini with full PAI context automatically.

---

### Optional Customization

| Customization | File | Impact |
|--------------|------|--------|
| Context Sources | `src/hooks/adapter.ts` | Change which PAI files are loaded |
| Hook Events | `src/config/settings.json` | Add or remove lifecycle triggers |

## Credits

- **Original concept**: Daniel Miessler (PAI Architecture)
- **Adapter Logic**: Fabien Dostie

## Related Work

- **Claude Code**: The primary driver this pack emulates
- **OpenCode**: Another open-source AI CLI

## Works Well With

- **pai-observability-server**: For visualizing Gemini activity
- **pai-memory-system**: For retaining context between sessions

## Recommended

- **pai-core-install**: Mandatory foundation
- **pai-hook-system**: Required for event processing

## Relationships

### Parent Of
*None specified.*

### Child Of
- **pai-core-install**

### Sibling Of
- **pai-voice-system** (Infrastructure)
- **pai-observability-server** (Infrastructure)

### Part Of Collection
- **PAI Drivers**

## Changelog

### 0.1.0-alpha.1 - 2026-01-18

- Initial release
- Full context auto-loading (Identity, Memory, TELOS, Skills)
- Native hook integration
