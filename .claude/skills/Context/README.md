# Context Management Skill

Multi-modal capture and retrieval system for PAI's Knowledge Layer.

**Key Concept:** All content flows through Telegram as a single front door, creating an immutable log of everything you capture. The daemon processes this into your Obsidian vault with AI-powered tagging, transcription, and semantic search.

## Quick Start

```bash
# 1. Install CLIs
cd bin/ingest && ./install.sh
cd ../obs && ./install.sh

# 2. Configure environment (see Telegram Setup below)
# 3. Start the daemon
ingest watch --verbose

# 4. Send something to your Telegram channel
# 5. Watch it appear in your vault!
```

## Documentation

### Getting Started

| Doc | Purpose | When to Read |
|-----|---------|--------------|
| [Telegram Setup](../../../bin/ingest/docs/telegram-setup.md) | Create bot, channel, get tokens | First setup |
| [Daemon Setup](../../../bin/ingest/docs/daemon-setup.md) | Run as background service | After install |

### Concepts & Reference

| Doc | Purpose | When to Read |
|-----|---------|--------------|
| [Concepts](./docs/CONCEPTS.md) | Immutable log, tags, embeddings, pipelines | Understanding the system |
| [Capture Tips](./docs/CAPTURE-TIPS.md) | Caption syntax, voice hints, WisprFlow, smart features | Power user tips |
| [CLI Reference](./docs/CLI-REFERENCE.md) | Full `ingest` and `obs` command reference | Using the CLIs |
| [Shortcuts](./docs/SHORTCUTS.md) | macOS/iOS capture shortcuts | Quick capture setup |
| [Tag Taxonomy](./tag-taxonomy.md) | Tag conventions and examples | Customizing |

### For Claude

| Doc | Purpose |
|-----|---------|
| [SKILL.md](./SKILL.md) | Skill definition (loaded by Claude) |
| [Semantic Search](./workflows/semantic-search.md) | Search workflow |
| [Load Project](./workflows/load-project.md) | Context loading workflow |

## Components

### `ingest` CLI - Capture

Polls Telegram for incoming content (voice, photos, docs, URLs, text) and processes into Obsidian vault.

```bash
ingest poll          # Check for new messages
ingest watch         # Daemon mode (continuous)
ingest direct        # Send from CLI/clipboard
ingest search        # Search vault
```

### `obs` CLI - Query

Query and retrieve content from your vault.

```bash
obs search "keyword"           # Full-text search
obs search --tag project/pai   # Tag filter
obs load "note-name"           # Load content
obs tags                       # List all tags
```

## Required Configuration

Add to `~/.config/fabric/.env`:

```bash
# Required
OBSIDIAN_VAULT_PATH=~/Documents/your_vault

# For Telegram ingestion
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHANNEL_ID=-100your_channel_id

# Optional (enables semantic search)
OPENAI_API_KEY=sk-...
```

## Daemon Setup (macOS)

The `install.sh` script sets up a LaunchAgent that runs `ingest watch` in the background.

### Manual Control

```bash
# Stop daemon
launchctl unload ~/Library/LaunchAgents/com.pai.ingest-watch.plist

# Start daemon  
launchctl load ~/Library/LaunchAgents/com.pai.ingest-watch.plist

# Check status
launchctl list | grep pai

# View logs
tail -f /tmp/ingest-watch.log
```

### Linux (systemd)

Create `~/.config/systemd/user/pai-ingest.service`:

```ini
[Unit]
Description=PAI Ingest Watch Daemon
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/bun run /path/to/bin/ingest/ingest.ts watch
Restart=on-failure
Environment=HOME=%h

[Install]
WantedBy=default.target
```

Then:
```bash
systemctl --user enable pai-ingest
systemctl --user start pai-ingest
```

## iOS Shortcuts

See [shortcuts/README.md](../../../shortcuts/README.md) for iOS capture shortcuts.

