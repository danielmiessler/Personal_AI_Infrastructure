#!/usr/bin/env bun
/**
 * Check health of the configured observability provider
 */

import { getObservabilityProvider } from 'kai-observability-core';

async function main() {
  try {
    const provider = await getObservabilityProvider();
    const health = await provider.healthCheck();

    console.log(`Provider: ${provider.name} v${provider.version}`);
    console.log(`Status: ${health.healthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    if (health.message) {
      console.log(`Message: ${health.message}`);
    }
    if (health.latencyMs !== undefined) {
      console.log(`Latency: ${health.latencyMs}ms`);
    }
    if (health.details) {
      console.log(`Details: ${JSON.stringify(health.details)}`);
    }

    process.exit(health.healthy ? 0 : 1);
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

main();
