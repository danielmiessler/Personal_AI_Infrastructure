#!/usr/bin/env bun
// Normalize env path vars Claude Code may inject unexpanded — literal $HOME/${HOME}
// in LIFEOS_DIR/LIFEOS_CONFIG_DIR/PROJECTS_DIR resolves to a shadow dir (#1404 / PR #1451, author jbmml).
for (const __k of ["LIFEOS_DIR", "LIFEOS_CONFIG_DIR", "PROJECTS_DIR"]) {
  const __v = process.env[__k];
  if (__v && /^\$\{?HOME\}?(\/|$)/.test(__v)) process.env[__k] = __v.replace(/^\$\{?HOME\}?/, process.env.HOME ?? "~");
}


/**
 * generate - UL Image Generation CLI
 *
 * Generate branded images using Nano Banana Pro (default), Nano Banana, or Flux 1.1 Pro.
 * Nano Banana Pro (Gemini 3 Pro Image) is the default and the only model used for editorial
 * headers. OpenAI image models were removed 2026-07-30 at the principal's direction.
 *
 * Follows llcli pattern for deterministic, composable CLI design.
 *
 * Usage:
 *   generate --model nano-banana-pro --prompt "..." --size 16:9 --output /tmp/image.png
 *
 * @see ~/.claude/skills/Art/SKILL.md
 */

import Replicate from "replicate";
import { GoogleGenAI } from "@google/genai";
import { writeFile, readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

// ============================================================================
// Environment Loading
// ============================================================================

/**
 * Load environment variables from ${LIFEOS_DIR}/.env
 * This ensures API keys are available regardless of how the CLI is invoked
 */
async function loadEnv(): Promise<void> {
  // The canonical .env lives at ~/.claude/.env — LIFEOS_DIR often points at the
  // ~/.claude/LIFEOS SUBdirectory, which has no .env, and the silent catch made
  // present keys invisible (public issue #1515, @xmasyx). Try LIFEOS_DIR first,
  // then the canonical location; load the first that exists.
  const home = process.env.HOME!;
  const candidates = Array.from(new Set([
    ...(process.env.LIFEOS_DIR ? [resolve(process.env.LIFEOS_DIR, '.env')] : []),
    resolve(home, '.claude', '.env'),
  ]));
  for (const envPath of candidates) {
    let envContent: string;
    try {
      envContent = await readFile(envPath, 'utf-8');
    } catch {
      continue; // not here — try the next candidate
    }
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      // Only set if not already defined (allow overrides from shell)
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
    break; // loaded one — done
  }

  // Canonical key aliases — the user's .env may use _OPTIN suffix variants for some
  // providers (data-usage opt-in keys). Tools that look up the bare name
  // must transparently get the OPTIN value when no bare key is set.
  // Add new aliases here when a provider has a suffix variant in the env.
  const aliases: Record<string, string> = {
    OPENAI_API_KEY: "OPENAI_API_KEY_OPTIN",
  };
  for (const [bare, suffixed] of Object.entries(aliases)) {
    if (!process.env[bare] && process.env[suffixed]) {
      process.env[bare] = process.env[suffixed];
    }
  }
}

// ============================================================================
// Types
// ============================================================================

type Model = "flux" | "nano-banana" | "nano-banana-pro";
type ReplicateSize = "1:1" | "16:9" | "3:2" | "2:3" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "21:9";
type GeminiSize = "1K" | "2K" | "4K";
type Size = ReplicateSize | GeminiSize;

interface CLIArgs {
  model: Model;
  prompt: string;
  size: Size;
  output: string;
  creativeVariations?: number;
  aspectRatio?: ReplicateSize; // For Gemini models (nano-banana-pro)
  transparent?: boolean; // Enable transparent background
  referenceImages?: string[]; // Reference image paths (Nano Banana Pro only) - up to 14 total
  removeBg?: boolean; // Remove background after generation using local rembg
  addBg?: string; // Add background color (hex) to transparent image
  thumbnail?: boolean; // Generate additional thumbnail with #EAE9DF background for social previews
  workflow?: string; // Name of the Art workflow that constructed this call (REQUIRED unless freeformConfirmed)
  freeformConfirmed?: boolean; // Explicit opt-out of workflow discipline — logged to stderr
  signature?: boolean; // Stamp the required "{{DA_NAME}}" signature (auto-on for Essay/blog-header; --no-signature opts out)
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULTS = {
  model: "nano-banana-pro" as Model,
  size: "2K" as Size,
  // LIFEOS_DOWNLOADS_DIR overrides ~/Downloads when set (public PR #1535, @anikinsasha)
  output: `${process.env.LIFEOS_DOWNLOADS_DIR || `${process.env.HOME}/Downloads`}/ul-image.png`,
};

const REPLICATE_SIZES: ReplicateSize[] = ["1:1", "16:9", "3:2", "2:3", "3:4", "4:3", "4:5", "5:4", "9:16", "21:9"];
const GEMINI_SIZES: GeminiSize[] = ["1K", "2K", "4K"];

// Aspect ratio mapping for Gemini (used with image size like 2K)
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
    console.error(`❌ Error: ${error.message}`);
    process.exit(error.exitCode);
  }

  if (error instanceof Error) {
    console.error(`❌ Unexpected error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }

  console.error(`❌ Unknown error:`, error);
  process.exit(1);
}

// ============================================================================
// Image Format Detection
// ============================================================================

/**
 * Detect actual image format from magic bytes.
 * Prevents MIME type mismatch when API returns different format than requested.
 */
function detectImageFormat(data: Buffer | Uint8Array): { format: string; ext: string; mime: string } | null {
  if (data.length < 12) return null;
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47)
    return { format: "png", ext: ".png", mime: "image/png" };
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff)
    return { format: "jpeg", ext: ".jpg", mime: "image/jpeg" };
  if (data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46 &&
      data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50)
    return { format: "webp", ext: ".webp", mime: "image/webp" };
  if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46)
    return { format: "gif", ext: ".gif", mime: "image/gif" };
  return null;
}

/**
 * Save image data with correct file extension based on actual content format.
 * Returns the final path (may differ from requested if format mismatch detected).
 */
async function saveImage(data: Buffer | Uint8Array | any, requestedPath: string): Promise<string> {
  const buffer = data instanceof Buffer ? data : Buffer.from(data as any);
  const detected = detectImageFormat(buffer);
  if (detected) {
    const requestedExt = extname(requestedPath).toLowerCase();
    if (requestedExt && requestedExt !== detected.ext) {
      const correctedPath = requestedPath.replace(/\.[^.]+$/, detected.ext);
      console.warn(`⚠️ API returned ${detected.format.toUpperCase()} data (requested ${requestedExt.slice(1).toUpperCase()}). Saving as ${correctedPath}`);
      await writeFile(correctedPath, buffer);
      return correctedPath;
    }
  }
  await writeFile(requestedPath, buffer);
  return requestedPath;
}

/**
 * Detect MIME type from image file content (magic bytes), falling back to extension.
 */
async function detectMimeType(filePath: string): Promise<string> {
  try {
    const data = await readFile(filePath);
    const detected = detectImageFormat(data);
    if (detected) return detected.mime;
  } catch {
    // Fall through to extension-based detection
  }
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case ".png": return "image/png";
    case ".jpg": case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    default: throw new CLIError(`Unsupported image format: ${ext}. Supported: .png, .jpg, .jpeg, .webp`);
  }
}

// ============================================================================
// Help Text
// ============================================================================

// LifeOS directory for documentation paths
const LIFEOS_DIR = process.env.LIFEOS_DIR || `${process.env.HOME}/.claude`;

function showHelp(): void {
  console.log(`
generate - UL Image Generation CLI

Generate branded images using Nano Banana Pro, Nano Banana, or Flux 1.1 Pro.
Nano Banana Pro (Gemini 3 Pro Image) is the DEFAULT model and the only one used for editorial
headers. OpenAI image models (gpt-image-1, gpt-image-2) and the dual-provider "compare" mode
were removed 2026-07-30 at the principal's direction.

USAGE:
  generate --model <model> --prompt "<prompt>" [OPTIONS]

REQUIRED:
  --prompt <text>      Image generation prompt (quote if contains spaces)

OPTIONS:
  --model <model>            Model to use: nano-banana-pro (default), nano-banana, flux
  --size <size>              Image size/aspect ratio (default varies by model)
                             Gemini (nano-banana-pro): 1K, 2K, 4K (resolution) — DEFAULT 2K
                             Replicate (flux, nano-banana): 1:1, 16:9, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 21:9
  --aspect-ratio <ratio>     Aspect ratio for Gemini nano-banana-pro
                             Options: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9 (default 16:9)
  --output <path>            Output file path (default: /tmp/ul-image.png)
  --reference-image <path>   Reference image for style/character consistency (Nano Banana Pro only)
                             Can specify MULTIPLE times for improved consistency
                             Accepts: PNG, JPEG, WebP images
                             API Limits: Up to 5 human refs, 6 object refs, 14 total max
  --transparent              Enable transparent background (adds transparency instructions to prompt)
                             Note: Not all models support transparency natively; may require post-processing
  --remove-bg                Remove background after generation using local rembg
                             Creates true transparency by removing the generated background
  --add-bg <hex>             Add background color to a transparent image (e.g., "#EAE9DF")
                             Useful for creating thumbnails/social previews from transparent images
  --thumbnail                Generate BOTH transparent AND thumbnail versions for blog headers
                             Creates: output.png (transparent) + output-thumb.png (#EAE9DF background)
                             Automatically enables --remove-bg
  --no-signature             Skip the "{{DA_NAME}}" signature stamp (auto-on for Essay/--thumbnail headers)
  --signature                Force the "{{DA_NAME}}" signature stamp on (bottom-right, SignPainter-HouseScript cursive)
  --creative-variations <n>  Generate N variations (appends -v1, -v2, etc. to output filename)
                             Use with the be-creative skill for true prompt diversity
                             CLI mode: generates N images with same prompt (tests model variability)
  --help, -h                 Show this help message

EXAMPLES:
  # Generate blog header with Nano Banana Pro (16:9, 2K quality)
  generate --model nano-banana-pro --prompt "Abstract UL illustration..." --size 2K --aspect-ratio 16:9

  # Generate high-res 4K image with Nano Banana Pro
  generate --model nano-banana-pro --prompt "Editorial cover..." --size 4K --aspect-ratio 3:2

  # Generate blog header with original Nano Banana (16:9)
  generate --model nano-banana --prompt "Abstract UL illustration..." --size 16:9

  # Generate square image with Flux
  generate --model flux --prompt "Minimal geometric art..." --size 1:1 --output /tmp/header.png

  # Generate at full 4K
  generate --model nano-banana-pro --prompt "Editorial cover..." --size 4K --aspect-ratio 3:2

  # Generate 3 creative variations (for testing model variability)
  generate --model nano-banana-pro --prompt "..." --creative-variations 3 --output /tmp/essay.png
  # Outputs: /tmp/essay-v1.png, /tmp/essay-v2.png, /tmp/essay-v3.png

  # Single reference image for style guidance (Nano Banana Pro only)
  generate --model nano-banana-pro --prompt "Tokyo Night themed illustration..." \\
    --reference-image /tmp/style-reference.png --size 2K --aspect-ratio 16:9

  # MULTIPLE reference images for character consistency (Nano Banana Pro only)
  generate --model nano-banana-pro --prompt "Person from references at a party..." \\
    --reference-image face1.jpg --reference-image face2.jpg --reference-image face3.jpg \\
    --size 2K --aspect-ratio 16:9

NOTE: For true creative diversity with different prompts, use the creative workflow which
integrates the be-creative skill. CLI creative mode generates multiple images with the SAME prompt.

MULTI-REFERENCE LIMITS (Gemini API):
  - Up to 5 human reference images for character consistency
  - Up to 6 object reference images
  - Maximum 14 total reference images per request

ENVIRONMENT VARIABLES:
  GOOGLE_API_KEY       Required for nano-banana-pro (the default model)
  REPLICATE_API_TOKEN  Required for flux and nano-banana models
  REMBG_BIN            Optional override for rembg binary path (default: ~/.local/bin/rembg)

ERROR CODES:
  0  Success
  1  General error (invalid arguments, API error, file write error)

MORE INFO:
  Documentation: ${LIFEOS_DIR}/skills/Art/README.md
  Source: ${LIFEOS_DIR}/skills/Art/Tools/Generate.ts
`);
  process.exit(0);
}

// ============================================================================
// Workflow Discipline Gate
// ============================================================================

/**
 * Enforce that callers either name the Art workflow that produced this
 * invocation OR explicitly opt out via --freeform-confirmed.
 *
 * Background: the Art skill's "ALWAYS RUN A NAMED WORKFLOW" doctrine used
 * to live in markdown only and was silently ignored — see ISA
 * 20260430-180000_art-skill-freeform-enforcement. This gate is the code
 * substitute for that doctrine.
 *
 * Behavior:
 *   --workflow=<name>       → validate <name>.md exists, allow.
 *   --workflow <name>       → same.
 *   --freeform-confirmed    → log explicit opt-out to stderr, allow.
 *   neither                 → exit 1 with the workflow lookup table.
 *   --workflow=<bad-name>   → exit 1 listing valid workflow names.
 */
function enforceWorkflowDiscipline(parsed: Partial<CLIArgs>): void {
  const workflowsDir = `${process.env.HOME}/.claude/skills/Art/Workflows`;
  let availableWorkflows: string[] = [];
  try {
    // readdirSync via Bun.readdirSync isn't a thing; use Node fs sync via dynamic
    // require to avoid adding a top-level import that would pull in fs at load.
    const fs = require("node:fs") as typeof import("node:fs");
    availableWorkflows = fs
      .readdirSync(workflowsDir)
      .filter((f: string) => f.endsWith(".md"))
      .map((f: string) => f.replace(/\.md$/, ""))
      .sort();
  } catch (err) {
    // If the workflows dir is gone, the skill is broken in a bigger way;
    // don't try to fix that here, but don't block on it either.
    process.stderr.write(
      `[Generate] WARNING: workflows dir not readable at ${workflowsDir} — skipping workflow validation\n`
    );
    return;
  }

  if (parsed.freeformConfirmed) {
    process.stderr.write(
      `[Generate] FREEFORM mode confirmed by caller (--freeform-confirmed). ` +
        `This is logged for audit. The Art skill's named workflows ` +
        `(${availableWorkflows.join(", ")}) are the recommended path; ` +
        `freeform output quality has historically been rejected.\n`
    );
    return;
  }

  if (!parsed.workflow) {
    const lines = [
      "",
      "═══════════════════════════════════════════════════════════════════════════",
      "  Generate.ts REFUSED — caller did not name a workflow.",
      "═══════════════════════════════════════════════════════════════════════════",
      "",
      "  The Art skill requires every image generation to run through a named",
      "  workflow. Freeform prompts have a documented rejection rate of ~100%.",
      "",
      "  Pass ONE of:",
      "    --workflow=<name>          (recommended)",
      "    --freeform-confirmed       (explicit opt-out, logged for audit)",
      "",
      "  Available workflows:",
      ...availableWorkflows.map(
        (w) => `    --workflow=${w.padEnd(28)} → ${workflowsDir}/${w}.md`
      ),
      "",
      "  Read the matching workflow file FIRST. Each one encodes the",
      "  prompt template, palette, composition rules, and validation gate",
      "  that the bare model fails to honor without them.",
      "",
      "═══════════════════════════════════════════════════════════════════════════",
      "",
    ];
    process.stderr.write(lines.join("\n"));
    process.exit(1);
  }

  // Validate the named workflow actually exists on disk.
  if (!availableWorkflows.includes(parsed.workflow)) {
    const lines = [
      "",
      `[Generate] REFUSED — workflow "${parsed.workflow}" not found.`,
      "",
      "Available workflows:",
      ...availableWorkflows.map((w) => `  --workflow=${w}`),
      "",
    ];
    process.stderr.write(lines.join("\n"));
    process.exit(1);
  }
}

// ============================================================================
// Argument Parsing
// ============================================================================

function parseArgs(argv: string[]): CLIArgs {
  const args = argv.slice(2);

  // Check for help flag
  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    showHelp();
  }

  const parsed: Partial<CLIArgs> = {
    model: DEFAULTS.model,
    output: DEFAULTS.output,
  };

  // Collect reference images into array
  const referenceImages: string[] = [];

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];

    if (!flag.startsWith("--")) {
      throw new CLIError(`Invalid flag: ${flag}. Flags must start with --`);
    }

    const key = flag.slice(2);

    // Handle boolean flags (no value)
    if (key === "transparent") {
      parsed.transparent = true;
      continue;
    }
    if (key === "remove-bg") {
      parsed.removeBg = true;
      continue;
    }
    if (key === "thumbnail") {
      parsed.thumbnail = true;
      parsed.removeBg = true; // Thumbnail mode requires remove-bg
      continue;
    }
    if (key === "signature") {
      parsed.signature = true;
      continue;
    }
    if (key === "no-signature") {
      parsed.signature = false;
      continue;
    }
    if (key === "freeform-confirmed") {
      parsed.freeformConfirmed = true;
      continue;
    }

    // --workflow=<name> (one-token form) — split here so it doesn't fall into the
    // value-required branch below.
    if (key.startsWith("workflow=")) {
      parsed.workflow = key.slice("workflow=".length);
      continue;
    }

    // Handle flags with values
    const value = args[i + 1];
    if (!value || value.startsWith("--")) {
      throw new CLIError(`Missing value for flag: ${flag}`);
    }

    switch (key) {
      case "model":
        if (
          value !== "flux" &&
          value !== "nano-banana" &&
          value !== "nano-banana-pro"
        ) {
          if (value === "gpt-image-1" || value === "gpt-image-2" || value === "compare") {
            throw new CLIError(
              `OpenAI image models and compare mode were REMOVED 2026-07-30 at the principal's direction. Use --model nano-banana-pro (the default).`
            );
          }
          throw new CLIError(
            `Invalid model: ${value}. Must be: nano-banana-pro, nano-banana, or flux`
          );
        }
        parsed.model = value;
        i++; // Skip next arg (value)
        break;
      case "prompt":
        parsed.prompt = value;
        i++; // Skip next arg (value)
        break;
      case "size":
        parsed.size = value as Size;
        i++; // Skip next arg (value)
        break;
      case "aspect-ratio":
        parsed.aspectRatio = value as ReplicateSize;
        i++; // Skip next arg (value)
        break;
      case "output":
        parsed.output = value;
        i++; // Skip next arg (value)
        break;
      case "reference-image":
        // Collect multiple reference images into array
        referenceImages.push(value);
        i++; // Skip next arg (value)
        break;
      case "creative-variations":
        const variations = parseInt(value, 10);
        if (isNaN(variations) || variations < 1 || variations > 10) {
          throw new CLIError(`Invalid creative-variations: ${value}. Must be 1-10`);
        }
        parsed.creativeVariations = variations;
        i++; // Skip next arg (value)
        break;
      case "add-bg":
        // Validate hex color format
        if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
          throw new CLIError(`Invalid hex color: ${value}. Must be in format #RRGGBB (e.g., #EAE9DF)`);
        }
        parsed.addBg = value;
        i++; // Skip next arg (value)
        break;
      case "workflow":
        // --workflow <name> two-token form (the --workflow=<name> one-token
        // form is handled earlier, before this value-required branch)
        parsed.workflow = value;
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

  // Validate required arguments
  if (!parsed.prompt) {
    throw new CLIError("Missing required argument: --prompt");
  }

  if (!parsed.model) {
    throw new CLIError("Missing required argument: --model");
  }

  // ──────────────────────────────────────────────────────────────────────
  // WORKFLOW DISCIPLINE GATE (the load-bearing line — see ISA
  // 20260430-180000_art-skill-freeform-enforcement)
  //
  // The Art skill's "ALWAYS RUN A NAMED WORKFLOW" doctrine lives HERE, in code, because
  // stated in markdown alone it is silently ignored. Callers must name the workflow that
  // produced this call, or explicitly opt out with --freeform-confirmed.
  // ──────────────────────────────────────────────────────────────────────
  enforceWorkflowDiscipline(parsed);

  // Validate reference-image is only used with nano-banana-pro
  if (parsed.referenceImages && parsed.referenceImages.length > 0 && parsed.model !== "nano-banana-pro") {
    throw new CLIError("--reference-image is only supported with --model nano-banana-pro");
  }

  // Validate reference image count (API limits: 5 human, 6 object, 14 total max)
  if (parsed.referenceImages && parsed.referenceImages.length > 14) {
    throw new CLIError(`Too many reference images: ${parsed.referenceImages.length}. Maximum is 14 total (5 human, 6 object)`);
  }

  // Set model-appropriate default size if not explicitly provided
  if (!parsed.size) {
    switch (parsed.model) {
      case "nano-banana-pro":
        parsed.size = "2K";
        break;
      default: // flux, nano-banana
        parsed.size = "16:9";
        break;
    }
  }

  // Validate size based on model
  if (parsed.model === "nano-banana-pro") {
    if (!GEMINI_SIZES.includes(parsed.size as GeminiSize)) {
      throw new CLIError(`Invalid size for nano-banana-pro: ${parsed.size}. Must be: ${GEMINI_SIZES.join(", ")}`);
    }
    // Validate aspect ratio if provided
    if (parsed.aspectRatio && !GEMINI_ASPECT_RATIOS.includes(parsed.aspectRatio)) {
      throw new CLIError(`Invalid aspect-ratio for nano-banana-pro: ${parsed.aspectRatio}. Must be: ${GEMINI_ASPECT_RATIOS.join(", ")}`);
    }
    // Default to 16:9 if not specified
    if (!parsed.aspectRatio) {
      parsed.aspectRatio = "16:9";
    }
  } else {
    if (!REPLICATE_SIZES.includes(parsed.size as ReplicateSize)) {
      throw new CLIError(`Invalid size for ${parsed.model}: ${parsed.size}. Must be: ${REPLICATE_SIZES.join(", ")}`);
    }
  }

  return parsed as CLIArgs;
}

// ============================================================================
// Prompt Enhancement
// ============================================================================

function enhancePromptForTransparency(prompt: string): string {
  const transparencyPrefix = "CRITICAL: Transparent background (PNG with alpha channel) - NO background color, pure transparency. Object floating in transparent space. ";
  return transparencyPrefix + prompt;
}

// ============================================================================
// Background Removal
// ============================================================================

import { exec } from "node:child_process";
import { promisify } from "node:util";

// Normalize env path vars that Claude Code injects without shell expansion (LifeOS#1404)
for (const k of ["LIFEOS_DIR", "LIFEOS_CONFIG_DIR", "PROJECTS_DIR"]) {
  const v = process.env[k];
  if (v && /^\$\{?HOME\}?(\/|$)/.test(v)) process.env[k] = v.replace(/^\$\{?HOME\}?/, process.env.HOME ?? "~");
}


const execAsync = promisify(exec);

// ============================================================================
// Background Operations
// ============================================================================

/**
 * Add a solid background color to a transparent PNG image
 * Uses ImageMagick to composite the transparent image onto a colored background
 */
async function addBackgroundColor(inputPath: string, outputPath: string, hexColor: string): Promise<void> {
  console.log(`🎨 Adding background color ${hexColor} to image...`);

  // Use ImageMagick to composite the transparent image onto a colored background
  // -background sets the fill color, -flatten composites onto that background
  const command = `magick "${inputPath}" -background "${hexColor}" -flatten "${outputPath}"`;

  try {
    await execAsync(command);
    console.log(`✅ Thumbnail saved to ${outputPath}`);
  } catch (error) {
    throw new CLIError(`Failed to add background color: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Stamp the REQUIRED "{{DA_NAME}}" signature on a blog-header/essay image, in place.
 * Principal directives 2026-06-20 + 2026-07-09: every essay/blog-header image
 * MUST be signed "{{DA_NAME}}", bottom-right, in a cursive human-signature hand
 * (SignPainter-HouseScript) — small and integrated into the artwork, not a
 * caption floating in the corner. Formal calligraphy faces (Snell, Chancery,
 * Savoye) remain banned. Stamped here, on the main output, BEFORE the
 * thumbnail is derived, so the signature lands on BOTH versions.
 * Pointsize scales with image width so it reads at any resolution.
 */
async function stampDaSignature(imagePath: string): Promise<void> {
  // Derive pointsize from the image width (≈3% of width; 1024px → ~31pt —
  // 2026-07-09: reduced from 4.5% so it reads as a painter's mark, not a label).
  let pointsize = 31;
  try {
    const { stdout } = await execAsync(`identify -format "%w" "${imagePath}"`);
    const width = parseInt(stdout.trim(), 10);
    if (Number.isFinite(width) && width > 0) {
      pointsize = Math.max(20, Math.round(width * 0.03));
    }
  } catch {
    // Non-fatal — fall back to the 31pt default tuned for 1024px-wide headers.
  }

  console.log('✍️  Stamping required "{{DA_NAME}}" signature (bottom-right, SignPainter-HouseScript, cursive)...');
  // Slight CCW rotation + tucked offset makes it sit like a hand-signed mark
  // inside the composition's lower-right rather than a corner caption.
  const command =
    `magick "${imagePath}" -gravity SouthEast ` +
    `-font "SignPainter-HouseScript" -pointsize ${pointsize} -fill "rgba(55,45,38,0.55)" ` +
    `-annotate 352x352+44+30 "{{DA_NAME}}" "${imagePath}"`;

  try {
    await execAsync(command);
    console.log("✅ Signature stamped");
  } catch (error) {
    throw new CLIError(
      `Failed to stamp {{DA_NAME}} signature: ${error instanceof Error ? error.message : String(error)}. ` +
        `SignPainter-HouseScript must be installed (default on macOS). Override font via the workflow if needed.`
    );
  }
}

async function removeBackground(imagePath: string): Promise<string> {
  const home = process.env.HOME;
  if (!home) throw new CLIError("HOME not set; cannot resolve rembg binary");
  const rembgBin = process.env.REMBG_BIN || resolve(home, ".local/bin/rembg");

  const { existsSync } = await import("node:fs");
  if (!existsSync(rembgBin)) {
    throw new CLIError(
      `rembg not found at ${rembgBin}. Install: pipx install rembg (or set REMBG_BIN env var to override path).`
    );
  }

  console.log("🔲 Removing background with local rembg...");

  // rembg always emits PNG. Force the output path to .png so we don't end up
  // with PNG bytes inside a .jpg extension.
  const currentExt = extname(imagePath).toLowerCase();
  const finalPath = currentExt === ".png" ? imagePath : imagePath.replace(/\.[^.]+$/, ".png");

  // rembg truncates output before reading input, so input == output corrupts
  // the file. Always write to a temp path, then rename.
  const tempPath = finalPath.replace(/\.png$/, `.rembg-tmp.png`);

  const { spawn } = await import("node:child_process");
  await new Promise<void>((resolveFn, rejectFn) => {
    const proc = spawn(rembgBin, ["i", imagePath, tempPath], { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    proc.on("error", (err) => rejectFn(new CLIError(`Failed to launch rembg: ${err.message}`)));
    proc.on("close", (code) => {
      if (code === 0) resolveFn();
      else rejectFn(new CLIError(`rembg exited ${code}: ${stderr.trim()}`));
    });
  });

  const { unlink, rename } = await import("node:fs/promises");
  // Drop the original (whether .jpg or the .png we're about to overwrite)
  try { await unlink(imagePath); } catch {}
  await rename(tempPath, finalPath);

  if (finalPath !== imagePath) {
    console.log(`   ↪ renamed ${currentExt} → .png (transparency requires PNG): ${finalPath}`);
  }

  // Validate output is actually PNG with alpha
  const result = await readFile(finalPath);
  const detected = detectImageFormat(result);
  if (!detected || detected.format !== "png") {
    throw new CLIError(
      `rembg produced non-PNG output (got ${detected?.format ?? "unknown"}). Transparency requires PNG.`
    );
  }

  console.log("✅ Background removed successfully");
  return finalPath;
}

// ============================================================================
// Image Generation
// ============================================================================

async function generateWithFlux(prompt: string, size: ReplicateSize, output: string): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new CLIError("Missing environment variable: REPLICATE_API_TOKEN");
  }

  const replicate = new Replicate({ auth: token });

  console.log("🎨 Generating with Flux 1.1 Pro...");

  const result = await replicate.run("black-forest-labs/flux-1.1-pro", {
    input: {
      prompt,
      aspect_ratio: size,
      output_format: "png",
      output_quality: 95,
      prompt_upsampling: false,
    },
  });

  // Replicate SDK may return a FileOutput object with a url() method or toString()
  let imageData: Buffer;
  if (result && typeof (result as any).blob === "function") {
    // FileOutput (Replicate SDK v1+) — has blob() method
    const blob = await (result as any).blob();
    imageData = Buffer.from(await blob.arrayBuffer());
  } else if (result && typeof (result as any).url === "function") {
    const url = (result as any).url().href ?? (result as any).url();
    const resp = await fetch(url);
    imageData = Buffer.from(await resp.arrayBuffer());
  } else if (result && typeof (result as any).arrayBuffer === "function") {
    imageData = Buffer.from(await (result as any).arrayBuffer());
  } else if (typeof result === "string" && result.startsWith("http")) {
    const resp = await fetch(result);
    imageData = Buffer.from(await resp.arrayBuffer());
  } else {
    imageData = result as Buffer;
  }

  const finalPath = await saveImage(imageData, output);
  console.log(`✅ Image saved to ${finalPath}`);
  return finalPath;
}

async function generateWithNanoBanana(prompt: string, size: ReplicateSize, output: string): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new CLIError("Missing environment variable: REPLICATE_API_TOKEN");
  }

  const replicate = new Replicate({ auth: token });

  console.log("🍌 Generating with Nano Banana...");

  const result = await replicate.run("google/nano-banana", {
    input: {
      prompt,
      aspect_ratio: size,
      output_format: "png",
    },
  });

  // Handle FileOutput from Replicate SDK v1+
  let imageData: Buffer;
  if (result && typeof (result as any).blob === "function") {
    const blob = await (result as any).blob();
    imageData = Buffer.from(await blob.arrayBuffer());
  } else if (result && typeof (result as any).url === "function") {
    const url = (result as any).url().href ?? (result as any).url();
    const resp = await fetch(url);
    imageData = Buffer.from(await resp.arrayBuffer());
  } else if (typeof result === "string" && (result as string).startsWith("http")) {
    const resp = await fetch(result as string);
    imageData = Buffer.from(await resp.arrayBuffer());
  } else {
    imageData = result as Buffer;
  }
  const finalPath = await saveImage(imageData, output);
  console.log(`✅ Image saved to ${finalPath}`);
  return finalPath;
}

async function generateWithNanoBananaPro(
  prompt: string,
  size: GeminiSize,
  aspectRatio: ReplicateSize,
  output: string,
  referenceImages?: string[]
): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new CLIError("Missing environment variable: GOOGLE_API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey });

  if (referenceImages && referenceImages.length > 0) {
    console.log(`🍌✨ Generating with Nano Banana Pro (Gemini 3 Pro) at ${size} ${aspectRatio} with ${referenceImages.length} reference image(s)...`);
  } else {
    console.log(`🍌✨ Generating with Nano Banana Pro (Gemini 3 Pro) at ${size} ${aspectRatio}...`);
  }

  // Prepare content parts
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  // Add all reference images if provided
  if (referenceImages && referenceImages.length > 0) {
    for (const referenceImage of referenceImages) {
      // Read image file
      const imageBuffer = await readFile(referenceImage);
      const imageBase64 = imageBuffer.toString("base64");

      // Detect MIME type from actual file content (magic bytes), not just extension
      const mimeType = await detectMimeType(referenceImage);

      parts.push({
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      });
    }
  }

  // Add text prompt
  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: [{ parts }],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio: aspectRatio,
        imageSize: size,
      },
    },
  });

  // Extract image data from response
  let imageData: string | undefined;

  if (response.candidates && response.candidates.length > 0) {
    const parts = response.candidates[0].content.parts;
    for (const part of parts) {
      // Check if this part contains inline image data
      if (part.inlineData && part.inlineData.data) {
        imageData = part.inlineData.data;
        break;
      }
    }
  }

  if (!imageData) {
    throw new CLIError("No image data returned from Gemini API");
  }

  const imageBuffer = Buffer.from(imageData, "base64");
  const finalPath = await saveImage(imageBuffer, output);
  console.log(`✅ Image saved to ${finalPath}`);
  return finalPath;
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  try {
    // Load API keys from ${LIFEOS_DIR}/.env
    await loadEnv();

    const args = parseArgs(process.argv);

    // Enhance prompt for transparency if requested
    const finalPrompt = args.transparent
      ? enhancePromptForTransparency(args.prompt)
      : args.prompt;

    if (args.transparent) {
      console.log("🔲 Transparent background mode enabled");
      console.log("💡 Note: Not all models support transparency natively; may require post-processing\n");
    }

    const n = args.creativeVariations && args.creativeVariations > 1 ? args.creativeVariations : 1;

    // Single-model multi-image (creative-variations) path
    if (n > 1) {
      console.log(`🎨 Creative Mode: Generating ${n} variations with ${args.model}...`);
      console.log(`💡 Note: CLI mode uses same prompt for all variations (tests model variability)`);
      console.log(`   For true creative diversity, use the creative workflow with be-creative skill\n`);

      const basePath = args.output.replace(/\.[^.]+$/, "");

      // Fan out in parallel
      const promises: Promise<string>[] = [];
      for (let i = 1; i <= n; i++) {
        const varOutput = `${basePath}-v${i}.png`;
        console.log(`Variation ${i}/${n}: ${varOutput}`);

        if (args.model === "flux") {
          promises.push(generateWithFlux(finalPrompt, args.size as ReplicateSize, varOutput));
        } else if (args.model === "nano-banana") {
          promises.push(generateWithNanoBanana(finalPrompt, args.size as ReplicateSize, varOutput));
        } else if (args.model === "nano-banana-pro") {
          promises.push(
            generateWithNanoBananaPro(
              finalPrompt,
              args.size as GeminiSize,
              args.aspectRatio!,
              varOutput,
              args.referenceImages
            )
          );
        }
      }

      const actualPaths = await Promise.all(promises);
      console.log(`\n✅ Generated ${n} variations`);
      console.log(`   Files: ${actualPaths.join(", ")}`);
      return;
    }

    // Standard single image generation — track actual output path (may differ if format corrected)
    let actualOutput: string = args.output;
    if (args.model === "flux") {
      actualOutput = await generateWithFlux(finalPrompt, args.size as ReplicateSize, args.output);
    } else if (args.model === "nano-banana") {
      actualOutput = await generateWithNanoBanana(finalPrompt, args.size as ReplicateSize, args.output);
    } else if (args.model === "nano-banana-pro") {
      actualOutput = await generateWithNanoBananaPro(
        finalPrompt,
        args.size as GeminiSize,
        args.aspectRatio!,
        args.output,
        args.referenceImages
      );
    }

    // Remove background if requested (use actual output path)
    // May return a renamed path (e.g., .jpg → .png) since rembg returns PNG.
    if (args.removeBg) {
      actualOutput = await removeBackground(actualOutput);
    }

    // Add background color if requested (standalone mode)
    if (args.addBg && !args.thumbnail) {
      // For standalone --add-bg, modify the image in place
      const tempPath = actualOutput.replace(/\.[^.]+$/, "-temp.png");
      await addBackgroundColor(actualOutput, tempPath, args.addBg);
      // Replace original with the one with background
      const { rename } = await import("node:fs/promises");
      await rename(tempPath, actualOutput);
    }

    // Stamp the REQUIRED "{{DA_NAME}}" signature on essay/blog-header images.
    // Auto-on for the Essay workflow and for any --thumbnail (blog-header) run;
    // --signature forces on, --no-signature opts out. Runs AFTER bg ops but
    // BEFORE the thumbnail is derived so the signature is on BOTH versions.
    const signatureDefault = args.workflow === "Essay" || args.thumbnail === true;
    const stampSignature = args.signature ?? signatureDefault;
    if (stampSignature) {
      await stampDaSignature(actualOutput);
    }

    // Generate thumbnail with background color if requested (blog header mode)
    if (args.thumbnail) {
      const thumbPath = actualOutput.replace(/\.[^.]+$/, "-thumb.png");
      const THUMBNAIL_BG_COLOR = "#EAE9DF"; // UL brand background color for social previews
      await addBackgroundColor(actualOutput, thumbPath, THUMBNAIL_BG_COLOR);
      console.log(`\n📸 Blog header mode: Created both versions`);
      console.log(`   Transparent: ${actualOutput}`);
      console.log(`   Thumbnail:   ${thumbPath}`);
    }
  } catch (error) {
    handleError(error);
  }
}

main();
