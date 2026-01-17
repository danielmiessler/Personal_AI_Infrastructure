# PAI Voice System - Verification Checklist

Run through this checklist to verify your installation is complete and working.

---

## Required Checks

### 1. Server Files Exist

```bash
ls -la ~/.claude/VoiceServer/server.ts
ls -la ~/.claude/VoiceServer/voices.json
ls -la ~/.claude/VoiceServer/*.sh
```

**Expected:** All files present with appropriate permissions

- [ ] `server.ts` exists
- [ ] `voices.json` exists
- [ ] Scripts (`start.sh`, `stop.sh`, `restart.sh`, `status.sh`) exist and are executable

---

### 2. Service is Running

```bash
launchctl list | grep pai.voice
```

**Expected:** Shows service with a PID (not `-`)

```
12345   0   com.pai.voice-server
```

- [ ] Service is listed
- [ ] PID is a number (not `-`)

---

### 3. Server Responds to Health Check

```bash
curl -s http://localhost:8888/health
```

**Expected:**
```json
{
  "status": "healthy",
  "port": 8888,
  "voice_system": "ElevenLabs",
  "default_voice_id": "...",
  "api_key_configured": true
}
```

- [ ] Status is "healthy"
- [ ] Port is 8888
- [ ] `api_key_configured` is `true` (or `false` if using fallback)

---

### 4. Voice Output Works

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Verification test successful"}'
```

**Expected:** You should HEAR the message spoken aloud

- [ ] Audio played successfully
- [ ] macOS notification appeared

---

### 5. Port is Bound Correctly

```bash
lsof -i :8888
```

**Expected:** Shows bun process listening

```
COMMAND   PID USER   FD   TYPE  DEVICE SIZE/OFF NODE NAME
bun     12345 user   11u  IPv4 0x...   0t0  TCP localhost:8888 (LISTEN)
```

- [ ] Port 8888 is bound
- [ ] Process is `bun`

---

## Optional Checks

### 6. ElevenLabs API Key (If Using AI Voices)

```bash
grep ELEVENLABS_API_KEY ~/.env
```

**Expected:** Key is present and not placeholder

- [ ] API key exists in `~/.env`
- [ ] API key is not "your_api_key_here"

---

### 7. Menu Bar Indicator (If Installed)

Look in your macOS menu bar for the microphone icon.

**Expected:**
- Colored microphone icon (server running)
- Gray microphone icon (server stopped)

- [ ] Menu bar icon visible
- [ ] Clicking shows status menu

---

### 8. Logs are Being Written

```bash
tail -5 ~/Library/Logs/pai-voice-server.log
```

**Expected:** Recent log entries

- [ ] Log file exists
- [ ] Recent timestamps in logs

---

## Quick Verification Script

Run this all-in-one check:

```bash
echo "=== PAI Voice System Verification ==="
echo ""

# Check 1: Files
echo "1. Checking files..."
[ -f ~/.claude/VoiceServer/server.ts ] && echo "   [PASS] server.ts" || echo "   [FAIL] server.ts missing"
[ -f ~/.claude/VoiceServer/voices.json ] && echo "   [PASS] voices.json" || echo "   [FAIL] voices.json missing"
[ -x ~/.claude/VoiceServer/start.sh ] && echo "   [PASS] start.sh executable" || echo "   [FAIL] start.sh not executable"

# Check 2: Service
echo ""
echo "2. Checking service..."
if launchctl list 2>/dev/null | grep -q "com.pai.voice-server"; then
  echo "   [PASS] Service loaded"
else
  echo "   [FAIL] Service not loaded"
fi

# Check 3: Health
echo ""
echo "3. Checking health endpoint..."
HEALTH=$(curl -s http://localhost:8888/health 2>/dev/null)
if echo "$HEALTH" | grep -q '"status":"healthy"'; then
  echo "   [PASS] Server healthy"
else
  echo "   [FAIL] Server not responding"
fi

# Check 4: Port
echo ""
echo "4. Checking port 8888..."
if lsof -i :8888 > /dev/null 2>&1; then
  echo "   [PASS] Port 8888 in use"
else
  echo "   [FAIL] Port 8888 not bound"
fi

echo ""
echo "=== Verification Complete ==="
```

---

## Troubleshooting Failed Checks

| Check | If Failed | Solution |
|-------|-----------|----------|
| Files missing | Pack not copied | Re-run `cp -r src/VoiceServer/* ~/.claude/VoiceServer/` |
| Service not loaded | LaunchAgent issue | Run `./install.sh` again |
| Server unhealthy | Crashed or not started | Run `./restart.sh` |
| Port not bound | Another process using 8888 | Kill with `lsof -ti :8888 | xargs kill -9` |
| No audio | API key issue or volume | Check `~/.env` and system volume |

---

## Success Criteria

**All required checks must pass:**

- [ ] Server files exist
- [ ] Service is running
- [ ] Health check returns healthy
- [ ] Voice output works (you hear audio)
- [ ] Port 8888 is bound

**Installation is complete when you can run:**

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "PAI Voice System ready"}'
```

...and **hear the message spoken aloud**.
