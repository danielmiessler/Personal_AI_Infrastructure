/**
 * Processing Profile System
 *
 * Allows users to define their own note-taking workflow:
 * - Tag taxonomy
 * - File naming patterns
 * - Fabric patterns to apply
 * - Processing stages (raw → wisdom, or single output)
 *
 * Profiles stored in: ~/.config/pai/profiles/
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface ProcessingProfile {
  name: string;
  description: string;

  // Tag configuration
  tags: {
    // Processing status tags
    status: {
      incoming: string;      // e.g., "incoming"
      raw: string;           // e.g., "raw"
      processed: string;     // e.g., "fabric-extraction"
      wisdom: string;        // e.g., "wisdom"
      main: string;          // e.g., "main"
    };
    // Content source tags (format: "source/{type}")
    sourcePrefix: string;    // e.g., "source" → "source/telegram"
    // Project tag prefix
    projectPrefix: string;   // e.g., "project" → "project/my-project"
    // People tag format
    personFormat: "snake_case" | "kebab-case" | "CamelCase";
  };

  // File naming
  naming: {
    dateFormat: string;      // e.g., "%Y-%m-%d"
    suffixes: {
      raw: string;           // e.g., "-Raw"
      wisdom: string;        // e.g., "-Wisdom"
      transcript: string;    // e.g., "-Transcript"
    };
    includeSource: boolean;  // Add source to filename? e.g., "-Telegram-Raw"
  };

  // Processing pipeline
  processing: {
    // Create paired files (Raw + Wisdom) or single output?
    pairedOutput: boolean;
    // Fabric patterns to apply
    patterns: {
      voice: string[];       // e.g., ["extract_wisdom"]
      url: string[];         // e.g., ["extract_article_wisdom"]
      text: string[];        // e.g., []  (no processing)
      document: string[];    // e.g., ["summarize"]
    };
    // Add backlinks between paired files?
    addBacklinks: boolean;
  };

  // Auto-tagging rules
  autoTag: {
    // Keywords to project mapping
    projectKeywords: Record<string, string[]>;  // { "project/pai": ["claude", "kai", "fabric"] }
    // Person name detection enabled?
    detectPeople: boolean;
    // Known people for detection
    knownPeople: string[];   // e.g., ["Ed Overy", "Daniel Miessler"]
  };
}

/**
 * Default profile based on user's current workflow
 */
export const DEFAULT_PROFILE: ProcessingProfile = {
  name: "zettelkasten",
  description: "Zettelkasten-inspired workflow with Raw+Wisdom pairs",

  tags: {
    status: {
      incoming: "incoming",
      raw: "raw",
      processed: "fabric-extraction",
      wisdom: "wisdom",
      main: "main",
    },
    sourcePrefix: "source",
    projectPrefix: "project",
    personFormat: "snake_case",
  },

  naming: {
    dateFormat: "%Y-%m-%d",
    suffixes: {
      raw: "-Raw",
      wisdom: "-Wisdom",
      transcript: "-Transcript",
    },
    includeSource: true,
  },

  processing: {
    pairedOutput: true,
    patterns: {
      voice: ["extract_wisdom"],
      url: ["extract_article_wisdom"],
      text: [],
      document: ["summarize"],
    },
    addBacklinks: true,
  },

  autoTag: {
    projectKeywords: {},
    detectPeople: true,
    knownPeople: [],
  },
};

/**
 * Simple profile for users who want single output files
 */
export const SIMPLE_PROFILE: ProcessingProfile = {
  name: "simple",
  description: "Simple workflow with single processed output",

  tags: {
    status: {
      incoming: "inbox",
      raw: "raw",
      processed: "processed",
      wisdom: "processed",
      main: "main",
    },
    sourcePrefix: "from",
    projectPrefix: "project",
    personFormat: "snake_case",
  },

  naming: {
    dateFormat: "%Y-%m-%d",
    suffixes: {
      raw: "",
      wisdom: "",
      transcript: "",
    },
    includeSource: false,
  },

  processing: {
    pairedOutput: false,
    patterns: {
      voice: ["summarize"],
      url: ["summarize"],
      text: [],
      document: ["summarize"],
    },
    addBacklinks: false,
  },

  autoTag: {
    projectKeywords: {},
    detectPeople: false,
    knownPeople: [],
  },
};

/**
 * Load user's profile
 */
export function loadProfile(profileName?: string): ProcessingProfile {
  const name = profileName || process.env.INGEST_PROFILE || "default";

  // Profile search paths (in order of priority)
  const searchPaths = [
    join(homedir(), ".config", "pai", "profiles"),
    join(homedir(), ".config", "fabric", "profiles"),
    join(__dirname, "..", "profiles"), // Built-in profiles in repo
  ];

  // Built-in profiles (if no custom file found)
  const builtins: Record<string, ProcessingProfile> = {
    simple: SIMPLE_PROFILE,
    zettelkasten: DEFAULT_PROFILE,
    default: DEFAULT_PROFILE,
  };

  // Search for profile file
  for (const dir of searchPaths) {
    const profilePath = join(dir, `${name}.json`);
    if (existsSync(profilePath)) {
      try {
        const content = readFileSync(profilePath, "utf-8");
        return JSON.parse(content) as ProcessingProfile;
      } catch (e) {
        console.warn(`Warning: Could not load profile from ${profilePath}`);
      }
    }
  }

  // Fallback to built-in
  if (name in builtins) {
    return builtins[name];
  }

  console.warn(`Profile '${name}' not found, using default`);
  return DEFAULT_PROFILE;
}

/**
 * Generate tags for a processed message
 */
export function generateTags(
  profile: ProcessingProfile,
  options: {
    contentType: "voice" | "url" | "text" | "document" | "photo";
    source: string;         // e.g., "telegram"
    isRaw: boolean;
    isWisdom: boolean;
    detectedPeople?: string[];
    detectedProjects?: string[];
  }
): string[] {
  const tags: string[] = [];

  // Status tags
  tags.push(profile.tags.status.incoming);
  if (options.isRaw) tags.push(profile.tags.status.raw);
  if (options.isWisdom) {
    tags.push(profile.tags.status.processed);
    tags.push(profile.tags.status.wisdom);
  }

  // Source tag
  if (profile.tags.sourcePrefix) {
    tags.push(`${profile.tags.sourcePrefix}/${options.source}`);
  }

  // People tags
  if (options.detectedPeople) {
    for (const person of options.detectedPeople) {
      const formatted = formatPersonName(person, profile.tags.personFormat);
      tags.push(formatted);
    }
  }

  // Project tags
  if (options.detectedProjects) {
    for (const project of options.detectedProjects) {
      tags.push(`${profile.tags.projectPrefix}/${project}`);
    }
  }

  return [...new Set(tags)]; // Deduplicate
}

/**
 * Format person name according to profile setting
 */
function formatPersonName(
  name: string,
  format: "snake_case" | "kebab-case" | "CamelCase"
): string {
  const parts = name.toLowerCase().split(/\s+/);

  switch (format) {
    case "snake_case":
      return parts.join("_");
    case "kebab-case":
      return parts.join("-");
    case "CamelCase":
      return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
    default:
      return parts.join("_");
  }
}

/**
 * Generate filename based on profile
 */
export function generateFilename(
  profile: ProcessingProfile,
  options: {
    title: string;
    date: Date;
    source?: string;
    suffix: "raw" | "wisdom" | "transcript" | "none";
  }
): string {
  const dateStr = formatDate(options.date, profile.naming.dateFormat);
  let filename = `${dateStr}-${sanitizeFilename(options.title)}`;

  if (profile.naming.includeSource && options.source) {
    filename += `-${capitalize(options.source)}`;
  }

  if (options.suffix !== "none") {
    const suffixStr = profile.naming.suffixes[options.suffix];
    if (suffixStr) {
      filename += suffixStr;
    }
  }

  return `${filename}.md`;
}

function formatDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return format
    .replace("%Y", String(year))
    .replace("%m", month)
    .replace("%d", day);
}

function sanitizeFilename(title: string): string {
  return title
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
