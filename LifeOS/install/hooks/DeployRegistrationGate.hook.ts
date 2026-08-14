#!/usr/bin/env bun
/**
 * @version 1.0.1
 * DeployRegistrationGate.hook.ts — new-public-site registration teeth.
 *
 * Contract (OPERATIONAL_RULES § Bunker registration): a wrangler deploy that attaches a
 * CUSTOM DOMAIN in this session must leave the session with that domain
 * registered in BOTH:
 *   1. LIFEOS/USER/PROJECTS.md                     (the projects table row)
 *   2. LIFEOS/USER/CUSTOMIZATIONS/ARBOL/Shared/infra-inventory.ts
 *      (Bunker security plane, curated target)
 * Bunker's observability plane (adopt/sync-cloud) is process, not a greppable
 * artifact, so the two checkable artifacts above are the gate's scope — the
 * doctrine checklist in OPERATIONAL_RULES § Bunker registration carries the rest.
 *
 * Deterministic: domains are read from wrangler's own deploy trigger lines in
 * the transcript (two-space-indented domain followed by a custom-domain marker,
 * at a real line start); registration is a literal substring check on the two
 * artifacts. The line-start anchor keeps the gate from matching a bare mention
 * of that shape in prose or in this very file's source. Blocks ONCE per domain per
 * session (state-file dedupe), then stays out of the way. Fails open on any
 * error — this gate must never be why a Stop breaks. Installs without the
 * ARBOL customization simply skip that check (file absent → not required).
 *
 * Runnable standalone: bun DeployRegistrationGate.hook.ts < hook-input.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { readHookInput, parseTranscriptFromInput } from "./lib/hook-io";

const HOME = homedir();
const PROJECTS_MD = join(HOME, ".claude/LIFEOS/USER/PROJECTS.md");
const INVENTORY_TS = join(HOME, ".claude/LIFEOS/USER/CUSTOMIZATIONS/ARBOL/Shared/infra-inventory.ts");
const STATE_DIR = join(HOME, ".claude/LIFEOS/MEMORY/STATE");
const STATE_PATH = join(STATE_DIR, "deploy-registration-gate.json");

// wrangler deploy trigger lines: `  <domain> (custom domain)` — wrangler emits
// this ONLY for real custom domains, never *.workers.dev, so no ignore list.
// The transcript's raw JSONL escapes real newlines as the two characters "\n",
// so the boundary anchor is (real newline | escaped-newline | array/string
// start), NOT `^`-multiline. Anchoring to a line boundary is what stops the
// gate matching an inline mention like `( "  x.io (custom domain)" )` in prose
// or in a source file shown in the transcript — the founding false positive.
const CUSTOM_DOMAIN_RE = /(?:\\n|\n)\s{2,}([a-z0-9][a-z0-9.-]+\.[a-z]{2,})\s+\(custom domain\)/gi;

function blockedSet(): Set<string> {
  try {
    return new Set(JSON.parse(readFileSync(STATE_PATH, "utf-8")) as string[]);
  } catch {
    return new Set();
  }
}
function recordBlocked(fp: string): void {
  try {
    mkdirSync(STATE_DIR, { recursive: true });
    const s = blockedSet();
    s.add(fp);
    writeFileSync(STATE_PATH, JSON.stringify([...s]));
  } catch {}
}

export async function run(
  input: NonNullable<Awaited<ReturnType<typeof readHookInput>>>,
): Promise<object | null> {
  try {
    const t = await parseTranscriptFromInput(input);
    const domains = new Set<string>();
    for (const m of t.raw.matchAll(CUSTOM_DOMAIN_RE)) {
      domains.add(m[1].toLowerCase().replace(/^www\./, ""));
    }
    if (domains.size === 0) return null;

    const projects = existsSync(PROJECTS_MD) ? readFileSync(PROJECTS_MD, "utf-8") : "";
    // Optional customization: absent file → check not required on this install.
    const inventory = existsSync(INVENTORY_TS) ? readFileSync(INVENTORY_TS, "utf-8") : null;
    const seen = blockedSet();
    const sid = (input as { session_id?: string }).session_id ?? "s";

    for (const d of domains) {
      const missing: string[] = [];
      if (!projects.includes(d)) missing.push("PROJECTS.md row (+ routing alias)");
      if (inventory !== null && !inventory.includes(d))
        missing.push("ARBOL infra-inventory.ts curated target (then redeploy the infra-security workers)");
      const fp = `${sid}:${d}`;
      if (missing.length && !seen.has(fp)) {
        recordBlocked(fp);
        return {
          decision: "block",
          reason:
            `UNREGISTERED PUBLIC DEPLOY [DeployRegistrationGate]. This session deployed a worker with the custom domain ` +
            `"${d}", but it was never registered in: ${missing.join(" AND ")}. Every public site is registered in the same ` +
            `motion as its deploy (OPERATIONAL_RULES § Bunker registration): add the missing registration(s), run ` +
            `\`bunker adopt\` + \`bunker sync-cloud --deploy\` if not yet adopted, then restate. Fires once per domain per session.`,
        };
      }
    }
    return null;
  } catch (err) {
    console.error("[DeployRegistrationGate] error (failing open):", err);
    return null;
  }
}

// Standalone shim
if (import.meta.main) {
  (async () => {
    const input = await readHookInput();
    if (!input) process.exit(0);
    const d = await run(input);
    if (d) console.log(JSON.stringify(d));
    process.exit(0);
  })();
}
