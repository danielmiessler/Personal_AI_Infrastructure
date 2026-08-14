# ContextCheckin — full constitutional-context peer conversation

**Purpose:** Open `/interview` by reading the freshness signal across every constitutional context file (TELOS plus the six other files that load at session start), surface the most-stale items as one of the most important things to look at, and drive a contextual peer conversation grounded in what's actually written. This is the default workflow on a populated system.

For fresh installs (DA name still "LifeOS", placeholder identity, sample-row PROJECTS), route to **Phase0Setup** instead.

> Renamed from `TelosCheckin.md` — the original file is now a one-line redirect stub that points here. The workflow generalized when freshness extended from TELOS-only to all constitutional files.

---

## Voice notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Reading constitutional context to drive the check-in."}' \
  > /dev/null 2>&1 &
```

---

## Step 1 — Read freshness AND evidence BEFORE asking anything

Four readers. All at the start. The context is on file and the observed data is in cache; we ground every prompt in both — never in what we'd ask if we had no idea, and never in file age alone when the data can say what changed.

```bash
bun ~/.claude/LIFEOS/TOOLS/TelosFreshness.ts --json          # per-section TELOS
bun ~/.claude/LIFEOS/TOOLS/TelosFreshness.ts --state         # CURRENT_STATE/ + IDEAL_STATE/ dimension files
bun -e "import { readContextFreshness } from '$HOME/.claude/LIFEOS/TOOLS/TelosFreshness'; console.log(JSON.stringify(readContextFreshness(), null, 2))"
bun ~/.claude/LIFEOS/TOOLS/StateEvidence.ts --markdown       # observed reality per domain (also refreshes the cache)
```

If `StateEvidence` output is missing or its cache is older than a day, run `bun ~/.claude/LIFEOS/TOOLS/InterviewDue.ts --refresh` once and re-read — the interview must argue from today's data, not last week's.

**Fifth reader — the work system (principal directive, 2026-08-12).** When the work-hub skill is installed (its repo is named in the private operational rules, never here), pull the open issue registry before reviewing Goals, Projects, or Ideas:

```bash
gh issue list -R <work-repo> --state open --limit 60
```

Open issues are CANDIDATES for the review: goal-mirror issues (`goal:GN` labels) must agree with the TELOS Goals section — a goal marked achieved in the interview closes its mirror issue in the same motion, and an open mirror for a dead goal is a contradiction to surface. Sweep/decision/project-check issues are evidence of what's actually being worked on, so the "anything missing from Projects?" prompt argues from them instead of asking blind.

Or via Pulse (single round-trip):

```bash
curl -s http://localhost:31337/api/freshness | jq      # multi-file constitutional
curl -s http://localhost:31337/api/telos/freshness | jq # per-section TELOS
```

Parse and combine into a single sorted list of stale items — TELOS sections, constitutional files, AND state dimension files share the same conceptual surface from the principal's view. Sort most-stale-first by days-over-threshold.

`bun ~/.claude/LIFEOS/TOOLS/InterviewScan.ts --json` produces this combined list already prioritized — state targets carry `domain`, `evidence_live`, and `evidence_days_since_review`, and an evidence-backed stale file outranks everything else in its phase. Prefer it over hand-merging.

### Step 1.5 — The evidence pass (what makes this interview different)

For every stale item whose `domain` is non-null, put the file's claims and the observed data side by side BEFORE asking anything. The evidence panel (`StateEvidence.ts --markdown`) carries the observed side: sleep hours, efficiency, HRV, resting HR, steps (Oura); creation vs consumption minutes and top apps (Conduit); sessions and commit cadence (work registry + git); recurring burn (expenses).

The lead is the sharpest **contradiction** — a written claim the data refutes or confirms-out-of-date — not merely the oldest file. Claim-vs-evidence, stated plainly, with dates on both sides:

> "**CURRENT_STATE/HEALTH.md** (last reviewed {N}d ago) says: *'{claim}'*. The data since then: {metric} averaged {value} over the last 30d (through {date}). That row is wrong/confirmed — here's the corrected line: *'{draft}'*. Take it, edit it, or leave it?"

Rules for the evidence pass:

- **Dates on both sides, always.** A claim without its review date and a metric without its observation window can't be honestly compared.
- **The current.json day-label trap:** never quote `HEALTH/current.json`'s `day` as the sleep date — the evidence cache's `latest_sleep_record_day` is the actual date of the newest sleep record. Quote that.
- **Dead sources are named, not papered over.** The evidence panel reports each source's liveness — name the dead ones it reports this run, never a remembered list. A claim whose only source is dead can be asked, not checked. Say which claims are checkable and which aren't.
- **Confirmation matters as much as contradiction.** "You wrote 'sleeping poorly'; the last 30d average is {h}h at {e}% efficiency" may CONFIRM the claim — then the prompt is "still true, want the numbers in the file?"
- **Metric identity matters.** Compare like with like: `rhr_avg_*` (Oura lowest sleeping HR) is the RHR comparator; `sleep_hr_avg_*` (average HR during sleep) runs higher and is NOT resting heart rate. Wrist HRV also reads lower than chest-strap numbers — name the instrument when the gap could be the sensor.
- **Single-timestamp sources understate their skew.** The expense ledger exposes one `meta.updated` date, so money's "unexamined data" figure reflects the last ledger write, not months of history behind it — say "ledger last updated {date}" rather than leaning on the day count.

If `readContextFreshness()` reports a file with `why: "no frontmatter"`, the migration hasn't been run on that file. Stop and prompt: *"<file> doesn't have the freshness convention yet. Want me to run `bun ~/.claude/LIFEOS/TOOLS/MigrateContextFreshness.ts` first?"*

If `readContextFreshness()` reports a file with `why: "source missing"`, the file's `derived_from:` source doesn't have a freshness signal — the derivative can't inherit one. Surface this to the principal: *"<file> derives from <source> which has no freshness frontmatter. Want me to add it?"*

---

## Step 2 — Open with the most-stale item as the lead

Staleness is **one of the most important things to surface** — but it's a peer check-in, not scolding.

Pick the highest-priority stale item across both axes (constitutional files + TELOS sections). Read its actual content via `Read` before asking. For derived files (PRINCIPAL_TELOS, ARCHITECTURE_SUMMARY), Read the SOURCE file instead — that's where the review actually lands.

Opening shape (adapt to voice):

> "I read your context. **<File or section>** hasn't been touched in **{N}d** (threshold {T}d). It says: *'{first 80–120 chars}'*. Still right? Want to update it?"

If multiple stale items, surface the top 2-3 and let the principal pick:

> "Three things to look at: PROJECTS.md (47d/30d), system prompt (112d/90d), Goals (38d/30d). PROJECTS first?"

If everything is fresh:

> "All seven constitutional files within thresholds. Anything you want to revisit anyway, or pick a section to deepen?"

**Forbidden when context is populated:** generic prompts like "What's your mission?" or "Tell me about your goals." The files are on disk. Reference them.

---

## Step 3 — The contextual conversation loop

For each stale (or principal-selected) item:

### 3a. Read the file or section content

Always `Read` the file's actual content (or the source for derived files) before asking. **Asking without reading first is the failure mode this workflow exists to fix.**

For TELOS sections: pass the line range — start at `section.line + 2` (skip heading + marker), continue until the next `## ` heading.

For constitutional files: read the full file (most are <300 lines).

For derived files: read the SOURCE — `PRINCIPAL_TELOS` review goes to `TELOS.md`, `ARCHITECTURE_SUMMARY` review goes to `LifeosSystemArchitecture.md`. Update the source; the derivative regenerates.

### 3b. Pick the right register based on file/section type

**TELOS sections with typed-ID entries** (Goals → G0+, Problems → P0+, Mission → M0+, Beliefs → B0+, Models → MO0+, Frames → FR0+, Narratives → N0+, Challenges → C0+, Traumas → TR0+) — get **per-entry contextual prompts**:

> "**G3** says: *'{first sentence}'*. Where are we on this?"
> "**M0** is the north-star — *'{first sentence}'*. Still the right framing, or has it shifted?"

**TELOS sections without typed IDs** (Current State, Status, Sparks, Wisdom, preferences) — section-level prompts:

> "Current State says: *'{first three lines}'*. What's actually true today?"

**Constitutional files** — file-level review prompts targeted to the file's purpose:

- **DA_IDENTITY.md** — voice, personality, autonomy boundaries: *"You're 47d into the DA identity threshold. Still seeing peers, not commander/executor? Anything new about the working dynamic that should land here?"*
- **PRINCIPAL_IDENTITY.md** — name, role, focus, online presence: *"Identity hasn't been touched in {N}d. Quick Reference says you're at {role}. Still right?"*
- **PROJECTS.md** — project registry + routing aliases: *"PROJECTS at {N}d. Any new projects to add, or finished projects to retire? Routing aliases still match how you refer to things?"*
- **LIFEOS_SYSTEM_PROMPT.md** — constitutional rules: *"System prompt at {N}d. Want to review the operational rules section, or is anything constitutional pending?"* (for this file especially, default to surfacing rather than editing — this is the most load-bearing file in the system).
- **PRINCIPAL_TELOS.md / ARCHITECTURE_SUMMARY.md** (auto-generated) — never edit directly. Route to the source file: *"PRINCIPAL_TELOS derives from TELOS.md — going there. TELOS.md last touched {N}d ago."*

**State dimension files (`CURRENT_STATE/*.md`, `IDEAL_STATE/*.md`)** — the evidence register:

- **Evidence-mapped and populated** (HEALTH, FINANCIAL, and the TELOS `## Current State` section): claim-vs-evidence per Step 1.5. I draft the corrected text from the data; the principal ratifies, edits, or declines. Every landed edit updates any inline dates.
- **Evidence-backed but placeholder-dead** (ACTIVITY, CONSUMPTION, SNAPSHOT — TBD since scaffolding): the machinery can now write these. Present a full draft generated from the evidence (Conduit for ACTIVITY/CONSUMPTION, the health cache for SNAPSHOT's sleep/energy rows), and offer **ratify or retire** per file: *"ACTIVITY.md has said TBD for {N} months. Here's what Conduit can keep in it — {draft}. Adopt this as the file (I'll keep drafting it at each interview), or retire the file?"* Retiring means moving it to `TELOS/Backups/` and noting it in Decisions — never leaving a corpse that reads as claims.
- **Not evidence-mapped** (SOCIAL, SIGNALS, RELATIONSHIPS, …): the classic register — read, quote, ask "what's actually true today?"
- **IDEAL_STATE files**: handled in the ideal-state leg (Step 3.75), never as cold "review this file" prompts.

### 3c. Listen, then write

The principal answers in natural language. The DA formats the answer into the file's structure:

- For typed-ID entries: preserve the ID, edit the entry text, never re-number.
- For prose sections / files: edit in place, preserve heading + marker line + frontmatter.
- For new entries: append at the next sequential ID.
- For deletions: leave a tombstone (`- [ ] G3: [DROPPED — see Decisions YYYY-MM-DD]`).
- For constitutional files: surgical edits only; backup first if rewriting ≥50% of any section.

Use the `Edit` tool with precise `old_string`/`new_string`.

### 3c.5 — Ratification is the write gate (hard rule)

No claims file — TELOS.md, constitutional, CURRENT_STATE, IDEAL_STATE — is written without the principal approving that specific edit in this conversation. Drafts are shown in full before landing. The cron path (`InterviewDue.ts --refresh`) writes caches only, never claims files; if a draft is declined, nothing lands and nothing is queued.

### 3d. Bump the review marker on every approved edit

`last_reviewed:` is the freshness clock — explicitly distinct from `last_updated:`,
which migrations and auto-generators also bump. The statusline FRESH line and the
A-F grade in `/api/freshness/summary` are computed from `last_reviewed:`. Only this
workflow (and equivalent principal-driven review flows) should call it.

```bash
# TELOS section — section-level marker
bun ~/.claude/LIFEOS/TOOLS/TelosFreshness.ts --bump <slug>

# Constitutional file OR state dimension file — review marker
# (NOT bumpContextTimestamp; that's for writes)
bun -e "import { bumpReviewedTimestamp } from '$HOME/.claude/LIFEOS/TOOLS/TelosFreshness'; console.log(bumpReviewedTimestamp('<absolute-path>', 'user'))"
```

State dimension files use the same `bumpReviewedTimestamp` — a ratified-or-declined-with-review walk of a CURRENT_STATE/IDEAL_STATE file counts as a review even when no edit landed (the principal looked and said "still right").

Without this, files stay at grade F forever because no other path sets `last_reviewed:`.

### 3e. Voice-confirm the change (only on actual writes)

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Updated <FILE-OR-SECTION> — captured the change.", "voice_enabled": true}' \
  > /dev/null 2>&1 &
```

### 3f. Move on, respect stop signals

> "Anything else for {file/section}, or move to {next stale item}?"

The principal can say "next", "skip", "enough", "stop", "later" at any prompt. Honor it immediately. State persists in the files themselves; there's no separate session to save.

---

## Step 3.75 — The ideal-state leg (offer, never force)

After the current-state pass — or immediately if the principal asks for it — offer the ideal-state review, grounded in the measured gap. The measured side comes from the evidence panel (Step 1); read the IDEAL_STATE file (or the TELOS `## Ideal State` section) and put the observed number beside each metric target yourself. (`ComputeGap.ts` is a v1 stub that only counts TBD markers — don't cite its "No gaps detected" as evidence; its real upgrade is tracked in the Interview ISA's Remaining Work.)

Walk only IDEAL_STATE files that are cadence-expired (stale in `--state` output) or whose gap moved materially. Each target gets the measured value beside it:

> "**IDEAL_STATE/HEALTH.md** targets HRV 75. Measured: 30d average {v} (through {date}), flat. Still the target, or re-baseline — and if still, does anything in the plan change?"

Re-affirming without edits still bumps the review marker. Declining the whole leg ("later") is a stop signal like any other.

---

## Step 4 — Wrap with a freshness summary

When the principal says enough:

```bash
bun ~/.claude/LIFEOS/TOOLS/TelosFreshness.ts        # final TELOS state
bun ~/.claude/LIFEOS/TOOLS/ContextAudit.ts          # content quality findings (read-only)
```

Voice-summarize:

> "Reviewed {N} items, edited {M}. {K} things still stale — top one is {name} at {age}d. {audit findings count} content-quality findings in AUDIT.md. Pick that one up next time, or call it done."

Regenerate the auto-derived files so future sessions pick up source changes:

```bash
bun ~/.claude/LIFEOS/TOOLS/GenerateTelosSummary.ts 2>/dev/null || true
bun ~/.claude/LIFEOS/TOOLS/ArchitectureSummaryGenerator.ts generate 2>/dev/null || true
```

Record completion and refresh every cache the statusline and next session read — this is what silences the 🎤 chip:

```bash
bun ~/.claude/LIFEOS/TOOLS/InterviewDue.ts --mark-done
```

Send a Pulse `/reload` so the freshness cache invalidates:

```bash
curl -s -X POST http://localhost:31337/reload > /dev/null 2>&1 &
```

**Sync the work slice to Vector** (standing directive, {PRINCIPAL.NAME} 2026-08-12). If any ratified edit this run touched company-relevant content — business goals (revenue targets like G2), work strategies or projects, company state — push that slice to the principal's company tenant on the Vector platform (tenant named in the private `LIFEOS/USER/CONFIG/OPERATIONAL_RULES.md` Vector rules, never here) through the Vector gateway (`_VECTOR`, a private skill NOT in the public release payload — installs without it skip this sync; writes are steward-gated). Selective by design: personal material (health, traumas, finances, relationships, private narratives) never crosses. The write path:

```bash
bun ~/.claude/skills/_VECTOR/Tools/Vector.ts propose-telos <section> "<Title>" --file <body.md>
# sections: mission | goals | metrics | challenges | strategies | projects | team | budget
```

Each push lands as a DRAFT revision — the section reverts to draft and leaves Vector's governed answers until the principal re-approves it in the Vector web UI; say that in the wrap summary along with what synced. Translate, don't copy: rewrite the slice in company terms (a revenue goal belongs in Vector's goals section; sleep data does not). If auth is expired (`vector auth status`), ask for the one-click login rather than skipping silently.

---

## Rules

- **Read context before asking. No exceptions.** Generic "what's your mission?" / "describe your projects" prompts are forbidden when files are populated.
- **Evidence before age.** When a stale item has live evidence, the opening is claim-vs-evidence with dates on both sides — file age alone is the fallback, not the lead.
- **Ratification is the write gate.** No claims file changes without the principal approving that edit in-conversation; cron writes caches only.
- **Name what's checkable.** Claims with no telemetry behind them (dead sources) are asked, never "verified"; the dead source is named.
- **Per-entry on typed-ID TELOS sections, file-level on constitutional files, source-targeted on derived files.**
- **Staleness is information, not failure.** A 95-day-old file might still be right. The prompt is "still right?", not "you're behind."
- **One question at a time.** Never dump three prompts in one turn.
- **Bump on every approved edit.** Use `bumpTelosTimestamp` for TELOS sections and `bumpReviewedTimestamp` for constitutional files — they update the per-section marker and the `last_reviewed:` field that drives the A-F grade. `bumpContextTimestamp` is for file writes (auto-generators, migrations) and does NOT count as review.
- **Stop signals are sacred.** "Enough" / "stop" / "later" exits gracefully. State is the file.
- **ID-stability rule.** G3 stays G3 even when edited or dropped. New entries get the next sequential ID.
- **Constitutional files: surgical edits only.** Never rewrite identity, system prompt, or projects unilaterally — surface findings via ContextAudit, edit only with explicit per-edit approval.
- **Auto-generated files are never edited directly.** Route every review of PRINCIPAL_TELOS to TELOS.md; route ARCHITECTURE_SUMMARY review to LifeosSystemArchitecture.md.

---

## Examples

### Opening on a system with stale system prompt

```
read freshness ⇒ lifeos_system_prompt 112d/90d (most stale across both surfaces)
Read LIFEOS/LIFEOS_SYSTEM_PROMPT.md fully
```

> "I read your context. **LIFEOS_SYSTEM_PROMPT** hasn't been touched in **112d** (threshold 90d). The Hard Prohibitions section says: *'Never self-rate responses or add unsolicited ratings. Never modify working features unprompted. Analysis means read-only…'* Still want all three of those, or has anything changed in how you want me to operate?"

### Opening when everything is fresh except an audit finding

```
read freshness ⇒ all 7 fresh
read AUDIT.md ⇒ critical: PROJECTS.md at 82 lines exceeds declared 45-line budget
```

> "Everything within freshness thresholds. One audit finding: PROJECTS.md is 82 lines, which is 82% over its declared 45-line budget. Want to trim, raise the budget, or split active state into a load-on-demand file?"

### Per-entry conversation on Goals

```
G3 stale (38d/30d)
Read TELOS.md lines 252-296
```

> "**G3** says: *'Get the newsletter to 50K subscribers by EOY.'* Where are we?"

Principal: "27K right now, growing about 1.2K/month. On track but tight."

```
Edit G3 with current-state context
bun TelosFreshness.ts --bump goals
voice-confirm
```

> "Updated G3 with the 27K state. **G7** is *'Ship Fabric v2.'* — that one moved at all, or still in design?"

---

## Failure modes

- **Migration not run yet.** First call to `readContextFreshness()` returns one or more files with `why: "no frontmatter"`. Run `bun ~/.claude/LIFEOS/TOOLS/MigrateContextFreshness.ts` once before continuing.
- **Pulse not running.** Voice notifications fail silently; HTTP routes return connection errors. Conversation continues using the lib directly.
- **Source missing for a derived file.** `architecture_summary` may show `why: "source missing"` if `LifeosSystemArchitecture.md` has no `last_updated` frontmatter. Surface to the principal; offer to add it.
- **Slug not found by bumpTelosTimestamp.** Returns `sectionFound: false`. Re-check `sectionSlug(headingText)`.
- **Principal goes silent mid-section.** Treat the same as "stop" — wrap with the freshness summary and exit.
