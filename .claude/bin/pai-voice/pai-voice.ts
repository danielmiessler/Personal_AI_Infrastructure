#!/usr/bin/env bun
/**
 * pai-voice - ElevenLabs TTS/STT Command-Line Interface
 *
 * A clean, deterministic CLI for voice synthesis and transcription.
 * Follows PAI's CLI-First Architecture.
 *
 * @author Daniel Miessler / PAI
 * @version 1.0.0
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { spawn } from "child_process";

// ============================================================================
// Type Definitions
// ============================================================================

interface Config {
  apiKey: string;
  defaultVoiceId: string;
  defaultModel: string;
}

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
}

interface VoicesResponse {
  voices: Voice[];
}

interface SubscriptionInfo {
  tier: string;
  character_count: number;
  character_limit: number;
  status: string;
  next_character_count_reset_unix: number;
}

interface TranscriptWord {
  text: string;
  start: number;
  end: number;
  type: string;
  speaker_id?: string;
}

interface TranscriptResponse {
  text: string;
  words?: TranscriptWord[];
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULTS = {
  baseUrl: "https://api.elevenlabs.io/v1",
  voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel - ElevenLabs default voice
  model: "eleven_flash_v2_5", // Fastest model
  outputDir: "/tmp",
} as const;

const AVAILABLE_MODELS = [
  "***REMOVED***", // High quality, 29 languages
  "eleven_flash_v2_5", // Fastest, 32 languages
  "eleven_turbo_v2_5", // Balanced, 32 languages
  "eleven_flash_v2", // Fast English-only
  "eleven_turbo_v2", // Balanced English-only
  "eleven_monolingual_v1", // Legacy English
] as const;

/**
 * Load configuration from ~/.claude/.env
 */
function loadConfig(): Config {
  const envPath = join(homedir(), ".claude", ".env");

  try {
    const envContent = readFileSync(envPath, "utf-8");
    const lines = envContent.split("\n");

    const getValue = (key: string): string | undefined => {
      const line = lines.find((l) => l.startsWith(`${key}=`));
      return line?.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");
    };

    const apiKey = getValue("ELEVENLABS_API_KEY");
    if (!apiKey) {
      console.error("Error: ELEVENLABS_API_KEY not found in ~/.claude/.env");
      console.error("Add: ELEVENLABS_API_KEY=your_key_here");
      process.exit(1);
    }

    return {
      apiKey,
      defaultVoiceId: getValue("ELEVENLABS_VOICE_ID") || DEFAULTS.voiceId,
      defaultModel: getValue("ELEVENLABS_MODEL") || DEFAULTS.model,
    };
  } catch (error) {
    console.error("Error: Cannot read ~/.claude/.env file");
    console.error("Make sure ELEVENLABS_API_KEY is set");
    process.exit(1);
  }
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Text-to-Speech: Generate audio from text
 */
async function textToSpeech(
  text: string,
  options: {
    voice?: string;
    model?: string;
    output?: string;
    play?: boolean;
  } = {}
): Promise<void> {
  const config = loadConfig();

  if (!text || text.trim() === "") {
    console.error("Error: Text is required");
    console.error('Usage: pai-voice say "Your text here"');
    process.exit(1);
  }

  const voiceId = options.voice || config.defaultVoiceId;
  const model = options.model || config.defaultModel;
  const timestamp = Date.now();
  const outputPath = options.output || join(DEFAULTS.outputDir, `pai-voice-${timestamp}.mp3`);

  console.error(`[pai-voice] Generating speech...`);
  console.error(`  Voice: ${voiceId}`);
  console.error(`  Model: ${model}`);
  console.error(`  Text: "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`);

  try {
    const response = await fetch(`${DEFAULTS.baseUrl}/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`Error: ElevenLabs API returned ${response.status}`);
      console.error(JSON.stringify(error, null, 2));
      process.exit(1);
    }

    const audioBuffer = await response.arrayBuffer();
    writeFileSync(outputPath, Buffer.from(audioBuffer));

    console.error(`[pai-voice] Audio saved: ${outputPath}`);

    // Play if requested (BEFORE JSON output so 'played' status is accurate)
    let played = false;
    if (options.play) {
      played = await playAudio(outputPath);
    }

    // Output JSON to stdout (AFTER playback so we know if it worked)
    console.log(
      JSON.stringify({
        success: true,
        file: outputPath,
        voice_id: voiceId,
        model: model,
        text_length: text.length,
        played: options.play ? played : undefined,
      })
    );
  } catch (error) {
    console.error("Error: Failed to generate speech");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Speech-to-Text: Transcribe audio file
 */
async function speechToText(
  filePath: string,
  options: {
    language?: string;
    diarize?: boolean;
    json?: boolean;
  } = {}
): Promise<void> {
  const config = loadConfig();

  if (!filePath || !existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    console.error("Usage: pai-voice transcribe <audio-file>");
    process.exit(1);
  }

  console.error(`[pai-voice] Transcribing: ${filePath}`);

  try {
    const fileBuffer = readFileSync(filePath);
    const formData = new FormData();
    formData.append("file", new Blob([fileBuffer]), filePath.split("/").pop() || "audio.mp3");

    if (options.language) {
      formData.append("language_code", options.language);
    }
    if (options.diarize) {
      formData.append("diarize", "true");
    }

    const response = await fetch(`${DEFAULTS.baseUrl}/speech-to-text`, {
      method: "POST",
      headers: {
        "xi-api-key": config.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`Error: ElevenLabs API returned ${response.status}`);
      console.error(JSON.stringify(error, null, 2));
      process.exit(1);
    }

    const result: TranscriptResponse = await response.json();

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(result.text);
    }
  } catch (error) {
    console.error("Error: Failed to transcribe audio");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Play audio file using system player
 * @param filePath - Path to audio file
 * @param timeoutMs - Timeout in milliseconds (default: 15000)
 */
async function playAudio(filePath: string, timeoutMs = 15000): Promise<boolean> {
  if (!existsSync(filePath)) {
    console.error(`[pai-voice] Error: File not found: ${filePath}`);
    return false;
  }

  console.error(`[pai-voice] Playing: ${filePath}`);

  return new Promise((resolve) => {
    // Use afplay on macOS
    const player = spawn("afplay", [filePath]);

    // Timeout to prevent hanging
    const timeout = setTimeout(() => {
      console.error(`[pai-voice] Playback timeout after ${timeoutMs}ms - killing player`);
      player.kill("SIGTERM");
      resolve(false);
    }, timeoutMs);

    player.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        console.error(`[pai-voice] Playback completed`);
        resolve(true);
      } else {
        console.error(`[pai-voice] Player exited with code ${code}`);
        resolve(false);
      }
    });

    player.on("error", (error) => {
      clearTimeout(timeout);
      console.error(`[pai-voice] Playback error: ${error.message}`);
      resolve(false);
    });
  });
}

/**
 * List available voices
 */
async function listVoices(
  options: {
    search?: string;
    json?: boolean;
  } = {}
): Promise<void> {
  const config = loadConfig();

  console.error("[pai-voice] Fetching voices...");

  try {
    const response = await fetch(`${DEFAULTS.baseUrl}/voices`, {
      headers: {
        "xi-api-key": config.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`Error: ElevenLabs API returned ${response.status}`);
      console.error(JSON.stringify(error, null, 2));
      process.exit(1);
    }

    const data: VoicesResponse = await response.json();
    let voices = data.voices;

    // Filter by search term
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      voices = voices.filter(
        (v) =>
          v.name.toLowerCase().includes(searchLower) ||
          v.category.toLowerCase().includes(searchLower) ||
          Object.values(v.labels || {}).some((l) => l.toLowerCase().includes(searchLower))
      );
    }

    if (options.json) {
      console.log(JSON.stringify(voices, null, 2));
    } else {
      console.log(`\nFound ${voices.length} voice(s):\n`);
      for (const voice of voices) {
        const labels = Object.entries(voice.labels || {})
          .map(([k, v]) => `${k}:${v}`)
          .join(", ");
        console.log(`  ${voice.name}`);
        console.log(`    ID: ${voice.voice_id}`);
        console.log(`    Category: ${voice.category}`);
        if (labels) console.log(`    Labels: ${labels}`);
        console.log("");
      }
    }
  } catch (error) {
    console.error("Error: Failed to fetch voices");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Check subscription status
 */
async function checkSubscription(options: { json?: boolean } = {}): Promise<void> {
  const config = loadConfig();

  console.error("[pai-voice] Checking subscription...");

  try {
    const response = await fetch(`${DEFAULTS.baseUrl}/user/subscription`, {
      headers: {
        "xi-api-key": config.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`Error: ElevenLabs API returned ${response.status}`);
      console.error(JSON.stringify(error, null, 2));
      process.exit(1);
    }

    const data: SubscriptionInfo = await response.json();

    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      const used = data.character_count;
      const limit = data.character_limit;
      const percent = ((used / limit) * 100).toFixed(1);
      const resetDate = new Date(data.next_character_count_reset_unix * 1000);

      console.log(`\nElevenLabs Subscription Status\n`);
      console.log(`  Tier: ${data.tier}`);
      console.log(`  Status: ${data.status}`);
      console.log(`  Characters: ${used.toLocaleString()} / ${limit.toLocaleString()} (${percent}%)`);
      console.log(`  Reset: ${resetDate.toLocaleDateString()} ${resetDate.toLocaleTimeString()}`);
      console.log("");
    }
  } catch (error) {
    console.error("Error: Failed to check subscription");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// ============================================================================
// Help Documentation
// ============================================================================

function showHelp(): void {
  console.log(`
pai-voice - ElevenLabs TTS/STT Command-Line Interface
=====================================================

A clean, deterministic CLI for voice synthesis and transcription.

USAGE:
  pai-voice <command> [options]

COMMANDS:
  say <text>              Convert text to speech
  transcribe <file>       Transcribe audio file to text
  play <file>             Play an audio file
  voices                  List available voices
  subscription            Check subscription status
  help, --help, -h        Show this help message
  version, --version, -v  Show version information

OPTIONS:
  --voice <id>            Voice ID to use (default: from .env or ${DEFAULTS.voiceId})
  --model <model>         Model to use (default: ${DEFAULTS.model})
  --output <path>         Output file path (default: /tmp/pai-voice-{timestamp}.mp3)
  --play                  Play audio immediately after generation
  --search <term>         Filter voices by search term
  --language <code>       Language code for transcription (ISO 639-3)
  --diarize               Enable speaker diarization
  --json                  Output in JSON format

EXAMPLES:
  # Generate and play speech
  pai-voice say "Hello! Task completed." --play

  # Generate speech with specific voice
  pai-voice say "Hello world" --voice EXAVITQu4vr4xnSDxMaL --output ~/greeting.mp3

  # Transcribe audio
  pai-voice transcribe recording.mp3

  # List German voices
  pai-voice voices --search german

  # Check character usage
  pai-voice subscription

AVAILABLE MODELS:
  eleven_flash_v2_5       Fastest model, 32 languages (recommended)
  ***REMOVED***  High quality, 29 languages
  eleven_turbo_v2_5       Balanced speed/quality, 32 languages
  eleven_flash_v2         Fast English-only
  eleven_turbo_v2         Balanced English-only

CONFIGURATION:
  API key and defaults are loaded from ~/.claude/.env:

  ELEVENLABS_API_KEY=your_api_key_here
  ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
  ELEVENLABS_MODEL=eleven_flash_v2_5

OUTPUT:
  - Status messages go to stderr
  - JSON/text output goes to stdout
  - Exit code 0 on success, 1 on error

PHILOSOPHY:
  pai-voice follows PAI's CLI-First Architecture:
  - Deterministic: Same input -> Same output
  - Clean: Single responsibility (voice only)
  - Composable: JSON output pipes to jq, etc.
  - Documented: Full help and examples
  - Testable: Predictable behavior

For more information, see ~/.claude/bin/pai-voice/README.md

Version: 1.0.0
`);
}

function showVersion(): void {
  console.log("pai-voice version 1.0.0");
}

// ============================================================================
// Argument Parsing
// ============================================================================

function parseArgs(args: string[]): {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
} {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  let command = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];

      // Boolean flags
      if (key === "play" || key === "diarize" || key === "json") {
        flags[key] = true;
      }
      // Value flags
      else if (nextArg && !nextArg.startsWith("--")) {
        flags[key] = nextArg;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith("-")) {
      // Short flags
      if (arg === "-h") flags["help"] = true;
      else if (arg === "-v") flags["version"] = true;
    } else if (!command) {
      command = arg;
    } else {
      positional.push(arg);
    }
  }

  return { command, positional, flags };
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const { command, positional, flags } = parseArgs(args);

  // Handle help/version
  if (!command || command === "help" || flags["help"]) {
    showHelp();
    return;
  }

  if (command === "version" || flags["version"]) {
    showVersion();
    return;
  }

  // Route to commands
  switch (command) {
    case "say":
      await textToSpeech(positional.join(" "), {
        voice: flags["voice"] as string,
        model: flags["model"] as string,
        output: flags["output"] as string,
        play: flags["play"] as boolean,
      });
      break;

    case "transcribe":
      await speechToText(positional[0], {
        language: flags["language"] as string,
        diarize: flags["diarize"] as boolean,
        json: flags["json"] as boolean,
      });
      break;

    case "play":
      if (!positional[0]) {
        console.error("Error: Audio file path required");
        console.error("Usage: pai-voice play <file>");
        process.exit(1);
      }
      await playAudio(positional[0]);
      break;

    case "voices":
      await listVoices({
        search: flags["search"] as string,
        json: flags["json"] as boolean,
      });
      break;

    case "subscription":
      await checkSubscription({
        json: flags["json"] as boolean,
      });
      break;

    default:
      console.error(`Error: Unknown command '${command}'`);
      console.error('Run "pai-voice --help" for usage information');
      process.exit(1);
  }
}

// Run CLI
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
