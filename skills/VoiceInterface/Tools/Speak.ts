#!/usr/bin/env bun
/**
 * Speak.ts - Text-to-speech playback
 * Does ONE thing: Converts text to speech and plays it
 *
 * Usage:
 *   bun run Speak.ts --text "hello world"
 *   echo "hello world" | bun run Speak.ts
 */

import { homedir } from 'os';
import { join } from 'path';

interface SpeakOptions {
  text?: string;
  voiceId?: string;
  voiceServer?: string;
}

function parseArgs(): SpeakOptions {
  const args = process.argv.slice(2);
  const opts: SpeakOptions = {
    voiceServer: process.env.VOICE_SERVER || 'http://localhost:8888',
    voiceId: process.env.ELEVENLABS_VOICE_ID,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--text' && args[i + 1]) {
      opts.text = args[i + 1];
      i++;
    } else if (args[i] === '--voice-id' && args[i + 1]) {
      opts.voiceId = args[i + 1];
      i++;
    } else if (args[i] === '--server' && args[i + 1]) {
      opts.voiceServer = args[i + 1];
      i++;
    } else if (args[i] === '--help') {
      console.log(`Usage: bun run Speak.ts [options]

Options:
  --text TEXT        Text to speak (default: stdin)
  --voice-id ID      ElevenLabs voice ID (default: from env)
  --server URL       Voice server URL (default: http://localhost:8888)
  --help            Show this help

Environment:
  VOICE_SERVER            Voice server URL
  ELEVENLABS_VOICE_ID    Default voice ID

Examples:
  bun run Speak.ts --text "Hello, world!"
  echo "Test message" | bun run Speak.ts
  bun run RemoteQuery.ts --text "hi" | bun run Speak.ts
`);
      process.exit(0);
    }
  }

  return opts;
}

async function speak(opts: SpeakOptions): Promise<void> {
  // Get text from stdin if not provided
  let text = opts.text;
  if (!text) {
    text = await Bun.stdin.text();
    text = text.trim();
  }

  if (!text) {
    throw new Error('No text provided');
  }

  console.error(`🔊 Speaking: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

  // Check if voice server is running
  try {
    const healthCheck = await fetch(`${opts.voiceServer}/health`);
    if (!healthCheck.ok) {
      throw new Error('Voice server not responding');
    }
  } catch (err) {
    throw new Error(`Voice server not reachable at ${opts.voiceServer}. Start with: ~/.claude/voice/manage.sh start`);
  }

  // Send to voice server
  const payload: any = {
    message: text,
    voice_enabled: true,
  };

  if (opts.voiceId) {
    payload.voice_id = opts.voiceId;
  }

  const response = await fetch(`${opts.voiceServer}/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`TTS failed: ${error}`);
  }

  const result: any = await response.json();

  if (result.status === 'played') {
    console.error(`✅ Playback complete`);
  } else {
    console.error(`⚠️  TTS status: ${result.status}`);
  }
}

// Main
const opts = parseArgs();
speak(opts)
  .catch((err) => {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  });
