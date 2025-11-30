#!/usr/bin/env bun
/**
 * Book Graphics Skill - Consistent Book Illustration Generator
 *
 * Generates clean, modern, minimal illustrations with warm professional aesthetic
 * for book content. Ensures consistent style across all images.
 *
 * Core Functions:
 * - generateImage: Create new book-style illustration
 * - refineImage: Adjust existing image while maintaining style
 * - batchGenerate: Create multiple consistent images
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const PAI_DIR = process.env.PAI_DIR || process.env.HOME + '/Personal_AI_Infrastructure';
const STYLE_REFERENCE_PATH = resolve(PAI_DIR, '.claude/skills/book-graphics/style-reference.md');

// Color palette constants
const COLORS = {
  // Backgrounds
  white: '#FFFFFF',
  lightGrey: '#F8F9FA',
  softBeige: '#FAFAF8',

  // Primary (Oranges)
  warmOrange: '#FF6B35',
  softOrange: '#FF8C61',
  deepOrange: '#E85D30',

  // Secondary (Blues)
  lightBlue: '#5AB9EA',
  mediumBlue: '#3A8FCC',
  darkBlue: '#2E5F8A',
  navyBlue: '#1E3A5F',

  // Neutrals
  black: '#000000',
  darkGrey: '#4A4A4A',
  mediumGrey: '#9B9B9B',
  borderGrey: '#E0E0E0'
};

// ============================================================================
// STYLE ENFORCEMENT
// ============================================================================

/**
 * Load and parse style reference guidelines
 */
async function loadStyleReference(): Promise<string> {
  try {
    const styleRef = await readFile(STYLE_REFERENCE_PATH, 'utf-8');
    return styleRef;
  } catch (error) {
    console.error('Warning: Could not load style reference file');
    return '';
  }
}

/**
 * Build comprehensive style prompt with enforced guidelines
 */
function buildStylePrompt(): string {
  return `
AESTHETIC: Clean Modern Minimal Book Illustration Style

VISUAL IDENTITY:
- Vector-like, high-detail, professional quality
- Warm, approachable, slightly nerdy/technical vibe
- Notion × Stripe Docs × Apple Keynote aesthetic
- Framework diagrams and systems-thinking visuals

COLOR PALETTE:
Primary Warm Accent: ${COLORS.warmOrange} (warm orange - main accent)
Secondary Accents: ${COLORS.lightBlue}, ${COLORS.mediumBlue}, ${COLORS.darkBlue} (blues - technical elements)
Background: ${COLORS.white} or ${COLORS.lightGrey} (light, clean, open)
Text/Outlines: ${COLORS.black}, ${COLORS.darkGrey} (sharp, readable)
Neutrals: ${COLORS.mediumGrey}, ${COLORS.borderGrey} (subtle elements)

COMPOSITION RULES:
- Minimal elements (2-5 key components maximum)
- Generous white space (30-40% minimum)
- Clean vector strokes (smooth, professional)
- Soft gradients (subtle transitions)
- Soft shadows (10-20% opacity for depth)
- No clutter, no noise, no texture

LIGHTING & EFFECTS:
- Soft shadows for depth (not harsh)
- Subtle gradients on primary elements
- Clean edges (no rough/sketchy lines)
- Professional polish throughout

NEGATIVE PROMPTS (AVOID):
--no hand-drawn sketchy style
--no photorealistic elements
--no noisy textures
--no cluttered compositions
--no neon or harsh colors
--no dark backgrounds
--no rough edges or imperfect strokes
--no excessive detail or complexity
`.trim();
}

/**
 * Build negative prompts for consistent style enforcement
 */
function buildNegativePrompts(): string {
  return [
    'hand-drawn',
    'sketchy',
    'rough',
    'photorealistic',
    'photo',
    'noisy texture',
    'cluttered',
    'messy',
    'neon',
    'harsh colors',
    'dark background',
    'excessive detail',
    'complex',
    'chaotic',
    'imperfect lines',
    'wobbly strokes'
  ].join(', ');
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

interface GenerateImageOptions {
  prompt: string;
  chapter?: string;
  imageType?: 'diagram' | 'illustration' | 'framework' | 'concept';
  aspectRatio?: '16:9' | '4:3' | '1:1' | '3:2';
  outputPath?: string;
}

/**
 * Generate a new book-style image
 */
async function generateImage(options: GenerateImageOptions): Promise<string> {
  const {
    prompt,
    chapter = 'General',
    imageType = 'illustration',
    aspectRatio = '16:9',
    outputPath
  } = options;

  console.log(`\n🎨 Generating book-style ${imageType} for ${chapter}...\n`);

  // Build comprehensive prompt with style enforcement
  const stylePrompt = buildStylePrompt();
  const negativePrompts = buildNegativePrompts();

  const fullPrompt = `
${prompt}

${stylePrompt}

IMAGE TYPE: ${imageType}
CONTEXT: ${chapter}
ASPECT RATIO: ${aspectRatio}

CRITICAL REQUIREMENTS:
- Clean vector-like illustration style
- Warm professional aesthetic
- Minimal composition with generous spacing
- Use color palette: oranges (${COLORS.warmOrange}), blues (${COLORS.lightBlue}, ${COLORS.mediumBlue}), white background
- Soft gradients and subtle shadows
- Technical/framework visual clarity
- High detail but NOT cluttered
- Professional polish throughout

NEGATIVE: ${negativePrompts}
`.trim();

  // Output the prompt for use with image generation tools
  console.log('Generated prompt:');
  console.log('─'.repeat(80));
  console.log(fullPrompt);
  console.log('─'.repeat(80));

  if (outputPath) {
    console.log(`\nOutput path: ${outputPath}`);
  }

  return fullPrompt;
}

interface RefineImageOptions {
  originalImage: string;
  refinements: string;
  maintainStyle?: boolean;
}

/**
 * Refine an existing image while maintaining book style
 */
async function refineImage(options: RefineImageOptions): Promise<string> {
  const {
    originalImage,
    refinements,
    maintainStyle = true
  } = options;

  console.log(`\n🔧 Refining image: ${originalImage}...\n`);

  const stylePrompt = maintainStyle ? buildStylePrompt() : '';
  const negativePrompts = buildNegativePrompts();

  const refinementPrompt = `
REFINEMENT REQUEST: ${refinements}

ORIGINAL IMAGE: ${originalImage}

${maintainStyle ? `
MAINTAIN STYLE:
${stylePrompt}
` : ''}

ADJUSTMENTS:
- Apply requested refinements
- Keep overall aesthetic consistent
- Maintain color palette harmony
- Preserve clean minimal style

NEGATIVE: ${negativePrompts}
`.trim();

  console.log('Refinement prompt:');
  console.log('─'.repeat(80));
  console.log(refinementPrompt);
  console.log('─'.repeat(80));

  return refinementPrompt;
}

interface BatchGenerateOptions {
  prompts: Array<{
    prompt: string;
    chapter: string;
    imageType: 'diagram' | 'illustration' | 'framework' | 'concept';
  }>;
  aspectRatio?: '16:9' | '4:3' | '1:1' | '3:2';
  outputDir?: string;
}

/**
 * Generate multiple images with consistent style
 */
async function batchGenerate(options: BatchGenerateOptions): Promise<string[]> {
  const {
    prompts,
    aspectRatio = '16:9',
    outputDir
  } = options;

  console.log(`\n📚 Batch generating ${prompts.length} book-style images...\n`);

  const generatedPrompts: string[] = [];

  for (let i = 0; i < prompts.length; i++) {
    const item = prompts[i];
    console.log(`[${i + 1}/${prompts.length}] ${item.chapter}: ${item.imageType}`);

    const outputPath = outputDir
      ? `${outputDir}/${item.chapter.toLowerCase().replace(/\s+/g, '-')}-${item.imageType}.png`
      : undefined;

    const prompt = await generateImage({
      prompt: item.prompt,
      chapter: item.chapter,
      imageType: item.imageType,
      aspectRatio,
      outputPath
    });

    generatedPrompts.push(prompt);
    console.log(''); // Spacing between items
  }

  console.log(`✅ Generated ${prompts.length} consistent prompts\n`);

  return generatedPrompts;
}

// ============================================================================
// ROUTING & CLI
// ============================================================================

/**
 * Route natural language queries to appropriate function
 */
function routeQuery(query: string): string {
  const lower = query.toLowerCase();

  // Batch generation
  if (lower.includes('batch') || lower.includes('multiple') || lower.includes('all chapters')) {
    return 'batch-generate';
  }

  // Refinement
  if (lower.includes('refine') || lower.includes('adjust') || lower.includes('improve') || lower.includes('fix')) {
    return 'refine';
  }

  // Single generation
  if (lower.includes('generate') || lower.includes('create') || lower.includes('make') || lower.includes('illustrate')) {
    return 'generate';
  }

  // Style reference
  if (lower.includes('style') || lower.includes('aesthetic') || lower.includes('guidelines') || lower.includes('palette')) {
    return 'style-reference';
  }

  // Default to generation
  return 'generate';
}

/**
 * Display help information
 */
function showHelp() {
  console.log(`
📖 Book Graphics Skill - Clean Modern Illustration Generator

USAGE:
  bun run skill.ts <command> [options]

COMMANDS:
  generate        Generate a new book-style image
  refine          Refine an existing image
  batch           Generate multiple consistent images
  style           Show style reference guidelines
  help            Show this help message

EXAMPLES:
  # Generate single image
  bun run skill.ts generate "decision-making framework" --chapter "Chapter 3" --type diagram

  # Refine existing image
  bun run skill.ts refine ./image.png "make colors warmer"

  # Batch generate
  bun run skill.ts batch --prompts prompts.json --output ./images

  # View style reference
  bun run skill.ts style

NATURAL LANGUAGE:
  You can also use natural language queries:
  "Generate an illustration for Chapter 3 about decision frameworks"
  "Make a diagram of feedback loops in book style"
  "Refine this image to use more orange accents"

STYLE:
  All images use consistent warm professional aesthetic:
  - Clean vector-like, minimal, high-detail
  - Warm oranges + soft blues on white/light backgrounds
  - Soft gradients, subtle shadows, generous spacing
  - Notion × Stripe Docs × Apple Keynote aesthetic

For full style guidelines: read ${STYLE_REFERENCE_PATH}
`);
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
    showHelp();
    return;
  }

  const command = args[0];

  // Route based on command
  switch (command) {
    case 'generate':
      await generateImage({
        prompt: args[1] || 'Example illustration',
        chapter: args.find(a => a.startsWith('--chapter'))?.split('=')[1],
        imageType: (args.find(a => a.startsWith('--type'))?.split('=')[1] as any) || 'illustration',
        aspectRatio: (args.find(a => a.startsWith('--ratio'))?.split('=')[1] as any) || '16:9',
        outputPath: args.find(a => a.startsWith('--output'))?.split('=')[1]
      });
      break;

    case 'refine':
      await refineImage({
        originalImage: args[1] || '',
        refinements: args[2] || 'Improve consistency',
        maintainStyle: !args.includes('--no-style')
      });
      break;

    case 'batch':
      // Simple example - in production would load from file
      await batchGenerate({
        prompts: [
          { prompt: 'Decision framework', chapter: 'Chapter 1', imageType: 'diagram' },
          { prompt: 'Feedback loops', chapter: 'Chapter 2', imageType: 'illustration' }
        ],
        aspectRatio: '16:9',
        outputDir: args.find(a => a.startsWith('--output'))?.split('=')[1]
      });
      break;

    case 'style':
      const styleRef = await loadStyleReference();
      console.log(styleRef || 'Style reference not found');
      break;

    default:
      // Natural language routing
      const route = routeQuery(args.join(' '));
      console.log(`\n🎯 Detected intent: ${route}\n`);

      switch (route) {
        case 'generate':
          await generateImage({
            prompt: args.join(' '),
            aspectRatio: '16:9'
          });
          break;
        case 'refine':
          await refineImage({
            originalImage: args[0],
            refinements: args.slice(1).join(' ')
          });
          break;
        case 'batch-generate':
          console.log('For batch generation, use: bun run skill.ts batch --prompts <file>');
          break;
        case 'style-reference':
          const style = await loadStyleReference();
          console.log(style || 'Style reference not found');
          break;
      }
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}

// Export functions for use as module
export {
  generateImage,
  refineImage,
  batchGenerate,
  loadStyleReference,
  buildStylePrompt,
  buildNegativePrompts,
  routeQuery,
  COLORS
};
