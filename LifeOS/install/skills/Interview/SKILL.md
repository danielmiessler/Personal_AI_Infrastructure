---
name: Interview
version: 1.1.13
description: "Evidence-grounded context refresh: reads constitutional files, TELOS, and CURRENT_STATE/IDEAL_STATE dimension files via TelosFreshness, pulls observed data (Oura sleep/HRV, Conduit app-time, work registry, git, expenses via StateEvidence), and drives a peer conversation that opens with claim-vs-evidence contradictions, drafts corrections for ratification, and closes with a ComputeGap-grounded ideal-state review. Routes to ContextCheckin; Phase0Setup on fresh install. USE WHEN /interview, resume interview, context check-in, telos check-in, what's stale, stale data, freshness check, update current state, update my current state, state sync, statusline says interview due, interview due, review TELOS, update ideal state, quarterly context refresh, fresh LifeOS install, configure DA name. NOT FOR single edits (Telos), bulk intake (Migrate), identity-only."
disable-model-invocation: true
---

# Interview — constitutional-context peer conversation

## What It Does

Interview reads your constitutional files — TELOS, identity, projects, system prompt, architecture — plus the CURRENT_STATE and IDEAL_STATE dimension files, checks their freshness, and confronts stale claims with observed data: Oura sleep/HRV/RHR, Conduit creation-vs-consumption time, the work registry, git cadence, and the expense ledger. The conversation opens with the sharpest claim-vs-evidence contradiction, drafts corrections you ratify, offers to populate the files the machinery can write, and closes with an ideal-state review grounded in the measured gap. On a fresh install it falls back to first-time setup. The 🎤 statusline chip (fed by `InterviewDue.ts`, daily launchd refresh) says when one is due; wrapping with `--mark-done` clears the cadence reason, and the skew/staleness reasons clear as their files are actually reviewed.

## The Problem

The files that define who you are and what you're working toward drift out of date the moment you stop looking at them. A goal you set in January may be done, dead, or still right — but nobody re-reads the whole TELOS to find out, so the context the system runs on slowly rots. The usual fix is a blank "what's your mission?" prompt, which ignores everything already on file and makes you repeat yourself. This skill reads what's there first, flags only what's gone stale, and asks "still right?" instead of starting from zero.

## How It Works

The skill reads the constitutional files via the freshness tooling, scores each section's staleness, and routes to the right workflow — a check-in on a populated system, or first-time setup on a fresh one. Staleness is a priority signal, not a failure flag.

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **ContextCheckin** | default `/interview` on a populated system; "context check-in", "telos check-in", "what's stale", "how are we doing on…", "still on…", "review context" | `Workflows/ContextCheckin.md` |
| **Phase0Setup** | fresh install; DA name still reads "LifeOS"; PRINCIPAL_IDENTITY still reads "User"; PROJECTS sample-row only; `.env` missing required keys | `Workflows/Phase0Setup.md` |
| **TelosCheckin** *(deprecated stub)* | back-compat for explicit "telos checkin" routing | `Workflows/TelosCheckin.md` (redirects to ContextCheckin) |

**Routing decision (run before either workflow):**

```bash
bun ~/.claude/LIFEOS/TOOLS/InterviewScan.ts --json | jq '[.targets[] | select(.phase == 0 and .completeness_score < 80)] | length'
```

- `> 0` → run **Phase0Setup** first, then ContextCheckin.
- `0` → run **ContextCheckin** directly.

## Quick Reference

- The TELOS is on file. **Read it before asking.** Generic "what's your mission?" prompts are forbidden when TELOS is populated.
- Staleness is **information, not failure** — a 95-day-old Goals section might still be right; the prompt is "still right?", not "you're behind."
- **Per-entry on typed-ID sections** (G3, M0, P2…), **section-level on prose** (Current State, Sparks).
- **Bump on every approved edit:** `bun ~/.claude/LIFEOS/TOOLS/TelosFreshness.ts --bump <slug>`. Without this the staleness signal degrades to noise.
- **Stop signals are sacred.** "Enough" / "stop" / "later" exits gracefully. State persists in the file itself.
- **ID-stability rule:** G3 stays G3 even when edited or dropped; new entries get the next sequential ID.

## Gotchas

- **The current.json day-label trap.** `USER/HEALTH/current.json` labels itself with today's `day` while its `last_night` block may carry the newest *available* sleep record, days older. Quote the evidence cache's `latest_sleep_record_day`, never the label.
- **Not every health source is live.** The evidence panel (`StateEvidence.ts`) computes per-source liveness at run time — quote its live/dead map, never a remembered one. Claims whose only source is dead can be asked, not checked — say so instead of implying verification.
- **`InterviewDue.ts --mark-done` at wrap is what silences the 🎤 statusline chip.** Skipping it leaves the chip nagging with the interview already done — the cadence clock reads `MEMORY/STATE/interview.json`, not file mtimes.
- **Migration must run once before TelosCheckin works.** A TELOS without YAML frontmatter (no `last_updated:`) returns `fileUpdated: null` and every section reads as stale. Run `bun ~/.claude/LIFEOS/TOOLS/MigrateTelosFreshness.ts` once; idempotent and content-preserving (verifies sha256 of stripped content).
- **The slug is normalized:** "Current State" → `current_state`, "Wrong (Things I've been wrong about)" → `wrong`, "2036 — A Day in the Life…" → `2036`. Always run heading text through `sectionSlug()` from `TelosFreshness.ts`.
- **Pulse caches freshness for 60s.** After bumping, the next `/api/telos/freshness/summary` call returns the cached value until invalidation. Send `/reload` (POST) to invalidate the cache immediately, or wait 60s.
- **TelosRenderer (`GenerateTelosSummary.ts`) preserves the markers.** It splits by `^## ` headings; the per-section HTML comments live inside the section body and are not re-emitted in `PRINCIPAL_TELOS.md`. Safe to run after edits.
- **The scanner shares the freshness reader.** `InterviewScan.ts` calls `readTelosFreshness()` once at startup and adds `age_days`, `threshold_days`, `stale` to every Phase 1+ target row. Stale sections get a +200 priority bump so they naturally rise in `--next` output.
- **Voice notifications are "only on actual writes."** Don't voice-confirm every prompt — only after a real Edit lands. The voice channel is a low-frequency signal; preserving that is what makes it land when it matters.

## Examples

- "/interview" on a populated system → routing probe via `InterviewScan.ts`, then ContextCheckin walking the stalest sections first ("G2 is 95 days old — still right?").
- "what's stale?" → freshness summary from TelosFreshness, prioritized list, no edits unless approved.
- Fresh install (DA name still "LifeOS", PROJECTS sample-row only) → Phase0Setup first, then ContextCheckin.

## Related

- `/Telos` — edit a single TELOS section directly (without the conversational walk).
- `/Migrate` — intake content from other sources (one-shot classification, not an interview).
- an identity-profile skill — manage PRINCIPAL_IDENTITY directly.
- `Skill("ISA")` — interview an ISA (different artifact, different workflow).
