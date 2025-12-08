#!/usr/bin/env bun
/**
 * PAIVoice - Personal AI Voice notification server for Linux/macOS with ElevenLabs + SpeechNote
 * Cross-platform voice notification system for PAI agent feedback
 */

import { serve } from "bun";
import { spawn } from "child_process";
import { writeFile, unlink, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { homedir, platform } from "os";
import { existsSync } from "fs";

// Detect platform
const IS_LINUX = platform() === 'linux';
const IS_MACOS = platform() === 'darwin';

// Load .env from user home directory
const envPath = join(homedir(), '.env');
if (existsSync(envPath)) {
  const envContent = await Bun.file(envPath).text();
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && !key.startsWith('#')) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const PORT = parseInt(process.env.PORT || "8888");
const SCRIPT_DIR = import.meta.dir;

// Load agent voice configuration
let agentVoices: any = {};
try {
  const agentVoicesPath = join(SCRIPT_DIR, 'agent-voices.json');
  if (existsSync(agentVoicesPath)) {
    const agentVoicesContent = await readFile(agentVoicesPath, 'utf-8');
    agentVoices = JSON.parse(agentVoicesContent);
  }
} catch (error) {
  console.error("⚠️  Warning: Could not load agent-voices.json");
}

// ElevenLabs configuration - MUST be set in ~/.env
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || process.env.DEFAULT_VOICE_ID || "jqcCZkN6Knx8BJ5TBdYR";
const ELEVENLABS_MODEL = process.env.ELEVENLABS_MODEL || agentVoices.default_config?.elevenlabs_model || "eleven_turbo_v2_5";

if (!ELEVENLABS_API_KEY) {
  console.error("⚠️  Warning: ELEVENLABS_API_KEY not found in ~/.env");
  if (IS_LINUX) {
    console.error("   Voice features will fall back to SpeechNote TTS");
  } else {
    console.error("   Voice features will fall back to system TTS");
  }
  console.error("   To enable ElevenLabs voices, add to ~/.env:");
  console.error("   ELEVENLABS_API_KEY=your_api_key_here");
}

// Sanitize input for shell commands
function sanitizeForShell(input: string): string {
  // Remove any characters that could be used for command injection
  // Allow only alphanumeric, spaces, and basic punctuation
  return input.replace(/[^a-zA-Z0-9\s.,!?\-']/g, '').trim().substring(0, 500);
}

// Validate and sanitize user input
function validateInput(input: any): { valid: boolean; error?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Invalid input type' };
  }

  // Limit message length
  if (input.length > 500) {
    return { valid: false, error: 'Message too long (max 500 characters)' };
  }

  // Check for potentially malicious patterns
  const dangerousPatterns = [
    /[;&|><`\$\(\)\{\}\[\]\\]/,  // Shell metacharacters
    /\.\.\//,  // Path traversal
    /<script/i,  // Script injection
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(input)) {
      return { valid: false, error: 'Invalid characters in input' };
    }
  }

  return { valid: true };
}

// Get voice configuration for agent
function getAgentVoiceConfig(agentType: string | null = null) {
  const agent = agentType || 'main';
  const config = agentVoices.agent_voices?.[agent] || agentVoices.agent_voices?.main;
  const defaults = agentVoices.default_config || {};

  return {
    elevenlabs_voice_id: config?.elevenlabs_voice_id || ELEVENLABS_VOICE_ID,
    speechnote_voice: config?.speechnote_voice || defaults.speechnote_fallback_voice || "en_piper_us_lessac_medium",
    voice_enabled: config?.voice_enabled !== false
  };
}

// Generate voice using SpeechNote TTS (Linux fallback)
async function generateVoiceWithSpeechNote(text: string, voiceModel: string): Promise<boolean> {
  if (!IS_LINUX) {
    return false;
  }

  try {
    console.log(`🎙️ Using SpeechNote TTS with voice: ${voiceModel}`);
    const proc = spawn('flatpak', [
      'run', 'net.mkiol.SpeechNote',
      '--action', 'start-reading-text',
      '--text', text,
      '--id', voiceModel
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    return new Promise((resolve, reject) => {
      proc.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          console.error(`SpeechNote TTS exited with code ${code}`);
          resolve(false);
        }
      });

      proc.on('error', (error) => {
        console.error("SpeechNote TTS error:", error);
        resolve(false);
      });

      // Add timeout to prevent hanging
      setTimeout(() => {
        proc.kill();
        resolve(false);
      }, 10000); // 10 second timeout
    });
  } catch (error) {
    console.error("SpeechNote TTS spawn error:", error);
    return false;
  }
}

// Generate voice using ElevenLabs
async function generateVoice(text: string, voiceId: string | null = null): Promise<string | null> {
  // If no API key, return null to trigger fallback
  if (!ELEVENLABS_API_KEY) {
    return null;
  }

  const voiceToUse = voiceId || ELEVENLABS_VOICE_ID;
  const voiceSettings = agentVoices.default_config?.voice_settings || {
    stability: 0.75,
    similarity_boost: 0.75,
    style: 0.5,
    use_speaker_boost: true
  };

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceToUse}`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text,
          model_id: ELEVENLABS_MODEL,
          voice_settings: voiceSettings
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      return null;
    }

    const audioBuffer = await response.arrayBuffer();
    const tempFile = join(tmpdir(), `paivoice-${Date.now()}.mp3`);
    await writeFile(tempFile, Buffer.from(audioBuffer));

    return tempFile;
  } catch (error) {
    console.error("ElevenLabs error:", error);
    return null;
  }
}

// Find paplay executable on Linux
function findPaplay(): string {
  const paplayPaths = [
    '/usr/bin/paplay',
    '/usr/local/bin/paplay',
    '/bin/paplay'
  ];

  for (const path of paplayPaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // Fallback to just 'paplay' and let the system find it
  return 'paplay';
}

// Spawn a process safely
function spawnSafe(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use the correct audio player path based on platform
    if (command === 'paplay' && IS_LINUX) {
      command = findPaplay();
    } else if (command === 'afplay' && IS_MACOS) {
      command = '/usr/bin/afplay';
    }

    const proc = spawn(command, args);

    proc.on('error', (error) => {
      console.error(`Error spawning ${command}:`, error);
      reject(error);
    });

    proc.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

// Play audio file based on platform
async function playAudioFile(audioFile: string): Promise<void> {
  if (IS_LINUX) {
    // Use paplay for Linux audio playback
    await spawnSafe('paplay', [audioFile]);
  } else if (IS_MACOS) {
    // Use afplay for macOS audio playback
    await spawnSafe('afplay', [audioFile]);
  } else {
    throw new Error('Unsupported platform for audio playback');
  }
}

// Send notification with voice based on platform
async function sendNotification(
  title: string,
  message: string,
  voiceEnabled = true,
  voiceId: string | null = null,
  agentType: string | null = null
) {
  // Validate inputs
  const titleValidation = validateInput(title);
  const messageValidation = validateInput(message);

  if (!titleValidation.valid) {
    throw new Error(`Invalid title: ${titleValidation.error}`);
  }

  if (!messageValidation.valid) {
    throw new Error(`Invalid message: ${messageValidation.error}`);
  }

  // Sanitize inputs for shell commands
  const safeTitle = sanitizeForShell(title);
  const safeMessage = sanitizeForShell(message);

  if (voiceEnabled) {
    // Get agent-specific voice configuration
    const voiceConfig = getAgentVoiceConfig(agentType);
    const useVoiceId = voiceId || voiceConfig.elevenlabs_voice_id;

    console.log(`🎭 Agent: ${agentType || 'main'}, ElevenLabs: ${useVoiceId}, SpeechNote: ${voiceConfig.speechnote_voice}`);

    // Try ElevenLabs first
    const audioFile = await generateVoice(safeMessage, useVoiceId);

    if (audioFile) {
      try {
        await playAudioFile(audioFile);
        await unlink(audioFile).catch(() => {});
      } catch (error) {
        console.error("Failed to play ElevenLabs audio:", error);
        // Fallback to platform-specific TTS
        if (IS_LINUX) {
          try {
            const speechNoteSuccess = await generateVoiceWithSpeechNote(safeMessage, voiceConfig.speechnote_voice);
            if (!speechNoteSuccess) {
              console.error("SpeechNote TTS also failed, trying paplay fallback");
              // Final fallback: try playing audio with paplay if we have an audio file
            }
          } catch (e) {
            console.error("Failed to speak message with SpeechNote:", e);
          }
        } else if (IS_MACOS) {
          // Fallback to macOS say command
          try {
            await spawnSafe('/usr/bin/say', [safeMessage]);
          } catch (e) {
            console.error("Failed to speak message with macOS say:", e);
          }
        }
      }
    } else {
      // Use platform-specific TTS as primary fallback
      if (IS_LINUX) {
        try {
          const speechNoteSuccess = await generateVoiceWithSpeechNote(safeMessage, voiceConfig.speechnote_voice);
          if (!speechNoteSuccess) {
            console.error("SpeechNote TTS fallback failed");
          }
        } catch (error) {
          console.error("SpeechNote TTS error:", error);
        }
      } else if (IS_MACOS) {
        try {
          await spawnSafe('/usr/bin/say', [safeMessage]);
        } catch (error) {
          console.error("macOS say error:", error);
        }
      }
    }
  }

  // Send platform-specific notification
  try {
    if (IS_LINUX) {
      // Use notify-send for Linux notifications
      await spawnSafe('notify-send', [safeTitle, safeMessage, '--app-name=PAI Voice Server']);
    } else if (IS_MACOS) {
      // Use osascript for macOS notifications
      const script = `display notification "${safeMessage}" with title "${safeTitle}" sound name ""`;
      await spawnSafe('/usr/bin/osascript', ['-e', script]);
    }
  } catch (error) {
    console.error("Notification display error:", error);
    // Fallback to console notification
    console.log(`📢 ${safeTitle}: ${safeMessage}`);
  }
}

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // 10 requests per minute
const RATE_WINDOW = 60000; // 1 minute in milliseconds

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

// Start HTTP server
const server = serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Get client IP for rate limiting (localhost only)
    const clientIp = req.headers.get('x-forwarded-for') || 'localhost';

    // Restrict CORS to localhost only for security
    const corsHeaders = {
      "Access-Control-Allow-Origin": "http://localhost",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders, status: 204 });
    }

    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({ status: "error", message: "Rate limit exceeded" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 429
        }
      );
    }

    if (url.pathname === "/notify" && req.method === "POST") {
      try {
        const data = await req.json();
        const title = data.title || "PAI Notification";
        const message = data.message || "Task completed";
        const voiceEnabled = data.voice_enabled !== false;
        const voiceId = data.voice_id || data.voice_name || null;
        const agentType = data.agent_type || null;

        // Validate voice ID if provided
        if (voiceId && typeof voiceId !== 'string') {
          throw new Error('Invalid voice_id');
        }

        console.log(`📨 Received notification: "${title}" - "${message}" (voice: ${voiceEnabled}, voiceId: ${voiceId}, agent: ${agentType})`);

        await sendNotification(title, message, voiceEnabled, voiceId, agentType);

        return new Response(
          JSON.stringify({ status: "success", message: "Notification sent" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
          }
        );
      } catch (error: any) {
        console.error("Notification error:", error);
        return new Response(
          JSON.stringify({ status: "error", message: error.message || "Internal server error" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: error.message?.includes('Invalid') ? 400 : 500
          }
        );
      }
    }

    if (url.pathname === "/pai" && req.method === "POST") {
      try {
        const data = await req.json();
        const title = data.title || "PAI Assistant";
        const message = data.message || "Task completed";

        console.log(`🤖 PAI notification: "${title}" - "${message}"`);

        await sendNotification(title, message, true, null, 'main');

        return new Response(
          JSON.stringify({ status: "success", message: "PAI notification sent" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
          }
        );
      } catch (error: any) {
        console.error("PAI notification error:", error);
        return new Response(
          JSON.stringify({ status: "error", message: error.message || "Internal server error" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: error.message?.includes('Invalid') ? 400 : 500
          }
        );
      }
    }

    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          port: PORT,
          platform: platform(),
          voice_system: ELEVENLABS_API_KEY ? "ElevenLabs" : (IS_LINUX ? "SpeechNote" : "System TTS"),
          model: ELEVENLABS_MODEL,
          default_voice_id: ELEVENLABS_VOICE_ID,
          api_key_configured: !!ELEVENLABS_API_KEY,
          agents_configured: Object.keys(agentVoices.agent_voices || {}).length
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    return new Response("PAIVoice Server - POST to /notify or /pai", {
      headers: corsHeaders,
      status: 200
    });
  },
});

console.log(`🚀 PAIVoice Server running on port ${PORT}`);
console.log(`🖥️  Platform: ${IS_LINUX ? 'Linux' : IS_MACOS ? 'macOS' : 'Unknown'}`);
if (ELEVENLABS_API_KEY) {
  console.log(`🎙️  Primary TTS: ElevenLabs (${Object.keys(agentVoices.agent_voices || {}).length} agent voices configured)`);
  console.log(`🎙️  Model: ${ELEVENLABS_MODEL}`);
  console.log(`🎙️  Fallback TTS: ${IS_LINUX ? 'SpeechNote → paplay' : 'System TTS'} with agent-specific voices`);
} else {
  console.log(`🎙️  TTS: ${IS_LINUX ? 'SpeechNote' : 'System TTS'} only (no ElevenLabs API key - add to ~/.env for premium voices)`);
}
console.log(`📡 POST to http://localhost:${PORT}/notify`);
console.log(`🎭 Agent types: ${Object.keys(agentVoices.agent_voices || {}).join(', ') || 'loading...'}`);
console.log(`🔒 Security: CORS restricted to localhost, rate limiting enabled`);
