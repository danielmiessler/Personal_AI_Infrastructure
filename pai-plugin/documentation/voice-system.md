# PAI Voice System Documentation

## Overview
The PAI Voice System provides text-to-speech capabilities for Kai and all agents using ElevenLabs TTS API. The system uses a unified stop-hook approach where completion messages are read aloud with distinct voices for Kai and each specialized agent, providing voice differentiation through character-matched, high-quality ElevenLabs voices.

## Architecture Overview

### Core Components

1. **Voice Server** (`${PAI_DIR}/voice-server/server.ts`)
   - Bun-based HTTP server running on port 8888
   - Uses ElevenLabs API for high-quality TTS generation
   - Plays audio using macOS afplay command
   - Provides notification display alongside voice output
   - Requires ELEVENLABS_API_KEY in ~/.env

2. **Stop Hook** (`${PAI_DIR}/hooks/stop-hook.ts`)
   - Triggers after every Claude Code response
   - Parses completion messages from transcripts
   - Extracts text from COMPLETED lines
   - Sends appropriate voice requests with entity-specific voices
   - Handles both Kai's direct work and agent completions

3. **Agent Configurations** (`${PAI_DIR}/agents/*.md`)
   - Each agent has a unique voice matching their personality
   - Voice IDs defined in hooks (ElevenLabs voice IDs)
   - Voice mappings centralized in stop-hook.ts and subagent-stop-hook.ts

## How It Works

### Complete System Flow

1. **Task Execution**
   - User requests a task
   - Either Kai handles it directly or delegates to an agent

2. **Completion Format**
   - All responses must end with: `🎯 COMPLETED: [description of what was done]`
   - This line is mandatory for voice output to trigger
   - Description should be 5-6 words summarizing the accomplishment

3. **Stop Hook Processing**
   - Hook reads the transcript after each response
   - Searches for the COMPLETED line in the output
   - Extracts the exact text after "COMPLETED:"
   - Determines if it was Kai or an agent who completed the task

4. **Voice Selection**
   - For Kai's completions: Uses ElevenLabs voice ID s3TPKV1kjDlVtZbl4Ksh
   - For agent completions: Uses the agent's specific ElevenLabs voice ID

5. **Voice Generation**
   - Stop hook sends POST request to voice server at localhost:8888
   - Request includes the completion message and ElevenLabs voice_id
   - Server calls ElevenLabs API to generate audio
   - Audio is saved to /tmp and played using afplay
   - Temp files are cleaned up after playback

## Voice Mappings (ElevenLabs)

All entities use ElevenLabs TTS voices for high-quality, natural speech. Voices are selected to match each entity's personality and role.

| Entity | ElevenLabs Voice ID | Personality Match |
|--------|---------------------|-------------------|
| Kai | s3TPKV1kjDlVtZbl4Ksh | Professional, conversational |
| Perplexity-Researcher | AXdMgz6evoL7OPd7eU12 | Analytical, clear |
| Claude-Researcher | AXdMgz6evoL7OPd7eU12 | Strategic, sophisticated |
| Gemini-Researcher | iLVmqjzCGGvqtMCk6vVQ | Multi-perspective, thorough |
| Engineer | fATgBRI8wg5KkDFg8vBd | Steady, professional |
| Principal-Engineer | iLVmqjzCGGvqtMCk6vVQ | Strategic, senior leadership |
| Architect | muZKMsIDGYtIkjjiUS82 | Strategic, sophisticated |
| Designer | ZF6FPAbjXT4488VcRRnw | Creative, distinct |
| Artist | ZF6FPAbjXT4488VcRRnw | Creative, artistic |
| Pentester | xvHLFjaUEpx4BOf7EiDd | Technical, sharp |
| Writer | gfRt6Z3Z8aTbpLfexQ7N | Articulate, warm |

### Voice Configuration

ElevenLabs voices provide consistent, high-quality neural TTS with natural-sounding speech across all agents. Voice IDs are stored in:
- Server default: `${PAI_DIR}/voice-server/server.ts`
- Stop hooks: `${PAI_DIR}/hooks/stop-hook.ts` and `${PAI_DIR}/hooks/subagent-stop-hook.ts`

## Server Configuration

### Voice Configuration (voices.json)

The voice system uses a centralized JSON configuration file for voice naming and metadata (primarily for reference):

**Location:** `${PAI_DIR}/voice-server/voices.json`

**Structure:**
```json
{
  "default_rate": 175,
  "voices": {
    "kai": {
      "voice_name": "Jamie (Premium)",
      "rate_multiplier": 1.3,
      "rate_wpm": 228,
      "description": "UK Male - Professional, conversational",
      "type": "Premium"
    },
    "researcher": {
      "voice_name": "Ava (Premium)",
      "rate_multiplier": 1.35,
      "rate_wpm": 236,
      "description": "US Female - Analytical, highest quality",
      "type": "Premium"
    }
  }
}
```

**Note:** The `voices.json` file is primarily for reference and naming conventions. The actual voice IDs used by ElevenLabs are hardcoded in the hook files (stop-hook.ts and subagent-stop-hook.ts).

### Environment Variables (in ~/.env)

**Required:**
```bash
ELEVENLABS_API_KEY=your_api_key_here
```

**Optional:**
```bash
PORT="8888"  # Optional, defaults to 8888
ELEVENLABS_VOICE_ID="s3TPKV1kjDlVtZbl4Ksh"  # Optional, Kai's default voice
```

Get your free API key at [elevenlabs.io](https://elevenlabs.io) (10,000 characters/month free tier available).

### Server API

#### POST /notify
Main endpoint for voice notifications.

**Request Format:**
```json
{
  "message": "Text to speak",
  "voice_id": "s3TPKV1kjDlVtZbl4Ksh",
  "title": "Optional notification title",
  "voice_enabled": true
}
```

**Field Requirements:**
- `message` (required): The text to be spoken
- `voice_id` (optional): ElevenLabs voice ID (defaults to Kai's voice if not specified)
- `title` (optional): Visual notification title
- `voice_enabled` (optional): Set to false to skip voice output

**Response:**
```json
{
  "status": "success",
  "message": "Notification sent"
}
```

#### POST /pai
Simplified endpoint for PAI system messages.

**Request Format:**
```json
{
  "title": "PAI System",
  "message": "System message"
}
```

Uses Kai's default voice (s3TPKV1kjDlVtZbl4Ksh).

#### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "port": 8888,
  "voice_system": "ElevenLabs",
  "default_voice_id": "s3TPKV1kjDlVtZbl4Ksh",
  "api_key_configured": true
}
```

## Agent Voice Configuration

### Hook Configuration
Voice mappings are defined in the stop hook files:

**Main Agent (Kai):** `${PAI_DIR}/hooks/stop-hook.ts`
```typescript
voice_id: 's3TPKV1kjDlVtZbl4Ksh'  // Kai's ElevenLabs voice ID
```

**Subagents:** `${PAI_DIR}/hooks/subagent-stop-hook.ts`
```typescript
const ELEVENLABS_VOICE_IDS: Record<string, string> = {
  'kai': 's3TPKV1kjDlVtZbl4Ksh',
  'writer': 'gfRt6Z3Z8aTbpLfexQ7N',
  'engineer': 'fATgBRI8wg5KkDFg8vBd',
  'principal-engineer': 'iLVmqjzCGGvqtMCk6vVQ',
  'designer': 'ZF6FPAbjXT4488VcRRnw',
  'artist': 'ZF6FPAbjXT4488VcRRnw',
  'perplexity-researcher': 'AXdMgz6evoL7OPd7eU12',
  'claude-researcher': 'AXdMgz6evoL7OPd7eU12',
  'researcher': 'AXdMgz6evoL7OPd7eU12',
  'pentester': 'xvHLFjaUEpx4BOf7EiDd',
  'architect': 'muZKMsIDGYtIkjjiUS82',
};
```

### Voice Selection Criteria

Voices are selected based on:
1. **Personality Match**: Voice characteristics match agent role
2. **Voice Variety**: Different ElevenLabs voices for distinction
3. **Consistency**: Same voice ID for similar agent types

## COMPLETED Line Formatting

### Required Format
Every response from Kai or an agent must end with:

```
🎯 COMPLETED: [brief description of accomplishment]
```

### Examples
```
🎯 COMPLETED: Updated website navigation structure
🎯 COMPLETED: Researched competitor pricing models thoroughly
🎯 COMPLETED: Fixed authentication bug in login flow
🎯 COMPLETED: Designed mobile-responsive dashboard layout
```

### Custom Voice Messages (Optional)
For short responses, add a voice-optimized version:

```
🎯 COMPLETED: Sent email to Angela about meeting
🗣️ CUSTOM COMPLETED: Email sent
```

The CUSTOM COMPLETED line is used if:
- It exists
- It's under 8 words
- Otherwise, falls back to regular COMPLETED

## Troubleshooting

### Voice Not Working
1. Check voice server is running:
   ```bash
   curl http://localhost:8888/health
   ```

2. Verify ElevenLabs API key is configured:
   ```bash
   grep ELEVENLABS_API_KEY ~/.env
   ```

3. Test voice directly:
   ```bash
   curl -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message":"Testing voice","voice_id":"s3TPKV1kjDlVtZbl4Ksh"}'
   ```

### Voice Server Not Running
Start the server:
```bash
cd ${PAI_DIR}/voice-server
bun server.ts &
```

Or restart it:
```bash
lsof -ti:8888 | xargs kill -9
cd ${PAI_DIR}/voice-server
bun server.ts &
```

### Wrong Voice Playing
1. Check stop-hook voice mappings:
   ```bash
   grep "ELEVENLABS_VOICE_IDS" ${PAI_DIR}/hooks/subagent-stop-hook.ts
   ```

2. Verify voice_id in hook file:
   ```bash
   grep "voice_id.*s3TPKV1kjDlVtZbl4Ksh" ${PAI_DIR}/hooks/stop-hook.ts
   ```

### No COMPLETED Line in Output
The voice system requires the `🎯 COMPLETED:` line. Ensure:
- Line is present at end of response
- Exact format: `🎯 COMPLETED: [description]`
- No typos in emoji or text

### ElevenLabs API Errors
1. **401 Unauthorized**: Invalid API key - check ~/.env
2. **429 Too Many Requests**: Rate limit exceeded - wait or upgrade plan
3. **Quota Exceeded**: Monthly character limit reached - upgrade plan or wait for reset

## Development

### Testing Individual Voices
```bash
# Test Kai's voice
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message":"Testing Kai voice","voice_id":"s3TPKV1kjDlVtZbl4Ksh"}'

# Test Perplexity-Researcher voice
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message":"Testing Perplexity-Researcher voice","voice_id":"AXdMgz6evoL7OPd7eU12"}'

# Test Engineer voice
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message":"Testing Engineer voice","voice_id":"fATgBRI8wg5KkDFg8vBd"}'
```

### Adding New Voices

1. Get an ElevenLabs voice ID from [elevenlabs.io](https://elevenlabs.io)
2. Update subagent-stop-hook.ts:
   ```typescript
   const ELEVENLABS_VOICE_IDS: Record<string, string> = {
     // ... existing voices ...
     'newagent': 'your_elevenlabs_voice_id_here',
   };
   ```

3. Optionally update voices.json for reference:
   ```json
   {
     "voices": {
       "newagent": {
         "voice_name": "NewVoice Name",
         "rate_multiplier": 1.35,
         "rate_wpm": 236,
         "description": "Description of voice",
         "type": "Premium"
       }
     }
   }
   ```

4. Test the new voice configuration

## Security & Privacy

- Voice processing happens via ElevenLabs API (cloud service)
- Audio data sent to ElevenLabs servers for TTS generation
- API key required (stored in ~/.env)
- CORS restricted to localhost only
- Rate limiting enabled (10 requests/minute)
- Temporary audio files stored in /tmp and cleaned up after playback
- Keep your ELEVENLABS_API_KEY secure and never commit to public repos

## System Requirements

- macOS (for afplay audio playback)
- Claude Code CLI
- Bun runtime (for voice server)
- ElevenLabs API key
- Internet connection (for API calls)

## Performance

- Voice generation: ~500ms-2s (API call + network latency)
- Audio playback: Immediate after generation
- Monthly quota: 10,000 characters (free tier) or more (paid plans)
- Rate limits: Per ElevenLabs plan

## Summary

The PAI Voice System provides:
- ✅ High-quality neural TTS using ElevenLabs API
- ✅ Distinct voices for Kai and each agent
- ✅ Professional voice quality
- ✅ Natural voice variety (via different ElevenLabs voices)
- ✅ Simple integration via stop-hook
- ✅ Automatic voice notifications for all completions
- ⚠️ Requires API key and internet connection
- ⚠️ Subject to ElevenLabs usage limits and pricing

Voice makes Kai and agents feel more alive and engaging!

## Recent Changes (2025-10-19)

- ✏️ `voice-server/README.md` (modified)
  - +249 / -245 lines
- ✏️ `voice-server/voices.json` (modified)
  - +13 / -6 lines

---
<!-- Last Updated: 2025-10-19 -->
