/**
 * Relevance scoring utilities
 * Shared across SecondBrain tools for content analysis
 */

export type RelevanceLevel = "high" | "medium" | "low";

export interface RelevanceThresholds {
  high: number;
  medium: number;
}

const DEFAULT_THRESHOLDS: RelevanceThresholds = {
  high: 6,
  medium: 3,
};

/**
 * Assess relevance level based on score
 */
export function assessRelevance(
  score: number,
  thresholds: RelevanceThresholds = DEFAULT_THRESHOLDS
): RelevanceLevel {
  if (score >= thresholds.high) return "high";
  if (score >= thresholds.medium) return "medium";
  return "low";
}

/**
 * Score text by counting indicator matches
 */
export function scoreByIndicators(text: string, indicators: string[]): number {
  const textLower = text.toLowerCase();
  return indicators.filter((i) => textLower.includes(i.toLowerCase())).length;
}

/**
 * Score text against multiple indicator sets with weights
 */
export function scoreByWeightedIndicators(
  text: string,
  indicatorSets: Array<{ indicators: string[]; weight: number }>
): number {
  return indicatorSets.reduce((total, set) => {
    return total + scoreByIndicators(text, set.indicators) * set.weight;
  }, 0);
}

/**
 * Calculate weighted score for complexity assessment
 */
export function calculateWeightedScore(
  matches: Array<{ weight: number; multiplier?: number }>
): number {
  return matches.reduce((total, match) => {
    return total + match.weight * (match.multiplier ?? 1);
  }, 0);
}

/**
 * Determine confidence based on score differential
 */
export function determineConfidence(
  topScore: number,
  secondScore: number
): "high" | "medium" | "low" {
  if (topScore >= 3 && topScore > secondScore * 2) return "high";
  if (topScore >= 2 && topScore > secondScore) return "medium";
  return "low";
}

// Common indicator sets for PARA categorization
export const PARA_INDICATORS = {
  projects: [
    "deadline", "deliverable", "milestone", "sprint", "phase",
    "client", "project", "launch", "release", "todo", "task",
    "goal", "objective", "timeline", "due date",
  ],
  areas: [
    "process", "routine", "standard", "policy", "guideline",
    "recurring", "maintenance", "health", "finance", "career",
    "relationship", "habit", "system", "workflow",
  ],
  resources: [
    "how to", "guide", "tutorial", "reference", "template",
    "checklist", "framework", "tool", "resource", "course",
    "book", "article", "notes from", "summary",
  ],
  archives: [
    "completed", "finished", "archived", "old", "legacy",
    "deprecated", "historical",
  ],
  delete: [
    "scratch", "temp", "test", "draft", "untitled",
    "copy of", "duplicate",
  ],
} as const;

// Weights for PARA scoring
export const PARA_WEIGHTS = {
  projects: 2,
  areas: 1.5,
  resources: 1.5,
  archives: 1,
  delete: 1,
} as const;
