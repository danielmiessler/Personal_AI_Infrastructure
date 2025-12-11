# Changelog

All notable changes to the Context Skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v1.0.0] - 2025-12-11

Initial release of the Context Skill for PAI.

### Added

**Ingest CLI** (`bin/ingest/`)
- Text, voice memo, photo, and document capture via Telegram
- Fabric pattern integration (`/wisdom`, `/meeting-notes`, `/summarize`, etc.)
- Automatic transcription via Whisper API
- Vision AI processing for photos
- Archive pipeline with Dropbox sync
- Keyword auto-tagging via taxonomy system
- iOS Shortcuts metadata parsing (`[source:...]`, `[device:...]`, etc.)
- Dictated hint detection (`~private`, `~work`, date phrases)
- Events channel notifications

**Obs CLI** (`bin/obs/`)
- Vault search with fuzzy matching
- Semantic search via embeddings
- Tag-based filtering
- Project context loading

**iOS Shortcuts** (`shortcuts/`)
- Voice memo capture (WisprFlow integration)
- Clipboard sharing from iPhone/Mac
- Photo capture with metadata

**Skill Definition** (`.claude/skills/Context/`)
- SKILL.md with trigger keywords and CLI reference
- Taxonomy system for auto-tagging (`tags.example.json`)
- Workflow documentation

### Architecture

- **CLI-First**: All functionality exposed via CLIs, Claude orchestrates
- **Deterministic Code First**: Keyword matching, pattern routing in TypeScript
- **AI as Capability Layer**: Whisper for transcription, Vision for photos, Fabric for extraction
- **Semantic Search**: Embeddings stored in SQLite for similarity queries

### Configuration

Required environment variables (see `.claude/.env.example`):
- `TELEGRAM_BOT_TOKEN` - Bot for receiving messages
- `TELEGRAM_INBOX_CHANNEL_ID` - Personal inbox channel
- `OPENAI_API_KEY` - For Whisper transcription
- `OBSIDIAN_VAULT_PATH` - Target vault location
- `DROPBOX_ARCHIVE_PATH` - Archive sync location (optional)
