#!/usr/bin/env bun
/**
 * Start PAI Knowledge System containers
 *
 * Starts both FalkorDB and MCP server containers if they exist.
 * This is a simple start script - containers should already be created.
 */

import { createContainerManager, ContainerManager } from "../lib/container.js";
import { cli } from "../lib/cli.js";

/**
 * Main start function
 */
async function main() {
  cli.header("PAI Knowledge System - Start");

  // Create container manager
  const containerManager = createContainerManager();

  // Check if runtime is available
  if (!containerManager.isRuntimeAvailable()) {
    cli.error("No container runtime found!");
    cli.blank();
    cli.info("Please install Podman or Docker:");
    cli.blank();
    cli.dim("  Podman: brew install podman (macOS)");
    cli.dim("  Docker: https://docs.docker.com/get-docker/");
    process.exit(1);
  }

  cli.success(`Using container runtime: ${containerManager.getRuntimeCommand()}`);
  cli.blank();

  // Container names
  const FALKORDB_CONTAINER = ContainerManager.FALKORDB_CONTAINER;
  const MCP_CONTAINER = ContainerManager.MCP_CONTAINER;

  // Check if containers exist
  const falkorDbExists = await containerManager.containerExists(FALKORDB_CONTAINER);
  const mcpExists = await containerManager.containerExists(MCP_CONTAINER);

  if (!falkorDbExists && !mcpExists) {
    cli.error("Containers not found");
    cli.blank();
    cli.info("Please run the main setup script first:");
    cli.dim("  bun run src/server/run.ts");
    process.exit(1);
  }

  cli.info("Starting PAI Knowledge System...");
  cli.blank();

  // Start FalkorDB first
  if (falkorDbExists) {
    const isRunning = await containerManager.isContainerRunning(FALKORDB_CONTAINER);
    if (isRunning) {
      cli.success("✓ FalkorDB already running");
    } else {
      cli.info(`Starting FalkorDB container: ${FALKORDB_CONTAINER}`);
      const result = await containerManager.startContainer(FALKORDB_CONTAINER);
      if (result.success) {
        cli.success("✓ FalkorDB started");
      } else {
        cli.error(`✗ Failed to start FalkorDB: ${result.stderr}`);
        process.exit(1);
      }
    }
  }

  // Wait for FalkorDB to be ready
  if (falkorDbExists) {
    const isRunning = await containerManager.isContainerRunning(FALKORDB_CONTAINER);
    if (isRunning) {
      cli.info("Waiting for FalkorDB to be ready...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  // Start MCP server
  if (mcpExists) {
    const isRunning = await containerManager.isContainerRunning(MCP_CONTAINER);
    if (isRunning) {
      cli.success("✓ MCP Server already running");
    } else {
      cli.info(`Starting MCP Server container: ${MCP_CONTAINER}`);
      const result = await containerManager.startContainer(MCP_CONTAINER);
      if (result.success) {
        cli.success("✓ MCP Server started");
      } else {
        cli.error(`✗ Failed to start MCP Server: ${result.stderr}`);
        process.exit(1);
      }
    }
  }

  cli.blank();
  cli.success("PAI Knowledge System started");
  cli.blank();
  cli.info("Access points:");
  cli.url("MCP Server", "http://localhost:8000/mcp/");
  cli.url("Health Check", "http://localhost:8000/health");
  cli.url("FalkorDB UI", "http://localhost:3000");
  cli.blank();
}

// Run main function
main().catch((error) => {
  cli.error("Unexpected error:");
  console.error(error);
  process.exit(1);
});
