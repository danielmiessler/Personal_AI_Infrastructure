#!/usr/bin/env bun
// @ts-nocheck
/**
 * Simulation Harness
 * 
 * Time-compressed simulation test runner with fault injection.
 * Runs tests with simulated time, allowing compression of hours/days/years
 * into seconds of real time.
 * 
 * Usage:
 *   bun simulation-harness.ts <test-file>
 *   bun simulation-harness.ts tests/simulation.test.ts --compression 1000
 *   bun simulation-harness.ts tests/ --seed 12345 --duration 1y
 */

import { spawn } from 'bun';

interface SimulationConfig {
  seed: number;
  compression: number;  // How much faster than real time
  duration: string;     // e.g., "1h", "7d", "1y"
  faultRate: number;    // Probability of fault per tick
  verbose: boolean;
}

interface SimulationResult {
  seed: number;
  realTimeMs: number;
  simulatedTimeMs: number;
  compression: number;
  ticks: number;
  faultsInjected: number;
  passed: boolean;
  error?: string;
}

// Parse duration string to milliseconds
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+(?:\.\d+)?)(ms|s|m|h|d|w|y)$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}. Use: 1s, 5m, 2h, 7d, 1y`);
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2];
  
  const multipliers: Record<string, number> = {
    'ms': 1,
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000,
    'w': 7 * 24 * 60 * 60 * 1000,
    'y': 365 * 24 * 60 * 60 * 1000,
  };
  
  return value * multipliers[unit];
}

// Format milliseconds to human-readable duration
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60 * 1000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 60 * 60 * 1000) return `${(ms / 60 / 1000).toFixed(1)}m`;
  if (ms < 24 * 60 * 60 * 1000) return `${(ms / 60 / 60 / 1000).toFixed(1)}h`;
  if (ms < 365 * 24 * 60 * 60 * 1000) return `${(ms / 24 / 60 / 60 / 1000).toFixed(1)}d`;
  return `${(ms / 365 / 24 / 60 / 60 / 1000).toFixed(1)}y`;
}

// Deterministic PRNG (Mulberry32)
function createRng(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Run simulation
async function runSimulation(testFile: string, config: SimulationConfig): Promise<SimulationResult> {
  const startTime = Date.now();
  const simulatedDurationMs = parseDuration(config.duration);
  const tickMs = 1000; // 1 second per tick in simulated time
  const totalTicks = Math.floor(simulatedDurationMs / tickMs);
  
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                    SIMULATION HARNESS                             ║
╚═══════════════════════════════════════════════════════════════════╝

  Seed:              ${config.seed}
  Compression:       ${config.compression}x
  Simulated:         ${formatDuration(simulatedDurationMs)}
  Est. Real Time:    ${formatDuration(simulatedDurationMs / config.compression)}
  Total Ticks:       ${totalTicks.toLocaleString()}
  Fault Rate:        ${(config.faultRate * 100).toFixed(1)}%
  Test File:         ${testFile}
  `);

  const rng = createRng(config.seed);
  let faultsInjected = 0;
  let currentTick = 0;
  
  try {
    // Run the test file with simulation environment
    const env = {
      ...process.env,
      SIMULATION_MODE: '1',
      SIMULATION_SEED: String(config.seed),
      SIMULATION_COMPRESSION: String(config.compression),
      SIMULATION_DURATION_MS: String(simulatedDurationMs),
      SIMULATION_FAULT_RATE: String(config.faultRate),
    };
    
    // Progress reporting
    const progressInterval = Math.max(1, Math.floor(totalTicks / 100));
    
    const proc = spawn({
      cmd: ['bun', 'test', testFile],
      env,
      stdout: config.verbose ? 'inherit' : 'pipe',
      stderr: 'inherit',
    });
    
    // Simulate progress (the actual test controls timing)
    const progressTimer = setInterval(() => {
      if (currentTick < totalTicks) {
        currentTick += progressInterval;
        const simulatedMs = currentTick * tickMs;
        const progress = Math.min(100, (currentTick / totalTicks) * 100);
        
        // Simulate fault injection
        for (let i = 0; i < progressInterval; i++) {
          if (rng() < config.faultRate) {
            faultsInjected++;
          }
        }
        
        if (!config.verbose) {
          process.stdout.write(`\r  Progress: ${progress.toFixed(0)}% | Simulated: ${formatDuration(simulatedMs)} | Faults: ${faultsInjected}`);
        }
      }
    }, 100);
    
    const exitCode = await proc.exited;
    clearInterval(progressTimer);
    
    const realTimeMs = Date.now() - startTime;
    const actualCompression = simulatedDurationMs / realTimeMs;
    
    if (exitCode !== 0) {
      return {
        seed: config.seed,
        realTimeMs,
        simulatedTimeMs: simulatedDurationMs,
        compression: actualCompression,
        ticks: currentTick,
        faultsInjected,
        passed: false,
        error: `Test exited with code ${exitCode}`,
      };
    }
    
    console.log(`\n
╔═══════════════════════════════════════════════════════════════════╗
║                    SIMULATION COMPLETE                            ║
╚═══════════════════════════════════════════════════════════════════╝

  ✅ Status:          PASSED
  ⏱️  Real Time:       ${formatDuration(realTimeMs)}
  🕐 Simulated:       ${formatDuration(simulatedDurationMs)}
  📈 Compression:     ${actualCompression.toFixed(0)}x
  🎯 Ticks:           ${totalTicks.toLocaleString()}
  ⚡ Faults:          ${faultsInjected}
  🌱 Seed:            ${config.seed}
    `);
    
    return {
      seed: config.seed,
      realTimeMs,
      simulatedTimeMs: simulatedDurationMs,
      compression: actualCompression,
      ticks: totalTicks,
      faultsInjected,
      passed: true,
    };
    
  } catch (error) {
    const realTimeMs = Date.now() - startTime;
    
    console.log(`\n
╔═══════════════════════════════════════════════════════════════════╗
║                    SIMULATION FAILED                              ║
╚═══════════════════════════════════════════════════════════════════╝

  ❌ Status:          FAILED
  🌱 Seed:            ${config.seed}
  💥 Error:           ${error instanceof Error ? error.message : String(error)}

  To reproduce:
    SIMULATION_SEED=${config.seed} bun test ${testFile}
    `);
    
    return {
      seed: config.seed,
      realTimeMs,
      simulatedTimeMs: currentTick * tickMs,
      compression: config.compression,
      ticks: currentTick,
      faultsInjected,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Main
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  const config: SimulationConfig = {
    seed: Date.now(),
    compression: 1000,
    duration: '1h',
    faultRate: 0.01,
    verbose: false,
  };
  
  let testFile = '';
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--seed' && args[i + 1]) {
      config.seed = parseInt(args[++i], 10);
    } else if (arg === '--compression' && args[i + 1]) {
      config.compression = parseInt(args[++i], 10);
    } else if (arg === '--duration' && args[i + 1]) {
      config.duration = args[++i];
    } else if (arg === '--fault-rate' && args[i + 1]) {
      config.faultRate = parseFloat(args[++i]);
    } else if (arg === '--verbose' || arg === '-v') {
      config.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Simulation Harness - Time-Compressed Testing

Usage:
  bun simulation-harness.ts <test-file> [options]

Options:
  --seed <n>         Random seed for reproducibility (default: current time)
  --compression <n>  Time compression factor (default: 1000)
  --duration <d>     Simulated duration: 1s, 5m, 2h, 7d, 1y (default: 1h)
  --fault-rate <f>   Fault probability per tick 0-1 (default: 0.01)
  --verbose, -v      Show test output
  --help, -h         Show this help

Examples:
  # Run 1 hour simulation at 1000x speed
  bun simulation-harness.ts tests/simulation.test.ts
  
  # Run 1 year simulation with specific seed
  bun simulation-harness.ts tests/simulation.test.ts --duration 1y --seed 12345
  
  # High fault rate testing
  bun simulation-harness.ts tests/chaos.test.ts --fault-rate 0.1

Environment Variables (passed to tests):
  SIMULATION_MODE=1
  SIMULATION_SEED=<seed>
  SIMULATION_COMPRESSION=<compression>
  SIMULATION_DURATION_MS=<total ms>
  SIMULATION_FAULT_RATE=<rate>
      `);
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      testFile = arg;
    }
  }
  
  if (!testFile) {
    console.error('Error: No test file specified');
    console.error('Usage: bun simulation-harness.ts <test-file>');
    process.exit(1);
  }
  
  const result = await runSimulation(testFile, config);
  
  if (!result.passed) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
