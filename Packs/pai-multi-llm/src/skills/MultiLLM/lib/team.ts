/**
 * Team configuration loading and management
 * Shared across all MultiLLM tools
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { TEAM_FILE, CONFIG_DIR } from "./config";
import type { TeamConfig, ProviderConfig } from "../../../types/Provider";

/**
 * Load team configuration from YAML
 */
export function loadTeam(): TeamConfig | null {
  if (!existsSync(TEAM_FILE)) {
    return null;
  }

  try {
    const content = readFileSync(TEAM_FILE, "utf-8");
    return parseYaml(content) as TeamConfig;
  } catch (error) {
    console.error(`Error loading team.yaml: ${error}`);
    return null;
  }
}

/**
 * Save team configuration to YAML
 */
export function saveTeam(team: TeamConfig, path: string = TEAM_FILE): void {
  const dir = path === TEAM_FILE ? CONFIG_DIR : path.substring(0, path.lastIndexOf("/"));

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(path, stringifyYaml(team, { lineWidth: 0 }));
}

/**
 * Check if team.yaml exists
 */
export function teamExists(): boolean {
  return existsSync(TEAM_FILE);
}

/**
 * Find a provider by name
 */
export function findProviderByName(
  team: TeamConfig,
  name: string
): ProviderConfig | undefined {
  return team.providers.find(
    (p) => p.name.toLowerCase() === name.toLowerCase() && p.available
  );
}

/**
 * Find a provider by role
 */
export function findProviderByRole(
  team: TeamConfig,
  role: string
): ProviderConfig | undefined {
  return team.providers.find(
    (p) => p.role.toLowerCase() === role.toLowerCase() && p.available
  );
}

/**
 * Get all available providers
 */
export function getAvailableProviders(team: TeamConfig): ProviderConfig[] {
  return team.providers.filter((p) => p.available);
}

/**
 * Get provider names for display
 */
export function getProviderNames(team: TeamConfig): string[] {
  return team.providers.filter((p) => p.available).map((p) => p.name);
}
