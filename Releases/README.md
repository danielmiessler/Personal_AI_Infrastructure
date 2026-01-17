<div align="center">

<img src="release-icon-v2.png" alt="PAI Releases" width="256">

# PAI Releases

</div>

---

<div align="center">

## Latest Release: v2.3.0

[![PAI v2.3](https://img.shields.io/badge/PAI-v2.3.0-8B5CF6?style=for-the-badge&logo=github)](v2.3/)

**Complete `.claude/` directory with continuous learning built in**

20 Skills | 11 Agents | 14 Hooks | Sentiment Capture | Memory System

[**Get Started with v2.3 →**](v2.3/)

</div>

---

This is the PAI releases directory, which deals with a different type of install from PAI Packs or Bundles. 

 PAI releases are designed to give you a full working state after a very short install wizard by giving you a functional .claude directory. 

---

## Understanding Release Contents

Each versioned release (e.g., `v2.3/`) contains:

```
v2.3/
├── .claude/          # Hidden directory - the complete PAI installation
├── Packs/            # Individual packs for modular installation
└── README.md         # This file (version-specific instructions)
```

> **Note:** The `.claude` directory starts with a period, making it hidden by default on macOS/Linux. Use `ls -la` to see it, or enable "Show hidden files" in your file manager.

---

## Two Installation Methods

PAI offers two ways to install:

### Method 1: Release Install (Complete Installation)

**Best for:** First-time users, fresh setups, or when you want the full PAI experience immediately.

**What happens:**
1. Back up your current `.claude` directory to `.claude-bak` or something similar.
2. Copy the entire `.claude` directory to your home folder
2. The `.claude` directory becomes `~/.claude` (PAI's home)
3. cd into the directory and run `bun run install.ts --setup`.
5. Follow the wizard.
6. Restart Claude Code to activate

**How to do it:**
```bash
# From the release directory
cp -r .claude ~/

# Run configuration (optional - sets your name, DA name, timezone)
cd ~/.claude
./configure.sh
```

**Result:** Complete PAI installation with all skills, hooks, memory system, and default configuration.

After this point, you will want to go and collect your context from your existing AI system or systems and use your new PAI system to intelligently place that content into where it belongs inside of the PAI system, such as under the work directory, the user directory, or in the skills directory, etc. 

We recommend you use AI to do this, after it thoroughly inspects your it's new PAI environment, your incoming data, etc.

---

### Method 2: Pack Install (Modular Installation)

**Best for:** Users who already have a PAI or other agent harness system set up, want selective installation, or prefer AI-guided setup.

**What happens:**
1. Your existing AI assistant (Claude Code, Cursor, etc.) reads the pack's INSTALL.md
2. The AI guides you through an interactive installation wizard
3. Packs install intelligently based on what you already have
4. Dependencies are checked and installed in the correct order

**How to do it:**
1. Open your AI coding assistant
2. Point it to a pack directory: "Install the pack at `/path/to/packs/pai-core-install`"
3. Follow the interactive prompts
4. Repeat for each pack you want

**Result:** Modular PAI installation with just the components you need.

## Troubleshooting

### "I can't see the .claude directory"

It's hidden. Use:
```bash
ls -la ~/ | grep claude
```

Or show hidden files in Finder: `Cmd + Shift + .`

### "Hooks aren't firing"

Restart Claude Code after installation. Hooks load at session start.

### "Pack says missing dependency"

Install packs in order. `pai-hook-system` first, then `pai-core-install`, then others.

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| v2.3 | 2026-01 | Current release |

---

**Questions?** See the main [PAI README](../README.md) or [INSTALL.md](../INSTALL.md).
