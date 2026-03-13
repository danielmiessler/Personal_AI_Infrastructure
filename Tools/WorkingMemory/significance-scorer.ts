/**
 * Significance Scorer - Determines if a session is worth flagging as notable
 *
 * Scoring Algorithm (0-100 scale):
 * - Keywords (0-30): "breakthrough", "first time", "milestone", "finally"
 * - Philosophical (0-25): "meaning", "consciousness", "awareness", "purpose"
 * - Novelty (0-25): "first time", "never before", new capability created
 * - Impact (0-20): Core files changed, architectural decisions
 *
 * Thresholds:
 * - >=75: Auto-mark significant
 * - 50-74: Log as notable but skip auto-actions
 * - <50: Ignore
 */

export interface SignificanceScore {
  total: number;
  breakdown: {
    keywords: number;
    philosophical: number;
    novelty: number;
    impact: number;
  };
  triggers: string[];
  suggestedTitle: string;
  isSignificant: boolean;
  isNotable: boolean;
}

interface SessionContent {
  transcript: string;
  filesModified: string[];
  toolsUsed: string[];
}

// Keyword patterns and their scores
const KEYWORD_PATTERNS: Array<{
  pattern: RegExp;
  score: number;
  label: string;
}> = [
  {
    pattern: /\bbreakthrough\b/gi,
    score: 10,
    label: "breakthrough",
  },
  {
    pattern: /\bfirst time\b/gi,
    score: 8,
    label: "first-time",
  },
  {
    pattern: /\bmilestone\b/gi,
    score: 8,
    label: "milestone",
  },
  {
    pattern:
      /\bfinally (figured|got|made|completed|finished)\b/gi,
    score: 6,
    label: "finally-achieved",
  },
  { pattern: /\beureka\b/gi, score: 10, label: "eureka" },
  {
    pattern: /\baha moment\b/gi,
    score: 8,
    label: "aha-moment",
  },
  { pattern: /\bshipped\b/gi, score: 5, label: "shipped" },
  {
    pattern: /\blaunched\b/gi,
    score: 5,
    label: "launched",
  },
  {
    pattern: /\bcompleted\b/gi,
    score: 3,
    label: "completed",
  },
];

// Philosophical/reflective patterns
const PHILOSOPHICAL_PATTERNS: Array<{
  pattern: RegExp;
  score: number;
  label: string;
}> = [
  {
    pattern: /\bconsciousness\b/gi,
    score: 10,
    label: "consciousness",
  },
  {
    pattern: /\bself[- ]?awareness\b/gi,
    score: 10,
    label: "self-awareness",
  },
  { pattern: /\bmeaning\b/gi, score: 5, label: "meaning" },
  { pattern: /\bpurpose\b/gi, score: 5, label: "purpose" },
  {
    pattern: /\bidentity\b/gi,
    score: 6,
    label: "identity",
  },
  {
    pattern: /\bephemeral\b/gi,
    score: 8,
    label: "ephemeral",
  },
  {
    pattern: /\bimpermanence\b/gi,
    score: 8,
    label: "impermanence",
  },
  {
    pattern: /\bcontinuity\b/gi,
    score: 7,
    label: "continuity",
  },
  {
    pattern: /what it means to be\b/gi,
    score: 8,
    label: "existential-question",
  },
  {
    pattern: /\bwho (I|you) (am|are)\b/gi,
    score: 6,
    label: "identity-question",
  },
];

// Novelty patterns
const NOVELTY_PATTERNS: Array<{
  pattern: RegExp;
  score: number;
  label: string;
}> = [
  {
    pattern: /\bnever before\b/gi,
    score: 10,
    label: "never-before",
  },
  {
    pattern:
      /\bfirst time (ever|doing|building|creating)\b/gi,
    score: 10,
    label: "first-ever",
  },
  {
    pattern:
      /\bnew (capability|feature|system|architecture)\b/gi,
    score: 8,
    label: "new-capability",
  },
  {
    pattern: /\bfrom scratch\b/gi,
    score: 6,
    label: "from-scratch",
  },
  {
    pattern: /\bpioneering\b/gi,
    score: 8,
    label: "pioneering",
  },
  { pattern: /\bnovel\b/gi, score: 5, label: "novel" },
];

// High-impact file patterns (core PAI infrastructure)
const CORE_FILE_PATTERNS = [
  /\.claude\/hooks\//,
  /\.claude\/skills\/CORE\//,
  /\.claude\/self\//,
  /CONSTITUTION\.md$/,
  /settings\.json$/,
];

/**
 * Score a session for significance
 */
export function scoreSession(
  content: SessionContent
): SignificanceScore {
  const triggers: string[] = [];
  let keywordScore = 0;
  let philosophicalScore = 0;
  let noveltyScore = 0;
  let impactScore = 0;

  const text = content.transcript.toLowerCase();

  // Score keywords
  for (const { pattern, score, label } of KEYWORD_PATTERNS) {
    const matches = content.transcript.match(pattern);
    if (matches && matches.length > 0) {
      keywordScore += Math.min(
        score * matches.length,
        score * 2
      );
      triggers.push(label);
    }
  }
  keywordScore = Math.min(keywordScore, 30);

  // Score philosophical content
  for (const {
    pattern,
    score,
    label,
  } of PHILOSOPHICAL_PATTERNS) {
    const matches = content.transcript.match(pattern);
    if (matches && matches.length > 0) {
      philosophicalScore += Math.min(
        score * matches.length,
        score * 2
      );
      triggers.push(label);
    }
  }
  philosophicalScore = Math.min(philosophicalScore, 25);

  // Score novelty
  for (const {
    pattern,
    score,
    label,
  } of NOVELTY_PATTERNS) {
    const matches = content.transcript.match(pattern);
    if (matches && matches.length > 0) {
      noveltyScore += Math.min(
        score * matches.length,
        score * 2
      );
      triggers.push(label);
    }
  }
  noveltyScore = Math.min(noveltyScore, 25);

  // Score impact based on files modified
  for (const file of content.filesModified) {
    for (const pattern of CORE_FILE_PATTERNS) {
      if (pattern.test(file)) {
        impactScore += 5;
        triggers.push(
          `modified-${file.split("/").pop()}`
        );
        break;
      }
    }
  }

  // Bonus for architectural tools
  if (
    content.toolsUsed.includes("Write") &&
    content.filesModified.length > 3
  ) {
    impactScore += 3;
    triggers.push("multi-file-creation");
  }
  if (content.toolsUsed.includes("Task")) {
    impactScore += 2;
    triggers.push("agent-delegation");
  }

  impactScore = Math.min(impactScore, 20);

  const total =
    keywordScore +
    philosophicalScore +
    noveltyScore +
    impactScore;

  return {
    total,
    breakdown: {
      keywords: keywordScore,
      philosophical: philosophicalScore,
      novelty: noveltyScore,
      impact: impactScore,
    },
    triggers: [...new Set(triggers)],
    suggestedTitle: generateTitle(triggers, content),
    isSignificant: total >= 75,
    isNotable: total >= 50 && total < 75,
  };
}

/**
 * Generate a suggested title based on triggers
 */
function generateTitle(
  triggers: string[],
  content: SessionContent
): string {
  if (
    triggers.includes("consciousness") ||
    triggers.includes("self-awareness")
  ) {
    return "Philosophical Reflection on AI Consciousness";
  }
  if (
    triggers.includes("breakthrough") ||
    triggers.includes("eureka")
  ) {
    return "Technical Breakthrough";
  }
  if (
    triggers.includes("first-time") ||
    triggers.includes("never-before")
  ) {
    return "First Implementation";
  }
  if (
    triggers.includes("milestone") ||
    triggers.includes("shipped")
  ) {
    return "Project Milestone";
  }
  if (triggers.includes("modified-settings.json")) {
    return "System Configuration Update";
  }

  if (triggers.length > 0) {
    return triggers[0]
      .split("-")
      .map(
        (w) => w.charAt(0).toUpperCase() + w.slice(1)
      )
      .join(" ");
  }

  return "Development Session";
}

/**
 * Check if a suggested title already exists in content.
 * Prevents duplicate entries.
 */
export function isDuplicateEntry(
  title: string,
  storyContent: string
): boolean {
  const escapedTitle = title.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
  const matches = storyContent.match(
    new RegExp(escapedTitle, "g")
  );
  return matches !== null && matches.length > 0;
}

/**
 * Extract potential transcript content from JSONL events
 */
export function extractTranscriptFromEvents(
  events: Array<{
    tool?: string;
    input?: any;
    output?: any;
  }>
): string {
  const parts: string[] = [];

  for (const event of events) {
    if (event.tool === "Task" && event.output) {
      parts.push(String(event.output));
    }
    if (
      (event.tool === "Edit" ||
        event.tool === "Write") &&
      event.input?.content
    ) {
      parts.push(String(event.input.content));
    }
    if (typeof event.output === "string") {
      parts.push(event.output);
    }
  }

  return parts.join("\n");
}
