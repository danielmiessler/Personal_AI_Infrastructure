# Multi-Channel Notification System

**Date:** 2026-01-08
**Type:** feature
**Impact:** major

---

## Summary

Added external notification infrastructure with ntfy.sh (mobile push), Discord webhooks, and smart event-based routing. Notifications fire asynchronously based on event type and task duration.

## What Changed

### Before

- Voice notifications only (localhost:8888)
- No mobile alerts when away from computer
- No team channel notifications

### After

```
Hook Event → Notification Service → Smart Router
                                         │
         ┌───────────────────────────────┼───────────────────────────────┐
         │               │               │               │               │
         v               v               v               v               v
      Voice          Desktop          ntfy           Discord           SMS
    (localhost)      (macOS)         (push)        (webhook)       (disabled)
```

## Key Design Decisions

1. **Fire and Forget**: Notifications never block hook execution
2. **Fail Gracefully**: Missing services don't cause errors
3. **Conservative Defaults**: Avoid notification fatigue (voice only for normal tasks)
4. **Duration-Aware**: Only push for long-running tasks (>5 min threshold)

## SMS Research Findings

US carriers require A2P 10DLC registration since December 2024. Recommendation: Use ntfy.sh instead - same result (phone alert), zero carrier bureaucracy.

## Files Affected

- `hooks/lib/notifications.ts` - Core notification service
- `hooks/LoadContext.hook.ts` - Session start timestamp
- `hooks/VoiceAndHistoryCapture.hook.ts` - Duration-aware routing
- `hooks/AgentOutputCapture.hook.ts` - Background agent alerts
- `settings.json` - Notification configuration
- `skills/CORE/SYSTEM/THENOTIFICATIONSYSTEM.md` - Documentation

---

**Migration Status:** Complete
