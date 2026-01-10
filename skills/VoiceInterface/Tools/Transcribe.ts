#!/usr/bin/env bun
/**
 * Transcribe.ts - Audio transcription tool (provider-agnostic)
 * Does ONE thing: Converts audio to text
 *
 * Usage:
 *   bun run Transcribe.ts --input audio.wav [--provider whisperflow|openai|whisper-cpp]
 *   cat audio.wav | bun run Transcribe.ts --provider openai
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { spawn } from 'child_process';

interface TranscribeOptions {
  input?: string;
  provider: 'whisperflow' | 'openai' | 'whisper-cpp';
  apiKey?: string;
}

function parseArgs(): TranscribeOptions {
  const args = process.argv.slice(2);
  const opts: TranscribeOptions = {
    provider: (process.env.WHISPER_PROVIDER as any) || 'whisperflow',
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      opts.input = args[i + 1];
      i++;
    } else if (args[i] === '--provider' && args[i + 1]) {
      opts.provider = args[i + 1] as any;
      i++;
    } else if (args[i] === '--help') {
      console.log(`Usage: bun run Transcribe.ts [options]

Options:
  --input FILE         Input audio file (default: stdin)
  --provider PROVIDER  whisperflow|openai|whisper-cpp (default: whisperflow)
  --help              Show this help

Environment:
  WHISPER_PROVIDER     Default provider
  OPENAI_API_KEY      Required for openai provider

Examples:
  bun run Transcribe.ts --input audio.wav
  bun run Record.ts | bun run Transcribe.ts --provider openai
`);
      process.exit(0);
    }
  }

  return opts;
}

async function transcribeWhisperFlow(audioFile: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('whisperflow', [audioFile], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';

    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.stderr.on('data', (data) => { error += data.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`WhisperFlow failed: ${error}`));
      } else {
        resolve(output.trim());
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`WhisperFlow not found: ${err.message}`));
    });
  });
}

async function transcribeOpenAI(audioFile: string, apiKey: string): Promise<string> {
  const FormData = require('form-data');
  const form = new FormData();
  form.append('file', readFileSync(audioFile), 'audio.wav');
  form.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      ...form.getHeaders(),
    },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data: any = await response.json();
  return data.text;
}

async function transcribeWhisperCpp(audioFile: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('whisper', ['--output-txt', '--output-file', '/tmp/whisper-out', audioFile], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('whisper.cpp failed'));
      } else {
        try {
          const text = readFileSync('/tmp/whisper-out.txt', 'utf-8');
          resolve(text.trim());
        } catch (err) {
          reject(err);
        }
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`whisper.cpp not found: ${err.message}`));
    });
  });
}

async function transcribe(opts: TranscribeOptions): Promise<string> {
  // Handle stdin if no input file
  let audioFile = opts.input;
  if (!audioFile || audioFile === '-') {
    const stdinData = await Bun.stdin.text();
    const tempFile = join(tmpdir(), `transcribe-${Date.now()}.wav`);

    // Handle base64 input from Record.ts
    const audioBuffer = Buffer.from(stdinData, 'base64');
    writeFileSync(tempFile, audioBuffer);
    audioFile = tempFile;
  }

  if (!existsSync(audioFile)) {
    throw new Error(`Audio file not found: ${audioFile}`);
  }

  console.error(`📝 Transcribing with ${opts.provider}...`);

  let text: string;

  switch (opts.provider) {
    case 'whisperflow':
      text = await transcribeWhisperFlow(audioFile);
      break;
    case 'openai':
      const apiKey = opts.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('OPENAI_API_KEY required');
      text = await transcribeOpenAI(audioFile, apiKey);
      break;
    case 'whisper-cpp':
      text = await transcribeWhisperCpp(audioFile);
      break;
    default:
      throw new Error(`Unknown provider: ${opts.provider}`);
  }

  if (!text || text.length === 0) {
    throw new Error('Empty transcription');
  }

  console.error(`✅ Transcribed: "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`);
  return text;
}

// Main
const opts = parseArgs();
transcribe(opts)
  .then((text) => {
    console.log(text);
  })
  .catch((err) => {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  });
