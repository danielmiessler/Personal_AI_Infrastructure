/**
 * LifeOS Pulse — canonical base URL for the local Pulse server.
 *
 * public issue #1618, @asdf8675309
 *
 * Pulse binds IPv4 only (pulse.ts: `hostname: bindAll ? "0.0.0.0" : "127.0.0.1"`),
 * so nothing ever listens on `::1`. On a stock macOS `/etc/hosts`, `localhost`
 * resolves to both `::1` and `127.0.0.1`, and Bun/Node happy-eyeballs will try
 * the IPv6 address first on a share of calls — each one stalls on a dead
 * address before falling back. Hardcoding the IPv4 literal removes the stall
 * without changing behaviour for anyone.
 *
 * Deliberately dependency-free so hooks, LIFEOS/TOOLS utilities and skill tools
 * can import it without dragging in Pulse's config layer (lib.ts pulls
 * smol-toml and the model registry). lib.ts re-exports it, so Pulse-internal
 * callers can keep importing from there.
 *
 * Override with PULSE_URL when Pulse runs on another host or port (remote
 * fleet member, non-default port). No trailing slash — callers append paths.
 */
export const PULSE_BASE = process.env.PULSE_URL ?? "http://127.0.0.1:31337"
