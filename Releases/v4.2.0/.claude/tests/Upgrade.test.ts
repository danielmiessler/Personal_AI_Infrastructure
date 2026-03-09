/**
 * Upgrade.test.ts — Tests for PAI upgrade engine
 *
 * Run: bun test ./.claude/tests/Upgrade.test.ts
 */

import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import {
  meetsMinVersion,
  checkDependencies,
  validateManifest,
  validateSource,
  backupInstallation,
  installFiles,
  rollback,
  runMigrations,
  makeBackupPath,
  sha256File,
  PRESERVED_PATHS,
  REQUIRED_SOURCE_FILES,
  type Manifest,
} from '../PAI/Tools/upgrade.ts';
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ── Test fixture helpers ──────────────────────────────────────────────────

function makeTmpDir(prefix = 'pai-upgrade-test'): string {
  const dir = join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeFile(dir: string, relPath: string, content: string): void {
  const fullPath = join(dir, relPath);
  mkdirSync(join(fullPath, '..'), { recursive: true });
  writeFileSync(fullPath, content, 'utf-8');
}

function makeMinimalRelease(dir: string): void {
  // Minimum files for a valid PAI release
  writeFile(dir, 'settings.json', JSON.stringify({ pai: { version: '4.2.0' } }));
  writeFile(dir, 'CLAUDE.md', '# PAI 4.2.0');
  writeFile(dir, 'hooks/SecurityValidator.hook.ts', '// hook');
  writeFile(dir, 'hooks/handlers/BuildSettings.ts', '// builder');
  writeFile(dir, 'PAI/Tools/pai.ts', '// cli');
  writeFile(dir, 'PAI/Algorithm/v3.9.0.md', '# Algorithm');
}

// ── meetsMinVersion ───────────────────────────────────────────────────────

describe('meetsMinVersion', () => {
  test('equal versions pass', () => {
    expect(meetsMinVersion('1.0.0', '1.0.0')).toBe(true);
  });

  test('higher patch passes', () => {
    expect(meetsMinVersion('1.0.1', '1.0.0')).toBe(true);
  });

  test('higher minor passes', () => {
    expect(meetsMinVersion('1.1.0', '1.0.9')).toBe(true);
  });

  test('higher major passes', () => {
    expect(meetsMinVersion('2.0.0', '1.9.9')).toBe(true);
  });

  test('lower patch fails', () => {
    expect(meetsMinVersion('1.0.0', '1.0.1')).toBe(false);
  });

  test('lower minor fails', () => {
    expect(meetsMinVersion('1.0.9', '1.1.0')).toBe(false);
  });

  test('lower major fails', () => {
    expect(meetsMinVersion('1.9.9', '2.0.0')).toBe(false);
  });

  test('strips v prefix', () => {
    expect(meetsMinVersion('v1.3.10', '1.0.0')).toBe(true);
  });
});

// ── validateSource ────────────────────────────────────────────────────────

describe('validateSource', () => {
  let dir: string;
  afterEach(() => { if (existsSync(dir)) rmSync(dir, { recursive: true }); });

  test('rejects non-existent directory', () => {
    dir = '/tmp/does-not-exist-pai-test-12345';
    const result = validateSource(dir);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('not found'))).toBe(true);
  });

  test('rejects directory missing required files', () => {
    dir = makeTmpDir();
    const result = validateSource(dir);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('accepts directory with all required files', () => {
    dir = makeTmpDir();
    makeMinimalRelease(dir);
    const result = validateSource(dir);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ── validateManifest ──────────────────────────────────────────────────────

describe('validateManifest', () => {
  let dir: string;
  afterEach(() => { if (existsSync(dir)) rmSync(dir, { recursive: true }); });

  test('returns invalid when manifest.json missing', () => {
    dir = makeTmpDir();
    const result = validateManifest(dir, join(dir, 'manifest.json'));
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('manifest.json');
  });

  test('returns invalid for corrupt manifest.json', () => {
    dir = makeTmpDir();
    writeFile(dir, 'manifest.json', '{ not valid json }');
    const result = validateManifest(dir, join(dir, 'manifest.json'));
    expect(result.valid).toBe(false);
  });

  test('passes when all files match manifest', () => {
    dir = makeTmpDir();
    writeFile(dir, 'test.ts', '// content');

    // Compute real checksum
    const hasher = new Bun.CryptoHasher('sha256');
    hasher.update(readFileSync(join(dir, 'test.ts')));
    const hash = hasher.digest('hex');
    const size = readFileSync(join(dir, 'test.ts')).length;

    const manifest: Manifest = {
      version: '4.2.0',
      generatedAt: new Date().toISOString(),
      bunMinVersion: '1.0.0',
      files: [{ path: 'test.ts', sha256: hash, size }],
    };
    writeFile(dir, 'manifest.json', JSON.stringify(manifest));

    const result = validateManifest(dir, join(dir, 'manifest.json'));
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
    expect(result.mismatched).toHaveLength(0);
  });

  test('detects missing files', () => {
    dir = makeTmpDir();
    const manifest: Manifest = {
      version: '4.2.0',
      generatedAt: new Date().toISOString(),
      bunMinVersion: '1.0.0',
      files: [{ path: 'missing-file.ts', sha256: 'abc', size: 0 }],
    };
    writeFile(dir, 'manifest.json', JSON.stringify(manifest));

    const result = validateManifest(dir, join(dir, 'manifest.json'));
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('missing-file.ts');
  });

  test('detects checksum mismatches', () => {
    dir = makeTmpDir();
    writeFile(dir, 'changed.ts', '// changed content');
    const manifest: Manifest = {
      version: '4.2.0',
      generatedAt: new Date().toISOString(),
      bunMinVersion: '1.0.0',
      files: [{ path: 'changed.ts', sha256: 'wrong-hash-here', size: 100 }],
    };
    writeFile(dir, 'manifest.json', JSON.stringify(manifest));

    const result = validateManifest(dir, join(dir, 'manifest.json'));
    expect(result.valid).toBe(false);
    expect(result.mismatched).toContain('changed.ts');
  });
});

// ── backupInstallation ────────────────────────────────────────────────────

describe('backupInstallation', () => {
  let src: string, backup: string;
  afterEach(() => {
    if (existsSync(src)) rmSync(src, { recursive: true });
    if (existsSync(backup)) rmSync(backup, { recursive: true });
  });

  test('copies all files to backup directory', () => {
    src = makeTmpDir();
    backup = makeTmpDir() + '-backup';
    writeFile(src, 'settings.json', '{}');
    writeFile(src, 'hooks/test.ts', '// hook');

    backupInstallation(src, backup);

    expect(existsSync(join(backup, 'settings.json'))).toBe(true);
    expect(existsSync(join(backup, 'hooks/test.ts'))).toBe(true);
  });

  test('creates backup directory if absent', () => {
    src = makeTmpDir();
    backup = join(tmpdir(), `backup-test-${Date.now()}`);
    writeFile(src, 'file.txt', 'content');

    backupInstallation(src, backup);
    expect(existsSync(backup)).toBe(true);
    if (existsSync(backup)) rmSync(backup, { recursive: true });
  });
});

// ── installFiles ──────────────────────────────────────────────────────────

describe('installFiles', () => {
  let src: string, tgt: string;
  afterEach(() => {
    if (existsSync(src)) rmSync(src, { recursive: true });
    if (existsSync(tgt)) rmSync(tgt, { recursive: true });
  });

  test('copies non-preserved files', () => {
    src = makeTmpDir();
    tgt = makeTmpDir();
    writeFile(src, 'hooks/test.ts', '// new hook');
    writeFile(src, 'CLAUDE.md', '# New');

    installFiles(src, tgt, PRESERVED_PATHS);

    expect(existsSync(join(tgt, 'hooks/test.ts'))).toBe(true);
    expect(existsSync(join(tgt, 'CLAUDE.md'))).toBe(true);
  });

  test('skips preserved paths', () => {
    src = makeTmpDir();
    tgt = makeTmpDir();
    // Put files in preserved paths in source
    writeFile(src, 'MEMORY/session.json', '{}');
    writeFile(src, 'PAI/USER/content.md', '# User');
    writeFile(src, 'config/identity.jsonc', '// identity');
    // Non-preserved file
    writeFile(src, 'hooks/test.ts', '// hook');

    installFiles(src, tgt, PRESERVED_PATHS);

    // Preserved paths should NOT be copied
    expect(existsSync(join(tgt, 'MEMORY/session.json'))).toBe(false);
    expect(existsSync(join(tgt, 'PAI/USER/content.md'))).toBe(false);
    expect(existsSync(join(tgt, 'config/identity.jsonc'))).toBe(false);
    // Non-preserved should be copied
    expect(existsSync(join(tgt, 'hooks/test.ts'))).toBe(true);
  });

  test('dry run does not write files', () => {
    src = makeTmpDir();
    tgt = makeTmpDir();
    writeFile(src, 'hooks/test.ts', '// hook');

    installFiles(src, tgt, PRESERVED_PATHS, true);

    expect(existsSync(join(tgt, 'hooks/test.ts'))).toBe(false);
  });

  test('returns list of installed file paths', () => {
    src = makeTmpDir();
    tgt = makeTmpDir();
    writeFile(src, 'hooks/test.ts', '// hook');
    writeFile(src, 'CLAUDE.md', '# PAI');

    const installed = installFiles(src, tgt, PRESERVED_PATHS);

    expect(installed).toContain('hooks/test.ts');
    expect(installed).toContain('CLAUDE.md');
  });
});

// ── rollback ──────────────────────────────────────────────────────────────

describe('rollback', () => {
  let target: string, backup: string;
  afterEach(() => {
    if (existsSync(target)) rmSync(target, { recursive: true });
    if (existsSync(backup)) rmSync(backup, { recursive: true });
    // Clean up any .failed dirs
    const failedPattern = `${target}.failed-`;
    // Can't easily glob in Node without extra libs — just skip cleanup
  });

  test('restores target from backup', () => {
    target = makeTmpDir();
    backup = makeTmpDir();
    writeFile(backup, 'settings.json', '{"version":"old"}');
    writeFile(backup, 'hooks/test.ts', '// old hook');

    // Corrupt the target (simulates failed install)
    writeFile(target, 'settings.json', '{"version":"broken"}');

    rollback(target, backup);

    expect(readFileSync(join(target, 'settings.json'), 'utf-8')).toContain('"old"');
    expect(existsSync(join(target, 'hooks/test.ts'))).toBe(true);
  });

  test('throws when backup directory does not exist', () => {
    target = makeTmpDir();
    backup = '/tmp/nonexistent-backup-12345';

    expect(() => rollback(target, backup)).toThrow();
  });
});

// ── makeBackupPath ────────────────────────────────────────────────────────

describe('makeBackupPath', () => {
  test('includes date in backup path', () => {
    const bp = makeBackupPath('/home/user/.claude');
    const today = new Date().toISOString().slice(0, 10);
    expect(bp).toContain(today);
    expect(bp).toContain('.claude-backup-');
  });

  test('preserves target directory prefix', () => {
    const bp = makeBackupPath('/home/user/.claude');
    expect(bp.startsWith('/home/user/.claude-backup-')).toBe(true);
  });
});

// ── sha256File ────────────────────────────────────────────────────────────

describe('sha256File', () => {
  let dir: string;
  afterEach(() => { if (existsSync(dir)) rmSync(dir, { recursive: true }); });

  test('returns consistent hash for same content', () => {
    dir = makeTmpDir();
    writeFile(dir, 'test.txt', 'hello world');
    const h1 = sha256File(join(dir, 'test.txt'));
    const h2 = sha256File(join(dir, 'test.txt'));
    expect(h1).toBe(h2);
  });

  test('returns different hash for different content', () => {
    dir = makeTmpDir();
    writeFile(dir, 'a.txt', 'content A');
    writeFile(dir, 'b.txt', 'content B');
    expect(sha256File(join(dir, 'a.txt'))).not.toBe(sha256File(join(dir, 'b.txt')));
  });

  test('returns 64-character hex string', () => {
    dir = makeTmpDir();
    writeFile(dir, 'test.txt', 'data');
    const hash = sha256File(join(dir, 'test.txt'));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ── checkDependencies ─────────────────────────────────────────────────────

describe('checkDependencies', () => {
  test('returns a valid result object', () => {
    const result = checkDependencies();
    expect(typeof result.valid).toBe('boolean');
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  test('passes in this environment (Bun is installed)', () => {
    const result = checkDependencies();
    // Bun is running this test, so it must be present
    expect(result.errors.every(e => !e.includes('Bun'))).toBe(true);
  });
});
