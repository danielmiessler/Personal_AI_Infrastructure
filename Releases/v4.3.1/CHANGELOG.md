# PAI v4.3.1 — Voice Removal & Install Hardening

**Released:** 2026-03-09

## What Changed

### Voice System Removed
- Eliminated ElevenLabs TTS integration (localhost:8888 voice server)
- Removed all `curl -s -X POST http://localhost:8888/notify` calls from hooks and skill templates
- VoiceGate.hook.ts kept as subagent guard but voice output disabled
- THENOTIFICATIONSYSTEM.md updated to text-only notifications

### Install Hardening
- BuildSettings.ts: env-var expansion now happens at build time
- Hook execute-bit fixes — all hooks are now chmod +x on install
- Installer detects existing installations and preserves USER/ data

### Algorithm
- Upgraded to Algorithm v3.9.0

### Documentation
- Full doc cleanup — removed all voice references from agents, skills, README
