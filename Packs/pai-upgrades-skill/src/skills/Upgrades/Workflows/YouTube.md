# YouTube Workflow

Monitor configured YouTube channels for new videos and extract transcripts.

**Note:** Personal YouTube channels are configured via the skill customization layer.
See `~/.claude/SKILLCUSTOMIZATIONS/Upgrades/` for user-specific channels.

## Process

### Step 1: Load Channel Configuration

Load channels using the config loader (merges base + user customizations):
```bash
bun ~/.claude/skills/CORE/Tools/LoadSkillConfig.ts ~/.claude/skills/Upgrades youtube-channels.json
```

### Step 2: Check Each Channel for New Videos

For each channel, use yt-dlp to get recent videos:
```bash
yt-dlp --flat-playlist --dump-json "https://www.youtube.com/@channelhandle/videos" 2>/dev/null | head -5
```

### Step 3: Compare Against State

Read the seen videos state:
```bash
cat ~/.claude/skills/Upgrades/state/youtube-videos.json
```

Compare video IDs to identify NEW videos not in the seen list.

### Step 4: Extract Transcripts for New Videos

For each new video, use the **VideoTranscript** skill:
```bash
bun ~/.claude/skills/CORE/Tools/GetTranscript.ts "<video-url>"
```

### Step 5: Update State

Add the new video IDs to the seen list and save:
- Update `state/youtube-videos.json` with new video IDs
- Keep last 50 videos per channel

### Step 6: Report Results

For each new video, provide:
- Channel name and video title
- Video URL and publish date
- Full transcript text
- Key insights relevant to PAI improvements

## Channels Monitored

Channels are configured via the skill customization layer:
- **Base skill**: `~/.claude/skills/Upgrades/youtube-channels.json` (empty - for PAI generic channels if any)
- **User customization**: `~/.claude/SKILLCUSTOMIZATIONS/Upgrades/youtube-channels.json`

The config loader merges both, so user channels are automatically included.

## Adding New Channels

Edit your customization file at `~/.claude/SKILLCUSTOMIZATIONS/Upgrades/youtube-channels.json`:

```json
{
  "_customization": {
    "description": "Your personal YouTube channels",
    "merge_strategy": "append"
  },
  "channels": [
    {
      "name": "Channel Name",
      "channel_id": "@channelhandle",
      "url": "https://www.youtube.com/@channelhandle",
      "priority": "HIGH",
      "description": "What this channel covers"
    }
  ]
}
```

## State File Format

`state/youtube-videos.json`:
```json
{
  "last_check_timestamp": "2025-12-01T10:00:00Z",
  "channels": {
    "Indy Dev Dan": {
      "last_video_id": "abc123",
      "last_video_title": "Video Title",
      "last_checked": "2025-12-01T10:00:00Z",
      "seen_videos": ["abc123", "def456", "ghi789"]
    }
  }
}
```
