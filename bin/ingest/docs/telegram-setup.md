# Telegram Setup Guide

This guide explains how to set up Telegram as an ingestion channel for the PAI Context Management Skill.

## Overview

The ingest system uses Telegram as a "capture inbox" - send voice memos, photos, documents, URLs, and text from any device, and they get processed into your Obsidian vault.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Your Devices   │────▶│  Telegram Bot   │────▶│  Obsidian Vault │
│  (iOS, Android, │     │  (polls inbox)  │     │  (processed)    │
│   Desktop)      │     └─────────────────┘     └─────────────────┘
└─────────────────┘
```

## Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Start a conversation and send `/newbot`
3. Follow the prompts:
   - **Name**: Choose a display name (e.g., "PAI Ingest")
   - **Username**: Must end in `bot` (e.g., `pai_ingest_bot`)
4. BotFather will give you a **token** like:
   ```
   123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```
5. **Save this token** - you'll need it for configuration

### Optional: Customize Your Bot

Send these commands to BotFather:
- `/setdescription` - Add a description
- `/setuserpic` - Set a profile picture
- `/setcommands` - Define bot commands (optional)

## Step 2: Create a Telegram Channel

You need a **private channel** as your inbox:

1. Open Telegram → Menu → "New Channel"
2. Set name (e.g., "PAI Inbox") and optional description
3. Choose **Private** channel
4. Skip adding members for now

### Get Your Channel ID

The channel ID is needed for configuration. Here's how to find it:

**Method 1: Forward to @userinfobot**
1. Forward any message from your channel to [@userinfobot](https://t.me/userinfobot)
2. It will reply with the channel ID (starts with `-100`)

**Method 2: Use the web.telegram.org URL**
1. Open [web.telegram.org](https://web.telegram.org)
2. Go to your channel
3. Look at the URL: `https://web.telegram.org/k/#-1001234567890`
4. Your channel ID is `-1001234567890` (include the minus sign)

## Step 3: Add Bot as Channel Admin

Your bot needs admin rights to read messages:

1. Open your channel
2. Tap the channel name → "Administrators"
3. Tap "Add Administrator"
4. Search for your bot's username
5. Enable these permissions:
   - ✅ Post Messages
   - ✅ Edit Messages
   - ✅ Delete Messages
   - ❌ Others can be disabled

## Step 4: Configure Environment

Add to your `~/.claude/.env` file:

```bash
# Required: Telegram bot token from BotFather (for ingest daemon to READ from channel)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# Required: Your private inbox channel ID (include the -)
TELEGRAM_CHANNEL_ID=-1001234567890

# Optional: Separate bot for SENDING to channel (iOS Shortcuts)
# If not set, shortcuts will use TELEGRAM_BOT_TOKEN
TELEGRAM_SENDER_BOT_TOKEN=987654321:ZYXwvuTSRqpoNMLkjiHGFedCBA

# Optional: Separate outbox for bot responses
TELEGRAM_OUTBOX_ID=-1009876543210

# Required: Your Obsidian vault path
OBSIDIAN_VAULT_PATH=~/Documents/your_vault

# Optional: For semantic search
OPENAI_API_KEY=sk-...
```

### Why Two Bot Tokens?

You can use one bot for both sending and receiving, or separate bots for security isolation:

| Variable | Purpose | Used By |
|----------|---------|---------|
| `TELEGRAM_BOT_TOKEN` | Poll/read from channel | `ingest` daemon |
| `TELEGRAM_SENDER_BOT_TOKEN` | Send to channel | iOS Shortcuts |

**Single bot (simpler):** Use the same token for both - just set `TELEGRAM_BOT_TOKEN`.

**Two bots (more secure):** The sender bot only needs permission to post; the reader bot needs permission to read history. Separating them limits exposure if one token is compromised.

## Step 5: Verify Setup

Test your configuration:

```bash
# Check config is loaded
ingest config

# Poll for messages (should succeed even if empty)
ingest poll --verbose

# Start watch daemon
ingest watch
```

## Usage

Once set up, send content to your channel:

### Text Messages
Send text with optional hints:
```
#project/pai @john_doe This is a quick note about the meeting
```

### Voice Messages
Record and send voice memos - they get transcribed automatically.

### Photos
Send photos with captions - captions can include hints.

### Documents
- PDFs get archived with structured naming
- Add hints in caption: `[type:RECEIPT][date:2024-01-15] Expense report`

### URLs
Send URLs for web content extraction.

## iOS Shortcuts Integration

Pre-built shortcuts are available in `shortcuts/`:

```bash
cd shortcuts
./setup.sh   # Generates signed .shortcut files with your credentials
```

This creates:
- **PAI Clipboard Capture** - Share clipboard content to your channel
- **PAI File Capture** - Share files to your channel

The setup script reads `TELEGRAM_SENDER_BOT_TOKEN` and `TELEGRAM_CHANNEL_ID` from `~/.claude/.env`.

### Install Generated Shortcuts

After running `setup.sh`, install the shortcuts:
1. **Double-click** the `.shortcut` files on Mac, or
2. **AirDrop** to iOS device, or
3. **Copy to iCloud Drive** and open from Files app

See `shortcuts/README.md` for detailed usage.

## Troubleshooting

### Bot not receiving messages

1. **Check bot is admin**: Go to channel → Administrators → verify bot is listed
2. **Check channel ID**: Must include `-100` prefix for channels
3. **Test with curl**:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/getUpdates"
   ```

### Permission errors

Ensure bot has "Post Messages" permission in the channel.

### Rate limiting

Telegram limits API calls. The watch daemon handles this with exponential backoff.

### Channel vs Group

- **Channels**: Use `-100` prefix in ID
- **Groups**: Use regular negative ID
- Channels are recommended for one-way inbox flow

## Security Notes

- Keep your bot token secret
- Use a private channel (not group) for sensitive content
- Consider separate channels for work/personal (`~work` / `~private` scopes)
- Never commit tokens to git

## Test Channels (Development)

For testing, you can use separate channels:

```bash
# In .env for testing
TEST_TELEGRAM_CHANNEL_ID=-100...    # Test inbox
TEST_TELEGRAM_OUTBOX_ID=-100...     # Test outbox  
TEST_TELEGRAM_CASES_ID=-100...      # Test cases channel
```

Run tests with: `ingest test --layer integration`

