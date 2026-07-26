#!/usr/bin/env bun
/**
 * ============================================================================
 * MODELS — single source of truth for model IDs across LifeOS
 * ============================================================================
 *
 * WHY THIS EXISTS:
 * Model IDs used to be pinned in scattered files. On a new model release the
 * updates were a manual scramble and drifted silently (e.g. ContextAudit
 * checked for claude-opus-4-7 long after claude-opus-4-8 shipped). This file
 * is the one place that knows current IDs. Consumers either:
 *   (a) use a tier ALIAS ("opus"/"sonnet"/"haiku") — auto-resolves to latest,
 *       no registry needed (preferred — see Pulse manifests, Inference.ts), or
 *   (b) import CURRENT[...] from here when they genuinely need a pinned ID
 *       (e.g. a drift-check that must name the expected latest).
 *
 * ON A NEW RELEASE: bump CURRENT below (one edit), then `bun UpdateModels.ts
 * --check` confirms nothing else drifted. The _NEWS Anthropic monitor surfaces
 * a proposal when it detects a new model; application is propose-not-auto.
 *
 * NOT IN SCOPE: cross-vendor pins (Forge gpt-5.6-sol, build+audit modes) track their own
 * vendors — recorded here for inventory, never auto-bumped to Claude.
 * ============================================================================
 */

export type ClaudeTier = "opus" | "sonnet" | "haiku" | "fable";

/**
 * ============================================================================
 * EFFORT LEVELS — the four-level abstraction over the Claude lineup
 * ============================================================================
 *
 * Consumers name INTENT (max/high/medium/low), never a model name. Two
 * independent edit points keep the system cohesive across model churn:
 *
 *   Layer 1  EFFORT_MODEL  level → tier   edit when the LINEUP changes
 *                                          (a model enters/exits the
 *                                          subscription, or moves rungs)
 *   Layer 2  CURRENT       tier → ID      edit when a VERSION releases
 *
 * NO ROUTING POLICY LIVES HERE (baseline, 2026-07-11, principal directive):
 * which level a given piece of work gets is {{DA_NAME}}'s per-dispatch judgment —
 * no hook injection, no classifier, no tier rubric. This table is the dial
 * behind `Inference.ts --level` and the display labels (statusline,
 * AgentInvocation logging). `medium`/`low` exist so cheap utility calls
 * (classification, summarization, vision triage) have named rungs.
 */
export type EffortLevel = "max" | "high" | "medium" | "low";

/**
 * Level → tier binding. THIS IS THE SINGLE EDIT POINT on a lineup change.
 * Example: Fable exits the subscription → `max: "opus"` and every consumer
 * follows; no other code changes. Fable is the top rung (~2× Opus cost), so
 * `max` and `high` are distinct models and the Inference.ts max-fallback
 * (fable→opus) is a genuinely real degraded path.
 *
 * BASELINE (2026-07-11, principal directive — supersedes every prior routing
 * decision in this file's history; see ALGORITHM/changelog.md): model
 * selection is {{DA_NAME}}'s per-dispatch judgment. The saved `/model` default is
 * Fable 5 [1m] (settings.json). No hook injects models (AgentInvocation
 * v1.3.0 observes only), no classifier routes tiers, no rubric maps work to
 * rungs. Unspecified delegate models inherit the session model (harness
 * behavior).
 *
 * CARRIER REALITY — tool-contract facts, not steering. THIS COMMENT IS THE
 * CANONICAL HOME of these facts — prose elsewhere (OPERATIONAL_RULES,
 * Algorithm §Spend) carries one line + a pointer here, never a restatement.
 * Freshness: `CarrierProbe.ts` re-probes end-to-end (dispatch → subagent
 * transcript model read-back) and records to MEMORY/STATE/carrier-probe.json;
 * /ic fails when the probe is stale (>30d) or contradicts DISPATCH_EXECUTES_FABLE.
 *
 * PROBED 2026-07-12 (CarrierProbe.ts first run + manual inheritance leg;
 * evidence = subagent transcript assistant-message model, no fallback blocks).
 * This FLIPPED the 2026-07-07/-11 facts — a harness update fixed dispatch:
 *   - Agent dispatches now execute their model FAITHFULLY: explicit
 *     `model: fable` executed claude-fable-5, and bare inheritance from a
 *     Fable main loop executed claude-fable-5. The old downgrade-to-Opus
 *     behavior is GONE. (History: 07-07/-11 probes showed both paths running
 *     claude-opus-4-8 with a `fallback` block; see git history of this file.)
 *   - Genuine Fable carriers are therefore: the main loop, `Inference.ts
 *     --level max`, AND Agent dispatch. A subagent's self-report is still
 *     NOT evidence — the transcript is.
 *   - VERIFICATION (integrity linchpin): Inference.ts reads the executed
 *     model back from the JSON envelope's modelUsage (verifyExecutedModel —
 *     filters the background haiku pass, takes the highest-output model as
 *     the answer's author, checks its family) and logs any downgrade to
 *     model-verification.jsonl. The system reports what RAN, never what it
 *     requested.
 */

/** Machine-readable carrier fact: do Agent dispatches execute Fable when asked
 * (explicitly or via inheritance)? CarrierProbe.ts verdicts compare live
 * observation against THIS value; the statusline maps fable-labeled and
 * fable-inherited dispatches to the FABLE rung only when true. Flip ONLY on
 * transcript evidence from a probe run. Last probe: 2026-07-12 (true). */
export const DISPATCH_EXECUTES_FABLE = true;
export const EFFORT_MODEL: Record<EffortLevel, ClaudeTier> = {
  max: "fable",   // top rung (~2× Opus)
  high: "opus",
  medium: "sonnet",
  low: "haiku",
};

/**
 * THREE DISTINCT "level" dials — don't conflate (this file maps dials 1↔2):
 *   1. MODEL RUNG (EFFORT_MODEL above): which Claude model runs — max|high|medium|low.
 *   2. REASONING EFFORT (HarnessEffort): how hard a model thinks within itself,
 *      Claude-Code-owned (`/effort`/settings/`--effort`); a hook can read but NOT
 *      set the main loop's value. LifeOS runs UNIFORMLY at `high` and emits no other
 *      level (principal directive 2026-07-06); the statusline still shows the full scale.
 *   3. COMPOSITION (ultracode): whether to fan a task into a multi-agent Workflow —
 *      not an effort level; rides on `high`, detected via output-style, orthogonal to 1&2.
 */

/** Axis 2: the harness reasoning-effort knob (Claude Code `--effort`). */
export type HarnessEffort = "low" | "medium" | "high" | "xhigh" | "max";

/**
 * MODEL RUNG → REASONING EFFORT (consumed by Inference.ts). Uniformly `high` —
 * every rung thinks at high; the MODEL rung still varies (EFFORT_MODEL).
 */
export const LEVEL_TO_HARNESS_EFFORT: Record<EffortLevel, HarnessEffort> = {
  max: "high",
  high: "high",
  medium: "high",   // effort uniformly high 2026-07-06 (model rung still varies via EFFORT_MODEL)
  low: "high",
};

/** Auto-tracking alias for an effort level (preferred — never drifts). */
export function modelForEffort(level: EffortLevel): string {
  return ALIAS[EFFORT_MODEL[level]];
}

/** Current pinned ID for an effort level (when an exact ID is required). */
export function pinnedModelForEffort(level: EffortLevel): string {
  return CURRENT[EFFORT_MODEL[level]];
}

/**
 * Current Claude model IDs. THIS IS THE SINGLE EDIT POINT on a model release.
 * Verify the exact string against the models overview / migration guide before
 * bumping. `bun UpdateModels.ts --apply <tier> <id>` rewrites these safely.
 */
export const CURRENT: Record<ClaudeTier, string> = {
  fable: "claude-fable-5",
  opus: "claude-opus-5",
  sonnet: "claude-sonnet-5",
  haiku: "claude-haiku-4-5-20251001",
};

/**
 * Tier aliases. The `claude` CLI and spawnClaude resolve these to the latest
 * model in the tier automatically. Prefer these in consumers that accept a
 * string and don't need a pinned ID — they never drift.
 */
export const ALIAS: Record<ClaudeTier, string> = {
  fable: "fable",
  opus: "opus",
  sonnet: "sonnet",
  haiku: "haiku",
};

/**
 * Cross-vendor pins — inventory only. These track their own vendors' cadence
 * and are NEVER auto-bumped to a Claude model. Recorded so the updater's drift
 * scan can distinguish intentional non-Claude pins from stale Claude pins.
 */
export const CROSS_VENDOR: Record<string, string> = {
  forge: "gpt-5.6-sol",  // OpenAI (Tier-2 egress); covers build + audit modes
  codexResearcher: "gpt-5.6-sol",  // OpenAI (Tier-2 egress)
  grokResearcher: "grok-4.5",  // xAI (Tier-2 egress); engine behind Grok.ts — keep in sync with its --model default
  gene: "z-ai/glm-5.2",  // OpenRouter broker (Tier-2, most opaque); GLM 5.2 via OpenRouter.ts; default-pinned US+ZDR (Fireworks) => INTERNAL ceiling, unpinned => PUBLIC
};

/**
 * ============================================================================
 * DATA CLASSIFICATION × INFERENCE-SOURCE ROUTING (LifeOS doctrine 2026-06-18)
 * ============================================================================
 * Machine-readable form of LIFEOS/DOCUMENTATION/Security/DataClassification.md.
 * hooks/lib/egress-class-core.ts (consumed by hooks/EgressClassGuard.hook.ts)
 * reads these — a policy change is a table edit, never code. Fail-closed.
 *
 * The ceiling is per-ROUTE (source + model + residency). Three rules, most-
 * restrictive wins:
 *   1. RESTRICTED-capable vendors: Anthropic (NATIVE) + OpenAI (FORGE) ONLY.
 *   2. Chinese-origin MODEL (GLM/Z.ai, Kimi/Moonshot, MiniMax, Qwen, DeepSeek)
 *      => INTERNAL ceiling; opaque broker w/o residency guarantee => PUBLIC.
 *   3. US/allied model, US inference, US company, no CN/RU egress => CONFIDENTIAL.
 *   Else => PUBLIC. LOCAL (on-device) => everything.
 */
export type DataClass = "RESTRICTED" | "CONFIDENTIAL" | "INTERNAL" | "PUBLIC";
export type InferenceSource = "LOCAL" | "NATIVE" | "FORGE" | "GENE";

/** Egress trust tier per source (0 = on-device / highest trust). */
export const SOURCE_TIER: Record<InferenceSource, number> = {
  LOCAL: 0, NATIVE: 1, FORGE: 2, GENE: 2,
};

/** Vendors cleared for RESTRICTED ({{PRINCIPAL_NAME}}'s directive: Anthropic + OpenAI only). */
export const RESTRICTED_CAPABLE_VENDORS = ["anthropic", "openai"] as const;

/** Chinese-origin model families — capped at INTERNAL by rule 2. */
export const CHINESE_MODEL_PATTERNS: RegExp[] = [/glm/i, /z-?ai/i, /kimi/i, /moonshot/i, /minimax/i, /qwen/i, /deepseek/i];
export function isChineseModel(model: string): boolean {
  return CHINESE_MODEL_PATTERNS.some((re) => re.test(model));
}

/** Sensitivity ordinal — lower = more sensitive. */
export const CLASS_RANK: Record<DataClass, number> = { RESTRICTED: 0, CONFIDENTIAL: 1, INTERNAL: 2, PUBLIC: 3 };

export interface InferenceRoute {
  source: InferenceSource;
  vendor: string;                 // 'anthropic' | 'openai' | 'cerebras' | 'openrouter' | 'local'
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

/** True if a route may process `dataClass` (data at or below the route's ceiling). */
export function isRouteAllowed(r: InferenceRoute, dataClass: DataClass): boolean {
  return CLASS_RANK[dataClass] >= CLASS_RANK[maxClassForRoute(r)];
}

/** Canonical routes for the wired sources. GENE needs a US pin for INTERNAL. */
export const ROUTES: Record<string, InferenceRoute> = {
  NATIVE:           { source: "NATIVE",   vendor: "anthropic",  model: "claude",        inferenceCountry: "US", companyCountry: "US", residencyGuaranteed: true },
  FORGE:            { source: "FORGE",    vendor: "openai",     model: "gpt-5.6-sol",   inferenceCountry: "US", companyCountry: "US", residencyGuaranteed: true },
  GENE_PINNED_US:   { source: "GENE",     vendor: "openrouter", model: "z-ai/glm-5.2",  inferenceCountry: "US", companyCountry: "US", residencyGuaranteed: true },  // pinned US+ZDR (default: Fireworks; allowlist in egress-class-core US_ZDR_PROVIDERS); Chinese => INTERNAL
  GENE_UNPINNED:    { source: "GENE",     vendor: "openrouter", model: "z-ai/glm-5.2",  residencyGuaranteed: false },                                                // broker, no guarantee => PUBLIC
};

/** Current pinned ID for a Claude tier. */
export function currentModel(tier: ClaudeTier): string {
  return CURRENT[tier];
}

/** Auto-tracking alias for a Claude tier. */
export function alias(tier: ClaudeTier): string {
  return ALIAS[tier];
}

/** Every current Claude ID, for drift scanning. */
export function allCurrentClaudeIds(): string[] {
  return Object.values(CURRENT);
}

/**
 * Dated/pinned Claude-ID pattern. Matches claude-{tier}-{major}[-{minor}][-date]
 * (the Claude 5 lineup dropped the minor version, e.g. "claude-sonnet-5") and
 * claude-{tier}-{major}-{minor}[-date] (older two-part IDs like "claude-opus-4-8").
 * Used by the drift scanner to find pinned IDs that may be stale.
 */
export const CLAUDE_ID_PATTERN = /claude-(opus|sonnet|haiku|fable)-\d+(?:-\d+)?(?:-\d{8})?/g;

/** True if `id` is a known-current Claude ID. */
export function isCurrent(id: string): boolean {
  return allCurrentClaudeIds().includes(id);
}
