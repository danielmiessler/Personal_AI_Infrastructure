#!/usr/bin/env bun
/**
 * Record.ts - Audio recording tool (platform-aware)
 * Does ONE thing: Records audio from microphone
 *
 * Usage:
 *   bun run Record.ts [--duration 30] [--output file.wav]
 *   bun run Record.ts | bun run Transcribe.ts
 */

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

interface RecordOptions {
  duration?: number;
  output?: string;
  sampleRate?: number;
}

function parseArgs(): RecordOptions {
  const args = process.argv.slice(2);
  const opts: RecordOptions = {
    duration: 30,
    sampleRate: 16000,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--duration' && args[i + 1]) {
      opts.duration = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      opts.output = args[i + 1];
      i++;
    } else if (args[i] === '--help') {
      console.log(`Usage: bun run Record.ts [options]

Options:
  --duration N    Recording duration in seconds (default: 30)
  --output FILE   Output file path (default: stdout as base64)
  --help          Show this help

Examples:
  bun run Record.ts --duration 10 --output audio.wav
  bun run Record.ts | bun run Transcribe.ts
`);
      process.exit(0);
    }
  }

  return opts;
}

async function recordAudio(opts: RecordOptions): Promise<Buffer> {
  const platform = process.platform;
  const tempFile = opts.output || join(tmpdir(), `pai-record-${Date.now()}.wav`);

  return new Promise((resolve, reject) => {
    let cmd: string;
    let args: string[];

    if (platform === 'darwin') {
      // macOS: use sox
      cmd = 'rec';
      args = [
        '-r', opts.sampleRate!.toString(),
        '-c', '1',
        tempFile,
        'silence', '1', '0.1', '3%', '1', '2.0', '3%',
        'trim', '0', opts.duration!.toString()
      ];
    } else if (platform === 'linux') {
      // Linux: use arecord
      cmd = 'arecord';
      args = [
        '-f', 'S16_LE',
        '-r', opts.sampleRate!.toString(),
        '-c', '1',
        '-d', opts.duration!.toString(),
        tempFile
      ];
    } else {
      reject(new Error(`Unsupported platform: ${platform}`));
      return;
    }

    console.error(`🎤 Recording for up to ${opts.duration}s... (speak now)`);

    const proc = spawn(cmd, args, { stdio: ['inherit', 'pipe', 'pipe'] });

    proc.on('error', (err) => {
      reject(new Error(`Recording failed: ${err.message}`));
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Recording command exited with code ${code}`));
        return;
      }

      try {
        const audioData = require('fs').readFileSync(tempFile);
        console.error(`✅ Recording complete: ${(audioData.length / 1024).toFixed(1)}KB`);

        if (opts.output) {
          resolve(audioData);
        } else {
          // Output as base64 to stdout for piping
          process.stdout.write(audioData.toString('base64'));
          resolve(audioData);
        }
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Main
const opts = parseArgs();
recordAudio(opts)
  .catch((err) => {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  });
