/**
 * JIRA CLI Configuration and Profile Management
 *
 * Supports multiple Jira instances via profile-based .env files.
 * Profile directories (checked in order):
 *   1. ~/.claude/jira/profiles/*.env (preferred, persistent)
 *   2. bin/jira/profiles/*.env (fallback, local)
 * Default profile: profiles/default (symlink)
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, lstatSync, readlinkSync } from "fs";
import { join, dirname, basename } from "path";
import { homedir } from "os";

export interface JiraConfig {
  url: string;
  username: string;
  apiToken: string;
  defaultProject?: string;
  projects?: string[];  // Projects this profile handles (for auto-detection)
  profileName: string;
}

export interface ProfileInfo {
  name: string;
  url: string;
  isDefault: boolean;
}

// Profile directories: check ~/.claude/jira/profiles/ first, then local ./profiles/
const HOME_PROFILES_DIR = join(homedir(), ".claude", "jira", "profiles");
const LOCAL_PROFILES_DIR = join(dirname(import.meta.path), "..", "profiles");

/**
 * Get the active profiles directory.
 * Prefers ~/.claude/jira/profiles/ if it exists and has .env files,
 * otherwise falls back to local ./profiles/
 */
export function getProfilesDir(): string {
  // Check home directory first
  if (existsSync(HOME_PROFILES_DIR)) {
    const files = readdirSync(HOME_PROFILES_DIR);
    const hasProfiles = files.some(f => f.endsWith(".env") || f === "default");
    if (hasProfiles) {
      return HOME_PROFILES_DIR;
    }
  }
  // Fall back to local profiles
  return LOCAL_PROFILES_DIR;
}

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
  const profilesDir = getProfilesDir();
  const defaultPath = join(profilesDir, "default");

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
  const profilesDir = getProfilesDir();
  const profilePath = join(profilesDir, `${profileName}.env`);

  if (!existsSync(profilePath)) {
    const available = listProfiles();
    const profileList = available.map(p => p.name).join(", ");
    throw new Error(
      `Profile not found: ${profileName}\n` +
      `Available profiles: ${profileList || "(none)"}\n` +
      `Create a profile in: ${profilesDir}/`
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

  // Parse JIRA_PROJECTS if present
  const projects = env.JIRA_PROJECTS
    ? env.JIRA_PROJECTS.split(",").map(p => p.trim().toUpperCase()).filter(Boolean)
    : undefined;

  return {
    url: env.JIRA_URL.replace(/\/$/, ""), // Remove trailing slash
    username: env.JIRA_USERNAME,
    apiToken: env.JIRA_API_TOKEN,
    defaultProject: env.JIRA_DEFAULT_PROJECT,
    projects,
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
    "1. Create a profile in ~/.claude/jira/profiles/ (recommended, persistent)\n" +
    "2. Or in local profiles/ directory\n" +
    "3. Set default: cd ~/.claude/jira/profiles && ln -s personal.env default\n" +
    "4. Or set environment variables: JIRA_URL, JIRA_USERNAME, JIRA_API_TOKEN"
  );
}

/**
 * List all available profiles
 */
export function listProfiles(): ProfileInfo[] {
  const profilesDir = getProfilesDir();
  if (!existsSync(profilesDir)) return [];

  const defaultProfile = getDefaultProfileName();
  const profiles: ProfileInfo[] = [];

  for (const file of readdirSync(profilesDir)) {
    if (!file.endsWith(".env")) continue;
    if (file === "default") continue; // Skip symlink

    const name = file.replace(/\.env$/, "");
    const profilePath = join(profilesDir, file);

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

/**
 * Find which profile handles a given project key.
 * Checks JIRA_PROJECTS in each profile, then falls back to cache.
 */
export function getProfileForProject(projectKey: string): string | undefined {
  const key = projectKey.toUpperCase();

  // First check configured JIRA_PROJECTS in each profile
  const profiles = listProfiles();
  for (const profile of profiles) {
    try {
      const config = loadProfile(profile.name);
      if (config.projects?.includes(key)) {
        // Also cache for faster future lookups
        cacheProjectProfile(key, profile.name);
        return profile.name;
      }
    } catch {
      // Skip profiles that fail to load
    }
  }

  // Fall back to runtime cache (populated from previous searches)
  return getCachedProfile(key);
}

/**
 * Write JIRA_PROJECTS to a profile .env file.
 * Preserves existing content, updates or adds JIRA_PROJECTS line.
 */
export function writeProfileProjects(profileName: string, projects: string[]): void {
  const profilesDir = getProfilesDir();
  const profilePath = join(profilesDir, `${profileName}.env`);

  if (!existsSync(profilePath)) {
    throw new Error(`Profile not found: ${profileName}`);
  }

  const content = readFileSync(profilePath, "utf-8");
  const projectsLine = `JIRA_PROJECTS=${projects.join(",")}`;

  // Check if JIRA_PROJECTS already exists
  const lines = content.split("\n");
  let found = false;
  const newLines = lines.map(line => {
    if (line.startsWith("JIRA_PROJECTS=")) {
      found = true;
      return projectsLine;
    }
    return line;
  });

  if (!found) {
    // Add after JIRA_DEFAULT_PROJECT or at the end
    const insertIndex = newLines.findIndex(l => l.startsWith("JIRA_DEFAULT_PROJECT="));
    if (insertIndex >= 0) {
      newLines.splice(insertIndex + 1, 0, projectsLine);
    } else {
      // Add at end, ensuring newline
      if (newLines[newLines.length - 1] !== "") {
        newLines.push("");
      }
      newLines.push(projectsLine);
    }
  }

  writeFileSync(profilePath, newLines.join("\n"));
}
