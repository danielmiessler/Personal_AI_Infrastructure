/**
 * Forbidden Pattern Regression Tests
 *
 * Prevents future changes from reintroducing platform-specific patterns
 * that break Windows support. Each test greps the v3.0 codebase for
 * patterns that MUST remain at zero (or a known baseline).
 *
 * These tests are the CI equivalent of the steering rules in CLAUDE.md
 * Section 1 (Forbidden Patterns). They run on ALL platforms.
 *
 * Run: bun test tests/windows/07-forbidden-patterns.test.ts
 */

import { describe, test, expect } from 'bun:test';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { V3_ROOT, SLOW_TIMEOUT } from './helpers';

// ─── File Scanner ─────────────────────────────────────────────────────────────

/** Recursively collect all .ts files in a directory, excluding test files and known exceptions */
function collectTsFiles(dir: string, files: string[] = []): string[] {
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        collectTsFiles(fullPath, files);
      } else if (
        extname(entry.name) === '.ts' &&
        !entry.name.endsWith('.test.ts') &&
        !entry.name.endsWith('.d.ts') &&
        entry.name !== 'platform.ts' &&          // The abstraction layer itself
        entry.name !== 'smoke-test-windows.ts' && // Test file that references patterns
        !fullPath.includes('tests/windows') &&     // This test suite (Unix paths)
        !fullPath.includes('tests\\windows') &&    // This test suite (Windows paths)
        entry.name !== 'manage.ts'                  // Voice CLI uses platform-guarded launchctl/schtasks in execSync
      ) {
        files.push(fullPath);
      }
    }
  } catch { /* skip unreadable dirs */ }
  return files;
}

/** Count occurrences of a regex pattern across all collected .ts files */
function countPattern(pattern: RegExp, files: string[]): { count: number; locations: string[] } {
  const locations: string[] = [];
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        // Skip lines that are CLAUDE.md references (in comments)
        if (lines[i].includes('CLAUDE.md')) continue;
        // Skip shebang lines
        if (i === 0 && lines[i].startsWith('#!')) continue;
        // Skip comment-only lines
        const trimmed = lines[i].trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

        if (pattern.test(lines[i])) {
          const relPath = file.replace(V3_ROOT, '').replace(/^[/\\]/, '');
          locations.push(`${relPath}:${i + 1}`);
        }
      }
    } catch { /* skip unreadable files */ }
  }
  return { count: locations.length, locations };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Forbidden Pattern Regression Audit', () => {
  let tsFiles: string[];

  // Collect files once for all tests
  tsFiles = collectTsFiles(V3_ROOT);

  test('collected TypeScript files for scanning', () => {
    expect(tsFiles.length).toBeGreaterThan(20); // Sanity check
  }, SLOW_TIMEOUT);

  describe('FP-1: No bare process.env.HOME! without fallback', () => {
    test('zero occurrences of process.env.HOME! in non-platform code', () => {
      const { count, locations } = countPattern(/process\.env\.HOME!/, tsFiles);
      if (count > 0) {
        console.error('Found process.env.HOME! at:', locations.join(', '));
      }
      expect(count).toBe(0);
    }, SLOW_TIMEOUT);
  });

  describe('FP-2: No hardcoded /tmp/ paths', () => {
    test('zero occurrences of "/tmp/" literal in non-platform code', () => {
      const { count, locations } = countPattern(/["'`]\/tmp\//, tsFiles);
      if (count > 0) {
        console.error('Found hardcoded /tmp/ at:', locations.join(', '));
      }
      expect(count).toBe(0);
    }, SLOW_TIMEOUT);
  });

  describe('FP-3: No hardcoded /usr/bin/ or /bin/ in spawn/exec calls', () => {
    test('no /usr/bin/ in spawn/exec contexts (shebangs excluded)', () => {
      // This pattern catches spawn('/usr/bin/...') or exec('/usr/bin/...')
      // Shebangs are excluded by the line-0 skip above
      const { count, locations } = countPattern(
        /(?:spawn|exec|spawnSync|execSync)\s*\(\s*['"`]\/(?:usr\/)?bin\//,
        tsFiles
      );
      if (count > 0) {
        console.error('Found hardcoded binary paths in spawn/exec at:', locations.join(', '));
      }
      expect(count).toBe(0);
    }, SLOW_TIMEOUT);
  });

  describe('FP-4: No unguarded chmod/chown', () => {
    test('chmod/chown calls are inside platform guards', () => {
      // Find chmod/chown in non-comment code
      const { count, locations } = countPattern(
        /(?:chmod|chown)\s/,
        tsFiles
      );
      // If any are found, they must be in a file that also contains
      // a platform check (isWindows or process.platform)
      for (const loc of locations) {
        const filePath = join(V3_ROOT, loc.split(':')[0]);
        const content = readFileSync(filePath, 'utf-8');
        const hasGuard = content.includes('isWindows') ||
                         content.includes("process.platform") ||
                         content.includes('platform !== ');
        expect(hasGuard).toBe(true);
      }
    }, SLOW_TIMEOUT);
  });

  describe('FP-5: No unguarded lsof', () => {
    test('lsof calls are inside platform guards', () => {
      const { count, locations } = countPattern(/\blsof\b/, tsFiles);
      for (const loc of locations) {
        const filePath = join(V3_ROOT, loc.split(':')[0]);
        const content = readFileSync(filePath, 'utf-8');
        const hasGuard = content.includes('isWindows') ||
                         content.includes("process.platform") ||
                         content.includes('platform !== ');
        expect(hasGuard).toBe(true);
      }
    }, SLOW_TIMEOUT);
  });

  describe('FP-6: No hardcoded Windows paths', () => {
    test('zero C:\\\\ or %APPDATA% or %USERPROFILE% literals', () => {
      const { count, locations } = countPattern(
        /C:\\\\|%APPDATA%|%USERPROFILE%/,
        tsFiles
      );
      if (count > 0) {
        console.error('Found hardcoded Windows paths at:', locations.join(', '));
      }
      expect(count).toBe(0);
    }, SLOW_TIMEOUT);
  });

  describe('FP-7: No unguarded kill -9', () => {
    test('kill -9 / shell kill SIGTERM calls are inside platform guards', () => {
      // Match shell-style "kill -9" and "kill ... SIGTERM" commands,
      // but NOT Bun/Node API calls like child.kill('SIGTERM') or proc.kill('SIGTERM')
      // which are cross-platform (Bun uses TerminateProcess on Windows).
      const { count, locations } = countPattern(
        /(?<!\.)kill\s+-9|(?<!\.)kill\s+.*SIGTERM/,
        tsFiles
      );
      for (const loc of locations) {
        const filePath = join(V3_ROOT, loc.split(':')[0]);
        const content = readFileSync(filePath, 'utf-8');
        const hasGuard = content.includes('isWindows') ||
                         content.includes("process.platform") ||
                         content.includes('platform !== ');
        expect(hasGuard).toBe(true);
      }
    }, SLOW_TIMEOUT);
  });

  describe('FP-8: No Bun.stdin in hook files', () => {
    test('zero Bun.stdin calls in hooks/ (comments excluded)', () => {
      const hookFiles = tsFiles.filter(f =>
        f.includes('hooks') && !f.includes('lib/stdin.ts')
      );
      const { count, locations } = countPattern(/Bun\.stdin/, hookFiles);
      if (count > 0) {
        console.error('Found Bun.stdin in hooks at:', locations.join(', '));
      }
      expect(count).toBe(0);
    }, SLOW_TIMEOUT);
  });

  describe('FP-9: No new hardcoded ~/.claude/ in exec calls', () => {
    test('no ~/.claude/ in execSync/spawnSync string arguments', () => {
      const { count, locations } = countPattern(
        /(?:execSync|spawnSync)\s*\([^)]*~\/\.claude/,
        tsFiles
      );
      if (count > 0) {
        console.error('Found hardcoded ~/.claude/ in exec calls at:', locations.join(', '));
      }
      expect(count).toBe(0);
    }, SLOW_TIMEOUT);
  });
});
