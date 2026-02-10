#!/usr/bin/env bun
/**
 * PAI Installation Wizard
 *
 * Interactive setup that walks you through personalizing your PAI:
 * - Sets your name and timezone
 * - Names your AI assistant
 * - Configures voice settings
 * - Fixes permissions and starts services
 *
 * Usage:
 *   bun run INSTALL.ts    # Run the interactive wizard
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir, userInfo } from 'os';
import { execSync, spawn } from 'child_process';
import * as readline from 'readline';

// ANSI colors
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  blue: '\x1b[38;2;59;130;246m',
  green: '\x1b[38;2;34;197;94m',
  yellow: '\x1b[38;2;234;179;8m',
  red: '\x1b[38;2;239;68;68m',
  cyan: '\x1b[38;2;6;182;212m',
  gray: '\x1b[38;2;100;116;139m',
};

// Paths
const HOME = homedir();
const CLAUDE_DIR = join(HOME, '.claude');
const ZSHRC = join(HOME, '.zshrc');
const VOICE_SERVER_DIR = join(CLAUDE_DIR, 'VoiceServer');
const VOICE_SERVER_PORT = 8888;

// Default voice IDs - ElevenLabs pre-made voices (work with any API key)
// Reference: https://elevenlabs-sdk.mintlify.app/voices/premade-voices
const DEFAULT_VOICES = {
  male: 'pNInz6obpgDQGcFmaJgB',      // Adam (male)
  female: '21m00Tcm4TlvDq8ikWAM',    // Rachel (female)
  neutral: 'ErXwobaYiN019PkySvjV',   // Antoni (versatile male)
};

interface InstallConfig {
  PRINCIPAL_NAME: string;
  TIMEZONE?: string;
  AI_NAME?: string;
  CATCHPHRASE?: string;
  VOICE_TYPE?: 'male' | 'female' | 'neutral';
  ELEVENLABS_KEY?: string;
  CUSTOM_VOICE_ID?: string;
  PROJECTS_DIR?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function print(msg: string) { console.log(msg); }
function printSuccess(msg: string) { print(`  ${c.green}✓${c.reset} ${msg}`); }
function printWarning(msg: string) { print(`  ${c.yellow}!${c.reset} ${msg}`); }
function printError(msg: string) { print(`  ${c.red}✗${c.reset} ${msg}`); }
function printInfo(msg: string) { print(`  ${c.gray}→${c.reset} ${msg}`); }

function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function prompt(question: string, defaultValue?: string): Promise<string> {
  const displayDefault = defaultValue ? ` ${c.gray}[${defaultValue}]${c.reset}` : '';
  const rl = createReadline();

  return new Promise((resolve) => {
    rl.question(`  ${question}${displayDefault}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

async function promptChoice(question: string, choices: string[], defaultIdx = 0): Promise<number> {
  print(`  ${question}`);
  choices.forEach((choice, i) => {
    const marker = i === defaultIdx ? `${c.cyan}→${c.reset}` : ' ';
    print(`    ${marker} ${i + 1}. ${choice}`);
  });

  const rl = createReadline();
  return new Promise((resolve) => {
    rl.question(`  ${c.gray}Enter 1-${choices.length} [${defaultIdx + 1}]:${c.reset} `, (answer) => {
      rl.close();
      const num = parseInt(answer.trim()) || (defaultIdx + 1);
      resolve(Math.max(0, Math.min(choices.length - 1, num - 1)));
    });
  });
}

// ============================================================================
// PERMISSIONS (chmod → chown → chmod)
// ============================================================================

function fixPermissions(targetDir: string): void {
  if (process.platform === 'win32') {
    print('');
    print(`${c.bold}Permissions${c.reset}`);
    print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);
    printSuccess('Windows: No permission fixes needed (NTFS handles this)');
    return;
  }

  const info = userInfo();

  print('');
  print(`${c.bold}Fixing permissions for ${info.username}${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);

  try {
    execSync(`chmod -R 755 "${targetDir}"`, { stdio: 'pipe' });
    printSuccess('Step 1: chmod -R 755 (make accessible)');

    execSync(`chown -R ${info.uid}:${info.gid} "${targetDir}"`, { stdio: 'pipe' });
    printSuccess(`Step 2: chown -R to ${info.username}`);

    execSync(`chmod -R 755 "${targetDir}"`, { stdio: 'pipe' });
    printSuccess('Step 3: chmod -R 755 (final permissions)');

    for (const pattern of ['*.ts', '*.sh', '*.hook.ts']) {
      try {
        execSync(`find "${targetDir}" -name "${pattern}" -exec chmod 755 {} \\;`, { stdio: 'pipe' });
      } catch (e) { /* ignore */ }
    }
    printSuccess('Set executable permissions on scripts');

  } catch (err: any) {
    printError(`Permission fix failed: ${err.message}`);
    print(`${c.yellow}Run: sudo chown -R $(whoami) ${targetDir}${c.reset}`);
  }
}

// ============================================================================
// VOICE SERVER MANAGEMENT
// ============================================================================

function findRunningVoiceServers(): number[] {
  try {
    if (process.platform === 'win32') {
      const result = execSync(`netstat -ano | findstr :${VOICE_SERVER_PORT}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      return result.trim().split('\n').map(line => parseInt(line.trim().split(/\s+/).pop() || '')).filter(n => !isNaN(n) && n > 0);
    }
    const result = execSync(`lsof -ti:${VOICE_SERVER_PORT}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return result.trim().split('\n').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
  } catch (e) {
    return [];
  }
}

function killVoiceServers(): void {
  const pids = findRunningVoiceServers();
  if (pids.length > 0) {
    printInfo(`Killing ${pids.length} existing voice server(s)`);
    for (const pid of pids) {
      try {
        const killCmd = process.platform === 'win32' ? `taskkill /F /PID ${pid}` : `kill -9 ${pid}`;
        execSync(killCmd, { stdio: 'pipe' });
        printSuccess(`Killed process ${pid}`);
      } catch (e) { /* ignore */ }
    }
  }
}

async function startVoiceServer(): Promise<boolean> {
  const startScript = join(VOICE_SERVER_DIR, 'start.sh');
  if (!existsSync(startScript)) {
    printWarning('Voice server start script not found');
    return false;
  }

  killVoiceServers();

  try {
    const child = spawn('bash', [startScript], {
      detached: true,
      stdio: 'ignore',
      cwd: VOICE_SERVER_DIR,
    });
    child.unref();

    await new Promise(resolve => setTimeout(resolve, 2000));

    if (findRunningVoiceServers().length > 0) {
      printSuccess('Voice server started');
      return true;
    } else {
      printWarning('Voice server may not have started');
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

// ============================================================================
// BUN INSTALLATION
// ============================================================================

function installBun(): void {
  print('');
  print(`${c.bold}Checking Bun Runtime${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);

  try {
    // Check if bun is installed
    const bunVersion = execSync('bun --version 2>/dev/null', { encoding: 'utf-8' }).trim();
    printSuccess(`Bun ${bunVersion} found`);

    // Upgrade to latest
    printInfo('Upgrading Bun to latest version...');
    try {
      execSync('bun upgrade', { stdio: 'inherit' });
      const newVersion = execSync('bun --version', { encoding: 'utf-8' }).trim();
      printSuccess(`Bun upgraded to ${newVersion}`);
    } catch {
      printWarning('Could not upgrade Bun (may already be latest)');
    }
  } catch {
    // Bun not installed, install it
    printInfo('Bun not found, installing...');
    try {
      if (process.platform === 'win32') {
        execSync('powershell -c "irm bun.sh/install.ps1 | iex"', { stdio: 'inherit' });
      } else {
        execSync('curl -fsSL https://bun.sh/install | bash', {
          stdio: 'inherit',
          shell: '/bin/bash'
        });
      }

      // Source the new bun path
      const bunPath = join(HOME, '.bun/bin');
      process.env.PATH = `${bunPath}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}`;

      const newVersion = execSync('bun --version', { encoding: 'utf-8' }).trim();
      printSuccess(`Bun ${newVersion} installed`);
      printInfo('You may need to restart your terminal for bun to be in PATH');
    } catch (err: any) {
      printError(`Failed to install Bun: ${err.message}`);
      printInfo(process.platform === 'win32'
        ? 'Please install manually: powershell -c "irm bun.sh/install.ps1 | iex"'
        : 'Please install manually: curl -fsSL https://bun.sh/install | bash');
    }
  }
}

// ============================================================================
// ZSH ALIAS
// ============================================================================

function setupZshAlias(): void {
  const aliasLine = `alias pai='bun ~/.claude/skills/PAI/Tools/pai.ts'`;
  const marker = '# PAI alias';

  try {
    let content = existsSync(ZSHRC) ? readFileSync(ZSHRC, 'utf-8') : '';

    if (content.includes('alias pai=')) {
      // Update existing
      content = content.replace(/alias pai=.*/, aliasLine);
      writeFileSync(ZSHRC, content);
      printSuccess('Updated PAI alias in .zshrc');
    } else {
      // Add new
      writeFileSync(ZSHRC, content + `\n${marker}\n${aliasLine}\n`);
      printSuccess('Added PAI alias to .zshrc');
    }
    printInfo('Run "source ~/.zshrc" to enable "pai" command');
  } catch (err: any) {
    printWarning(`Could not update .zshrc: ${err.message}`);
  }
}

// ============================================================================
// SETTINGS.JSON GENERATION
// ============================================================================

function generateSettingsJson(config: InstallConfig): object {
  const AI_NAME = config.AI_NAME || 'PAI';
  const VOICE_ID = config.CUSTOM_VOICE_ID || DEFAULT_VOICES[config.VOICE_TYPE || 'male'];
  const CATCHPHRASE = config.CATCHPHRASE || `${AI_NAME} here, ready to go.`;
  const IS_WINDOWS = process.platform === 'win32';

  // On Windows, Claude Code hooks don't expand ${VAR} shell syntax,
  // and shebangs don't work, so we must hardcode the path and prepend `bun`.
  // On macOS/Linux, ${PAI_DIR} expansion works and shebangs handle execution.
  const hookCmd = (hookName: string) => {
    if (IS_WINDOWS) {
      return `bun "${CLAUDE_DIR}/hooks/${hookName}"`;
    }
    return `\${PAI_DIR}/hooks/${hookName}`;
  };

  const statusLineCmd = IS_WINDOWS
    ? `bun "${CLAUDE_DIR}/statusline-command.sh"`
    : `\${PAI_DIR}/statusline-command.sh`;

  return {
    "$schema": "https://json.schemastore.org/claude-code-settings.json",
    "paiVersion": "2.5",
    "env": {
      "PAI_DIR": CLAUDE_DIR,
      "PROJECTS_DIR": config.PROJECTS_DIR || "",
      "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "80000",
      "BASH_DEFAULT_TIMEOUT_MS": "600000"
    },
    "contextFiles": [
      "skills/PAI/SKILL.md",
      "skills/PAI/SYSTEM/AISTEERINGRULES.md",
      "skills/PAI/USER/AISTEERINGRULES.md",
      "skills/PAI/USER/DAIDENTITY.md"
    ],
    "daidentity": {
      "name": AI_NAME,
      "fullName": `${AI_NAME} - Personal AI`,
      "displayName": AI_NAME,
      "color": "#3B82F6",
      "voiceId": VOICE_ID,
      "voice": {
        "stability": 0.35,
        "similarity_boost": 0.80,
        "style": 0.90,
        "speed": 1.1,
        "use_speaker_boost": true,
        "volume": 0.8
      },
      "startupCatchphrase": CATCHPHRASE
    },
    "principal": {
      "name": config.PRINCIPAL_NAME,
      "timezone": config.TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    "pai": {
      "repoUrl": "github.com/danielmiessler/PAI",
      "version": "2.4"
    },
    "techStack": {
      "browser": IS_WINDOWS ? "edge" : "arc",
      "terminal": IS_WINDOWS ? "Windows Terminal" : "terminal",
      "packageManager": "bun",
      "pythonPackageManager": "pip",
      "language": "TypeScript",
      "devServerPort": 5173
    },
    "permissions": {
      "allow": [
        "Bash", "Read", "Write", "Edit", "MultiEdit", "Glob", "Grep", "LS",
        "WebFetch", "WebSearch", "NotebookRead", "NotebookEdit", "TodoWrite",
        "ExitPlanMode", "Task", "Skill", "mcp__*"
      ],
      "deny": [],
      "ask": [
        "Bash(rm -rf /)", "Bash(rm -rf /:*)", "Bash(sudo rm -rf /)", "Bash(sudo rm -rf /:*)",
        "Bash(rm -rf ~)", "Bash(rm -rf ~:*)", "Bash(rm -rf ~/.claude)", "Bash(rm -rf ~/.claude:*)",
        ...(IS_WINDOWS ? [
          "Bash(del /s /q C:\\:*)", "Bash(rmdir /s /q C:\\:*)",
          "Bash(format:*)"
        ] : [
          "Bash(diskutil eraseDisk:*)", "Bash(diskutil zeroDisk:*)", "Bash(diskutil partitionDisk:*)",
          "Bash(diskutil apfs deleteContainer:*)", "Bash(diskutil apfs eraseVolume:*)",
        ]),
        "Bash(dd if=/dev/zero:*)", "Bash(mkfs:*)", "Bash(gh repo delete:*)",
        "Bash(gh repo edit --visibility public:*)", "Bash(git push --force:*)",
        "Bash(git push -f:*)", "Bash(git push origin --force:*)", "Bash(git push origin -f:*)",
        "Read(~/.ssh/id_*)", "Read(~/.ssh/*.pem)", "Read(~/.aws/credentials)",
        "Read(~/.gnupg/private*)", "Write(~/.claude/settings.json)",
        "Edit(~/.claude/settings.json)", "Write(~/.ssh/*)", "Edit(~/.ssh/*)"
      ],
      "defaultMode": "default"
    },
    "enableAllProjectMcpServers": true,
    "enabledMcpjsonServers": [],
    "hooks": {
      "PreToolUse": [
        { "matcher": "Bash", "hooks": [{ "type": "command", "command": hookCmd("SecurityValidator.hook.ts") }] },
        { "matcher": "Edit", "hooks": [{ "type": "command", "command": hookCmd("SecurityValidator.hook.ts") }] },
        { "matcher": "Write", "hooks": [{ "type": "command", "command": hookCmd("SecurityValidator.hook.ts") }] },
        { "matcher": "Read", "hooks": [{ "type": "command", "command": hookCmd("SecurityValidator.hook.ts") }] },
        { "matcher": "AskUserQuestion", "hooks": [{ "type": "command", "command": hookCmd("SetQuestionTab.hook.ts") }] }
      ],
      "PostToolUse": [
        { "matcher": "AskUserQuestion", "hooks": [{ "type": "command", "command": hookCmd("QuestionAnswered.hook.ts") }] }
      ],
      "SessionEnd": [
        { "hooks": [
          { "type": "command", "command": hookCmd("WorkCompletionLearning.hook.ts") },
          { "type": "command", "command": hookCmd("SessionSummary.hook.ts") }
        ]}
      ],
      "UserPromptSubmit": [
        { "hooks": [
          { "type": "command", "command": hookCmd("FormatReminder.hook.ts") },
          { "type": "command", "command": hookCmd("AutoWorkCreation.hook.ts") },
          { "type": "command", "command": hookCmd("ExplicitRatingCapture.hook.ts") },
          { "type": "command", "command": hookCmd("ImplicitSentimentCapture.hook.ts") },
          { "type": "command", "command": hookCmd("UpdateTabTitle.hook.ts") }
        ]}
      ],
      "SessionStart": [
        { "hooks": [
          { "type": "command", "command": hookCmd("StartupGreeting.hook.ts") },
          { "type": "command", "command": hookCmd("LoadContext.hook.ts") },
          { "type": "command", "command": hookCmd("CheckVersion.hook.ts") }
        ]}
      ],
      "Stop": [{ "hooks": [{ "type": "command", "command": hookCmd("StopOrchestrator.hook.ts") }] }],
      "SubagentStop": [{ "hooks": [{ "type": "command", "command": hookCmd("AgentOutputCapture.hook.ts") }] }]
    },
    "statusLine": { "type": "command", "command": statusLineCmd },
    "alwaysThinkingEnabled": true,
    "_docs": {
      "_overview": "PAI v2.5 settings. Run install wizard to customize.",
      "_sections": {
        "contextFiles": "Files loaded at session start. Defaults load SKILL.md, AI Steering Rules, and DA Identity.",
        "daidentity": "AI identity (name, voice)",
        "principal": "Your identity",
        "permissions": "Tool permissions",
        "hooks": "Lifecycle event hooks"
      }
    },
    "max_tokens": 4096
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

function validate(): { passed: boolean; results: string[] } {
  const results: string[] = [];
  let passed = true;

  // Check settings.json
  const settingsPath = join(CLAUDE_DIR, 'settings.json');
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      if (settings.principal?.name && settings.daidentity?.name) {
        results.push(`${c.green}✓${c.reset} settings.json valid`);
      } else {
        results.push(`${c.red}✗${c.reset} settings.json missing required fields`);
        passed = false;
      }
    } catch (e) {
      results.push(`${c.red}✗${c.reset} settings.json invalid JSON`);
      passed = false;
    }
  } else {
    results.push(`${c.red}✗${c.reset} settings.json not found`);
    passed = false;
  }

  // Check directories
  for (const dir of ['skills', 'MEMORY', 'hooks']) {
    if (existsSync(join(CLAUDE_DIR, dir))) {
      results.push(`${c.green}✓${c.reset} ${dir}/ exists`);
    } else {
      results.push(`${c.red}✗${c.reset} ${dir}/ missing`);
      passed = false;
    }
  }

  // Check PAI skill
  if (existsSync(join(CLAUDE_DIR, 'skills', 'PAI', 'SKILL.md'))) {
    results.push(`${c.green}✓${c.reset} PAI skill found`);
  } else {
    results.push(`${c.red}✗${c.reset} PAI skill missing`);
    passed = false;
  }

  return { passed, results };
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  print('');
  print(`${c.blue}${c.bold}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${c.reset}`);
  print(`${c.blue}${c.bold}┃${c.reset}              ${c.cyan}PAI Installation Wizard${c.reset}                        ${c.blue}${c.bold}┃${c.reset}`);
  print(`${c.blue}${c.bold}┃${c.reset}       ${c.gray}Personal AI Infrastructure v2.5${c.reset}                     ${c.blue}${c.bold}┃${c.reset}`);
  print(`${c.blue}${c.bold}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${c.reset}`);

  // Step 1: Ensure Bun is installed/updated
  installBun();

  // Step 2: Fix permissions so we can write files
  fixPermissions(CLAUDE_DIR);

  // Step 3: Interactive wizard
  print('');
  print(`${c.bold}Welcome to PAI Setup${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);
  print(`  Let's personalize your AI assistant.`);
  print('');

  // Gather configuration
  print(`${c.bold}Your Information${c.reset}`);
  const PRINCIPAL_NAME = await prompt('What is your name?', 'User');
  const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
  printInfo(`Detected timezone: ${TIMEZONE}`);

  print('');
  print(`${c.bold}Projects Directory (optional)${c.reset}`);
  print(`  ${c.gray}If you work with a public PAI repository, set your projects root.${c.reset}`);
  print(`  ${c.gray}Skills can reference \${PROJECTS_DIR}/PAI for the public repo.${c.reset}`);
  const DEFAULT_PROJECTS_DIR = `${HOME}/Projects`;
  const PROJECTS_DIR = await prompt('Projects directory (Enter to skip)', existsSync(DEFAULT_PROJECTS_DIR) ? DEFAULT_PROJECTS_DIR : '');

  print('');
  print(`${c.bold}AI Assistant${c.reset}`);
  const AI_NAME = await prompt('Name your AI assistant', 'PAI');
  const CATCHPHRASE = await prompt('Startup catchphrase', `${AI_NAME} here, ready to go.`);

  print('');
  print(`${c.bold}Voice (optional)${c.reset}`);
  print(`  ${c.gray}Voice requires an ElevenLabs API key. Get one at: https://elevenlabs.io${c.reset}`);
  const ELEVENLABS_KEY = await prompt('ElevenLabs API key (Enter to skip voice)', '');

  let VOICE_TYPE: 'male' | 'female' | 'neutral' = 'male';
  if (ELEVENLABS_KEY) {
    const VOICE_IDX = await promptChoice('Voice type', ['Male (Adam)', 'Female (Rachel)', 'Neutral (Antoni)'], 0);
    const VOICE_TYPES: Array<'male' | 'female' | 'neutral'> = ['male', 'female', 'neutral'];
    VOICE_TYPE = VOICE_TYPES[VOICE_IDX];

    // Write API key to ~/.claude/.env
    const ENV_PATH = join(CLAUDE_DIR, '.env');
    let envContent = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf-8') : '';

    if (envContent.includes('ELEVENLABS_API_KEY=')) {
      // Update existing key
      envContent = envContent.replace(/ELEVENLABS_API_KEY=.*/, `ELEVENLABS_API_KEY=${ELEVENLABS_KEY}`);
    } else {
      // Add new key
      envContent = envContent.trim() + `\nELEVENLABS_API_KEY=${ELEVENLABS_KEY}\n`;
    }
    writeFileSync(ENV_PATH, envContent);
    printSuccess('Saved ElevenLabs API key to ~/.claude/.env');
  } else {
    printInfo('Skipping voice setup (no API key provided)');
  }

  const config: InstallConfig = {
    PRINCIPAL_NAME,
    TIMEZONE,
    AI_NAME,
    CATCHPHRASE,
    VOICE_TYPE,
    ELEVENLABS_KEY,
    PROJECTS_DIR,
  };

  // Step 3: Generate and write settings
  print('');
  print(`${c.bold}Writing Configuration${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);

  const settings = generateSettingsJson(config);
  writeFileSync(join(CLAUDE_DIR, 'settings.json'), JSON.stringify(settings, null, 2));
  printSuccess('Wrote settings.json');

  // Create required directories
  const requiredDirs = [
    'MEMORY',
    'MEMORY/STATE',
    'MEMORY/LEARNING',
    'MEMORY/WORK',
    'Plans',
  ];
  for (const dir of requiredDirs) {
    const dirPath = join(CLAUDE_DIR, dir);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }
  printSuccess('Created MEMORY directories');

  // Start voice server (only if API key was provided)
  print('');
  print(`${c.bold}Voice Server${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);
  if (config.ELEVENLABS_KEY) {
    await startVoiceServer();
  } else {
    printInfo('Voice server skipped (no ElevenLabs API key)');
    printInfo('To enable later: add ELEVENLABS_API_KEY to ~/.claude/.env');
  }

  // Setup alias (skip on Windows — no zsh)
  if (process.platform !== 'win32') {
    setupZshAlias();
  } else {
    printInfo('Windows detected — skipping zsh alias setup');
    printInfo(`To create a PAI alias, add to your PowerShell profile:`);
    printInfo(`  function pai { bun "${CLAUDE_DIR}\\skills\\PAI\\Tools\\pai.ts" @args }`);
  }

  // Fix permissions again
  fixPermissions(CLAUDE_DIR);

  // Validate
  print('');
  const { passed, results } = validate();
  print(`${c.bold}Validation${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);
  for (const r of results) print(`  ${r}`);

  print('');
  if (passed) {
    print(`${c.green}${c.bold}✓ PAI v2.5 installed successfully!${c.reset}`);
    print('');
    print(`  ${c.cyan}Your AI:${c.reset} ${AI_NAME}`);
    print(`  ${c.cyan}Principal:${c.reset} ${PRINCIPAL_NAME}`);
    print('');
    if (process.platform === 'win32') {
      print(`  ${c.cyan}Next:${c.reset} Restart your terminal and run ${c.green}claude${c.reset}`);
    } else {
      print(`  ${c.cyan}Next:${c.reset} Run ${c.green}source ~/.zshrc${c.reset} then ${c.green}pai${c.reset}`);
    }
  } else {
    print(`${c.red}${c.bold}✗ Installation has issues${c.reset}`);
  }

  process.exit(passed ? 0 : 1);
}

main().catch(err => {
  console.error(`${c.red}Error:${c.reset}`, err.message);
  process.exit(1);
});
