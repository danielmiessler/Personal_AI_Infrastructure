/**
 * resolveBun — return an absolute path to the bun binary.
 *
 * Detached / unref'd hook subprocesses can get a minimal PATH, so spawning the
 * bare name `bun` may silently fail (ENOENT) where the parent hook itself ran
 * fine. Inside a bun process `process.execPath` IS the running bun binary — the
 * most reliable source — with Bun.which and known install dirs as fallbacks.
 * Callers should log a failed self-heal spawn, never swallow it silently
 * (public issue #1508 findings #2/#10/#13).
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

export function resolveBun(): string {
  if (process.execPath && /\/bun$/.test(process.execPath)) return process.execPath;
  const viaWhich = typeof Bun !== "undefined" ? Bun.which("bun") : null;
  if (viaWhich) return viaWhich;
  const home = process.env.HOME ?? "";
  for (const c of [join(home, ".bun/bin/bun"), "/opt/homebrew/bin/bun", "/usr/local/bin/bun"]) {
    if (existsSync(c)) return c;
  }
  return "bun"; // last-resort bare name — caller logs if the spawn then fails
}
