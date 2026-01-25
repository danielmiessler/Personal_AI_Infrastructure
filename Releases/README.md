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

### v2.4.0 — The Algorithm (Current)

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
cd PAI/Releases/v2.4

# 2. Back up existing installation (if any)
[ -d ~/.claude ] && mv ~/.claude ~/.claude-backup-$(date +%Y%m%d)

# 3. Copy the release
cp -r .claude ~/

# 4. Run the wizard
cd ~/.claude && bun run PAIInstallWizard.ts

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
