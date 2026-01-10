# Kai Observability Server - Verification Checklist

## Mandatory Completion Checklist

**IMPORTANT:** All items must be verified before considering this pack installed.

### Directory Structure

- [ ] `$PAI_DIR/observability/` directory exists
- [ ] `$PAI_DIR/observability/apps/server/src/` directory exists
- [ ] `$PAI_DIR/observability/apps/client/src/` directory exists
- [ ] `$PAI_DIR/hooks/lib/` directory exists
- [ ] `$PAI_DIR/history/raw-outputs/` directory exists

### Core Files

- [ ] `$PAI_DIR/hooks/lib/metadata-extraction.ts` exists
- [ ] `$PAI_DIR/hooks/capture-all-events.ts` exists
- [ ] `$PAI_DIR/observability/apps/server/src/index.ts` exists
- [ ] `$PAI_DIR/observability/apps/server/src/file-ingest.ts` exists
- [ ] `$PAI_DIR/observability/apps/server/src/types.ts` exists
- [ ] `$PAI_DIR/observability/apps/server/package.json` exists
- [ ] `$PAI_DIR/observability/apps/client/src/App.vue` exists
- [ ] `$PAI_DIR/observability/apps/client/package.json` exists
- [ ] `$PAI_DIR/observability/manage.sh` exists and is executable

### Dependencies

- [ ] Server dependencies installed (`$PAI_DIR/observability/apps/server/node_modules/` exists)
- [ ] Client dependencies installed (`$PAI_DIR/observability/apps/client/node_modules/` exists)

### Hook Registration

- [ ] Capture hooks registered in `~/.claude/settings.json`

---

## Functional Tests

### Test 1: Verify Directory Structure

```bash
ls -la $PAI_DIR/observability/
# Expected: manage.sh, apps/

ls -la $PAI_DIR/observability/apps/server/src/
# Expected: index.ts, file-ingest.ts, types.ts

ls -la $PAI_DIR/observability/apps/client/src/
# Expected: App.vue, main.ts, style.css
```

### Test 2: Start Server

```bash
$PAI_DIR/observability/manage.sh start
# Expected: "Observability running at http://localhost:5172"
```

### Test 3: Health Check

```bash
curl http://localhost:4000/health
# Expected: {"status":"ok","timestamp":...}
```

### Test 4: WebSocket Connection

```bash
# In browser developer tools console at http://localhost:5172:
# Should show "Connected to observability server" in console
```

### Test 5: Event Capture

```bash
# Use Claude Code to run a command
# Check if events file was created
ls -la $PAI_DIR/history/raw-outputs/$(date +%Y-%m)/
# Expected: YYYY-MM-DD_all-events.jsonl
```

### Test 6: Stop Server

```bash
$PAI_DIR/observability/manage.sh stop
# Expected: "Observability stopped"

curl http://localhost:4000/health
# Expected: Connection refused
```

### Test 7: Check Hook Registration

```bash
grep -A 2 "capture-all-events" ~/.claude/settings.json
# Expected: Shows hook configuration
```

---

## Integration Tests

### Test A: Real-Time Event Streaming

1. Start observability: `$PAI_DIR/observability/manage.sh start`
2. Open http://localhost:5172 in browser
3. In Claude Code, run a Bash command
4. Watch dashboard - event should appear within 1 second
5. Verify event shows tool name and command

### Test B: Multi-Agent Tracking

1. With observability running
2. In Claude Code, spawn a subagent with Task tool
3. Watch dashboard - should show agent name change
4. Subagent events should be labeled with agent type

### Test C: Graceful Degradation

```bash
# Stop the server
$PAI_DIR/observability/manage.sh stop

# In Claude Code, run some commands
# Should complete without errors (hooks just write to file)

# Start server again
$PAI_DIR/observability/manage.sh start

# Dashboard should load (won't show old events, starts fresh)
```

### Test D: Detached Mode

```bash
# Start in background
$PAI_DIR/observability/manage.sh start-detached

# Verify it's running
$PAI_DIR/observability/manage.sh status
# Expected: "Running at http://localhost:5172"

# Stop
$PAI_DIR/observability/manage.sh stop
```

---

## Quick Verification Script

```bash
#!/bin/bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

echo "=== Kai Observability Server Verification ==="
echo ""

# Check directories
for dir in "observability" "observability/apps/server/src" "observability/apps/client/src" "hooks/lib" "history/raw-outputs"; do
  if [ -d "$PAI_CHECK/$dir" ]; then
    echo "✓ $dir/"
  else
    echo "❌ $dir/ MISSING"
  fi
done

echo ""

# Check files
for file in "observability/manage.sh" "observability/apps/server/src/index.ts" "observability/apps/client/src/App.vue" "hooks/capture-all-events.ts" "hooks/lib/metadata-extraction.ts"; do
  if [ -f "$PAI_CHECK/$file" ]; then
    echo "✓ $file"
  else
    echo "❌ $file MISSING"
  fi
done

echo ""

# Check executable
if [ -x "$PAI_CHECK/observability/manage.sh" ]; then
  echo "✓ manage.sh is executable"
else
  echo "❌ manage.sh NOT executable"
fi

echo ""

# Check node_modules
if [ -d "$PAI_CHECK/observability/apps/server/node_modules" ]; then
  echo "✓ Server dependencies installed"
else
  echo "❌ Server dependencies NOT installed"
fi

if [ -d "$PAI_CHECK/observability/apps/client/node_modules" ]; then
  echo "✓ Client dependencies installed"
else
  echo "❌ Client dependencies NOT installed"
fi

echo ""

# Check if running
if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "✓ Server running on port 4000"
else
  echo "❌ Server NOT running"
fi

if lsof -Pi :5172 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "✓ Client running on port 5172"
else
  echo "❌ Client NOT running"
fi

echo ""
echo "=== Verification Complete ==="
```

---

## Success Criteria

Installation is complete when:

1. All directory structure items are checked
2. All core files are present
3. Dependencies are installed for both server and client
4. Hooks are registered in settings.json
5. Server starts without errors
6. Health check returns OK
7. Dashboard loads in browser
8. Events appear when using Claude Code
