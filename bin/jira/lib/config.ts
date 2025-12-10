/**
 * Configuration management for jira CLI
 * Supports multiple Jira projects (work, personal, etc.)
 * Reads from environment variables, .env files, and projects.json
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface JiraProject {
  key: string;
  url: string;
  description?: string;
  envPrefix: string;
}

export interface ProjectsConfig {
  default: string;
  projects: Record<string, JiraProject>;
}

export interface JiraCredentials {
  url: string;
  email: string;
  token: string;
  projectKey: string;
}

export interface Config {
  projectsConfig: ProjectsConfig;
  defaultProject: string;
  cacheDir: string;
}

let cachedConfig: Config | null = null;
let cachedEnv: Record<string, string> | null = null;

/**
 * Load environment variables from a .env file
 */
function loadEnvFile(path: string): Record<string, string> {
  const env: Record<string, string> = {};

  if (existsSync(path)) {
    try {
      const lines = readFileSync(path, "utf-8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const [key, ...valueParts] = trimmed.split("=");
          if (key && valueParts.length > 0) {
            // Remove surrounding quotes if present
            let value = valueParts.join("=").trim();
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            env[key.trim()] = value;
          }
        }
      }
    } catch (error) {
      // Ignore errors reading config
    }
  }

  return env;
}

/**
 * Load environment variables from all config sources
 */
function loadAllEnv(): Record<string, string> {
  if (cachedEnv) return cachedEnv;

  const fabricEnvPath = join(homedir(), ".config", "fabric", ".env");
  const claudeEnvPath = join(homedir(), ".claude", ".env");

  // Load in reverse priority order (later overwrites earlier)
  const fabricEnv = loadEnvFile(fabricEnvPath);
  const claudeEnv = loadEnvFile(claudeEnvPath);

  cachedEnv = { ...fabricEnv, ...claudeEnv };
  return cachedEnv;
}

/**
 * Get environment variable from process.env or loaded .env files
 */
function getEnvVar(key: string): string | undefined {
  return process.env[key] || loadAllEnv()[key];
}

/**
 * Load projects configuration from projects.json
 */
function loadProjectsConfig(): ProjectsConfig {
  // Look for projects.json in skill directory
  const paiDir = getEnvVar("PAI_DIR") || join(homedir(), ".claude");
  const projectsJsonPath = join(paiDir, "skills", "Jira", "projects.json");

  const defaultConfig: ProjectsConfig = {
    default: "work",
    projects: {
      work: {
        key: "PROJ",
        url: "https://your-company.atlassian.net",
        description: "Work project",
        envPrefix: "JIRA_WORK",
      },
    },
  };

  if (!existsSync(projectsJsonPath)) {
    console.error(`Warning: projects.json not found at ${projectsJsonPath}`);
    console.error("Using default configuration. Please create projects.json.");
    return defaultConfig;
  }

  try {
    const content = readFileSync(projectsJsonPath, "utf-8");
    return JSON.parse(content) as ProjectsConfig;
  } catch (error) {
    console.error(`Error reading projects.json: ${error}`);
    return defaultConfig;
  }
}

/**
 * Get configuration, loading from environment and config files
 */
export function getConfig(): Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  const projectsConfig = loadProjectsConfig();
  const cacheDir = join(homedir(), ".cache", "jira");

  cachedConfig = {
    projectsConfig,
    defaultProject: projectsConfig.default,
    cacheDir,
  };

  return cachedConfig;
}

/**
 * Get credentials for a specific project
 */
export function getCredentials(projectAlias?: string): JiraCredentials {
  const config = getConfig();
  const alias = projectAlias || config.defaultProject;

  const project = config.projectsConfig.projects[alias];
  if (!project) {
    const available = Object.keys(config.projectsConfig.projects).join(", ");
    throw new Error(`Unknown project: ${alias}. Available: ${available}`);
  }

  const prefix = project.envPrefix;
  const url = getEnvVar(`${prefix}_URL`) || project.url;
  const email = getEnvVar(`${prefix}_EMAIL`);
  const token = getEnvVar(`${prefix}_TOKEN`);

  if (!email) {
    throw new Error(`Missing ${prefix}_EMAIL environment variable`);
  }
  if (!token) {
    throw new Error(`Missing ${prefix}_TOKEN environment variable`);
  }

  return {
    url: url.replace(/\/$/, ""), // Remove trailing slash
    email,
    token,
    projectKey: project.key,
  };
}

/**
 * List all configured projects
 */
export function listProjects(): Array<{
  alias: string;
  key: string;
  url: string;
  description?: string;
  isDefault: boolean;
}> {
  const config = getConfig();

  return Object.entries(config.projectsConfig.projects).map(([alias, project]) => ({
    alias,
    key: project.key,
    url: project.url,
    description: project.description,
    isDefault: alias === config.defaultProject,
  }));
}

/**
 * Validate that credentials are available for a project
 */
export function validateCredentials(projectAlias?: string): void {
  try {
    getCredentials(projectAlias);
  } catch (error) {
    throw error;
  }
}
