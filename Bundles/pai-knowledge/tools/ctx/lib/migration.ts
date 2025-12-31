/**
 * Migration Module - Tag Migration Tooling
 *
 * Provides migration rules loading and tag transformation.
 * REQ-MIGRATE-001 through REQ-MIGRATE-015
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import { parse as parseYaml } from "yaml";
import { join } from "path";
import { homedir } from "os";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface MigrationRules {
  version: string;
  taxonomy_target: string;
  replacements?: Record<string, string>;
  prefix_rules?: Record<string, { pattern: string; prefix: string }>;
  consolidations?: Array<{ sources: string[]; target: string }>;
  hierarchy?: Record<string, Record<string, string>>;
  expansions?: Record<string, { expand_to: string[]; remove_original: boolean }>;
  removals?: {
    exact?: string[];
    patterns?: string[];
  };
}

export interface MigrationResult {
  original: string;
  migrated: string[];
  action: "replaced" | "prefixed" | "consolidated" | "hierarchical" | "expanded" | "removed" | "unchanged";
  rule?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════

const MIGRATIONS_DIR = join(homedir(), ".claude", "context", "migrations");
const DEFAULT_RULES = "default-rules";

// ═══════════════════════════════════════════════════════════════════════════
// Rules Loading
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load migration rules from file
 */
export async function loadMigrationRules(name: string = DEFAULT_RULES): Promise<MigrationRules> {
  const path = join(MIGRATIONS_DIR, `${name}.yaml`);

  if (!existsSync(path)) {
    throw new Error(`Migration rules not found: ${path}`);
  }

  const content = readFileSync(path, "utf-8");
  const rules = parseYaml(content) as MigrationRules;

  // Validate on load
  const validation = validateRules(rules);
  if (!validation.valid) {
    throw new Error(`Invalid migration rules: ${validation.errors.join(", ")}`);
  }

  return rules;
}

/**
 * Get default migration rules
 */
export async function getDefaultRules(): Promise<MigrationRules> {
  return loadMigrationRules(DEFAULT_RULES);
}

/**
 * List available migration rule files
 */
export function listMigrationRules(): string[] {
  if (!existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  const files = readdirSync(MIGRATIONS_DIR) as string[];
  return files
    .filter((f: string) => f.endsWith(".yaml"))
    .map((f: string) => f.replace(".yaml", ""));
}

// ═══════════════════════════════════════════════════════════════════════════
// Rules Validation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate migration rules file format
 */
export function validateRules(rules: MigrationRules): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!rules.version) {
    errors.push("Missing required field: version");
  } else if (!/^\d+\.\d+$/.test(rules.version)) {
    errors.push("Version must be in format X.Y (e.g., 1.0)");
  }

  if (!rules.taxonomy_target) {
    errors.push("Missing required field: taxonomy_target");
  }

  // Validate patterns in removals
  if (rules.removals?.patterns) {
    for (const pattern of rules.removals.patterns) {
      try {
        new RegExp(pattern);
      } catch {
        errors.push(`Invalid removal pattern: ${pattern}`);
      }
    }
  }

  // Validate patterns in prefix_rules
  if (rules.prefix_rules) {
    for (const [name, rule] of Object.entries(rules.prefix_rules)) {
      try {
        new RegExp(rule.pattern);
      } catch {
        errors.push(`Invalid prefix pattern for ${name}: ${rule.pattern}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Tag Migration Logic
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Migrate a single tag according to rules
 * Returns array because some rules expand to multiple tags
 */
export function migrateTag(tag: string, rules: MigrationRules): MigrationResult {
  // 1. Check exact removals first
  if (rules.removals?.exact?.includes(tag)) {
    return {
      original: tag,
      migrated: [],
      action: "removed",
      rule: `exact removal: ${tag}`,
    };
  }

  // 2. Check pattern removals
  if (rules.removals?.patterns) {
    for (const pattern of rules.removals.patterns) {
      const regex = new RegExp(pattern);
      if (regex.test(tag)) {
        return {
          original: tag,
          migrated: [],
          action: "removed",
          rule: `pattern removal: ${pattern}`,
        };
      }
    }
  }

  // 3. Check consolidations (before replacements)
  if (rules.consolidations) {
    for (const consolidation of rules.consolidations) {
      if (consolidation.sources.includes(tag)) {
        return {
          original: tag,
          migrated: [consolidation.target],
          action: "consolidated",
          rule: `consolidated: ${consolidation.sources.join(", ")} → ${consolidation.target}`,
        };
      }
    }
  }

  // 4. Check direct replacements
  if (rules.replacements && tag in rules.replacements) {
    return {
      original: tag,
      migrated: [rules.replacements[tag]],
      action: "replaced",
      rule: `replaced: ${tag} → ${rules.replacements[tag]}`,
    };
  }

  // 5. Check hierarchy mappings
  if (rules.hierarchy) {
    for (const [parent, children] of Object.entries(rules.hierarchy)) {
      if (tag in children) {
        return {
          original: tag,
          migrated: [children[tag]],
          action: "hierarchical",
          rule: `hierarchy: ${tag} → ${children[tag]}`,
        };
      }
    }
  }

  // 6. Check expansions
  if (rules.expansions && tag in rules.expansions) {
    const expansion = rules.expansions[tag];
    return {
      original: tag,
      migrated: expansion.expand_to,
      action: "expanded",
      rule: `expanded: ${tag} → [${expansion.expand_to.join(", ")}]`,
    };
  }

  // 7. Check prefix rules (only for unprefixed tags)
  if (rules.prefix_rules && !tag.includes("/")) {
    for (const [name, rule] of Object.entries(rules.prefix_rules)) {
      const regex = new RegExp(rule.pattern);
      if (regex.test(tag)) {
        return {
          original: tag,
          migrated: [`${rule.prefix}${tag}`],
          action: "prefixed",
          rule: `prefixed: ${tag} → ${rule.prefix}${tag}`,
        };
      }
    }
  }

  // No rule matched
  return {
    original: tag,
    migrated: [tag],
    action: "unchanged",
  };
}

/**
 * Migrate multiple tags
 */
export function migrateTags(tags: string[], rules: MigrationRules): MigrationResult[] {
  return tags.map(tag => migrateTag(tag, rules));
}

/**
 * Apply migration to a set of tags, returning the final tag set
 * Handles deduplication
 */
export function applyMigration(tags: string[], rules: MigrationRules): {
  tags: string[];
  changes: MigrationResult[];
} {
  const changes: MigrationResult[] = [];
  const resultTags = new Set<string>();

  for (const tag of tags) {
    const result = migrateTag(tag, rules);
    changes.push(result);

    // Add migrated tags (could be empty for removals)
    for (const newTag of result.migrated) {
      resultTags.add(newTag);
    }
  }

  return {
    tags: Array.from(resultTags).sort(),
    changes,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase-Based Migration
// ═══════════════════════════════════════════════════════════════════════════

export type MigrationPhase = "garbage" | "system" | "prefixes" | "consolidate";

/**
 * Get a subset of rules for a specific phase
 */
export function getRulesForPhase(rules: MigrationRules, phase: MigrationPhase): MigrationRules {
  const baseRules: MigrationRules = {
    version: rules.version,
    taxonomy_target: rules.taxonomy_target,
  };

  switch (phase) {
    case "garbage":
      baseRules.removals = rules.removals;
      break;
    case "system":
      baseRules.replacements = rules.replacements;
      break;
    case "prefixes":
      baseRules.prefix_rules = rules.prefix_rules;
      break;
    case "consolidate":
      baseRules.consolidations = rules.consolidations;
      baseRules.hierarchy = rules.hierarchy;
      break;
  }

  return baseRules;
}
