#!/usr/bin/env bun
/**
 * PAIVoice - Personal AI Voice notification server
 * Supports both macOS native TTS (say) and ElevenLabs API
 */

import { serve } from "bun";
import { spawn } from "child_process";
import { homedir } from "os";
import { join, dirname } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";

// Get the directory where this script is located
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// TTS Provider: 'macos' (default) or 'elevenlabs'
const TTS_PROVIDER = (process.env.TTS_PROVIDER || "macos").toLowerCase();

// Default macOS voice - can be overridden in .env
const DEFAULT_MACOS_VOICE = process.env.MACOS_VOICE || "Ava (Premium)";
const DEFAULT_MACOS_RATE = parseInt(process.env.MACOS_RATE || "236");

// Load voices.json for voice mappings
interface VoiceConfig {
  voice_name: string;
  rate_multiplier: number;
  rate_wpm: number;
  description: string;
  type: string;
  elevenlabs_id?: string;
}

interface VoicesJson {
  default_rate: number;
  voices: Record<string, VoiceConfig>;
}

let voicesConfig: VoicesJson | null = null;
const voicesPath = join(__dirname, 'voices.json');
if (existsSync(voicesPath)) {
  try {
    voicesConfig = await Bun.file(voicesPath).json();
    console.log(`📋 Loaded ${Object.keys(voicesConfig?.voices || {}).length} voice configurations from voices.json`);
  } catch (error) {
    console.error('⚠️  Failed to load voices.json:', error);
  }
}

// Validate TTS provider configuration
if (TTS_PROVIDER === 'elevenlabs' && !ELEVENLABS_API_KEY) {
  console.error('⚠️  TTS_PROVIDER=elevenlabs but ELEVENLABS_API_KEY not found in ~/.env');
  console.error('Either set TTS_PROVIDER=macos or add: ELEVENLABS_API_KEY=your_key_here');
}

if (TTS_PROVIDER === 'macos') {
  console.log(`🍎 Using macOS native TTS with voice: ${DEFAULT_MACOS_VOICE}`);
} else {
  console.log(`🎙️  Using ElevenLabs TTS`);
}

// Default voice ID for ElevenLabs (Kai's voice)
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "s3TPKV1kjDlVtZbl4Ksh";

// Default model - eleven_multilingual_v2 is the current recommended model
// See: https://elevenlabs.io/docs/models#models-overview
const DEFAULT_MODEL = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

// Map agent names to macOS voices using voices.json
function getMacOSVoice(agentName: string | null): { voice: string; rate: number } {
  if (!agentName || !voicesConfig?.voices) {
    return { voice: DEFAULT_MACOS_VOICE, rate: DEFAULT_MACOS_RATE };
  }

  const normalizedName = agentName.toLowerCase().replace(/[^a-z]/g, '');
  const voiceEntry = voicesConfig.voices[normalizedName];

  if (voiceEntry) {
    return {
      voice: voiceEntry.voice_name,
      rate: voiceEntry.rate_wpm || DEFAULT_MACOS_RATE
    };
  }

  return { voice: DEFAULT_MACOS_VOICE, rate: DEFAULT_MACOS_RATE };
}

// Sanitize input for shell commands
function sanitizeForShell(input: string): string {
  return input.replace(/[^a-zA-Z0-9\s.,!?\-']/g, '').trim().substring(0, 500);
}

// Validate and sanitize user input
function validateInput(input: any): { valid: boolean; error?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Invalid input type' };
  }

  if (input.length > 500) {
    return { valid: false, error: 'Message too long (max 500 characters)' };
  }

  const dangerousPatterns = [
    /[;&|><`\$\(\)\{\}\[\]\\]/,
    /\.\.\//,
    /<script/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(input)) {
      return { valid: false, error: 'Invalid characters in input' };
    }
  }

  return { valid: true };
}

// Generate and play speech using macOS native 'say' command
async function speakWithMacOS(text: string, agentName: string | null = null): Promise<void> {
  const { voice, rate } = getMacOSVoice(agentName);

  return new Promise((resolve, reject) => {
    const args = ['-v', voice, '-r', rate.toString(), text];
    console.log(`🍎 Speaking with macOS: voice="${voice}", rate=${rate}`);

    const proc = spawn('/usr/bin/say', args);

    proc.on('error', (error) => {
      console.error('Error with macOS say:', error);
      reject(error);
    });

    proc.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`say command exited with code ${code}`));
      }
    });
  });
}

// Generate speech using ElevenLabs API
async function generateSpeech(text: string, voiceId: string): Promise<ArrayBuffer> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key not configured');
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text: text,
      model_id: DEFAULT_MODEL,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Check for model-related errors
    if (errorText.includes('model') || response.status === 422) {
      throw new Error(`ElevenLabs API error: Invalid model "${DEFAULT_MODEL}". Update ELEVENLABS_MODEL in ~/.env. See https://elevenlabs.io/docs/models`);
    }
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  return await response.arrayBuffer();
}

// Play audio using afplay (macOS)
async function playAudio(audioBuffer: ArrayBuffer): Promise<void> {
  const tempFile = `/tmp/voice-${Date.now()}.mp3`;

  // Write audio to temp file
  await Bun.write(tempFile, audioBuffer);

  return new Promise((resolve, reject) => {
    const proc = spawn('/usr/bin/afplay', [tempFile]);

    proc.on('error', (error) => {
      console.error('Error playing audio:', error);
      reject(error);
    });

    proc.on('exit', (code) => {
      // Clean up temp file
      spawn('/bin/rm', [tempFile]);

      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`afplay exited with code ${code}`));
      }
    });
  });
}

// Speak text using configured provider with automatic fallback
async function speakText(text: string, voiceIdOrAgent: string | null = null): Promise<void> {
  // Try primary provider first
  if (TTS_PROVIDER === 'macos') {
    try {
      await speakWithMacOS(text, voiceIdOrAgent);
      return;
    } catch (error) {
      console.error('⚠️  macOS TTS failed, trying ElevenLabs fallback:', error);
      // Fallback to ElevenLabs if available
      if (ELEVENLABS_API_KEY) {
        const voiceId = voiceIdOrAgent || DEFAULT_VOICE_ID;
        const audioBuffer = await generateSpeech(text, voiceId);
        await playAudio(audioBuffer);
        return;
      }
      throw error;
    }
  } else {
    // ElevenLabs primary
    try {
      const voiceId = voiceIdOrAgent || DEFAULT_VOICE_ID;
      const audioBuffer = await generateSpeech(text, voiceId);
      await playAudio(audioBuffer);
      return;
    } catch (error) {
      console.error('⚠️  ElevenLabs TTS failed, trying macOS fallback:', error);
      // Fallback to macOS
      try {
        await speakWithMacOS(text, voiceIdOrAgent);
        return;
      } catch (macError) {
        console.error('⚠️  macOS fallback also failed:', macError);
        throw error; // Throw original error
      }
    }
  }
}

// Spawn a process safely
function spawnSafe(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
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

// Send macOS notification with voice
async function sendNotification(
  title: string,
  message: string,
  voiceEnabled = true,
  voiceIdOrAgent: string | null = null
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

  // Sanitize inputs
  const safeTitle = sanitizeForShell(title);
  const safeMessage = sanitizeForShell(message);

  // Generate and play voice using configured provider (with fallback)
  if (voiceEnabled) {
    try {
      console.log(`🎙️  Speaking: "${safeMessage.substring(0, 50)}..." (provider: ${TTS_PROVIDER})`);
      await speakText(safeMessage, voiceIdOrAgent);
    } catch (error) {
      console.error("Failed to generate/play speech:", error);
    }
  }

  // Display macOS notification
  try {
    const script = `display notification "${safeMessage}" with title "${safeTitle}" sound name ""`;
    await spawnSafe('/usr/bin/osascript', ['-e', script]);
  } catch (error) {
    console.error("Notification display error:", error);
  }
}

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60000;

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

    const clientIp = req.headers.get('x-forwarded-for') || 'localhost';

    const corsHeaders = {
      "Access-Control-Allow-Origin": "http://localhost",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders, status: 204 });
    }

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
        const voiceId = data.voice_id || data.voice_name || null; // Support both voice_id and voice_name

        if (voiceId && typeof voiceId !== 'string') {
          throw new Error('Invalid voice_id');
        }

        console.log(`📨 Notification: "${title}" - "${message}" (voice: ${voiceEnabled}, voiceId: ${voiceId || DEFAULT_VOICE_ID})`);

        await sendNotification(title, message, voiceEnabled, voiceId);

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

        await sendNotification(title, message, true, null);

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

    // New endpoint for generating speech and returning audio bytes (for Java TTS app)
    if (url.pathname === "/generate-speech" && req.method === "POST") {
      try {
        const data = await req.json();
        const message = data.message || data.input || data.text;
        const voiceId = data.voice_id || data.voiceId || DEFAULT_VOICE_ID;

        if (!message || typeof message !== 'string') {
          return new Response(
            JSON.stringify({ status: "error", message: "Message is required" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400
            }
          );
        }

        // Allow longer text for this endpoint (up to 5000 chars)
        if (message.length > 5000) {
          return new Response(
            JSON.stringify({ status: "error", message: "Message too long (max 5000 characters)" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400
            }
          );
        }

        console.log(`🎵 Generate speech: ${message.substring(0, 50)}... (voice: ${voiceId})`);

        const audioBuffer = await generateSpeech(message, voiceId);

        return new Response(audioBuffer, {
          headers: {
            ...corsHeaders,
            "Content-Type": "audio/mpeg",
            "Content-Length": audioBuffer.byteLength.toString()
          },
          status: 200
        });
      } catch (error: any) {
        console.error("Generate speech error:", error);
        return new Response(
          JSON.stringify({ status: "error", message: error.message || "Speech generation failed" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500
          }
        );
      }
    }

    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          port: PORT,
          tts_provider: TTS_PROVIDER,
          macos_voice: DEFAULT_MACOS_VOICE,
          macos_rate: DEFAULT_MACOS_RATE,
          elevenlabs_model: DEFAULT_MODEL,
          elevenlabs_voice_id: DEFAULT_VOICE_ID,
          elevenlabs_configured: !!ELEVENLABS_API_KEY,
          voices_loaded: Object.keys(voicesConfig?.voices || {}).length,
          fallback_available: TTS_PROVIDER === 'macos' ? !!ELEVENLABS_API_KEY : true
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
console.log(`🎙️  TTS Provider: ${TTS_PROVIDER.toUpperCase()}`);
if (TTS_PROVIDER === 'macos') {
  console.log(`🍎 macOS Voice: ${DEFAULT_MACOS_VOICE} @ ${DEFAULT_MACOS_RATE} wpm`);
  console.log(`🔄 Fallback: ${ELEVENLABS_API_KEY ? 'ElevenLabs ✅' : 'None (no API key)'}`);
} else {
  console.log(`🎙️  ElevenLabs: model=${DEFAULT_MODEL}, voice=${DEFAULT_VOICE_ID}`);
  console.log(`🔄 Fallback: macOS native TTS`);
}
console.log(`📡 POST to http://localhost:${PORT}/notify`);
console.log(`🔒 Security: CORS restricted to localhost, rate limiting enabled`);
