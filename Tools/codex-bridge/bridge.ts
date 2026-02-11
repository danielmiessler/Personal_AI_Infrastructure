#!/usr/bin/env bun
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from 'fs';
import { spawn } from 'child_process';
import { join } from 'path';
import type { CodexLogLine, CodexMessage, SessionState } from './types';
import { runSessionStart, runStop, runUserPrompt } from './hooks';

const CODEX_HOME = process.env.CODEX_HOME || `${process.env.HOME}/.codex`;
const PAI_DIR = process.env.PAI_DIR || `${process.env.HOME}/.claude`;

const sessionsDir = join(CODEX_HOME, 'sessions');
const bridgeDir = join(PAI_DIR, 'bridge');
const logsDir = join(bridgeDir, 'logs');
const transcriptsDir = join(bridgeDir, 'transcripts');

for (const dir of [bridgeDir, logsDir, transcriptsDir]) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function contentToText(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => (typeof c?.text === 'string' ? c.text : ''))
      .filter(Boolean)
      .join(' ')
      .trim();
  }
  if (typeof content.text === 'string') return content.text;
  return '';
}

function extractMessage(line: CodexLogLine): CodexMessage | null {
  if (line.type !== 'response_item') return null;
  const payload = line.payload;
  if (!payload || payload.type !== 'message') return null;
  const role = payload.role;
  if (role !== 'user' && role !== 'assistant') return null;
  const text = contentToText(payload.content);
  if (!text) return null;
  return { role, text };
}

function appendTranscriptLine(transcriptPath: string, message: CodexMessage): void {
  const entry = {
    type: message.role,
    message: {
      content: [{ type: 'text', text: message.text }],
    },
  };
  appendFileSync(transcriptPath, JSON.stringify(entry) + '\n');
}

function buildStatuslinePayload(cwd: string) {
  return {
    workspace: { current_dir: cwd },
    model: { display_name: 'codex' },
    version: 'unknown',
    cost: { total_duration_ms: 0 },
    context_window: {
      current_usage: {
        input_tokens: 0,
        output_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      },
      context_window_size: 200000,
    },
  };
}

async function runStatusline(paiDir: string, payload: unknown, dryRun: boolean): Promise<void> {
  const statuslinePath = join(paiDir, 'statusline-command.sh');
  if (dryRun) {
    console.log(`STATUSLINE -> ${statuslinePath}`);
    return;
  }
  if (!existsSync(statuslinePath)) {
    console.error(`Statusline not found: ${statuslinePath}`);
    return;
  }

  await new Promise<void>((resolve) => {
    const child = spawn('bash', [statuslinePath], {
      stdio: ['pipe', 'inherit', 'inherit'],
      env: { ...process.env, PAI_DIR: paiDir },
    });

    child.on('error', (error) => {
      console.error(`Statusline failed: ${error.message}`);
      resolve();
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();

    child.on('close', () => resolve());
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function listSessionFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    let entries: ReturnType<typeof readdirSync>;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function extractSessionIdFromPath(filePath: string): string | null {
  const match = filePath.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match ? match[0] : null;
}

function createSessionState(filePath: string, startOffset: number): SessionState {
  const sessionId = extractSessionIdFromPath(filePath) || undefined;
  return {
    filePath,
    sessionId,
    transcriptPath: sessionId ? join(transcriptsDir, `${sessionId}.jsonl`) : undefined,
    lastOffset: startOffset,
    cwd: undefined,
    buffer: '',
    started: false,
  };
}

async function ensureSessionStarted(state: SessionState, dryRun: boolean): Promise<boolean> {
  if (state.started) return true;
  if (!state.sessionId) return false;
  if (!state.transcriptPath) {
    state.transcriptPath = join(transcriptsDir, `${state.sessionId}.jsonl`);
  }
  if (!existsSync(state.transcriptPath)) {
    writeFileSync(state.transcriptPath, '', 'utf-8');
  }
  await runSessionStart({ paiDir: PAI_DIR, dryRun });
  state.started = true;
  return true;
}

async function processLogLine(state: SessionState, line: CodexLogLine, dryRun: boolean): Promise<void> {
  if (line.type === 'session_meta') {
    const payload = line.payload || {};
    if (payload.id) {
      if (!state.started || !state.sessionId) {
        state.sessionId = payload.id;
        state.transcriptPath = join(transcriptsDir, `${payload.id}.jsonl`);
      }
    }
    if (payload.cwd) {
      state.cwd = payload.cwd;
    }
    await ensureSessionStarted(state, dryRun);
    return;
  }

  const message = extractMessage(line);
  if (!message) return;

  if (!state.sessionId) {
    state.sessionId = extractSessionIdFromPath(state.filePath) || undefined;
  }

  const started = await ensureSessionStarted(state, dryRun);
  if (!started || !state.sessionId || !state.transcriptPath) {
    return;
  }

  appendTranscriptLine(state.transcriptPath, message);

  if (message.role === 'user') {
    await runUserPrompt(
      {
        session_id: state.sessionId,
        transcript_path: state.transcriptPath,
        hook_event_name: 'UserPromptSubmit',
        prompt: message.text,
        user_prompt: message.text,
      },
      { paiDir: PAI_DIR, dryRun }
    );
  }

  if (message.role === 'assistant') {
    await runStop(
      {
        session_id: state.sessionId,
        transcript_path: state.transcriptPath,
        hook_event_name: 'Stop',
      },
      { paiDir: PAI_DIR, dryRun }
    );
    await runStatusline(PAI_DIR, buildStatuslinePayload(state.cwd ?? process.cwd()), dryRun);
  }
}

async function processSessionFile(state: SessionState, dryRun: boolean): Promise<void> {
  let stats;
  try {
    stats = statSync(state.filePath);
  } catch {
    return;
  }

  if (stats.size < state.lastOffset) {
    state.lastOffset = 0;
    state.buffer = '';
  }

  if (stats.size === state.lastOffset) return;

  const buffer = readFileSync(state.filePath);
  const chunk = buffer.subarray(state.lastOffset);
  state.lastOffset = buffer.length;

  if (chunk.length === 0) return;

  const combined = state.buffer + chunk.toString('utf-8');
  const lines = combined.split('\n');
  if (!combined.endsWith('\n')) {
    state.buffer = lines.pop() || '';
  } else {
    state.buffer = '';
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    try {
      const parsed = JSON.parse(line) as CodexLogLine;
      await processLogLine(state, parsed, dryRun);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      console.error(`Failed to parse ${state.filePath}: ${message}`);
    }
  }
}

async function watchSessions(dryRun: boolean, once: boolean): Promise<void> {
  const stateByFile = new Map<string, SessionState>();

  if (!once) {
    const existingFiles = listSessionFiles(sessionsDir);
    for (const filePath of existingFiles) {
      let size = 0;
      try {
        size = statSync(filePath).size;
      } catch {
        size = 0;
      }
      stateByFile.set(filePath, createSessionState(filePath, size));
    }
  }

  const scan = async () => {
    const files = listSessionFiles(sessionsDir);
    for (const filePath of files) {
      let state = stateByFile.get(filePath);
      if (!state) {
        state = createSessionState(filePath, 0);
        stateByFile.set(filePath, state);
      }
      await processSessionFile(state, dryRun);
    }
  };

  if (once) {
    await scan();
    return;
  }

  while (true) {
    await scan();
    await sleep(1000);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const fixtureIndex = args.indexOf('--test-fixture');
  const fixturePath = fixtureIndex >= 0 ? args[fixtureIndex + 1] : null;
  const dryRun = args.includes('--dry-run');
  const watch = args.includes('--watch') || args.includes('--once') || !fixturePath;
  const once = args.includes('--once');

  console.log('Codex bridge starting...');
  console.log(`CODEX_HOME=${CODEX_HOME}`);
  console.log(`PAI_DIR=${PAI_DIR}`);
  console.log(`sessions=${sessionsDir}`);

  if (fixturePath) {
    const sessionId = 'test';
    const transcriptPath = join(transcriptsDir, `${sessionId}.jsonl`);
    writeFileSync(transcriptPath, '', 'utf-8');

    await runSessionStart({ paiDir: PAI_DIR, dryRun });

    const raw = readFileSync(fixturePath, 'utf-8');
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);

    for (const line of lines) {
      const parsed = JSON.parse(line) as CodexLogLine;
      const message = extractMessage(parsed);
      if (!message) continue;

      appendTranscriptLine(transcriptPath, message);

      if (message.role === 'user') {
        await runUserPrompt(
          {
            session_id: sessionId,
            transcript_path: transcriptPath,
            hook_event_name: 'UserPromptSubmit',
            prompt: message.text,
            user_prompt: message.text,
          },
          { paiDir: PAI_DIR, dryRun }
        );
      }

      if (message.role === 'assistant') {
        await runStop(
          {
            session_id: sessionId,
            transcript_path: transcriptPath,
            hook_event_name: 'Stop',
          },
          { paiDir: PAI_DIR, dryRun }
        );
        await runStatusline(PAI_DIR, buildStatuslinePayload(process.cwd()), dryRun);
      }
    }

    console.log(`Wrote transcript: ${transcriptPath}`);
    return;
  }

  if (watch) {
    await watchSessions(dryRun, once);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
