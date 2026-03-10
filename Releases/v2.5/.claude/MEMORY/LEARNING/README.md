# LEARNING - Derived Insights

**Purpose:** Knowledge artifacts extracted from experience. What we learned, not what happened.

---

## Structure

| Directory | Purpose | Format |
|-----------|---------|--------|
| `SYSTEM/` | Infrastructure/tooling learnings | Markdown by month |
| `ALGORITHM/` | Task execution learnings | Markdown by month |
| `SIGNALS/` | User satisfaction ratings | JSONL (cache for statusline) |

---

## SYSTEM/ vs ALGORITHM/

| Category | When Used | Examples |
|----------|-----------|----------|
| **SYSTEM/** | Tooling/infrastructure failures | Hook crashed, config error, deploy failed |
| **ALGORITHM/** | Task execution issues | Wrong approach, over-engineered, missed the point |

---

## SIGNALS/

**Not a learning - a cache.** Contains `ratings.jsonl`, a queryable index of rating events from RAW for fast statusline display. See `SIGNALS/README.md` for details.

---

## What Populates This

- `ResponseCapture.hook.ts` - If content qualifies as learning
- `ExplicitRatingCapture.hook.ts` - Low ratings (<6)
- `ImplicitSentimentCapture.hook.ts` - Detected frustration

---

## Key Principle

**Learnings are derived insights, not raw events.** They answer "what did we learn?" not "what happened?" Raw events go to RAW/. Learnings are extracted when there's actionable knowledge.
