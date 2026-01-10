#!/usr/bin/env bun
/**
 * RemoteQuery.ts - Query remote Claude via SSH
 * Does ONE thing: Sends text to remote Claude, returns response
 *
 * Usage:
 *   bun run RemoteQuery.ts --host vultr-claude --text "question"
 *   echo "question" | bun run RemoteQuery.ts --host vultr-claude
 */

import { spawn } from 'child_process';

interface QueryOptions {
  host: string;
  text?: string;
  timeout?: number;
}

function parseArgs(): QueryOptions {
  const args = process.argv.slice(2);
  const opts: QueryOptions = {
    host: process.env.VULTR_HOST || 'vultr-claude',
    timeout: 30000,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--host' && args[i + 1]) {
      opts.host = args[i + 1];
      i++;
    } else if (args[i] === '--text' && args[i + 1]) {
      opts.text = args[i + 1];
      i++;
    } else if (args[i] === '--timeout' && args[i + 1]) {
      opts.timeout = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--help') {
      console.log(`Usage: bun run RemoteQuery.ts [options]

Options:
  --host HOST      SSH host (default: vultr-claude)
  --text TEXT      Query text (default: stdin)
  --timeout MS     Timeout in milliseconds (default: 30000)
  --help          Show this help

Environment:
  VULTR_HOST      Default SSH host

Examples:
  bun run RemoteQuery.ts --host vultr-claude --text "what is 2+2?"
  echo "hello" | bun run RemoteQuery.ts
  bun run Transcribe.ts < audio.wav | bun run RemoteQuery.ts
`);
      process.exit(0);
    }
  }

  return opts;
}

async function queryRemoteClaude(opts: QueryOptions): Promise<string> {
  // Get text from stdin if not provided
  let text = opts.text;
  if (!text) {
    text = await Bun.stdin.text();
    text = text.trim();
  }

  if (!text) {
    throw new Error('No query text provided');
  }

  console.error(`🤖 Querying Claude on ${opts.host}...`);

  return new Promise((resolve, reject) => {
    // Escape quotes for shell
    const escapedText = text!.replace(/"/g, '\\"');

    // SSH command: echo text | claude --no-stream
    const proc = spawn('ssh', [
      opts.host,
      `echo "${escapedText}" | claude --no-stream`
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: opts.timeout,
    });

    let output = '';
    let error = '';

    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.stderr.on('data', (data) => { error += data.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`SSH command failed (code ${code}): ${error}`));
      } else if (!output.trim()) {
        reject(new Error('Empty response from Claude'));
      } else {
        console.error(`✅ Response received (${output.length} chars)`);
        resolve(output.trim());
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`SSH error: ${err.message}`));
    });

    // Timeout handler
    setTimeout(() => {
      proc.kill();
      reject(new Error(`Query timeout after ${opts.timeout}ms`));
    }, opts.timeout);
  });
}

// Main
const opts = parseArgs();
queryRemoteClaude(opts)
  .then((response) => {
    console.log(response);
  })
  .catch((err) => {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  });
