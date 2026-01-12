/**
 * Standardized error handling for pai-multi-llm
 */

import { TEAM_FILE } from "./config";

/**
 * Exit with "no team.yaml" error
 */
export function noTeamError(): never {
  console.error("Error: No team.yaml found.");
  console.error(`Expected at: ${TEAM_FILE}`);
  console.error("");
  console.error("Run the installer to generate team.yaml:");
  console.error("  bun run GenerateTeam.ts");
  process.exit(1);
}

/**
 * Exit with "provider not found" error
 */
export function noProviderError(
  options: { provider?: string; role?: string },
  available: string[]
): never {
  console.error("Error: No matching provider found.");

  if (options.provider) {
    console.error(`  Provider '${options.provider}' not in team.yaml or not available`);
  }
  if (options.role) {
    console.error(`  No provider with role '${options.role}'`);
  }

  console.error("");
  console.error("Available providers:", available.join(", ") || "none");
  process.exit(1);
}

/**
 * Exit with generic error
 */
export function exitWithError(message: string, code = 1): never {
  console.error(`Error: ${message}`);
  process.exit(code);
}

/**
 * Print warning (non-fatal)
 */
export function warn(message: string): void {
  console.error(`Warning: ${message}`);
}
