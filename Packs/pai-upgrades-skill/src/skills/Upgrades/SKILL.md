---
name: Upgrades
description: Track PAI upgrade opportunities. USE WHEN upgrades, improvement tracking. SkillSearch('upgrades') for docs.
---

# Upgrades

Monitor Anthropic ecosystem AND AI development YouTube channels for updates that can improve PAI infrastructure.


## Voice Notification

**When executing a workflow, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running the WORKFLOWNAME workflow from the Upgrades skill"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow from the **Upgrades** skill...
   ```

**Full documentation:** `~/.claude/skills/CORE/SkillNotifications.md`

## Workflow Routing

**When executing a workflow, output this notification directly:**

```
Running the **WorkflowName** workflow from the **Upgrades** skill...
```

| Workflow | Trigger | File |
|----------|---------|------|
| **Anthropic** | "check Anthropic", "new Claude features" | `Workflows/Anthropic.md` |
| **YouTube** | "check YouTube", "new videos" | `Workflows/YouTube.md` |
| **ReleaseNotesDeepDive** | "analyze release notes", "deep dive features", "/release-notes analysis" | `Workflows/ReleaseNotesDeepDive.md` |
| **All** | "check for updates", "check upgrades" | Run both workflows |

## Examples

**Example 1: Full ecosystem check**
```
User: "check for updates"
→ Invokes All workflow
→ Runs Anthropic workflow then YouTube workflow
→ Reports Anthropic changes + new YouTube videos with transcripts
```

**Example 2: Anthropic only**
```
User: "any new Claude Code features?"
→ Invokes Anthropic workflow
→ Runs Anthropic.ts tool
→ Returns prioritized update report
```

**Example 3: YouTube only**
```
User: "any new videos from Indy Dev Dan?"
→ Invokes YouTube workflow
→ Checks channels, uses VideoTranscript skill for transcripts
→ Shows new videos with transcripts
```

**Example 4: Deep dive on release notes**
```
User: "deep dive the latest release notes"
→ Invokes ReleaseNotesDeepDive workflow
→ Runs /release-notes to capture features
→ Launches parallel research agents for each feature
→ Researches GitHub, docs, blog for each feature
→ Maps to PAI architecture opportunities
→ Outputs prioritized upgrade roadmap with citations
```

## Anthropic Monitoring (30+ sources)

**Sources Monitored:**
1. **Blogs & News** (4) - Main blog, Alignment, Research, Interpretability
2. **GitHub Repositories** (21+) - claude-code, skills, MCP, SDKs, cookbooks
3. **Changelogs** (5) - Claude Code CHANGELOG, releases, docs notes
4. **Documentation** (6) - Claude docs, API docs, MCP docs, spec, registry
5. **Community** (1) - Discord server

## YouTube Monitoring

YouTube channels are configured via the **Skill Customization Layer**.
See `~/.claude/SKILLCUSTOMIZATIONS/Upgrades/` for user-specific channels.

**Features:**
- Detection of new videos via yt-dlp
- Transcript extraction via **VideoTranscript** skill
- State tracking to avoid duplicate processing
- User-customizable channel list (add your own channels via customization layer)

## Tool Reference

| Tool | Purpose |
|------|---------|
| `tools/Anthropic.ts` | Check Anthropic sources |

## Configuration

**Base Skill Files:**
- `sources.json` - Anthropic sources config (30+ sources)
- `youtube-channels.json` - Base YouTube channels (empty - uses customization)
- `state/last-check.json` - Anthropic state
- `state/youtube-videos.json` - YouTube state

**User Customizations** (`~/.claude/SKILLCUSTOMIZATIONS/Upgrades/`):
- `EXTEND.yaml` - Extension manifest
- `youtube-channels.json` - User's personal YouTube channels

Use `bun ~/.claude/skills/CORE/Tools/LoadSkillConfig.ts` to load configs with customizations merged.

## Integration

Uses **VideoTranscript** skill for transcript extraction:
```bash
bun ~/.claude/skills/CORE/Tools/GetTranscript.ts "<youtube-url>"
```
