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

### Git Remotes & Branches

| Remote | Repo | Branch | Visibility | Purpose |
|--------|------|--------|------------|---------|
| `origin` | mellanon/pai-1.2 | `feature/context-system` | **PRIVATE** | Daily development |
| `origin` | mellanon/pai-1.2 | `contrib-context-skill` | **PRIVATE** | Squash staging for PRs |
| `fork` | mellanon/Personal_AI_Infrastructure | `contrib-context-skill` | **PUBLIC** | PR source branch |
| `upstream` | danielmiessler/Personal_AI_Infrastructure | `main` | PUBLIC | PR target (read-only) |

**Remote URLs:**
- `origin`: `git@github.com:mellanon/pai-1.2.git`
- `fork`: `git@github.com:mellanon/Personal_AI_Infrastructure.git`
- `upstream`: `https://github.com/danielmiessler/Personal_AI_Infrastructure.git`

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
| `shortcuts/build/*.shortcut` | Personalized shortcuts with tokens |
| `bin/ingest/test/`, `bin/obs/test/` | Symlinks to external test system (see below) |

### Test System Architecture

The test system with sensitive fixtures lives **outside** this repository:

```
~/Documents/src/pai-tooling/        ← External tooling repo (NOT in PAI)
├── ingest-test/                    ← Real test system with fixtures
│   ├── fixtures/                   ← Sensitive: real Telegram data
│   └── output/                     ← Test run outputs
└── obs-test/                       ← Obs test fixtures

~/Documents/src/PAI-v1.2/Personal_AI_Infrastructure/
├── bin/ingest/test → symlink       ← Points to pai-tooling/ingest-test
└── bin/obs/test → symlink          ← Points to pai-tooling/obs-test
```

**Why external?** Test fixtures contain real Telegram channel IDs, file IDs, personal document names, and captured message metadata. By keeping them in a separate repo:
- They're never accidentally committed to PAI
- The sanitization script blocks any test directory content
- Local development still works via symlinks
- The `.gitignore` excludes `bin/ingest/test` and `bin/obs/test`

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

The contribution workflow uses squash merging to hide commit history before exposing to public:

```
origin/feature/context-system  (PRIVATE - many commits)
        │
        │ squash merge (collapses all commits into one)
        ▼
origin/contrib-context-skill   (PRIVATE - single clean commit)
        │
        │ git push fork (after sanitization passes)
        ▼
fork/contrib-context-skill     (PUBLIC - what upstream sees)
        │
        │ GitHub PR
        ▼
upstream/main                  (PUBLIC - danielmiessler's repo)
```

**Step-by-Step:**

```bash
# 1. Switch to contrib branch (create if needed)
git checkout contrib-context-skill || git checkout -b contrib-context-skill main

# 2. Squash merge feature branch (creates single commit)
git merge --squash feature/context-system
git commit -m "feat(context): Add context skill with semantic search"

# 3. Run sanitization check (REQUIRED)
./scripts/sanitize-for-contrib.sh
# Must pass before proceeding!

# 4. Push to public fork (ONLY with explicit user approval)
git push fork contrib-context-skill

# 5. Create PR on GitHub
#    From: mellanon/Personal_AI_Infrastructure:contrib-context-skill
#    To:   danielmiessler/Personal_AI_Infrastructure:main
```

**Why squash?** Your private feature branch may have dozens of WIP commits, debug changes, and reverts. Squash merging presents upstream with a single, clean commit that describes the feature without exposing your development history.

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
