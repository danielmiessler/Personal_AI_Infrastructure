/**
 * practices.ts - Cultivation Practice State & Signals
 *
 * Implements REQ-STATE-001 to REQ-STATE-011 from cultivation-practices-v1.1
 *
 * Tracks practice completion, streaks, and provides signals for overdue practices.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";

// ============================================================================
// Types
// ============================================================================

export type PracticeType = "sweep" | "weave" | "dive" | "survey" | "compass" | "mirror";

export interface PracticeRecord {
  lastCompleted: string | null; // ISO timestamp
  streak: number;
  totalCount: number;
}

export interface PracticeState {
  practices: Record<PracticeType, PracticeRecord>;
  sessions: string[]; // Session IDs for history
}

export interface PracticeCadence {
  name: string;
  emoji: string;
  cadenceLabel: string;
  overdueDays: number | null; // null = never overdue (as needed)
  streakApplicable: boolean;
  completionMessage: string;
  reminderMessage: string;
}

export interface PracticeStatus {
  type: PracticeType;
  cadence: PracticeCadence;
  record: PracticeRecord;
  lastCompletedRelative: string;
  daysAgo: number | null;
  isOverdue: boolean;
  daysOverdue: number;
  nextDue: string;
}

// ============================================================================
// Constants & Configuration
// ============================================================================

const DEFAULT_STATE_FILE = join(homedir(), ".config", "obs", "practice-state.json");

// Configurable state file path for testing
let stateFilePath = DEFAULT_STATE_FILE;

/**
 * Set custom state file path (for testing)
 * @param path - Custom path or null to reset to default
 */
export function setStateFilePath(path: string | null): void {
  stateFilePath = path ?? DEFAULT_STATE_FILE;
}

/**
 * Get current state file path
 */
export function getStateFilePath(): string {
  return stateFilePath;
}

export const PRACTICE_CADENCES: Record<PracticeType, PracticeCadence> = {
  sweep: {
    name: "Sweep",
    emoji: "🧹",
    cadenceLabel: "Daily",
    overdueDays: 2,
    streakApplicable: true,
    completionMessage: "Swept! Inbox clear.",
    reminderMessage: "Inbox growing—time to sweep",
  },
  weave: {
    name: "Weave",
    emoji: "🧵",
    cadenceLabel: "Weekly",
    overdueDays: 10,
    streakApplicable: true,
    completionMessage: "Woven! {n} new connections made.",
    reminderMessage: "Notes growing disconnected—time to weave",
  },
  dive: {
    name: "Dive",
    emoji: "🔬",
    cadenceLabel: "As needed",
    overdueDays: null, // Never overdue
    streakApplicable: false,
    completionMessage: "Dive complete! Knowledge synthesized.",
    reminderMessage: "Ready for deep exploration?",
  },
  survey: {
    name: "Survey",
    emoji: "🗺️",
    cadenceLabel: "Monthly",
    overdueDays: 45,
    streakApplicable: true,
    completionMessage: "Surveyed! Landscape mapped.",
    reminderMessage: "Lost perspective?—time to survey",
  },
  compass: {
    name: "Compass",
    emoji: "🧭",
    cadenceLabel: "Quarterly",
    overdueDays: 120,
    streakApplicable: false,
    completionMessage: "Compass checked! Alignment verified.",
    reminderMessage: "Drifting from direction?—check your compass",
  },
  mirror: {
    name: "Mirror",
    emoji: "🪞",
    cadenceLabel: "Annual",
    overdueDays: 400,
    streakApplicable: false,
    completionMessage: "Mirrored! Year reflected.",
    reminderMessage: "Time for annual reflection—find your mirror",
  },
};

const DEFAULT_STATE: PracticeState = {
  practices: {
    sweep: { lastCompleted: null, streak: 0, totalCount: 0 },
    weave: { lastCompleted: null, streak: 0, totalCount: 0 },
    dive: { lastCompleted: null, streak: 0, totalCount: 0 },
    survey: { lastCompleted: null, streak: 0, totalCount: 0 },
    compass: { lastCompleted: null, streak: 0, totalCount: 0 },
    mirror: { lastCompleted: null, streak: 0, totalCount: 0 },
  },
  sessions: [],
};

// ============================================================================
// State Management
// ============================================================================

export function loadPracticeState(): PracticeState {
  if (!existsSync(stateFilePath)) {
    return JSON.parse(JSON.stringify(DEFAULT_STATE)); // Deep copy
  }
  try {
    const data = readFileSync(stateFilePath, "utf-8");
    const state = JSON.parse(data) as PracticeState;
    // Ensure all practice types exist (in case new ones added)
    for (const type of Object.keys(PRACTICE_CADENCES) as PracticeType[]) {
      if (!state.practices[type]) {
        state.practices[type] = { lastCompleted: null, streak: 0, totalCount: 0 };
      }
    }
    return state;
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_STATE)); // Deep copy
  }
}

export function savePracticeState(state: PracticeState): void {
  const dir = dirname(stateFilePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(stateFilePath, JSON.stringify(state, null, 2));
}

// ============================================================================
// Practice Completion
// ============================================================================

/**
 * Record completion of a practice
 * Updates lastCompleted, streak, and totalCount
 */
export function recordPracticeCompletion(type: PracticeType): PracticeRecord {
  const state = loadPracticeState();
  const record = state.practices[type];
  const cadence = PRACTICE_CADENCES[type];
  const now = new Date();
  const nowISO = now.toISOString();

  // Calculate streak
  if (cadence.streakApplicable && record.lastCompleted) {
    const lastDate = new Date(record.lastCompleted);
    const daysSinceLast = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    // Streak continues if within expected cadence window
    const streakWindow = type === "sweep" ? 2 : type === "weave" ? 10 : type === "survey" ? 45 : 2;
    if (daysSinceLast <= streakWindow) {
      record.streak += 1;
    } else {
      record.streak = 1;
    }
  } else if (cadence.streakApplicable) {
    record.streak = 1;
  }

  record.lastCompleted = nowISO;
  record.totalCount += 1;

  savePracticeState(state);
  return record;
}

// ============================================================================
// Status Calculation
// ============================================================================

/**
 * Calculate days since a date
 */
function daysSince(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Format relative time (e.g., "today", "3 days ago", "never")
 */
function formatRelativeTime(daysAgo: number | null): string {
  if (daysAgo === null) return "never";
  if (daysAgo === 0) return "today";
  if (daysAgo === 1) return "yesterday";
  if (daysAgo < 7) return `${daysAgo} days ago`;
  if (daysAgo < 14) return "1 week ago";
  if (daysAgo < 30) return `${Math.floor(daysAgo / 7)} weeks ago`;
  if (daysAgo < 60) return "1 month ago";
  if (daysAgo < 365) return `${Math.floor(daysAgo / 30)} months ago`;
  return `${Math.floor(daysAgo / 365)} year(s) ago`;
}

/**
 * Calculate next due date string
 */
function calculateNextDue(type: PracticeType, daysAgo: number | null): string {
  const cadence = PRACTICE_CADENCES[type];
  if (cadence.overdueDays === null) return "(as needed)";

  if (daysAgo === null) {
    // Never done, due now
    return "now";
  }

  const daysUntilDue = cadence.overdueDays - daysAgo;
  if (daysUntilDue <= 0) return "overdue";
  if (daysUntilDue === 1) return "tomorrow";
  if (daysUntilDue < 7) return `in ${daysUntilDue} days`;
  if (daysUntilDue < 14) return "in 1 week";
  if (daysUntilDue < 30) return `in ${Math.floor(daysUntilDue / 7)} weeks`;
  return `in ${Math.floor(daysUntilDue / 30)} month(s)`;
}

/**
 * Get full status for a practice
 */
export function getPracticeStatus(type: PracticeType): PracticeStatus {
  const state = loadPracticeState();
  const record = state.practices[type];
  const cadence = PRACTICE_CADENCES[type];
  const daysAgo = daysSince(record.lastCompleted);

  let isOverdue = false;
  let daysOverdue = 0;

  if (cadence.overdueDays !== null && daysAgo !== null) {
    if (daysAgo > cadence.overdueDays) {
      isOverdue = true;
      daysOverdue = daysAgo - cadence.overdueDays;
    }
  } else if (cadence.overdueDays !== null && daysAgo === null) {
    // Never done, consider overdue
    isOverdue = true;
    daysOverdue = 0;
  }

  return {
    type,
    cadence,
    record,
    lastCompletedRelative: formatRelativeTime(daysAgo),
    daysAgo,
    isOverdue,
    daysOverdue,
    nextDue: calculateNextDue(type, daysAgo),
  };
}

/**
 * Get status for all practices
 */
export function getAllPracticeStatuses(): PracticeStatus[] {
  const types: PracticeType[] = ["sweep", "weave", "dive", "survey", "compass", "mirror"];
  return types.map(getPracticeStatus);
}

/**
 * Get only overdue practices
 */
export function getOverduePractices(): PracticeStatus[] {
  return getAllPracticeStatuses().filter((s) => s.isOverdue);
}

// ============================================================================
// Formatted Output
// ============================================================================

/**
 * Format practice status for CLI output
 */
export function formatPracticeStatus(status: PracticeStatus): string {
  const { cadence, record, lastCompletedRelative, isOverdue, daysOverdue } = status;

  let statusIcon: string;
  let statusText: string;

  if (record.lastCompleted === null) {
    statusIcon = "⏳";
    statusText = "never completed";
  } else if (isOverdue) {
    statusIcon = "⚠️";
    statusText = `overdue by ${daysOverdue} day${daysOverdue === 1 ? "" : "s"}`;
  } else {
    statusIcon = "✅";
    statusText = lastCompletedRelative;
    if (cadence.streakApplicable && record.streak > 1) {
      statusText += ` (streak: ${record.streak})`;
    }
  }

  return `${cadence.emoji} ${cadence.name}: ${statusIcon} ${statusText}`;
}

/**
 * Format all practice statuses as a table
 */
export function formatAllPracticeStatuses(): string {
  const statuses = getAllPracticeStatuses();
  const lines = [
    "CULTIVATION PRACTICES",
    "─".repeat(50),
    ...statuses.map(formatPracticeStatus),
  ];
  return lines.join("\n");
}

/**
 * Format overdue practices for nudge
 */
export function formatOverdueNudge(): string | null {
  const overdue = getOverduePractices();
  if (overdue.length === 0) return null;

  // Pick the most overdue one
  const mostOverdue = overdue.reduce((a, b) => (a.daysOverdue > b.daysOverdue ? a : b));
  const { cadence, daysOverdue } = mostOverdue;

  return `${cadence.reminderMessage} (${daysOverdue} days overdue)`;
}

/**
 * Get completion message with substitutions
 */
export function getCompletionMessage(type: PracticeType, substitutions?: Record<string, string | number>): string {
  const cadence = PRACTICE_CADENCES[type];
  const record = loadPracticeState().practices[type];
  let message = `${cadence.emoji} ${cadence.completionMessage}`;

  // Apply substitutions
  if (substitutions) {
    for (const [key, value] of Object.entries(substitutions)) {
      message = message.replace(`{${key}}`, String(value));
    }
  }

  // Add streak if applicable
  if (cadence.streakApplicable && record.streak > 1) {
    message += ` (streak: ${record.streak} days)`;
  }

  return message;
}
