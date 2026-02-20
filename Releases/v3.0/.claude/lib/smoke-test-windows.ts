#!/usr/bin/env bun
/**
 * Windows Smoke Test — Phase 0
 *
 * Run this on Windows (not WSL) to verify platform.ts works:
 *   cd C:\users\justi\code\pai\Releases\v3.0\.claude
 *   bun lib/smoke-test-windows.ts
 *
 * Expected: All checks PASS on Windows, all return Windows-appropriate values.
 * Part of: PRD-20260219-windows-11-support (Phase 0 Smoke Test Checkpoint)
 */

import {
  platform,
  isWindows,
  isMacOS,
  isLinux,
  isWSL,
  getPlatformName,
  getHomeDir,
  getTempDir,
  getTempFilePath,
  getConfigDir,
  getLogDir,
  getPortCheckCommandString,
  getKillCommand,
  getKillByPatternCommand,
  isCommandAvailable,
  getDefaultShell,
  getShellProfilePath,
  detectTerminal,
  isKittyAvailable,
  getKittySocketPath,
  supportsAnsiEscapes,
  getAudioPlayCommand,
  getNotificationCommand,
  getDeleteFileCommand,
  getServiceManager,
} from './platform';
import { join } from 'path';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${name}${detail ? ` — ${detail}` : ''}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

console.log('═══════════════════════════════════════════');
console.log('  PAI Platform.ts — Windows Smoke Test');
console.log('═══════════════════════════════════════════');
console.log(`  Runtime: Bun ${Bun.version}`);
console.log(`  Platform: ${process.platform} (${process.arch})`);
console.log('───────────────────────────────────────────');

// Section 1: OS Detection
console.log('\n📋 Section 1: OS Detection');
check('platform value', typeof platform === 'string', `platform = "${platform}"`);
check('isWindows is boolean', typeof isWindows === 'boolean', `isWindows = ${isWindows}`);
check('isMacOS is boolean', typeof isMacOS === 'boolean', `isMacOS = ${isMacOS}`);
check('isLinux is boolean', typeof isLinux === 'boolean', `isLinux = ${isLinux}`);
check('isWSL is boolean', typeof isWSL === 'boolean', `isWSL = ${isWSL}`);
check('getPlatformName returns string', getPlatformName().length > 0, `name = "${getPlatformName()}"`);

if (isWindows) {
  check('Windows detected correctly', platform === 'win32');
  check('getPlatformName is "Windows"', getPlatformName() === 'Windows');
  check('isMacOS is false on Windows', !isMacOS);
  check('isLinux is false on Windows', !isLinux);
}

// Section 2: Path Resolution
console.log('\n📋 Section 2: Path Resolution');
const home = getHomeDir();
const tmp = getTempDir();
const tempFile = getTempFilePath('test', '.txt');
const config = getConfigDir();
const logs = getLogDir();

check('getHomeDir returns path', home.length > 0, `home = "${home}"`);
check('getTempDir returns path', tmp.length > 0, `tmp = "${tmp}"`);
check('getTempFilePath includes prefix', tempFile.includes('test'), `tempFile = "${tempFile}"`);
check('getTempFilePath starts with tmpdir', tempFile.startsWith(tmp), 'tempFile starts with getTempDir()');
check('getConfigDir returns path', config.length > 0, `config = "${config}"`);
check('getLogDir returns path', logs.length > 0, `logs = "${logs}"`);

if (isWindows) {
  check('home does NOT contain /home/', !home.includes('/home/'), 'Windows home path');
  check('tmp does NOT contain /tmp', !tmp.includes('/tmp'), 'Windows temp path');
  check('config uses APPDATA or home', config.includes('PAI'), 'config includes PAI');
  check('logs uses APPDATA or home', logs.includes('PAI') || logs.includes('Logs'), 'logs path');
}

// Section 3: Command Mapping
console.log('\n📋 Section 3: Command Mapping');
const portCmd = getPortCheckCommandString(8888);
const killCmd = getKillCommand(1234, true);
const killPattern = getKillByPatternCommand('voice-server');
const shell = getDefaultShell();
const profile = getShellProfilePath();

check('getPortCheckCommandString has port', portCmd.includes('8888'), `cmd = "${portCmd}"`);
check('getKillCommand has PID', killCmd.includes('1234'), `cmd = "${killCmd}"`);
check('getKillByPatternCommand has pattern', killPattern.includes('voice-server'), `cmd = "${killPattern}"`);
check('getDefaultShell returns path', shell.length > 0, `shell = "${shell}"`);
check('getShellProfilePath returns string', typeof profile === 'string', `profile = "${profile}"`);

if (isWindows) {
  check('port check uses netstat on Windows', portCmd.includes('netstat'), 'Windows port check');
  check('kill uses taskkill on Windows', killCmd.includes('taskkill'), 'Windows kill');
  check('shell is powershell on Windows', shell.includes('powershell'), 'Windows shell');
  check('lsof NOT available on Windows', !isCommandAvailable('lsof'), 'lsof unavailable');
  check('chmod NOT available on Windows', !isCommandAvailable('chmod'), 'chmod unavailable');
  check('afplay NOT available on Windows', !isCommandAvailable('afplay'), 'afplay unavailable');
}

// Section 4: Terminal Detection
console.log('\n📋 Section 4: Terminal Detection');
const terminal = detectTerminal();
const kittyAvail = isKittyAvailable();
const kittySocket = getKittySocketPath();
const ansi = supportsAnsiEscapes();

check('detectTerminal returns valid type', ['kitty', 'windows-terminal', 'iterm2', 'generic'].includes(terminal), `terminal = "${terminal}"`);
check('isKittyAvailable is boolean', typeof kittyAvail === 'boolean', `kittyAvailable = ${kittyAvail}`);
check('getKittySocketPath returns string|null', kittySocket === null || typeof kittySocket === 'string', `socket = ${kittySocket}`);
check('supportsAnsiEscapes is boolean', typeof ansi === 'boolean', `ansiSupport = ${ansi}`);

if (isWindows) {
  check('Kitty NOT available on Windows', !kittyAvail, 'Kitty unavailable on Windows');
  check('Kitty socket is null on Windows', kittySocket === null, 'No Kitty socket on Windows');
}

// Section 5: Audio & Notifications
console.log('\n📋 Section 5: Audio & Notifications');
const testAudioPath = getTempFilePath('test', '.mp3');
const audioCmd = getAudioPlayCommand(testAudioPath, 0.5);
const notifCmd = getNotificationCommand('Test', 'Hello');
const testDeletePath = join(getTempDir(), 'test.txt');
const deleteCmd = getDeleteFileCommand(testDeletePath);

check('getAudioPlayCommand returns result', audioCmd !== null, audioCmd ? `command = "${audioCmd.command}"` : 'null');
check('getNotificationCommand returns result', notifCmd !== null, notifCmd ? `command = "${notifCmd.command}"` : 'null');
check('getDeleteFileCommand returns object', deleteCmd !== null, `command = "${deleteCmd.command}"`);

if (isWindows) {
  check('audio uses powershell on Windows', audioCmd?.command.includes('powershell') ?? false, 'Windows audio');
  check('notification uses powershell on Windows', notifCmd?.command.includes('powershell') ?? false, 'Windows notification');
  check('delete uses cmd.exe on Windows', deleteCmd.command === 'cmd.exe', 'Windows delete');
}

// Section 6: Service Management
console.log('\n📋 Section 6: Service Management');
const svcMgr = getServiceManager();
check('getServiceManager returns valid type', ['launchctl', 'systemd', 'task-scheduler', 'none'].includes(svcMgr), `serviceManager = "${svcMgr}"`);

if (isWindows) {
  check('service manager is task-scheduler on Windows', svcMgr === 'task-scheduler', 'Windows service manager');
}

// Summary
console.log('\n═══════════════════════════════════════════');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`  Platform: ${getPlatformName()} (${platform}/${process.arch})`);
if (failed === 0) {
  console.log('  🎉 ALL CHECKS PASSED');
} else {
  console.log('  ⚠️  SOME CHECKS FAILED — review above');
}
console.log('═══════════════════════════════════════════');

process.exit(failed > 0 ? 1 : 0);
