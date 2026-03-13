/**
 * PAI Uninstaller — Type Definitions
 */

// ─── Step IDs ────────────────────────────────────────────────────

export type StepId =
  | "detect"
  | "backup"
  | "voice-server"
  | "menubar"
  | "shell-config"
  | "symlinks"
  | "pai-dirs"
  | "pai-files"
  | "skills"
  | "agents"
  | "lib"
  | "settings"
  | "hooks"
  | "memory"
  | "user-data"
  | "config-dir";

export interface StepDefinition {
  id: StepId;
  name: string;
  description: string;
  number: number;
  interactive: boolean; // true if step may prompt the user
}

// ─── Detection Result ─────────────────────────────────────────────

export interface UninstallDetection {
  paiDir: string;
  configDir: string;
  // Voice
  hasLaunchAgent: boolean;
  hasVoiceLog: boolean;
  // Menubar
  menubarPlugins: string[];
  // Shell config
  hasZshrcAlias: boolean;
  hasFishAlias: boolean;
  // Symlinks
  homeEnvSymlinkTarget: string | null; // null if not a PAI-owned symlink
  hasClaudeEnvSymlink: boolean;
  // PAI-exclusive dirs
  paiExclusiveDirs: string[]; // names (VoiceServer, PAI-Install)
  hasGitRepo: boolean;
  gitRemote: string;
  // Root files
  hasStatuslineCmd: boolean;
  hasInstallSh: boolean;
  claudeMdStatus: "pai" | "empty" | "user" | "absent";
  // Skills / agents / lib
  presentSkills: string[];
  presentAgents: string[];
  hasLibMigration: boolean;
  // Settings
  hasSettings: boolean;
  // Hooks
  presentHooks: string[];
  hasHookHandlers: boolean;
  hasHookLib: boolean;
  userHookCount: number;
  // Memory
  hasMemory: boolean;
  hasMemoryState: boolean;
  memoryUserSubdirs: string[];
  // User data
  planCount: number;
  taskCount: number;
  teamCount: number;
  // Config dir
  hasConfigDir: boolean;
  // Legacy backups
  legacyBackups: string[];
}

// ─── Uninstall State ──────────────────────────────────────────────

export interface UninstallState {
  version: string;
  startedAt: string;
  force: boolean;
  paiDir: string;
  configDir: string;
  backupDir: string | null;
  completedSteps: StepId[];
  skippedSteps: StepId[];
  detection: UninstallDetection | null;
}

// ─── Engine Events ────────────────────────────────────────────────

export type EngineEvent =
  | { event: "step_start"; step: StepId }
  | { event: "step_complete"; step: StepId }
  | { event: "step_skip"; step: StepId; reason: string }
  | { event: "step_error"; step: StepId; error: string }
  | { event: "progress"; step: StepId; percent: number; detail: string }
  | { event: "message"; content: string }
  | { event: "removed"; path: string }
  | { event: "backed_up"; path: string }
  | { event: "skipped_item"; reason: string }
  | { event: "warn"; message: string }
  | { event: "info"; message: string }
  | { event: "complete"; backupDir: string }
  | { event: "error"; message: string };

export type EngineEventHandler = (event: EngineEvent) => void | Promise<void>;

export type GetConfirm = (
  id: string,
  question: string,
  defaultYes?: boolean
) => Promise<boolean>;
