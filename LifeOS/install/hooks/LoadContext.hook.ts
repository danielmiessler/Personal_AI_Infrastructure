#!/usr/bin/env bun
/**
 * @version 1.7.0
 * LoadContext.hook.ts - Inject LifeOS dynamic context into Claude's Context (SessionStart)
 *
 * LifeOS v5.0 Context Architecture:
 * - Constitutional rules     → LIFEOS/LIFEOS_SYSTEM_PROMPT.md (system prompt via --append-system-prompt-file)
 * - Operational procedures   → CLAUDE.md (loaded natively by Claude Code)
 * - Contextual knowledge     → @imports in CLAUDE.md (native Claude Code mechanism, v5.0)
 * - Dynamic context          → this hook (relationship, learning, work)
 *
 * This hook handles dynamic context only (v5.0 — static files moved to @imports):
 * - Injects dynamic, session-specific context:
 *   - Relationship context (recent opinions + notes)
 *   - Learning readback (signals, wisdom, failure patterns)
 *   - Active work summary (recent sessions + tracked projects)
 *   - Stalled ISAs (v1.7.0) — the persistent backlog index, bounded only by
 *     the `stalledMaxAgeDays` knob (30d default; 0 means genuinely any age)
 *
 * TWO SURFACES, ONE RULE: the "Recent Sessions" block is the PUSH
 * surface and is freshness-governed by knobs. The "Stalled ISAs" block reads
 * MEMORY/STATE/isa-index.json, which is append-only and has no retention
 * window at all — freshness governs what is pushed, never what exists or is
 * findable. Every window here is a knob (`isaPickup` in settings.json).
 *
 * TRIGGER: SessionStart
 *
 * INPUT:
 * - Environment: LIFEOS_DIR
 *          MEMORY/WORK/*, ~/.claude/MEMORY/WORK/*, MEMORY/STATE/isa-index.json
 *
 * OUTPUT:
 * - stdout: <system-reminder> containing dynamic context (relationship + learning)
 * - stdout: Active work summary if previous sessions have pending work
 * - stderr: Status messages and errors
 * - exit(0): Normal completion
 *
 * DESIGN (v5.0):
 * Constitutional rules live in the system prompt (LIFEOS/LIFEOS_SYSTEM_PROMPT.md).
 * Operational procedures + contextual knowledge live in CLAUDE.md (@imports, native).
 * This hook injects dynamic, session-specific context only (relationship, learning, work).
 *
 * PERFORMANCE:
 * - Blocking: Yes (context is essential)
 * - Typical execution: <50ms (no SKILL.md rebuild needed)
 * - Skipped for subagents: Yes
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { getClaudeDir, getLifeosDir, getSettingsPath } from './lib/paths';
import { recordSessionStart } from './lib/notifications';
import { loadWisdomFrames } from './lib/learning-readback';
import {
  indexKeyForArtifact,
  loadPickupKnobs,
  readIsaIndex,
  stalledIsaEntries,
  TERMINAL_PHASES,
  type StalledIsa,
} from './lib/isa-index';
import { normalizePhase } from './lib/isa-utils';

interface DynamicContextConfig {
  relationshipContext?: boolean;
  learningReadback?: boolean;
  activeWorkSummary?: boolean;
}

interface Settings {
  dynamicContext?: DynamicContextConfig;
  [key: string]: unknown;
}

/**
 * Check if a dynamic context section is enabled.
 * Defaults to true if not configured (backward compatible).
 */
function isDynamicEnabled(settings: Settings, key: keyof DynamicContextConfig): boolean {
  if (!settings.dynamicContext) return true;
  const val = settings.dynamicContext[key];
  return val !== false;
}

/**
 * Load settings.json and return the settings object.
 */
function loadSettings(): Settings {
  const settingsPath = getSettingsPath();
  if (existsSync(settingsPath)) {
    try {
      return JSON.parse(readFileSync(settingsPath, 'utf-8'));
    } catch (err) {
      console.error(`⚠️ Failed to parse settings.json: ${err}`);
    }
  }
  return {};
}

// v5.0: loadStartupFiles removed — static files now loaded via @imports in CLAUDE.md.template

/**
 * Load relationship context for session startup.
 * Returns a lightweight summary of key opinions and recent notes.
 */
function loadRelationshipContext(paiDir: string): string | null {
  const parts: string[] = [];

  // Load recent relationship notes (today and yesterday)
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const formatMonth = (d: Date) => d.toISOString().slice(0, 7);

  const recentNotes: string[] = [];
  for (const date of [today, yesterday]) {
    const notePath = join(
      paiDir,
      'MEMORY/RELATIONSHIP',
      formatMonth(date),
      `${formatDate(date)}.md`
    );
    if (existsSync(notePath)) {
      try {
        const content = readFileSync(notePath, 'utf-8');
        const notes = content
          .split('\n')
          .filter(line => line.trim().startsWith('- '))
          .slice(0, 5);
        if (notes.length > 0) {
          recentNotes.push(`*${formatDate(date)}:*`);
          recentNotes.push(...notes);
        }
      } catch {}
    }
  }

  if (recentNotes.length > 0) {
    if (parts.length > 0) parts.push('');
    parts.push('**Recent Relationship Notes:**');
    parts.push(recentNotes.join('\n'));
  }

  if (parts.length === 0) return null;

  return `
## Relationship Context

${parts.join('\n')}

`;
}

interface WorkSession {
  type: 'recent' | 'project';
  name: string;
  title: string;
  status: string;
  timestamp: string;
  stale: boolean;
  objectives?: string[];
  handoff_notes?: string;
  next_steps?: string[];
  isa?: { id: string; status: string; progress: string } | null;
  /** Backlog-index key for this session's dir — used to dedupe the stalled block. */
  indexKey?: string;
}

/**
 * Scan recent WORK/ directories for active sessions.
 *
 * This is the PUSH surface: it is freshness-governed (window + row cap, both
 * knobs). It is not, and must never become, the record of what exists — that
 * is the persistent backlog index.
 */
function getRecentWorkSessions(paiDir: string): WorkSession[] {
  // Sessions live in TWO WORK trees: ~/.claude/MEMORY/WORK (where sessions since
  // 2026-07-24 create their dirs) and <LIFEOS_DIR>/MEMORY/WORK (the older tree).
  // Scanning only one starves this block of exactly the work it exists to surface
  // The union is the fix; the persistent index is the successor.
  const workRoots = [
    join(getClaudeDir(), 'MEMORY', 'WORK'),
    join(paiDir, 'MEMORY', 'WORK'),
  ].filter((p, i, a) => a.indexOf(p) === i && existsSync(p));
  if (workRoots.length === 0) return [];

  let sessionNames: Record<string, string> = {};
  const namesPath = join(paiDir, 'MEMORY', 'STATE', 'session-names.json');
  try {
    if (existsSync(namesPath)) {
      sessionNames = JSON.parse(readFileSync(namesPath, 'utf-8'));
    }
  } catch { /* ignore parse errors */ }

  const sessions: WorkSession[] = [];
  const now = Date.now();
  const knobs = loadPickupKnobs();
  const cutoffMs = knobs.recentWorkWindowHours * 60 * 60 * 1000;
  const seenSessionIds = new Set<string>();

  try {
    const allDirs = workRoots
      .flatMap(root =>
        readdirSync(root, { withFileTypes: true })
          .filter(d => d.isDirectory() && /^\d{8}-\d{6}_/.test(d.name))
          .map(d => ({ name: d.name, root })))
      .sort((a, b) => b.name.localeCompare(a.name))
      // Safety bound only. The real bound is the window `break` below, which is
      // sound because the sort key is a chronological timestamp prefix. A fixed
      // 30 truncated the scan as soon as the window knob grew past a few days.
      .slice(0, 200);

    for (const { name: dirName, root: workDir } of allDirs) {
      const match = dirName.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})_(.+)$/);
      if (!match) continue;

      const [, y, mo, d, h, mi, s, slug] = match;
      const dirTime = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}`).getTime();

      if (now - dirTime > cutoffMs) break;

      const dirPath = join(workDir, dirName);

      // Read metadata from ISA.md frontmatter (v4.1 canonical), legacy PRD.md
      // (v4.0 consolidated, pre-rename), or META.yaml (pre-v4.0 layout).
      let status = 'UNKNOWN';
      let rawTitle = slug.replace(/-/g, ' ');
      let sessionId: string | undefined;
      // Resolve the artifact inside THIS dir's own tree — the shared
      // findArtifactPath() is pinned to one WORK root and misresolves the other.
      let isaPath: string | null = join(dirPath, 'ISA.md');
      if (!existsSync(isaPath)) isaPath = join(dirPath, 'PRD.md');
      if (!existsSync(isaPath)) isaPath = null;
      const metaPath = join(dirPath, 'META.yaml');

      if (isaPath) {
        // v4.0+: Read from ISA.md / PRD.md frontmatter. Modern ISAs carry
        // `phase:` (build|learn|complete|…); `status:` is the legacy key.
        try {
          const head = readFileSync(isaPath, 'utf-8').substring(0, 600);
          const statusMatch = head.match(/^status:\s*"?(\w+)"?/m);
          const phaseMatch = head.match(/^phase:\s*"?([\w-]+)"?/m);
          const titleMatch = head.match(/^title:\s*"?(.+?)"?\s*$/m);
          const sessionIdMatch = head.match(/^session_id:\s*"?(.+?)"?\s*$/m);
          // PHASE FIRST. `phase:` is the authoritative state field and `status:`
          // is freeform prose whose first word only sometimes means anything —
          // the same precedence the index uses (`phase || status`). Reading
          // status first inverted it: `phase: complete` with a stale open status
          // stayed pushed, and `phase: build` with `status: CLOSED` was hidden.
          if (phaseMatch) status = phaseMatch[1].toUpperCase();
          else if (statusMatch) status = statusMatch[1];
          if (titleMatch) rawTitle = titleMatch[1];
          if (sessionIdMatch) sessionId = sessionIdMatch[1]?.trim();
        } catch { /* skip */ }
      } else if (existsSync(metaPath)) {
        // Legacy: Read from META.yaml
        try {
          const meta = readFileSync(metaPath, 'utf-8');
          const statusMatch = meta.match(/^status:\s*"?(\w+)"?/m);
          const titleMatch = meta.match(/^title:\s*"?(.+?)"?\s*$/m);
          const sessionIdMatch = meta.match(/^session_id:\s*"?(.+?)"?\s*$/m);
          if (statusMatch) status = statusMatch[1];
          if (titleMatch) rawTitle = titleMatch[1];
          if (sessionIdMatch) sessionId = sessionIdMatch[1]?.trim();
        } catch { /* skip */ }
      } else {
        continue; // No ISA.md / PRD.md / META.yaml — skip
      }

      try {

        // ONE terminal vocabulary across both blocks. This filter used to
        // hardcode COMPLETED|COMPLETE, so an
        // ISA written `status: CLOSED` — which the stalled block correctly
        // treats as finished — still occupied a Recent Sessions slot. Two
        // surfaces disagreeing about "done" is how a finished session keeps
        // being pushed at the principal.
        if (TERMINAL_PHASES.has(normalizePhase(status))) continue;
        if (rawTitle.toLowerCase().startsWith('tasknotification') || rawTitle.length < 10) continue;
        if (sessionId && seenSessionIds.has(sessionId)) continue;
        if (sessionId) seenSessionIds.add(sessionId);

        const title = (sessionId && sessionNames[sessionId]) || rawTitle;

        if (sessions.length >= knobs.recentWorkLimit) break;

        let isa: WorkSession['isa'] = null;
        try {
          // v4.1: ISA.md at root; v4.0: PRD.md at root; pre-v4.0: PRD-*.md.
          // isaPath above covers v4.0/v4.1; fall back to date-stamped
          // PRD-*.md files only when neither ISA.md nor PRD.md is present.
          let artifactFile: string | null = isaPath;
          if (!artifactFile) {
            const files = readdirSync(dirPath).filter(f =>
              (f.startsWith('ISA-') || f.startsWith('PRD-')) && f.endsWith('.md')
            );
            if (files.length > 0) artifactFile = join(dirPath, files[0]);
          }
          if (artifactFile) {
            const isaContent = readFileSync(artifactFile, 'utf-8');
            const idMatch = isaContent.match(/^id:\s*(.+)$/m);
            // Same precedence as the filter above: authoritative field first.
            const statusMatch2 = isaContent.match(/^phase:\s*(.+)$/m) ?? isaContent.match(/^status:\s*(.+)$/m);
            const verifyMatch = isaContent.match(/^verification_summary:\s*"?(.+?)"?$/m)
              ?? isaContent.match(/^progress:\s*"?(.+?)"?$/m);
            isa = {
              id: idMatch?.[1]?.trim() || 'ISA',
              status: statusMatch2?.[1]?.trim() || 'UNKNOWN',
              progress: verifyMatch?.[1]?.trim() || '0/0'
            };
          }
        } catch { /* no artifacts */ }

        sessions.push({
          type: 'recent',
          name: dirName,
          title: title.length > 60 ? title.substring(0, 57) + '...' : title,
          status,
          timestamp: `${y}-${mo}-${d} ${h}:${mi}`,
          stale: false,
          isa,
          // Same key the index uses (artifact DIRECTORY relative to ~/.claude),
          // so the stalled block can exclude what this block already showed.
          indexKey: indexKeyForArtifact(join(dirPath, 'ISA.md'))
        });
      } catch { /* skip malformed */ }
    }
  } catch (err) {
    console.error(`⚠️ Error scanning WORK dirs: ${err}`);
  }

  return sessions;
}

/**
 * Load persistent project progress files, flagging stale ones (>14 days).
 */
function getProjectProgress(paiDir: string): WorkSession[] {
  const progressDir = join(paiDir, 'MEMORY', 'STATE', 'progress');
  if (!existsSync(progressDir)) return [];

  const sessions: WorkSession[] = [];
  const now = Date.now();
  const staleThreshold = 14 * 24 * 60 * 60 * 1000;

  try {
    const files = readdirSync(progressDir).filter(f => f.endsWith('-progress.json'));

    for (const file of files) {
      try {
        const content = readFileSync(join(progressDir, file), 'utf-8');

        interface ProgressFile {
          project: string;
          status: string;
          updated: string;
          objectives: string[];
          next_steps: string[];
          handoff_notes: string;
        }

        const progress = JSON.parse(content) as ProgressFile;
        if (progress.status !== 'active') continue;

        const updatedTime = new Date(progress.updated).getTime();
        const isStale = (now - updatedTime) > staleThreshold;

        sessions.push({
          type: 'project',
          name: progress.project,
          title: progress.project,
          status: 'active',
          timestamp: new Date(progress.updated).toISOString().split('T')[0],
          stale: isStale,
          objectives: progress.objectives,
          handoff_notes: progress.handoff_notes,
          next_steps: progress.next_steps
        });
      } catch { /* skip malformed */ }
    }
  } catch (err) {
    console.error(`⚠️ Error reading progress files: ${err}`);
  }

  return sessions;
}

/**
 * Backlog surface — read the persistent ISA index and return the
 * ISAs that are not finished, at ANY age.
 *
 * This is a READ. The index is built by IsaReconcile.ts (SessionStart async
 * sweep) and kept warm by ISASync's live upsert, so SessionStart stays cheap:
 * one JSON read, no directory walk, no ISA parsing.
 *
 * `stalledMaxAgeDays` and `stalledDisplayLimit` are knobs. The limit is a
 * DISPLAY cap — the index still holds everything, and nothing here can remove
 * an entry.
 */
function getStalledIsas(excludeKeys: Set<string>): StalledIsa[] {
  const knobs = loadPickupKnobs();
  if (!knobs.enabled) return [];
  try {
    return stalledIsaEntries(readIsaIndex(), {
      maxAgeDays: knobs.stalledMaxAgeDays,
      limit: knobs.stalledDisplayLimit,
      exclude: excludeKeys,
    });
  } catch (err) {
    console.error(`⚠️ Error reading ISA index: ${err}`);
    return [];
  }
}

/** "3d" / "5h" / "2mo" — compact age for the stalled block. */
function humanAge(days: number): string {
  if (!Number.isFinite(days)) return '?';
  if (days < 1) return `${Math.max(1, Math.round(days * 24))}h`;
  if (days < 60) return `${Math.round(days)}d`;
  return `${Math.round(days / 30)}mo`;
}

/**
 * Unified activity dashboard — merges recent WORK sessions, tracked projects,
 * and the stalled-ISA backlog.
 */
async function checkActiveProgress(paiDir: string): Promise<string | null> {
  const recentSessions = getRecentWorkSessions(paiDir);
  const projects = getProjectProgress(paiDir);
  const shownKeys = new Set(recentSessions.map(s => s.indexKey).filter((k): k is string => !!k));
  const stalled = getStalledIsas(shownKeys);

  if (recentSessions.length === 0 && projects.length === 0 && stalled.length === 0) {
    return null;
  }

  let summary = '\n📋 ACTIVE WORK:\n';

  if (recentSessions.length > 0) {
    const win = loadPickupKnobs().recentWorkWindowHours;
    const winLabel = win % 24 === 0 ? `${win / 24}d` : `${win}h`;
    summary += `\n  ── Recent Sessions (last ${winLabel}) ──\n`;
    for (const s of recentSessions) {
      summary += `\n  ⚡ ${s.title}\n`;
      summary += `     ${s.timestamp} | Status: ${s.status}\n`;
      if (s.isa) {
        summary += `     ISA: ${s.isa.id} (${s.isa.status}, ${s.isa.progress})\n`;
      }
    }
  }

  if (projects.length > 0) {
    summary += '\n  ── Tracked Projects ──\n';
    for (const proj of projects) {
      const staleTag = proj.stale ? ' ⚠️ STALE (>14d)' : '';
      summary += `\n  ${proj.stale ? '🟡' : '🔵'} ${proj.name}${staleTag}\n`;

      if (proj.objectives && proj.objectives.length > 0) {
        summary += '     Objectives:\n';
        proj.objectives.forEach(o => summary += `     • ${o}\n`);
      }

      if (proj.handoff_notes) {
        summary += `     Handoff: ${proj.handoff_notes}\n`;
      }

      if (proj.next_steps && proj.next_steps.length > 0) {
        summary += '     Next steps:\n';
        proj.next_steps.forEach(s => summary += `     → ${s}\n`);
      }
    }
  }

  if (stalled.length > 0) {
    // The heading states the window actually in force. It used to say "any age"
    // unconditionally, which is only true at stalledMaxAgeDays: 0 — the stock
    // default is 30d, so the heading was overclaiming on a default install.
    const maxAge = loadPickupKnobs().stalledMaxAgeDays;
    const scope = maxAge > 0 ? `last ${maxAge}d` : 'any age';
    summary += `\n  ── Stalled ISAs (backlog — ${scope}, most recent first) ──\n`;
    for (const e of stalled) {
      const bits: string[] = [e.phase];
      if (e.total > 0) bits.push(`${e.checked}/${e.total} ISC`);
      if (e.remainingWork) bits.push(e.remainingOpen > 0 ? `${e.remainingOpen} remaining-work` : 'Remaining Work');
      if (e.stranded) bits.push('stranded');
      if (e.kind === 'tool') bits.push('tool ISA');
      const card = e.taskRef ? ` [${e.taskRef}]` : '';
      const title = e.title.length > 60 ? e.title.substring(0, 57) + '...' : e.title;
      summary += `\n  ⏸ ${title}${card}\n`;
      summary += `     ${bits.join(' · ')} | last touched ${humanAge(e.ageDays)} ago\n`;
      summary += `     ${e.path}\n`;
    }
  }

  const toolsDir = paiDir + '/Tools';
  summary += `\n💡 To resume project: \`bun run ${toolsDir}/SessionProgress.ts resume <project>\`\n`;
  summary += `💡 To complete project: \`bun run ${toolsDir}/SessionProgress.ts complete <project>\`\n`;

  return summary;
}

async function main() {
  try {
    // Subagents don't need dynamic context injection
    const claudeProjectDir = process.env.CLAUDE_PROJECT_DIR || '';
    const isSubagent = claudeProjectDir.includes('/.claude/Agents/') ||
                      process.env.CLAUDE_AGENT_TYPE !== undefined;

    if (isSubagent) {
      console.error('🤖 Subagent session - skipping context loading');
      process.exit(0);
    }

    const paiDir = getLifeosDir();

    // Tab reset is handled by KittyEnvPersist.hook.ts (runs before this hook)

    // Record session start time for notification timing
    recordSessionStart();
    console.error('⏱️ Session start time recorded');

    // Load settings for dynamic context controls
    const settings = loadSettings();
    console.error('✅ Loaded settings.json');

    // v5.0: Static startup files now loaded via @imports in CLAUDE.md (native Claude Code mechanism)

    // Load relationship context (lightweight summary)
    let relationshipContext: string | null = null;
    if (isDynamicEnabled(settings, 'relationshipContext')) {
      relationshipContext = loadRelationshipContext(paiDir);
      if (relationshipContext) {
        console.error(`💕 Loaded relationship context (${relationshipContext.length} chars)`);
      }
    } else {
      console.error('⏭️ Skipped relationship context (disabled)');
    }

    // Load learning readback context
    let learningContext = '';
    if (isDynamicEnabled(settings, 'learningReadback')) {
      // 2026-07-10 ({{PRINCIPAL_NAME}} directive): keep ONLY the Wisdom Frames — the actionable
      // behavioral guidance. Dropped the self-rating wall (Performance Signals,
      // Complaint Clusters, Recent Learning Signals, Recent Failure Patterns): it was
      // negative session-start priming and the biggest single one-time context block.
      const wisdomFrames = loadWisdomFrames(paiDir);

      learningContext = wisdomFrames
        ? '\n## Learning Context (auto-loaded)\n\n' + wisdomFrames
        : '';

      if (wisdomFrames) {
        console.error(`📚 Loaded learning context: wisdom frames (${learningContext.length} chars)`);
      }
    } else {
      console.error('⏭️ Skipped learning readback (disabled)');
    }

    // Inject dynamic context if we have any
    if (relationshipContext || learningContext) {
      const message = `<system-reminder>
LifeOS Dynamic Context (Auto-loaded at Session Start)
${relationshipContext ?? ''}${learningContext ? '\n---\n' + learningContext : ''}
---
Dynamic context loaded. Constitutional rules are in the system prompt (LIFEOS/LIFEOS_SYSTEM_PROMPT.md). Operational procedures are in CLAUDE.md.
</system-reminder>`;

      console.log(message);
      console.log('\n✅ LifeOS dynamic context loaded...');
    } else {
      console.log('\n✅ LifeOS session ready...');
    }

    // Active work summary
    if (isDynamicEnabled(settings, 'activeWorkSummary')) {
      const activeProgress = await checkActiveProgress(paiDir);
      if (activeProgress) {
        console.log(activeProgress);
        console.error(`📋 Active work summary loaded (${activeProgress.length} chars)`);
      }
    } else {
      console.error('⏭️ Skipped active work summary (disabled)');
    }

    console.error('✅ LifeOS session initialization complete (v5.0 — static context via @imports)');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error in LoadContext hook:', error);
    process.exit(0); // Non-fatal — don't block session startup
  }
}

main();
