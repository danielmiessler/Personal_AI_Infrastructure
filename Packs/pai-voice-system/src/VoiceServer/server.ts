#!/usr/bin/env bun
/**
 * Voice Server - Personal AI Voice notification server using ElevenLabs TTS
 */

import { serve } from "bun";
import { spawn } from "child_process";
import { homedir } from "os";
import { join } from "path";
import { existsSync, readFileSync } from "fs";

// --- SECURITY HELPERS ---

/**
 * Validates a URL to prevent SSRF (Server-Side Request Forgery)
 * Blocks access to internal networks and cloud metadata services.
 */
function validateUrl(urlStr: string): void {
  try {
    const parsed = new URL(urlStr);
    
    // SSRF protection - block internal IPs and local hostnames
    const blocked = [
      '127.0.0.1', 'localhost', '0.0.0.0', 
      '169.254.169.254', // AWS/Cloud metadata service
      '10.', '172.16.', '192.168.' // Private networks
    ];

    const hostname = parsed.hostname.toLowerCase();

    if (blocked.some(b => hostname.startsWith(b) || hostname === b)) {
      throw new Error(`Access to internal or private URL is prohibited: ${hostname}`);
    }
  } catch (e: any) {
    throw new Error(`URL Validation Failed: ${e.message}`);
  }
}

// ------------------------

// Load .env from user home directory
const envPath = join(homedir(), '.env');
if (existsSync(envPath)) {
  const envContent = await Bun.file(envPath).text();
  envContent.split('\n').forEach(line => {
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) return;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && value && !key.startsWith('#')) {
      process.env[key] = value;
    }
  });
}

const PORT = parseInt(process.env.PORT || "8888");
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
  console.error('Warning: ELEVENLABS_API_KEY not found in ~/.env');
  console.error('Voice server will use macOS say command as fallback');
}

let daVoiceId: string | null = null;
let daVoiceProsody: ProsodySettings | null = null;
let daName = "Assistant";
try {
  const settingsPath = join(homedir(), '.claude', 'settings.json');
  if (existsSync(settingsPath)) {
    const settingsContent = readFileSync(settingsPath, 'utf-8');
    const settings = JSON.parse(settingsContent);
    if (settings.daidentity?.voiceId) {
      daVoiceId = settings.daidentity.voiceId;
    }
    if (settings.daidentity?.name) {
      daName = settings.daidentity.name;
    }
    if (settings.daidentity?.voice) {
      daVoiceProsody = settings.daidentity.voice as ProsodySettings;
    }
  }
} catch (error) {
  console.warn('Failed to load DA voice settings');
}

const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || daVoiceId || "";

interface ProsodySettings {
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
  use_speaker_boost: boolean;
  volume?: number; 
}

interface VoiceConfig {
  voice_id: string;
  voice_name: string;
  stability: number;
  similarity_boost: number;
  style?: number;
  speed?: number;
  use_speaker_boost?: boolean;
  prosody?: ProsodySettings;
  description: string;
  type: string;
}

interface VoicesConfig {
  voices: Record<string, VoiceConfig>;
}

const DEFAULT_PROSODY: ProsodySettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  speed: 1.0,
  use_speaker_boost: true,
};

let voicesConfig: VoicesConfig | null = null;
try {
  const corePersonalitiesPath = join(homedir(), '.claude', 'skills', 'CORE', 'SYSTEM', 'AGENTPERSONALITIES.md');
  if (existsSync(corePersonalitiesPath)) {
    const markdownContent = readFileSync(corePersonalitiesPath, 'utf-8');
    const jsonMatch = markdownContent.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      voicesConfig = JSON.parse(jsonMatch[1]);
    }
  }
} catch (error) {
  console.warn('Failed to load agent personalities');
}

let pronunciations: Record<string, string> = {};
try {
  const pronunciationsPath = join(homedir(), '.claude', 'skills', 'CORE', 'USER', 'pronunciations.json');
  if (existsSync(pronunciationsPath)) {
    const content = readFileSync(pronunciationsPath, 'utf-8');
    pronunciations = JSON.parse(content);
  }
} catch (error) {
  console.warn('Failed to load pronunciations');
}

function applyPronunciations(text: string): string {
  let result = text;
  for (const [term, pronunciation] of Object.entries(pronunciations)) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    result = result.replace(regex, pronunciation);
  }
  return result;
}

function escapeForAppleScript(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function stripMarkers(message: string): string {
  return message.replace(/\[[^\]]*\]/g, '').trim();
}

function getVoiceConfig(identifier: string): VoiceConfig | null {
  if (!voicesConfig) return null;
  if (voicesConfig.voices[identifier]) return voicesConfig.voices[identifier];
  for (const config of Object.values(voicesConfig.voices)) {
    if (config.voice_id === identifier) return config;
  }
  return null;
}

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
  if (!input || typeof input !== 'string') return { valid: false, error: 'Invalid input type' };
  if (input.length > 500) return { valid: false, error: 'Message too long' };
  const sanitized = sanitizeForSpeech(input);
  if (!sanitized || sanitized.length === 0) return { valid: false, error: 'No valid content' };
  return { valid: true, sanitized };
}

async function generateSpeech(
  text: string,
  voiceId: string,
  prosody?: Partial<ProsodySettings>
): Promise<ArrayBuffer> {
  if (!ELEVENLABS_API_KEY) throw new Error('ElevenLabs API key not configured');

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  
  // SSRF Protection: Validate the API URL
  validateUrl(url);

  const settings = { ...DEFAULT_PROSODY, ...prosody };
  const voiceSettings = {
    stability: settings.stability,
    similarity_boost: settings.similarity_boost,
    style: settings.style,
    speed: settings.speed,
    use_speaker_boost: settings.use_speaker_boost,
  };

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
      voice_settings: voiceSettings,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  return await response.arrayBuffer();
}

function getVolumeSetting(requestVolume?: number): number {
  if (typeof requestVolume === 'number' && requestVolume >= 0 && requestVolume <= 1) return requestVolume;
  if (daVoiceProsody?.volume !== undefined && daVoiceProsody.volume >= 0 && daVoiceProsody.volume <= 1) return daVoiceProsody.volume;
  return 1.0;
}

async function playAudio(audioBuffer: ArrayBuffer, requestVolume?: number): Promise<void> {
  const tempFile = `/tmp/voice-${Date.now()}.mp3`;
  await Bun.write(tempFile, audioBuffer);
  const volume = getVolumeSetting(requestVolume);

  return new Promise((resolve, reject) => {
    const proc = spawn('/usr/bin/afplay', ['-v', volume.toString(), tempFile]);
    proc.on('exit', (code) => {
      spawn('/bin/rm', [tempFile]);
      code === 0 ? resolve() : reject(new Error(`afplay failed`));
    });
  });
}

async function speakWithSay(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('/usr/bin/say', [text]);
    proc.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`say failed`)));
  });
}

function spawnSafe(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args);
    proc.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} failed`)));
  });
}

async function sendNotification(
  title: string,
  message: string,
  voiceEnabled = true,
  voiceId: string | null = null,
  requestProsody?: Partial<ProsodySettings>
) {
  const titleValidation = validateInput(title);
  const messageValidation = validateInput(message);
  if (!titleValidation.valid || !messageValidation.valid) throw new Error('Invalid input');

  const safeTitle = titleValidation.sanitized!;
  let safeMessage = stripMarkers(messageValidation.sanitized!);

  if (voiceEnabled) {
    try {
      if (ELEVENLABS_API_KEY) {
        const voice = voiceId || DEFAULT_VOICE_ID;
        const voiceConfig = getVoiceConfig(voice);
        let prosody: Partial<ProsodySettings> = {};

        if (voiceConfig) {
          prosody = voiceConfig.prosody || {
            stability: voiceConfig.stability,
            similarity_boost: voiceConfig.similarity_boost,
            style: voiceConfig.style ?? DEFAULT_PROSODY.style,
            speed: voiceConfig.speed ?? DEFAULT_PROSODY.speed,
            use_speaker_boost: voiceConfig.use_speaker_boost ?? DEFAULT_PROSODY.use_speaker_boost,
          };
        } else if (voice === DEFAULT_VOICE_ID && daVoiceProsody) {
          prosody = daVoiceProsody;
        }

        if (requestProsody) prosody = { ...prosody, ...requestProsody };

        const spokenMessage = applyPronunciations(safeMessage);
        const audioBuffer = await generateSpeech(spokenMessage, voice, prosody);
        await playAudio(audioBuffer, (prosody as any)?.volume ?? daVoiceProsody?.volume);
      } else {
        await speakWithSay(applyPronunciations(safeMessage));
      }
    } catch (error) {
      console.error("Speech error, falling back to say");
      try { await speakWithSay(applyPronunciations(safeMessage)); } catch (e) {}
    }
  }

  try {
    const escapedTitle = escapeForAppleScript(safeTitle);
    const escapedMessage = escapeForAppleScript(safeMessage);
    const script = `display notification "${escapedMessage}" with title "${escapedTitle}" sound name ""`;
    await spawnSafe('/usr/bin/osascript', ['-e', script]);
  } catch (error) {}
}

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

const server = serve({
  port: PORT,
  async fetch(req) {
    // SSRF Protection: Validate the request URL
    validateUrl(req.url);
    const url = new URL(req.url);

    /**
     * Rate Limiting Security: 
     * In a production environment, only trust 'x-forwarded-for' if the server 
     * is behind a known, trusted reverse proxy. 
     * For Personal Infrastructure, direct socket IP is safer unless proxy is configured.
     */
    const clientIp = server.requestIP(req)?.address || 'localhost';

    const corsHeaders = {
      "Access-Control-Allow-Origin": "http://localhost",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });

    if (!checkRateLimit(clientIp)) {
      return new Response(JSON.stringify({ status: "error", message: "Rate limit exceeded" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429
      });
    }

    if (url.pathname === "/notify" && req.method === "POST") {
      try {
        const data = await req.json();
        const title = data.title || "PAI Notification";
        const message = data.message || "Task completed";
        const voiceEnabled = data.voice_enabled !== false;
        const voiceId = data.voice_id || data.voice_name || null;

        const voiceSettings: Partial<ProsodySettings> | undefined = data.voice_settings
          ? { ...data.voice_settings, volume: data.volume ?? data.voice_settings.volume }
          : data.volume !== undefined ? { volume: data.volume } : undefined;

        if (voiceId && typeof voiceId !== 'string') throw new Error('Invalid voice_id');

        await sendNotification(title, message, voiceEnabled, voiceId, voiceSettings);
        return new Response(JSON.stringify({ status: "success" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ status: "error", message: error.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        });
      }
    }

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "healthy", api_key_configured: !!ELEVENLABS_API_KEY }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    return new Response("Voice Server Active", { headers: corsHeaders, status: 200 });
  },
});

console.log(`Voice Server running on port ${PORT}`);