/**
 * PAI Uninstaller — Step Definitions
 */

import type { StepDefinition, StepId } from "./types";

export const STEPS: StepDefinition[] = [
  { id: "detect",       name: "Detect PAI Artifacts",     description: "Scan for all PAI-installed content",           number: 1,  interactive: false },
  { id: "backup",       name: "Create Backup",            description: "Back up mixed-content areas before removal",   number: 2,  interactive: false },
  { id: "voice-server", name: "Voice Server",             description: "Stop and remove PAI voice server",             number: 3,  interactive: false },
  { id: "menubar",      name: "Menu Bar Plugins",         description: "Remove SwiftBar/BitBar PAI plugins",           number: 4,  interactive: false },
  { id: "shell-config", name: "Shell Configuration",      description: "Remove PAI alias from .zshrc and fish config", number: 5,  interactive: false },
  { id: "symlinks",     name: "Symlinks",                 description: "Remove PAI-owned symlinks",                    number: 6,  interactive: false },
  { id: "pai-dirs",     name: "PAI Directories",          description: "Remove PAI-exclusive directories",             number: 7,  interactive: false },
  { id: "pai-files",    name: "PAI Root Files",           description: "Remove PAI-owned files in ~/.claude/",         number: 8,  interactive: false },
  { id: "skills",       name: "PAI Skills",               description: "Remove PAI skill directories from skills/",    number: 9,  interactive: false },
  { id: "agents",       name: "PAI Agents",               description: "Remove PAI agent files from agents/",          number: 10, interactive: false },
  { id: "lib",          name: "PAI Migration Tools",      description: "Remove lib/migration/",                        number: 11, interactive: false },
  { id: "settings",     name: "Settings Cleanup",         description: "Strip PAI keys from settings.json",           number: 12, interactive: false },
  { id: "hooks",        name: "PAI Hooks",                description: "Remove PAI hook files from hooks/",            number: 13, interactive: false },
  { id: "memory",       name: "PAI Memory",               description: "Remove PAI memory files, offer personal data", number: 14, interactive: true  },
  { id: "user-data",    name: "User Data",                description: "Offer to remove plans/, tasks/, teams/",       number: 15, interactive: true  },
  { id: "config-dir",   name: "PAI Config",               description: "Offer to remove ~/.config/PAI/",               number: 16, interactive: true  },
];

export const TOTAL_STEPS = STEPS.length;

export function getStep(id: StepId): StepDefinition {
  const step = STEPS.find(s => s.id === id);
  if (!step) throw new Error(`Unknown step: ${id}`);
  return step;
}
