/**
 * Configuration loader for SecondBrain
 * Loads YAML config files with fallback to defaults
 */

import { existsSync, readFileSync } from "fs";
import { parse as parseYaml } from "yaml";

// Paths
export const PAI_DIR = process.env.PAI_DIR || `${process.env.HOME}/.claude`;
export const SKILL_DIR = `${PAI_DIR}/skills/SecondBrain`;
export const CONFIG_DIR = `${SKILL_DIR}/config`;
export const DEBATES_DIR = `${PAI_DIR}/second-brain/debates`;

// PARA Vault
export const PARA_VAULT = process.env.PARA_VAULT || "";

/**
 * Load a YAML config file with defaults
 */
export function loadConfig<T>(filename: string, defaults: T): T {
  const configPath = `${CONFIG_DIR}/${filename}`;

  if (!existsSync(configPath)) {
    return defaults;
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const parsed = parseYaml(content);
    return { ...defaults, ...parsed };
  } catch (error) {
    console.error(`Warning: Failed to load ${filename}, using defaults`);
    return defaults;
  }
}

// ============================================================================
// Perspective Configuration
// ============================================================================

export interface Perspective {
  name: string;
  description: string;
  stance: string;
  prompt: string;
}

export interface PerspectivesConfig {
  perspectives: Record<string, Perspective>;
  templates: Record<string, string[]>;
}

const DEFAULT_PERSPECTIVES: PerspectivesConfig = {
  perspectives: {
    optimist: {
      name: "The Optimist",
      description: "Focuses on opportunities and benefits",
      stance: "advocate",
      prompt: 'You are arguing FROM THE OPTIMIST PERSPECTIVE on: "{topic}"',
    },
    pessimist: {
      name: "The Pessimist",
      description: "Focuses on risks and problems",
      stance: "critic",
      prompt: 'You are arguing FROM THE PESSIMIST PERSPECTIVE on: "{topic}"',
    },
    pragmatist: {
      name: "The Pragmatist",
      description: "Balances idealism with practicality",
      stance: "moderator",
      prompt: 'You are arguing FROM THE PRAGMATIST PERSPECTIVE on: "{topic}"',
    },
    contrarian: {
      name: "The Contrarian",
      description: "Challenges assumptions",
      stance: "devil_advocate",
      prompt: 'You are THE CONTRARIAN on: "{topic}"',
    },
  },
  templates: {
    decision: ["optimist", "pessimist", "contrarian"],
    strategic: ["optimist", "pessimist", "pragmatist", "contrarian"],
    technical: ["analyst", "pragmatist", "contrarian"],
    binary: ["optimist", "pessimist", "pragmatist"],
  },
};

export function loadPerspectives(): PerspectivesConfig {
  return loadConfig("perspectives.yaml", DEFAULT_PERSPECTIVES);
}

// ============================================================================
// Complexity Rules Configuration
// ============================================================================

export interface ComplexityRule {
  pattern: string;
  weight: number;
  category: string;
}

export interface ComplexityConfig {
  rules: {
    complex: ComplexityRule[];
    medium: ComplexityRule[];
    simple: ComplexityRule[];
  };
  thresholds: {
    simple: { max_score: number; agents: number };
    medium: { max_score: number; agents: number };
    complex: { max_score: number; agents: number };
  };
  multipliers: {
    complex: number;
    medium: number;
    simple: number;
  };
}

const DEFAULT_COMPLEXITY: ComplexityConfig = {
  rules: {
    complex: [
      { pattern: "should\\s+i", weight: 3, category: "decision" },
      { pattern: "should\\s+we", weight: 3, category: "decision" },
    ],
    medium: [
      { pattern: "analyze", weight: 2, category: "analysis" },
      { pattern: "how\\s+(do|can|should)", weight: 1, category: "how-to" },
    ],
    simple: [
      { pattern: "what\\s+is", weight: 1, category: "lookup" },
      { pattern: "show\\s+me", weight: 1, category: "lookup" },
    ],
  },
  thresholds: {
    simple: { max_score: 2, agents: 1 },
    medium: { max_score: 5, agents: 2 },
    complex: { max_score: 999, agents: 3 },
  },
  multipliers: {
    complex: 2,
    medium: 1.5,
    simple: 1,
  },
};

export function loadComplexityRules(): ComplexityConfig {
  return loadConfig("complexity-rules.yaml", DEFAULT_COMPLEXITY);
}

// ============================================================================
// PARA Categories
// ============================================================================

export interface PARAConfig {
  categories: Record<string, string[]>;
}

const DEFAULT_PARA: PARAConfig = {
  categories: {
    inbox: ["_00_Inbox", "00_Inbox", "Inbox"],
    projects: ["_01_Projects", "01_Projects", "Projects"],
    areas: ["_02_Areas", "02_Areas", "Areas"],
    resources: ["_03_Resources", "03_Resources", "Resources"],
    archives: ["_04_Archives", "04_Archives", "Archives"],
  },
};

export function loadPARAConfig(): PARAConfig {
  return loadConfig("para.yaml", DEFAULT_PARA);
}

// ============================================================================
// Vault Configuration Helper
// ============================================================================

export function getVaultRoot(): string | null {
  // Check environment variable first
  if (PARA_VAULT) return PARA_VAULT;

  // Try to load from para-mapping.yaml
  const mappingPath = `${PAI_DIR}/config/para-mapping.yaml`;
  if (existsSync(mappingPath)) {
    try {
      const content = readFileSync(mappingPath, "utf-8");
      const config = parseYaml(content);
      if (config.vault_root) return config.vault_root;
    } catch {}
  }

  return null;
}
