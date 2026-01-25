#!/usr/bin/env bun
/**
 * PAI Protected Files Validator
 *
 * Ensures PAI-specific files haven't been overwritten with Kai content.
 * Run before committing changes to PAI repository.
 *
 * Usage:
 *   bun ~/Projects/PAI/Tools/validate-protected.ts
 *   bun ~/Projects/PAI/Tools/validate-protected.ts --staged  (check only staged files)
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface PatternCategory {
  description: string;
  patterns: string[];
}

interface ProtectedPatterns {
  description: string;
  categories: {
    [name: string]: PatternCategory;
  };
  exception_files: string[];
  exception_contexts?: {
    description: string;
    allowed_prefixes: string[];
  };
}

interface ProtectedManifest {
  version: string;
  protected: {
    [category: string]: {
      description: string;
      files?: string[];
      patterns?: string[];
      exception_files?: string[];
      validation?: string;
    };
    protected_patterns?: ProtectedPatterns;
  };
}

const PAI_ROOT = join(import.meta.dir, '..');
const MANIFEST_PATH = join(PAI_ROOT, '.pai-protected.json');

// Colors for terminal output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function loadManifest(): ProtectedManifest {
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`${RED}❌ Protected files manifest not found: ${MANIFEST_PATH}${RESET}`);
    process.exit(1);
  }

  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
}

function getStagedFiles(): string[] {
  try {
    const output = execSync('git diff --cached --name-only', {
      cwd: PAI_ROOT,
      encoding: 'utf-8'
    });
    return output.trim().split('\n').filter(f => f.length > 0);
  } catch {
    return [];
  }
}

function checkForbiddenDirectories(stagedFiles: string[], manifest: ProtectedManifest): string[] {
  const violations: string[] = [];
  const forbiddenDirs = manifest.protected.forbidden_directories;

  if (!forbiddenDirs || !forbiddenDirs.patterns) {
    return violations;
  }

  for (const file of stagedFiles) {
    for (const pattern of forbiddenDirs.patterns) {
      const regex = new RegExp(pattern);
      if (regex.test(file)) {
        violations.push(`Forbidden directory file staged: ${file} (matches pattern: ${pattern})`);
      }
    }
  }

  return violations;
}

/**
 * Extract all patterns from the categorized structure
 */
function getAllPatterns(patternCategory: ProtectedPatterns): { category: string; pattern: string }[] {
  const allPatterns: { category: string; pattern: string }[] = [];

  if (!patternCategory.categories) {
    return allPatterns;
  }

  for (const [categoryName, category] of Object.entries(patternCategory.categories)) {
    if (category.patterns) {
      for (const pattern of category.patterns) {
        allPatterns.push({ category: categoryName, pattern });
      }
    }
  }

  return allPatterns;
}

/**
 * Check if content has an allowed exception context (e.g., "# Example:", "placeholder")
 */
function hasExceptionContext(line: string, patternCategory: ProtectedPatterns): boolean {
  const allowedPrefixes = patternCategory.exception_contexts?.allowed_prefixes || [];

  for (const prefix of allowedPrefixes) {
    if (line.toLowerCase().includes(prefix.toLowerCase())) {
      return true;
    }
  }

  return false;
}

function scanAllFilesForSensitiveContent(stagedFiles: string[], manifest: ProtectedManifest): {
  file: string;
  violations: string[];
}[] {
  const results: { file: string; violations: string[] }[] = [];
  const patternCategory = manifest.protected.protected_patterns as ProtectedPatterns | undefined;

  if (!patternCategory || !patternCategory.categories) {
    return results;
  }

  const exceptions = patternCategory.exception_files || [];
  const allPatterns = getAllPatterns(patternCategory);

  for (const file of stagedFiles) {
    // Skip exception files
    if (exceptions.includes(file)) {
      continue;
    }

    // Check wildcard exceptions (e.g., "Packs/*/README.md", "Releases/*/.claude/skills/*/SKILL.md")
    const isWildcardException = exceptions.some(exc => {
      if (exc.includes('*')) {
        // Escape special regex characters except *, then replace * with [^/]+
        const escapedPattern = exc
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&')  // Escape special chars
          .replace(/\*/g, '[^/]+');               // Replace * with path segment matcher
        return new RegExp(`^${escapedPattern}$`).test(file);
      }
      return false;
    });

    if (isWildcardException) {
      continue;
    }

    const fullPath = join(PAI_ROOT, file);

    // Skip if file doesn't exist (might be deleted)
    if (!existsSync(fullPath)) {
      continue;
    }

    // Skip binary files
    try {
      const content = readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      const violations: string[] = [];

      for (const { category, pattern } of allPatterns) {
        try {
          const regex = new RegExp(pattern, 'gi');
          const matchingLines: { line: number; text: string }[] = [];

          lines.forEach((lineText, idx) => {
            regex.lastIndex = 0; // Reset regex state
            if (regex.test(lineText)) {
              // Check if this line has an exception context
              if (!hasExceptionContext(lineText, patternCategory)) {
                matchingLines.push({ line: idx + 1, text: lineText.trim().slice(0, 60) });
              }
            }
          });

          if (matchingLines.length > 0) {
            const lineInfo = matchingLines.slice(0, 3)
              .map(m => `L${m.line}`)
              .join(', ');
            const moreInfo = matchingLines.length > 3 ? ` (+${matchingLines.length - 3} more)` : '';
            violations.push(`[${category}] Pattern: ${pattern.slice(0, 40)}${pattern.length > 40 ? '...' : ''} at ${lineInfo}${moreInfo}`);
          }
        } catch {
          // Invalid regex, skip
        }
      }

      if (violations.length > 0) {
        results.push({ file, violations });
      }
    } catch {
      // Binary file or read error, skip
    }
  }

  return results;
}

function getAllProtectedFiles(manifest: ProtectedManifest): string[] {
  const files: string[] = [];

  for (const category of Object.values(manifest.protected)) {
    if (category.files) {
      files.push(...category.files);
    }
  }

  return files;
}

function checkFileContent(filePath: string, manifest: ProtectedManifest): {
  valid: boolean;
  violations: string[];
} {
  const fullPath = join(PAI_ROOT, filePath);

  if (!existsSync(fullPath)) {
    return { valid: true, violations: [] };
  }

  const content = readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  const violations: string[] = [];

  // Get exception files list (applies to ALL checks, not just patterns)
  const patternCategory = manifest.protected.protected_patterns as ProtectedPatterns | undefined;
  const exceptions = patternCategory?.exception_files || [];
  const isException = exceptions.includes(filePath);

  // Check for forbidden patterns from categorized structure (skip if exception)
  if (patternCategory && patternCategory.categories && !isException) {
    const allPatterns = getAllPatterns(patternCategory);

    for (const { category, pattern } of allPatterns) {
      try {
        const regex = new RegExp(pattern, 'gi');
        let matchCount = 0;
        const matchingLineNums: number[] = [];

        lines.forEach((lineText, idx) => {
          regex.lastIndex = 0;
          if (regex.test(lineText)) {
            // Check for exception context
            if (!hasExceptionContext(lineText, patternCategory)) {
              matchCount++;
              if (matchingLineNums.length < 3) {
                matchingLineNums.push(idx + 1);
              }
            }
          }
        });

        if (matchCount > 0) {
          const lineInfo = matchingLineNums.length > 0
            ? ` (lines: ${matchingLineNums.join(', ')}${matchCount > 3 ? '...' : ''})`
            : '';
          violations.push(`[${category}] Found: "${pattern.slice(0, 50)}${pattern.length > 50 ? '...' : ''}" (${matchCount} occurrence(s))${lineInfo}`);
        }
      } catch {
        // Invalid regex, skip
      }
    }
  }

  // Check category-specific validation
  for (const [categoryName, category] of Object.entries(manifest.protected)) {
    if (!category.files?.includes(filePath) || !category.validation) {
      continue;
    }

    // Core documents must reference PAI
    if (category.validation.includes('PAI')) {
      if (!content.includes('PAI') && !content.includes('Personal AI Infrastructure')) {
        violations.push(`Missing required reference to "PAI" or "Personal AI Infrastructure"`);
      }
    }

    // Must not contain private Kai data (skip if exception file)
    if (category.validation.includes('private Kai data') && !isException) {
      const privatePatterns = [
        /\/Users\/daniel\/\.claude\/skills\/personal/,
        /daemon\.plist/,
        /Kai \(Personal AI Infrastructure\)/,
      ];

      for (const pattern of privatePatterns) {
        if (pattern.test(content)) {
          violations.push(`Contains private Kai reference: ${pattern.source}`);
        }
      }
    }

    // Must not contain secrets (skip if exception file)
    if (category.validation.includes('secrets') && !isException) {
      const secretPatterns = [
        /ANTHROPIC_API_KEY=sk-/,
        /ELEVENLABS_API_KEY=(?!your_elevenlabs_api_key_here)/,
        /PERPLEXITY_API_KEY=(?!your_perplexity_api_key_here)/,
        /@danielmiessler\.com/,
        /@unsupervised-learning\.com/,
      ];

      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          violations.push(`Contains secret or personal email: ${pattern.source}`);
        }
      }
    }
  }

  return { valid: violations.length === 0, violations };
}

async function main() {
  const args = process.argv.slice(2);
  const stagedOnly = args.includes('--staged');

  console.log(`\n${BLUE}🛡️  PAI Protected Files Validator${RESET}\n`);
  console.log('='.repeat(60));

  const manifest = loadManifest();
  const allProtectedFiles = getAllProtectedFiles(manifest);

  // Determine which files to check
  let filesToCheck: string[];

  if (stagedOnly) {
    const stagedFiles = getStagedFiles();

    // Check for forbidden directories FIRST
    const forbiddenViolations = checkForbiddenDirectories(stagedFiles, manifest);
    if (forbiddenViolations.length > 0) {
      console.log(`\n${RED}🚫 FORBIDDEN DIRECTORIES DETECTED${RESET}\n`);
      for (const violation of forbiddenViolations) {
        console.log(`${RED}❌${RESET} ${violation}`);
      }
      console.log('\n' + '='.repeat(60));
      console.log(`\n${RED}🚫 COMMIT BLOCKED${RESET}\n`);
      console.log('These directories contain private Kai data and must NOT be in public PAI.');
      console.log('\n' + YELLOW + 'To fix:' + RESET);
      console.log('  1. git reset HEAD <file> to unstage');
      console.log('  2. rm -rf <directory> to remove');
      console.log('  3. Add to .gitignore if needed\n');
      process.exit(1);
    }

    // Scan ALL staged files for sensitive content
    console.log(`\n${YELLOW}Scanning ${stagedFiles.length} staged file(s) for sensitive content...${RESET}\n`);
    const sensitiveResults = scanAllFilesForSensitiveContent(stagedFiles, manifest);

    if (sensitiveResults.length > 0) {
      console.log(`${RED}🚫 SENSITIVE CONTENT DETECTED${RESET}\n`);
      for (const result of sensitiveResults) {
        console.log(`${RED}❌${RESET} ${result.file}`);
        for (const violation of result.violations) {
          console.log(`   ${RED}→${RESET} ${violation}`);
        }
      }
      console.log('\n' + '='.repeat(60));
      console.log(`\n${RED}🚫 COMMIT BLOCKED${RESET}\n`);
      console.log('Files contain sensitive content that must NOT be in public PAI:\n');
      console.log('  Categories checked:');
      console.log('  - api_keys          (Anthropic, OpenAI, AWS, Stripe, etc.)');
      console.log('  - github_tokens     (ghp_, gho_, github_pat_, etc.)');
      console.log('  - slack_tokens      (xoxb-, xoxp-, etc.)');
      console.log('  - webhooks          (Discord, Slack, ntfy, Zapier)');
      console.log('  - database_credentials');
      console.log('  - private_keys      (RSA, SSH, PGP, etc.)');
      console.log('  - pii_ssn_financial (SSN, EIN, credit cards)');
      console.log('  - pii_phone         (phone numbers)');
      console.log('  - personal_emails   (@gmail, @yahoo, etc.)');
      console.log('  - private_paths     (/Users/daniel/, ~/.claude/)');
      console.log('  - internal_infrastructure (private IPs, .internal.)');
      console.log('  - customer_data     (customer_id, client_name)');
      console.log('  - team_members      (real names of team members)');
      console.log('  - credentials_inline (password=, secret=)');
      console.log('  - cloudflare        (CF tokens and zone IDs)');
      console.log('  - misc_sensitive    (.pem, .key, service accounts)');
      console.log('\n' + YELLOW + 'To fix:' + RESET);
      console.log('  1. Remove or redact the sensitive content');
      console.log('  2. Use placeholder values (e.g., "YOUR_API_KEY_HERE")');
      console.log('  3. Wrap in example context (e.g., "# Example: sk-...")');
      console.log('  4. Add file to exception_files if intentional\n');
      process.exit(1);
    }

    console.log(`${GREEN}✅ No sensitive content found in staged files${RESET}\n`);
    console.log('='.repeat(60));

    filesToCheck = allProtectedFiles.filter(f => stagedFiles.includes(f));

    if (filesToCheck.length === 0) {
      console.log(`\n${GREEN}✅ No protected files staged for commit${RESET}\n`);
      process.exit(0);
    }

    console.log(`\n${YELLOW}Checking ${filesToCheck.length} staged protected file(s)...${RESET}\n`);
  } else {
    filesToCheck = allProtectedFiles;
    console.log(`\n${YELLOW}Checking all ${filesToCheck.length} protected files...${RESET}\n`);
  }

  let hasViolations = false;
  const results: { file: string; valid: boolean; violations: string[] }[] = [];

  // Check each file
  for (const file of filesToCheck) {
    const result = checkFileContent(file, manifest);
    results.push({ file, ...result });

    if (!result.valid) {
      hasViolations = true;
    }
  }

  // Print results
  for (const result of results) {
    if (result.valid) {
      console.log(`${GREEN}✅${RESET} ${result.file}`);
    } else {
      console.log(`${RED}❌${RESET} ${result.file}`);
      for (const violation of result.violations) {
        console.log(`   ${RED}→${RESET} ${violation}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));

  if (hasViolations) {
    console.log(`\n${RED}🚫 VALIDATION FAILED${RESET}\n`);
    console.log('Protected files contain content that should not be in public PAI.');
    console.log('\n' + YELLOW + 'Common fixes:' + RESET);
    console.log('  1. Remove API keys and secrets');
    console.log('  2. Remove personal email addresses');
    console.log('  3. Remove references to private Kai data');
    console.log('  4. Ensure PAI-specific files reference "PAI" not "Kai"');
    console.log('\n📖 See .pai-protected.json for details\n');
    process.exit(1);
  } else {
    console.log(`\n${GREEN}✅ All protected files validated successfully!${RESET}\n`);
    console.log('Safe to commit to PAI repository.\n');
    process.exit(0);
  }
}

main();
