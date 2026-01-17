#!/usr/bin/env bun
/**
 * BackupRestore - Backup and restore PAI installations
 *
 * Commands:
 *   backup [--name <label>]  - Create timestamped backup of ~/.claude
 *   restore <backup-name>    - Restore from backup
 *   list                     - List available backups
 *   migrate <backup>         - Analyze backup for migration candidates
 *
 * Usage:
 *   bun BackupRestore.ts backup
 *   bun BackupRestore.ts backup --name "before-upgrade"
 *   bun BackupRestore.ts list
 *   bun BackupRestore.ts restore claude-backup-20260114-153000
 *   bun BackupRestore.ts migrate claude-backup-20260114-153000
 */

import { existsSync, readdirSync, statSync, readFileSync, cpSync, rmSync } from "fs";
import { homedir } from "os";
import { join, basename } from "path";

const HOME = homedir();
const CLAUDE_DIR = join(HOME, ".claude");
const BACKUP_PREFIX = "claude-backup-";

interface BackupInfo {
  name: string;
  path: string;
  date: Date;
  size: string;
  hasSettings: boolean;
  hasHooks: boolean;
  hasSkills: boolean;
}

interface MigrationCandidate {
  type: "settings" | "hook" | "skill" | "memory";
  path: string;
  description: string;
}

function formatDate(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getDirSize(dirPath: string): number {
  let size = 0;
  try {
    const files = readdirSync(dirPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = join(dirPath, file.name);
      if (file.isDirectory()) {
        size += getDirSize(filePath);
      } else {
        size += statSync(filePath).size;
      }
    }
  } catch {
    // Ignore errors (permission issues, etc.)
  }
  return size;
}

function listBackups(): BackupInfo[] {
  const backups: BackupInfo[] = [];

  try {
    const entries = readdirSync(HOME, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith(BACKUP_PREFIX)) {
        const backupPath = join(HOME, entry.name);
        const stats = statSync(backupPath);
        const size = getDirSize(backupPath);

        backups.push({
          name: entry.name,
          path: backupPath,
          date: stats.mtime,
          size: formatSize(size),
          hasSettings: existsSync(join(backupPath, "settings.json")),
          hasHooks: existsSync(join(backupPath, "hooks")),
          hasSkills: existsSync(join(backupPath, "skills")),
        });
      }
    }
  } catch (error) {
    console.error("Error listing backups:", error);
  }

  return backups.sort((a, b) => b.date.getTime() - a.date.getTime());
}

function createBackup(customName?: string): string | null {
  if (!existsSync(CLAUDE_DIR)) {
    console.error("Error: ~/.claude directory does not exist. Nothing to backup.");
    return null;
  }

  const timestamp = formatDate(new Date()).replace("T", "-");
  const backupName = customName
    ? `${BACKUP_PREFIX}${customName}-${timestamp}`
    : `${BACKUP_PREFIX}${timestamp}`;
  const backupPath = join(HOME, backupName);

  if (existsSync(backupPath)) {
    console.error(`Error: Backup already exists at ${backupPath}`);
    return null;
  }

  console.log(`Creating backup: ${backupName}`);
  console.log(`Source: ${CLAUDE_DIR}`);
  console.log(`Destination: ${backupPath}`);

  try {
    cpSync(CLAUDE_DIR, backupPath, { recursive: true });
    const size = getDirSize(backupPath);
    console.log(`\nBackup complete: ${formatSize(size)}`);
    console.log(`Location: ~/${backupName}`);
    return backupName;
  } catch (error) {
    console.error("Error creating backup:", error);
    return null;
  }
}

function restoreBackup(backupName: string): boolean {
  // Handle both full path and just the name
  const backupPath = backupName.startsWith("/")
    ? backupName
    : join(HOME, backupName.startsWith(BACKUP_PREFIX) ? backupName : `${BACKUP_PREFIX}${backupName}`);

  if (!existsSync(backupPath)) {
    console.error(`Error: Backup not found at ${backupPath}`);
    console.log("\nAvailable backups:");
    const backups = listBackups();
    backups.forEach((b) => console.log(`  - ${b.name}`));
    return false;
  }

  // Backup current before restore
  if (existsSync(CLAUDE_DIR)) {
    const preRestoreBackup = createBackup("pre-restore");
    if (!preRestoreBackup) {
      console.error("Failed to create pre-restore backup. Aborting.");
      return false;
    }
    console.log(`\nCurrent installation backed up to: ${preRestoreBackup}`);

    // Remove current
    console.log("Removing current installation...");
    rmSync(CLAUDE_DIR, { recursive: true, force: true });
  }

  console.log(`\nRestoring from: ${backupPath}`);
  console.log(`Destination: ${CLAUDE_DIR}`);

  try {
    cpSync(backupPath, CLAUDE_DIR, { recursive: true });
    console.log("\nRestore complete!");
    console.log("Restart your DA session for changes to take effect.");
    return true;
  } catch (error) {
    console.error("Error restoring backup:", error);
    return false;
  }
}

function analyzeMigration(backupName: string): MigrationCandidate[] {
  const backupPath = backupName.startsWith("/")
    ? backupName
    : join(HOME, backupName.startsWith(BACKUP_PREFIX) ? backupName : `${BACKUP_PREFIX}${backupName}`);

  if (!existsSync(backupPath)) {
    console.error(`Error: Backup not found at ${backupPath}`);
    return [];
  }

  const candidates: MigrationCandidate[] = [];

  // Check settings.json
  const settingsPath = join(backupPath, "settings.json");
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));

      if (settings.daidentity) {
        candidates.push({
          type: "settings",
          path: "settings.json → daidentity",
          description: `DA Identity: ${settings.daidentity.name || "unnamed"} (${settings.daidentity.fullName || ""})`,
        });
      }

      if (settings.principal) {
        candidates.push({
          type: "settings",
          path: "settings.json → principal",
          description: `Principal: ${settings.principal.name || "unnamed"} (${settings.principal.timezone || ""})`,
        });
      }

      if (settings.hooks) {
        const hookCount = Object.keys(settings.hooks).length;
        candidates.push({
          type: "settings",
          path: "settings.json → hooks",
          description: `${hookCount} hook event(s) configured`,
        });
      }
    } catch {
      console.warn("Warning: Could not parse settings.json");
    }
  }

  // Check for custom hooks
  const hooksDir = join(backupPath, "hooks");
  if (existsSync(hooksDir)) {
    try {
      const hooks = readdirSync(hooksDir).filter((f) => f.endsWith(".hook.ts"));
      for (const hook of hooks) {
        candidates.push({
          type: "hook",
          path: `hooks/${hook}`,
          description: `Custom hook: ${hook.replace(".hook.ts", "")}`,
        });
      }
    } catch {
      // Ignore errors
    }
  }

  // Check for personal skills (_ALLCAPS)
  const skillsDir = join(backupPath, "skills");
  if (existsSync(skillsDir)) {
    try {
      const skills = readdirSync(skillsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && d.name.startsWith("_"))
        .map((d) => d.name);

      for (const skill of skills) {
        candidates.push({
          type: "skill",
          path: `skills/${skill}`,
          description: `Personal skill: ${skill} (private, not shared)`,
        });
      }
    } catch {
      // Ignore errors
    }
  }

  // Check for MEMORY content
  const memoryDir = join(backupPath, "MEMORY");
  if (existsSync(memoryDir)) {
    try {
      const subdirs = readdirSync(memoryDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      if (subdirs.length > 0) {
        candidates.push({
          type: "memory",
          path: "MEMORY/",
          description: `Memory directories: ${subdirs.join(", ")}`,
        });
      }
    } catch {
      // Ignore errors
    }
  }

  return candidates;
}

function printUsage(): void {
  console.log(`
PAI Backup & Restore Tool

Usage:
  bun BackupRestore.ts <command> [options]

Commands:
  backup [--name <label>]  Create timestamped backup of ~/.claude
  restore <backup-name>    Restore from backup (creates pre-restore backup first)
  list                     List available backups
  migrate <backup>         Analyze backup for migration candidates

Examples:
  bun BackupRestore.ts backup
  bun BackupRestore.ts backup --name "before-upgrade"
  bun BackupRestore.ts list
  bun BackupRestore.ts restore claude-backup-20260114-153000
  bun BackupRestore.ts migrate claude-backup-20260114-153000

Notes:
  - Backups are stored in your home directory (~/)
  - Restore always creates a pre-restore backup of current installation
  - Migration analysis shows what can be merged from an old installation
`);
}

// Main CLI
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "backup": {
    let customName: string | undefined;
    const nameIndex = args.indexOf("--name");
    if (nameIndex !== -1 && args[nameIndex + 1]) {
      customName = args[nameIndex + 1];
    }
    createBackup(customName);
    break;
  }

  case "restore": {
    const backupName = args[1];
    if (!backupName) {
      console.error("Error: Please specify a backup name to restore.");
      console.log("\nAvailable backups:");
      const backups = listBackups();
      backups.forEach((b) => console.log(`  - ${b.name}`));
      process.exit(1);
    }
    restoreBackup(backupName);
    break;
  }

  case "list": {
    const backups = listBackups();
    if (backups.length === 0) {
      console.log("No backups found.");
      console.log(`\nBackups are stored in ~/ with prefix "${BACKUP_PREFIX}"`);
    } else {
      console.log("Available backups:\n");
      for (const backup of backups) {
        console.log(`${backup.name}`);
        console.log(`  Date: ${backup.date.toLocaleString()}`);
        console.log(`  Size: ${backup.size}`);
        console.log(`  Contents: ${[
          backup.hasSettings ? "settings" : "",
          backup.hasHooks ? "hooks" : "",
          backup.hasSkills ? "skills" : "",
        ].filter(Boolean).join(", ") || "empty"}`);
        console.log("");
      }
    }
    break;
  }

  case "migrate": {
    const backupName = args[1];
    if (!backupName) {
      console.error("Error: Please specify a backup name to analyze.");
      console.log("\nAvailable backups:");
      const backups = listBackups();
      backups.forEach((b) => console.log(`  - ${b.name}`));
      process.exit(1);
    }

    const candidates = analyzeMigration(backupName);
    if (candidates.length === 0) {
      console.log("No migration candidates found in this backup.");
    } else {
      console.log("Migration candidates:\n");

      const byType = {
        settings: candidates.filter((c) => c.type === "settings"),
        hook: candidates.filter((c) => c.type === "hook"),
        skill: candidates.filter((c) => c.type === "skill"),
        memory: candidates.filter((c) => c.type === "memory"),
      };

      if (byType.settings.length > 0) {
        console.log("Settings (can merge into new settings.json):");
        byType.settings.forEach((c) => console.log(`  - ${c.description}`));
        console.log("");
      }

      if (byType.hook.length > 0) {
        console.log("Custom Hooks (copy to new hooks/ directory):");
        byType.hook.forEach((c) => console.log(`  - ${c.path}`));
        console.log("");
      }

      if (byType.skill.length > 0) {
        console.log("Personal Skills (copy to new skills/ directory):");
        byType.skill.forEach((c) => console.log(`  - ${c.path}`));
        console.log("");
      }

      if (byType.memory.length > 0) {
        console.log("Memory Data (can be preserved):");
        byType.memory.forEach((c) => console.log(`  - ${c.description}`));
        console.log("");
      }

      console.log("To migrate these items, use your DA to selectively copy");
      console.log("the desired files from the backup to your new PAI installation.");
    }
    break;
  }

  default:
    printUsage();
    if (command && command !== "help" && command !== "--help" && command !== "-h") {
      console.error(`\nUnknown command: ${command}`);
      process.exit(1);
    }
}
