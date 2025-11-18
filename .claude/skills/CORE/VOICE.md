# Voice System Reference

**This file is a reference pointer to the canonical voice system documentation.**

---

## 📍 Canonical Documentation Location

**All voice system documentation is maintained in the voice-server directory:**

`~/.claude/voice-server/`

---

## 📚 Voice Server Documentation

### Complete Usage Guide
**Location:** `~/.claude/voice-server/USAGE.md`

**Contains:**
- Current version and what's new
- Agent personality system architecture
- Voice parameter ranges and psychology mapping
- Complete API reference
- All agent profiles with voice characteristics
- Advanced features and configuration
- Testing and examples

### Overview and Setup
**Location:** `~/.claude/voice-server/README.md`

**Contains:**
- Voice server overview
- Installation and setup instructions
- Quick start guide
- Basic usage examples

### Version History
**Location:** `~/.claude/voice-server/CHANGELOG.md`

**Contains:**
- Complete version history
- Feature additions and changes
- Bug fixes and improvements

---

## 🎯 Quick Reference

**Start voice server:**
```bash
~/.claude/voice-server/start.sh
```

**Check status:**
```bash
~/.claude/voice-server/status.sh
```

**Restart server:**
```bash
~/.claude/voice-server/restart.sh
```

**Stop server:**
```bash
~/.claude/voice-server/stop.sh
```

---

## 🔗 Related Documentation

- **Agent Personalities:** `~/.claude/skills/CORE/agent-personalities.md` (centralized personality definitions)
- **Prosody Guide:** `~/.claude/skills/CORE/prosody-guide.md` (emotional voice markers)

---

## ⚠️ Important

**DO NOT duplicate voice documentation in CORE.**

- The voice-server directory is the **canonical source** for all voice system documentation
- Duplicating documentation causes version conflicts and maintenance issues
- Always refer to and update voice-server documentation directly
- This reference file should only contain pointers, not duplicated content

---

**Last Updated:** 2025-11-17
