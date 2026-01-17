#!/usr/bin/env bun

/**
 * EffortClassifier - Classify request effort level for THE ALGORITHM
 *
 * Analyzes a request and determines the appropriate effort level:
 * - TRIVIAL: Greetings, simple Q&A, acknowledgments
 * - QUICK: Single-step tasks, simple lookups
 * - STANDARD: Most work, multi-step but bounded
 * - THOROUGH: Complex, multi-file, architectural
 * - DETERMINED: "Until done", overnight, unlimited
 *
 * Supports override via --override flag or "algorithm effort LEVEL" in request.
 *
 * Usage:
 *   bun run EffortClassifier.ts --request "Add dark mode to settings"
 *   bun run EffortClassifier.ts --request "Fix the typo" --output json
 *   bun run EffortClassifier.ts --request "anything" --override DETERMINED
 *   bun run EffortClassifier.ts --request "algorithm effort THOROUGH: create feature"
 */

import { parseArgs } from "util";

type EffortLevel = "TRIVIAL" | "QUICK" | "STANDARD" | "THOROUGH" | "DETERMINED";

interface ClassificationResult {
  effort: EffortLevel;
  confidence: number;
  reasoning: string;
  minISCRows: number; // Minimum expected, NOT a limit - ISC can have dozens/hundreds/thousands
  suggestedModel: string;
  suggestedTraits: string[];
  wasOverridden: boolean;
  originalRequest?: string;
}

const EFFORT_LEVELS: EffortLevel[] = ["TRIVIAL", "QUICK", "STANDARD", "THOROUGH", "DETERMINED"];

// Check for "algorithm effort LEVEL" pattern in request
function checkInlineOverride(request: string): { override: EffortLevel | null; cleanedRequest: string } {
  const pattern = /algorithm\s+effort\s+(TRIVIAL|QUICK|STANDARD|THOROUGH|DETERMINED)\s*:?\s*/i;
  const match = request.match(pattern);

  if (match) {
    const level = match[1].toUpperCase() as EffortLevel;
    const cleanedRequest = request.replace(pattern, "").trim();
    return { override: level, cleanedRequest };
  }

  return { override: null, cleanedRequest: request };
}

// Patterns for each effort level
const PATTERNS = {
  TRIVIAL: {
    keywords: [
      "hello",
      "hi",
      "hey",
      "thanks",
      "thank you",
      "got it",
      "ok",
      "okay",
      "cool",
      "awesome",
      "great",
      "nice",
      "yes",
      "no",
      "sure",
    ],
    patterns: [
      /^(hi|hello|hey)[\s!.,]*$/i,
      /^thanks?[\s!.,]*$/i,
      /^(ok|okay|got it|sure)[\s!.,]*$/i,
      /^(yes|no|yep|nope)[\s!.,]*$/i,
    ],
  },
  QUICK: {
    keywords: [
      "quick",
      "simple",
      "just",
      "only",
      "typo",
      "rename",
      "change",
      "update",
    ],
    patterns: [
      /fix (the |a )?typo/i,
      /rename \w+ to \w+/i,
      /^what (is|does)/i,
      /^where (is|are)/i,
      /^how do I/i,
      /change .{1,30} to .{1,30}$/i,
    ],
    maxWords: 15,
  },
  THOROUGH: {
    keywords: [
      "thorough",
      "comprehensive",
      "complete",
      "full",
      "architecture",
      "refactor",
      "redesign",
      "overhaul",
      "system",
      "complex",
    ],
    patterns: [
      /refactor/i,
      /redesign/i,
      /architect/i,
      /comprehensive/i,
      /thorough/i,
      /multi.?file/i,
      /across (the |all )?codebase/i,
    ],
  },
  DETERMINED: {
    keywords: [
      "determined",
      "until done",
      "don't stop",
      "keep going",
      "overnight",
      "walk away",
      "unlimited",
      "whatever it takes",
    ],
    patterns: [
      /until (it('s| is))? done/i,
      /don'?t stop/i,
      /keep going/i,
      /overnight/i,
      /walk away/i,
      /whatever it takes/i,
      /no matter what/i,
    ],
  },
};

// Complexity indicators
const COMPLEXITY_INDICATORS = {
  high: [
    "authentication",
    "authorization",
    "security",
    "database",
    "migration",
    "api",
    "integration",
    "deploy",
    "infrastructure",
    "performance",
    "optimization",
    "architecture",
    "refactor",
    "redesign",
  ],
  medium: [
    "feature",
    "component",
    "page",
    "form",
    "validation",
    "test",
    "style",
    "layout",
    "responsive",
    "modal",
    "dialog",
  ],
  low: [
    "typo",
    "comment",
    "rename",
    "color",
    "text",
    "label",
    "spacing",
    "margin",
    "padding",
  ],
};

function getEffortConfig(effort: EffortLevel): Pick<ClassificationResult, "minISCRows" | "suggestedModel" | "suggestedTraits"> {
  // minISCRows = minimum expected, NOT a limit. ISC can have dozens/hundreds/thousands of rows.
  const configs: Record<EffortLevel, Pick<ClassificationResult, "minISCRows" | "suggestedModel" | "suggestedTraits">> = {
    TRIVIAL: { minISCRows: 0, suggestedModel: "none", suggestedTraits: [] },
    QUICK: { minISCRows: 2, suggestedModel: "haiku", suggestedTraits: ["rapid", "pragmatic"] },
    STANDARD: { minISCRows: 5, suggestedModel: "sonnet", suggestedTraits: ["analytical", "systematic"] },
    THOROUGH: { minISCRows: 10, suggestedModel: "sonnet", suggestedTraits: ["thorough", "meticulous"] },
    DETERMINED: { minISCRows: 20, suggestedModel: "opus", suggestedTraits: ["thorough", "meticulous", "adversarial"] },
  };
  return configs[effort];
}

function classifyEffort(request: string, overrideLevel?: EffortLevel): ClassificationResult {
  // Check for inline override first (e.g., "algorithm effort THOROUGH: do the thing")
  const { override: inlineOverride, cleanedRequest } = checkInlineOverride(request);

  // Priority: CLI override > inline override > auto-classification
  const effectiveOverride = overrideLevel || inlineOverride;

  if (effectiveOverride) {
    const config = getEffortConfig(effectiveOverride);
    return {
      effort: effectiveOverride,
      confidence: 1.0,
      reasoning: overrideLevel
        ? `Overridden via --override flag to ${effectiveOverride}`
        : `Overridden via inline "algorithm effort ${effectiveOverride}" pattern`,
      ...config,
      wasOverridden: true,
      originalRequest: inlineOverride ? cleanedRequest : undefined,
    };
  }

  const requestLower = request.toLowerCase().trim();
  const words = requestLower.split(/\s+/);
  const wordCount = words.length;

  // Check TRIVIAL patterns first
  for (const pattern of PATTERNS.TRIVIAL.patterns) {
    if (pattern.test(requestLower)) {
      return {
        effort: "TRIVIAL",
        confidence: 0.95,
        reasoning: "Matches trivial pattern (greeting/acknowledgment)",
        minISCRows: 0,
        suggestedModel: "none",
        suggestedTraits: [],
        wasOverridden: false,
      };
    }
  }

  // Check if it's just a trivial keyword
  if (
    wordCount <= 3 &&
    PATTERNS.TRIVIAL.keywords.some((kw) => requestLower.includes(kw))
  ) {
    return {
      effort: "TRIVIAL",
      confidence: 0.9,
      reasoning: "Short request with trivial keyword",
      minISCRows: 0,
      suggestedModel: "none",
      suggestedTraits: [],
      wasOverridden: false,
    };
  }

  // Check DETERMINED patterns (explicit override)
  for (const pattern of PATTERNS.DETERMINED.patterns) {
    if (pattern.test(requestLower)) {
      return {
        effort: "DETERMINED",
        confidence: 0.95,
        reasoning: "Explicit determination pattern detected",
        minISCRows: 10,
        suggestedModel: "opus",
        suggestedTraits: ["thorough", "meticulous", "adversarial"],
        wasOverridden: false,
      };
    }
  }

  if (
    PATTERNS.DETERMINED.keywords.some((kw) => requestLower.includes(kw))
  ) {
    return {
      effort: "DETERMINED",
      confidence: 0.9,
      reasoning: "Determination keyword detected",
      minISCRows: 10,
      suggestedModel: "opus",
      suggestedTraits: ["thorough", "meticulous", "adversarial"],
      wasOverridden: false,
    };
  }

  // Check THOROUGH patterns
  for (const pattern of PATTERNS.THOROUGH.patterns) {
    if (pattern.test(requestLower)) {
      return {
        effort: "THOROUGH",
        confidence: 0.85,
        reasoning: "Matches thorough pattern (complex work)",
        minISCRows: 10,
        suggestedModel: "sonnet",
        suggestedTraits: ["thorough", "meticulous"],
        wasOverridden: false,
      };
    }
  }

  // Check complexity indicators
  const highComplexity = COMPLEXITY_INDICATORS.high.filter((ind) =>
    requestLower.includes(ind)
  );
  const mediumComplexity = COMPLEXITY_INDICATORS.medium.filter((ind) =>
    requestLower.includes(ind)
  );
  const lowComplexity = COMPLEXITY_INDICATORS.low.filter((ind) =>
    requestLower.includes(ind)
  );

  // Score based on complexity
  const complexityScore =
    highComplexity.length * 3 +
    mediumComplexity.length * 2 +
    lowComplexity.length * 1;

  // Check QUICK patterns
  for (const pattern of PATTERNS.QUICK.patterns) {
    if (pattern.test(requestLower)) {
      // But override if complexity indicators suggest otherwise
      if (complexityScore >= 4) {
        return {
          effort: "STANDARD",
          confidence: 0.7,
          reasoning:
            "Quick pattern but complexity indicators suggest more depth",
          minISCRows: 5,
          suggestedModel: "sonnet",
          suggestedTraits: ["analytical", "systematic"],
          wasOverridden: false,
        };
      }
      return {
        effort: "QUICK",
        confidence: 0.85,
        reasoning: "Matches quick pattern",
        minISCRows: 2,
        suggestedModel: "haiku",
        suggestedTraits: ["rapid", "pragmatic"],
        wasOverridden: false,
      };
    }
  }

  // Very short requests are likely QUICK
  if (wordCount <= (PATTERNS.QUICK.maxWords || 15) && complexityScore <= 2) {
    return {
      effort: "QUICK",
      confidence: 0.75,
      reasoning: "Short request with low complexity",
      minISCRows: 2,
      suggestedModel: "haiku",
      suggestedTraits: ["rapid", "pragmatic"],
      wasOverridden: false,
    };
  }

  // High complexity score → THOROUGH
  if (complexityScore >= 6 || highComplexity.length >= 2) {
    return {
      effort: "THOROUGH",
      confidence: 0.8,
      reasoning: `High complexity score (${complexityScore}): ${highComplexity.join(", ")}`,
      minISCRows: 10,
      suggestedModel: "sonnet",
      suggestedTraits: ["thorough", "meticulous"],
      wasOverridden: false,
    };
  }

  // Default to STANDARD
  return {
    effort: "STANDARD",
    confidence: 0.7,
    reasoning: "Default classification for bounded multi-step work",
    minISCRows: 5,
    suggestedModel: "sonnet",
    suggestedTraits: ["analytical", "systematic"],
    wasOverridden: false,
  };
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      request: { type: "string", short: "r" },
      override: { type: "string" },
      output: { type: "string", short: "o", default: "text" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
EffortClassifier - Classify request effort level

USAGE:
  bun run EffortClassifier.ts --request "your request here"
  bun run EffortClassifier.ts -r "your request" --output json
  bun run EffortClassifier.ts -r "anything" --override DETERMINED

OPTIONS:
  -r, --request <text>     The request to classify
  --override <level>       Force specific effort level (TRIVIAL/QUICK/STANDARD/THOROUGH/DETERMINED)
  -o, --output <fmt>       Output format: text (default), json
  -h, --help               Show this help

EFFORT LEVELS:
  TRIVIAL    - Greetings, acknowledgments, simple Q&A
  QUICK      - Single-step tasks, simple changes
  STANDARD   - Multi-step work, bounded scope
  THOROUGH   - Complex, multi-file, architectural
  DETERMINED - Unlimited iteration until done

OVERRIDE METHODS:
  1. CLI flag: --override THOROUGH
  2. Inline:   "algorithm effort THOROUGH: create a feature"

EXAMPLES:
  bun run EffortClassifier.ts -r "Hello"
  # → TRIVIAL

  bun run EffortClassifier.ts -r "Fix the typo in README"
  # → QUICK

  bun run EffortClassifier.ts -r "Add authentication to the API"
  # → THOROUGH

  bun run EffortClassifier.ts -r "Keep going until all tests pass"
  # → DETERMINED

  bun run EffortClassifier.ts -r "simple task" --override DETERMINED
  # → DETERMINED (forced)

  bun run EffortClassifier.ts -r "algorithm effort THOROUGH: create feature"
  # → THOROUGH (inline override)
`);
    return;
  }

  if (!values.request) {
    console.error("Error: --request is required");
    console.error("Use --help for usage information");
    process.exit(1);
  }

  // Validate and apply override if provided
  let overrideLevel: EffortLevel | undefined;
  if (values.override) {
    const upperOverride = values.override.toUpperCase() as EffortLevel;
    if (!EFFORT_LEVELS.includes(upperOverride)) {
      console.error(`Error: Invalid override level: ${values.override}`);
      console.error(`Valid levels: ${EFFORT_LEVELS.join(", ")}`);
      process.exit(1);
    }
    overrideLevel = upperOverride;
  }

  const result = classifyEffort(values.request, overrideLevel);

  if (values.output === "json") {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`EFFORT: ${result.effort}${result.wasOverridden ? " (OVERRIDDEN)" : ""}`);
    console.log(`CONFIDENCE: ${(result.confidence * 100).toFixed(0)}%`);
    console.log(`REASONING: ${result.reasoning}`);
    if (result.originalRequest) {
      console.log(`ORIGINAL REQUEST: ${result.originalRequest}`);
    }
    console.log(`MIN ISC ROWS: ${result.minISCRows} (can grow to dozens/hundreds/thousands)`);
    console.log(`SUGGESTED MODEL: ${result.suggestedModel}`);
    console.log(`SUGGESTED TRAITS: ${result.suggestedTraits.join(", ") || "none"}`);
  }
}

main().catch(console.error);
