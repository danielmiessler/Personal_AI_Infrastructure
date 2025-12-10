## Personal AI Infrastructure – Development Workflow

This is a **private fork** of `danielmiessler/Personal_AI_Infrastructure` used for daily development. Personal configurations live here; contributions go through the public fork.

### Repository Architecture

```
danielmiessler/Personal_AI_Infrastructure (upstream)
        ▲
        │  PR (from public fork)
        │
mellanon/Personal_AI_Infrastructure (fork) ◄── PUBLIC
        ▲
        │  sanitized commits only
        │
mellanon/pai-1.2 (origin) ◄── PRIVATE (this repo)
        │
        └── feature/context-system (development)
```

### Git Remotes

| Remote | URL | Purpose |
|--------|-----|---------|
| `origin` | `git@github.com:mellanon/pai-1.2.git` | Daily development (PRIVATE) |
| `fork` | `git@github.com:mellanon/Personal_AI_Infrastructure.git` | Contribution staging (PUBLIC) |
| `upstream` | `https://github.com/danielmiessler/Personal_AI_Infrastructure.git` | Upstream sync (read-only) |

### Golden Rules

1. **Never push to `upstream`** - It's read-only
2. **Never push personal data to `fork`** - It's public
3. **Always sanitize before contributing** - Run `scripts/sanitize-for-contrib.sh`
4. **NEVER auto-commit or auto-push to `fork`** - Always require explicit user instruction

### Claude Code Instructions

**IMPORTANT**: Do NOT proactively commit or push to the `fork` remote. The public fork is for upstream contribution and requires explicit user approval before any git operations.

- Commits to `origin` (private): OK when user requests
- Commits to `fork` (public): **ONLY with explicit user instruction**
- Push to `fork`: **ONLY with explicit user instruction**
- Always run `./scripts/sanitize-for-contrib.sh` before any `fork` operations

### Personal Data Locations (NEVER commit to fork)

| File/Pattern | Contains |
|--------------|----------|
| `.env`, `.env.*` | API keys, tokens |
| `profiles/*.json` | Personal vault paths, Telegram IDs |
| `.claude/skills/Context/tags.json` | Personal tag taxonomy |
| `shortcuts/templates/*.json` | Telegram bot tokens, chat IDs |

### Daily Development Workflow

```bash
# Work on your feature branch
git checkout feature/context-system

# Make changes, test locally
bun run ingest.ts watch --verbose

# Commit and push to private repo
git add .
git commit -m "feat: your change"
git push origin feature/context-system
```

### Contributing to Upstream

```bash
# 1. Ensure changes are sanitized
./scripts/sanitize-for-contrib.sh

# 2. Push sanitized branch to public fork
git push fork feature/context-system:contrib-context-skill

# 3. Create PR on GitHub
#    From: mellanon/Personal_AI_Infrastructure:contrib-context-skill
#    To:   danielmiessler/Personal_AI_Infrastructure:main
```

### Syncing with Upstream

```bash
# Fetch upstream changes
git fetch upstream

# Merge to your main branch
git checkout main
git merge upstream/main
git push origin main

# Rebase your feature branch
git checkout feature/context-system
git rebase main
```

### Symlink Note

`~/.claude` is symlinked to this repo's `.claude/` directory:
```
~/.claude → /Users/andreas/Documents/src/PAI-v1.2/Personal_AI_Infrastructure/.claude
```

This means Claude Code skills and settings are versioned with PAI.
