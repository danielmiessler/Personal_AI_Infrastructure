#!/usr/bin/env bun

/**
 * generate - Image Generation CLI
 *
 * Generate images using Flux 1.1 Pro, Nano Banana, Nano Banana Pro, or GPT-image-1.
 * Follows deterministic, composable CLI design.
 *
 * Usage:
 *   bun run Generate.ts --model nano-banana-pro --prompt "..." --size 2K --output /tmp/image.png
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

type Model = "flux" | "nano-banana" | "nano-banana-pro" | "gpt-image-1";
type ReplicateSize = "1:1" | "16:9" | "3:2" | "2:3" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "21:9";
type OpenAISize = "1024x1024" | "1536x1024" | "1024x1536";
type GeminiSize = "1K" | "2K" | "4K";
type Size = ReplicateSize | OpenAISize | GeminiSize;

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
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULTS = {
  model: "nano-banana-pro" as Model,
  size: "2K" as Size,
  output: `${process.env.HOME}/Downloads/art-output.png`,
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
generate - Image Generation CLI

Generate images using Flux, Nano Banana, Nano Banana Pro, or GPT-image-1.

USAGE:
  bun run Generate.ts --model <model> --prompt "<prompt>" [OPTIONS]

REQUIRED:
  --model <model>      Model: flux, nano-banana, nano-banana-pro, gpt-image-1
  --prompt <text>      Image generation prompt

OPTIONS:
  --size <size>              Image size (default: 2K for Gemini, 16:9 for others)
                             Replicate: 1:1, 16:9, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 21:9
                             OpenAI: 1024x1024, 1536x1024, 1024x1536
                             Gemini: 1K, 2K, 4K
  --aspect-ratio <ratio>     Aspect ratio for Gemini (default: 16:9)
  --output <path>            Output path (default: ~/Downloads/art-output.png)
  --reference-image <path>   Reference image for style/character consistency (nano-banana-pro only)
                             Can specify MULTIPLE times for improved consistency
                             API Limits: Up to 5 human refs, 6 object refs, 14 total max
  --transparent              Add transparency instructions to prompt
  --remove-bg                Remove background using remove.bg API
  --add-bg <hex>             Add background color (e.g., "#0a0a0f")
  --thumbnail                Create both transparent + thumbnail versions
  --creative-variations <n>  Generate N variations (1-10)
  --help, -h                 Show this help

EXAMPLES:
  # Technical diagram (recommended)
  bun run Generate.ts --model nano-banana-pro --prompt "..." --size 2K --aspect-ratio 16:9

  # Blog header with thumbnail
  bun run Generate.ts --model nano-banana-pro --prompt "..." --size 2K --aspect-ratio 1:1 --thumbnail

  # Quick draft
  bun run Generate.ts --model nano-banana --prompt "..." --size 16:9

  # MULTIPLE reference images for character consistency (nano-banana-pro only)
  bun run Generate.ts --model nano-banana-pro --prompt "Person from references at a party..." \\
    --reference-image face1.jpg --reference-image face2.jpg --reference-image face3.jpg \\
    --size 2K --aspect-ratio 16:9

MULTI-REFERENCE LIMITS (Gemini API):
  - Up to 5 human reference images for character consistency
  - Up to 6 object reference images
  - Maximum 14 total reference images per request

ENVIRONMENT VARIABLES:
  REPLICATE_API_TOKEN  Required for flux, nano-banana
  GOOGLE_API_KEY       Required for nano-banana-pro
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

    // Flags with values
    const value = args[i + 1];
    if (!value || value.startsWith("--")) {
      throw new CLIError(`Missing value for: ${flag}`);
    }

    switch (key) {
      case "model":
        if (!["flux", "nano-banana", "nano-banana-pro", "gpt-image-1"].includes(value)) {
          throw new CLIError(`Invalid model: ${value}`);
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

  if (parsed.referenceImages && parsed.referenceImages.length > 0 && parsed.model !== "nano-banana-pro") {
    throw new CLIError("--reference-image only works with nano-banana-pro");
  }

  // Validate reference image count (API limits: 5 human, 6 object, 14 total max)
  if (parsed.referenceImages && parsed.referenceImages.length > 14) {
    throw new CLIError(`Too many reference images: ${parsed.referenceImages.length}. Maximum is 14 total`);
  }

  // Validate size for model
  if (parsed.model === "gpt-image-1" && !OPENAI_SIZES.includes(parsed.size as OpenAISize)) {
    throw new CLIError(`Invalid size for gpt-image-1: ${parsed.size}`);
  } else if (parsed.model === "nano-banana-pro") {
    if (!GEMINI_SIZES.includes(parsed.size as GeminiSize)) {
      throw new CLIError(`Invalid size for nano-banana-pro: ${parsed.size}`);
    }
    if (!parsed.aspectRatio) parsed.aspectRatio = "16:9";
  } else if (!REPLICATE_SIZES.includes(parsed.size as ReplicateSize)) {
    throw new CLIError(`Invalid size: ${parsed.size}`);
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
// Main
// ============================================================================

async function main(): Promise<void> {
  try {
    await loadEnv();
    const args = parseArgs(process.argv);

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

    // Post-processing
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
