# DailyDigest Workflow

> **Trigger:** Cron job (8am daily) or manual via `RunDigest.ts`
> **Input:** None (reads from channels.json)
> **Output:** Telegram message with video summaries

Automated workflow that monitors YouTube channels, fetches transcripts, generates summaries, and delivers daily digests.

---

## Pipeline Steps

### 1. Check Feeds
- Read `channels.json` for monitored channels
- Fetch RSS feeds from YouTube
- Filter out already-processed videos (via `state/processed.json`)
- Sort by publish date (newest first)

### 2. Fetch Transcripts
- For each new video, fetch transcript via Python helper
- Skip videos without available transcripts
- Log warnings for failures

### 3. Summarize Videos
- Send transcript to Claude API
- Generate structured summary with:
  - Key Points (3-5 bullets)
  - Notable Quotes
  - Bottom Line (one sentence)

### 4. Deliver Digest
- Combine all summaries into single markdown document
- Send via TelegramDelivery skill
- Save backup to `/tmp/youtube-digest-{timestamp}.md`

### 5. Update State
- Mark processed video IDs in `state/processed.json`
- Update `lastRun` timestamp

---

## Manual Execution

```bash
# Full run (sends to Telegram)
bun run $PAI_DIR/skills/YouTubeDigest/Tools/RunDigest.ts

# Preview without sending
bun run $PAI_DIR/skills/YouTubeDigest/Tools/RunDigest.ts --dry-run

# Limit to N videos
bun run $PAI_DIR/skills/YouTubeDigest/Tools/RunDigest.ts --limit 3
```

---

## Cron Setup

Add to crontab for automated daily runs:

```bash
# Edit crontab
crontab -e

# Add line for 8am daily
0 8 * * * cd ~/.claude && bun run skills/YouTubeDigest/Tools/RunDigest.ts >> /tmp/youtube-digest.log 2>&1
```

---

## Error Handling

| Error | Handling |
|-------|----------|
| No channels configured | Exit with message |
| RSS feed fails | Skip channel, continue |
| No transcript | Skip video, log warning |
| Summarization fails | Skip video, log error |
| Telegram fails | Output to console as fallback |

---

## Completion

Workflow completes when:
1. All new videos processed (or skipped with reason)
2. Digest sent to Telegram (or logged to console)
3. State updated with processed video IDs

## Skills Invoked

| Step | Skill |
|------|-------|
| Deliver digest | TelegramDelivery |
