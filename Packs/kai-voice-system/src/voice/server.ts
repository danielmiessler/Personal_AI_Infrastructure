#!/usr/bin/env bun
// $PAI_DIR/voice-server/server.ts
// Voice notification server with multi-provider TTS support
// Supports: Google Cloud TTS, ElevenLabs
// Platforms: macOS, Linux

import { serve } from "bun";
import { spawn, execSync } from "child_process";
import { homedir } from "os";
import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { parseArgs } from "util";

// Load .env from PAI directory (single source of truth for all API keys)
const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
const envPath = join(paiDir, '.env');
if (existsSync(envPath)) {
  const envContent = await Bun.file(envPath).text();
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && !key.startsWith('#')) {
      process.env[key.trim()] = value.trim();
    }
  });
}

// CLI argument parsing for extra player args and TTS provider
const cliArgs = parseArgs({
  args: process.argv.slice(2),
  options: {
    'extra-args': { type: 'string', default: '' },
    'tts-provider': { type: 'string', short: 't' },
    port: { type: 'string', short: 'p' },
  },
  allowPositionals: true,
});

// Port configuration: CLI --port/-p takes precedence over env var
const PORT = parseInt(cliArgs.values.port || process.env.PAI_VOICE_PORT || "8888");

// =============================================================================
// TTS Provider Configuration
// =============================================================================
// Options: "google" | "elevenlabs" (default: elevenlabs for backward compatibility)
// CLI --tts-provider/-t takes precedence over env var
const TTS_PROVIDER = (cliArgs.values['tts-provider'] || process.env.TTS_PROVIDER || 'elevenlabs').toLowerCase();

// ElevenLabs Configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const DEFAULT_ELEVENLABS_VOICE = process.env.ELEVENLABS_VOICE_ID || "s3TPKV1kjDlVtZbl4Ksh";

// Google Cloud TTS Configuration
// Free tier: 4M chars/month (Standard), 1M chars/month (WaveNet/Neural2)
// This is ~800x more than ElevenLabs' free tier
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_TTS_VOICE = process.env.GOOGLE_TTS_VOICE || "en-US-Neural2-J";

// Validate provider configuration
if (TTS_PROVIDER === 'elevenlabs' && !ELEVENLABS_API_KEY) {
  console.error(`⚠️  ELEVENLABS_API_KEY not found in ${envPath}`);
  console.error('Add: ELEVENLABS_API_KEY=your_key_here to $PAI_DIR/.env');
  console.error('Or switch to Google TTS: TTS_PROVIDER=google');
}

if (TTS_PROVIDER === 'google' && !GOOGLE_API_KEY) {
  console.error(`⚠️  GOOGLE_API_KEY not found in ${envPath}`);
  console.error('Add: GOOGLE_API_KEY=your_key_here to $PAI_DIR/.env');
  console.error('Note: Enable Cloud Text-to-Speech API in Google Cloud Console');
}

// Default voice based on provider
const DEFAULT_VOICE_ID = TTS_PROVIDER === 'google' ? GOOGLE_TTS_VOICE : DEFAULT_ELEVENLABS_VOICE;

// Voice configuration types
interface VoiceConfig {
  voice_id: string;
  voice_name: string;
  stability: number;
  similarity_boost: number;
  description: string;
}

interface VoicesConfig {
  default_volume?: number;
  voices: Record<string, VoiceConfig>;
}

// 13 Emotional Presets - Prosody System
const EMOTIONAL_PRESETS: Record<string, { stability: number; similarity_boost: number }> = {
  'excited': { stability: 0.7, similarity_boost: 0.9 },
  'celebration': { stability: 0.65, similarity_boost: 0.85 },
  'insight': { stability: 0.55, similarity_boost: 0.8 },
  'creative': { stability: 0.5, similarity_boost: 0.75 },
  'success': { stability: 0.6, similarity_boost: 0.8 },
  'progress': { stability: 0.55, similarity_boost: 0.75 },
  'investigating': { stability: 0.6, similarity_boost: 0.85 },
  'debugging': { stability: 0.55, similarity_boost: 0.8 },
  'learning': { stability: 0.5, similarity_boost: 0.75 },
  'pondering': { stability: 0.65, similarity_boost: 0.8 },
  'focused': { stability: 0.7, similarity_boost: 0.85 },
  'caution': { stability: 0.4, similarity_boost: 0.6 },
  'urgent': { stability: 0.3, similarity_boost: 0.9 },
};

// Load voice configuration
let voicesConfig: VoicesConfig | null = null;
try {
  const voicesPath = join(paiDir, 'config', 'voice-personalities.json');
  if (existsSync(voicesPath)) {
    const voicesContent = readFileSync(voicesPath, 'utf-8');
    voicesConfig = JSON.parse(voicesContent);
    console.log('✅ Loaded voice personalities from config');
  }
} catch (error) {
  console.warn('⚠️  Failed to load voice personalities, using defaults');
}

// Extract emotional marker from message
function extractEmotionalMarker(message: string): { cleaned: string; emotion?: string } {
  const emojiToEmotion: Record<string, string> = {
    '💥': 'excited', '🎉': 'celebration', '💡': 'insight', '🎨': 'creative',
    '✨': 'success', '📈': 'progress', '🔍': 'investigating', '🐛': 'debugging',
    '📚': 'learning', '🤔': 'pondering', '🎯': 'focused', '⚠️': 'caution', '🚨': 'urgent'
  };

  const emotionMatch = message.match(/\[(💥|🎉|💡|🎨|✨|📈|🔍|🐛|📚|🤔|🎯|⚠️|🚨)\s+(\w+)\]/);
  if (emotionMatch) {
    const emoji = emotionMatch[1];
    const emotionName = emotionMatch[2].toLowerCase();
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
  if (voicesConfig.voices[identifier]) return voicesConfig.voices[identifier];
  for (const config of Object.values(voicesConfig.voices)) {
    if (config.voice_id === identifier) return config;
  }
  return null;
}

// Sanitize input for TTS - allow natural speech, block dangerous characters
function sanitizeForSpeech(input: string): string {
  return input
    .replace(/<script/gi, '')
    .replace(/\.\.\//g, '')
    .replace(/[;&|><`$\\]/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .trim()
    .substring(0, 500);
}

// Validate input
function validateInput(input: any): { valid: boolean; error?: string; sanitized?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Invalid input type' };
  }
  if (input.length > 500) {
    return { valid: false, error: 'Message too long (max 500 characters)' };
  }
  const sanitized = sanitizeForSpeech(input);
  if (!sanitized || sanitized.length === 0) {
    return { valid: false, error: 'Message contains no valid content after sanitization' };
  }
  return { valid: true, sanitized };
}

// =============================================================================
// TTS Providers
// =============================================================================

// ElevenLabs TTS Generation
async function generateSpeechElevenLabs(
  text: string,
  voiceId: string,
  voiceSettings?: { stability: number; similarity_boost: number }
): Promise<ArrayBuffer> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key not configured');
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
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

// Google Cloud TTS Generation
// Free tier: 4M chars/month (Standard), 1M chars/month (WaveNet/Neural2)
async function generateSpeechGoogle(
  text: string,
  voice?: string
): Promise<ArrayBuffer> {
  if (!GOOGLE_API_KEY) {
    throw new Error('Google API key not configured. Add GOOGLE_API_KEY to your .env file.');
  }

  const voiceName = voice || GOOGLE_TTS_VOICE;
  // Extract language code from voice name (e.g., "en-US" from "en-US-Neural2-J")
  const languageCode = voiceName.split('-').slice(0, 2).join('-');

  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode,
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google TTS API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Google returns base64-encoded audio in the 'audioContent' field
  if (!data.audioContent) {
    throw new Error('Google TTS: No audio content in response');
  }

  // Decode base64 to ArrayBuffer
  const binaryString = atob(data.audioContent);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Unified speech generation - routes to the configured provider
async function generateSpeech(
  text: string,
  voiceId: string,
  voiceSettings?: { stability: number; similarity_boost: number }
): Promise<ArrayBuffer> {
  if (TTS_PROVIDER === 'google') {
    return generateSpeechGoogle(text, voiceId);
  } else {
    return generateSpeechElevenLabs(text, voiceId, voiceSettings);
  }
}

// Get volume setting from config (defaults to 0.8 = 80%)
function getVolumeSetting(): number {
  if (voicesConfig && typeof voicesConfig.default_volume === 'number') {
    const vol = voicesConfig.default_volume;
    if (vol >= 0 && vol <= 1) return vol;
  }
  return 0.8;
}

// Find audio player executable using 'which' command
function findPlayer(name: string): string | null {
  try {
    return execSync(`which ${name}`, { encoding: 'utf8' }).trim() || null;
  } catch {
    return null;
  }
}

// Get extra args from CLI or environment (CLI takes precedence)
function getExtraArgs(): string[] {
  const raw = cliArgs.values['extra-args'] || process.env.VOICE_SERVER_EXTRA_ARGS || '';
  return raw.trim() ? raw.trim().split(/\s+/) : [];
}

// Detect audio player once at startup
function detectPlayer(): { path: string | null; type: 'afplay' | 'mpg123' | 'mpv' | null } {
  if (process.platform === 'darwin') {
    return { path: '/usr/bin/afplay', type: 'afplay' };
  }
  const mpg123 = findPlayer('mpg123');
  if (mpg123) return { path: mpg123, type: 'mpg123' };
  const mpv = findPlayer('mpv');
  if (mpv) return { path: mpv, type: 'mpv' };
  return { path: null, type: null };
}
const DETECTED_PLAYER = detectPlayer();

// =============================================================================
// Cross-Platform Audio Playback
// =============================================================================

// Play audio - supports macOS (afplay) and Linux (mpg123, mpv)
async function playAudio(audioBuffer: ArrayBuffer): Promise<void> {
  const tempFile = `/tmp/voice-${Date.now()}.mp3`;
  await Bun.write(tempFile, audioBuffer);
  const volume = getVolumeSetting();

  return new Promise((resolve, reject) => {
    if (!DETECTED_PLAYER.path) {
      console.warn('⚠️  No audio player found. Install mpg123 or mpv for audio playback.');
      spawn('/bin/rm', [tempFile]);
      resolve();
      return;
    }

    const player = DETECTED_PLAYER.path;
    let args: string[];

    if (DETECTED_PLAYER.type === 'afplay') {
      args = ['-v', volume.toString(), ...getExtraArgs(), tempFile];
    } else if (DETECTED_PLAYER.type === 'mpg123') {
      args = ['-q', ...getExtraArgs(), tempFile];
    } else {
      // mpv
      args = ['--no-terminal', '--volume=' + (volume * 100), ...getExtraArgs(), tempFile];
    }

    const proc = spawn(player, args);

    proc.on('error', (error) => {
      console.error('Error playing audio:', error);
      spawn('/bin/rm', [tempFile]);
      reject(error);
    });

    proc.on('exit', (code) => {
      spawn('/bin/rm', [tempFile]); // Clean up temp file
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(new Error(`${player} exited with code ${code}`));
      }
    });
  });
}

// =============================================================================
// Cross-Platform Notifications
// =============================================================================

// Send notification with voice
async function sendNotification(
  title: string,
  message: string,
  voiceEnabled = true,
  voiceId: string | null = null
) {
  const titleValidation = validateInput(title);
  const messageValidation = validateInput(message);

  if (!titleValidation.valid) throw new Error(`Invalid title: ${titleValidation.error}`);
  if (!messageValidation.valid) throw new Error(`Invalid message: ${messageValidation.error}`);

  const safeTitle = titleValidation.sanitized!;
  let safeMessage = messageValidation.sanitized!;

  // Extract emotional marker if present
  const { cleaned, emotion } = extractEmotionalMarker(safeMessage);
  safeMessage = cleaned;

  // Generate and play voice
  const apiKeyConfigured = TTS_PROVIDER === 'google' ? GOOGLE_API_KEY : ELEVENLABS_API_KEY;
  if (voiceEnabled && apiKeyConfigured) {
    try {
      const voice = voiceId || DEFAULT_VOICE_ID;
      const voiceConfig = getVoiceConfig(voice);

      // Determine voice settings (priority: emotional > personality > defaults)
      let voiceSettings = { stability: 0.5, similarity_boost: 0.5 };

      if (emotion && EMOTIONAL_PRESETS[emotion]) {
        voiceSettings = EMOTIONAL_PRESETS[emotion];
        console.log(`🎭 Emotion: ${emotion}`);
      } else if (voiceConfig) {
        voiceSettings = {
          stability: voiceConfig.stability,
          similarity_boost: voiceConfig.similarity_boost
        };
        console.log(`👤 Personality: ${voiceConfig.description}`);
      }

      console.log(`🎙️  Generating speech (voice: ${voice}, stability: ${voiceSettings.stability})`);

      const audioBuffer = await generateSpeech(safeMessage, voice, voiceSettings);
      await playAudio(audioBuffer);
    } catch (error) {
      console.error("Failed to generate/play speech:", error);
    }
  }

  // Display desktop notification (platform-aware)
  try {
    if (process.platform === 'linux') {
      // Linux: use notify-send
      spawn('/usr/bin/notify-send', [safeTitle, safeMessage]);
    } else if (process.platform === 'darwin') {
      // macOS: use osascript
      const escapedTitle = safeTitle.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const escapedMessage = safeMessage.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const script = `display notification "${escapedMessage}" with title "${escapedTitle}" sound name ""`;
      spawn('/usr/bin/osascript', ['-e', script]);
    }
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

  if (record.count >= RATE_LIMIT) return false;
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
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
      );
    }

    // Main notification endpoint
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

        console.log(`📨 Notification: "${title}" - "${message.substring(0, 50)}..."`);

        await sendNotification(title, message, voiceEnabled, voiceId);

        return new Response(
          JSON.stringify({ status: "success", message: "Notification sent" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } catch (error: any) {
        console.error("Notification error:", error);
        return new Response(
          JSON.stringify({ status: "error", message: error.message || "Internal server error" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: error.message?.includes('Invalid') ? 400 : 500 }
        );
      }
    }

    // Health check endpoint
    if (url.pathname === "/health") {
      const providerInfo = TTS_PROVIDER === 'google'
        ? { name: 'Google Cloud TTS', configured: !!GOOGLE_API_KEY, voice: GOOGLE_TTS_VOICE }
        : { name: 'ElevenLabs', configured: !!ELEVENLABS_API_KEY, voice: DEFAULT_ELEVENLABS_VOICE };

      return new Response(
        JSON.stringify({
          status: "healthy",
          port: PORT,
          platform: process.platform,
          tts_provider: providerInfo.name,
          default_voice: providerInfo.voice,
          api_key_configured: providerInfo.configured,
          providers: {
            active: TTS_PROVIDER,
            google: { configured: !!GOOGLE_API_KEY, voice: GOOGLE_TTS_VOICE },
            elevenlabs: { configured: !!ELEVENLABS_API_KEY, voice: DEFAULT_ELEVENLABS_VOICE }
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    return new Response("PAI Voice Server - POST to /notify", {
      headers: corsHeaders,
      status: 200
    });
  },
});

// Startup logs
console.log(`🚀 Voice Server running on port ${PORT}`);
console.log(`🖥️  Platform: ${process.platform}`);
console.log(`🎙️  TTS Provider: ${TTS_PROVIDER === 'google' ? 'Google Cloud TTS' : 'ElevenLabs'}`);
console.log(`🗣️  Default voice: ${DEFAULT_VOICE_ID}`);
console.log(`📡 POST to http://localhost:${PORT}/notify`);
console.log(`🔒 Security: CORS restricted to localhost, rate limiting enabled`);
if (TTS_PROVIDER === 'google') {
  console.log(`🔑 Google API Key: ${GOOGLE_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`💰 Free tier: 4M chars/month (Standard), 1M chars/month (Neural2)`);
} else {
  console.log(`🔑 ElevenLabs API Key: ${ELEVENLABS_API_KEY ? '✅ Configured' : '❌ Missing'}`);
}
console.log(`💡 Switch providers: TTS_PROVIDER=google or TTS_PROVIDER=elevenlabs in .env`);

// Log audio player configuration
console.log(`🔊 Audio player: ${DETECTED_PLAYER.path || '❌ Not found (install mpg123 or mpv)'}`);
const extraArgs = getExtraArgs();
if (extraArgs.length > 0) {
  console.log(`🎛️  Extra player args: ${extraArgs.join(' ')}`);
}
