<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./pai-logo.png">
  <source media="(prefers-color-scheme: light)" srcset="./pai-logo.png">
  <img alt="PAI Logo" src="./pai-logo.png" width="1200">
</picture>

# **Personal AI Infrastructure** (PAI)

### **Open-source personal AI infrastructure for orchestrating your life and work**

<br/>

![Static Badge](https://img.shields.io/badge/mission-upgrade_humans_using_AI-8B5CF6)
![GitHub last commit](https://img.shields.io/github/last-commit/danielmiessler/Personal_AI_Infrastructure)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Powered%20by-Claude%20Code-blue)](https://claude.ai/code)
[![PAI Video](https://img.shields.io/badge/🎥_Watch-PAI_Video-6B46C1)](https://youtu.be/iKwRWwabkEc)

**[Quick Start](#-quick-start)** • **[Documentation](#-documentation)** • **[Examples](#-examples)** • **[Community](#-community)**

</div>

---

## 🎯 **What is PAI?**

PAI (Personal AI Infrastructure) is a template for building your own AI-powered operating system using Claude Code.

**Core Primitives:**
- **Skills** - Self-contained AI capabilities with routing, workflows, and documentation
- **Agents** - Specialized AI personalities for different tasks (engineer, researcher, designer, etc.)
- **Hooks** - Event-driven automation that captures work, provides voice feedback, and manages state

**Philosophy:** Start clean, small, and simple. Build the scaffolding that makes AI reliable.

---

## 🚀 **Quick Start**

### 1. Install Prerequisites

```bash
# Install Bun (PAI's package manager)
curl -fsSL https://bun.sh/install | bash

# Install Claude Code
# Follow instructions at: https://code.claude.com
```

### 2. Clone and Configure

```bash
# Clone the repository
git clone https://github.com/danielmiessler/Personal_AI_Infrastructure.git
cd Personal_AI_Infrastructure

# Copy environment template
cp .claude/.env.example .claude/.env

# Edit .env and add your API keys
# At minimum: ANTHROPIC_API_KEY=your_key_here
```

### 3. Copy to Your System

```bash
# Copy .claude directory to your home directory
cp -r .claude ~/.claude

# Or symlink if you prefer
ln -s $(pwd)/.claude ~/.claude
```

### 4. Start Claude Code

```bash
# PAI loads automatically via the CORE skill
claude-code
```

**That's it!** The CORE skill loads at session start and provides all PAI functionality.

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

- **`fabric/`** - Integration with Fabric pattern system (242+ AI patterns)
- **`research/`** - Multi-source research workflows
- **`create-skill/`** - Templates for creating new skills
- **`alex-hormozi-pitch/`** - Business pitch generation
- **`ffuf/`** - Web fuzzing and security testing

Each skill demonstrates the skills-as-containers pattern with routing, workflows, and self-contained documentation.

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
