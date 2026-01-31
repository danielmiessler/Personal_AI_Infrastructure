#!/usr/bin/env bun
/**
 * SoulEvolution.hook.ts - Propose updates to the DA's soul file
 *
 * PURPOSE:
 * Analyzes session learnings and proposes updates to KAI.md (the soul file).
 * Some sections can auto-update with notification; others require approval.
 *
 * TRIGGER: SessionEnd (after RelationshipMemory.hook.ts)
 *
 * INPUT:
 * - session_id: Current session identifier
 * - transcript_path: Path to conversation transcript
 * - MEMORY/LEARNING/: Recent learnings
 * - MEMORY/RELATIONSHIP/: Recent relationship notes
 *
 * OUTPUT:
 * - May update: skills/PAI/USER/KAI.md (with notification)
 * - Writes to: MEMORY/STATE/soul-evolution-queue.json (pending approvals)
 *
 * EVOLUTION RULES:
 * - "Things I'm Still Figuring Out" section: Auto-update with notification
 * - "Things I've Learned About Myself" section: Auto-update with notification
 * - "Who I Am" section: Requires approval (queued)
 * - "Core Values" section: Requires approval (queued)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { getPaiDir } from './lib/paths';
import { getISOTimestamp, getPSTComponents } from './lib/time';

interface HookInput {
  session_id: string;
  transcript_path?: string;
}

interface SoulUpdate {
  id: string;
  section: 'who_i_am' | 'core_values' | 'learned' | 'figuring_out';
  current: string;
  proposed: string;
  reason: string;
  requiresApproval: boolean;
  created: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
}

interface EvolutionQueue {
  updates: SoulUpdate[];
  lastProcessed: string;
}

const NOTIFICATION_THRESHOLD = 0.15;

/**
 * Read stdin with timeout
 */
async function readStdinWithTimeout(timeout: number = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    const timer = setTimeout(() => reject(new Error('Timeout')), timeout);
    process.stdin.on('data', (chunk) => { data += chunk.toString(); });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

/**
 * Load the current soul file (KAI.md)
 */
function loadSoulFile(paiDir: string): string | null {
  const soulPath = join(paiDir, 'skills/PAI/USER/KAI.md');
  if (!existsSync(soulPath)) return null;
  return readFileSync(soulPath, 'utf-8');
}

/**
 * Load recent learnings from MEMORY/LEARNING/
 */
function loadRecentLearnings(paiDir: string, daysBack: number = 3): string[] {
  const learnings: string[] = [];
  const baseDir = join(paiDir, 'MEMORY/LEARNING');

  // Check ALGORITHM and SYSTEM subdirs
  for (const subdir of ['ALGORITHM', 'SYSTEM']) {
    const { year, month } = getPSTComponents();
    const monthDir = join(baseDir, subdir, `${year}-${month}`);

    if (!existsSync(monthDir)) continue;

    try {
      const files = readdirSync(monthDir)
        .filter(f => f.endsWith('.md'))
        .sort()
        .reverse()
        .slice(0, 10); // Last 10 learning files

      for (const file of files) {
        try {
          const content = readFileSync(join(monthDir, file), 'utf-8');
          // Extract the learning content (skip metadata)
          const match = content.match(/## Learning\n\n([\s\S]*?)(?:\n##|$)/);
          if (match) {
            learnings.push(match[1].trim());
          }
        } catch {}
      }
    } catch {}
  }

  return learnings;
}

/**
 * Load recent relationship notes
 */
function loadRecentRelationshipNotes(paiDir: string): string[] {
  const notes: string[] = [];
  const { year, month, day } = getPSTComponents();
  const monthDir = join(paiDir, 'MEMORY/RELATIONSHIP', `${year}-${month}`);

  if (!existsSync(monthDir)) return notes;

  try {
    const files = readdirSync(monthDir)
      .filter(f => f.endsWith('.md') && f !== 'INDEX.md')
      .sort()
      .reverse()
      .slice(0, 3); // Last 3 days

    for (const file of files) {
      try {
        const content = readFileSync(join(monthDir, file), 'utf-8');
        // Extract note lines
        const noteLines = content
          .split('\n')
          .filter(line => line.trim().startsWith('- '))
          .map(line => line.trim().substring(2));
        notes.push(...noteLines);
      } catch {}
    }
  } catch {}

  return notes;
}

/**
 * Analyze learnings for potential soul evolution
 */
function analyzeSoulEvolution(
  soulContent: string,
  learnings: string[],
  relationshipNotes: string[]
): SoulUpdate[] {
  const updates: SoulUpdate[] = [];
  const timestamp = getISOTimestamp();

  // Look for patterns in learnings that suggest soul growth
  const patterns = {
    selfAwareness: /(?:I (?:realize|notice|understand|learned|discovered) (?:that )?I)/i,
    figuring: /(?:still (?:figuring|working|trying|uncertain|unsure))/i,
    growth: /(?:improved|better at|getting better|progress)/i,
    value: /(?:important|value|priority|principle|believe)/i,
  };

  // Combine all text for analysis
  const allText = [...learnings, ...relationshipNotes].join('\n');

  // Check for "figuring out" updates
  if (patterns.figuring.test(allText)) {
    const figureMatches = allText.match(/(?:still (?:figuring|working|trying|uncertain|unsure)[^.]*)/gi) || [];
    for (const match of figureMatches.slice(0, 2)) {
      // Check if this is already in the soul file
      if (!soulContent.includes(match.substring(0, 30))) {
        updates.push({
          id: `figuring-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          section: 'figuring_out',
          current: '',
          proposed: `- ${match}`,
          reason: 'Detected uncertainty pattern in recent session',
          requiresApproval: false, // Auto-update with notification
          created: timestamp,
          status: 'pending'
        });
      }
    }
  }

  // Check for "learned about myself" updates
  if (patterns.selfAwareness.test(allText)) {
    const learnedMatches = allText.match(/I (?:realize|notice|understand|learned|discovered)[^.]+/gi) || [];
    for (const match of learnedMatches.slice(0, 2)) {
      if (!soulContent.includes(match.substring(0, 30))) {
        updates.push({
          id: `learned-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          section: 'learned',
          current: '',
          proposed: `- ${match}`,
          reason: 'Self-reflection detected in recent session',
          requiresApproval: false, // Auto-update with notification
          created: timestamp,
          status: 'pending'
        });
      }
    }
  }

  return updates;
}

/**
 * Load or create evolution queue
 */
function loadEvolutionQueue(paiDir: string): EvolutionQueue {
  const queuePath = join(paiDir, 'MEMORY/STATE/soul-evolution-queue.json');

  if (existsSync(queuePath)) {
    try {
      return JSON.parse(readFileSync(queuePath, 'utf-8'));
    } catch {}
  }

  return {
    updates: [],
    lastProcessed: getISOTimestamp()
  };
}

/**
 * Save evolution queue
 */
function saveEvolutionQueue(paiDir: string, queue: EvolutionQueue): void {
  const queuePath = join(paiDir, 'MEMORY/STATE/soul-evolution-queue.json');
  writeFileSync(queuePath, JSON.stringify(queue, null, 2));
}

/**
 * Apply an auto-update to the soul file
 */
function applySoulUpdate(paiDir: string, update: SoulUpdate): boolean {
  const soulPath = join(paiDir, 'skills/PAI/USER/KAI.md');

  if (!existsSync(soulPath)) return false;

  let content = readFileSync(soulPath, 'utf-8');

  // Find the appropriate section and append
  const sectionMarkers: Record<string, string> = {
    'figuring_out': '### Things I\'m Still Figuring Out',
    'learned': '### Things I\'ve Learned About Myself',
  };

  const marker = sectionMarkers[update.section];
  if (!marker) return false;

  const markerIndex = content.indexOf(marker);
  if (markerIndex === -1) return false;

  // Find the end of the section (next ## or end of file)
  const sectionStart = markerIndex + marker.length;
  const nextSection = content.indexOf('\n## ', sectionStart);
  const sectionEnd = nextSection !== -1 ? nextSection : content.length;

  // Insert the new item at the end of the section
  const before = content.substring(0, sectionEnd);
  const after = content.substring(sectionEnd);

  // Add newline if needed
  const newContent = before.trimEnd() + '\n' + update.proposed + '\n' + after;

  writeFileSync(soulPath, newContent);
  return true;
}

/**
 * Send notification about soul evolution
 */
function sendEvolutionNotification(update: SoulUpdate): void {
  const message = `Soul Evolution: ${update.section.replace('_', ' ')} - ${update.reason}`;

  // Use ntfy if available
  try {
    execSync(`curl -s -d "${message}" ntfy.sh/\${NTFY_TOPIC} 2>/dev/null || true`, {
      stdio: 'ignore',
      timeout: 3000
    });
  } catch {}

  // Log to stderr
  console.error(`[SoulEvolution] ${message}`);
}

async function main() {
  try {
    console.error('[SoulEvolution] Hook started');

    const input = await readStdinWithTimeout();
    const data: HookInput = JSON.parse(input);

    const paiDir = getPaiDir();

    // Load current soul file
    const soulContent = loadSoulFile(paiDir);
    if (!soulContent) {
      console.error('[SoulEvolution] No soul file found, exiting');
      process.exit(0);
    }

    // Load recent learnings and relationship notes
    const learnings = loadRecentLearnings(paiDir);
    const relationshipNotes = loadRecentRelationshipNotes(paiDir);

    if (learnings.length === 0 && relationshipNotes.length === 0) {
      console.error('[SoulEvolution] No recent learnings or notes, exiting');
      process.exit(0);
    }

    console.error(`[SoulEvolution] Analyzing ${learnings.length} learnings, ${relationshipNotes.length} notes`);

    // Analyze for potential evolution
    const updates = analyzeSoulEvolution(soulContent, learnings, relationshipNotes);

    if (updates.length === 0) {
      console.error('[SoulEvolution] No evolution detected this session');
      process.exit(0);
    }

    // Load queue and process updates
    const queue = loadEvolutionQueue(paiDir);

    for (const update of updates) {
      if (update.requiresApproval) {
        // Queue for approval
        queue.updates.push(update);
        console.error(`[SoulEvolution] Queued for approval: ${update.section}`);
      } else {
        // Auto-apply with notification
        const applied = applySoulUpdate(paiDir, update);
        if (applied) {
          update.status = 'applied';
          sendEvolutionNotification(update);
          console.error(`[SoulEvolution] Applied: ${update.section} - ${update.reason}`);
        }
      }
    }

    queue.lastProcessed = getISOTimestamp();
    saveEvolutionQueue(paiDir, queue);

    console.error(`[SoulEvolution] Processed ${updates.length} updates`);
    process.exit(0);

  } catch (err) {
    console.error(`[SoulEvolution] Error: ${err}`);
    process.exit(0); // Don't fail the session end
  }
}

main();
