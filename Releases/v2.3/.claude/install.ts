#!/usr/bin/env bun
/**
 * PAI Installation Wizard
 *
 * Handles fresh installs, updates, and intelligent migration from existing systems.
 *
 * Usage:
 *   bun run install.ts              # Interactive wizard
 *   bun run install.ts --fresh      # Force fresh install
 *   bun run install.ts --migrate    # Force migration mode
 *   bun run install.ts --validate   # Only run validation
 */

import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync, readdirSync, statSync, appendFileSync, chmodSync, chownSync } from 'fs';
import { join, basename } from 'path';
import { homedir, userInfo } from 'os';
import * as readline from 'readline';
import { execSync, spawn } from 'child_process';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  blue: '\x1b[38;2;59;130;246m',
  green: '\x1b[38;2;34;197;94m',
  yellow: '\x1b[38;2;234;179;8m',
  red: '\x1b[38;2;239;68;68m',
  cyan: '\x1b[38;2;6;182;212m',
  gray: '\x1b[38;2;100;116;139m',
};

const c = colors;

// Paths
const HOME = homedir();
const CLAUDE_DIR = join(HOME, '.claude');
const BACKUP_DIR = join(HOME, '.claude-BACKUP');
const PAI_RELEASES = join(HOME, '.claude', 'PAI_RELEASES');
// Shell detection for bash/zsh support
const SHELL = process.env.SHELL || '/bin/zsh';
const IS_ZSH = SHELL.includes('zsh');
const SHELL_RC = join(HOME, IS_ZSH ? '.zshrc' : '.bashrc');
const SHELL_NAME = IS_ZSH ? 'zsh' : 'bash';
const VOICE_SERVER_DIR = join(CLAUDE_DIR, 'VoiceServer');
const VOICE_SERVER_PORT = 8888;
const KITTY_CONFIG_DIR = join(HOME, '.config', 'kitty');
const PAI_TERMINAL_DIR = join(CLAUDE_DIR, 'skills', 'CORE', 'USER', 'TERMINAL');

// Default voice IDs - ElevenLabs pre-made voices (work with any API key)
const DEFAULT_VOICES = {
  male: '21m00Tcm4TlvDq8ikWAM',      // Adam - standard male voice
  female: 'EXAVITQu4vr4xnSDxMaL',    // Sarah - standard female voice
  neutral: 'pNInz6obpgDQGcFmaJgB',   // Antoni - neutral voice
};

// Installation modes
type InstallMode = 'fresh' | 'update' | 'migrate' | 'merge';

interface Config {
  principal: {
    name: string;
    timezone: string;
  };
  daidentity: {
    name: string;
    fullName: string;
    voiceId: string;
  };
  apiKeys: {
    elevenlabs?: string;
    anthropic?: string;
  };
}

interface MigrationSource {
  path: string;
  hasSettings: boolean;
  hasUserContent: boolean;
  hasPersonalSkills: boolean;
  hasAgents: boolean;
  hasMemory: boolean;
  version?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function print(msg: string) {
  console.log(msg);
}

function printHeader() {
  print('');
  print(`${c.blue}${c.bold}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${c.reset}`);
  print(`${c.blue}${c.bold}┃${c.reset}              ${c.cyan}PAI Installation Wizard${c.reset}                       ${c.blue}${c.bold}┃${c.reset}`);
  print(`${c.blue}${c.bold}┃${c.reset}       ${c.gray}Personal AI Infrastructure v2.3${c.reset}                     ${c.blue}${c.bold}┃${c.reset}`);
  print(`${c.blue}${c.bold}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${c.reset}`);
  print('');
}

function printStep(num: number, total: number, msg: string) {
  print(`${c.blue}[${num}/${total}]${c.reset} ${c.bold}${msg}${c.reset}`);
}

function printSuccess(msg: string) {
  print(`  ${c.green}✓${c.reset} ${msg}`);
}

function printWarning(msg: string) {
  print(`  ${c.yellow}!${c.reset} ${msg}`);
}

function printError(msg: string) {
  print(`  ${c.red}✗${c.reset} ${msg}`);
}

function printInfo(msg: string) {
  print(`  ${c.gray}→${c.reset} ${msg}`);
}

async function question(prompt: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const displayPrompt = defaultValue
      ? `${c.cyan}?${c.reset} ${prompt} ${c.dim}[${defaultValue}]${c.reset}: `
      : `${c.cyan}?${c.reset} ${prompt}: `;

    rl.question(displayPrompt, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

async function confirm(prompt: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? '[Y/n]' : '[y/N]';
  const answer = await question(`${prompt} ${c.dim}${hint}${c.reset}`);

  if (!answer) return defaultYes;
  return answer.toLowerCase().startsWith('y');
}

async function selectOption(prompt: string, options: string[], defaultIndex = 0): Promise<number> {
  print(`${c.cyan}?${c.reset} ${prompt}`);
  for (let i = 0; i < options.length; i++) {
    const marker = i === defaultIndex ? `${c.cyan}>${c.reset}` : ' ';
    print(`  ${marker} ${i + 1}. ${options[i]}`);
  }
  const answer = await question(`Enter number`, String(defaultIndex + 1));
  const idx = parseInt(answer) - 1;
  return (idx >= 0 && idx < options.length) ? idx : defaultIndex;
}

// ============================================================================
// PERMISSIONS & OWNERSHIP (CRITICAL - MUST RUN FIRST)
// ============================================================================

function getCurrentUser(): { uid: number; gid: number; username: string } {
  const info = userInfo();
  return {
    uid: info.uid,
    gid: info.gid,
    username: info.username
  };
}

function fixPermissions(targetDir: string): void {
  const user = getCurrentUser();

  print('');
  print(`${c.bold}Fixing permissions for ${user.username}${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);

  try {
    // Use chown -R for recursive ownership change
    execSync(`chown -R ${user.uid}:${user.gid} "${targetDir}"`, { stdio: 'pipe' });
    printSuccess(`Set ownership to ${user.username}`);

    // Use chmod -R for directories (755) and files (644) with special handling for executables
    // First, set all to 755 (directories will be correct, files will be executable)
    execSync(`chmod -R 755 "${targetDir}"`, { stdio: 'pipe' });
    printSuccess('Set directory permissions (755)');

    // Then specifically set .ts, .sh, and hook files to be executable
    const executablePatterns = ['*.ts', '*.sh', '*.hook.ts'];
    for (const pattern of executablePatterns) {
      try {
        execSync(`find "${targetDir}" -name "${pattern}" -exec chmod 755 {} \\;`, { stdio: 'pipe' });
      } catch (e) {
        // Pattern might not match any files, which is fine
      }
    }
    printSuccess('Set executable permissions');

  } catch (err: any) {
    printError(`Permission fix failed: ${err.message}`);
    print(`${c.yellow}You may need to run: sudo chown -R $(whoami) ${targetDir}${c.reset}`);
  }
}

// ============================================================================
// VOICE SERVER MANAGEMENT
// ============================================================================

function findRunningVoiceServers(): number[] {
  const pids: number[] = [];
  try {
    // Find processes LISTENING on the voice server port (not just connected)
    // -sTCP:LISTEN ensures we only get the server, not clients connecting to it
    const result = execSync(`lsof -ti:${VOICE_SERVER_PORT} -sTCP:LISTEN`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    const lines = result.trim().split('\n');
    for (const line of lines) {
      const pid = parseInt(line.trim());
      if (!isNaN(pid)) {
        pids.push(pid);
      }
    }
  } catch (e) {
    // No processes found on port, which is fine
  }
  return pids;
}

function killVoiceServers(): void {
  const pids = findRunningVoiceServers();
  if (pids.length > 0) {
    printInfo(`Found ${pids.length} existing voice server process(es)`);
    for (const pid of pids) {
      try {
        execSync(`kill -9 ${pid}`, { stdio: 'pipe' });
        printSuccess(`Killed process ${pid}`);
      } catch (e) {
        printWarning(`Could not kill process ${pid}`);
      }
    }
  }
}

async function startVoiceServer(): Promise<boolean> {
  const serverScript = join(VOICE_SERVER_DIR, 'server.ts');

  if (!existsSync(serverScript)) {
    printWarning('Voice server script not found');
    return false;
  }

  // Kill any existing voice servers first
  killVoiceServers();

  // Start the voice server in background
  try {
    const child = spawn('bun', ['run', serverScript], {
      detached: true,
      stdio: 'ignore',
      cwd: VOICE_SERVER_DIR,
    });
    child.unref();

    // Wait a moment for it to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if it's running
    const running = findRunningVoiceServers().length > 0;
    if (running) {
      printSuccess('Voice server started');
      return true;
    } else {
      printWarning('Voice server may not have started correctly');
      return false;
    }
  } catch (err: any) {
    printError(`Failed to start voice server: ${err.message}`);
    return false;
  }
}

async function testVoice(message: string): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${VOICE_SERVER_PORT}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    return response.ok;
  } catch (e) {
    return false;
  }
}

async function verifyPort8888(): Promise<{ listening: boolean; canConnect: boolean }> {
  // Check if something is listening on port 8888
  const pids = findRunningVoiceServers();
  const listening = pids.length > 0;

  // Try to actually connect and get a response
  let canConnect = false;
  try {
    const response = await fetch(`http://localhost:${VOICE_SERVER_PORT}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    canConnect = response.ok;
  } catch (e) {
    // Try the notify endpoint as fallback (server may not have /health)
    try {
      const response = await fetch(`http://localhost:${VOICE_SERVER_PORT}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '' }),
        signal: AbortSignal.timeout(2000),
      });
      // Even a 400 response means the server is responding
      canConnect = true;
    } catch (e2) {
      canConnect = false;
    }
  }

  return { listening, canConnect };
}

// ============================================================================
// ZSH ALIAS SETUP
// ============================================================================

function setupShellAlias(): void {
  const aliasLine = `alias pai='bun run ${CLAUDE_DIR}/skills/CORE/Tools/PAI.ts'`;
  const marker = '# PAI alias';
  const rcFileName = IS_ZSH ? '.zshrc' : '.bashrc';

  try {
    let shellRcContent = '';
    if (existsSync(SHELL_RC)) {
      shellRcContent = readFileSync(SHELL_RC, 'utf-8');
    }

    // Check if alias already exists
    if (shellRcContent.includes('alias pai=')) {
      // Update existing alias
      const lines = shellRcContent.split('\n');
      const updated = lines.map(line => {
        if (line.includes('alias pai=')) {
          return `${marker}\n${aliasLine}`;
        }
        return line;
      });
      writeFileSync(SHELL_RC, updated.join('\n'));
      printSuccess(`Updated PAI alias in ${rcFileName}`);
    } else {
      // Add new alias
      const addition = `\n${marker}\n${aliasLine}\n`;
      appendFileSync(SHELL_RC, addition);
      printSuccess(`Added PAI alias to ${rcFileName}`);
    }

    printInfo(`Run "source ~/${rcFileName}" or restart terminal to use "pai" command`);
  } catch (err: any) {
    printWarning(`Could not update ${rcFileName}: ${err.message}`);
    printInfo(`Add manually: ${aliasLine}`);
  }
}

// ============================================================================
// KITTY TERMINAL SETUP
// ============================================================================

function isKittyInstalled(): boolean {
  try {
    execSync('which kitty', { stdio: 'pipe' });
    return true;
  } catch (e) {
    return false;
  }
}

function isHackNerdFontInstalled(): boolean {
  try {
    // Check if Hack Nerd Font is installed via brew or system fonts
    const result = execSync('fc-list | grep -i "Hack Nerd"', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return result.trim().length > 0;
  } catch (e) {
    return false;
  }
}

async function setupKitty(): Promise<boolean> {
  const kittyInstalled = isKittyInstalled();
  const kittyConfigSource = join(PAI_TERMINAL_DIR, 'kitty.conf');
  const backgroundImage = join(PAI_TERMINAL_DIR, 'ul-circuit-embossed-v5.png');

  if (!kittyInstalled) {
    printInfo('Kitty terminal not detected');
    print('');
    print(`${c.dim}Kitty provides dynamic tab states that show AI activity:${c.reset}`);
    print(`${c.dim}  - Purple: AI is thinking${c.reset}`);
    print(`${c.dim}  - Orange: Actively working${c.reset}`);
    print(`${c.dim}  - Teal: Waiting for input${c.reset}`);
    print(`${c.dim}  - Green: Completed${c.reset}`);
    print('');

    if (await confirm('Would you like instructions to install Kitty?', false)) {
      print('');
      print(`${c.cyan}To install Kitty terminal:${c.reset}`);
      print(`  ${c.green}brew install --cask kitty${c.reset}`);
      print(`  ${c.green}brew install --cask font-hack-nerd-font${c.reset}`);
      print('');
      print(`${c.cyan}Then re-run this wizard to configure PAI for Kitty.${c.reset}`);
      print('');
    }
    return false;
  }

  // Kitty is installed - set up config
  printSuccess('Kitty terminal detected');

  if (!existsSync(kittyConfigSource)) {
    printWarning('PAI Kitty configuration not found');
    return false;
  }

  if (await confirm('Set up PAI configuration for Kitty?')) {
    try {
      // Create Kitty config directory
      mkdirSync(KITTY_CONFIG_DIR, { recursive: true });

      // Check if kitty.conf already exists
      const kittyConfigDest = join(KITTY_CONFIG_DIR, 'kitty.conf');
      if (existsSync(kittyConfigDest)) {
        if (!await confirm('Existing kitty.conf found. Overwrite?', false)) {
          printInfo('Keeping existing Kitty configuration');
          return true;
        }
      }

      // Copy kitty.conf
      cpSync(kittyConfigSource, kittyConfigDest);
      printSuccess('Copied PAI Kitty configuration');

      // Copy background image if it exists
      if (existsSync(backgroundImage)) {
        // The kitty.conf references the image from PAI_TERMINAL_DIR, so no copy needed
        // Just verify it's in place
        printSuccess('Background image available');
      }

      // Check for Hack Nerd Font
      if (!isHackNerdFontInstalled()) {
        printWarning('Hack Nerd Font not detected');
        print(`${c.dim}Install with: brew install --cask font-hack-nerd-font${c.reset}`);
      } else {
        printSuccess('Hack Nerd Font detected');
      }

      printInfo('Restart Kitty to apply new configuration');
      return true;
    } catch (err: any) {
      printError(`Could not set up Kitty: ${err.message}`);
      return false;
    }
  }

  return false;
}

// ============================================================================
// BACKUP DETECTION FUNCTIONS
// ============================================================================

interface BackupCredentials {
  path: string;
  elevenLabsKey?: string;
  voiceId?: string;
  daName?: string;
  principalName?: string;
  modifiedTime: Date;
}

function findClaudeBackups(): BackupCredentials[] {
  const backups: BackupCredentials[] = [];

  // Various naming patterns for .claude backups
  const backupPatterns = [
    /^\.claude[-_.]?bak$/i,
    /^\.claude[-_.]?back$/i,
    /^\.claude[-_.]?backup$/i,
    /^\.claude[-_.]?old$/i,
    /^\.claude[-_.]?prev$/i,
    /^\.claude[-_.]?[\d]+$/,  // .claude-20240115 etc
    /^claude[-_.]?backup/i,
    /^claude-backup-/i,       // From BackupRestore.ts
    /^\.claude-BACKUP$/,      // Standard backup location
  ];

  try {
    const entries = readdirSync(HOME, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      // Check if directory name matches any backup pattern
      const isBackup = backupPatterns.some(pattern => pattern.test(entry.name));
      if (!isBackup) continue;

      const backupPath = join(HOME, entry.name);
      const stats = statSync(backupPath);

      // Extract credentials from backup
      const creds: BackupCredentials = {
        path: backupPath,
        modifiedTime: stats.mtime,
      };

      // Check for .env file with ElevenLabs key
      const envPath = join(backupPath, '.env');
      if (existsSync(envPath)) {
        try {
          const envContent = readFileSync(envPath, 'utf-8');

          // Extract ELEVENLABS_API_KEY
          const keyMatch = envContent.match(/ELEVENLABS_API_KEY=(.+)/);
          if (keyMatch && keyMatch[1] && keyMatch[1] !== 'your_api_key_here') {
            creds.elevenLabsKey = keyMatch[1].trim();
          }
        } catch (e) {
          // Ignore read errors
        }
      }

      // Check settings.json for voice ID and names
      const settingsPath = join(backupPath, 'settings.json');
      if (existsSync(settingsPath)) {
        try {
          const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

          if (settings.daidentity?.voiceId) {
            creds.voiceId = settings.daidentity.voiceId;
          }
          if (settings.daidentity?.name) {
            creds.daName = settings.daidentity.name;
          }
          if (settings.principal?.name) {
            creds.principalName = settings.principal.name;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Only add if we found something useful
      if (creds.elevenLabsKey || creds.voiceId || creds.principalName) {
        backups.push(creds);
      }
    }
  } catch (e) {
    // Ignore errors listing home directory
  }

  // Sort by most recently modified first
  return backups.sort((a, b) => b.modifiedTime.getTime() - a.modifiedTime.getTime());
}

function getMostRecentBackupWithCredentials(): BackupCredentials | null {
  const backups = findClaudeBackups();

  // Find the most recent backup with an ElevenLabs key
  const withKey = backups.find(b => b.elevenLabsKey);
  if (withKey) return withKey;

  // Otherwise return most recent with any credentials
  return backups.length > 0 ? backups[0] : null;
}

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

function detectExistingInstallation(): MigrationSource | null {
  // Check for backup first (likely from previous PAI install attempt)
  if (existsSync(BACKUP_DIR)) {
    return scanInstallation(BACKUP_DIR);
  }
  return null;
}

function scanInstallation(path: string): MigrationSource {
  const source: MigrationSource = {
    path,
    hasSettings: existsSync(join(path, 'settings.json')),
    hasUserContent: existsSync(join(path, 'skills', 'CORE', 'USER')),
    hasPersonalSkills: false,
    hasAgents: existsSync(join(path, 'agents')),
    hasMemory: existsSync(join(path, 'MEMORY')),
  };

  // Check for personal skills (_ALLCAPS naming)
  const skillsDir = join(path, 'skills');
  if (existsSync(skillsDir)) {
    try {
      const skills = readdirSync(skillsDir);
      source.hasPersonalSkills = skills.some(s => s.startsWith('_') && s === s.toUpperCase());
    } catch (e) {
      // Ignore
    }
  }

  // Try to detect version
  try {
    const settings = JSON.parse(readFileSync(join(path, 'settings.json'), 'utf-8'));
    source.version = settings.paiVersion;
  } catch (e) {
    // No version detected
  }

  return source;
}

function determineMode(source: MigrationSource | null, args: string[]): InstallMode {
  // CLI overrides
  if (args.includes('--fresh')) return 'fresh';
  if (args.includes('--migrate')) return 'migrate';
  if (args.includes('--update')) return 'update';
  if (args.includes('--merge')) return 'merge';

  // Auto-detect
  if (!source) return 'fresh';
  if (source.hasUserContent || source.hasPersonalSkills) return 'merge';
  if (source.hasSettings) return 'migrate';
  return 'fresh';
}

// ============================================================================
// CONFIGURATION GATHERING
// ============================================================================

async function gatherConfig(existingSettings?: any): Promise<Config> {
  print('');
  print(`${c.bold}Configuration${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);
  print('');

  const config: Config = {
    principal: {
      name: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    daidentity: {
      name: 'PAI',
      fullName: 'PAI - Personal AI Infrastructure',
      voiceId: '',
    },
    apiKeys: {},
  };

  // Check for backup credentials from previous .claude installations
  const backupCreds = getMostRecentBackupWithCredentials();
  if (backupCreds) {
    print('');
    print(`${c.green}Found a previous PAI installation!${c.reset}`);
    print(`${c.dim}  Location: ${backupCreds.path}${c.reset}`);
    print(`${c.dim}  Modified: ${backupCreds.modifiedTime.toLocaleDateString()}${c.reset}`);

    if (backupCreds.principalName) {
      print(`${c.dim}  Your name: ${backupCreds.principalName}${c.reset}`);
    }
    if (backupCreds.daName) {
      print(`${c.dim}  AI name: ${backupCreds.daName}${c.reset}`);
    }
    if (backupCreds.elevenLabsKey) {
      print(`${c.dim}  ElevenLabs API key: ****${backupCreds.elevenLabsKey.slice(-4)}${c.reset}`);
    }
    if (backupCreds.voiceId) {
      print(`${c.dim}  Voice ID: ${backupCreds.voiceId.substring(0, 8)}...${c.reset}`);
    }
    print('');

    if (await confirm('Would you like to use these settings from your previous installation?')) {
      // Use backup credentials
      if (backupCreds.principalName) {
        config.principal.name = backupCreds.principalName;
      }
      if (backupCreds.daName) {
        config.daidentity.name = backupCreds.daName;
        config.daidentity.fullName = `${backupCreds.daName} - Personal AI`;
      }
      if (backupCreds.elevenLabsKey) {
        config.apiKeys.elevenlabs = backupCreds.elevenLabsKey;
      }
      if (backupCreds.voiceId) {
        config.daidentity.voiceId = backupCreds.voiceId;
      }

      printSuccess('Imported settings from backup');
      print('');
    }
  }

  // User name (if not already set from backup)
  if (!config.principal.name) {
    const defaultName = existingSettings?.principal?.name || '';
    config.principal.name = await question('What is your name?', defaultName);
  }

  // Timezone
  const defaultTz = existingSettings?.principal?.timezone || config.principal.timezone;
  config.principal.timezone = await question('Your timezone', defaultTz);

  // AI name (if not already set from backup)
  if (config.daidentity.name === 'PAI') {
    const defaultAiName = existingSettings?.daidentity?.name || 'PAI';
    config.daidentity.name = await question('What would you like to name your AI assistant?', defaultAiName);
    config.daidentity.fullName = `${config.daidentity.name} - Personal AI`;
  }

  // ElevenLabs voice setup (if not already set from backup)
  if (!config.apiKeys.elevenlabs && !config.daidentity.voiceId) {
    print('');
    print(`${c.bold}Voice Setup${c.reset}`);
    print(`${c.dim}PAI can speak to you using ElevenLabs text-to-speech.${c.reset}`);
    print(`${c.dim}This is optional - PAI works great without it too.${c.reset}`);
    print('');

    // Check if they have voice from existing settings (not backup)
    const existingVoiceId = existingSettings?.daidentity?.voiceId || '';
    if (existingVoiceId) {
      printInfo(`Found existing voice ID: ${existingVoiceId.substring(0, 8)}...`);
      if (await confirm('Keep your existing voice configuration?')) {
        config.daidentity.voiceId = existingVoiceId;
        config.apiKeys.elevenlabs = existingSettings?.apiKeys?.elevenlabs || '';
      }
    }

    if (!config.daidentity.voiceId) {
      // Human-friendly voice questions
      if (await confirm('Would you like to set up voice for your AI?', false)) {
        print('');
        print(`${c.cyan}Great! You'll need an ElevenLabs API key.${c.reset}`);
        print(`${c.dim}Get one free at: https://elevenlabs.io${c.reset}`);
        print('');

        config.apiKeys.elevenlabs = await question('Paste your ElevenLabs API key here');

        if (config.apiKeys.elevenlabs) {
          print('');
          print(`${c.cyan}Now for the voice itself.${c.reset}`);
          print(`${c.dim}You can use one of ElevenLabs' built-in voices, or your own custom voice.${c.reset}`);
          print('');

          if (await confirm('Do you have a custom voice already set up in ElevenLabs?', false)) {
            print('');
            print(`${c.dim}You can find your Voice ID in the ElevenLabs dashboard under "Voices"${c.reset}`);
            config.daidentity.voiceId = await question('What is your Voice ID?');
          } else {
            print('');
            print(`${c.dim}No problem! We'll use a default voice. You can change it later in settings.json${c.reset}`);
            // Will use default voice in Step 3
          }
        }
      } else {
        printInfo('No voice setup - PAI will be text-only');
      }
    }
  }

  // Anthropic API key (usually not needed with Claude Code subscription)
  print('');
  print(`${c.dim}Anthropic API key is optional if using Claude Code subscription${c.reset}`);
  const existingAnthropicKey = existingSettings?.apiKeys?.anthropic || '';
  if (existingAnthropicKey) {
    printInfo('Found existing Anthropic API key');
    if (await confirm('Keep existing Anthropic API key?')) {
      config.apiKeys.anthropic = existingAnthropicKey;
    }
  }

  if (!config.apiKeys.anthropic) {
    config.apiKeys.anthropic = await question('Anthropic API key (optional, press Enter to skip)');
  }

  return config;
}

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

async function extractFromSource(source: MigrationSource): Promise<{
  settings: any;
  userContent: string[];
  personalSkills: string[];
  agents: string[];
  memoryState: string[];
}> {
  const result = {
    settings: null as any,
    userContent: [] as string[],
    personalSkills: [] as string[],
    agents: [] as string[],
    memoryState: [] as string[],
  };

  // Extract settings
  if (source.hasSettings) {
    try {
      result.settings = JSON.parse(readFileSync(join(source.path, 'settings.json'), 'utf-8'));
    } catch (e) {
      printWarning('Could not parse existing settings.json');
    }
  }

  // Extract USER content paths
  if (source.hasUserContent) {
    const userDir = join(source.path, 'skills', 'CORE', 'USER');
    result.userContent = listFilesRecursive(userDir).map(f => f.replace(userDir, ''));
  }

  // Extract personal skills
  const skillsDir = join(source.path, 'skills');
  if (existsSync(skillsDir)) {
    const skills = readdirSync(skillsDir);
    result.personalSkills = skills.filter(s => s.startsWith('_') && s === s.toUpperCase());
  }

  // Extract agents
  if (source.hasAgents) {
    const agentsDir = join(source.path, 'agents');
    result.agents = readdirSync(agentsDir);
  }

  // Extract MEMORY/STATE
  const stateDir = join(source.path, 'MEMORY', 'STATE');
  if (existsSync(stateDir)) {
    result.memoryState = listFilesRecursive(stateDir).map(f => f.replace(stateDir, ''));
  }

  return result;
}

function listFilesRecursive(dir: string, files: string[] = []): string[] {
  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      listFilesRecursive(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function performMigration(source: MigrationSource, targetDir: string): Promise<void> {
  print('');
  print(`${c.bold}Migrating from ${source.path}${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);

  const extracted = await extractFromSource(source);

  // Copy USER content
  if (source.hasUserContent) {
    const srcUser = join(source.path, 'skills', 'CORE', 'USER');
    const dstUser = join(targetDir, 'skills', 'CORE', 'USER');

    if (existsSync(srcUser)) {
      mkdirSync(dstUser, { recursive: true });
      cpSync(srcUser, dstUser, { recursive: true });
      printSuccess(`Migrated USER content (${extracted.userContent.length} files)`);
    }
  }

  // Copy personal skills
  for (const skill of extracted.personalSkills) {
    const srcSkill = join(source.path, 'skills', skill);
    const dstSkill = join(targetDir, 'skills', skill);

    if (existsSync(srcSkill)) {
      cpSync(srcSkill, dstSkill, { recursive: true });
      printSuccess(`Migrated personal skill: ${skill}`);
    }
  }

  // Copy agents
  if (source.hasAgents && extracted.agents.length > 0) {
    const srcAgents = join(source.path, 'agents');
    const dstAgents = join(targetDir, 'agents');

    mkdirSync(dstAgents, { recursive: true });
    cpSync(srcAgents, dstAgents, { recursive: true });
    printSuccess(`Migrated agents (${extracted.agents.length} configurations)`);
  }

  // Copy MEMORY/STATE
  if (extracted.memoryState.length > 0) {
    const srcState = join(source.path, 'MEMORY', 'STATE');
    const dstState = join(targetDir, 'MEMORY', 'STATE');

    if (existsSync(srcState)) {
      mkdirSync(dstState, { recursive: true });
      cpSync(srcState, dstState, { recursive: true });
      printSuccess(`Migrated MEMORY/STATE (${extracted.memoryState.length} files)`);
    }
  }
}

// ============================================================================
// INSTALLATION FUNCTIONS
// ============================================================================

function generateSettingsJson(config: Config): string {
  const settings = {
    "$schema": "https://json.schemastore.org/claude-code-settings.json",
    "paiVersion": "2.3",
    "env": {
      "PAI_DIR": CLAUDE_DIR,
      "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "80000",
      "BASH_DEFAULT_TIMEOUT_MS": "600000"
    },
    "daidentity": {
      "name": config.daidentity.name || "PAI",
      "fullName": config.daidentity.fullName || "PAI - Personal AI Infrastructure",
      "displayName": config.daidentity.name || "PAI",
      "color": "#3B82F6",
      "voiceId": config.daidentity.voiceId || DEFAULT_VOICES.male,
      "startupCatchphrase": "PAI here, ready to go."
    },
    "principal": config.principal,
    "pai": {
      "repoUrl": "github.com/danielmiessler/PAI",
    },
    "techStack": {
      "terminal": "Kitty",
      "packageManager": "bun",
      "pythonPackageManager": "uv",
      "language": "TypeScript",
    },
    // PERMISSIONS: Pre-configured for smooth operation
    // Security is maintained via "ask" list for dangerous operations
    "permissions": {
      "allow": [
        "Bash",
        "Read",
        "Write",
        "Edit",
        "MultiEdit",
        "Glob",
        "Grep",
        "LS",
        "WebFetch",
        "WebSearch",
        "NotebookRead",
        "NotebookEdit",
        "TodoWrite",
        "ExitPlanMode",
        "Task",
        "Skill",
        "mcp__*"
      ],
      "deny": [],
      "ask": [
        // Dangerous filesystem operations
        "Bash(rm -rf /)",
        "Bash(rm -rf /:*)",
        "Bash(sudo rm -rf /)",
        "Bash(sudo rm -rf /:*)",
        "Bash(rm -rf ~)",
        "Bash(rm -rf ~:*)",
        "Bash(rm -rf ~/.claude)",
        "Bash(rm -rf ~/.claude:*)",
        // Disk operations
        "Bash(diskutil eraseDisk:*)",
        "Bash(diskutil zeroDisk:*)",
        "Bash(diskutil partitionDisk:*)",
        "Bash(diskutil apfs deleteContainer:*)",
        "Bash(diskutil apfs eraseVolume:*)",
        "Bash(dd if=/dev/zero:*)",
        "Bash(mkfs:*)",
        // GitHub dangerous operations
        "Bash(gh repo delete:*)",
        "Bash(gh repo edit --visibility public:*)",
        "Bash(git push --force:*)",
        "Bash(git push -f:*)",
        "Bash(git push origin --force:*)",
        "Bash(git push origin -f:*)",
        // Sensitive file access
        "Read(~/.ssh/id_*)",
        "Read(~/.ssh/*.pem)",
        "Read(~/.aws/credentials)",
        "Read(~/.gnupg/private*)",
        // PAI settings protection
        "Write(~/.claude/settings.json)",
        "Edit(~/.claude/settings.json)",
        "Write(~/.ssh/*)",
        "Edit(~/.ssh/*)"
      ],
      "defaultMode": "default"
    },
    "enableAllProjectMcpServers": true,
    "enabledMcpjsonServers": [],
    // HOOKS: Full hook configuration for PAI functionality
    "hooks": {
      "PreToolUse": [
        {
          "matcher": "Bash",
          "hooks": [{ "type": "command", "command": "${PAI_DIR}/hooks/SecurityValidator.hook.ts" }]
        },
        {
          "matcher": "Edit",
          "hooks": [{ "type": "command", "command": "${PAI_DIR}/hooks/SecurityValidator.hook.ts" }]
        },
        {
          "matcher": "Write",
          "hooks": [{ "type": "command", "command": "${PAI_DIR}/hooks/SecurityValidator.hook.ts" }]
        },
        {
          "matcher": "Read",
          "hooks": [{ "type": "command", "command": "${PAI_DIR}/hooks/SecurityValidator.hook.ts" }]
        },
        {
          "matcher": "AskUserQuestion",
          "hooks": [{ "type": "command", "command": "${PAI_DIR}/hooks/SetQuestionTab.hook.ts" }]
        }
      ],
      "PostToolUse": [
        {
          "matcher": "AskUserQuestion",
          "hooks": [{ "type": "command", "command": "${PAI_DIR}/hooks/QuestionAnswered.hook.ts" }]
        }
      ],
      "SessionEnd": [
        {
          "hooks": [
            { "type": "command", "command": "${PAI_DIR}/hooks/WorkCompletionLearning.hook.ts" },
            { "type": "command", "command": "${PAI_DIR}/hooks/SessionSummary.hook.ts" }
          ]
        }
      ],
      "UserPromptSubmit": [
        {
          "hooks": [
            { "type": "command", "command": "${PAI_DIR}/hooks/FormatEnforcer.hook.ts" },
            { "type": "command", "command": "${PAI_DIR}/hooks/AutoWorkCreation.hook.ts" },
            { "type": "command", "command": "${PAI_DIR}/hooks/ExplicitRatingCapture.hook.ts" },
            { "type": "command", "command": "${PAI_DIR}/hooks/ImplicitSentimentCapture.hook.ts" },
            { "type": "command", "command": "${PAI_DIR}/hooks/UpdateTabTitle.hook.ts" }
          ]
        }
      ],
      "SessionStart": [
        {
          "hooks": [
            { "type": "command", "command": "${PAI_DIR}/hooks/StartupGreeting.hook.ts" },
            { "type": "command", "command": "${PAI_DIR}/hooks/LoadContext.hook.ts" },
            { "type": "command", "command": "${PAI_DIR}/hooks/CheckVersion.hook.ts" }
          ]
        }
      ],
      "Stop": [
        {
          "hooks": [{ "type": "command", "command": "${PAI_DIR}/hooks/StopOrchestrator.hook.ts" }]
        }
      ],
      "SubagentStop": [
        {
          "hooks": [{ "type": "command", "command": "${PAI_DIR}/hooks/AgentOutputCapture.hook.ts" }]
        }
      ]
    },
    "statusLine": {
      "type": "command",
      "command": "${PAI_DIR}/statusline-command.sh"
    },
    "alwaysThinkingEnabled": true,
    "_docs": {
      "_overview": "SETTINGS.JSON - Central configuration for PAI. Works out of the box. Run install wizard to customize.",
      "_sections": {
        "daidentity": "AI identity (name, voice). Customize via install wizard.",
        "principal": "Your identity. Run 'bun run install.ts' to set your name.",
        "permissions": "Pre-configured for security and usability.",
        "hooks": "Hook configuration for lifecycle events."
      }
    },
    "max_tokens": 4096
  };

  // API keys go in ~/.env, not settings.json
  // Voice ID is stored in daidentity.voiceId above

  return JSON.stringify(settings, null, 2);
}

function generateEnvFile(config: Config): string {
  const lines: string[] = [
    '# PAI Environment Variables',
    '# Generated by install.ts',
    '',
  ];

  if (config.apiKeys.elevenlabs) {
    lines.push(`ELEVENLABS_API_KEY=${config.apiKeys.elevenlabs}`);
  } else {
    lines.push('# ELEVENLABS_API_KEY=your_api_key_here');
  }

  if (config.apiKeys.anthropic) {
    lines.push(`ANTHROPIC_API_KEY=${config.apiKeys.anthropic}`);
  } else {
    lines.push('# ANTHROPIC_API_KEY=your_api_key_here');
  }

  lines.push('');
  return lines.join('\n');
}

function createDirectoryStructure(targetDir: string): void {
  const dirs = [
    'skills/CORE/USER',
    'skills/CORE/SYSTEM',
    'MEMORY/STATE',
    'MEMORY/SIGNALS',
    'MEMORY/CAPTURES',
    'hooks',
    'agents',
    'Plans',
    'WORK/scratch',
    'Commands',
    'tools',
    'bin',
    'lib',
  ];

  for (const dir of dirs) {
    mkdirSync(join(targetDir, dir), { recursive: true });
  }
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

interface ValidationResult {
  passed: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
}

function validateInstallation(targetDir: string): ValidationResult {
  const result: ValidationResult = {
    passed: true,
    checks: [],
  };

  // Check settings.json exists and is valid
  const settingsPath = join(targetDir, 'settings.json');
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      if (settings.principal?.name && settings.daidentity?.name) {
        result.checks.push({
          name: 'settings.json',
          passed: true,
          message: 'Valid configuration found',
        });
      } else {
        result.checks.push({
          name: 'settings.json',
          passed: false,
          message: 'Missing required fields',
        });
        result.passed = false;
      }
    } catch (e) {
      result.checks.push({
        name: 'settings.json',
        passed: false,
        message: 'Invalid JSON',
      });
      result.passed = false;
    }
  } else {
    result.checks.push({
      name: 'settings.json',
      passed: false,
      message: 'File not found',
    });
    result.passed = false;
  }

  // Check required directories
  const requiredDirs = ['skills', 'MEMORY', 'hooks'];
  for (const dir of requiredDirs) {
    const dirPath = join(targetDir, dir);
    if (existsSync(dirPath)) {
      result.checks.push({
        name: `Directory: ${dir}`,
        passed: true,
        message: 'Exists',
      });
    } else {
      result.checks.push({
        name: `Directory: ${dir}`,
        passed: false,
        message: 'Missing',
      });
      result.passed = false;
    }
  }

  // Check CORE skill exists
  const coreSkill = join(targetDir, 'skills', 'CORE', 'SKILL.md');
  if (existsSync(coreSkill)) {
    result.checks.push({
      name: 'CORE skill',
      passed: true,
      message: 'SKILL.md found',
    });
  } else {
    result.checks.push({
      name: 'CORE skill',
      passed: false,
      message: 'SKILL.md not found',
    });
    result.passed = false;
  }

  return result;
}

function printValidationResults(results: ValidationResult): void {
  print('');
  print(`${c.bold}Validation Results${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);

  for (const check of results.checks) {
    if (check.passed) {
      printSuccess(`${check.name}: ${check.message}`);
    } else {
      printError(`${check.name}: ${check.message}`);
    }
  }

  print('');
  if (results.passed) {
    print(`${c.green}${c.bold}✓ Installation validated successfully${c.reset}`);
  } else {
    print(`${c.red}${c.bold}✗ Installation validation failed${c.reset}`);
  }
}

// ============================================================================
// MAIN WIZARD
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  printHeader();

  // Validation only mode
  if (args.includes('--validate')) {
    const results = validateInstallation(CLAUDE_DIR);
    printValidationResults(results);
    process.exit(results.passed ? 0 : 1);
  }

  // ================================================================
  // STEP 0: FIX PERMISSIONS (CRITICAL - MUST BE FIRST)
  // ================================================================
  printStep(0, 8, 'Fixing permissions');
  fixPermissions(CLAUDE_DIR);

  // ================================================================
  // Step 1: Detect environment
  // ================================================================
  printStep(1, 8, 'Detecting environment');

  const source = detectExistingInstallation();
  const mode = determineMode(source, args);

  if (source) {
    printInfo(`Found existing installation at ${source.path}`);
    if (source.hasSettings) printInfo('  - settings.json present');
    if (source.hasUserContent) printInfo('  - USER content present');
    if (source.hasPersonalSkills) printInfo('  - Personal skills present');
    if (source.hasAgents) printInfo('  - Agent configurations present');
    if (source.hasMemory) printInfo('  - MEMORY present');
    if (source.version) printInfo(`  - Version: ${source.version}`);
  } else {
    printInfo('No existing installation detected');
  }

  print('');
  print(`${c.cyan}Installation mode:${c.reset} ${c.bold}${mode.toUpperCase()}${c.reset}`);

  // ================================================================
  // Step 2: Gather configuration
  // ================================================================
  printStep(2, 8, 'Gathering configuration');

  let existingSettings: any = null;
  if (source?.hasSettings) {
    try {
      existingSettings = JSON.parse(readFileSync(join(source.path, 'settings.json'), 'utf-8'));
    } catch (e) {
      // Ignore
    }
  }

  const config = await gatherConfig(existingSettings);

  // ================================================================
  // Step 3: Voice setup
  // ================================================================
  printStep(3, 8, 'Voice setup');
  print('');

  let voiceServerStarted = false;
  let port8888Verified = false;
  let selectedVoiceId = config.daidentity.voiceId || DEFAULT_VOICES.male;

  // Get ElevenLabs API key only if never asked (undefined, not empty string)
  // Empty string means user intentionally skipped the optional prompt in gatherConfig
  if (config.apiKeys.elevenlabs === undefined) {
    print(`${c.dim}Voice requires ElevenLabs API key (elevenlabs.io)${c.reset}`);
    config.apiKeys.elevenlabs = await question('ElevenLabs API key');
  }

  if (config.apiKeys.elevenlabs) {
    // Check for existing voice server on port 8888
    const existingServer = await verifyPort8888();
    if (existingServer.listening) {
      printInfo(`Found existing process on port ${VOICE_SERVER_PORT}`);
      printInfo('Killing existing voice server...');
      killVoiceServers();
      // Wait for port to be released
      await new Promise(resolve => setTimeout(resolve, 500));
      const afterKill = await verifyPort8888();
      if (afterKill.listening) {
        printWarning(`Port ${VOICE_SERVER_PORT} still in use - trying force kill`);
        killVoiceServers();
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        printSuccess(`Port ${VOICE_SERVER_PORT} cleared`);
      }
    } else {
      printInfo(`Port ${VOICE_SERVER_PORT} is available`);
    }

    // Start the voice server
    printInfo('Starting voice server...');
    voiceServerStarted = await startVoiceServer();

    if (voiceServerStarted) {
      // Wait for server to fully initialize
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify port 8888 is now active
      const portCheck = await verifyPort8888();
      port8888Verified = portCheck.listening && portCheck.canConnect;

      if (port8888Verified) {
        printSuccess(`Voice server confirmed on port ${VOICE_SERVER_PORT}`);
      } else if (portCheck.listening) {
        printWarning(`Process on port ${VOICE_SERVER_PORT} but not responding`);
      } else {
        printWarning(`Voice server not detected on port ${VOICE_SERVER_PORT}`);
      }

      // Welcome message with default male voice
      const testWorked = await testVoice(`Welcome to the PAI system. Let's get your Personal AI Infrastructure set up.`);

      if (testWorked) {
        printSuccess('Voice synthesis working!');
        port8888Verified = true;

        // Offer voice options
        print('');
        if (await confirm('Would you like to change the voice?', false)) {
          const voiceChoice = await selectOption(
            'Select voice:',
            ['Male (current)', 'Female', 'Neutral'],
            0
          );

          if (voiceChoice === 1) {
            selectedVoiceId = DEFAULT_VOICES.female;
            await testVoice(`This is the female voice option.`);
          } else if (voiceChoice === 2) {
            selectedVoiceId = DEFAULT_VOICES.neutral;
            await testVoice(`This is the neutral voice option.`);
          }
          printSuccess(`Voice set to ${['male', 'female', 'neutral'][voiceChoice]}`);
        }
      } else {
        printWarning('Voice server started but TTS test failed - check API key');
      }
    } else {
      printWarning('Voice server could not be started');
    }
  } else {
    printInfo('Skipping voice - no API key provided');
    selectedVoiceId = DEFAULT_VOICES.male; // Still set default for later
  }

  // Update config with selected voice
  config.daidentity.voiceId = selectedVoiceId;

  // ================================================================
  // Step 4: Confirm installation
  // ================================================================
  printStep(4, 8, 'Confirming installation');
  print('');
  print(`${c.bold}Installation Summary${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);
  print(`  Mode:        ${mode}`);
  print(`  Target:      ${CLAUDE_DIR}`);
  print(`  User:        ${config.principal.name}`);
  print(`  AI Name:     ${config.daidentity.name}`);
  print(`  Voice:       ${selectedVoiceId ? 'Configured' : 'Not configured'}`);
  if (config.apiKeys.elevenlabs) {
    print(`  Voice Server: ${voiceServerStarted ? 'Running' : 'Not running'}`);
    print(`  Port 8888:   ${port8888Verified ? `${c.green}Verified${c.reset}` : `${c.yellow}Not verified${c.reset}`}`);
  } else {
    print(`  Voice Server: Skipped (no API key)`);
  }
  if (source && (mode === 'migrate' || mode === 'merge')) {
    print(`  Migrating:   ${source.path}`);
  }
  print('');

  if (!await confirm('Proceed with installation?')) {
    print('');
    print(`${c.yellow}Installation cancelled${c.reset}`);
    process.exit(0);
  }

  // ================================================================
  // Step 5: Install
  // ================================================================
  printStep(5, 8, 'Installing PAI');
  print('');

  // Create directory structure
  createDirectoryStructure(CLAUDE_DIR);
  printSuccess('Created directory structure');

  // Write settings.json with FULL permissions and hooks
  const settingsJson = generateSettingsJson(config);
  writeFileSync(join(CLAUDE_DIR, 'settings.json'), settingsJson);
  printSuccess('Created settings.json with full permissions');

  // Write .env file with API keys to home directory (~/.env)
  const envFile = generateEnvFile(config);
  const envPath = join(HOME, '.env');
  writeFileSync(envPath, envFile);
  if (config.apiKeys.elevenlabs || config.apiKeys.anthropic) {
    printSuccess('Created ~/.env with API keys');
  } else {
    printSuccess('Created ~/.env template (add API keys later)');
  }

  // Perform migration if needed
  if (source && (mode === 'migrate' || mode === 'merge')) {
    await performMigration(source, CLAUDE_DIR);
  }

  // Fix permissions again after all writes
  fixPermissions(CLAUDE_DIR);

  // ================================================================
  // Step 6: Setup ZSH alias and terminal
  // ================================================================
  printStep(6, 8, 'Setting up PAI command');
  setupShellAlias();

  // ================================================================
  // Step 7: Kitty terminal setup (optional)
  // ================================================================
  printStep(7, 8, 'Terminal enhancement (optional)');
  print('');
  await setupKitty();

  // ================================================================
  // Step 8: Validate
  // ================================================================
  printStep(8, 8, 'Validating installation');

  const results = validateInstallation(CLAUDE_DIR);
  printValidationResults(results);

  if (results.passed) {
    print('');
    print(`${c.blue}${c.bold}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${c.reset}`);
    print(`${c.blue}${c.bold}┃${c.reset}                                                               ${c.blue}${c.bold}┃${c.reset}`);
    print(`${c.blue}${c.bold}┃${c.reset}   ${c.green}${c.bold}PAI v2.3 installed successfully!${c.reset}                         ${c.blue}${c.bold}┃${c.reset}`);
    print(`${c.blue}${c.bold}┃${c.reset}                                                               ${c.blue}${c.bold}┃${c.reset}`);
    print(`${c.blue}${c.bold}┃${c.reset}   ${c.cyan}Next steps:${c.reset}                                                 ${c.blue}${c.bold}┃${c.reset}`);
    const rcFile = IS_ZSH ? '.zshrc' : '.bashrc';
    print(`${c.blue}${c.bold}┃${c.reset}   1. Run ${c.green}source ~/${rcFile}${c.reset} to enable 'pai' command          ${c.blue}${c.bold}┃${c.reset}`);
    print(`${c.blue}${c.bold}┃${c.reset}   2. Run ${c.green}pai${c.reset} or ${c.green}claude${c.reset} in any directory to start        ${c.blue}${c.bold}┃${c.reset}`);
    print(`${c.blue}${c.bold}┃${c.reset}                                                               ${c.blue}${c.bold}┃${c.reset}`);
    print(`${c.blue}${c.bold}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${c.reset}`);
    print('');

    // Final voice confirmation
    if (voiceServerStarted) {
      await testVoice(`PAI version 2.3 has been installed successfully. Welcome, ${config.principal.name}!`);
    }
  }

  process.exit(results.passed ? 0 : 1);
}

// Run the wizard
main().catch((err) => {
  console.error(`${c.red}Error:${c.reset}`, err.message);
  process.exit(1);
});
