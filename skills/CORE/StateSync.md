# PAI State Synchronization Guide

This document explains how to maintain PAI (Personal AI Infrastructure) state across multiple computers.

---

## Overview

PAI state is split into two categories:

| Category | Synced via Git | Description |
|----------|----------------|-------------|
| **Global State** | ✅ Yes | Configuration, skills, preferences, learnings |
| **Local State** | ❌ No | Session data, cache, secrets, transient files |

---

## Directory Structure

```
~/.claude/
├── .env                    # ❌ LOCAL - API keys, secrets (NEVER commit)
├── .env.example            # ✅ GLOBAL - Template for .env
├── .gitignore              # ✅ GLOBAL - Exclusion rules
├── settings.json           # ✅ GLOBAL - Hooks, env vars (except secrets)
├── settings.local.json     # ❌ LOCAL - Machine-specific overrides
├── sync-kai.sh             # ✅ GLOBAL - Sync management script
│
├── skills/                 # ✅ GLOBAL - All skills sync
│   ├── CORE/
│   │   ├── SKILL.md        # Identity, preferences
│   │   ├── Contacts.md     # Your contacts
│   │   ├── CoreStack.md    # Tech preferences
│   │   └── StateSync.md    # This file
│   └── CreateSkill/
│
├── history/                # ✅ GLOBAL - Learning persists
│   ├── Upgrades.jsonl      # Pack installation history
│   ├── learnings/          # Extracted insights
│   ├── decisions/          # Key decisions made
│   ├── research/           # Research findings
│   ├── sessions/           # Session summaries
│   └── execution/          # Execution patterns
│       ├── bugs/
│       ├── features/
│       └── refactors/
│
├── hooks/                  # ✅ GLOBAL - All hooks sync
├── tools/                  # ✅ GLOBAL - Custom tools sync
├── commands/               # ✅ GLOBAL - Custom commands sync
├── voice/                  # ✅ GLOBAL - Voice server code
│   ├── server.ts
│   └── manage.sh
│
├── config/                 # ✅ GLOBAL - Configuration files
├── plugins/                # ✅ GLOBAL - Installed plugins
│
├── debug/                  # ❌ LOCAL - Debug logs
├── shell-snapshots/        # ❌ LOCAL - Transient
├── statsig/                # ❌ LOCAL - Generated cache
├── todos/                  # ❌ LOCAL - Conductor state
├── projects/               # ❌ LOCAL - Per-project data
├── session-env/            # ❌ LOCAL - Session runtime
└── plans/                  # ❌ LOCAL - Temporary plans
```

---

## What Gets Synced (Global State)

### 1. Identity & Preferences (`skills/CORE/`)
- Your AI's name and identity
- Response format preferences
- Tech stack preferences
- Contact information

### 2. Learnings & History (`history/`)
- **learnings/** - Insights extracted from sessions
- **decisions/** - Key architectural/design decisions
- **research/** - Research findings and notes
- **execution/** - Patterns for bugs, features, refactors
- **Upgrades.jsonl** - Installation history

### 3. Configuration (`settings.json`)
- Hook definitions
- Environment variables (non-sensitive)
- Plugin configurations

### 4. Custom Extensions
- **hooks/** - Session, security, voice hooks
- **tools/** - Custom TypeScript tools
- **commands/** - Custom slash commands
- **skills/** - All skill definitions

---

## What Stays Local

### Never Commit These
- `.env` - Contains API keys (ElevenLabs, etc.)
- `*.key`, `*.pem` - Cryptographic keys
- `credentials.json` - OAuth/service credentials

### Machine-Specific
- `settings.local.json` - Machine-specific settings overrides
- Voice server PID files
- Session state files

### Transient/Generated
- `debug/` - Debug logs
- `shell-snapshots/` - Shell state
- `statsig/` - Feature flag cache
- `todos/` - Conductor todo state
- `projects/` - Project-specific data

---

## Sync Commands

Use the sync script for all operations:

```bash
# First time on a NEW machine
~/.claude/sync-kai.sh setup

# Push your changes (from any machine)
~/.claude/sync-kai.sh push

# Pull latest (on any machine)
~/.claude/sync-kai.sh pull

# Check sync status
~/.claude/sync-kai.sh status
```

---

## Setting Up a New Machine

### Step 1: Prerequisites
```bash
# Install Bun runtime
curl -fsSL https://bun.sh/install | bash
source ~/.zshrc  # or ~/.bashrc

# Verify
bun --version
```

### Step 2: Clone Your Config
```bash
# Clone to ~/.claude
git clone https://github.com/YOUR_USERNAME/skish-config.git ~/.claude
cd ~/.claude
```

### Step 3: Create Local Secrets
```bash
# Copy template
cp .env.example .env

# Edit with your API keys
nano .env   # or vim, code, etc.
```

Required in `.env`:
```bash
ELEVENLABS_API_KEY=sk_your_key_here
ELEVENLABS_VOICE_ID=your_voice_id
```

### Step 4: Verify
```bash
# Start Claude Code
claude

# You should see:
# - Tab title: 🤖 <project>
# - PAI Context loaded message
```

---

## Recording Learnings

When PAI learns something valuable, record it for persistence:

### Automatic (via hooks)
The `capture-session-summary.ts` hook automatically extracts:
- Session summaries at end of session
- Key decisions made

### Manual Recording
Create files in appropriate directories:

```bash
# Record a learning
echo "Learned that X works better than Y because Z" >> ~/.claude/history/learnings/2026-01.md

# Record a decision
cat >> ~/.claude/history/decisions/2026-01.md << 'DECISION'
## API Design Decision
- Chose REST over GraphQL for simplicity
- Date: 2026-01-03
DECISION

# Sync to other machines
~/.claude/sync-kai.sh push
```

---

## Best Practices

### 1. Commit Frequently
After making changes to skills, preferences, or learnings:
```bash
~/.claude/sync-kai.sh push
```

### 2. Pull Before Sessions
Start sessions with latest state:
```bash
~/.claude/sync-kai.sh pull
```

### 3. Keep Secrets Local
Never commit `.env` - each machine has its own API keys.

### 4. Review Before Pushing
```bash
~/.claude/sync-kai.sh status
# Check what will be committed
```

### 5. Use .env.example
When adding new secrets, update the template:
```bash
echo "NEW_API_KEY=" >> ~/.claude/.env.example
~/.claude/sync-kai.sh push
```

---

## Troubleshooting

### "Merge conflict in settings.json"
```bash
cd ~/.claude
git stash
git pull
git stash pop
# Manually resolve conflicts
git add settings.json
git commit -m "Resolve settings merge"
git push
```

### "Hooks not loading"
1. Check Bun is installed: `bun --version`
2. Verify settings.json has correct paths
3. Check hook file permissions: `chmod +x ~/.claude/hooks/*.ts`

### "Voice not working on new machine"
1. Set up `.env` with ElevenLabs credentials
2. Start server: `~/.claude/voice/manage.sh start`
3. Test: `curl http://localhost:8888/health`

---

## For LLM Reference

When Eskender sets up a new machine, guide them through:

1. **Install prerequisites**: Bun runtime, git
2. **Clone config**: `git clone` the skish-config repo to `~/.claude`
3. **Set up secrets**: Copy `.env.example` to `.env`, add API keys
4. **Verify**: Start Claude Code, check for PAI Context message
5. **Start voice** (optional): `~/.claude/voice/manage.sh start`

When changes are made:
- Remind to sync: `~/.claude/sync-kai.sh push`
- After skill updates, they auto-sync via git

When starting on an existing machine after time away:
- Pull first: `~/.claude/sync-kai.sh pull`
