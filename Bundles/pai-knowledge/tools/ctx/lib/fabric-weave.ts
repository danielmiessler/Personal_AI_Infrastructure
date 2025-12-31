/**
 * fabric-weave.ts - Fabric Pattern Processing for Weave
 *
 * Creates derived notes from Fabric pattern output, preserving source notes.
 *
 * REQ-METHOD-FABRIC-001 from cultivation-practices-v1.2
 *
 * Key principles:
 * - Source notes are NEVER modified
 * - Derived notes link back to source
 * - Session tags are applied when session is active
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { basename, dirname, join } from "path";
import { getActiveSession } from "./session-awareness";

// ============================================================================
// Types
// ============================================================================

export interface FabricResult {
  success: boolean;
  derivedPath: string;
  pattern: string;
  sourceNoteName: string;
  error?: string;
}

export interface CreateDerivedNoteOptions {
  sourcePath: string;
  pattern: string;
  fabricOutput: string;
  sessionTag?: string;
}

export interface DerivedFrontmatter {
  derived_from: string;
  fabric_pattern: string;
  processed_at: string;
  session_tag?: string;
  tags: string[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Recommended Fabric patterns for weave
 */
export const RECOMMENDED_PATTERNS = [
  "extract_wisdom",
  "extract_insights",
  "summarize",
  "extract_main_idea",
  "create_mermaid_visualization",
];

/**
 * Pattern short names for derived note naming
 */
const PATTERN_SHORT_NAMES: Record<string, string> = {
  extract_wisdom: "wisdom",
  extract_insights: "insights",
  summarize: "summarize",
  extract_main_idea: "main_idea",
  create_mermaid_visualization: "mermaid",
};

// ============================================================================
// Derived Note Naming
// ============================================================================

/**
 * Get the derived note filename from source name and pattern
 * Format: {source-name}-{pattern-short}.md
 *
 * Examples:
 * - 2025-12-23-AI-Paper.md + extract_wisdom → 2025-12-23-AI-Paper-wisdom.md
 * - MyNote.md + summarize → MyNote-summarize.md
 */
export function getDerivedNoteName(sourceFileName: string, pattern: string): string {
  // Remove .md extension
  const baseName = sourceFileName.replace(/\.md$/, "");

  // Get short pattern name or use pattern after last underscore
  let shortName = PATTERN_SHORT_NAMES[pattern];
  if (!shortName) {
    // For patterns like "extract_something", use the last part
    const parts = pattern.split("_");
    shortName = parts.length > 1 ? parts.slice(1).join("_") : pattern;
  }

  return `${baseName}-${shortName}.md`;
}

/**
 * Get the source note name without extension (for wikilinks)
 */
function getSourceNoteName(sourcePath: string): string {
  return basename(sourcePath).replace(/\.md$/, "");
}

// ============================================================================
// Frontmatter Building
// ============================================================================

/**
 * Build frontmatter for derived note
 */
export function buildDerivedFrontmatter(options: {
  sourceNoteName: string;
  pattern: string;
  sessionTag?: string;
}): DerivedFrontmatter {
  const { sourceNoteName, pattern, sessionTag } = options;

  // Get pattern short name for tag
  const patternShort = PATTERN_SHORT_NAMES[pattern] || pattern.replace("extract_", "");

  // Build tags array
  const tags: string[] = ["derived/fabric", `derived/${patternShort}`];
  if (sessionTag) {
    tags.push(sessionTag);
  }

  const fm: DerivedFrontmatter = {
    derived_from: `[[${sourceNoteName}]]`,
    fabric_pattern: pattern,
    processed_at: new Date().toISOString(),
    tags,
  };

  if (sessionTag) {
    fm.session_tag = sessionTag;
  }

  return fm;
}

/**
 * Format frontmatter as YAML string
 */
function formatFrontmatter(fm: DerivedFrontmatter): string {
  const lines: string[] = ["---"];

  lines.push(`derived_from: "${fm.derived_from}"`);
  lines.push(`fabric_pattern: ${fm.fabric_pattern}`);
  lines.push(`processed_at: ${fm.processed_at}`);

  if (fm.session_tag) {
    lines.push(`session_tag: ${fm.session_tag}`);
  }

  lines.push("tags:");
  for (const tag of fm.tags) {
    lines.push(`  - ${tag}`);
  }

  lines.push("---");
  return lines.join("\n");
}

// ============================================================================
// Derived Note Creation
// ============================================================================

/**
 * Create a derived note from Fabric output
 *
 * This function:
 * - NEVER modifies the source note
 * - Creates a new file in the same directory as source
 * - Adds frontmatter with provenance information
 * - Includes session tag if session is active
 */
export async function createDerivedNote(
  options: CreateDerivedNoteOptions
): Promise<FabricResult> {
  const { sourcePath, pattern, fabricOutput } = options;

  // Validate source exists
  if (!existsSync(sourcePath)) {
    return {
      success: false,
      derivedPath: "",
      pattern,
      sourceNoteName: "",
      error: `Source note not found: ${sourcePath}`,
    };
  }

  // Get source info
  const sourceFileName = basename(sourcePath);
  const sourceNoteName = getSourceNoteName(sourcePath);
  const sourceDir = dirname(sourcePath);

  // Get active session if any
  const session = getActiveSession();
  const sessionTag = options.sessionTag || session?.tag;

  // Build derived note path
  const derivedFileName = getDerivedNoteName(sourceFileName, pattern);
  const derivedPath = join(sourceDir, derivedFileName);

  // Build frontmatter
  const frontmatter = buildDerivedFrontmatter({
    sourceNoteName,
    pattern,
    sessionTag,
  });

  // Combine frontmatter and content
  const content = formatFrontmatter(frontmatter) + "\n\n" + fabricOutput;

  // Write derived note (this is the ONLY file we write)
  writeFileSync(derivedPath, content);

  return {
    success: true,
    derivedPath,
    pattern,
    sourceNoteName,
  };
}

// ============================================================================
// Fabric CLI Integration
// ============================================================================

/**
 * Process a note through Fabric CLI pattern
 *
 * Calls the fabric command: cat notePath | fabric -p pattern
 * Returns the processed output.
 */
export async function processWithFabric(
  notePath: string,
  pattern: string
): Promise<{ output: string; success: boolean; error?: string }> {
  // Validate note exists
  if (!existsSync(notePath)) {
    return {
      output: "",
      success: false,
      error: `Note not found: ${notePath}`,
    };
  }

  // Read note content
  const content = readFileSync(notePath, "utf-8");

  try {
    // Check if fabric CLI is available
    const whichProc = Bun.spawn(["which", "fabric"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    await whichProc.exited;

    if (whichProc.exitCode !== 0) {
      return {
        output: "",
        success: false,
        error: "Fabric CLI not found. Install from: https://github.com/danielmiessler/fabric",
      };
    }

    // Call fabric with the pattern
    // We pipe the content to fabric via stdin
    const proc = Bun.spawn(["fabric", "-p", pattern], {
      stdin: new Response(content).body,
      stdout: "pipe",
      stderr: "pipe",
    });

    const output = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    await proc.exited;

    if (proc.exitCode !== 0) {
      return {
        output: "",
        success: false,
        error: stderr || `Fabric exited with code ${proc.exitCode}`,
      };
    }

    return {
      output: output.trim(),
      success: true,
    };
  } catch (err) {
    return {
      output: "",
      success: false,
      error: `Failed to run fabric: ${err}`,
    };
  }
}

/**
 * Process a note and create derived note in one step
 */
export async function weaveWithFabric(
  notePath: string,
  pattern: string
): Promise<FabricResult> {
  // Step 1: Process through Fabric
  const fabricResult = await processWithFabric(notePath, pattern);

  if (!fabricResult.success) {
    return {
      success: false,
      derivedPath: "",
      pattern,
      sourceNoteName: basename(notePath).replace(/\.md$/, ""),
      error: fabricResult.error,
    };
  }

  // Step 2: Create derived note
  return createDerivedNote({
    sourcePath: notePath,
    pattern,
    fabricOutput: fabricResult.output,
  });
}

/**
 * List available Fabric patterns
 * In production, this would call `fabric --list` and parse output
 */
export function listFabricPatterns(): string[] {
  // Placeholder - would return all available patterns
  return RECOMMENDED_PATTERNS;
}
