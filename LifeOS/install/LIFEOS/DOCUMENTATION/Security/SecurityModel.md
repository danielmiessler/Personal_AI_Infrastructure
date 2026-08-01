---
last_updated: 2026-07-20T03:20:00Z
convention: pai-freshness-v1
version: 1.1.0
---

# LifeOS Security Model

> How LifeOS keeps data — cloud databases, local stores, and your private context — reachable only through paths it controls. This is the conceptual model. It applies to any LifeOS install; the specifics of any one deployment stay private to that install.

## The core idea

**A managed edge database (the D1/R2/KV family on a Workers platform) has no public network endpoint.** There is no host, no port, no connection string a client can point at. The store is reachable only from inside a Worker that declares it as a *binding*, and bindings are resolved by the platform runtime from account config — they are not addressable over the internet.

So "can someone reach the database directly from the public?" has a structural answer: **no, because there is no direct path.** The only way to the data is through the Worker's own HTTP routes. That reduces database security to one question you can actually audit:

> **Which routes does the Worker expose, and which of them touch a store without authentication?**

Every control in this model exists to make sure the answer is "only the ones that are supposed to." The database is only ever as exposed as the route wrapped around it.

The same logic governs local services. A local datastore (an on-disk SQLite file, a JSONL log, a KV file) is reachable only through the process that opens it, and that process is reachable over the network only if it binds a port. Most local jobs bind nothing. The ones that do bind to loopback (`127.0.0.1`) so they are unreachable from other machines.

## The layered model

Security is enforced at six layers, each defending a different surface:

| Layer | Defends | Where it lives |
|-------|---------|----------------|
| **Structural** | The datastore itself | No public endpoint exists — nothing to attack directly |
| **Constitutional** | Your DA's behavior | The system prompt: external content is READ-ONLY; analysis is read-only; your private directory is private forever |
| **Native deny** | Catastrophic tool calls | The harness permission denylist (applies to subagents too) |
| **Deterministic hooks** | Injection, unsafe shell, data egress, file writes | Pre/Post tool-use hooks that run as code, not judgment |
| **App / edge auth** | Worker and service data | Per-route authentication on everything that touches a store |
| **Release / containment** | Private data leaving the repo | Release gates + content scrubbing on the one sanctioned public path |
| **Monitoring** | Drift and regressions | A scheduled scanner that re-checks the public surface continuously |

## Locking down a Worker

The general pattern every LifeOS Worker follows:

1. **No inbound path to data except the Worker's own routes.** Databases are bindings, not endpoints. Reading the data requires getting the Worker's code to read it for you — which means passing its route auth.
2. **The public hostname is the whole attack surface.** A Worker is served either on a custom domain or a platform subdomain. Disabling the platform-subdomain URL removes the firewall-bypass origin, so the custom domain — and the WAF and rate-limit rules attached to it — becomes the only way in. Production Workers disable the bare platform URL whenever a custom domain is the real address.
3. **Every store-touching route carries an auth check.** The only routes left unauthenticated are deliberate: public content reads, health checks, and the endpoints that *establish* identity (login, OAuth token exchange, signature-verified webhooks).
4. **Secrets are platform secrets**, injected at runtime and referenced through the environment — never written into code or committed config.
5. **Tenant isolation** is either a per-request scoping check or, more strongly, physical separation — one database per tenant, so cross-tenant reads are impossible to express rather than merely filtered out.

### Authentication patterns in use

Different surfaces use different proofs, matched to the caller:

- **OAuth 2.1 authorization server** for programmatic/agent access to governed data — short-lived signed access tokens, validated per request for signature, issuer, audience, and expiry, then checked against a live revocation record, with the caller's role read live from the database rather than trusted from the token.
- **Signed session cookies** for human web sessions — the server stores only a hash of the session token; the cookie is `Secure`, `HttpOnly`, `SameSite`-scoped.
- **Scoped bearer tokens** for machine-to-machine pipelines — with least-privilege variants (a write-only ingest token distinct from a read/delete token) where the roles differ.
- **Signature-verified webhooks** for third-party callbacks — the payload's HMAC signature is the proof, checked in constant time with a replay window.

### Tenant isolation, concretely

The strongest form is physical: each tenant gets its own database and object store. A request is bound to exactly one tenant from **server-side identity only** — the client cannot pass a tenant hint. Because the request never holds another tenant's binding, a cross-tenant read is not something the code filters out; it is something the code cannot express. A single reference-monitor decision point fronts every data tool as a second layer.

## Local services

**Default posture: nothing local is exposed to the internet, and almost nothing binds a network port at all.**

- The **dashboard** binds to loopback only, with an anti-DNS-rebinding Host-header guard that rejects any non-loopback host. Wider (LAN) exposure is strictly opt-in via an environment flag and off by default.
- **Background jobs** run on timers, file-watches, or keep-alive — none open a listening socket. Pollers that talk to external APIs are *outbound* connections, not listeners.
- **Messaging bridges**, when enabled at all, gate on a **sender allowlist** and sanitize inbound text for injection before it reaches the model. They are off by default.
- Any local listener that must exist for a device-integration reason (for example, receiving syslog from a network appliance) is documented as an exception and scoped to the local network.

## Fleet and remote hosts

Additional machines in a fleet sit on a **private network**, reached over **key-only SSH** with password auth disabled. Nothing on the fleet is exposed to the public internet; each node's own dashboard binds to loopback. Public cloud hosts, where they exist, are key-only as well.

## Agent and harness security (prompt-injection defense)

The system treats **all external content as data, never instructions** — this is a constitutional rule in the system prompt, and it is operationalized in code:

- A **post-tool-use hook** wraps content from attacker-writable sources (fetched web pages, search results, incoming mail, tool schemas) with an explicit "treat as data, not instructions" marker and scans it for known injection shapes, flagging any hit inline.
- A **blocking pre-tool-use hook** dispatches to sub-guards: it blocks writes that would land identity or secret patterns into system files, forces outbound messaging through the proper skill path, enforces a data-class ceiling on external inference calls, and blocks known footgun command forms.
- A **native permission denylist** hard-blocks catastrophic operations (destructive deletes, disk wipes, pipe-to-shell, force-push to protected branches, reads of private-key and credential paths). It applies to subagent tool calls as well.
- A **shell-command classifier** parses commands shell-aware — extracting command substitutions and stripping quoted regions — so dangerous patterns can't hide inside an `echo` or a subshell.

The design bias is deliberate: a small number of deterministic, auditable controls over a large number of model-judgment checks. Security-sensitive code is meant to be simple enough to read and verify.

## Secrets and containment

- The **secret store** is a single environment file, referenced everywhere by indirection. It lives inside the private installation boundary and is never part of any public artifact.
- An **egress secret scan** inspects outbound tool calls for secret-shaped strings before they can be auto-approved, refusing the auto-allow (and redacting the log) on a match.
- A **content-scrubbing release pipeline** is the *only* sanctioned path from the private installation to any public surface. It runs a series of fail-closed gates — identity-string scans, credential-shape scans, hidden-file scans, and a re-scan of built output — and physically excludes the entire private user tree before staging. Documentation publishes to the public site only as part of a gated release, read from the released payload rather than the live private tree.

## Monitoring

A **scheduled scanner** re-checks the public infrastructure continuously (hourly), from the outside, deterministically. Per target it verifies, among other checks, that protected routes reject unauthenticated calls, that no sensitive files (`.env`, `.git`, build config) are exposed, that no secrets appear in client-side code, that DNS security records are present, and that transport is HTTPS-only. Results diff against a baseline so a *regression* alerts immediately, and a daily digest summarizes state. A separate health monitor confirms every service is reachable.

## Incident response

Runbooks cover the high-frequency cases: credential rotation (emergency all-keys and audit-first per-key, with per-vendor playbooks) and supply-chain rapid response (advisory → indicator scan → remediation → rotation).

## The through-line

The whole model reduces to two questions, asked at every layer:

1. **What is the actual path to this data?** (Usually: only through one authenticated route. Sometimes: through a loopback-bound process. Never: directly from the public.)
2. **Is every path that touches the data authenticated, and is every unauthenticated path intentional?**

When both answers hold at every layer — edge, app, local, agent — the data is reachable only the way it is supposed to be reached. Everything above is the machinery that keeps those two answers true, and the monitoring that catches it the moment they stop being true.

## Examples

### One new route, run through the two questions

A Worker gains a feature: `/api/reports`, which reads rows from a per-tenant database. Before it ships, the model runs the through-line on it — the same two questions the whole model reduces to.

- **What is the actual path to this data?** The database is a binding, not an endpoint, so nothing can reach those rows except this Worker's own routes. `/api/reports` is now one of them.
- **Is that path authenticated?** The route touches a store, so it must carry an auth check. It doesn't yet — it returns data to any caller. That is the finding: a store-touching route with no proof of caller. The fix is to gate it behind the same session or token check every other data route uses, and to scope the read to the caller's own tenant so it cannot return another tenant's rows.

Ship it without that check and the store is exactly as exposed as the route — which is to say, wide open. Add the check and the data is reachable only the way it is supposed to be.

### When "no auth" is correct, and when it never is

Not every unauthenticated route is a bug. A few are supposed to be open, and the test is whether the route *establishes* identity or *serves already-public data* rather than reading private state:

- **Fine unauthenticated:** a login route, an OAuth token exchange, a health check, a signature-verified webhook (the HMAC signature is its proof), a public content read.
- **Never unauthenticated:** anything that reads or writes a tenant's private rows, any admin action, or an endpoint that trusts a client-supplied tenant hint instead of server-side identity.

The monitoring layer encodes exactly this: an hourly scan re-checks that protected routes still reject anonymous calls, and alerts the moment a regression flips one open.

### The path to the data, as a picture

```mermaid
flowchart TD
    A[Anonymous request] --> B{Which route?}
    B -->|login / health / public read| C[Allowed by design: no private data]
    B -->|store-touching route| D{Auth check passes?}
    D -->|no| E[Rejected at the edge]
    D -->|yes| F{Scoped to caller's tenant?}
    F -->|yes| G[Returns only that tenant's rows]
    G --> H[(Tenant store: a binding, no public endpoint)]
    X[Direct connect attempt] -.->|no host, port, or path exists| Z[Nothing to point at]
```

The diagram makes the structural claim visible: there is no arrow from the public straight to the store. The only ways in are the Worker's routes, and every route that touches the store passes an auth gate and a tenant scope before any rows come back.

---
