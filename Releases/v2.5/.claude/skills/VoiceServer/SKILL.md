---
name: VoiceServer
description: Voice server management. USE WHEN voice server, TTS server, voice notification, prosody.
---

## Customization

**Before executing, check for user customizations at:**
`~/.claude/skills/PAI/USER/SKILLCUSTOMIZATIONS/VoiceServer/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.

# VoiceServer Skill

**Domain**: Voice notification system using ElevenLabs TTS.

**Algorithm**: `~/.claude/skills/PAI/SKILL.md`

---

## Voice Architecture (ElevenLabs)

The voice server uses **ElevenLabs API** for high-quality TTS. Voice characteristics are defined by:

1. **Voice ID**: ElevenLabs voice identifier (from settings.json → `daidentity.voiceId`)
2. **Prosody Settings**: stability, similarity_boost, style, speed, use_speaker_boost

**Prosody Configuration** (from `settings.json` → `daidentity.voice`):
```json
{
  "stability": 0.35,
  "similarity_boost": 0.80,
  "style": 0.90,
  "speed": 1.1,
  "use_speaker_boost": true
}
```

---

## API Endpoints

### Primary: Voice Notification
```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Your message here",
    "title": "Kai says",
    "voice_enabled": true,
    "voice_id": "s3TPKV1kjDlVtZbl4Ksh",
    "voice_settings": {
      "stability": 0.35,
      "similarity_boost": 0.80,
      "style": 0.90,
      "speed": 1.1,
      "use_speaker_boost": true
    }
  }'
```

### Health Check
```bash
curl http://localhost:8888/health
```

---

## Management

**Scripts**: `~/.claude/VoiceServerV1/{start,stop,status,restart}.sh`

**Check Status**:
```bash
~/.claude/VoiceServerV1/status.sh
```

**Start Server**:
```bash
cd ~/.claude/VoiceServerV1 && bun run server.ts
```

---

## Voice Output Format

All algorithm completions include a voice line that gets spoken:
```
🗣️ Kai: [16 words max - THIS IS SPOKEN ALOUD]
```

This line is extracted by hooks and sent to the voice server automatically.

---

## Infrastructure

- **Engine**: ElevenLabs API (eleven_turbo_v2_5)
- **Port**: 8888
- **Voice Config**: `~/.claude/settings.json` → `daidentity.voiceId` and `daidentity.voice`
- **Server Code**: `~/.claude/VoiceServerV1/server.ts`
