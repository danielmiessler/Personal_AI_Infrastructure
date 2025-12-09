<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./pai-logo.png">
  <source media="(prefers-color-scheme: light)" srcset="./pai-logo.png">
  <img alt="PAI Logo" src="./pai-logo.png" width="1200">
</picture>

# **Personal AI Infrastructure** (PAI)

### **Enhanced Fork** • Multi-Agent Collaboration & Enterprise Skills

### **Open-source personal AI infrastructure for orchestrating your life and work**

> **Note**: This is an enhanced fork of [danielmiessler/Personal_AI_Infrastructure](https://github.com/danielmiessler/Personal_AI_Infrastructure) with additional features for multi-agent collaboration, enterprise security (CMMC Level 2), agile product management, and test engineering. See [Additional Features](#additional-features) below.

<br/>

![Static Badge](https://img.shields.io/badge/mission-upgrade_humans_using_AI-8B5CF6)
![GitHub last commit](https://img.shields.io/github/last-commit/danielmiessler/Personal_AI_Infrastructure)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Powered%20by-Claude%20Code-blue)](https://claude.ai/code)
[![PAI Video](https://img.shields.io/badge/🎥_Watch-PAI_Video-6B46C1)](https://youtu.be/iKwRWwabkEc)

**[Quick Start](#-quick-start)** • **[Documentation](#-documentation)** • **[Examples](#-examples)** • **[Community](#-community)**

</div>

---

<div align="center">

## *"This project exists so that the best AI in the world is not only used by a few, but can be used by everyone."*

</div>

Right now the most powerful AI setups are being built inside companies with massive engineering teams. That's backwards. These tools should be available to individuals—to you—so you can build your own AI system that actually knows how you work.

That's what PAI is. It's the scaffolding for building a personal AI that gets better over time because it's *yours*. Not some generic chatbot. Your system, your skills, your workflows.

---

## 🎯 **What is PAI?**

PAI (Personal AI Infrastructure) is an open-source template for building your own AI-powered operating system using Claude Code.

**Core Primitives:**
- **Skills** - Self-contained AI capabilities with routing, workflows, and documentation
- **Agents** - Specialized AI personalities for different tasks (engineer, researcher, designer, etc.)
- **Hooks** - Event-driven automation that captures work, provides voice feedback, and manages state

**Approach:** Start clean, small, and simple. Build the scaffolding that makes AI reliable.

---

## 🔄 **PAI vs Kai: What You Get**

**PAI (this repository) provides:**
- ✅ Skills/agents/hooks architecture
- ✅ CORE documentation and routing
- ✅ History system (UOCS) for automatic documentation
- ✅ Example skills (research, fabric, etc.)
- ✅ Voice server skeleton
- ⚙️ **Requires:** API key configuration per skill

**Kai (Daniel's private system) adds:**
- 🔒 Personal data, contacts, and history
- 🔒 Additional private skills and workflows
- 🔒 Customized agent personalities and voices
- 🔒 Production integrations and automations

**Think of it this way:** PAI is the scaffolding. You build your own "Kai" on top of it.

**After setup, PAI should:**
- ✅ Execute hooks without errors
- ✅ Load CORE context at session start
- ✅ Route skills correctly
- ✅ Capture session history
- ✅ Launch agents successfully

**Not working?** Run the health check:
```bash
bun ${PAI_DIR}/hooks/self-test.ts
```

See `PAI_CONTRACT.md` for complete details on what's guaranteed vs what needs configuration.

---

## 🚀 **Quick Start**

### Prerequisites

- [Claude Code](https://claude.com/claude-code) installed
- Git installed (`git --version` to verify)

### TL;DR - One-Line Install

```bash
# Enhanced PAI fork with multi-agent collaboration & enterprise skills
curl -fsSL https://raw.githubusercontent.com/banjoey/Personal_AI_Infrastructure/forge-all/.claude/setup.sh | bash
```

This will:
- ✅ Clone PAI from the `forge-all` branch
- ✅ Back up any existing `~/.claude` configuration
- ✅ Set up symlinks for skills, hooks, commands (auto-update with git pull)
- ✅ Copy settings.json with your personalization (preserves model workarounds)
- ✅ Run the personalization wizard (name your assistant)

### How Updates Work

```bash
# Update PAI - just re-run setup.sh
curl -fsSL https://raw.githubusercontent.com/banjoey/Personal_AI_Infrastructure/forge-all/.claude/setup.sh | bash

# Or if you already have PAI installed:
cd ~/PAI && git pull && ./.claude/setup.sh
```

Your customizations in `~/.claude/settings.json` are preserved. Symlinked directories (skills, hooks) update automatically.

### Manual Install

```bash
# Clone PAI (forge-all branch)
git clone -b forge-all https://github.com/banjoey/Personal_AI_Infrastructure.git PAI
cd PAI

# Run setup script with personalization wizard
./.claude/setup.sh
```

**That's it!** All skills, agents, and PAI features are now available in Claude Code.

📚 **For detailed setup:** See `docs/QUICKSTART.md`

---

## 📚 **Documentation**

**All documentation lives in the CORE skill** (`.claude/skills/CORE/`):

### **Essential Reading**

- **[CONSTITUTION.md](.claude/skills/CORE/CONSTITUTION.md)** - System philosophy, architecture, and operating principles
- **[SKILL.md](.claude/skills/CORE/SKILL.md)** - Main PAI skill with identity, preferences, and quick reference
- **[SKILL-STRUCTURE-AND-ROUTING.md](.claude/skills/CORE/SKILL-STRUCTURE-AND-ROUTING.md)** - How to create your own skills

### **System Guides**

- **[hook-system.md](.claude/skills/CORE/hook-system.md)** - Event-driven automation
- **[history-system.md](.claude/skills/CORE/history-system.md)** - Automatic work documentation
- **[VOICE.md](.claude/skills/CORE/VOICE.md)** → **[voice-server/README.md](.claude/voice-server/README.md)** - Text-to-speech feedback

### **Reference**

- **[prosody-guide.md](.claude/skills/CORE/prosody-guide.md)** - Voice emotion system
- **[prompting.md](.claude/skills/CORE/prompting.md)** - Prompt engineering patterns
- **[terminal-tabs.md](.claude/skills/CORE/terminal-tabs.md)** - Terminal management

---

## 🎨 **Examples**

Explore example skills in `.claude/skills/`:

- **`observability/`** - Real-time agent monitoring dashboard with WebSocket streaming, live pulse charts, and event timelines
- **`brightdata/`** - Four-tier progressive web scraping with automatic fallback (WebFetch → cURL → Playwright → Bright Data MCP)
- **`fabric/`** - Integration with Fabric pattern system (242+ AI patterns)
- **`research/`** - Multi-source research workflows
- **`create-skill/`** - Templates for creating new skills
- **`alex-hormozi-pitch/`** - Business pitch generation
- **`ffuf/`** - Web fuzzing and security testing

Each skill demonstrates the skills-as-containers pattern with routing, workflows, and self-contained documentation.

---

## 🔥 **Additional Features**

This fork adds enterprise-grade features for multi-agent collaboration and software development:

### **Multi-Agent Standup System**
- **5 Agent Personalities**: Daniel (Security), Mary (Business Analyst), Clay (Tech Lead), Hefley (Product Manager), Amy (QA Lead)
- **Intelligent Selection**: Auto-selects 2-3 relevant agents based on question domain (40% token savings)
- **Conflict Protocols**: Forces genuine disagreement for better synthesis
- **3-Round Structure**: Initial → Reactive → Final positions with user controls
- **Validated**: Finds 3.67x more issues than solo mode (50% better output quality)

### **Enterprise Skills**
- **AgilePm**: PRD creation, epic decomposition, user stories, sprint planning (scored 10/10 on dogfooding)
- **Security**: CMMC Level 2 compliance, STRIDE threat modeling, security reviews, infrastructure audits
- **TestArchitect**: ATDD workflows, risk-based testing, CI/CD quality gates, 89.65% coverage achieved

### **Personalization**
- **Custom Assistant Names**: Name your AI assistant (e.g., "Atlas", "Kai", "Nova")
- **User Names**: Personalized responses with your name
- **Automated Setup**: One-line install with personalization wizard

### **Success Metrics (Release 0.1.1)**
- ✅ Issue detection: 3.67x improvement (target: 2-3x)
- ✅ Function coverage: 89.65% (target: 80%)
- ✅ Test pass rate: 100% (107/107 tests)
- ✅ PRD quality: 10/10 (target: 8/10)

**Full technical documentation**: See [development repository](https://github.com/banjoey/FORGE) for implementation details

---

## 🏗️ **Architecture**

PAI is built on three foundational principles:

### **1. Command Line First**
Build deterministic CLI tools, then wrap them with AI orchestration. Code is cheaper, faster, and more reliable than prompts.

### **2. Skills as Containers**
Package domain expertise in self-activating, self-contained modules. Natural language triggers automatic routing to the right skill.

### **3. Progressive Disclosure**
Load context only when needed (3 tiers):
- **Tier 1:** System prompt (always active, 200-500 words)
- **Tier 2:** SKILL.md (on-demand, comprehensive reference)
- **Tier 3:** Reference files (just-in-time, deep dives)

**Complete architecture:** See `.claude/skills/CORE/CONSTITUTION.md`

---

## 🛠️ **Technology Stack**

- **Runtime:** Bun (NOT Node.js)
- **Language:** TypeScript (NOT Python - we're TypeScript zealots)
- **Package Manager:** Bun (NOT npm/yarn/pnpm)
- **Format:** Markdown (NOT HTML for basic content)
- **Testing:** Vitest when needed
- **Voice:** ElevenLabs TTS integration

---

## 🔐 **Security**

**IMPORTANT:** This is a PUBLIC template repository with sanitized examples.

**DO NOT commit:**
- API keys or secrets
- Personal email addresses or contact information
- Private repository references
- Any sensitive personal data

See `SECURITY.md` for complete security protocols.

---

## 💬 **Community**

- **GitHub Issues:** [Report bugs or request features](https://github.com/danielmiessler/Personal_AI_Infrastructure/issues)
- **Discussions:** [Ask questions and share ideas](https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions)
- **Video:** [Watch PAI Overview](https://youtu.be/iKwRWwabkEc)

---

## 📝 **Changelog**

### Recent Updates

**2025-12-01** - Observability Dashboard Skill
- Added complete agent monitoring dashboard at `.claude/skills/observability/`
- Real-time WebSocket streaming of agent activity
- Live pulse charts, event timelines, and agent swim lanes
- Multiple theme support (Tokyo Night, Nord, etc.)
- Security obfuscation for sensitive data in displays
- Run with: `~/.claude/skills/observability/manage.sh start`

**2025-11-25** - Path Standardization (Issue #122)
- Replaced all hardcoded `~/.claude/` paths with `${PAI_DIR}/` for location-agnostic installation
- Updated 50+ files across skills, hooks, and documentation
- Removed deprecated CLAUDE.md files (content consolidated into SKILL.md)

**2025-11-20** - Major Architecture Improvements
- Implemented PAI_DIR hook wrapper system with centralized path resolution
- Added PAI_CONTRACT.md defining core guarantees
- Added self-test system for validation (`bun ${PAI_DIR}/hooks/self-test.ts`)
- Added protection mechanisms for PAI-specific content
- See `CHANGELOG-2025-11-20.md` for full details

**Earlier Updates**
- Added comprehensive research skill with 10 workflows
- Added BrightData four-tier progressive web scraping
- Added art and story-explanation skills
- Fixed ElevenLabs model deprecation
- Added prompt injection security guidance

For detailed changelogs, see the `CHANGELOG-*.md` files in the repository root.

---

## 📜 **License**

MIT License - see `LICENSE` file for details.

---

## 🙏 **Acknowledgments**

Built on [Claude Code](https://code.claude.com) by Anthropic.

Inspired by the idea that AI systems need scaffolding to be reliable. This is that scaffolding.

---

<div align="center">

**Start clean. Start small. Build the AI infrastructure you need.**

[⬆ Back to Top](#personal-ai-infrastructure-pai)

</div>
