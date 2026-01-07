import { describe, test, expect, beforeAll } from 'bun:test';
import * as path from 'path';

const toolsDir = path.join(import.meta.dir, '../Tools');

describe('CLI Tools', () => {
  beforeAll(async () => {
    // Ensure dependencies are installed
    const proc = Bun.spawn(['bun', 'install'], {
      cwd: path.join(import.meta.dir, '..'),
      stdout: 'pipe',
      stderr: 'pipe'
    });
    await proc.exited;
  });

  describe('devices.ts', () => {
    test('lists devices', async () => {
      const proc = Bun.spawn(['bun', 'run', path.join(toolsDir, 'devices.ts')], {
        cwd: path.join(import.meta.dir, '..'),
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const output = await new Response(proc.stdout).text();
      await proc.exited;

      expect(output).toContain('NETWORK DEVICES');
      expect(output).toContain('Total:');
    });

    test('outputs JSON with --json flag', async () => {
      const proc = Bun.spawn(['bun', 'run', path.join(toolsDir, 'devices.ts'), '--json'], {
        cwd: path.join(import.meta.dir, '..'),
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const output = await new Response(proc.stdout).text();
      await proc.exited;

      const devices = JSON.parse(output);
      expect(Array.isArray(devices)).toBe(true);
      expect(devices.length).toBeGreaterThan(0);
    });

    test('shows help with --help flag', async () => {
      const proc = Bun.spawn(['bun', 'run', path.join(toolsDir, 'devices.ts'), '--help'], {
        cwd: path.join(import.meta.dir, '..'),
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const output = await new Response(proc.stdout).text();
      await proc.exited;

      expect(output).toContain('Usage:');
      expect(output).toContain('--type');
    });
  });

  describe('clients.ts', () => {
    test('lists clients', async () => {
      const proc = Bun.spawn(['bun', 'run', path.join(toolsDir, 'clients.ts')], {
        cwd: path.join(import.meta.dir, '..'),
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const output = await new Response(proc.stdout).text();
      await proc.exited;

      expect(output).toContain('CONNECTED CLIENTS');
      expect(output).toContain('Total:');
    });

    test('outputs JSON with --json flag', async () => {
      const proc = Bun.spawn(['bun', 'run', path.join(toolsDir, 'clients.ts'), '--json'], {
        cwd: path.join(import.meta.dir, '..'),
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const output = await new Response(proc.stdout).text();
      await proc.exited;

      const clients = JSON.parse(output);
      expect(Array.isArray(clients)).toBe(true);
    });
  });

  describe('vlans.ts', () => {
    test('lists VLANs', async () => {
      const proc = Bun.spawn(['bun', 'run', path.join(toolsDir, 'vlans.ts')], {
        cwd: path.join(import.meta.dir, '..'),
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const output = await new Response(proc.stdout).text();
      await proc.exited;

      expect(output).toContain('NETWORK VLANs');
      expect(output).toContain('Total:');
    });

    test('outputs JSON with --json flag', async () => {
      const proc = Bun.spawn(['bun', 'run', path.join(toolsDir, 'vlans.ts'), '--json'], {
        cwd: path.join(import.meta.dir, '..'),
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const output = await new Response(proc.stdout).text();
      await proc.exited;

      const vlans = JSON.parse(output);
      expect(Array.isArray(vlans)).toBe(true);
      expect(vlans.length).toBeGreaterThan(0);
    });
  });

  describe('health.ts', () => {
    test('shows health status', async () => {
      const proc = Bun.spawn(['bun', 'run', path.join(toolsDir, 'health.ts')], {
        cwd: path.join(import.meta.dir, '..'),
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const output = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(output).toContain('NETWORK HEALTH');
      expect(output).toContain('Status:');
      expect(exitCode).toBe(0); // Should be healthy with mock adapter
    });

    test('outputs JSON with --json flag', async () => {
      const proc = Bun.spawn(['bun', 'run', path.join(toolsDir, 'health.ts'), '--json'], {
        cwd: path.join(import.meta.dir, '..'),
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const output = await new Response(proc.stdout).text();
      await proc.exited;

      const health = JSON.parse(output);
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('message');
    });
  });

  describe('ports.ts', () => {
    test('shows help without device ID', async () => {
      const proc = Bun.spawn(['bun', 'run', path.join(toolsDir, 'ports.ts')], {
        cwd: path.join(import.meta.dir, '..'),
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const output = await new Response(proc.stdout).text();
      await proc.exited;

      expect(output).toContain('Usage:');
    });

    test('lists ports for device', async () => {
      // First get a device ID
      const devicesProc = Bun.spawn(['bun', 'run', path.join(toolsDir, 'devices.ts'), '--json'], {
        cwd: path.join(import.meta.dir, '..'),
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const devicesOutput = await new Response(devicesProc.stdout).text();
      await devicesProc.exited;
      const devices = JSON.parse(devicesOutput);
      const deviceId = devices[0].id;

      // Now get ports
      const proc = Bun.spawn(['bun', 'run', path.join(toolsDir, 'ports.ts'), deviceId], {
        cwd: path.join(import.meta.dir, '..'),
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const output = await new Response(proc.stdout).text();
      await proc.exited;

      expect(output).toContain('PORTS ON');
      expect(output).toContain('Total:');
    });
  });
});
