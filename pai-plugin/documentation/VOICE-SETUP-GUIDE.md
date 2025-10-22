# Complete Voice Setup Guide for PAI

## 🎯 Quick Start (5 Minutes)

This guide will walk you through setting up high-quality, natural-sounding voices for Kai and all your agents. The voices are **completely free**, work **100% offline**, and sound like real people (not robots).

---

## Part 1: Downloading Premium Voices from macOS

### Step 1: Open System Settings

**On macOS 13 (Ventura) and later:**

1. Click the **Apple menu** () in the top-left corner of your screen
2. Click **System Settings** (it has a gear icon ⚙️)
3. In the sidebar on the left, scroll down until you see **Voice (Live Speech)**
4. Click **Voice (Live Speech)**

**What you'll see:**
A window with voice and speech-related settings including spoken content options.

### Step 2: Access Voice Management

1. Look for the **System voice** dropdown menu
   - It should be near the top of the Voice settings panel
   - Shows the currently selected system voice

2. Click on the **System voice** dropdown

**What you'll see:**
A dropdown menu showing currently installed voices.

### Step 3: Download Premium Voices

1. Find the **System voice** dropdown (it's usually near the top)
2. Click on the dropdown - you'll see a list of currently installed voices
3. Look for a button that says either:
   - **"Manage Voices..."** or
   - **"Customize..."**
4. Click that button

**What you'll see:**
A new panel opens showing ALL available voices organized by language. Each voice shows:
- Voice name
- Language/region (like "English (United States)")
- Gender (Male/Female)
- Quality label: **Premium**, **Enhanced**, or nothing (legacy/compact)
- Download size (in MB)
- A download button (cloud icon ↓) if not installed
- A checkmark (✓) if already installed

### Step 4: Download the Core PAI Voices

You need to download **6 specific voices**. Here they are in order:

#### Voice 1: Jamie (Premium) - For Kai
- **Full name:** Jamie
- **Language:** English (United Kingdom)
- **Label:** Premium
- **Gender:** Male
- **Size:** ~120 MB
- **Used for:** Kai (your main assistant)

**How to download:**
1. Scroll to the **English (United Kingdom)** section
2. Find **"Jamie"** with the **(Premium)** label
3. Click the download icon (cloud with ↓ arrow) next to it
4. Wait for the download to complete (progress bar appears)

#### Voice 2: Ava (Premium) - For Researcher
- **Full name:** Ava
- **Language:** English (United States)
- **Label:** Premium
- **Gender:** Female
- **Size:** ~457 MB (⭐ **This is the largest and highest quality!**)
- **Used for:** Researcher agent

**How to download:**
1. Scroll to the **English (United States)** section
2. Find **"Ava"** with the **(Premium)** label
3. Click the download icon
4. **Note:** This is a large file, so it may take 3-5 minutes depending on your internet speed
5. You can continue downloading other voices while this one downloads

#### Voice 3: Serena (Premium) - For Architect
- **Full name:** Serena
- **Language:** English (United Kingdom)
- **Label:** Premium
- **Gender:** Female
- **Size:** ~195 MB
- **Used for:** Architect agent

**How to download:**
1. In the **English (United Kingdom)** section
2. Find **"Serena"** with the **(Premium)** label
3. Click the download icon

#### Voice 4: Isha (Premium) - For Designer
- **Full name:** Isha
- **Language:** English (India)
- **Label:** Premium
- **Gender:** Female
- **Size:** ~117 MB
- **Used for:** Designer agent

**How to download:**
1. Scroll to the **English (India)** section
2. Find **"Isha"** with the **(Premium)** label
3. Click the download icon

#### Voice 5: Tom (Enhanced) - For Engineer
- **Full name:** Tom
- **Language:** English (United States)
- **Label:** Enhanced
- **Gender:** Male
- **Size:** ~392 MB
- **Used for:** Engineer agent

**How to download:**
1. In the **English (United States)** section
2. Find **"Tom"** with the **(Enhanced)** label
3. Click the download icon

#### Voice 6: Oliver (Enhanced) - For Pentester
- **Full name:** Oliver
- **Language:** English (United Kingdom)
- **Label:** Enhanced
- **Gender:** Male
- **Size:** ~127 MB
- **Used for:** Pentester agent

**How to download:**
1. In the **English (United Kingdom)** section
2. Find **"Oliver"** with the **(Enhanced)** label
3. Click the download icon

### Step 5: Wait for All Downloads to Complete

- Downloads happen in the background
- You can close the Manage Voices window and continue using your Mac
- Total download size: ~1.4 GB for all 6 voices
- Total time: 5-15 minutes depending on your internet speed

**Tip:** You can check download progress by reopening the Manage Voices window. Completed downloads show a checkmark (✓).

### Step 6: Verify Installation

Once all downloads are complete, verify they're installed:

1. Open Terminal (Applications → Utilities → Terminal)
2. Run this command:
   ```bash
   say -v '?' | grep "Premium\|Enhanced"
   ```

**Expected output:**
```
Ava (Premium)       en_US    # Hello! My name is Ava.
Isha (Premium)      en_IN    # Hello! My name is Isha.
Jamie (Premium)     en_GB    # Hello! My name is Jamie.
Oliver (Enhanced)   en_GB    # Hello! My name is Oliver.
Serena (Premium)    en_GB    # Hello! My name is Serena.
Tom (Enhanced)      en_US    # Hello! My name is Tom.
```

You should see all 6 voices listed!

---

## Part 2: Testing the Voices

Let's hear each voice to make sure they work and sound great!

### Test Each Voice

Copy and paste these commands into Terminal one at a time:

```bash
# Test Kai's voice (Jamie - UK Male)
say -v "Jamie (Premium)" "Hello, I'm Kai, your personal AI assistant"

# Test Researcher voice (Ava - US Female)
say -v "Ava (Premium)" "I'm the Researcher agent, ready to find information for you"

# Test Engineer voice (Tom - US Male)
say -v "Tom (Enhanced)" "I'm the Engineer agent, ready to build your applications"

# Test Architect voice (Serena - UK Female)
say -v "Serena (Premium)" "I'm the Architect agent, ready to design your systems"

# Test Designer voice (Isha - Indian Female)
say -v "Isha (Premium)" "I'm the Designer agent, ready to create beautiful interfaces"

# Test Pentester voice (Oliver - UK Male)
say -v "Oliver (Enhanced)" "I'm the Pentester agent, ready to test your security"
```

**What you should hear:**
- Each voice should sound natural and human-like
- Clear differences in accent (US, UK, Indian)
- Clear differences in gender and tone
- **NOT robotic** - if a voice sounds robotic, you downloaded the wrong one!

---

## Part 3: Setting Up the Voice Server

### Step 1: Navigate to Voice Server Directory

```bash
cd ~/.claude/voice-server
```

If that doesn't work (directory doesn't exist), the PAI system isn't fully installed yet. Go back to the main PAI installation guide first.

### Step 2: Start the Voice Server

```bash
bun server.ts &
```

**Expected output:**
```
🚀 PAIVoice Server running on port 8888
🎙️  Using macOS native voices (default: Jamie (Premium) - Highest Quality)
📡 POST to http://localhost:8888/notify
🔒 Security: CORS restricted to localhost, rate limiting enabled
```

### Step 3: Verify Server is Running

```bash
curl http://localhost:8888/health
```

**Expected output:**
```json
{
  "status": "healthy",
  "port": 8888,
  "voice_system": "macOS Native",
  "default_voice": "Jamie (Premium)"
}
```

### Step 4: Test Voice Notification

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message":"Voice system is working perfectly","voice_name":"Jamie (Premium)"}'
```

**What should happen:**
- You hear Jamie's voice say "Voice system is working perfectly"
- A macOS notification appears
- Terminal shows: `{"status":"success","message":"Notification sent"}`

---

## Part 4: Understanding the System

### How Voice Selection Works

When you use Kai or ask an agent to do something:

1. They complete the task
2. They respond with a `🎯 COMPLETED:` line at the end
3. The stop-hook intercepts this
4. It determines who completed the task (Kai or which agent)
5. It sends the completion message to the voice server
6. The voice server speaks it using the appropriate voice
7. You hear the completion announcement!

### Voice Personality Matching

| Entity | Voice | Why This Voice? |
|--------|-------|----------------|
| Kai | Jamie (UK Male) | Professional, conversational, trustworthy |
| Researcher | Ava (US Female) | Clear, analytical, highest quality available |
| Engineer | Tom (US Male) | Steady, professional, reliable |
| Architect | Serena (UK Female) | Sophisticated, strategic, thoughtful |
| Designer | Isha (Indian Female) | Creative, distinct, artistic |
| Pentester | Oliver (UK Male) | Technical, sharp, focused |

---

## Troubleshooting

### Problem: Voice Sounds Robotic

**Cause:** You downloaded the wrong voice (Compact/Legacy instead of Premium/Enhanced)

**Solution:**
1. Go back to System Settings → Voice (Live Speech) → Manage Voices
2. Make sure you're downloading voices labeled **(Premium)** or **(Enhanced)**
3. Voices without these labels are old and robotic - don't use them!

### Problem: Voice Not Found

**Error message:** `say: unknown voice`

**Solution:**
1. Verify voice is downloaded:
   ```bash
   say -v '?' | grep "Jamie (Premium)"
   ```
2. If it doesn't appear, download it again from System Settings
3. If it still doesn't work, try logging out and back in

### Problem: No Sound

**Check these:**
1. System volume is not muted
2. Output device is set correctly (System Settings → Sound)
3. Voice server is running (`curl http://localhost:8888/health`)
4. Test directly: `say -v "Jamie (Premium)" "test"`

### Problem: Voice Server Won't Start

**Error:** `Port 8888 already in use`

**Solution:**
```bash
# Kill any existing server on port 8888
lsof -ti:8888 | xargs kill -9

# Start the server again
cd ~/.claude/voice-server
bun server.ts &
```

### Problem: Wrong Voice Playing

**Check the configuration:**
```bash
# Check which voice is mapped to which entity
grep "const VOICES" ~/.claude/hooks/stop-hook.ts

# Check agent configuration
grep "voiceId:" ~/.claude/agents/*.md
```

The voices should match the table in Part 4 above.

---

## Advanced: Customizing Voices

### Want to Use Different Voices?

You can choose any Premium or Enhanced voice! Here's how:

1. Download your preferred voice from System Settings
2. Update the voice mapping in `~/.claude/hooks/stop-hook.ts`:
   ```typescript
   const VOICES = {
     kai: "Jamie (Premium)",        // Change this to your preferred voice
     researcher: "Ava (Premium)",   // Or change any agent voice
     // ... etc
   };
   ```
3. Restart the voice server
4. Test it!

### Available Premium/Enhanced Voices

**US Accents:**
- Ava (Premium, Female) - Highest quality
- Tom (Enhanced, Male)
- Allison (Enhanced, Female)
- Samantha (Enhanced, Female) - Warm and friendly
- Nathan (Enhanced, Male)
- Joelle (Enhanced, Female)
- Nicky (Enhanced, Female)
- Noelle (Enhanced, Female)

**UK Accents:**
- Jamie (Premium, Male)
- Serena (Premium, Female)
- Daniel (Enhanced, Male)
- Kate (Enhanced, Female)
- Oliver (Enhanced, Male)
- Stephanie (Enhanced, Female)

**Indian Accents:**
- Isha (Premium, Female)
- Rishi (Enhanced, Male)
- Sangeeta (Enhanced, Female)
- Veena (Enhanced, Female)

**Other English Accents:**
- Moira (Enhanced, Female) - Irish
- Tessa (Enhanced, Female) - South African

---

## Frequently Asked Questions

**Q: Do these voices cost money?**
A: No! They're completely free and included with macOS.

**Q: Do I need an internet connection?**
A: Only for the initial download. After that, voices work 100% offline forever.

**Q: How much disk space do I need?**
A: About 1.4 GB for the 6 core voices, or 2-4 GB if you download all available Premium/Enhanced voices.

**Q: Can I remove voices I don't use?**
A: Yes! In Manage Voices, click the (-) button next to any voice.

**Q: Will this slow down my Mac?**
A: No. The voice server uses only 20-30 MB of RAM and voice generation is near-instant.

**Q: What if I have an older macOS?**
A: Premium and Enhanced voices require macOS 13.0 (Ventura) or later. On older systems, you're limited to legacy voices which don't sound as good.

**Q: Can I use these voices for other applications?**
A: Yes! Any Mac app that uses the system `say` command can use these voices.

**Q: How do I know if a voice is Premium vs Enhanced?**
A: In the Manage Voices window, the label appears right next to the voice name. Premium voices are the highest quality, Enhanced are also excellent, and voices with no label are legacy/compact (avoid these).

---

## Quick Reference

**Essential Commands:**
```bash
# List all Premium/Enhanced voices
say -v '?' | grep "Premium\|Enhanced"

# Test a specific voice
say -v "Jamie (Premium)" "test message"

# Start voice server
cd ~/.claude/voice-server && bun server.ts &

# Check server health
curl http://localhost:8888/health

# Stop voice server
lsof -ti:8888 | xargs kill -9
```

**File Locations:**
- Voice server: `~/.claude/voice-server/server.ts`
- Stop hook: `~/.claude/hooks/stop-hook.ts`
- Agent configs: `~/.claude/agents/*.md`
- Documentation: `~/.claude/documentation/voice-system.md`

---

## You're All Set! 🎉

Your PAI voice system is now configured with high-quality, natural-sounding voices. Every time Kai or an agent completes a task, you'll hear a voice announcement in their distinct voice.

Enjoy your AI assistant system with personality!

---

**Need more help?** Check the full [Voice System Documentation](voice-system.md) for advanced configuration and troubleshooting.