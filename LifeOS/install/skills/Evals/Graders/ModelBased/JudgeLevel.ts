/**
 * Judge-model → inference-level resolution for the model-based graders.
 *
 * WHY THIS FILE EXISTS
 * All three model-based graders (LLMRubric, NaturalLanguageAssert,
 * PairwiseComparison) each carried their own hardcoded `judge_model` → level
 * map. Two defects, both found 2026-07-26:
 *
 *   1. ROT. The maps pinned superseded ids (`claude-opus-4-8`, `claude-sonnet-4-6`)
 *      while every live eval spec passes `claude-3-5-sonnet-20241022`. Nothing
 *      intersected, so EVERY current judge silently fell through to `medium`
 *      regardless of what the spec asked for. Deriving from the registry is the
 *      fix; a fourth hardcoded map would rot the same way.
 *
 *   2. AN UPLEVEL BACK DOOR. The maps routed one id to the `max` rung, so an
 *      eval spec could reach above the session default without going through
 *      the Advisor. Uplevel routing has exactly one door
 *      (OPERATIONAL_RULES § Model selection), so grading CAPS at `high`.
 *      Verified before capping: no eval spec in the tree requested the top rung,
 *      so this removed zero live behavior.
 *
 * Tier→id facts come from `models.ts` (canonical). The cap is this skill's own
 * policy and lives here, not in the registry.
 */

import { CURRENT, EFFORT_MODEL, type ClaudeTier, type EffortLevel } from "../../../../LIFEOS/TOOLS/models";

/** Grading never rides the top rung — that door is the Advisor's. */
const GRADING_CEILING: EffortLevel = "high";

/** Invert EFFORT_MODEL so a resolved tier yields the level that requests it. */
function levelForTier(tier: ClaudeTier): EffortLevel | undefined {
  const found = (Object.entries(EFFORT_MODEL) as [EffortLevel, ClaudeTier][])
    .find(([, t]) => t === tier);
  return found?.[0];
}

/**
 * Resolve a judge-model string to an inference level.
 *
 * Accepts a bare tier alias ("opus"), a current pinned id, or any historical
 * `claude-<tier>-…` id — the TIER is what carries the capability intent, and it
 * survives version bumps that break a pinned id. Unknown or absent → `medium`
 * (the long-standing default). Never returns above the ceiling.
 */
export function judgeLevelForModel(judgeModel?: string): EffortLevel {
  if (!judgeModel) return "medium";
  const raw = judgeModel.trim().toLowerCase();

  // Bare alias, or an exact current id.
  let tier = (Object.keys(CURRENT) as ClaudeTier[]).find(
    (t) => t === raw || CURRENT[t].toLowerCase() === raw,
  );

  // Any generation of a Claude id: pull the tier out of `claude-<tier>-…`.
  if (!tier) {
    const m = raw.match(/^claude-(?:\d+-\d+-)?(opus|sonnet|haiku|fable)\b/);
    if (m) tier = m[1] as ClaudeTier;
  }

  const level = tier ? levelForTier(tier) : undefined;
  if (!level) return "medium";

  // Cap: a top-rung request degrades to the ceiling rather than erroring, so an
  // old spec still grades instead of failing the run — but it never uplevels.
  const order: EffortLevel[] = ["low", "medium", "high", "max"];
  return order.indexOf(level) > order.indexOf(GRADING_CEILING) ? GRADING_CEILING : level;
}
