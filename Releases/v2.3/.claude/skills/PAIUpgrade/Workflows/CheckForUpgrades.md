# Check for Upgrades

Monitor all configured sources for updates and new content relevant to PAI infrastructure.

**Trigger:** "check for upgrades", "check upgrade sources", "any new updates", "check Anthropic", "check YouTube"

---

## Overview

This workflow checks all configured sources for new content:
1. **Anthropic Sources** - Official blogs, GitHub repos, changelogs, documentation
2. **YouTube Channels** - Configured via USER customization layer

Both source types are checked, and results are combined into a single prioritized report.

---

## Process

### Step 1: Check Anthropic Sources

Run the Anthropic check tool:
```bash
bun ~/.claude/skills/PAIUpgrade/Tools/Anthropic.ts
```

**Options:**
- No arguments: Check last 30 days (default)
- `14` or `7`: Check last N days
- `--force`: Ignore state, check all sources

**Sources Monitored (30+):**
1. **Blogs & News** (4) - Main blog, Alignment, Research, Interpretability
2. **GitHub Repositories** (21+) - claude-code, skills, MCP, SDKs, cookbooks
3. **Changelogs** (5) - Claude Code CHANGELOG, releases, docs notes
4. **Documentation** (6) - Claude docs, API docs, MCP docs, spec, registry
5. **Community** (1) - Discord server

---

### Step 2: Check YouTube Channels

**Load channel configuration (merges base + user customizations):**
```bash
bun ~/.claude/skills/CORE/Tools/LoadSkillConfig.ts ~/.claude/skills/PAIUpgrade youtube-channels.json
```

**For each channel, check for new videos:**
```bash
yt-dlp --flat-playlist --dump-json "https://www.youtube.com/@channelhandle/videos" 2>/dev/null | head -5
```

**Compare against state:**
```bash
cat ~/.claude/skills/PAIUpgrade/State/youtube-videos.json
```

**For new videos, extract transcripts:**
```bash
bun ~/.claude/skills/CORE/Tools/GetTranscript.ts "<video-url>"
```

**Update state** with new video IDs (keep last 50 per channel).

---

### Step 3: Combine Results

Present a unified report:

```markdown
# Upgrade Check Results
**Date:** [timestamp]

## 🔥 HIGH PRIORITY
[Must-review features/changes for PAI]

## 📌 MEDIUM PRIORITY
[Interesting updates to check]

## 📝 LOW PRIORITY
[FYI information]

## 🎬 New Videos
[List of new videos with transcripts and key insights]
```

---

### Step 4: Provide Recommendations

Based on combined results, advise on:
- What changed and why it matters for PAI
- Which updates to review immediately
- Specific actions to take (e.g., update skills, test new features)
- Videos worth watching in full

---

## State Tracking

**Anthropic state:** `State/last-check.json`
- Last check timestamp
- Content hashes for each source
- Last seen commit SHAs, release versions, blog titles

**YouTube state:** `State/youtube-videos.json`
- Last check timestamp per channel
- Seen video IDs (prevents duplicate processing)

State prevents duplicate reports - only NEW content is shown.

---

## Source Configuration

**Anthropic sources:** `sources.json` (base skill)
- 30+ official Anthropic sources
- Configured in skill, not customizable

**YouTube channels:** Two-tier configuration
- Base: `youtube-channels.json` (empty by default)
- User: `~/.claude/skills/CORE/USER/SKILLCUSTOMIZATIONS/PAIUpgrade/youtube-channels.json`

Use the config loader to merge both automatically.

---

## Adding YouTube Channels

Edit your customization file:
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

---

## Examples

**Check all sources:**
```
User: "check for upgrades"
→ Runs Anthropic tool
→ Checks YouTube channels
→ Combines results into prioritized report
```

**Check specific source type:**
```
User: "check Anthropic only"
→ Runs only Anthropic tool
→ Skips YouTube check
```

**Force full check:**
```
User: "force check all sources"
→ Runs with --force flag
→ Ignores state, checks everything
```
