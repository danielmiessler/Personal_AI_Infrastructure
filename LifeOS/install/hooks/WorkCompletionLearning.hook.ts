#!/usr/bin/env bun
// Normalize env path vars Claude Code may inject unexpanded — literal $HOME/${HOME}
// in LIFEOS_DIR/LIFEOS_CONFIG_DIR/PROJECTS_DIR resolves to a shadow dir (#1404 / PR #1451, author jbmml).
for (const __k of ["LIFEOS_DIR", "LIFEOS_CONFIG_DIR", "PROJECTS_DIR"]) {
  const __v = process.env[__k];
  if (__v && /^\$\{?HOME\}?(\/|$)/.test(__v)) process.env[__k] = __v.replace(/^\$\{?HOME\}?/, process.env.HOME ?? "~");
}

/**
 * @version 1.5.14
 * WorkCompletionLearning.hook.ts - Extract Learnings from Completed Work (SessionEnd)
 *
 * PURPOSE:
 * Bridges the WORK/ system to the LEARNING/ system. When a session ends with
 * significant work completed, this hook captures the work metadata (files changed,
 * tools used, ideal state criteria) and creates a learning file for future reference.
 * This ensures insights compound over time rather than being lost.
 *
 * TRIGGER: SessionEnd
 *
 * INPUT:
 * - stdin: Hook input JSON (session_id, transcript_path)
 * - Files: MEMORY/STATE/work.json (canonical session registry), MEMORY/WORK/<slug>/ISA.md (or legacy PRD.md / META.yaml)
 *
 * OUTPUT:
 * - stdout: None
 * - stderr: Status messages
 * - exit(0): Always (non-blocking)
 *
 * SIDE EFFECTS:
 * - Creates: MEMORY/LEARNING/<category>/<YYYY-MM>/<datetime>_work_<slug>.md
 * - Reads: Current work state and work directory metadata
 *
 * INTER-HOOK RELATIONSHIPS:
 * - COORDINATES WITH: SessionCleanup (both run at SessionEnd)
 * - MUST RUN BEFORE: SessionCleanup (captures before state is cleared)
 * - MUST RUN AFTER: Stop handlers (captures completed work)
 *
 * SIGNIFICANT WORK CRITERIA:
 * A learning is only captured if:
 * - Files were changed, OR
 * - Multiple items exist in work directory, OR
 * - Work was manually created (source: MANUAL)
 *
 * LEARNING CATEGORIES:
 * - ALGORITHM: Insights about process/approach improvement
 * - SYSTEM: Technical system improvements
 * (Determined by getLearningCategory utility)
 *
 * ERROR HANDLING:
 * - No active work: Silent exit
 * - Missing META.yaml: Silent exit
 * - Write failures: Logged to stderr, silent exit
 *
 * PERFORMANCE:
 * - Non-blocking: Yes (fire-and-forget at session end)
 * - Typical execution: <100ms
 */

import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getISOTimestamp, getPSTDate } from './lib/time';
import { getLearningCategory } from './lib/learning-utils';
import { findArtifactPath, findActiveSessionByUUID } from './lib/isa-utils';

// Normalize env path vars that Claude Code injects without shell expansion (LifeOS#1404)
for (const k of ["LIFEOS_DIR", "LIFEOS_CONFIG_DIR", "PROJECTS_DIR"]) {
  const v = process.env[k];
  if (v && /^\$\{?HOME\}?(\/|$)/.test(v)) process.env[k] = v.replace(/^\$\{?HOME\}?/, process.env.HOME ?? "~");
}


const BASE_DIR = process.env.LIFEOS_DIR || join(process.env.HOME!, '.claude', 'LIFEOS');
const MEMORY_DIR = join(BASE_DIR, 'MEMORY');
const WORK_DIR = join(MEMORY_DIR, 'WORK');
const LEARNING_DIR = join(MEMORY_DIR, 'LEARNING');

/**
 * What an ISA's frontmatter actually carries. The previous shape was inherited
 * from the pre-v4 META.yaml era and asked for `lineage` and `source`, which no
 * ISA has ever written — so `files_changed.length` was always 0, `source` was
 * always undefined, and the significance test below could never be true. The
 * bridge's own output proves it: 37 learning files, every one dated 2026-03-20,
 * nothing since. Fields here are the ones ISAFormat.md defines and real ISAs
 * on disk contain.
 */
interface WorkMeta {
  title: string;
  task: string;
  created_at: string;
  started: string;
  completed_at: string | null;
  session_id: string;
  phase: string;
  progress: string;
}

function parseYaml(content: string): WorkMeta {
  // Simple YAML parser for our specific format
  const meta: any = {};
  const lines = content.split('\n');
  let currentKey = '';
  let inArray = false;
  let arrayKey = '';
  let lineageSubKey = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Handle array items
    if (trimmed.startsWith('- ') && inArray) {
      const value = trimmed.slice(2).replace(/^["']|["']$/g, '');
      if (arrayKey === 'lineage') {
        // Nested array in lineage — use tracked sub-key
        if (lineageSubKey) meta.lineage[lineageSubKey].push(value);
      } else {
        meta[arrayKey].push(value);
      }
      continue;
    }

    // Handle key: value pairs
    const match = trimmed.match(/^([a-z_]+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      currentKey = key;

      if (key === 'lineage') {
        meta.lineage = { tools_used: [], files_changed: [], agents_spawned: [] };
        inArray = false;
        continue;
      }

      if (value === '[]') {
        if (meta.lineage) {
          meta.lineage[key] = [];
        } else {
          meta[key] = [];
        }
        inArray = false;
      } else if (value === '') {
        if (meta.lineage && ['tools_used', 'files_changed', 'agents_spawned'].includes(key)) {
          meta.lineage[key] = [];
          arrayKey = 'lineage';
          lineageSubKey = key;
          inArray = true;
        } else {
          meta[key] = [];
          arrayKey = key;
          inArray = true;
        }
      } else {
        const cleanValue = value.replace(/^["']|["']$/g, '');
        if (meta.lineage && ['tools_used', 'files_changed', 'agents_spawned'].includes(key)) {
          meta.lineage[key] = cleanValue === 'null' ? [] : [cleanValue];
        } else {
          meta[key] = cleanValue === 'null' ? null : cleanValue;
        }
        inArray = false;
      }
    }
  }

  return meta as WorkMeta;
}

function getMonthDir(category: 'SYSTEM' | 'ALGORITHM'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const monthDir = join(LEARNING_DIR, category, `${year}-${month}`);

  if (!existsSync(monthDir)) {
    mkdirSync(monthDir, { recursive: true });
  }

  return monthDir;
}

function writeLearning(workMeta: WorkMeta, idealContent: string, closed: number, total: number): void {
  const category = getLearningCategory(workMeta.title);
  const monthDir = getMonthDir(category);

  const dateStr = getPSTDate();
  const timeStr = new Date().toISOString().split('T')[1].slice(0, 5).replace(':', '');
  const titleSlug = workMeta.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 30);

  const filename = `${dateStr}_${timeStr}_work_${titleSlug}.md`;
  const filepath = join(monthDir, filename);

  // Don't overwrite existing learnings
  if (existsSync(filepath)) {
    console.error(`[WorkCompletionLearning] Learning already exists: ${filename}`);
    return;
  }

  // Calculate session duration
  let duration = 'Unknown';
  if (workMeta.created_at && workMeta.completed_at) {
    const start = new Date(workMeta.created_at);
    const end = new Date(workMeta.completed_at);
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    if (minutes < 60) {
      duration = `${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      duration = `${hours}h ${mins}m`;
    }
  }

  const content = `# Work Completion Learning

**Title:** ${workMeta.title}
**Duration:** ${duration}
**Category:** ${category}
**Session:** ${workMeta.session_id}

---

## Ideal State Criteria

${idealContent || 'Not specified'}

## What Was Done

- **Claims closed:** ${closed}/${total}
- **Phase at close:** ${workMeta.phase || 'unknown'}

*Per-file and per-tool lineage is not recorded in ISA frontmatter. The change
record is git: \`git log -- <isa-path>\`.*

---

*Auto-captured by WorkCompletionLearning hook at session end*
`;

  writeFileSync(filepath, content);
  console.error(`[WorkCompletionLearning] Created learning: ${filename}`);
}

async function main() {
  try {
    // Read input from stdin with timeout — SessionEnd hooks may receive
    // empty or slow stdin. Proceed regardless since state is read from disk.
    let sessionId: string | undefined;
    try {
      const input = await Promise.race([
        Bun.stdin.text(),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]);
      if (input && input.trim()) {
        const parsed = JSON.parse(input);
        sessionId = parsed.session_id;
      }
    } catch {
      // Timeout or parse error — proceed without session_id
    }
    // Resolve the active work-session row for this hook UUID against
    // MEMORY/STATE/work.json (the canonical registry — replaces the
    // never-written `current-work.json` lookup).
    const active = sessionId ? findActiveSessionByUUID(sessionId) : null;
    if (!active) {
      if (sessionId) {
        console.error(`[WorkCompletionLearning] No active work session for sessionId=${sessionId}`);
      } else {
        console.error('[WorkCompletionLearning] No session_id from hook input — nothing to capture');
      }
      process.exit(0);
    }
    const slug = active.slug;

    // Read work directory metadata — from ISA.md frontmatter (v4.1+),
    // legacy PRD.md frontmatter (v4.0), or META.yaml (pre-v4.0)
    const workPath = join(WORK_DIR, slug);
    const isaPath = findArtifactPath(slug);
    const metaPath = join(workPath, 'META.yaml');

    let workMeta: any = {};
    if (isaPath) {
      // v4.0+: Read from ISA.md / PRD.md frontmatter
      const isaContent = readFileSync(isaPath, 'utf-8');
      const fmMatch = isaContent.match(/^---\n([\s\S]*?)\n---/);
      if (fmMatch) {
        workMeta = parseYaml(fmMatch[1]);
      }
    } else if (existsSync(metaPath)) {
      // Legacy: Read from META.yaml
      const metaContent = readFileSync(metaPath, 'utf-8');
      workMeta = parseYaml(metaContent);
    } else {
      console.error('[WorkCompletionLearning] No ISA.md / PRD.md / META.yaml found');
      process.exit(0);
    }

    // Update completed_at if not set
    if (!workMeta.completed_at) {
      workMeta.completed_at = getISOTimestamp();
    }

    // Extract claim counts from the ISA's criteria section, or ISC.json (legacy).
    // The heading vocabulary is `## Claims` today; `## Criteria` / `## ISC
    // Criteria` are legacy spellings that ISAFormat.md still parses. The old
    // regex here matched neither `Claims` nor `ISC Criteria`, so it missed the
    // current convention outright — the same read-a-field-that-isn't-written
    // defect as the frontmatter above, in the same file.
    let idealContent = '';
    let closedClaims = 0;
    let totalClaims = 0;
    if (isaPath) {
      try {
        const isaContent = readFileSync(isaPath, 'utf-8');
        const iscMatch = isaContent.match(/## (?:Claims|ISC Criteria|IDEAL STATE CRITERIA|Criteria)[\s\S]*?(?=\n## |$)/);
        if (iscMatch) {
          closedClaims = (iscMatch[0].match(/- \[x\]/gi) || []).length;
          const unchecked = (iscMatch[0].match(/- \[ \]/g) || []).length;
          totalClaims = closedClaims + unchecked;
          if (totalClaims > 0) {
            idealContent = `**Claims:** ${closedClaims}/${totalClaims} closed`;
          }
        }
      } catch { /* ignore */ }
    } else {
      const iscPath = join(workPath, 'ISC.json');
      if (existsSync(iscPath)) {
        try {
          const iscData = JSON.parse(readFileSync(iscPath, 'utf-8'));
          if (iscData.current?.criteria?.length > 0) {
            idealContent = '**Criteria:**\n' + iscData.current.criteria.map((c: string) => `- ${c}`).join('\n');
          }
          if (iscData.satisfaction) {
            const s = iscData.satisfaction;
            idealContent += `\n\n**Satisfaction:** ${s.satisfied}/${s.total} satisfied, ${s.partial} partial, ${s.failed} failed`;
          }
        } catch { /* ignore */ }
      }
    }

    // Identity comes from the registry row when the ISA omits it — `title` and
    // `session_id` were never ISA frontmatter fields either, so every learning
    // file used to render "**Session:** undefined".
    workMeta.title = workMeta.title || workMeta.task || active.session?.task || slug;
    workMeta.session_id = workMeta.session_id || sessionId || 'unknown';
    workMeta.created_at = workMeta.created_at || workMeta.started;

    // Significance is "the run closed at least one claim" — the one durable
    // signal an ISA actually records. The previous test asked for a files-changed
    // count and a MANUAL source that no ISA has ever carried, so it was false on
    // every session and the WORK->LEARNING bridge wrote nothing for four months.
    const hasSignificantWork = closedClaims > 0;

    // Significance alone decides. The old effort gate keyed on "e1 | standard |
    // low" — retired tier names that collide with the harness's LIVE
    // CLAUDE_EFFORT dial, so a low-effort session silently skipped capture
    // (Forge cross-vendor audit, 2026-07-24).
    if (hasSignificantWork) {
      writeLearning(workMeta, idealContent, closedClaims, totalClaims);
    } else {
      console.error('[WorkCompletionLearning] No claims closed this session, skipping learning capture');
    }

    process.exit(0);
  } catch (error) {
    // Silent failure - don't disrupt workflow
    console.error(`[WorkCompletionLearning] Error: ${error}`);
    process.exit(0);
  }
}

main();
