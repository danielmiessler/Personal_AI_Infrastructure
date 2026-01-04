#!/usr/bin/env bun
/**
 * PAI Knowledge System Diagnostics Script
 *
 * Checks installation and provides troubleshooting guidance.
 * Performs comprehensive health checks on the system.
 */

import { createContainerManager, ContainerManager } from "./lib/container.js";
import { createConfigLoader } from "./lib/config.js";
import { cli } from "./lib/cli.js";
import { $ } from "bun";

/**
 * Diagnostic check result
 */
interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string;
}

/**
 * Diagnostics class
 */
class Diagnostics {
  private issues = 0;
  private results: CheckResult[] = [];

  /**
   * Add a check result
   */
  addResult(result: CheckResult): void {
    this.results.push(result);
    if (!result.passed) {
      this.issues++;
    }
  }

  /**
   * Print a header
   */
  printHeader(title: string): void {
    cli.blank();
    cli.header(title, 50);
    cli.blank();
  }

  /**
   * Check 1: Podman Installation
   */
  async checkPodman(): Promise<void> {
    this.printHeader("Check 1: Container Runtime");

    try {
      // Check if podman or docker is installed
      const podmanCheck = $`which podman`.quiet();
      const dockerCheck = $`which docker`.quiet();

      if (podmanCheck.exitCode === 0) {
        const version = $`podman --version`.quiet();
        this.addResult({
          name: "Container Runtime",
          passed: true,
          message: `Podman installed: ${version.stdout.toString().trim()}`,
        });
      } else if (dockerCheck.exitCode === 0) {
        const version = $`docker --version`.quiet();
        this.addResult({
          name: "Container Runtime",
          passed: true,
          message: `Docker installed: ${version.stdout.toString().trim()}`,
        });
      } else {
        this.addResult({
          name: "Container Runtime",
          passed: false,
          message: "No container runtime found",
          details: "Install from: https://podman.io/getting-started/installation",
        });
      }
    } catch {
      this.addResult({
        name: "Container Runtime",
        passed: false,
        message: "Error checking for container runtime",
      });
    }
  }

  /**
   * Check 2: Configuration File
   */
  async checkConfig(): Promise<void> {
    this.printHeader("Check 2: Configuration File");

    const configLoader = createConfigLoader();

    if (configLoader.envExists()) {
      this.addResult({
        name: ".env File",
        passed: true,
        message: ".env file exists",
      });

      // Load and check for API keys
      try {
        const config = await configLoader.load();

        // Check for API keys
        const hasAnyKey =
          !!config.OPENAI_API_KEY ||
          !!config.ANTHROPIC_API_KEY ||
          !!config.GOOGLE_API_KEY ||
          !!config.GROQ_API_KEY;

        if (hasAnyKey) {
          const keyType = config.OPENAI_API_KEY
            ? "OpenAI"
            : config.ANTHROPIC_API_KEY
            ? "Anthropic"
            : config.GOOGLE_API_KEY
            ? "Google"
            : "Groq";
          this.addResult({
            name: "API Key",
            passed: true,
            message: `${keyType} API key configured`,
          });
        } else {
          this.addResult({
            name: "API Key",
            passed: false,
            message: "No API keys found in .env",
            details: "Run: bun run src/skills/tools/install.ts",
          });
        }

        // Check model configuration
        this.addResult({
          name: "Model Configuration",
          passed: true,
          message: `Model: ${config.MODEL_NAME}`,
        });

        // Check semaphore limit
        this.addResult({
          name: "Concurrency Limit",
          passed: true,
          message: `Semaphore limit: ${config.SEMAPHORE_LIMIT}`,
        });
      } catch (error) {
        this.addResult({
          name: ".env File",
          passed: false,
          message: "Error loading .env file",
          details: String(error),
        });
      }
    } else {
      this.addResult({
        name: ".env File",
        passed: false,
        message: ".env file not found",
        details: "Run: bun run src/skills/tools/install.ts",
      });
    }
  }

  /**
   * Check 3: Container Status
   */
  async checkContainers(): Promise<void> {
    this.printHeader("Check 3: Container Status");

    const containerManager = createContainerManager();

    if (!containerManager.isRuntimeAvailable()) {
      this.addResult({
        name: "Container Runtime",
        passed: false,
        message: "Container runtime not available",
      });
      return;
    }

    const containerName = "graphiti-knowledge-graph-mcp"; // Note: using old name for compatibility
    const isRunning = await containerManager.isContainerRunning(containerName);

    if (isRunning) {
      this.addResult({
        name: "Container",
        passed: true,
        message: "Container is running",
      });

      // Get container details
      const info = await containerManager.getContainerInfo(containerName);
      if (info.uptime) {
        cli.dim(`  Status: ${info.uptime}`);
      }
      if (info.ports) {
        cli.dim(`  Ports: ${info.ports}`);
      }
    } else {
      const exists = await containerManager.containerExists(containerName);
      if (exists) {
        this.addResult({
          name: "Container",
          passed: false,
          message: "Container exists but not running",
          details: "Start with: bun run src/server/run.ts",
        });
      } else {
        this.addResult({
          name: "Container",
          passed: false,
          message: "Container not found",
          details: "Run: bun run src/server/run.ts",
        });
      }
    }
  }

  /**
   * Check 4: Server Health
   */
  async checkServerHealth(): Promise<void> {
    this.printHeader("Check 4: MCP Server Health");

    try {
      const response = await fetch("http://localhost:8000/health", {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === "healthy" || data.status === "ok") {
          this.addResult({
            name: "MCP Server",
            passed: true,
            message: "MCP server is healthy",
          });
        } else {
          this.addResult({
            name: "MCP Server",
            passed: false,
            message: "Server responding but health check unclear",
            details: `Response: ${JSON.stringify(data)}`,
          });
        }
      } else {
        this.addResult({
          name: "MCP Server",
          passed: false,
          message: `Server returned HTTP ${response.status}`,
        });
      }
    } catch {
      this.addResult({
        name: "MCP Server",
        passed: false,
        message: "MCP server not responding",
        details: "Check logs: bun run src/server/logs.ts",
      });
    }
  }

  /**
   * Check 5: PAI Skill Installation
   */
  async checkPAISkill(): Promise<void> {
    this.printHeader("Check 5: PAI Skill Installation");

    const possiblePaths = [
      `${process.env.HOME}/.claude/Skills/Knowledge`,
      `${process.env.HOME}/.claude/Skills/pai-knowledge-system`,
      process.env.PAI_DIR ? `${process.env.PAI_DIR}/Skills/Knowledge` : "",
      process.env.PAI_DIR ? `${process.env.PAI_DIR}/Skills/pai-knowledge-system` : "",
    ].filter(Boolean);

    let found = false;
    for (const path of possiblePaths) {
      try {
        const file = Bun.file(path);
        if (file.exists()) {
          this.addResult({
            name: "PAI Skill",
            passed: true,
            message: `PAI skill installed: ${path}`,
          });
          found = true;
          break;
        }
      } catch {
        // Continue
      }
    }

    if (!found) {
      this.addResult({
        name: "PAI Skill",
        passed: false,
        message: "PAI skill not found in standard locations",
        details: "Install with: cp -r pai-knowledge-system ~/.claude/Skills/",
      });
    }
  }

  /**
   * Check 6: Port Availability
   */
  async checkPorts(): Promise<void> {
    this.printHeader("Check 6: Port Availability");

    const ports = [
      { port: 8000, description: "MCP Server" },
      { port: 6379, description: "FalkorDB" },
      { port: 3000, description: "FalkorDB Web UI" },
    ];

    for (const { port, description } of ports) {
      try {
        // Try to bind to the port to check if it's available
        const server = Bun.serve({
          port,
          fetch: () => new Response("OK"),
        });

        // Immediately stop the server
        server.stop();

        this.addResult({
          name: `Port ${port}`,
          passed: true,
          message: `${description} (port ${port}) is available`,
        });
      } catch {
        this.addResult({
          name: `Port ${port}`,
          passed: false,
          message: `${description} (port ${port}) is in use`,
        });
      }
    }
  }

  /**
   * Check 7: Resource Usage
   */
  async checkResources(): Promise<void> {
    this.printHeader("Check 7: Resource Usage");

    const containerManager = createContainerManager();
    const containerName = "graphiti-knowledge-graph-mcp";

    if (await containerManager.isContainerRunning(containerName)) {
      try {
        const stats = await containerManager.getStats(containerName);
        if (stats.success) {
          this.addResult({
            name: "Resource Usage",
            passed: true,
            message: "Container resource usage:",
            details: stats.stdout,
          });
          console.log(stats.stdout);
        }
      } catch {
        this.addResult({
          name: "Resource Usage",
          passed: false,
          message: "Could not fetch resource stats",
        });
      }
    } else {
      this.addResult({
        name: "Resource Usage",
        passed: false,
        message: "Container not running",
      });
    }
  }

  /**
   * Print summary
   */
  printSummary(): void {
    this.printHeader("Diagnostic Summary");

    const passed = this.results.filter((r) => r.passed).length;
    const total = this.results.length;

    if (this.issues === 0) {
      cli.success("✓ All checks passed! System is healthy.");
      cli.blank();
      cli.info("Your PAI Knowledge System is ready to use.");
      cli.blank();
      cli.info("Try these commands:");
      cli.dim('  Remember that I\'ve successfully installed the PAI Knowledge System.');
      cli.dim('  What do I know about PAI?');
      cli.dim('  Show the knowledge graph status');
    } else {
      cli.warning(`⚠ Found ${this.issues} issue(s) that need attention`);
      cli.blank();
      cli.info("Recommended actions:");

      // Group recommendations by check type
      for (const result of this.results) {
        if (!result.passed && result.details) {
          cli.dim(`  • ${result.message}: ${result.details}`);
        }
      }

      // Additional contextual recommendations
      const runtimeResult = this.results.find((r) => r.name === "Container Runtime");
      if (!runtimeResult?.passed) {
        cli.blank();
        cli.info("1. Install Podman");
      }

      const configResult = this.results.find((r) => r.name === ".env File");
      if (!configResult?.passed) {
        cli.blank();
        cli.info("2. Run installation: bun run src/skills/tools/install.ts");
      }

      const containerResult = this.results.find((r) => r.name === "Container");
      if (!containerResult?.passed) {
        cli.blank();
        cli.info("3. Start the server: bun run src/server/run.ts");
      }

      const healthResult = this.results.find((r) => r.name === "MCP Server");
      if (!healthResult?.passed) {
        cli.blank();
        cli.info("4. Check logs: bun run src/server/logs.ts");
      }
    }

    cli.blank();
    cli.info("For more help, see:");
    cli.dim("  - README.md");
    cli.dim("  - INSTALL.md");
    cli.dim("  - VERIFY.md");
    cli.blank();
  }

  /**
   * Run all checks
   */
  async run(): Promise<void> {
    cli.clear();
    cli.header("PAI Knowledge System Diagnostics");
    cli.blank();

    await this.checkPodman();
    await this.checkConfig();
    await this.checkContainers();
    await this.checkServerHealth();
    await this.checkPAISkill();
    await this.checkPorts();
    await this.checkResources();

    this.printSummary();
  }
}

/**
 * Main function
 */
async function main() {
  const diagnostics = new Diagnostics();
  await diagnostics.run();
}

// Run main function
main().catch((error) => {
  cli.error("Unexpected error:");
  console.error(error);
  process.exit(1);
});
