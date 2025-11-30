# Voice System Reference

**This file is a reference pointer to the canonical voice system documentation.**

---

## 📍 Canonical Documentation Location

**All voice system documentation is maintained in the voice-server directory:**

`${PAI_DIR}/voice-server/`

---

## 📚 Voice Server Documentation

### Complete Usage Guide
**Location:** `${PAI_DIR}/voice-server/USAGE.md` (553 lines)

**Contains:**
- Current version and what's new
- Agent personality system architecture
- Voice parameter ranges and psychology mapping
- Complete API reference
- All agent profiles with voice characteristics
- Advanced features and configuration
- Testing and examples

### Overview and Setup
**Location:** `${PAI_DIR}/voice-server/README.md` (261 lines)

**Contains:**
- Voice server overview
- Installation and setup instructions
- Quick start guide
- Basic usage examples

### Version History
**Location:** `${PAI_DIR}/voice-server/CHANGELOG.md`

**Contains:**
- Complete version history
- Feature additions and changes
- Bug fixes and improvements

---

## 🎯 Quick Reference

**Start voice server:**
```bash
${PAI_DIR}/voice-server/start.sh
```

**Check status:**
```bash
${PAI_DIR}/voice-server/status.sh
```

**Restart server:**
```bash
${PAI_DIR}/voice-server/restart.sh
```

**Stop server:**
```bash
${PAI_DIR}/voice-server/stop.sh
```

---

## 🔗 Related Documentation

- **Agent Personalities:** `${PAI_DIR}/skills/CORE/agent-personalities.md` (centralized personality definitions)
- **Voice Routing Workflow:** `${PAI_DIR}/skills/CORE/workflows/voice-routing-full.md` (operational workflow)

---

## ⚠️ Important

**DO NOT duplicate voice documentation in CORE.**

- The voice-server directory is the **canonical source** for all voice system documentation
- Duplicating documentation causes version conflicts and maintenance issues
- Always refer to and update voice-server documentation directly
- This reference file should only contain pointers, not duplicated content

---

**Last Updated:** 2025-11-16
