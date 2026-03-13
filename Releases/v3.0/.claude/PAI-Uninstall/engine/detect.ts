/**
 * PAI Uninstaller — System Detection
 * Scans the filesystem for PAI-installed artifacts.
 */

import {
  existsSync, readFileSync, readdirSync, statSync, readlinkSync,
} from "fs";
import { homedir } from "os";
import { join } from "path";
import { execSync } from "child_process";
import type { UninstallDetection } from "./types";
import { PAI_AGENTS, PAI_HOOKS, PAI_SKILLS, MEMORY_USER_SUBDIRS } from "./constants";

function safeRead(path: string): string {
  try { return readFileSync(path, "utf-8"); } catch { return ""; }
}

function safeReaddir(path: string): string[] {
  try { return readdirSync(path); } catch { return []; }
}

function isSymlink(path: string): boolean {
  try { readlinkSync(path); return true; } catch { return false; }
}

function countAllFiles(dir: string): number {
  let count = 0;
  const walk = (d: string) => {
    let entries: ReturnType<typeof readdirSync>;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.isDirectory()) walk(join(d, entry.name));
      else count++;
    }
  };
  walk(dir);
  return count;
}

export function detectPAI(paiDir: string, configDir: string): UninstallDetection {
  const home = homedir();

  // ── Voice ──────────────────────────────────────────────────────
  const launchAgentPlist = join(home, "Library", "LaunchAgents", "com.pai.voice-server.plist");
  const voiceLog = join(home, "Library", "Logs", "pai-voice-server.log");

  // ── Menubar ────────────────────────────────────────────────────
  const menubarCandidates = [
    join(home, "Library", "Application Support", "SwiftBar", "Plugins", "pai-voice.5s.sh"),
    join(home, "Documents", "BitBarPlugins", "pai-voice.5s.sh"),
    join(home, "BitBar", "pai-voice.5s.sh"),
  ];
  const menubarPlugins = menubarCandidates.filter(p => existsSync(p));

  // ── Shell config ───────────────────────────────────────────────
  const zshrc = join(home, ".zshrc");
  const fishConfig = join(home, ".config", "fish", "config.fish");
  const zshContents = safeRead(zshrc);
  const fishContents = safeRead(fishConfig);
  const hasZshrcAlias = /# (PAI|CORE) alias|alias pai=|function pai/.test(zshContents);
  const hasFishAlias = /PAI alias|function pai/.test(fishContents);

  // ── Symlinks ───────────────────────────────────────────────────
  const homeEnvPath = join(home, ".env");
  let homeEnvSymlinkTarget: string | null = null;
  try {
    const target = readlinkSync(homeEnvPath);
    // Only flag it if it points to PAI's config dir
    if (target.includes("/.config/PAI/.env") || target.includes("/PAI/.env")) {
      homeEnvSymlinkTarget = target;
    }
  } catch { /* not a symlink */ }

  const claudeEnvPath = join(paiDir, ".env");
  const hasClaudeEnvSymlink = existsSync(claudeEnvPath) && isSymlink(claudeEnvPath);

  // ── PAI-exclusive dirs ─────────────────────────────────────────
  const paiExclusiveDirs = ["VoiceServer", "PAI-Install"].filter(d => {
    const full = join(paiDir, d);
    try { return existsSync(full) && statSync(full).isDirectory(); } catch { return false; }
  });

  // ── Git repo ───────────────────────────────────────────────────
  const hasGitRepo = existsSync(join(paiDir, ".git"));
  let gitRemote = "";
  if (hasGitRepo) {
    try {
      gitRemote = execSync(`git -C "${paiDir}" remote get-url origin 2>/dev/null`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
    } catch { gitRemote = ""; }
  }

  // ── Root files ─────────────────────────────────────────────────
  const hasStatuslineCmd = existsSync(join(paiDir, "statusline-command.sh"));
  const installShPath = join(paiDir, "install.sh");
  const hasInstallSh = existsSync(installShPath) && safeRead(installShPath).includes("PAI-Install");

  const claudeMdPath = join(paiDir, "CLAUDE.md");
  let claudeMdStatus: "pai" | "empty" | "user" | "absent" = "absent";
  if (existsSync(claudeMdPath)) {
    const content = safeRead(claudeMdPath);
    if (/SKILL\.md|This file does nothing|read skills\/PAI/.test(content)) {
      claudeMdStatus = "pai";
    } else if (content.trim() === "") {
      claudeMdStatus = "empty";
    } else {
      claudeMdStatus = "user";
    }
  }

  // ── Skills ─────────────────────────────────────────────────────
  const presentSkills = PAI_SKILLS.filter(s => {
    const p = join(paiDir, "skills", s);
    try { return existsSync(p) && statSync(p).isDirectory(); } catch { return false; }
  });

  // ── Agents ─────────────────────────────────────────────────────
  const presentAgents = PAI_AGENTS.filter(a => existsSync(join(paiDir, "agents", a)));

  // ── lib/migration ──────────────────────────────────────────────
  const libMigration = join(paiDir, "lib", "migration");
  const hasLibMigration = (() => {
    try { return existsSync(libMigration) && statSync(libMigration).isDirectory(); } catch { return false; }
  })();

  // ── Settings ───────────────────────────────────────────────────
  const hasSettings = existsSync(join(paiDir, "settings.json"));

  // ── Hooks ──────────────────────────────────────────────────────
  const hooksDir = join(paiDir, "hooks");
  const presentHooks = PAI_HOOKS.filter(h => existsSync(join(hooksDir, h)));
  const hasHookHandlers = existsSync(join(hooksDir, "handlers"));
  const hasHookLib = existsSync(join(hooksDir, "lib"));
  const allHookFiles = safeReaddir(hooksDir).filter(name => {
    try { return statSync(join(hooksDir, name)).isFile(); } catch { return false; }
  });
  const userHookCount = allHookFiles.filter(f => !(PAI_HOOKS as readonly string[]).includes(f)).length;

  // ── Memory ─────────────────────────────────────────────────────
  const memoryDir = join(paiDir, "MEMORY");
  const hasMemory = existsSync(memoryDir);
  const hasMemoryState = existsSync(join(memoryDir, "STATE"));
  const memoryUserSubdirs = MEMORY_USER_SUBDIRS.filter(s => existsSync(join(memoryDir, s)));

  // ── User data ──────────────────────────────────────────────────
  const plansDir = join(paiDir, "plans");
  const tasksDir = join(paiDir, "tasks");
  const teamsDir = join(paiDir, "teams");
  const planCount = existsSync(plansDir) ? countAllFiles(plansDir) : 0;
  const taskCount = existsSync(tasksDir) ? safeReaddir(tasksDir).length : 0;
  const teamCount = existsSync(teamsDir) ? safeReaddir(teamsDir).length : 0;

  // ── Config dir ─────────────────────────────────────────────────
  const hasConfigDir = existsSync(configDir);

  // ── Legacy backups ─────────────────────────────────────────────
  const legacyBackups = [
    join(home, ".claude-backup"),
    join(home, ".claude-old"),
    join(home, ".claude-BACKUP"),
  ].filter(p => existsSync(p));

  return {
    paiDir,
    configDir,
    hasLaunchAgent: existsSync(launchAgentPlist),
    hasVoiceLog: existsSync(voiceLog),
    menubarPlugins,
    hasZshrcAlias,
    hasFishAlias,
    homeEnvSymlinkTarget,
    hasClaudeEnvSymlink,
    paiExclusiveDirs,
    hasGitRepo,
    gitRemote,
    hasStatuslineCmd,
    hasInstallSh,
    claudeMdStatus,
    presentSkills,
    presentAgents,
    hasLibMigration,
    hasSettings,
    presentHooks,
    hasHookHandlers,
    hasHookLib,
    userHookCount,
    hasMemory,
    hasMemoryState,
    memoryUserSubdirs,
    planCount,
    taskCount,
    teamCount,
    hasConfigDir,
    legacyBackups,
  };
}
