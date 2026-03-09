/**
 * PAI Installer v4.0 — Install Actions
 * Pure action functions called by both CLI and web frontends.
 * Each action takes state + event emitter, performs work, returns result.
 */

import { execSync, spawn } from "child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, symlinkSync, unlinkSync, chmodSync, lstatSync, cpSync, rmSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { InstallState, EngineEventHandler, DetectionResult } from "./types";
import { PAI_VERSION, ALGORITHM_VERSION } from "./types";
import { detectSystem } from "./detect";
import { generateSettingsJson } from "./config-gen";

/**
 * Search existing .claude directories and config locations for a given env key.
 * Returns the value if found, or empty string.
 */
function findExistingEnvKey(keyName: string): string {
  const home = homedir();
  const searchPaths: string[] = [];

  // Check ~/.config/PAI/.env
  searchPaths.push(join(home, ".config", "PAI", ".env"));

  // Check ~/.claude/.env
  searchPaths.push(join(home, ".claude", ".env"));

  // Check any .claude* directories in home (old versions, backups)
  try {
    const homeEntries = readdirSync(home);
    for (const entry of homeEntries) {
      if (entry.startsWith(".claude") && entry !== ".claude") {
        searchPaths.push(join(home, entry, ".env"));
        searchPaths.push(join(home, entry, ".config", "PAI", ".env"));
      }
    }
  } catch {
    // Ignore permission errors
  }

  for (const envPath of searchPaths) {
    try {
      if (existsSync(envPath)) {
        const content = readFileSync(envPath, "utf-8");
        const match = content.match(new RegExp(`^${keyName}=(.+)$`, "m"));
        if (match && match[1].trim()) {
          return match[1].trim();
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  // Also check current environment
  return process.env[keyName] || "";
}

function tryExec(cmd: string, timeout = 30000): string | null {
  try {
    return execSync(cmd, { timeout, stdio: ["pipe", "pipe", "pipe"] }).toString().trim();
  } catch {
    return null;
  }
}

// ─── User Context Migration (v2.5/v3.0 → v4.x) ─────────────────
//
// In v2.5–v3.0, user context (ABOUTME.md, TELOS/, CONTACTS.md, etc.)
// lived at skills/PAI/USER/ (or skills/CORE/USER/ in v2.4).
// In v4.0, user context moved to PAI/USER/ and CONTEXT_ROUTING.md
// points there. But the installer never migrated existing files,
// leaving user data stranded at the old path while the new path
// stayed empty. This function copies user files to the canonical
// location and replaces the legacy directory with a symlink so
// both routing systems resolve to the same place.

/**
 * Recursively copy files from src to dst, skipping files that
 * already exist at the destination. Only copies regular files.
 */
function copyMissing(src: string, dst: string): number {
  let copied = 0;
  if (!existsSync(src)) return copied;

  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name);
    const dstPath = join(dst, entry.name);

    if (entry.isDirectory()) {
      if (!existsSync(dstPath)) mkdirSync(dstPath, { recursive: true });
      copied += copyMissing(srcPath, dstPath);
    } else if (entry.isFile()) {
      if (!existsSync(dstPath)) {
        try {
          cpSync(srcPath, dstPath);
          copied++;
        } catch {
          // Skip files that can't be copied (permission errors)
        }
      }
    }
  }
  return copied;
}

/**
 * Migrate user context from legacy skills/PAI/USER or skills/CORE/USER
 * to the canonical PAI/USER location. Replaces the legacy directory
 * with a symlink so the skill's relative USER/ paths still resolve.
 */
async function migrateUserContext(
  paiDir: string,
  emit: EngineEventHandler
): Promise<void> {
  const newUserDir = join(paiDir, "PAI", "USER");
  if (!existsSync(newUserDir)) return; // PAI/USER/ not set up yet

  const legacyPaths = [
    join(paiDir, "skills", "PAI", "USER"),   // v2.5–v3.0
    join(paiDir, "skills", "CORE", "USER"),  // v2.4 and earlier
  ];

  for (const legacyDir of legacyPaths) {
    if (!existsSync(legacyDir)) continue;

    // Skip if already a symlink (migration already ran)
    try {
      if (lstatSync(legacyDir).isSymbolicLink()) continue;
    } catch {
      continue;
    }

    const label = legacyDir.includes("CORE") ? "skills/CORE/USER" : "skills/PAI/USER";
    await emit({ event: "progress", step: "repository", percent: 70, detail: `Migrating user context from ${label}...` });

    const copied = copyMissing(legacyDir, newUserDir);
    if (copied > 0) {
      await emit({ event: "message", content: `Migrated ${copied} user context files from ${label} to PAI/USER.` });
    }

    // Replace legacy dir with symlink so skill-relative paths still work
    try {
      rmSync(legacyDir, { recursive: true });
      // Symlink target is relative: from skills/PAI/ or skills/CORE/ → ../../PAI/USER
      symlinkSync(join("..", "..", "PAI", "USER"), legacyDir);
      await emit({ event: "message", content: `Replaced ${label} with symlink to PAI/USER.` });
    } catch {
      await emit({ event: "message", content: `Could not replace ${label} with symlink. User files were copied but old directory remains.` });
    }
  }
}

// ─── Step 1: System Detection ────────────────────────────────────

export async function runSystemDetect(
  state: InstallState,
  emit: EngineEventHandler
): Promise<DetectionResult> {
  await emit({ event: "step_start", step: "system-detect" });
  await emit({ event: "progress", step: "system-detect", percent: 10, detail: "Detecting operating system..." });

  const detection = detectSystem();
  state.detection = detection;

  await emit({ event: "progress", step: "system-detect", percent: 50, detail: "Checking installed tools..." });

  // Determine install type
  if (detection.existing.paiInstalled) {
    state.installType = "upgrade";
    await emit({
      event: "message",
      content: `Existing PAI installation detected (v${detection.existing.paiVersion || "unknown"}). This will upgrade your installation.`,
    });
  } else {
    state.installType = "fresh";
    await emit({ event: "message", content: "No existing PAI installation found. Starting fresh install." });
  }

  // Pre-fill collected data from existing installation
  // Skip values that are unresolved template placeholders like {PRINCIPAL.NAME}
  const isPlaceholder = (v: string) => /^\{.+\}$/.test(v);

  if (detection.existing.paiInstalled && detection.existing.settingsPath) {
    try {
      const settings = JSON.parse(readFileSync(detection.existing.settingsPath, "utf-8"));
      if (settings.principal?.name && !isPlaceholder(settings.principal.name)) state.collected.principalName = settings.principal.name;
      if (settings.principal?.timezone && !isPlaceholder(settings.principal.timezone)) state.collected.timezone = settings.principal.timezone;
      if (settings.daidentity?.name && !isPlaceholder(settings.daidentity.name)) state.collected.aiName = settings.daidentity.name;
      if (settings.daidentity?.startupCatchphrase && !isPlaceholder(settings.daidentity.startupCatchphrase)) state.collected.catchphrase = settings.daidentity.startupCatchphrase;
      if (settings.env?.PROJECTS_DIR && !isPlaceholder(settings.env.PROJECTS_DIR)) state.collected.projectsDir = settings.env.PROJECTS_DIR;
      if (settings.preferences?.temperatureUnit) state.collected.temperatureUnit = settings.preferences.temperatureUnit;
    } catch {
      // Ignore parse errors
    }
  }

  await emit({ event: "progress", step: "system-detect", percent: 100, detail: "Detection complete" });
  await emit({ event: "step_complete", step: "system-detect" });
  return detection;
}

// ─── Step 2: Prerequisites ───────────────────────────────────────

export async function runPrerequisites(
  state: InstallState,
  emit: EngineEventHandler
): Promise<void> {
  await emit({ event: "step_start", step: "prerequisites" });
  const det = state.detection!;

  // Install Git if missing
  if (!det.tools.git.installed) {
    await emit({ event: "progress", step: "prerequisites", percent: 10, detail: "Installing Git..." });

    if (det.os.platform === "darwin") {
      if (det.tools.brew.installed) {
        const result = tryExec("brew install git", 120000);
        if (result !== null) {
          await emit({ event: "message", content: "Git installed via Homebrew." });
        } else {
          await emit({ event: "message", content: "Xcode Command Line Tools should include Git. Run: xcode-select --install" });
        }
      } else {
        await emit({ event: "message", content: "Please install Git: xcode-select --install" });
      }
    } else {
      // Linux
      const pkgMgr = tryExec("which apt-get") ? "apt-get" : tryExec("which yum") ? "yum" : null;
      if (pkgMgr) {
        tryExec(`sudo ${pkgMgr} install -y git`, 120000);
        await emit({ event: "message", content: `Git installed via ${pkgMgr}.` });
      }
    }
  } else {
    await emit({ event: "progress", step: "prerequisites", percent: 20, detail: `Git found: v${det.tools.git.version}` });
  }

  // Bun should already be installed by bootstrap script, but verify
  if (!det.tools.bun.installed) {
    await emit({ event: "progress", step: "prerequisites", percent: 40, detail: "Installing Bun..." });
    const result = tryExec("curl -fsSL https://bun.sh/install | bash", 60000);
    if (result !== null) {
      // Update PATH
      const bunBin = join(homedir(), ".bun", "bin");
      process.env.PATH = `${bunBin}:${process.env.PATH}`;
      await emit({ event: "message", content: "Bun installed successfully." });
    }
  } else {
    await emit({ event: "progress", step: "prerequisites", percent: 50, detail: `Bun found: v${det.tools.bun.version}` });
  }

  // Install Claude Code if missing
  if (!det.tools.claude.installed) {
    await emit({ event: "progress", step: "prerequisites", percent: 70, detail: "Installing Claude Code..." });

    // Try npm first (most common), then bun
    const npmResult = tryExec("npm install -g @anthropic-ai/claude-code", 120000);
    if (npmResult !== null) {
      await emit({ event: "message", content: "Claude Code installed via npm." });
    } else {
      // Try with bun
      const bunResult = tryExec("bun install -g @anthropic-ai/claude-code", 120000);
      if (bunResult !== null) {
        await emit({ event: "message", content: "Claude Code installed via bun." });
      } else {
        await emit({
          event: "message",
          content: "Could not install Claude Code automatically. Please install manually: npm install -g @anthropic-ai/claude-code",
        });
      }
    }
  } else {
    await emit({ event: "progress", step: "prerequisites", percent: 80, detail: `Claude Code found: v${det.tools.claude.version}` });
  }

  await emit({ event: "progress", step: "prerequisites", percent: 100, detail: "All prerequisites ready" });
  await emit({ event: "step_complete", step: "prerequisites" });
}

// ─── Step 3: API Keys ───────────────────────────────────────────

export async function runApiKeys(
  state: InstallState,
  emit: EngineEventHandler,
  _getInput: (id: string, prompt: string, type: "text" | "password" | "key", placeholder?: string) => Promise<string>,
  _getChoice: (id: string, prompt: string, choices: { label: string; value: string }[]) => Promise<string>
): Promise<void> {
  await emit({ event: "step_start", step: "api-keys" });
  await emit({ event: "message", content: "No API keys required for this installation." });
  await emit({ event: "step_complete", step: "api-keys" });
}

// ─── Step 4: Identity ────────────────────────────────────────────

export async function runIdentity(
  state: InstallState,
  emit: EngineEventHandler,
  getInput: (id: string, prompt: string, type: "text" | "password" | "key", placeholder?: string) => Promise<string>
): Promise<void> {
  await emit({ event: "step_start", step: "identity" });

  // Name
  const defaultName = state.collected.principalName || "";
  const namePrompt = defaultName
    ? `What is your name? (Press Enter to keep: ${defaultName})`
    : "What is your name?";
  const name = await getInput(
    "principal-name",
    namePrompt,
    "text",
    "Your name"
  );
  state.collected.principalName = name.trim() || defaultName || "User";

  // Timezone
  const detectedTz = state.detection?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tz = await getInput(
    "timezone",
    `Detected timezone: ${detectedTz}. Press Enter to confirm or type a different one.`,
    "text",
    detectedTz
  );
  state.collected.timezone = tz.trim() || detectedTz;

  // Temperature unit
  const defaultTempUnit = state.collected.temperatureUnit || "fahrenheit";
  const tempUnit = await getInput(
    "temperature-unit",
    `Temperature unit? Type F for Fahrenheit or C for Celsius. (Default: ${defaultTempUnit === "celsius" ? "C" : "F"})`,
    "text",
    defaultTempUnit === "celsius" ? "C" : "F"
  );
  const trimmedUnit = tempUnit.trim().toLowerCase();
  state.collected.temperatureUnit = (trimmedUnit === "c" || trimmedUnit === "celsius") ? "celsius" : "fahrenheit";

  // AI Name
  const defaultAi = state.collected.aiName || "";
  const aiPrompt = defaultAi
    ? `What would you like to name your AI assistant? (Press Enter to keep: ${defaultAi})`
    : "What would you like to name your AI assistant?";
  const aiName = await getInput(
    "ai-name",
    aiPrompt,
    "text",
    "e.g., Atlas, Nova, Sage"
  );
  state.collected.aiName = aiName.trim() || defaultAi || "PAI";

  // Catchphrase
  const defaultCatch = state.collected.catchphrase || `${state.collected.aiName} here, ready to go`;
  const catchphrase = await getInput(
    "catchphrase",
    `Startup catchphrase for ${state.collected.aiName}?`,
    "text",
    defaultCatch
  );
  state.collected.catchphrase = catchphrase.trim() || defaultCatch;

  // Projects directory (optional)
  const defaultProjects = state.collected.projectsDir || "";
  const projDir = await getInput(
    "projects-dir",
    "Projects directory (optional, press Enter to skip):",
    "text",
    defaultProjects || "~/Projects"
  );
  if (projDir.trim()) {
    state.collected.projectsDir = projDir.trim().replace(/^~/, homedir());
  }

  await emit({
    event: "message",
    content: `Identity configured: ${state.collected.principalName} with AI assistant ${state.collected.aiName}.`,
    speak: true,
  });
  await emit({ event: "step_complete", step: "identity" });
}

// ─── Step 5: Repository ──────────────────────────────────────────

export async function runRepository(
  state: InstallState,
  emit: EngineEventHandler
): Promise<void> {
  await emit({ event: "step_start", step: "repository" });
  const paiDir = state.detection?.paiDir || join(homedir(), ".claude");

  if (state.installType === "upgrade") {
    await emit({ event: "progress", step: "repository", percent: 20, detail: "Existing installation found, updating..." });

    // Check if it's a git repo
    const isGitRepo = existsSync(join(paiDir, ".git"));
    if (isGitRepo) {
      const pullResult = tryExec(`cd "${paiDir}" && git pull origin main 2>&1`, 60000);
      if (pullResult !== null) {
        await emit({ event: "message", content: "PAI repository updated from GitHub." });
      } else {
        await emit({ event: "message", content: "Could not pull updates. Continuing with existing files." });
      }
    } else {
      await emit({ event: "message", content: "Existing installation is not a git repo. Preserving current files." });
    }
  } else {
    // Fresh install — clone repo
    await emit({ event: "progress", step: "repository", percent: 20, detail: "Cloning PAI repository..." });

    if (!existsSync(paiDir)) {
      mkdirSync(paiDir, { recursive: true });
    }

    const cloneResult = tryExec(
      `git clone https://github.com/danielmiessler/PAI.git "${paiDir}" 2>&1`,
      120000
    );

    if (cloneResult !== null) {
      await emit({ event: "message", content: "PAI repository cloned successfully." });
    } else {
      // If clone fails (dir not empty), try to init and pull
      await emit({ event: "progress", step: "repository", percent: 50, detail: "Directory exists, trying alternative approach..." });

      const initResult = tryExec(`cd "${paiDir}" && git init && git remote add origin https://github.com/danielmiessler/PAI.git && git fetch origin && git checkout -b main origin/main 2>&1`, 120000);
      if (initResult !== null) {
        await emit({ event: "message", content: "PAI repository initialized and synced." });
      } else {
        await emit({
          event: "message",
          content: "Could not clone PAI repo automatically. You can clone it manually later: git clone https://github.com/danielmiessler/PAI.git ~/.claude",
        });
      }
    }
  }

  // Create required directories regardless of clone result
  const requiredDirs = [
    "MEMORY",
    "MEMORY/STATE",
    "MEMORY/LEARNING",
    "MEMORY/WORK",
    "MEMORY/RELATIONSHIP",
    "Plans",
    "hooks",
    "skills",
    "tasks",
  ];

  for (const dir of requiredDirs) {
    const fullPath = join(paiDir, dir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }
  }

  // Migrate user context from v2.5/v3.0 location to v4.x canonical location
  if (state.installType === "upgrade") {
    await migrateUserContext(paiDir, emit);
  }

  await emit({ event: "progress", step: "repository", percent: 100, detail: "Repository ready" });
  await emit({ event: "step_complete", step: "repository" });
}

// ─── Step 6: Configuration ───────────────────────────────────────

export async function runConfiguration(
  state: InstallState,
  emit: EngineEventHandler
): Promise<void> {
  await emit({ event: "step_start", step: "configuration" });
  const paiDir = state.detection?.paiDir || join(homedir(), ".claude");
  const configDir = state.detection?.configDir || join(homedir(), ".config", "PAI");

  // Generate settings.json
  await emit({ event: "progress", step: "configuration", percent: 20, detail: "Generating settings.json..." });

  const config = generateSettingsJson({
    principalName: state.collected.principalName || "User",
    timezone: state.collected.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    aiName: state.collected.aiName || "PAI",
    catchphrase: state.collected.catchphrase || "Ready to go",
    projectsDir: state.collected.projectsDir,
    temperatureUnit: state.collected.temperatureUnit,
    paiDir,
    configDir,
  });

  const settingsPath = join(paiDir, "settings.json");

  // The release ships a complete settings.json with hooks, statusLine, spinnerVerbs, etc.
  // We only update user-specific fields — never overwrite the whole file.
  if (existsSync(settingsPath)) {
    try {
      const existing = JSON.parse(readFileSync(settingsPath, "utf-8"));
      // Merge only installer-managed fields; preserve everything else
      existing.env = { ...existing.env, ...config.env };
      existing.principal = { ...existing.principal, ...config.principal };
      existing.daidentity = { ...existing.daidentity, ...config.daidentity };
      existing.pai = { ...existing.pai, ...config.pai };
      // Force-overwrite version fields — these must ALWAYS match the release,
      // never be preserved from the user's existing config
      existing.pai.version = PAI_VERSION;
      existing.pai.algorithmVersion = ALGORITHM_VERSION;
      existing.preferences = { ...existing.preferences, ...config.preferences };
      // Only set permissions/contextFiles/plansDirectory if not already present
      if (!existing.permissions) existing.permissions = config.permissions;
      if (!existing.contextFiles) existing.contextFiles = config.contextFiles;
      if (!existing.plansDirectory) existing.plansDirectory = config.plansDirectory;
      // Never touch: hooks, statusLine, spinnerVerbs, contextFiles (if present)
      writeFileSync(settingsPath, JSON.stringify(existing, null, 2));
    } catch {
      // Existing file is corrupt — write fresh as fallback
      writeFileSync(settingsPath, JSON.stringify(config, null, 2));
    }
  } else {
    writeFileSync(settingsPath, JSON.stringify(config, null, 2));
  }
  await emit({ event: "message", content: "settings.json generated." });

  // Update Algorithm LATEST version file (public repo may be behind)
  const latestPath = join(paiDir, "PAI", "Algorithm", "LATEST");
  const latestDir = join(paiDir, "PAI", "Algorithm");
  if (existsSync(latestDir)) {
    try { writeFileSync(latestPath, `v${ALGORITHM_VERSION}\n`); } catch {}
  }

  // Calculate and write initial counts so banner shows real numbers on first launch
  await emit({ event: "progress", step: "configuration", percent: 35, detail: "Calculating system counts..." });
  try {
    const countFiles = (dir: string, ext?: string): number => {
      if (!existsSync(dir)) return 0;
      let count = 0;
      const walk = (d: string) => {
        try {
          for (const entry of readdirSync(d, { withFileTypes: true })) {
            if (entry.isDirectory()) walk(join(d, entry.name));
            else if (!ext || entry.name.endsWith(ext)) count++;
          }
        } catch {}
      };
      walk(dir);
      return count;
    };

    const countDirs = (dir: string, filter?: (name: string) => boolean): number => {
      if (!existsSync(dir)) return 0;
      try {
        return readdirSync(dir, { withFileTypes: true })
          .filter(e => e.isDirectory() && (!filter || filter(e.name))).length;
      } catch { return 0; }
    };

    const skillCount = countDirs(join(paiDir, "skills"), (name) =>
      existsSync(join(paiDir, "skills", name, "SKILL.md")));
    const hookCount = countFiles(join(paiDir, "hooks"), ".ts");
    const signalCount = countFiles(join(paiDir, "MEMORY", "LEARNING"), ".md");
    const fileCount = countFiles(join(paiDir, "skills", "PAI", "USER"));
    // Count workflows by scanning skill Tools directories for .ts files
    let workflowCount = 0;
    const skillsDir = join(paiDir, "skills");
    if (existsSync(skillsDir)) {
      try {
        for (const s of readdirSync(skillsDir, { withFileTypes: true })) {
          if (s.isDirectory()) {
            const toolsDir = join(skillsDir, s.name, "Tools");
            if (existsSync(toolsDir)) {
              workflowCount += countFiles(toolsDir, ".ts");
            }
          }
        }
      } catch {}
    }

    // Write counts to settings.json
    const currentSettings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    currentSettings.counts = {
      skills: skillCount,
      workflows: workflowCount,
      hooks: hookCount,
      signals: signalCount,
      files: fileCount,
      updatedAt: new Date().toISOString(),
    };
    writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 2));
  } catch {
    // Non-fatal — banner will just show 0 until first session ends
  }

  // Create config directory and symlinks for .env (hooks read ~/.claude/.env)
  await emit({ event: "progress", step: "configuration", percent: 50, detail: "Setting up config directory..." });

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  const envPath = join(configDir, ".env");

  if (existsSync(envPath)) {
    const symlinkPaths = [
      join(paiDir, ".env"),         // ~/.claude/.env (hooks read this)
    ];
    for (const symlinkPath of symlinkPaths) {
      try {
        // Remove stale symlink or file before creating
        if (existsSync(symlinkPath)) {
          const stat = lstatSync(symlinkPath);
          if (stat.isSymbolicLink()) {
            unlinkSync(symlinkPath);
          } else {
            continue; // Don't overwrite a real file
          }
        }
        symlinkSync(envPath, symlinkPath);
      } catch {
        // Permission error or path conflict
      }
    }
  }

  // Set up shell alias (detect bash/zsh/fish)
  await emit({ event: "progress", step: "configuration", percent: 80, detail: "Setting up shell alias..." });

  const userShell = process.env.SHELL || "/bin/zsh";
  const rcFile = userShell.includes("bash") ? ".bashrc" : userShell.includes("fish") ? ".config/fish/config.fish" : ".zshrc";
  const rcPath = join(homedir(), rcFile);
  const aliasLine = `alias pai='bun ${join(paiDir, "PAI", "Tools", "pai.ts")}'`;
  const marker = "# PAI alias";

  if (existsSync(rcPath)) {
    let content = readFileSync(rcPath, "utf-8");
    // Remove any existing pai alias (old CORE or PAI paths, any marker variant)
    content = content.replace(/^#\s*(?:PAI|CORE)\s*alias.*\n.*alias pai=.*\n?/gm, "");
    content = content.replace(/^alias pai=.*\n?/gm, "");
    // Add fresh alias
    content = content.trimEnd() + `\n\n${marker}\n${aliasLine}\n`;
    writeFileSync(rcPath, content);
  } else {
    writeFileSync(rcPath, `${marker}\n${aliasLine}\n`);
  }

  // Fix permissions
  await emit({ event: "progress", step: "configuration", percent: 90, detail: "Setting permissions..." });
  try {
    tryExec(`chmod -R 755 "${paiDir}"`, 10000);
  } catch {
    // Non-fatal
  }

  await emit({ event: "progress", step: "configuration", percent: 100, detail: "Configuration complete" });
  await emit({ event: "step_complete", step: "configuration" });
}

