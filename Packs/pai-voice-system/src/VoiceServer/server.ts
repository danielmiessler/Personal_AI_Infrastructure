#!/usr/bin/env bun
/**
 * Voice Server - Personal AI Voice notification server
 *
 * TTS Engines:
 * - ElevenLabs (cloud) when API key available → MP3 → mpv/mpg123
 * - Qwen3-TTS (local) when no API key → WAV → paplay
 */

import { serve } from "bun";
import { spawn, execSync } from "child_process";
import { homedir, platform } from "os";
import { join } from "path";
import { existsSync, readFileSync } from "fs";

// Platform detection
const IS_MACOS = platform() === 'darwin';
const IS_LINUX = platform() === 'linux';

// Qwen3-TTS internal server port (runs alongside this server)
const QWEN3_PORT = parseInt(process.env.QWEN3_INTERNAL_PORT || "8889");

// Default voice style instruction for Qwen3-TTS (formal, consistent delivery)
// Prevents random emotional variations like laughter or tone shifts
const QWEN3_DEFAULT_INSTRUCT = "Speak at a brisk pace with confident energy. Professional and clear, slightly upbeat but not overly emotional. No laughter or dramatic shifts. Consistent delivery throughout. Read numbers naturally as quantities, not spelled out digit by digit.";

// Linux audio player detection - format-aware
interface LinuxPlayer {
  name: string;
  command: string;
  args: string[];
  volumeArg?: (volume: number) => string[];
}

type AudioFormat = 'mp3' | 'wav';

/**
 * Detect the best Linux audio player for a given format.
 * - WAV: paplay (PipeWire native) > mpv > aplay
 * - MP3: mpv > mpg123 > paplay
 */
function detectLinuxAudioPlayer(format: AudioFormat = 'mp3'): LinuxPlayer | null {
  if (!IS_LINUX) return null;

  if (format === 'wav') {
    // WAV: paplay is best (PulseAudio/PipeWire native, perfect for Qwen3 output)
    try {
      execSync('which paplay', { stdio: 'ignore' });
      return {
        name: 'paplay',
        command: 'paplay',
        args: []
        // paplay doesn't have easy volume control
      };
    } catch {}

    // mpv can also play WAV
    try {
      execSync('which mpv', { stdio: 'ignore' });
      return {
        name: 'mpv',
        command: 'mpv',
        args: ['--no-video', '--really-quiet'],
        volumeArg: (v: number) => ['--volume=' + String(Math.round(v * 100))]
      };
    } catch {}

    // aplay - ALSA fallback for WAV
    try {
      execSync('which aplay', { stdio: 'ignore' });
      return {
        name: 'aplay',
        command: 'aplay',
        args: ['-q']
      };
    } catch {}
  } else {
    // MP3: mpv preferred (handles MP3 + routes through PipeWire)
    try {
      execSync('which mpv', { stdio: 'ignore' });
      return {
        name: 'mpv',
        command: 'mpv',
        args: ['--no-video', '--really-quiet'],
        volumeArg: (v: number) => ['--volume=' + String(Math.round(v * 100))]
      };
    } catch {}

    // mpg123 for MP3
    try {
      execSync('which mpg123', { stdio: 'ignore' });
      return {
        name: 'mpg123',
        command: 'mpg123',
        args: ['-q'],
        volumeArg: (v: number) => ['-f', String(Math.round(v * 32768))]
      };
    } catch {}

    // paplay can play MP3 on newer systems
    try {
      execSync('which paplay', { stdio: 'ignore' });
      return {
        name: 'paplay',
        command: 'paplay',
        args: []
      };
    } catch {}
  }

  return null;
}

// Legacy function for backwards compatibility
function detectLinuxAudioPlayerLegacy(): LinuxPlayer | null {
  return detectLinuxAudioPlayer('mp3');
}

// Linux TTS fallback detection
function detectLinuxTTS(): { command: string; args: (text: string) => string[] } | null {
  if (!IS_LINUX) return null;

  // espeak - most common Linux TTS
  try {
    execSync('which espeak', { stdio: 'ignore' });
    return {
      command: 'espeak',
      args: (text: string) => [text]
    };
  } catch {}

  // espeak-ng - newer espeak
  try {
    execSync('which espeak-ng', { stdio: 'ignore' });
    return {
      command: 'espeak-ng',
      args: (text: string) => [text]
    };
  } catch {}

  // festival - alternative TTS
  try {
    execSync('which festival', { stdio: 'ignore' });
    return {
      command: 'festival',
      args: (text: string) => ['--tts']  // reads from stdin
    };
  } catch {}

  return null;
}

// Cache detected players (for each format)
const LINUX_AUDIO_PLAYER_MP3 = detectLinuxAudioPlayer('mp3');
const LINUX_AUDIO_PLAYER_WAV = detectLinuxAudioPlayer('wav');
const LINUX_TTS = detectLinuxTTS();

if (IS_LINUX) {
  console.log(`Platform: Linux`);
  console.log(`Audio player (MP3): ${LINUX_AUDIO_PLAYER_MP3?.name || 'none found'}`);
  console.log(`Audio player (WAV): ${LINUX_AUDIO_PLAYER_WAV?.name || 'none found'}`);
  console.log(`TTS fallback: ${LINUX_TTS?.command || 'none found (install espeak or espeak-ng)'}`);
} else if (IS_MACOS) {
  console.log(`Platform: macOS`);
}

// Load .env from user home directory
const envPath = join(homedir(), '.env');
if (existsSync(envPath)) {
  const envContent = await Bun.file(envPath).text();
  envContent.split('\n').forEach(line => {
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) return;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    // Strip surrounding quotes (single or double)
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
  console.error('Add: ELEVENLABS_API_KEY=your_key_here to ~/.env');
}

// Load settings.json for DA identity and default voice
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
      console.log(`Loaded DA voice ID from settings.json`);
    }
    if (settings.daidentity?.name) {
      daName = settings.daidentity.name;
    }
    if (settings.daidentity?.voice) {
      daVoiceProsody = settings.daidentity.voice as ProsodySettings;
      console.log(`Loaded DA voice prosody from settings.json`);
    }
  }
} catch (error) {
  console.warn('Failed to load DA voice settings from settings.json');
}

if (!daVoiceId) {
  console.warn('No voiceId configured in settings.json daidentity section');
  console.warn('Add: "daidentity": { "voiceId": "your_elevenlabs_voice_id" }');
}

// Default voice ID from settings.json or environment variable
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || daVoiceId || "";

// Voice configuration types
interface ProsodySettings {
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
  use_speaker_boost: boolean;
  volume?: number;  // Playback volume (0.0-1.0), optional
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

// Default voice settings (ElevenLabs API defaults)
const DEFAULT_PROSODY: ProsodySettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  speed: 1.0,
  use_speaker_boost: true,
};

// Load voices configuration from CORE skill (canonical source for agent voices)
let voicesConfig: VoicesConfig | null = null;
try {
  const corePersonalitiesPath = join(homedir(), '.claude', 'skills', 'CORE', 'SYSTEM', 'AGENTPERSONALITIES.md');
  if (existsSync(corePersonalitiesPath)) {
    const markdownContent = readFileSync(corePersonalitiesPath, 'utf-8');
    // Extract JSON block from markdown
    const jsonMatch = markdownContent.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      voicesConfig = JSON.parse(jsonMatch[1]);
      console.log('Loaded agent voice personalities from AGENTPERSONALITIES.md');
    }
  }
} catch (error) {
  console.warn('Failed to load agent voice personalities');
}

// Load user pronunciation customizations
let pronunciations: Record<string, string> = {};
try {
  const pronunciationsPath = join(homedir(), '.claude', 'skills', 'CORE', 'USER', 'pronunciations.json');
  if (existsSync(pronunciationsPath)) {
    const content = readFileSync(pronunciationsPath, 'utf-8');
    pronunciations = JSON.parse(content);
    console.log(`Loaded ${Object.keys(pronunciations).length} pronunciation(s) from USER config`);
  }
} catch (error) {
  console.warn('Failed to load pronunciation customizations');
}

// Sanitize text for TTS: strip URL protocols, clean up for natural speech
function sanitizeForTTS(text: string): string {
  let result = text;

  // Strip URL protocols only (keep domain and path for reading)
  // "https://github.com/repo" -> "github.com/repo"
  result = result.replace(/https?:\/\//gi, '');

  // Remove markdown links but keep the text: [text](url) -> text
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Clean up multiple spaces and trim
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

// Split text into sentences for progressive TTS
// Returns array of sentences, preserving punctuation
function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by space or end
  // Handles: . ! ? and also keeps the punctuation with the sentence
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g);

  if (!sentences) {
    return [text]; // Fallback: return whole text as one "sentence"
  }

  return sentences
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// Apply pronunciation substitutions to text before TTS
function applyPronunciations(text: string): string {
  // First sanitize for TTS (remove URLs, etc.)
  let result = sanitizeForTTS(text);

  // Then apply custom pronunciations
  for (const [term, pronunciation] of Object.entries(pronunciations)) {
    // Case-insensitive replacement with word boundaries
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    result = result.replace(regex, pronunciation);
  }
  return result;
}

// Escape special characters for AppleScript
function escapeForAppleScript(input: string): string {
  // Escape backslashes first, then double quotes
  return input.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// Strip any bracket markers from message (legacy cleanup)
function stripMarkers(message: string): string {
  return message.replace(/\[[^\]]*\]/g, '').trim();
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
  // Explicitly block: shell metacharacters, path traversal, script tags, markdown
  const cleaned = input
    .replace(/<script/gi, '')  // Remove script tags
    .replace(/\.\.\//g, '')     // Remove path traversal
    .replace(/[;&|><`$\\]/g, '') // Remove shell metacharacters
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // Strip bold markdown: **text** -> text
    .replace(/\*([^*]+)\*/g, '$1')       // Strip italic markdown: *text* -> text
    .replace(/`([^`]+)`/g, '$1')         // Strip inline code: `text` -> text
    .replace(/#{1,6}\s+/g, '')           // Strip markdown headers: ### -> (empty)
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

// Generate speech using ElevenLabs API with full prosody support
async function generateSpeech(
  text: string,
  voiceId: string,
  prosody?: Partial<ProsodySettings>
): Promise<ArrayBuffer> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key not configured');
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  // Merge provided prosody with defaults
  const settings = { ...DEFAULT_PROSODY, ...prosody };

  // ElevenLabs API voice_settings format (speed goes INSIDE voice_settings)
  const voiceSettings = {
    stability: settings.stability,
    similarity_boost: settings.similarity_boost,
    style: settings.style,
    speed: settings.speed, // Speed belongs in voice_settings, not top-level
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
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  return await response.arrayBuffer();
}

// Check if Qwen3-TTS internal server is available
let qwen3Available: boolean | null = null;

async function checkQwen3Available(): Promise<boolean> {
  if (qwen3Available !== null) return qwen3Available;

  try {
    const response = await fetch(`http://127.0.0.1:${QWEN3_PORT}/health`, {
      signal: AbortSignal.timeout(2000)
    });
    qwen3Available = response.ok;
  } catch {
    qwen3Available = false;
  }

  return qwen3Available;
}

// Generate speech using Qwen3-TTS (local fallback)
async function generateSpeechQwen3(
  text: string,
  speaker: string = "Ryan",
  instruct?: string
): Promise<ArrayBuffer> {
  const response = await fetch(`http://127.0.0.1:${QWEN3_PORT}/tts/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      speaker,
      instruct,
      language: "en"
    }),
    signal: AbortSignal.timeout(60000) // 60s timeout for TTS generation
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Qwen3-TTS error: ${response.status} - ${errorText}`);
  }

  return await response.arrayBuffer();
}

/**
 * Progressive TTS playback for Qwen3-TTS.
 *
 * Splits text into sentences and plays progressively:
 * 1. Generate first sentence → start playing immediately
 * 2. While playing, generate next sentence in parallel
 * 3. Queue and play sequentially
 *
 * This reduces perceived latency from ~10-15s to ~3-4s (first sentence delay only).
 */
async function playQwen3Progressive(
  text: string,
  speaker: string = "Ryan",
  instruct?: string
): Promise<void> {
  const sentences = splitIntoSentences(text);

  // For single sentence or short text, use normal flow
  if (sentences.length <= 1) {
    console.log('Qwen3-TTS: Single sentence, using direct generation');
    const audioBuffer = await generateSpeechQwen3(text, speaker, instruct);
    await playAudio(audioBuffer, 'wav');
    return;
  }

  console.log(`Qwen3-TTS: Progressive mode - ${sentences.length} sentences`);

  // Track audio buffers and playback state
  let currentIndex = 0;
  let isPlaying = false;
  const audioQueue: ArrayBuffer[] = [];
  let generationComplete = false;
  let playbackComplete = false;

  // Promise to track when everything is done
  const done = new Promise<void>((resolve, reject) => {
    // Start generation of all sentences (with slight stagger to prioritize first)
    const generateAll = async () => {
      for (let i = 0; i < sentences.length; i++) {
        try {
          const start = Date.now();
          console.log(`Qwen3-TTS: Generating sentence ${i + 1}/${sentences.length}: "${sentences[i].substring(0, 40)}..."`);
          const buffer = await generateSpeechQwen3(sentences[i], speaker, instruct);
          console.log(`Qwen3-TTS: Sentence ${i + 1} generated in ${Date.now() - start}ms`);
          audioQueue[i] = buffer;

          // If this is the first sentence and not playing yet, start playback
          if (i === 0 && !isPlaying) {
            playNext();
          }
        } catch (error) {
          console.error(`Qwen3-TTS: Failed to generate sentence ${i + 1}:`, error);
          // Put empty buffer to maintain order
          audioQueue[i] = new ArrayBuffer(0);
        }
      }
      generationComplete = true;
      // If playback finished waiting for generation, check completion
      checkComplete();
    };

    // Play audio chunks sequentially
    const playNext = async () => {
      if (isPlaying) return; // Already playing

      // Check if next chunk is ready
      if (audioQueue[currentIndex] === undefined) {
        // Not ready yet, will be triggered when generation adds it
        return;
      }

      const buffer = audioQueue[currentIndex];
      if (buffer.byteLength === 0) {
        // Empty buffer (generation failed), skip
        currentIndex++;
        if (currentIndex < sentences.length) {
          playNext();
        } else {
          playbackComplete = true;
          checkComplete();
        }
        return;
      }

      isPlaying = true;
      console.log(`Qwen3-TTS: Playing sentence ${currentIndex + 1}/${sentences.length}`);

      try {
        await playAudio(buffer, 'wav');
      } catch (error) {
        console.error(`Qwen3-TTS: Playback error for sentence ${currentIndex + 1}:`, error);
      }

      isPlaying = false;
      currentIndex++;

      if (currentIndex < sentences.length) {
        // More to play
        playNext();
      } else {
        playbackComplete = true;
        checkComplete();
      }
    };

    const checkComplete = () => {
      if (generationComplete && playbackComplete) {
        resolve();
      }
    };

    // Start generation
    generateAll().catch(reject);
  });

  await done;
  console.log('Qwen3-TTS: Progressive playback complete');
}

// Get volume setting from DA config or request (defaults to 1.0 = 100%)
function getVolumeSetting(requestVolume?: number): number {
  // Request volume takes priority
  if (typeof requestVolume === 'number' && requestVolume >= 0 && requestVolume <= 1) {
    return requestVolume;
  }
  // Then DA voice config from settings.json
  if (daVoiceProsody?.volume !== undefined && daVoiceProsody.volume >= 0 && daVoiceProsody.volume <= 1) {
    return daVoiceProsody.volume;
  }
  return 1.0; // Default to full volume
}

// Play audio using platform-appropriate player (format-aware)
async function playAudio(
  audioBuffer: ArrayBuffer,
  format: AudioFormat = 'mp3',
  requestVolume?: number
): Promise<void> {
  const extension = format === 'wav' ? 'wav' : 'mp3';
  const tempFile = `/tmp/voice-${Date.now()}.${extension}`;

  // Write audio to temp file
  await Bun.write(tempFile, audioBuffer);

  const volume = getVolumeSetting(requestVolume);

  // Select the appropriate player for the format
  const linuxPlayer = format === 'wav' ? LINUX_AUDIO_PLAYER_WAV : LINUX_AUDIO_PLAYER_MP3;

  return new Promise((resolve, reject) => {
    let proc;

    if (IS_MACOS) {
      // macOS: afplay handles both MP3 and WAV
      proc = spawn('/usr/bin/afplay', ['-v', volume.toString(), tempFile]);
    } else if (IS_LINUX && linuxPlayer) {
      // Linux: use format-appropriate audio player
      const args = [...linuxPlayer.args];
      if (linuxPlayer.volumeArg) {
        args.push(...linuxPlayer.volumeArg(volume));
      }
      args.push(tempFile);
      console.log(`Playing ${format} with ${linuxPlayer.name}`);
      proc = spawn(linuxPlayer.command, args);
    } else {
      // Cleanup and fail
      spawn('/bin/rm', ['-f', tempFile]);
      reject(new Error(`No audio player available for ${format} on this platform`));
      return;
    }

    proc.on('error', (error) => {
      console.error('Error playing audio:', error);
      spawn('/bin/rm', ['-f', tempFile]);
      reject(error);
    });

    proc.on('exit', (code) => {
      // Clean up temp file
      spawn('/bin/rm', ['-f', tempFile]);

      if (code === 0) {
        resolve();
      } else {
        const player = IS_MACOS ? 'afplay' : linuxPlayer?.name || 'unknown';
        reject(new Error(`${player} exited with code ${code}`));
      }
    });
  });
}

// Use platform-appropriate TTS command as fallback
async function speakWithSay(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let proc;

    if (IS_MACOS) {
      // macOS: use built-in say command
      proc = spawn('/usr/bin/say', [text]);
    } else if (IS_LINUX && LINUX_TTS) {
      // Linux: use detected TTS (espeak, espeak-ng, or festival)
      if (LINUX_TTS.command === 'festival') {
        // Festival reads from stdin
        proc = spawn(LINUX_TTS.command, ['--tts']);
        proc.stdin?.write(text);
        proc.stdin?.end();
      } else {
        // espeak/espeak-ng take text as argument
        proc = spawn(LINUX_TTS.command, LINUX_TTS.args(text));
      }
    } else {
      console.warn('No TTS fallback available for this platform');
      resolve(); // Silently succeed - TTS fallback is optional
      return;
    }

    proc.on('error', (error) => {
      console.error('Error with TTS command:', error);
      reject(error);
    });

    proc.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        const tts = IS_MACOS ? 'say' : LINUX_TTS?.command || 'unknown';
        reject(new Error(`${tts} exited with code ${code}`));
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
  voiceId: string | null = null,
  requestProsody?: Partial<ProsodySettings>
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
  let safeMessage = stripMarkers(messageValidation.sanitized!);

  // Generate and play voice
  if (voiceEnabled) {
    try {
      if (ELEVENLABS_API_KEY) {
        // ElevenLabs (cloud TTS) → MP3
        const voice = voiceId || DEFAULT_VOICE_ID;

        // Get voice configuration (personality settings)
        const voiceConfig = getVoiceConfig(voice);

        // Build prosody: request > voice config > DA config > defaults
        let prosody: Partial<ProsodySettings> = {};

        // First try voice config from AGENTPERSONALITIES.md
        if (voiceConfig) {
          if (voiceConfig.prosody) {
            // New format: nested prosody object
            prosody = voiceConfig.prosody;
          } else {
            // Legacy format: flat fields
            prosody = {
              stability: voiceConfig.stability,
              similarity_boost: voiceConfig.similarity_boost,
              style: voiceConfig.style ?? DEFAULT_PROSODY.style,
              speed: voiceConfig.speed ?? DEFAULT_PROSODY.speed,
              use_speaker_boost: voiceConfig.use_speaker_boost ?? DEFAULT_PROSODY.use_speaker_boost,
            };
          }
          console.log(`Voice: ${voiceConfig.description}`);
        } else if (voice === DEFAULT_VOICE_ID && daVoiceProsody) {
          // Using DA's default voice - use prosody from settings.json
          prosody = daVoiceProsody;
          console.log(`Voice: DA default`);
        }

        // Request prosody overrides config prosody
        if (requestProsody) {
          prosody = { ...prosody, ...requestProsody };
          console.log(`Using request prosody overrides`);
        }

        const settings = { ...DEFAULT_PROSODY, ...prosody };
        const volume = (prosody as any)?.volume ?? daVoiceProsody?.volume;
        console.log(`Generating speech [ElevenLabs] (voice: ${voice}, stability: ${settings.stability}, style: ${settings.style}, speed: ${settings.speed}, volume: ${volume ?? 1.0})`);

        const spokenMessage = applyPronunciations(safeMessage);
        const audioBuffer = await generateSpeech(spokenMessage, voice, prosody);
        await playAudio(audioBuffer, 'mp3', volume);
      } else if (await checkQwen3Available()) {
        // Qwen3-TTS (local TTS) → WAV with progressive playback
        console.log('Generating speech [Qwen3-TTS] (local, progressive)');
        const spokenMessage = applyPronunciations(safeMessage);
        await playQwen3Progressive(spokenMessage, "Ryan", QWEN3_DEFAULT_INSTRUCT);
      } else {
        // Ultimate fallback to OS TTS (say/espeak)
        console.log('Using OS TTS fallback (no API key, Qwen3 unavailable)');
        await speakWithSay(applyPronunciations(safeMessage));
      }
    } catch (error) {
      console.error("Failed to generate/play speech:", error);
      // Try fallback to say command
      try {
        await speakWithSay(applyPronunciations(safeMessage));
      } catch (sayError) {
        console.error("Fallback say also failed:", sayError);
      }
    }
  }

  // Display system notification (platform-specific)
  try {
    if (IS_MACOS) {
      // macOS: use osascript
      const escapedTitle = escapeForAppleScript(safeTitle);
      const escapedMessage = escapeForAppleScript(safeMessage);
      const script = `display notification "${escapedMessage}" with title "${escapedTitle}" sound name ""`;
      await spawnSafe('/usr/bin/osascript', ['-e', script]);
    } else if (IS_LINUX) {
      // Linux: use notify-send if available
      try {
        await spawnSafe('notify-send', [safeTitle, safeMessage]);
      } catch {
        // notify-send not available, skip desktop notification
        console.log('notify-send not available, skipping desktop notification');
      }
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

        // Accept prosody settings directly in request (for custom agents)
        // Also accept volume at top level for convenience
        const voiceSettings: Partial<ProsodySettings> | undefined = data.voice_settings
          ? { ...data.voice_settings, volume: data.volume ?? data.voice_settings.volume }
          : data.volume !== undefined
            ? { volume: data.volume }
            : undefined;

        if (voiceId && typeof voiceId !== 'string') {
          throw new Error('Invalid voice_id');
        }

        console.log(`Notification: "${title}" - "${message}" (voice: ${voiceEnabled}, voiceId: ${voiceId || DEFAULT_VOICE_ID})`);

        await sendNotification(title, message, voiceEnabled, voiceId, voiceSettings);

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

        console.log(`PAI notification: "${title}" - "${message}"`);

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
      const qwen3Ready = await checkQwen3Available();
      let voiceSystem = "OS TTS (say/espeak)";
      if (ELEVENLABS_API_KEY) {
        voiceSystem = "ElevenLabs (cloud)";
      } else if (qwen3Ready) {
        voiceSystem = "Qwen3-TTS (local)";
      }

      return new Response(
        JSON.stringify({
          status: "healthy",
          port: PORT,
          voice_system: voiceSystem,
          elevenlabs_configured: !!ELEVENLABS_API_KEY,
          qwen3_available: qwen3Ready,
          qwen3_port: QWEN3_PORT,
          default_voice_id: DEFAULT_VOICE_ID,
          audio_player_mp3: LINUX_AUDIO_PLAYER_MP3?.name || (IS_MACOS ? 'afplay' : null),
          audio_player_wav: LINUX_AUDIO_PLAYER_WAV?.name || (IS_MACOS ? 'afplay' : null)
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    return new Response("Voice Server - POST to /notify or /pai", {
      headers: corsHeaders,
      status: 200
    });
  },
});

// Startup message with TTS engine info
async function logStartup() {
  console.log(`Voice Server running on port ${PORT}`);

  let ttsDescription: string;
  if (ELEVENLABS_API_KEY) {
    ttsDescription = 'ElevenLabs (cloud) → MP3';
  } else {
    const qwen3Ready = await checkQwen3Available();
    if (qwen3Ready) {
      ttsDescription = `Qwen3-TTS (local :${QWEN3_PORT}) → WAV`;
    } else {
      ttsDescription = IS_MACOS ? 'macOS Say' : (LINUX_TTS?.command || 'no TTS');
    }
  }

  console.log(`TTS Engine: ${ttsDescription}`);
  console.log(`Default voice: ${DEFAULT_VOICE_ID || '(none configured)'}`);
  console.log(`POST to http://localhost:${PORT}/notify`);
  console.log(`Security: CORS restricted to localhost, rate limiting enabled`);

  if (!ELEVENLABS_API_KEY) {
    console.log(`Note: Set ELEVENLABS_API_KEY in ~/.env for cloud TTS`);
    const qwen3Ready = await checkQwen3Available();
    if (!qwen3Ready) {
      console.log(`Note: Start qwen3-server.py on :${QWEN3_PORT} for local TTS`);
    }
  }
}

logStartup();
