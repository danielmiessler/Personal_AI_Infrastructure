#!/usr/bin/env bun

/**
 * ISCManager - Manage Ideal State Criteria tables for THE ALGORITHM
 *
 * Creates, updates, and queries ISC tables that track work toward ideal state.
 *
 * Usage:
 *   bun run ISCManager.ts create --request "Add dark mode"
 *   bun run ISCManager.ts add --description "Tests pass" --source IMPLICIT
 *   bun run ISCManager.ts update --row 1 --status DONE
 *   bun run ISCManager.ts show
 *   bun run ISCManager.ts verify --row 1 --result PASS
 */

import { parseArgs } from "util";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";

type Source = "EXPLICIT" | "INFERRED" | "IMPLICIT" | "RESEARCH";
type Status = "PENDING" | "CLAIMED" | "ACTIVE" | "DONE" | "ADJUSTED" | "BLOCKED" | "VERIFIED";
type VerifyResult = "PASS" | "ADJUSTED" | "BLOCKED";
type VerifyMethod = "browser" | "test" | "grep" | "api" | "lint" | "manual" | "agent" | "inferred";

interface Verification {
  method: VerifyMethod;
  command?: string;           // e.g., "bun test src/feature.test.ts"
  success_criteria: string;   // What does success look like?
  result?: "PASS" | "FAIL";
  result_at?: string;
}

interface ResearchWarning {
  reason: string;             // Why research contradicts this
  source: string;             // Research source (e.g., "research.perplexity")
  requires_acknowledgment: boolean;
  acknowledged?: boolean;
  action?: "OVERRIDE" | "ACCEPT";
}

interface ISCRow {
  id: number;
  description: string;
  source: Source;
  status: Status;
  parallel: boolean; // Can run in parallel with others
  capability?: string; // Assigned capability (e.g., "research.perplexity", "thinking.deep thinking")
  capabilityIcon?: string; // Icon for display (e.g., "🔬", "💡", "🤖")
  result?: string;
  adjustedReason?: string;
  blockedReason?: string;
  verifyResult?: VerifyResult;
  timestamp: string;

  // NEW: Verification paired at creation
  verification?: Verification;

  // NEW: Agent claim system
  claimable: boolean;
  claimed_by?: string;        // Agent type (e.g., "Engineer", "Intern")
  claimed_at?: string;        // Timestamp of claim

  // NEW: Research override system
  research_warning?: ResearchWarning;

  // NEW: Nested algorithm support
  is_nested?: boolean;
  child_isc_id?: string;      // ID of spawned child ISC
  child_isc_status?: "PENDING" | "IN_PROGRESS" | "COMPLETE";
}

interface ISCTable {
  request: string;
  effort: string;
  created: string;
  lastModified: string;
  phase: string;
  iteration: number;
  rows: ISCRow[];
  log: string[];
}

const HOME = process.env.HOME || "~";
const ISC_DIR = `${HOME}/.claude/MEMORY/Work`;
const CURRENT_ISC_PATH = `${ISC_DIR}/current-isc.json`;

// Capability category to icon mapping
const CAPABILITY_ICONS: Record<string, string> = {
  research: "🔬",
  thinking: "💡",
  debate: "🗣️",
  analysis: "🔍",
  execution: "🤖",
  verification: "✅",
  models: "⚡",
  composition: "🧩",
};

function ensureDir() {
  if (!existsSync(ISC_DIR)) {
    mkdirSync(ISC_DIR, { recursive: true });
  }
}

function loadISC(): ISCTable | null {
  if (!existsSync(CURRENT_ISC_PATH)) {
    return null;
  }
  const content = readFileSync(CURRENT_ISC_PATH, "utf-8");
  return JSON.parse(content) as ISCTable;
}

function saveISC(isc: ISCTable) {
  ensureDir();
  isc.lastModified = new Date().toISOString();
  writeFileSync(CURRENT_ISC_PATH, JSON.stringify(isc, null, 2));
}

function createISC(request: string, effort: string): ISCTable {
  const isc: ISCTable = {
    request,
    effort,
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    phase: "OBSERVE",
    iteration: 1,
    rows: [],
    log: [`[${new Date().toISOString()}] ISC created for: ${request}`],
  };
  saveISC(isc);
  return isc;
}

function addRow(
  isc: ISCTable,
  description: string,
  source: Source,
  parallel: boolean = true,
  verification?: { method: VerifyMethod; command?: string; criteria: string }
): ISCRow {
  const row: ISCRow = {
    id: isc.rows.length + 1,
    description,
    source,
    status: "PENDING",
    parallel,
    claimable: true, // Default: claimable by agents
    timestamp: new Date().toISOString(),
  };

  // NEW: Pair verification at creation
  if (verification) {
    row.verification = {
      method: verification.method,
      command: verification.command,
      success_criteria: verification.criteria,
    };
  }

  isc.rows.push(row);
  const verifyNote = verification ? ` [verify: ${verification.method}]` : "";
  isc.log.push(
    `[${new Date().toISOString()}] Added row ${row.id}: ${description} (${source})${verifyNote}`
  );
  saveISC(isc);
  return row;
}

// NEW: Claim an item for agent work
function claimRow(
  isc: ISCTable,
  rowId: number,
  agentType: string
): { success: boolean; message: string; row?: ISCRow } {
  const row = isc.rows.find((r) => r.id === rowId);
  if (!row) return { success: false, message: `Row ${rowId} not found` };

  if (!row.claimable) {
    return { success: false, message: `Row ${rowId} is not claimable` };
  }

  if (row.claimed_by) {
    // Check if claim is stale (>30 min)
    const claimedAt = new Date(row.claimed_at!).getTime();
    const now = Date.now();
    const STALE_THRESHOLD = 30 * 60 * 1000; // 30 minutes

    if (now - claimedAt < STALE_THRESHOLD) {
      return {
        success: false,
        message: `Row ${rowId} already claimed by ${row.claimed_by}`,
      };
    }
    // Stale claim - allow override
    isc.log.push(
      `[${new Date().toISOString()}] Row ${rowId}: stale claim by ${row.claimed_by} overridden`
    );
  }

  if (row.status !== "PENDING") {
    return {
      success: false,
      message: `Row ${rowId} status is ${row.status}, not PENDING`,
    };
  }

  row.claimed_by = agentType;
  row.claimed_at = new Date().toISOString();
  row.status = "CLAIMED";

  isc.log.push(
    `[${new Date().toISOString()}] Row ${rowId}: claimed by ${agentType}`
  );
  saveISC(isc);
  return { success: true, message: `Row ${rowId} claimed by ${agentType}`, row };
}

// NEW: Release a claim
function releaseRow(
  isc: ISCTable,
  rowId: number
): { success: boolean; message: string } {
  const row = isc.rows.find((r) => r.id === rowId);
  if (!row) return { success: false, message: `Row ${rowId} not found` };

  if (!row.claimed_by) {
    return { success: false, message: `Row ${rowId} is not claimed` };
  }

  const oldAgent = row.claimed_by;
  row.claimed_by = undefined;
  row.claimed_at = undefined;
  row.status = "PENDING";

  isc.log.push(
    `[${new Date().toISOString()}] Row ${rowId}: claim released (was: ${oldAgent})`
  );
  saveISC(isc);
  return { success: true, message: `Row ${rowId} claim released` };
}

// NEW: Get available (unclaimed) items
function getAvailableRows(isc: ISCTable): ISCRow[] {
  return isc.rows.filter(
    (r) => r.status === "PENDING" && r.claimable && !r.claimed_by
  );
}

// NEW: Research override - block an item with research warning
function researchBlock(
  isc: ISCTable,
  rowId: number,
  reason: string,
  source: string
): { success: boolean; message: string } {
  const row = isc.rows.find((r) => r.id === rowId);
  if (!row) return { success: false, message: `Row ${rowId} not found` };

  row.research_warning = {
    reason,
    source,
    requires_acknowledgment: true,
    acknowledged: false,
  };
  row.status = "BLOCKED";
  row.blockedReason = `Research: ${reason}`;

  isc.log.push(
    `[${new Date().toISOString()}] Row ${rowId}: BLOCKED by research (${source}): ${reason}`
  );
  saveISC(isc);
  return {
    success: true,
    message: `Row ${rowId} blocked by research. User acknowledgment required.`,
  };
}

// NEW: Acknowledge research warning
function acknowledgeResearch(
  isc: ISCTable,
  rowId: number,
  action: "OVERRIDE" | "ACCEPT"
): { success: boolean; message: string } {
  const row = isc.rows.find((r) => r.id === rowId);
  if (!row) return { success: false, message: `Row ${rowId} not found` };

  if (!row.research_warning) {
    return { success: false, message: `Row ${rowId} has no research warning` };
  }

  row.research_warning.acknowledged = true;
  row.research_warning.action = action;

  if (action === "OVERRIDE") {
    row.status = "PENDING";
    row.blockedReason = undefined;
    isc.log.push(
      `[${new Date().toISOString()}] Row ${rowId}: research warning OVERRIDDEN by user`
    );
  } else {
    // ACCEPT - keep blocked, user will adjust approach
    isc.log.push(
      `[${new Date().toISOString()}] Row ${rowId}: research warning ACCEPTED - approach will change`
    );
  }

  saveISC(isc);
  return { success: true, message: `Row ${rowId} research ${action}` };
}

// NEW: Nest an item (spawn child ISC)
function nestRow(
  isc: ISCTable,
  rowId: number
): { success: boolean; message: string; childId?: string } {
  const row = isc.rows.find((r) => r.id === rowId);
  if (!row) return { success: false, message: `Row ${rowId} not found` };

  if (row.is_nested && row.child_isc_id) {
    return {
      success: false,
      message: `Row ${rowId} already nested with child ${row.child_isc_id}`,
    };
  }

  // Create child ISC ID
  const childId = `${isc.request.slice(0, 20).replace(/\s+/g, "-")}-child-${rowId}-${Date.now()}`;

  row.is_nested = true;
  row.child_isc_id = childId;
  row.child_isc_status = "PENDING";

  isc.log.push(
    `[${new Date().toISOString()}] Row ${rowId}: nested, child ISC created: ${childId}`
  );
  saveISC(isc);

  return { success: true, message: `Nested row ${rowId}, child: ${childId}`, childId };
}

// NEW: Update child ISC status
function updateChildStatus(
  isc: ISCTable,
  rowId: number,
  status: "PENDING" | "IN_PROGRESS" | "COMPLETE"
): { success: boolean; message: string } {
  const row = isc.rows.find((r) => r.id === rowId);
  if (!row) return { success: false, message: `Row ${rowId} not found` };

  if (!row.is_nested) {
    return { success: false, message: `Row ${rowId} is not nested` };
  }

  row.child_isc_status = status;
  if (status === "COMPLETE") {
    row.status = "DONE";
  }

  isc.log.push(
    `[${new Date().toISOString()}] Row ${rowId}: child status → ${status}`
  );
  saveISC(isc);
  return { success: true, message: `Row ${rowId} child status: ${status}` };
}

// NEW: Interview questions for unclear ideal state
const INTERVIEW_QUESTIONS = [
  "What does success look like when this is done?",
  "Who will use this and what will they do with it?",
  "What would make you show this to your friends?",
  "What existing thing is this most similar to?",
  "What should this definitely NOT do?",
];

function updateRowStatus(
  isc: ISCTable,
  rowId: number,
  status: Status,
  reason?: string
): ISCRow | null {
  const row = isc.rows.find((r) => r.id === rowId);
  if (!row) return null;

  const oldStatus = row.status;
  row.status = status;

  if (status === "ADJUSTED" && reason) {
    row.adjustedReason = reason;
  }
  if (status === "BLOCKED" && reason) {
    row.blockedReason = reason;
  }

  isc.log.push(
    `[${new Date().toISOString()}] Row ${rowId}: ${oldStatus} → ${status}${reason ? ` (${reason})` : ""}`
  );
  saveISC(isc);
  return row;
}

function setVerifyResult(
  isc: ISCTable,
  rowId: number,
  result: VerifyResult,
  reason?: string
): ISCRow | null {
  const row = isc.rows.find((r) => r.id === rowId);
  if (!row) return null;

  row.verifyResult = result;
  if (result === "ADJUSTED" && reason) {
    row.adjustedReason = reason;
    row.status = "ADJUSTED";
  }
  if (result === "BLOCKED" && reason) {
    row.blockedReason = reason;
    row.status = "BLOCKED";
  }

  isc.log.push(
    `[${new Date().toISOString()}] Verify row ${rowId}: ${result}${reason ? ` (${reason})` : ""}`
  );
  saveISC(isc);
  return row;
}

function setCapability(
  isc: ISCTable,
  rowId: number,
  capability: string
): ISCRow | null {
  const row = isc.rows.find((r) => r.id === rowId);
  if (!row) return null;

  row.capability = capability;
  // Extract category from capability name (e.g., "research.perplexity" → "research")
  const category = capability.split(".")[0];
  row.capabilityIcon = CAPABILITY_ICONS[category] || "🤖";

  isc.log.push(
    `[${new Date().toISOString()}] Row ${rowId}: capability → ${capability}`
  );
  saveISC(isc);
  return row;
}

function setPhase(isc: ISCTable, phase: string) {
  const oldPhase = isc.phase;
  isc.phase = phase;
  isc.log.push(`[${new Date().toISOString()}] Phase: ${oldPhase} → ${phase}`);
  saveISC(isc);
}

function incrementIteration(isc: ISCTable) {
  isc.iteration++;
  isc.log.push(
    `[${new Date().toISOString()}] Starting iteration ${isc.iteration}`
  );
  saveISC(isc);
}

function formatTable(isc: ISCTable): string {
  let output = `## 🎯 IDEAL STATE CRITERIA\n\n`;
  output += `**Request:** ${isc.request}\n`;
  output += `**Effort:** ${isc.effort} | **Phase:** ${isc.phase} | **Iteration:** ${isc.iteration}\n\n`;
  output += `| # | What Ideal Looks Like | Source | Capability | Verify | Status |\n`;
  output += `|---|----------------------|--------|------------|--------|--------|\n`;

  for (const row of isc.rows) {
    let desc = row.description;
    if (row.adjustedReason) {
      desc += ` *(adjusted: ${row.adjustedReason})*`;
    }
    if (row.blockedReason) {
      desc += ` *(blocked: ${row.blockedReason})*`;
    }
    if (row.research_warning && !row.research_warning.acknowledged) {
      desc += ` ⚠️`;
    }
    if (row.is_nested) {
      desc += ` 🪆 [${row.child_isc_status || "?"}]`;
    }

    // Format capability with icon
    let capDisplay = "—";
    if (row.capability) {
      const icon = row.capabilityIcon || "🤖";
      const capName = row.capability.split(".").pop() || row.capability;
      capDisplay = `${icon} ${capName}`;
      if (row.parallel) {
        capDisplay += "×";
      }
    }

    // Format verification method
    let verifyDisplay = "—";
    if (row.verification) {
      const verifyIcons: Record<VerifyMethod, string> = {
        browser: "🌐",
        test: "🧪",
        grep: "🔎",
        api: "📡",
        lint: "✨",
        manual: "👁️",
        agent: "🤖",
        inferred: "💫",
      };
      const icon = verifyIcons[row.verification.method] || "❓";
      verifyDisplay = `${icon} ${row.verification.method}`;
      if (row.verification.result) {
        verifyDisplay += row.verification.result === "PASS" ? " ✅" : " ❌";
      }
    }

    // Status emoji
    const statusEmoji: Record<Status, string> = {
      PENDING: "⏳",
      CLAIMED: "🔒",
      ACTIVE: "🔄",
      DONE: "✅",
      ADJUSTED: "🔧",
      BLOCKED: "🚫",
      VERIFIED: "✔️",
    };
    let statusDisplay = `${statusEmoji[row.status]} ${row.status}`;
    if (row.claimed_by) {
      statusDisplay += ` (${row.claimed_by})`;
    }

    output += `| ${row.id} | ${desc} | ${row.source} | ${capDisplay} | ${verifyDisplay} | ${statusDisplay} |\n`;
  }

  output += `\n**Legend:** 🔬 Research | 💡 Thinking | 🗣️ Debate | 🔍 Analysis | 🤖 Execution | ✅ Verify | × Parallel | 🪆 Nested | ⚠️ Research Warning\n`;
  output += `**Verify:** 🌐 browser | 🧪 test | 🔎 grep | 📡 api | ✨ lint | 👁️ manual | 🤖 agent | 💫 inferred\n`;

  return output;
}

function formatLog(isc: ISCTable): string {
  let output = `## Evolution Log\n\n`;
  for (const entry of isc.log) {
    output += `${entry}\n`;
  }
  return output;
}

function getSummary(isc: ISCTable): {
  total: number;
  pending: number;
  active: number;
  done: number;
  adjusted: number;
  blocked: number;
  parallelizable: number;
} {
  return {
    total: isc.rows.length,
    pending: isc.rows.filter((r) => r.status === "PENDING").length,
    active: isc.rows.filter((r) => r.status === "ACTIVE").length,
    done: isc.rows.filter((r) => r.status === "DONE").length,
    adjusted: isc.rows.filter((r) => r.status === "ADJUSTED").length,
    blocked: isc.rows.filter((r) => r.status === "BLOCKED").length,
    parallelizable: isc.rows.filter((r) => r.parallel && r.status === "PENDING")
      .length,
  };
}

async function main() {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      request: { type: "string", short: "r" },
      effort: { type: "string", short: "e", default: "STANDARD" },
      description: { type: "string", short: "d" },
      source: { type: "string", short: "s" },
      row: { type: "string" },
      status: { type: "string" },
      result: { type: "string" },
      reason: { type: "string" },
      phase: { type: "string", short: "p" },
      capability: { type: "string", short: "c" },
      parallel: { type: "boolean", default: true },
      output: { type: "string", short: "o", default: "text" },
      help: { type: "boolean", short: "h" },
      // NEW: Verification at creation
      "verify-method": { type: "string" },
      "verify-criteria": { type: "string" },
      "verify-command": { type: "string" },
      // NEW: Agent claims
      agent: { type: "string", short: "a" },
      // NEW: Research override
      action: { type: "string" },
      // NEW: Nested algorithm
      "child-status": { type: "string" },
    },
    allowPositionals: true,
  });

  const command = positionals[0];

  if (values.help || !command) {
    console.log(`
ISCManager - Manage Ideal State Criteria tables

USAGE:
  bun run ISCManager.ts <command> [options]

COMMANDS:
  create        Create new ISC table
  add           Add a row to current ISC (with verification)
  update        Update row status
  capability    Set capability for a row
  verify        Set verification result for a row
  phase         Set current phase
  iterate       Increment iteration counter
  show          Display current ISC table
  log           Show evolution log
  summary       Show status summary
  clear         Clear current ISC

  # NEW: Agent Claims
  claim         Claim a row for agent work
  release       Release a claim on a row
  available     Show available (unclaimed) rows

  # NEW: Research Override
  research-block  Block a row due to research findings
  acknowledge     Acknowledge a research warning

  # NEW: Nested Algorithm
  nest          Mark a row as nested (spawn child ISC)
  child-status  Update child ISC status

  # NEW: Interview Protocol
  interview     Output interview questions for unclear request

OPTIONS:
  -r, --request <text>       Request text (for create)
  -e, --effort <level>       Effort level (for create)
  -d, --description <text>   Row description (for add)
  -s, --source <type>        Source: EXPLICIT, INFERRED, IMPLICIT, RESEARCH
  --row <id>                 Row ID (for update/verify/capability/claim/etc)
  --status <status>          Status: PENDING, CLAIMED, ACTIVE, DONE, ADJUSTED, BLOCKED, VERIFIED
  -c, --capability <cap>     Capability: research.perplexity, thinking.deep thinking, etc.
  --result <result>          Verify result: PASS, ADJUSTED, BLOCKED
  --reason <text>            Reason for adjustment/block/research-block
  -p, --phase <phase>        Phase name (for phase command)
  --parallel                 Row can run in parallel (default: true)
  -o, --output <fmt>         Output format: text, json, markdown
  -h, --help                 Show this help

  # NEW: Verification at creation
  --verify-method <method>   Verify method: browser, test, grep, api, lint, manual, agent, inferred
  --verify-criteria <text>   Success criteria for verification
  --verify-command <cmd>     Optional command to run for verification

  # NEW: Agent claims
  -a, --agent <type>         Agent type for claim (e.g., Engineer, Intern)

  # NEW: Research override
  --action <action>          OVERRIDE or ACCEPT (for acknowledge)

  # NEW: Nested algorithm
  --child-status <status>    PENDING, IN_PROGRESS, COMPLETE (for child-status)

EXAMPLES:
  # Create new ISC
  bun run ISCManager.ts create -r "Add dark mode to settings"

  # Add rows WITH verification (recommended)
  bun run ISCManager.ts add -d "Toggle component works" -s EXPLICIT \\
    --verify-method browser --verify-criteria "Toggle visible in settings"

  # Add rows without verification (legacy)
  bun run ISCManager.ts add -d "Uses TypeScript" -s INFERRED

  # Agent claims
  bun run ISCManager.ts claim --row 1 --agent Engineer
  bun run ISCManager.ts release --row 1
  bun run ISCManager.ts available

  # Research override
  bun run ISCManager.ts research-block --row 2 --reason "Use X instead of Y" --source research.perplexity
  bun run ISCManager.ts acknowledge --row 2 --action OVERRIDE

  # Nested algorithm
  bun run ISCManager.ts nest --row 5
  bun run ISCManager.ts child-status --row 5 --child-status COMPLETE

  # Interview protocol
  bun run ISCManager.ts interview -r "vague request here"

  # Update status
  bun run ISCManager.ts update --row 1 --status ACTIVE
  bun run ISCManager.ts update --row 1 --status DONE

  # Set capability
  bun run ISCManager.ts capability --row 1 -c research.perplexity

  # Verify
  bun run ISCManager.ts verify --row 1 --result PASS

  # Show table
  bun run ISCManager.ts show
`);
    return;
  }

  switch (command) {
    case "create": {
      if (!values.request) {
        console.error("Error: --request is required for create");
        process.exit(1);
      }
      const isc = createISC(values.request, values.effort || "STANDARD");
      console.log(`ISC created for: ${values.request}`);
      console.log(`Effort: ${isc.effort}`);
      console.log(`Saved to: ${CURRENT_ISC_PATH}`);
      break;
    }

    case "add": {
      const isc = loadISC();
      if (!isc) {
        console.error("Error: No current ISC. Use 'create' first.");
        process.exit(1);
      }
      if (!values.description) {
        console.error("Error: --description is required for add");
        process.exit(1);
      }
      const source = (values.source?.toUpperCase() || "EXPLICIT") as Source;
      if (!["EXPLICIT", "INFERRED", "IMPLICIT", "RESEARCH"].includes(source)) {
        console.error("Error: --source must be EXPLICIT, INFERRED, IMPLICIT, or RESEARCH");
        process.exit(1);
      }

      // NEW: Handle verification at creation
      let verification: { method: VerifyMethod; command?: string; criteria: string } | undefined;
      if (values["verify-method"]) {
        const method = values["verify-method"] as VerifyMethod;
        const validMethods = ["browser", "test", "grep", "api", "lint", "manual", "agent", "inferred"];
        if (!validMethods.includes(method)) {
          console.error(`Error: --verify-method must be one of: ${validMethods.join(", ")}`);
          process.exit(1);
        }
        if (!values["verify-criteria"]) {
          console.error("Error: --verify-criteria is required when using --verify-method");
          process.exit(1);
        }
        verification = {
          method,
          criteria: values["verify-criteria"],
          command: values["verify-command"],
        };
      }

      const row = addRow(isc, values.description, source, values.parallel, verification);
      console.log(`Added row ${row.id}: ${row.description} (${row.source})`);
      if (verification) {
        console.log(`  Verification: ${verification.method} - ${verification.criteria}`);
      }
      break;
    }

    case "update": {
      const isc = loadISC();
      if (!isc) {
        console.error("Error: No current ISC. Use 'create' first.");
        process.exit(1);
      }
      if (!values.row) {
        console.error("Error: --row is required for update");
        process.exit(1);
      }
      if (!values.status) {
        console.error("Error: --status is required for update");
        process.exit(1);
      }
      const status = values.status.toUpperCase() as Status;
      if (!["PENDING", "ACTIVE", "DONE", "ADJUSTED", "BLOCKED"].includes(status)) {
        console.error("Error: Invalid status");
        process.exit(1);
      }
      const row = updateRowStatus(isc, parseInt(values.row), status, values.reason);
      if (!row) {
        console.error(`Error: Row ${values.row} not found`);
        process.exit(1);
      }
      console.log(`Row ${row.id}: ${row.status}`);
      break;
    }

    case "capability": {
      const isc = loadISC();
      if (!isc) {
        console.error("Error: No current ISC. Use 'create' first.");
        process.exit(1);
      }
      if (!values.row) {
        console.error("Error: --row is required for capability");
        process.exit(1);
      }
      if (!values.capability) {
        console.error("Error: --capability is required");
        console.error("Examples: research.perplexity, thinking.deep thinking, execution.engineer");
        process.exit(1);
      }
      const row = setCapability(isc, parseInt(values.row), values.capability);
      if (!row) {
        console.error(`Error: Row ${values.row} not found`);
        process.exit(1);
      }
      console.log(`Row ${row.id}: capability → ${row.capability} (${row.capabilityIcon})`);
      break;
    }

    case "verify": {
      const isc = loadISC();
      if (!isc) {
        console.error("Error: No current ISC.");
        process.exit(1);
      }
      if (!values.row || !values.result) {
        console.error("Error: --row and --result are required for verify");
        process.exit(1);
      }
      const result = values.result.toUpperCase() as VerifyResult;
      if (!["PASS", "ADJUSTED", "BLOCKED"].includes(result)) {
        console.error("Error: --result must be PASS, ADJUSTED, or BLOCKED");
        process.exit(1);
      }
      const row = setVerifyResult(isc, parseInt(values.row), result, values.reason);
      if (!row) {
        console.error(`Error: Row ${values.row} not found`);
        process.exit(1);
      }
      console.log(`Row ${row.id} verified: ${result}`);
      break;
    }

    case "phase": {
      const isc = loadISC();
      if (!isc) {
        console.error("Error: No current ISC.");
        process.exit(1);
      }
      if (!values.phase) {
        console.error("Error: --phase is required");
        process.exit(1);
      }
      setPhase(isc, values.phase.toUpperCase());
      console.log(`Phase set to: ${isc.phase}`);
      break;
    }

    case "iterate": {
      const isc = loadISC();
      if (!isc) {
        console.error("Error: No current ISC.");
        process.exit(1);
      }
      incrementIteration(isc);
      console.log(`Now on iteration: ${isc.iteration}`);
      break;
    }

    case "show": {
      const isc = loadISC();
      if (!isc) {
        console.error("No current ISC.");
        process.exit(1);
      }
      if (values.output === "json") {
        console.log(JSON.stringify(isc, null, 2));
      } else if (values.output === "markdown") {
        console.log(formatTable(isc));
      } else {
        console.log(formatTable(isc));
      }
      break;
    }

    case "log": {
      const isc = loadISC();
      if (!isc) {
        console.error("No current ISC.");
        process.exit(1);
      }
      console.log(formatLog(isc));
      break;
    }

    case "summary": {
      const isc = loadISC();
      if (!isc) {
        console.error("No current ISC.");
        process.exit(1);
      }
      const summary = getSummary(isc);
      if (values.output === "json") {
        console.log(JSON.stringify({ ...summary, phase: isc.phase, iteration: isc.iteration }, null, 2));
      } else {
        console.log(`ISC Summary: ${isc.request}`);
        console.log(`Phase: ${isc.phase} | Iteration: ${isc.iteration}`);
        console.log(`Total: ${summary.total} | Pending: ${summary.pending} | Active: ${summary.active}`);
        console.log(`Done: ${summary.done} | Adjusted: ${summary.adjusted} | Blocked: ${summary.blocked}`);
        console.log(`Parallelizable: ${summary.parallelizable}`);
      }
      break;
    }

    case "clear": {
      if (existsSync(CURRENT_ISC_PATH)) {
        const isc = loadISC();
        // Archive before clearing
        if (isc) {
          const archivePath = `${ISC_DIR}/archive-${Date.now()}.json`;
          writeFileSync(archivePath, JSON.stringify(isc, null, 2));
          console.log(`Archived to: ${archivePath}`);
        }
        writeFileSync(CURRENT_ISC_PATH, "");
        console.log("Current ISC cleared.");
      } else {
        console.log("No current ISC to clear.");
      }
      break;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NEW: Agent Claim Commands
    // ═══════════════════════════════════════════════════════════════════════

    case "claim": {
      const isc = loadISC();
      if (!isc) {
        console.error("Error: No current ISC.");
        process.exit(1);
      }
      if (!values.row) {
        console.error("Error: --row is required for claim");
        process.exit(1);
      }
      if (!values.agent) {
        console.error("Error: --agent is required for claim");
        console.error("Examples: Engineer, Intern, Architect, Designer");
        process.exit(1);
      }
      const result = claimRow(isc, parseInt(values.row), values.agent);
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
      break;
    }

    case "release": {
      const isc = loadISC();
      if (!isc) {
        console.error("Error: No current ISC.");
        process.exit(1);
      }
      if (!values.row) {
        console.error("Error: --row is required for release");
        process.exit(1);
      }
      const result = releaseRow(isc, parseInt(values.row));
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
      break;
    }

    case "available": {
      const isc = loadISC();
      if (!isc) {
        console.error("Error: No current ISC.");
        process.exit(1);
      }
      const available = getAvailableRows(isc);
      if (values.output === "json") {
        console.log(JSON.stringify(available, null, 2));
      } else {
        console.log(`Available (unclaimed) rows: ${available.length}`);
        for (const row of available) {
          console.log(`  ${row.id}: ${row.description.slice(0, 50)}...`);
        }
      }
      break;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NEW: Research Override Commands
    // ═══════════════════════════════════════════════════════════════════════

    case "research-block": {
      const isc = loadISC();
      if (!isc) {
        console.error("Error: No current ISC.");
        process.exit(1);
      }
      if (!values.row) {
        console.error("Error: --row is required for research-block");
        process.exit(1);
      }
      if (!values.reason) {
        console.error("Error: --reason is required for research-block");
        process.exit(1);
      }
      const source = values.source || "research.unknown";
      const result = researchBlock(isc, parseInt(values.row), values.reason, source);
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
      break;
    }

    case "acknowledge": {
      const isc = loadISC();
      if (!isc) {
        console.error("Error: No current ISC.");
        process.exit(1);
      }
      if (!values.row) {
        console.error("Error: --row is required for acknowledge");
        process.exit(1);
      }
      if (!values.action) {
        console.error("Error: --action is required (OVERRIDE or ACCEPT)");
        process.exit(1);
      }
      const action = values.action.toUpperCase() as "OVERRIDE" | "ACCEPT";
      if (!["OVERRIDE", "ACCEPT"].includes(action)) {
        console.error("Error: --action must be OVERRIDE or ACCEPT");
        process.exit(1);
      }
      const result = acknowledgeResearch(isc, parseInt(values.row), action);
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
      break;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NEW: Nested Algorithm Commands
    // ═══════════════════════════════════════════════════════════════════════

    case "nest": {
      const isc = loadISC();
      if (!isc) {
        console.error("Error: No current ISC.");
        process.exit(1);
      }
      if (!values.row) {
        console.error("Error: --row is required for nest");
        process.exit(1);
      }
      const result = nestRow(isc, parseInt(values.row));
      console.log(result.message);
      if (result.childId) {
        console.log(`Child ISC ID: ${result.childId}`);
        console.log("Use 'create' with this ID to create the child ISC.");
      }
      process.exit(result.success ? 0 : 1);
      break;
    }

    case "child-status": {
      const isc = loadISC();
      if (!isc) {
        console.error("Error: No current ISC.");
        process.exit(1);
      }
      if (!values.row) {
        console.error("Error: --row is required for child-status");
        process.exit(1);
      }
      if (!values["child-status"]) {
        console.error("Error: --child-status is required (PENDING, IN_PROGRESS, COMPLETE)");
        process.exit(1);
      }
      const status = values["child-status"].toUpperCase() as "PENDING" | "IN_PROGRESS" | "COMPLETE";
      if (!["PENDING", "IN_PROGRESS", "COMPLETE"].includes(status)) {
        console.error("Error: --child-status must be PENDING, IN_PROGRESS, or COMPLETE");
        process.exit(1);
      }
      const result = updateChildStatus(isc, parseInt(values.row), status);
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
      break;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NEW: Interview Protocol
    // ═══════════════════════════════════════════════════════════════════════

    case "interview": {
      console.log("═══════════════════════════════════════════════════════════");
      console.log("  INTERVIEW PROTOCOL - Clarify Ideal State");
      console.log("═══════════════════════════════════════════════════════════");
      if (values.request) {
        console.log(`\nRequest: "${values.request}"\n`);
      }
      console.log("When ideal state is unclear, ask these questions:\n");
      for (let i = 0; i < INTERVIEW_QUESTIONS.length; i++) {
        console.log(`  ${i + 1}. ${INTERVIEW_QUESTIONS[i]}`);
      }
      console.log("\n───────────────────────────────────────────────────────────");
      console.log("Use answers to create clear, testable ISC rows.");
      console.log("═══════════════════════════════════════════════════════════");
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.error("Use --help for usage information");
      process.exit(1);
  }
}

main().catch(console.error);
