/**
 * session-awareness.ts - Session Management for Cultivation Practices
 *
 * Implements implicit session management, session indicators, and status display.
 *
 * REQ-METHOD-FABRIC-001 (Session integration) from cultivation-practices-v1.2
 *
 * Sessions track work during a cultivation practice (e.g., weave session).
 * All notes created/modified during a session are tagged with the session tag.
 */

import { loadPracticeState, savePracticeState, PRACTICE_CADENCES, PracticeType } from "./practices";

// ============================================================================
// Types
// ============================================================================

export interface ActiveSession {
  practice: PracticeType;
  tag: string;
  emoji: string;
  startedAt: string; // ISO timestamp
}

export interface SessionRecord {
  tag: string;
  practice: PracticeType;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
}

export interface InterruptedSession {
  session: ActiveSession;
  interruptedAt: string; // ISO timestamp
}

// Maximum age for resumable sessions (24 hours in milliseconds)
const MAX_RESUME_AGE_MS = 24 * 60 * 60 * 1000;

export interface EndSessionResult {
  ended: boolean;
  tag: string;
  practice: PracticeType;
  durationMinutes: number;
}

// ============================================================================
// Extend PracticeState to include activeSession
// ============================================================================

// Note: PracticeState in practices.ts needs to be extended to include:
// - activeSession?: ActiveSession
// - sessions: SessionRecord[]
// For now we'll work with the existing structure and store in sessions array

// ============================================================================
// Session Tag Generation
// ============================================================================

/**
 * Generate a session tag with practice type and timestamp
 * Format: session/weave-YYYY-MM-DD-HHMM
 * With topic: session/dive-<topic>-YYYY-MM-DD-HHMM
 */
export function generateSessionTag(practice: PracticeType, topic?: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  const topicPart = topic ? `-${topic}` : "";
  return `session/${practice}${topicPart}-${year}-${month}-${day}-${hours}${minutes}`;
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Start a new session for a practice
 * @param practice - The practice type (sweep, weave, dive, etc.)
 * @param topic - Optional topic for topic-focused sessions (dive)
 * @throws Error if a session is already active
 */
export function startSession(practice: PracticeType, topic?: string): ActiveSession {
  const state = loadPracticeState() as any; // Cast to any to access activeSession

  if (state.activeSession) {
    throw new Error("Session already active");
  }

  const cadence = PRACTICE_CADENCES[practice];
  const session: ActiveSession = {
    practice,
    tag: generateSessionTag(practice, topic),
    emoji: cadence.emoji,
    startedAt: new Date().toISOString(),
  };

  state.activeSession = session;
  savePracticeState(state);

  return session;
}

/**
 * End the current active session
 * @throws Error if no session is active
 */
export function endSession(): EndSessionResult {
  const state = loadPracticeState() as any;

  if (!state.activeSession) {
    throw new Error("No active session");
  }

  const session = state.activeSession as ActiveSession;
  const endedAt = new Date();
  const startedAt = new Date(session.startedAt);
  const durationMs = endedAt.getTime() - startedAt.getTime();
  const durationMinutes = Math.floor(durationMs / (1000 * 60));

  // Create session record for history
  const record: SessionRecord = {
    tag: session.tag,
    practice: session.practice,
    startedAt: session.startedAt,
    endedAt: endedAt.toISOString(),
    durationMinutes,
  };

  // Initialize sessions array if needed
  if (!state.sessions) {
    state.sessions = [];
  }
  state.sessions.push(record);

  // Clear active session
  state.activeSession = undefined;
  savePracticeState(state);

  return {
    ended: true,
    tag: record.tag,
    practice: record.practice,
    durationMinutes,
  };
}

/**
 * Check if there's an active session
 */
export function hasActiveSession(): boolean {
  const state = loadPracticeState() as any;
  return !!state.activeSession;
}

/**
 * Get the active session details, or null if no session
 */
export function getActiveSession(): ActiveSession | null {
  const state = loadPracticeState() as any;
  return state.activeSession || null;
}

// ============================================================================
// Session Indicators
// ============================================================================

/**
 * Get session indicator string for CLI prompt/status
 * Format: [emoji practice-YYYY-MM-DD-HHMM]
 * Returns empty string if no active session
 */
export function getSessionIndicator(): string {
  const session = getActiveSession();
  if (!session) {
    return "";
  }

  // Extract the short tag (without session/ prefix)
  const shortTag = session.tag.replace("session/", "");
  return `[${session.emoji} ${shortTag}]`;
}

/**
 * Format session status for display
 */
export function formatSessionStatus(): string {
  const session = getActiveSession();

  if (!session) {
    // Check for resumable session
    const interrupted = getInterruptedSession();
    if (interrupted && canResumeSession()) {
      const interruptedAt = new Date((loadPracticeState() as any).interruptedSession.interruptedAt);
      const hoursAgo = Math.floor((Date.now() - interruptedAt.getTime()) / (1000 * 60 * 60));
      return `No active session\n\nResumable: ${interrupted.tag} (${hoursAgo}h ago)\nRun: ctx session resume`;
    }
    return "No active session";
  }

  const startedAt = new Date(session.startedAt);
  const now = new Date();
  const durationMs = now.getTime() - startedAt.getTime();
  const durationMinutes = Math.floor(durationMs / (1000 * 60));

  const lines = [
    `Active session: ${session.emoji} ${session.practice}`,
    `Tag: ${session.tag}`,
    `Started: ${startedAt.toLocaleString()}`,
    `Duration: ${durationMinutes} minutes`,
  ];

  return lines.join("\n");
}

// ============================================================================
// Session Resume (REQ-SESS-RESUME-001 to 004)
// ============================================================================

/**
 * Get the interrupted session, if any
 */
export function getInterruptedSession(): ActiveSession | null {
  const state = loadPracticeState() as any;
  return state.interruptedSession?.session || null;
}

/**
 * Check if there's a session that can be resumed
 * Returns true if interrupted session exists and is within 24h
 */
export function canResumeSession(): boolean {
  const state = loadPracticeState() as any;

  if (!state.interruptedSession) {
    return false;
  }

  const interruptedAt = new Date(state.interruptedSession.interruptedAt);
  const ageMs = Date.now() - interruptedAt.getTime();

  return ageMs < MAX_RESUME_AGE_MS;
}

/**
 * Resume an interrupted session
 * @throws Error if no session to resume, session too old, or session already active
 */
export function resumeSession(): ActiveSession {
  const state = loadPracticeState() as any;

  // Check for active session
  if (state.activeSession) {
    throw new Error("Session already active");
  }

  // Check for interrupted session
  if (!state.interruptedSession) {
    throw new Error("No session to resume");
  }

  // Check age
  const interruptedAt = new Date(state.interruptedSession.interruptedAt);
  const ageMs = Date.now() - interruptedAt.getTime();

  if (ageMs >= MAX_RESUME_AGE_MS) {
    throw new Error("Session too old to resume (>24h)");
  }

  // Restore the session
  const session = state.interruptedSession.session as ActiveSession;
  state.activeSession = session;
  state.interruptedSession = undefined;
  savePracticeState(state);

  return session;
}

/**
 * Clear the interrupted session without resuming
 */
export function clearInterruptedSession(): void {
  const state = loadPracticeState() as any;
  state.interruptedSession = undefined;
  savePracticeState(state);
}

/**
 * Save current session as interrupted (used when forcibly starting a new session)
 */
export function interruptCurrentSession(): void {
  const state = loadPracticeState() as any;

  if (!state.activeSession) {
    return; // Nothing to interrupt
  }

  state.interruptedSession = {
    session: state.activeSession,
    interruptedAt: new Date().toISOString(),
  };
  state.activeSession = undefined;
  savePracticeState(state);
}
