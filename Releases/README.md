<div align="center">

<img src="release-icon-v2.png" alt="PAI Releases" width="256">

# PAI Releases

</div>

---

## What Are Releases?

Releases are **complete `.claude/` directories** ready to drop into your home folder. Each release contains everything you need: skills, hooks, workflows, memory structure, and configuration.

This is the fastest way to get PAI running. Copy the directory, run the wizard, restart Claude Code.

> **Note:** The `.claude` directory is hidden by default on macOS/Linux. Use `ls -la` to see it.

---

## Available Releases

### v3.0.0 — The Algorithm Matures (Current)

The Algorithm reaches v1.4.0 with constraint extraction, build drift prevention, persistent PRDs, and parallel loop execution.

- 38 Skills, 20 Hooks, 162 Workflows
- Algorithm v1.4.0
- Full installer with GUI wizard
- 10 new skills
- Agent teams/swarm
- Voice personality system
- PRD system

**[Get v3.0 →](v3.0/)**

---

### v2.5.0 — Think Deeper, Execute Faster

The Algorithm learns metacognition—thinking about how it thinks—and parallel execution.

- 28 Skills, 17 Hooks, 356 Workflows
- Two-pass capability selection with ISC validation
- Thinking tools with justify-exclusion principle
- Parallel-by-default execution for independent tasks
- 7 named composition patterns for capability orchestration

**[Get v2.5 →](v2.5/)**

---

### v2.4.0 — The Algorithm

Our first attempt at a general problem solver built into PAI to pursue Euphoric Surprise.

- 29 Skills, 15 Hooks, 331 Workflows
- 7-phase problem-solving with ISC tracking
- Improved installation wizard
- Voice notifications via ElevenLabs

**[Get v2.4 →](v2.4/)**

---

### v2.3.0 — Continuous Learning

The release that introduced persistent learning and sentiment capture.

- 20 Skills, session continuity
- Implicit/explicit rating capture
- Memory system with WORK, STATE, LEARNING directories

**[Get v2.3 →](v2.3/)**

---

## Installation

```bash
# 1. Clone the repo
git clone https://github.com/danielmiessler/PAI.git
cd PAI/Releases/v3.0

# 2. Back up existing installation (if any)
[ -d ~/.claude ] && mv ~/.claude ~/.claude-backup-$(date +%Y%m%d)

# 3. Copy the release
cp -r .claude ~/

# 4. Run the installer
cd ~/.claude/PAI-Install && bun run engine/actions.ts

# 5. Restart Claude Code
```

The wizard asks for your name, AI name, timezone, and optional voice preferences.

---

## Troubleshooting

**Can't see .claude directory?** It's hidden. Use `ls -la ~/` or press `Cmd+Shift+.` in Finder.

**Hooks not firing?** Restart Claude Code after installation.

---

**Looking for modular installation?** See [Packs](../Packs/) for individual components.

**Questions?** See the main [PAI README](../README.md).
