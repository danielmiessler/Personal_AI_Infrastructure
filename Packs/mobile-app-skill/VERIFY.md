# Mobile App Skill - Verification Checklist

This checklist MUST be completed before marking installation as done. It validates that all components are properly installed and functional.

---

## ✅ File Verification

Verify all essential files are present:

```bash
SKILL_DIR=~/.claude/skills/MobileApp

# Core files
[ -f "$SKILL_DIR/SKILL.md" ] && echo "✅ SKILL.md" || echo "❌ SKILL.md missing"
[ -x "$SKILL_DIR/manage.sh" ] && echo "✅ manage.sh (executable)" || echo "❌ manage.sh missing or not executable"
[ -x "$SKILL_DIR/service-wrapper.sh" ] && echo "✅ service-wrapper.sh (executable)" || echo "❌ service-wrapper.sh missing"

# Server files
[ -f "$SKILL_DIR/apps/server/package.json" ] && echo "✅ Server package.json" || echo "❌ Server package.json missing"
[ -f "$SKILL_DIR/apps/server/src/index.ts" ] && echo "✅ Server index.ts" || echo "❌ Server index.ts missing"
[ -d "$SKILL_DIR/apps/server/node_modules" ] && echo "✅ Server dependencies installed" || echo "❌ Server node_modules missing"

# Server routes
[ -f "$SKILL_DIR/apps/server/src/routes/files.ts" ] && echo "✅ Files route" || echo "❌ Files route missing"
[ -f "$SKILL_DIR/apps/server/src/routes/knowledge.ts" ] && echo "✅ Knowledge route" || echo "❌ Knowledge route missing"
[ -f "$SKILL_DIR/apps/server/src/routes/todo.ts" ] && echo "✅ Todo route" || echo "❌ Todo route missing"
[ -f "$SKILL_DIR/apps/server/src/routes/terminal.ts" ] && echo "✅ Terminal route" || echo "❌ Terminal route missing"

# Server services
[ -f "$SKILL_DIR/apps/server/src/services/claude-code.ts" ] && echo "✅ Claude Code service" || echo "❌ Claude Code service missing"
[ -f "$SKILL_DIR/apps/server/src/services/file-system.ts" ] && echo "✅ File system service" || echo "❌ File system service missing"
[ -f "$SKILL_DIR/apps/server/src/services/wiki-links.ts" ] && echo "✅ Wiki links service" || echo "❌ Wiki links service missing"

# Client files
[ -f "$SKILL_DIR/apps/client/package.json" ] && echo "✅ Client package.json" || echo "❌ Client package.json missing"
[ -f "$SKILL_DIR/apps/client/src/App.vue" ] && echo "✅ Client App.vue" || echo "❌ Client App.vue missing"
[ -d "$SKILL_DIR/apps/client/node_modules" ] && echo "✅ Client dependencies installed" || echo "❌ Client node_modules missing"
[ -d "$SKILL_DIR/apps/client/dist" ] && echo "✅ Client built (dist/ exists)" || echo "❌ Client not built"

# Client components
[ -f "$SKILL_DIR/apps/client/src/components/chat/ChatView.vue" ] && echo "✅ Chat component" || echo "❌ Chat component missing"
[ -f "$SKILL_DIR/apps/client/src/components/files/FilesView.vue" ] && echo "✅ Files component" || echo "❌ Files component missing"
[ -f "$SKILL_DIR/apps/client/src/components/knowledge/KnowledgeView.vue" ] && echo "✅ Knowledge component" || echo "❌ Knowledge component missing"
[ -f "$SKILL_DIR/apps/client/src/components/todo/TodoView.vue" ] && echo "✅ Todo component" || echo "❌ Todo component missing"

# Service files (macOS)
[ -f "$SKILL_DIR/com.pai.mobile.plist" ] && echo "✅ Launchd plist" || echo "❌ Launchd plist missing"
```

---

## 🔧 Service Testing

Verify the service management system works:

```bash
cd ~/.claude/skills/MobileApp

# Test service status
./manage.sh service status
# Expected: Should show service status (loaded/running or not loaded)

# Test server status
./manage.sh status
# Expected: Should show "Server is running" with PID or "Server is not running"

# Check if service is enabled
launchctl list | grep com.pai.mobile
# Expected: Should show entry with PID if running

# Verify port is listening
lsof -i :5050
# Expected: Should show bun process listening on port 5050
```

---

## 🚀 Functional Validation

Test actual functionality:

### Test 1: Server Accessibility

```bash
# Test server responds to HTTP requests
curl -s http://localhost:5050 | head -20
# Expected: Should return HTML content (client index.html)
```

**Expected Output**: HTML content starting with `<!DOCTYPE html>`

**Pass Criteria**: HTTP 200 response with valid HTML

---

### Test 2: API Endpoints

```bash
# Test files API
curl -s "http://localhost:5050/api/files/list?path=$HOME" | head -20
# Expected: JSON array of files in home directory

# Test health check (if exists)
curl -s http://localhost:5050/api/health
# Expected: JSON with status: "ok"
```

**Expected Output**: Valid JSON responses

**Pass Criteria**: APIs return expected JSON structures without errors

---

### Test 3: WebSocket Connection

```bash
# Test WebSocket endpoint is accessible
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" \
  http://localhost:5050/chat
# Expected: HTTP 101 Switching Protocols or WebSocket handshake response
```

**Expected Output**: WebSocket upgrade response or appropriate error

**Pass Criteria**: Server handles WebSocket upgrade request

---

### Test 4: Client Assets Built

```bash
# Verify client build output
ls -lh ~/.claude/skills/MobileApp/apps/client/dist/
# Expected: Should show index.html, assets/ directory, and PWA manifest

# Check index.html exists and has content
cat ~/.claude/skills/MobileApp/apps/client/dist/index.html | head -10
# Expected: Valid HTML with script tags for Vue app
```

**Expected Output**: Built client assets present with reasonable file sizes

**Pass Criteria**: dist/ directory contains complete build artifacts

---

### Test 5: Restart Functionality

```bash
# Test clean restart
cd ~/.claude/skills/MobileApp
./manage.sh restart

# Wait 2 seconds
sleep 2

# Verify server came back up
./manage.sh status
# Expected: Server is running with new PID

# Test it still responds
curl -s http://localhost:5050 > /dev/null && echo "✅ Server responds after restart" || echo "❌ Server not responding"
```

**Pass Criteria**: Server restarts cleanly and resumes operation

---

### Test 6: Mobile Access (If Tailscale Configured)

```bash
# Get Tailscale IP
TAILSCALE_IP=$(tailscale ip -4)
echo "Tailscale IP: $TAILSCALE_IP"

# Test access via Tailscale IP
curl -s "http://$TAILSCALE_IP:5050" | head -20
# Expected: Same HTML content as localhost test
```

**Expected Output**: Accessible from Tailscale IP

**Pass Criteria**: Server responds to requests from Tailscale network

---

## 🤖 Automated Verification Script

Run all checks automatically:

```bash
#!/bin/bash

SKILL_DIR=~/.claude/skills/MobileApp
PASS=0
FAIL=0

echo "======================================"
echo "Mobile App Skill - Automated Verification"
echo "======================================"
echo ""

# File checks
echo "📁 File Verification:"
FILES=(
  "SKILL.md"
  "manage.sh"
  "service-wrapper.sh"
  "apps/server/src/index.ts"
  "apps/client/src/App.vue"
  "apps/client/dist/index.html"
)

for file in "${FILES[@]}"; do
  if [ -f "$SKILL_DIR/$file" ]; then
    echo "  ✅ $file"
    ((PASS++))
  else
    echo "  ❌ $file"
    ((FAIL++))
  fi
done

echo ""
echo "🔧 Service Verification:"

# Service status check
cd "$SKILL_DIR"
if ./manage.sh status | grep -q "running"; then
  echo "  ✅ Server is running"
  ((PASS++))
else
  echo "  ❌ Server is not running"
  ((FAIL++))
fi

# Port check
if lsof -i :5050 > /dev/null 2>&1; then
  echo "  ✅ Port 5050 is listening"
  ((PASS++))
else
  echo "  ❌ Port 5050 is not listening"
  ((FAIL++))
fi

echo ""
echo "🌐 HTTP Verification:"

# HTTP endpoint check
if curl -s -f http://localhost:5050 > /dev/null 2>&1; then
  echo "  ✅ Server responds to HTTP requests"
  ((PASS++))
else
  echo "  ❌ Server does not respond"
  ((FAIL++))
fi

# API endpoint check
if curl -s -f "http://localhost:5050/api/files/list?path=$HOME" > /dev/null 2>&1; then
  echo "  ✅ Files API responds"
  ((PASS++))
else
  echo "  ❌ Files API does not respond"
  ((FAIL++))
fi

echo ""
echo "======================================"
echo "Results: $PASS passed, $FAIL failed"
echo "======================================"

if [ $FAIL -eq 0 ]; then
  echo "✅ All verification checks passed!"
  exit 0
else
  echo "❌ Some verification checks failed. See details above."
  exit 1
fi
```

**To run:** Save as `verify.sh`, make executable with `chmod +x verify.sh`, then run `./verify.sh`

---

## 📊 Expected Results Summary

| Check | Expected Result |
|-------|----------------|
| Core files present | All SKILL.md, manage.sh, source files exist |
| Dependencies installed | node_modules in both server and client |
| Client built | dist/ directory with index.html and assets |
| Service running | launchctl shows com.pai.mobile loaded |
| Server running | ./manage.sh status shows PID |
| Port open | lsof shows port 5050 listening |
| HTTP response | curl localhost:5050 returns HTML |
| API response | curl /api/files/list returns JSON |
| Restart works | Server comes back after ./manage.sh restart |

---

## 🔍 Troubleshooting Failed Checks

### ❌ SKILL.md or core files missing

**Cause**: Installation didn't copy files correctly

**Solution**:
```bash
# Re-copy files from pack
cp -r /path/to/pack/src/* ~/.claude/skills/MobileApp/
```

---

### ❌ Server dependencies missing

**Cause**: `bun install` wasn't run or failed

**Solution**:
```bash
cd ~/.claude/skills/MobileApp/apps/server
rm -rf node_modules
bun install
```

---

### ❌ Client not built (dist/ missing)

**Cause**: Build step wasn't executed

**Solution**:
```bash
cd ~/.claude/skills/MobileApp
./manage.sh build
```

---

### ❌ Server not running

**Cause**: Service failed to start or crashed

**Solution**:
```bash
# Check logs
./manage.sh service logs

# Try manual start to see errors
cd apps/server
bun run src/index.ts

# Common issues:
# - Port 5050 already in use (kill other process)
# - Missing dependencies (run bun install)
# - Permission errors (check file ownership)
```

---

### ❌ Port 5050 not listening

**Cause**: Server started but not binding to port

**Solution**:
```bash
# Check if another process is using port
lsof -i :5050

# Kill conflicting process
kill <PID>

# Restart Mobile App server
./manage.sh restart
```

---

### ❌ HTTP endpoints not responding

**Cause**: Server started but API routes not initialized

**Solution**:
```bash
# Check server logs
cat ~/.claude/skills/MobileApp/server.log

# Verify all route files exist
ls -la apps/server/src/routes/

# Restart server
./manage.sh restart
```

---

### ❌ Launchd service not loaded

**Cause**: Service installation failed

**Solution**:
```bash
# Reinstall service
./manage.sh service uninstall
./manage.sh service install

# Check system logs
log show --predicate 'process == "com.pai.mobile"' --last 10m

# Verify plist is valid
plutil -lint ~/Library/LaunchAgents/com.pai.mobile.plist
```

---

## ✅ Final Verification Checklist

Before considering installation complete, confirm:

- [ ] All file checks pass (12+ files present)
- [ ] Service is loaded in launchctl
- [ ] Server is running with valid PID
- [ ] Port 5050 is listening
- [ ] HTTP request returns HTML
- [ ] Files API returns JSON
- [ ] Server can restart cleanly
- [ ] Logs show no critical errors
- [ ] (Optional) Accessible via Tailscale IP from mobile

**If all checks pass**: ✅ Installation verified and ready to use!

**If any check fails**: 🔧 Review troubleshooting section for that specific check.

---

## 🆘 Still Having Issues?

1. **Review logs**: `./manage.sh service logs` and `cat server.log`
2. **Check INSTALL.md**: Ensure all installation steps completed
3. **Manual restart**: `./manage.sh stop && ./manage.sh start`
4. **Reinstall dependencies**: `./manage.sh install`
5. **Check system resources**: `top` to see if system is overloaded
6. **File permissions**: `ls -la ~/.claude/skills/MobileApp` to check ownership

If problems persist, document the specific failing check and error messages for support.
