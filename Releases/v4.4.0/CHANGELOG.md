# PAI v4.4.0 — Voice Removal Complete & Hook Hardening

**Released:** 2026-03-10

## What Changed

### Voice TTS Fully Removed
Voice TTS (ElevenLabs/localhost:8888) was partially removed in v4.3.1 (docs/skills layer only). v4.4.0 completes the removal at the hook and instruction layer:

- **`UpdateTabTitle.hook.ts`** — removed fetch to localhost:8888 that announced every prompt as audio
- **`AlgorithmTracker.hook.ts`** — removed voice notification on algorithm rework cycles
- **`StopOrchestrator.hook.ts`** — removed handleVoice handler and voice gate logic
- **`PAI/THENOTIFICATIONSYSTEM.md`** — all curl voice instructions replaced with text-only patterns
- **`settings.json`** — removed daidentity.voices ElevenLabs config block

### New Hooks Added
- **`StopOrchestrator.hook.ts`** — orchestrates Stop event handlers (TabState, RebuildSkill, AlgorithmEnrichment, DocCrossRefIntegrity)
- **`UpdateTabTitle.hook.ts`** — updates terminal tab title based on current task
- **`AlgorithmTracker.hook.ts`** — tracks algorithm phase transitions and rework cycles
- **`ConfigChange.hook.ts`** — guards critical hooks from being removed mid-session

### ConfigChange Guard Updated
- Removed VoiceGate from CRITICAL_HOOKS (voice system removed)
- SecurityValidator, StopOrchestrator, and ConfigChange remain protected

### Settings
- Full hooks configuration now included (Stop, ConfigChange, WorktreeCreate/Remove, TaskCompleted, TeammateIdle events)
- Notifications config with placeholder variables

## Upgrading from v4.3.1

```bash
cp -r ~/.claude ~/.claude-backup-$(date +%Y%m%d)
git clone https://github.com/danielmiessler/Personal_AI_Infrastructure.git
cd Personal_AI_Infrastructure/Releases/v4.4.0
cp -r .claude ~/
```

## Previous Release
- [v4.3.1 Release Notes](../v4.3.1/CHANGELOG.md)
