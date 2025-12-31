/**
 * session-notes.ts - Session Note Creation for Cultivation System
 *
 * Creates vault notes when sessions end, keeping session history
 * queryable within the vault using the "tags are the API" philosophy.
 *
 * REQ-SESS-NOTE-001 to REQ-SESS-NOTE-005 from cultivation-practices-v1.1
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { PracticeType, PRACTICE_CADENCES } from "./practices";

// ============================================================================
// Types
// ============================================================================

export interface SessionMetadata {
  tag: string;
  name: string;
  topic: string;
  practice?: PracticeType;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
}

// ============================================================================
// Path Generation
// ============================================================================

/**
 * Generate the vault path for a session note
 * session/dive-kubernetes-2025-12-23-1800 -> Sessions/dive-kubernetes-2025-12-23-1800.md
 */
export function generateSessionNotePath(sessionTag: string, vaultPath: string): string {
  const filename = sessionTag.replace("session/", "") + ".md";
  return join(vaultPath, "Sessions", filename);
}

// ============================================================================
// Frontmatter Generation
// ============================================================================

/**
 * Generate YAML frontmatter for session note
 */
export function generateSessionFrontmatter(metadata: SessionMetadata): string {
  const tags = ["type/session", metadata.tag];
  if (metadata.practice) {
    tags.push(`practice/${metadata.practice}`);
  }

  const practiceField = metadata.practice ? `practice: ${metadata.practice}\n` : "";

  return `---
type: session
${practiceField}topic: ${metadata.topic}
session_tag: ${metadata.tag}
started: ${metadata.startedAt}
ended: ${metadata.endedAt}
duration_minutes: ${metadata.durationMinutes}
tags:
${tags.map((t) => `  - ${t}`).join("\n")}
---`;
}

// ============================================================================
// Content Generation
// ============================================================================

/**
 * Generate markdown content for session note
 */
export function generateSessionContent(metadata: SessionMetadata): string {
  const practiceEmojis: Record<string, string> = {
    sweep: "🧹 Sweep",
    weave: "🧵 Weave",
    dive: "🔬 Dive",
    survey: "🗺️ Survey",
    compass: "🧭 Compass",
    mirror: "🪞 Mirror",
  };

  const practiceDisplay = metadata.practice
    ? practiceEmojis[metadata.practice] || metadata.practice
    : "N/A";

  const hours = Math.floor(metadata.durationMinutes / 60);
  const mins = metadata.durationMinutes % 60;
  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const date = new Date(metadata.startedAt).toISOString().split("T")[0];

  return `# Session: ${metadata.topic}

**Practice:** ${practiceDisplay}
**Duration:** ${durationStr}
**Date:** ${date}

## Notes Captured

<!-- Notes with tag ${metadata.tag} will appear here -->
<!-- Use Dataview: \`\`\`dataview LIST FROM #${metadata.tag} \`\`\` -->

## Summary

<!-- Add your session summary here -->

## Reflections

<!-- What did you learn? What surprised you? -->
`;
}

// ============================================================================
// Note Creation
// ============================================================================

/**
 * Create a session note in the vault
 * Returns the path to the created note
 */
export function createSessionNote(metadata: SessionMetadata, vaultPath: string): string {
  const notePath = generateSessionNotePath(metadata.tag, vaultPath);
  const dir = join(vaultPath, "Sessions");

  // Create Sessions folder if not exists
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const frontmatter = generateSessionFrontmatter(metadata);
  const content = generateSessionContent(metadata);
  const fullContent = frontmatter + "\n" + content;

  writeFileSync(notePath, fullContent);

  return notePath;
}

/**
 * Calculate session duration in minutes from start/end timestamps
 */
export function calculateDurationMinutes(startedAt: string, endedAt: string): number {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  return Math.round((end.getTime() - start.getTime()) / 60000);
}
