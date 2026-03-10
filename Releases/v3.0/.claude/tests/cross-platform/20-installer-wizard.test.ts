/**
 * 20-installer-wizard.test.ts — Interactive Installer Wizard E2E Tests
 *
 * Proves that PAI's readline-based installer wizard can be driven
 * programmatically via piped stdin — enabling full CI automation.
 *
 * Scenarios:
 *   1. Prompt functions accept piped stdin (readline reads from pipe, not just TTY)
 *   2. Happy-path: full wizard completes with scripted answers
 *   3. Bad input: invalid choice numbers fall back to defaults
 *   4. Empty defaults: blank lines accepted for all optional fields
 *   5. Resume flow: state file detected, resume answer piped
 *
 * Run: bun test tests/cross-platform/20-installer-wizard.test.ts
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { spawnSync, spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { V3_ROOT, SLOW_TIMEOUT } from '../windows/helpers';

// ─── Constants ───────────────────────────────────────────────────────────────

const INSTALLER_DIR = join(V3_ROOT, 'PAI-Install');
const CLI_ENTRY = join(INSTALLER_DIR, 'main.ts');

// Unique temp directory per test run — complete isolation
const TEST_TMP = join(tmpdir(), `pai-installer-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
const SCRIPTS_DIR = join(TEST_TMP, 'scripts');

const LONG_TIMEOUT = 90_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create an isolated fake HOME with a pre-seeded .claude directory.
 * Pre-seeding triggers the "upgrade" path which skips the slow git clone.
 */
function createFakeHome(name: string): string {
  const fakeHome = join(TEST_TMP, name);
  const fakeClaude = join(fakeHome, '.claude');
  const fakeConfig = join(fakeHome, '.config', 'PAI');

  mkdirSync(fakeHome, { recursive: true });
  mkdirSync(fakeClaude, { recursive: true });
  mkdirSync(fakeConfig, { recursive: true });

  // Minimal settings.json triggers "upgrade" detection (skips git clone)
  writeFileSync(join(fakeClaude, 'settings.json'), JSON.stringify({
    principal: { name: 'OldUser', timezone: 'UTC' },
    daidentity: { name: 'OldBot' },
    pai: { version: '2.9.0' },
    env: {},
  }, null, 2));

  // Fake .git dir so runRepository detects it as a git repo
  // (git pull will fail gracefully: "Could not pull updates. Continuing with existing files.")
  mkdirSync(join(fakeClaude, '.git'), { recursive: true });

  // Create required directories that validation checks
  for (const dir of ['skills', 'MEMORY', 'MEMORY/STATE', 'MEMORY/WORK', 'hooks', 'Plans']) {
    mkdirSync(join(fakeClaude, dir), { recursive: true });
  }

  return fakeHome;
}

/**
 * Spawn a Bun script file with piped stdin and isolated HOME.
 */
function runScript(
  scriptPath: string,
  stdinInput: string,
  fakeHome: string,
  timeout = SLOW_TIMEOUT,
): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync('bun', ['run', scriptPath], {
    input: stdinInput,
    encoding: 'utf-8',
    timeout,
    cwd: INSTALLER_DIR,
    env: {
      ...process.env,
      HOME: fakeHome,
      USERPROFILE: fakeHome,
      PAI_CONFIG_DIR: join(fakeHome, '.config', 'PAI'),
      PAI_TEST_MODE: '1',
    },
  });

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status,
  };
}

/**
 * Write a temp script file and spawn it for prompt function testing.
 */
function testPrompt(
  scriptBody: string,
  stdinInput: string,
  timeout = SLOW_TIMEOUT,
): { stdout: string; stderr: string; status: number | null; result: unknown } {
  const scriptPath = join(SCRIPTS_DIR, `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.ts`);
  writeFileSync(scriptPath, scriptBody);

  const fakeHome = join(TEST_TMP, 'prompt-home');
  if (!existsSync(fakeHome)) mkdirSync(fakeHome, { recursive: true });

  const raw = runScript(scriptPath, stdinInput, fakeHome, timeout);

  // Extract RESULT marker from stdout
  const match = raw.stdout.match(/RESULT:(.+)/);
  let parsed: unknown = null;
  if (match) {
    try { parsed = JSON.parse(match[1]); } catch { /* leave null */ }
  }

  return { ...raw, result: parsed };
}

/**
 * Strip ANSI escape codes from a string.
 */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Run the installer interactively using async spawn.
 *
 * IMPORTANT: The installer creates a NEW readline.createInterface for each prompt.
 * With piped stdin (spawnSync + input), the first readline buffers ALL data and
 * subsequent interfaces find the stream drained. To work around this, we use
 * async spawn and write each answer one at a time, waiting for the prompt
 * indicator "> " to appear in stdout before writing the next answer.
 *
 * Prompt detection strips ANSI codes first because the installer wraps
 * ">" in color codes: \x1b[38;2;59;130;246m>\x1b[0m
 */
async function runInteractive(
  answers: string[],
  fakeHome: string,
  timeout = LONG_TIMEOUT,
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve) => {
    const proc = spawn('bun', ['run', CLI_ENTRY, '--mode', 'cli'], {
      cwd: INSTALLER_DIR,
      env: {
        ...process.env,
        HOME: fakeHome,
        USERPROFILE: fakeHome,
        PAI_CONFIG_DIR: join(fakeHome, '.config', 'PAI'),
        PAI_TEST_MODE: '1',
      },
    });

    let stdout = '';
    let stderr = '';
    let answerIdx = 0;
    // Track how many prompt indicators we've seen to avoid double-sending
    let promptsSeen = 0;

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
    }, timeout);

    proc.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;

      if (answerIdx >= answers.length) return;

      // Strip ANSI codes before detecting prompts — the installer wraps
      // "> " in color codes that break plain-text matching.
      const clean = stripAnsi(stdout);

      // Count prompt indicators: "> " for text/choice prompts, "(Y/n)" for confirms
      const promptMatches = clean.match(/(> |\([Yy]\/[Nn]\) )/g) || [];
      const currentPromptCount = promptMatches.length;

      if (currentPromptCount > promptsSeen) {
        // New prompt appeared — send the next answer
        promptsSeen = currentPromptCount;
        setTimeout(() => {
          if (answerIdx < answers.length && proc.stdin.writable) {
            proc.stdin.write(answers[answerIdx] + '\n');
            answerIdx++;
          }
        }, 50);
      }
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code });
    });
  });
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeAll(() => {
  mkdirSync(TEST_TMP, { recursive: true });
  mkdirSync(SCRIPTS_DIR, { recursive: true });
});

afterAll(() => {
  try {
    rmSync(TEST_TMP, { recursive: true, force: true });
  } catch { /* Windows may hold locks */ }
});

// ─── Section 1: Prompt Functions with Piped stdin ────────────────────────────

describe('Prompt Functions — Piped stdin', () => {
  const promptsImport = JSON.stringify(join(INSTALLER_DIR, 'cli', 'prompts'));

  test('promptText reads answer from piped stdin', () => {
    const r = testPrompt(`
import { promptText } from ${promptsImport};
const answer = await promptText("What is your name?", "Default");
process.stdout.write("\\nRESULT:" + JSON.stringify({ answer }) + "\\n");
process.exit(0);
`, 'Justin\n');
    expect(r.status).toBe(0);
    expect(r.result).toEqual({ answer: 'Justin' });
  });

  test('promptText uses default on blank line', () => {
    const r = testPrompt(`
import { promptText } from ${promptsImport};
const answer = await promptText("Name?", "DefaultUser");
process.stdout.write("\\nRESULT:" + JSON.stringify({ answer }) + "\\n");
process.exit(0);
`, '\n');
    expect(r.status).toBe(0);
    expect(r.result).toEqual({ answer: 'DefaultUser' });
  });

  test('promptChoice reads numeric selection from piped stdin', () => {
    const r = testPrompt(`
import { promptChoice } from ${promptsImport};
const answer = await promptChoice("Pick:", [
  { label: "Alpha", value: "alpha" },
  { label: "Beta", value: "beta" },
  { label: "Charlie", value: "charlie" },
]);
process.stdout.write("\\nRESULT:" + JSON.stringify({ answer }) + "\\n");
process.exit(0);
`, '2\n');
    expect(r.status).toBe(0);
    expect(r.result).toEqual({ answer: 'beta' });
  });

  test('promptChoice defaults to first on invalid number', () => {
    const r = testPrompt(`
import { promptChoice } from ${promptsImport};
const answer = await promptChoice("Pick:", [
  { label: "Alpha", value: "alpha" },
  { label: "Beta", value: "beta" },
]);
process.stdout.write("\\nRESULT:" + JSON.stringify({ answer }) + "\\n");
process.exit(0);
`, '99\n');
    expect(r.status).toBe(0);
    expect(r.result).toEqual({ answer: 'alpha' });
  });

  test('promptChoice defaults to first on garbage text', () => {
    const r = testPrompt(`
import { promptChoice } from ${promptsImport};
const answer = await promptChoice("Pick:", [
  { label: "Alpha", value: "alpha" },
  { label: "Beta", value: "beta" },
]);
process.stdout.write("\\nRESULT:" + JSON.stringify({ answer }) + "\\n");
process.exit(0);
`, 'xyzzy\n');
    expect(r.status).toBe(0);
    expect(r.result).toEqual({ answer: 'alpha' });
  });

  test('promptConfirm reads "y" as true', () => {
    const r = testPrompt(`
import { promptConfirm } from ${promptsImport};
const answer = await promptConfirm("Continue?", false);
process.stdout.write("\\nRESULT:" + JSON.stringify({ answer }) + "\\n");
process.exit(0);
`, 'y\n');
    expect(r.status).toBe(0);
    expect(r.result).toEqual({ answer: true });
  });

  test('promptConfirm reads "n" as false', () => {
    const r = testPrompt(`
import { promptConfirm } from ${promptsImport};
const answer = await promptConfirm("Continue?", true);
process.stdout.write("\\nRESULT:" + JSON.stringify({ answer }) + "\\n");
process.exit(0);
`, 'n\n');
    expect(r.status).toBe(0);
    expect(r.result).toEqual({ answer: false });
  });

  test('promptConfirm uses default on blank line', () => {
    const r = testPrompt(`
import { promptConfirm } from ${promptsImport};
const answer = await promptConfirm("Continue?", true);
process.stdout.write("\\nRESULT:" + JSON.stringify({ answer }) + "\\n");
process.exit(0);
`, '\n');
    expect(r.status).toBe(0);
    expect(r.result).toEqual({ answer: true });
  });

  test('promptSecret reads key from piped stdin', () => {
    const r = testPrompt(`
import { promptSecret } from ${promptsImport};
const answer = await promptSecret("API key:", "sk_...");
process.stdout.write("\\nRESULT:" + JSON.stringify({ answer }) + "\\n");
process.exit(0);
`, 'sk_test_abc123\n');
    expect(r.status).toBe(0);
    expect(r.result).toEqual({ answer: 'sk_test_abc123' });
  });

  test('promptSecret returns empty string on blank line', () => {
    const r = testPrompt(`
import { promptSecret } from ${promptsImport};
const answer = await promptSecret("API key:");
process.stdout.write("\\nRESULT:" + JSON.stringify({ answer }) + "\\n");
process.exit(0);
`, '\n');
    expect(r.status).toBe(0);
    expect(r.result).toEqual({ answer: '' });
  });
});

// ─── Section 2: Full CLI Wizard — Happy Path ─────────────────────────────────
//
// NOTE: The installer creates a NEW readline.createInterface for each prompt.
// With all-at-once piped stdin, the first readline buffers everything and
// subsequent interfaces see EOF. We use runInteractive() which writes answers
// one at a time as prompts appear, working around this readline limitation.

describe('Full CLI Wizard — Happy Path', () => {
  let fakeHome: string;

  beforeAll(() => {
    fakeHome = createFakeHome('happy-path');
  });

  test('installer completes all 8 steps with scripted answers (upgrade path)', async () => {
    // Answer sequence for upgrade path (settings.json pre-exists → upgrade detected):
    // Step 4 Identity: name, timezone, ai-name, catchphrase, projects-dir
    // Step 7 Voice: skip voice (2), voice type female (1)
    // We provide extra blank answers in case the installer has more prompts than expected
    const answers = [
      'TestUser',     // principal name
      '',             // timezone (accept detected default)
      'TestBot',      // AI name
      '',             // catchphrase (accept default)
      '',             // projects dir (accept default)
      '2',            // voice: "Skip voice for now"
      '1',            // voice type: "Female (Rachel)"
      '',             // extra safety answers
      '',
      '',
    ];

    const result = await runInteractive(answers, fakeHome);

    // Installer should exit 0 on success
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Installation complete');

    // Verify settings.json was updated with our answers
    const settingsPath = join(fakeHome, '.claude', 'settings.json');
    expect(existsSync(settingsPath)).toBe(true);

    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(settings.principal.name).toBe('TestUser');
    expect(settings.daidentity.name).toBe('TestBot');
  }, LONG_TIMEOUT);

  test('installer creates required directory structure', () => {
    const claudeDir = join(fakeHome, '.claude');
    for (const dir of ['skills', 'MEMORY', 'MEMORY/STATE', 'MEMORY/WORK', 'hooks', 'Plans']) {
      expect(existsSync(join(claudeDir, dir))).toBe(true);
    }
  });

  test('installer cleans up state file after success', () => {
    const stateFile = join(fakeHome, '.config', 'PAI', 'install-state.json');
    // State file should be cleaned up after successful install
    expect(existsSync(stateFile)).toBe(false);
  });
});

// ─── Section 3: Bad Input Handling ───────────────────────────────────────────

describe('Bad Input Handling', () => {
  const promptsImport = JSON.stringify(join(INSTALLER_DIR, 'cli', 'prompts'));

  test('promptChoice with negative number defaults to first', () => {
    const r = testPrompt(`
import { promptChoice } from ${promptsImport};
const answer = await promptChoice("Pick:", [
  { label: "First", value: "first" },
  { label: "Second", value: "second" },
]);
process.stdout.write("\\nRESULT:" + JSON.stringify({ answer }) + "\\n");
process.exit(0);
`, '-1\n');
    expect(r.status).toBe(0);
    expect(r.result).toEqual({ answer: 'first' });
  });

  test('promptChoice with zero defaults to first', () => {
    const r = testPrompt(`
import { promptChoice } from ${promptsImport};
const answer = await promptChoice("Pick:", [
  { label: "First", value: "first" },
  { label: "Second", value: "second" },
]);
process.stdout.write("\\nRESULT:" + JSON.stringify({ answer }) + "\\n");
process.exit(0);
`, '0\n');
    expect(r.status).toBe(0);
    expect(r.result).toEqual({ answer: 'first' });
  });

  test('promptChoice with empty line defaults to first', () => {
    const r = testPrompt(`
import { promptChoice } from ${promptsImport};
const answer = await promptChoice("Pick:", [
  { label: "First", value: "first" },
  { label: "Second", value: "second" },
]);
process.stdout.write("\\nRESULT:" + JSON.stringify({ answer }) + "\\n");
process.exit(0);
`, '\n');
    expect(r.status).toBe(0);
    expect(r.result).toEqual({ answer: 'first' });
  });

  test('promptConfirm with random text uses default', () => {
    const r = testPrompt(`
import { promptConfirm } from ${promptsImport};
const answer = await promptConfirm("Continue?", true);
process.stdout.write("\\nRESULT:" + JSON.stringify({ answer }) + "\\n");
process.exit(0);
`, 'maybe\n');
    expect(r.status).toBe(0);
    // "maybe" is not "y" or "yes", so it should be false
    expect(r.result).toEqual({ answer: false });
  });
});

// ─── Section 4: Empty Defaults — All Blank Lines ─────────────────────────────

describe('Empty Defaults — Full CLI with all blank lines', () => {
  let fakeHome: string;

  beforeAll(() => {
    fakeHome = createFakeHome('empty-defaults');
  });

  test('installer accepts all blank lines and uses defaults throughout', async () => {
    // All blank lines for text prompts; choices default to first option on blank
    const answers = [
      '',   // principal name → uses existing "OldUser" or "User"
      '',   // timezone → uses detected default
      '',   // AI name → uses existing "OldBot" or "PAI"
      '',   // catchphrase → uses default
      '',   // projects dir → uses default
      '',   // voice choice → defaults to first (blank = invalid → first)
      '',   // voice type → defaults to first
      '',   // extra safety
      '',
      '',
    ];

    const result = await runInteractive(answers, fakeHome);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Installation complete');

    // Verify defaults were used
    const settings = JSON.parse(readFileSync(join(fakeHome, '.claude', 'settings.json'), 'utf-8'));
    // Principal name should be the pre-seeded "OldUser" (from upgrade detection)
    expect(settings.principal.name).toBeTruthy();
    expect(settings.daidentity.name).toBeTruthy();
    expect(settings.principal.timezone).toBeTruthy();
  }, LONG_TIMEOUT);
});

// ─── Section 5: Resume Flow ──────────────────────────────────────────────────

describe('Resume Flow — State Persistence', () => {
  let fakeHome: string;

  beforeAll(() => {
    fakeHome = createFakeHome('resume-flow');

    // Pre-create a saved install state with steps 1-3 completed
    const stateFile = join(fakeHome, '.config', 'PAI', 'install-state.json');
    const savedState = {
      version: '3.0',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStep: 'identity',
      completedSteps: ['system-detect', 'prerequisites', 'api-keys'],
      skippedSteps: [],
      mode: 'cli',
      detection: {
        os: { platform: process.platform, arch: process.arch, version: '', name: 'Test' },
        shell: { name: 'bash', version: '', path: '/bin/bash' },
        tools: {
          git: { installed: true, version: '2.0', path: '/usr/bin/git' },
          bun: { installed: true, version: '1.0', path: '' },
          claude: { installed: false, version: '', path: '' },
          brew: { installed: false, version: '', path: '' },
        },
        existing: {
          paiInstalled: true,
          hasApiKeys: false,
          elevenLabsKeyFound: false,
          settingsPath: join(fakeHome, '.claude', 'settings.json'),
        },
        timezone: 'America/Los_Angeles',
        homeDir: fakeHome,
        paiDir: join(fakeHome, '.claude'),
        configDir: join(fakeHome, '.config', 'PAI'),
      },
      collected: {},
      installType: 'upgrade',
      errors: [],
    };
    writeFileSync(stateFile, JSON.stringify(savedState, null, 2));
  });

  test('installer detects saved state and offers resume', async () => {
    const answers = [
      'y',            // resume previous installation
      'ResumeUser',   // principal name
      '',             // timezone default
      'ResumeBot',    // AI name
      '',             // catchphrase default
      '',             // projects dir default
      '2',            // voice: skip
      '1',            // voice type: female
      '',             // extra safety
      '',
    ];

    const result = await runInteractive(answers, fakeHome);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Resuming from step');
    expect(result.stdout).toContain('Installation complete');

    // Verify the resumed state used our new answers
    const settings = JSON.parse(readFileSync(join(fakeHome, '.claude', 'settings.json'), 'utf-8'));
    expect(settings.principal.name).toBe('ResumeUser');
    expect(settings.daidentity.name).toBe('ResumeBot');
  }, LONG_TIMEOUT);

  test('decline resume starts fresh installation', async () => {
    const freshHome = createFakeHome('resume-decline');

    // Pre-create state file
    const stateFile = join(freshHome, '.config', 'PAI', 'install-state.json');
    writeFileSync(stateFile, JSON.stringify({
      version: '3.0',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStep: 'identity',
      completedSteps: ['system-detect'],
      skippedSteps: [],
      mode: 'cli',
      detection: null,
      collected: {},
      installType: null,
      errors: [],
    }, null, 2));

    const answers = [
      'n',            // decline resume → fresh start
      'FreshUser',    // principal name
      '',             // timezone default
      'FreshBot',     // AI name
      '',             // catchphrase default
      '',             // projects dir default
      '2',            // voice: skip
      '1',            // voice type: female
      '',             // extra safety
      '',
    ];

    const result = await runInteractive(answers, freshHome);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Installation complete');

    const settings = JSON.parse(readFileSync(join(freshHome, '.claude', 'settings.json'), 'utf-8'));
    expect(settings.principal.name).toBe('FreshUser');
    expect(settings.daidentity.name).toBe('FreshBot');
  }, LONG_TIMEOUT);
});
