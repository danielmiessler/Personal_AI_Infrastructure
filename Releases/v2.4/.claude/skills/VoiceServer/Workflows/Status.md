# Check Voice Server Status

Check if the voice server is running and responding.

## Steps

1. **Check process:**
```bash
~/.claude/VoiceServer/status.sh
```

2. **Test endpoint:**
```bash
curl -s http://localhost:8888/health
```

3. **Send test notification:**
```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message":"Voice server test","voice_id":"{daidentity.voiceId}","title":"Test"}'
```

## Troubleshooting

**Server not running:**
```bash
~/.claude/VoiceServer/start.sh
```

**Port conflict:**
```bash
lsof -i :8888
~/.claude/VoiceServer/stop.sh
~/.claude/VoiceServer/start.sh
```

**Check logs:**
```bash
tail -50 ~/.claude/VoiceServer/logs/server.log
```
