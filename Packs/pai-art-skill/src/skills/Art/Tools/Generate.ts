#!/usr/bin/env bun

/**
 * generate - Visual Content Generation CLI
 *
 * Generate images using Flux 1.1 Pro, Nano Banana, Nano Banana Pro, or GPT-image-1.
 * Generate videos using Google Veo models (veo-3.1, veo-3, veo-2).
 * Follows deterministic, composable CLI design.
 *
 * Usage:
 *   bun run Generate.ts --model nano-banana-pro --prompt "..." --size 2K --output /tmp/image.png
 *   bun run Generate.ts --model veo-3.1-fast --prompt "..." --output ~/Downloads/video.mp4
 */

import Replicate from "replicate";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { writeFile, readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

// ============================================================================
// Environment Loading
// ============================================================================

async function loadEnv(): Promise<void> {
  // Load from canonical location: $PAI_DIR/.env (single source of truth)
  // Falls back to legacy locations for backwards compatibility
  const paiDir = process.env.PAI_DIR || resolve(process.env.HOME!, '.config/pai');
  const envPaths = [
    resolve(paiDir, '.env'),
    resolve(process.env.HOME!, '.claude/.env'), // Legacy location
  ];

  for (const envPath of envPaths) {
    try {
      const envContent = await readFile(envPath, 'utf-8');
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
      break; // Stop after first successful load
    } catch {
      // Continue to next path
    }
  }
}

// ============================================================================
// Types
// ============================================================================

// Image models
type ImageModel = "flux" | "nano-banana" | "nano-banana-pro" | "gpt-image-1";

// Video models (Veo)
type VideoModel = "veo-3.1" | "veo-3.1-fast" | "veo-3" | "veo-3-fast" | "veo-2";

type Model = ImageModel | VideoModel;

type ReplicateSize = "1:1" | "16:9" | "3:2" | "2:3" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "21:9";
type OpenAISize = "1024x1024" | "1536x1024" | "1024x1536";
type GeminiSize = "1K" | "2K" | "4K";
type Size = ReplicateSize | OpenAISize | GeminiSize;

// Video resolutions
type VideoResolution = "720p" | "1080p" | "4K";

// Veo model mapping
const VEO_MODELS: Record<VideoModel, string> = {
  "veo-3.1": "veo-3.1-generate-preview",
  "veo-3.1-fast": "veo-3.1-fast-generate-preview",
  "veo-3": "veo-3.0-generate-001",
  "veo-3-fast": "veo-3.0-fast-generate-001",
  "veo-2": "veo-2.0-generate-001",
};

// Pricing per second (for cost estimation)
const VEO_PRICING: Record<VideoModel, { standard: number; "4k": number }> = {
  "veo-3.1": { standard: 0.40, "4k": 0.60 },
  "veo-3.1-fast": { standard: 0.15, "4k": 0.35 },
  "veo-3": { standard: 0.40, "4k": 0.40 },
  "veo-3-fast": { standard: 0.15, "4k": 0.15 },
  "veo-2": { standard: 0.35, "4k": 0.35 },
};

interface CLIArgs {
  model: Model;
  prompt: string;
  size: Size;
  output: string;
  creativeVariations?: number;
  aspectRatio?: ReplicateSize;
  transparent?: boolean;
  referenceImages?: string[]; // Multiple reference images (up to 14 total)
  removeBg?: boolean;
  addBg?: string;
  thumbnail?: boolean;
  // Video-specific options
  duration?: number;
  firstFrame?: string;
  lastFrame?: string;
  negativePrompt?: string;
  audio?: boolean;
  resolution?: VideoResolution;
  extend?: boolean;
  inputVideo?: string;
  dryRun?: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

const IMAGE_MODELS: ImageModel[] = ["flux", "nano-banana", "nano-banana-pro", "gpt-image-1"];
const VIDEO_MODELS: VideoModel[] = ["veo-3.1", "veo-3.1-fast", "veo-3", "veo-3-fast", "veo-2"];
const ALL_MODELS: Model[] = [...IMAGE_MODELS, ...VIDEO_MODELS];

function isVideoModel(model: Model): model is VideoModel {
  return VIDEO_MODELS.includes(model as VideoModel);
}

const DEFAULTS = {
  model: "nano-banana-pro" as Model,
  size: "2K" as Size,
  output: `${process.env.HOME}/Downloads/art-output.png`,
  videoDuration: 8,
  videoResolution: "1080p" as VideoResolution,
};

const REPLICATE_SIZES: ReplicateSize[] = ["1:1", "16:9", "3:2", "2:3", "3:4", "4:3", "4:5", "5:4", "9:16", "21:9"];
const OPENAI_SIZES: OpenAISize[] = ["1024x1024", "1536x1024", "1024x1536"];
const GEMINI_SIZES: GeminiSize[] = ["1K", "2K", "4K"];
const GEMINI_ASPECT_RATIOS: ReplicateSize[] = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];

// ============================================================================
// Error Handling
// ============================================================================

class CLIError extends Error {
  constructor(message: string, public exitCode: number = 1) {
    super(message);
    this.name = "CLIError";
  }
}

function handleError(error: unknown): never {
  if (error instanceof CLIError) {
    console.error(`Error: ${error.message}`);
    process.exit(error.exitCode);
  }
  if (error instanceof Error) {
    console.error(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
  console.error(`Unknown error:`, error);
  process.exit(1);
}

// ============================================================================
// Help
// ============================================================================

// PAI directory for documentation paths
const PAI_DIR = process.env.PAI_DIR || `${process.env.HOME}/.config/pai`;

function showHelp(): void {
  console.log(`
generate - Visual Content Generation CLI

Generate images using Flux, Nano Banana, Nano Banana Pro, or GPT-image-1.
Generate videos using Google Veo models (veo-3.1, veo-3, veo-2).

USAGE:
  bun run Generate.ts --model <model> --prompt "<prompt>" [OPTIONS]

REQUIRED:
  --model <model>      Model to use (see MODEL OPTIONS below)
  --prompt <text>      Generation prompt

MODEL OPTIONS:
  Image Models:
    flux               Flux 1.1 Pro (Replicate)
    nano-banana        Nano Banana (Replicate)
    nano-banana-pro    Nano Banana Pro / Gemini 3 Pro (default)
    gpt-image-1        GPT Image 1 (OpenAI)

  Video Models (Veo):
    veo-3.1            Veo 3.1 Standard ($0.40/s, best quality)
    veo-3.1-fast       Veo 3.1 Fast ($0.15/s, quick drafts)
    veo-3              Veo 3.0 Standard ($0.40/s)
    veo-3-fast         Veo 3.0 Fast ($0.15/s)
    veo-2              Veo 2.0 ($0.35/s)

IMAGE OPTIONS:
  --size <size>              Image size (default: 2K for Gemini, 16:9 for others)
                             Replicate: 1:1, 16:9, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 21:9
                             OpenAI: 1024x1024, 1536x1024, 1024x1536
                             Gemini: 1K, 2K, 4K
  --aspect-ratio <ratio>     Aspect ratio for Gemini/Veo (default: 16:9)
  --output <path>            Output path (default: ~/Downloads/art-output.png)
  --reference-image <path>   Reference image for style/character consistency
                             Can specify MULTIPLE times (up to 14 total)
  --transparent              Add transparency instructions to prompt
  --remove-bg                Remove background using remove.bg API
  --add-bg <hex>             Add background color (e.g., "#0a0a0f")
  --thumbnail                Create both transparent + thumbnail versions
  --creative-variations <n>  Generate N variations (1-10)

VIDEO OPTIONS (Veo models only):
  --duration <seconds>       Target duration (default: 8, max: ~148 via extensions)
  --first-frame <path>       Image for first frame
  --last-frame <path>        Image for last frame (Veo 3.1 only)
  --negative-prompt <text>   Elements to exclude from video
  --audio                    Enable AI-generated audio (default: disabled)
  --no-audio                 Silent video (default)
  --resolution <res>         Video resolution: 720p, 1080p, 4K (default: 1080p)
  --extend                   Extend existing video
  --input-video <path>       Video to extend (requires --extend)
  --dry-run                  Estimate cost without generating

  --help, -h                 Show this help

IMAGE EXAMPLES:
  # Technical diagram (recommended)
  bun run Generate.ts --model nano-banana-pro --prompt "..." --size 2K --aspect-ratio 16:9

  # Blog header with thumbnail
  bun run Generate.ts --model nano-banana-pro --prompt "..." --size 2K --aspect-ratio 1:1 --thumbnail

  # Quick draft
  bun run Generate.ts --model nano-banana --prompt "..." --size 16:9

  # MULTIPLE reference images for character consistency
  bun run Generate.ts --model nano-banana-pro --prompt "Person from references at a party..." \\
    --reference-image face1.jpg --reference-image face2.jpg --size 2K

VIDEO EXAMPLES:
  # Quick 8-second draft video
  bun run Generate.ts --model veo-3.1-fast --prompt "..." --output ~/Downloads/video.mp4

  # High-quality video with audio
  bun run Generate.ts --model veo-3.1 --prompt "..." --audio --output ~/Downloads/video.mp4

  # Image-to-video (animate an image)
  bun run Generate.ts --model veo-3.1 --prompt "..." --first-frame ~/Downloads/image.png

  # Extend a video to 30 seconds
  bun run Generate.ts --model veo-3.1 --extend --input-video ~/Downloads/short.mp4 \\
    --duration 30 --prompt "Continue the scene..."

  # Cost estimation before generating
  bun run Generate.ts --model veo-3.1 --prompt "..." --duration 30 --dry-run

VIDEO PRICING (per second):
  veo-3.1:      $0.40/s (720p/1080p), $0.60/s (4K)
  veo-3.1-fast: $0.15/s (720p/1080p), $0.35/s (4K)
  veo-3/veo-2:  $0.35-0.40/s

ENVIRONMENT VARIABLES:
  REPLICATE_API_TOKEN  Required for flux, nano-banana
  GOOGLE_API_KEY       Required for nano-banana-pro, veo-*
  OPENAI_API_KEY       Required for gpt-image-1
  REMOVEBG_API_KEY     Required for --remove-bg

MORE INFO:
  Documentation: ${PAI_DIR}/skills/Art/README.md
  Source: ${PAI_DIR}/skills/Art/Tools/Generate.ts
`);
  process.exit(0);
}

// ============================================================================
// Argument Parsing
// ============================================================================

function parseArgs(argv: string[]): CLIArgs {
  const args = argv.slice(2);

  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    showHelp();
  }

  const parsed: Partial<CLIArgs> = {
    model: DEFAULTS.model,
    size: DEFAULTS.size,
    output: DEFAULTS.output,
  };

  // Collect reference images into array
  const referenceImages: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const flag = args[i];

    if (!flag.startsWith("--")) {
      throw new CLIError(`Invalid flag: ${flag}`);
    }

    const key = flag.slice(2);

    // Boolean flags
    if (key === "transparent") { parsed.transparent = true; continue; }
    if (key === "remove-bg") { parsed.removeBg = true; continue; }
    if (key === "thumbnail") { parsed.thumbnail = true; parsed.removeBg = true; continue; }
    // Video boolean flags
    if (key === "audio") { parsed.audio = true; continue; }
    if (key === "no-audio") { parsed.audio = false; continue; }
    if (key === "extend") { parsed.extend = true; continue; }
    if (key === "dry-run") { parsed.dryRun = true; continue; }

    // Flags with values
    const value = args[i + 1];
    if (!value || value.startsWith("--")) {
      throw new CLIError(`Missing value for: ${flag}`);
    }

    switch (key) {
      case "model":
        if (!ALL_MODELS.includes(value as Model)) {
          throw new CLIError(`Invalid model: ${value}. Valid models: ${ALL_MODELS.join(", ")}`);
        }
        parsed.model = value as Model;
        i++;
        break;
      case "prompt":
        parsed.prompt = value;
        i++;
        break;
      case "size":
        parsed.size = value as Size;
        i++;
        break;
      case "aspect-ratio":
        parsed.aspectRatio = value as ReplicateSize;
        i++;
        break;
      case "output":
        parsed.output = value;
        i++;
        break;
      case "reference-image":
        // Collect multiple reference images into array
        referenceImages.push(value);
        i++;
        break;
      case "creative-variations":
        const n = parseInt(value, 10);
        if (isNaN(n) || n < 1 || n > 10) {
          throw new CLIError(`Invalid creative-variations: ${value}`);
        }
        parsed.creativeVariations = n;
        i++;
        break;
      case "add-bg":
        if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
          throw new CLIError(`Invalid hex color: ${value}`);
        }
        parsed.addBg = value;
        i++;
        break;
      // Video-specific flags
      case "duration":
        const dur = parseInt(value, 10);
        if (isNaN(dur) || dur < 1 || dur > 150) {
          throw new CLIError(`Invalid duration: ${value}. Must be 1-150 seconds.`);
        }
        parsed.duration = dur;
        i++;
        break;
      case "first-frame":
        parsed.firstFrame = value;
        i++;
        break;
      case "last-frame":
        parsed.lastFrame = value;
        i++;
        break;
      case "negative-prompt":
        parsed.negativePrompt = value;
        i++;
        break;
      case "resolution":
        if (!["720p", "1080p", "4K"].includes(value)) {
          throw new CLIError(`Invalid resolution: ${value}. Must be 720p, 1080p, or 4K.`);
        }
        parsed.resolution = value as VideoResolution;
        i++;
        break;
      case "input-video":
        parsed.inputVideo = value;
        i++;
        break;
      default:
        throw new CLIError(`Unknown flag: ${flag}`);
    }
  }

  // Assign collected reference images if any
  if (referenceImages.length > 0) {
    parsed.referenceImages = referenceImages;
  }

  if (!parsed.prompt) throw new CLIError("Missing: --prompt");
  if (!parsed.model) throw new CLIError("Missing: --model");

  // Check if this is a video model
  const isVideo = isVideoModel(parsed.model);

  // Video-specific validation
  if (isVideo) {
    // Set default video output extension
    if (parsed.output === DEFAULTS.output) {
      parsed.output = `${process.env.HOME}/Downloads/art-output.mp4`;
    } else if (!parsed.output.endsWith(".mp4")) {
      parsed.output = parsed.output.replace(/\.[^.]+$/, ".mp4");
    }

    // Set video defaults
    if (!parsed.duration) parsed.duration = DEFAULTS.videoDuration;
    if (!parsed.resolution) parsed.resolution = DEFAULTS.videoResolution;
    if (!parsed.aspectRatio) parsed.aspectRatio = "16:9";
    if (parsed.audio === undefined) parsed.audio = false; // Silent by default

    // Validate video-only flags aren't used with image models
    if (parsed.extend && !parsed.inputVideo) {
      throw new CLIError("--extend requires --input-video");
    }

    // Validate last-frame is only used with veo-3.1 models
    if (parsed.lastFrame && !parsed.model.startsWith("veo-3.1")) {
      throw new CLIError("--last-frame only works with veo-3.1 models");
    }
  } else {
    // Image-specific validation

    // Disallow video-only flags on image models
    if (parsed.duration || parsed.firstFrame || parsed.lastFrame || parsed.negativePrompt ||
        parsed.audio !== undefined || parsed.extend || parsed.inputVideo) {
      throw new CLIError("Video options can only be used with Veo models (veo-3.1, veo-3, veo-2)");
    }

    if (parsed.referenceImages && parsed.referenceImages.length > 0 && parsed.model !== "nano-banana-pro") {
      throw new CLIError("--reference-image only works with nano-banana-pro");
    }

    // Validate reference image count (API limits: 5 human, 6 object, 14 total max)
    if (parsed.referenceImages && parsed.referenceImages.length > 14) {
      throw new CLIError(`Too many reference images: ${parsed.referenceImages.length}. Maximum is 14 total`);
    }

    // Validate size for model (and apply model-specific defaults)
    if (parsed.model === "gpt-image-1") {
      if (!parsed.size || !OPENAI_SIZES.includes(parsed.size as OpenAISize)) {
        parsed.size = "1024x1024"; // Default for OpenAI
      }
    } else if (parsed.model === "nano-banana-pro") {
      if (!parsed.size || !GEMINI_SIZES.includes(parsed.size as GeminiSize)) {
        parsed.size = "2K"; // Default for Gemini
      }
      if (!parsed.aspectRatio) parsed.aspectRatio = "16:9";
    } else {
      // flux or nano-banana (Replicate)
      if (!parsed.size || !REPLICATE_SIZES.includes(parsed.size as ReplicateSize)) {
        parsed.size = "16:9"; // Default for Replicate
      }
    }
  }

  return parsed as CLIArgs;
}

// ============================================================================
// Background Operations
// ============================================================================

async function addBackgroundColor(inputPath: string, outputPath: string, hexColor: string): Promise<void> {
  console.log(`Adding background ${hexColor}...`);
  const command = `magick "${inputPath}" -background "${hexColor}" -flatten "${outputPath}"`;
  try {
    await execAsync(command);
    console.log(`Thumbnail saved: ${outputPath}`);
  } catch (error) {
    throw new CLIError(`Failed to add background: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function removeBackground(imagePath: string): Promise<void> {
  const apiKey = process.env.REMOVEBG_API_KEY;
  if (!apiKey) throw new CLIError("Missing: REMOVEBG_API_KEY");

  console.log("Removing background...");

  const imageBuffer = await readFile(imagePath);
  const formData = new FormData();
  formData.append("image_file", new Blob([imageBuffer]), "image.png");
  formData.append("size", "auto");

  const response = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new CLIError(`remove.bg error: ${response.status} - ${errorText}`);
  }

  const resultBuffer = Buffer.from(await response.arrayBuffer());
  await writeFile(imagePath, resultBuffer);
  console.log("Background removed");
}

// ============================================================================
// Image Generation
// ============================================================================

async function generateWithFlux(prompt: string, size: ReplicateSize, output: string): Promise<void> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new CLIError("Missing: REPLICATE_API_TOKEN");

  const replicate = new Replicate({ auth: token });
  console.log("Generating with Flux 1.1 Pro...");

  const result = await replicate.run("black-forest-labs/flux-1.1-pro", {
    input: {
      prompt,
      aspect_ratio: size,
      output_format: "png",
      output_quality: 95,
      prompt_upsampling: false,
    },
  });

  await writeFile(output, result as any);
  console.log(`Saved: ${output}`);
}

async function generateWithNanoBanana(prompt: string, size: ReplicateSize, output: string): Promise<void> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new CLIError("Missing: REPLICATE_API_TOKEN");

  const replicate = new Replicate({ auth: token });
  console.log("Generating with Nano Banana...");

  const result = await replicate.run("google/nano-banana", {
    input: {
      prompt,
      aspect_ratio: size,
      output_format: "png",
    },
  });

  await writeFile(output, result as any);
  console.log(`Saved: ${output}`);
}

async function generateWithNanoBananaPro(
  prompt: string,
  size: GeminiSize,
  aspectRatio: ReplicateSize,
  output: string,
  referenceImages?: string[]
): Promise<void> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new CLIError("Missing: GOOGLE_API_KEY");

  const ai = new GoogleGenAI({ apiKey });

  if (referenceImages && referenceImages.length > 0) {
    console.log(`Generating with Nano Banana Pro at ${size} ${aspectRatio} with ${referenceImages.length} reference image(s)...`);
  } else {
    console.log(`Generating with Nano Banana Pro at ${size} ${aspectRatio}...`);
  }

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  // Add all reference images if provided
  if (referenceImages && referenceImages.length > 0) {
    for (const referenceImage of referenceImages) {
      const imageBuffer = await readFile(referenceImage);
      const imageBase64 = imageBuffer.toString("base64");
      const ext = extname(referenceImage).toLowerCase();
      const mimeMap: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
      };
      const mimeType = mimeMap[ext];
      if (!mimeType) throw new CLIError(`Unsupported format: ${ext}`);
      parts.push({ inlineData: { mimeType, data: imageBase64 } });
    }
  }

  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: [{ parts }],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio, imageSize: size },
    },
  });

  let imageData: string | undefined;
  if (response.candidates && response.candidates.length > 0) {
    for (const part of (response.candidates[0] as any).content.parts) {
      if (part.inlineData?.data) {
        imageData = part.inlineData.data;
        break;
      }
    }
  }

  if (!imageData) throw new CLIError("No image returned from Gemini");

  await writeFile(output, Buffer.from(imageData, "base64"));
  console.log(`Saved: ${output}`);
}

async function generateWithGPTImage(prompt: string, size: OpenAISize, output: string): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new CLIError("Missing: OPENAI_API_KEY");

  const openai = new OpenAI({ apiKey });
  console.log("Generating with GPT-image-1...");

  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    size,
    n: 1,
  });

  const imageData = (response.data[0] as any).b64_json;
  if (!imageData) throw new CLIError("No image returned from OpenAI");

  await writeFile(output, Buffer.from(imageData, "base64"));
  console.log(`Saved: ${output}`);
}

// ============================================================================
// Video Generation (Veo)
// ============================================================================

interface VeoConfig {
  negativePrompt?: string;
  aspectRatio?: string;
  resolution?: VideoResolution;
  firstFrame?: string;
  lastFrame?: string;
  referenceImages?: string[];
  audio?: boolean;
}

function estimateVideoCost(
  model: VideoModel,
  durationSeconds: number,
  resolution: VideoResolution
): { cost: number; breakdown: string } {
  const pricing = VEO_PRICING[model];
  const is4K = resolution === "4K";
  const pricePerSecond = is4K ? pricing["4k"] : pricing.standard;
  const cost = pricePerSecond * durationSeconds;

  const breakdown = `${model} @ ${resolution}: $${pricePerSecond.toFixed(2)}/s × ${durationSeconds}s = $${cost.toFixed(2)}`;
  return { cost, breakdown };
}

async function loadImageAsBase64(imagePath: string): Promise<{ mimeType: string; data: string }> {
  const imageBuffer = await readFile(imagePath);
  const ext = extname(imagePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
  };
  const mimeType = mimeMap[ext];
  if (!mimeType) throw new CLIError(`Unsupported image format: ${ext}`);
  return { mimeType, data: imageBuffer.toString("base64") };
}

async function generateWithVeo(
  model: VideoModel,
  prompt: string,
  output: string,
  config: VeoConfig
): Promise<void> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new CLIError("Missing: GOOGLE_API_KEY");

  const ai = new GoogleGenAI({ apiKey });
  const veoModelId = VEO_MODELS[model];

  console.log(`Generating video with ${model}...`);
  if (config.firstFrame) console.log(`  First frame: ${config.firstFrame}`);
  if (config.lastFrame) console.log(`  Last frame: ${config.lastFrame}`);
  if (config.negativePrompt) console.log(`  Negative prompt: ${config.negativePrompt}`);
  if (config.audio) console.log(`  Audio: enabled`);

  // Build the generation config
  const generateConfig: Record<string, any> = {
    aspectRatio: config.aspectRatio || "16:9",
  };

  if (config.negativePrompt) {
    generateConfig.negativePrompt = config.negativePrompt;
  }

  // Audio configuration (Veo 3+ supports native audio)
  if (config.audio !== undefined) {
    generateConfig.includeAudio = config.audio;
  }

  // Prepare content parts
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  // Add first frame if provided (image-to-video)
  if (config.firstFrame) {
    const imageData = await loadImageAsBase64(config.firstFrame);
    parts.push({ inlineData: imageData });
  }

  // Add reference images if provided
  if (config.referenceImages && config.referenceImages.length > 0) {
    for (const refImage of config.referenceImages) {
      const imageData = await loadImageAsBase64(refImage);
      parts.push({ inlineData: imageData });
    }
  }

  // Add the prompt
  parts.push({ text: prompt });

  // Start video generation (async operation)
  console.log("Starting video generation (this may take 30-90 seconds)...");

  const operation = await ai.models.generateVideos({
    model: veoModelId,
    prompt,
    config: generateConfig,
    // Note: First frame and reference images are passed via the image field
    ...(config.firstFrame ? { image: await loadImageAsBase64(config.firstFrame) } : {}),
  });

  // Poll for completion
  let result = operation;
  let pollCount = 0;
  const maxPolls = 60; // 20 minutes max (20s intervals)

  while (!result.done && pollCount < maxPolls) {
    await Bun.sleep(20000); // Poll every 20 seconds
    pollCount++;
    console.log(`  Polling... (${pollCount * 20}s elapsed)`);

    // Refresh operation status - pass the operation object, not just the name
    result = await ai.operations.get({ operation: result });
  }

  if (!result.done) {
    throw new CLIError("Video generation timed out after 20 minutes");
  }

  // Extract video data
  const generatedVideos = (result as any).response?.generatedVideos || (result as any).result?.generatedVideos;

  if (!generatedVideos || generatedVideos.length === 0) {
    throw new CLIError("No video returned from Veo");
  }

  const video = generatedVideos[0];

  // Download the video
  let videoBuffer: Buffer;

  if (video.video?.uri) {
    // Video is available via URI - fetch it with auth header
    console.log("Downloading video...");
    const response = await fetch(video.video.uri, {
      headers: { "x-goog-api-key": apiKey },
    });
    if (!response.ok) {
      throw new CLIError(`Failed to download video: ${response.status}`);
    }
    videoBuffer = Buffer.from(await response.arrayBuffer());
  } else if (video.video?.videoBytes) {
    // Video is inline as base64
    videoBuffer = Buffer.from(video.video.videoBytes, "base64");
  } else {
    throw new CLIError("Video data not found in response");
  }

  await writeFile(output, videoBuffer);
  console.log(`Saved: ${output}`);
}

async function extendVideo(
  model: VideoModel,
  inputVideoPath: string,
  prompt: string,
  targetDuration: number,
  output: string,
  config: VeoConfig
): Promise<void> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new CLIError("Missing: GOOGLE_API_KEY");

  const ai = new GoogleGenAI({ apiKey });
  const veoModelId = VEO_MODELS[model];

  // Read the input video
  const inputVideo = await readFile(inputVideoPath);
  let currentVideo = inputVideo;
  let currentDuration = 8; // Assume initial video is 8 seconds
  const extensionDuration = 7; // Each extension adds approximately 7 seconds
  const maxExtensions = 20;

  console.log(`Extending video to ${targetDuration}s (starting from ~${currentDuration}s)...`);

  let extensions = 0;
  while (currentDuration < targetDuration && extensions < maxExtensions) {
    extensions++;
    console.log(`  Extension ${extensions}: ${currentDuration}s -> ${currentDuration + extensionDuration}s`);

    const operation = await ai.models.generateVideos({
      model: veoModelId,
      prompt,
      config: {
        aspectRatio: config.aspectRatio || "16:9",
        includeAudio: config.audio,
        // Extension mode
        extendVideo: true,
      },
      // Pass the current video for extension
      video: {
        videoBytes: currentVideo.toString("base64"),
      },
    });

    // Poll for completion
    let result = operation;
    let pollCount = 0;
    const maxPolls = 60;

    while (!result.done && pollCount < maxPolls) {
      await Bun.sleep(20000);
      pollCount++;
      console.log(`    Polling... (${pollCount * 20}s elapsed)`);

      // Refresh operation status - pass the operation object, not just the name
      result = await ai.operations.get({ operation: result });
    }

    if (!result.done) {
      throw new CLIError(`Extension ${extensions} timed out`);
    }

    // Extract extended video
    const generatedVideos = (result as any).response?.generatedVideos || (result as any).result?.generatedVideos;
    if (!generatedVideos || generatedVideos.length === 0) {
      throw new CLIError(`Extension ${extensions} failed - no video returned`);
    }

    const video = generatedVideos[0];

    if (video.video?.uri) {
      const response = await fetch(video.video.uri, {
        headers: { "x-goog-api-key": apiKey },
      });
      if (!response.ok) {
        throw new CLIError(`Failed to download extended video: ${response.status}`);
      }
      currentVideo = Buffer.from(await response.arrayBuffer());
    } else if (video.video?.videoBytes) {
      currentVideo = Buffer.from(video.video.videoBytes, "base64");
    } else {
      throw new CLIError("Extended video data not found");
    }

    currentDuration += extensionDuration;
  }

  await writeFile(output, currentVideo);
  console.log(`Saved: ${output} (approximately ${currentDuration}s)`);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  try {
    await loadEnv();
    const args = parseArgs(process.argv);

    // Check if this is a video model
    if (isVideoModel(args.model)) {
      // Video generation path
      const videoModel = args.model as VideoModel;

      // Handle dry-run cost estimation
      if (args.dryRun) {
        const duration = args.duration || 8;
        const resolution = args.resolution || "1080p";
        const { breakdown } = estimateVideoCost(videoModel, duration, resolution);
        console.log(`Cost Estimate: ${breakdown}`);

        if (args.extend && args.inputVideo) {
          // Calculate extension costs
          const extensionsNeeded = Math.ceil((duration - 8) / 7);
          const totalCost = estimateVideoCost(videoModel, duration, resolution);
          console.log(`Extensions needed: ${extensionsNeeded}`);
          console.log(`Total estimated cost: $${totalCost.cost.toFixed(2)}`);
        }
        return;
      }

      const veoConfig: VeoConfig = {
        negativePrompt: args.negativePrompt,
        aspectRatio: args.aspectRatio,
        resolution: args.resolution,
        firstFrame: args.firstFrame,
        lastFrame: args.lastFrame,
        referenceImages: args.referenceImages,
        audio: args.audio,
      };

      // Video extension mode
      if (args.extend && args.inputVideo) {
        await extendVideo(
          videoModel,
          args.inputVideo,
          args.prompt,
          args.duration || 30,
          args.output,
          veoConfig
        );
        return;
      }

      // Standard video generation
      await generateWithVeo(videoModel, args.prompt, args.output, veoConfig);

      // If duration > 8, extend the video
      if (args.duration && args.duration > 8) {
        console.log(`\nExtending video to ${args.duration}s...`);
        await extendVideo(
          videoModel,
          args.output,
          args.prompt,
          args.duration,
          args.output,
          veoConfig
        );
      }

      return;
    }

    // Image generation path
    let finalPrompt = args.prompt;
    if (args.transparent) {
      finalPrompt = "CRITICAL: Transparent background (PNG with alpha). " + finalPrompt;
    }

    // Handle variations
    if (args.creativeVariations && args.creativeVariations > 1) {
      console.log(`Generating ${args.creativeVariations} variations...`);
      const basePath = args.output.replace(/\.png$/, "");

      for (let i = 1; i <= args.creativeVariations; i++) {
        const varOutput = `${basePath}-v${i}.png`;
        console.log(`Variation ${i}/${args.creativeVariations}`);

        if (args.model === "flux") {
          await generateWithFlux(finalPrompt, args.size as ReplicateSize, varOutput);
        } else if (args.model === "nano-banana") {
          await generateWithNanoBanana(finalPrompt, args.size as ReplicateSize, varOutput);
        } else if (args.model === "nano-banana-pro") {
          await generateWithNanoBananaPro(finalPrompt, args.size as GeminiSize, args.aspectRatio!, varOutput, args.referenceImages);
        } else if (args.model === "gpt-image-1") {
          await generateWithGPTImage(finalPrompt, args.size as OpenAISize, varOutput);
        }
      }
      console.log(`Generated ${args.creativeVariations} variations`);
      return;
    }

    // Single image generation
    if (args.model === "flux") {
      await generateWithFlux(finalPrompt, args.size as ReplicateSize, args.output);
    } else if (args.model === "nano-banana") {
      await generateWithNanoBanana(finalPrompt, args.size as ReplicateSize, args.output);
    } else if (args.model === "nano-banana-pro") {
      await generateWithNanoBananaPro(finalPrompt, args.size as GeminiSize, args.aspectRatio!, args.output, args.referenceImages);
    } else if (args.model === "gpt-image-1") {
      await generateWithGPTImage(finalPrompt, args.size as OpenAISize, args.output);
    }

    // Post-processing (image only)
    if (args.removeBg) {
      await removeBackground(args.output);
    }

    if (args.addBg && !args.thumbnail) {
      const tempPath = args.output.replace(/\.png$/, "-temp.png");
      await addBackgroundColor(args.output, tempPath, args.addBg);
      const { rename } = await import("node:fs/promises");
      await rename(tempPath, args.output);
    }

    if (args.thumbnail) {
      const thumbPath = args.output.replace(/\.png$/, "-thumb.png");
      const THUMB_BG = "#0a0a0f"; // Dark background for thumbnails
      await addBackgroundColor(args.output, thumbPath, THUMB_BG);
      console.log(`\nCreated both versions:`);
      console.log(`  Transparent: ${args.output}`);
      console.log(`  Thumbnail:   ${thumbPath}`);
    }
  } catch (error) {
    handleError(error);
  }
}

main();
