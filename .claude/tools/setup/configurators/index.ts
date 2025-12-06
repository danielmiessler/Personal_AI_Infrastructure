/**
 * Configurators - apply configuration changes
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import Mustache from 'mustache';
import { Transaction, writeAtomic } from '../core/transaction';
import { plistTemplate } from '../templates/plist';
import { profileTemplate } from '../templates/profile';
import { shellTemplate, SHELL_MARKER_START, SHELL_MARKER_END } from '../templates/shell';
import { powershellTemplate, PS_MARKER_START, PS_MARKER_END } from '../templates/powershell';

export interface SetupConfig {
  paiDir: string;
  userName: string;
  userEmail: string;
  assistantName: string;
  assistantColor: string;
  voicePort: number;
  voiceEnabled: boolean;
  updateShellProfile: boolean;
}

/**
 * Detect bun binary path
 */
function getBunPath(): string {
  // Check common locations
  const locations = [
    join(homedir(), '.bun/bin/bun'),      // bun's default install
    '/opt/homebrew/bin/bun',               // Apple Silicon homebrew
    '/usr/local/bin/bun',                  // Intel homebrew / manual
  ];

  for (const loc of locations) {
    if (existsSync(loc)) {
      return loc;
    }
  }

  // Fallback - assume it's in PATH
  return 'bun';
}

/**
 * Create PAI directory structure
 */
export async function createDirectories(config: SetupConfig): Promise<void> {
  const dirs = [
    config.paiDir,
    join(config.paiDir, 'config'),
    join(config.paiDir, 'skills'),
    join(config.paiDir, 'tools'),
    join(config.paiDir, 'history'),
    join(config.paiDir, 'voice-server', 'logs'),
  ];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Write user profile configuration
 */
export async function writeProfile(config: SetupConfig, transaction: Transaction): Promise<void> {
  const profilePath = join(config.paiDir, 'config', 'profile.json');

  await transaction.backup(profilePath);

  const data = {
    ...config,
    createdAt: new Date().toISOString(),
  };

  const content = Mustache.render(profileTemplate, data);
  await writeAtomic(profilePath, content);
}

/**
 * Write voice server plist (macOS only)
 */
export async function writePlist(config: SetupConfig, transaction: Transaction): Promise<void> {
  if (process.platform !== 'darwin') {
    return; // Skip on non-macOS
  }

  const launchAgentsDir = join(homedir(), 'Library', 'LaunchAgents');
  if (!existsSync(launchAgentsDir)) {
    mkdirSync(launchAgentsDir, { recursive: true });
  }

  const plistPath = join(launchAgentsDir, 'com.pai.voiceserver.plist');

  await transaction.backup(plistPath);

  const data = {
    ...config,
    homeDir: homedir(),
    bunPath: getBunPath(),
  };

  const content = Mustache.render(plistTemplate, data);
  await writeAtomic(plistPath, content);
}

/**
 * Update settings.json with actual PAI_DIR path
 * Replaces __HOME__ placeholder with the user's home directory
 */
export async function updateSettingsJson(config: SetupConfig, transaction: Transaction): Promise<void> {
  const settingsPath = join(config.paiDir, 'settings.json');

  if (!existsSync(settingsPath)) {
    // If settings.json doesn't exist in paiDir, check if we're in a .claude subdirectory structure
    const parentSettingsPath = join(dirname(config.paiDir), 'settings.json');
    if (existsSync(parentSettingsPath)) {
      // This handles the case where PAI is cloned to ~/.claude and settings is at ~/.claude/settings.json
      await updateSettingsFile(parentSettingsPath, transaction);
      return;
    }
    // No settings.json found - nothing to update
    return;
  }

  await updateSettingsFile(settingsPath, transaction);
}

/**
 * Helper to update a single settings.json file
 */
async function updateSettingsFile(settingsPath: string, transaction: Transaction): Promise<void> {
  await transaction.backup(settingsPath);

  let content = readFileSync(settingsPath, 'utf-8');

  // Replace __HOME__ placeholder with actual home directory
  const home = homedir();
  const updatedContent = content.replace(/__HOME__/g, home);

  if (content !== updatedContent) {
    await writeAtomic(settingsPath, updatedContent);
  }
}

/**
 * Update shell profile (.zshrc, .bashrc, or PowerShell profile)
 */
export async function updateShellProfile(config: SetupConfig, transaction: Transaction): Promise<string | null> {
  if (!config.updateShellProfile) {
    return null;
  }

  const isWindows = process.platform === 'win32';
  let profilePath: string;
  let template: string;
  let markerStart: string;
  let markerEnd: string;

  if (isWindows) {
    // PowerShell profile location
    const documentsPath = join(
      process.env.USERPROFILE || homedir(),
      'Documents',
      'PowerShell'
    );

    // Create PowerShell directory if needed
    if (!existsSync(documentsPath)) {
      mkdirSync(documentsPath, { recursive: true });
    }

    profilePath = join(documentsPath, 'Microsoft.PowerShell_profile.ps1');
    template = powershellTemplate;
    markerStart = PS_MARKER_START;
    markerEnd = PS_MARKER_END;
  } else {
    // Unix: .zshrc or .bashrc
    const shell = process.env.SHELL || '';
    const isZsh = shell.includes('zsh');
    profilePath = join(homedir(), isZsh ? '.zshrc' : '.bashrc');
    template = shellTemplate;
    markerStart = SHELL_MARKER_START;
    markerEnd = SHELL_MARKER_END;
  }

  await transaction.backup(profilePath);

  // Read existing content
  let content = '';
  if (existsSync(profilePath)) {
    content = readFileSync(profilePath, 'utf-8');
  }

  // Check if PAI config already exists
  if (content.includes(markerStart)) {
    // Remove existing PAI config block
    const startIdx = content.indexOf(markerStart);
    const endIdx = content.indexOf(markerEnd);
    if (startIdx !== -1 && endIdx !== -1) {
      content = content.slice(0, startIdx) + content.slice(endIdx + markerEnd.length);
    }
  }

  // Add new PAI config
  const data = {
    ...config,
    createdAt: new Date().toISOString().split('T')[0],
  };
  const shellConfig = Mustache.render(template, data);
  content = content.trimEnd() + '\n' + shellConfig;

  await writeAtomic(profilePath, content);

  return profilePath;
}
