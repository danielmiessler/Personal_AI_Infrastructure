# PAI Knowledge - Tool Pack

> CLI tools for the Knowledge Transformation Stack

---

## The Problem

Current AI assistants are generic—they don't know your goals, your context, your history. Every session starts cold. The valuable thinking you've done before? Lost. The patterns in how you work? Invisible.

**Your brain wasn't designed for this volume.** We capture endlessly but retrieve almost nothing. Notes rot in folders. Bookmarks become graveyards. Voice memos pile up unprocessed.

---

## The Vision

Your AI should know you. Not through some vendor's training data, but through **your own captured knowledge**—voice memos while walking, articles you saved, meeting notes, ideas at 3am.

This Tool Pack provides the CLI infrastructure for:
- **ctx** — Context CLI for search, load, tags, and cultivation (STORE + CONNECT)
- **ingest** — Ingest CLI for Telegram capture and processing (CAPTURE)

```
        ┌─────────────────┐
        │     CREATE      │  💡 New insights emerge
        ├─────────────────┤
        │    CONNECT      │  🔗 ctx sweep — daily cultivation
        ├─────────────────┤
        │     STORE       │  📁 ctx search, ctx load — semantic retrieval
        ├─────────────────┤
        │    CAPTURE      │  📥 ingest — zero-friction input
        └─────────────────┘
```

> *Part of the [Knowledge Transformation Stack](https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions/147)—enabling knowledge that compounds over time.*

---

## Installation

### Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **Markdown vault**: Path to your markdown vault

### Step 1: Install CLI Tools

```bash
# Install ctx (STORE + CONNECT layers)
cd Bundles/pai-knowledge/tools/ctx
bun install
bun link

# Install ingest (CAPTURE layer)
cd ../ingest
bun install
bun link

# Ensure ~/.bun/bin is in PATH
export PATH="$HOME/.bun/bin:$PATH"
```

**Note:** The install wizard (`bun run install.ts`) automates this entire process.

### Step 2: Install Context Configuration

```bash
# Create context directories
mkdir -p ~/.claude/context/{taxonomies,migrations,config}

# Copy configuration files
cp context/taxonomies/default.yaml ~/.claude/context/taxonomies/
cp context/migrations/default-rules.yaml ~/.claude/context/migrations/
cp context/config/aliases.yaml ~/.claude/context/config/
```

### Step 3: Install Skill Pack

```bash
# Create skill directory
mkdir -p ~/.claude/skills/Context/workflows

# Copy from skill-pack.md (see companion file)
# SKILL.md → ~/.claude/skills/Context/SKILL.md
# workflows/semantic-search.md → ~/.claude/skills/Context/workflows/
# workflows/sweep.md → ~/.claude/skills/Context/workflows/
```

### Step 4: Build Embeddings (Required for Semantic Search)

Semantic search requires vector embeddings. Build them for your vault:

```bash
# Initial build (processes all notes)
ctx embed --verbose

# Check embedding stats
ctx embed --stats
```

**Note:** This requires `OPENAI_API_KEY` in your environment. For a large vault, initial embedding may take several minutes. New notes are automatically embedded by the ingest daemon.

### Verify Installation

```bash
# CLI tools available
ctx --help
ctx sweep --help

# Embeddings built
ctx embed --stats

# Context files in place
ls ~/.claude/context/taxonomies/default.yaml
ls ~/.claude/context/migrations/default-rules.yaml

# Skill routing active
ls ~/.claude/skills/Context/SKILL.md
```

---

## Environment Configuration

Create `~/.claude/.env` or set in your shell profile:

```bash
# Required for both tools
export OBSIDIAN_VAULT_PATH="~/Documents/vault"

# Optional: For semantic search
export OPENAI_API_KEY="sk-..."

# Required for ingest (CAPTURE layer)
export TELEGRAM_BOT_TOKEN="..."
export TELEGRAM_CHANNEL_ID="-100..."

# Optional: Processing profile
export INGEST_PROFILE="zettelkasten"  # or "simple"
```

---

## ctx CLI Reference

### Core Commands

| Command | Purpose |
|---------|---------|
| `ctx search <query>` | Search notes by content |
| `ctx search --tag <tag>` | Search by tag |
| `ctx load <selection>` | Load notes from last search |
| `ctx read <note>` | Read specific note |
| `ctx tags list` | List all tags |
| `ctx health` | Check vault health |

### Sweep Commands (Cultivation)

| Command | Purpose |
|---------|---------|
| `ctx sweep` | Show inbox overview |
| `ctx sweep all` | Review all inbox notes |
| `ctx sweep 1,3,5` | Review specific notes |
| `ctx sweep next` | Continue to next note |
| `ctx sweep status` | Show session progress |
| `ctx sweep clear` | End session |

### Search Examples

```bash
# Text search
ctx search "machine learning"

# Tag search
ctx search --tag topic/ai

# Combined
ctx search --tag para/project "kubernetes"

# Recent only
ctx search --days 30 "meeting notes"

# Limit results
ctx search --limit 5 "ideas"
```

### Two-Phase Retrieval

```bash
# Phase 1: Search (returns IDs)
ctx search "distributed systems"
# Shows: 1. note-a.md  2. note-b.md  3. note-c.md

# Phase 2: Load (by selection)
ctx load 1,3
# Loads content of note-a.md and note-c.md
```

### Sweep Workflow

```bash
# Start sweep
ctx sweep
# Shows inbox overview with note IDs

# Select notes to review
ctx sweep all          # All notes
ctx sweep 1,3,5        # Specific notes
ctx sweep 1-10         # Range

# During session - actions
ctx done 1             # Mark done
ctx done 1 -p high     # Mark with priority
ctx rename 1 --to "Better Name"
ctx delete 1
ctx sweep next         # Advance

# End session
ctx sweep clear        # Archive session
ctx sweep clear --force # Discard
```

---

## ingest CLI Reference

### Core Commands

| Command | Purpose |
|---------|---------|
| `ingest poll` | Poll Telegram for new messages |
| `ingest process` | Process downloaded messages |
| `ingest watch` | Daemon mode (poll + process loop) |
| `ingest config` | Show current configuration |

### Processing Pipelines

Messages in Telegram can include commands:

| Command | Purpose |
|---------|---------|
| `/wisdom` | Apply extract_wisdom pattern |
| `/article` | Fetch URL + extract article wisdom |
| `/fetch` | Fetch URL content |
| `/describe` | Vision AI description for photos |
| `/mermaid` | Convert diagram to Mermaid code |
| `/file` | Rename as TYPE-DATE-TITLE |
| `/attach` | Keep original filename |

### Tag Hints

Add tags directly in Telegram messages:

```
Meeting notes from today #meeting @john_doe ~work

Creates note with:
- #meeting tag
- #person/john_doe tag
- #scope/work tag
```

### Daemon Setup (macOS)

```bash
# Install LaunchAgent
cat > ~/Library/LaunchAgents/com.pai.ingest-watch.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.pai.ingest-watch</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/USERNAME/.bun/bin/ingest</string>
        <string>watch</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/ingest-watch.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/ingest-watch.log</string>
</dict>
</plist>
EOF

# Load daemon
launchctl load ~/Library/LaunchAgents/com.pai.ingest-watch.plist

# Check status
launchctl list | grep pai.ingest

# View logs
tail -f /tmp/ingest-watch.log
```

---

## Updating

```bash
cd Bundles/pai-knowledge/tools/ctx
git pull
bun install

cd ../ingest
bun install
```

Or run the install wizard again: `bun run install.ts`

---

## Troubleshooting

### ctx not found

```bash
# Check bun link worked
ls ~/.bun/bin/ctx

# Re-link if needed
cd tools/ctx && bun link
```

### ingest import errors

ingest depends on ctx modules. Ensure ctx is installed first:

```bash
cd tools/ctx && bun install && bun link
cd ../ingest && bun install && bun link
```

### Permission denied

```bash
chmod +x ~/.bun/bin/ctx
chmod +x ~/.bun/bin/ingest
```
