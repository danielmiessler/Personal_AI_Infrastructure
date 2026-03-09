/**
 * PAI Installer v4.0 — Validation
 * Verifies installation completeness after all steps run.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { InstallState, ValidationCheck, InstallSummary } from "./types";
import { PAI_VERSION } from "./types";
import { homedir } from "os";

/**
 * Run all validation checks against the current state.
 */
export function runValidation(state: InstallState): ValidationCheck[] {
  const paiDir = state.detection?.paiDir || join(homedir(), ".claude");
  const configDir = state.detection?.configDir || join(homedir(), ".config", "PAI");
  const checks: ValidationCheck[] = [];

  // 1. settings.json exists and is valid JSON
  const settingsPath = join(paiDir, "settings.json");
  const settingsExists = existsSync(settingsPath);
  let settingsValid = false;
  let settings: any = null;

  if (settingsExists) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
      settingsValid = true;
    } catch {
      settingsValid = false;
    }
  }

  checks.push({
    name: "settings.json",
    passed: settingsExists && settingsValid,
    detail: settingsValid
      ? "Valid configuration file"
      : settingsExists
        ? "File exists but invalid JSON"
        : "File not found",
    critical: true,
  });

  // 2. Required settings fields
  if (settings) {
    checks.push({
      name: "Principal name",
      passed: !!settings.principal?.name,
      detail: settings.principal?.name ? `Set to: ${settings.principal.name}` : "Not configured",
      critical: true,
    });

    checks.push({
      name: "AI identity",
      passed: !!settings.daidentity?.name,
      detail: settings.daidentity?.name ? `Set to: ${settings.daidentity.name}` : "Not configured",
      critical: true,
    });

    checks.push({
      name: "PAI version",
      passed: !!settings.pai?.version,
      detail: settings.pai?.version ? `v${settings.pai.version}` : "Not set",
      critical: false,
    });

    checks.push({
      name: "Timezone",
      passed: !!settings.principal?.timezone,
      detail: settings.principal?.timezone || "Not configured",
      critical: false,
    });
  }

  // 3. Directory structure
  const requiredDirs = [
    { path: "skills", name: "Skills directory" },
    { path: "MEMORY", name: "Memory directory" },
    { path: "MEMORY/STATE", name: "State directory" },
    { path: "MEMORY/WORK", name: "Work directory" },
    { path: "hooks", name: "Hooks directory" },
    { path: "Plans", name: "Plans directory" },
  ];

  for (const dir of requiredDirs) {
    const fullPath = join(paiDir, dir.path);
    checks.push({
      name: dir.name,
      passed: existsSync(fullPath),
      detail: existsSync(fullPath) ? "Present" : "Missing",
      critical: dir.path === "skills" || dir.path === "MEMORY",
    });
  }

  // 4. PAI skill present
  const skillPath = join(paiDir, "skills", "PAI", "SKILL.md");
  checks.push({
    name: "PAI core skill",
    passed: existsSync(skillPath),
    detail: existsSync(skillPath) ? "Present" : "Not found — clone PAI repo to enable",
    critical: false,
  });

  // 5. Zsh alias configured
  const zshrcPath = join(homedir(), ".zshrc");
  let aliasConfigured = false;
  if (existsSync(zshrcPath)) {
    try {
      const zshContent = readFileSync(zshrcPath, "utf-8");
      aliasConfigured = zshContent.includes("# PAI alias") && zshContent.includes("alias pai=");
    } catch {}
  }

  checks.push({
    name: "Shell alias (pai)",
    passed: aliasConfigured,
    detail: aliasConfigured ? "Configured in .zshrc" : "Not found — run: source ~/.zshrc",
    critical: true,
  });

  return checks;
}

/**
 * Generate install summary from state.
 */
export function generateSummary(state: InstallState): InstallSummary {
  return {
    paiVersion: PAI_VERSION,
    principalName: state.collected.principalName || "User",
    aiName: state.collected.aiName || "PAI",
    timezone: state.collected.timezone || "UTC",
    catchphrase: state.collected.catchphrase || "",
    installType: state.installType || "fresh",
    completedSteps: state.completedSteps.length,
    totalSteps: 7,
  };
}
