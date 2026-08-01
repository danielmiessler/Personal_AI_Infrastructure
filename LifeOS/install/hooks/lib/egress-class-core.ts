/**
 * egress-class-core.ts — pure classification core for EgressClassGuard.hook.ts.
 *
 * Decides whether a Tier-2 inference Bash call (OpenRouter.ts)
 * carries content above the route's data-class ceiling. The route ceiling comes
 * from LIFEOS/TOOLS/models.ts (maxClassForRoute); the payload class comes from a
 * deterministic scan of the command string (secret-shapes + sensitive path refs).
 *
 * No LLM. No I/O. Pure functions, unit-testable. Mirrors system-file-guard-core.ts.
 *
 * SCOPE (v1): gates the GLM/OpenRouter route (the capped source). FORGE (codex) and
 * NATIVE are RESTRICTED-capable per policy, so they are not class-gated here.
 * The check is detect-and-block (secrets + known-sensitive paths), not full
 * fail-closed on every payload — that would make the GLM route unusable. Residual
 * gap: free-prose PII with no token-shape and no path ref is not caught (documented
 * in LIFEOS/DOCUMENTATION/Security/DataClassification.md).
 */

import {
  maxClassForRoute,
  CLASS_RANK,
  type DataClass,
  type InferenceRoute,
} from "./data-classification";

/** Secret VALUE shapes — credentials/tokens that must never reach a capped route. */
export const SECRET_VALUE_SHAPES: readonly RegExp[] = [
  /sk-or-v1-[A-Za-z0-9]{16,}/,            // OpenRouter
  /\bcsk-[A-Za-z0-9]{16,}/,               // Cerebras
  /\bsk-(?:ant-|proj-|live-)?[A-Za-z0-9]{20,}/, // OpenAI / Anthropic-style
  /\bghp_[A-Za-z0-9]{20,}/,               // GitHub PAT
  /\bglpat-[A-Za-z0-9_-]{16,}/,           // GitLab PAT
  /\bAKIA[0-9A-Z]{16}\b/,                 // AWS access key id
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/,       // Slack
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,   // PEM private keys
  /\bAIza[0-9A-Za-z_-]{30,}/,             // Google API key
  /Bearer\s+[A-Za-z0-9._-]{24,}/,         // bearer tokens
];

/** Sensitive path references — path list mirrored in
 * LIFEOS/DOCUMENTATION/Security/DataClassification.md (a former claim that this
 * mirrors a data-classification.json was wrong: no such file exists — public
 * issue #1615, @JohnnyDisco7).
 * Most-sensitive match wins (RESTRICTED sub-paths beat the LIFEOS/USER CONFIDENTIAL default). */
export const PATH_CLASS_RULES: ReadonlyArray<{ re: RegExp; cls: DataClass }> = [
  { re: /(?:^|[\s'"`\/=])\.env\b/, cls: "RESTRICTED" },
  { re: /(?:LIFEOS|PAI)\/USER\/CONFIG\/CREDENTIALS\//, cls: "RESTRICTED" },
  // Customer-work anchor covers the SHIPPED scaffold names, not just this
  // machine's CUSTOMERS/ dir — on a stock install CUSTOMERS/ never exists, so
  // the old anchor was dead for every user (public issue #1615, @JohnnyDisco7).
  { re: /(?:LIFEOS|PAI)\/USER\/WORK\/(?:CUSTOMERS|YOUR_COMPANIES|SAMPLE_CUSTOMER|SAMPLE_CONSULTING)\//, cls: "RESTRICTED" },
  { re: /skills\/_[A-Z]/, cls: "CONFIDENTIAL" }, // any private (underscore-prefixed) skill dir — generalized off a hardcoded customer prefix. Customer-RESTRICTED data is caught by USER/WORK/CUSTOMERS above + the release deny-list; on the capped GLM route (PUBLIC ceiling) CONFIDENTIAL blocks identically to RESTRICTED.
  { re: /(?:LIFEOS|PAI)\/USER\/(?:TELOS\/)?FINANCES\//, cls: "RESTRICTED" }, // canonical USER/FINANCES since 2026-07-12; TELOS/ form kept as legacy alias — never weaken
  { re: /(?:LIFEOS|PAI)\/USER\/(?:TELOS\/)?HEALTH\//, cls: "RESTRICTED" }, // health data home (was TELOS/HEALTH); previously only caught by the CONFIDENTIAL default
  { re: /(?:LIFEOS|PAI)\/USER\/CONTACTS\.md/, cls: "RESTRICTED" },
  { re: /(?:LIFEOS|PAI)\/MEMORY\/KNOWLEDGE\/(?:People|Companies)\//, cls: "CONFIDENTIAL" },
  { re: /(?:LIFEOS|PAI)\/MEMORY\/(?:RELATIONSHIP|SECURITY)\//, cls: "CONFIDENTIAL" },
  { re: /(?:LIFEOS|PAI)\/USER\//, cls: "CONFIDENTIAL" }, // privacy-boundary default
];

/** Classify a payload string. Most-sensitive signal wins; clean text => PUBLIC. */
export function classifyText(text: string): DataClass {
  for (const re of SECRET_VALUE_SHAPES) if (re.test(text)) return "RESTRICTED";
  let worst: DataClass = "PUBLIC";
  for (const { re, cls } of PATH_CLASS_RULES) {
    if (re.test(text) && CLASS_RANK[cls] < CLASS_RANK[worst]) worst = cls;
  }
  return worst;
}

// Require an actual `bun`/`bunx` EXECUTION of the tool (not a mere mention in a
// grep/cat/ls command) to avoid false positives on commands that reference the
// filename without running it.
const GENE_EXEC = /\b(?:bun|bunx)\s+[^|;&\n]*?\bOpenRouter\.ts\b/;

/**
 * US-based providers with ZDR support. ONLY these grant a Chinese-origin model
 * (GLM) the INTERNAL ceiling — residency genuinely off CN/RU. A bare `--pin` is
 * NOT enough (a pin to Novita/Z.AI would route to Asia); residency must be real,
 * not asserted by flag presence. Pinning to anything outside this set keeps the
 * route at PUBLIC. Matched case-insensitively, punctuation-stripped, against the
 * `--pin` value. Edit this list to add a verified US+ZDR OpenRouter provider.
 */
export const US_ZDR_PROVIDERS: readonly string[] = [
  "fireworks", "deepinfra", "baseten", "together", "lambda", "cloudflare",
];

/** True if `p` (a `--pin` provider value) is a verified US+ZDR provider. */
export function isUsZdrProvider(p: string | undefined): boolean {
  if (!p) return false;
  return US_ZDR_PROVIDERS.includes(p.toLowerCase().replace(/[^a-z0-9]/g, ""));
}

export function detectRoute(command: string): InferenceRoute | null {
  if (GENE_EXEC.test(command)) {
    // Residency is real ONLY when pinned to an allowlisted US+ZDR provider.
    // Unpinned, or pinned to a non-US provider => PUBLIC ceiling (fail-closed).
    const pinMatch = command.match(/--pin\s+(\S+)/);
    const pinProvider = pinMatch ? pinMatch[1].replace(/['"]/g, "") : undefined;
    const usZdr = isUsZdrProvider(pinProvider);
    const m = command.match(/--model\s+(\S+)/);
    const model = m ? m[1].replace(/['"]/g, "") : "z-ai/glm-5.2";
    return {
      source: "GENE", vendor: "openrouter", model,
      inferenceCountry: usZdr ? "US" : undefined,
      companyCountry: usZdr ? "US" : undefined,
      residencyGuaranteed: usZdr,
    };
  }
  // codex exec = FORGE (RESTRICTED-capable) — not class-gated. NATIVE is in-process.
  return null;
}

export interface EgressDecision {
  block: boolean;
  route?: InferenceRoute;
  ceiling?: DataClass;
  payloadClass?: DataClass;
  reason?: string;
}

/** Evaluate a Bash command for a Tier-2 egress-class violation. */
export function evaluateEgress(command: string): EgressDecision {
  const route = detectRoute(command);
  if (!route) return { block: false };
  const ceiling = maxClassForRoute(route);
  const payloadClass = classifyText(command);
  const block = CLASS_RANK[payloadClass] < CLASS_RANK[ceiling];
  return {
    block,
    route,
    ceiling,
    payloadClass,
    reason: block ? `payload classified ${payloadClass} exceeds ${route.source} (${route.model}) ceiling ${ceiling}` : undefined,
  };
}
