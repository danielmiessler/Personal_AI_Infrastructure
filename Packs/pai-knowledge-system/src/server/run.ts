#!/usr/bin/env bun
/**
 * Run PAI Knowledge System with Podman/Docker
 *
 * Uses a public bridge network with FalkorDB and MCP server containers.
 * This is the main setup script that creates containers, networks, and volumes.
 *
 * This script expects the .env file to be in config/.env
 */

import { createContainerManager, ContainerManager } from "./lib/container.js";
import { createConfigLoader, type KnowledgeConfig } from "./lib/config.js";
import { cli } from "./lib/cli.js";
import inquirer from "inquirer";

/**
 * Main run function
 */
async function main() {
  cli.header("PAI Knowledge System - Setup & Run");
  cli.blank();
  cli.info("This script will set up and start the PAI Knowledge System.");
  cli.blank();
  cli.info("Prerequisites:");
  cli.dim("  - Podman or Docker (container runtime)");
  cli.dim("  - OpenAI API key or compatible LLM provider");
  cli.blank();

  // Create config loader
  const configLoader = createConfigLoader();

  // Check if .env file exists
  if (!configLoader.envExists()) {
    cli.error("Error: .env file not found in config directory!");
    cli.blank();
    cli.warning("Please copy .env.example to .env and configure your API keys:");
    cli.dim(`  cp ${configLoader.getConfigDir()}/.env.example ${configLoader.getConfigDir()}/.env`);
    cli.dim(`  nano ${configLoader.getEnvFile()}  # or your preferred editor`);
    process.exit(1);
  }

  // Load configuration
  cli.blank();
  cli.info("Loading configuration...");
  const config = await configLoader.load();

  // Check if PAI_KNOWLEDGE_OPENAI_API_KEY is set
  // Map PAI_KNOWLEDGE_OPENAI_API_KEY to OPENAI_API_KEY for container compatibility
  let openaiKey = config.OPENAI_API_KEY;
  if (!openaiKey && config.PAI_PREFIXES?.PAI_KNOWLEDGE_OPENAI_API_KEY) {
    openaiKey = config.PAI_PREFIXES.PAI_KNOWLEDGE_OPENAI_API_KEY;
    cli.success("✓ Using dedicated PAI Knowledge System API key");
  } else if (!openaiKey) {
    cli.warning("Warning: PAI_KNOWLEDGE_OPENAI_API_KEY is not set in .env");
    cli.warning("The server may not work properly without an API key.");
  }

  // Create container manager
  const containerManager = createContainerManager();

  // Check if runtime is available
  if (!containerManager.isRuntimeAvailable()) {
    cli.error("Error: No container runtime found!");
    cli.blank();
    cli.info("Please install Podman or Docker:");
    cli.blank();
    cli.dim("  Podman: brew install podman (macOS)");
    cli.dim("  Docker: https://docs.docker.com/get-docker/");
    process.exit(1);
  }

  cli.success(`Using container runtime: ${containerManager.getRuntimeCommand()}`);
  cli.blank();

  // Container and network names
  const NETWORK_NAME = ContainerManager.NETWORK_NAME;
  const FALKORDB_CONTAINER = ContainerManager.FALKORDB_CONTAINER;
  const MCP_CONTAINER = ContainerManager.MCP_CONTAINER;
  const VOLUME_NAME = ContainerManager.VOLUME_NAME;

  // Create network if it doesn't exist (public bridge network)
  const networkExists = await containerManager.networkExists(NETWORK_NAME);
  if (!networkExists) {
    cli.info(`Creating public network: ${NETWORK_NAME}`);
    const result = await containerManager.createNetwork(NETWORK_NAME);
    if (result.success) {
      cli.success("✓ Network created");
    } else {
      cli.error(`Failed to create network: ${result.stderr}`);
      process.exit(1);
    }
  } else {
    cli.success(`✓ Network exists: ${NETWORK_NAME}`);
  }

  // Check if FalkorDB container exists
  const falkorDbExists = await containerManager.containerExists(FALKORDB_CONTAINER);
  if (falkorDbExists) {
    cli.warning(`FalkorDB container '${FALKORDB_CONTAINER}' already exists.`);

    const { recreate } = await inquirer.prompt([
      {
        type: "confirm",
        name: "recreate",
        message: "Do you want to remove and recreate it?",
        default: false,
      },
    ]);

    if (recreate) {
      cli.info("Stopping and removing existing FalkorDB container...");
      await containerManager.stopAndRemoveContainer(FALKORDB_CONTAINER);
    }
  }

  // Check if MCP container exists
  const mcpExists = await containerManager.containerExists(MCP_CONTAINER);
  if (mcpExists) {
    cli.warning(`MCP container '${MCP_CONTAINER}' already exists.`);

    const { recreate } = await inquirer.prompt([
      {
        type: "confirm",
        name: "recreate",
        message: "Do you want to remove and recreate it?",
        default: false,
      },
    ]);

    if (recreate) {
      cli.info("Stopping and removing existing MCP container...");
      await containerManager.stopAndRemoveContainer(MCP_CONTAINER);
    } else {
      cli.info("Using existing MCP container...");
      cli.blank();
      cli.success("✓ Done! System is already set up.");
      cli.blank();
      cli.info("Access points:");
      cli.url("MCP Server", "http://localhost:8000/mcp/");
      cli.url("Health Check", "http://localhost:8000/health");
      cli.url("FalkorDB UI", "http://localhost:3000");
      process.exit(0);
    }
  }

  cli.blank();
  cli.header("Starting FalkorDB container...");

  // Run FalkorDB container (web UI on port 3000)
  if (!await containerManager.containerExists(FALKORDB_CONTAINER)) {
    const falkorDbArgs = [
      `--name=${FALKORDB_CONTAINER}`,
      "--restart=unless-stopped",
      `--network=${NETWORK_NAME}`,
      "-p=3000:3000",  // FalkorDB web UI
      `-v=${VOLUME_NAME}:/data`,
      `-e=FALKORDB_PASSWORD=${config.FALKORDB_PASSWORD || ""}`,
      "falkordb/falkordb:latest",
    ];

    const result = await containerManager.runContainer(falkorDbArgs);
    if (result.success) {
      cli.success("✓ FalkorDB container started");
      cli.dim(`  Container: ${FALKORDB_CONTAINER}`);
      cli.dim(`  Volume: ${VOLUME_NAME}`);
      cli.dim(`  Network: ${NETWORK_NAME}`);
    } else {
      cli.error(`Failed to start FalkorDB: ${result.stderr}`);
      process.exit(1);
    }
  }

  // Wait for FalkorDB to be ready
  cli.info("Waiting for FalkorDB to be ready...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  cli.blank();
  cli.header("Starting Graphiti MCP Server container...");

  // Build container environment variables
  const containerEnv = configLoader.getContainerEnv(config);

  // Run MCP server container (exposed to host)
  if (!await containerManager.containerExists(MCP_CONTAINER)) {
    const mcpArgs = [
      `--name=${MCP_CONTAINER}`,
      "--restart=unless-stopped",
      `--network=${NETWORK_NAME}`,
      "-p=8000:8000",  // MCP SSE endpoint
      `-e=OPENAI_API_KEY=${containerEnv.OPENAI_API_KEY || ""}`,
      `-e=ANTHROPIC_API_KEY=${containerEnv.ANTHROPIC_API_KEY || ""}`,
      `-e=GOOGLE_API_KEY=${containerEnv.GOOGLE_API_KEY || ""}`,
      `-e=GROQ_API_KEY=${containerEnv.GROQ_API_KEY || ""}`,
      `-e=VOYAGE_API_KEY=${containerEnv.VOYAGE_API_KEY || ""}`,
      `-e=DATABASE_TYPE=${containerEnv.DATABASE_TYPE}`,
      `-e=FALKORDB_HOST=${containerEnv.FALKORDB_HOST}`,
      "-e=FALKORDB_PORT=6379",
      `-e=FALKORDB_PASSWORD=${containerEnv.FALKORDB_PASSWORD || ""}`,
      `-e=NEO4J_URI=${containerEnv.NEO4J_URI}`,
      `-e=NEO4J_USER=${containerEnv.NEO4J_USER}`,
      `-e=NEO4J_PASSWORD=${containerEnv.NEO4J_PASSWORD}`,
      `-e=SEMAPHORE_LIMIT=${containerEnv.SEMAPHORE_LIMIT}`,
      `-e=GRAPHITI_TELEMETRY_ENABLED=${containerEnv.GRAPHITI_TELEMETRY_ENABLED}`,
      `-e=MODEL_NAME=${containerEnv.MODEL_NAME}`,
      `-e=LLM_PROVIDER=${containerEnv.LLM_PROVIDER}`,
      `-e=EMBEDDER_PROVIDER=${containerEnv.EMBEDDER_PROVIDER}`,
      `-e=GROUP_ID=${containerEnv.GROUP_ID}`,
      "falkordb/graphiti-knowledge-graph-mcp:latest",
    ];

    const result = await containerManager.runContainer(mcpArgs);
    if (result.success) {
      cli.success("✓ MCP Server container started");
      cli.dim(`  Container: ${MCP_CONTAINER}`);
      cli.dim(`  Network: ${NETWORK_NAME}`);
    } else {
      cli.error(`Failed to start MCP server: ${result.stderr}`);
      process.exit(1);
    }
  }

  cli.blank();
  cli.success("═══════════════════════════════════════");
  cli.success("PAI Knowledge System is running!");
  cli.success("═══════════════════════════════════════");
  cli.blank();
  cli.info("Network Topology:");
  cli.dim(`  FalkorDB:     ${FALKORDB_CONTAINER}`);
  cli.dim(`  MCP Server:   ${MCP_CONTAINER}`);
  cli.dim(`  Network:      ${NETWORK_NAME} (public bridge)`);
  cli.blank();
  cli.info("Access points:");
  cli.url("MCP Server", "http://localhost:8000/mcp/");
  cli.url("Health Check", "http://localhost:8000/health");
  cli.url("FalkorDB UI", "http://localhost:3000");
  cli.blank();
  cli.info("Management commands:");
  cli.dim("  View logs:     bun run src/server/logs.ts");
  cli.dim("  Stop system:   bun run src/server/stop.ts");
  cli.dim("  Start system:  bun run src/server/start.ts");
  cli.dim("  Check status:  bun run src/server/status.ts");
  cli.blank();
}

// Run main function
main().catch((error) => {
  cli.error("Unexpected error:");
  console.error(error);
  process.exit(1);
});
