# STATE - Fast Runtime Data

**Purpose:** High-frequency read/write operational data. Caches, current pointers, streaks.

**Key Property:** NOT durable knowledge. Can be rebuilt from RAW or other sources. Optimized for speed, not permanence.

---

## Files

| File | Purpose | Read By | Written By |
|------|---------|---------|------------|
| `current-work.json` | Active work directory pointer | ResponseCapture, SessionSummary | AutoWorkCreation |
| `algorithm-state.json` | THEALGORITHM execution phase | THEALGORITHM skill | THEALGORITHM skill |
| `algorithm-streak.json` | Consecutive algorithm usage count | Statusline | THEALGORITHM skill |
| `format-streak.json` | Consecutive correct format count | Statusline | Format validator |
| `trending-cache.json` | Cached analysis (TTL-based) | Various | Analysis tools |
| `last-judge-rating.json` | Most recent judge rating | Statusline | Judge hook |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `progress/` | Multi-session project tracking (JSON per project) |
| `integrity/` | System health check results |

---

## Design Principle

**STATE is ephemeral.** If you delete everything in STATE, the system should recover gracefully:
- `current-work.json` - Recreated on next UserPromptSubmit
- Caches - Rebuilt on next access
- Streaks - Reset to zero (acceptable loss)

**If data is precious, it belongs in RAW, WORK, or LEARNING - not STATE.**
