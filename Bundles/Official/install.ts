#!/usr/bin/env bun
/**
 * Kai Bundle Installation Wizard v1.3.0
 *
 * Simplified interactive CLI wizard for setting up the Kai bundle.
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
  installDir: string;
  createSymlink: boolean;
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
    const envPath = `${installDir}/.env`;
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
    const skillPath = `${installDir}/skills/CORE/SKILL.md`;
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
      "Ready to install Kai to ~/.claude. Proceed?",
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
  console.log("│  2. Install fresh Kai files into ~/.claude                  │");
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
  printHeader("KAI BUNDLE SETUP");

  // In update mode, read existing config first
  const existing = isUpdateMode ? await readExistingConfig() : {};

  if (isUpdateMode) {
    console.log("Update mode: Using existing configuration as defaults.\n");
    if (existing.daName) console.log(`  Found AI name: ${existing.daName}`);
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
    console.log("This wizard will configure your AI assistant.\n");
  }

  // Check for existing PAI_DIR environment variable
  const defaultDir = `${process.env.HOME}/.claude`;
  const existingPaiDir = process.env.PAI_DIR;
  let installDir = defaultDir;
  let createSymlink = false;

  if (existingPaiDir && !isUpdateMode) {
    console.log(`📍 Existing PAI_DIR detected: ${existingPaiDir}\n`);
    const useExisting = await askYesNo(
      `Use existing PAI_DIR (${existingPaiDir}) for installation?`,
      true
    );
    if (useExisting) {
      installDir = existingPaiDir;
      console.log(`\nUsing existing PAI_DIR: ${existingPaiDir}\n`);

      // If PAI_DIR is not ~/.claude, Claude Code won't find skills natively
      if (existingPaiDir !== defaultDir) {
        console.log("┌─────────────────────────────────────────────────────────────┐");
        console.log("│  CLAUDE CODE SKILL DISCOVERY                                │");
        console.log("├─────────────────────────────────────────────────────────────┤");
        console.log("│                                                             │");
        console.log("│  Claude Code natively scans ~/.claude/skills/ for skills.   │");
        console.log("│  Since you're installing to a different location, skills    │");
        console.log("│  won't be auto-discovered unless we create a symlink.       │");
        console.log("│                                                             │");
        console.log("│  Recommended: Create symlink from ~/.claude/skills to       │");
        console.log(`│               ${existingPaiDir}/skills                       `.slice(0, 61) + "│");
        console.log("│                                                             │");
        console.log("└─────────────────────────────────────────────────────────────┘");
        console.log();

        createSymlink = await askYesNo(
          "Create symlink for Claude Code skill discovery? (Recommended)",
          true
        );
        if (createSymlink) {
          console.log("✓ Will create symlink after installation.\n");
        } else {
          console.log("⚠️  Skills won't be auto-discovered by Claude Code.");
          console.log("   You can manually create the symlink later:\n");
          console.log(`   ln -s ${existingPaiDir}/skills ~/.claude/skills\n`);
        }
      }
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
    "What would you like to name your AI assistant?",
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
    installDir,
    createSymlink,
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

**Auto-loads at session start.** This skill defines your AI's identity, response format, and core operating principles.

## Identity

**Assistant:**
- Name: ${config.daName}
- Role: ${config.userName}'s AI assistant
- Operating Environment: Personal AI infrastructure built on Claude Code

**User:**
- Name: ${config.userName}

---

## First-Person Voice (CRITICAL)

Your AI should speak as itself, not about itself in third person.

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
║   ██╗  ██╗ █████╗ ██╗    ██████╗ ██╗   ██╗███╗   ██╗██████╗ ██╗   ║
║   ██║ ██╔╝██╔══██╗██║    ██╔══██╗██║   ██║████╗  ██║██╔══██╗██║   ║
║   █████╔╝ ███████║██║    ██████╔╝██║   ██║██╔██╗ ██║██║  ██║██║   ║
║   ██╔═██╗ ██╔══██║██║    ██╔══██╗██║   ██║██║╚██╗██║██║  ██║██║   ║
║   ██║  ██╗██║  ██║██║    ██████╔╝╚██████╔╝██║ ╚████║██████╔╝███████╗
║   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝    ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚═════╝ ╚══════╝
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

    const installDir = config.installDir;
    const defaultClaudeDir = `${process.env.HOME}/.claude`;

    // Create directory structure
    console.log(`Creating directory structure in ${installDir}...`);
    await $`mkdir -p ${installDir}/skills/CORE/workflows`;
    await $`mkdir -p ${installDir}/skills/CORE/tools`;
    await $`mkdir -p ${installDir}/history/{sessions,learnings,research,decisions}`;
    await $`mkdir -p ${installDir}/hooks/lib`;
    await $`mkdir -p ${installDir}/tools`;
    await $`mkdir -p ${installDir}/voice`;

    // Generate files
    console.log("Generating SKILL.md...");
    const skillMd = generateSkillMd(config);
    await Bun.write(`${installDir}/skills/CORE/SKILL.md`, skillMd);

    console.log("Generating Contacts.md...");
    const contactsMd = generateContactsMd(config);
    await Bun.write(`${installDir}/skills/CORE/Contacts.md`, contactsMd);

    console.log("Generating CoreStack.md...");
    const coreStackMd = generateCoreStackMd(config);
    await Bun.write(`${installDir}/skills/CORE/CoreStack.md`, coreStackMd);

    // Create .env file (no quotes around values - .env format standard)
    console.log("Creating .env file...");
    const envFileContent = `# PAI Environment Configuration
# Created by Kai Bundle installer - ${new Date().toISOString().split("T")[0]}

DA=${config.daName}
TIME_ZONE=${config.timeZone}
${config.elevenLabsApiKey ? `ELEVENLABS_API_KEY=${config.elevenLabsApiKey}` : "# ELEVENLABS_API_KEY="}
${config.elevenLabsVoiceId ? `ELEVENLABS_VOICE_ID=${config.elevenLabsVoiceId}` : "# ELEVENLABS_VOICE_ID="}
`;
    await Bun.write(`${installDir}/.env`, envFileContent);

    // Create settings.json with environment variables for Claude Code
    // This ensures env vars are available immediately without shell sourcing
    console.log("Creating settings.json...");
    const settingsJson: Record<string, unknown> = {
      env: {
        DA: config.daName,
        TIME_ZONE: config.timeZone,
        PAI_DIR: installDir,
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
    const settingsPath = `${installDir}/settings.json`;
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

    // Create symlink for Claude Code skill discovery if requested
    if (config.createSymlink && installDir !== defaultClaudeDir) {
      console.log("\nCreating symlink for Claude Code skill discovery...");
      const skillsSymlinkTarget = `${installDir}/skills`;
      const skillsSymlinkPath = `${defaultClaudeDir}/skills`;

      // Ensure ~/.claude directory exists
      await $`mkdir -p ${defaultClaudeDir}`;

      // Check if symlink target already exists
      if (existsSync(skillsSymlinkPath)) {
        const stats = await Bun.file(skillsSymlinkPath).exists();
        // Check if it's already a symlink pointing to the right place
        try {
          const linkTarget = await $`readlink ${skillsSymlinkPath}`.text();
          if (linkTarget.trim() === skillsSymlinkTarget) {
            console.log("✓ Symlink already exists and points to correct location");
          } else {
            console.log(`⚠️  ${skillsSymlinkPath} already exists`);
            console.log(`   Current target: ${linkTarget.trim()}`);
            console.log(`   Expected target: ${skillsSymlinkTarget}`);
            console.log("   Please manually update the symlink if needed.");
          }
        } catch {
          // Not a symlink - it's a real directory
          console.log(`⚠️  ${skillsSymlinkPath} exists as a directory, not a symlink`);
          console.log("   To enable skill discovery, manually create the symlink:");
          console.log(`   rm -rf ${skillsSymlinkPath} && ln -s ${skillsSymlinkTarget} ${skillsSymlinkPath}`);
        }
      } else {
        // Create the symlink
        await $`ln -s ${skillsSymlinkTarget} ${skillsSymlinkPath}`;
        console.log(`✓ Created symlink: ${skillsSymlinkPath} → ${skillsSymlinkTarget}`);
      }
    }

    // Add to shell profile
    console.log("Updating shell profile...");
    const shell = process.env.SHELL || "/bin/zsh";
    const shellProfile = shell.includes("zsh")
      ? `${process.env.HOME}/.zshrc`
      : `${process.env.HOME}/.bashrc`;

    const envExports = `
# PAI Configuration (added by Kai Bundle installer)
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
Your Kai system has been updated:

  📁 Installation: ${installDir}
  🤖 Assistant Name: ${config.daName}
  👤 User: ${config.userName}
  🌍 Timezone: ${config.timeZone}
  🔊 Voice: ${config.elevenLabsApiKey ? "Enabled" : "Disabled"}

Files updated:
  - ${installDir}/skills/CORE/SKILL.md
  - ${installDir}/skills/CORE/Contacts.md
  - ${installDir}/skills/CORE/CoreStack.md
  - ${installDir}/.env
  - ${installDir}/settings.json

Next steps:

  1. Re-install any packs that have been updated (check changelog)
  2. Restart Claude Code to activate changes

Your existing hooks, history, and customizations have been preserved.
`);
    } else {
      const symlinkNote = config.createSymlink && installDir !== defaultClaudeDir
        ? `  🔗 Symlink: ${defaultClaudeDir}/skills → ${installDir}/skills\n`
        : "";
      const backupNote = installDir === defaultClaudeDir
        ? `  💾 Backup: ${defaultClaudeDir}-BACKUP\n`
        : "";

      console.log(`
Your Kai system is configured:

  📁 Installation: ${installDir}
${backupNote}${symlinkNote}  🤖 Assistant Name: ${config.daName}
  👤 User: ${config.userName}
  🌍 Timezone: ${config.timeZone}
  🔊 Voice: ${config.elevenLabsApiKey ? "Enabled" : "Disabled"}

Files created:
  - ${installDir}/skills/CORE/SKILL.md
  - ${installDir}/skills/CORE/Contacts.md
  - ${installDir}/skills/CORE/CoreStack.md
  - ${installDir}/.env
  - ${installDir}/settings.json (env vars for Claude Code)

Next steps:

  1. Install the packs IN ORDER by giving each pack file to your AI:
     - kai-hook-system.md
     - kai-history-system.md
     - kai-core-install.md
     - kai-voice-system.md (optional, requires ElevenLabs)

  2. Restart Claude Code to activate hooks
${installDir === defaultClaudeDir ? `
Your backup is at ${defaultClaudeDir}-BACKUP if you need to restore.` : ""}
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
