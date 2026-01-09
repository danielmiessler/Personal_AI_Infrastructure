#!/usr/bin/env bun
/**
 * SeoChecker - Analyze content files for SEO best practices
 *
 * Migrated from PAIv1 ContentPublishing skill with enhancements:
 * - Astro file support (frontmatter extraction)
 * - Modular exports for programmatic use
 * - Configurable rules
 * - ASIN and affiliate link validation ready
 *
 * Usage (CLI):
 *   bun run checker.ts FILE [--json]
 *   bun run checker.ts --all [--dir=content/]
 *
 * Usage (Module):
 *   import { SeoChecker, analyzeFile } from './checker';
 */

import { readFileSync, existsSync } from 'fs';
import { Glob } from 'bun';
import { basename } from 'path';
import type { SeoAnalysis, SeoIssue } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface SeoReport {
  file: string;
  score: number;
  issues: SeoIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
    passed: number;
  };
  passed: boolean;
}

export interface Frontmatter {
  title?: string;
  description?: string;
  keywords?: string[];
  pubDate?: string;
  date?: string;
  author?: string;
  image?: string;
  heroImage?: string;
  [key: string]: unknown;
}

export interface SeoConfig {
  minWordCount?: number;
  titleMinLength?: number;
  titleMaxLength?: number;
  descMinLength?: number;
  descMaxLength?: number;
  minH2Count?: number;
  minLinkCount?: number;
}

const DEFAULT_CONFIG: Required<SeoConfig> = {
  minWordCount: 300,
  titleMinLength: 30,
  titleMaxLength: 60,
  descMinLength: 120,
  descMaxLength: 160,
  minH2Count: 2,
  minLinkCount: 2
};

// ============================================================================
// Parser
// ============================================================================

/**
 * Parse frontmatter from Astro or Markdown files
 */
export function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  // Astro format: ---\nimport...\n---\n then later ---\ntitle: etc\n---
  // Or standard markdown: ---\nyaml\n---\ncontent

  // Try to extract Astro component script first
  const astroMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!astroMatch) {
    return { frontmatter: {}, body: content };
  }

  let yamlSection = astroMatch[1];
  let body = astroMatch[2];

  // Check if there's a second frontmatter block (Astro style with imports first)
  const secondFrontmatter = body.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (secondFrontmatter) {
    // First block was imports, second is actual frontmatter
    yamlSection = secondFrontmatter[1];
    body = secondFrontmatter[2];
  }

  // Extract from Astro variable assignments like: const title = "..."
  const variableAssignments = astroMatch[1].match(/const\s+(\w+)\s*=\s*["']([^"']+)["']/g);
  const frontmatter: Frontmatter = {};

  if (variableAssignments) {
    for (const assignment of variableAssignments) {
      const match = assignment.match(/const\s+(\w+)\s*=\s*["']([^"']+)["']/);
      if (match) {
        frontmatter[match[1]] = match[2];
      }
    }
  }

  // Parse YAML-style frontmatter
  const lines = yamlSection.split('\n');
  for (const line of lines) {
    // Skip import statements and comments
    if (line.trim().startsWith('import ') || line.trim().startsWith('//')) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();

      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Handle arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        frontmatter[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/['"]/g, ''));
      } else if (value) {
        frontmatter[key] = value;
      }
    }
  }

  return { frontmatter, body };
}

// ============================================================================
// SEO Checker Class
// ============================================================================

export class SeoChecker {
  private config: Required<SeoConfig>;

  constructor(config: SeoConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze a file and return SEO report
   */
  analyze(filePath: string): SeoReport {
    const content = readFileSync(filePath, 'utf-8');
    return this.analyzeContent(content, filePath);
  }

  /**
   * Analyze content string
   */
  analyzeContent(content: string, fileName: string = 'content'): SeoReport {
    const { frontmatter, body } = parseFrontmatter(content);
    const issues: SeoIssue[] = [];

    // --- Title Checks ---
    const title = frontmatter.title as string | undefined;
    if (title) {
      const titleLen = title.length;
      if (titleLen >= this.config.titleMinLength && titleLen <= this.config.titleMaxLength) {
        issues.push({
          type: 'info',
          rule: 'title-length',
          message: `Title is ${titleLen} chars (optimal: ${this.config.titleMinLength}-${this.config.titleMaxLength})`
        });
      } else {
        issues.push({
          type: 'warning',
          rule: 'title-length',
          message: `Title is ${titleLen} chars (should be ${this.config.titleMinLength}-${this.config.titleMaxLength})`
        });
      }
    } else {
      issues.push({
        type: 'error',
        rule: 'title-missing',
        message: 'Missing title in frontmatter'
      });
    }

    // --- Description Checks ---
    const description = frontmatter.description as string | undefined;
    if (description) {
      const descLen = description.length;
      if (descLen >= this.config.descMinLength && descLen <= this.config.descMaxLength) {
        issues.push({
          type: 'info',
          rule: 'description-length',
          message: `Description is ${descLen} chars (optimal: ${this.config.descMinLength}-${this.config.descMaxLength})`
        });
      } else {
        issues.push({
          type: 'warning',
          rule: 'description-length',
          message: `Description is ${descLen} chars (should be ${this.config.descMinLength}-${this.config.descMaxLength})`
        });
      }
    } else {
      issues.push({
        type: 'error',
        rule: 'description-missing',
        message: 'Missing description in frontmatter'
      });
    }

    // --- H1 Heading ---
    const h1Match = body.match(/^#\s+(.+)$/m) || body.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) {
      issues.push({
        type: 'info',
        rule: 'h1-present',
        message: `H1 found: "${h1Match[1].slice(0, 40)}${h1Match[1].length > 40 ? '...' : ''}"`
      });
    } else {
      issues.push({
        type: 'error',
        rule: 'h1-missing',
        message: 'Missing H1 heading'
      });
    }

    // --- Multiple H1s ---
    const h1Count = (body.match(/^#\s+/gm) || []).length + (body.match(/<h1/gi) || []).length;
    if (h1Count > 1) {
      issues.push({
        type: 'warning',
        rule: 'multiple-h1',
        message: `Found ${h1Count} H1 headings (should be 1)`
      });
    }

    // --- H2 Structure ---
    const h2Count = (body.match(/^##\s+/gm) || []).length + (body.match(/<h2/gi) || []).length;
    if (h2Count >= this.config.minH2Count) {
      issues.push({
        type: 'info',
        rule: 'h2-structure',
        message: `Good structure with ${h2Count} H2 headings`
      });
    } else {
      issues.push({
        type: 'warning',
        rule: 'h2-structure',
        message: `Only ${h2Count} H2 headings (recommend ${this.config.minH2Count}+)`
      });
    }

    // --- Word Count ---
    // Strip HTML/JSX for word count
    const textOnly = body
      .replace(/<[^>]+>/g, ' ')
      .replace(/\{[^}]+\}/g, ' ')
      .replace(/```[\s\S]*?```/g, ' ');
    const words = textOnly.split(/\s+/).filter(w => w.length > 0).length;

    if (words >= this.config.minWordCount) {
      issues.push({
        type: 'info',
        rule: 'word-count',
        message: `${words} words (minimum ${this.config.minWordCount})`
      });
    } else {
      issues.push({
        type: 'warning',
        rule: 'word-count',
        message: `Only ${words} words (recommend ${this.config.minWordCount}+)`
      });
    }

    // --- Images with Alt Text ---
    const mdImages = body.match(/!\[([^\]]*)\]\([^)]+\)/g) || [];
    const htmlImages = body.match(/<img[^>]+>/gi) || [];
    const allImages = [...mdImages, ...htmlImages];

    if (allImages.length > 0) {
      const missingAlt = mdImages.filter(img => {
        const alt = img.match(/!\[([^\]]*)\]/)?.[1];
        return !alt || alt.length === 0;
      }).length + htmlImages.filter(img => !img.includes('alt=')).length;

      if (missingAlt === 0) {
        issues.push({
          type: 'info',
          rule: 'image-alt',
          message: `All ${allImages.length} images have alt text`
        });
      } else {
        issues.push({
          type: 'warning',
          rule: 'image-alt',
          message: `${missingAlt} of ${allImages.length} images missing alt text`
        });
      }
    }

    // --- Links ---
    const mdLinks = body.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
    const htmlLinks = body.match(/<a[^>]+href/gi) || [];
    const linkCount = mdLinks.length + htmlLinks.length;

    if (linkCount >= this.config.minLinkCount) {
      issues.push({
        type: 'info',
        rule: 'links',
        message: `${linkCount} links found`
      });
    } else {
      issues.push({
        type: 'info',
        rule: 'links',
        message: `Only ${linkCount} links (recommend ${this.config.minLinkCount}+)`
      });
    }

    // --- Featured Image ---
    const heroImage = frontmatter.image || frontmatter.heroImage;
    if (heroImage) {
      issues.push({
        type: 'info',
        rule: 'featured-image',
        message: 'Featured image specified'
      });
    } else {
      issues.push({
        type: 'warning',
        rule: 'featured-image',
        message: 'No featured image in frontmatter'
      });
    }

    // --- Calculate Score ---
    const errors = issues.filter(i => i.type === 'error').length;
    const warnings = issues.filter(i => i.type === 'warning').length;
    const info = issues.filter(i => i.type === 'info').length;

    const score = Math.max(0, 100 - (errors * 20) - (warnings * 10));

    return {
      file: fileName,
      score,
      issues,
      summary: {
        errors,
        warnings,
        info,
        passed: info
      },
      passed: errors === 0 && score >= 80
    };
  }

  /**
   * Analyze multiple files
   */
  async analyzeDirectory(dir: string, pattern: string = '**/*.{md,astro}'): Promise<SeoReport[]> {
    const reports: SeoReport[] = [];
    const glob = new Glob(pattern);

    for await (const file of glob.scan({ cwd: dir, absolute: true })) {
      if (file.includes('node_modules')) continue;
      reports.push(this.analyze(file));
    }

    return reports;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick analysis of a single file
 */
export function analyzeFile(filePath: string, config?: SeoConfig): SeoReport {
  const checker = new SeoChecker(config);
  return checker.analyze(filePath);
}

/**
 * Quick analysis of content string
 */
export function analyzeContent(content: string, config?: SeoConfig): SeoReport {
  const checker = new SeoChecker(config);
  return checker.analyzeContent(content);
}

// ============================================================================
// CLI Interface
// ============================================================================

function formatReport(report: SeoReport): string {
  let output = `\n${'='.repeat(60)}\n`;
  output += `SEO Report: ${basename(report.file)}\n`;
  output += `${'='.repeat(60)}\n\n`;

  const scoreIcon = report.score >= 80 ? '✅' : report.score >= 60 ? '⚠️' : '❌';
  output += `${scoreIcon} Score: ${report.score}/100\n`;
  output += `Errors: ${report.summary.errors} | Warnings: ${report.summary.warnings} | Passed: ${report.summary.passed}\n\n`;

  for (const issue of report.issues) {
    const icon = issue.type === 'info' ? '✅' : issue.type === 'warning' ? '⚠️' : '❌';
    output += `${icon} [${issue.rule}] ${issue.message}\n`;
  }

  return output;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help') {
    console.log(`
SEO Checker - Analyze content files for SEO best practices

Usage:
  bun run checker.ts FILE [--json]
  bun run checker.ts --all [--dir=content/]

Supports: Markdown (.md) and Astro (.astro) files

Examples:
  bun run checker.ts article.astro
  bun run checker.ts --all --dir=src/pages/articles
`);
    process.exit(0);
  }

  let outputJson = false;
  let checkAll = false;
  let dir = '.';
  let targetFile: string | undefined;

  for (const arg of args) {
    if (arg === '--json') outputJson = true;
    else if (arg === '--all') checkAll = true;
    else if (arg.startsWith('--dir=')) dir = arg.split('=')[1];
    else if (!arg.startsWith('--')) targetFile = arg;
  }

  const checker = new SeoChecker();
  const reports: SeoReport[] = [];

  if (checkAll) {
    const allReports = await checker.analyzeDirectory(dir);
    reports.push(...allReports);
  } else if (targetFile) {
    if (!existsSync(targetFile)) {
      console.error(`❌ File not found: ${targetFile}`);
      process.exit(1);
    }
    reports.push(checker.analyze(targetFile));
  }

  if (outputJson) {
    console.log(JSON.stringify(reports, null, 2));
  } else {
    for (const report of reports) {
      console.log(formatReport(report));
    }

    if (reports.length > 1) {
      const avgScore = reports.reduce((sum, r) => sum + r.score, 0) / reports.length;
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Summary: ${reports.length} files, Average Score: ${avgScore.toFixed(0)}/100`);
    }
  }

  // Exit with error if any critical issues
  const hasErrors = reports.some(r => r.summary.errors > 0);
  if (hasErrors) {
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export { SeoChecker as default };
