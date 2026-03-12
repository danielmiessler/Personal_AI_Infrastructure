/**
 * PAI Uninstaller — CLI Wizard
 * Interactive command-line uninstallation experience.
 */

import { homedir } from "os";
import { join } from "path";
import type { EngineEvent, UninstallState, GetConfirm } from "../engine/types";
import { STEPS, TOTAL_STEPS } from "../engine/steps";
import {
  runDetect,
  runBackup,
  runVoiceServer,
  runMenubar,
  runShellConfig,
  runSymlinks,
  runPaiDirs,
  runPaiFiles,
  runSkills,
  runAgents,
  runLib,
  runSettings,
  runHooks,
  runMemory,
  runUserData,
  runConfigDir,
} from "../engine/actions";
import {
  printBanner,
  printStep,
  printDetectionPreview,
  printCompletionSummary,
  print,
  printSuccess,
  printError,
  printWarning,
  printInfo,
  printRemoved,
  printBackedUp,
  printSkipped,
  progressBar,
  c,
} from "./display";
import { promptConfirm } from "./prompts";

/**
 * Create a fresh uninstall state.
 */
function createFreshState(force: boolean): UninstallState {
  const home = homedir();
  return {
    version: "3.0",
    startedAt: new Date().toISOString(),
    force,
    paiDir: join(home, ".claude"),
    configDir: process.env.PAI_CONFIG_DIR ?? join(home, ".config", "PAI"),
    backupDir: null,
    completedSteps: [],
    skippedSteps: [],
    detection: null,
  };
}

/**
 * Handle engine events in CLI mode.
 */
function createEventHandler(): (event: EngineEvent) => void {
  return (event: EngineEvent) => {
    switch (event.event) {
      case "step_start":
        break; // handled by the main loop with printStep
      case "step_complete":
        printSuccess("Done");
        break;
      case "step_skip":
        printInfo(`Skipped: ${event.reason}`);
        break;
      case "step_error":
        printError(`Error: ${event.error}`);
        break;
      case "progress":
        print(`  ${progressBar(event.percent)} ${c.gray}${event.detail}${c.reset}`);
        break;
      case "message":
        print(`\n  ${event.content}\n`);
        break;
      case "removed":
        printRemoved(event.path);
        break;
      case "backed_up":
        printBackedUp(event.path);
        break;
      case "skipped_item":
        printSkipped(event.reason);
        break;
      case "warn":
        printWarning(event.message);
        break;
      case "info":
        printInfo(event.message);
        break;
      case "error":
        printError(event.message);
        break;
    }
  };
}

/**
 * Build the confirmation adapter.
 * In force mode, always returns true.
 * In interactive mode, prompts the user.
 */
function createGetConfirm(state: UninstallState): GetConfirm {
  return async (_id: string, question: string, defaultYes: boolean = false): Promise<boolean> => {
    if (state.force) return true;
    return promptConfirm(question, defaultYes);
  };
}

/**
 * Run the full CLI uninstallation wizard.
 */
export async function runCLI(options: { force: boolean }): Promise<void> {
  printBanner();

  const state = createFreshState(options.force);
  const emit = createEventHandler();
  const getConfirm = createGetConfirm(state);

  try {
    // ── Step 1: Detect ──────────────────────────────────────────
    {
      const step = STEPS[0];
      printStep(step.number, TOTAL_STEPS, step.name);
      await runDetect(state, emit);
    }

    // ── Preview + main confirmation ─────────────────────────────
    printDetectionPreview(state.detection!);

    if (!options.force) {
      const proceed = await promptConfirm("Proceed with uninstall?", false);
      if (!proceed) {
        print(`\n  ${c.gray}Uninstall cancelled.${c.reset}\n`);
        process.exit(0);
      }
    }

    // ── Step 2: Backup ──────────────────────────────────────────
    {
      const step = STEPS[1];
      printStep(step.number, TOTAL_STEPS, step.name);
      await runBackup(state, emit);
    }

    // ── Step 3: Voice Server ────────────────────────────────────
    {
      const step = STEPS[2];
      printStep(step.number, TOTAL_STEPS, step.name);
      await runVoiceServer(state, emit);
    }

    // ── Step 4: Menubar ─────────────────────────────────────────
    {
      const step = STEPS[3];
      printStep(step.number, TOTAL_STEPS, step.name);
      await runMenubar(state, emit);
    }

    // ── Step 5: Shell Config ────────────────────────────────────
    {
      const step = STEPS[4];
      printStep(step.number, TOTAL_STEPS, step.name);
      await runShellConfig(state, emit);
    }

    // ── Step 6: Symlinks ────────────────────────────────────────
    {
      const step = STEPS[5];
      printStep(step.number, TOTAL_STEPS, step.name);
      await runSymlinks(state, emit);
    }

    // ── Step 7: PAI Directories ─────────────────────────────────
    {
      const step = STEPS[6];
      printStep(step.number, TOTAL_STEPS, step.name);
      await runPaiDirs(state, emit);
    }

    // ── Step 8: PAI Root Files ──────────────────────────────────
    {
      const step = STEPS[7];
      printStep(step.number, TOTAL_STEPS, step.name);
      await runPaiFiles(state, emit);
    }

    // ── Step 9: Skills ──────────────────────────────────────────
    {
      const step = STEPS[8];
      printStep(step.number, TOTAL_STEPS, step.name);
      await runSkills(state, emit);
    }

    // ── Step 10: Agents ─────────────────────────────────────────
    {
      const step = STEPS[9];
      printStep(step.number, TOTAL_STEPS, step.name);
      await runAgents(state, emit);
    }

    // ── Step 11: lib/migration ──────────────────────────────────
    {
      const step = STEPS[10];
      printStep(step.number, TOTAL_STEPS, step.name);
      await runLib(state, emit);
    }

    // ── Step 12: settings.json ──────────────────────────────────
    {
      const step = STEPS[11];
      printStep(step.number, TOTAL_STEPS, step.name);
      await runSettings(state, emit);
    }

    // ── Step 13: Hooks ──────────────────────────────────────────
    {
      const step = STEPS[12];
      printStep(step.number, TOTAL_STEPS, step.name);
      await runHooks(state, emit);
    }

    // ── Step 14: Memory ─────────────────────────────────────────
    {
      const step = STEPS[13];
      printStep(step.number, TOTAL_STEPS, step.name);
      await runMemory(state, emit, getConfirm);
    }

    // ── Step 15: User Data ──────────────────────────────────────
    {
      const step = STEPS[14];
      printStep(step.number, TOTAL_STEPS, step.name);
      await runUserData(state, emit, getConfirm);
    }

    // ── Step 16: Config Dir ─────────────────────────────────────
    {
      const step = STEPS[15];
      printStep(step.number, TOTAL_STEPS, step.name);
      await runConfigDir(state, emit, getConfirm);
    }

    // ── Summary ─────────────────────────────────────────────────
    printCompletionSummary(state.backupDir ?? "~/.pai-uninstall-backup");
    process.exit(0);

  } catch (error: any) {
    printError(`\nUninstall failed: ${error.message}`);
    process.exit(1);
  }
}
