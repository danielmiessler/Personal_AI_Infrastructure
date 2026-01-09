#!/usr/bin/env bun
/**
 * mai-gate - Gate Management CLI
 *
 * Manages project gates from the command line.
 * Reads/writes project-state.yaml for gate status.
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse, stringify } from 'yaml';

// CLI uses simplified status: pending/passed/failed/blocked
// This maps to core GateStatus: pending/approved/rejected
type CLIGateStatus = 'pending' | 'passed' | 'failed' | 'blocked';

interface ProjectState {
  projectName: string;
  projectType: string;
  gates: Record<string, {
    status: CLIGateStatus;
    passedAt?: string;
    failedAt?: string;
    blockedReason?: string;
  }>;
  currentPhase: string;
}

const STATE_FILE = 'project-state.yaml';

function loadProjectState(cwd: string = process.cwd()): ProjectState | null {
  const statePath = join(cwd, STATE_FILE);

  if (!existsSync(statePath)) {
    // Try to infer from CLAUDE.md
    const claudeMdPath = join(cwd, 'CLAUDE.md');
    if (existsSync(claudeMdPath)) {
      return initFromClaudeMd(claudeMdPath);
    }
    return null;
  }

  const content = readFileSync(statePath, 'utf-8');
  return parse(content) as ProjectState;
}

function saveProjectState(state: ProjectState, cwd: string = process.cwd()): void {
  const statePath = join(cwd, STATE_FILE);
  writeFileSync(statePath, stringify(state));
}

function initFromClaudeMd(claudeMdPath: string): ProjectState {
  const content = readFileSync(claudeMdPath, 'utf-8');

  // Parse project name from title
  const titleMatch = content.match(/^# (.+)$/m);
  const projectName = titleMatch ? titleMatch[1] : 'Unknown';

  // Parse project type
  const typeMatch = content.match(/\*\*Project Type:\*\* (\w+)/);
  const projectType = typeMatch ? typeMatch[1].toLowerCase() : 'software';

  // Parse current phase
  const phaseMatch = content.match(/\*\*Phase:\*\* (\w+)/);
  const currentPhase = phaseMatch ? phaseMatch[1] : 'SPEC';

  // Parse gates from table
  const gates: ProjectState['gates'] = {};
  const gateTableMatch = content.match(/\| Gate \| Status \| Date \|\n\|[-|]+\|\n([\s\S]*?)(?:\n\n|$)/);

  if (gateTableMatch) {
    const gateRows = gateTableMatch[1].trim().split('\n');
    for (const row of gateRows) {
      const [, gateName, status] = row.split('|').map(s => s.trim());
      if (gateName && status) {
        gates[gateName] = {
          status: status.toLowerCase() === 'passed' ? 'passed' :
                  status.toLowerCase() === 'failed' ? 'failed' :
                  status.toLowerCase() === 'blocked' ? 'blocked' : 'pending',
        };
      }
    }
  }

  return { projectName, projectType, gates, currentPhase };
}

const program = new Command();

program
  .name('mai-gate')
  .description('Gate management for MAI projects')
  .version('1.0.0');

program
  .command('status')
  .description('Show all gates and their status')
  .action(() => {
    const state = loadProjectState();

    if (!state) {
      console.error('No project state found. Run "mai-init" first or create project-state.yaml.');
      process.exit(1);
    }

    console.log(`\n=== ${state.projectName} - Gate Status ===\n`);
    console.log(`Project Type: ${state.projectType}`);
    console.log(`Current Phase: ${state.currentPhase}\n`);

    const rows = Object.entries(state.gates).map(([name, gate]) => ({
      Gate: name,
      Status: gate.status.toUpperCase(),
      Date: gate.passedAt || gate.failedAt || '-',
    }));

    console.table(rows);
  });

program
  .command('pass <gate>')
  .description('Mark a gate as passed')
  .action((gateName: string) => {
    const state = loadProjectState();

    if (!state) {
      console.error('No project state found.');
      process.exit(1);
    }

    const normalizedName = gateName.toUpperCase();

    if (!state.gates[normalizedName]) {
      // Check if it's a close match
      const available = Object.keys(state.gates);
      const match = available.find(g => g.includes(normalizedName) || normalizedName.includes(g));

      if (match) {
        console.log(`Did you mean "${match}"?`);
      } else {
        console.error(`Gate "${normalizedName}" not found. Available gates: ${available.join(', ')}`);
      }
      process.exit(1);
    }

    state.gates[normalizedName] = {
      status: 'passed',
      passedAt: new Date().toISOString().split('T')[0],
    };

    // Update current phase based on passed gate
    updatePhaseFromGates(state);

    saveProjectState(state);
    console.log(`Gate "${normalizedName}" marked as PASSED.`);
  });

program
  .command('fail <gate>')
  .description('Mark a gate as failed')
  .option('-r, --reason <reason>', 'Reason for failure')
  .action((gateName: string, options: { reason?: string }) => {
    const state = loadProjectState();

    if (!state) {
      console.error('No project state found.');
      process.exit(1);
    }

    const normalizedName = gateName.toUpperCase();

    if (!state.gates[normalizedName]) {
      console.error(`Gate "${normalizedName}" not found.`);
      process.exit(1);
    }

    state.gates[normalizedName] = {
      status: 'failed',
      failedAt: new Date().toISOString().split('T')[0],
      blockedReason: options.reason,
    };

    saveProjectState(state);
    console.log(`Gate "${normalizedName}" marked as FAILED.`);
  });

program
  .command('block <gate>')
  .description('Mark a gate as blocked')
  .option('-r, --reason <reason>', 'Reason for block', 'Unspecified blocker')
  .action((gateName: string, options: { reason: string }) => {
    const state = loadProjectState();

    if (!state) {
      console.error('No project state found.');
      process.exit(1);
    }

    const normalizedName = gateName.toUpperCase();

    if (!state.gates[normalizedName]) {
      console.error(`Gate "${normalizedName}" not found.`);
      process.exit(1);
    }

    state.gates[normalizedName] = {
      status: 'blocked',
      blockedReason: options.reason,
    };

    saveProjectState(state);
    console.log(`Gate "${normalizedName}" marked as BLOCKED: ${options.reason}`);
  });

program
  .command('current')
  .description('Show the current gate')
  .action(() => {
    const state = loadProjectState();

    if (!state) {
      console.error('No project state found.');
      process.exit(1);
    }

    // Find first non-passed gate
    const currentGate = Object.entries(state.gates).find(([, gate]) => gate.status !== 'passed');

    if (!currentGate) {
      console.log('All gates passed! Project complete.');
    } else {
      console.log(`Current gate: ${currentGate[0]} (${currentGate[1].status})`);
    }
  });

program
  .command('init')
  .description('Initialize project-state.yaml from CLAUDE.md')
  .action(() => {
    const claudeMdPath = join(process.cwd(), 'CLAUDE.md');

    if (!existsSync(claudeMdPath)) {
      console.error('No CLAUDE.md found. Run "mai-init" first.');
      process.exit(1);
    }

    const state = initFromClaudeMd(claudeMdPath);
    saveProjectState(state);

    console.log(`Created ${STATE_FILE} for "${state.projectName}"`);
    console.log(`Found ${Object.keys(state.gates).length} gates.`);
  });

function updatePhaseFromGates(state: ProjectState): void {
  // Simple phase progression based on passed gates
  const phases = ['SPEC', 'DESIGN', 'BUILD', 'VERIFY', 'COMPLETE'];

  const passedGates = Object.entries(state.gates)
    .filter(([, gate]) => gate.status === 'passed')
    .map(([name]) => name);

  if (passedGates.includes('SPEC_APPROVED')) {
    state.currentPhase = 'DESIGN';
  }
  if (passedGates.includes('DESIGN_APPROVED')) {
    state.currentPhase = 'BUILD';
  }
  if (passedGates.includes('TESTS_EXIST')) {
    state.currentPhase = 'VERIFY';
  }
  if (passedGates.includes('SECURITY_REVIEW') && passedGates.includes('VERIFY_COMPLETE')) {
    state.currentPhase = 'COMPLETE';
  }
}

program.parse();
