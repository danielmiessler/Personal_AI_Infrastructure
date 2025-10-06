#!/usr/bin/env bun
/**
 * Dynamic Requirements Loader Hook
 * This TypeScript wrapper reads the markdown instructions and outputs them to Claude
 * This allows the markdown file to be "executed" as a hook
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface HookInput {
  session_id: string;
  prompt: string;
  transcript_path: string;
  hook_event_name: string;
}

/**
 * Read stdin with timeout
 */
async function readStdinWithTimeout(timeout: number = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    const timer = setTimeout(() => {
      reject(new Error('Timeout reading from stdin'));
    }, timeout);
    
    process.stdin.on('data', (chunk) => {
      data += chunk.toString();
    });
    
    process.stdin.on('end', () => {
      clearTimeout(timer);
      resolve(data);
    });
    
    process.stdin.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function main() {
  const logFile = `${process.env.HOME}/Library/Logs/hook_debug.log`;
  const debugLog = (msg: string) => {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] [load-dynamic-requirements] ${msg}\n`;
    try {
      require('fs').appendFileSync(logFile, logMsg);
    } catch (e) {
      // Ignore logging errors
    }
  };

  try {
    debugLog('Hook started');

    // Read the hook input from stdin
    const input = await readStdinWithTimeout();
    debugLog(`Received input: ${input.substring(0, 100)}...`);

    const data: HookInput = JSON.parse(input);
    debugLog(`Parsed prompt: ${data.prompt}`);

    // Read the markdown file with instructions from commands directory
    const paiDir = process.env.PAI_DIR || `${process.env.HOME}/.claude`;
    const mdPath = `${paiDir}/commands/load-dynamic-requirements.md`;
    debugLog(`Reading markdown from: ${mdPath}`);

    const mdContent = readFileSync(mdPath, 'utf-8');
    debugLog(`Markdown file read successfully, length: ${mdContent.length} chars`);

    // Output the markdown content to stdout
    // This will be passed to Claude as instructions
    console.log(mdContent);

    // Also output a special marker to indicate this is a hook instruction
    console.log('\n<!-- HOOK_INSTRUCTION: Dynamic requirements loading based on user prompt -->');
    console.log(`<!-- USER_PROMPT: ${data.prompt} -->`);

    debugLog('Hook completed successfully, markdown output to stdout');
    process.exit(0);
  } catch (error) {
    // Silently fail to not interrupt Claude's flow
    // But log to stderr for debugging if needed
    debugLog(`Hook error: ${error}`);
    console.error('Dynamic context loader error:', error);
    process.exit(0); // Exit cleanly even on error
  }
}

main();
