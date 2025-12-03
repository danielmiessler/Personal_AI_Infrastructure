/**
 * Validation Module
 *
 * Validates test results against expected outcomes.
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import { join, basename } from "path";
import { parse as parseYaml } from "yaml";
import type { TestSpec, ValidationResult, ValidationCheck } from "./types";

// =============================================================================
// Main Validation Function
// =============================================================================

/**
 * Validate test output against expected results
 */
export function validateTestOutput(
  spec: TestSpec,
  output: TestOutput
): ValidationResult {
  const startTime = Date.now();
  const checks: ValidationCheck[] = [];

  // Check vault file was created
  if (output.vaultFiles.length > 0) {
    checks.push({
      name: "vault_file_created",
      passed: true,
      actual: output.vaultFiles,
      reasoning: `Verified vault file(s) created: ${output.vaultFiles.map(f => basename(f)).join(", ")}`,
    });
  } else {
    checks.push({
      name: "vault_file_created",
      passed: false,
      error: "No vault file created",
      reasoning: "No vault markdown file was generated in the output directory",
    });
  }

  // Parse frontmatter from vault file
  // For tags/frontmatter: use first file (Raw)
  // For content: check ALL files (including Wisdom file from Fabric patterns)
  let frontmatter: Record<string, unknown> = {};
  let content = "";
  if (output.vaultFiles.length > 0) {
    const parsed = parseVaultFile(output.vaultFiles[0]);
    frontmatter = parsed.frontmatter;
    // Collect content from all vault files for content validation
    content = output.vaultFiles.map(f => parseVaultFile(f).content).join("\n\n");
  }

  // Validate tags
  if (spec.expected.tags) {
    for (const expectedTag of spec.expected.tags) {
      const tags = (frontmatter.tags as string[]) || [];
      const found = tags.some(t =>
        t.toLowerCase() === expectedTag.toLowerCase() ||
        t.toLowerCase().replace(/-/g, "_") === expectedTag.toLowerCase().replace(/-/g, "_")
      );
      checks.push({
        name: `tag_present:${expectedTag}`,
        passed: found,
        expected: expectedTag,
        actual: tags,
        error: found ? undefined : `Tag "${expectedTag}" not found`,
        reasoning: found
          ? `Examined frontmatter tags array [${tags.join(", ")}] - found expected tag "${expectedTag}"`
          : `Examined frontmatter tags array [${tags.join(", ")}] - expected tag "${expectedTag}" was not present`,
      });
    }
  }

  // Validate excluded tags
  if (spec.expected.excludeTags) {
    for (const excludedTag of spec.expected.excludeTags) {
      const tags = (frontmatter.tags as string[]) || [];
      const found = tags.some(t => t.toLowerCase() === excludedTag.toLowerCase());
      checks.push({
        name: `tag_absent:${excludedTag}`,
        passed: !found,
        expected: `NOT ${excludedTag}`,
        actual: tags,
        error: found ? `Tag "${excludedTag}" should not be present` : undefined,
        reasoning: !found
          ? `Verified frontmatter tags [${tags.join(", ")}] do not include excluded tag "${excludedTag}"`
          : `Found unwanted tag "${excludedTag}" in frontmatter tags [${tags.join(", ")}]`,
      });
    }
  }

  // Validate frontmatter fields
  if (spec.expected.frontmatter) {
    for (const [key, expectedValue] of Object.entries(spec.expected.frontmatter)) {
      const actualValue = frontmatter[key];
      let passed: boolean;
      let reasonDetail: string;

      if (expectedValue === "string") {
        // Just check that field exists and is a string
        passed = typeof actualValue === "string";
        reasonDetail = passed
          ? `field "${key}" exists with string value "${actualValue}"`
          : `field "${key}" is ${actualValue === undefined ? "missing" : "not a string"}`;
      } else {
        passed = actualValue === expectedValue;
        reasonDetail = passed
          ? `field "${key}" = "${actualValue}" matches expected "${expectedValue}"`
          : `field "${key}" = "${actualValue}" does not match expected "${expectedValue}"`;
      }

      checks.push({
        name: `frontmatter:${key}`,
        passed,
        expected: expectedValue,
        actual: actualValue,
        error: passed ? undefined : `Frontmatter "${key}" mismatch`,
        reasoning: `Examined vault file frontmatter: ${reasonDetail}`,
      });
    }
  }

  // Validate verbose output
  if (spec.expected.verboseOutput) {
    for (const expectedText of spec.expected.verboseOutput) {
      // Normalize both sides: remove quotes and extra whitespace
      const normalizedOutput = output.verboseOutput
        .toLowerCase()
        .replace(/["']/g, "")
        .replace(/\s+/g, " ");
      const normalizedExpected = expectedText
        .toLowerCase()
        .replace(/["']/g, "")
        .replace(/\s+/g, " ");
      const found = normalizedOutput.includes(normalizedExpected);
      checks.push({
        name: `verbose:${expectedText.slice(0, 30)}`,
        passed: found,
        expected: expectedText,
        error: found ? undefined : `Verbose output missing: "${expectedText}"`,
        reasoning: found
          ? `Searched console output and found expected text "${expectedText}"`
          : `Searched console output but "${expectedText}" was not present`,
      });
    }
  }

  // Validate content
  if (spec.expected.content?.contains) {
    for (const expectedText of spec.expected.content.contains) {
      const found = content.toLowerCase().includes(expectedText.toLowerCase());
      checks.push({
        name: `content_contains:${expectedText.slice(0, 20)}`,
        passed: found,
        expected: expectedText,
        error: found ? undefined : `Content missing: "${expectedText}"`,
        reasoning: found
          ? `Searched vault file content (${content.length} chars) - found expected text "${expectedText}"`
          : `Searched vault file content (${content.length} chars) - expected text "${expectedText}" not found`,
      });
    }
  }

  if (spec.expected.content?.notContains) {
    for (const excludedText of spec.expected.content.notContains) {
      const found = content.toLowerCase().includes(excludedText.toLowerCase());
      checks.push({
        name: `content_excludes:${excludedText.slice(0, 20)}`,
        passed: !found,
        expected: `NOT "${excludedText}"`,
        error: found ? `Content should not contain: "${excludedText}"` : undefined,
        reasoning: !found
          ? `Verified vault file content does not contain excluded text "${excludedText}"`
          : `Found unwanted text "${excludedText}" in vault file content`,
      });
    }
  }

  // Validate pipeline - check frontmatter field, not verbose output
  if (spec.expected.pipeline) {
    const actualPipeline = frontmatter.pipeline as string | undefined;
    const passed = actualPipeline?.toLowerCase() === spec.expected.pipeline.toLowerCase();
    checks.push({
      name: `pipeline:${spec.expected.pipeline}`,
      passed,
      expected: spec.expected.pipeline,
      actual: actualPipeline,
      error: passed ? undefined : `Expected pipeline: ${spec.expected.pipeline}, got: ${actualPipeline}`,
      reasoning: passed
        ? `Checked frontmatter 'pipeline' field: "${actualPipeline}" matches expected "${spec.expected.pipeline}"`
        : `Checked frontmatter 'pipeline' field: "${actualPipeline}" does not match expected "${spec.expected.pipeline}"`,
    });
  }

  // Validate archive filename pattern
  if (spec.expected.archiveFilenamePattern) {
    const pattern = new RegExp(spec.expected.archiveFilenamePattern, "i");
    const archiveFile = output.dropboxPath || output.vaultFiles.find(f => f.includes("archive"));
    const filename = archiveFile ? basename(archiveFile) : "";
    const matched = pattern.test(filename);
    checks.push({
      name: "archive_filename_pattern",
      passed: matched,
      expected: spec.expected.archiveFilenamePattern,
      actual: filename,
      error: matched ? undefined : `Archive filename doesn't match pattern`,
      reasoning: matched
        ? `Checked archive filename "${filename}" matches pattern /${spec.expected.archiveFilenamePattern}/i`
        : `Archive filename "${filename}" does not match expected pattern /${spec.expected.archiveFilenamePattern}/i`,
    });
  }

  // Validate Dropbox sync
  if (spec.expected.dropboxSync) {
    const synced = !!output.dropboxPath;
    checks.push({
      name: "dropbox_sync",
      passed: synced,
      expected: true,
      actual: synced,
      error: synced ? undefined : "Expected Dropbox sync",
      reasoning: synced
        ? `Verified file synced to Dropbox at: ${output.dropboxPath}`
        : "No Dropbox sync path was returned - file was not synced",
    });
  }

  // Validate note filename date
  if (spec.expected.noteFilenameDate) {
    const expectedDate = spec.expected.noteFilenameDate;
    const noteFile = output.vaultFiles[0];
    const filename = noteFile ? basename(noteFile) : "";
    const hasDate = filename.startsWith(expectedDate);
    checks.push({
      name: "note_filename_date",
      passed: hasDate,
      expected: expectedDate,
      actual: filename.slice(0, 10),
      error: hasDate ? undefined : `Note filename should start with ${expectedDate}`,
      reasoning: hasDate
        ? `Verified vault filename "${filename}" starts with expected date "${expectedDate}" (document date preserved)`
        : `Vault filename "${filename}" starts with "${filename.slice(0, 10)}" instead of expected "${expectedDate}"`,
    });
  }

  // Validate events
  if (spec.expected.events) {
    if (spec.expected.events.severity) {
      const found = output.verboseOutput.includes(spec.expected.events.severity);
      checks.push({
        name: `events_severity:${spec.expected.events.severity}`,
        passed: found,
        expected: spec.expected.events.severity,
        reasoning: found
          ? `Found events notification with severity "${spec.expected.events.severity}" in console output`
          : `Events notification with severity "${spec.expected.events.severity}" not found in console output`,
      });
    }
  }

  // Calculate overall result
  const passed = checks.every(c => c.passed);
  const duration = Date.now() - startTime;

  return {
    testId: spec.id,
    passed,
    duration,
    checks,
    outputFiles: output.vaultFiles,
    verboseOutput: output.verboseOutput,
  };
}

// =============================================================================
// Helper Types
// =============================================================================

export interface TestOutput {
  /** Vault files created */
  vaultFiles: string[];
  /** Captured verbose output */
  verboseOutput: string;
  /** Dropbox path if archive */
  dropboxPath?: string;
  /** Events notification sent */
  eventsNotification?: Record<string, unknown>;
}

// =============================================================================
// Vault File Parsing
// =============================================================================

/**
 * Parse vault file into frontmatter and content
 */
export function parseVaultFile(filepath: string): {
  frontmatter: Record<string, unknown>;
  content: string;
} {
  if (!existsSync(filepath)) {
    return { frontmatter: {}, content: "" };
  }

  const text = readFileSync(filepath, "utf-8");

  // Check for frontmatter
  if (!text.startsWith("---")) {
    return { frontmatter: {}, content: text };
  }

  const endIndex = text.indexOf("---", 3);
  if (endIndex === -1) {
    return { frontmatter: {}, content: text };
  }

  const yamlStr = text.slice(3, endIndex).trim();
  const content = text.slice(endIndex + 3).trim();

  try {
    const frontmatter = parseYaml(yamlStr) as Record<string, unknown>;
    return { frontmatter, content };
  } catch {
    return { frontmatter: {}, content: text };
  }
}

/**
 * Find vault files created in a directory after a timestamp
 */
export function findNewVaultFiles(
  vaultPath: string,
  afterTimestamp: number,
  pattern?: string
): string[] {
  const files: string[] = [];

  function scan(dir: string) {
    if (!existsSync(dir)) return;

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip hidden dirs and _meta
        if (!entry.name.startsWith(".") && entry.name !== "_meta") {
          scan(fullPath);
        }
      } else if (entry.name.endsWith(".md")) {
        const stat = Bun.file(fullPath);
        // Note: Bun.file doesn't have mtime, would need fs.statSync
        // For now, match by pattern
        if (!pattern || fullPath.includes(pattern)) {
          files.push(fullPath);
        }
      }
    }
  }

  scan(vaultPath);
  return files;
}
