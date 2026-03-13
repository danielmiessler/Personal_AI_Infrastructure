/**
 * PAI Uninstaller — Step Action Implementations
 * Each step is an async function following the EngineEventHandler pattern.
 */

import {
  existsSync, mkdirSync, rmSync, unlinkSync, rmdirSync,
  readFileSync, writeFileSync, readdirSync, statSync, cpSync,
} from "fs";
import { homedir } from "os";
import { join } from "path";
import { execSync, spawnSync } from "child_process";
import type { UninstallState, EngineEventHandler, GetConfirm } from "./types";
import {
  PAI_AGENTS, PAI_HOOKS, PAI_SKILLS,
  MEMORY_USER_SUBDIRS, SETTINGS_PAI_KEYS, SETTINGS_PAI_ENV_KEYS,
} from "./constants";
import { detectPAI } from "./detect";

// ─── Helpers ──────────────────────────────────────────────────────

function safeRead(path: string): string {
  try { return readFileSync(path, "utf-8"); } catch { return ""; }
}

function safeReaddir(path: string): string[] {
  try { return readdirSync(path); } catch { return []; }
}

function isEmptyDir(path: string): boolean {
  try { return readdirSync(path).length === 0; } catch { return false; }
}

function removeDir(path: string): void {
  rmSync(path, { recursive: true, force: true });
}

// ─── Step 1: Detect ───────────────────────────────────────────────

export async function runDetect(
  state: UninstallState,
  emit: EngineEventHandler
): Promise<void> {
  await emit({ event: "step_start", step: "detect" });
  await emit({ event: "progress", step: "detect", percent: 30, detail: "Scanning ~/.claude..." });

  state.detection = detectPAI(state.paiDir, state.configDir);

  await emit({ event: "progress", step: "detect", percent: 100, detail: "Detection complete" });
  await emit({ event: "step_complete", step: "detect" });
}

// ─── Step 2: Backup ───────────────────────────────────────────────

export async function runBackup(
  state: UninstallState,
  emit: EngineEventHandler
): Promise<void> {
  await emit({ event: "step_start", step: "backup" });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupDir = join(homedir(), `.pai-uninstall-backup-${timestamp}`);
  mkdirSync(backupDir, { recursive: true });
  state.backupDir = backupDir;

  await emit({ event: "info", message: `Backup directory: ${backupDir}` });

  const paiDir = state.paiDir;

  // Back up mixed-content dirs
  for (const dir of ["MEMORY", "plans", "hooks", "tasks", "teams"]) {
    const src = join(paiDir, dir);
    if (existsSync(src)) {
      cpSync(src, join(backupDir, dir), { recursive: true });
      await emit({ event: "backed_up", path: `~/.claude/${dir}/` });
    }
  }

  // Back up settings.json
  const settingsPath = join(paiDir, "settings.json");
  if (existsSync(settingsPath)) {
    cpSync(settingsPath, join(backupDir, "settings.json"));
    await emit({ event: "backed_up", path: "~/.claude/settings.json" });
  }

  // Back up ~/.config/PAI
  const configDir = state.configDir;
  if (existsSync(configDir)) {
    cpSync(configDir, join(backupDir, "config-PAI"), { recursive: true });
    await emit({ event: "backed_up", path: "~/.config/PAI/" });
  }

  await emit({ event: "step_complete", step: "backup" });
}

// ─── Step 3: Voice Server ─────────────────────────────────────────

export async function runVoiceServer(
  state: UninstallState,
  emit: EngineEventHandler
): Promise<void> {
  await emit({ event: "step_start", step: "voice-server" });

  const home = homedir();
  const plist = join(home, "Library", "LaunchAgents", "com.pai.voice-server.plist");
  const log = join(home, "Library", "Logs", "pai-voice-server.log");

  if (process.platform === "darwin") {
    // Stop the service if running
    try {
      const list = execSync("launchctl list 2>/dev/null", {
        encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
      });
      if (list.includes("com.pai.voice-server")) {
        spawnSync("launchctl", ["unload", plist], { stdio: "pipe" });
        await emit({ event: "info", message: "Voice server stopped" });
      } else {
        await emit({ event: "skipped_item", reason: "Voice server (not running)" });
      }
    } catch { /* launchctl not available */ }

    // Kill anything still on port 8888
    try {
      const pids = execSync("lsof -ti:8888 -sTCP:LISTEN 2>/dev/null", {
        encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      if (pids) {
        for (const pid of pids.split("\n").filter(Boolean)) {
          spawnSync("kill", ["-9", pid.trim()], { stdio: "pipe" });
        }
        await emit({ event: "info", message: "Port 8888 cleared" });
      }
    } catch { /* no process on 8888 */ }
  }

  // Remove LaunchAgent plist
  if (existsSync(plist)) {
    unlinkSync(plist);
    await emit({ event: "removed", path: "~/Library/LaunchAgents/com.pai.voice-server.plist" });
  } else {
    await emit({ event: "skipped_item", reason: "LaunchAgent plist" });
  }

  // Remove log file
  if (existsSync(log)) {
    unlinkSync(log);
    await emit({ event: "removed", path: "~/Library/Logs/pai-voice-server.log" });
  } else {
    await emit({ event: "skipped_item", reason: "Voice server log" });
  }

  await emit({ event: "step_complete", step: "voice-server" });
}

// ─── Step 4: Menu Bar Plugins ─────────────────────────────────────

export async function runMenubar(
  state: UninstallState,
  emit: EngineEventHandler
): Promise<void> {
  await emit({ event: "step_start", step: "menubar" });

  const det = state.detection!;
  let anyRemoved = false;

  for (const plugin of det.menubarPlugins) {
    if (existsSync(plugin)) {
      unlinkSync(plugin);
      await emit({ event: "removed", path: plugin });
      anyRemoved = true;
    }
  }

  if (!anyRemoved) {
    await emit({ event: "skipped_item", reason: "No PAI menu bar plugins found" });
  }

  // Refresh SwiftBar if running (macOS only)
  if (anyRemoved && process.platform === "darwin") {
    try {
      const result = spawnSync("pgrep", ["-x", "SwiftBar"], { encoding: "utf-8" });
      if (result.status === 0) {
        spawnSync("open", ["-g", "swiftbar://refreshall"], { stdio: "pipe" });
      }
    } catch { /* non-fatal */ }
  }

  await emit({ event: "step_complete", step: "menubar" });
}

// ─── Step 5: Shell Configuration ─────────────────────────────────

/**
 * Remove PAI alias/function from .zshrc.
 * Handles: `# PAI alias`, `# CORE alias`, `alias pai=...`, `function pai ... end`
 * Also collapses blank lines around removed content.
 */
function stripZshrcPaiAlias(content: string): string {
  const lines = content.split("\n");
  const result: string[] = [];
  let blank = "";
  let inFn = false;

  for (const line of lines) {
    if (inFn) {
      if (/^end$/.test(line)) inFn = false;
      continue; // skip function body and closing `end`
    }
    if (/^\s*$/.test(line)) {
      blank = line;
      continue;
    }
    if (/^# (PAI|CORE) alias$/.test(line)) {
      blank = "";
      continue;
    }
    if (/^alias pai=/.test(line)) {
      blank = "";
      continue;
    }
    if (/^function pai$/.test(line)) {
      inFn = true;
      blank = "";
      continue;
    }
    // Normal line — flush any buffered blank line first
    if (blank !== "") { result.push(blank); blank = ""; }
    result.push(line);
  }

  return result.join("\n");
}

/**
 * Remove PAI function from fish config.
 * Handles: `# PAI alias`, `function pai ... end` block
 */
function stripFishPaiFunction(content: string): string {
  const lines = content.split("\n");
  const result: string[] = [];
  let skip = 0;

  for (const line of lines) {
    if (/^# PAI alias$/.test(line)) { skip = 1; continue; }
    if (skip === 1 && /^function pai$/.test(line)) { skip = 2; continue; }
    if (skip === 2 && /^end$/.test(line)) { skip = 0; continue; }
    if (skip === 2) continue;
    skip = 0;
    result.push(line);
  }

  return result.join("\n");
}

export async function runShellConfig(
  state: UninstallState,
  emit: EngineEventHandler
): Promise<void> {
  await emit({ event: "step_start", step: "shell-config" });

  const home = homedir();
  const zshrc = join(home, ".zshrc");
  const fishConfig = join(home, ".config", "fish", "config.fish");

  // .zshrc
  if (existsSync(zshrc)) {
    const original = safeRead(zshrc);
    if (/# (PAI|CORE) alias|alias pai=|function pai/.test(original)) {
      const cleaned = stripZshrcPaiAlias(original);
      writeFileSync(zshrc, cleaned, "utf-8");
      await emit({ event: "removed", path: "PAI alias from ~/.zshrc" });
    } else {
      await emit({ event: "skipped_item", reason: "PAI alias in ~/.zshrc" });
    }
  } else {
    await emit({ event: "skipped_item", reason: "~/.zshrc" });
  }

  // fish config
  if (existsSync(fishConfig)) {
    const original = safeRead(fishConfig);
    if (/PAI alias|function pai/.test(original)) {
      const cleaned = stripFishPaiFunction(original);
      writeFileSync(fishConfig, cleaned, "utf-8");
      await emit({ event: "removed", path: "PAI function from ~/.config/fish/config.fish" });
    } else {
      await emit({ event: "skipped_item", reason: "PAI function in fish config" });
    }
  } else {
    await emit({ event: "skipped_item", reason: "~/.config/fish/config.fish" });
  }

  await emit({ event: "step_complete", step: "shell-config" });
}

// ─── Step 6: Symlinks ─────────────────────────────────────────────

export async function runSymlinks(
  state: UninstallState,
  emit: EngineEventHandler
): Promise<void> {
  await emit({ event: "step_start", step: "symlinks" });

  const home = homedir();
  const homeEnv = join(home, ".env");
  const claudeEnv = join(state.paiDir, ".env");

  const det = state.detection!;

  // ~/.env — only remove if it points to PAI's config
  if (det.homeEnvSymlinkTarget !== null) {
    unlinkSync(homeEnv);
    await emit({ event: "removed", path: "~/.env (PAI symlink)" });
  } else {
    await emit({ event: "skipped_item", reason: "~/.env (not a PAI symlink)" });
  }

  // ~/.claude/.env — symlink to PAI env
  if (det.hasClaudeEnvSymlink) {
    unlinkSync(claudeEnv);
    await emit({ event: "removed", path: "~/.claude/.env (symlink)" });
  } else {
    await emit({ event: "skipped_item", reason: "~/.claude/.env symlink" });
  }

  await emit({ event: "step_complete", step: "symlinks" });
}

// ─── Step 7: PAI-Exclusive Directories ────────────────────────────

export async function runPaiDirs(
  state: UninstallState,
  emit: EngineEventHandler
): Promise<void> {
  await emit({ event: "step_start", step: "pai-dirs" });

  const paiDir = state.paiDir;
  const det = state.detection!;

  // VoiceServer, PAI-Install
  for (const d of det.paiExclusiveDirs) {
    const full = join(paiDir, d);
    if (existsSync(full)) {
      removeDir(full);
      await emit({ event: "removed", path: `~/.claude/${d}/` });
    } else {
      await emit({ event: "skipped_item", reason: `~/.claude/${d}/` });
    }
  }

  // .git — only if it's the PAI repo
  if (det.hasGitRepo) {
    const remote = det.gitRemote;
    if (remote.includes("danielmiessler/PAI") || remote.includes("danielmiessler/Personal_AI_Infrastructure")) {
      removeDir(join(paiDir, ".git"));
      await emit({ event: "removed", path: "~/.claude/.git (PAI repo)" });
    } else {
      await emit({ event: "warn", message: `~/.claude/.git origin is '${remote}' — leaving it alone` });
    }
  }

  await emit({ event: "step_complete", step: "pai-dirs" });
}

// ─── Step 8: PAI Root Files ───────────────────────────────────────

export async function runPaiFiles(
  state: UninstallState,
  emit: EngineEventHandler
): Promise<void> {
  await emit({ event: "step_start", step: "pai-files" });

  const paiDir = state.paiDir;
  const det = state.detection!;

  // statusline-command.sh
  const statuslinePath = join(paiDir, "statusline-command.sh");
  if (det.hasStatuslineCmd && existsSync(statuslinePath)) {
    unlinkSync(statuslinePath);
    await emit({ event: "removed", path: "~/.claude/statusline-command.sh" });
  } else {
    await emit({ event: "skipped_item", reason: "~/.claude/statusline-command.sh" });
  }

  // install.sh — only if it's PAI's
  const installShPath = join(paiDir, "install.sh");
  if (det.hasInstallSh && existsSync(installShPath)) {
    unlinkSync(installShPath);
    await emit({ event: "removed", path: "~/.claude/install.sh (PAI installer)" });
  } else {
    await emit({ event: "skipped_item", reason: "~/.claude/install.sh (not PAI's or not present)" });
  }

  // CLAUDE.md — three-way classification
  const claudeMdPath = join(paiDir, "CLAUDE.md");
  if (det.claudeMdStatus === "absent") {
    await emit({ event: "skipped_item", reason: "~/.claude/CLAUDE.md" });
  } else if (det.claudeMdStatus === "pai") {
    unlinkSync(claudeMdPath);
    await emit({ event: "removed", path: "~/.claude/CLAUDE.md (PAI content)" });
  } else if (det.claudeMdStatus === "empty") {
    unlinkSync(claudeMdPath);
    await emit({ event: "removed", path: "~/.claude/CLAUDE.md (empty, PAI-created)" });
  } else {
    await emit({ event: "warn", message: "~/.claude/CLAUDE.md contains user content — leaving it alone" });
  }

  await emit({ event: "step_complete", step: "pai-files" });
}

// ─── Step 9: PAI Skill Directories ───────────────────────────────

export async function runSkills(
  state: UninstallState,
  emit: EngineEventHandler
): Promise<void> {
  await emit({ event: "step_start", step: "skills" });

  const skillsDir = join(state.paiDir, "skills");
  const det = state.detection!;
  let removedCount = 0;

  for (const skill of det.presentSkills) {
    const full = join(skillsDir, skill);
    if (existsSync(full)) {
      removeDir(full);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    await emit({ event: "info", message: `Removed ${removedCount} PAI skill directories from ~/.claude/skills/` });
    if (existsSync(skillsDir) && isEmptyDir(skillsDir)) {
      rmdirSync(skillsDir);
      await emit({ event: "removed", path: "~/.claude/skills/ (now empty)" });
    } else if (existsSync(skillsDir)) {
      const remaining = safeReaddir(skillsDir).length;
      await emit({ event: "info", message: `~/.claude/skills/ kept — ${remaining} non-PAI skill(s) remain` });
    }
  } else {
    await emit({ event: "skipped_item", reason: "PAI skill directories (none found)" });
  }

  await emit({ event: "step_complete", step: "skills" });
}

// ─── Step 10: PAI Agent Files ─────────────────────────────────────

export async function runAgents(
  state: UninstallState,
  emit: EngineEventHandler
): Promise<void> {
  await emit({ event: "step_start", step: "agents" });

  const agentsDir = join(state.paiDir, "agents");
  const det = state.detection!;
  let removedCount = 0;

  for (const agent of det.presentAgents) {
    const full = join(agentsDir, agent);
    if (existsSync(full)) {
      unlinkSync(full);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    await emit({ event: "info", message: `Removed ${removedCount} PAI agent files from ~/.claude/agents/` });
    if (existsSync(agentsDir) && isEmptyDir(agentsDir)) {
      rmdirSync(agentsDir);
      await emit({ event: "removed", path: "~/.claude/agents/ (now empty)" });
    } else if (existsSync(agentsDir)) {
      const remaining = safeReaddir(agentsDir).length;
      await emit({ event: "info", message: `~/.claude/agents/ kept — ${remaining} non-PAI file(s) remain` });
    }
  } else {
    await emit({ event: "skipped_item", reason: "PAI agent files (none found)" });
  }

  await emit({ event: "step_complete", step: "agents" });
}

// ─── Step 11: PAI Migration Tools ────────────────────────────────

export async function runLib(
  state: UninstallState,
  emit: EngineEventHandler
): Promise<void> {
  await emit({ event: "step_start", step: "lib" });

  const libDir = join(state.paiDir, "lib");
  const migrationDir = join(libDir, "migration");

  if (existsSync(migrationDir)) {
    removeDir(migrationDir);
    await emit({ event: "removed", path: "~/.claude/lib/migration/" });

    if (existsSync(libDir) && isEmptyDir(libDir)) {
      rmdirSync(libDir);
      await emit({ event: "removed", path: "~/.claude/lib/ (now empty)" });
    } else if (existsSync(libDir)) {
      await emit({ event: "info", message: "~/.claude/lib/ kept — other content remains" });
    }
  } else {
    await emit({ event: "skipped_item", reason: "~/.claude/lib/migration/" });
  }

  await emit({ event: "step_complete", step: "lib" });
}

// ─── Step 12: Strip PAI Keys from settings.json ───────────────────

export async function runSettings(
  state: UninstallState,
  emit: EngineEventHandler
): Promise<void> {
  await emit({ event: "step_start", step: "settings" });

  const settingsPath = join(state.paiDir, "settings.json");

  if (!existsSync(settingsPath)) {
    await emit({ event: "skipped_item", reason: "settings.json (not found)" });
    await emit({ event: "step_complete", step: "settings" });
    return;
  }

  try {
    const raw = safeRead(settingsPath);
    const settings = JSON.parse(raw) as Record<string, unknown>;
    const removed: string[] = [];

    // Remove PAI-specific top-level keys
    for (const key of SETTINGS_PAI_KEYS) {
      if (key in settings) {
        delete settings[key];
        removed.push(key);
      }
    }

    // Remove PAI-specific env vars, keep others
    const env = settings.env as Record<string, unknown> | undefined;
    if (env && typeof env === "object") {
      for (const key of SETTINGS_PAI_ENV_KEYS) {
        if (key in env) {
          delete env[key];
          removed.push(`env.${key}`);
        }
      }
      if (Object.keys(env).length === 0) {
        delete settings.env;
      }
    }

    // Strip PAI hook registrations from settings.hooks
    // PAI hooks use commands like "${PAI_DIR}/hooks/SomePAIHook.hook.ts"
    const hooksObj = settings.hooks as Record<string, unknown[]> | undefined;
    if (hooksObj && typeof hooksObj === "object") {
      let removedHookCount = 0;

      for (const eventType of Object.keys(hooksObj)) {
        const groups = hooksObj[eventType] as Array<{ hooks?: Array<{ command?: string }> }>;
        if (!Array.isArray(groups)) continue;

        // For each group, filter out PAI-owned inner hook commands
        const filteredGroups = groups.filter((group) => {
          if (!Array.isArray(group.hooks)) return true;
          const nonPai = group.hooks.filter((h) => {
            if (!h.command) return true;
            // Check if the command references any PAI-owned hook filename
            return !(PAI_HOOKS as readonly string[]).some(
              (hookFile) => h.command!.includes(`/hooks/${hookFile}`)
            );
          });
          if (nonPai.length === group.hooks.length) return true; // nothing removed from this group
          removedHookCount += group.hooks.length - nonPai.length;
          group.hooks = nonPai;
          return nonPai.length > 0; // remove the group entirely if all hooks were PAI
        });

        if (filteredGroups.length === 0) {
          delete hooksObj[eventType];
        } else {
          hooksObj[eventType] = filteredGroups;
        }
      }

      // Remove hooks object entirely if empty
      if (Object.keys(hooksObj).length === 0) {
        delete settings.hooks;
      }

      if (removedHookCount > 0) {
        removed.push(`hooks (${removedHookCount} PAI hook registration(s))`);
      }
    }

    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf-8");

    if (removed.length > 0) {
      await emit({ event: "info", message: `Removed from settings.json: ${removed.join(", ")}` });
    } else {
      await emit({ event: "info", message: "No PAI keys found in settings.json" });
    }
    await emit({ event: "info", message: "Preserved: permissions, mcpServers, user hooks, and all other Claude Code config" });
  } catch (err: any) {
    await emit({ event: "warn", message: `Could not parse settings.json — skipping (${err.message})` });
  }

  await emit({ event: "step_complete", step: "settings" });
}

// ─── Step 13: PAI Hook Files ──────────────────────────────────────

export async function runHooks(
  state: UninstallState,
  emit: EngineEventHandler
): Promise<void> {
  await emit({ event: "step_start", step: "hooks" });

  const hooksDir = join(state.paiDir, "hooks");
  const det = state.detection!;

  if (!existsSync(hooksDir)) {
    await emit({ event: "skipped_item", reason: "~/.claude/hooks/" });
    await emit({ event: "step_complete", step: "hooks" });
    return;
  }

  await emit({ event: "info", message: `Already backed up to: ${state.backupDir}/hooks/` });

  // Remove named PAI hook files
  let removedCount = 0;
  for (const hf of det.presentHooks) {
    const full = join(hooksDir, hf);
    if (existsSync(full)) {
      unlinkSync(full);
      removedCount++;
    }
  }

  // Remove PAI-owned subdirs entirely
  for (const subdir of ["handlers", "lib"]) {
    const full = join(hooksDir, subdir);
    if (existsSync(full)) {
      removeDir(full);
      await emit({ event: "removed", path: `~/.claude/hooks/${subdir}/` });
    }
  }

  if (removedCount > 0) {
    await emit({ event: "info", message: `Removed ${removedCount} PAI hook files from ~/.claude/hooks/` });
  }

  // Check for remaining user files
  const remainingFiles = safeReaddir(hooksDir).filter(name => {
    try { return statSync(join(hooksDir, name)).isFile(); } catch { return false; }
  });

  if (remainingFiles.length > 0) {
    await emit({ event: "info", message: `~/.claude/hooks/ kept — ${remainingFiles.length} non-PAI file(s) remain` });
  } else if (isEmptyDir(hooksDir)) {
    try { rmdirSync(hooksDir); } catch { /* ignore */ }
    await emit({ event: "removed", path: "~/.claude/hooks/ (now empty)" });
  }

  await emit({ event: "step_complete", step: "hooks" });
}

// ─── Step 14: PAI Memory ──────────────────────────────────────────

export async function runMemory(
  state: UninstallState,
  emit: EngineEventHandler,
  getConfirm: GetConfirm
): Promise<void> {
  await emit({ event: "step_start", step: "memory" });

  const memoryDir = join(state.paiDir, "MEMORY");
  const det = state.detection!;

  if (!det.hasMemory) {
    await emit({ event: "skipped_item", reason: "~/.claude/MEMORY/" });
    await emit({ event: "step_complete", step: "memory" });
    return;
  }

  await emit({ event: "info", message: `Already backed up to: ${state.backupDir}/MEMORY/` });

  // Remove PAI-shipped README (check content)
  const readmePath = join(memoryDir, "README.md");
  if (existsSync(readmePath)) {
    const content = safeRead(readmePath).toLowerCase();
    if (/personal ai|pai|memory system/.test(content)) {
      unlinkSync(readmePath);
      await emit({ event: "removed", path: "~/.claude/MEMORY/README.md (PAI-shipped)" });
    }
  }

  // Auto-remove STATE/ — PAI runtime caches (ephemeral, not personal data)
  const statePath = join(memoryDir, "STATE");
  if (det.hasMemoryState && existsSync(statePath)) {
    removeDir(statePath);
    await emit({ event: "removed", path: "~/.claude/MEMORY/STATE/ (PAI runtime caches)" });
  }

  // Offer each user data subdir individually
  for (const subdir of det.memoryUserSubdirs) {
    const full = join(memoryDir, subdir);
    if (!existsSync(full)) continue;

    let fileCount = 0;
    try {
      const countWalk = (d: string) => {
        for (const e of readdirSync(d, { withFileTypes: true })) {
          if (e.isDirectory()) countWalk(join(d, e.name));
          else fileCount++;
        }
      };
      countWalk(full);
    } catch { /* ignore */ }

    const confirmed = await getConfirm(
      `memory-${subdir}`,
      `Remove ~/.claude/MEMORY/${subdir}/? (${fileCount} file(s) — your personal AI memory)`,
      false
    );

    if (confirmed) {
      removeDir(full);
      await emit({ event: "removed", path: `~/.claude/MEMORY/${subdir}/` });
    } else {
      await emit({ event: "warn", message: `Kept ~/.claude/MEMORY/${subdir}/` });
    }
  }

  // Remove MEMORY/ itself if now empty
  if (existsSync(memoryDir) && isEmptyDir(memoryDir)) {
    try { rmdirSync(memoryDir); } catch { /* ignore */ }
    await emit({ event: "removed", path: "~/.claude/MEMORY/ (now empty)" });
  }

  await emit({ event: "step_complete", step: "memory" });
}

// ─── Step 15: User Data (plans, tasks, teams, legacy backups) ──────

export async function runUserData(
  state: UninstallState,
  emit: EngineEventHandler,
  getConfirm: GetConfirm
): Promise<void> {
  await emit({ event: "step_start", step: "user-data" });

  const paiDir = state.paiDir;
  const det = state.detection!;

  // plans/
  const plansDir = join(paiDir, "plans");
  if (existsSync(plansDir)) {
    await emit({ event: "info", message: `~/.claude/plans/ contains ${det.planCount} file(s) — already backed up` });
    const confirmed = await getConfirm("plans", "Remove ~/.claude/plans/?", false);
    if (confirmed) {
      removeDir(plansDir);
      await emit({ event: "removed", path: "~/.claude/plans/" });
    } else {
      await emit({ event: "warn", message: `Kept ~/.claude/plans/ — backup at ${state.backupDir}/plans/` });
    }
  } else {
    await emit({ event: "skipped_item", reason: "~/.claude/plans/" });
  }

  // tasks/
  const tasksDir = join(paiDir, "tasks");
  if (existsSync(tasksDir)) {
    await emit({ event: "info", message: `~/.claude/tasks/ contains ${det.taskCount} item(s) — already backed up` });
    const confirmed = await getConfirm("tasks", "Remove ~/.claude/tasks/?", false);
    if (confirmed) {
      removeDir(tasksDir);
      await emit({ event: "removed", path: "~/.claude/tasks/" });
    } else {
      await emit({ event: "warn", message: `Kept ~/.claude/tasks/ — backup at ${state.backupDir}/tasks/` });
    }
  } else {
    await emit({ event: "skipped_item", reason: "~/.claude/tasks/" });
  }

  // teams/
  const teamsDir = join(paiDir, "teams");
  if (existsSync(teamsDir)) {
    await emit({ event: "info", message: `~/.claude/teams/ contains ${det.teamCount} item(s) — already backed up` });
    const confirmed = await getConfirm("teams", "Remove ~/.claude/teams/?", false);
    if (confirmed) {
      removeDir(teamsDir);
      await emit({ event: "removed", path: "~/.claude/teams/" });
    } else {
      await emit({ event: "warn", message: `Kept ~/.claude/teams/ — backup at ${state.backupDir}/teams/` });
    }
  } else {
    await emit({ event: "skipped_item", reason: "~/.claude/teams/" });
  }

  // Legacy backup directories
  if (det.legacyBackups.length > 0) {
    for (const bd of det.legacyBackups) {
      await emit({ event: "warn", message: `Found legacy backup: ${bd}` });
    }
    const confirmed = await getConfirm(
      "legacy-backups",
      `Remove ${det.legacyBackups.length} legacy PAI backup director${det.legacyBackups.length === 1 ? "y" : "ies"}?`,
      false
    );
    if (confirmed) {
      for (const bd of det.legacyBackups) {
        if (existsSync(bd)) {
          removeDir(bd);
          await emit({ event: "removed", path: bd });
        }
      }
    }
  }

  await emit({ event: "step_complete", step: "user-data" });
}

// ─── Step 16: PAI Config Directory ───────────────────────────────

export async function runConfigDir(
  state: UninstallState,
  emit: EngineEventHandler,
  getConfirm: GetConfirm
): Promise<void> {
  await emit({ event: "step_start", step: "config-dir" });

  const configDir = state.configDir;

  if (existsSync(configDir)) {
    const confirmed = await getConfirm(
      "config-dir",
      "Remove ~/.config/PAI/? (API keys — already backed up)",
      false
    );
    if (confirmed) {
      removeDir(configDir);
      await emit({ event: "removed", path: "~/.config/PAI/" });
    } else {
      await emit({ event: "warn", message: "Kept ~/.config/PAI/ — API keys preserved" });
    }
  } else {
    await emit({ event: "skipped_item", reason: "~/.config/PAI/" });
  }

  await emit({ event: "step_complete", step: "config-dir" });
}
