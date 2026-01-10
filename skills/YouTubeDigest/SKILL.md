---
name: YouTubeDigest
description: Automated YouTube AI news digests. USE WHEN youtube digest OR ai news summary OR video transcript OR channel monitoring.
---

# YouTubeDigest

Monitors YouTube channels for new AI content, fetches transcripts, generates summaries, and delivers daily digests to Telegram.

**Scope:** YouTube transcript extraction, summarization, and scheduled delivery.

## CLI Tools

```bash
# Manage channels to monitor
bun run $PAI_DIR/skills/YouTubeDigest/Tools/ManageChannels.ts --add <url>
bun run $PAI_DIR/skills/YouTubeDigest/Tools/ManageChannels.ts --list

# Check for new videos
bun run $PAI_DIR/skills/YouTubeDigest/Tools/CheckFeed.ts

# Get transcript for a single video
bun run $PAI_DIR/skills/YouTubeDigest/Tools/FetchTranscript.ts --url <video_url>

# Summarize a transcript
bun run $PAI_DIR/skills/YouTubeDigest/Tools/SummarizeVideo.ts --url <video_url>

# Run full digest pipeline
bun run $PAI_DIR/skills/YouTubeDigest/Tools/RunDigest.ts [--dry-run] [--limit 5]
```

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **DailyDigest** | Cron (8am daily) | `Workflows/DailyDigest.md` |

## Architecture

```
CheckFeed (RSS) → FetchTranscript → SummarizeVideo → TelegramDelivery
                                                          ↓
                                              state/processed.json
```

## Configuration

- `channels.json` - List of YouTube channel IDs to monitor
- `state/processed.json` - Tracks which videos have been summarized

## Examples

**Example 1: Add a channel**
```bash
bun run Tools/ManageChannels.ts --add "https://youtube.com/@Fireship"
```

**Example 2: Manual digest run**
```bash
bun run Tools/RunDigest.ts --limit 3
```

**Example 3: Get single video summary**
```bash
bun run Tools/SummarizeVideo.ts --url "https://youtube.com/watch?v=abc123"
```

## Proxy Setup (for Cloud/Blocked IPs)

YouTube blocks transcript requests from cloud IPs. Configure a proxy in `config.json`:

**Option 1: Webshare (Recommended)**
```json
{
  "proxy": {
    "enabled": true,
    "type": "webshare",
    "webshare_username": "your-username",
    "webshare_password": "your-password"
  }
}
```
Sign up at webshare.io - 10 free proxies, $6/mo for 20 residential.

**Option 2: Generic Proxy**
```json
{
  "proxy": {
    "enabled": true,
    "type": "generic",
    "generic_url": "http://user:pass@proxy:port"
  }
}
```

The skill works without proxy from home/office networks.

## Related Skills

- **TelegramDelivery** - Used for sending digests
- **NotebookLM** - Could be used for deeper research on topics
