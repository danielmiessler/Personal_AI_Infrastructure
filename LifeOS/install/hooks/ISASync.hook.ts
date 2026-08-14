#!/usr/bin/env bun
/**
 * @version 1.5.0
 * ISASync.hook.ts — ISA → work.json sync via PostToolUse
 *
 * TRIGGER: PostToolUse (Write, Edit, MultiEdit, Read)
 *
 * v4.1.0 (PRD → ISA rename): the per-session artifact is now ISA.md.
 * Sessions created before v4.1.0 still ship a PRD.md; this hook reads either,
 * preferring ISA.md when both exist (legacy behavior — there should never be
 * both for a single session).
 *
 * v6.9.0 (Resume After Complete): Read events on ISA files now bump
 * lastToolActivity via the slug-keyed path so reading a complete ISA
 * registers as a heartbeat for that ISA's slug. Read NEVER writes back to
 * the file — only Write/Edit/MultiEdit do.
 *
 * - Write/Edit/MultiEdit on ISA.md (or legacy PRD.md) → full sync; auto-rewind fires inside syncToWorkJson
 * - Read on ISA.md → bump lastToolActivity on the slug, rebind sessionUUID, debounced
 *
 * v1.5.0 (hook-fed phase strip): on any write whose DERIVED ascent state
 * changed for this session, emit a `<lifeos-ascent-delta>` block carrying the
 * exact response-format phase strip, computed from the same deriveAscent()
 * every dashboard surface reads. The model echoes it verbatim and never
 * computes its own — same contract as the 🧠 MEMORY and ⚙️ SYSTEM lines
 * (SystemChangeSurface: "a model-computed status line failed compliance
 * repeatedly in the 2026-05-28 experiment; never go back"). Found 2026-08-11:
 * the response strip said 🧗 Ascending while the board derived 🥾 Traverse,
 * because the strip was the last derived-state line the model self-computed.
 * No ISA write → no block → no strip: an unregistered run can no longer
 * claim a state the board doesn't show.
 */

import { readFileSync, existsSync } from 'fs';
import { spawn } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';
import {
  parseFrontmatter,
  syncToWorkJson,
  readRegistry,
  bumpLastToolActivityBySlug,
  ARTIFACT_FILENAME,
  LEGACY_ARTIFACT_FILENAME,
} from './lib/isa-utils';
import { setAscentTab } from './lib/tab-setter';
import { deriveAscent, ascentTag } from '../LIFEOS/TOOLS/ascent';
import { isSubagentContext } from './lib/subagent';

let input: any;
try {
  input = JSON.parse(readFileSync(0, 'utf-8'));
} catch {
  process.exit(0);
}

const toolInput = input.tool_input || {};
const toolName = (input.tool_name || '') as string;

async function main(): Promise<string | null> {
  // Trigger for ISA.md (or legacy PRD.md) anywhere — the Algorithm sanctions
  // TWO ISA homes (`MEMORY/WORK/{slug}/ISA.md` for tasks, `<project>/ISA.md`
  // for persistent things), but this hook watched only the first, so every
  // project ISA was invisible to work.json and every run surface reading it
  // (public issue #1807, @mhaisham).
  // (The per-tool-call liveness heartbeat lives in EventLogger.hook.ts, which
  // fires on every PostToolUse — one home, 2026-07-15 consolidation.)
  const filePath = toolInput.file_path || '';
  const isISA = filePath.endsWith('/' + ARTIFACT_FILENAME) || filePath.endsWith(ARTIFACT_FILENAME);
  const isLegacyPRD = filePath.endsWith('/' + LEGACY_ARTIFACT_FILENAME) || filePath.endsWith(LEGACY_ARTIFACT_FILENAME);
  if (!isISA && !isLegacyPRD) return null;
  const isWorkISA = filePath.includes('MEMORY/WORK/');

  // v6.9.0: Read trigger — bump heartbeat on the slug, rebind UUID, debounced.
  // No file write-back, no rewind. Read alone never mutates the ISA.
  if (toolName === 'Read') {
    const slugMatch = filePath.match(/MEMORY\/WORK\/([^/]+)\//);
    if (slugMatch) bumpLastToolActivityBySlug(slugMatch[1], input.session_id);
    return null;
  }

  // Use the actual file path that was just written/edited, not findLatestISA()
  // findLatestISA() scans all artifacts by mtime and can return the wrong file
  // when multiple sessions exist or when a file's mtime is bumped by git ops.
  const isaPath = filePath;
  if (!existsSync(isaPath)) return null;

  const content = readFileSync(isaPath, 'utf-8');
  const fm = parseFrontmatter(content);
  if (!fm) return null;

  // The slug IS the directory name — derive it when frontmatter omits it.
  // syncToWorkJson keys the registry by fm.slug and silently no-ops without
  // one, so every minimal/hand-written ISA (sanctioned by Algorithm claim 2)
  // was invisible to the board: tracked runs rendered as "NO ISA" sessions
  // (found 2026-07-22 — both of this session's ISAs never registered).
  if (!fm.slug) {
    if (isWorkISA) {
      const slugFromPath = filePath.match(/MEMORY\/WORK\/([^/]+)\//);
      if (slugFromPath) fm.slug = slugFromPath[1];
    } else {
      // Project ISA (<project>/ISA.md): the slug is the project directory name,
      // prefixed to avoid colliding with a same-named WORK slug
      // (public issue #1807, @mhaisham).
      const dirMatch = filePath.match(/([^/]+)\/[^/]+$/);
      if (dirMatch) fm.slug = 'project-' + dirMatch[1].toLowerCase();
    }
  }

  // Check existing phase before sync to detect phase changes
  const newPhase = (fm.phase || '').toUpperCase();
  let oldPhase = '';
  if (fm.slug) {
    try {
      const registry = readRegistry();
      const existing = registry.sessions[fm.slug];
      if (existing) oldPhase = (existing.phase || '').toUpperCase();
    } catch { /* silent */ }
  }

  // Sync frontmatter + criteria to work.json (pass session_id for session name lookup)
  syncToWorkJson(fm, isaPath, content, input.session_id);

  // Derive the run's state ONCE from what was just written — the same
  // deriveAscent() the board reads — and reuse it for the tab and the strip,
  // so the two cannot disagree by construction.
  const [doneStr, totalStr] = String(fm.progress || '0/0').split('/');
  const state = deriveAscent({
    phase: newPhase,
    tracked: true,
    active: true,
    done: parseInt(doneStr, 10) || 0,
    total: parseInt(totalStr, 10) || 0,
  });

  // Repaint the tab when the run's declared phase changes.
  //
  // The old gate was an explicit phase allowlist that had to be extended by hand
  // every time the vocabulary moved — and wasn't, twice (2026-07-22, 2026-07-27),
  // so tab colors silently stopped firing mid-run. `deriveAscent` resolves any
  // phase value, current or retired, through the one table; an unknown value
  // falls back to a real state instead of being dropped on the floor.
  if (input.session_id && newPhase !== oldPhase) {
    try {
      setAscentTab(state, input.session_id);
    } catch (err) {
      console.error('[ISASync] setAscentTab failed:', err);
    }
  }

  // v1.5.0: hook-fed phase strip (see header). Fires once per DERIVED-state
  // transition — not per phase change, so progress reaching n/n emits 🪨 Cairn
  // without a phase edit. Per-session dedupe file; subagents never emit (their
  // ISA edits would strip-spam their own contexts, which helps nobody).
  let stripDelta: string | null = null;
  if (input.session_id && fm.slug && !isSubagentContext()) {
    try {
      const stripDir = join(homedir(), '.claude/LIFEOS/MEMORY/STATE/ascent-strip');
      const stripFile = join(stripDir, `${String(input.session_id).replace(/[^\w-]/g, '')}.json`);
      let prev: { slug?: string; state?: string } = {};
      if (existsSync(stripFile)) {
        try { prev = JSON.parse(readFileSync(stripFile, 'utf-8')); } catch { /* corrupt = no prior */ }
      }
      if (prev.slug !== fm.slug || prev.state !== state) {
        const { mkdirSync, writeFileSync } = require('fs');
        mkdirSync(stripDir, { recursive: true });
        writeFileSync(stripFile, JSON.stringify({ slug: fm.slug, state, at: new Date().toISOString() }));
        const tag = ascentTag(state);
        stripDelta = [
          '<lifeos-ascent-delta>',
          "The run's derived ascent state changed (computed by ISASync through the same deriveAscent() every dashboard surface reads). Lead the next visible status note with this phase strip VERBATIM, exactly once. Never compute a strip yourself:",
          `════ LifeOS | Algorithm | ${tag.icon} ${tag.label} ════`,
          '</lifeos-ascent-delta>',
        ].join('\n');
      }
    } catch { /* the strip is decoration — it must never break sync */ }
  }

  // ─────────── HTML Mirror trigger 1 (v6.5.0 ISA HTML Mirror) ───────────
  // Fire ISARender ONLY on transition to `complete`. Per-phase changes during
  // active work do NOT fire renders — user-stated constraint:
  //   "lots of phase changes as it's being written; we don't want to be
  //    constantly remaking the HTML file."
  if (newPhase === 'COMPLETE' && oldPhase !== 'COMPLETE' && fm.slug) {
    try {
      const isaRender = join(homedir(), '.claude/LIFEOS/TOOLS/ISARender.ts');
      const proc = spawn('bun', [isaRender, isaPath], {
        detached: true,
        stdio: 'ignore',
      });
      proc.unref();
    } catch (err) {
      console.error('[ISASync] ISARender spawn failed:', err);
    }
  }

  // ─────────── HTML Mirror trigger 2 — session state tracking ───────────
  // Record this edit so ISARenderOnStop.hook.ts can decide whether to render
  // at end-of-turn. The Stop hook gates on ISA.html already existing, so
  // pre-completion edits never trigger renders even though they show up here.
  if (input.session_id) {
    try {
      const stateDir = join(homedir(), '.claude/LIFEOS/MEMORY/STATE/isa-render-debounce');
      const stateFile = join(stateDir, `${input.session_id}.json`);
      const { mkdirSync, writeFileSync } = require('fs');
      mkdirSync(stateDir, { recursive: true });
      let edited: string[] = [];
      if (existsSync(stateFile)) {
        try { edited = JSON.parse(readFileSync(stateFile, 'utf-8')).edited_isas || []; } catch {}
      }
      if (!edited.includes(isaPath)) edited.push(isaPath);
      writeFileSync(stateFile, JSON.stringify({ session_id: input.session_id, edited_isas: edited, updated: new Date().toISOString() }));
    } catch { /* silent — state-tracking failure must not break sync */ }
  }

  return stripDelta;
}

main()
  .then((additionalContext) => {
    const out: Record<string, unknown> = { continue: true };
    if (additionalContext) {
      out.hookSpecificOutput = { hookEventName: 'PostToolUse', additionalContext };
    }
    console.log(JSON.stringify(out));
    process.exit(0);
  })
  .catch(() => {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  });
