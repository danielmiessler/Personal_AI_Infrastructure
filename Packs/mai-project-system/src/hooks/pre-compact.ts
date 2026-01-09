#!/usr/bin/env bun
/**
 * PreCompact Hook
 *
 * Fires before context compaction. Parses transcript and writes
 * session state to CLAUDE.local.md for continuity.
 *
 * All operations are DETERMINISTIC - no LLM calls.
 *
 * Input (JSON from stdin):
 * {
 *   "session_id": "abc123",
 *   "transcript_path": "/path/to/transcript.jsonl",
 *   "cwd": "/path/to/project",
 *   "trigger": "auto" | "manual"
 * }
 *
 * Output:
 * Writes CLAUDE.local.md to cwd
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parseTranscript, getModifiedFiles } from '../parsers/transcript.ts';
import { extractTodoState } from '../parsers/todo-extractor.ts';
import { extractAgentInfo } from '../parsers/agent-extractor.ts';
import { writeLocalMd, buildLocalMdOptions } from '../writers/local-md.ts';

interface HookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  trigger: 'auto' | 'manual';
}

async function main() {
  try {
    // Read input from stdin
    const stdinText = await Bun.stdin.text();
    const input: HookInput = JSON.parse(stdinText);

    const { session_id, transcript_path, cwd } = input;

    // Skip if no transcript
    if (!existsSync(transcript_path)) {
      console.log(JSON.stringify({
        status: 'skipped',
        message: 'No transcript found',
      }));
      process.exit(0);
    }

    // Parse transcript (deterministic)
    const transcriptContent = readFileSync(transcript_path, 'utf-8');
    const parsed = parseTranscript(transcriptContent);

    // Extract state (deterministic)
    const todoState = extractTodoState(parsed);
    const agentInfo = extractAgentInfo(parsed);
    const modifiedFiles = getModifiedFiles(parsed);

    // Build options
    const options = buildLocalMdOptions(
      session_id,
      todoState,
      modifiedFiles,
      parsed.decisions,
      agentInfo
    );

    // Write CLAUDE.local.md (deterministic)
    const localMdPath = join(cwd, 'CLAUDE.local.md');
    writeLocalMd(localMdPath, options);

    console.log(JSON.stringify({
      status: 'success',
      message: `Wrote session state to ${localMdPath}`,
      stats: {
        todoCount: todoState.length,
        agentCount: agentInfo.length,
        modifiedFilesCount: modifiedFiles.length,
        decisionCount: parsed.decisions.length,
      },
    }));

    process.exit(0);
  } catch (error) {
    console.error(JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }));
    process.exit(1);
  }
}

main();
