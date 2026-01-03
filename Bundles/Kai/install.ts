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
  userEmail: string;
  paiDir: string;
  elevenLabsApiKey?: string;
  elevenLabsVoiceId?: string;
}

// =============================================================================
// INTERACTION LAYER
// =============================================================================

export interface InstallerIO {
  ask(question: string): Promise<string>;
  askWithDefault(question: string, defaultValue: string): Promise<string>;
  askYesNo(question: string, defaultYes?: boolean): Promise<boolean>;
  printHeader(title: string): void;
  log(message?: string): void;
  error(message: string): void;
  exit(code: number): void;
}

class RealInstallerIO implements InstallerIO {
  private rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  ask(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async askWithDefault(question: string, defaultValue: string): Promise<string> {
    const answer = await this.ask(`${question} [${defaultValue}]: `);
    return answer || defaultValue;
  }

  async askYesNo(question: string, defaultYes = true): Promise<boolean> {
    const defaultStr = defaultYes ? "Y/n" : "y/N";
    const answer = await this.ask(`${question} [${defaultStr}]: `);
    if (!answer) return defaultYes;
    return answer.toLowerCase().startsWith("y");
  }

  printHeader(title: string) {
    console.log("\n" + "=".repeat(60));
    console.log(`  ${title}`);
    console.log("=".repeat(60) + "\n");
  }

  log(message: string = "") {
    console.log(message);
  }

  error(message: string) {
    console.error(message);
  }

  exit(code: number) {
    this.rl.close();
    process.exit(code);
  }
  
  close() {
      this.rl.close();
  }
}

// =============================================================================
// UTILITIES
// =============================================================================

function stripQuotes(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
}

// =============================================================================
// EXISTING CONFIG DETECTION
// =============================================================================

interface ExistingConfig {
  daName?: string;
  timeZone?: string;
  userName?: string;
  userEmail?: string;
  paiDir?: string;
  elevenLabsApiKey?: string;
  elevenLabsVoiceId?: string;
}

export async function readExistingConfig(
  envOverrides?: Record<string, string>, 
  mockFs?: (path: string) => Promise<string | null>
): Promise<ExistingConfig> {
  const home = envOverrides?.HOME || process.env.HOME || "";
  const envPaiDir = envOverrides?.PAI_DIR || process.env.PAI_DIR;
  
  // Check PAI_DIR first, then standard PAI location, then legacy Claude location
  const potentialDirs = [
    envPaiDir,
    `${home}/.config/pai`,
    `${home}/.claude`
  ].filter((d): d is string => !!d); // In test mode we might not check existsSync here to allow pure logic testing, or we rely on integration tests. 
  // For strict unit testing without FS, we would need to mock existsSync too. 
  // To keep it simple but testable: we will assume if mockFs is provided, we skip existsSync checks or assume true for paths handled by mockFs.

  const config: ExistingConfig = {};

  for (const dir of potentialDirs) {
      if (!mockFs && !existsSync(dir)) continue;

      // Try to read from .env file
      try {
        const envPath = `${dir}/.env`;
        let envContent: string | null = null;
        
        if (mockFs) {
            envContent = await mockFs(envPath);
        } else if (existsSync(envPath)) {
            envContent = await Bun.file(envPath).text();
        }

        if (envContent) {
          const lines = envContent.split("\n");
          for (const line of lines) {
            const match = line.match(/^([A-Z_]+)=(.*)$/);
            if (match) {
              const [, key, value] = match;
              const cleanValue = stripQuotes(value.trim());
              switch (key) {
                case "DA":
                  if (!config.daName) config.daName = cleanValue;
                  break;
                case "PAI_USER_NAME":
                  if (!config.userName) config.userName = cleanValue;
                  break;
                case "PAI_USER_EMAIL":
                  if (!config.userEmail) config.userEmail = cleanValue;
                  break;
                case "TIME_ZONE":
                  if (!config.timeZone) config.timeZone = cleanValue;
                  break;
                case "ELEVENLABS_API_KEY":
                  if (!config.elevenLabsApiKey) config.elevenLabsApiKey = cleanValue;
                  break;
                case "ELEVENLABS_VOICE_ID":
                  if (!config.elevenLabsVoiceId) config.elevenLabsVoiceId = cleanValue;
                  break;
              }
            }
          }
          config.paiDir = dir;
        }
      } catch {
        // Continue
      }

      // Try to read userName from SKILL.md if not found yet
      try {
        const skillPath = `${dir}/skills/CORE/SKILL.md`;
        let skillContent: string | null = null;
        
        if (mockFs) {
            skillContent = await mockFs(skillPath);
        } else if (existsSync(skillPath)) {
            skillContent = await Bun.file(skillPath).text();
        }

        if (skillContent && !config.userName) {
          const userMatch = skillContent.match(
            /^\s*-\s*Role:\s*([^'\n]+)'s\s+AI\s+assistant/im,
          );
          if (userMatch) {
            config.userName = userMatch[1];
          }
        }
      } catch {
        // Continue
      }
      
      // If we found enough config, we can stop
      if (config.daName && config.userName) break;
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
    { name: "Gemini CLI", dir: `${home}/.gemini`, exists: false },
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

export async function detectAndBackup(targetDir: string, io: InstallerIO, isUpdateMode: boolean): Promise<boolean> {
  const allSystems = detectAISystems();
  const detectedSystems = getDetectedSystems(allSystems);
  const backupDir = `${targetDir}-BACKUP`;

  // In update mode, skip backup entirely
  if (isUpdateMode) {
    if (!existsSync(targetDir)) {
      io.error("❌ Update mode requires an existing installation.");
      io.log(`   Checked: ${targetDir}`);
      io.log("   Run without --update for a fresh install.\n");
      return false;
    }
    io.log("📦 Update mode: Preserving existing configuration.\n");
    io.log("   ✓ Skipping backup (your files stay in place)");
    io.log("   ✓ Will use existing .env values as defaults");
    io.log("   ✓ Only updating infrastructure files\n");

    const proceed = await io.askYesNo("Proceed with update?", true);
    return proceed;
  }

  io.log("Scanning for existing AI system directories...\n");

  // Show detection results
  if (detectedSystems.length === 0) {
    io.log("  No existing AI system directories detected.");
  } else {
    io.log("  Detected AI systems:");
    for (const system of detectedSystems) {
      io.log(`    • ${system.name}: ${system.dir}`);
    }
    io.log();
  }
  
  io.log(`Target Installation Directory: ${targetDir}\n`);

  // Check if target exists
  const targetExists = existsSync(targetDir);

  if (!targetExists) {
    io.log("Target directory does not exist. Fresh install.\n");
    const proceed = await io.askYesNo(
      `Ready to install Kai to ${targetDir}. Proceed?`,
      true
    );
    if (!proceed) {
      io.log("Installation cancelled.");
      return false;
    }
    return true;
  }

  // Target exists - explain what will happen
  io.log("┌─────────────────────────────────────────────────────────────┐");
  io.log("│  SAFETY BACKUP                                              │");
  io.log("├─────────────────────────────────────────────────────────────┤");
  io.log("│                                                             │");
  io.log("│  The installer will:                                        │");
  io.log("│                                                             │");
  io.log(`│  1. Copy your current PAI dir → ${backupDir.replace(process.env.HOME || "", "~").padEnd(23)} │`);
  io.log(`│  2. Install fresh Kai files into ${targetDir.replace(process.env.HOME || "", "~").padEnd(20)}   │`);
  io.log("│                                                             │");
  io.log("│  Your original files will be preserved in the backup.       │");
  io.log("│                                                             │");
  io.log("└─────────────────────────────────────────────────────────────┘");
  io.log();

  // Check for existing backup
  if (existsSync(backupDir)) {
    io.log(`⚠️  Existing backup found at ${backupDir}`);
    const overwrite = await io.askYesNo("Overwrite existing backup?", false);
    if (!overwrite) {
      io.log("Please manually remove or rename the existing backup first.");
      return false;
    }
    await $`rm -rf ${backupDir}`;
  }

  // Ask for explicit confirmation
  const proceed = await io.askYesNo(
    "Do you want to proceed with the backup and installation?",
    true
  );
  if (!proceed) {
    io.log("Installation cancelled.");
    return false;
  }

  io.log(`\nBacking up to ${backupDir}...`);
  await $`cp -r ${targetDir} ${backupDir}`;
  io.log("✓ Backup complete.\n");
  return true;
}

// =============================================================================
// MAIN WIZARD
// =============================================================================

export async function gatherConfig(io: InstallerIO, isUpdateMode: boolean, existingConfigOverrides?: ExistingConfig): Promise<WizardConfig> {
  io.printHeader("KAI BUNDLE SETUP");

  // In update mode, read existing config first
  const existing = isUpdateMode ? (existingConfigOverrides || await readExistingConfig()) : {};

  if (isUpdateMode) {
    io.log("Update mode: Using existing configuration as defaults.\n");
    if (existing.daName) io.log(`  Found AI name: ${existing.daName}`);
    if (existing.userName) io.log(`  Found user: ${existing.userName}`);
    if (existing.timeZone) io.log(`  Found timezone: ${existing.timeZone}`);
    if (existing.elevenLabsApiKey) io.log(`  Found ElevenLabs API key: ****${existing.elevenLabsApiKey.slice(-4)}`);
    io.log();

    // In update mode, just confirm existing values
    const keepExisting = await io.askYesNo("Keep existing configuration?", true);
    if (keepExisting) {
      return {
        daName: existing.daName || "Kai",
        timeZone: existing.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        userName: existing.userName || await io.ask("What is your name? "),
        userEmail: existing.userEmail || await io.ask("What is your email? "),
        paiDir: existing.paiDir || process.env.PAI_DIR || `${process.env.HOME}/.config/pai`,
        elevenLabsApiKey: existing.elevenLabsApiKey,
        elevenLabsVoiceId: existing.elevenLabsVoiceId,
      };
    }
    io.log("\nLet's update your configuration:\n");
  } else {
    io.log("This wizard will configure your AI assistant.\n");
  }

  // Choose installation directory
  let paiDir = process.env.PAI_DIR || `${process.env.HOME}/.config/pai`;
  if (!isUpdateMode) {
    io.log(`Installation directory: ${paiDir.replace(process.env.HOME || "", "~")}\n`);
    const changeDir = await io.askYesNo("Change installation directory?", false);
    if (changeDir) {
      paiDir = await io.ask("Enter installation path: ");
      // Expand ~ if present
      if (paiDir.startsWith("~")) {
        paiDir = paiDir.replace("~", process.env.HOME || "");
      }
    }
  }

  // Essential questions - use existing values as defaults in update mode
  const userName = existing.userName
    ? await io.askWithDefault("What is your name?", existing.userName)
    : await io.ask("What is your name? ");

  const userEmail = existing.userEmail
    ? await io.askWithDefault("What is your email?", existing.userEmail)
    : await io.ask("What is your email? ");

  const daName = await io.askWithDefault(
    "What would you like to name your AI assistant?",
    existing.daName || "Kai"
  );

  const timeZone = await io.askWithDefault(
    "What's your timezone?",
    existing.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  // Voice - in update mode, default to yes if already configured
  const defaultWantsVoice = !!existing.elevenLabsApiKey;
  const wantsVoice = await io.askYesNo(
    "\nDo you want voice notifications? (requires ElevenLabs API key)",
    defaultWantsVoice
  );

  let elevenLabsApiKey: string | undefined;
  let elevenLabsVoiceId: string | undefined;

  if (wantsVoice) {
    if (existing.elevenLabsApiKey) {
      const keepKey = await io.askYesNo(`Keep existing ElevenLabs API key (****${existing.elevenLabsApiKey.slice(-4)})?`, true);
      elevenLabsApiKey = keepKey ? existing.elevenLabsApiKey : await io.ask("Enter your ElevenLabs API key: ");
    } else {
      elevenLabsApiKey = await io.ask("Enter your ElevenLabs API key: ");
    }
    elevenLabsVoiceId = await io.askWithDefault(
      "Enter your preferred voice ID",
      existing.elevenLabsVoiceId || "s3TPKV1kjDlVtZbl4Ksh"
    );
  }

  return {
    daName,
    timeZone,
    userName,
    userEmail,
    paiDir,
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

**Auto-loads at session start.** This skill defines your AI's identity, response format, and core operating principles.

## Identity

**Assistant:**
- Name: ${config.daName}
- Role: ${config.userName}'s AI assistant
- Operating Environment: Personal AI infrastructure built on Claude Code / Gemini CLI

**User:**
- Name: ${config.userName}
- Email: ${config.userEmail}

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

## PAI Tools

You have access to specialized PAI tools in \`\${PAI_DIR}/tools\`.
Run them using Bun: \`bun \${PAI_DIR}/tools/ToolName.ts\`

**Available Tools:**
- \`SkillSearch.ts\`: Search for installed capabilities.
- \`PaiArchitecture.ts\`: Explain the PAI system loops and principles.
- \`GenerateSkillIndex.ts\`: Rebuild the skill discovery index.

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
// TOOL INTEGRATION
// =============================================================================

async function installSymlinks(paiDir: string) {
  const claudeDir = `${process.env.HOME}/.claude`;
  
  // If Claude Code dir exists, we want to integrate with it
  if (existsSync(claudeDir)) {
    console.log("Integrating with Claude Code (~/.claude)...");
    
    // List of directories to symlink
    const linkMap = [
      { src: `${paiDir}/skills`, dest: `${claudeDir}/skills` },
      { src: `${paiDir}/hooks`, dest: `${claudeDir}/hooks` },
      { src: `${paiDir}/history`, dest: `${claudeDir}/history` },
      { src: `${paiDir}/voice`, dest: `${claudeDir}/voice` },
      // Note: tools are not auto-loaded by Claude, so strictly optional
      { src: `${paiDir}/tools`, dest: `${claudeDir}/tools` }, 
    ];

    for (const link of linkMap) {
      try {
        // If destination exists and is a directory/file (not a symlink), we might have a conflict
        // If it's a symlink, we can update it
        if (existsSync(link.dest)) {
          const stats = await Bun.file(link.dest).stat();
          // We can check if it is a symlink via lstat in Node, but Bun.file doesn't expose isSymbolicLink directly easily on .stat() result sometimes
          // Let's rely on standard 'fs'
          const fs = require('fs');
          const lstat = fs.lstatSync(link.dest);
          
          if (lstat.isSymbolicLink()) {
            // Already a symlink, remove and re-link to ensure correctness
            fs.unlinkSync(link.dest);
          } else {
             // It's a real directory. Back it up and force the link.
             const backupDest = `${link.dest}.old`;
             if (existsSync(backupDest)) {
               await $`rm -rf ${backupDest}`;
             }
             await $`mv ${link.dest} ${backupDest}`;
             console.log(`  ✓ Backed up existing directory to ${backupDest}`);
          }
        }
        
        // Create symlink
        const fs = require('fs');
        fs.symlinkSync(link.src, link.dest);
        console.log(`  ✓ Linked ${link.src} → ${link.dest}`);
      } catch (e) {
        console.log(`  ❌ Failed to link ${link.dest}:`, e);
      }
    }
  }
}

// =============================================================================
// MAIN
// =============================================================================

export async function runInstaller(io: InstallerIO) {
  const modeLabel = isUpdateMode ? "UPDATE MODE" : "v1.3.0";
  io.log(`
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
    // Step 1: Gather configuration (including PAI_DIR)
    io.printHeader("STEP 1: CONFIGURATION");
    const config = await gatherConfig(io, isUpdateMode);
    const paiDir = config.paiDir;

    // Step 2: Detect AI systems and create backup
    io.printHeader("STEP 2: DETECT & BACKUP");
    const backupOk = await detectAndBackup(paiDir, io, isUpdateMode);
    if (!backupOk) {
      io.log("\nInstallation cancelled.");
      io.exit(1);
    }

    // Step 3: Install
    io.printHeader("STEP 3: INSTALLATION");

    // Create directory structure
    io.log(`Creating directory structure in ${paiDir}...`);
    await $`mkdir -p ${paiDir}/skills/CORE/workflows`;
    await $`mkdir -p ${paiDir}/skills/CORE/tools`;
    await $`mkdir -p ${paiDir}/history/{sessions,learnings,research,decisions}`;
    await $`mkdir -p ${paiDir}/hooks/lib`;
    await $`mkdir -p ${paiDir}/tools`;
    await $`mkdir -p ${paiDir}/voice`;

    // Generate files
    io.log("Generating SKILL.md...");
    const skillMd = generateSkillMd(config);
    await Bun.write(`${paiDir}/skills/CORE/SKILL.md`, skillMd);

    io.log("Generating Contacts.md...");
    const contactsMd = generateContactsMd(config);
    await Bun.write(`${paiDir}/skills/CORE/Contacts.md`, contactsMd);

    io.log("Generating CoreStack.md...");
    const coreStackMd = generateCoreStackMd(config);
    await Bun.write(`${paiDir}/skills/CORE/CoreStack.md`, coreStackMd);

    // Install gemini-pai adapter
    io.log("Installing gemini-pai adapter...");
    const possiblePaths = ["../../Tools/gemini-pai.ts", "../../../Tools/gemini-pai.ts", "./Tools/gemini-pai.ts"];
    let sourcePath: string | null = null;
    for (const p of possiblePaths) { if (existsSync(p)) { sourcePath = p; break; } }

    if (sourcePath) {
      const destPath = `${paiDir}/tools/gemini-pai.ts`;
      await Bun.write(destPath, await Bun.file(sourcePath).text());
      await $`chmod +x ${destPath}`;
      io.log(`✓ Installed gemini-pai adapter to ${destPath}`);
    } else {
      io.log("⚠️  Could not locate gemini-pai.ts source. Skipping adapter copy.");
    }

    // Create .env file (no quotes around values - .env format standard)
    io.log("Creating .env file...");
    const envFileContent = `# PAI Environment Configuration
# Created by Kai Bundle installer - ${new Date().toISOString().split("T")[0]}

DA=${config.daName}
PAI_USER_NAME=${config.userName}
PAI_USER_EMAIL=${config.userEmail}
TIME_ZONE=${config.timeZone}
${config.elevenLabsApiKey ? `ELEVENLABS_API_KEY=${config.elevenLabsApiKey}` : "# ELEVENLABS_API_KEY="}
${config.elevenLabsVoiceId ? `ELEVENLABS_VOICE_ID=${config.elevenLabsVoiceId}` : "# ELEVENLABS_VOICE_ID="}
`;
    await Bun.write(`${paiDir}/.env`, envFileContent);

    // Setup Claude Code compatibility (settings.json and symlinks)
    const claudeDir = `${process.env.HOME}/.claude`;
    if (existsSync(claudeDir)) {
      io.log("Creating settings.json for Claude Code...");
      const settingsJson: Record<string, unknown> = {
        env: {
          DA: config.daName,
          PAI_USER_NAME: config.userName,
          PAI_USER_EMAIL: config.userEmail,
          TIME_ZONE: config.timeZone,
          PAI_DIR: paiDir, // Explicitly point Claude to PAI_DIR
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
      io.log("✓ Created settings.json with environment variables in ~/.claude");
      
      // Install Symlinks for Claude
      await installSymlinks(paiDir);
    }

    // Add to shell profile
    io.log("Updating shell profile...");
    const shell = process.env.SHELL || "/bin/zsh";
    const shellProfile = shell.includes("zsh") ? `${process.env.HOME}/.zshrc` : `${process.env.HOME}/.bashrc`;

    // SAFETY: Backup shell profile
    if (existsSync(shellProfile)) {
        const backupProfile = `${shellProfile}.bak.${Date.now()}`;
        await $`cp ${shellProfile} ${backupProfile}`;
        io.log(`  ✓ Backed up shell profile to ${backupProfile}`);
    }

    let shellContent = await Bun.file(shellProfile).text().catch(() => "");
    const legacyStart = "# PAI (Personal AI Infrastructure) Configuration";
    const newStart = "# PAI Configuration (added by Kai Bundle installer)";
    const endMarker = "# End PAI Configuration";

    let startIndex = shellContent.indexOf(legacyStart);
    if (startIndex === -1) startIndex = shellContent.indexOf(newStart);

    if (startIndex !== -1) {
      io.log("  Detected existing PAI configuration block. Updating...");
      let endIndex = shellContent.indexOf(endMarker, startIndex);
      let hasEndMarker = true;
      if (endIndex === -1) {
        hasEndMarker = false;
        const nextDoubleNewline = shellContent.indexOf("\n\n", startIndex);
        endIndex = nextDoubleNewline !== -1 ? nextDoubleNewline : shellContent.length;
      }

      const blockContent = shellContent.substring(startIndex, endIndex);
      const lines = blockContent.split("\n");
      const newLines: string[] = [];
      const exportLine = lines.find(l => l.trim().startsWith("export"));
      const indentation = exportLine ? (exportLine.match(/^(\s*)/)?.[1] || "") : "";
      const keysHandled = new Set<string>();

      for (const line of lines) {
        let newLine = line;
        const trimmed = line.trim();
        const updateExport = (key: string, val: string) => {
          if (trimmed.startsWith(`export ${key}=`)) {
            newLine = `${indentation}export ${key}="${val}"`;
            keysHandled.add(key);
          }
        };
        updateExport("DA", config.daName);
        updateExport("TIME_ZONE", config.timeZone);
        updateExport("PAI_DIR", paiDir);
        if (config.elevenLabsApiKey) updateExport("ELEVENLABS_API_KEY", config.elevenLabsApiKey);
        if (config.elevenLabsVoiceId) updateExport("ELEVENLABS_VOICE_ID", config.elevenLabsVoiceId);
        if (trimmed.startsWith("alias gemini-pai=")) {
          newLine = `${indentation}alias gemini-pai="PAI_DIR='${paiDir}' bun ${paiDir}/tools/gemini-pai.ts"`;
          keysHandled.add("gemini-pai");
        }
        if (trimmed.startsWith("export PAI_USER_NAME=")) keysHandled.add("PAI_USER_NAME");
        if (trimmed.startsWith("export PAI_USER_EMAIL=")) keysHandled.add("PAI_USER_EMAIL");
        if (trimmed.startsWith("export PAI_SOURCE_APP=")) keysHandled.add("PAI_SOURCE_APP");
        newLines.push(newLine);
      }
      while (newLines.length > 0 && newLines[newLines.length - 1].trim() === "") newLines.pop();
      const addVar = (key: string, val: string) => { if (!keysHandled.has(key) && val) newLines.push(`${indentation}export ${key}="${val}"`); };
      addVar("PAI_USER_NAME", config.userName);
      addVar("PAI_USER_EMAIL", config.userEmail);
      addVar("PAI_SOURCE_APP", config.daName); 
      if (!keysHandled.has("gemini-pai")) newLines.push(`${indentation}alias gemini-pai="PAI_DIR='${paiDir}' bun ${paiDir}/tools/gemini-pai.ts"`);
      
      let newBlock = newLines.join("\n");
      if (!newBlock.endsWith("\n")) newBlock += "\n";
      newBlock += endMarker;
      const replaceEnd = hasEndMarker ? endIndex + endMarker.length : endIndex;
      shellContent = shellContent.substring(0, startIndex) + newBlock + shellContent.substring(replaceEnd);
    } else {
      io.log("  Creating new PAI configuration block...");
      const newBlock = `\n${legacyStart}\n# Added by Kai Bundle installer on ${new Date().toISOString().split('T')[0]}\nexport PAI_DIR="${paiDir}"\nexport DA="${config.daName}"\nexport PAI_USER_NAME="${config.userName}"\nexport PAI_USER_EMAIL="${config.userEmail}"\nexport TIME_ZONE="${config.timeZone}"\nexport PAI_SOURCE_APP="${config.daName}"\nalias gemini-pai="PAI_DIR='${paiDir}' bun ${paiDir}/tools/gemini-pai.ts"\n${config.elevenLabsApiKey ? `export ELEVENLABS_API_KEY="${config.elevenLabsApiKey}"\n` : ""}${config.elevenLabsVoiceId ? `export ELEVENLABS_VOICE_ID="${config.elevenLabsVoiceId}"\n` : ""}${endMarker}\n`;
      shellContent += newBlock;
    }

    await Bun.write(shellProfile, shellContent);
    io.log(`✓ Updated PAI configuration in ${shellProfile}`);

    // Source the shell profile to make variables available
    io.log("Sourcing shell profile...");
    try {
      // Export to current process
      process.env.DA = config.daName;
      process.env.PAI_USER_NAME = config.userName;
      process.env.PAI_USER_EMAIL = config.userEmail;
      process.env.TIME_ZONE = config.timeZone;
      process.env.PAI_SOURCE_APP = config.daName;
      if (config.elevenLabsApiKey) process.env.ELEVENLABS_API_KEY = config.elevenLabsApiKey;
      if (config.elevenLabsVoiceId) process.env.ELEVENLABS_VOICE_ID = config.elevenLabsVoiceId;
      io.log("Environment variables set for current session.");
    } catch (e) {
      // Silently continue - environment is exported to file
    }

    // Summary
    io.printHeader(isUpdateMode ? "UPDATE COMPLETE" : "INSTALLATION COMPLETE");

    if (isUpdateMode) {
      io.log(`
Your Kai system has been updated:

  📁 Installation: ${paiDir}
  🤖 Assistant Name: ${config.daName}
  👤 User: ${config.userName}
  🌍 Timezone: ${config.timeZone}
  🔊 Voice: ${config.elevenLabsApiKey ? "Enabled" : "Disabled"}

Files updated:
  - ${paiDir}/skills/CORE/SKILL.md
  - ${paiDir}/skills/CORE/Contacts.md
  - ${paiDir}/skills/CORE/CoreStack.md
  - ${paiDir}/.env
  - ${paiDir}/settings.json (if Claude exists)

Next steps:

  1. Re-install any packs that have been updated (check changelog)
  2. Restart Claude Code/Gemini to activate changes

Your existing hooks, history, and customizations have been preserved.
`);
    } else {
      io.log(`
Your Kai system is configured:

  📁 Installation: ${paiDir}
  💾 Backup: ${paiDir}-BACKUP
  🤖 Assistant Name: ${config.daName}
  👤 User: ${config.userName}
  🌍 Timezone: ${config.timeZone}
  🔊 Voice: ${config.elevenLabsApiKey ? "Enabled" : "Disabled"}

Files created:
  - ${paiDir}/skills/CORE/SKILL.md
  - ${paiDir}/skills/CORE/Contacts.md
  - ${paiDir}/skills/CORE/CoreStack.md
  - ${paiDir}/.env
  - ~/.claude/settings.json (if Claude exists)

Next steps:

  1. Install the packs IN ORDER by giving each pack file to your AI:
     - kai-hook-system.md
     - kai-history-system.md
     - kai-core-install.md
     - kai-voice-system.md (optional, requires ElevenLabs)

  2. Restart Claude Code/Gemini to activate hooks

Your backup is at ${paiDir}-BACKUP if you need to restore.
`);
    }

  } catch (error) {
    io.error(`\n❌ Installation failed: ${error}`);
    io.exit(1);
  } finally {
    if (io instanceof RealInstallerIO) {
        io.close();
    }
  }
}

if (import.meta.main) {
  runInstaller(new RealInstallerIO());
}
