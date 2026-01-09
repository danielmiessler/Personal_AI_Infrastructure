#!/usr/bin/env bun
/**
 * PAI Voice Server - Text-to-Speech notification server using ElevenLabs
 *
 * Part of the pai-voice-system pack.
 *
 * Usage:
 *   bun run src/voice/server.ts
 *
 * Environment Variables:
 *   ELEVENLABS_API_KEY - Your ElevenLabs API key (required)
 *   ELEVENLABS_VOICE_ID - Default voice ID (optional)
 *   VOICE_SERVER_PORT - Server port (default: 8888)
 *   PAI_DIR - PAI installation directory (default: ~/.config/pai)
 *
 * Endpoints:
 *   POST /notify - Send TTS notification with optional voice/emotion
 *   POST /pai - Simple notification with default voice
 *   GET /health - Health check
 */

import { serve } from "bun";
import { spawn } from "child_process";
import { homedir, platform } from "os";
import { join } from "path";
import { existsSync, readFileSync } from "fs";

// Detect platform
const PLATFORM = platform();
const IS_MACOS = PLATFORM === 'darwin';
const IS_LINUX = PLATFORM === 'linux';

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

const PORT = parseInt(process.env.VOICE_SERVER_PORT || process.env.PORT || "8888");
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.config', 'pai');

if (!ELEVENLABS_API_KEY) {
  console.error('⚠️  ELEVENLABS_API_KEY not found in ~/.env');
  console.error('Add: ELEVENLABS_API_KEY=your_key_here');
}

// Default voice ID - configure via environment variable
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "";

if (!DEFAULT_VOICE_ID) {
  console.warn('⚠️  ELEVENLABS_VOICE_ID not set - voice requests will fail without explicit voice_id');
}

// Voice configuration types
interface VoiceConfig {
  voice_id: string;
  voice_name: string;
  stability: number;
  similarity_boost: number;
  description: string;
  type: string;
}

interface VoicesConfig {
  voices: Record<string, VoiceConfig>;
  default_volume?: number;
}

// Emotional markers for dynamic voice adjustment
interface EmotionalSettings {
  stability: number;
  similarity_boost: number;
}

// 13 Emotional Presets - Prosody System
// These markers can be embedded in messages: [💥 excited], [✨ success], etc.
// The server extracts them and adjusts voice parameters accordingly
const EMOTIONAL_PRESETS: Record<string, EmotionalSettings> = {
  // High Energy / Positive
  'excited': { stability: 0.7, similarity_boost: 0.9 },      // Energetic, expressive
  'celebration': { stability: 0.65, similarity_boost: 0.85 }, // Joyful, triumphant
  'insight': { stability: 0.55, similarity_boost: 0.8 },     // Illuminating, clarity
  'creative': { stability: 0.5, similarity_boost: 0.75 },    // Inspired, innovative

  // Success / Achievement
  'success': { stability: 0.6, similarity_boost: 0.8 },      // Confident, warm
  'progress': { stability: 0.55, similarity_boost: 0.75 },   // Steady, encouraging

  // Analysis / Investigation
  'investigating': { stability: 0.6, similarity_boost: 0.85 }, // Focused, analytical
  'debugging': { stability: 0.55, similarity_boost: 0.8 },   // Persistent, detective-like
  'learning': { stability: 0.5, similarity_boost: 0.75 },    // Curious, educational

  // Thoughtful / Careful
  'pondering': { stability: 0.65, similarity_boost: 0.8 },   // Thoughtful, measured
  'focused': { stability: 0.7, similarity_boost: 0.85 },     // Concentrated, determined
  'caution': { stability: 0.4, similarity_boost: 0.6 },      // Uncertain, careful

  // Urgent / Critical
  'urgent': { stability: 0.3, similarity_boost: 0.9 },       // Fast, intense
};

// Load voices configuration
let voicesConfig: VoicesConfig | null = null;
try {
  // Try PAI skill voice-personalities.md first (canonical source)
  const paiPersonalitiesPath = join(PAI_DIR, 'skills', 'CORE', 'voice-personalities.md');
  if (existsSync(paiPersonalitiesPath)) {
    const markdownContent = readFileSync(paiPersonalitiesPath, 'utf-8');
    // Extract JSON block from markdown
    const jsonMatch = markdownContent.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      voicesConfig = JSON.parse(jsonMatch[1]);
      console.log('✅ Loaded voice personalities from CORE/voice-personalities.md');
    }
  } else {
    // Fallback to local voices.json
    const voicesPath = join(import.meta.dir, '..', '..', 'voice-personalities.json');
    if (existsSync(voicesPath)) {
      const voicesContent = readFileSync(voicesPath, 'utf-8');
      voicesConfig = JSON.parse(voicesContent);
      console.log('✅ Loaded from voice-personalities.json');
    }
  }
} catch (error) {
  console.warn('⚠️  Failed to load voice personalities, using defaults');
}

// Escape special characters for AppleScript
function escapeForAppleScript(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// Extract emotional marker from message
// Supports all 13 prosody markers from the expanded system
function extractEmotionalMarker(message: string): { cleaned: string; emotion?: string } {
  // Map emoji to emotion name
  const emojiToEmotion: Record<string, string> = {
    '💥': 'excited',
    '🎉': 'celebration',
    '💡': 'insight',
    '🎨': 'creative',
    '✨': 'success',
    '📈': 'progress',
    '🔍': 'investigating',
    '🐛': 'debugging',
    '📚': 'learning',
    '🤔': 'pondering',
    '🎯': 'focused',
    '⚠️': 'caution',
    '🚨': 'urgent'
  };

  // Match pattern: [emoji emotion-name]
  // Examples: [💥 excited], [✨ success], [🎉 celebration]
  const emotionMatch = message.match(/\[(💥|🎉|💡|🎨|✨|📈|🔍|🐛|📚|🤔|🎯|⚠️|🚨)\s+(\w+)\]/);
  if (emotionMatch) {
    const emoji = emotionMatch[1];
    const emotionName = emotionMatch[2].toLowerCase();

    // Verify emoji matches emotion name
    if (emojiToEmotion[emoji] === emotionName) {
      return {
        cleaned: message.replace(emotionMatch[0], '').trim(),
        emotion: emotionName
      };
    }
  }

  return { cleaned: message };
}

// Get voice configuration by voice ID or agent name
function getVoiceConfig(identifier: string): VoiceConfig | null {
  if (!voicesConfig) return null;

  // Try direct agent name lookup
  if (voicesConfig.voices[identifier]) {
    return voicesConfig.voices[identifier];
  }

  // Try voice_id lookup
  for (const config of Object.values(voicesConfig.voices)) {
    if (config.voice_id === identifier) {
      return config;
    }
  }

  return null;
}

// Sanitize input for TTS and notifications - allow natural speech punctuation
function sanitizeForSpeech(input: string): string {
  // Allow: letters, numbers, spaces, common punctuation for natural speech
  // Block: shell metacharacters, path traversal, script tags, markdown
  const cleaned = input
    .replace(/<script/gi, '')  // Remove script tags
    .replace(/\.\.\//g, '')     // Remove path traversal
    .replace(/[;&|><`$\\]/g, '') // Remove shell metacharacters
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // Strip bold markdown: **text** → text
    .replace(/\*([^*]+)\*/g, '$1')       // Strip italic markdown: *text* → text
    .replace(/`([^`]+)`/g, '$1')         // Strip inline code: `text` → text
    .replace(/#{1,6}\s+/g, '')           // Strip markdown headers: ### → (empty)
    .trim()
    .substring(0, 500);

  return cleaned;
}

// Validate user input - check for obviously malicious content
function validateInput(input: any): { valid: boolean; error?: string; sanitized?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Invalid input type' };
  }

  if (input.length > 500) {
    return { valid: false, error: 'Message too long (max 500 characters)' };
  }

  // Sanitize and check if anything remains
  const sanitized = sanitizeForSpeech(input);

  if (!sanitized || sanitized.length === 0) {
    return { valid: false, error: 'Message contains no valid content after sanitization' };
  }

  return { valid: true, sanitized };
}

// Generate speech using ElevenLabs API
async function generateSpeech(
  text: string,
  voiceId: string,
  voiceSettings?: { stability: number; similarity_boost: number }
): Promise<ArrayBuffer> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key not configured');
  }

  if (!voiceId) {
    throw new Error('Voice ID not configured - set ELEVENLABS_VOICE_ID environment variable');
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  // Use provided settings or defaults
  const settings = voiceSettings || { stability: 0.5, similarity_boost: 0.5 };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: settings,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  return await response.arrayBuffer();
}

// Get volume setting from config (defaults to 1.0 = 100%)
function getVolumeSetting(): number {
  if (voicesConfig && 'default_volume' in voicesConfig) {
    const vol = voicesConfig.default_volume;
    if (typeof vol === 'number' && vol >= 0 && vol <= 1) {
      return vol;
    }
  }
  return 1.0; // Default to full volume
}

// Play audio using platform-specific audio player
async function playAudio(audioBuffer: ArrayBuffer): Promise<void> {
  const tempFile = `/tmp/voice-${Date.now()}.mp3`;

  // Write audio to temp file
  await Bun.write(tempFile, audioBuffer);

  const volume = getVolumeSetting();

  return new Promise((resolve, reject) => {
    let proc;

    if (IS_MACOS) {
      // macOS: Use afplay
      // afplay -v takes a value from 0.0 to 1.0
      proc = spawn('/usr/bin/afplay', ['-v', volume.toString(), tempFile]);
    } else if (IS_LINUX) {
      // Linux: Try ffplay first (most reliable), fallback to paplay
      // ffplay: -nodisp (no display), -autoexit (exit when done), -volume (0-100)
      const volumePercent = Math.round(volume * 100);
      proc = spawn('ffplay', ['-nodisp', '-autoexit', '-volume', volumePercent.toString(), tempFile]);
    } else {
      reject(new Error(`Unsupported platform: ${PLATFORM}`));
      return;
    }

    proc.on('error', (error) => {
      console.error('Error playing audio:', error);
      reject(error);
    });

    proc.on('exit', (code) => {
      // Clean up temp file
      spawn('rm', [tempFile]);

      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Audio player exited with code ${code}`));
      }
    });
  });
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
  voiceId: string | null = null
) {
  // Validate and sanitize inputs
  const titleValidation = validateInput(title);
  const messageValidation = validateInput(message);

  if (!titleValidation.valid) {
    throw new Error(`Invalid title: ${titleValidation.error}`);
  }

  if (!messageValidation.valid) {
    throw new Error(`Invalid message: ${messageValidation.error}`);
  }

  // Use pre-sanitized values from validation
  const safeTitle = titleValidation.sanitized!;
  let safeMessage = messageValidation.sanitized!;

  // Extract emotional marker if present
  const { cleaned, emotion } = extractEmotionalMarker(safeMessage);
  safeMessage = cleaned;

  // Generate and play voice using ElevenLabs
  if (voiceEnabled && ELEVENLABS_API_KEY) {
    try {
      const voice = voiceId || DEFAULT_VOICE_ID;

      // Get voice configuration (personality settings)
      const voiceConfig = getVoiceConfig(voice);

      // Determine voice settings (priority: emotional > personality > defaults)
      let voiceSettings = { stability: 0.5, similarity_boost: 0.5 };

      if (emotion && EMOTIONAL_PRESETS[emotion]) {
        // Emotional marker overrides personality
        voiceSettings = EMOTIONAL_PRESETS[emotion];
        console.log(`🎭 Emotion: ${emotion}`);
      } else if (voiceConfig) {
        // Use personality settings from voices config
        voiceSettings = {
          stability: voiceConfig.stability,
          similarity_boost: voiceConfig.similarity_boost
        };
        console.log(`👤 Personality: ${voiceConfig.description}`);
      }

      console.log(`🎙️  Generating speech (voice: ${voice}, stability: ${voiceSettings.stability}, boost: ${voiceSettings.similarity_boost})`);

      const audioBuffer = await generateSpeech(safeMessage, voice, voiceSettings);
      await playAudio(audioBuffer);
    } catch (error) {
      console.error("Failed to generate/play speech:", error);
    }
  }

  // Display platform-specific notification
  if (IS_MACOS) {
    // macOS: Use osascript for native notifications
    try {
      const escapedTitle = escapeForAppleScript(safeTitle);
      const escapedMessage = escapeForAppleScript(safeMessage);
      const script = `display notification "${escapedMessage}" with title "${escapedTitle}" sound name ""`;
      await spawnSafe('/usr/bin/osascript', ['-e', script]);
    } catch (error) {
      console.error("Notification display error:", error);
    }
  } else if (IS_LINUX) {
    // Linux: Use notify-send if available (optional, voice already played)
    try {
      await spawnSafe('notify-send', [safeTitle, safeMessage]).catch(() => {
        // notify-send is optional on Linux, don't log error if not installed
      });
    } catch (error) {
      // Silently ignore notification errors on Linux
    }
  }
}

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60000; // 1 minute

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

    // POST /notify - Full notification with voice/emotion support
    if (url.pathname === "/notify" && req.method === "POST") {
      try {
        const data = await req.json();
        const title = data.title || "PAI Notification";
        const message = data.message || "Task completed";
        const voiceEnabled = data.voice_enabled !== false;
        const voiceId = data.voice_id || data.voice_name || null;

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

    // POST /pai - Simple notification with default voice
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

    // GET /health - Health check
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          port: PORT,
          voice_system: "ElevenLabs",
          default_voice_id: DEFAULT_VOICE_ID || "(not configured)",
          api_key_configured: !!ELEVENLABS_API_KEY,
          pai_dir: PAI_DIR
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    return new Response("PAI Voice Server - POST to /notify or /pai", {
      headers: corsHeaders,
      status: 200
    });
  },
});

console.log(`🚀 PAI Voice Server running on port ${PORT}`);
console.log(`🎙️  Using ElevenLabs TTS`);
console.log(`🔊 Default voice: ${DEFAULT_VOICE_ID || '(not configured - set ELEVENLABS_VOICE_ID)'}`);
console.log(`📡 POST to http://localhost:${PORT}/notify`);
console.log(`🔒 Security: CORS restricted to localhost, rate limiting enabled`);
console.log(`🔑 API Key: ${ELEVENLABS_API_KEY ? '✅ Configured' : '❌ Missing'}`);
