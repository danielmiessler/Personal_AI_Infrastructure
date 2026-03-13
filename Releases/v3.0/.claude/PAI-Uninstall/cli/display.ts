/**
 * PAI Uninstaller — CLI Display Helpers
 * ANSI colors, progress bars, banner, and formatted output.
 */

// ─── ANSI Colors ──────────────────────────────────────────────────

export const c = {
  reset:     "\x1b[0m",
  bold:      "\x1b[1m",
  dim:       "\x1b[2m",
  italic:    "\x1b[3m",
  blue:      "\x1b[38;2;59;130;246m",
  lightBlue: "\x1b[38;2;147;197;253m",
  navy:      "\x1b[38;2;30;58;138m",
  green:     "\x1b[38;2;34;197;94m",
  yellow:    "\x1b[38;2;234;179;8m",
  red:       "\x1b[38;2;239;68;68m",
  gray:      "\x1b[38;2;100;116;139m",
  steel:     "\x1b[38;2;51;65;85m",
  silver:    "\x1b[38;2;203;213;225m",
  white:     "\x1b[38;2;203;213;225m",
  cyan:      "\x1b[36m",
};

export function print(text: string): void {
  process.stdout.write(text + "\n");
}

export function printSuccess(text: string): void {
  print(`  ${c.green}✓${c.reset} ${text}`);
}

export function printError(text: string): void {
  print(`  ${c.red}✗${c.reset} ${text}`);
}

export function printWarning(text: string): void {
  print(`  ${c.yellow}⚠${c.reset} ${text}`);
}

export function printInfo(text: string): void {
  print(`  ${c.blue}ℹ${c.reset} ${text}`);
}

export function printRemoved(path: string): void {
  print(`  ${c.red}✗${c.reset}  ${c.silver}${path}${c.reset} ${c.gray}removed${c.reset}`);
}

export function printBackedUp(path: string): void {
  print(`  ${c.blue}↪${c.reset}  ${c.silver}${path}${c.reset} ${c.gray}backed up${c.reset}`);
}

export function printSkipped(reason: string): void {
  print(`  ${c.gray}–  ${reason} (not found, skipping)${c.reset}`);
}

export function printStep(num: number, total: number, name: string): void {
  print("");
  print(`${c.steel}┄┄┄${c.reset} ${c.bold}${name}${c.reset} ${c.gray}(${num}/${total})${c.reset}`);
  print("");
}

// ─── Progress Bar ─────────────────────────────────────────────────

export function progressBar(percent: number, width: number = 30): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return `${c.blue}${"▓".repeat(filled)}${c.gray}${"░".repeat(empty)}${c.reset} ${percent}%`;
}

// ─── Banner ───────────────────────────────────────────────────────

export function printBanner(): void {
  print("");
  print(`${c.steel}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${c.reset}`);
  print("");
  print(`               ${c.blue}PAI${c.reset} ${c.gray}|${c.reset} ${c.silver}Personal AI Infrastructure — Uninstaller${c.reset}`);
  print("");
  print(`  ${c.gray}Removes only PAI-installed content. Claude Code's own files are${c.reset}`);
  print(`  ${c.gray}left untouched. Mixed-content areas are backed up first.${c.reset}`);
  print("");
  print(`${c.steel}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${c.reset}`);
  print("");
}

// ─── Detection Preview ────────────────────────────────────────────

import type { UninstallDetection } from "../engine/types";

export function printDetectionPreview(det: UninstallDetection): void {
  print(`  ${c.bold}PAI-exclusive content${c.reset} ${c.gray}(will be removed):${c.reset}`);

  for (const d of det.paiExclusiveDirs) {
    print(`  ${c.red}•${c.reset} ${c.silver}~/.claude/${d}/${c.reset}`);
  }
  if (det.hasStatuslineCmd) {
    print(`  ${c.red}•${c.reset} ${c.silver}~/.claude/statusline-command.sh${c.reset}`);
  }
  if (det.hasLaunchAgent) {
    print(`  ${c.red}•${c.reset} ${c.silver}~/Library/LaunchAgents/com.pai.voice-server.plist${c.reset}`);
  }
  if (det.hasVoiceLog) {
    print(`  ${c.red}•${c.reset} ${c.silver}~/Library/Logs/pai-voice-server.log${c.reset}`);
  }
  print("");

  print(`  ${c.bold}PAI files in shared directories${c.reset} ${c.gray}(removed by name, other files kept):${c.reset}`);

  if (det.presentSkills.length > 0) {
    print(`  ${c.red}•${c.reset} ${c.silver}${det.presentSkills.length} PAI skill dirs${c.reset} ${c.gray}from ~/.claude/skills/ (user-installed skills kept)${c.reset}`);
  }
  if (det.presentAgents.length > 0) {
    print(`  ${c.red}•${c.reset} ${c.silver}${det.presentAgents.length} PAI agent files${c.reset} ${c.gray}from ~/.claude/agents/ (other agents kept)${c.reset}`);
  }
  if (det.hasLibMigration) {
    print(`  ${c.red}•${c.reset} ${c.silver}~/.claude/lib/migration/${c.reset} ${c.gray}(PAI migration tools)${c.reset}`);
  }
  if (det.hasInstallSh) {
    print(`  ${c.red}•${c.reset} ${c.silver}~/.claude/install.sh${c.reset} ${c.gray}(PAI installer entry-point)${c.reset}`);
  }
  if (det.claudeMdStatus === "pai") {
    print(`  ${c.red}•${c.reset} ${c.silver}~/.claude/CLAUDE.md${c.reset} ${c.gray}(contains PAI content — will be removed)${c.reset}`);
  } else if (det.claudeMdStatus === "empty") {
    print(`  ${c.red}•${c.reset} ${c.silver}~/.claude/CLAUDE.md${c.reset} ${c.gray}(empty — likely created by PAI, will be removed)${c.reset}`);
  } else if (det.claudeMdStatus === "user") {
    print(`  ${c.yellow}•${c.reset} ${c.silver}~/.claude/CLAUDE.md${c.reset} ${c.gray}(contains user content — will be left alone)${c.reset}`);
  }
  print(`  ${c.red}•${c.reset} ${c.silver}PAI keys in settings.json${c.reset} ${c.gray}(principal, daidentity, pai, counts, statusLine)${c.reset}`);
  if (det.hasZshrcAlias || det.hasFishAlias) {
    print(`  ${c.red}•${c.reset} ${c.silver}PAI alias${c.reset} ${c.gray}in shell config${c.reset}`);
  }
  print("");

  print(`  ${c.bold}Fine-grained removal${c.reset} ${c.gray}(PAI files removed, user content offered separately):${c.reset}`);

  if (det.presentHooks.length > 0) {
    print(`  ${c.red}•${c.reset} ${c.silver}~/.claude/hooks/${c.reset} ${c.gray}— ${det.presentHooks.length} PAI hooks removed; ${det.userHookCount} user-added file(s) kept${c.reset}`);
  }
  if (det.hasMemory) {
    print(`  ${c.red}•${c.reset} ${c.silver}~/.claude/MEMORY/STATE/${c.reset} ${c.gray}(PAI runtime caches — auto-removed)${c.reset}`);
    if (det.memoryUserSubdirs.length > 0) {
      print(`  ${c.blue}•${c.reset} ${c.silver}~/.claude/MEMORY/${det.memoryUserSubdirs.join(", ")}${c.reset} ${c.gray}(your data — offered individually)${c.reset}`);
    }
  }
  if (det.planCount > 0) {
    print(`  ${c.blue}•${c.reset} ${c.silver}~/.claude/plans/${c.reset}  ${c.gray}(${det.planCount} file(s) — offered for removal)${c.reset}`);
  }
  if (det.taskCount > 0) {
    print(`  ${c.blue}•${c.reset} ${c.silver}~/.claude/tasks/${c.reset}  ${c.gray}(${det.taskCount} item(s) — offered for removal)${c.reset}`);
  }
  if (det.teamCount > 0) {
    print(`  ${c.blue}•${c.reset} ${c.silver}~/.claude/teams/${c.reset}  ${c.gray}(${det.teamCount} item(s) — offered for removal)${c.reset}`);
  }
  if (det.hasConfigDir) {
    print(`  ${c.blue}•${c.reset} ${c.silver}~/.config/PAI/${c.reset}    ${c.gray}(API keys — offered for removal)${c.reset}`);
  }
  print("");

  print(`  ${c.gray}${c.bold}Not touched:${c.reset} ${c.gray}projects/, todos/, plugins/, .credentials.json, history.jsonl,${c.reset}`);
  print(`  ${c.gray}statsig/, agents/ (remaining), skills/ (remaining), lib/ (remaining),${c.reset}`);
  print(`  ${c.gray}cache/, debug/, telemetry/, and all other Claude Code files.${c.reset}`);
  print("");
}

// ─── Completion Summary ───────────────────────────────────────────

export function printCompletionSummary(backupDir: string): void {
  print("");
  print(`${c.steel}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${c.reset}`);
  print("");
  print(`              ${c.green}✓${c.reset}  ${c.bold}PAI Uninstall Complete${c.reset}`);
  print("");
  print(`  ${c.gray}Backup saved to:${c.reset} ${c.silver}${backupDir}${c.reset}`);
  print("");
  print(`  ${c.gray}Next steps:${c.reset}`);
  print(`  ${c.gray}• Restart your terminal to clear the${c.reset} ${c.silver}pai${c.reset} ${c.gray}alias${c.reset}`);
  print(`  ${c.gray}• Review backup before deleting:${c.reset} ${c.silver}ls ${backupDir}${c.reset}`);
  print(`  ${c.gray}• Claude Code (the CLI) remains installed — to remove it:${c.reset}`);
  print(`    ${c.silver}npm uninstall -g @anthropic-ai/claude-code${c.reset}`);
  print("");
  print(`${c.steel}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${c.reset}`);
  print("");
}
