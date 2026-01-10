#!/usr/bin/env bun

/**
 * check-health - Ollama Health Check CLI
 *
 * Verify Ollama server connectivity and status.
 * Used by SessionStart hook to ensure Ollama availability.
 *
 * Usage:
 *   bun run CheckHealth.ts
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

// ============================================================================
// Environment Loading
// ============================================================================

async function loadEnv(): Promise<void> {
  const paiDir = process.env.PAI_DIR || resolve(process.env.HOME!, '.config/pai');
  const envPaths = [
    resolve(paiDir, '.env'),
    resolve(process.env.HOME!, '.claude/.env'),
  ];

  for (const envPath of envPaths) {
    try {
      const envContent = await readFile(envPath, 'utf-8');
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
      break;
    } catch {
      continue;
    }
  }
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULTS = {
  baseUrl: 'http://localhost:11434',
  timeout: 3000,
};

// ============================================================================
// Health Check
// ============================================================================

async function checkHealth(baseUrl: string, timeout: number): Promise<boolean> {
  const url = `${baseUrl}/api/tags`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    return response.ok;
  } catch (error: any) {
    return false;
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  // Load environment variables
  await loadEnv();

  // Get configuration
  const baseUrl = process.env.OLLAMA_BASE_URL || DEFAULTS.baseUrl;
  const timeout = DEFAULTS.timeout;

  // Check health
  const isHealthy = await checkHealth(baseUrl, timeout);

  if (isHealthy) {
    // Silent success (hooks should be quiet when everything works)
    process.exit(0);
  } else {
    // Silent failure (don't spam on startup if Ollama not running)
    // The tools will show proper errors when actually used
    process.exit(0);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}
