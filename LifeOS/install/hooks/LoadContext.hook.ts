#!/usr/bin/env bun
/**
 * @version 1.6.31
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
 *   - Advisory readback (last session's doc/memory integrity findings)
 *   - Active work summary (last 48h sessions + tracked projects)
 *
 * TRIGGER: SessionStart
 *
 * INPUT:
 * - Environment: LIFEOS_DIR
 *          MEMORY/WORK/*, MEMORY/STATE/progress/*.json
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

import { readFileSync, existsSync, readdirSync, realpathSync } from 'fs';
import { join } from 'path';
import { getClaudeDir, getLifeosDir, getSettingsPath } from './lib/paths';
import { recordSessionStart } from './lib/notifications';
import { loadWisdomFrames } from './lib/learning-readback';
import { loadAdvisoryDigest } from './lib/advisory-readback';
import { isSubagentContext } from './lib/subagent';
import { isDesktopChannel, getNotificationChannel } from './lib/notification-channel';
import { PHASE_TO_ASCENT } from '../LIFEOS/TOOLS/ascent';

/**
 * The phases that mean a run is finished, derived from the ONE ascent table
 * rather than hand-listed here (extracted from public PR #1714, @anikinsasha).
 * `cairn` is the terminal bracket, so `learn` and `complete` resolve into this
 * set today and any future terminal phase joins it for free. Hand-listing is
 * exactly how two consumers ended up asserting the retired 8-station enum and
 * reading a modern run as "nothing has happened yet" — see the note on
 * `phaseHasWorkStarted` in ascent.ts.
 */
const TERMINAL_PHASES = new Set(
  Object.entries(PHASE_TO_ASCENT)
    .filter(([, bracket]) => bracket === 'cairn')
    .map(([phase]) => phase),
);

/**
 * True when an ISA's declared `status:`/`phase:` means done. ISAs carry either
 * key: the legacy `status: COMPLETED` and the current `phase: complete|learn`.
 * Routing both through one predicate is what stops a finished session from
 * holding an ACTIVE WORK slot forever.
 */
function isTerminalWorkState(value: string): boolean {
  const v = value.toLowerCase().trim();
  return v === 'completed' || TERMINAL_PHASES.has(v);
}

interface DynamicContextConfig {
  relationshipContext?: boolean;
  learningReadback?: boolean;
  advisoryReadback?: boolean;
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
}

/**
 * Every WORK tree this install writes session dirs into, deduped by resolved
 * path (extracted from public PR #1714, @anikinsasha).
 *
 * Sessions do not all land in one tree: `<LIFEOS_DIR>/MEMORY/WORK` is the
 * primary (a symlink into the private USER data repo on this install), and
 * `~/.claude/MEMORY/WORK` is the second tree some sessions create directly.
 * Scanning only one starves this block of exactly the work it exists to
 * surface. Resolving through realpath before deduping matters here: the two
 * candidates ARE the same directory on installs where LIFEOS_DIR sits under
 * ~/.claude, and scanning it twice would double every row.
 */
function getWorkRoots(paiDir: string): string[] {
  const candidates = [join(paiDir, 'MEMORY', 'WORK'), join(getClaudeDir(), 'MEMORY', 'WORK')];
  const seen = new Set<string>();
  const roots: string[] = [];
  for (const dir of candidates) {
    if (!existsSync(dir)) continue;
    let resolved = dir;
    try {
      resolved = realpathSync(dir);
    } catch { /* unresolvable — dedupe on the literal path */ }
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    roots.push(dir);
  }
  return roots;
}

/**
 * Scan recent WORK/ directories (last 48h) for active sessions.
 */
function getRecentWorkSessions(paiDir: string): WorkSession[] {
  const workRoots = getWorkRoots(paiDir);
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
  const cutoff48h = 48 * 60 * 60 * 1000;
  const seenSessionIds = new Set<string>();

  try {
    // Newest 30 across BOTH trees. The dir-name prefix is a chronological
    // timestamp, so a descending name sort is a descending time sort and the
    // window `break` below is the real bound — the cap just keeps the scan cheap.
    const allDirs = workRoots
      .flatMap(root =>
        readdirSync(root, { withFileTypes: true })
          .filter(d => d.isDirectory() && /^\d{8}-\d{6}_/.test(d.name))
          .map(d => ({ name: d.name, root })))
      .sort((a, b) => b.name.localeCompare(a.name))
      .slice(0, 30);

    for (const { name: dirName, root: workDir } of allDirs) {
      const match = dirName.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})_(.+)$/);
      if (!match) continue;

      const [, y, mo, d, h, mi, s, slug] = match;
      const dirTime = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}`).getTime();

      if (now - dirTime > cutoff48h) break;

      const dirPath = join(workDir, dirName);

      // Read metadata from ISA.md frontmatter (v4.1 canonical), legacy PRD.md
      // (v4.0 consolidated, pre-rename), or META.yaml (pre-v4.0 layout).
      let status = 'UNKNOWN';
      let rawTitle = slug.replace(/-/g, ' ');
      let sessionId: string | undefined;
      // Resolve the artifact inside THIS dir's own tree. The shared
      // findArtifactPath() is pinned to one WORK root, so it misresolves every
      // dir that came from the other one.
      let isaPath: string | null = join(dirPath, 'ISA.md');
      if (!existsSync(isaPath)) isaPath = join(dirPath, 'PRD.md');
      if (!existsSync(isaPath)) isaPath = null;
      const metaPath = join(dirPath, 'META.yaml');

      if (isaPath) {
        // v4.0+: Read from ISA.md / PRD.md frontmatter. Modern ISAs carry
        // `phase:`; `status:` is the legacy key, and wins when both are present.
        try {
          const head = readFileSync(isaPath, 'utf-8').substring(0, 600);
          const statusMatch = head.match(/^status:\s*"?(\w+)"?/m);
          const phaseMatch = head.match(/^phase:\s*"?([\w-]+)"?/m);
          const titleMatch = head.match(/^title:\s*"?(.+?)"?\s*$/m);
          const sessionIdMatch = head.match(/^session_id:\s*"?(.+?)"?\s*$/m);
          if (statusMatch) status = statusMatch[1];
          else if (phaseMatch) status = phaseMatch[1];
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

        // ONE terminal vocabulary. This filter used to hardcode COMPLETED, so a
        // modern ISA sitting at `phase: complete` (or `learn`) kept occupying an
        // ACTIVE WORK slot for 48h after it finished.
        if (isTerminalWorkState(status)) continue;
        if (rawTitle.toLowerCase().startsWith('tasknotification') || rawTitle.length < 10) continue;
        if (sessionId && seenSessionIds.has(sessionId)) continue;
        if (sessionId) seenSessionIds.add(sessionId);

        const title = (sessionId && sessionNames[sessionId]) || rawTitle;

        if (sessions.length >= 8) break;

        let isa: WorkSession['isa'] = null;
        try {
          // v4.1: ISA.md at root; v4.0: PRD.md at root; pre-v4.0: PRD-*.md.
          // isaPath above already covers v4.0/v4.1; fall back to date-stamped
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
            const statusMatch2 = isaContent.match(/^status:\s*(.+)$/m);
            const verifyMatch = isaContent.match(/^verification_summary:\s*"?(.+?)"?$/m);
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
          isa
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
 * Unified activity dashboard — merges recent WORK sessions + persistent projects.
 */
async function checkActiveProgress(paiDir: string): Promise<string | null> {
  const recentSessions = getRecentWorkSessions(paiDir);
  const projects = getProjectProgress(paiDir);

  if (recentSessions.length === 0 && projects.length === 0) {
    return null;
  }

  let summary = '\n📋 ACTIVE WORK:\n';

  if (recentSessions.length > 0) {
    summary += '\n  ── Recent Sessions (last 48h) ──\n';
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

  // "TOOLS" (canonical on-disk casing) — "/Tools" only resolved on
  // case-insensitive macOS and 404'd on Linux (public issue #1516, @christauff).
  const toolsDir = paiDir + '/TOOLS';
  summary += `\n💡 To resume project: \`bun run ${toolsDir}/SessionProgress.ts resume <project>\`\n`;
  summary += `💡 To complete project: \`bun run ${toolsDir}/SessionProgress.ts complete <project>\`\n`;

  return summary;
}

async function main() {
  try {
    // Subagents don't need dynamic context injection
    if (isSubagentContext()) {
      console.error('🤖 Subagent session - skipping context loading');
      process.exit(0);
    }

    const paiDir = getLifeosDir();

    // Tab reset is handled by KittyEnvPersist.hook.ts (runs before this hook)

    // Record session start time for notification timing. This runs for EVERY
    // channel, remote included — the session did start, and the notification
    // timing that reads this is not the thing being withheld below.
    recordSessionStart();
    console.error('⏱️ Session start time recorded');

    // Remote-channel sessions (iMessage, etc. — see lib/notification-channel.ts)
    // serve someone through a bot surface. Injecting the principal's
    // relationship notes, wisdom frames, advisory findings and active work
    // summary into that context is the same class of leak as a desktop /notify
    // fired from a remote turn. One guard here covers every loader below,
    // present and future.
    if (!isDesktopChannel()) {
      console.error(`📵 Remote channel (${getNotificationChannel()}) - skipping dynamic context injection`);
      console.log('\n✅ LifeOS session ready...');
      process.exit(0);
    }

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

    // Advisory readback: last session's integrity findings, delivered here
    // because SessionEnd — where they are produced — cannot inject context.
    // Emits only on a changed finding set, plus a slow re-announce; steady
    // state is zero characters.
    let advisoryContext = '';
    if (isDynamicEnabled(settings, 'advisoryReadback')) {
      const digest = loadAdvisoryDigest();
      advisoryContext = digest ? '\n## Advisory Findings\n\n' + digest : '';
      if (digest) {
        console.error(`🩺 Loaded advisory digest (${advisoryContext.length} chars)`);
      }
    } else {
      console.error('⏭️ Skipped advisory readback (disabled)');
    }

    // Inject dynamic context if we have any
    if (relationshipContext || learningContext || advisoryContext) {
      const message = `<system-reminder>
LifeOS Dynamic Context (Auto-loaded at Session Start)
${relationshipContext ?? ''}${learningContext ? '\n---\n' + learningContext : ''}${advisoryContext ? '\n---\n' + advisoryContext : ''}
---
Dynamic context loaded. Constitutional rules are in the system prompt (LIFEOS/LIFEOS_SYSTEM_PROMPT.md). Operational procedures are in CLAUDE.md.
</system-reminder>`;

      console.log(message);
      console.log('\n✅ LifeOS dynamic context loaded...');
    } else {
      // Name the enabled-but-empty sources instead of emitting a bare success
      // line: on a fresh install every dynamic source is empty by construction,
      // and a 28-byte "ready" was indistinguishable from the loaders working
      // (public issue #1712, @jacobo-ortiz). Presence is not delivery.
      const emptySources: string[] = [];
      if (isDynamicEnabled(settings, 'relationshipContext')) emptySources.push('relationship-notes');
      if (isDynamicEnabled(settings, 'learningReadback')) emptySources.push('wisdom-frames');
      if (isDynamicEnabled(settings, 'advisoryReadback')) emptySources.push('advisory-findings');
      const note = emptySources.length
        ? ` (no dynamic context yet — enabled sources empty: ${emptySources.join(', ')})`
        : '';
      console.log(`\n✅ LifeOS session ready...${note}`);
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
