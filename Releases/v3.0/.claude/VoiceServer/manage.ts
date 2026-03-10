#!/usr/bin/env bun
/**
 * Cross-Platform Voice Server Management CLI
 *
 * Replaces platform-specific shell scripts (install.sh, start.sh, stop.sh, etc.)
 * with a single TypeScript CLI that uses platform.ts abstractions.
 *
 * Usage:
 *   bun manage.ts install    — Install as system service (launchctl / Task Scheduler)
 *   bun manage.ts uninstall  — Remove system service
 *   bun manage.ts start      — Start the voice server
 *   bun manage.ts stop       — Stop the voice server
 *   bun manage.ts restart    — Restart the voice server
 *   bun manage.ts status     — Show server status
 *
 * Part of: PRD-20260219-windows-11-support (Voice Mode)
 */

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';
import {
  isMacOS, isWindows, isLinux, isWSL, getPlatformName,
  getPortCheckCommand, getPortCheckCommandString, getKillCommand,
  getTempDir, getLogDir,
} from '../lib/platform';

// ─── Configuration ──────────────────────────────────────────────────────────

const SCRIPT_DIR = import.meta.dir;
const SERVER_PATH = join(SCRIPT_DIR, 'server.ts');
const PORT = parseInt(process.env.PORT || '8888');
const SERVICE_NAME = 'com.pai.voice-server';
const TASK_NAME = 'PAI-VoiceServer';

// Platform-appropriate paths
function getLogPath(): string {
  if (isMacOS) return join(homedir(), 'Library', 'Logs', 'pai-voice-server.log');
  if (isWindows) return join(getLogDir(), 'pai-voice-server.log');
  return join(getLogDir(), 'pai-voice-server.log');
}

function getPlistPath(): string {
  return join(homedir(), 'Library', 'LaunchAgents', `${SERVICE_NAME}.plist`);
}

// ─── Colors ─────────────────────────────────────────────────────────────────

const RED = '\x1b[0;31m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[1;33m';
const BLUE = '\x1b[0;34m';
const NC = '\x1b[0m';

function ok(msg: string) { console.log(`${GREEN}OK ${msg}${NC}`); }
function warn(msg: string) { console.log(`${YELLOW}! ${msg}${NC}`); }
function fail(msg: string) { console.error(`${RED}X ${msg}${NC}`); }
function info(msg: string) { console.log(`${BLUE}> ${msg}${NC}`); }

// ─── Helpers ────────────────────────────────────────────────────────────────

function getBunPath(): string {
  try {
    return execSync('which bun', { encoding: 'utf-8' }).trim();
  } catch {
    if (isWindows) {
      try {
        return execSync('where bun', { encoding: 'utf-8' }).trim().split('\n')[0];
      } catch { /* fall through */ }
    }
    return 'bun';
  }
}

function isServerResponding(): boolean {
  try {
    execSync(`curl -s -f -X GET http://localhost:${PORT}/health`, {
      timeout: 5000,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

function findProcessOnPort(): string | null {
  try {
    const cmdStr = getPortCheckCommandString(PORT);
    const output = execSync(cmdStr, { encoding: 'utf-8', stdio: 'pipe', timeout: 5000 }).trim();
    if (!output) return null;

    if (isWindows) {
      // netstat output: TCP  0.0.0.0:8888  0.0.0.0:0  LISTENING  12345
      const match = output.match(/\s+(\d+)\s*$/m);
      return match ? match[1] : null;
    }

    // Unix: port check returns PID directly
    return output.split('\n')[0] || null;
  } catch {
    return null;
  }
}

function killProcess(pid: string, force: boolean = false): boolean {
  try {
    const cmd = getKillCommand(pid, force);
    execSync(cmd, { stdio: 'pipe', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

// ─── Commands ───────────────────────────────────────────────────────────────

async function cmdInstall(): Promise<void> {
  console.log(`${BLUE}=====================================================${NC}`);
  console.log(`${BLUE}     PAI Voice Server Installation (${getPlatformName()})${NC}`);
  console.log(`${BLUE}=====================================================${NC}`);
  console.log();

  // Check bun
  info('Checking prerequisites...');
  const bunPath = getBunPath();
  if (!bunPath) {
    fail('Bun is not installed');
    console.log('  Install: curl -fsSL https://bun.sh/install | bash');
    process.exit(1);
  }
  ok('Bun is installed');

  // Check ElevenLabs config
  info('Checking ElevenLabs configuration...');
  const envPath = join(homedir(), '.env');
  let elevenlabsConfigured = false;
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    const keyMatch = envContent.match(/ELEVENLABS_API_KEY=(.+)/);
    if (keyMatch && keyMatch[1] && keyMatch[1] !== 'your_api_key_here') {
      ok('ElevenLabs API key configured');
      elevenlabsConfigured = true;
    }
  }
  if (!elevenlabsConfigured) {
    warn('ElevenLabs API key not configured');
    console.log('  Add: echo \'ELEVENLABS_API_KEY=your_key_here\' >> ~/.env');
    console.log('  Get a free key at: https://elevenlabs.io');
  }

  // Platform-specific service installation
  if (isMacOS) {
    await installMacOS(bunPath);
  } else if (isWindows) {
    await installWindows(bunPath);
  } else if (isWSL) {
    await installWSL(bunPath);
  } else {
    await installLinux(bunPath);
  }

  // Verify server started
  info('Verifying server...');
  // Give server time to boot
  await new Promise(r => setTimeout(r, 2500));
  if (isServerResponding()) {
    ok('Voice server is running');
    console.log(`  Port: ${PORT}`);
    console.log(`  Test: curl -X POST http://localhost:${PORT}/notify -H 'Content-Type: application/json' -d '{"message":"Hello from PAI"}'`);
  } else {
    warn('Server started but not responding yet');
    console.log(`  Check logs: ${getLogPath()}`);
    console.log(`  Try manually: bun run ${SERVER_PATH}`);
  }
}

async function installMacOS(bunPath: string): Promise<void> {
  const plistPath = getPlistPath();
  const logPath = getLogPath();

  // Check for existing service
  try {
    const list = execSync('launchctl list', { encoding: 'utf-8', stdio: 'pipe' });
    if (list.includes(SERVICE_NAME)) {
      warn('Voice server is already installed — reinstalling');
      execSync(`launchctl unload "${plistPath}" 2>/dev/null || true`, { stdio: 'pipe' });
    }
  } catch { /* no existing service */ }

  info('Creating LaunchAgent configuration...');
  mkdirSync(join(homedir(), 'Library', 'LaunchAgents'), { recursive: true });

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${SERVICE_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${bunPath}</string>
        <string>run</string>
        <string>${SERVER_PATH}</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${SCRIPT_DIR}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>StandardOutPath</key>
    <string>${logPath}</string>
    <key>StandardErrorPath</key>
    <string>${logPath}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>HOME</key>
        <string>${homedir()}</string>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${homedir()}/.bun/bin</string>
    </dict>
</dict>
</plist>`;

  writeFileSync(plistPath, plist);
  ok('LaunchAgent configuration created');

  info('Starting voice server service...');
  execSync(`launchctl load "${plistPath}"`, { stdio: 'pipe' });
  ok('Service loaded');
}

async function installWindows(bunPath: string): Promise<void> {
  const logPath = getLogPath();
  mkdirSync(join(getLogDir()), { recursive: true });

  info('Creating Windows Scheduled Task...');

  // Build the schtasks command — runs at logon, restarts on failure
  const taskCmd = [
    'schtasks.exe', '/Create', '/F',
    '/TN', TASK_NAME,
    '/TR', `"${bunPath}" run "${SERVER_PATH}"`,
    '/SC', 'ONLOGON',
    '/RL', 'HIGHEST',
    '/IT',
  ].join(' ');

  try {
    execSync(taskCmd, { stdio: 'pipe', timeout: 10000 });
    ok('Scheduled Task created');
  } catch (e: any) {
    fail('Failed to create Scheduled Task');
    console.log(`  Error: ${e.message}`);
    console.log(`  Try running as Administrator`);
    process.exit(1);
  }

  // Start the task immediately
  info('Starting voice server...');
  try {
    execSync(`schtasks.exe /Run /TN ${TASK_NAME}`, { stdio: 'pipe', timeout: 10000 });
    ok('Server started via Task Scheduler');
  } catch {
    // Fallback: start directly
    warn('Task Scheduler start failed — starting directly');
    const proc = spawn(bunPath, ['run', SERVER_PATH], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    proc.unref();
    ok(`Server started (PID: ${proc.pid})`);
  }
}

async function installWSL(bunPath: string): Promise<void> {
  // WSL: run as a background process, not a system service
  // (Task Scheduler from WSL requires extra setup; launchctl doesn't exist)
  const logPath = getLogPath();
  mkdirSync(join(getLogDir()), { recursive: true });

  info('Installing voice server for WSL...');
  info('WSL runs the server as a background process (not a system service)');

  // Stop any existing
  const pid = findProcessOnPort();
  if (pid) {
    killProcess(pid, true);
    await new Promise(r => setTimeout(r, 500));
  }

  // Start as background process with log redirection
  const proc = spawn(bunPath, ['run', SERVER_PATH], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.unref();
  ok(`Voice server started in background (PID: ${proc.pid})`);
  console.log(`  Note: Add to your shell profile for auto-start:`);
  console.log(`  echo 'bun run ${SERVER_PATH} &' >> ~/.bashrc`);
}

async function installLinux(bunPath: string): Promise<void> {
  // Create a systemd user service
  const serviceDir = join(homedir(), '.config', 'systemd', 'user');
  const servicePath = join(serviceDir, 'pai-voice-server.service');
  const logPath = getLogPath();

  mkdirSync(serviceDir, { recursive: true });

  info('Creating systemd user service...');

  const unit = `[Unit]
Description=PAI Voice Server
After=network.target

[Service]
Type=simple
ExecStart=${bunPath} run ${SERVER_PATH}
WorkingDirectory=${SCRIPT_DIR}
Restart=on-failure
RestartSec=5
Environment=HOME=${homedir()}

[Install]
WantedBy=default.target
`;

  writeFileSync(servicePath, unit);
  ok('Systemd service file created');

  try {
    execSync('systemctl --user daemon-reload', { stdio: 'pipe' });
    execSync('systemctl --user enable pai-voice-server', { stdio: 'pipe' });
    execSync('systemctl --user start pai-voice-server', { stdio: 'pipe' });
    ok('Service enabled and started');
  } catch (e: any) {
    warn(`systemctl failed: ${e.message}`);
    console.log('  Starting directly as fallback...');
    const proc = spawn(bunPath, ['run', SERVER_PATH], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    proc.unref();
    ok(`Voice server started in background (PID: ${proc.pid})`);
  }
}

async function cmdStart(): Promise<void> {
  info('Starting Voice Server...');

  if (isServerResponding()) {
    warn('Voice server is already running');
    console.log('  To restart, use: bun manage.ts restart');
    return;
  }

  if (isMacOS) {
    const plistPath = getPlistPath();
    if (!existsSync(plistPath)) {
      fail('Service not installed');
      console.log('  Run: bun manage.ts install');
      process.exit(1);
    }
    try {
      execSync(`launchctl load "${plistPath}" 2>/dev/null`, { stdio: 'pipe' });
      await new Promise(r => setTimeout(r, 2000));
      if (isServerResponding()) {
        ok('Voice server started successfully');
      } else {
        warn('Server started but not responding yet');
      }
    } catch {
      fail('Failed to start voice server');
      process.exit(1);
    }
  } else if (isWindows) {
    try {
      execSync(`schtasks.exe /Run /TN ${TASK_NAME}`, { stdio: 'pipe', timeout: 10000 });
      await new Promise(r => setTimeout(r, 2000));
      ok('Voice server started via Task Scheduler');
    } catch {
      // Fallback: direct start
      const bunPath = getBunPath();
      const proc = spawn(bunPath, ['run', SERVER_PATH], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      proc.unref();
      ok(`Voice server started directly (PID: ${proc.pid})`);
    }
  } else {
    // Linux / WSL
    if (!isWSL) {
      try {
        execSync('systemctl --user start pai-voice-server', { stdio: 'pipe' });
        await new Promise(r => setTimeout(r, 2000));
        if (isServerResponding()) {
          ok('Voice server started');
          return;
        }
      } catch { /* fallback below */ }
    }

    const bunPath = getBunPath();
    const proc = spawn(bunPath, ['run', SERVER_PATH], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    proc.unref();
    ok(`Voice server started (PID: ${proc.pid})`);
  }
}

async function cmdStop(): Promise<void> {
  info('Stopping Voice Server...');

  // Platform service stop
  if (isMacOS) {
    const plistPath = getPlistPath();
    try {
      const list = execSync('launchctl list', { encoding: 'utf-8', stdio: 'pipe' });
      if (list.includes(SERVICE_NAME)) {
        execSync(`launchctl unload "${plistPath}" 2>/dev/null`, { stdio: 'pipe' });
        ok('Service unloaded');
      }
    } catch { /* not loaded */ }
  } else if (isWindows) {
    try {
      execSync(`schtasks.exe /End /TN ${TASK_NAME}`, { stdio: 'pipe', timeout: 10000 });
      ok('Scheduled task stopped');
    } catch { /* not running */ }
  } else if (!isWSL) {
    try {
      execSync('systemctl --user stop pai-voice-server', { stdio: 'pipe' });
      ok('Systemd service stopped');
    } catch { /* not running */ }
  }

  // Kill any remaining process on port
  const pid = findProcessOnPort();
  if (pid) {
    info(`Cleaning up port ${PORT} (PID: ${pid})...`);
    killProcess(pid, true);
    ok(`Port ${PORT} cleared`);
  } else {
    if (!isMacOS && !isWindows) {
      warn('Voice server is not running');
    }
  }
}

async function cmdRestart(): Promise<void> {
  info('Restarting Voice Server...');
  await cmdStop();
  await new Promise(r => setTimeout(r, 1000));
  await cmdStart();
}

async function cmdStatus(): Promise<void> {
  console.log(`${BLUE}=====================================================${NC}`);
  console.log(`${BLUE}     PAI Voice Server Status (${getPlatformName()})${NC}`);
  console.log(`${BLUE}=====================================================${NC}`);
  console.log();

  // Service status
  console.log(`${BLUE}Service Status:${NC}`);
  if (isMacOS) {
    try {
      const list = execSync('launchctl list', { encoding: 'utf-8', stdio: 'pipe' });
      if (list.includes(SERVICE_NAME)) {
        const line = list.split('\n').find(l => l.includes(SERVICE_NAME));
        const pid = line?.split('\t')[0];
        if (pid && pid !== '-') {
          ok(`Service is loaded (PID: ${pid})`);
        } else {
          warn('Service is loaded but not running');
        }
      } else {
        fail('Service is not loaded');
      }
    } catch {
      fail('Cannot check service status');
    }
  } else if (isWindows) {
    try {
      const output = execSync(`schtasks.exe /Query /TN ${TASK_NAME} /FO LIST`, {
        encoding: 'utf-8', stdio: 'pipe', timeout: 10000,
      });
      if (output.includes('Running')) {
        ok('Scheduled Task is running');
      } else {
        warn('Scheduled Task exists but is not running');
      }
    } catch {
      fail('Scheduled Task not found — run: bun manage.ts install');
    }
  } else if (!isWSL) {
    try {
      const output = execSync('systemctl --user is-active pai-voice-server', {
        encoding: 'utf-8', stdio: 'pipe',
      });
      if (output.trim() === 'active') {
        ok('Systemd service is active');
      } else {
        warn(`Systemd service is ${output.trim()}`);
      }
    } catch {
      warn('Systemd service not found');
    }
  } else {
    info('WSL: No system service — checking process directly');
  }

  // Server health
  console.log();
  console.log(`${BLUE}Server Status:${NC}`);
  if (isServerResponding()) {
    ok(`Server is responding on port ${PORT}`);
    try {
      const health = execSync(`curl -s http://localhost:${PORT}/health`, {
        encoding: 'utf-8', stdio: 'pipe', timeout: 5000,
      });
      console.log(`  Response: ${health}`);
    } catch { /* health output failed */ }
  } else {
    fail('Server is not responding');
  }

  // Port status
  console.log();
  console.log(`${BLUE}Port Status:${NC}`);
  const pid = findProcessOnPort();
  if (pid) {
    ok(`Port ${PORT} is in use (PID: ${pid})`);
  } else {
    warn(`Port ${PORT} is not in use`);
  }

  // ElevenLabs config
  console.log();
  console.log(`${BLUE}Voice Configuration:${NC}`);
  const envPath = join(homedir(), '.env');
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    const keyMatch = envContent.match(/ELEVENLABS_API_KEY=(.+)/);
    if (keyMatch && keyMatch[1] && keyMatch[1] !== 'your_api_key_here') {
      ok('ElevenLabs API configured');
      const voiceMatch = envContent.match(/ELEVENLABS_VOICE_ID=(.+)/);
      if (voiceMatch) console.log(`  Voice ID: ${voiceMatch[1]}`);
    } else {
      warn('ElevenLabs API key not configured');
    }
  } else {
    warn('No .env file found');
  }

  // Logs
  console.log();
  console.log(`${BLUE}Log Path:${NC}`);
  const logPath = getLogPath();
  if (existsSync(logPath)) {
    console.log(`  ${logPath}`);
  } else {
    console.log(`  ${logPath} (not yet created)`);
  }

  // Commands
  console.log();
  console.log(`${BLUE}Available Commands:${NC}`);
  console.log('  bun manage.ts start');
  console.log('  bun manage.ts stop');
  console.log('  bun manage.ts restart');
  console.log('  bun manage.ts install');
  console.log('  bun manage.ts uninstall');
  console.log(`  Test: curl -X POST http://localhost:${PORT}/notify -H 'Content-Type: application/json' -d '{"message":"Test"}'`);
}

async function cmdUninstall(): Promise<void> {
  console.log(`${BLUE}=====================================================${NC}`);
  console.log(`${BLUE}     PAI Voice Server Uninstall (${getPlatformName()})${NC}`);
  console.log(`${BLUE}=====================================================${NC}`);
  console.log();

  // Stop first
  await cmdStop();

  // Platform-specific uninstall
  if (isMacOS) {
    const plistPath = getPlistPath();
    if (existsSync(plistPath)) {
      try { unlinkSync(plistPath); } catch {}
      ok('LaunchAgent removed');
    }
  } else if (isWindows) {
    try {
      execSync(`schtasks.exe /Delete /TN ${TASK_NAME} /F`, { stdio: 'pipe', timeout: 10000 });
      ok('Scheduled Task removed');
    } catch {
      warn('Scheduled Task not found (already removed?)');
    }
  } else if (!isWSL) {
    try {
      execSync('systemctl --user disable pai-voice-server', { stdio: 'pipe' });
      const servicePath = join(homedir(), '.config', 'systemd', 'user', 'pai-voice-server.service');
      if (existsSync(servicePath)) unlinkSync(servicePath);
      execSync('systemctl --user daemon-reload', { stdio: 'pipe' });
      ok('Systemd service removed');
    } catch {
      warn('Systemd service not found');
    }
  }

  console.log();
  ok('Voice server uninstalled');
  console.log('  Your server files and configuration are preserved.');
  console.log('  To reinstall: bun manage.ts install');
}

// ─── CLI Entry Point ────────────────────────────────────────────────────────

const command = process.argv[2];

const commands: Record<string, () => Promise<void>> = {
  install: cmdInstall,
  start: cmdStart,
  stop: cmdStop,
  restart: cmdRestart,
  status: cmdStatus,
  uninstall: cmdUninstall,
};

if (!command || !commands[command]) {
  console.log('PAI Voice Server Manager');
  console.log();
  console.log('Usage: bun manage.ts <command>');
  console.log();
  console.log('Commands:');
  console.log('  install    Install as system service');
  console.log('  uninstall  Remove system service');
  console.log('  start      Start the voice server');
  console.log('  stop       Stop the voice server');
  console.log('  restart    Restart the voice server');
  console.log('  status     Show server status');
  console.log();
  console.log(`Platform: ${getPlatformName()}`);
  process.exit(command ? 1 : 0);
}

await commands[command]();
