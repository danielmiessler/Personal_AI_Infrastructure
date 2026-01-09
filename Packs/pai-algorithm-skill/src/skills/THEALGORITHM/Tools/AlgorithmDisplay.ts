#!/usr/bin/env bun

/**
 * AlgorithmDisplay - LCARS-style visual display for THE ALGORITHM
 *
 * Shows current effort level, phase progression, and ISC status with
 * Star Trek LCARS-inspired design. Supports voice announcements.
 *
 * Usage:
 *   bun run AlgorithmDisplay.ts show                    # Full display
 *   bun run AlgorithmDisplay.ts phase THINK             # Update phase + voice
 *   bun run AlgorithmDisplay.ts effort THOROUGH         # Show effort banner
 *   bun run AlgorithmDisplay.ts transition THINK PLAN   # Animated transition
 */

import { parseArgs } from "util";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const PAI_DIR = process.env.PAI_DIR || join(process.env.HOME!, ".config/pai");
const STATE_DIR = join(PAI_DIR, "MEMORY/State");
const ISC_PATH = join(PAI_DIR, "MEMORY/Work/current-isc.json");
const ALGORITHM_STATE_PATH = join(STATE_DIR, "algorithm-state.json");

// ANSI color codes - Tokyo Night / LCARS palette
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

// LCARS colors
const LCARS = {
  // Primary colors
  ORANGE: "\x1b[38;2;255;153;0m",
  GOLD: "\x1b[38;2;204;153;0m",
  YELLOW: "\x1b[38;2;255;204;0m",
  BLUE: "\x1b[38;2;153;204;255m",
  PURPLE: "\x1b[38;2;204;153;255m",
  PINK: "\x1b[38;2;255;153;204m",
  RED: "\x1b[38;2;255;102;102m",
  GREEN: "\x1b[38;2;153;255;153m",
  CYAN: "\x1b[38;2;102;255;255m",
  // Background
  BG_ORANGE: "\x1b[48;2;255;153;0m",
  BG_GOLD: "\x1b[48;2;204;153;0m",
  BG_PURPLE: "\x1b[48;2;147;112;219m",
  BG_BLUE: "\x1b[48;2;100;149;237m",
  BG_BLACK: "\x1b[48;2;0;0;0m",
};

// Effort level colors
const EFFORT_COLORS: Record<string, { fg: string; bg: string; emoji: string }> = {
  TRIVIAL: { fg: LCARS.BLUE, bg: "\x1b[48;2;50;80;120m", emoji: "💭" },
  QUICK: { fg: LCARS.GREEN, bg: "\x1b[48;2;40;100;40m", emoji: "⚡" },
  STANDARD: { fg: LCARS.YELLOW, bg: "\x1b[48;2;120;100;20m", emoji: "📊" },
  THOROUGH: { fg: LCARS.ORANGE, bg: "\x1b[48;2;140;80;0m", emoji: "🔬" },
  DETERMINED: { fg: LCARS.RED, bg: "\x1b[48;2;140;40;40m", emoji: "🎯" },
};

// Phase definitions with icons and colors
const PHASES = [
  { name: "OBSERVE", icon: "👁️", color: LCARS.CYAN, description: "Understanding request" },
  { name: "THINK", icon: "🧠", color: LCARS.PURPLE, description: "Analyzing requirements" },
  { name: "PLAN", icon: "📋", color: LCARS.BLUE, description: "Sequencing steps" },
  { name: "BUILD", icon: "🔨", color: LCARS.YELLOW, description: "Making testable" },
  { name: "EXECUTE", icon: "⚡", color: LCARS.ORANGE, description: "Doing the work" },
  { name: "VERIFY", icon: "✅", color: LCARS.GREEN, description: "Testing results" },
  { name: "LEARN", icon: "📚", color: LCARS.PINK, description: "Capturing learnings" },
] as const;

type PhaseName = (typeof PHASES)[number]["name"];

interface AlgorithmState {
  currentPhase: PhaseName;
  effortLevel: string;
  iteration: number;
  startTime: string;
  lastPhaseChange: string;
  request?: string;
}

// Voice notification
async function announceVoice(message: string): Promise<void> {
  try {
    await fetch("http://localhost:8888/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
  } catch {
    // Voice server not running - silent fail
  }
}

function ensureStateDir(): void {
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true });
  }
}

function loadState(): AlgorithmState | null {
  try {
    if (existsSync(ALGORITHM_STATE_PATH)) {
      return JSON.parse(readFileSync(ALGORITHM_STATE_PATH, "utf-8"));
    }
  } catch {}
  return null;
}

function saveState(state: AlgorithmState): void {
  ensureStateDir();
  writeFileSync(ALGORITHM_STATE_PATH, JSON.stringify(state, null, 2));
}

function loadISC(): { request: string; effort: string; phase: string; rows: any[]; iteration: number } | null {
  try {
    if (existsSync(ISC_PATH)) {
      const data = readFileSync(ISC_PATH, "utf-8");
      if (data.trim()) {
        return JSON.parse(data);
      }
    }
  } catch {}
  return null;
}

function getPhaseIndex(phase: string): number {
  return PHASES.findIndex((p) => p.name === phase.toUpperCase());
}

// LCARS bar component
function lcarsBar(
  width: number,
  color: string,
  bgColor: string,
  label?: string,
  rounded: "left" | "right" | "both" | "none" = "none"
): string {
  const leftCap = rounded === "left" || rounded === "both" ? "╭" : "│";
  const rightCap = rounded === "right" || rounded === "both" ? "╮" : "│";
  const content = label ? ` ${label} `.padEnd(width - 2) : "━".repeat(width - 2);
  return `${color}${bgColor}${leftCap}${content}${rightCap}${RESET}`;
}

// Phase progress display
function renderPhaseBar(currentPhase: string): string {
  const lines: string[] = [];
  const idx = getPhaseIndex(currentPhase);
  const width = 70;

  // Header bar
  lines.push(`${LCARS.ORANGE}╭${"━".repeat(width - 2)}╮${RESET}`);
  lines.push(`${LCARS.ORANGE}│${RESET} ${BOLD}${LCARS.GOLD}THE ALGORITHM${RESET} ${DIM}Phase Progression${RESET}`.padEnd(width + 20) + `${LCARS.ORANGE}│${RESET}`);
  lines.push(`${LCARS.ORANGE}├${"━".repeat(width - 2)}┤${RESET}`);

  // Phase blocks
  let phaseLine = `${LCARS.ORANGE}│${RESET} `;
  for (let i = 0; i < PHASES.length; i++) {
    const phase = PHASES[i];
    const isActive = i === idx;
    const isComplete = i < idx;
    const isPending = i > idx;

    let blockColor = DIM;
    let bg = "";
    if (isActive) {
      blockColor = BOLD + phase.color;
      bg = "\x1b[48;2;40;40;60m";
    } else if (isComplete) {
      blockColor = LCARS.GREEN;
    }

    const block = `${bg}${blockColor}${phase.icon}${RESET}`;
    phaseLine += block + " ";
  }
  lines.push(phaseLine.padEnd(width + 50) + `${LCARS.ORANGE}│${RESET}`);

  // Current phase detail
  if (idx >= 0) {
    const active = PHASES[idx];
    lines.push(`${LCARS.ORANGE}│${RESET}`);
    lines.push(`${LCARS.ORANGE}│${RESET}  ${active.color}${BOLD}▶ ${active.name}${RESET} ${DIM}- ${active.description}${RESET}`.padEnd(width + 30) + `${LCARS.ORANGE}│${RESET}`);
  }

  lines.push(`${LCARS.ORANGE}╰${"━".repeat(width - 2)}╯${RESET}`);

  return lines.join("\n");
}

// Effort level display
function renderEffortBanner(effort: string): string {
  const config = EFFORT_COLORS[effort.toUpperCase()] || EFFORT_COLORS.STANDARD;
  const lines: string[] = [];
  const width = 40;

  const barContent = `${config.emoji} EFFORT: ${effort.toUpperCase()} `.padEnd(width - 4);
  lines.push(`${config.fg}${config.bg}╭${"━".repeat(width - 2)}╮${RESET}`);
  lines.push(`${config.fg}${config.bg}│ ${BOLD}${barContent}${RESET}${config.fg}${config.bg}│${RESET}`);
  lines.push(`${config.fg}${config.bg}╰${"━".repeat(width - 2)}╯${RESET}`);

  return lines.join("\n");
}

// ISC status summary
function renderISCSummary(isc: ReturnType<typeof loadISC>): string {
  if (!isc || !isc.rows || isc.rows.length === 0) {
    return `${DIM}No active ISC${RESET}`;
  }

  const pending = isc.rows.filter((r: any) => r.status === "PENDING").length;
  const active = isc.rows.filter((r: any) => r.status === "ACTIVE").length;
  const done = isc.rows.filter((r: any) => r.status === "DONE").length;
  const blocked = isc.rows.filter((r: any) => r.status === "BLOCKED").length;

  const lines: string[] = [];
  lines.push(`${LCARS.BLUE}╭────────────────────────────────╮${RESET}`);
  lines.push(`${LCARS.BLUE}│${RESET} ${BOLD}ISC STATUS${RESET} ${DIM}(${isc.rows.length} rows)${RESET}`.padEnd(45) + `${LCARS.BLUE}│${RESET}`);
  lines.push(`${LCARS.BLUE}├────────────────────────────────┤${RESET}`);
  lines.push(`${LCARS.BLUE}│${RESET} ⏳ Pending: ${pending}  🔄 Active: ${active}`.padEnd(40) + `${LCARS.BLUE}│${RESET}`);
  lines.push(`${LCARS.BLUE}│${RESET} ${LCARS.GREEN}✅ Done: ${done}${RESET}  ${blocked > 0 ? LCARS.RED + "🚫 Blocked: " + blocked + RESET : ""}`.padEnd(blocked > 0 ? 45 : 40) + `${LCARS.BLUE}│${RESET}`);
  lines.push(`${LCARS.BLUE}╰────────────────────────────────╯${RESET}`);

  return lines.join("\n");
}

// Full display
function renderFullDisplay(): string {
  const isc = loadISC();
  const state = loadState();

  const effort = isc?.effort || state?.effortLevel || "STANDARD";
  const phase = isc?.phase || state?.currentPhase || "OBSERVE";
  const iteration = isc?.iteration || state?.iteration || 1;
  const request = isc?.request || state?.request || "";

  const lines: string[] = [];

  // Title banner
  lines.push("");
  lines.push(`${LCARS.ORANGE}${"\x1b[48;2;255;153;0m"} THE ${RESET}${LCARS.GOLD}${"\x1b[48;2;204;153;0m"} ALGORITHM ${RESET}${LCARS.ORANGE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮${RESET}`);

  // Request line
  if (request) {
    const truncatedRequest = request.length > 50 ? request.slice(0, 47) + "..." : request;
    lines.push(`${LCARS.ORANGE}│${RESET} ${DIM}Request:${RESET} ${truncatedRequest}`);
  }

  // Effort and iteration
  const effortConfig = EFFORT_COLORS[effort.toUpperCase()] || EFFORT_COLORS.STANDARD;
  lines.push(`${LCARS.ORANGE}│${RESET} ${effortConfig.emoji} ${effortConfig.fg}${effort.toUpperCase()}${RESET} ${DIM}|${RESET} Iteration ${BOLD}${iteration}${RESET}`);
  lines.push(`${LCARS.ORANGE}├━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯${RESET}`);

  // Phase progression
  const phaseIdx = getPhaseIndex(phase);
  lines.push(`${LCARS.ORANGE}│${RESET}`);

  // Phase icons row
  let phaseIcons = `${LCARS.ORANGE}│${RESET}  `;
  for (let i = 0; i < PHASES.length; i++) {
    const p = PHASES[i];
    const isActive = i === phaseIdx;
    const isComplete = i < phaseIdx;

    if (isActive) {
      phaseIcons += `${"\x1b[48;2;60;60;80m"}${BOLD}${p.color}[${p.icon}]${RESET} `;
    } else if (isComplete) {
      phaseIcons += `${LCARS.GREEN}${p.icon}${RESET} `;
    } else {
      phaseIcons += `${DIM}${p.icon}${RESET} `;
    }
  }
  lines.push(phaseIcons);

  // Phase names row
  let phaseNames = `${LCARS.ORANGE}│${RESET}  `;
  for (let i = 0; i < PHASES.length; i++) {
    const p = PHASES[i];
    const isActive = i === phaseIdx;
    const isComplete = i < phaseIdx;

    const shortName = p.name.slice(0, 3);
    if (isActive) {
      phaseNames += `${BOLD}${p.color}${shortName}${RESET}  `;
    } else if (isComplete) {
      phaseNames += `${LCARS.GREEN}${shortName}${RESET}  `;
    } else {
      phaseNames += `${DIM}${shortName}${RESET}  `;
    }
  }
  lines.push(phaseNames);

  // Current phase description
  if (phaseIdx >= 0) {
    const active = PHASES[phaseIdx];
    lines.push(`${LCARS.ORANGE}│${RESET}`);
    lines.push(`${LCARS.ORANGE}│${RESET}  ${BOLD}${active.color}▶ ${active.name}${RESET} ${DIM}— ${active.description}${RESET}`);
  }

  lines.push(`${LCARS.ORANGE}│${RESET}`);

  // ISC summary if available
  if (isc && isc.rows && isc.rows.length > 0) {
    const pending = isc.rows.filter((r: any) => r.status === "PENDING").length;
    const active = isc.rows.filter((r: any) => r.status === "ACTIVE").length;
    const done = isc.rows.filter((r: any) => r.status === "DONE").length;

    lines.push(`${LCARS.ORANGE}│${RESET}  ${LCARS.BLUE}ISC:${RESET} ${isc.rows.length} rows  ${DIM}|${RESET}  ⏳${pending}  🔄${active}  ${LCARS.GREEN}✅${done}${RESET}`);
  }

  // Footer
  lines.push(`${LCARS.ORANGE}╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯${RESET}`);
  lines.push("");

  return lines.join("\n");
}

// Phase transition with voice
async function transitionPhase(
  newPhase: string,
  announce: boolean = true
): Promise<void> {
  const isc = loadISC();
  const state = loadState() || {
    currentPhase: "OBSERVE" as PhaseName,
    effortLevel: "STANDARD",
    iteration: 1,
    startTime: new Date().toISOString(),
    lastPhaseChange: new Date().toISOString(),
  };

  const oldPhase = isc?.phase || state.currentPhase;
  const normalizedNewPhase = newPhase.toUpperCase() as PhaseName;

  // Validate phase
  const phaseInfo = PHASES.find((p) => p.name === normalizedNewPhase);
  if (!phaseInfo) {
    console.error(`Invalid phase: ${newPhase}`);
    console.error(`Valid phases: ${PHASES.map((p) => p.name).join(", ")}`);
    process.exit(1);
  }

  // Update state
  state.currentPhase = normalizedNewPhase;
  state.lastPhaseChange = new Date().toISOString();
  saveState(state);

  // Voice announcement
  if (announce) {
    const announcement = `Algorithm entering ${normalizedNewPhase} phase. ${phaseInfo.description}.`;
    await announceVoice(announcement);
  }

  // Visual display
  console.log("");
  console.log(`${LCARS.ORANGE}━━━━━ PHASE TRANSITION ━━━━━${RESET}`);
  console.log(`${DIM}${oldPhase}${RESET} ${LCARS.GOLD}→${RESET} ${BOLD}${phaseInfo.color}${normalizedNewPhase}${RESET}`);
  console.log(`${phaseInfo.icon} ${phaseInfo.description}`);
  console.log("");

  // Show full display
  console.log(renderFullDisplay());
}

// Start algorithm with effort level
async function startAlgorithm(
  effort: string,
  request?: string,
  announce: boolean = true
): Promise<void> {
  const normalizedEffort = effort.toUpperCase();
  const config = EFFORT_COLORS[normalizedEffort];

  if (!config) {
    console.error(`Invalid effort level: ${effort}`);
    console.error(`Valid levels: ${Object.keys(EFFORT_COLORS).join(", ")}`);
    process.exit(1);
  }

  const state: AlgorithmState = {
    currentPhase: "OBSERVE",
    effortLevel: normalizedEffort,
    iteration: 1,
    startTime: new Date().toISOString(),
    lastPhaseChange: new Date().toISOString(),
    request,
  };
  saveState(state);

  // Voice announcement
  if (announce) {
    const announcement = `Starting THE ALGORITHM at ${normalizedEffort} effort level.`;
    await announceVoice(announcement);
  }

  // Display effort banner
  console.log("");
  console.log(renderEffortBanner(normalizedEffort));
  console.log("");
  console.log(renderFullDisplay());
}

async function main() {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      voice: { type: "boolean", short: "v", default: true },
      request: { type: "string", short: "r" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  const command = positionals[0]?.toLowerCase() || "show";

  if (values.help) {
    console.log(`
AlgorithmDisplay - LCARS-style visual display for THE ALGORITHM

USAGE:
  bun run AlgorithmDisplay.ts [command] [args] [options]

COMMANDS:
  show                    Full algorithm status display (default)
  phase <PHASE>           Transition to phase with voice announcement
  effort <LEVEL>          Show effort level banner
  start <LEVEL> [request] Start algorithm at effort level
  banner                  Show just the phase progression bar

OPTIONS:
  -v, --voice             Enable voice announcements (default: true)
  --no-voice              Disable voice announcements
  -r, --request <text>    Request text for context
  -h, --help              Show this help

PHASES:
  OBSERVE  - Understanding the request
  THINK    - Analyzing requirements
  PLAN     - Sequencing steps
  BUILD    - Making criteria testable
  EXECUTE  - Doing the work
  VERIFY   - Testing results
  LEARN    - Capturing learnings

EFFORT LEVELS:
  TRIVIAL    - Simple greetings/acknowledgments
  QUICK      - Single-step tasks
  STANDARD   - Multi-step bounded work
  THOROUGH   - Complex architectural work
  DETERMINED - Unlimited until done

EXAMPLES:
  bun run AlgorithmDisplay.ts show
  bun run AlgorithmDisplay.ts phase THINK
  bun run AlgorithmDisplay.ts start THOROUGH -r "Refactor the auth system"
  bun run AlgorithmDisplay.ts effort DETERMINED
`);
    return;
  }

  switch (command) {
    case "show":
      console.log(renderFullDisplay());
      break;

    case "phase": {
      const phase = positionals[1];
      if (!phase) {
        console.error("Error: Phase name required");
        console.error(`Valid phases: ${PHASES.map((p) => p.name).join(", ")}`);
        process.exit(1);
      }
      await transitionPhase(phase, values.voice);
      break;
    }

    case "effort": {
      const effort = positionals[1];
      if (!effort) {
        console.error("Error: Effort level required");
        console.error(`Valid levels: ${Object.keys(EFFORT_COLORS).join(", ")}`);
        process.exit(1);
      }
      console.log("");
      console.log(renderEffortBanner(effort));
      console.log("");
      break;
    }

    case "start": {
      const effort = positionals[1] || "STANDARD";
      await startAlgorithm(effort, values.request, values.voice);
      break;
    }

    case "banner":
      const state = loadState();
      const isc = loadISC();
      const phase = isc?.phase || state?.currentPhase || "OBSERVE";
      console.log("");
      console.log(renderPhaseBar(phase));
      console.log("");
      break;

    case "transition": {
      // Show animated transition between phases
      const fromPhase = positionals[1];
      const toPhase = positionals[2];
      if (!fromPhase || !toPhase) {
        console.error("Error: transition requires FROM and TO phases");
        process.exit(1);
      }
      await transitionPhase(toPhase, values.voice);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.error("Use --help for usage information");
      process.exit(1);
  }
}

main().catch(console.error);
