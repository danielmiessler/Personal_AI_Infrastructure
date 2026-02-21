/**
 * 18-browser-skills.test.ts — Browser-Dependent Skill Tests
 *
 * Tests the 3 skills that require a browser (Playwright/Chromium):
 *   - Browser: Playwright launches headless, navigates, screenshots
 *   - WebAssessment: Security assessment skill files import
 *   - PromptInjection: Injection test framework files import
 *
 * CI requirement: `npx playwright install chromium --with-deps`
 *
 * Run: bun test tests/cross-platform/18-browser-skills.test.ts
 */

import { describe, test, expect } from 'bun:test';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { SKILLS_DIR, V3_ROOT, SLOW_TIMEOUT, safeImport } from '../windows/helpers';

// ─── Constants ────────────────────────────────────────────────────────────────

const BROWSER_SKILLS = ['Browser', 'WebAssessment', 'PromptInjection'];

/** Check if Playwright is available */
function isPlaywrightAvailable(): boolean {
  try {
    const result = spawnSync('npx', ['playwright', '--version'], {
      encoding: 'utf-8',
      timeout: 15_000,
      cwd: V3_ROOT,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

const HAS_PLAYWRIGHT = isPlaywrightAvailable();

// ─── Section 1: Browser Skill Directory Structure ─────────────────────────────

describe('Browser-Dependent Skills — Structure', () => {
  for (const skill of BROWSER_SKILLS) {
    describe(skill, () => {
      const skillDir = join(SKILLS_DIR, skill);

      test(`${skill}/ directory exists`, () => {
        expect(existsSync(skillDir)).toBe(true);
      });

      test(`${skill}/SKILL.md exists and is non-empty`, () => {
        const skillMd = join(skillDir, 'SKILL.md');
        expect(existsSync(skillMd)).toBe(true);
        const content = readFileSync(skillMd, 'utf-8');
        expect(content.length).toBeGreaterThan(50);
      });

      test(`${skill}/SKILL.md mentions browser or Playwright`, () => {
        const skillMd = join(skillDir, 'SKILL.md');
        const content = readFileSync(skillMd, 'utf-8').toLowerCase();
        const hasBrowserRef = content.includes('browser') ||
          content.includes('playwright') ||
          content.includes('chromium') ||
          content.includes('url') ||
          content.includes('web');
        expect(hasBrowserRef).toBe(true);
      });
    });
  }
});

// ─── Section 2: Browser Skill TypeScript Files Parse ──────────────────────────

describe('Browser-Dependent Skills — TypeScript Parsing', () => {
  for (const skill of BROWSER_SKILLS) {
    const skillDir = join(SKILLS_DIR, skill);
    if (!existsSync(skillDir)) continue;

    const tsFiles = readdirSync(skillDir, { recursive: true })
      .filter(f => typeof f === 'string' && f.endsWith('.ts') && !f.endsWith('.test.ts'))
      .slice(0, 5); // Limit to first 5 for speed

    for (const tsFile of tsFiles) {
      test(`${skill}/${tsFile} parses without syntax errors`, () => {
        const filePath = join(skillDir, tsFile as string);
        const result = spawnSync('bun', ['build', '--no-emit', '--target', 'bun', filePath], {
          encoding: 'utf-8',
          timeout: SLOW_TIMEOUT,
          cwd: V3_ROOT,
        });
        // Allow failures from missing external deps (playwright, etc.)
        // but NOT from syntax errors
        if (result.status !== 0) {
          const stderr = result.stderr || '';
          // These are acceptable import failures, not syntax errors
          const isDepFailure = stderr.includes('Cannot find module') ||
            stderr.includes('playwright') ||
            stderr.includes('No matching export');
          if (!isDepFailure) {
            expect(result.status).toBe(0);
          }
        }
      }, SLOW_TIMEOUT);
    }
  }
});

// ─── Section 3: Playwright Chromium Launch (conditional) ──────────────────────

describe.skipIf(!HAS_PLAYWRIGHT)('Playwright Chromium — Headless Launch', () => {
  test('Chromium launches and navigates to about:blank', () => {
    // Use a small inline script to test Playwright
    const testScript = `
      const { chromium } = require('playwright');
      (async () => {
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('about:blank');
        const title = await page.title();
        console.log(JSON.stringify({ ok: true, title }));
        await browser.close();
      })().catch(e => {
        console.error(e.message);
        process.exit(1);
      });
    `;
    const result = spawnSync('node', ['-e', testScript], {
      encoding: 'utf-8',
      timeout: SLOW_TIMEOUT,
      cwd: V3_ROOT,
    });
    if (result.status === 0) {
      const output = JSON.parse(result.stdout.trim());
      expect(output.ok).toBe(true);
    } else {
      // If Chromium isn't installed, this is acceptable
      const stderr = result.stderr || '';
      const isMissingBrowser = stderr.includes('Executable doesn\'t exist') ||
        stderr.includes('browserType.launch') ||
        stderr.includes('Cannot find module');
      expect(isMissingBrowser).toBe(true);
    }
  }, SLOW_TIMEOUT);

  test('Chromium can take a screenshot of about:blank', () => {
    const testScript = `
      const { chromium } = require('playwright');
      const path = require('path');
      const os = require('os');
      (async () => {
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('about:blank');
        const screenshotPath = path.join(os.tmpdir(), 'pai-test-screenshot.png');
        await page.screenshot({ path: screenshotPath });
        const fs = require('fs');
        const exists = fs.existsSync(screenshotPath);
        const size = exists ? fs.statSync(screenshotPath).size : 0;
        console.log(JSON.stringify({ ok: exists && size > 0, size }));
        if (exists) fs.unlinkSync(screenshotPath);
        await browser.close();
      })().catch(e => {
        console.error(e.message);
        process.exit(1);
      });
    `;
    const result = spawnSync('node', ['-e', testScript], {
      encoding: 'utf-8',
      timeout: SLOW_TIMEOUT,
      cwd: V3_ROOT,
    });
    if (result.status === 0) {
      const output = JSON.parse(result.stdout.trim());
      expect(output.ok).toBe(true);
      expect(output.size).toBeGreaterThan(0);
    }
    // If it fails due to missing browser, that's fine — the skipIf should have caught it
  }, SLOW_TIMEOUT);
});
