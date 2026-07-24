# Hindsight Memory Schema for LifeOS→Hermes Port

## Correction Log
- **Fixed:** Do NOT pre-distill/pre-summarize sessions before `retain`. Hindsight best practices say pass the richest representation available (raw conversation JSON preferred). Hindsight extracts facts itself; raw content is not stored verbatim as memory.
- **Fixed:** Session retain should send rich conversation/session content, not a lossy 3-bullet summary.
- **Kept:** Single user bank, stable document_ids for living records, tag taxonomy, keep active state/telemetry/proposals OUT of Hindsight.

---

## 1. Bank Layout

### `user_{user_id}` (primary)
Store: preferences, identity, project knowledge, learnings, failures/postmortems, domain wisdom, contacts/entities, approved operational rules.

Do NOT store: active task state, pending approvals, telemetry logs, raw JSONL event firehoses, ISA checklist progress.

### `hermes_system_reference` (optional, skip if not needed yet)
Shared non-user-specific technical memory: Hermes quirks, tool contracts, framework gotchas.

---

## 2. Tag Taxonomy

### `cat:` — core category
- `cat:identity` — durable user/agent identity, voice, style, operational rules
- `cat:telos` — long-term goals, mission, values, baselines
- `cat:entity` — people, companies, tools, hardware profiles
- `cat:knowledge` — distilled ideas, research, architectural decisions
- `cat:learning` — session learnings, failure postmortems, fixes
- `cat:wisdom` — domain frames, cross-cutting principles, mental models

### `domain:` — subject area
- `domain:engineering`, `domain:workflow`, `domain:finance`, `domain:health`, `domain:security`

### `project:` — project scoping
- `project:lifeos-port`, `project:hermes`, `project:visit`

### `source:` — provenance
- `source:direct_user`, `source:session_harvest`, `source:post_mortem`, `source:subagent`

### `durability:` — optional, defer for MVP
- `durability:core`, `durability:dynamic`, `durability:episodic`

---

## 3. document_id Strategy

### Stable/upserted (reuse same ID → Hindsight replaces old facts)
- `user:{id}:identity:principal`
- `user:{id}:config:operational_rules`
- `user:{id}:entity:person:{slug}`
- `user:{id}:project:{slug}`
- `user:{id}:wisdom:{domain}`

### Immutable/event-like (unique ID per event)
- `user:{id}:session:{session_id}`
- `user:{id}:failure:{failure_id}`

---

## 4. Operation Triggers

### `recall`
- **Turn start**: recall identity + relevant project/domain tags → inject into context
- **Domain query**: recall `domain:{query_domain}` AND (`cat:knowledge` OR `cat:wisdom`)

### `retain`
- **Explicit user fact/rule statement**: retain immediately with `cat:identity`, `source:direct_user`
- **Session/task completion**: retain using **rich conversation/session content** (NOT pre-summarized). Tags: `cat:learning`, `source:session_harvest`. document_id: `user:{id}:session:{session_id}`
- **Failure/postmortem**: retain with `cat:learning`, `source:post_mortem`. document_id: `user:{id}:failure:{failure_id}`
- **Approved identity/rule change** (after proposal approval): retain with `cat:identity`, `durability:core`

### `reflect` (async, periodic)
- Failure pattern synthesis: reflect over `cat:learning` + `domain:{domain}`
- User profile/preferences synthesis
- Domain wisdom consolidation
- Optionally retain reflection output back under `cat:wisdom`

---

## 5. Keep OUT of Hindsight

- Active ISA/task progress, `work.json`-style live state
- Pending approval/proposal queues (Hermes orchestration layer)
- Telemetry: tool activity logs, cost logs, security JSONL streams
- High-frequency observability event firehoses

These belong in Hermes session/workspace/logging, not memory.

---

## 6. Minimal Viable Implementation

### Already built into Hermes
- `MemoryManager` (`agent/memory_manager.py`):
  - Turn start → `prefetch_all()` → `recall` → inject into system prompt
  - Turn end → `sync_all()` → `retain` with raw conversation JSON (NOT pre-summarized)
  - Background → `queue_prefetch_all()` → async prefetch for next turn
- Hindsight plugin (`plugins/memory/hindsight/__init__.py`, 1979 lines):
  - `auto_recall`, `auto_retain`, `retain_tags`, `recall_tags`, `observation_scopes`
  - `bank_mission`, `bank_retain_mission` (extraction steering)
  - `recall_prefetch_method: recall|reflect`
  - `hindsight_recall` / `hindsight_retain` / `hindsight_reflect` tools
  - Per-session `document_id` with append mode for continuity
  - Session switch hook: flushes old buffer, mints fresh document_id on /reset, /new, /resume

### Configured (this port)
1. `$HERMES_HOME/hindsight/config.json`:
   - `bank_mission` — steers extraction toward durable facts, away from ephemeral state
   - `bank_retain_mission` — explicit extraction directive (what to extract, what to ignore)
   - `retain_tags: "source:hermes"` — provenance tag on all auto-retained memories
   - `observation_scopes: "combined"` — single observation pass
   - Backup at `config.json.bak`
2. Cron job `lifeos-wisdom-synthesis` (every 6h, `deliver: local`):
   - Calls `hindsight_reflect` to synthesize patterns/wisdom
   - If substantive, calls `hindsight_retain` with `tags: ["cat:wisdom", "source:reflection"]` and stable `document_id: "user:aron:wisdom:synthesized"`

### Still needed
- `memory_enabled: false` in config.yaml — intentionally LEFT OFF. User confirmed: enabling it activates the built-in Hermes memory system (bolt-on), which they do NOT want. Hindsight runs independently via its own plugin + the hindsight_recall/retain/reflect tools + the cron job. Do NOT enable memory_enabled.
- TELOS truth source: loaded from `E:/Dropbox/ARON BIJL MSC/TELOS/` and retained into Hindsight with `document_id: "user:aron:telos"` and tags `["cat:telos", "cat:identity", "durability:core", "source:dropbox_telos"]`. This is the canonical TELOS — not the empty template files from the LifeOS repo.
- Optionally add a second cron for failure-pattern reflect (`cat:learning` + `domain:engineering`)
- Optionally add a periodic TELOS-refresh cron that re-reads the Dropbox TELOS files and re-retains with the same document_id to pick up updates

---

## 7. Open Decisions

1. Auto-retain reflection outputs, or require agent validation first?
2. Episodic learning TTL/decay policy, or rely on Hindsight relevance scoring?
3. Subagent bank access: read/write `user_{user_id}` with `source:subagent` tag, or temporary sub-bank merged on completion?
