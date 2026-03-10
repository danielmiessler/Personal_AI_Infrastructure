/**
 * 11-skills.test.ts — Skill Directory Validation (Cross-Platform Suite)
 *
 * Validates all SKILL.md files in the skills/ directory:
 *   - Dynamic discovery of all skill directories (including sub-skills)
 *   - Frontmatter structure (name, description fields)
 *   - File size sanity (> 50 bytes, < 100KB)
 *   - Hygiene checks (no node_modules, no .env files)
 *   - TypeScript parsability for skills with .ts files
 *
 * Run: bun test tests/cross-platform/11-skills.test.ts
 */

import { describe, test, expect } from 'bun:test';
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { SKILLS_DIR, V3_ROOT, SLOW_TIMEOUT, bunRun } from '../windows/helpers';

// ─── Skill Discovery ─────────────────────────────────────────────────────────

/**
 * Recursively find all directories containing a SKILL.md file.
 * Returns an array of { name, dir, skillMdPath } for each discovered skill.
 */
function discoverSkills(baseDir: string): Array<{ name: string; dir: string; skillMdPath: string }> {
  const skills: Array<{ name: string; dir: string; skillMdPath: string }> = [];

  function scan(dir: string, depth: number): void {
    // Limit recursion depth to avoid traversing node_modules etc.
    if (depth > 3) return;

    let entries: ReturnType<typeof readdirSync>;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    const hasSkillMd = entries.some(e => e.isFile() && e.name === 'SKILL.md');
    if (hasSkillMd) {
      const relPath = relative(baseDir, dir);
      const name = relPath || 'root';
      skills.push({
        name,
        dir,
        skillMdPath: join(dir, 'SKILL.md'),
      });
    }

    // Recurse into subdirectories (skip hidden dirs and node_modules)
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        scan(join(dir, entry.name), depth + 1);
      }
    }
  }

  scan(baseDir, 0);
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Recursively find all .ts files in a directory.
 */
function findTsFiles(dir: string): string[] {
  const tsFiles: string[] = [];

  function scan(d: string): void {
    let entries: ReturnType<typeof readdirSync>;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = join(d, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        scan(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        tsFiles.push(fullPath);
      }
    }
  }

  scan(dir);
  return tsFiles;
}

// Discover all skills once at import time
const ALL_SKILLS = discoverSkills(SKILLS_DIR);

// ─── Section 1: Skill Directory Discovery ────────────────────────────────────

describe('Skill Directory Discovery', () => {
  test('skills/ directory exists', () => {
    expect(existsSync(SKILLS_DIR)).toBe(true);
  });

  test('discovers at least 35 SKILL.md files', () => {
    expect(ALL_SKILLS.length).toBeGreaterThanOrEqual(35);
  });

  test('discovered skill list is non-empty and each has a valid path', () => {
    for (const skill of ALL_SKILLS) {
      expect(skill.name.length).toBeGreaterThan(0);
      expect(existsSync(skill.skillMdPath)).toBe(true);
    }
  });

  test('includes known top-level skills', () => {
    const names = ALL_SKILLS.map(s => s.name);
    const knownSkills = ['Research', 'Browser', 'FirstPrinciples', 'PAI', 'Agents'];
    for (const expected of knownSkills) {
      expect(names).toContain(expected);
    }
  });

  test('includes Documents sub-skills (Docx, Pdf, Pptx, Xlsx)', () => {
    const names = ALL_SKILLS.map(s => s.name);
    const subSkills = ['Documents/Docx', 'Documents/Pdf', 'Documents/Pptx', 'Documents/Xlsx'];
    for (const expected of subSkills) {
      // Normalize separators for cross-platform comparison
      const found = names.some(n => n.replace(/\\/g, '/') === expected);
      expect(found).toBe(true);
    }
  });
});

// ─── Section 2: Structure Validation ─────────────────────────────────────────

describe('Skill Structure Validation', () => {
  for (const skill of ALL_SKILLS) {
    describe(skill.name, () => {
      test('SKILL.md exists and is non-empty (> 50 bytes)', () => {
        const stat = statSync(skill.skillMdPath);
        expect(stat.size).toBeGreaterThan(50);
      });

      test('SKILL.md is under 100KB', () => {
        const stat = statSync(skill.skillMdPath);
        expect(stat.size).toBeLessThan(100_000);
      });

      test('SKILL.md starts with frontmatter (--- delimiter) or is a generated composite', () => {
        const content = readFileSync(skill.skillMdPath, 'utf-8');
        const trimmed = content.trimStart();
        // Generated/composite files (e.g. PAI/SKILL.md) start with <!-- comment -->
        const hasFrontmatter = trimmed.startsWith('---');
        const isGeneratedComposite = trimmed.startsWith('<!--');
        expect(hasFrontmatter || isGeneratedComposite).toBe(true);
      });

      test('SKILL.md has name: field in frontmatter (skip if generated composite)', () => {
        const content = readFileSync(skill.skillMdPath, 'utf-8');
        const trimmed = content.trimStart();
        // Generated composites (like PAI/SKILL.md) may embed frontmatter differently
        if (trimmed.startsWith('<!--')) return;
        // Extract frontmatter between first two --- delimiters
        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        expect(fmMatch).not.toBeNull();
        if (fmMatch) {
          const frontmatter = fmMatch[1];
          expect(frontmatter).toMatch(/^name:\s*.+/m);
        }
      });

      test('SKILL.md has description: field in frontmatter (skip if generated composite)', () => {
        const content = readFileSync(skill.skillMdPath, 'utf-8');
        const trimmed = content.trimStart();
        if (trimmed.startsWith('<!--')) return;
        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        expect(fmMatch).not.toBeNull();
        if (fmMatch) {
          const frontmatter = fmMatch[1];
          expect(frontmatter).toMatch(/^description:\s*.+/m);
        }
      });
    });
  }
});

// ─── Section 3: Hygiene ──────────────────────────────────────────────────────

describe('Skill Hygiene', () => {
  for (const skill of ALL_SKILLS) {
    describe(skill.name, () => {
      test('no node_modules/ directory', () => {
        const nodeModulesPath = join(skill.dir, 'node_modules');
        expect(existsSync(nodeModulesPath)).toBe(false);
      });

      test('no .env files in skill root', () => {
        let entries: ReturnType<typeof readdirSync>;
        try {
          entries = readdirSync(skill.dir);
        } catch {
          entries = [];
        }
        const envFiles = entries.filter(e =>
          e === '.env' || e.startsWith('.env.')
        );
        expect(envFiles).toHaveLength(0);
      });
    });
  }
});

// ─── Section 4: TypeScript Parsability ───────────────────────────────────────

describe('Skill TypeScript Import', () => {
  // Instead of listing every dependency, catch Bun's universal "Could not resolve" error
  // which covers ALL missing npm packages (apify-client, playwright, next, uuid, clsx, etc.)
  const KNOWN_SKIP_PATTERNS = [
    'Could not resolve',  // Universal Bun message for any missing npm dependency
    'yaml',               // SecurityValidator-style yaml dependency
  ];

  for (const skill of ALL_SKILLS) {
    const tsFiles = findTsFiles(skill.dir);

    // Only test skills that have TypeScript files
    if (tsFiles.length === 0) continue;

    describe(skill.name, () => {
      for (const tsFile of tsFiles) {
        const fileName = relative(skill.dir, tsFile);

        test(`${fileName} can be parsed by Bun`, () => {
          const result = bunRun(
            ['build', '--no-emit', '--target', 'bun', tsFile],
            { timeout: SLOW_TIMEOUT },
          );

          // If the build fails, check if it is a known dependency issue
          if (result.status !== 0) {
            const stderr = result.stderr || '';
            const isKnownDep = KNOWN_SKIP_PATTERNS.some(dep => stderr.includes(dep));
            if (isKnownDep) {
              console.warn(`KNOWN DEPENDENCY: ${skill.name}/${fileName} — skipping parse check`);
              return;
            }
            // Not a known dependency — this is a real failure
            expect(result.status).toBe(0);
          }
        }, SLOW_TIMEOUT);
      }
    });
  }
});
