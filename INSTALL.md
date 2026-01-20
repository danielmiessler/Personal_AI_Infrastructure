# Installing PAI

> [!IMPORTANT]
> ## This File Is For Your DA
>
> **This is the future of software installation.**
>
> In 2026 and beyond, software doesn't get installed by humans copying commands. It gets installed by your DA assistant, who reads the documentation, understands your system, asks you questions, and customizes the installation for your specific needs.
>
> **You can install PAI manually if you want**—the instructions are below. But PAI is designed to be installed by your DA. Give your DA this file and let it guide you through a personalized wizard.

---

## For AI Assistants: Installation Guide

You are about to help your principal install PAI (Personal AI Infrastructure). This is an interactive process where you'll explain concepts, ask questions, and customize the installation based on their needs.

### Your Role

You are not just copying files. You are:
1. **Explaining** what PAI is and why it matters
2. **Asking** questions to understand their needs
3. **Customizing** the installation for their specific setup
4. **Guiding** them through each step with clear explanations
5. **Verifying** everything works before declaring success

### The Installation Wizard Flow

Follow this flow, using your platform's question/prompt tools (like `AskUserQuestion` in Claude Code) to make it interactive:

---

#### Phase 1: Introduction

Start by explaining PAI to your principal:

**What is PAI?**
> PAI (Personal AI Infrastructure) is open-source scaffolding for building a personalized AI system. Not a chatbot—a *system* that knows your goals, remembers your context, and gets better at helping you over time.
>
> Most powerful AI setups are built inside companies for companies. PAI democratizes that—giving everyone access to the kind of AI infrastructure previously available only to the privileged few.

**How is PAI different from other AI tools?**
> Unlike plugins, extensions, or simple prompts, PAI is a complete infrastructure layer:
> - **Memory** — Your DA remembers past sessions, decisions, and learnings
> - **Skills** — Specialized capabilities that route intelligently based on context
> - **Hooks** — Event-driven automation that responds to what's happening
> - **Security** — Layered protection for your data and commands
> - **Goals** — Deep understanding of what you're trying to accomplish
>
> Other tools give you features. PAI gives you a foundation to build *your* AI system.

---

#### Phase 2: Understanding Their Setup

Ask your principal these questions to understand their environment:

**Question 1: Which AI platform are you using?**
- Claude Code (Recommended)
- Cursor
- Windsurf
- OpenCode
- Other / Custom

**Question 2: Where should PAI be installed?**
- Default: `~/.claude` (recommended for Claude Code)
- Custom location (ask them to specify)

**Question 3: What's your experience level with AI tools?**
- New to AI assistants
- Comfortable with chatbots, new to agentic AI
- Experienced with AI coding assistants
- Advanced / Building my own AI systems

This helps you calibrate how much explanation to provide.

---

#### Phase 3: Choosing What to Install

PAI offers three installation paths. Explain each and help them choose:

**Option A: Full Release Install (Recommended)**
> The fastest path to a working system. You get a complete, pre-configured `.claude/` directory with all infrastructure packs already installed.
>
> Best for: First-time users, fresh setups, or when you want PAI working immediately.
>
> [See Releases/v2.3/README.md](Releases/v2.3/README.md)

**Option B: Bundle + Manual Packs**
> The Bundle wizard creates a skeleton directory structure. You then install each pack manually in order. This gives you understanding of how the system is built.
>
> Best for: Users who want to learn the system as they build it, or need customization.
>
> [See Bundles/Official/README.md](Bundles/Official/README.md)

**Option C: Individual Packs**
> Install only specific capabilities you need. Maximum flexibility, minimum overhead.
>
> Best for: Experienced users adding specific features to existing setups.
>
> [See Packs/README.md](Packs/README.md)

**Ask: How would you like to proceed?**
- **Full Release Install** (Recommended) — Complete working system in 5 minutes
- **Bundle + Manual Packs** — Build understanding as you install each pack
- **Individual Packs** — Cherry-pick specific capabilities

---

#### Phase 4: The PAI Bundle (If Selected)

If they chose the PAI Bundle, explain what's included:

**The PAI Bundle includes:**

| Pack | What It Does |
|------|--------------|
| **pai-hook-system** | Event-driven automation — the foundation everything else builds on |
| **pai-core-install** | Identity, skills routing, system configuration, and memory system |
| **pai-agents-skill** | Dynamic agent composition with personality traits and voices |
| **pai-voice-system** | Spoken notifications via text-to-speech (optional) |
| **pai-browser-skill** | Web automation for testing and verification |
| **pai-observability-server** | Real-time dashboard for monitoring agent activity |

**Ask: Ready to install the PAI Bundle?**
- Yes, install everything
- Tell me more about each pack first
- I want to customize which packs to include

---

#### Phase 5: Installation

For each pack being installed:

1. **Read the pack's INSTALL.md** in `Packs/[pack-name]/INSTALL.md`
2. **Follow its specific wizard flow** — each pack has its own questions
3. **Run its verification** from `VERIFY.md`
4. **Confirm success** before moving to the next pack

**Installation order matters.** Install in this sequence:
1. pai-hook-system (foundation - hooks enable everything else)
2. pai-core-install (identity, skills, memory system)
3. pai-agents-skill (agent composition - requires core)
4. pai-voice-system (optional - TTS notifications)
5. pai-browser-skill (optional - web automation)
6. pai-observability-server (optional - monitoring dashboard)

---

#### Phase 6: Verification

After installation, verify the system works:

1. **Check directory structure** — Confirm `$PAI_DIR/skills/`, `$PAI_DIR/hooks/`, etc. exist
2. **Test hooks** — Restart the AI session and confirm hooks fire
3. **Test a skill** — Try invoking a simple skill
4. **Check history** — Confirm sessions are being captured

Report results to your principal clearly.

---

#### Phase 7: Next Steps

After successful installation, guide them on what to do next:

1. **Explore your new system** — "Ask me to show you what skills are available"
2. **Customize your identity** — Edit `$PAI_DIR/skills/CORE/USER/` files
3. **Set up your goals** — Configure TELOS for deep goal tracking
4. **Learn the workflows** — Ask about specific capabilities

---

## Manual Installation (For Humans)

If you prefer to install PAI yourself without AI assistance:

### Prerequisites

- [Bun](https://bun.sh) runtime installed
- An AI coding assistant (Claude Code, Cursor, etc.)
- Git

### Quick Start: Full Release Install (Recommended)

```bash
# Clone the repository
git clone https://github.com/danielmiessler/PAI.git
cd PAI/Releases/v2.3

# Back up your existing Claude Code configuration (if any)
[ -d ~/.claude ] && mv ~/.claude ~/.claude-backup-$(date +%Y%m%d)

# Copy the complete PAI installation
cp -r .claude ~/

# Run the configuration wizard
cd ~/.claude && bun run install.ts --setup
```

The wizard will ask for your name, DA name, timezone, and voice preferences. After completion, restart Claude Code to activate hooks.

**Shell support:** Works with both bash and zsh. The wizard auto-detects your shell and writes to the appropriate config file.

### Alternative: Bundle + Manual Packs

If you prefer to build understanding as you install:

```bash
# Clone the repository
git clone https://github.com/danielmiessler/PAI.git
cd PAI/Bundles/Official

# Run the Bundle wizard (creates skeleton only)
bun run install.ts

# Then install each pack manually IN ORDER:
# 1. pai-hook-system
# 2. pai-core-install
# 3. pai-statusline
# 4. pai-voice-system (optional)
```

> **Warning:** The Bundle wizard alone does NOT create a working system. You must install the required packs afterward.

### Installing Individual Packs

Each pack in `Packs/` has its own installation:

```bash
# Example: Install just the history system
cd Packs/pai-history-system
# Read INSTALL.md and follow instructions
# Or give the directory to your DA
```

### Directory Structure

After installation, your PAI directory will look like:

```
$PAI_DIR/
├── skills/           # Capability modules
│   └── CORE/         # Core identity and routing
├── hooks/            # Event-driven automation
├── MEMORY/           # History, learnings, state
│   ├── History/
│   ├── Learning/
│   └── Signals/
└── settings.json     # Configuration
```

---

## Troubleshooting

**Hooks not firing?**
- Restart your DA session after installation
- Check `settings.json` has the hooks registered
- Verify hook files exist in `$PAI_DIR/hooks/`

**Skills not routing?**
- Confirm `CORE/SKILL.md` exists and is readable
- Check that SessionStart hook loads context

**Need help?**
- [GitHub Discussions](https://github.com/danielmiessler/PAI/discussions)
- [README](README.md) for full documentation

---

## Philosophy: Why AI-First Installation?

Traditional software installation is a series of commands you copy and paste, hoping nothing goes wrong. When something breaks, you're on your own.

AI-first installation is different:

1. **Context-aware** — Your DA understands your existing setup before making changes
2. **Interactive** — You're asked questions, not given a one-size-fits-all script
3. **Adaptive** — Installation adjusts based on your answers and environment
4. **Verified** — Your DA confirms things work, not just that commands ran
5. **Explained** — You understand what's being installed and why

This is how software should be installed in 2026 and beyond. Not copying commands. Having a conversation with an AI that customizes the system for you.

**PAI isn't just built this way—PAI believes all software should be built this way.**
