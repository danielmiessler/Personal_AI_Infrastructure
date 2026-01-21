# USER Directory

**Your Personal Knowledge Base**

This directory stores information your AI needs about YOU. All content here is private and never synced publicly.

---

## Security Classification: PRIVATE

| Rule | Description |
|------|-------------|
| **Never Shared** | Content here must NEVER appear in public PAI repositories |
| **User Overrides** | USER files override matching SYSTEM files when both exist |
| **Personal Context** | Your preferences, identity, contacts, and customizations |

---

## What Belongs Here

Create files that help your AI understand YOU:

- **ABOUTME.md** - Your background, interests, expertise
- **BASICINFO.md** - Name, timezone, location, contact info
- **CONTACTS.md** - People your AI should know about
- **DAIDENTITY.md** - Your AI's personality customizations
- **DEFINITIONS.md** - Your personal glossary and terminology
- **REMINDERS.md** - Things your AI should remember to mention
- **RESPONSEFORMAT.md** - Override default response format (optional)
- **TECHSTACKPREFERENCES.md** - Your technology preferences

---

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| **PAISECURITYSYSTEM/** | Your personal security patterns and rules |
| **SKILLCUSTOMIZATIONS/** | Per-skill preference overrides |
| **BANNER/** | Custom banner/status line config |
| **TERMINAL/** | Terminal appearance settings |

---

## Getting Started

1. Start with `ABOUTME.md` - introduce yourself to your AI
2. Add `BASICINFO.md` with essential details
3. Customize `DAIDENTITY.md` to shape your AI's personality
4. Add files as you discover what context helps most

---

## The SYSTEM/USER Pattern

PAI uses a two-tier configuration pattern:

```
When PAI needs config:
1. Check USER/ first
2. If found, use USER config
3. If not found, fall back to SYSTEM/ defaults
```

This means:
- **Fresh installs work immediately** - SYSTEM provides sensible defaults
- **Your customizations are safe** - PAI updates never overwrite USER files
- **Privacy is guaranteed** - USER content never syncs to public PAI
