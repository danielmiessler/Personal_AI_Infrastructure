/**
 * JIRA CLI Configuration and Profile Management
 *
 * Supports multiple Jira instances via profile-based .env files.
 * Profile directory: bin/jira/profiles/*.env
 * Default profile: profiles/default (symlink)
 */

import { existsSync, readdirSync, readFileSync, lstatSync, readlinkSync } from "fs";
import { join, dirname, basename } from "path";

export interface JiraConfig {
  url: string;
  username: string;
  apiToken: string;
  defaultProject?: string;
  profileName: string;
}

export interface ProfileInfo {
  name: string;
  url: string;
  isDefault: boolean;
}

const PROFILES_DIR = join(dirname(import.meta.path), "..", "profiles");
const REQUIRED_VARS = ["JIRA_URL", "JIRA_USERNAME", "JIRA_API_TOKEN"];

/**
 * Parse a .env file into key-value pairs
 */
function parseEnvFile(filePath: string): Record<string, string> {
  const content = readFileSync(filePath, "utf-8");
  const env: Record<string, string> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

/**
 * Get the default profile name (resolves symlink)
 */
function getDefaultProfileName(): string | null {
  const defaultPath = join(PROFILES_DIR, "default");

  if (!existsSync(defaultPath)) return null;

  try {
    const stats = lstatSync(defaultPath);
    if (stats.isSymbolicLink()) {
      const target = readlinkSync(defaultPath);
      return basename(target).replace(/\.env$/, "");
    }
    // If it's a regular file named "default", treat it as the default
    return "default";
  } catch {
    return null;
  }
}

/**
 * Load configuration from a specific profile
 */
export function loadProfile(profileName: string): JiraConfig {
  const profilePath = join(PROFILES_DIR, `${profileName}.env`);

  if (!existsSync(profilePath)) {
    const available = listProfiles();
    const profileList = available.map(p => p.name).join(", ");
    throw new Error(
      `Profile not found: ${profileName}\n` +
      `Available profiles: ${profileList || "(none)"}\n` +
      `Create a profile in: ${PROFILES_DIR}/`
    );
  }

  const env = parseEnvFile(profilePath);

  // Check required variables
  const missing = REQUIRED_VARS.filter(v => !env[v]);
  if (missing.length > 0) {
    throw new Error(
      `Profile '${profileName}' missing required variables: ${missing.join(", ")}\n` +
      `See profiles.example/example.env for template`
    );
  }

  return {
    url: env.JIRA_URL.replace(/\/$/, ""), // Remove trailing slash
    username: env.JIRA_USERNAME,
    apiToken: env.JIRA_API_TOKEN,
    defaultProject: env.JIRA_DEFAULT_PROJECT,
    profileName,
  };
}

/**
 * Load configuration from environment variables (fallback)
 */
export function loadFromEnv(): JiraConfig | null {
  const url = process.env.JIRA_URL;
  const username = process.env.JIRA_USERNAME;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!url || !username || !apiToken) return null;

  return {
    url: url.replace(/\/$/, ""),
    username,
    apiToken,
    defaultProject: process.env.JIRA_DEFAULT_PROJECT,
    profileName: "env",
  };
}

/**
 * Get configuration for the specified profile, default profile, or env vars
 */
export function getConfig(profileName?: string): JiraConfig {
  // Explicit profile requested
  if (profileName && profileName !== "all") {
    return loadProfile(profileName);
  }

  // Try default profile
  const defaultProfile = getDefaultProfileName();
  if (defaultProfile) {
    return loadProfile(defaultProfile);
  }

  // Fall back to environment variables
  const envConfig = loadFromEnv();
  if (envConfig) {
    return envConfig;
  }

  throw new Error(
    "No Jira configuration found.\n\n" +
    "Options:\n" +
    "1. Create a profile: cp profiles.example/example.env profiles/personal.env\n" +
    "2. Set default: cd profiles && ln -s personal.env default\n" +
    "3. Or set environment variables: JIRA_URL, JIRA_USERNAME, JIRA_API_TOKEN"
  );
}

/**
 * List all available profiles
 */
export function listProfiles(): ProfileInfo[] {
  if (!existsSync(PROFILES_DIR)) return [];

  const defaultProfile = getDefaultProfileName();
  const profiles: ProfileInfo[] = [];

  for (const file of readdirSync(PROFILES_DIR)) {
    if (!file.endsWith(".env")) continue;
    if (file === "default") continue; // Skip symlink

    const name = file.replace(/\.env$/, "");
    const profilePath = join(PROFILES_DIR, file);

    try {
      const env = parseEnvFile(profilePath);
      profiles.push({
        name,
        url: env.JIRA_URL || "(not configured)",
        isDefault: name === defaultProfile,
      });
    } catch {
      profiles.push({
        name,
        url: "(error reading profile)",
        isDefault: false,
      });
    }
  }

  return profiles.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get all profile configs (for federated search)
 */
export function getAllConfigs(): JiraConfig[] {
  const profiles = listProfiles();
  return profiles.map(p => loadProfile(p.name));
}

/**
 * Project-to-profile cache for auto-detection
 */
const projectProfileCache = new Map<string, string>();

export function cacheProjectProfile(projectKey: string, profileName: string): void {
  projectProfileCache.set(projectKey.toUpperCase(), profileName);
}

export function getCachedProfile(projectKey: string): string | undefined {
  return projectProfileCache.get(projectKey.toUpperCase());
}

export function getProjectKeyFromIssue(issueKey: string): string {
  const match = issueKey.match(/^([A-Z][A-Z0-9]*)-\d+$/i);
  return match ? match[1].toUpperCase() : "";
}
