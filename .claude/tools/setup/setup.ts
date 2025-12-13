#!/usr/bin/env bun
/**
 * PAI Setup Wizard
 * Interactive configuration tool for Personal AI Infrastructure
 */

import * as p from '@clack/prompts';
import { parseArgs } from 'util';
import { runInteractiveSetup } from './interactive';
import { Transaction } from './core/transaction';
import { logger } from './core/logger';
import {
  createDirectories,
  writeProfile,
  writePlist,
  updateShellProfile,
  processTemplateFiles,
  type SetupConfig,
} from './configurators';
import { expandPath, validatePath, validateEmail, validateName, validateAssistantName } from './validators';

/**
 * Parse command line arguments
 */
function parseCliArgs() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      'pai-dir': { type: 'string' },
      name: { type: 'string' },
      email: { type: 'string' },
      'assistant-name': { type: 'string' },
      'assistant-color': { type: 'string', default: 'purple' },
      'voice-port': { type: 'string', default: '8888' },
      'skip-voice': { type: 'boolean', default: false },
      'skip-shell-profile': { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
      version: { type: 'boolean', default: false },
    },
    allowPositionals: false,
  });

  return values;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
PAI Setup Wizard - Configure your Personal AI Infrastructure

Usage:
  bun run setup.ts [options]

Options:
  --pai-dir <path>          PAI installation directory (default: ~/.claude)
  --name <name>             Your name
  --email <email>           Your email
  --assistant-name <name>   AI assistant name (default: Assistant)
  --assistant-color <color> Color theme: blue, purple, green, cyan, red (default: purple)
  --voice-port <port>       Voice server port (default: 8888)
  --skip-voice              Don't configure voice server
  --skip-shell-profile      Don't update shell profile
  --dry-run                 Show what would be done without making changes
  --force                   Skip confirmation prompts
  --help                    Show this help message
  --version                 Show version

Interactive Mode:
  Run without arguments for interactive setup wizard.

Examples:
  # Interactive setup (recommended)
  bun run setup.ts

  # Non-interactive setup
  bun run setup.ts --pai-dir ~/.claude --name "Jane Doe" --email jane@example.com --force
`);
}

/**
 * Build config from CLI args
 */
function buildConfigFromArgs(args: ReturnType<typeof parseCliArgs>): SetupConfig | null {
  // Validate required fields for non-interactive mode
  if (!args['pai-dir'] || !args.name || !args.email) {
    logger.error('Non-interactive mode requires --pai-dir, --name, and --email');
    return null;
  }

  const paiDirError = validatePath(args['pai-dir']);
  if (paiDirError) {
    logger.error(`Invalid PAI directory: ${paiDirError}`);
    return null;
  }

  const nameError = validateName(args.name);
  if (nameError) {
    logger.error(`Invalid name: ${nameError}`);
    return null;
  }

  const emailError = validateEmail(args.email);
  if (emailError) {
    logger.error(`Invalid email: ${emailError}`);
    return null;
  }

  const assistantName = args['assistant-name'] || 'Assistant';
  const assistantNameError = validateAssistantName(assistantName);
  if (assistantNameError) {
    logger.error(`Invalid assistant name: ${assistantNameError}`);
    return null;
  }

  return {
    paiDir: expandPath(args['pai-dir']),
    userName: args.name,
    userEmail: args.email,
    assistantName,
    assistantColor: args['assistant-color'] || 'purple',
    voicePort: parseInt(args['voice-port'] || '8888', 10),
    voiceEnabled: !args['skip-voice'] && process.platform === 'darwin',
    updateShellProfile: !args['skip-shell-profile'],
  };
}

/**
 * Apply configuration changes
 */
async function applyConfiguration(config: SetupConfig, dryRun: boolean): Promise<boolean> {
  const transaction = new Transaction();

  try {
    // Step 1: Create directories
    p.log.step('Creating directory structure...');
    if (!dryRun) {
      await createDirectories(config);
    }
    p.log.success('Directory structure created');

    // Step 2: Write profile config
    p.log.step('Writing profile configuration...');
    if (!dryRun) {
      await writeProfile(config, transaction);
    }
    p.log.success(`Profile saved to ${config.paiDir}/config/profile.json`);

    // Step 3: Configure voice server (macOS only)
    if (config.voiceEnabled) {
      p.log.step('Configuring voice server...');
      if (!dryRun) {
        await writePlist(config, transaction);
      }
      p.log.success('Voice server plist installed');
    } else {
      p.log.info('Voice server: skipped');
    }

    // Step 4: Update shell profile
    if (config.updateShellProfile) {
      p.log.step('Updating shell profile...');
      if (!dryRun) {
        const profilePath = await updateShellProfile(config, transaction);
        if (profilePath) {
          p.log.success(`Shell profile updated: ${profilePath}`);
        }
      } else {
        p.log.success('Shell profile would be updated');
      }
    } else {
      p.log.info('Shell profile: skipped');
    }

    // Step 5: Process template files (agents, etc.)
    p.log.step('Personalizing agent configurations...');
    if (!dryRun) {
      await processTemplateFiles(config, transaction);
    }
    p.log.success(`Agent files personalized with name: ${config.assistantName}`);

    // Commit transaction
    if (!dryRun) {
      transaction.commit();
    }

    return true;
  } catch (error) {
    logger.error(`Setup failed: ${error}`);

    // Rollback changes
    try {
      if (!dryRun) {
        await transaction.rollback();
        logger.info('Changes rolled back successfully');
      }
    } catch (rollbackError) {
      logger.error(`Rollback failed: ${rollbackError}`);
    }

    return false;
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = parseCliArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (args.version) {
    console.log('PAI Setup Wizard v1.0.0');
    process.exit(0);
  }

  let config: SetupConfig | null;

  // Determine mode: interactive vs non-interactive
  const isNonInteractive = args['pai-dir'] || args.name || args.email || args.force;

  if (isNonInteractive) {
    config = buildConfigFromArgs(args);
  } else {
    config = await runInteractiveSetup();
  }

  if (!config) {
    process.exit(1);
  }

  // Apply configuration
  const success = await applyConfiguration(config, args['dry-run'] ?? false);

  if (success) {
    p.outro('✨ PAI setup complete!');

    logger.blank();
    logger.info('Next steps:');
    logger.step(`1. Reload your shell: source ~/.zshrc`);
    if (config.voiceEnabled) {
      logger.step(`2. Load voice server: launchctl load ~/Library/LaunchAgents/com.pai.voiceserver.plist`);
    }
    logger.step(`${config.voiceEnabled ? '3' : '2'}. Start Claude: claude`);
    logger.blank();
    logger.dim(`Your AI assistant "${config.assistantName}" is ready!`);

    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error(`Unexpected error: ${error}`);
  process.exit(1);
});
