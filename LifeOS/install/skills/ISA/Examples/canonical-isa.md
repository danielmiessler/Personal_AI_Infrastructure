---
task: "Build BeanLine — peer-to-peer specialty-coffee bean marketplace"
slug: 20260201-090000_beanline-v1
project: BeanLine
phase: climbing
progress: 22/38
started: 2026-02-01T17:00:00Z
updated: 2026-04-25T03:14:00Z
---

<!-- Fictitious example. "BeanLine" is a teaching project name; any resemblance to real products or organizations is coincidental. The beanline.example.com domain is RFC 2606 reserved. -->

## Problem

Specialty-coffee roasters with small-batch lots (under 50kg) and home-roasting hobbyists with green-bean surplus have no good place to find each other. Existing marketplaces (eBay, Etsy, Reddit's r/coffee) either don't support food-safe shipping logistics, charge consumer-marketplace fees that eat the margin on a 5kg lot, or have zero buyer trust signals for "is this bean stored properly?" Most lots end up sold at coffee festivals (one weekend a year) or composted. The supply exists. The connective tissue does not.

## Vision

A small focused marketplace at `beanline.example.com` where a verified roaster lists a 5–50kg lot with origin, processing, harvest date, moisture content, and tasting notes; a verified buyer (home roaster or small cafe) browses by region and process, pays via escrow-Stripe, and the lot ships with a QR-coded handoff card the buyer scans on receipt to confirm condition. Euphoric surprise: a roaster lists Colombia Geisha Wednesday and ships it to a third-wave cafe in Portland on Friday — no festival, no haggling, no Reddit DM dance.

## Out of Scope

- **No retail-bag pricing.** Minimum lot 5kg. Below that, the unit economics break for both sides.
- **No green-bean futures or pre-harvest contracts.** Existing physical lots only.
- **No roasted-bean retail.** Green coffee only; once it's roasted, the freshness window collides with shipping speed.
- **No multi-currency.** USD only in v1; international expansion requires a real customs and excise story we don't have.
- **No social-graph features.** No follow / friend / DM. Buyer-seller messaging is per-listing, not per-user-relationship.
- **No machine-only quality verification.** Listings carry seller-supplied data + buyer-confirmation handoff card; no third-party assay until v2.
- **No mobile native apps.** Web + PWA install. The buyer is at a desk pricing lots, not in line for boba.

## Principles

- Buyer trust beats catalog size. A verified-buyer + verified-seller marketplace with 200 lots beats an open marketplace with 20,000 lots and one fraud incident.
- The handoff card is the product, not the website. A clean post-shipment confirmation flow is what makes the next listing land.
- Roaster economics are non-negotiable: under 8% all-in fees or it doesn't beat festival sales.
- Defaults teach. If a buyer's first three searches return relevant lots, they convert; if the first three return junk, they leave.
- Editorial signals beat algorithmic personalization at this scale. Curation by humans (an in-house quality lead reviewing every new listing) is cheaper than building a recommendation engine.

## Constraints

- Edge SSR on Cloudflare Workers + D1 + R2. No third-party hosting in the user path.
- Auth via magic-link email only in v1. No password, no SSO. Verified-status (roaster vs buyer) gated by manual review of submitted business proof.
- Stripe Connect for escrow + split payments. No homegrown payment.
- All-in fees ≤ 8% (Stripe ~2.9% + 30¢ + BeanLine margin ≤ 5.1%).
- Bundle budget: ≤ 100KB JS gzipped on the listing page; ≤ 60KB CSS gzipped.
- p95 cold load on cellular ≤ 1s for browse pages, ≤ 1.5s for the listing detail page.
- Image storage in R2 with eager WebP transcoding; no original JPEGs ever served.
- Public read API rate-limited at 60 req/min/IP via Cloudflare WAF.
- All buyer-seller messaging logged for dispute resolution; retention 12 months minimum.
- HTTPS-only; HSTS preload-listed.

## Goal

Ship a Cloudflare-hosted marketplace at `beanline.example.com` where verified roasters can list 5–50kg green-coffee lots and verified buyers can purchase via Stripe escrow with QR-handoff confirmation; the platform takes ≤ 5.1% margin (≤ 8% all-in including Stripe), browse pages render in ≤ 1s p95 on cellular, and the in-house quality lead can approve a new listing in ≤ 10 minutes per lot.

## Claims

### Build & Deploy

- [x] ISC-1: `bun run deploy` exits 0 against production wrangler env.
- [x] ISC-2: TypeScript strict-mode build emits 0 errors.
- [x] ISC-3: `beanline.example.com` returns HTTP 200 with `text/html`.
- [x] ISC-4: Deployed version string in HTML head matches local git short-sha.

### Listing Lifecycle

- [x] ISC-5: A roaster can submit a new listing with origin, process, harvest date, moisture %, lot weight (kg), price ($/kg), tasting notes, ≥ 1 photo (probe: form submission test).
- [x] ISC-6: Submitted listings enter `status: pending_review` and are not publicly visible (probe: `curl /listings/<id>` returns 404 for anonymous; visible to roaster + admin).
- [ ] ISC-7: Quality lead can approve or reject a pending listing in ≤ 10 minutes per lot (probe: ops-tool timing telemetry, p95 ≤ 600s).
- [x] ISC-8: An approved listing appears at `beanline.example.com/lots/<slug>` within 60 seconds of approval (probe: `curl` after approval).
- [ ] ISC-9: A sold-out listing is hidden from the browse page within 60 seconds of the final unit selling.

### Browse and Search

- [x] ISC-10: `beanline.example.com/browse` paginates available lots, 20 per page, sorted by newest-listed.
- [x] ISC-11: `beanline.example.com/browse?region=<region>` filters lots by origin region (Africa, Americas, Asia-Pacific).
- [x] ISC-12: `beanline.example.com/browse?process=<process>` filters lots by processing method (washed, natural, honey, anaerobic, …).
- [ ] ISC-13: Browse page p95 cold load on simulated 4G ≤ 1000ms (probe: Lighthouse mobile).
- [ ] ISC-14: Listing detail page p95 cold load ≤ 1500ms.
- [ ] ISC-15: Search query `?q=<term>` matches against origin, process, and tasting-notes fields with case-insensitive substring (probe: integration test against fixture lots).

### Auth and Verification

- [x] ISC-16: `/auth/magic-link` accepts an email and emails a 15-minute single-use link.
- [x] ISC-17: Magic-link callback creates a session cookie (`HttpOnly; Secure; SameSite=Lax`).
- [x] ISC-18: A new user starts as `role: buyer_unverified`. Verification (business proof) elevates to `buyer_verified` or `roaster_verified`.
- [ ] ISC-19: Only `roaster_verified` users can submit listings (probe: `POST /listings` from `buyer_unverified` session returns 403).
- [ ] ISC-20: Only `buyer_verified` users can purchase (probe: `POST /checkout` from `buyer_unverified` returns 403 with "verification required" message).

### Payments and Escrow

- [x] ISC-21: Stripe Connect onboarding flow lives at `/account/payouts` for `roaster_verified` users.
- [x] ISC-22: Stripe Checkout creates an escrow charge: funds are held until handoff-confirm.
- [ ] ISC-23: BeanLine platform fee ≤ 5.1% of lot price; total all-in (BeanLine + Stripe) ≤ 8% (probe: post-checkout fee breakdown JSON includes both, sum ≤ 8%).
- [ ] ISC-24: Stripe webhook `payment_intent.succeeded` flips listing to `status: in_transit` and emails roaster a printable handoff card.
- [ ] ISC-25: Buyer-confirm handoff (QR scan) flips status to `status: delivered`, releases escrow to the roaster, and emails buyer a receipt.
- [ ] ISC-26: If buyer does NOT confirm within 7 days of carrier-tracking-delivered, escrow auto-releases on day 8 with a Decisions-logged audit entry.

### Messaging and Disputes

- [ ] ISC-27: Buyer can message the roaster from the listing page; messages are scoped to that listing only.
- [ ] ISC-28: Messages are retained for 12 months (probe: SELECT against retention policy).
- [ ] ISC-29: A "Open dispute" button on the listing page (visible only after purchase) creates a `dispute` row with status `open` and notifies both parties.

### RBAC / Visibility

- [x] ISC-30: Anonymous users can browse and view listings but cannot purchase or message (probe: each protected endpoint returns 401).
- [ ] ISC-31: `roaster_verified` users see their own listings in `/account/listings` regardless of status; never see other roasters' pending listings.
- [ ] ISC-32: Admin role gates `/admin/*` routes; non-admins receive 403.

### Performance and Operational

- [ ] ISC-33: `/health` returns `{status, version, last_deploy_at}` in ≤ 50ms.
- [ ] ISC-34: All R2 image fetches go through a transform Worker that delivers WebP (probe: `Content-Type: image/webp` on every `/img/...` URL).
- [ ] ISC-35: Public read API at `/api/lots` rate-limits to 60 req/min/IP via Cloudflare WAF (probe: 61st request in 60s returns 429).

### Anti-criteria

- [ ] ISC-36: Anti: out of scope — `/api/follow`, `/api/dm`, and any social-graph endpoint return 404 (probe: curl).
- [ ] ISC-37: Anti: privacy — image originals (raw camera JPEGs) are NEVER served from R2 (probe: every image URL returns WebP).
- [ ] ISC-38: Anti: regression — first-page browse load makes zero third-party network requests (no analytics beacon, no font CDN, no ad-tech) (probe: Interceptor network-panel screenshot, 0 third-party requests).

## Test Strategy

<!-- Bunker parses THIS table (Bunker/src/isa.ts). Column order is the contract:
     isc | type | check | threshold | tool | anchors_to  (anchors_to last, optional).
     `type` MUST be one of the real PROBE_TYPES: bash | bun-test | bun-property |
     curl | manual | screenshot | eval. An invented type or a non-table (YAML)
     block parses to ZERO probes — the exact zero-probe-green defect this example
     used to teach. Runnable types (bash/bun-test/bun-property/curl) count toward
     coverage; manual/screenshot/eval are recognize-on-encounter and don't. -->

| isc | type | check | threshold | tool | anchors_to |
|-----|------|-------|-----------|------|------------|
| ISC-3 | curl | home page serves HTML | 200 + text/html | `curl -sfI https://beanline.example.com \| grep -qi 'content-type: text/html'` | literal |
| ISC-13 | bash | browse-page p95 cold load on simulated 4G | ≤ 1000ms | `bash scripts/lighthouse-p95.sh /browse 1000` | derived: responsiveness |
| ISC-23 | bun-test | total fees on a $250 lot within cap | ≤ $20 (8%) | `bun test test/checkout.test.ts -t "fee cap"` | derived: fee-transparency |
| ISC-25 | bun-test | QR handoff scan releases escrow | stripe transfer fires | `bun test test/handoff.test.ts -t "escrow release"` | literal |
| ISC-26 | bun-test | auto-release fires on day 8 | transfer within 60s of cron | `bun test test/auto-release.test.ts -t "day-8"` | derived: escrow-timeout |
| ISC-36 | curl | social-graph endpoints do not exist | 404 | `test "$(curl -s -o /dev/null -w '%{http_code}' -m 10 https://beanline.example.com/api/follow)" = "404"` | literal |
| ISC-37 | bash | every image URL returns WebP | 100% image/webp | `bash scripts/image-format-audit.sh` | derived: image-policy |
| ISC-38 | screenshot | zero third-party requests on browse page | 0 | Interceptor network panel at /browse | derived: privacy |
| ISC-7 | manual | quality-lead approval time per lot | p95 ≤ 600s | ops telemetry weekly aggregate (recognize-on-encounter) | derived: ops-sla |

## Features

```yaml
- name: ListingPipeline
  description: Submit → pending review → approved → public; quality-lead admin tooling
  satisfies: [ISC-5, ISC-6, ISC-7, ISC-8, ISC-9, ISC-31]
  depends_on: []
  parallelizable: false  # core data layer

- name: BrowseAndSearch
  description: Paginated browse, region/process filters, substring search, performance budget
  satisfies: [ISC-10, ISC-11, ISC-12, ISC-13, ISC-14, ISC-15]
  depends_on: [ListingPipeline]
  parallelizable: false  # all browse views share layout primitives

- name: AuthAndVerification
  description: Magic-link sign-in, role gating (buyer/roaster/admin), verification queue
  satisfies: [ISC-16, ISC-17, ISC-18, ISC-19, ISC-20, ISC-30, ISC-32]
  depends_on: []
  parallelizable: true  # parallel to listings

- name: PaymentsEscrow
  description: Stripe Connect onboarding, escrow checkout, handoff release, auto-release timer
  satisfies: [ISC-21, ISC-22, ISC-23, ISC-24, ISC-25, ISC-26]
  depends_on: [AuthAndVerification, ListingPipeline]
  parallelizable: false  # checkout flow is end-to-end sequential

- name: MessagingAndDisputes
  description: Per-listing buyer-roaster messaging, retention, dispute open
  satisfies: [ISC-27, ISC-28, ISC-29]
  depends_on: [AuthAndVerification, ListingPipeline]
  parallelizable: true

- name: ImageEdge
  description: R2 image storage + WebP transform Worker
  satisfies: [ISC-34, ISC-37]
  depends_on: []
  parallelizable: true

- name: HealthAndRateLimit
  description: /health endpoint, public-API rate limiting via WAF
  satisfies: [ISC-33, ISC-35]
  depends_on: [ListingPipeline]
  parallelizable: true
```

## Decisions

- 2026-02-01 17:00: Cloudflare-only stack chosen over a Vercel/Postgres path because edge-co-location wins at the cellular-load budget, D1's row-flat shape fits the listing schema, and the platform-fee math only works with low compute cost.
- 2026-02-08 11:30: Magic-link auth chosen over password+OAuth because v1's user base is small and known; password-reset flow would be the highest-cost auth surface for the verification-team load.
- 2026-02-22 14:00: ❌ DEAD END: Tried buyer-self-attested verification (upload a business license image, accept on submission). Three of the first eight attestations were retail bag-shop owners trying to source for resale, not the wholesale-buyer profile. Reverted to manual quality-lead review of every verification. Don't retry without an automated business-database cross-check.
- 2026-03-04 09:00: refined: ISC-7 sharpened from "quality lead can approve listings quickly" to "≤ 10 minutes per lot at p95" — the first phrasing was unfalsifiable; the second became a staffing-model input.
- 2026-03-15 22:00: ❌ DEAD END: Tried open-graph + Twitter-card image generation for listings. Pulled in 40KB JS for the meta-tag generator, broke the bundle budget. Reverted to server-rendered static OG meta. Don't retry the dynamic generator path.
- 2026-04-01 10:00: refined: ISC-23 split into ISC-23 (BeanLine fee) and an implied "all-in" check that combined the two — the original ISC let the all-in pass while BeanLine's slice silently crept past the principle's 5.1% ceiling.
- 2026-04-12 16:30: refined: ISC-26 added the auto-release timer (day-8) after the first three deliveries had buyers who never scanned the handoff QR — escrow sat indefinitely. The timer + audit log is the safety net.
- 2026-04-22 22:00: refined: Goal sharpened — added the explicit "p95 ≤ 1s on cellular" and "all-in fees ≤ 8%" — the original Goal was domain-correct but operationally fuzzy.

## Learning

- 2026-02-22 | conjectured: Buyer self-attestation will scale verification at low ops cost
  refuted by: 3 of 8 attestations turned out to be the wrong buyer profile (retail, not wholesale)
  learned: verification is the load-bearing trust signal; attestation without ops review degrades the buyer-pool quality, which kills roaster trust, which kills supply
  criterion now: ISC-18 added the quality-lead manual-review step explicitly; "buyer_verified" role is gated on it

- 2026-03-15 | conjectured: Dynamic OG/Twitter card generation will improve social sharing CTR
  refuted by: bundle exceeded the 100KB JS budget (ISC-13/14 broke); social CTR uplift was undetectable in A/B
  learned: bundle-budget Constraints outrank social-meta features; static OG is good enough at this scale
  criterion now: ISC-13 unchanged but Decisions logs the dead end as a bundle-creep canary

- 2026-04-12 | conjectured: Buyers will reliably scan the handoff QR; escrow release flows from buyer action
  refuted by: 3 of the first deliveries had buyers who never scanned (busy shop, lost card); escrow sat
  learned: shipment-confirmation must have a buyer-action AND a timeout fallback; relying on either alone breaks the merchant cash-flow story
  criterion now: ISC-26 added (auto-release on day 8 with audit entry)

- 2026-04-22 | conjectured: Vague performance Goals ("fast on cellular") are operational enough
  refuted by: bundle creep of 8KB went undetected for two sprints; nothing failed an ISC because no ISC named a number
  learned: every Constraint that maps to a budget needs a numeric ISC, not a vibe; Goal sharpening propagates down to ISCs
  criterion now: Goal explicitly states "p95 ≤ 1s on cellular" and "all-in fees ≤ 8%"; ISC-13 enforces the first, ISC-23 enforces the second

## Verification

- ISC-1: `bun run deploy` — `Deployed beanline (route: beanline.example.com/*)`
- ISC-3: `curl -i https://beanline.example.com` — `HTTP/2 200 / content-type: text/html; charset=utf-8`
- ISC-4: HTML head shows `<meta name="version" content="a3b4c5d">` matching `git rev-parse --short HEAD` output `a3b4c5d`
- ISC-5: Listing form integration test 2026-04-22 — submitted listing returned `id: lst_TestXXXX` + status `pending_review`
- ISC-8: `curl -i https://beanline.example.com/lots/colombia-geisha-2026-q1` after approval — `HTTP/2 200`
- ISC-10: `curl https://beanline.example.com/browse | rg "<article" | wc -l` — `20`
- ISC-13: Lighthouse mobile run 2026-04-25 — `Performance 92 / FCP 624ms / LCP 891ms` on `/browse`
- ISC-22: Stripe-sandbox checkout test 2026-04-15 — `payment_intent_TestXXXX` created with `transfer_group: lst_TestYYY`
- ISC-30: `curl -i https://beanline.example.com/checkout` (no session) — `HTTP/2 401`
- ISC-36: `curl -i https://beanline.example.com/api/follow` — `HTTP/2 404`
- ISC-37: Image-format audit 2026-04-22 — 100% of 247 image URLs returned `Content-Type: image/webp`
- ISC-38: Interceptor network panel at `/browse` 2026-04-25 — 0 third-party requests on initial load

<!--
Canonical showpiece. Marketplace pattern (auth + Stripe escrow + RBAC + listings + search + reviews + messaging) at E5 scale, all twelve sections populated, real-feeling Decisions with two ❌ DEAD ENDs and four refinements, four-piece C/R/L Changelog entries spanning the 4-month build. ISC count 38 is below the E5 floor of 256 — show-your-math: the work surface is genuinely smaller than enterprise scope; the marketplace pattern is well-bounded and over-decomposing into 256 ISCs would manufacture probes that don't reflect real verification needs. Anti-criteria (ISC-36, 37, 38) cover scope, privacy, and regression. Antecedents (none) — the goal is verifiable, not experiential, so antecedents aren't required at this gate. The euphoric-surprise prediction in Vision is principal-falsification but not gated as an ISC because the marketplace's success is measured by transactions completed, not by any single user's reaction.
-->
