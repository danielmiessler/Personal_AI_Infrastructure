/**
 * ============================================================================
 * MODEL → INFERENCE LEVEL — derived from models.ts, never hand-written
 * ============================================================================
 *
 * A page manifest names a MODEL (`model = "haiku"`, or a pinned id like
 * "claude-opus-5"); `Inference.ts` accepts a LEVEL. This module is the only
 * bridge between the two, and it DERIVES the answer from `EFFORT_MODEL` in
 * LIFEOS/TOOLS/models.ts — the single source of truth for level → tier —
 * instead of restating level names locally.
 *
 * WHY DERIVED: this mapping used to hardcode "fast" / "standard" / "smart".
 * Those names were removed from Inference.ts on 2026-06-10; nothing connected
 * the two ends, so every level this function could produce was rejected by
 * `normalizeLevel()` and 100% of adapter builds threw. Deriving the mapping
 * removes the class of bug rather than the instance: a lineup change or a
 * level rename in models.ts now propagates here for free.
 *
 * public PR #1648, @elhoim
 */
import { CURRENT, EFFORT_MODEL, type ClaudeTier, type EffortLevel } from "../../TOOLS/models";
import type { InferenceLevel } from "../../TOOLS/Inference";

/**
 * Levels cheapest rung first. The reverse lookup walks this order, so under a
 * lineup where two levels share a tier the CHEAPER level wins — a manifest
 * never silently buys a more expensive rung than the model it named.
 *
 * This is the one ordering fact models.ts does not encode (EFFORT_MODEL is a
 * map, not a ladder). Its agreement with EFFORT_MODEL is asserted by test, so
 * a level added or renamed upstream fails loudly here.
 */
export const LEVELS_CHEAPEST_FIRST: readonly EffortLevel[] = ["low", "medium", "high", "max"];

/**
 * Level for a manifest naming a model outside the Claude lineup. `medium` is
 * the same balanced default `Inference.ts` applies to an omitted level — an
 * unrecognized model must not silently escalate spend.
 */
export const DEFAULT_LEVEL: InferenceLevel = "medium";

/**
 * Tier for a manifest `model` value — a tier alias ("opus") or a pinned id
 * ("claude-opus-5"). Tier names come from models.ts, so a new tier is
 * recognized without editing this file. Returns null for anything outside the
 * Claude lineup (a cross-vendor pin, a typo, an empty manifest field).
 */
export function tierForModel(model: string): ClaudeTier | null {
  const m = model.toLowerCase();
  return (Object.keys(CURRENT) as ClaudeTier[]).find((tier) => m.includes(tier)) ?? null;
}

/**
 * Resolve a manifest `model` to the inference level that runs that model.
 * haiku → low, sonnet → medium, opus → high, fable → max under today's
 * EFFORT_MODEL — asking for the level that resolves back to the named model is
 * the only mapping under which a manifest's `model` field means what it says.
 */
export function modelToLevel(model: string): InferenceLevel {
  const tier = tierForModel(model);
  if (!tier) return DEFAULT_LEVEL;
  return LEVELS_CHEAPEST_FIRST.find((level) => EFFORT_MODEL[level] === tier) ?? DEFAULT_LEVEL;
}
