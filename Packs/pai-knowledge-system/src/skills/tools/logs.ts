#!/usr/bin/env bun
/**
 * View logs from PAI Knowledge System containers
 *
 * Shows logs from MCP server or FalkorDB container.
 * Supports following logs in real-time.
 */

import { createContainerManager, ContainerManager } from "../lib/container.js";
import { cli } from "../lib/cli.js";

/**
 * Log container options
 */
interface LogOptions {
  container: "falkordb" | "mcp";
  follow?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): LogOptions {
  const options: LogOptions = {
    container: "mcp", // Default to MCP server logs
    follow: true, // Default to following logs
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "-f":
      case "--falkordb":
        options.container = "falkordb";
        break;
      case "-m":
      case "--mcp":
        options.container = "mcp";
        break;
      case "-n":
      case "--no-follow":
        options.follow = false;
        break;
      case "-h":
      case "--help":
        printHelp();
        process.exit(0);
      default:
        cli.error(`Unknown option: ${arg}`);
        cli.blank();
        cli.info("Use -h for help");
        process.exit(1);
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp() {
  cli.blank();
  cli.header("PAI Knowledge System - Logs", 50);
  cli.blank();
  cli.info("View logs from PAI Knowledge System containers.");
  cli.blank();
  cli.info("Usage:");
  cli.dim("  bun run src/server/logs.ts [OPTIONS]");
  cli.blank();
  cli.info("Options:");
  cli.blank();
  cli.table([
    ["-f, --falkordb", "View FalkorDB container logs"],
    ["-m, --mcp", "View MCP Server container logs (default)"],
    ["-n, --no-follow", "Don't follow logs (just show recent)"],
    ["-h, --help", "Show this help message"],
  ]);
  cli.blank();
  cli.info("Examples:");
  cli.blank();
  cli.dim("  # View MCP server logs (follow)");
  cli.dim("  bun run src/server/logs.ts --mcp");
  cli.blank();
  cli.dim("  # View FalkorDB logs (follow)");
  cli.dim("  bun run src/server/logs.ts --falkordb");
  cli.blank();
  cli.dim("  # View recent logs without following");
  cli.dim("  bun run src/server/logs.ts --mcp --no-follow");
  cli.blank();
}

/**
 * Main logs function
 */
async function main() {
  // Parse command line arguments
  const options = parseArgs(process.argv.slice(2));

  // Don't show header for logs, it's too noisy
  // cli.header("PAI Knowledge System - Logs");

  // Create container manager
  const containerManager = createContainerManager();

  // Check if runtime is available
  if (!containerManager.isRuntimeAvailable()) {
    cli.error("No container runtime found!");
    process.exit(1);
  }

  // Determine container name
  const containerName =
    options.container === "falkordb"
      ? ContainerManager.FALKORDB_CONTAINER
      : ContainerManager.MCP_CONTAINER;

  // Check if container exists
  const exists = await containerManager.containerExists(containerName);
  if (!exists) {
    cli.error(`✗ Container '${containerName}' not found`);
    cli.blank();
    cli.info("Make sure the system is running:");
    cli.dim("  bun run src/server/start.ts");
    process.exit(1);
  }

  // Check if container is running (only relevant if following)
  if (options.follow) {
    const isRunning = await containerManager.isContainerRunning(containerName);
    if (!isRunning) {
      cli.warning(`⚠ Container '${containerName}' is not running`);
      cli.blank();
      cli.info("Showing recent logs (container is stopped)");
    }
  }

  // Display which container's logs we're viewing
  cli.blank();
  cli.info(`Viewing logs for: ${containerName}`);
  if (options.follow) {
    cli.dim("Press Ctrl+C to stop viewing logs");
  }
  cli.blank();

  // Get logs
  const result = await containerManager.getLogs(containerName, options.follow);

  if (result.success) {
    if (result.stdout) {
      console.log(result.stdout);
    } else {
      cli.info("No logs available (container may be new)");
    }
  } else {
    cli.error(`Failed to retrieve logs: ${result.stderr}`);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  cli.error("Unexpected error:");
  console.error(error);
  process.exit(1);
});
