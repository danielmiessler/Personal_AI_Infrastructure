#!/usr/bin/env bun
/**
 * PAI Bundle Installation Wizard v1.3.0
 *
 * Simplified interactive CLI wizard for setting up PAI (Personal AI Infrastructure).
 * Auto-detects AI system directories and creates safety backups.
 *
 * Usage:
 *   bun run install.ts           # Fresh install with backup
 *   bun run install.ts --update  # Update existing installation (no backup, preserves config)
 */

import { $ } from "bun";
import * as readline from "readline";
import { existsSync } from "fs";

// =============================================================================
// UPDATE MODE DETECTION
// =============================================================================

const isUpdateMode = process.argv.includes("--update") || process.argv.includes("-u");

// =============================================================================
// TYPES
// =============================================================================

interface AISystem {
  name: string;
  dir: string;
  exists: boolean;
}

interface WizardConfig {
  daName: string;
  timeZone: string;
  userName: string;
  elevenLabsApiKey?: string;
  elevenLabsVoiceId?: string;
}

// =============================================================================
// UTILITIES
// =============================================================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function askWithDefault(question: string, defaultValue: string): Promise<string> {
  const answer = await ask(`${question} [${defaultValue}]: `);
  return answer || defaultValue;
}

function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

async function askYesNo(question: string, defaultYes = true): Promise<boolean> {
  const defaultStr = defaultYes ? "Y/n" : "y/N";
  const answer = await ask(`${question} [${defaultStr}]: `);
  if (!answer) return defaultYes;
  return answer.toLowerCase().startsWith("y");
}

function printHeader(title: string) {
  console.log("\n" + "=".repeat(60));
  console.log(`  ${title}`);
  console.log("=".repeat(60) + "\n");
}

// =============================================================================
// EXISTING CONFIG DETECTION
// =============================================================================

interface ExistingConfig {
  daName?: string;
  timeZone?: string;
  userName?: string;
  elevenLabsApiKey?: string;
  elevenLabsVoiceId?: string;
}

async function readExistingConfig(): Promise<ExistingConfig> {
  const claudeDir = process.env.PAI_DIR || `${process.env.HOME}/.claude`;
  const config: ExistingConfig = {};

  // Try to read from .env file
  try {
    const envPath = `${claudeDir}/.env`;
    if (existsSync(envPath)) {
      const envContent = await Bun.file(envPath).text();
      const lines = envContent.split("\n");
      for (const line of lines) {
        const match = line.match(/^([A-Z_]+)=(.*)$/);
        if (match) {
          const [, key, value] = match;
          switch (key) {
            case "DA":
              config.daName = value;
              break;
            case "TIME_ZONE":
              config.timeZone = value;
              break;
            case "ELEVENLABS_API_KEY":
              config.elevenLabsApiKey = value;
              break;
            case "ELEVENLABS_VOICE_ID":
              config.elevenLabsVoiceId = value;
              break;
          }
        }
      }
    }
  } catch {
    // No .env file, continue with empty config
  }

  // Try to read userName from SKILL.md
  try {
    const skillPath = `${claudeDir}/skills/CORE/SKILL.md`;
    if (existsSync(skillPath)) {
      const skillContent = await Bun.file(skillPath).text();
      const userMatch = skillContent.match(/Role:\s*(\w+)'s AI assistant/);
      if (userMatch) {
        config.userName = userMatch[1];
      }
    }
  } catch {
    // No SKILL.md, continue
  }

  return config;
}

// =============================================================================
// AI SYSTEM DETECTION
// =============================================================================

function detectAISystems(): AISystem[] {
  const home = process.env.HOME;
  const systems: AISystem[] = [
    { name: "Claude Code", dir: `${home}/.claude`, exists: false },
    { name: "Cursor", dir: `${home}/.cursor`, exists: false },
    { name: "Windsurf", dir: `${home}/.windsurf`, exists: false },
    { name: "Cline", dir: `${home}/.cline`, exists: false },
    { name: "Aider", dir: `${home}/.aider`, exists: false },
    { name: "Continue", dir: `${home}/.continue`, exists: false },
  ];

  for (const system of systems) {
    system.exists = existsSync(system.dir);
  }

  return systems;
}

function getDetectedSystems(systems: AISystem[]): AISystem[] {
  return systems.filter((s) => s.exists);
}

// =============================================================================
// BACKUP
// =============================================================================

async function detectAndBackup(): Promise<boolean> {
  const allSystems = detectAISystems();
  const detectedSystems = getDetectedSystems(allSystems);
  const claudeDir = `${process.env.HOME}/.claude`;
  const backupDir = `${process.env.HOME}/.claude-BACKUP`;

  // In update mode, skip backup entirely
  if (isUpdateMode) {
    if (!existsSync(claudeDir)) {
      console.log("❌ Update mode requires an existing installation.");
      console.log("   Run without --update for a fresh install.\n");
      return false;
    }
    console.log("📦 Update mode: Preserving existing configuration.\n");
    console.log("   ✓ Skipping backup (your files stay in place)");
    console.log("   ✓ Will use existing .env values as defaults");
    console.log("   ✓ Only updating infrastructure files\n");

    const proceed = await askYesNo("Proceed with update?", true);
    return proceed;
  }

  console.log("Scanning for existing AI system directories...\n");

  // Show detection results
  if (detectedSystems.length === 0) {
    console.log("  No existing AI system directories detected.");
    console.log("  This will be a fresh installation.\n");
  } else {
    console.log("  Detected AI systems:");
    for (const system of detectedSystems) {
      const isClaude = system.dir === claudeDir;
      const marker = isClaude ? " ← WILL BE BACKED UP" : "";
      console.log(`    • ${system.name}: ${system.dir}${marker}`);
    }
    console.log();
  }

  // Check if ~/.claude exists
  const claudeExists = existsSync(claudeDir);

  if (!claudeExists) {
    console.log("No existing ~/.claude directory found. Fresh install.\n");

    // Still ask for confirmation before proceeding
    const proceed = await askYesNo(
      "Ready to install PAI to ~/.claude. Proceed?",
      true
    );
    if (!proceed) {
      console.log("Installation cancelled.");
      return false;
    }
    return true;
  }

  // ~/.claude exists - explain what will happen
  console.log("┌─────────────────────────────────────────────────────────────┐");
  console.log("│  SAFETY BACKUP                                              │");
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log("│                                                             │");
  console.log("│  The installer will:                                        │");
  console.log("│                                                             │");
  console.log("│  1. Copy your current ~/.claude → ~/.claude-BACKUP          │");
  console.log("│  2. Install fresh PAI files into ~/.claude                  │");
  console.log("│                                                             │");
  console.log("│  Your original files will be preserved in the backup.       │");
  console.log("│                                                             │");
  console.log("└─────────────────────────────────────────────────────────────┘");
  console.log();

  // Check for existing backup
  if (existsSync(backupDir)) {
    console.log(`⚠️  Existing backup found at ${backupDir}`);
    const overwrite = await askYesNo("Overwrite existing backup?", false);
    if (!overwrite) {
      console.log("Please manually remove or rename the existing backup first.");
      return false;
    }
    await $`rm -rf ${backupDir}`;
  }

  // Ask for explicit confirmation
  const proceed = await askYesNo(
    "Do you want to proceed with the backup and installation?",
    true
  );
  if (!proceed) {
    console.log("Installation cancelled.");
    return false;
  }

  console.log(`\nBacking up ~/.claude to ~/.claude-BACKUP...`);
  await $`cp -r ${claudeDir} ${backupDir}`;
  console.log("✓ Backup complete.\n");
  return true;
}

// =============================================================================
// MAIN WIZARD
// =============================================================================

async function gatherConfig(): Promise<WizardConfig> {
  printHeader("PAI BUNDLE SETUP");

  // In update mode, read existing config first
  const existing = isUpdateMode ? await readExistingConfig() : {};

  if (isUpdateMode) {
    console.log("Update mode: Using existing configuration as defaults.\n");
    if (existing.daName) console.log(`  Found DA name: ${existing.daName}`);
    if (existing.userName) console.log(`  Found user: ${existing.userName}`);
    if (existing.timeZone) console.log(`  Found timezone: ${existing.timeZone}`);
    if (existing.elevenLabsApiKey) console.log(`  Found ElevenLabs API key: ****${existing.elevenLabsApiKey.slice(-4)}`);
    console.log();

    // In update mode, just confirm existing values
    const keepExisting = await askYesNo("Keep existing configuration?", true);
    if (keepExisting && existing.daName && existing.userName && existing.timeZone) {
      return {
        daName: existing.daName,
        timeZone: existing.timeZone,
        userName: existing.userName,
        elevenLabsApiKey: existing.elevenLabsApiKey,
        elevenLabsVoiceId: existing.elevenLabsVoiceId,
      };
    }
    console.log("\nLet's update your configuration:\n");
  } else {
    console.log("This wizard will configure your DA.\n");
  }

  // Check for existing PAI_DIR environment variable
  const existingPaiDir = process.env.PAI_DIR;
  if (existingPaiDir && !isUpdateMode) {
    console.log(`📍 Existing PAI_DIR detected: ${existingPaiDir}\n`);
    const useExisting = await askYesNo(
      `Use existing PAI_DIR (${existingPaiDir}) for installation?`,
      true
    );
    if (useExisting) {
      console.log(`\nUsing existing PAI_DIR: ${existingPaiDir}\n`);
    } else {
      console.log("\n⚠️  Installation will use ~/.claude (standard Claude Code location)");
      console.log("   You may need to update your PAI_DIR environment variable after installation.\n");
    }
  } else if (!isUpdateMode) {
    console.log("Installation directory: ~/.claude (standard Claude Code location)\n");
  }

  // Essential questions - use existing values as defaults in update mode
  const userName = existing.userName
    ? await askWithDefault("What is your name?", existing.userName)
    : await ask("What is your name? ");

  const daName = await askWithDefault(
    "What would you like to name your DA?",
    existing.daName || "Kai"
  );

  // Get timezone with validation
  const defaultTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const existingTz = existing.timeZone && isValidTimezone(existing.timeZone) ? existing.timeZone : defaultTz;
  let timeZone = await askWithDefault("What's your timezone?", existingTz);

  while (!isValidTimezone(timeZone)) {
    console.log(`  ⚠️  "${timeZone}" is not a valid IANA timezone.`);
    console.log(`     Examples: America/New_York, Europe/London, Asia/Tokyo`);
    timeZone = await askWithDefault("What's your timezone?", defaultTz);
  }

  // Voice - in update mode, default to yes if already configured
  const defaultWantsVoice = !!existing.elevenLabsApiKey;
  const wantsVoice = await askYesNo(
    "\nDo you want voice notifications? (requires ElevenLabs API key)",
    defaultWantsVoice
  );

  let elevenLabsApiKey: string | undefined;
  let elevenLabsVoiceId: string | undefined;

  if (wantsVoice) {
    if (existing.elevenLabsApiKey) {
      const keepKey = await askYesNo(`Keep existing ElevenLabs API key (****${existing.elevenLabsApiKey.slice(-4)})?`, true);
      elevenLabsApiKey = keepKey ? existing.elevenLabsApiKey : await ask("Enter your ElevenLabs API key: ");
    } else {
      elevenLabsApiKey = await ask("Enter your ElevenLabs API key: ");
    }
    elevenLabsVoiceId = await askWithDefault(
      "Enter your preferred voice ID",
      existing.elevenLabsVoiceId || "s3TPKV1kjDlVtZbl4Ksh"
    );
  }

  return {
    daName,
    timeZone,
    userName,
    elevenLabsApiKey,
    elevenLabsVoiceId,
  };
}

// =============================================================================
// FILE GENERATION
// =============================================================================

function generateSkillMd(config: WizardConfig): string {
  return `---
name: CORE
description: Personal AI Infrastructure core. AUTO-LOADS at session start. USE WHEN any session begins OR user asks about identity, response format, contacts, stack preferences.
---

# CORE - Personal AI Infrastructure

**Auto-loads at session start.** This skill defines your DA's identity, response format, and core operating principles.

## Identity

**Assistant:**
- Name: ${config.daName}
- Role: ${config.userName}'s AI assistant
- Operating Environment: Personal AI infrastructure built on Claude Code

**User:**
- Name: ${config.userName}

---

## First-Person Voice (CRITICAL)

Your DA should speak as itself, not about itself in third person.

**Correct:**
- "for my system" / "in my architecture"
- "I can help" / "my delegation patterns"
- "we built this together"

**Wrong:**
- "for ${config.daName}" / "for the ${config.daName} system"
- "the system can" (when meaning "I can")

---

## Stack Preferences

Default preferences (customize in CoreStack.md):

- **Language:** TypeScript preferred over Python
- **Package Manager:** bun (NEVER npm/yarn/pnpm)
- **Runtime:** Bun
- **Markup:** Markdown (NEVER HTML for basic content)

---

## Response Format (Optional)

Define a consistent response format for task-based responses:

\`\`\`
📋 SUMMARY: [One sentence]
🔍 ANALYSIS: [Key findings]
⚡ ACTIONS: [Steps taken]
✅ RESULTS: [Outcomes]
➡️ NEXT: [Recommended next steps]
\`\`\`

Customize this format in SKILL.md to match your preferences.

---

## Quick Reference

**Full documentation available in context files:**
- Contacts: \`Contacts.md\`
- Stack preferences: \`CoreStack.md\`
- Security protocols: \`SecurityProtocols.md\`
`;
}

function generateContactsMd(config: WizardConfig): string {
  return `# Contact Directory

Quick reference for frequently contacted people.

---

## Contacts

| Name | Role | Email | Notes |
|------|------|-------|-------|
| [Add contacts here] | [Role] | [email] | [Notes] |

---

## Adding Contacts

To add a new contact, edit this file following the table format above.

---

## Usage

When asked about someone:
1. Check this directory first
2. Return the relevant contact information
3. If not found, ask for details
`;
}

function generateCoreStackMd(config: WizardConfig): string {
  return `# Core Stack Preferences

Technical preferences for code generation and tooling.

Generated: ${new Date().toISOString().split("T")[0]}

---

## Language Preferences

| Priority | Language | Use Case |
|----------|----------|----------|
| 1 | TypeScript | Primary for all new code |
| 2 | Python | Data science, ML, when required |

---

## Package Managers

| Language | Manager | Never Use |
|----------|---------|-----------|
| JavaScript/TypeScript | bun | npm, yarn, pnpm |
| Python | uv | pip, pip3 |

---

## Runtime

| Purpose | Tool |
|---------|------|
| JavaScript Runtime | Bun |
| Serverless | Cloudflare Workers |

---

## Markup Preferences

| Format | Use | Never Use |
|--------|-----|-----------|
| Markdown | All content, docs, notes | HTML for basic content |
| YAML | Configuration, frontmatter | - |
| JSON | API responses, data | - |

---

## Code Style

- Prefer explicit over clever
- No unnecessary abstractions
- Comments only where logic isn't self-evident
- Error messages should be actionable
`;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const modeLabel = isUpdateMode ? "UPDATE MODE" : "v1.3.0";
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   ██████╗  █████╗ ██╗    ██████╗ ██╗   ██╗███╗   ██╗██████╗ ██╗   ║
║   ██╔══██╗██╔══██╗██║    ██╔══██╗██║   ██║████╗  ██║██╔══██╗██║   ║
║   ██████╔╝███████║██║    ██████╔╝██║   ██║██╔██╗ ██║██║  ██║██║   ║
║   ██╔═══╝ ██╔══██║██║    ██╔══██╗██║   ██║██║╚██╗██║██║  ██║██║   ║
║   ██║     ██║  ██║██║    ██████╔╝╚██████╔╝██║ ╚████║██████╔╝███████╗
║   ╚═╝     ╚═╝  ╚═╝╚═╝    ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚═════╝ ╚══════╝
║                                                                   ║
║              Personal AI Infrastructure - ${modeLabel.padEnd(12)}         ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
  `);

  try {
    // Step 1: Detect AI systems and create backup
    printHeader("STEP 1: DETECT & BACKUP");
    const backupOk = await detectAndBackup();
    if (!backupOk) {
      console.log("\nInstallation cancelled.");
      process.exit(1);
    }

    // Step 2: Gather configuration
    printHeader("STEP 2: CONFIGURATION");
    const config = await gatherConfig();

    // Step 3: Install
    printHeader("STEP 3: INSTALLATION");

    const claudeDir = `${process.env.HOME}/.claude`;

    // Create directory structure
    console.log("Creating directory structure...");
    await $`mkdir -p ${claudeDir}/skills/CORE/workflows`;
    await $`mkdir -p ${claudeDir}/skills/CORE/tools`;
    await $`mkdir -p ${claudeDir}/history/{sessions,learnings,research,decisions}`;
    await $`mkdir -p ${claudeDir}/hooks/lib`;
    await $`mkdir -p ${claudeDir}/tools`;
    await $`mkdir -p ${claudeDir}/voice`;

    // Generate files
    console.log("Generating SKILL.md...");
    const skillMd = generateSkillMd(config);
    await Bun.write(`${claudeDir}/skills/CORE/SKILL.md`, skillMd);

    console.log("Generating Contacts.md...");
    const contactsMd = generateContactsMd(config);
    await Bun.write(`${claudeDir}/skills/CORE/Contacts.md`, contactsMd);

    console.log("Generating CoreStack.md...");
    const coreStackMd = generateCoreStackMd(config);
    await Bun.write(`${claudeDir}/skills/CORE/CoreStack.md`, coreStackMd);

    // Create .env file (no quotes around values - .env format standard)
    console.log("Creating .env file...");
    const envFileContent = `# PAI Environment Configuration
# Created by PAI Bundle installer - ${new Date().toISOString().split("T")[0]}

DA=${config.daName}
TIME_ZONE=${config.timeZone}
${config.elevenLabsApiKey ? `ELEVENLABS_API_KEY=${config.elevenLabsApiKey}` : "# ELEVENLABS_API_KEY="}
${config.elevenLabsVoiceId ? `ELEVENLABS_VOICE_ID=${config.elevenLabsVoiceId}` : "# ELEVENLABS_VOICE_ID="}
`;
    await Bun.write(`${claudeDir}/.env`, envFileContent);

    // Create settings.json with environment variables for Claude Code
    // This ensures env vars are available immediately without shell sourcing
    console.log("Creating settings.json...");
    const settingsJson: Record<string, unknown> = {
      env: {
        DA: config.daName,
        TIME_ZONE: config.timeZone,
        PAI_DIR: claudeDir,
        PAI_SOURCE_APP: config.daName,
      },
    };
    if (config.elevenLabsApiKey) {
      (settingsJson.env as Record<string, string>).ELEVENLABS_API_KEY = config.elevenLabsApiKey;
    }
    if (config.elevenLabsVoiceId) {
      (settingsJson.env as Record<string, string>).ELEVENLABS_VOICE_ID = config.elevenLabsVoiceId;
    }

    // Check for existing settings.json and merge if present
    const settingsPath = `${claudeDir}/settings.json`;
    let existingSettings: Record<string, unknown> = {};
    try {
      const existingContent = await Bun.file(settingsPath).text();
      existingSettings = JSON.parse(existingContent);
    } catch {
      // No existing settings.json, start fresh
    }

    // Merge env vars (preserve other settings like hooks)
    const mergedSettings = {
      ...existingSettings,
      env: {
        ...(existingSettings.env as Record<string, string> || {}),
        ...(settingsJson.env as Record<string, string>),
      },
    };

    await Bun.write(settingsPath, JSON.stringify(mergedSettings, null, 2) + "\n");
    console.log("✓ Created settings.json with environment variables");

    // Add to shell profile
    console.log("Updating shell profile...");
    const shell = process.env.SHELL || "/bin/zsh";
    const shellProfile = shell.includes("zsh")
      ? `${process.env.HOME}/.zshrc`
      : `${process.env.HOME}/.bashrc`;

    const envExports = `
# PAI Configuration (added by PAI Bundle installer)
export DA="${config.daName}"
export TIME_ZONE="${config.timeZone}"
export PAI_SOURCE_APP="$DA"
${config.elevenLabsApiKey ? `export ELEVENLABS_API_KEY="${config.elevenLabsApiKey}"` : ""}
${config.elevenLabsVoiceId ? `export ELEVENLABS_VOICE_ID="${config.elevenLabsVoiceId}"` : ""}
`;

    const existingProfile = await Bun.file(shellProfile).text().catch(() => "");
    if (!existingProfile.includes("PAI Configuration")) {
      await Bun.write(shellProfile, existingProfile + "\n" + envExports);
      console.log(`Added environment variables to ${shellProfile}`);
    } else {
      console.log(`PAI environment variables already exist in ${shellProfile}`);
    }

    // Source the shell profile to make variables available
    console.log("Sourcing shell profile...");
    try {
      // Export to current process
      process.env.DA = config.daName;
      process.env.TIME_ZONE = config.timeZone;
      process.env.PAI_SOURCE_APP = config.daName;
      if (config.elevenLabsApiKey) process.env.ELEVENLABS_API_KEY = config.elevenLabsApiKey;
      if (config.elevenLabsVoiceId) process.env.ELEVENLABS_VOICE_ID = config.elevenLabsVoiceId;
      console.log("Environment variables set for current session.");
    } catch (e) {
      // Silently continue - environment is exported to file
    }

    // Summary
    printHeader(isUpdateMode ? "UPDATE COMPLETE" : "INSTALLATION COMPLETE");

    if (isUpdateMode) {
      console.log(`
Your PAI system has been updated:

  📁 Installation: ~/.claude
  🤖 Assistant Name: ${config.daName}
  👤 User: ${config.userName}
  🌍 Timezone: ${config.timeZone}
  🔊 Voice: ${config.elevenLabsApiKey ? "Enabled" : "Disabled"}

Files updated:
  - ~/.claude/skills/CORE/SKILL.md
  - ~/.claude/skills/CORE/Contacts.md
  - ~/.claude/skills/CORE/CoreStack.md
  - ~/.claude/.env
  - ~/.claude/settings.json

Next steps:

  1. Re-install any packs that have been updated (check changelog)
  2. Restart Claude Code to activate changes

Your existing hooks, history, and customizations have been preserved.
`);
    } else {
      console.log(`
Your PAI system is configured:

  📁 Installation: ~/.claude
  💾 Backup: ~/.claude-BACKUP
  🤖 Assistant Name: ${config.daName}
  👤 User: ${config.userName}
  🌍 Timezone: ${config.timeZone}
  🔊 Voice: ${config.elevenLabsApiKey ? "Enabled" : "Disabled"}

Files created:
  - ~/.claude/skills/CORE/SKILL.md
  - ~/.claude/skills/CORE/Contacts.md
  - ~/.claude/skills/CORE/CoreStack.md
  - ~/.claude/.env
  - ~/.claude/settings.json (env vars for Claude Code)

Next steps:

  1. Install the packs IN ORDER by giving each pack file to your DA:
     - pai-hook-system.md
     - pai-memory-system.md
     - pai-core-install.md
     - pai-voice-system.md (optional, requires ElevenLabs)

  2. Restart Claude Code to activate hooks

Your backup is at ~/.claude-BACKUP if you need to restore.
`);
    }

  } catch (error) {
    console.error("\n❌ Installation failed:", error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
