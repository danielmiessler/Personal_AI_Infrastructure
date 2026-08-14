---
version: 2.2.1
---

# Verification Doctrine — the single statement

> **This file is the ONE home of the seven incident-derived verification rules.** The system prompt keeps the constitutional core resident (self-check, the Interceptor mandate, the "should work" ban, confidence-requires-source) and points here; the Algorithm's claims 8 and 16 bind these rules into runs; nothing else restates them. Load when verifying web/UI output, when a claim is about appearance, when deleting or replacing live infra, when verifying anything that must expire or propagate, or when the verifier is unavailable. Enforced by `hooks/VerificationGate.hook.ts` + `hooks/AlgorithmNudge.hook.ts`. Incident narratives live in `LIFEOS/MEMORY/LEARNING/INCIDENTS/` (private tree; the self-improvement loop's evidence base, beside REFLECTIONS and FAILURES).

Browser-verify all web output through the **Interceptor skill** BEFORE showing the principal. Interceptor is the ONLY sanctioned browser automation in LifeOS — real Chrome, no CDP detection, real login sessions, accurate rendering. agent-browser is deprecated for verification and misses rendering issues real Chrome catches; Playwright is BANNED — if tempted, fix Interceptor instead. "curl returns 200" is not verification. A screenshot from agent-browser is not verification. Every time you create, fix, deploy, or claim anything works on the web — verify with Interceptor. No exceptions.

## The seven rules

1. **Modality fidelity** — the probe must exercise the SAME path the user does: a Web/UI claim closes only on a real browser navigation to the actual URL, through Interceptor. A `curl`, a DOM read of a *different* page, or a check of a sibling path is a different request and proves nothing about what the browser renders at the path in question — curl and a real browser can literally receive different pages. "I curled it and got the right thing" is not "the user's browser gets the right thing."

2. **Unavailable verifier ⇒ DEFER, never substitute** — when Interceptor is wedged or down, a web claim is NOT verified. Say "deployed, not browser-verified", mark the ISC `[DEFERRED-VERIFY]`, and do NOT claim live / works / shipped / locked-down. Fix Interceptor, wait, or hand the human-only step over — never relabel weaker evidence as verification.

3. **Appearance ≠ existence — look at the pixels, from a faithful renderer** — a DOM read proves an element EXISTS at coordinates; it proves NOTHING about how it looks. And the pixels only count when the render path has fidelity to what the user's device paints: Interceptor's DOM-render capture is a *reconstruction* that does not paint UA default widget chrome (a bare `<button>`'s white background), CSS pseudo-element content, or property-set input values — a contrast bug can look fine in it while rendering white-on-white on a real phone. Any claim about native form-control appearance or about CONTRAST closes only on a `--pixel` capture or a `getComputedStyle` probe (transparent background = the UA's will show), never DOM-render alone. Any claim about *appearance* — a logo/image renders, is centered, transparent, the right color, "looks right" — closes ONLY on a **non-degenerate pixel image you actually looked at** (Read the file; a black frame is not a look). **View every asset before wiring it in.** Teeth: (a) `Capture.sh` computes image std-dev and REFUSES blank/near-uniform frames (exit 12, auto-escalating DOM-render → `--pixel`) when ImageMagick is available — on dark/animated pages use `--pixel`; if `magick` is absent the guard fails OPEN with a loud `⚠️ BLANK-FRAME GUARD SKIPPED` warning + a `MEMORY/OBSERVABILITY/capture-guard.jsonl` line — don't trust an unchecked frame. (b) `VerificationGate` (T3) blocks an appearance-success claim unless a pixel image was captured AND Read after the last frontend edit — a DOM read alone never passes (probe proof: `skills/Interceptor/Tools/VerifyImageProbe.ts`).

4. **Reproduce before fixing** — for ANY reported UI or page bug, OPEN THE PAGE WITH INTERCEPTOR FIRST — before reading code, before theorizing, before writing fixes. Check console errors. Check network 404s. See the failure with your own eyes. Code analysis without reproduction is speculation, not debugging.

5. **Temporal fidelity — probe when the failure can exist** — for cache-mediated surfaces (DNS, certificates, CDN caches, negative caches) a probe at T+0 rides warm caches and proves nothing about steady state. A claim about DNS/cert/routing state closes on the provider's records API or the authoritative NS (`dig @<zone-ns>`), never solely on a request that succeeded through a resolver cache. If only runtime probes are possible, the claim holds `[DEFERRED-VERIFY]` until a T+TTL re-probe — name the watcher (background check, cron, Monitor) before closing the run.

7. **Cache fidelity — a cache can sit between the probe and the truth in THREE places** — rule 5 covers DNS/CDN caches on the *response* path. Three distinct layers each produced a passing probe over a broken system in one session, so name all three:

   - **Response path.** Any liveness/health endpoint must answer `no-store` (`Cache-Control` AND `CDN-Cache-Control`), and that header is itself a claim with a probe. Caught live: two probes seconds apart returned byte-identical bodies while items landed every few seconds — a cached 200 during an outage is exactly the failure the endpoint exists to catch.
   - **Deploy path.** A single post-deploy probe reads whichever edge copy answered. Verification converges or it does not count: repeat until N consecutive identical results (or wait on an explicit convergence signal), and never report a fix on one probe. Caught three times in one session — mixed 200/401/000 across the same endpoint, twice nearly reported as a partial fix, once nearly reported as "the deploy isn't landing."
   - **Data path.** The app's own storage reads may be cached too, so behaviour that depends on a value EXPIRING cannot be verified from the code alone. Make expiry structural — rotate the key or the query so a new period reads a key that does not exist — rather than trusting a TTL on the read path. Caught live: a KV rate limiter whose unit tests all passed locked a real identity out indefinitely, because the capped counter kept being served from edge cache long past its 60s TTL.

   The through-line: **a mock cannot reproduce a cache.** Unit tests over a faked store prove the logic, never the deployment. Any claim about expiry, freshness, or propagation closes on a live probe against the real edge, run to convergence.

6. **Restore-parity on replace/delete — ownership enumeration before AND after** — changing or deleting anything serving live traffic or producing a flowing metric requires: the flow's baseline captured BEFORE (rate over a stated window, function inventory); what the resource OWNS enumerated via the provider's authority API before the op (Workers custom domains: `GET /accounts/{id}/workers/domains`; DNS: `GET /zones/{id}/dns_records`) — a dependent record "already existing" is NOT evidence it survives the delete; managed records look identical to independent ones in a zone listing and die with their owner; the authority re-listed AFTER the op — a runtime probe through a warm cache is not the authority; and post-change evidence the flow continues at baseline within stated tolerance. One synthetic event landing is an example claim and never closes parity — "flow continues at baseline rate" is the universal claim that catches the outage. A safety mitigation written into Decisions is promoted to a claim with a falsifier BEFORE the op executes — prose mitigations have no teeth. Metered pipelines hold `[DEFERRED-VERIFY]` until a delayed delta check vs baseline (T+≥1h, or T+TTL for cache-mediated surfaces, whichever is longer).

## Evidence coverage — the probe set spans the claim

When a claim quantifies over a container (a site, a corpus, a fleet, a data set), the container passing is not evidence for its members. The probe set touches every member TYPE the user actually consumes, one rendered/executed instance each, and a deterministic gate sweeps the rest where one exists. Shell pages and HTTP 200s verify nothing on an SPA.

**Viewport is a member type** — the principal reads his products on a phone. A shipped UI change verifies at a mobile width (≤480px via `VerifyViewport.ts shot` or a `--pixel` capture) in addition to desktop, or the claim says "desktop-verified only" out loud.

## Briefing a verifier — steps and evidence, never the expected result

A verification or audit brief carries the steps to execute and the evidence to return, never the answer it is expected to find. A verifier told what the pass looks like rationalizes its way to that pass instead of driving the actual path; withholding the expected result forces it to produce real evidence. This is why a fresh-context second look (Algorithm claim 11) restates the goal and claims but not the build plan or the "should be" outcome.

## Enforcement summary

- `hooks/VerificationGate.hook.ts` (Stop) — blocks page/UI live/works/verified claims when the transcript's actual tool calls show no post-deploy probe; grades evidence from the transcript, not the message's wording, so rewording never passes it.
- `hooks/AlgorithmNudge.hook.ts` destructive-infra row (always-on) — any delete of worker/domain/zone/record/bucket/route fires the ownership + authority-re-list + baseline-flow ask.
- Algorithm claims 8 (modality/coverage/timing per claim) and 16 (restore-parity) bind these rules into every run.

Constitutional core (resident in the system prompt, never restated here): never claim done without tool evidence; the pre-done self-check; confidence requires a source verified this session.
