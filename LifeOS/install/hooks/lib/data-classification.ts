/**
 * DATA CLASSIFICATION × INFERENCE-SOURCE ROUTING
 *
 * Machine-readable form of LIFEOS/DOCUMENTATION/Security/DataClassification.md.
 * Consumed by egress-class-core.ts (behind hooks/EgressClassGuard.hook.ts) — a policy
 * change is a table edit, never code. Fail-closed.
 *
 * The ceiling is per-ROUTE (source + model + residency). Three rules, most-restrictive wins:
 *   1. RESTRICTED-capable vendors: Anthropic + OpenAI ONLY.
 *   2. Chinese-origin MODEL (GLM/Z.ai, Kimi/Moonshot, MiniMax, Qwen, DeepSeek) => INTERNAL
 *      ceiling; opaque broker without a residency guarantee => PUBLIC.
 *   3. US/allied model, US inference, US company, no CN/RU egress => CONFIDENTIAL.
 *   Else => PUBLIC. LOCAL (on-device) => everything.
 */

export type DataClass = "RESTRICTED" | "CONFIDENTIAL" | "INTERNAL" | "PUBLIC";
export type InferenceSource = "LOCAL" | "NATIVE" | "FORGE" | "GENE";

/** Vendors cleared for RESTRICTED. */
const RESTRICTED_CAPABLE_VENDORS = ["anthropic", "openai"] as const;

/** Chinese-origin model families — capped at INTERNAL by rule 2. */
const CHINESE_MODEL_PATTERNS: RegExp[] = [/glm/i, /z-?ai/i, /kimi/i, /moonshot/i, /minimax/i, /qwen/i, /deepseek/i];

function isChineseModel(model: string): boolean {
  return CHINESE_MODEL_PATTERNS.some((re) => re.test(model));
}

/** Sensitivity ordinal — lower = more sensitive. */
export const CLASS_RANK: Record<DataClass, number> = { RESTRICTED: 0, CONFIDENTIAL: 1, INTERNAL: 2, PUBLIC: 3 };

export interface InferenceRoute {
  source: InferenceSource;
  vendor: string;                 // 'anthropic' | 'openai' | 'openrouter' | 'local'
  model: string;
  inferenceCountry?: string;      // best-known inference location, e.g. 'US'
  companyCountry?: string;        // vendor HQ country
  residencyGuaranteed?: boolean;  // true ONLY if pinned to a US provider with no China/Russia egress path
}

/** The maximum (most-sensitive) data class a route may process. */
export function maxClassForRoute(r: InferenceRoute): DataClass {
  if (r.source === "LOCAL") return "RESTRICTED";
  if ((RESTRICTED_CAPABLE_VENDORS as readonly string[]).includes(r.vendor)) return "RESTRICTED";
  if (isChineseModel(r.model)) return r.residencyGuaranteed ? "INTERNAL" : "PUBLIC";
  if (r.inferenceCountry === "US" && r.companyCountry === "US" && r.residencyGuaranteed) return "CONFIDENTIAL";
  return "PUBLIC";
}
