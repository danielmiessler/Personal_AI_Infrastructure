#!/usr/bin/env bun
/**
 * PAIVoice - Personal AI Voice notification server using ElevenLabs TTS
 * Cross-platform support: macOS and Linux
 */

import { serve } from "bun";
import { spawn } from "child_process";
import { homedir, platform, tmpdir } from "os";
import { join } from "path";
import { existsSync, mkdirSync, readdirSync, statSync } from "fs";
import { writeFile, unlink, readFile, utimes } from "fs/promises";
import { createHash } from "crypto";

// Logging utilities with timestamps
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace('T', ' ').split('.')[0];
}

function log(...args: any[]): void {
  console.log(`[${getTimestamp()}]`, ...args);
}

function warn(...args: any[]): void {
  console.warn(`[${getTimestamp()}]`, ...args);
}

function error(...args: any[]): void {
  console.error(`[${getTimestamp()}]`, ...args);
}

function debug(...args: any[]): void {
  console.debug(`[${getTimestamp()}]`, ...args);
}

// Platform detection
const PLATFORM = platform() === 'darwin' ? 'macos' : 'linux';
log(`🖥️  Platform detected: ${PLATFORM}`);

// Load configuration from settings.json first, then .env
const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.claude');

// Cache directory for generated audio files
const CACHE_DIR = join(PAI_DIR, 'voice-server', 'cache');
// Cache TTL in days - configurable via environment variable
const CACHE_TTL_DAYS = parseInt(process.env.VOICE_CACHE_TTL_DAYS || '30');
const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

// Create cache directory if it doesn't exist
if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true });
  log(`📁 Created cache directory: ${CACHE_DIR}`);
}

// Clean up expired cache files on startup (async, don't block startup)
cleanupCache().catch(err => error('Initial cache cleanup failed:', err));

// Try to load PORT and DA_VOICE_ID from settings.json first
let PORT = 8888; // Default
let DA_VOICE_ID: string | null = null;
const settingsPath = join(PAI_DIR, 'settings.json');
if (existsSync(settingsPath)) {
  try {
    const settings = await Bun.file(settingsPath).json();
    if (settings.env?.VOICE_SERVER_PORT) {
      PORT = parseInt(settings.env.VOICE_SERVER_PORT);
      log(`📄 Using port from settings.json: ${PORT}`);
    }
    if (settings.env?.DA_VOICE_ID) {
      DA_VOICE_ID = settings.env.DA_VOICE_ID;
      log(`📄 Using DA voice ID from settings.json: ${DA_VOICE_ID}`);
    }
  } catch (err) {
    warn(`⚠️  Failed to parse settings.json: ${err}`);
  }
}

// Load .env file for all environment variables
const envPath = existsSync(join(PAI_DIR, '.env')) ? join(PAI_DIR, '.env') : join(homedir(), '.env');
if (existsSync(envPath)) {
  log(`📄 Loading environment from: ${envPath}`);
  const envContent = await Bun.file(envPath).text();
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && !key.startsWith('#')) {
      process.env[key.trim()] = value.trim();
    }
  });

  // Fall back to .env PORT if not set in settings.json
  if (PORT === 8888 && process.env.PORT) {
    PORT = parseInt(process.env.PORT);
    log(`📄 Using port from .env: ${PORT}`);
  }
}
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
  warn(`⚠️  ELEVENLABS_API_KEY not found`);
  warn('   Voice features will fall back to system TTS');
  warn(`   To enable ElevenLabs, add to ${PAI_DIR}/.env:`);
  warn('   ELEVENLABS_API_KEY=your_key_here');
}

// Default voice ID - priority: settings.json DA_VOICE_ID > .env ELEVENLABS_VOICE_ID > fallback
const DEFAULT_VOICE_ID = DA_VOICE_ID || process.env.ELEVENLABS_VOICE_ID || "cgSgspJ2msm6clMCkdW9";

// Default model - eleven_multilingual_v2 is the current recommended model
// See: https://elevenlabs.io/docs/models#models-overview
const DEFAULT_MODEL = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

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

// Validate ElevenLabs voice ID format
function validateVoiceId(voiceId: string): boolean {
  // ElevenLabs voice IDs are exactly 20 alphanumeric characters
  const voiceIdRegex = /^[A-Za-z0-9]{20}$/;
  return voiceIdRegex.test(voiceId);
}

// Generate cache key from message and voice ID
function getCacheKey(text: string, voiceId: string): string {
  const hash = createHash('sha256');
  hash.update(`${text}::${voiceId}`);
  return hash.digest('hex');
}

// Get cached audio file if it exists
async function getCachedAudio(text: string, voiceId: string): Promise<ArrayBuffer | null> {
  try {
    const cacheKey = getCacheKey(text, voiceId);
    const cachePath = join(CACHE_DIR, `${cacheKey}.mp3`);

    if (existsSync(cachePath)) {
      log(`💾 Cache HIT: Using cached audio for "${text.substring(0, 50)}..."`);
      const buffer = await readFile(cachePath);

      // Touch the file to update its modification time (marks it as recently used)
      await touchCacheFile(cachePath);

      return buffer.buffer;
    }

    log(`💾 Cache MISS: Generating new audio for "${text.substring(0, 50)}..."`);
    return null;
  } catch (err) {
    error('Cache read error:', err);
    return null;
  }
}

// Save audio to cache
async function saveCachedAudio(text: string, voiceId: string, audioBuffer: ArrayBuffer): Promise<void> {
  try {
    const cacheKey = getCacheKey(text, voiceId);
    const cachePath = join(CACHE_DIR, `${cacheKey}.mp3`);

    await writeFile(cachePath, Buffer.from(audioBuffer));
    log(`💾 Cached audio saved: ${cacheKey}.mp3`);
  } catch (err) {
    error('Cache write error:', err);
    // Don't fail if cache write fails - just log it
  }
}

// Update file access time (touch) to mark it as recently used
async function touchCacheFile(cachePath: string): Promise<void> {
  try {
    const now = new Date();
    await utimes(cachePath, now, now);
  } catch (error) {
    // Ignore touch errors - not critical
  }
}

// Clean up expired cache files
async function cleanupCache(): Promise<void> {
  try {
    const now = Date.now();
    const files = readdirSync(CACHE_DIR);
    let deletedCount = 0;
    let totalSize = 0;

    for (const file of files) {
      if (!file.endsWith('.mp3')) continue;

      const filePath = join(CACHE_DIR, file);
      try {
        const stats = statSync(filePath);
        const age = now - stats.mtimeMs;
        totalSize += stats.size;

        // Delete files older than TTL
        if (age > CACHE_TTL_MS) {
          await unlink(filePath);
          deletedCount++;
        }
      } catch (error) {
        // Skip files we can't stat or delete
        continue;
      }
    }

    const remainingFiles = files.length - deletedCount;
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);

    if (deletedCount > 0) {
      log(`🧹 Cache cleanup: Removed ${deletedCount} expired file(s)`);
    }
    log(`💾 Cache stats: ${remainingFiles} file(s), ~${sizeMB}MB, ${CACHE_TTL_DAYS} day TTL`);
  } catch (err) {
    error('Cache cleanup error:', err);
  }
}

// Generate speech using ElevenLabs API
async function generateSpeech(text: string, voiceId: string): Promise<ArrayBuffer> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key not configured');
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  log(`🌐 ElevenLabs API request to: ${url}`);

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

// Play audio using platform-specific player
async function playAudio(audioBuffer: ArrayBuffer): Promise<void> {
  const tempFile = join(tmpdir(), `voice-${Date.now()}.mp3`);

  // Write audio to temp file
  await writeFile(tempFile, Buffer.from(audioBuffer));

  try {
    if (PLATFORM === 'macos') {
      // macOS: use afplay
      await spawnSafe('/usr/bin/afplay', [tempFile]);
    } else {
      // Linux: try multiple audio players (MP3-capable players prioritized)
      const audioPlayers = ['mpg123', 'mplayer', 'ffplay', 'paplay', 'aplay'];
      let played = false;

      for (const player of audioPlayers) {
        try {
          await spawnSafe(player, [tempFile]);
          played = true;
          log(`✅ Audio played with ${player}`);
          break;
        } catch (err) {
          debug(`❌ ${player} not available or failed`);
          continue;
        }
      }

      if (!played) {
        throw new Error('No audio player found. Install: mpg123, mplayer, or ffplay');
      }
    }
  } finally {
    // Clean up temp file
    await unlink(tempFile).catch(() => {});
  }
}

// Spawn a process safely
function spawnSafe(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args);

    proc.on('error', (err) => {
      error(`Error spawning ${command}:`, err);
      reject(err);
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

// Fallback to system TTS when ElevenLabs is unavailable
async function fallbackTTS(message: string): Promise<void> {
  if (PLATFORM === 'macos') {
    await spawnSafe('/usr/bin/say', [message]);
  } else {
    // Linux: try multiple TTS engines
    const ttsOptions = [
      { cmd: 'espeak', args: [message] },
      { cmd: 'spd-say', args: [message] },
      { cmd: 'festival', args: ['--tts'], stdin: message }
    ];

    let spoken = false;
    for (const option of ttsOptions) {
      try {
        if (option.stdin) {
          // Festival needs text via stdin
          const proc = spawn(option.cmd, option.args);
          proc.stdin?.write(option.stdin);
          proc.stdin?.end();
          spoken = true;
          log(`✅ TTS with ${option.cmd}`);
          break;
        } else {
          await spawnSafe(option.cmd, option.args);
          spoken = true;
          log(`✅ TTS with ${option.cmd}`);
          break;
        }
      } catch (err) {
        debug(`❌ ${option.cmd} not available`);
        continue;
      }
    }

    if (!spoken) {
      warn('⚠️  No TTS engine found. Install: espeak-ng, speech-dispatcher, or festival');
    }
  }
}

// Send cross-platform notification with voice
async function sendNotification(
  title: string,
  message: string,
  voiceEnabled = true,
  voiceId: string | null = null
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

  // Generate and play voice
  if (voiceEnabled) {
    if (ELEVENLABS_API_KEY) {
      try {
        const voice = voiceId || DEFAULT_VOICE_ID;

        // Try to get cached audio first
        let audioBuffer = await getCachedAudio(safeMessage, voice);

        if (!audioBuffer) {
          // Cache miss - generate new audio with ElevenLabs
          log(`🎙️  Generating speech with ElevenLabs (voice: ${voice})`);
          audioBuffer = await generateSpeech(safeMessage, voice);

          // Save to cache for future use
          await saveCachedAudio(safeMessage, voice, audioBuffer);
        }

        await playAudio(audioBuffer);
      } catch (err) {
        error("⚠️  ElevenLabs failed, using system TTS:", err);
        try {
          await fallbackTTS(safeMessage);
        } catch (ttsError) {
          error("❌ System TTS also failed:", ttsError);
        }
      }
    } else {
      // No API key, use system TTS
      try {
        await fallbackTTS(safeMessage);
      } catch (err) {
        error("❌ System TTS failed:", err);
      }
    }
  }

  // Display platform-specific notification
  try {
    if (PLATFORM === 'macos') {
      const script = `display notification "${safeMessage}" with title "${safeTitle}" sound name ""`;
      await spawnSafe('/usr/bin/osascript', ['-e', script]);
    } else {
      // Linux: use notify-send
      try {
        await spawnSafe('notify-send', [safeTitle, safeMessage]);
      } catch (error) {
        // Fallback to zenity if notify-send not available
        try {
          await spawnSafe('zenity', ['--info', '--title', safeTitle, '--text', safeMessage]);
        } catch (zenityError) {
          // Final fallback: console output
          log(`📢 [NOTIFICATION] ${safeTitle}: ${safeMessage}`);
        }
      }
    }
  } catch (err) {
    error("❌ Notification display error:", err);
    // Always log to console as ultimate fallback
    log(`📢 [NOTIFICATION] ${safeTitle}: ${safeMessage}`);
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
        let voiceId = data.voice_id || data.voice_name || null; // Support both voice_id and voice_name

        // Validate voiceId if provided
        if (voiceId) {
          if (typeof voiceId !== 'string') {
            throw new Error('Invalid voice_id type');
          }

          if (!validateVoiceId(voiceId)) {
            warn(`⚠️  Invalid voice ID format: "${voiceId}" (must be 20 alphanumeric characters)`);
            warn(`   Falling back to DA_VOICE_ID from settings.json: ${DEFAULT_VOICE_ID}`);
            voiceId = null; // Reset to null so it falls back to DEFAULT_VOICE_ID
          }
        }

        log(`📨 Notification: "${title}" - "${message}" (voice: ${voiceEnabled}, voiceId: ${voiceId || DEFAULT_VOICE_ID})`);

        await sendNotification(title, message, voiceEnabled, voiceId);

        return new Response(
          JSON.stringify({ status: "success", message: "Notification sent" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
          }
        );
      } catch (err: any) {
        error("Notification error:", err);
        return new Response(
          JSON.stringify({ status: "error", message: err.message || "Internal server error" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: err.message?.includes('Invalid') ? 400 : 500
          }
        );
      }
    }

    if (url.pathname === "/pai" && req.method === "POST") {
      try {
        const data = await req.json();
        const title = data.title || "PAI Assistant";
        const message = data.message || "Task completed";

        log(`🤖 PAI notification: "${title}" - "${message}"`);

        await sendNotification(title, message, true, null);

        return new Response(
          JSON.stringify({ status: "success", message: "PAI notification sent" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
          }
        );
      } catch (err: any) {
        error("PAI notification error:", err);
        return new Response(
          JSON.stringify({ status: "error", message: err.message || "Internal server error" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: err.message?.includes('Invalid') ? 400 : 500
          }
        );
      }
    }

    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          port: PORT,
          voice_system: "ElevenLabs",
          model: DEFAULT_MODEL,
          default_voice_id: DEFAULT_VOICE_ID,
          api_key_configured: !!ELEVENLABS_API_KEY
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

log(`🚀 PAIVoice Server running on port ${PORT}`);
log(`🖥️  Platform: ${PLATFORM}`);
if (ELEVENLABS_API_KEY) {
  log(`🎙️  Using ElevenLabs TTS (model: ${DEFAULT_MODEL}, voice: ${DEFAULT_VOICE_ID})`);
  log(`💾 Audio caching: ENABLED at ${CACHE_DIR}`);
} else {
  log(`🎙️  Using system TTS (ElevenLabs API key not configured)`);
}
log(`📡 POST to http://localhost:${PORT}/notify`);
log(`🔒 Security: CORS restricted to localhost, rate limiting enabled`);
