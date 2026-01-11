#!/usr/bin/env bun

/**
 * check-health - Multi-Backend Health Check
 *
 * Checks connectivity and health of all configured backends.
 * Used by SessionStart hook for availability detection.
 *
 * Usage:
 *   bun run CheckHealth.ts
 *   bun run CheckHealth.ts --format json
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { BackendRegistry } from "../lib/BackendRegistry.js";
import { OllamaBackend } from "../lib/backends/OllamaBackend.js";
import { AnthropicBackend } from "../lib/backends/AnthropicBackend.js";

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
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  try {
    // Load environment variables
    await loadEnv();

    // Initialize backend registry
    const registry = new BackendRegistry();

    // Register available backends
    try {
      const ollama = new OllamaBackend();
      registry.register({
        name: 'ollama',
        backend: ollama,
      });
    } catch (error) {
      // Ollama config invalid, will show as unhealthy
    }

    try {
      const anthropic = new AnthropicBackend();
      registry.register({
        name: 'anthropic',
        backend: anthropic,
      });
    } catch (error) {
      // Anthropic config invalid (no API key), will show as unhealthy
    }

    // Check health of all backends
    const healthResults = await registry.checkAllHealth();

    // Output results
    const output: any = {
      backends: {},
      summary: {
        total: healthResults.size,
        healthy: 0,
        unhealthy: 0,
      },
    };

    for (const [name, health] of healthResults.entries()) {
      output.backends[name] = health;
      if (health.healthy) {
        output.summary.healthy++;
      } else {
        output.summary.unhealthy++;
      }
    }

    // Always output JSON for programmatic use
    console.log(JSON.stringify(output, null, 2));

    // Exit with error if all backends unhealthy
    if (output.summary.healthy === 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      backends: {},
      summary: { total: 0, healthy: 0, unhealthy: 0 },
    }, null, 2));
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}
