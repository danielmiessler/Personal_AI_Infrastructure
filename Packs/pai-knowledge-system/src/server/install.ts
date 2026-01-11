#!/usr/bin/env bun
/**
 * PAI Knowledge System Installation Script v2.1.0
 *
 * Interactive installer that guides users through:
 * - LLM provider selection
 * - API key configuration
 * - Model selection
 * - Performance tuning
 * - PAI .env integration
 * - Service startup
 * - PAI skill installation
 *
 * Usage:
 *   bun run src/server/install.ts                # Fresh install (interactive)
 *   bun run src/server/install.ts --update       # Update existing installation
 *   bun run src/server/install.ts --yes          # Non-interactive with defaults
 *   bun run src/server/install.ts --update --yes # Update non-interactively
 */

// =============================================================================
// CLI FLAGS
// =============================================================================

const isUpdateMode = process.argv.includes("--update") || process.argv.includes("-u");
const isNonInteractive = process.argv.includes("--yes") || process.argv.includes("-y");

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

// =============================================================================
// NON-INTERACTIVE HELPERS
// =============================================================================

/**
 * Prompt wrapper that uses defaults in non-interactive mode
 */
async function promptWithDefault<T>(
  promptFn: () => Promise<T>,
  defaultValue: T,
  description?: string
): Promise<T> {
  if (isNonInteractive) {
    if (description) {
      cli.dim(`  Using default: ${description}`);
    }
    return defaultValue;
  }
  return promptFn();
}

/**
 * Confirm wrapper that auto-accepts in non-interactive mode
 */
async function confirmWithDefault(
  message: string,
  defaultValue: boolean = true
): Promise<boolean> {
  if (isNonInteractive) {
    cli.dim(`  Auto-${defaultValue ? 'accepting' : 'declining'}: ${message}`);
    return defaultValue;
  }
  const { result } = await inquirer.prompt([
    {
      type: "confirm",
      name: "result",
      message,
      default: defaultValue,
    },
  ]);
  return result;
}

/**
 * Press enter wrapper that skips in non-interactive mode
 */
async function pressEnterToContinue(message: string = "Press Enter to continue..."): Promise<void> {
  if (isNonInteractive) {
    return;
  }
  await inquirer.prompt([
    {
      type: "input",
      name: "continue",
      message,
    },
  ]);
}

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

      // In non-interactive mode, always use existing key
      if (isNonInteractive) {
        cli.success(`Using existing ${keyName} API key`);
        return existingValue;
      }

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

    // In non-interactive mode without existing key, check environment
    if (isNonInteractive) {
      // Try to get from environment variables
      const envKey = keyName.includes("OpenAI") ? process.env.OPENAI_API_KEY || process.env.PAI_KNOWLEDGE_OPENAI_API_KEY
        : keyName.includes("Anthropic") ? process.env.ANTHROPIC_API_KEY || process.env.PAI_KNOWLEDGE_ANTHROPIC_API_KEY
        : keyName.includes("Google") ? process.env.GOOGLE_API_KEY || process.env.PAI_KNOWLEDGE_GOOGLE_API_KEY
        : keyName.includes("Groq") ? process.env.GROQ_API_KEY || process.env.PAI_KNOWLEDGE_GROQ_API_KEY
        : undefined;

      if (envKey) {
        cli.success(`Using ${keyName} API key from environment`);
        return envKey;
      }

      cli.warning(`No ${keyName} API key found - set via environment or run interactively`);
      return undefined;
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
   * Path priority: PAI_DIR > ~/.claude > ~/.config/pai (legacy)
   */
  private async readPAIConfig(): Promise<void> {
    const possiblePaths = [
      process.env.PAI_DIR ? `${process.env.PAI_DIR}/.env` : "",
      `${process.env.HOME}/.claude/.env`,
      `${process.env.HOME}/.config/pai/.env`,  // Legacy fallback
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
    await pressEnterToContinue();
  }

  /**
   * Step 3: LLM Provider Selection
   */
  private async selectProvider(): Promise<void> {
    cli.blank();
    cli.header("Step 3: LLM Provider Selection");

    let provider: string;

    if (isNonInteractive) {
      // Use existing provider from state (loaded from config) or default to openai
      provider = this.state.llmProvider || "openai";
      cli.dim(`  Using provider: ${provider}`);
    } else {
      const result = await inquirer.prompt([
        {
          type: "list",
          name: "provider",
          message: "Select your LLM provider:",
          choices: PROVIDERS.map((p) => ({ name: p.name, value: p.id })),
          default: this.state.llmProvider || "openai",
        },
      ]);
      provider = result.provider;
    }

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
      if (isNonInteractive) {
        // Use existing model from state or first available
        const existingModel = provider.models.find(m => m.value === this.state.modelName);
        this.state.modelName = existingModel?.value || provider.models[0].value;
        cli.dim(`  Using model: ${this.state.modelName}`);
      } else {
        const { model } = await inquirer.prompt([
          {
            type: "list",
            name: "model",
            message: `Select ${provider.name} model:`,
            choices: provider.models,
            default: this.state.modelName || provider.models[0].value,
          },
        ]);
        this.state.modelName = model;
      }
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
      if (isNonInteractive) {
        // Use existing or default to Tier 3 (most common)
        const existingLimit = parseInt(this.state.semaphoreLimit, 10);
        if (!existingLimit || existingLimit < 1) {
          this.state.semaphoreLimit = "10";
        }
        cli.dim(`  Using concurrency limit: ${this.state.semaphoreLimit}`);
      } else {
        const { tier } = await inquirer.prompt([
          {
            type: "list",
            name: "tier",
            message: "What is your OpenAI API tier?",
            choices: OPENAI_TIERS.map((t) => ({ name: t.name, value: t.semaphoreLimit })),
            default: parseInt(this.state.semaphoreLimit, 10) || 10,
          },
        ]);
        this.state.semaphoreLimit = String(tier);
      }
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

      const shouldBackup = await confirmWithDefault("Backup and replace?", true);

      if (shouldBackup) {
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

    // Import and run the run.ts script
    const startTime = Date.now();

    // Use spawn to run run.ts from the pack directory
    const packDir = import.meta.dir.replace(/\/src\/server$/, "");
    const proc = Bun.spawn(["bun", "run", "src/server/run.ts"], {
      stdout: "inherit",
      stderr: "inherit",
      cwd: packDir,
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
      cli.dim("Check logs with: bun run logs");
    }
  }

  /**
   * Step 9: Install PAI Skill
   * Path priority: PAI_DIR > ~/.claude (PAI v2.1.0 standard)
   */
  private async installPAISkill(): Promise<void> {
    cli.blank();
    cli.header("Step 9: Installing PAI Skill");

    // Determine PAI directory - prefer PAI_DIR, then ~/.claude
    const possiblePaths = [
      process.env.PAI_DIR ? `${process.env.PAI_DIR}/skills` : "",
      `${process.env.HOME}/.claude/skills`,
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
      cli.dim("  - ~/.claude/skills");
      cli.dim("  - $PAI_DIR/skills");
      cli.blank();

      if (isNonInteractive) {
        // Create default skills directory in non-interactive mode
        paiSkillsDir = `${process.env.HOME}/.claude/skills`;
        cli.dim(`  Creating default: ${paiSkillsDir}`);
        const { mkdirSync } = await import("fs");
        mkdirSync(paiSkillsDir, { recursive: true });
      } else {
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
   * Hooks install to ~/.claude/hooks/ where Claude Code reads them (PAI v2.1.0)
   */
  private async installHistorySyncHook(): Promise<void> {
    cli.blank();
    cli.header("Step 10: Installing History Sync Hook");

    cli.blank();
    cli.info("The History Sync Hook automatically syncs learnings and research");
    cli.info("from the PAI History System to your knowledge graph.");
    cli.blank();

    const installHook = await confirmWithDefault("Install the History Sync Hook?", true);

    if (!installHook) {
      cli.warning("Skipping hook installation. You can install it manually later.");
      return;
    }

    // Determine PAI hooks directory - ~/.claude is where Claude Code reads hooks
    const paiDir = process.env.PAI_DIR || `${process.env.HOME}/.claude`;
    const hooksDir = `${paiDir}/hooks`;
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
    cli.dim("  View logs:    bun run logs");
    cli.dim("  Restart:      bun run stop && bun run start");
    cli.dim("  Stop:         bun run stop");
    cli.dim("  Start:        bun run start");
    cli.dim("  Status:       bun run status");
    cli.blank();

    cli.success("Installation complete!");
  }

  /**
   * Run the full installation
   */
  async run(): Promise<void> {
    cli.clear();

    const modeLabel = isUpdateMode ? "UPDATE" : isNonInteractive ? "NON-INTERACTIVE" : "v2.1.0";
    cli.header(`PAI Knowledge System Installation (${modeLabel})`);
    cli.blank();

    // In non-interactive mode, always read existing config first
    if (isNonInteractive) {
      cli.info("Non-interactive mode: Using defaults and existing configuration.");
      cli.blank();
      await this.readPAIConfig();

      if (this.state.llmProvider) cli.dim(`  LLM Provider: ${this.state.llmProvider}`);
      if (this.state.modelName) cli.dim(`  Model: ${this.state.modelName}`);
      if (this.state.apiKeys.OPENAI_API_KEY) cli.dim(`  OpenAI API key: ****${this.state.apiKeys.OPENAI_API_KEY.slice(-4)}`);
      cli.blank();
    }

    if (isUpdateMode) {
      cli.info("Update mode: Preserving existing configuration where possible.");
      cli.blank();
      cli.dim("  - Will use existing API keys as defaults");
      cli.dim("  - Will preserve LLM provider settings");
      cli.dim("  - Only updates infrastructure files");
      cli.blank();

      // Check for existing installation
      if (!this.configLoader.envExists()) {
        cli.error("Update mode requires an existing installation.");
        cli.dim("Run without --update for a fresh install.");
        process.exit(1);
      }

      // Read existing config first (if not already read in non-interactive mode)
      if (!isNonInteractive) {
        await this.readPAIConfig();

        cli.info("Found existing configuration:");
        if (this.state.llmProvider) cli.dim(`  LLM Provider: ${this.state.llmProvider}`);
        if (this.state.modelName) cli.dim(`  Model: ${this.state.modelName}`);
        if (this.state.apiKeys.OPENAI_API_KEY) cli.dim(`  OpenAI API key: ****${this.state.apiKeys.OPENAI_API_KEY.slice(-4)}`);
        cli.blank();
      }

      const proceed = await confirmWithDefault("Proceed with update?", true);

      if (!proceed) {
        cli.info("Update cancelled.");
        process.exit(0);
      }
    } else if (!isNonInteractive) {
      cli.info("This script will install and configure the PAI Knowledge System.");
      cli.blank();
      cli.info("Prerequisites:");
      cli.dim("  - Podman (must be installed)");
      cli.dim("  - At least one LLM provider API key");
      cli.blank();

      await pressEnterToContinue();
    }

    await this.verifyPrerequisites();

    if (!isUpdateMode && !isNonInteractive) {
      await this.confirmDirectory();
    }

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
