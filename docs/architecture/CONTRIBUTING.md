# Contributing Context System to Upstream PAI

This document outlines the strategy for contributing the context management system back to Daniel Miessler's upstream PAI repository.

## Overview

The context system is designed to be:
1. **Generic** - Works with any Obsidian vault
2. **Configurable** - All paths and settings via environment variables
3. **Modular** - Can be adopted incrementally
4. **Integrated** - Builds on existing PAI patterns (fabric, save, ts)

## Configuration Strategy

### Extending Fabric Configuration

All settings go in `~/.config/fabric/.env` alongside existing fabric config:

```bash
# Context System Configuration
# Add these to ~/.config/fabric/.env

# Vault Configuration
OBSIDIAN_VAULT_PATH=~/Documents/my_vault
OBSIDIAN_META_PATH=${OBSIDIAN_VAULT_PATH}/_meta

# Vector Search
CONTEXT_EMBEDDINGS_DB=${OBSIDIAN_META_PATH}/embeddings.db
CONTEXT_EMBEDDING_MODEL=all-MiniLM-L6-v2

# Daily Notes
DAILY_NOTE_FORMAT=%Y-%m-%d
SCRATCH_PAD_HEADER="## Scratch Pad"

# Telegram Ingestion (optional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHANNEL_ID=your_channel_id

# Existing fabric settings (already present)
FABRIC_OUTPUT_PATH=~/Documents/my_vault
FABRIC_FRONTMATTER_TAGS=incoming
```

### Environment Variable Precedence

1. Shell environment variables (highest priority)
2. `~/.config/fabric/.env`
3. Default values (lowest priority)

## Components for Upstream

### Skills (Generic)

```
skills/
├── context/                  # Context loading
│   ├── SKILL.md
│   └── workflows/
│       ├── load-project.md
│       └── semantic-search.md
│
└── vault/                    # Vault maintenance
    ├── SKILL.md
    └── workflows/
        ├── process-daily-notes.md
        ├── tag-untagged.md
        └── capture-session.md
```

### CLI Tools (Generic)

```
bin/
├── obs/                      # Vault operations
│   ├── obs.ts
│   ├── package.json
│   └── README.md
│
└── ingest/                   # Telegram pipeline (optional)
    ├── ingest.ts
    ├── package.json
    └── README.md
```

### Documentation

```
docs/
├── architecture/
│   ├── context-system.md     # Design overview
│   ├── telegram-ingestion.md # Ingestion pipeline
│   └── semantic-search.md    # Vector search
│
└── guides/
    ├── obsidian-setup.md     # Vault configuration
    └── telegram-setup.md     # Bot configuration
```

## Making Components Generic

### Before (Hardcoded)

```typescript
// BAD: Hardcoded paths
const vaultPath = '/Users/username/Documents/vault';
```

### After (Configurable)

```typescript
// GOOD: Environment variables with defaults
const vaultPath = process.env.OBSIDIAN_VAULT_PATH
  || process.env.FABRIC_OUTPUT_PATH  // Fallback to fabric config
  || path.join(os.homedir(), 'Documents', 'vault');
```

### Configuration Loading

```typescript
// lib/config.ts
import { config } from 'dotenv';
import path from 'path';
import os from 'os';

// Load fabric config
config({ path: path.join(os.homedir(), '.config', 'fabric', '.env') });

export const CONFIG = {
  vault: {
    path: process.env.OBSIDIAN_VAULT_PATH || process.env.FABRIC_OUTPUT_PATH,
    metaPath: process.env.OBSIDIAN_META_PATH,
  },
  embeddings: {
    dbPath: process.env.CONTEXT_EMBEDDINGS_DB,
    model: process.env.CONTEXT_EMBEDDING_MODEL || 'all-MiniLM-L6-v2',
  },
  dailyNotes: {
    format: process.env.DAILY_NOTE_FORMAT || '%Y-%m-%d',
    scratchPadHeader: process.env.SCRATCH_PAD_HEADER || '## Scratch Pad',
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    channelId: process.env.TELEGRAM_CHANNEL_ID,
  },
};
```

## PR Strategy

### Phase 1: Core Skills (No Breaking Changes)
- Add `skills/context/` and `skills/vault/`
- Documentation only, no new dependencies
- Users can adopt incrementally

### Phase 2: CLI Tools
- Add `bin/obs/` for vault operations
- Requires bun/node, sqlite-vec for semantic search
- Optional adoption

### Phase 3: Telegram Integration
- Add `bin/ingest/` for Telegram pipeline
- Completely optional
- Requires Telegram bot setup

## Testing for Upstream

Before PR:
1. Test with fresh vault (not just your existing one)
2. Test all configuration options
3. Verify no hardcoded personal paths
4. Documentation includes setup from scratch
5. Works on macOS, Linux (Windows nice-to-have)

## Checklist for PR

- [ ] All paths use environment variables
- [ ] Default values are sensible
- [ ] No personal data in code/docs
- [ ] README includes setup instructions
- [ ] Works without Telegram (core functionality)
- [ ] Skills follow PAI skill conventions
- [ ] CLI tools follow PAI CLI conventions
- [ ] Tested with fresh vault
- [ ] Documentation complete

## Related

- [Context System Architecture](./context-system.md)
- [Telegram Ingestion Pipeline](./telegram-ingestion.md)
- [PAI CLI-First Architecture](../../.claude/skills/CORE/cli-first-architecture.md)
