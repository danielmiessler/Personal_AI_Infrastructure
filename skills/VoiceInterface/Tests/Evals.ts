#!/usr/bin/env bun
/**
 * Evals.ts - Quality evaluation framework for VoiceInterface
 * Tests transcription accuracy, latency, and reliability
 *
 * Usage:
 *   bun run Evals.ts --test transcription
 *   bun run Evals.ts --test latency
 *   bun run Evals.ts --test all
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

const TEST_CASES_DIR = join(import.meta.dir, 'TestCases');

interface EvalOptions {
  test: 'transcription' | 'latency' | 'reliability' | 'all';
}

interface TranscriptionTestCase {
  audio_file: string;
  expected_text: string;
  provider?: string;
}

interface EvalResult {
  test: string;
  passed: boolean;
  score: number;
  target: number;
  details: string;
}

function parseArgs(): EvalOptions {
  const args = process.argv.slice(2);
  const opts: EvalOptions = { test: 'all' };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--test' && args[i + 1]) {
      opts.test = args[i + 1] as any;
      i++;
    } else if (args[i] === '--help') {
      console.log(`Usage: bun run Evals.ts [options]

Options:
  --test TYPE     transcription|latency|reliability|all (default: all)
  --help         Show this help

Test Types:
  transcription   - Word Error Rate (WER) < 5%
  latency        - End-to-end latency < 10s (P95)
  reliability    - Success rate > 95%
  all            - Run all tests

Examples:
  bun run Evals.ts --test transcription
  bun run Evals.ts --test all
`);
      process.exit(0);
    }
  }

  return opts;
}

// Calculate Word Error Rate
function calculateWER(reference: string, hypothesis: string): number {
  const refWords = reference.toLowerCase().split(/\s+/);
  const hypWords = hypothesis.toLowerCase().split(/\s+/);

  // Simple Levenshtein distance for words
  const m = refWords.length;
  const n = hypWords.length;
  const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (refWords[i - 1] === hypWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }

  return (dp[m][n] / m) * 100;
}

async function evalTranscription(): Promise<EvalResult> {
  console.error('\n📝 Running Transcription Quality Eval...');

  // Load test cases
  const testCasesFile = join(TEST_CASES_DIR, 'transcription-tests.json');
  if (!existsSync(testCasesFile)) {
    return {
      test: 'transcription',
      passed: false,
      score: 0,
      target: 5,
      details: 'No test cases found. Create TestCases/transcription-tests.json',
    };
  }

  const testCases: TranscriptionTestCase[] = JSON.parse(readFileSync(testCasesFile, 'utf-8'));
  let totalWER = 0;

  for (const testCase of testCases) {
    const audioPath = join(TEST_CASES_DIR, testCase.audio_file);
    if (!existsSync(audioPath)) {
      console.error(`⚠️  Audio file not found: ${testCase.audio_file}`);
      continue;
    }

    // Run transcription
    const result = await new Promise<string>((resolve) => {
      const proc = spawn('bun', [
        'run',
        join(import.meta.dir, '..', 'Tools', 'Transcribe.ts'),
        '--input', audioPath,
        '--provider', testCase.provider || 'whisperflow'
      ], { stdio: ['ignore', 'pipe', 'pipe'] });

      let output = '';
      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.on('close', () => { resolve(output.trim()); });
    });

    const wer = calculateWER(testCase.expected_text, result);
    totalWER += wer;

    console.error(`  ${testCase.audio_file}: WER=${wer.toFixed(1)}%`);
  }

  const avgWER = totalWER / testCases.length;
  const passed = avgWER < 5.0;

  return {
    test: 'transcription',
    passed,
    score: avgWER,
    target: 5.0,
    details: `WER: ${avgWER.toFixed(2)}% (${passed ? 'PASS' : 'FAIL'} - target < 5%)`,
  };
}

async function evalLatency(): Promise<EvalResult> {
  console.error('\n⏱️  Running Latency Eval...');

  const PAI_DIR = process.env.PAI_DIR || join(process.env.HOME!, '.claude');
  const logFile = join(PAI_DIR, 'history', 'voice-sessions.jsonl');

  if (!existsSync(logFile)) {
    return {
      test: 'latency',
      passed: false,
      score: 0,
      target: 10000,
      details: 'No session logs found',
    };
  }

  // Read last 100 sessions
  const lines = readFileSync(logFile, 'utf-8').trim().split('\n').slice(-200);
  const events = lines.map(line => JSON.parse(line));

  // Find complete events
  const latencies = events
    .filter(e => e.event === 'complete' && e.total_latency_ms)
    .map(e => e.total_latency_ms)
    .sort((a, b) => a - b);

  if (latencies.length === 0) {
    return {
      test: 'latency',
      passed: false,
      score: 0,
      target: 10000,
      details: 'No completed sessions found',
    };
  }

  // Calculate P95
  const p95Index = Math.floor(latencies.length * 0.95);
  const p95Latency = latencies[p95Index];
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

  const passed = p95Latency < 10000;

  return {
    test: 'latency',
    passed,
    score: p95Latency,
    target: 10000,
    details: `P95: ${(p95Latency / 1000).toFixed(2)}s, Avg: ${(avgLatency / 1000).toFixed(2)}s (${passed ? 'PASS' : 'FAIL'} - target < 10s)`,
  };
}

async function evalReliability(): Promise<EvalResult> {
  console.error('\n🔧 Running Reliability Eval...');

  const PAI_DIR = process.env.PAI_DIR || join(process.env.HOME!, '.claude');
  const logFile = join(PAI_DIR, 'history', 'voice-sessions.jsonl');

  if (!existsSync(logFile)) {
    return {
      test: 'reliability',
      passed: false,
      score: 0,
      target: 95,
      details: 'No session logs found',
    };
  }

  const lines = readFileSync(logFile, 'utf-8').trim().split('\n');
  const events = lines.map(line => JSON.parse(line));

  // Group by session
  const sessions = new Map<string, any[]>();
  events.forEach(e => {
    if (!sessions.has(e.session_id)) sessions.set(e.session_id, []);
    sessions.get(e.session_id)!.push(e);
  });

  let successful = 0;
  let failed = 0;

  sessions.forEach((sessionEvents) => {
    const hasError = sessionEvents.some(e => e.event === 'error');
    const hasComplete = sessionEvents.some(e => e.event === 'complete');

    if (hasComplete && !hasError) successful++;
    else failed++;
  });

  const total = successful + failed;
  const successRate = (successful / total) * 100;
  const passed = successRate > 95;

  return {
    test: 'reliability',
    passed,
    score: successRate,
    target: 95,
    details: `Success rate: ${successRate.toFixed(1)}% (${successful}/${total} sessions) - ${passed ? 'PASS' : 'FAIL'}`,
  };
}

function printResults(results: EvalResult[]): void {
  console.log('\n═════════════════════════════════════════');
  console.log('  VoiceInterface Quality Evals');
  console.log('═════════════════════════════════════════\n');

  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.test}`);
    console.log(`       ${result.details}\n`);
  });

  const allPassed = results.every(r => r.passed);
  const passCount = results.filter(r => r.passed).length;

  console.log('═════════════════════════════════════════');
  console.log(`Overall: ${passCount}/${results.length} tests passed`);
  console.log('═════════════════════════════════════════\n');

  process.exit(allPassed ? 0 : 1);
}

// Main
const opts = parseArgs();

(async () => {
  const results: EvalResult[] = [];

  if (opts.test === 'transcription' || opts.test === 'all') {
    results.push(await evalTranscription());
  }

  if (opts.test === 'latency' || opts.test === 'all') {
    results.push(await evalLatency());
  }

  if (opts.test === 'reliability' || opts.test === 'all') {
    results.push(await evalReliability());
  }

  printResults(results);
})();
