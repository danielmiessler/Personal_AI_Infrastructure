# Context Skill Development Plan

> **Updated:** 2025-12-10
> **Status:** Active Development
> **Goal:** Build and optionally contribute Context skill to upstream PAI

## Quick Reference

### Daily Development
```bash
git checkout feature/context-system
# Make changes, test
bun run ingest.ts watch --verbose
# Commit to private repo
git push origin feature/context-system
```

### Contributing to Upstream
```bash
# 1. Check for personal data
./scripts/sanitize-for-contrib.sh

# 2. Push to public fork
git push fork feature/context-system:contrib-context-skill

# 3. Create PR: fork → upstream on GitHub
```

---

## Repository Architecture

```
danielmiessler/Personal_AI_Infrastructure (upstream)
        ▲
        │  PR
mellanon/Personal_AI_Infrastructure (fork) ◄── PUBLIC
        ▲
        │  sanitized commits
mellanon/pai-1.2 (origin) ◄── PRIVATE (daily work)
```

| Remote | Visibility | Purpose |
|--------|------------|---------|
| `origin` | Private | Daily development with personal configs |
| `fork` | Public | Contribution staging for PRs |
| `upstream` | Public | Read-only upstream sync |

---

## What's Personal vs Generic

### Personal (keep in private repo)
- `.env` files - API keys, tokens
- `profiles/*.json` - vault paths, Telegram IDs
- `.claude/skills/Context/tags.json` - personal taxonomy
- Shortcuts with real bot tokens

### Generic (safe for contribution)
- `bin/ingest/` - CLI code (uses env vars)
- `bin/obs/` - Query CLI
- `.claude/skills/Context/SKILL.md` - skill definition
- `shortcuts/templates/` - templates with `YOUR_*` placeholders

---

## Current Components

| Component | Status | Location |
|-----------|--------|----------|
| Ingest CLI | ✅ Working | `bin/ingest/` |
| Obs CLI | ✅ Working | `bin/obs/` |
| Taxonomy System | ✅ New | `lib/taxonomy.ts` + `tags.json` |
| iOS Shortcuts | ✅ Templates | `shortcuts/templates/` |
| Telegram Bot | ✅ Working | Via env vars |

---

## Sanitization Checklist

Before pushing to `fork`:

- [ ] Run `./scripts/sanitize-for-contrib.sh`
- [ ] No Telegram bot tokens in code
- [ ] No chat IDs in code
- [ ] No vault paths hardcoded
- [ ] No personal usernames
- [ ] Shortcuts use `YOUR_*` placeholders

---

## Implementation History

| Date | Change |
|------|--------|
| 2025-12-10 | Added taxonomy-based auto-tagging |
| 2025-12-10 | Added tags to PAI event output |
| 2025-12-09 | Updated iOS shortcuts with Device Model |
| 2025-12-08 | Initial Context skill structure |

---

## Related Files

- [CLAUDE.md](../../CLAUDE.md) - Development workflow
- [Context SKILL.md](../../.claude/skills/Context/SKILL.md) - Skill definition
- [tags.json](../../.claude/skills/Context/tags.json) - Tag taxonomy
