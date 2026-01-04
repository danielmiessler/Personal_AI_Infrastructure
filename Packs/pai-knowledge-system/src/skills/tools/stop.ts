#!/usr/bin/env bun
/**
 * Stop PAI Knowledge System containers
 *
 * Stops both MCP server and FalkorDB containers.
 */

import { createContainerManager, ContainerManager } from "../lib/container.js";
import { cli } from "../lib/cli.js";

/**
 * Main stop function
 */
async function main() {
  cli.header("PAI Knowledge System - Stop");

  // Create container manager
  const containerManager = createContainerManager();

  // Check if runtime is available
  if (!containerManager.isRuntimeAvailable()) {
    cli.error("No container runtime found!");
    process.exit(1);
  }

  cli.info("Stopping PAI Knowledge System...");
  cli.blank();

  // Container names
  const FALKORDB_CONTAINER = ContainerManager.FALKORDB_CONTAINER;
  const MCP_CONTAINER = ContainerManager.MCP_CONTAINER;

  // Stop MCP server container first
  const mcpRunning = await containerManager.isContainerRunning(MCP_CONTAINER);
  if (mcpRunning) {
    cli.info(`Stopping MCP server container: ${MCP_CONTAINER}`);
    const result = await containerManager.stopContainer(MCP_CONTAINER);
    if (result.success) {
      cli.success("✓ MCP server stopped");
    } else {
      cli.warning(`⚠ Failed to stop MCP server: ${result.stderr}`);
    }
  } else {
    cli.warning("⚠ MCP server container not running");
  }

  // Stop FalkorDB container
  const falkorDbRunning = await containerManager.isContainerRunning(FALKORDB_CONTAINER);
  if (falkorDbRunning) {
    cli.info(`Stopping FalkorDB container: ${FALKORDB_CONTAINER}`);
    const result = await containerManager.stopContainer(FALKORDB_CONTAINER);
    if (result.success) {
      cli.success("✓ FalkorDB stopped");
    } else {
      cli.warning(`⚠ Failed to stop FalkorDB: ${result.stderr}`);
    }
  } else {
    cli.warning("⚠ FalkorDB container not running");
  }

  cli.blank();
  cli.success("PAI Knowledge System stopped");
  cli.blank();
  cli.info("To start again:");
  cli.dim("  bun run src/server/start.ts");
  cli.blank();
  cli.info("To remove containers and network:");
  cli.dim(`  ${containerManager.getRuntimeCommand()} rm ${MCP_CONTAINER} ${FALKORDB_CONTAINER}`);
  cli.dim(`  ${containerManager.getRuntimeCommand()} network rm ${ContainerManager.NETWORK_NAME}`);
  cli.blank();
}

// Run main function
main().catch((error) => {
  cli.error("Unexpected error:");
  console.error(error);
  process.exit(1);
});
