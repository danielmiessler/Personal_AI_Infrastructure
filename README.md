<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./pai-logo.png">
  <source media="(prefers-color-scheme: light)" srcset="./pai-logo.png">
  <img alt="PAI Logo" src="./pai-logo.png" width="600">
</picture>

<br/>
<br/>

# Personal AI Infrastructure

### Open-source scaffolding for building your own AI-powered operating system

<br/>

[![Version](https://img.shields.io/badge/version-2.1-blue?style=for-the-badge)](https://github.com/danielmiessler/Personal_AI_Infrastructure/releases)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
[![Packs](https://img.shields.io/badge/packs-8-purple?style=for-the-badge)](Packs/)
[![Bundles](https://img.shields.io/badge/bundles-1-orange?style=for-the-badge)](Bundles/)

<br/>

**Getting Started:** [What is PAI?](#what-is-pai) · [Quick Start](#-quick-start) · [15 Principles](#the-15-founding-principles)

**Packs & Bundles:** [Browse Packs](#-available-packs) · [Browse Bundles](#-available-bundles) · [How Packs Work](#-how-pai-packs-work) · [v1 → v2 Journey](#the-journey-pai-v1x--v20)

**Development:** [Create a Pack](#-for-pack-developers) · [Platform Support](#️-platform-compatibility) · [Contributing](#-contributing)

**Resources:** [FAQ](#-faq) · [Documentation](#-documentation) · [Community](#-community) · [Roadmap](#-roadmap) · [Updates](#-update-history)

<br/>

[![PAI Overview Video](https://img.youtube.com/vi/Le0DLrn7ta0/maxresdefault.jpg)](https://youtu.be/Le0DLrn7ta0)

**[Watch the full PAI walkthrough](https://youtu.be/Le0DLrn7ta0)** | **[Read: The Real Internet of Things](https://danielmiessler.com/blog/real-internet-of-things)**

---

# An AI system for pursuing your goals

</div>

The most powerful AI setups are being built inside companies. That's fine, but I think technology should serve humans—not the other way around.

PAI is open-source infrastructure for building your own AI system. One that knows your goals, learns from your history, and gets better at helping you over time. Not a generic assistant. *Your* assistant, working on *your* problems.

But here's what makes PAI different: underneath the personal layer is something more fundamental.

---

## What is PAI?

**PAI (Personal AI Infrastructure)** started as a framework for building personalized AI assistants. But in building it, we noticed something.

Every goal—whether it's fixing a bug, writing a book, building a company, or figuring out what to do with your life—follows the same basic structure. There's where you are. There's where you want to be. And there's the process of getting there.

We didn't invent this pattern. Evolution uses it. Science uses it. Every successful human endeavor uses it. We just made it explicit and built tools around it.

**PAI is three things:**
- **A universal pattern** - Two nested loops that apply to any goal, at any scale
- **Personal infrastructure** - Skills, memory, and context that make AI actually useful for *your* life
- **Open-source packs** - Battle-tested capabilities anyone can install or contribute

---

## The Two Loops

At the foundation of PAI is a simple observation: all progress—personal, professional, civilizational—follows the same two nested loops.

### The Outer Loop: Where You Are → Where You Want to Be

[![The Universal Algorithm](./pai-outer-loop-current-to-desired.png)](./pai-outer-loop-current-to-desired.png)

This is it. The whole game. You have a current state. You have a desired state. Everything else is just figuring out how to close the gap.

This pattern works at every scale:
- **Fixing a typo** - Current: wrong word. Desired: right word.
- **Learning a skill** - Current: can't do it. Desired: can do it.
- **Building a company** - Current: idea. Desired: profitable business.
- **Human flourishing** - Current: wherever you are. Desired: the best version of your life.

The pattern doesn't change. Only the scale does.

### The Inner Loop: The Scientific Method

[![The Inner Loop](./pai-inner-loop-7-phases.png)](./pai-inner-loop-7-phases.png)

*How* do you actually move from current to desired? Through iteration. Specifically, through the scientific method—the most reliable process humans have ever discovered for making progress.

PAI implements this as a 7-phase cycle that every workflow follows:

| Phase | What You Do |
|-------|-------------|
| **OBSERVE** | Look around. Gather context. Understand where you actually are. |
| **THINK** | Generate ideas. What might work? Come up with hypotheses. |
| **PLAN** | Pick an approach. Design the experiment. |
| **BUILD** | Define what success looks like. How will you know if it worked? |
| **EXECUTE** | Do the thing. Run the plan. |
| **VERIFY** | Check the results against your criteria. Did it work? |
| **LEARN** | Harvest insights. What did you learn? Then iterate or complete. |

The crucial insight: **verifiability is everything**. If you can't tell whether you succeeded, you can't improve. Most people skip the VERIFY step. They try things, sort of check if it worked, and move on. The scientific method's power comes from actually measuring results and learning from them—especially from failures.

Every PAI skill, every workflow, every task implements these two loops. The outer loop defines *what* you're pursuing. The inner loop defines *how* you pursue it. Together, they're a universal engine for making progress on anything.

### Where Are You on the Journey?

To understand your current capabilities and what to build next, see the **[Personal AI Maturity Model (PAIMM)](https://danielmiessler.com/blog/personal-ai-maturity-model)**—a 9-tier progression from basic chatbots to a full AI companion that knows you, remembers everything, and actively helps you pursue your goals.

---

## The 15 Founding Principles

These principles guide how PAI systems are designed and built:

[![PAI System Principles](./pai-system-principles.png)](https://danielmiessler.com/blog/personal-ai-infrastructure)

**[Read the full breakdown of each principle →](https://danielmiessler.com/blog/personal-ai-infrastructure)**

#### 1. The Foundational Algorithm
[![Foundational Algorithm](./pai-foundational-algorithm-v3.png)](https://danielmiessler.com/blog/personal-ai-infrastructure)
PAI is built around a universal pattern: **Current State → Desired State** via verifiable iteration. This is the outer loop. The inner loop is the 7-phase scientific method (OBSERVE → THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN). The critical insight: verifiability is everything. If you can't measure whether you reached the desired state, you're just guessing.

#### 2. Clear Thinking + Prompting is King
[![Clear Thinking](https://danielmiessler.com/images/pai-principle-01-clear-thinking.png)](https://danielmiessler.com/blog/personal-ai-infrastructure)
Good prompts come from clear thinking about what you actually need. Spend more time clarifying the problem than writing the prompt.

#### 3. Scaffolding > Model
[![Scaffolding](https://danielmiessler.com/images/pai-principle-02-scaffolding.png)](https://danielmiessler.com/blog/personal-ai-infrastructure)
The system architecture matters more than which model you use. Good scaffolding makes even smaller models perform well.

#### 4. As Deterministic as Possible
[![Deterministic](https://danielmiessler.com/images/pai-principle-03-deterministic.png)](https://danielmiessler.com/blog/personal-ai-infrastructure)
AI is probabilistic, but your infrastructure shouldn't be. Use templates and consistent patterns.

#### 5. Code Before Prompts
[![Code Before Prompts](https://danielmiessler.com/images/pai-principle-04-code-before-prompts.png)](https://danielmiessler.com/blog/personal-ai-infrastructure)
If you can solve it with a bash script, don't use AI. Only use AI for the parts that actually need intelligence.

#### 6. Spec / Test / Evals First
[![Spec Test Evals](https://danielmiessler.com/images/pai-principle-05-spec-test-evals.png)](https://danielmiessler.com/blog/personal-ai-infrastructure)
Before building anything complex, write specifications and tests. Use evals to measure if the system is actually working.

#### 7. UNIX Philosophy (Modular Tooling)
[![UNIX Philosophy](https://danielmiessler.com/images/pai-principle-06-unix-philosophy.png)](https://danielmiessler.com/blog/personal-ai-infrastructure)
Do one thing well. Make tools composable. Use text interfaces.

#### 8. ENG / SRE Principles
[![ENG SRE Principles](https://danielmiessler.com/images/pai-principle-07-eng-sre.png)](https://danielmiessler.com/blog/personal-ai-infrastructure)
Treat your AI infrastructure like production software: version control, automation, monitoring, rollback plans.

#### 9. CLI as Interface
[![CLI Interface](https://danielmiessler.com/images/pai-principle-08-cli-interface.png)](https://danielmiessler.com/blog/personal-ai-infrastructure)
Command-line interfaces are faster, more scriptable, and more reliable than GUIs.

#### 10. Goal → Code → CLI → Prompts → Agents
[![Goal to Agents](https://danielmiessler.com/images/pai-principle-09-goal-to-agents.png)](https://danielmiessler.com/blog/personal-ai-infrastructure)
The decision hierarchy: clarify the goal first, then try code, then CLI tools, then prompts, and only then agents.

#### 11. Meta / Self Update System
[![Meta Update](https://danielmiessler.com/images/pai-principle-10-meta-update.png)](https://danielmiessler.com/blog/personal-ai-infrastructure)
The system should be able to modify itself. Encode learnings so you never forget.

#### 12. Custom Skill Management
[![Skill Management](https://danielmiessler.com/images/pai-principle-11-skill-management.png)](https://danielmiessler.com/blog/personal-ai-infrastructure)
Skills are the foundation of personalization - modular capabilities that route intelligently.

#### 13. Custom History System
[![History System](https://danielmiessler.com/images/pai-principle-12-history-system.png)](https://danielmiessler.com/blog/personal-ai-infrastructure)
Everything worth knowing gets captured. History feeds back into context for future sessions.

#### 14. Custom Agent Personalities / Voices
[![Agent Personalities](https://danielmiessler.com/images/pai-principle-13-agent-personalities.png)](https://danielmiessler.com/blog/personal-ai-infrastructure)
Different work needs different approaches. Specialized agents with unique personalities and voices.

#### 15. Science as Cognitive Loop
The meta-principle: Hypothesis → Experiment → Measure → Iterate. Every decision follows this pattern.

---

## The Journey: PAI v1.x → v2.0

**PAI v1.x** attempted to mirror my entire personal AI system (Kai) as an installable template. The idea was simple: "Here's everything I built - clone it and customize."

**The problem:** It didn't work. The system was a Jenga tower of interconnected dependencies. Change one piece, and three others broke. Users couldn't easily adopt parts without understanding the whole. Updates were a nightmare because everything was coupled.

**PAI v2.0** takes a fundamentally different approach: **modular packs**.

Instead of "here's my whole system," it's "here are battle-tested capabilities you can install independently." Each pack is:
- **Self-contained** - Works without understanding the rest of the system
- **Independently installable** - Add what you need, skip what you don't
- **Platform-agnostic** - Works with Claude Code, OpenCode, or custom systems
- **AI-installable** - Your AI can read the pack and set it up for you

The packs are extracted from Kai - real capabilities that have been running in production. They're not theoretical examples. They're the actual tools and systems I use daily, packaged for others to adopt.

---

<div align="center">

# PAI v2.0: PAI Packs

</div>

**PAI Packs** are modular upgrade packages for AI agent systems. Think of them like learning kung-fu in The Matrix - each pack is a complete, tested capability that you can download into your system.

**PAI Packs provide** self-contained bundles with everything your AI needs to implement a specific capability:

- **The problem** being solved
- **The solution** and how it works
- **All code** (tools, CLIs, scripts)
- **Workflows** (step-by-step processes)
- **Context files** (guidelines, aesthetics, specifications)
- **Examples** and usage patterns
- **Installation instructions** (for both AI and manual)
- **Testing procedures**
- **Troubleshooting guides**

**The key insight:** Give your AI the complete context it needs, and it can integrate the pack into *your* system, whether that's Claude Code, OpenCode, Gemini Code, GPT-Codex, or a homebrew setup.

---

## 📦 Available Packs

### Features (Architectural Systems)

| Pack | Version | Category | Description |
|---------|---------|----------|-------------|
| [**Kai History System**](Packs/kai-history-system.md) | 1.0.0 | Infrastructure | Automatic context-tracking system that captures all work, decisions, and learnings with zero manual effort |

### Skills (Action-Oriented Capabilities)

| Pack | Version | Category | Description |
|---------|---------|----------|-------------|
| *Coming soon* | - | - | Skills being extracted and packaged |

### Coming Soon

**Features being packaged:**
- **Skill System** - Skill routing and workflow management
- **Agent Factory** - Custom agent creation and orchestration
- **Prompting System** - Meta-prompting and template framework

**Skills being packaged:**
- **Art** - Visual content generation system
- **Research** - Multi-source research orchestration with parallel agents
- **OSINT** - Open-source intelligence gathering

[**Submit your own pack**](#-contributing) →

---

## 📦 Available Bundles

**Bundles** are curated collections of packs designed to work together. Instead of installing packs one-by-one, install a bundle to get a complete, tested experience.

| Bundle | Description | Packs | Tier |
|--------|-------------|-------|------|
| [**Kai Bundle**](Bundles/Kai/) | The official PAI bundle - complete personal AI infrastructure extracted from Daniel Miessler's production system | 5 | Complete |

### Why Bundles?

- **Curated combinations** - Tested packs that work well together
- **Proper installation order** - Dependencies handled correctly
- **Emergent capabilities** - The whole is greater than the sum of parts
- **Complete experience** - Everything needed for a specific goal
- **Interactive wizard** - Guided setup with conflict detection

**The Kai Bundle** is the flagship bundle. Installing all its packs recreates the PAI v1.0 "mirrored system" experience - but through modular, maintainable packs instead of a monolithic copy.

**Quick install:**
```bash
# Clone the repo and run the interactive wizard
git clone https://github.com/danielmiessler/PAI.git
cd PAI/Bundles/Kai && bun run install.ts
```

[**Learn more about bundles →**](Bundles/)

---

## 🚀 Quick Start

> **FOR AI AGENTS:** The entire PAI system is designed to be used by AI. You can read this README to understand how PAI works with its Packs and Bundles. A recommended approach: evaluate the entire system, then interact with your principal and ask them which Bundles or Packs they'd like to install—give them options based on their needs. From there, you should be able to read any Bundle or Pack file (including new ones as they're released) and guide your principal on whether they want to install it.

### Option 1: Install the Complete Kai Bundle (Recommended)

The fastest way to get started is with the interactive bundle wizard:

```bash
# Clone the repo
git clone https://github.com/danielmiessler/PAI.git
cd PAI/Bundles/Kai

# Run the interactive wizard
bun run install.ts
```

**The wizard will:**
- Ask for your preferences (AI name, install location, timezone)
- Detect any existing installations and offer to merge or replace
- Create the required directory structure
- Configure environment variables
- Guide you through installing each pack in order

### Option 2: AI-Assisted Pack Installation

Install individual packs by giving them to your AI:

1. **Browse packs** - Find a pack you want in [Packs/](Packs/)
2. **Give it to your AI** - Provide the entire pack markdown file
3. **Ask your AI to install it:**

```
Install this pack into my system. Use PAI_DIR="~/.config/pai"
and DA="MyAI". Set up the hooks, save the code, and verify it works.
```

Your AI will:
- Check for required dependencies
- Save code to appropriate directories
- Set up routing/hooks (if applicable)
- Validate the installation
- Run a test to ensure it works

### Option 3: Manual Installation

Each pack includes detailed manual installation instructions. Open the pack file and follow the "Installation → Manual" section.

### Option 4: Browse and Cherry-Pick

Packs are self-contained markdown files. You can:
- Read the code directly in the pack
- Copy specific functions or workflows
- Adapt the approach to your own system
- Use it as reference documentation

**No forced structure. No mandatory setup. Take what's useful, leave the rest.**

---

## 📂 Understanding PAI_DIR

The `PAI_DIR` environment variable is the **single source of truth** for where your PAI installation lives.

### What is PAI_DIR?

`PAI_DIR` points to the directory where your personal AI infrastructure is installed - this is where skills, hooks, history, and configuration files live.

### Two Different Things

| Concept | Path | Purpose |
|---------|------|---------|
| **PAI Repository** | Where you cloned `git clone https://github.com/danielmiessler/PAI.git` | Source code, packs, templates - read-only reference |
| **PAI Installation** (`PAI_DIR`) | `~/.claude` (default) or your custom location | Your active installation - skills, hooks, history, config |

The repository is like a cookbook. Your installation is your actual kitchen.

### Default Behavior

If `PAI_DIR` is not set, PAI tools and packs default to `~/.claude`:
- This is the standard Claude Code configuration directory
- Works seamlessly with Claude Code out of the box
- Recommended for most users

### When to Use a Custom PAI_DIR

Set a custom `PAI_DIR` if you:
- Use a different AI coding assistant (Cursor, Windsurf, OpenCode)
- Want to keep PAI separate from Claude Code's config
- Are testing or developing packs
- Have multiple PAI installations

### Setting PAI_DIR

**In your shell profile** (`~/.zshrc` or `~/.bashrc`):
```bash
export PAI_DIR="$HOME/.claude"  # Default - Claude Code location
# OR
export PAI_DIR="$HOME/.config/pai"  # Custom location
```

### How Tools Resolve PAI_DIR

PAI tools use this resolution order:
1. `process.env.PAI_DIR` - Explicit setting (highest priority)
2. `process.env.PAI_HOME` - Legacy/alternate variable
3. `~/.claude` - Default fallback

This means: if you set `PAI_DIR`, it takes precedence. If not, it defaults to Claude Code's standard location.

---

## 🔐 Authentication Setup

**All API keys live in ONE place: `$PAI_DIR/.env`**

This is a core principle of PAI: **no keys stored anywhere else in the system**. Every pack, every tool, every workflow reads from this single file.

### Setup

```bash
# 1. Copy the example file to your PAI directory
cp .env.example $PAI_DIR/.env

# 2. Edit and add your API keys
nano $PAI_DIR/.env

# 3. Restart Claude Code to load the new environment
```

### What Goes in .env

**Core variables:**
- `DA` - Your AI assistant's name
- `TIME_ZONE` - Your timezone

**Pack-specific keys:** Each pack documents its required API keys in its installation section. Add them to `.env` as you install packs.

### Security Rules

1. **NEVER commit `.env` files to git** - The `.gitignore` already excludes them
2. **NEVER store API keys in pack files, configs, or code** - Always use environment variables
3. **ALL authentication flows through `$PAI_DIR/.env`** - One file, one location, no exceptions

See [.env.example](.env.example) for the complete template with documentation.

---

## 📖 How PAI Packs Work

PAI offers **two types of packs**, each with its own structure and purpose:

### Pack Type 1: Skills

**Skills** are action-oriented capabilities that your AI can invoke - things like generating visual content, conducting research, or processing data.

**Examples:** Art (visual content generation), Research (multi-source investigation), OSINT (intelligence gathering)

**Structure:**
1. **🤖 Assistant Install Prompt** - Step-by-step instructions for AI to autonomously install
2. **Pack Metadata** - Version, dependencies, API keys, platform support
3. **The Problem** - What's broken/missing?
4. **The Solution** - How this skill fixes it
5. **Quick Start** - Get running in 60 seconds
6. **Pack Contents** - Workflows, tools, context files (complete source code)
7. **Examples** - Real usage scenarios
8. **Installation** - AI-assisted + manual steps
9. **Testing** - Smoke tests and validation
10. **Troubleshooting** - Common issues and fixes
11. **Credits** - Attribution for ideas, influences, collaborators
12. **Resources** - Additional reading, related projects, external docs

### Pack Type 2: Features

**Features** are architectural patterns and systems - infrastructure pieces like custom history systems, skill routing, agent orchestration, or prompting frameworks.

**Examples:** History System (automatic context-tracking), Skill System (routing and management), Agent Factory (custom agent creation), Prompting System (meta-prompting and templates)

**Structure:**
1. **🤖 Assistant Install Prompt** - Step-by-step instructions for AI to autonomously install
2. **Pack Metadata** - Version, dependencies, platform support
3. **The Problem** - What architectural challenge exists?
4. **The Solution** - The design pattern and approach
5. **Implementation** - Complete code, configuration files, integration guides
6. **Examples** - Real-world usage patterns
7. **Installation** - AI-assisted + manual steps
8. **Testing** - Validation procedures
9. **Troubleshooting** - Common integration issues
10. **Credits** - Attribution for architectural ideas, influences
11. **Resources** - Additional reading, similar systems, theoretical background

### Universal Elements

**All packs include:**

```yaml
pack:
  name: PackName
  version: 1.0.0
  category: visual-content | infrastructure | research | automation
  type: skill | feature
  author: Contributor Name
  license: MIT
  requires:
    - Other-Pack >= 1.0.0 (optional dependencies)
  platforms: [macos, linux, windows]
  dependencies:
    tools: [bun, ImageMagick]
    api_keys: [REPLICATE_API_TOKEN]
```

**🤖 Assistant Install Prompt** - Every pack starts with instructions for AI assistants to autonomously install it. Your AI reads the pack, understands what it does, verifies dependencies, sets up the code, and validates it works - all without manual intervention.

### Why Single Files?

**Portability** - One file contains everything. Email it, share it, version control it.

**AI-Friendly** - Your AI can read the entire context at once. No navigation, no missing pieces.

**No Dependencies** - Packs are self-contained. They may *call* external tools, but the pack itself is complete.

**Easy Review** - See exactly what you're installing. No hidden files, no surprises.

**Version Control** - Simple to track changes, fork, and merge improvements.

---

## 🛠️ For Pack Developers

### Creating a PAI Pack

**1. Get the pack template:**

```bash
curl -O https://raw.githubusercontent.com/danielmiessler/PAI/main/Tools/PAIPackTemplate.md
```

**2. Fill in each section:**
- **Assistant Install Prompt** - Instructions for AI to install autonomously
- **Problem statement** - What's broken or missing?
- **Solution** - How your pack fixes it
- **Implementation/Contents** - All code (embedded in markdown code blocks)
- **Examples** - Real usage scenarios
- **Installation steps** - Both AI-assisted and manual
- **Testing procedures** - Smoke tests and validation
- **Credits** - Attribution for ideas and influences
- **Resources** - Additional reading and related projects

**3. Validate it:**

Test with your own AI:
```
Here's my pack. Install it into a fresh system and verify it works.
```

**4. Submit a PR:**

```bash
git checkout -b add-pack-name
cp MyPack.md Packs/
git add Packs/MyPack.md
git commit -m "Add MyPack - one-line description"
git push origin add-pack-name
```

Open a PR with:
- Pack description
- What problem it solves
- Testing you've done
- Screenshots/examples (if applicable)

### Pack Quality Standards

**Must have:**
- ✅ Clear problem statement
- ✅ Complete working code (tested)
- ✅ Real examples (not placeholders)
- ✅ Both AI and manual installation instructions
- ✅ Troubleshooting section
- ✅ No hardcoded personal data

**Nice to have:**
- Screenshots of output
- Video demo
- Multiple examples for different use cases
- Integration with other packs

---

## 🏗️ Platform Compatibility

PAI packs are designed to be **platform-agnostic**:

| Platform | Status | Notes |
|----------|--------|-------|
| **Claude Code** | ✅ Full support | Native integration, all features work |
| **Gemini CLI** | ✅ Full support | Supported via `gemini-pai` adapter |
| **OpenCode** | ✅ Compatible | Skills/hooks may need adaptation |
| **Custom systems** | ✅ Compatible | Extract code, adapt to your structure |
| **GPT-Codex** | 🔄 Testing | Should work with minor tweaks |
| **Manual use** | ✅ Always works | Packs are documentation + code |

The code itself is platform-independent (TypeScript, Python, Bash). Integration points (skills, hooks) may vary by platform.

---

## 💡 Why Packs?

**Text is the interface.** Everything your AI needs to implement a capability should be in one readable file.

**Composability over monoliths.** Mix and match packs. Build your own stack.

**AI-first design.** Optimized for AI agents to read, understand, and implement - not just humans.

**Open contribution.** Anyone can submit a pack. The best ideas win.

**No vendor lock-in.** Packs describe *how to solve a problem*, not just "here's the code for our platform."

---

## 🤝 Contributing

### Submit a Pack

We welcome packs that solve real problems:

1. **Fork the repository**
2. **Create your pack** - Follow [PAIPackTemplate.md](Tools/PAIPackTemplate.md)
3. **Test it thoroughly** - Install in a fresh system with AI assistance
4. **Submit a PR** - Include examples and testing evidence

### Pack Review Process

Submitted packs are reviewed for:
- **Completeness** - All required sections present
- **Code quality** - Works as described, no obvious bugs
- **Security** - No hardcoded secrets, follows best practices
- **Usefulness** - Solves a real problem for users

**Review timeline:** Most packs reviewed within 7 days.

### Pack Maintenance

**Authors maintain their packs.** When you submit a pack, you're committing to:
- Respond to issues about your pack
- Fix bugs that are reported
- Consider feature requests
- Update for breaking changes in dependencies

If a pack becomes unmaintained, the community can fork and maintain a new version.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [PACKS.md](PACKS.md) | Complete pack system documentation |
| [Bundles/](Bundles/) | Bundle system documentation and available bundles |
| [SECURITY.md](SECURITY.md) | Security policies and best practices |

---

## 🎯 Roadmap

### v1.0 (Current)

- [x] Pack format specification
- [x] History System pack (context-tracking)
- [x] Pack template
- [x] Installation documentation
- [ ] Pack discovery website
- [ ] 5+ core packs released

### v1.1 (Q1 2026)

- [ ] Pack dependency system
- [ ] Automated testing framework
- [ ] Pack marketplace
- [ ] Cross-pack integration examples
- [ ] 20+ packs available

### v1.2 (Q2 2026)

- [ ] Pack composition tools
- [ ] Version compatibility checker
- [ ] Community pack ratings
- [ ] Pack search/filter by category
- [ ] 50+ packs available

---

## 🌐 Community

**GitHub Discussions:** [Join the conversation](https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions)

**Discord:** [PAI Community](https://discord.gg/danielmiessler) (coming soon)

**Twitter/X:** [@danielmiessler](https://twitter.com/danielmiessler)

**Blog:** [danielmiessler.com](https://danielmiessler.com)

### Recognition

**Top pack contributors** (packs submitted/maintained):
- (List will be populated as packs are submitted)

**Special thanks:**
- All early PAI users who provided feedback
- The Claude Code team for building an incredible platform

---

## ❓ FAQ

### Isn't Claude Code and other agentic systems already pretty good? What makes this an upgrade over them?

PAI isn't a replacement for Claude Code—it's what you build *on top of it*. Claude Code (and systems like Cursor, Windsurf, OpenCode) gives you an AI that can read files, write code, and execute commands. But they're generic. They don't know your goals, your preferred workflows, your history, or your specific context.

PAI provides the scaffolding to make that generic AI *yours*:

- **Persistent memory** — Your AI remembers past sessions, decisions, and learnings
- **Custom skills** — Specialized capabilities for the things you do most (research, content creation, security analysis, etc.)
- **Your context** — Goals, contacts, preferences, definitions—all available to your AI without re-explaining
- **Intelligent routing** — Say "research this" and the right workflow triggers automatically
- **Self-improvement** — The system can modify itself based on what it learns

Think of it this way: Claude Code is the engine. PAI is everything else that makes it *your* car—the custom seat position, the saved radio stations, the GPS with your home address, the toolbox in the trunk.

### Do I need to install everything?

No—and that's the point. The mistake of PAI v1 (and many other agentic systems) was trying to install everything all at once in an all-or-nothing fashion. That creates fragile systems where one broken piece takes down the whole thing.

PAI v2 is modular by design:

- **Packs are independent** — Install one, install ten, install none. Each pack is self-contained.
- **Start small** — Begin with the Hook System, add History when you want persistence, add Skills when you need routing
- **No dependencies on the whole** — Each pack declares its dependencies explicitly. You install exactly what you need.
- **Incremental adoption** — Use PAI alongside your existing setup. Migrate at your own pace.

The best way to start: pick ONE pack that solves a problem you have today. Install it. Use it. Then decide if you want more.

### What's the difference between PAI and Anthropic's plugin system?

Anthropic's plugin system (Skills, slash commands, MCP servers) provides discrete functionality—individual tools your AI can use. It's powerful, and you're free to use plugins as part of PAI as well.

The difference is scope and integration:

**Anthropic's plugins** = Individual pieces of functionality that don't understand overall context—they don't know how they work with other pieces of functionality, and most importantly, they don't integrate with your actual system and your actual goals.

**PAI** = A complete system where everything understands the context—your goals, your workflows, how pieces work together, and what you're actually trying to accomplish.

PAI is:
- **An implemented, full-setup system** — Not just tools, but a complete personal AI infrastructure
- **Dynamically adaptive** — Adjusts to your existing environment and workflows
- **Context-aware** — Understands what you're trying to accomplish in your life and work
- **Customized to you** — Picks and chooses functionality from different sources
- **Self-managing** — Your AI installs, configures, and maintains the system itself

The plugin system offers building blocks. PAI offers a blueprint for a mansion—plus the AI architect to build it.

### Is PAI only for Claude Code?

No. PAI packs are designed to be **platform-agnostic**. While the examples use Claude Code (because that's what the author uses), the packs work with:

- **Claude Code** — Full native support
- **OpenCode** — Compatible with minor adaptations
- **Cursor / Windsurf** — Works with configuration adjustments
- **Gemini Code / GPT-Codex** — Should work with tweaks (community testing welcome)
- **Custom systems** — Extract the code and concepts, adapt to your setup

The code is TypeScript, Python, and Bash. The concepts are universal. The integration points vary by platform, but the core value transfers.

### Do I need to install everything?

No. That was the mistake of PAI v1.x—trying to install everything at once.

PAI v2.0 is modular by design:
- **Start with one pack** — History System is a good first choice
- **Add more as needed** — Each pack is independent
- **Use the Kai Bundle** if you want the full experience (but even that installs one pack at a time)
- **Cherry-pick** — Read a pack, extract the ideas, adapt them yourself

There's no "all or nothing." Take what's useful, leave the rest.

### How do I contribute a pack?

1. **Solve a real problem** — Packs should come from actual use, not theoretical ideas
2. **Use the template** — Download [PAIPackTemplate.md](Tools/PAIPackTemplate.md)
3. **Test it** — Have your AI install it in a fresh environment
4. **Submit a PR** — Include examples and evidence it works

See [Contributing](#-contributing) for full details.

### How is this different from fabric?

[Fabric](https://github.com/danielmiessler/fabric) is a collection of AI prompts (patterns) for specific tasks—extract wisdom, analyze arguments, summarize content. It's focused on *what to ask AI*.

PAI is infrastructure for *how your AI operates*—memory, skills, routing, context, self-improvement. They're complementary:

- **Fabric** = A library of expert prompts
- **PAI** = The system that knows when to use which prompt, remembers your preferences, and learns from results

Many PAI users integrate Fabric patterns into their skills. They work great together.

### What if I break something?

The modular design makes recovery easy:

- **Packs are isolated** — Breaking one doesn't affect others
- **History is preserved** — Your AI's memory survives mistakes
- **Git-backed** — Version control everything, roll back when needed
- **AI can fix it** — Your AI helped build it, it can help repair it

Start small, experiment, iterate. The system is designed for safe exploration.

---

## 📜 License

MIT License - see [LICENSE](LICENSE) for details.

**TL;DR:** Do whatever you want with this. Build on it, sell it, modify it. Just don't blame us if something breaks. Attribution appreciated but not required.

---

## 🎁 Support PAI

PAI is **free and open-source forever.**

If you find it valuable:

- ⭐ **Star the repo** - Helps others discover it
- 📢 **Share your packs** - The more packs, the better PAI gets
- 💬 **Engage in discussions** - Help answer questions, share ideas
- 🐛 **Report issues** - Make PAI better for everyone
- ✍️ **Write about it** - Blog posts, videos, tutorials

**Premium support** coming soon for organizations.

---

## 📚 Related Reading

- [The Real Internet of Things](https://danielmiessler.com/blog/real-internet-of-things) — The vision behind PAI
- [AI's Predictable Path: 7 Components](https://danielmiessler.com/blog/ai-predictable-path-7-components-2024) — Visual walkthrough of where AI is heading
- [Building a Personal AI Infrastructure](https://danielmiessler.com/blog/personal-ai-infrastructure) — Full PAI walkthrough with examples

---

## 📜 Update History

<details open>
<summary><strong>v2.1.0 (2025-12-31) — Directory-Based Pack Structure</strong></summary>

<br/>

**Major Pack Format Change**
- All 8 packs migrated from single markdown files to directory-based structure
- New pack format: `README.md`, `INSTALL.md`, `VERIFY.md`, and `src/` directory
- Source code now lives in real files (.ts, .yaml, .hbs) instead of embedded in markdown

**Why This Matters**
- Solves token limit issues (single files exceeded 28k tokens vs 25k limit)
- Real code files can be linted, tested, and validated
- AI agents copy actual files instead of extracting from markdown blocks
- Eliminates "helpful simplification" where AI would reduce code complexity

**Updated Documentation**
- Packs/README.md updated with v2.0 structure documentation
- Bundles/README.md updated with new pack format description
- Bundles/Kai/README.md bumped to v2.0.0 with directory references

**What Changed Per Pack**
Each pack directory now contains:
```
pack-name/
├── README.md      # Overview, architecture, what it solves
├── INSTALL.md     # Step-by-step installation instructions
├── VERIFY.md      # Mandatory verification checklist
└── src/           # Actual source code files
```

</details>

<details>
<summary><strong>v2.0.1 (2025-12-30) — Pack Expansion & Polish</strong></summary>

<br/>

**New Packs Released**
- **Kai Prompting Skill** (v1.0.0) - Meta-prompting system with templates, standards, and dynamic prompt generation
- **Kai Agents Skill** (v1.0.0) - Dynamic agent composition with personality mapping and parallel orchestration

**Pack Updates**
- **Kai Voice System** - New pack icon with refined design (cache-busted for immediate updates)
- **Kai Art Pack** (v1.1.0) - Multi-reference image support for complex visual compositions

**Documentation & Quality**
- Standardized authentication to single `$PAI_DIR/.env` location across all packs
- Enhanced wizard clarity for installation flows (addressing #259, #260, #261)
- Safer verification patterns for security hooks
- Consistency pass across all pack documentation
- Updated pack manifests with accurate dependencies

**Infrastructure**
- Reorganized Tools directory with AI usage guide
- Added Tools README with icons and descriptions
- Moved templates and diagnostic tools to centralized location

**What's New Since v2.0.0?**

v2.0.0 launched the Packs system. v2.0.1 adds:
- 8 feature packs now available with improved documentation
- Better installation experience with clearer wizards
- Unified authentication pattern (no more scattered .env files)
- Professional pack icons for visual consistency

</details>

<details>
<summary><strong>v2.0.0 (2025-12-28) — PAI Packs System Launch</strong></summary>

<br/>

**Major Architecture Shift**
- Transitioned from "mirrored system" approach to modular **PAI Packs**
- Packs are self-contained, AI-installable capability bundles
- Platform-agnostic design: works with Claude Code, OpenCode, Gemini Code, GPT-Codex, or custom systems

**First Pack Released**
- **Kai History System** (v1.0.0) - Automatic context-tracking for entire AI infrastructure
- Complete implementation: 4 hooks, 3 library files, settings.json configuration

**New Documentation**
- `Tools/PAIPackTemplate.md` - Full pack template specification
- `PACKS.md` - Complete pack system documentation
- Updated README with 14 Founding Principles and full pack installation guide

**Why the Change?**
- v1.x tried to mirror the entire Kai system - too fragile, too many interdependencies
- v2.0 extracts battle-tested features as independent, installable modules
- Each pack is like learning kung-fu in The Matrix - a complete capability download

</details>

<details>
<summary><strong>v0.9.1 (2025-12-01) — Patch Release</strong></summary>

<br/>

**Fixes**
- `PAI_DIR` now auto-configures in settings.json during setup
- Platform-agnostic paths work across macOS, Linux, Windows
- Fixed timezone configuration in hooks

</details>

<details>
<summary><strong>v0.9.0 (2025-11-28) — Observability & Identity</strong></summary>

<br/>

**Observability Dashboard**
- Real-time agent monitoring with live charts
- Bun + Vue architecture for performance
- Multiple themes (Tokyo Night, Nord, Catppuccin, etc.)
- Security obfuscation for sensitive data

**Genericized Agent Identity**
- All agent references now use `process.env.DA || 'main'`
- No more hardcoded names — your DA name flows through the entire system
- Observability dashboard shows your configured identity

**Platform-Agnostic Configuration**
- Clear separation: `settings.json` for identity/paths, `.env` for API keys
- `DA` (Digital Assistant name) — your AI's identity
- `PAI_DIR` — root directory for all configuration
- `TIME_ZONE` — configurable timezone for timestamps

**Skill System Improvements**
- Canonical TitleCase file naming throughout
- Standardized skill-workflow-notification script for dashboard detection
- All paths use `${PAI_DIR}/` for location-agnostic installation

</details>

<details>
<summary><strong>v0.8.0 (2025-11-25) — Research & Documentation</strong></summary>

<br/>

**Research Skill**
- Comprehensive research skill with 10 specialized workflows
- Multi-source research with parallel agent execution
- Fabric pattern integration (242+ AI patterns)

**Infrastructure**
- Path standardization using `${PAI_DIR}/` throughout
- `PAI_CONTRACT.md` defining core guarantees
- Self-test validation system for health checks
- Protection system for PAI-specific files

</details>

<details>
<summary><strong>v0.7.0 (2025-11-20) — Protection & Clarity</strong></summary>

<br/>

**PAI Path Resolution System** (#112)
- Centralized `pai-paths.ts` library — single source of truth
- Smart detection with fallback to `~/.claude`
- Updated 7 hooks to use centralized paths

**PAI vs Kai Clarity** (#113)
- `PAI_CONTRACT.md` — official contract defining boundaries
- Self-test system (`bun ${PAI_DIR}/hooks/self-test.ts`)
- Clear README section distinguishing PAI from Kai

**Protection System**
- `.pai-protected.json` manifest of protected files
- `validate-protected.ts` script for pre-commit validation
- Pre-commit hook template for automated checks

</details>

<details>
<summary><strong>v0.6.5 (2025-11-18) — BrightData Integration</strong></summary>

<br/>

**Four-Tier Progressive Web Scraping**
- Tier 1: WebFetch (free, built-in)
- Tier 2: cURL with headers (free, more reliable)
- Tier 3: Playwright (free, JavaScript rendering)
- Tier 4: Bright Data MCP (paid, anti-bot bypass)

</details>

<details>
<summary><strong>v0.6.0 (2025-11-15) — Major Architecture Update</strong></summary>

<br/>

**Repository Restructure**
- Moved all configuration to `.claude/` directory
- Skills-as-containers architecture
- Three-tier progressive disclosure

**Skills System**
- Art skill with visual content generation
- Story-explanation skill for narrative summaries
- Create-skill and create-cli meta-skills

**Hook System**
- Comprehensive event capture system
- Session summary and tool output capture
- Tab title updates

**Voice Integration**
- Voice server with ElevenLabs TTS
- Session start notifications

</details>

<details>
<summary><strong>v0.5.0 and Earlier</strong></summary>

<br/>

**v0.5.0 — Foundation**
- CORE skill as central context loader
- Constitution defining system principles
- CLI-First Architecture pattern
- Initial skills: Fabric, FFUF, Alex Hormozi pitch

**Pre-v0.5.0 — Early Development**
- Initial repository setup
- Basic settings.json structure
- Agent personality definitions
- Foundational hook experiments

</details>

---

## 🙏 Credits

**Anthropic and the Claude Code team** — First and foremost. You are moving AI further and faster than anyone right now. Claude Code is the foundation that makes all of this possible.

**[IndyDevDan](https://www.youtube.com/@indydevdan)** — For great videos on meta-prompting and custom agents that have inspired parts of PAI.

### Contributors

**[fayerman-source](https://github.com/fayerman-source)** — Google Cloud TTS provider integration and Linux audio support for the voice system.

---

<div align="center">

**Built with ❤️ by [Daniel Miessler](https://danielmiessler.com) and the PAI community**

*Augment yourself.*

</div>
