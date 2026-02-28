#!/usr/bin/env bun
/**
 * AuditSkills.ts — READ-ONLY diagnostic tool for PAI skill descriptions.
 *
 * Scans all SKILL.md files under ~/.claude/skills, extracts YAML front matter,
 * and reports on description quality, formula compliance, trigger collisions,
 * and actionable recommendations.
 *
 * Usage:  bun run ~/.claude/skills/PAI/Tools/AuditSkills.ts
 *
 * This tool does NOT modify any files.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { homedir } from "node:os";

// ─── Configuration ──────────────────────────────────────────────────────────

const SKILLS_ROOT = join(homedir(), ".claude", "skills");
const MAX_DESC_CHARS = 1024;
const COLLISION_THRESHOLD = 3;

const VAGUE_WORDS = new Set([
  "workflows",
  "management",
  "processing",
  "operations",
  "handling",
  "utilities",
  "tools",
  "services",
  "system",
  "stuff",
  "things",
]);

// ─── Types ──────────────────────────────────────────────────────────────────

interface SkillAudit {
  name: string;
  path: string;
  description: string;
  charCount: number;
  hasFormula: boolean;
  triggerPhrases: string[];
  triggerCount: number;
  hasSkillSearchSuffix: boolean;
  isVague: boolean;
  issues: string[];
}

// ─── Front Matter Extraction ────────────────────────────────────────────────

function extractFrontMatter(
  content: string
): { name: string; description: string } | null {
  const fmRegex = /^---\s*\n([\s\S]*?)\n---/;
  const match = content.match(fmRegex);
  if (!match) return null;

  const fmBlock = match[1];

  // Extract name field — handles both quoted and unquoted values
  const nameMatch = fmBlock.match(/^name:\s*(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim().replace(/^['"]|['"]$/g, "") : "";

  // Extract description field — handles multi-line (indented continuation)
  const descMatch = fmBlock.match(/^description:\s*(.+(?:\n(?![\w]).*?)*)$/m);
  const description = descMatch
    ? descMatch[1]
        .replace(/\n\s+/g, " ")
        .trim()
        .replace(/^['"]|['"]$/g, "")
    : "";

  if (!name && !description) return null;
  return { name, description };
}

// ─── Trigger Phrase Extraction ──────────────────────────────────────────────

function extractTriggerPhrases(description: string): string[] {
  const useWhenMatch = description.match(/USE WHEN\s+(.+?)(?:\.|$)/i);
  if (!useWhenMatch) return [];

  let triggerSection = useWhenMatch[1];

  // Strip trailing SkillSearch(...) or similar suffixes before parsing
  triggerSection = triggerSection.replace(/\s*SkillSearch\(.+?\).*$/i, "");

  // Split on commas, "OR", semicolons
  const phrases = triggerSection
    .split(/,|(?:\s+OR\s+)/i)
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length > 0 && !p.startsWith("skillsearch"));

  return phrases;
}

// ─── Vagueness Detection ────────────────────────────────────────────────────

function isDescriptionVague(description: string): boolean {
  // Extract the "what" portion — everything before "USE WHEN"
  const whatPortion = description.split(/USE WHEN/i)[0].trim();
  if (!whatPortion) return false;

  // Remove trailing period
  const cleaned = whatPortion.replace(/\.\s*$/, "").trim().toLowerCase();

  // Tokenize into meaningful words (skip the skill name if it appears)
  const words = cleaned
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (words.length === 0) return false;

  // Vague = the description's "what" contains ONLY a noun + a vague word
  // e.g., "Sales workflows." (2 words, 1 is vague) vs "Sales proposal generation workflows." (4 words)
  if (words.length <= 2) {
    return words.some((w) => VAGUE_WORDS.has(w));
  }

  return false;
}

// ─── SkillSearch Suffix Detection ───────────────────────────────────────────

function hasSkillSearchSuffix(description: string): boolean {
  return /SkillSearch\s*\(/i.test(description);
}

// ─── Formula Check ──────────────────────────────────────────────────────────

function followsFormula(description: string): boolean {
  return /USE WHEN/i.test(description);
}

// ─── Discover SKILL.md Files ────────────────────────────────────────────────

function discoverSkillFiles(): string[] {
  const paths: string[] = [];

  function walkDir(dir: string, depth: number): void {
    if (depth > 3) return; // prevent deep recursion
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            // Check for SKILL.md directly inside
            const skillMdPath = join(fullPath, "SKILL.md");
            try {
              statSync(skillMdPath);
              paths.push(skillMdPath);
            } catch {
              // No SKILL.md here, recurse
            }
            walkDir(fullPath, depth + 1);
          }
        } catch {
          // Skip inaccessible entries
        }
      }
    } catch {
      // Skip inaccessible directories
    }
  }

  walkDir(SKILLS_ROOT, 0);

  // Deduplicate
  return [...new Set(paths)];
}

// ─── Audit a Single Skill ───────────────────────────────────────────────────

function auditSkill(filePath: string): SkillAudit | null {
  const content = readFileSync(filePath, "utf-8");
  const fm = extractFrontMatter(content);
  if (!fm) return null;

  const dirName = basename(dirname(filePath));
  const name = fm.name || dirName;
  const description = fm.description;

  if (!description) {
    return {
      name,
      path: filePath,
      description: "(empty)",
      charCount: 0,
      hasFormula: false,
      triggerPhrases: [],
      triggerCount: 0,
      hasSkillSearchSuffix: false,
      isVague: false,
      issues: ["No description"],
    };
  }

  const charCount = description.length;
  const formula = followsFormula(description);
  const triggers = extractTriggerPhrases(description);
  const skillSearch = hasSkillSearchSuffix(description);
  const vague = isDescriptionVague(description);

  const issues: string[] = [];
  if (charCount > MAX_DESC_CHARS) issues.push(`>${MAX_DESC_CHARS} chars`);
  if (!formula) issues.push("No USE WHEN formula");
  if (skillSearch) issues.push("SkillSearch suffix");
  if (vague) issues.push("Vague description");

  return {
    name,
    path: filePath,
    description,
    charCount,
    hasFormula: formula,
    triggerPhrases: triggers,
    triggerCount: triggers.length,
    hasSkillSearchSuffix: skillSearch,
    isVague: vague,
    issues,
  };
}

// ─── Trigger Collision Detection ────────────────────────────────────────────

interface Collision {
  skillA: string;
  skillB: string;
  shared: string[];
}

// Stop words to ignore in collision detection — these appear in natural-language
// trigger descriptions but carry no semantic signal for skill routing.
const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "shall",
  "should", "may", "might", "must", "can", "could", "to", "of", "in",
  "for", "on", "with", "at", "by", "from", "as", "into", "through",
  "during", "before", "after", "above", "below", "between", "out",
  "off", "over", "under", "again", "further", "then", "once", "here",
  "there", "when", "where", "why", "how", "all", "each", "every",
  "both", "few", "more", "most", "other", "some", "such", "no", "nor",
  "not", "only", "own", "same", "so", "than", "too", "very", "just",
  "because", "but", "and", "or", "if", "while", "about", "up", "down",
  "that", "this", "these", "those", "it", "its", "i", "me", "my",
  "we", "our", "you", "your", "he", "him", "his", "she", "her",
  "they", "them", "their", "what", "which", "who", "whom",
  // Common trigger-description filler words
  "user", "says", "any", "form", "requests", "request", "asks",
  "mentions", "wants", "needs",
]);

/**
 * Normalize a trigger phrase into meaningful keywords by stripping
 * quotes, punctuation, stop words, and short tokens.
 */
function triggerKeywords(phrase: string): string[] {
  return phrase
    .replace(/['"()]/g, "")
    .split(/\s+/)
    .map((w) => w.toLowerCase().replace(/[^a-z0-9-]/g, ""))
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function detectCollisions(audits: SkillAudit[]): Collision[] {
  const collisions: Collision[] = [];

  for (let i = 0; i < audits.length; i++) {
    for (let j = i + 1; j < audits.length; j++) {
      const a = audits[i];
      const b = audits[j];

      if (a.triggerPhrases.length === 0 || b.triggerPhrases.length === 0) {
        continue;
      }

      // First pass: exact phrase-level overlap (strongest signal)
      const setA = new Set(a.triggerPhrases);
      const setB = new Set(b.triggerPhrases);
      const phraseOverlap = [...setA].filter((p) => setB.has(p));

      if (phraseOverlap.length >= COLLISION_THRESHOLD) {
        collisions.push({
          skillA: a.name,
          skillB: b.name,
          shared: phraseOverlap,
        });
        continue;
      }

      // Second pass: keyword-level overlap (filter stop words)
      const kwA = new Set(a.triggerPhrases.flatMap(triggerKeywords));
      const kwB = new Set(b.triggerPhrases.flatMap(triggerKeywords));
      const keywordOverlap = [...kwA].filter((w) => kwB.has(w));

      if (keywordOverlap.length >= COLLISION_THRESHOLD) {
        collisions.push({
          skillA: a.name,
          skillB: b.name,
          shared: keywordOverlap,
        });
      }
    }
  }

  return collisions;
}

// ─── Output Formatting ─────────────────────────────────────────────────────

function padRight(str: string, len: number): string {
  return str.length >= len ? str.substring(0, len) : str + " ".repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str.substring(0, len) : " ".repeat(len - str.length) + str;
}

function renderTable(audits: SkillAudit[]): string {
  const lines: string[] = [];

  // Header
  const header = `${padRight("Skill", 28)} ${padLeft("Chars", 6)}  ${padRight("Formula", 8)} ${padLeft("Triggers", 9)}  Issues`;
  const separator = "\u2500".repeat(80);

  lines.push(header);
  lines.push(separator);

  // Sort by name
  const sorted = [...audits].sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );

  for (const skill of sorted) {
    const formulaStr = skill.hasFormula ? "\u2713" : "\u2717";
    const issueStr =
      skill.issues.length === 0
        ? "\u2705 Clean"
        : skill.issues.map((i) => `\u26A0\uFE0F  ${i}`).join(", ");

    const line = `${padRight(skill.name, 28)} ${padLeft(String(skill.charCount), 6)}  ${padRight(formulaStr, 8)} ${padLeft(String(skill.triggerCount), 9)}  ${issueStr}`;
    lines.push(line);
  }

  return lines.join("\n");
}

function renderCollisions(collisions: Collision[]): string {
  if (collisions.length === 0) return "No trigger collisions detected.";

  return collisions
    .map(
      (c) =>
        `${c.skillA} <-> ${c.skillB}: [${c.shared.join(", ")}] (${c.shared.length} shared)`
    )
    .join("\n");
}

function renderRecommendations(audits: SkillAudit[]): string {
  const recs: string[] = [];

  // SkillSearch suffix
  const withSS = audits.filter((a) => a.hasSkillSearchSuffix);
  if (withSS.length > 0) {
    recs.push(
      `Remove SkillSearch suffix from ${withSS.length} skill(s): ${withSS.map((a) => a.name).join(", ")}`
    );
  }

  // Vague descriptions
  const vague = audits.filter((a) => a.isVague);
  if (vague.length > 0) {
    recs.push(
      `Rewrite vague descriptions: ${vague.map((a) => a.name).join(", ")}`
    );
  }

  // Missing formula
  const noFormula = audits.filter((a) => !a.hasFormula);
  if (noFormula.length > 0) {
    recs.push(
      `Add USE WHEN trigger formula to ${noFormula.length} skill(s): ${noFormula.map((a) => a.name).join(", ")}`
    );
  }

  // Over limit
  const overLimit = audits.filter((a) => a.charCount > MAX_DESC_CHARS);
  if (overLimit.length > 0) {
    recs.push(
      `Shorten descriptions over ${MAX_DESC_CHARS} chars: ${overLimit.map((a) => `${a.name} (${a.charCount})`).join(", ")}`
    );
  }

  // Low trigger count
  const lowTriggers = audits.filter(
    (a) => a.hasFormula && a.triggerCount < 3
  );
  if (lowTriggers.length > 0) {
    recs.push(
      `Add more trigger phrases (< 3) to: ${lowTriggers.map((a) => `${a.name} (${a.triggerCount})`).join(", ")}`
    );
  }

  // Empty descriptions
  const empty = audits.filter((a) => a.charCount === 0);
  if (empty.length > 0) {
    recs.push(
      `Add descriptions to: ${empty.map((a) => a.name).join(", ")}`
    );
  }

  if (recs.length === 0) {
    return "All skill descriptions look healthy. No action needed.";
  }

  return recs.map((r) => `\u2022 ${r}`).join("\n");
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main(): void {
  const boxTop    = "\u2554" + "\u2550".repeat(62) + "\u2557";
  const boxTitle  = "\u2551" + padRight("", 17) + "SKILL DESCRIPTION AUDIT" + padRight("", 22) + "\u2551";
  const boxBottom = "\u255A" + "\u2550".repeat(62) + "\u255D";

  console.log();
  console.log(boxTop);
  console.log(boxTitle);
  console.log(boxBottom);
  console.log();

  // Discover skill files
  const skillFiles = discoverSkillFiles();
  console.log(`Found ${skillFiles.length} SKILL.md files in ${SKILLS_ROOT}\n`);

  // Audit each skill
  const audits: SkillAudit[] = [];
  for (const filePath of skillFiles) {
    const audit = auditSkill(filePath);
    if (audit) audits.push(audit);
  }

  if (audits.length === 0) {
    console.log("No skills with parseable front matter found.");
    return;
  }

  // Render main table
  console.log(renderTable(audits));
  console.log();

  // Summary stats
  const totalSkills = audits.length;
  const cleanSkills = audits.filter((a) => a.issues.length === 0).length;
  const totalIssues = audits.reduce((sum, a) => sum + a.issues.length, 0);
  const avgChars = Math.round(
    audits.reduce((sum, a) => sum + a.charCount, 0) / totalSkills
  );

  console.log(
    `\u2550\u2550\u2550 SUMMARY \u2550\u2550\u2550`
  );
  console.log(
    `Total skills: ${totalSkills}  |  Clean: ${cleanSkills}  |  Issues: ${totalIssues}  |  Avg chars: ${avgChars}`
  );
  console.log();

  // Trigger collisions
  console.log(
    `\u2550\u2550\u2550 TRIGGER COLLISIONS \u2550\u2550\u2550`
  );
  const collisions = detectCollisions(audits);
  console.log(renderCollisions(collisions));
  console.log();

  // Recommendations
  console.log(
    `\u2550\u2550\u2550 RECOMMENDATIONS \u2550\u2550\u2550`
  );
  console.log(renderRecommendations(audits));
  console.log();
}

main();
