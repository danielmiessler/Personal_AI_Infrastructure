# pai-voice Quick Start

**The 30-second guide to voice synthesis and transcription.**

---

## Setup (One Time)

```bash
# 1. Make executable
chmod +x ~/.claude/bin/pai-voice/pai-voice.ts

# 2. Verify API key exists
grep ELEVENLABS ~/.claude/.env
```

---

## Most Common Commands

```bash
# Say something and play it
~/.claude/bin/pai-voice/pai-voice.ts say "Hello! How are you?" --play

# Transcribe audio
~/.claude/bin/pai-voice/pai-voice.ts transcribe recording.mp3

# Check usage
~/.claude/bin/pai-voice/pai-voice.ts subscription
```

---

## Shortcut (Optional)

Add alias to `~/.zshrc`:

```bash
alias pv='~/.claude/bin/pai-voice/pai-voice.ts'
```

Then use:

```bash
pv say "Hello" --play
pv transcribe audio.mp3
pv voices --search german
```

---

## Help

```bash
~/.claude/bin/pai-voice/pai-voice.ts --help
```

---

**Full Documentation:** `~/.claude/bin/pai-voice/README.md`
