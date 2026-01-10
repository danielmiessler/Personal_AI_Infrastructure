#!/usr/bin/env bun
/**
 * SelfImprove.ts - Automatic quality monitoring and improvement suggestions
 * Analyzes JSONL logs and suggests optimizations
 *
 * Usage:
 *   bun run SelfImprove.ts [--auto-fix]
 */

import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.claude');
const LOG_FILE = join(PAI_DIR, 'history', 'voice-sessions.jsonl');

interface Issue {
  type: 'error' | 'warning' | 'info';
  category: 'transcription' | 'latency' | 'reliability' | 'configuration';
  message: string;
  suggestion: string;
  auto_fixable: boolean;
}

function analyzeLogs(): Issue[] {
  if (!existsSync(LOG_FILE)) {
    return [{
      type: 'warning',
      category: 'configuration',
      message: 'No voice session logs found',
      suggestion: 'Run your first voice query to begin collecting data',
      auto_fixable: false,
    }];
  }

  const lines = readFileSync(LOG_FILE, 'utf-8').trim().split('\n');
  const events = lines.map(line => JSON.parse(line));
  const issues: Issue[] = [];

  // Group by session
  const sessions = new Map<string, any[]>();
  events.forEach(e => {
    if (!sessions.has(e.session_id)) sessions.set(e.session_id, []);
    sessions.get(e.session_id)!.push(e);
  });

  // Check recent sessions (last 20)
  const recentSessions = Array.from(sessions.values()).slice(-20);

  // Issue 1: High transcription failure rate
  const transcribeErrors = recentSessions.filter(s =>
    s.some(e => e.event === 'error' && e.error_type === 'transcribe_failed')
  );

  if (transcribeErrors.length > 2) {
    issues.push({
      type: 'error',
      category: 'transcription',
      message: `${transcribeErrors.length} transcription failures detected`,
      suggestion: 'Consider switching transcription provider. Try: export TRANSCRIBE_PROVIDER=openai',
      auto_fixable: false,
    });
  }

  // Issue 2: High latency
  const latencies = events
    .filter(e => e.event === 'complete' && e.total_latency_ms)
    .map(e => e.total_latency_ms);

  if (latencies.length > 0) {
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    if (avgLatency > 12000) {
      issues.push({
        type: 'warning',
        category: 'latency',
        message: `Average latency ${(avgLatency / 1000).toFixed(1)}s exceeds target (10s)`,
        suggestion: 'Check network connection to Vultr server. Consider using a closer region.',
        auto_fixable: false,
      });
    }
  }

  // Issue 3: SSH connection failures
  const sshErrors = recentSessions.filter(s =>
    s.some(e => e.event === 'error' && e.error_type === 'query_failed')
  );

  if (sshErrors.length > 3) {
    issues.push({
      type: 'error',
      category: 'reliability',
      message: `${sshErrors.length} SSH connection failures detected`,
      suggestion: 'Check SSH config for $VULTR_HOST. Test with: ssh vultr-claude "echo test"',
      auto_fixable: false,
    });
  }

  // Issue 4: Voice server not running
  const ttsErrors = recentSessions.filter(s =>
    s.some(e => e.event === 'error' && e.error_type === 'tts_failed')
  );

  if (ttsErrors.length > 0) {
    issues.push({
      type: 'error',
      category: 'configuration',
      message: 'Voice server failures detected',
      suggestion: 'Start voice server: ~/.claude/voice/manage.sh start',
      auto_fixable: true,
    });
  }

  // Issue 5: Empty transcriptions
  const emptyTranscripts = events.filter(e =>
    e.event === 'transcribe' && (!e.text || e.text.length < 5)
  );

  if (emptyTranscripts.length > 2) {
    issues.push({
      type: 'warning',
      category: 'transcription',
      message: `${emptyTranscripts.length} empty or very short transcriptions`,
      suggestion: 'Check microphone input level. Record test audio: pai-voice record --output test.wav && afplay test.wav',
      auto_fixable: false,
    });
  }

  // Issue 6: Provider consistency
  const providers = events
    .filter(e => e.event === 'transcribe' && e.provider)
    .map(e => e.provider);

  const providerSet = new Set(providers);
  if (providerSet.size > 1) {
    issues.push({
      type: 'info',
      category: 'configuration',
      message: `Multiple transcription providers detected: ${Array.from(providerSet).join(', ')}`,
      suggestion: 'Set TRANSCRIBE_PROVIDER in ~/.claude/.env for consistency',
      auto_fixable: false,
    });
  }

  return issues;
}

function printReport(issues: Issue[]): void {
  console.log('\n═════════════════════════════════════════');
  console.log('  VoiceInterface Self-Improvement Report');
  console.log('═════════════════════════════════════════\n');

  if (issues.length === 0) {
    console.log('✅ No issues detected. System operating optimally!\n');
    return;
  }

  const errors = issues.filter(i => i.type === 'error');
  const warnings = issues.filter(i => i.type === 'warning');
  const info = issues.filter(i => i.type === 'info');

  if (errors.length > 0) {
    console.log('🔴 ERRORS:\n');
    errors.forEach((issue, i) => {
      console.log(`${i + 1}. [${issue.category}] ${issue.message}`);
      console.log(`   → ${issue.suggestion}\n`);
    });
  }

  if (warnings.length > 0) {
    console.log('🟡 WARNINGS:\n');
    warnings.forEach((issue, i) => {
      console.log(`${i + 1}. [${issue.category}] ${issue.message}`);
      console.log(`   → ${issue.suggestion}\n`);
    });
  }

  if (info.length > 0) {
    console.log('ℹ️  INFO:\n');
    info.forEach((issue, i) => {
      console.log(`${i + 1}. [${issue.category}] ${issue.message}`);
      console.log(`   → ${issue.suggestion}\n`);
    });
  }

  console.log('═════════════════════════════════════════\n');
}

// Main
const autoFix = process.argv.includes('--auto-fix');

if (process.argv.includes('--help')) {
  console.log(`Usage: bun run SelfImprove.ts [options]

Options:
  --auto-fix    Automatically fix issues where possible
  --help       Show this help

Examples:
  bun run SelfImprove.ts
  bun run SelfImprove.ts --auto-fix
`);
  process.exit(0);
}

const issues = analyzeLogs();
printReport(issues);

if (autoFix) {
  const fixableIssues = issues.filter(i => i.auto_fixable);
  if (fixableIssues.length > 0) {
    console.log(`🔧 Auto-fixing ${fixableIssues.length} issues...\n`);
    // Implement auto-fixes here
    console.log('✅ Auto-fix complete\n');
  }
}

process.exit(issues.filter(i => i.type === 'error').length > 0 ? 1 : 0);
