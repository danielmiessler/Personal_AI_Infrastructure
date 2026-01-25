# Check PAI State

A diagnostic workflow for assessing your PAI installation health, identifying issues, and getting recommendations for improvements.

---

## What This Does

When you run this check, your DA will:

1. **Inventory installed packs** — Identify which PAI packs are currently installed in your system
2. **Verify basic functionality** — Test that core systems (hooks, history, skills) are working
3. **Detect issues** — Find packs that may be broken, misconfigured, or missing dependencies
4. **Compare to latest** — Show what's available in the Kai bundle vs what you have
5. **Recommend improvements** — Suggest tweaks, fixes, and new packs worth installing

---

## How to Use

Give this file to your DA and say:

```
Check my PAI state and give me recommendations.
```

Your DA will run through the diagnostic steps below and report back.

---

## Diagnostic Steps

### Step 1: Identify PAI Installation Location

Check for PAI infrastructure in common locations:

```bash
# Check for PAI directory
ls -la ~/.pai/ 2>/dev/null || echo "No ~/.pai/ directory"
ls -la ~/.config/pai/ 2>/dev/null || echo "No ~/.config/pai/ directory"

# Check for Claude Code integration
ls -la ~/.claude/settings.json 2>/dev/null || echo "No Claude Code settings"
```

**Expected:** At least one PAI directory exists with subdirectories for hooks, skills, history, etc.

---

### Step 2: Check Hook System (Foundation)

The hook system is the foundation—everything else depends on it.

```bash
# Check if hooks directory exists
ls -la $PAI_DIR/hooks/ 2>/dev/null

# Check Claude Code settings for hook configuration
cat ~/.claude/settings.json | grep -A 20 '"hooks"'

# Verify capture-all-events hook exists
ls -la $PAI_DIR/hooks/capture-all-events.ts 2>/dev/null
```

**Health indicators:**
- ✅ Hooks directory exists with .ts files
- ✅ Claude Code settings.json has hooks configured
- ✅ capture-all-events.ts is present (if using history system)
- ❌ Missing hooks directory = Hook System pack not installed
- ❌ No hooks in settings.json = Hooks not wired up

---

### Step 3: Check History System

```bash
# Check for history directory structure
ls -la $PAI_DIR/history/ 2>/dev/null

# Check for raw event logs
ls -la $PAI_DIR/history/raw-outputs/ 2>/dev/null

# Check today's event file exists (if system is active)
TODAY=$(date +%Y-%m-%d)
MONTH=$(date +%Y-%m)
ls -la "$PAI_DIR/history/raw-outputs/$MONTH/${TODAY}_all-events.jsonl" 2>/dev/null
```

**Health indicators:**
- ✅ History directory exists with proper structure
- ✅ raw-outputs directory has dated JSONL files
- ✅ Today's event file exists and is being written to
- ❌ Empty or missing = History System not capturing events

---

### Step 4: Check Skill System

```bash
# Check for skills directory
ls -la $PAI_DIR/skills/ 2>/dev/null

# List installed skills
find $PAI_DIR/skills/ -name "SKILL.md" 2>/dev/null

# Check if skills are registered in Claude Code
cat ~/.claude/settings.json | grep -A 5 '"skills"' 2>/dev/null
```

**Health indicators:**
- ✅ Skills directory exists
- ✅ Multiple SKILL.md files present
- ✅ Skills referenced in settings.json
- ❌ No SKILL.md files = No skills installed
- ❌ Skills exist but not in settings = Skills won't be discovered

---

### Step 5: Check Voice System (Optional)

```bash
# Check if voice server is running
curl -s http://localhost:8888/health 2>/dev/null || echo "Voice server not running"

# Check for voice configuration
ls -la $PAI_DIR/voice-server/ 2>/dev/null
```

**Health indicators:**
- ✅ Voice server responds on port 8888
- ✅ ElevenLabs API key configured
- ⚪ Not running = Optional, install if you want voice notifications

---

### Step 6: Check Observability Server (Optional)

```bash
# Check if observability is running
curl -s http://localhost:4000/health 2>/dev/null || echo "Observability server not running"
curl -s http://localhost:5172 2>/dev/null || echo "Observability dashboard not running"

# Check for observability installation
ls -la $PAI_DIR/observability/ 2>/dev/null
```

**Health indicators:**
- ✅ Server responds on port 4000
- ✅ Dashboard accessible on port 5172
- ⚪ Not running = Optional, install if you want agent monitoring

---

### Step 7: Check Identity Configuration (Optional)

```bash
# Check for identity/personality configuration
ls -la $PAI_DIR/skills/CORE/ 2>/dev/null
cat $PAI_DIR/skills/CORE/SKILL.md 2>/dev/null | head -50
```

**Health indicators:**
- ✅ CORE skill exists with identity configuration
- ✅ Response format defined
- ✅ Personality calibration present
- ⚪ Not configured = Using default AI personality

---

## Comparison: Your Installation vs PAI Bundle

### Available Packs in PAI Bundle

| Pack | Version | Purpose | Status |
|------|---------|---------|--------|
| pai-hook-system | 1.0.0 | Event-driven automation foundation | ⬜ Check |
| pai-history-system | 1.0.0 | Automatic context capture and organization | ⬜ Check |
| pai-skill-system | 1.0.0 | Capability routing and dynamic loading | ⬜ Check |
| pai-voice-system | 1.1.0 | Voice notifications with ElevenLabs TTS | ⬜ Check |
| pai-identity | 1.0.0 | Personality, response format, principles | ⬜ Check |
| pai-observability-server | 1.0.0 | Real-time multi-agent monitoring | ⬜ Check |

**Status key:**
- ✅ Installed and working
- ⚠️ Installed but has issues
- ❌ Not installed
- ⬜ Not yet checked

---

## Generating Recommendations

After running diagnostics, your DA should provide:

### 1. Health Summary

```
PAI Health Report
=================
Hook System:        ✅ Working
History System:     ✅ Working
Skill System:       ⚠️ 3 skills found, but routing not configured
Voice System:       ❌ Not installed
Observability:      ❌ Not installed
Identity:           ⚪ Using defaults
```

### 2. Critical Issues (Fix These First)

List any broken functionality that affects core operation:
- Missing dependencies
- Misconfigured hooks
- Broken file permissions
- Missing environment variables

### 3. Recommended Improvements

Based on what's installed and working:
- **Quick wins** — Small tweaks to improve existing functionality
- **Missing pieces** — Packs that would complement your current setup
- **Upgrades available** — Newer versions of installed packs

### 4. Suggested Next Pack

Recommend ONE pack to install next based on:
- What's already working (dependencies met)
- What would add the most value
- Ease of installation

---

## Example Output

```
PAI State Check Complete
========================

INSTALLED (4 packs):
  ✅ pai-hook-system v1.0.0 - Working
  ✅ pai-history-system v1.0.0 - Working
  ✅ pai-skill-system v1.0.0 - Working
  ⚠️ pai-voice-system v1.0.0 - Installed but ElevenLabs key missing

NOT INSTALLED (2 packs):
  ⬜ pai-identity - Would add personality and response format
  ⬜ pai-observability-server - Would add agent monitoring dashboard

ISSUES FOUND:
  1. Voice system missing ELEVENLABS_API_KEY in environment
     → Fix: Add to ~/.claude/.env or disable voice notifications

RECOMMENDATIONS:
  1. [Quick fix] Add ElevenLabs API key to enable voice notifications
  2. [New pack] Consider pai-identity for consistent response formatting
  3. [Optional] pai-observability-server useful if you run multiple agents

SUGGESTED NEXT: pai-identity
  - All dependencies met (hooks, history, skills installed)
  - Adds consistent personality and response format
  - Installation: Give your DA the pai-identity.md pack file
```

---

## Running the Check

To run this diagnostic:

1. Give this file to your DA
2. Set your PAI directory: `PAI_DIR=~/.pai` (or wherever you installed)
3. Say: "Check my PAI state"

Your DA will run through each step, build a health report, and provide actionable recommendations.

---

*Part of the [PAI (Personal AI Infrastructure)](https://github.com/danielmiessler/PAI) project.*
