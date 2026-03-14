#!/usr/bin/env bun
/**
 * Voice Server (Linux) - PAI Voice notification server using Piper TTS
 *
 * Drop-in replacement for the ElevenLabs-based macOS server.
 * Same API endpoints, same JSON body format, zero ongoing cost.
 *
 * TTS: Piper (local ONNX neural TTS)
 * Audio: aplay (ALSA) with paplay/ffplay fallback
 * Notifications: notify-send (libnotify)
 *
 * Config resolution:
 *   1. PIPER_MODEL env var or settings.json piper.model path
 *   2. Default: ~/.local/share/piper-tts/voices/en_US-amy-medium.onnx
 */

import { serve } from "bun";
import { spawn, execSync } from "child_process";
import { homedir } from "os";
import { join } from "path";
import { existsSync, readFileSync } from "fs";

// Load .env from user home directory
const envPath = join(homedir(), '.env');
if (existsSync(envPath)) {
  const envContent = await Bun.file(envPath).text();
  envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    const value = rest.join('=');
    if (key && value && !key.startsWith('#')) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const PORT = parseInt(process.env.PORT || "8888");

// ==========================================================================
// Piper TTS Configuration
// ==========================================================================

const PIPER_VENV = join(homedir(), '.local/share/piper-tts/venv');
const PIPER_BIN = join(PIPER_VENV, 'bin/piper');
const PIPER_VOICES_DIR = join(homedir(), '.local/share/piper-tts/voices');
const DEFAULT_MODEL = process.env.PIPER_MODEL || join(PIPER_VOICES_DIR, 'en_US-amy-medium.onnx');

// Detect available audio player
function detectAudioPlayer(): { command: string; args: (file: string, volume: number) => string[] } {
  try {
    execSync('which aplay', { stdio: 'ignore' });
    return {
      command: 'aplay',
      args: (file: string, _volume: number) => ['-q', file],
    };
  } catch {}

  try {
    execSync('which paplay', { stdio: 'ignore' });
    return {
      command: 'paplay',
      args: (file: string, volume: number) => {
        // paplay volume is 0-65536, scale from 0.0-1.0
        const vol = Math.round(volume * 65536);
        return [`--volume=${vol}`, file];
      },
    };
  } catch {}

  try {
    execSync('which gst-play-1.0', { stdio: 'ignore' });
    return {
      command: 'gst-play-1.0',
      args: (file: string, volume: number) => ['--volume', volume.toString(), file],
    };
  } catch {}

  try {
    execSync('which ffplay', { stdio: 'ignore' });
    return {
      command: 'ffplay',
      args: (file: string, volume: number) => ['-nodisp', '-autoexit', '-volume', String(Math.round(volume * 100)), file],
    };
  } catch {}

  // Last resort: espeak for TTS fallback (no audio player needed)
  console.warn('No audio player found (aplay, paplay, ffplay). Audio playback will fail.');
  return {
    command: 'aplay',
    args: (file: string, _volume: number) => ['-q', file],
  };
}

const audioPlayer = detectAudioPlayer();
console.log(`Audio player: ${audioPlayer.command}`);

// Validate Piper installation
if (!existsSync(PIPER_BIN)) {
  console.error(`Piper not found at ${PIPER_BIN}`);
  console.error('Install: python3 -m venv ~/.local/share/piper-tts/venv && ~/.local/share/piper-tts/venv/bin/pip install piper-tts');
  process.exit(1);
}

if (!existsSync(DEFAULT_MODEL)) {
  console.error(`Piper model not found at ${DEFAULT_MODEL}`);
  console.error('Download a model from https://huggingface.co/rhasspy/piper-voices');
  process.exit(1);
}

// ==========================================================================
// Pronunciation System (preserved from original server)
// ==========================================================================

interface PronunciationEntry {
  term: string;
  phonetic: string;
  note?: string;
}

interface PronunciationConfig {
  replacements: PronunciationEntry[];
}

interface CompiledRule {
  regex: RegExp;
  phonetic: string;
}

let pronunciationRules: CompiledRule[] = [];

function loadPronunciations(): void {
  const pronPath = join(import.meta.dir, 'pronunciations.json');
  try {
    if (!existsSync(pronPath)) {
      console.warn('No pronunciations.json found — TTS will use default pronunciations');
      return;
    }
    const content = readFileSync(pronPath, 'utf-8');
    const config: PronunciationConfig = JSON.parse(content);

    pronunciationRules = config.replacements.map(entry => ({
      regex: new RegExp(`\\b${escapeRegex(entry.term)}\\b`, 'g'),
      phonetic: entry.phonetic,
    }));

    console.log(`Loaded ${pronunciationRules.length} pronunciation rules`);
  } catch (error) {
    console.error('Failed to load pronunciations.json:', error);
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyPronunciations(text: string): string {
  let result = text;
  for (const rule of pronunciationRules) {
    result = result.replace(rule.regex, rule.phonetic);
  }
  return result;
}

loadPronunciations();

// ==========================================================================
// Voice Configuration from settings.json (subset relevant to Piper)
// ==========================================================================

interface VoiceEntry {
  voiceId: string;
  voiceName?: string;
  piperModel?: string;  // Optional per-voice Piper model override
  volume: number;
  speed: number;
}

interface LoadedVoiceConfig {
  voices: Record<string, VoiceEntry>;
  desktopNotifications: boolean;
  defaultSpeed: number;
  defaultVolume: number;
}

function loadVoiceConfig(): LoadedVoiceConfig {
  const settingsPath = join(homedir(), '.claude', 'settings.json');

  try {
    if (!existsSync(settingsPath)) {
      console.warn('settings.json not found — using defaults');
      return { voices: {}, desktopNotifications: true, defaultSpeed: 1.0, defaultVolume: 1.0 };
    }

    const content = readFileSync(settingsPath, 'utf-8');
    const settings = JSON.parse(content);
    const daidentity = settings.daidentity || {};
    const voicesSection = daidentity.voices || {};
    const desktopNotifications = settings.notifications?.desktop?.enabled !== false;
    const piperConfig = settings.piper || {};

    const voices: Record<string, VoiceEntry> = {};

    for (const [name, config] of Object.entries(voicesSection)) {
      const entry = config as any;
      if (entry.voiceId) {
        voices[name] = {
          voiceId: entry.voiceId,
          voiceName: entry.voiceName,
          piperModel: entry.piperModel,
          volume: entry.volume ?? 1.0,
          speed: entry.speed ?? 1.0,
        };
      }
    }

    const voiceNames = Object.keys(voices);
    if (voiceNames.length > 0) {
      console.log(`Loaded ${voiceNames.length} voice config(s): ${voiceNames.join(', ')}`);
    }

    return {
      voices,
      desktopNotifications,
      defaultSpeed: piperConfig.speed ?? 1.0,
      defaultVolume: piperConfig.volume ?? 1.0,
    };
  } catch (error) {
    console.error('Failed to load settings.json:', error);
    return { voices: {}, desktopNotifications: true, defaultSpeed: 1.0, defaultVolume: 1.0 };
  }
}

const voiceConfig = loadVoiceConfig();

// ==========================================================================
// Sanitization & Validation (preserved from original)
// ==========================================================================

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

// Strip emotional markers (preserved from original — Piper doesn't use them but we clean the text)
function extractEmotionalMarker(message: string): { cleaned: string; emotion?: string } {
  const emotionMatch = message.match(/\[[\u{1F300}-\u{1F9FF}]\s+(\w+)\]/u);
  if (emotionMatch) {
    return {
      cleaned: message.replace(emotionMatch[0], '').trim(),
      emotion: emotionMatch[1]?.toLowerCase(),
    };
  }
  return { cleaned: message };
}

// ==========================================================================
// Piper TTS: Generate speech locally
// ==========================================================================

async function generateSpeech(text: string, speed: number = 1.0): Promise<string> {
  const pronouncedText = applyPronunciations(text);
  if (pronouncedText !== text) {
    console.log(`Pronunciation: "${text}" -> "${pronouncedText}"`);
  }

  const outFile = `/tmp/voice-${Date.now()}.wav`;

  // Piper length_scale: <1 = faster, >1 = slower (inverse of "speed")
  const lengthScale = speed > 0 ? (1.0 / speed) : 1.0;

  return new Promise((resolve, reject) => {
    const proc = spawn(PIPER_BIN, [
      '--model', DEFAULT_MODEL,
      '--output_file', outFile,
      '--length_scale', lengthScale.toFixed(2),
    ]);

    proc.stdin.write(pronouncedText);
    proc.stdin.end();

    let stderr = '';
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('error', (error) => {
      reject(new Error(`Piper failed to start: ${error.message}`));
    });

    proc.on('exit', (code) => {
      if (code === 0 && existsSync(outFile)) {
        resolve(outFile);
      } else {
        reject(new Error(`Piper exited with code ${code}: ${stderr}`));
      }
    });
  });
}

// Play a WAV file using the detected audio player
async function playAudio(wavFile: string, volume: number = 1.0): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = audioPlayer.args(wavFile, volume);
    const proc = spawn(audioPlayer.command, args);

    proc.on('error', (error) => {
      console.error('Error playing audio:', error);
      reject(error);
    });

    proc.on('exit', (code) => {
      // Clean up temp file
      try { spawn('/bin/rm', ['-f', wavFile]); } catch {}
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${audioPlayer.command} exited with code ${code}`));
      }
    });
  });
}

// ==========================================================================
// Core: Send notification with voice
// ==========================================================================

async function sendNotification(
  title: string,
  message: string,
  voiceEnabled = true,
  _voiceId: string | null = null,
  _callerVoiceSettings?: any,
  callerVolume?: number | null,
): Promise<{ voicePlayed: boolean; voiceError?: string }> {
  const titleValidation = validateInput(title);
  const messageValidation = validateInput(message);

  if (!titleValidation.valid) throw new Error(`Invalid title: ${titleValidation.error}`);
  if (!messageValidation.valid) throw new Error(`Invalid message: ${messageValidation.error}`);

  const safeTitle = titleValidation.sanitized!;
  let safeMessage = messageValidation.sanitized!;

  const { cleaned } = extractEmotionalMarker(safeMessage);
  safeMessage = cleaned;

  // Display desktop notification first (non-blocking, immediate visual feedback)
  if (voiceConfig.desktopNotifications) {
    try {
      spawn('notify-send', [
        '--app-name=PAI',
        '--expire-time=5000',
        safeTitle,
        safeMessage,
      ]);
    } catch (error) {
      console.error("Notification display error:", error);
    }
  }

  // Generate and play voice using Piper (blocking, waits for audio to finish)
  let voicePlayed = false;
  let voiceError: string | undefined;

  if (voiceEnabled) {
    try {
      const speed = voiceConfig.defaultSpeed;
      const volume = callerVolume ?? voiceConfig.defaultVolume;

      console.log(`Generating speech (piper, speed: ${speed}, volume: ${volume})`);

      const wavFile = await generateSpeech(safeMessage, speed);
      await playAudio(wavFile, volume);
      voicePlayed = true;
    } catch (error: any) {
      console.error("Failed to generate/play speech:", error);
      voiceError = error.message || "TTS generation failed";
    }
  }

  return { voicePlayed, voiceError };
}

// ==========================================================================
// Rate Limiting
// ==========================================================================

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

// ==========================================================================
// HTTP Server
// ==========================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const server = serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const clientIp = req.headers.get('x-forwarded-for') || 'localhost';

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders, status: 204 });
    }

    if (!checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({ status: "error", message: "Rate limit exceeded" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
      );
    }

    // POST /notify — main endpoint
    if (url.pathname === "/notify" && req.method === "POST") {
      try {
        const data = await req.json();
        const title = data.title || "PAI Notification";
        const message = data.message || "Task completed";
        const voiceEnabled = data.voice_enabled !== false;
        const voiceId = data.voice_id || null;
        const voiceSettings = data.voice_settings || null;
        const volume = data.volume ?? null;

        console.log(`Notification: "${title}" - "${message}"`);

        const result = await sendNotification(title, message, voiceEnabled, voiceId, voiceSettings, volume);

        if (voiceEnabled && !result.voicePlayed && result.voiceError) {
          return new Response(
            JSON.stringify({ status: "error", message: `TTS failed: ${result.voiceError}`, notification_sent: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 }
          );
        }

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

    // POST /notify/personality — compatibility shim
    if (url.pathname === "/notify/personality" && req.method === "POST") {
      try {
        const data = await req.json();
        const message = data.message || "Notification";

        console.log(`Personality notification: "${message}"`);
        await sendNotification("PAI Notification", message, true, null);

        return new Response(
          JSON.stringify({ status: "success", message: "Personality notification sent" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } catch (error: any) {
        console.error("Personality notification error:", error);
        return new Response(
          JSON.stringify({ status: "error", message: error.message || "Internal server error" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: error.message?.includes('Invalid') ? 400 : 500 }
        );
      }
    }

    // POST /pai
    if (url.pathname === "/pai" && req.method === "POST") {
      try {
        const data = await req.json();
        const title = data.title || "PAI Assistant";
        const message = data.message || "Task completed";

        console.log(`PAI notification: "${title}" - "${message}"`);
        await sendNotification(title, message, true, null);

        return new Response(
          JSON.stringify({ status: "success", message: "PAI notification sent" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } catch (error: any) {
        console.error("PAI notification error:", error);
        return new Response(
          JSON.stringify({ status: "error", message: error.message || "Internal server error" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: error.message?.includes('Invalid') ? 400 : 500 }
        );
      }
    }

    // GET /health
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          port: PORT,
          voice_system: "Piper",
          piper_model: DEFAULT_MODEL,
          audio_player: audioPlayer.command,
          pronunciation_rules: pronunciationRules.length,
          configured_voices: Object.keys(voiceConfig.voices),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    return new Response("Voice Server (Linux/Piper) - POST to /notify, /notify/personality, or /pai", {
      headers: corsHeaders,
      status: 200
    });
  },
});

console.log(`Voice Server (Linux) running on port ${PORT}`);
console.log(`TTS: Piper (model: ${DEFAULT_MODEL})`);
console.log(`Audio: ${audioPlayer.command}`);
console.log(`POST to http://localhost:${PORT}/notify`);
console.log(`Pronunciations: ${pronunciationRules.length} rules loaded`);
