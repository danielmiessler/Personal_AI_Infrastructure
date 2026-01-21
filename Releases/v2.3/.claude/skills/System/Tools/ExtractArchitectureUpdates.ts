#!/usr/bin/env bun
/**
 * ExtractArchitectureUpdates - One-time migration script
 *
 * Extracts inline updates from ARCHITECTURE.md (lines 1134-1642)
 * and creates individual update files in the proper directory structure.
 *
 * Note: This is a historical tool kept for reference. It was used to
 * migrate updates from the old ARCHITECTURE.md format to individual files.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const PAI_DIR = process.env.PAI_DIR || `${process.env.HOME}/.claude`;
const ARCHITECTURE_PATH = join(PAI_DIR, "skills/CORE/SYSTEM/ARCHITECTURE.md");
const UPDATES_DIR = join(PAI_DIR, "MEMORY/PAISYSTEMUPDATES");

interface ExtractedUpdate {
  date: string;
  title: string;
  type: string;
  impact: string;
  version?: string;
  content: string;
  files?: string[];
}

function kebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50); // Limit length
}

function determineType(content: string): string {
  const typeLine = content.match(/\*\*Type:\*\*\s*(.+)/i);
  if (typeLine) {
    const typeText = typeLine[1].toLowerCase();
    if (typeText.includes("architectural")) return "architectural";
    if (typeText.includes("feature")) return "feature";
    if (typeText.includes("documentation")) return "documentation";
    if (typeText.includes("identity")) return "identity";
    if (typeText.includes("infrastructure")) return "infrastructure";
    if (typeText.includes("correction")) return "correction";
  }
  return "architectural"; // Default
}

function determineImpact(content: string): string {
  if (content.toLowerCase().includes("major")) return "major";
  if (content.toLowerCase().includes("minor")) return "minor";
  return "minor"; // Default
}

function extractVersion(content: string): string | undefined {
  const versionMatch = content.match(/v(\d+\.\d+\.\d+)/);
  return versionMatch ? `v${versionMatch[1]}` : undefined;
}

function extractFiles(content: string): string[] {
  const files: string[] = [];
  const filesMatch = content.match(/\*\*Files:?\*\*([^*]+?)(?=\*\*|---|\n\n#|$)/is);
  if (filesMatch) {
    const filesSection = filesMatch[1];
    const fileMatches = filesSection.matchAll(/[-*]\s*(?:Created|Modified|Deleted|Moved|Renamed)?:?\s*([^\n,]+)/gi);
    for (const match of fileMatches) {
      const file = match[1].trim().replace(/^\[.*?\]\s*/, '');
      if (file && !file.startsWith('**') && file.length < 100) {
        files.push(file);
      }
    }
  }
  return files;
}

function parseUpdates(content: string): ExtractedUpdate[] {
  const updates: ExtractedUpdate[] = [];

  // Find the System Evolution section
  const evolutionStart = content.indexOf("## System Evolution & Updates");
  if (evolutionStart === -1) {
    console.error("Could not find System Evolution section");
    return updates;
  }

  // Extract just that section
  const section = content.slice(evolutionStart);

  // Split by ### headers (each update starts with ### YYYY-MM-DD)
  const updateSections = section.split(/(?=^### \d{4})/gm).slice(1);

  for (const updateSection of updateSections) {
    // Parse the header: ### YYYY-MM-DD: Title
    const headerMatch = updateSection.match(/^### (\d{4}-\d{2}-\d{2}):\s*(.+?)(?:\n|$)/);
    if (!headerMatch) {
      // Try alternate format without colon
      const altMatch = updateSection.match(/^### (\d{4}-\d{2}-\d{2})\s+(.+?)(?:\n|$)/);
      if (!altMatch) continue;

      const [, date, title] = altMatch;
      updates.push({
        date,
        title: title.trim(),
        type: determineType(updateSection),
        impact: determineImpact(updateSection),
        version: extractVersion(updateSection),
        content: updateSection,
        files: extractFiles(updateSection),
      });
      continue;
    }

    const [, date, title] = headerMatch;

    updates.push({
      date,
      title: title.trim(),
      type: determineType(updateSection),
      impact: determineImpact(updateSection),
      version: extractVersion(updateSection),
      content: updateSection,
      files: extractFiles(updateSection),
    });
  }

  return updates;
}

function generateUpdateFile(update: ExtractedUpdate): string {
  const id = `${update.date}_${kebabCase(update.title)}`;
  const tags = determineTags(update);

  const frontmatter = [
    "---",
    `id: "${id}"`,
    `date: "${update.date}"`,
    `title: "${update.title.replace(/"/g, '\\"')}"`,
    `type: "${update.type}"`,
    `impact: "${update.impact}"`,
  ];

  if (update.version) {
    frontmatter.push(`version: "${update.version}"`);
  }

  frontmatter.push(`tags: [${tags.map(t => `"${t}"`).join(", ")}]`);

  if (update.files && update.files.length > 0) {
    frontmatter.push("files_affected:");
    for (const file of update.files.slice(0, 10)) { // Limit to 10 files
      frontmatter.push(`  - "${file}"`);
    }
  }

  frontmatter.push("---");
  frontmatter.push("");

  // Clean up the content - remove the ### header since we'll use # for the title
  let body = update.content
    .replace(/^###\s+\d{4}-\d{2}-\d{2}:?\s*.+\n+/, '')
    .trim();

  // Add the main title
  const fullContent = `# ${update.title}\n\n**Date:** ${update.date}\n**Type:** ${update.type.charAt(0).toUpperCase() + update.type.slice(1)}\n**Impact:** ${update.impact}${update.version ? `\n**Version:** ${update.version}` : ''}\n\n---\n\n${body}`;

  return frontmatter.join("\n") + fullContent;
}

function determineTags(update: ExtractedUpdate): string[] {
  const tags: string[] = [];
  const content = update.content.toLowerCase();

  if (content.includes("skill")) tags.push("skill");
  if (content.includes("browser")) tags.push("browser");
  if (content.includes("voice")) tags.push("voice");
  if (content.includes("hook")) tags.push("hooks");
  if (content.includes("agent")) tags.push("agents");
  if (content.includes("mcp")) tags.push("mcp");
  if (content.includes("context")) tags.push("context");
  if (content.includes("session")) tags.push("session");
  if (content.includes("naming") || content.includes("rename")) tags.push("naming");
  if (content.includes("documentation") || content.includes("docs")) tags.push("documentation");
  if (content.includes("performance") || content.includes("optimization")) tags.push("performance");

  return tags.slice(0, 5); // Limit to 5 tags
}

async function main() {
  console.log("Reading ARCHITECTURE.md...");
  const content = await readFile(ARCHITECTURE_PATH, "utf-8");

  console.log("Parsing updates...");
  const updates = parseUpdates(content);
  console.log(`Found ${updates.length} updates`);

  // Create files
  let created = 0;
  let skipped = 0;

  for (const update of updates) {
    const [year, month] = update.date.split("-");
    const dirPath = join(UPDATES_DIR, year, month);

    // Create directory
    await mkdir(dirPath, { recursive: true });

    // Generate filename
    const filename = `${update.date}_${kebabCase(update.title)}.md`;
    const filePath = join(dirPath, filename);

    // Check if we already have this file (from the migrated files)
    try {
      await readFile(filePath);
      console.log(`  Skipping (exists): ${filename}`);
      skipped++;
      continue;
    } catch {
      // File doesn't exist, create it
    }

    // Generate content
    const fileContent = generateUpdateFile(update);

    // Write file
    await writeFile(filePath, fileContent);
    console.log(`  Created: ${year}/${month}/${filename}`);
    created++;
  }

  console.log(`\nDone!`);
  console.log(`  Created: ${created} files`);
  console.log(`  Skipped: ${skipped} files (already exist)`);
  console.log(`\nNext: Run 'bun UpdateIndex.ts regenerate' to update the index`);
}

main().catch(console.error);
