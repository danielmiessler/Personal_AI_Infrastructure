/**
 * Taxonomy Integration for Ingest Pipeline
 *
 * Bridges the ingest pipeline with the pluggable taxonomy system.
 * Provides:
 * - Tag validation against taxonomy schema
 * - Migration of legacy tags to new format
 * - Verbose mode for tag decision tracking
 *
 * Reference: .claude/skills/Context/openspec/changes/pluggable-taxonomy/
 */

import { join } from "path";
import {
  getDefaultTaxonomy,
  validateTag,
  validateTags,
  suggestFix,
  type TaxonomySchema,
  type ValidationResult,
} from "../../ctx/lib/taxonomy";
import {
  getDefaultRules,
  applyMigration,
  type MigrationRules,
  type MigrationResult,
} from "../../ctx/lib/migration";
import {
  inferFromSource,
  inferFromContentType,
  inferFromContent,
  parseHints,
  mergeTagsWithPrecedence,
  type SourceType,
  type ContentType,
  type InferenceResult,
  type HintParseResult,
} from "../../ctx/lib/inference";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface TagDecision {
  tag: string;
  source: TagSource;
  action: TagAction;
  reason?: string;
  original?: string; // For migrations: the original tag
}

export type TagSource =
  | "explicit"      // User-provided via #tag hint
  | "person"        // User-provided via @person hint
  | "ai"            // AI-generated semantic tag
  | "profile"       // Profile default (status, source)
  | "migration"     // Result of migrating legacy tag
  | "inferred";     // Inferred from content/context

export type TagAction =
  | "kept"          // Tag kept as-is
  | "migrated"      // Tag transformed by migration rule
  | "removed"       // Tag removed (garbage)
  | "suggested"     // Invalid tag with suggestion
  | "invalid"       // Invalid tag, no fix possible
  | "added";        // Default tag added

export interface TagProcessingResult {
  tags: string[];
  decisions: TagDecision[];
  validation: ValidationResult;
  warnings: string[];
}

export interface TagProcessingOptions {
  verbose?: boolean;
  validateStrict?: boolean;  // Fail on invalid tags
  autoMigrate?: boolean;     // Auto-apply migration rules
  addDefaults?: boolean;     // Add missing required dimensions
  content?: string;          // Content for inference
  source?: SourceType;       // Source for source-based inference (WHERE: telegram, cli, clipboard, web)
  contentType?: ContentType; // Content type for format-based inference (WHAT: voice, photo, document)
  caption?: string;          // Caption for hint parsing
}

// ═══════════════════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════════════════

let cachedTaxonomy: TaxonomySchema | null = null;
let cachedMigrationRules: MigrationRules | null = null;

// ═══════════════════════════════════════════════════════════════════════════
// Core Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load taxonomy (cached)
 */
export async function getTaxonomy(): Promise<TaxonomySchema> {
  if (!cachedTaxonomy) {
    cachedTaxonomy = await getDefaultTaxonomy();
  }
  return cachedTaxonomy;
}

/**
 * Infer tags for a capture based on content, source, contentFormat, and caption
 *
 * This function integrates the inference module with the ingest pipeline:
 * - Parses hints from caption (#tag, @person, ~scope)
 * - Infers tags from source (telegram → source/telegram) - WHERE it came from
 * - Infers tags from contentFormat (voice → format/transcript) - WHAT it is
 * - Infers tags from content patterns (commands, meeting notes, code blocks)
 * - Merges with correct precedence: explicit > hint > inferred > default
 *
 * REQ-INFER-001: Caption tags ALWAYS override AI inference
 * REQ-INFER-002: Source-based inference (telegram, cli, etc.)
 * REQ-INFER-003: Content-based inference (commands, meeting patterns)
 * REQ-INFER-009: Precedence: explicit > hint > inferred > default
 */
export async function inferTagsForCapture(
  content: string,
  caption: string | undefined,
  source: SourceType,
  contentType: ContentType | undefined,
  explicitTags: string[],
  taxonomy: TaxonomySchema
): Promise<{
  inferredTags: string[];
  hintTags: string[];
  sourceTags: string[];
  contentTypeTags: string[];
  contentTags: string[];
}> {
  const hintTags: string[] = [];
  const sourceTags: string[] = [];
  const contentTypeTags: string[] = [];
  const contentTags: string[] = [];

  // 1. Parse hints from caption (REQ-INFER-008)
  if (caption) {
    const hints = parseHints(caption);
    hintTags.push(...hints.tags);
  }

  // 2. Infer from source (REQ-INFER-002) - WHERE it came from
  const sourceResult = inferFromSource(source);
  sourceTags.push(...sourceResult.tags);

  // 3. Infer from content type - WHAT type it is
  if (contentType) {
    const contentTypeResult = inferFromContentType(contentType);
    contentTypeTags.push(...contentTypeResult.tags);
  }

  // 4. Infer from content patterns (REQ-INFER-003)
  const contentResult = inferFromContent(content);
  contentTags.push(...contentResult.tags);

  // 5. Merge with precedence (REQ-INFER-009)
  // explicit (from caller) > hint > source+contentType+content inferred
  const merged = mergeTagsWithPrecedence(
    {
      explicit: [...explicitTags, ...hintTags],
      inferred: [...sourceTags, ...contentTypeTags, ...contentTags],
      defaults: [], // Defaults handled separately in processTags
    },
    taxonomy
  );

  return {
    inferredTags: merged.tags.filter(tag => !explicitTags.includes(tag) && !hintTags.includes(tag)),
    hintTags,
    sourceTags,
    contentTypeTags,
    contentTags,
  };
}

/**
 * Load migration rules (cached)
 */
export async function getMigrationRules(): Promise<MigrationRules> {
  if (!cachedMigrationRules) {
    cachedMigrationRules = await getDefaultRules();
  }
  return cachedMigrationRules;
}

/**
 * Process tags through taxonomy validation and migration
 *
 * This is the main integration point for the ingest pipeline.
 * It takes raw tags from various sources and:
 * 1. Applies migration rules to convert legacy tags
 * 2. Validates against taxonomy schema
 * 3. Suggests fixes for invalid tags
 * 4. Adds missing required dimensions with defaults
 * 5. Tracks all decisions for verbose output
 */
export async function processTags(
  input: {
    explicitTags: string[];      // User #tag hints
    personTags: string[];        // User @person hints → person/name
    aiTags: string[];            // AI-generated semantic tags
    profileTags: string[];       // Profile defaults (status, source)
  },
  options: TagProcessingOptions = {}
): Promise<TagProcessingResult> {
  const {
    verbose = false,
    validateStrict = false,
    autoMigrate = true,
    addDefaults = true,
    content,
    source,
    contentType,
    caption,
  } = options;

  const taxonomy = await getTaxonomy();
  const migrationRules = await getMigrationRules();

  const decisions: TagDecision[] = [];
  const warnings: string[] = [];
  const finalTags: string[] = [];
  const rejectedTags: string[] = [];  // Track rejected tags for validation result

  // Run inference if content and source are provided
  let inferredTags: string[] = [];
  if (content && source) {
    const inference = await inferTagsForCapture(
      content,
      caption,
      source,
      contentType,
      input.explicitTags,
      taxonomy
    );

    // Add inference results to decisions for verbose output
    if (verbose) {
      for (const tag of inference.hintTags) {
        decisions.push({ tag, source: "explicit", action: "kept", reason: "From caption hint" });
      }
      for (const tag of inference.sourceTags) {
        decisions.push({ tag, source: "inferred", action: "kept", reason: "Inferred from source (WHERE)" });
      }
      for (const tag of inference.contentTypeTags) {
        decisions.push({ tag, source: "inferred", action: "kept", reason: "Inferred from content type (WHAT)" });
      }
      for (const tag of inference.contentTags) {
        decisions.push({ tag, source: "inferred", action: "kept", reason: "Inferred from content patterns" });
      }
    }

    // Merge inferred tags into explicit tags (hints are high priority)
    input.explicitTags = [...input.explicitTags, ...inference.hintTags];
    inferredTags = inference.inferredTags;
  }

  // Dimensions that should only have one value (uniqueness constraint)
  // Only scope needs strict uniqueness - can't be both private and work
  // type and status can have defaults that get refined during grooming
  const uniqueDimensions = ["scope"];

  // Helper to add tag with decision tracking
  const addTag = (tag: string, source: TagSource, action: TagAction, reason?: string, original?: string) => {
    // Check for dimension uniqueness (e.g., only one scope tag allowed)
    const dimension = tag.split("/")[0];
    if (uniqueDimensions.includes(dimension)) {
      const existingTag = finalTags.find(t => t.startsWith(`${dimension}/`));
      if (existingTag && existingTag !== tag) {
        // Already have a tag for this dimension - skip this one
        decisions.push({
          tag,
          source,
          action: "removed",
          reason: `Only one ${dimension} tag allowed - "${existingTag}" already present`,
        });
        return;
      }
    }

    if (!finalTags.includes(tag)) {
      finalTags.push(tag);
    }
    decisions.push({ tag, source, action, reason, original });
  };

  // Helper to track rejected tag
  const rejectTag = (tag: string, source: TagSource, action: TagAction, reason?: string, suggestion?: string) => {
    decisions.push({ tag, source, action, reason });
    if (!rejectedTags.includes(tag)) {
      rejectedTags.push(tag);
    }
    if (suggestion) {
      warnings.push(`Tag "${tag}" is invalid. Suggestion: ${suggestion}`);
    }
  };

  // Process explicit tags (highest priority)
  // REQ-TAG-PRESERVE: Explicit user tags are ALWAYS kept, even if invalid.
  // User typed them intentionally - grooming/cultivation can fix later.
  // EXCEPTION: Garbage tags (in removals list) are always removed, even if explicit.
  // Invalid tags generate warnings but are preserved in output.
  for (const tag of input.explicitTags) {
    const processed = processTag(tag, "explicit", taxonomy, migrationRules, autoMigrate);
    if (processed.valid) {
      addTag(processed.tag, "explicit", processed.action, processed.reason, processed.original);
    } else if (processed.action === "removed") {
      // Garbage tags are removed even if explicit - these are system noise, not user intent
      decisions.push({
        tag,
        source: "explicit",
        action: "removed",
        reason: processed.reason || "Removed by migration rule",
      });
      rejectedTags.push(tag);
    } else {
      // Keep other invalid explicit tags - user intent matters more than taxonomy validation
      // Add the tag but warn about it
      addTag(tag, "explicit", "kept", "Explicit tag preserved (invalid format - fix during grooming)");
      if (processed.suggestion) {
        warnings.push(`Tag "${tag}" is invalid. Suggestion: ${processed.suggestion}`);
      } else {
        warnings.push(`Tag "${tag}" is not in taxonomy - will need grooming`);
      }
    }
  }

  // Process person tags (convert @name → person/name)
  for (const name of input.personTags) {
    const personTag = `person/${name}`;
    const processed = processTag(personTag, "person", taxonomy, migrationRules, autoMigrate);
    if (processed.valid) {
      addTag(processed.tag, "person", processed.action, processed.reason);
    }
  }

  // Process inferred tags (from source/content inference, before AI tags)
  for (const tag of inferredTags) {
    const processed = processTag(tag, "inferred", taxonomy, migrationRules, autoMigrate);
    if (processed.valid) {
      addTag(processed.tag, "inferred", processed.action, processed.reason, processed.original);
    }
  }

  // Process AI tags (lower priority, may be filtered)
  for (const tag of input.aiTags) {
    // Skip AI tags that conflict with explicit tags on same dimension
    const dimension = tag.split("/")[0];
    const explicitDimension = input.explicitTags.some(t => t.startsWith(`${dimension}/`));
    if (explicitDimension) {
      decisions.push({
        tag,
        source: "ai",
        action: "removed",
        reason: `Explicit tag takes precedence for dimension "${dimension}"`,
      });
      continue;
    }

    const processed = processTag(tag, "ai", taxonomy, migrationRules, autoMigrate);
    if (processed.valid) {
      addTag(processed.tag, "ai", processed.action, processed.reason, processed.original);
    } else {
      decisions.push({ tag, source: "ai", action: processed.action, reason: processed.reason });
    }
  }

  // Process profile tags (status, source - always added unless explicit conflict)
  for (const tag of input.profileTags) {
    const dimension = tag.split("/")[0];
    const hasExplicit = finalTags.some(t => t.startsWith(`${dimension}/`));
    if (hasExplicit) {
      decisions.push({
        tag,
        source: "profile",
        action: "removed",
        reason: `Existing tag takes precedence for dimension "${dimension}"`,
      });
      continue;
    }

    const processed = processTag(tag, "profile", taxonomy, migrationRules, autoMigrate);
    if (processed.valid) {
      addTag(processed.tag, "profile", processed.action, processed.reason, processed.original);
    }
  }

  // Add missing required dimensions with defaults
  // REQ-PARA-DEFAULT: Also add para even though not "required" - better to suggest
  if (addDefaults) {
    const validation = validateTags(finalTags, taxonomy);

    // Add missing required dimensions
    for (const dimension of validation.missing) {
      const defaultValue = getDefaultForDimension(dimension, taxonomy);
      if (defaultValue) {
        addTag(defaultValue, "inferred", "added", `Default for required dimension "${dimension}"`);
      }
    }

    // Add para if not present (not required but helpful for grooming)
    const hasPara = finalTags.some(t => t.startsWith("para/"));
    if (!hasPara) {
      const paraDefault = getDefaultForDimension("para", taxonomy);
      if (paraDefault) {
        addTag(paraDefault, "inferred", "added", "Default PARA classification (reclassify during grooming)");
      }
    }
  }

  // Final validation - include rejected tags in invalid list
  const baseValidation = validateTags(finalTags, taxonomy);
  const validation = {
    ...baseValidation,
    invalid: [...baseValidation.invalid, ...rejectedTags],
  };

  if (verbose) {
    logDecisions(decisions, validation, warnings);
  }

  return {
    tags: finalTags,
    decisions,
    validation,
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Internal Helpers
// ═══════════════════════════════════════════════════════════════════════════

interface ProcessedTag {
  valid: boolean;
  tag: string;
  action: TagAction;
  reason?: string;
  original?: string;
  suggestion?: string;
}

/**
 * Process a single tag through migration and validation
 */
function processTag(
  tag: string,
  source: TagSource,
  taxonomy: TaxonomySchema,
  rules: MigrationRules,
  autoMigrate: boolean
): ProcessedTag {
  // First, try migration
  if (autoMigrate) {
    const migration = applyMigration([tag], rules);
    if (migration.changes.length > 0 && migration.changes[0].action !== "unchanged") {
      const change = migration.changes[0];

      if (change.action === "removed") {
        return {
          valid: false,
          tag,
          action: "removed",
          reason: change.rule || "Removed by migration rule",
        };
      }

      // Check if we have migrated tags
      if (change.migrated && change.migrated.length > 0) {
        const migratedTag = change.migrated[0];
        if (migratedTag !== tag) {
          // Validate migrated tag
          const isValid = validateTag(migratedTag, taxonomy);
          if (isValid) {
            return {
              valid: true,
              tag: migratedTag,
              action: "migrated",
              reason: `${change.action}: ${tag} → ${migratedTag}`,
              original: tag,
            };
          }
        }
      }
    }
  }

  // Validate directly
  const isValid = validateTag(tag, taxonomy);
  if (isValid) {
    return {
      valid: true,
      tag,
      action: "kept",
    };
  }

  // Try to suggest a fix
  const suggestion = suggestFix(tag, taxonomy);
  if (suggestion) {
    return {
      valid: false,
      tag,
      action: "suggested",
      reason: `Invalid tag format`,
      suggestion,
    };
  }

  return {
    valid: false,
    tag,
    action: "invalid",
    reason: validation.reason || "Unknown tag format",
  };
}

/**
 * Get default value for a required dimension
 *
 * REQ-PARA-DEFAULT: Auto-apply PARA classification during capture.
 * Default to para/resource (reference material) - can be reclassified during grooming.
 * Better to suggest than leave empty.
 */
function getDefaultForDimension(dimension: string, taxonomy: TaxonomySchema): string | null {
  const dim = taxonomy.dimensions.find(d => d.name === dimension);
  if (!dim) return null;

  // Check for dimension-specific defaults
  // Note: para is not "required" in schema but we auto-apply for better grooming UX
  const defaults: Record<string, string> = {
    type: "type/fleeting",
    status: "status/inbox",
    source: "source/telegram",  // Will be overridden by actual source
    para: "para/resource",      // Default PARA - can be reclassified during grooming
  };

  return defaults[dimension] || null;
}

/**
 * Log tag decisions for verbose mode
 */
function logDecisions(
  decisions: TagDecision[],
  validation: ValidationResult,
  warnings: string[]
): void {
  console.log("\n  Tag Processing:");
  console.log("  " + "─".repeat(50));

  // Group by source
  const bySource: Record<TagSource, TagDecision[]> = {
    explicit: [],
    person: [],
    ai: [],
    profile: [],
    migration: [],
    inferred: [],
  };

  for (const d of decisions) {
    bySource[d.source].push(d);
  }

  // Log each group
  for (const [source, items] of Object.entries(bySource)) {
    if (items.length === 0) continue;

    console.log(`\n  ${source.toUpperCase()}:`);
    for (const d of items) {
      const icon = getActionIcon(d.action);
      const detail = d.original ? ` (was: ${d.original})` : "";
      const reason = d.reason ? ` — ${d.reason}` : "";
      console.log(`    ${icon} ${d.tag}${detail}${reason}`);
    }
  }

  // Validation summary
  if (validation.invalid.length > 0 || validation.missing.length > 0) {
    console.log("\n  VALIDATION:");
    if (validation.invalid.length > 0) {
      console.log(`    ❌ Invalid: ${validation.invalid.join(", ")}`);
    }
    if (validation.missing.length > 0) {
      console.log(`    ⚠️  Missing: ${validation.missing.join(", ")}`);
    }
  }

  // Warnings
  for (const w of warnings) {
    console.log(`  ⚠️  ${w}`);
  }

  console.log("  " + "─".repeat(50));
}

function getActionIcon(action: TagAction): string {
  switch (action) {
    case "kept": return "✓";
    case "migrated": return "→";
    case "removed": return "✗";
    case "suggested": return "?";
    case "invalid": return "✗";
    case "added": return "+";
    default: return "•";
  }
}

/**
 * Reset cached taxonomy and rules (for testing)
 */
export function resetCache(): void {
  cachedTaxonomy = null;
  cachedMigrationRules = null;
}
