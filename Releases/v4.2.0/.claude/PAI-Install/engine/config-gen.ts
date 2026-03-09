/**
 * PAI Installer v4.0 — Configuration Generator
 * Generates a FALLBACK settings.json from collected user data.
 * Only used when no existing settings.json exists.
 * Produces minimal output — just fields the installer collects.
 * Hooks, permissions, and other config come from the release template.
 */

import type { PAIConfig } from "./types";
import { PAI_VERSION, ALGORITHM_VERSION } from "./types";

/**
 * Generate a minimal fallback settings.json from installer-collected data.
 * This is merged into (not replacing) the release template.
 */
export function generateSettingsJson(config: PAIConfig): Record<string, any> {
  return {
    env: {
      PAI_DIR: config.paiDir,
      ...(config.projectsDir ? { PROJECTS_DIR: config.projectsDir } : {}),
      PAI_CONFIG_DIR: config.configDir,
    },

    contextFiles: [
      "skills/PAI/SKILL.md",
      "skills/PAI/AISTEERINGRULES.md",
      "skills/PAI/USER/AISTEERINGRULES.md",
      "skills/PAI/USER/DAIDENTITY.md",
    ],

    daidentity: {
      name: config.aiName,
      fullName: `${config.aiName} — Personal AI`,
      displayName: config.aiName.toUpperCase(),
      color: "#3B82F6",
      startupCatchphrase: config.catchphrase,
    },

    principal: {
      name: config.principalName,
      timezone: config.timezone,
    },

    preferences: {
      temperatureUnit: config.temperatureUnit || "fahrenheit",
    },

    pai: {
      repoUrl: "https://github.com/danielmiessler/PAI",
      version: PAI_VERSION,
      algorithmVersion: ALGORITHM_VERSION,
    },
  };
}
