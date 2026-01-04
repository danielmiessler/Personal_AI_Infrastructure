#!/usr/bin/env bun
/**
 * Check the status of PAI Knowledge System containers
 *
 * Shows status of both FalkorDB and MCP server containers.
 * Tests health endpoint and displays access URLs.
 */

import { createContainerManager, ContainerManager } from "../lib/container.js";
import { cli } from "../lib/cli.js";

/**
 * Main status function
 */
async function main() {
  cli.header("PAI Knowledge System - Status");

  // Create container manager
  const containerManager = createContainerManager();

  // Check if runtime is available
  if (!containerManager.isRuntimeAvailable()) {
    cli.error("No container runtime found!");
    process.exit(1);
  }

  cli.blank();

  // Container and network names
  const NETWORK_NAME = ContainerManager.NETWORK_NAME;
  const FALKORDB_CONTAINER = ContainerManager.FALKORDB_CONTAINER;
  const MCP_CONTAINER = ContainerManager.MCP_CONTAINER;

  // Check network
  const networkInfo = await containerManager.getNetworkInfo(NETWORK_NAME);
  if (networkInfo.exists) {
    cli.success(`✓ Network: ${NETWORK_NAME}`);
    if (networkInfo.subnet) {
      cli.dim(`  Subnet: ${networkInfo.subnet}`);
    }
  } else {
    cli.error(`✗ Network: ${NETWORK_NAME} (not found)`);
  }
  cli.blank();

  // Check FalkorDB container
  const falkorDbInfo = await containerManager.getContainerInfo(FALKORDB_CONTAINER);
  cli.info(`FalkorDB Container: ${FALKORDB_CONTAINER}`);
  if (falkorDbInfo.exists) {
    cli.dim(`  Status: ${falkorDbInfo.uptime || "Unknown"}`);
    if (falkorDbInfo.status === "running") {
      cli.success("  ✓ Running");
    } else {
      cli.warning("  ⚠ Stopped");
    }
  } else {
    cli.error("  ✗ FalkorDB container not found");
  }
  cli.blank();

  // Check MCP Server container
  const mcpInfo = await containerManager.getContainerInfo(MCP_CONTAINER);
  cli.info(`MCP Server Container: ${MCP_CONTAINER}`);
  if (mcpInfo.exists) {
    cli.dim(`  Status: ${mcpInfo.uptime || "Unknown"}`);
    if (mcpInfo.status === "running") {
      cli.success("  ✓ Running");
      cli.blank();
      cli.info("  Access points:");
      cli.url("    MCP Server", "http://localhost:8000/mcp/");
      cli.url("    Health Check", "http://localhost:8000/health");
      cli.url("    FalkorDB UI", "http://localhost:3000");

      // Test health endpoint
      cli.blank();
      cli.info("  Testing health endpoint...");
      try {
        const response = await fetch("http://localhost:8000/health");
        if (response.ok) {
          const data = await response.json();
          if (data.status === "healthy" || data.status === "ok") {
            cli.success("  ✓ Health check passed");
          } else {
            cli.warning(`  ⚠ Health check status: ${data.status}`);
          }
        } else {
          cli.warning("  ⚠ Health check failed (server may be starting up)");
        }
      } catch {
        cli.warning("  ⚠ Could not connect to health endpoint (server may be starting up)");
      }
    } else {
      cli.warning("  ⚠ Stopped");
    }
  } else {
    cli.error("  ✗ MCP Server container not found");
  }

  cli.blank();
  cli.separator();
  cli.blank();

  // Show running containers count
  let runningCount = 0;
  const falkorDbRunning = falkorDbInfo.exists && falkorDbInfo.status === "running";
  const mcpRunning = mcpInfo.exists && mcpInfo.status === "running";

  if (falkorDbRunning) runningCount++;
  if (mcpRunning) runningCount++;

  cli.info(`Running containers: ${runningCount}/2`);

  // Exit with appropriate code
  if (runningCount === 2) {
    cli.blank();
    cli.success("✓ System fully operational");
    process.exit(0);
  } else if (runningCount === 1) {
    cli.blank();
    cli.warning("⚠ System partially operational");
    process.exit(1);
  } else {
    cli.blank();
    cli.error("✗ System not running");
    cli.blank();
    cli.info("To start the system:");
    cli.dim("  bun run src/server/start.ts");
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  cli.error("Unexpected error:");
  console.error(error);
  process.exit(1);
});
