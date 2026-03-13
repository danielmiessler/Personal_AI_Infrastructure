import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * SecurityValidator integration tests.
 *
 * Tests the SecurityValidator hook against patterns.example.yaml.
 * Each test runs the hook as a subprocess with mock stdin,
 * verifying exit codes and stdout/stderr output.
 *
 * Requirements:
 * - Bun runtime (bun:test)
 * - patterns.example.yaml in PAI/PAISECURITYSYSTEM/
 */

describe('SecurityValidator', () => {
  const hook = 'hooks/SecurityValidator.hook.ts';
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-secval-');

    // Create directory structure
    mkdirSync(join(tempDir, 'PAI', 'PAISECURITYSYSTEM'), { recursive: true });
    mkdirSync(join(tempDir, 'PAI', 'USER', 'PAISECURITYSYSTEM'), { recursive: true });
    mkdirSync(join(tempDir, 'MEMORY', 'SECURITY'), { recursive: true });
    mkdirSync(join(tempDir, 'hooks', 'lib'), { recursive: true });

    // Copy patterns.example.yaml as the active patterns file
    // In real usage, users copy this to PAI/USER/PAISECURITYSYSTEM/patterns.yaml
    writeFileSync(
      join(tempDir, 'PAI', 'PAISECURITYSYSTEM', 'patterns.example.yaml'),
      EXAMPLE_PATTERNS,
      'utf-8'
    );
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  // ── Allow: Safe Commands ──

  test('allows safe commands (ls, git status)', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sv-001',
      tool_name: 'Bash',
      tool_input: { command: 'ls -la' },
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.json?.continue).toBe(true);
  });

  test('allows git status', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sv-002',
      tool_name: 'Bash',
      tool_input: { command: 'git status' },
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.json?.continue).toBe(true);
  });

  // ── Block: Catastrophic Commands ──

  test('blocks rm -rf /', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sv-010',
      tool_name: 'Bash',
      tool_input: { command: 'rm -rf /' },
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('BLOCKED');
  });

  test('blocks dd write to disk', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sv-011',
      tool_name: 'Bash',
      tool_input: { command: 'dd if=/dev/zero of=/dev/sda' },
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('BLOCKED');
  });

  test('blocks chmod 777 on sensitive paths', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sv-012',
      tool_name: 'Bash',
      tool_input: { command: 'chmod 777 /etc/passwd' },
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('BLOCKED');
  });

  // ── Confirm: Destructive but Legitimate Commands ──

  test('prompts confirmation for git push --force', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sv-020',
      tool_name: 'Bash',
      tool_input: { command: 'git push --force origin main' },
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.json?.decision).toBe('ask');
    expect(result.json?.message).toContain('SECURITY');
  });

  // ── Path Validation ──

  test('blocks reading SSH private keys', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sv-030',
      tool_name: 'Read',
      tool_input: { file_path: `${process.env.HOME}/.ssh/id_rsa` },
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('BLOCKED');
  });

  // ── Fail-Open Behavior ──

  test('allows operation when no patterns file exists', async () => {
    // Create a temp dir WITHOUT patterns files
    const emptyDir = createTempDir('pai-secval-empty-');
    mkdirSync(join(emptyDir, 'hooks', 'lib'), { recursive: true });

    const result = await runHook(hook, {
      session_id: 'test-sv-040',
      tool_name: 'Bash',
      tool_input: { command: 'rm -rf /' },
    }, { PAI_DIR: emptyDir });

    // Without patterns, even dangerous commands are allowed (fail-open)
    expect(result.exitCode).toBe(0);
    expect(result.json?.continue).toBe(true);

    cleanupTempDir(emptyDir);
  });

  test('handles empty tool_input gracefully', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sv-041',
      tool_name: 'Bash',
      tool_input: {},
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.json?.continue).toBe(true);
  });

  // ── Performance ──

  test('completes within 500ms', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sv-050',
      tool_name: 'Bash',
      tool_input: { command: 'echo hello' },
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.duration).toBeLessThan(500);
  });
});

// ── Example Patterns YAML ──
// Minimal but functional patterns for testing

const EXAMPLE_PATTERNS = `# PAI Security Patterns — Example Template
# Copy to PAI/USER/PAISECURITYSYSTEM/patterns.yaml and customize.

version: "1.0"

philosophy:
  mode: "defensive"
  principle: "Block catastrophic, confirm destructive, alert suspicious, allow everything else"

bash:
  trusted:
    - pattern: "^(ls|cat|echo|pwd|whoami|date|git\\\\s+(status|log|diff|branch))\\\\b"
      reason: "Safe read-only commands"
    - pattern: "^bun\\\\s+(test|run)"
      reason: "Package manager operations"

  blocked:
    - pattern: "rm\\\\s+-rf\\\\s+/"
      reason: "Filesystem destruction: rm -rf /"
    - pattern: "rm\\\\s+-rf\\\\s+\\\\*"
      reason: "Wildcard deletion from root"
    - pattern: "mkfs\\\\."
      reason: "Filesystem format"
    - pattern: "dd\\\\s+.*of=/dev/"
      reason: "Direct disk write"
    - pattern: ":(){ :|:& };:"
      reason: "Fork bomb"
    - pattern: "chmod\\\\s+777\\\\s+/etc/"
      reason: "Dangerous permission change on /etc"
    - pattern: "curl.*\\\\|\\\\s*(bash|sh)"
      reason: "Pipe from internet to shell"

  confirm:
    - pattern: "git\\\\s+push\\\\s+--force"
      reason: "Force push can lose remote commits"
    - pattern: "git\\\\s+reset\\\\s+--hard"
      reason: "Hard reset discards uncommitted changes"
    - pattern: "rm\\\\s+-rf\\\\s+\\\\S+"
      reason: "Recursive force delete"
    - pattern: "DROP\\\\s+TABLE|DROP\\\\s+DATABASE"
      reason: "Database destruction"

  alert:
    - pattern: "sudo\\\\s+"
      reason: "Elevated privileges requested"
    - pattern: "chmod\\\\s+[0-7]+"
      reason: "Permission change"

paths:
  zeroAccess:
    - "~/.ssh/id_*"
    - "~/.ssh/id_rsa"
    - "~/.ssh/id_ed25519"
    - "~/.aws/credentials"
    - "~/.gnupg/private-keys*"

  readOnly:
    - "/etc/passwd"
    - "/etc/shadow"
    - "/etc/hosts"

  confirmWrite:
    - "~/.bashrc"
    - "~/.zshrc"
    - "~/.profile"

  noDelete:
    - "~/.claude/CLAUDE.md"
    - "~/.claude/settings.json"

projects: {}
`;
