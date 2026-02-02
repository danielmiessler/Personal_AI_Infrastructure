/**
 * Shared configuration for pai-multi-llm
 * Single source of truth for all paths and constants
 */

import { readFileSync, existsSync } from "fs";
import { parse as parseYaml } from "yaml";
import type { ProviderConfig } from "../../../types/Provider";

export const PAI_DIR = process.env.PAI_DIR || `${process.env.HOME}/.claude`;
export const CONFIG_DIR = `${PAI_DIR}/config`;
export const TEAM_FILE = `${CONFIG_DIR}/team.yaml`;
export const EXAMPLE_FILE = `${CONFIG_DIR}/team.example.yaml`;
export const SESSIONS_DIR = `${PAI_DIR}/multi-llm/sessions`;
export const SESSIONS_FILE = `${SESSIONS_DIR}/active-sessions.json`;

// Providers to detect
export const PROVIDERS_TO_DETECT = [
  "claude",
  "codex",
  "gemini",
  "ollama",
  "opencode",
] as const;

export type ProviderName = (typeof PROVIDERS_TO_DETECT)[number];

// Team defaults config types
export interface RoleConfig {
  role: string;
  use_for: string[];
}

export interface TeamDefaultsConfig {
  provider_roles: Record<string, RoleConfig>;
  ollama_model_roles: Record<string, RoleConfig>;
  session_configs: Record<string, ProviderConfig["session"]>;
  ollama_default_role: RoleConfig;
  provider_default_role: RoleConfig;
}

// Load team defaults from YAML
const CONFIG_PATH = `${import.meta.dir}/../config/team-defaults.yaml`;

let cachedDefaults: TeamDefaultsConfig | null = null;

export function loadTeamDefaults(): TeamDefaultsConfig {
  if (cachedDefaults) return cachedDefaults;

  if (existsSync(CONFIG_PATH)) {
    cachedDefaults = parseYaml(readFileSync(CONFIG_PATH, "utf-8"));
    return cachedDefaults!;
  }

  throw new Error(`Team defaults config not found: ${CONFIG_PATH}`);
}
