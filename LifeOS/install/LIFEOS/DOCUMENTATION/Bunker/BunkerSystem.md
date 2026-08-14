---
last_updated: 2026-08-09
last_updated_by: da
last_reviewed: 2026-08-09
last_reviewed_by: da
convention: pai-freshness-v1
version: 1.1.1
---

# Bunker — the Universal Application Harness

Bunker is the typed chassis every application sits inside. **The app owns the experience** — design, content, domain logic. **Bunker owns the invisible layer** — auth, data, deploy, metrics, health, security. Standardize the pipes, never the paint.

> **Release note:** this document is the concept — the design every LifeOS install builds its own application harness against. The reference implementation (`LIFEOS/PULSE/Bunker/`, CLI `bin/bunker.ts`) is private infrastructure and is NOT in the public release payload. Per-app state lives in the user tree; the Pulse dashboard's `/bunker` page renders whatever apps an install registers.

## The idea

Every app needs the same invisible machinery: a database with backups, a deploy path with rollback, health checks, uptime monitoring, auth, secrets handling, security headers, and continuous outside-in security scanning. Building that per-app produces N drifting copies; skipping pieces produces public failures. Bunker builds the layer once — an app declares a **type**, and the type selects which components turn on in each of six planes:

| Plane | Components |
|-------|-----------|
| **Data** | database + migrations, storage/cache, backup/DR, integrity invariants |
| **Control** | app registry, self-registration, type playbook, config, deploy, rollback |
| **Observability** | tracking, health dashboard, test dashboard, logs, uptime, cost-per-app, alerting |
| **Identity** | auth, rbac, user store, audit sink |
| **Security** | secrets, CVE scanning, rate-limit/bot, headers/CSP/TLS, containment |
| **Commerce** *(enterprise)* | payments, customer metrics, billing |

## The harness speaks ISA

An app's `ISA.md` (or `bunker.isa.md`) is one file doing four jobs: the spec, the component manifest, the executable test suite, and the stored current state of the application. `bunker test` reads the ISA's `## Test Strategy` table and runs every probe — a criterion's probe **is** its test case. "Add a feature" means adding claims to the ISA that don't hold yet; between builds, the ISA is the app's state of record.

```bash
bunker test [--isa <path>]   # run every probe in an ISA's ## Test Strategy
bunker sync-cloud            # compile adopted apps' probes into the cloud health worker
```

## Bunker runs the deterministic class

An ISA's claims close through three verifier classes (ISAFormat v2.20.0 § *Verifier classes and execution tiers*), and Bunker executes exactly one of them. **Deterministic** rows (`bun-test`, `bun-property`, `bash`, `curl`, `screenshot`) are Bunker's jurisdiction: `bunker test` runs them locally, `sync-cloud` compiles the cloud-portable subset into the health worker. **Judged** rows (`eval`) belong to the model — the Evals skill's `EvalRunner` is their engine — and **attested** rows (`manual`) belong to the principal; Bunker reports their recorded state on the dashboard but never executes either.

Within its class, the `tier` column splits jurisdiction in time. **Fast** rows (seconds) are the blocking surface: dev loop, deploy gate, close gate. **Deep** rows (soak, load, full sweeps) run on Bunker's clock — the scheduled monitor runs them locally, and the cloud health worker runs `deep`-compiled checks hourly (top-of-hour cycle, last verdict carried forward in between) instead of every 5 minutes. A deep failure raises an alert and flips the app's Pulse grade, and never blocks a ship. Development stays fast because the blocking surface is small; the expensive verification still happens, on Bunker's clock instead of the builder's.

## The two always-on planes

- **Observability plane** — a cloud site-health service compiled from each adopted app's `## Test Strategy` (`bunker sync-cloud` → generated manifest → `/status`). Availability and contract probes run continuously without anyone asking.
- **Security plane** — this IS the infra-security scanner running in the execution layer (Arbol), not a separate system. An hourly outsider scan of the full deployed surface: auth boundaries, exposed secrets, headers/TLS/DNS, CORS, and config checks — the estate as an attacker sees it. Never build a parallel scanner.

## The registration rule

**Mandatory for every new public deployment, in the same motion as the deploy:**

1. **Observability plane** — an `ISA.md` with a `## Test Strategy`, adopted via `bunker sync-cloud` (the health contract).
2. **Security plane** — added to the scanner's curated target inventory with its real protected paths and data-probe paths, then redeploy the scanner.

Skip either and the app is invisible to the harness — no health contract, or no hourly auth-boundary assertion. There is no "deploy now, register later."

## Where it fits

Bunker is where the ISA System meets running software. The Algorithm climbs toward an ideal state during a build; Bunker holds the app to that ideal state afterward, re-running its probes for as long as the app lives. Pulse renders the result: every registered app's uptime, last security check, and green/orange/red grade on the card face.

## Cross-references

- Master architecture entry: `LIFEOS/DOCUMENTATION/LifeosSystemArchitecture.md` § Pipeline Topology (Bunker row)
- Component map: `LIFEOS/DOCUMENTATION/CoreComponents.md`
- ISA format: `LIFEOS/DOCUMENTATION/ISA/ISAFormat.md`
- Source docs (private implementation tree, not in the release payload): `LIFEOS/PULSE/Bunker/README.md` + `LIFEOS/PULSE/Bunker/ISA.md`
