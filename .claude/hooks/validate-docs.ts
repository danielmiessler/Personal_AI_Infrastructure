#!/usr/bin/env bun
/**
 * Documentation Link Validator
 *
 * Validates that all internal markdown links point to existing files.
 * Runs as part of the pre-commit hook to prevent broken documentation.
 *
 * Usage:
 *   bun run .claude/hooks/validate-docs.ts
 *
 * Exit codes:
 *   0 - All links valid
 *   1 - Broken links found
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { globSync } from 'glob';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

interface BrokenLink {
  file: string;
  link: string;
  target: string;
  line: number;
}

/**
 * Extract markdown links from content
 */
function extractLinks(content: string): { link: string; line: number }[] {
  const links: { link: string; line: number }[] = [];
  const lines = content.split('\n');

  // Match [text](path) pattern for internal links
  const linkPattern = /\[([^\]]*)\]\(([^)]+)\)/g;

  lines.forEach((line, index) => {
    let match;
    while ((match = linkPattern.exec(line)) !== null) {
      const linkPath = match[2];

      // Only check internal links (not URLs)
      if (!linkPath.startsWith('http://') &&
          !linkPath.startsWith('https://') &&
          !linkPath.startsWith('mailto:') &&
          !linkPath.startsWith('#')) {

        // Remove anchor portion for file existence check
        const pathWithoutAnchor = linkPath.split('#')[0];

        links.push({
          link: linkPath,
          line: index + 1,
        });
      }
    }
  });

  return links;
}

/**
 * Resolve a link path relative to the file containing it
 */
function resolveLink(fromFile: string, linkPath: string, baseDir: string): string {
  // Remove anchor
  const pathWithoutAnchor = linkPath.split('#')[0];

  if (!pathWithoutAnchor) {
    // Link is just an anchor (e.g., #section) - always valid
    return '';
  }

  // Handle absolute paths (relative to repo root)
  if (pathWithoutAnchor.startsWith('/')) {
    return join(baseDir, pathWithoutAnchor);
  }

  // Handle relative paths
  const fileDir = dirname(fromFile);
  return resolve(fileDir, pathWithoutAnchor);
}

/**
 * Validate all markdown files in the repository
 */
function validateDocs(baseDir: string): BrokenLink[] {
  const brokenLinks: BrokenLink[] = [];

  // Find all markdown files
  const mdFiles = globSync('**/*.md', {
    cwd: baseDir,
    ignore: ['**/node_modules/**', '**/fabric-repo/**'],
  });

  console.log(`${colors.cyan}📚 Validating ${mdFiles.length} markdown files...${colors.reset}`);

  for (const file of mdFiles) {
    const fullPath = join(baseDir, file);
    const content = readFileSync(fullPath, 'utf-8');
    const links = extractLinks(content);

    for (const { link, line } of links) {
      const target = resolveLink(fullPath, link, baseDir);

      // Skip anchor-only links
      if (!target) continue;

      // Check if target exists
      if (!existsSync(target)) {
        brokenLinks.push({
          file,
          link,
          target,
          line,
        });
      }
    }
  }

  return brokenLinks;
}

/**
 * Check for common documentation issues
 */
function checkDocIssues(baseDir: string): string[] {
  const issues: string[] = [];

  // Check if SKILL.md exists for each skill
  const skillDirs = globSync('.claude/skills/*/', {
    cwd: baseDir,
  });

  for (const skillDir of skillDirs) {
    const skillMd = join(baseDir, skillDir, 'SKILL.md');
    if (!existsSync(skillMd)) {
      issues.push(`Missing SKILL.md in ${skillDir}`);
    }
  }

  // Check if README exists
  if (!existsSync(join(baseDir, 'README.md'))) {
    issues.push('Missing README.md in repository root');
  }

  return issues;
}

/**
 * Main execution
 */
function main(): number {
  const baseDir = process.cwd();

  console.log(`\n${colors.cyan}🔍 PAI Documentation Validator${colors.reset}`);
  console.log(`${colors.cyan}   Base directory: ${baseDir}${colors.reset}\n`);

  // Validate links
  const brokenLinks = validateDocs(baseDir);

  // Check for other issues
  const docIssues = checkDocIssues(baseDir);

  // Report results
  let hasErrors = false;

  if (brokenLinks.length > 0) {
    hasErrors = true;
    console.log(`\n${colors.red}❌ Found ${brokenLinks.length} broken link(s):${colors.reset}\n`);

    for (const { file, link, line } of brokenLinks) {
      console.log(`  ${colors.yellow}${file}:${line}${colors.reset}`);
      console.log(`    → ${colors.red}${link}${colors.reset} (not found)\n`);
    }
  }

  if (docIssues.length > 0) {
    hasErrors = true;
    console.log(`\n${colors.yellow}⚠️  Found ${docIssues.length} documentation issue(s):${colors.reset}\n`);

    for (const issue of docIssues) {
      console.log(`  - ${issue}`);
    }
  }

  if (!hasErrors) {
    console.log(`${colors.green}✅ All documentation links are valid${colors.reset}\n`);
    return 0;
  }

  console.log(`\n${colors.red}Documentation validation failed. Please fix the issues above.${colors.reset}\n`);
  return 1;
}

process.exit(main());
