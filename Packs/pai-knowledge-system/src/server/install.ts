#!/usr/bin/env bun
/**
 * PAI Knowledge System Installation Script
 *
 * Interactive installation wizard that guides users through:
 * - LLM provider selection
 * - API key configuration
 * - Model selection
 * - Performance tuning
 * - PAI .env integration
 * - Service startup
 * - PAI skill installation
 */

import { createContainerManager } from "./lib/container.js";
import { createConfigLoader } from "./lib/config.js";
import { cli } from "./lib/cli.js";
import inquirer from "inquirer";

/**
 * LLM Provider configuration
 */
interface LLMProvider {
  id: string;
  name: string;
  embedder: string;
  needsOpenAI: boolean;
  models?: ModelChoice[];
}

/**
 * Model choice for provider
 */
interface ModelChoice {
  name: string;
  value: string;
}

/**
 * API tier configuration
 */
interface APITier {
  name: string;
  semaphoreLimit: number;
}

/**
 * Provider configurations
 */
const PROVIDERS: LLMProvider[] = [
  {
    id: "openai",
    name: "OpenAI (recommended)",
    embedder: "openai",
    needsOpenAI: true,
    models: [
      { name: "gpt-4o-mini (recommended - fast & cost-effective)", value: "gpt-4o-mini" },
      { name: "gpt-4o (best quality)", value: "gpt-4o" },
      { name: "gpt-3.5-turbo (economy)", value: "gpt-3.5-turbo" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    embedder: "openai",
    needsOpenAI: true,
  },
  {
    id: "gemini",
    name: "Google Gemini",
    embedder: "gemini",
    needsOpenAI: false,
  },
  {
    id: "groq",
    name: "Groq",
    embedder: "openai",
    needsOpenAI: true,
    models: [
      { name: "llama-3.3-70b-versatile (recommended)", value: "llama-3.3-70b-versatile" },
      { name: "llama-3.1-70b-versatile", value: "llama-3.1-70b-versatile" },
    ],
  },
];

/**
 * OpenAI API tiers
 */
const OPENAI_TIERS: APITier[] = [
  { name: "Free tier", semaphoreLimit: 2 },
  { name: "Tier 2 (60 requests/minute)", semaphoreLimit: 8 },
  { name: "Tier 3 (500 requests/minute) - most common", semaphoreLimit: 10 },
  { name: "Tier 4 (5000 requests/minute)", semaphoreLimit: 20 },
];

/**
 * Installation state
 */
interface InstallState {
  llmProvider: string;
  embedderProvider: string;
  modelName: string;
  semaphoreLimit: string;
  apiKeys: {
    OPENAI_API_KEY?: string;
    ANTHROPIC_API_KEY?: string;
    GOOGLE_API_KEY?: string;
    GROQ_API_KEY?: string;
  };
  paiConfig: {
    GROUP_ID?: string;
    DATABASE_TYPE?: string;
    GRAPHITI_TELEMETRY_ENABLED?: string;
  };
}

/**
 * Installer class
 */
class Installer {
  private state: InstallState = {
    llmProvider: "openai",
    embedderProvider: "openai",
    modelName: "gpt-4o-mini",
    semaphoreLimit: "10",
    apiKeys: {},
    paiConfig: {
      GROUP_ID: "main",
      DATABASE_TYPE: "falkordb",
      GRAPHITI_TELEMETRY_ENABLED: "false",
    },
  };

  private containerManager = createContainerManager();
  private configLoader = createConfigLoader();

  /**
   * Collect an API key with optional existing value
   */
  private async collectKey(
    keyName: string,
    keyUrl: string,
    existingValue?: string
  ): Promise<string | undefined> {
    cli.blank();
    cli.info(`You need a ${keyName} API key.`);
    cli.dim(`Get it from: ${keyUrl}`);
    cli.blank();

    // If we have an existing value, confirm it
    if (existingValue && existingValue.length > 0) {
      const masked = this.maskApiKey(existingValue);
      cli.info(`Found ${keyName} API key in PAI configuration.`);
      cli.dim(`Key: ${masked}`);
      cli.blank();

      const { useKey } = await inquirer.prompt([
        {
          type: "confirm",
          name: "useKey",
          message: "Use this key?",
          default: true,
        },
      ]);

      if (useKey) {
        cli.success(`Using existing ${keyName} API key`);
        return existingValue;
      }
    }

    // Prompt for new key
    const { apiKey } = await inquirer.prompt([
      {
        type: "password",
        name: "apiKey",
        message: `Enter your ${keyName} API key:`,
        validate: (input: string) => {
          if (!input || input.trim().length === 0) {
            return "No API key provided. You'll need to add it later.";
          }
          return true;
        },
      },
    ]);

    if (apiKey && apiKey.trim().length > 0) {
      cli.success(`${keyName} API key received`);
      return apiKey.trim();
    } else {
      cli.warning("No API key provided");
      return undefined;
    }
  }

  /**
   * Mask API key for display
   */
  private maskApiKey(key: string): string {
    if (key.length <= 24) {
      return `${key.slice(0, 8)}...${key.slice(-4)}`;
    }
    return `${key.slice(0, 20)}...${key.slice(-4)}`;
  }

  /**
   * Read PAI configuration from PAI .env file
   */
  private async readPAIConfig(): Promise<void> {
    const possiblePaths = [
      `${process.env.HOME}/.config/pai/.env`,
      process.env.PAI_DIR ? `${process.env.PAI_DIR}/.env` : "",
      `${process.env.HOME}/.pai/.env`,
    ].filter(Boolean);

    let paiEnvPath: string | undefined;

    for (const path of possiblePaths) {
      try {
        const file = Bun.file(path);
        if (file.exists()) {
          paiEnvPath = path;
          break;
        }
      } catch {
        // Continue
      }
    }

    if (!paiEnvPath) {
      return;
    }

    cli.blank();
    cli.info("Checking PAI configuration...");

    try {
      const file = Bun.file(paiEnvPath);
      const content = await file.text();
      const env: Record<string, string> = {};

      // Parse .env file
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const eqIndex = trimmed.indexOf("=");
          if (eqIndex > 0) {
            const key = trimmed.slice(0, eqIndex).trim();
            const value = trimmed.slice(eqIndex + 1).trim();
            env[key] = value;
          }
        }
      }

      // Read PAI_KNOWLEDGE_* variables
      const paiPrefix = "PAI_KNOWLEDGE_";
      let foundAny = false;

      for (const [key, value] of Object.entries(env)) {
        if (key.startsWith(paiPrefix)) {
          const configKey = key.slice(paiPrefix.length);
          const standardKey = key.replace(paiPrefix, "");

          if (configKey === "OPENAI_API_KEY") {
            this.state.apiKeys.OPENAI_API_KEY = value;
            foundAny = true;
          } else if (configKey === "LLM_PROVIDER") {
            this.state.llmProvider = value;
            foundAny = true;
          } else if (configKey === "EMBEDDER_PROVIDER") {
            this.state.embedderProvider = value;
          } else if (configKey === "MODEL_NAME") {
            this.state.modelName = value;
            foundAny = true;
          } else if (configKey === "SEMAPHORE_LIMIT") {
            this.state.semaphoreLimit = value;
          } else if (configKey === "GROUP_ID") {
            this.state.paiConfig.GROUP_ID = value;
          } else if (configKey === "DATABASE_TYPE") {
            this.state.paiConfig.DATABASE_TYPE = value;
          } else if (configKey === "GRAPHITI_TELEMETRY_ENABLED") {
            this.state.paiConfig.GRAPHITI_TELEMETRY_ENABLED = value;
          }
        }
      }

      if (foundAny) {
        cli.success("Found PAI Knowledge System configuration in PAI .env");
        if (this.state.llmProvider) {
          cli.success(`LLM Provider from config: ${this.state.llmProvider}`);
        }
        if (this.state.modelName) {
          cli.success(`Model from config: ${this.state.modelName}`);
        }
      }
    } catch {
      // Ignore errors reading PAI config
    }
  }

  /**
   * Step 1: Verify prerequisites
   */
  private async verifyPrerequisites(): Promise<void> {
    cli.blank();
    cli.header("Step 1: Verify Prerequisites");

    if (!this.containerManager.isRuntimeAvailable()) {
      cli.error("Podman is not installed!");
      cli.blank();
      cli.info("Please install Podman first:");
      cli.dim("  macOS: brew install podman");
      cli.dim("  Linux: sudo apt install podman");
      cli.blank();
      cli.dim("Visit: https://podman.io/getting-started/installation");
      process.exit(1);
    }

    const versionResult = await this.containerManager.exec(["--version"], { quiet: true });
    if (versionResult.success) {
      cli.success(`Podman is installed: ${versionResult.stdout.trim()}`);
    }
  }

  /**
   * Step 2: Installation directory (skip in TS version - we know where we are)
   */
  private async confirmDirectory(): Promise<void> {
    cli.blank();
    cli.header("Step 2: Installation Directory");
    cli.info("Using current pack directory");
    cli.blank();
    cli.dim("(In TypeScript version, we always use the current pack directory)");
    await inquirer.prompt([
      {
        type: "input",
        name: "continue",
        message: "Press Enter to continue...",
      },
    ]);
  }

  /**
   * Step 3: LLM Provider Selection
   */
  private async selectProvider(): Promise<void> {
    cli.blank();
    cli.header("Step 3: LLM Provider Selection");

    const { provider } = await inquirer.prompt([
      {
        type: "list",
        name: "provider",
        message: "Select your LLM provider:",
        choices: PROVIDERS.map((p) => ({ name: p.name, value: p.id })),
        default: "openai",
      },
    ]);

    const selected = PROVIDERS.find((p) => p.id === provider);
    if (!selected) {
      cli.error("Invalid provider selection");
      process.exit(1);
    }

    this.state.llmProvider = selected.id;
    this.state.embedderProvider = selected.embedder;

    if (selected.embedder !== selected.id) {
      cli.warning(
        `Selected: ${selected.name} (requires OpenAI for embeddings)`
      );
    } else {
      cli.success(`Selected: ${selected.name}`);
    }
  }

  /**
   * Step 4: API Key Collection
   */
  private async collectAPIKeys(): Promise<void> {
    cli.blank();
    cli.header("Step 4: API Key Configuration");

    // Read existing PAI config first
    await this.readPAIConfig();

    const provider = PROVIDERS.find((p) => p.id === this.state.llmProvider);

    if (!provider) {
      cli.error("Invalid provider");
      process.exit(1);
    }

    // Collect OpenAI key if needed
    if (provider.needsOpenAI) {
      this.state.apiKeys.OPENAI_API_KEY = await this.collectKey(
        "PAI Knowledge System OpenAI",
        "https://platform.openai.com/api-keys",
        this.state.apiKeys.OPENAI_API_KEY
      );
    }

    // Collect Anthropic key
    if (this.state.llmProvider === "anthropic") {
      this.state.apiKeys.ANTHROPIC_API_KEY = await this.collectKey(
        "Anthropic",
        "https://console.anthropic.com/",
        this.state.apiKeys.ANTHROPIC_API_KEY
      );
    }

    // Collect Google key
    if (this.state.llmProvider === "gemini" || this.state.embedderProvider === "gemini") {
      this.state.apiKeys.GOOGLE_API_KEY = await this.collectKey(
        "Google",
        "https://aistudio.google.com/app/apikey",
        this.state.apiKeys.GOOGLE_API_KEY
      );
    }

    // Collect Groq key
    if (this.state.llmProvider === "groq") {
      this.state.apiKeys.GROQ_API_KEY = await this.collectKey(
        "Groq",
        "https://console.groq.com/",
        this.state.apiKeys.GROQ_API_KEY
      );
    }
  }

  /**
   * Step 5: Model Selection
   */
  private async selectModel(): Promise<void> {
    cli.blank();
    cli.header("Step 5: Model Configuration");

    const provider = PROVIDERS.find((p) => p.id === this.state.llmProvider);

    if (!provider) {
      cli.error("Invalid provider");
      process.exit(1);
    }

    // If provider has specific models, prompt for selection
    if (provider.models && provider.models.length > 0) {
      const { model } = await inquirer.prompt([
        {
          type: "list",
          name: "model",
          message: `Select ${provider.name} model:`,
          choices: provider.models,
          default: provider.models[0].value,
        },
      ]);

      this.state.modelName = model;
    } else {
      // Use default model for provider
      switch (this.state.llmProvider) {
        case "anthropic":
          this.state.modelName = "claude-sonnet-4-20250514";
          cli.info("Using Claude Sonnet 4");
          break;
        case "gemini":
          this.state.modelName = "gemini-2.0-flash-exp";
          cli.info("Using Gemini 2.0 Flash");
          break;
        default:
          this.state.modelName = "gpt-4o-mini";
      }
    }

    cli.success(`Selected model: ${this.state.modelName}`);
  }

  /**
   * Step 6: Concurrency Configuration
   */
  private async configureConcurrency(): Promise<void> {
    cli.blank();
    cli.header("Step 6: Performance Configuration");

    if (this.state.llmProvider === "openai") {
      const { tier } = await inquirer.prompt([
        {
          type: "list",
          name: "tier",
          message: "What is your OpenAI API tier?",
          choices: OPENAI_TIERS.map((t) => ({ name: t.name, value: t.semaphoreLimit })),
          default: 10,
        },
      ]);

      this.state.semaphoreLimit = String(tier);
    } else {
      this.state.semaphoreLimit = "5";
      cli.success("Using conservative concurrency: 5");
    }

    cli.success(`Concurrency limit: ${this.state.semaphoreLimit}`);
  }

  /**
   * Step 7: Create Configuration
   */
  private async createConfiguration(): Promise<void> {
    cli.blank();
    cli.header("Step 7: Creating Configuration");

    // Backup existing .env
    if (this.configLoader.envExists()) {
      cli.warning("Found existing .env file");

      const { backup } = await inquirer.prompt([
        {
          type: "confirm",
          name: "backup",
          message: "Backup and replace?",
          default: true,
        },
      ]);

      if (backup) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
        const backupPath = this.configLoader.getEnvFile() + `.backup.${timestamp}`;
        const originalFile = Bun.file(this.configLoader.getEnvFile());
        const content = await originalFile.text();
        await Bun.write(backupPath, content);
        cli.success(`Backed up to ${backupPath}`);
      } else {
        cli.error("Installation cancelled");
        process.exit(1);
      }
    }

    // Build configuration object
    const config = {
      OPENAI_API_KEY: this.state.apiKeys.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: this.state.apiKeys.ANTHROPIC_API_KEY,
      GOOGLE_API_KEY: this.state.apiKeys.GOOGLE_API_KEY,
      GROQ_API_KEY: this.state.apiKeys.GROQ_API_KEY,
      LLM_PROVIDER: this.state.llmProvider,
      EMBEDDER_PROVIDER: this.state.embedderProvider,
      MODEL_NAME: this.state.modelName,
      SEMAPHORE_LIMIT: this.state.semaphoreLimit,
      GROUP_ID: this.state.paiConfig.GROUP_ID || "main",
      DATABASE_TYPE: this.state.paiConfig.DATABASE_TYPE || "falkordb",
      GRAPHITI_TELEMETRY_ENABLED: this.state.paiConfig.GRAPHITI_TELEMETRY_ENABLED || "false",
    };

    // Save configuration
    await this.configLoader.save(config);

    cli.success("Configuration file created: .env");
  }

  /**
   * Step 8: Start Services
   */
  private async startServices(): Promise<void> {
    cli.blank();
    cli.header("Step 8: Starting Services");

    cli.info("Starting Graphiti MCP server...");
    cli.blank();

    // Import and run the start.ts script
    const startTime = Date.now();

    // Use spawn to run start.ts
    const proc = Bun.spawn(["bun", "src/server/start.ts"], {
      stdout: "inherit",
      stderr: "inherit",
      cwd: import.meta.dir + "/../../..",
    });

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      cli.error("Failed to start services");
      process.exit(1);
    }

    cli.blank();
    cli.info("Waiting for server to start...");

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 15000));

    // Check server health
    cli.blank();
    cli.info("Verifying server health...");

    try {
      const response = await fetch("http://localhost:8000/health", {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === "healthy" || data.status === "ok") {
          cli.success("Server is running!");
        } else {
          cli.warning("Server health check inconclusive");
        }
      } else {
        cli.warning("Server health check inconclusive");
      }
    } catch {
      cli.warning("Server health check inconclusive");
      cli.dim("Check logs with: bun run src/server/logs.ts");
    }
  }

  /**
   * Step 9: Install PAI Skill
   */
  private async installPAISkill(): Promise<void> {
    cli.blank();
    cli.header("Step 9: Installing PAI Skill");

    // Determine PAI directory
    const possiblePaths = [
      `${process.env.HOME}/.claude/Skills`,
      process.env.PAI_DIR ? `${process.env.PAI_DIR}/Skills` : "",
    ].filter(Boolean);

    let paiSkillsDir: string | undefined;

    for (const path of possiblePaths) {
      try {
        const dir = Bun.file(path);
        if (dir.exists()) {
          paiSkillsDir = path;
          break;
        }
      } catch {
        // Continue
      }
    }

    if (!paiSkillsDir) {
      cli.blank();
      cli.warning("PAI skills directory not found.");
      cli.info("Common locations:");
      cli.dim("  - ~/.claude/Skills");
      cli.dim("  - $PAI_DIR/Skills");
      cli.blank();

      const { customDir } = await inquirer.prompt([
        {
          type: "input",
          name: "customDir",
          message: "Enter PAI skills directory (or press Enter to skip):",
        },
      ]);

      if (customDir && customDir.trim().length > 0) {
        paiSkillsDir = customDir.trim();
      }
    }

    if (paiSkillsDir) {
      cli.blank();
      cli.info(`Installing to: ${paiSkillsDir}/pai-knowledge-system`);

      // Remove existing installation
      const existingPath = `${paiSkillsDir}/pai-knowledge-system`;
      try {
        const existing = Bun.file(existingPath);
        if (existing.exists()) {
          cli.warning("Removing existing installation");
          await this.containerManager.exec(["rm", "-rf", existingPath], { quiet: true });
        }
      } catch {
        // Continue
      }

      // Copy skill directory
      const packDir = import.meta.dir + "/../../../";
      const skillSource = `${packDir}/Knowledge`;

      try {
        await this.containerManager.exec(["cp", "-r", skillSource, `${paiSkillsDir}/pai-knowledge-system`], {
          quiet: false,
        });
        cli.success("PAI Knowledge System skill installed");
      } catch (error) {
        cli.error(`Failed to install PAI skill: ${String(error)}`);
      }
    } else {
      cli.warning("Skipping PAI skill installation. You can install it manually later.");
    }
  }

  /**
   * Step 10: Install History Sync Hook
   */
  private async installHistorySyncHook(): Promise<void> {
    cli.blank();
    cli.header("Step 10: Installing History Sync Hook");

    cli.blank();
    cli.info("The History Sync Hook automatically syncs learnings and research");
    cli.info("from the PAI History System to your knowledge graph.");
    cli.blank();

    const { installHook } = await inquirer.prompt([
      {
        type: "confirm",
        name: "installHook",
        message: "Install the History Sync Hook?",
        default: true,
      },
    ]);

    if (!installHook) {
      cli.warning("Skipping hook installation. You can install it manually later.");
      return;
    }

    // Determine PAI hooks directory
    const paiDir = process.env.PAI_DIR || `${process.env.HOME}/.config/pai`;
    const hooksDir = `${paiDir}/hooks/knowledge`;
    const settingsPath = `${paiDir}/settings.json`;

    cli.blank();
    cli.info(`Installing hooks to: ${hooksDir}`);

    try {
      // Create hooks directory
      const { mkdirSync, existsSync, copyFileSync, readFileSync, writeFileSync } = await import("fs");
      const { join, dirname } = await import("path");

      if (!existsSync(hooksDir)) {
        mkdirSync(hooksDir, { recursive: true });
      }

      // Create lib subdirectory
      const libDir = join(hooksDir, "lib");
      if (!existsSync(libDir)) {
        mkdirSync(libDir, { recursive: true });
      }

      // Copy hook files from pack
      const packDir = dirname(dirname(dirname(import.meta.dir)));
      const sourceHooksDir = join(packDir, "src", "hooks");

      const filesToCopy = [
        { src: "sync-history-to-knowledge.ts", dest: "sync-history-to-knowledge.ts" },
        { src: "lib/frontmatter-parser.ts", dest: "lib/frontmatter-parser.ts" },
        { src: "lib/sync-state.ts", dest: "lib/sync-state.ts" },
        { src: "lib/knowledge-client.ts", dest: "lib/knowledge-client.ts" },
      ];

      for (const file of filesToCopy) {
        const srcPath = join(sourceHooksDir, file.src);
        const destPath = join(hooksDir, file.dest);

        if (existsSync(srcPath)) {
          copyFileSync(srcPath, destPath);
          cli.success(`Installed: ${file.dest}`);
        } else {
          cli.warning(`Source not found: ${file.src}`);
        }
      }

      // Update settings.json to register the hook
      cli.blank();
      cli.info("Registering hook in settings.json...");

      let settings: any = {};
      if (existsSync(settingsPath)) {
        try {
          const content = readFileSync(settingsPath, "utf-8");
          settings = JSON.parse(content);
        } catch {
          cli.warning("Could not parse existing settings.json, creating new");
        }
      }

      // Ensure hooks structure exists
      if (!settings.hooks) {
        settings.hooks = {};
      }

      // Add SessionStart hook if not already present
      const hookCommand = `bun run ${hooksDir}/sync-history-to-knowledge.ts`;

      if (!settings.hooks.SessionStart) {
        settings.hooks.SessionStart = [];
      }

      // Check if hook already registered
      const hookExists = settings.hooks.SessionStart.some((h: any) =>
        h.hooks?.some((inner: any) => inner.command?.includes("sync-history-to-knowledge"))
      );

      if (!hookExists) {
        settings.hooks.SessionStart.push({
          matcher: "*",
          hooks: [
            {
              type: "command",
              command: hookCommand,
              timeout: 30000,
            },
          ],
        });

        writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        cli.success("Hook registered in settings.json");
      } else {
        cli.info("Hook already registered in settings.json");
      }

      cli.blank();
      cli.success("History Sync Hook installed!");
      cli.blank();
      cli.dim("The hook will:");
      cli.dim("  - Run on SessionStart");
      cli.dim("  - Sync learnings/ and research/ to knowledge graph");
      cli.dim("  - Skip already-synced files");
      cli.dim("  - Gracefully handle MCP server being offline");

    } catch (error) {
      cli.error(`Failed to install hook: ${String(error)}`);
      cli.dim("You can install the hook manually later.");
    }
  }

  /**
   * Step 11: Installation Summary
   */
  private printSummary(): void {
    cli.blank();
    cli.header("Installation Complete!");

    cli.blank();
    cli.info("📦 Configuration Summary:");
    cli.blank();
    cli.dim(`LLM Provider: ${this.state.llmProvider}`);
    cli.dim(`Model: ${this.state.modelName}`);
    cli.dim(`Concurrency: ${this.state.semaphoreLimit}`);
    cli.blank();

    cli.info("Services:");
    cli.url("  MCP Server", "http://localhost:8000/mcp/");
    cli.url("  FalkorDB UI", "http://localhost:3000");
    cli.url("  Health Check", "http://localhost:8000/health");
    cli.blank();

    cli.info("🎉 Next Steps:");
    cli.blank();
    cli.dim('1. Test the installation:');
    cli.dim('   Remember that I\'m testing the PAI Knowledge System.');
    cli.blank();
    cli.dim('2. Search your knowledge:');
    cli.dim('   What do I know about PAI?');
    cli.blank();
    cli.dim('3. Check system status:');
    cli.dim('   Show the knowledge graph status');
    cli.blank();
    cli.dim('4. History sync (automatic):');
    cli.dim('   Learnings and research from PAI History System');
    cli.dim('   are automatically synced on session start.');
    cli.blank();

    cli.info("Management Commands:");
    cli.dim("  View logs:    bun run src/server/logs.ts");
    cli.dim("  Restart:      bun run src/server/restart.ts");
    cli.dim("  Stop:         bun run src/server/stop.ts");
    cli.dim("  Start:        bun run src/server/start.ts");
    cli.dim("  Status:       bun run src/server/status.ts");
    cli.blank();

    cli.success("Installation complete!");
  }

  /**
   * Run the full installation
   */
  async run(): Promise<void> {
    cli.clear();
    cli.header("PAI Knowledge System Installation");
    cli.blank();
    cli.info("This script will install and configure the PAI Knowledge System.");
    cli.blank();
    cli.info("Prerequisites:");
    cli.dim("  - Podman (must be installed)");
    cli.dim("  - At least one LLM provider API key");
    cli.blank();

    await inquirer.prompt([
      {
        type: "input",
        name: "continue",
        message: "Press Enter to continue...",
      },
    ]);

    await this.verifyPrerequisites();
    await this.confirmDirectory();
    await this.selectProvider();
    await this.collectAPIKeys();
    await this.selectModel();
    await this.configureConcurrency();
    await this.createConfiguration();
    await this.startServices();
    await this.installPAISkill();
    await this.installHistorySyncHook();
    this.printSummary();
  }
}

/**
 * Main function
 */
async function main() {
  const installer = new Installer();
  await installer.run();
}

// Run main function
main().catch((error) => {
  cli.error("Unexpected error:");
  console.error(error);
  process.exit(1);
});
