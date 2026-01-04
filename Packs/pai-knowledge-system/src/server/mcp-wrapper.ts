#!/usr/bin/env bun
/**
 * MCP Server Wrapper for PAI Knowledge System
 *
 * This script provides a simple command-line interface to the Graphiti MCP server.
 * It handles JSON-RPC communication and provides simple wrappers around the MCP tools.
 *
 * Usage:
 *   bun run src/server/mcp-wrapper.ts add_episode "Episode title" "Episode body"
 *   bun run src/server/mcp-wrapper.ts search_nodes "search query"
 *   bun run src/server/mcp-wrapper.ts get_status
 */

import { createMCPClient } from "./lib/mcp-client.js";
import { cli } from "./lib/cli.js";

/**
 * Command definitions
 */
interface Command {
  name: string;
  description: string;
  handler: (args: string[]) => Promise<{ success: boolean; data?: unknown; error?: string }>;
}

/**
 * MCP Wrapper class
 */
class MCPWrapper {
  private commands: Map<string, Command>;

  constructor() {
    this.commands = new Map();
    this.registerCommands();
  }

  /**
   * Register all available commands
   */
  private registerCommands(): void {
    this.addCommand({
      name: "add_episode",
      description: "Add knowledge to graph",
      handler: this.cmdAddEpisode.bind(this),
    });

    this.addCommand({
      name: "search_nodes",
      description: "Search entities",
      handler: this.cmdSearchNodes.bind(this),
    });

    this.addCommand({
      name: "search_facts",
      description: "Search relationships",
      handler: this.cmdSearchFacts.bind(this),
    });

    this.addCommand({
      name: "get_episodes",
      description: "Get recent episodes",
      handler: this.cmdGetEpisodes.bind(this),
    });

    this.addCommand({
      name: "get_status",
      description: "Get graph status",
      handler: this.cmdGetStatus.bind(this),
    });

    this.addCommand({
      name: "clear_graph",
      description: "Delete all knowledge",
      handler: this.cmdClearGraph.bind(this),
    });

    this.addCommand({
      name: "health",
      description: "Check server health",
      handler: this.cmdHealth.bind(this),
    });
  }

  /**
   * Add a command
   */
  private addCommand(command: Command): void {
    this.commands.set(command.name, command);
  }

  /**
   * Get a command by name
   */
  private getCommand(name: string): Command | undefined {
    return this.commands.get(name);
  }

  /**
   * List all available commands
   */
  listCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Command: add_episode
   */
  private async cmdAddEpisode(args: string[]): Promise<{ success: boolean; data?: unknown; error?: string }> {
    if (args.length < 2) {
      return {
        success: false,
        error: "Usage: add_episode <title> <body> [source_description]",
      };
    }

    const title = args[0];
    const body = args[1];
    const sourceDescription = args[2];

    const client = createMCPClient();
    const result = await client.addEpisode({
      name: title,
      episode_body: body,
      source_description,
    });

    return result;
  }

  /**
   * Command: search_nodes
   */
  private async cmdSearchNodes(args: string[]): Promise<{ success: boolean; data?: unknown; error?: string }> {
    if (args.length < 1) {
      return {
        success: false,
        error: "Usage: search_nodes <query> [limit]",
      };
    }

    const query = args[0];
    const limit = args.length > 1 ? parseInt(args[1], 10) : 5;

    const client = createMCPClient();
    const result = await client.searchNodes({ query, limit });

    return result;
  }

  /**
   * Command: search_facts
   */
  private async cmdSearchFacts(args: string[]): Promise<{ success: boolean; data?: unknown; error?: string }> {
    if (args.length < 1) {
      return {
        success: false,
        error: "Usage: search_facts <query> [limit]",
      };
    }

    const query = args[0];
    const limit = args.length > 1 ? parseInt(args[1], 10) : 5;

    const client = createMCPClient();
    const result = await client.searchFacts({ query, limit });

    return result;
  }

  /**
   * Command: get_episodes
   */
  private async cmdGetEpisodes(args: string[]): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const limit = args.length > 0 ? parseInt(args[0], 10) : 5;

    const client = createMCPClient();
    const result = await client.getEpisodes({ limit });

    return result;
  }

  /**
   * Command: get_status
   */
  private async cmdGetStatus(): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const client = createMCPClient();
    const result = await client.getStatus();

    return result;
  }

  /**
   * Command: clear_graph
   */
  private async cmdClearGraph(args: string[]): Promise<{ success: boolean; data?: unknown; error?: string }> {
    // Safety check
    if (!args.includes("--force")) {
      return {
        success: false,
        error: "This will delete ALL knowledge. Use --force to confirm.",
      };
    }

    const client = createMCPClient();
    const result = await client.clearGraph();

    return result;
  }

  /**
   * Command: health
   */
  private async cmdHealth(): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const client = createMCPClient();
    const result = await client.testConnection();

    return result;
  }

  /**
   * Print help message
   */
  printHelp(): void {
    cli.blank();
    cli.header("PAI Knowledge System - MCP Wrapper", 60);
    cli.blank();
    cli.info("Simple command-line interface to the Graphiti MCP server.");
    cli.blank();
    cli.info("Usage:");
    cli.dim("  bun run src/server/mcp-wrapper.ts <command> [args...]");
    cli.blank();
    cli.info("Commands:");
    cli.blank();

    const commands = this.listCommands();
    const maxLength = Math.max(...commands.map((c) => c.name.length));

    commands.forEach((cmd) => {
      const paddedName = cmd.name.padEnd(maxLength);
      cli.dim(`  ${paddedName}  ${cmd.description}`);
    });

    cli.blank();
    cli.info("Examples:");
    cli.blank();
    cli.dim('  # Add knowledge to graph');
    cli.dim('  bun run src/server/mcp-wrapper.ts add_episode "Test Episode" "This is a test episode"');
    cli.blank();
    cli.dim('  # Search for entities');
    cli.dim('  bun run src/server/mcp-wrapper.ts search_nodes "PAI" 10');
    cli.blank();
    cli.dim('  # Get graph status');
    cli.dim('  bun run src/server/mcp-wrapper.ts get_status');
    cli.blank();
    cli.dim('  # Check server health');
    cli.dim('  bun run src/server/mcp-wrapper.ts health');
    cli.blank();
  }

  /**
   * Execute a command
   */
  async execute(commandName: string, args: string[]): Promise<number> {
    const command = this.getCommand(commandName);

    if (!command) {
      cli.error(`Unknown command: ${commandName}`);
      cli.blank();
      cli.info(`Available commands: ${Array.from(this.commands.keys()).join(", ")}`);
      return 1;
    }

    // Execute command
    const result = await command.handler(args);

    // Output result
    if (result.success) {
      if (result.data !== undefined) {
        console.log(JSON.stringify(result.data, null, 2));
      }
      return 0;
    } else {
      cli.error(`Error: ${result.error}`);
      return 1;
    }
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  // Show help if no arguments
  if (args.length === 0) {
    const wrapper = new MCPWrapper();
    wrapper.printHelp();
    process.exit(0);
  }

  // Check for help flag
  if (args[0] === "-h" || args[0] === "--help") {
    const wrapper = new MCPWrapper();
    wrapper.printHelp();
    process.exit(0);
  }

  // Execute command
  const commandName = args[0];
  const commandArgs = args.slice(1);

  const wrapper = new MCPWrapper();
  const exitCode = await wrapper.execute(commandName, commandArgs);
  process.exit(exitCode);
}

// Run main function
main().catch((error) => {
  cli.error("Unexpected error:");
  console.error(error);
  process.exit(1);
});
