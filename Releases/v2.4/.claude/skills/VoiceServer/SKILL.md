---
name: VoiceServer
description: Voice server management. USE WHEN voice server, TTS server, voice notification, prosody.
---

## Customization

**Before executing, check for user customizations at:**
`~/.claude/skills/CORE/USER/SKILLCUSTOMIZATIONS/VoiceServer/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.


## 🚨 MANDATORY: Voice Notification (REQUIRED BEFORE ANY ACTION)

**You MUST send this notification BEFORE doing anything else when this skill is invoked.**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running the WORKFLOWNAME workflow in the VoiceServer skill to ACTION"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow in the **VoiceServer** skill to ACTION...
   ```

**This is not optional. Execute this curl command immediately upon skill invocation.**

# VoiceServer Skill

**Domain**: Voice notification system using ElevenLabs TTS with prosody guidance.

**Algorithm**: `~/.claude/skills/CORE/SYSTEM/THEALGORITHM.md`

---

## Phase Overrides

### OBSERVE
- **Key sources**: Operation type (status/notify/manage), message content, voice selection
- **Critical**: Voice relies on `🎯 COMPLETED:` line - without it, user won't hear response

### THINK
- **Voice selection**: Match agent to voice ID (see routing table below)
- **Prosody**: Emotional markers + markdown emphasis = natural speech
- **Anti-patterns**: Missing COMPLETED line, no prosody, wrong voice for agent

### BUILD
| Criterion | PASS | FAIL |
|-----------|------|------|
| COMPLETED | Line present with message | Missing line |
| Prosody | Emotional markers applied | Flat/robotic |
| Voice | Correct agent voice | Wrong voice |

### EXECUTE
- **Notify**: `curl -X POST http://localhost:8888/notify -H "Content-Type: application/json" -d '{"message":"...", "voice_id":"..."}'`
- **Manage**: `~/.claude/VoiceServer/{start,stop,status,restart}.sh`
- **Workflow**: `Workflows/Status.md`

---

## Domain Knowledge

**Voice Routing**:
| Agent | Voice ID | Style |
|-------|----------|-------|
| kai | ${KAI_VOICE_ID} | Configure your primary voice |
| engineer | ${ENGINEER_VOICE_ID} | Configure engineering voice |
| pentester | ${PENTESTER_VOICE_ID} | Configure pentester voice |
| architect | ${ARCHITECT_VOICE_ID} | Configure architect voice |

Configure voice IDs in your environment or `~/.claude/VoiceServer/voices.json`

**Prosody Quick Reference**:
- Emotional: `[💥 excited]` `[✨ success]` `[⚠️ caution]` `[🚨 urgent]`
- Emphasis: `**bold**` for key words, `...` for pause, `--` for break

**Infrastructure**: Server at `~/.claude/VoiceServer/`, Port 8888, Config `voices.json`
