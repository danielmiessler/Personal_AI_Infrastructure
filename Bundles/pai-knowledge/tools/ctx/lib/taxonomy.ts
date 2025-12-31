/**
 * Taxonomy Module - Pluggable Tag Taxonomy System
 *
 * Provides schema-driven tag validation and management.
 * REQ-SCHEMA-001 through REQ-SCHEMA-010
 */

import { existsSync, readFileSync } from "fs";
import { parse as parseYaml } from "yaml";
import { join } from "path";
import { homedir } from "os";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface Dimension {
  name: string;
  prefix: string;
  type: "closed" | "open";
  values?: string[];
  pattern?: string;
  examples?: string[];
  required?: boolean;
  default?: string;
  description?: string;
  freeform?: boolean;
}

export interface TitlePattern {
  name: string;
  description: string;
  regex: string;
  group: number;
  minLength?: number;
  maxLength?: number;
  tags?: string[];  // Dimensional tags to apply when pattern matches
}

export interface TaxonomySchema {
  version: string;
  name: string;
  description: string;
  dimensions: Dimension[];
  title_patterns?: TitlePattern[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════

const TAXONOMY_DIR = join(homedir(), ".claude", "context", "taxonomies");
const DEFAULT_TAXONOMY = "default";

// ═══════════════════════════════════════════════════════════════════════════
// Loading
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load a taxonomy by name from the taxonomies directory
 */
export async function loadTaxonomy(name: string = DEFAULT_TAXONOMY): Promise<TaxonomySchema> {
  const path = join(TAXONOMY_DIR, `${name}.yaml`);

  if (!existsSync(path)) {
    throw new Error(`Taxonomy not found: ${path}`);
  }

  const content = readFileSync(path, "utf-8");
  const schema = parseYaml(content) as TaxonomySchema;

  // Validate schema on load
  const validation = validateSchema(schema);
  if (!validation.valid) {
    throw new Error(`Invalid taxonomy schema: ${validation.errors.join(", ")}`);
  }

  return schema;
}

/**
 * Get the default taxonomy
 */
export async function getDefaultTaxonomy(): Promise<TaxonomySchema> {
  return loadTaxonomy(DEFAULT_TAXONOMY);
}

/**
 * List available taxonomies
 */
export function listTaxonomies(): string[] {
  if (!existsSync(TAXONOMY_DIR)) {
    return [];
  }

  const files = require("fs").readdirSync(TAXONOMY_DIR) as string[];
  return files
    .filter((f: string) => f.endsWith(".yaml"))
    .map((f: string) => f.replace(".yaml", ""));
}

// ═══════════════════════════════════════════════════════════════════════════
// Schema Validation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate a taxonomy schema itself (not tags against it)
 */
export function validateSchema(schema: TaxonomySchema): ValidationResult {
  const errors: string[] = [];

  // Required top-level fields
  if (!schema.version) {
    errors.push("Missing required field: version");
  } else if (!/^\d+\.\d+$/.test(schema.version)) {
    errors.push("Version must be in format X.Y (e.g., 1.0)");
  }

  if (!schema.name) {
    errors.push("Missing required field: name");
  }

  if (!schema.description) {
    errors.push("Missing required field: description");
  }

  if (!schema.dimensions || !Array.isArray(schema.dimensions)) {
    errors.push("Missing required field: dimensions (must be array)");
    return { valid: false, errors };
  }

  // Validate each dimension
  const dimNames = new Set<string>();
  const prefixes = new Set<string>();

  for (let i = 0; i < schema.dimensions.length; i++) {
    const dim = schema.dimensions[i];
    const prefix = `dimensions[${i}]`;

    // Required dimension fields
    if (!dim.name) {
      errors.push(`${prefix}: Missing name`);
    } else {
      if (dimNames.has(dim.name)) {
        errors.push(`${prefix}: Duplicate dimension name '${dim.name}'`);
      }
      dimNames.add(dim.name);
    }

    if (!dim.prefix) {
      errors.push(`${prefix}: Missing prefix`);
    } else if (!dim.prefix.includes("/")) {
      errors.push(`${prefix}.prefix: Must contain '/'`);
    }

    if (!dim.type) {
      errors.push(`${prefix}: Missing type`);
    } else if (!["closed", "open"].includes(dim.type)) {
      errors.push(`${prefix}.type: Must be 'closed' or 'open'`);
    }

    // Type-specific validation
    if (dim.type === "closed") {
      if (!dim.values || !Array.isArray(dim.values) || dim.values.length === 0) {
        errors.push(`${prefix}: Closed dimension must have non-empty values array`);
      }
    }

    if (dim.type === "open") {
      if (!dim.pattern) {
        errors.push(`${prefix}: Open dimension must have pattern`);
      } else {
        try {
          new RegExp(dim.pattern);
        } catch {
          errors.push(`${prefix}.pattern: Invalid regex '${dim.pattern}'`);
        }
      }
    }

    // Default must be valid
    if (dim.default && dim.type === "closed" && dim.values) {
      if (!dim.values.includes(dim.default)) {
        errors.push(`${prefix}.default: '${dim.default}' not in values`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Tag Validation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find which dimension a tag belongs to
 */
export function findDimension(tag: string, schema: TaxonomySchema): Dimension | undefined {
  for (const dim of schema.dimensions) {
    // Handle multi-prefix dimensions (e.g., "project/|lifeos/|area/")
    const prefixes = dim.prefix.split("|");
    for (const prefix of prefixes) {
      if (tag.startsWith(prefix)) {
        return dim;
      }
    }
  }
  return undefined;
}

/**
 * Validate a single tag against the taxonomy
 */
export function validateTag(tag: string, schema: TaxonomySchema): boolean {
  const dim = findDimension(tag, schema);

  if (!dim) {
    return false; // No matching dimension
  }

  if (dim.type === "closed") {
    // Extract value after prefix
    const prefixes = dim.prefix.split("|");
    for (const prefix of prefixes) {
      if (tag.startsWith(prefix)) {
        const value = tag.slice(prefix.length);
        return dim.values?.includes(value) ?? false;
      }
    }
    return false;
  }

  if (dim.type === "open") {
    // Validate against pattern
    if (!dim.pattern) return true;
    const regex = new RegExp(dim.pattern);
    return regex.test(tag);
  }

  return false;
}

/**
 * Validate multiple tags, return validation result
 */
export function validateTags(
  tags: string[],
  schema: TaxonomySchema
): { valid: string[]; invalid: string[]; missing: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const tag of tags) {
    if (validateTag(tag, schema)) {
      valid.push(tag);
    } else {
      invalid.push(tag);
    }
  }

  // Check for missing required dimensions
  const missing: string[] = [];
  for (const dim of schema.dimensions) {
    if (dim.required) {
      const prefixes = dim.prefix.split("|");
      const hasTag = tags.some(t => prefixes.some(p => t.startsWith(p)));
      if (!hasTag) {
        missing.push(dim.name);
      }
    }
  }

  return { valid, invalid, missing };
}

/**
 * Get default tags from taxonomy for required dimensions
 */
export function getDefaultTags(schema: TaxonomySchema): string[] {
  const defaults: string[] = [];

  for (const dim of schema.dimensions) {
    if (dim.required && dim.default) {
      const prefix = dim.prefix.split("|")[0]; // Use first prefix
      defaults.push(`${prefix}${dim.default}`);
    }
  }

  return defaults;
}

/**
 * Suggest a fix for an invalid tag
 */
export function suggestFix(tag: string, schema: TaxonomySchema): string | null {
  // Try lowercase
  const lower = tag.toLowerCase();
  if (validateTag(lower, schema)) {
    return lower;
  }

  // Try adding common prefixes
  for (const dim of schema.dimensions) {
    const prefixes = dim.prefix.split("|");
    for (const prefix of prefixes) {
      const withPrefix = `${prefix}${tag}`;
      if (validateTag(withPrefix, schema)) {
        return withPrefix;
      }

      // Try lowercase with prefix
      const lowerWithPrefix = `${prefix}${tag.toLowerCase()}`;
      if (validateTag(lowerWithPrefix, schema)) {
        return lowerWithPrefix;
      }
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Title Pattern Matching
// ═══════════════════════════════════════════════════════════════════════════

export interface TitleMatchResult {
  title: string;
  pattern: string;
  tags: string[];
}

/**
 * Match content against title patterns defined in the taxonomy.
 * Returns the first matching title with associated tags.
 */
export function matchTitlePatterns(
  content: string,
  schema: TaxonomySchema
): TitleMatchResult | null {
  if (!schema.title_patterns || schema.title_patterns.length === 0) {
    return null;
  }

  for (const pattern of schema.title_patterns) {
    try {
      const regex = new RegExp(pattern.regex, "m");
      const match = content.match(regex);

      if (match && match[pattern.group]) {
        const title = match[pattern.group].trim();

        // Validate length constraints
        if (pattern.minLength && title.length < pattern.minLength) {
          continue;
        }
        if (pattern.maxLength && title.length > pattern.maxLength) {
          continue;
        }

        return {
          title,
          pattern: pattern.name,
          tags: pattern.tags || [],
        };
      }
    } catch (e) {
      // Invalid regex, skip this pattern
      continue;
    }
  }

  return null;
}

/**
 * Get all dimension prefixes from the taxonomy
 */
export function getDimensionPrefixes(schema: TaxonomySchema): string[] {
  const prefixes: string[] = [];
  for (const dim of schema.dimensions) {
    const parts = dim.prefix.split("|");
    prefixes.push(...parts);
  }
  return prefixes;
}

/**
 * Format taxonomy dimensions for AI prompt context
 */
export function formatTaxonomyForAI(schema: TaxonomySchema): string {
  const lines: string[] = [];
  lines.push("Available tag dimensions:");
  lines.push("");

  for (const dim of schema.dimensions) {
    const prefix = dim.prefix.split("|")[0];
    if (dim.type === "closed" && dim.values) {
      lines.push(`- ${prefix}* (options: ${dim.values.join(", ")})`);
    } else if (dim.type === "open" && dim.examples) {
      lines.push(`- ${prefix}* (examples: ${dim.examples.slice(0, 3).join(", ")})`);
    } else {
      lines.push(`- ${prefix}*`);
    }
  }

  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// AI-Based Tag Suggestion
// ═══════════════════════════════════════════════════════════════════════════

export interface AITagSuggestion {
  tags: string[];
  confidence: "high" | "medium" | "low";
  reasoning?: string;
}

/**
 * Suggest tags using AI with dimensional taxonomy awareness.
 * Returns properly formatted dimension/value tags.
 *
 * @param content - Content to analyze
 * @param schema - Taxonomy schema with dimensions
 * @param apiKey - OpenAI API key
 * @param existingTags - Tags already on the note (to avoid duplicates)
 */
export async function suggestTagsWithAI(
  content: string,
  schema: TaxonomySchema,
  apiKey: string,
  existingTags: string[] = []
): Promise<AITagSuggestion> {
  // Truncate content for API efficiency
  const sample = content.slice(0, 2000);

  // Format taxonomy for prompt
  const taxonomyContext = formatTaxonomyForAI(schema);

  // Build prompt
  const systemPrompt = `You are a knowledge management assistant that tags notes using a dimensional taxonomy.

${taxonomyContext}

CRITICAL RULES:
1. ALL tags MUST use the dimension/value format (e.g., "type/literature", "topic/ai")
2. Only use dimensions listed above - never invent new dimensions
3. For closed dimensions, use ONLY the listed values
4. For open dimensions, create values matching the pattern/examples
5. Suggest 3-5 tags that best describe this content
6. Do NOT suggest tags that are already on the note

Already on note: ${existingTags.length > 0 ? existingTags.join(", ") : "(none)"}

Return JSON: {"tags": ["dimension/value", ...], "confidence": "high|medium|low", "reasoning": "brief explanation"}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: sample },
        ],
        max_completion_tokens: 200,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.warn(`AI tag suggestion API error: ${response.status} - ${errorBody}`);
      return { tags: [], confidence: "low", reasoning: "API error" };
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const rawJson = data.choices[0]?.message?.content?.trim();

    const parsed = JSON.parse(rawJson) as { tags: string[]; confidence?: string; reasoning?: string };
    const rawTags = parsed.tags || [];

    // Validate and filter tags against taxonomy
    const validatedTags: string[] = [];
    for (const tag of rawTags) {
      // Skip if already on note
      if (existingTags.includes(tag)) continue;

      // Validate against taxonomy
      if (validateTag(tag, schema)) {
        validatedTags.push(tag);
      } else {
        // Try to fix the tag
        const fixed = suggestFix(tag, schema);
        if (fixed && !existingTags.includes(fixed) && !validatedTags.includes(fixed)) {
          validatedTags.push(fixed);
        }
      }
    }

    return {
      tags: validatedTags,
      confidence: (parsed.confidence as "high" | "medium" | "low") || "medium",
      reasoning: parsed.reasoning,
    };
  } catch (err) {
    console.warn(`AI tag suggestion failed: ${err}`);
    return { tags: [], confidence: "low", reasoning: `Error: ${err}` };
  }
}

/**
 * Suggest tags using pattern matching only (no AI).
 * Fallback when API is not available.
 */
export function suggestTagsFromPatterns(
  content: string,
  schema: TaxonomySchema,
  existingTags: string[] = []
): string[] {
  const suggestions: string[] = [];

  // Use title patterns if available
  const titleMatch = matchTitlePatterns(content, schema);
  if (titleMatch?.tags) {
    for (const tag of titleMatch.tags) {
      if (!existingTags.includes(tag) && !suggestions.includes(tag)) {
        suggestions.push(tag);
      }
    }
  }

  // Add simple keyword-based suggestions for common topics
  const topicPatterns: [RegExp, string][] = [
    [/\bAI\b|artificial intelligence|machine learning|LLM/i, "topic/ai"],
    [/\bagent\b|autonomous|agentic/i, "topic/ai/agents"],
    [/\bCLI\b|command[- ]line/i, "topic/cli"],
    [/\bsecurity\b|vulnerability|pentest/i, "topic/security"],
    [/\barchitecture\b|system design/i, "topic/architecture"],
    [/\bproductivity\b|workflow/i, "topic/productivity"],
    [/\bmeeting\b|standup|sync/i, "format/meeting-notes"],
    [/\barticle\b|blog post|newsletter/i, "format/article"],
    [/\bhow to\b|tutorial|guide/i, "format/howto"],
  ];

  for (const [pattern, tag] of topicPatterns) {
    if (pattern.test(content) && !existingTags.includes(tag) && !suggestions.includes(tag)) {
      if (validateTag(tag, schema)) {
        suggestions.push(tag);
      }
    }
  }

  return suggestions;
}
