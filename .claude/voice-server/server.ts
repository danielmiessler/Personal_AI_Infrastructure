#!/usr/bin/env bun
/**
 * PAIVoice - Personal AI Voice notification server using ElevenLabs TTS
 */

import { serve } from "bun";
import { spawn } from "child_process";
import { homedir } from "os";
import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { loadProvider } from "./tts-providers";
import { playAudio } from "./desktop-audio-playback";

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

// Load TTS provider based on config.json order
const providerResult = loadProvider(import.meta.dir);
const provider = providerResult?.provider ?? null;
const providerName = providerResult?.name ?? 'none';

if (!provider) {
  console.error('⚠️  No TTS provider available');
  console.error('Configure providers in config.json');
}

// Load voices.json for agent-based voice lookup
interface VoiceEntry {
  description?: string;
  rate_multiplier?: number;
  rate_wpm?: number;
  elevenlabs?: { voice_name: string; type?: string };
  piper?: { model: string; speaker: number };
  [key: string]: any;
}

let voicesConfig: { voices: Record<string, VoiceEntry> } | null = null;
const voicesPath = join(import.meta.dir, 'voices.json');
if (existsSync(voicesPath)) {
  try {
    voicesConfig = JSON.parse(readFileSync(voicesPath, 'utf-8'));
  } catch (e) {
    console.error('Failed to load voices.json:', e);
  }
}

// Get voice ID for agent based on active provider
function getVoiceForAgent(agent: string | null): string | null {
  if (!agent || !voicesConfig?.voices[agent]) {
    return null;
  }

  const voiceEntry = voicesConfig.voices[agent];
  const providerConfig = voiceEntry[providerName];

  if (!providerConfig) {
    return null;
  }

  // Return provider-specific voice identifier
  if (providerName === 'elevenlabs') {
    return providerConfig.voice_id;
  } else if (providerName === 'piper') {
    // For piper, return agent name - Piper provider looks up model/speaker internally
    return agent;
  } else if (providerName === 'macos-say') {
    return providerConfig.voice || 'Samantha';
  }

  return null;
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

// Send notification with voice
async function sendNotification(
  title: string,
  message: string,
  voiceEnabled = true,
  agent: string | null = null
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
  if (voiceEnabled && provider) {
    try {
      const voice = getVoiceForAgent(agent);
      console.log(`🎙️  Generating speech with ${providerName} (agent: ${agent}, voice: ${voice})`);
      const result = await provider.synthesize(safeMessage, voice);
      await playAudio(result.audio, result.format);
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
        const agent = data.agent || null;

        if (agent && typeof agent !== 'string') {
          throw new Error('Invalid agent');
        }

        console.log(`📨 Notification: "${title}" - "${message}" (voice: ${voiceEnabled}, agent: ${agent})`);

        await sendNotification(title, message, voiceEnabled, agent);

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

    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          port: PORT,
          provider: providerName,
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

console.log(`🚀 PAIVoice Server running on port ${PORT}`);
console.log(`🎙️  TTS Provider: ${providerName}`);
console.log(`📡 POST to http://localhost:${PORT}/notify`);
console.log(`🔒 Security: CORS restricted to localhost, rate limiting enabled`);
console.log(`🔑 API Key: ${ELEVENLABS_API_KEY ? '✅ Configured' : '❌ Missing'}`);
