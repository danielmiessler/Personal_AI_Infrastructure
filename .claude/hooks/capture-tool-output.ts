#!/usr/bin/env bun

/**
 * PostToolUse Hook - Captures tool outputs for UOCS
 *
 * Automatically logs all tool executions to daily JSONL files
 * for later processing and analysis.
 */

import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { PAI_DIR } from './lib/pai-paths';

interface ToolUseData {
  tool_name: string;
  tool_input: Record<string, any>;
  tool_response: Record<string, any>;
  conversation_id: string;
  timestamp: string;
}

// Configuration
const CAPTURE_DIR = join(PAI_DIR, 'history', 'raw-outputs');
const INTERESTING_TOOLS = ['Bash', 'Edit', 'Write', 'Read', 'Task', 'NotebookEdit'];

async function main() {
  try {
    // Read input from stdin
    const input = await Bun.stdin.text();
    if (!input || input.trim() === '') {
      process.exit(0);
    }

    const data: ToolUseData = JSON.parse(input);

    // Only capture interesting tools
    if (!INTERESTING_TOOLS.includes(data.tool_name)) {
      process.exit(0);
    }

    // Get today's date for organization
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const yearMonth = today.substring(0, 7); // YYYY-MM

    // Ensure capture directory exists
    const dateDir = join(CAPTURE_DIR, yearMonth);
    if (!existsSync(dateDir)) {
      mkdirSync(dateDir, { recursive: true });
    }

    // Format output as JSONL (one JSON object per line)
    const captureFile = join(dateDir, `${today}_tool-outputs.jsonl`);
    const captureEntry = JSON.stringify({
      timestamp: data.timestamp || now.toISOString(),
      tool: data.tool_name,
      input: data.tool_input,
      output: data.tool_response,
      session: data.conversation_id
    }) + '\n';

    // Append to daily log
    appendFileSync(captureFile, captureEntry);

    // Exit successfully (code 0 = continue normally)
    process.exit(0);
  } catch (error) {
    // Silent failure - don't disrupt workflow
    console.error(`[UOCS] PostToolUse hook error: ${error}`);
    process.exit(0);
  }
}

main();
