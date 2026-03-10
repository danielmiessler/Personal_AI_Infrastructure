# Qwen3-TTS Voice Server

Local AI voice generation with natural language voice design.

## Quick Start

```bash
# Install
./install.sh

# Start
./start.sh

# Check status
./status.sh
```

## API Endpoints

### Voice Design (The Fun Part)

**Quick Test** - Describe a voice and hear it immediately:
```bash
curl -X POST http://localhost:8889/voice/test \
  -H "Content-Type: application/json" \
  -d '{
    "description": "An excited scientist who just made a discovery",
    "text": "Eureka! The experiment worked!"
  }'
```

**Design and Save** - Create a voice for later use:
```bash
curl -X POST http://localhost:8889/voice/design \
  -H "Content-Type: application/json" \
  -d '{
    "description": "A warm, enthusiastic British male voice with curious energy",
    "sample_text": "Hello! I am excited to help you today.",
    "name": "kai",
    "save": true
  }'
```

### Notifications (Compatible with ElevenLabs VoiceServer)

```bash
curl -X POST http://localhost:8889/notify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Task complete!",
    "voice_name": "kai"
  }'
```

### Voice Library

```bash
# List saved voices
curl http://localhost:8889/voices

# Preview a voice
curl -X POST "http://localhost:8889/voices/kai/preview?text=Hello there"

# Delete a voice
curl -X DELETE http://localhost:8889/voices/kai
```

### Health Check

```bash
curl http://localhost:8889/health
```

## Voice Design Examples

| Personality | Description |
|-------------|-------------|
| Kai | "A warm, enthusiastic British male voice. Genuinely excited to help, with animated energy like an eager buddy who just figured something out." |
| Detective | "A gravelly, world-weary voice. Speaks slowly and deliberately, as if everything is slightly exhausting." |
| Scientist | "An excited, rapid-fire voice bubbling with curiosity. Gets faster when explaining something fascinating." |
| Butler | "A dignified British butler voice with subtle judgmental undertones. Impeccably polite but somehow condescending." |

## Configuration

Environment variables (prefix with `QWEN3_`):
- `QWEN3_PORT` - Server port (default: 8889)
- `QWEN3_MODEL_SIZE` - Model size: "1.7B" or "0.6B" (default: 1.7B)

## Notes

- First request downloads the model (~7GB) - takes several minutes
- Model loading on startup takes 10-30 seconds
- Requires NVIDIA GPU with CUDA (8-16GB VRAM depending on model)
- Port 8889 (ElevenLabs VoiceServer uses 8888)
