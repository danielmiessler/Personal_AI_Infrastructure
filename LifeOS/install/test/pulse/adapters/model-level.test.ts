/**
 * Contract between a page manifest's `model` field and the level Inference.ts
 * accepts. The regression this file exists for: the mapping returned
 * "fast"/"standard"/"smart" long after those names were deleted from
 * Inference.ts, so every level it could produce was rejected and 100% of
 * adapter builds threw.
 *
 * No model runs here — normalizeLevel() validates before any subprocess is
 * spawned, so the whole contract is checkable without spending a token.
 */
import { describe, expect, test } from "bun:test";
import {
  DEFAULT_LEVEL,
  LEVELS_CHEAPEST_FIRST,
  modelToLevel,
  tierForModel,
} from "../../../LIFEOS/PULSE/adapters/model-level";
import { normalizeLevel } from "../../../LIFEOS/TOOLS/Inference";
import { ALIAS, CURRENT, EFFORT_MODEL, type ClaudeTier } from "../../../LIFEOS/TOOLS/models";

const TIERS = Object.keys(ALIAS) as ClaudeTier[];

describe("modelToLevel — per model family", () => {
  test("every tier alias resolves to the level that runs that tier", () => {
    for (const tier of TIERS) {
      expect(EFFORT_MODEL[modelToLevel(ALIAS[tier])]).toBe(tier);
    }
  });

  test("every pinned model id resolves to the level that runs that tier", () => {
    for (const tier of TIERS) {
      expect(EFFORT_MODEL[modelToLevel(CURRENT[tier])]).toBe(tier);
    }
  });

  test("cheap models stay on cheap rungs, expensive models on expensive rungs", () => {
    // Ordering, not exact names: a lineup change may move a tier, but haiku
    // must never outrank sonnet, nor sonnet outrank opus.
    const rung = (model: string) => LEVELS_CHEAPEST_FIRST.indexOf(modelToLevel(model));
    expect(rung("haiku")).toBeLessThan(rung("sonnet"));
    expect(rung("sonnet")).toBeLessThan(rung("opus"));
    expect(rung("opus")).toBeLessThan(rung("fable"));
  });

  test("model names are matched case-insensitively", () => {
    expect(modelToLevel("HAIKU")).toBe(modelToLevel("haiku"));
    expect(modelToLevel("Claude-Opus-4-8")).toBe(modelToLevel("claude-opus-4-8"));
  });

  test("a model outside the Claude lineup falls back without escalating spend", () => {
    for (const unknown of ["", "gpt-5.6-sol", "z-ai/glm-5.2", "nonsense"]) {
      expect(tierForModel(unknown)).toBeNull();
      expect(modelToLevel(unknown)).toBe(DEFAULT_LEVEL);
    }
    expect(LEVELS_CHEAPEST_FIRST.indexOf(DEFAULT_LEVEL))
      .toBeLessThan(LEVELS_CHEAPEST_FIRST.length - 1);
  });
});

describe("drift detection — the mapping and the inference layer cannot diverge", () => {
  test("every level the mapping can produce is accepted by Inference.normalizeLevel", () => {
    // THE regression test. Fails against the pre-fix mapping, which produced
    // "fast" / "standard" / "smart" — all three throw here.
    const models = [...TIERS.map((t) => ALIAS[t]), ...TIERS.map((t) => CURRENT[t]), "unknown-model", ""];
    for (const model of models) {
      const level = modelToLevel(model);
      expect(() => normalizeLevel(level)).not.toThrow();
      expect(normalizeLevel(level)).toBe(level);
    }
  });

  test("LEVELS_CHEAPEST_FIRST is exactly the level set in models.ts EFFORT_MODEL", () => {
    // Guards the one ordering fact this module holds locally: add, remove, or
    // rename a level upstream and this fails instead of the mapping silently
    // falling back to DEFAULT_LEVEL for a whole tier.
    expect([...LEVELS_CHEAPEST_FIRST].sort()).toEqual(Object.keys(EFFORT_MODEL).sort());
  });

  test("Anti: no legacy level name survives anywhere in the mapping's output", () => {
    const legacy = ["fast", "standard", "smart"];
    const produced = new Set(
      [...TIERS.map((t) => ALIAS[t]), ...TIERS.map((t) => CURRENT[t]), "unknown"].map(modelToLevel),
    );
    for (const name of legacy) {
      expect(produced.has(name as never)).toBe(false);
      expect(() => normalizeLevel(name)).toThrow();
    }
  });
});
