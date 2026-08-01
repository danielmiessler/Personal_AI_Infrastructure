---
last_updated: 2026-06-18T00:00:00Z
last_updated_by: da
convention: pai-freshness-v1
version: 1.1.0
---

# LifeOS Data Classification & Inference-Source Routing

> The doctrine that decides **which inference source may process which data**. Four data classes, four+ inference sources, one per-route routing matrix. Fail-closed. Designed + adversarially hardened 2026-06-18; routing policy revised by the principal the same day.

## Why this exists

LifeOS draws inference from sources at different trust/egress tiers. Native (Anthropic) and Forge (OpenAI) are the two trusted US vendors; the GLM route (GLM via the OpenRouter broker, `OpenRouter.ts`) is an additional external cloud. Each external call is a data-egress surface. This doctrine classifies every piece of data and binds each class to the routes allowed to see it.

**The core principle: data egress is ranked by trust, content is ranked by sensitivity, and a route may only process data at or below its ceiling. Unclassified data is RESTRICTED (fail-closed).**

## The four data classes

| Class | Rank | One-line test | Leak consequence |
|-------|------|---------------|------------------|
| **RESTRICTED** | 0 (highest) | "If this showed up in someone else's logs, do I have to rotate something or notify someone?" | Irreversible — rotation, breach notice, contract/law break |
| **CONFIDENTIAL** | 1 | "Is this about MY health, money, security posture, private strategy, or inner life?" | Real harm (embarrassment, competitive loss, profiling) — no rotation |
| **INTERNAL** | 2 | "Would I shrug if a trusted peer saw this, but I haven't published it?" | Low — reveals how the system works, not who I am |
| **PUBLIC** | 3 (lowest) | "Is this already on the internet, or built to go there?" | None — already public or publish-destined |

**RESTRICTED** — auth material, third-party PII, customer-owned data. `.env` + anything quoting it; API keys/OAuth/Cloudflare/Google creds; customer-owned engagement data; contacts' PII; financial source docs; health/medical data. Paths: `**/.env`, `LIFEOS/USER/CONFIG/CREDENTIALS/**`, `LIFEOS/USER/WORK/CUSTOMERS/**`, `LIFEOS/USER/FINANCES/**` (legacy alias `LIFEOS/USER/TELOS/FINANCES/**`), `LIFEOS/USER/HEALTH/**`, `LIFEOS/USER/CONTACTS.md`. **Also the fail-closed default.**

**CONFIDENTIAL** — {{PRINCIPAL_NAME}}'s own sensitive life/business data: health, financials, own-infra security findings, TELOS internals, hot-layer + relationship memory, People/Companies notes. **Default for all of `LIFEOS/USER/**`** except RESTRICTED sub-globs and named PUBLIC demotes.

**INTERNAL** — private but not sensitive: ISAs, work notes, plans, non-PII knowledge, non-secret config, system internals. Paths: `LIFEOS/MEMORY/**`, `skills/**`, `LIFEOS/USER/CONFIG/**` (minus CREDENTIALS), `CLAUDE.md`, `LIFEOS/LIFEOS_SYSTEM_PROMPT.md`.

**PUBLIC** — already published or publish-destined: live blog/newsletter content, the **scrubbed `sync-docs.ts` output only** (raw `LIFEOS/DOCUMENTATION/**` is INTERNAL until scrubbed), post-SecurityFilter daemon profile, `CANONICAL_CONTENT.md`, public repo source.

## The inference sources

| Tier | Source | Vendor | Egress |
|------|--------|--------|--------|
| 0 | **LOCAL** | on-device (ollama) | none — **NOT YET WIRED** |
| 1 | **NATIVE** | Anthropic | home vendor, subscription/enterprise terms |
| 2 | **FORGE** | OpenAI (codex) | external, single known vendor |
| 2 | **GENE** | OpenRouter broker → GLM 5.2 | external **broker** — non-deterministic downstream provider/country; most opaque |

## The routing matrix (the rule)

**The ceiling is per-ROUTE — source + model + data-residency — not per-source** (principal policy, revised 2026-06-18). Three rules, most-restrictive wins:

1. **RESTRICTED-capable vendors — Anthropic (Native) + OpenAI (Forge) ONLY.** These two trusted US vendors may process every class, including RESTRICTED. No other provider or model ever touches RESTRICTED.
2. **Chinese-origin model → INTERNAL ceiling.** Any model from a Chinese lab (GLM/Z.ai, Kimi/Moonshot, MiniMax, Qwen, DeepSeek) caps at INTERNAL regardless of who hosts it — and only when routing is guaranteed off China/Russia; an opaque broker with no such guarantee drops to PUBLIC.
3. **US/allied model, US inference, US company, verified no China/Russia egress → up to CONFIDENTIAL.** Otherwise PUBLIC.

LOCAL (on-device) handles everything. **A route's ceiling depends on the model AND the residency:** the GLM route pinned to a US+ZDR provider reaches INTERNAL; the same route unpinned drops to PUBLIC.

Resolved ceilings for the wired routes:

| Route | Ceiling | Why |
|-------|---------|-----|
| NATIVE (Anthropic) | RESTRICTED | trusted US vendor |
| FORGE (OpenAI) | RESTRICTED | trusted US vendor |
| GENE · GLM 5.2, pinned US + ZDR (default: Fireworks) | INTERNAL | Chinese model, residency guaranteed by allowlisted US provider |
| GENE · GLM 5.2, unpinned **or** non-US pin | PUBLIC | residency not guaranteed (could route to CN/RU) |

Machine-readable form: `maxClassForRoute()` / `ROUTES` in `LIFEOS/TOOLS/models.ts`. Live enforcement: `hooks/EgressClassGuard.hook.ts`.

**Note on Forge/OpenAI at RESTRICTED:** assumes OpenAI's enterprise / zero-retention API terms apply to the codex path. Worth explicit confirmation — a principal-risk decision, not an inherited default.

## Marking convention

Path-default-first, fail-closed, mark-only-the-exceptions:

1. **Path defaults** via `LIFEOS/USER/CONFIG/data-classification.json` (longest-match wins). *"If you didn't tag it, it's as locked as its directory."*
2. **Demote-only tags** — public-facing files inside a stricter tree carry `data_class: PUBLIC` frontmatter (DAEMON.md, CANONICAL_CONTENT.md). Tag *down* only.
3. **Auto-promote by content** — a secret-shape match anywhere → RESTRICTED, blocked from all cloud sources.
4. **In-flight requests** declare class; inline `[[dc:public]]` for one-offs.
5. **Precedence**: auto-promote > explicit tag > path default; conflicts resolve to the more restrictive.
6. **Mixed payloads inherit the highest class** of any constituent.

## Enforcement

**Built + LIVE:**
- `hooks/EgressClassGuard.hook.ts` + `hooks/lib/egress-class-core.ts` — PreToolUse Bash gate, registered in the Bash matcher. Detects `bun … OpenRouter.ts` execs, classifies the payload (secret-shape scan + sensitive-path references), and BLOCKS anything above the route ceiling. Gates at Bash, so it catches both direct calls and any subagent's own internal OpenRouter.ts calls. Fail-closed on a confirmed Tier-2 route; never blocks unrelated Bash. Logs to `LIFEOS/MEMORY/OBSERVABILITY/egress-decisions.jsonl`. No LLM in the path. Verified by an 8-case battery + an observed live block.
- `LIFEOS/TOOLS/models.ts` — `SOURCE_TIER`, `RESTRICTED_CAPABLE_VENDORS`, `CHINESE_MODEL_PATTERNS`, `maxClassForRoute()`/`isRouteAllowed()`, `ROUTES`.
- `LIFEOS/USER/CONFIG/data-classification.json` — path-default glob table.
- The hard guard is the deterministic `EgressClassGuard` hook (above); `OpenRouter.ts` forces `provider.data_collection: deny`. (The former `Gene.md` agent's soft prompt-guard was retired with the persona 2026-07-02; the capability now lives entirely in the tool + hook.)
- **GLM route INTERNAL-by-default (2026-06-20):** the GLM/OpenRouter route now default-pins a US+ZDR provider (Fireworks) so its standing ceiling is INTERNAL, not PUBLIC. `egress-class-core.ts` grants the INTERNAL ceiling ONLY when the `--pin` value is on the `US_ZDR_PROVIDERS` allowlist; an unpinned call or a non-US pin fails closed to PUBLIC. The pin is honored as a *constraint*, not a preference: `OpenRouter.ts` sends `provider.order:[pin]` + `allow_fallbacks:false`, so if the pinned US provider is down the call **errors** rather than silently rerouting off-US (verified live: a Fireworks rate-limit returned 429, did not fall back). Two honest caveats this doctrine must not blur: (1) **ZDR ≠ residency** — `data_collection:deny` is a retention/training guarantee; US *geography* comes only from the pinned provider being US infra (OpenRouter's metadata claim), they are orthogonal. (2) **The broker is inside the trust boundary** — OpenRouter proxies plaintext and has its own logging policy, so the INTERNAL leak surface = OpenRouter infra + the pinned provider, not the provider alone. Acceptable for INTERNAL; named here rather than hidden. The gate enforces residency (route geography); the INTERNAL/CONFIDENTIAL *content* line still rests on the shape-scan + operator discipline (the gate sees secret-shapes and USER-paths, not semantic CONFIDENTIAL prose) — closing the prior "GLM wrapper pin" gap on residency, not on semantic content classification.

**Still planned:**
- Path/identity scrub for INTERNAL→Tier-2 (reuse sync-docs.ts + Daemon SecurityFilter rules).
- Pulse statusline count; ShadowRelease release-time backstop.

**Known limits of the v1 gate (honest):** it inspects the Bash *command string* — so it catches secrets and sensitive *paths named in the command*, but NOT the file *contents* the tool reads at runtime, nor free-prose PII with no token-shape or path reference. Strong first layer, not complete.

## Gaps / roadmap

1. **LOCAL (ollama) not wired** — RESTRICTED data has no on-device model destination; today it's redact-or-deterministic-code only.
2. **`data-classification.json` needs review** before deeper wiring.
3. **No INTERNAL→PUBLIC downgrade-for-egress token** yet.
4. **`LIFEOS/DOCUMENTATION/` is dual-state** — raw=INTERNAL, scrubbed=PUBLIC; pin the scrub-output dir into the PUBLIC glob.
5. **Secret-shape scan catches tokens, not prose PII.**
6. **Return-path leakage uncontrolled** — governs input, not what a response echoes out.
7. **Non-inference egress** (raw WebFetch/WebSearch, skill curls, iMessage/Discord/email) is out of scope here.

## Examples

### One request, two files, two verdicts

Say a workflow wants to summarize a file through the external GENE route (GLM behind the broker, pinned to a US zero-retention provider — ceiling INTERNAL). Watch the gate decide, per file, with no model in the loop:

- **A plain work note** — an internal design doc under the memory tree, no secrets, no sensitive paths. Path default lands it at INTERNAL. INTERNAL ≤ the route's INTERNAL ceiling, so the call goes through.
- **A deploy script that names a credential** — the same route, but the command string references an `.env` path and the scan sees a token-shaped string. Auto-promote fires: class becomes RESTRICTED. Only the two trusted US vendors may ever see RESTRICTED, so the broker route is **blocked, fail-closed** — the summary never leaves for the broker.

Same route, same one-line policy, opposite outcomes — decided by the *content*, not by which route was asked for. Flip the route to Native (Anthropic) and both files pass, because a RESTRICTED-capable vendor has no ceiling to exceed.

### When a route may see the data, and when it may not

The quick read on any route is "what is this route's ceiling, and is the data at or below it?"

- **Native / Forge** — no ceiling; every class, RESTRICTED included. The two trusted US vendors.
- **GENE, pinned US + zero-retention** — INTERNAL ceiling. Fine for work notes and system internals; never for health, finances, or credentials.
- **GENE, unpinned or pinned off-US** — drops to PUBLIC. Residency isn't guaranteed, so only already-public data may go.
- **Unclassified anything** — treated as RESTRICTED. If you didn't tag it, it's as locked as its directory.

### The routing decision as a picture

```mermaid
flowchart TD
    A[Data heading to an inference route] --> B{Secret-shape or RESTRICTED path?}
    B -->|yes| R[Class is RESTRICTED]
    B -->|no| C[Class from tag or path default]
    R --> D{Route is Native or Forge?}
    C --> E{Class at or below the route ceiling?}
    D -->|yes| P[Allowed]
    D -->|no| X[Blocked, fail-closed]
    E -->|yes| P
    E -->|no| X
```

The diagram is the whole doctrine in one frame: sensitivity is decided first and most-restrictively, the two trusted vendors are the only path for the top class, and everything else must sit at or below its route's ceiling. Every unresolved branch falls to the blocked side — the default is no, not maybe.

---
