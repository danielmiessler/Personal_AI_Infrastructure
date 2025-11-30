# PAI Contract

**Version:** 1.0
**Date:** 2025-11-20

This document defines what PAI (Personal AI Infrastructure) guarantees, what requires configuration, and what is example/community content. This is the **contract** between PAI and its users.

---

## 🎯 What is PAI?

**PAI is a public template** for building personal AI infrastructure using Claude Code.

**PAI vs Kai:**
- **PAI** = This public repository (sanitized template for everyone)
- **Kai** = Daniel Miessler's private system (personal data, workflows, integrations)

Think of PAI as the scaffolding. You build your own "Kai" on top of it.

---

## ✅ Core Guarantees (Always Works)

These features work immediately after Quick Start, **requiring no configuration**:

### 1. **Hook System**
- ✅ Hooks execute without file-not-found errors
- ✅ SessionStart loads CORE context automatically
- ✅ Events are captured to history/raw-outputs/
- ✅ PAI_DIR defaults to ~/.claude (override optional)

### 2. **Skills Architecture**
- ✅ Skills load and route correctly
- ✅ CORE skill provides system context
- ✅ Skill triggers activate appropriate modules
- ✅ Progressive disclosure (3-tier loading) works

### 3. **Agents**
- ✅ Agent files define specialized personalities
- ✅ Task tool launches agents correctly
- ✅ Agents have access to appropriate tools

### 4. **History System (UOCS)**
- ✅ Session summaries capture to history/sessions/
- ✅ Learnings capture to history/learnings/
- ✅ Raw events log to history/raw-outputs/
- ✅ Date-based organization (YYYY-MM)

### 5. **Core Commands**
- ✅ Basic commands respond
- ✅ Skill routing works
- ✅ Agent delegation works

---

## ⚙️ Configured Functionality (Needs Setup)

These features require API keys or external services:

### 1. **Voice Server**
**Requires:**
- `ELEVENLABS_API_KEY` in .env
- `ELEVENLABS_VOICE_ID` in .env
- Voice server running (`bun voice-server/server.ts`)

**Status Check:**
```bash
curl http://localhost:3000/health
```

### 2. **Research Skills**
**Requires:**
- `PERPLEXITY_API_KEY` for perplexity-researcher
- `GOOGLE_API_KEY` for gemini-researcher
- Additional keys for other research agents

### 3. **MCP Integrations**
**Requires:**
- API keys for specific providers (Bright Data, Apify, etc.)
- MCP server configuration
- Provider-specific setup

### 4. **Advanced Skills**
Most skills in `.claude/skills/` require:
- API keys (varies by skill)
- External tool installation
- Service configuration

**Check each skill's SKILL.md for requirements**

---

## 📚 Examples (Community Contributions)

These are provided as **starting points**, not guaranteed features:

### 1. **Example Skills**
Skills in `.claude/skills/` demonstrate patterns but may:
- Require updates as APIs change
- Need API keys not documented
- Contain experimental code
- Have incomplete documentation

### 2. **Advanced Workflows**
Complex workflows may:
- Reference private integrations
- Assume specific setups
- Require customization

### 3. **Documentation**
Some docs describe:
- Daniel's private Kai setup
- Features not in public PAI
- Aspirational capabilities

**If something doesn't work, check: Is this core guaranteed, configured, or example?**

---

## 🔧 System Requirements

### **Required**
- **PAI_DIR:** Defaults to `~/.claude` (override with env var if needed)
- **Bun:** JavaScript/TypeScript runtime
- **Claude Code:** v2.0+ recommended
- **Node/Bun:** For hook execution

### **Optional**
- **Python (uv):** For Python-based tools
- **Git:** For version control
- **API Keys:** For specific features (see .env.example)

---

## 🏥 Health Check

Run this command to verify PAI is working:

```bash
bun ${PAI_DIR}/hooks/self-test.ts
```

Expected output:
```
✅ PAI_DIR resolves: /Users/yourname/.claude
✅ Hooks directory exists
✅ CORE skill loads
✅ Settings.json valid
✅ At least one agent exists
⚠️  Voice server not responding (optional)
```

---

## 📏 What PAI Is NOT

PAI does NOT guarantee:

1. **Completeness:** Some skills/workflows are examples only
2. **Stability:** Public PAI may change as it evolves
3. **Support:** Community-driven, not enterprise support
4. **Privacy:** This is PUBLIC - never commit secrets
5. **Production-Ready:** This is a personal AI template, not a product

---

## 🛡️ Protected Content (For Maintainers)

These files are **PAI-specific** and must NOT be overwritten with Kai content:

### **Protected Files:**
```
PAI_CONTRACT.md                    # This file
README.md                          # PAI-specific (not Kai README)
.claude/hooks/lib/pai-paths.ts     # PAI path resolution
.claude/hooks/self-test.ts         # PAI health check
SECURITY.md                        # Public security guidance
.env.example                       # Template (no secrets)
```

### **Protected Sections in Settings:**
- PAI_DIR comment explaining it's optional
- Hook configurations (must use ${PAI_DIR})
- Permission denials for safety

**When syncing Kai → PAI:**
- Skip protected files entirely
- Sanitize all secrets/personal data
- Test with self-test.ts before committing

---

## 🔄 Version History

**v1.0 (2025-11-20):**
- Initial contract defining boundaries
- PAI vs Kai distinction clarified
- Core guarantees documented
- Self-test system introduced

---

## 🤝 Contributing

PAI is community-driven:

1. **Issues:** Report bugs or confusion about guarantees
2. **PRs:** Improve core functionality or examples
3. **Discussions:** Share your PAI customizations

**Before contributing:**
- Read this contract
- Understand core vs configured vs example
- Test with self-test.ts
- Never commit secrets

---

## ❓ FAQ

**Q: Why doesn't [feature] work?**
A: Check if it's core (guaranteed), configured (needs API key), or example (may be stale).

**Q: Is this PAI or Kai?**
A: PAI = public template. Kai = Daniel's private system. You build your own "Kai" on PAI.

**Q: Can I customize PAI?**
A: Yes! That's the point. PAI is scaffolding. Build on it.

**Q: What if PAI_DIR is set wrong?**
A: Hooks fail fast with clear errors. Run self-test.ts to diagnose.

**Q: How do I report a bug?**
A: GitHub issues. Specify: core guarantee broken, configuration unclear, or example not working.

---

**This is the PAI Contract. If PAI violates core guarantees, that's a bug. If configured features don't work without setup, that's expected. If examples are stale, that's community opportunity.**

🤖 **PAI: Start clean. Start small. Build the AI infrastructure you need.**
