# Upgrade Workflow

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the Upgrade workflow in the PAIUpgrade skill to check for upgrades"}' \
  > /dev/null 2>&1 &
```

Running the **Upgrade** workflow in the **PAIUpgrade** skill to check for upgrades...

**Primary workflow for PAIUpgrade skill.** Generates prioritized upgrade recommendations by running two parallel agent threads: user context analysis and source collection.

**Trigger:** "check for upgrades", "upgrade", "any updates", "check Anthropic", "check YouTube", "pai upgrade"

---

## Overview

This workflow executes the core PAIUpgrade pattern:

1. **Thread 1:** Analyze user context (TELOS, projects, recent work, PAI state)
2. **Thread 2:** Collect updates from sources (Anthropic, YouTube, custom)
3. **Synthesize:** Combine context + discoveries into personalized recommendations
4. **Output:** Prioritized upgrade report

Both threads run in parallel for efficiency.

---

## Execution

### Step 1: Launch Thread 1 - User Context Analysis

Spawn 4 parallel Intern agents to gather user context:

```
Use Task tool with subagent_type=Intern, run 4 agents in parallel:

Agent 1 - TELOS Analysis:
"Read and analyze the user's TELOS files to understand their current focus:
- ~/.claude/skills/CORE/USER/TELOS/TELOS.md
- ~/.claude/skills/CORE/USER/TELOS/GOALS.md
- ~/.claude/skills/CORE/USER/TELOS/PROJECTS.md
- ~/.claude/skills/CORE/USER/TELOS/CHALLENGES.md
- ~/.claude/skills/CORE/USER/TELOS/STATUS.md

Extract and return:
1. Current high-priority goals
2. Active focus areas
3. Key challenges they're working on
4. Project themes and directions

Format as structured JSON."

Agent 2 - Recent Work Analysis:
"Analyze the user's recent work patterns:
- Read ~/.claude/MEMORY/STATE/current-work.json
- Check recent MEMORY/WORK/ directories (last 7 days)

Extract and return:
1. What projects they've been actively working on
2. Patterns in their work (what keeps coming up)
3. Any open/incomplete tasks
4. Recent accomplishments

Format as structured JSON."

Agent 3 - PAI System State:
"Analyze the current state of the user's PAI system:
- List skills in ~/.claude/skills/
- List hooks in ~/.claude/hooks/
- Read ~/.claude/settings.json

Extract and return:
1. Installed skills (list with brief purpose)
2. Active hooks (list with triggers)
3. Current configuration highlights
4. Any obvious gaps or opportunities

Format as structured JSON."

Agent 4 - Tech Stack Context:
"From the user's projects and recent work, identify their tech stack:
- Review PROJECTS.md for stated technologies
- Check recent WORK directories for actual usage

Extract and return:
1. Primary languages (TypeScript, Python, etc.)
2. Frameworks in use
3. Deployment targets (Cloudflare, etc.)
4. Key integrations

Format as structured JSON."
```

### Step 2: Launch Thread 2 - Source Collection

Spawn 3 parallel agents to check sources:

```
Use Task tool with subagent_type=Intern, run 3 agents in parallel:

Agent 1 - Anthropic Sources:
"Check Anthropic sources for updates and EXTRACT GRANULAR TECHNIQUES:

Run: bun ~/.claude/skills/PAIUpgrade/Tools/Anthropic.ts

For EACH finding, extract SPECIFIC TECHNIQUES - not summaries:

1. **Release Notes:** For each new feature:
   - Extract the exact syntax/API/configuration
   - Quote the documentation showing how to use it
   - Identify which PAI component this improves

2. **GitHub Commits:** For relevant changes:
   - Extract the actual code pattern or hook signature
   - Show before/after if applicable
   - Map to existing PAI files that could use this

3. **Documentation Updates:**
   - Quote the new content verbatim
   - Identify what capability is now documented that wasn't before
   - Connect to current PAI workarounds this replaces

Return format for EACH technique:
{
  'technique_name': '[Specific name]',
  'source': '[GitHub release/Docs section/Blog post]',
  'exact_content': '[Quoted documentation, code example, or API signature]',
  'current_pai_gap': '[What PAI currently does/lacks that this addresses]',
  'implementation_file': '[Path to PAI file this would change]',
  'code_change': '[Actual code to add/modify]'
}

DO NOT return vague findings like 'new release available'.
EXTRACT the specific techniques from the release.
If something has no concrete technique, skip it with reason."

Agent 2 - YouTube Channels:
"Check configured YouTube channels for new content and EXTRACT GRANULAR TECHNIQUES:

1. Load channel config:
   bun ~/.claude/skills/CORE/Tools/LoadSkillConfig.ts ~/.claude/skills/PAIUpgrade youtube-channels.json

2. For each channel, check recent videos:
   yt-dlp --flat-playlist --dump-json 'https://www.youtube.com/@channelhandle/videos' 2>/dev/null | head -5

3. Compare against state:
   cat ~/.claude/skills/PAIUpgrade/State/youtube-videos.json

4. For NEW videos, extract transcripts:
   bun ~/.claude/skills/CORE/Tools/GetTranscript.ts '<video-url>'

5. CRITICAL - For each transcript, extract SPECIFIC TECHNIQUES:
   - Look for code patterns, configurations, command examples
   - Find timestamps where techniques are explained
   - Quote exact phrases that describe the technique
   - Identify what PAI component this applies to

Return format for EACH technique found:
{
  'technique_name': '[Specific name for the technique]',
  'source_video': '[Video title]',
  'timestamp': '[MM:SS where technique is explained]',
  'exact_quote': '[Direct quote from transcript explaining the technique]',
  'code_or_config': '[Any code/config shown, if applicable]',
  'pai_relevance': '[Which PAI component this could improve]'
}

DO NOT return vague summaries like 'discusses Claude Code features'.
DO NOT recommend watching the video - extract the actual technique.
If a video has no extractable techniques, mark it as 'skipped: no techniques found'."

Agent 3 - Custom Sources:
"Check for any custom sources defined by the user:

1. Look in ~/.claude/skills/CORE/USER/SKILLCUSTOMIZATIONS/PAIUpgrade/
2. Check for additional source definitions beyond YouTube
3. If sources exist, check them for updates

Return: any findings from custom sources.
If no custom sources, return empty list with note 'No custom sources configured'."
```

### Step 3: Wait and Collect Results

Wait for all 7 agents to complete. Collect their outputs.

### Step 4: Synthesize User Context

Merge Thread 1 results into a unified context object:

```json
{
  "user_context": {
    "telos": {
      "current_goals": [...],
      "focus_areas": [...],
      "challenges": [...]
    },
    "recent_work": {
      "active_projects": [...],
      "patterns": [...],
      "open_tasks": [...]
    },
    "pai_state": {
      "skills": [...],
      "hooks": [...],
      "config_highlights": [...]
    },
    "tech_stack": {
      "languages": [...],
      "frameworks": [...],
      "deployment": [...]
    }
  }
}
```

### Step 5: Filter and Score Discoveries

For each discovery from Thread 2:

1. **Relevance check:** Does this relate to user's tech stack? Goals? Projects?
2. **Score relevance:** 1-10 based on match with user context
3. **Score impact:** 1-10 based on capability gained
4. **Score effort:** 1-10 (10 = easy, 1 = hard)
5. **Calculate priority:** (relevance × 2) + impact + effort

Filter out discoveries with relevance < 3.

### Step 6: Generate Prioritized Recommendations

Sort by priority score and categorize:

- **HIGH PRIORITY:** Score > 25, relevance > 7
- **MEDIUM PRIORITY:** Score 15-25, relevance > 5
- **ASPIRATIONAL:** Score < 15 or relevance 3-5

For each recommendation, include:
- Source (where discovered)
- Why it matters for THIS user (personalized)
- What it enables (concrete capability)
- Implementation steps
- Effort estimate

### Step 7: Output Report

**Extract techniques. Show the actual content. Explain PAI relevance.**

Generate the final report following SKILL.md's "Primary Output Format" with these rules:

```markdown
# PAI Upgrade Report
**Generated:** [timestamp]
**Sources Processed:** [N] release notes parsed | [N] videos transcribed | [N] docs analyzed

---

## 🎯 Extracted Techniques

[For EACH technique extracted, use this structure:]

### From [Source Type]

#### [Technique Name]
**Source:** [Exact source with version/timestamp]

**What It Is (16-32 words):**
[Describe the technique itself - what it does, how it works, what capability it provides. Must be exactly 16-32 words, concrete and specific.]

**How It Helps PAI (16-32 words):**
[Describe the specific benefit to our PAI system - which component improves, what gap it fills, what becomes possible. Must be exactly 16-32 words.]

**The Technique:**
> [QUOTE or CODE BLOCK - the actual content, not a summary]

**Applies To:** `[file path]`, [component name]
**Implementation:**
```[language]
// [Before/after or new code]
```

---

## 📊 Technique Summary

| # | Technique | Source | PAI Component | Impact |
|---|-----------|--------|---------------|--------|
[Table summarizing all techniques]

---

## ⏭️ Skipped Content

[Content with no extractable techniques - with specific reasons]

---

## 🔍 Sources Processed

[What was actually analyzed, with extraction counts]
```

**CRITICAL Output Rules:**
1. **QUOTE THE SOURCE** - Every technique must include actual quoted content or code
2. **MAP TO PAI** - Every technique must name a specific PAI file or component it improves
3. **TWO MANDATORY DESCRIPTIONS (16-32 words each):**
   - **What It Is:** Describe the technique itself - what it does, how it works, what capability it provides
   - **How It Helps PAI:** Describe the specific benefit - which component improves, what gap it fills
4. **NO WATCH/READ RECOMMENDATIONS** - Extract the technique, don't point to the content
5. **SKIP BOLDLY** - If content has no technique, skip it; don't dilute with summaries
6. **WORD COUNT ENFORCEMENT** - Count words in description fields. Under 16 = add specificity. Over 32 = condense.

### Step 8: Update State

Update state files to avoid duplicate processing:
- `State/last-check.json` - Updated by Anthropic.ts tool
- `State/youtube-videos.json` - Add newly processed video IDs

---

## Quick Mode

If user says "check Anthropic only" or similar:
- Skip Thread 1 (use cached context if available from session)
- Run only the relevant Thread 2 agent
- Apply lighter filtering
- Output abbreviated report

---

## Error Handling

- If Thread 1 agents fail: Proceed with minimal context, note in output
- If Thread 2 agents fail: Report which sources couldn't be checked
- If no discoveries: Output "No new updates found" with sources checked
- If all discoveries filtered: Output "Updates found but none relevant to current focus"

---

## Integration

**Input workflows:**
- Can be triggered automatically on schedule (cron)
- Can be triggered by user command

**Output workflows:**
- Discoveries feed into **ResearchUpgrade** for deep dives
- Recommendations can generate todos
- Can trigger implementation workflows

---

## Example Execution

```
User: "check for upgrades"

[Agents run in parallel...]

# PAI Upgrade Report
**Generated:** 2026-01-15 19:45:00 PST

## What I Actually Recommend

## Extracted Techniques

### PreToolUse Additional Context
**Source:** GitHub claude-code v2.1.16

**What It Is (16-32 words):**
PreToolUse hooks can now return an additionalContext field that gets injected into the model's context before tool execution, enabling reasoning-based security rather than hard blocks.

**How It Helps PAI (16-32 words):**
SecurityValidator.hook.ts currently blocks dangerous commands. With additionalContext, it can inject warnings Claude reasons about, enabling smarter security that adapts to context.

**The Technique:**
```typescript
return { decision: "allow", additionalContext: "WARNING: Protected file." };
```

**Applies To:** `hooks/SecurityValidator.hook.ts`

---

### Session ID Substitution
**Source:** GitHub claude-code v2.1.16

**What It Is (16-32 words):**
Native environment variable ${CLAUDE_SESSION_ID} is now available in all hooks and commands, eliminating the need for custom session ID extraction or workaround code.

**How It Helps PAI (16-32 words):**
Our session documentation workflows had manual session ID extraction hacks. Native substitution means cleaner code and reliable session tracking across all PAI workflows.

**The Technique:**
```bash
echo "Session: ${CLAUDE_SESSION_ID}"
```

**Applies To:** `skills/System/Workflows/DocumentSession.md`

## Skip These

- MCP auto mode: Already enabled by default
- YouTube Gemini 3 videos: Not relevant to Claude-centric stack
- Agent Experts video: Interesting but no concrete change identified

## Sources Checked
30 Anthropic sources, 5 YouTube videos, 0 custom → 3 relevant findings
```

---

**This workflow implements the core PAIUpgrade value proposition: understanding YOU first, discovering what's new second, then connecting them into actionable, personalized upgrades.**
