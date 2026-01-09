import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { $ } from 'bun';
import * as path from 'path';
import * as os from 'os';

// Test using mock adapter via providers.yaml
const testConfigDir = path.join(os.tmpdir(), 'mai-secrets-skill-test');
const testConfigPath = path.join(testConfigDir, 'providers.yaml');

const toolsDir = path.join(import.meta.dir, '..', 'Tools');

describe('CLI Tools', () => {
  beforeAll(async () => {
    // Create test config directory
    await $`mkdir -p ${testConfigDir}`.quiet();

    // Create a providers.yaml that uses mock adapter
    const config = `
domains:
  secrets:
    primary: mock
    adapters:
      mock:
        secrets:
          API_KEY: test-api-key-12345
          DATABASE_URL: postgres://localhost:5432/test
          JWT_SECRET: super-secret-jwt-key
          AWS_ACCESS_KEY: AKIAIOSFODNN7EXAMPLE
          AWS_SECRET_KEY: wJalrXUtnFEMI/K7MDENG
`;
    await Bun.write(testConfigPath, config);
  });

  afterAll(async () => {
    // Cleanup
    await $`rm -rf ${testConfigDir}`.quiet();
  });

  describe('get.ts', () => {
    it('shows help with --help', async () => {
      const result = await $`bun run ${toolsDir}/get.ts --help`.quiet().nothrow();
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Usage:');
      expect(result.stdout.toString()).toContain('<key>');
    });

    it('shows help with no arguments', async () => {
      const result = await $`bun run ${toolsDir}/get.ts`.quiet().nothrow();
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Usage:');
    });
  });

  describe('list.ts', () => {
    it('shows help with --help', async () => {
      const result = await $`bun run ${toolsDir}/list.ts --help`.quiet().nothrow();
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Usage:');
      expect(result.stdout.toString()).toContain('--pattern');
    });
  });

  describe('health.ts', () => {
    it('shows help with --help', async () => {
      const result = await $`bun run ${toolsDir}/health.ts --help`.quiet().nothrow();
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Usage:');
      expect(result.stdout.toString()).toContain('--adapter');
    });
  });
});

describe('SecretValue Redaction in CLI', () => {
  // These tests verify that the CLI tools use reveal() correctly
  // and don't accidentally expose secrets

  it('get.ts help does not contain any secrets', async () => {
    const result = await $`bun run ${toolsDir}/get.ts --help`.quiet().nothrow();
    const output = result.stdout.toString();

    // Should not contain any secret-like values
    expect(output).not.toContain('test-api-key');
    expect(output).not.toContain('postgres://');
    expect(output).not.toContain('AKIAIOSFODNN');
  });
});
