#!/usr/bin/env bun
/**
 * MineRatings.ts — Mine ratings.jsonl + failure captures for actionable patterns
 *
 * Reads the implicit/explicit rating data captured by RatingCapture.hook.ts,
 * enriches low ratings with FAILURES/ context, clusters patterns, and uses
 * Haiku inference to extract "stop doing X" / "do more of Y" recommendations.
 *
 * High-water-mark: By default, only analyzes ratings newer than the last run.
 * State stored in PAIUpgrade/State/mine-ratings-hwm.json.
 *
 * Usage:
 *   bun MineRatings.ts              # Analyze only NEW ratings since last run
 *   bun MineRatings.ts --all        # Analyze ALL ratings (ignore high-water-mark)
 *   bun MineRatings.ts --dry-run    # Print stats only, no AI inference
 *   bun MineRatings.ts --since 7    # Only analyze last 7 days
 */

import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import { inference } from '../../PAI/Tools/Inference';

// ── Env Fix: Allow inference to spawn nested claude process ──
delete process.env.CLAUDECODE;

// ── Config ──

const HOME = homedir();
const BASE = join(HOME, '.claude');
const RATINGS_FILE = join(BASE, 'MEMORY', 'LEARNING', 'SIGNALS', 'ratings.jsonl');
const FAILURES_DIR = join(BASE, 'MEMORY', 'LEARNING', 'FAILURES');
const SYNTHESIS_DIR = join(BASE, 'MEMORY', 'LEARNING', 'SYNTHESIS');
const SCRIPT_DIR = join(BASE, 'skills', 'PAIUpgrade');
const HWM_FILE = join(SCRIPT_DIR, 'State', 'mine-ratings-hwm.json');

// ── Types ──

interface RatingEntry {
  timestamp: string;
  rating: number;
  session_id: string;
  comment?: string;
  source?: 'implicit';
  sentiment_summary?: string;
  confidence?: number;
}

interface FailureCapture {
  dirname: string;
  title: string;
  rating?: number;
  content: string;
}

interface ClusterSummary {
  label: string;
  count: number;
  entries: RatingEntry[];
  failures: FailureCapture[];
}

// ── High-Water-Mark State ──

interface HWMState {
  last_analyzed_timestamp: string;
  last_run: string;
  entries_analyzed: number;
}

function loadHWM(): HWMState | null {
  if (!existsSync(HWM_FILE)) return null;
  try {
    return JSON.parse(readFileSync(HWM_FILE, 'utf-8')) as HWMState;
  } catch { return null; }
}

function saveHWM(latestTimestamp: string, count: number): void {
  const state: HWMState = {
    last_analyzed_timestamp: latestTimestamp,
    last_run: new Date().toISOString(),
    entries_analyzed: count,
  };
  writeFileSync(HWM_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

// ── Args ──

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ANALYZE_ALL = args.includes('--all');
const sinceIdx = args.indexOf('--since');
const SINCE_DAYS = sinceIdx >= 0 ? parseInt(args[sinceIdx + 1], 10) : 0;

// ── Data Loading ──

function loadRatings(): RatingEntry[] {
  if (!existsSync(RATINGS_FILE)) {
    console.error(`No ratings file at ${RATINGS_FILE}`);
    process.exit(1);
  }
  const lines = readFileSync(RATINGS_FILE, 'utf-8').trim().split('\n');
  const entries: RatingEntry[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line) as RatingEntry;
      if (typeof entry.rating !== 'number') continue;
      entries.push(entry);
    } catch {}
  }
  return entries;
}

function loadFailures(): FailureCapture[] {
  if (!existsSync(FAILURES_DIR)) return [];
  const captures: FailureCapture[] = [];

  // Scan all subdirectories (YYYY-MM/ folders and direct failure dirs)
  const items = readdirSync(FAILURES_DIR, { withFileTypes: true });
  for (const item of items) {
    if (!item.isDirectory() || item.name.startsWith('.')) continue;

    const subpath = join(FAILURES_DIR, item.name);

    // Check if this is a YYYY-MM folder or a direct failure folder
    if (/^\d{4}-\d{2}$/.test(item.name)) {
      // It's a month folder — scan its children
      const children = readdirSync(subpath, { withFileTypes: true });
      for (const child of children) {
        if (!child.isDirectory()) continue;
        const fc = readFailureDir(join(subpath, child.name), child.name);
        if (fc) captures.push(fc);
      }
    } else {
      // Direct failure directory
      const fc = readFailureDir(subpath, item.name);
      if (fc) captures.push(fc);
    }
  }
  return captures;
}

function readFailureDir(dirPath: string, dirname: string): FailureCapture | null {
  // Look for analysis.md or any .md file
  const files = readdirSync(dirPath).filter(f => f.endsWith('.md'));
  if (files.length === 0) return null;

  const mdFile = files.find(f => f === 'analysis.md') || files[0];
  const content = readFileSync(join(dirPath, mdFile), 'utf-8');

  // Extract title from dirname (format: YYYY-MM-DD-HHMMSS_description)
  const title = dirname.replace(/^\d{4}-\d{2}-\d{2}-\d{6}_/, '').replace(/-/g, ' ');

  // Try to extract rating from content
  const ratingMatch = content.match(/rating:\s*(\d+)/i);
  const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : undefined;

  return { dirname, title, rating, content: content.slice(0, 1500) };
}

// ── Analysis ──

function computeStats(entries: RatingEntry[]) {
  const dist: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) dist[i] = 0;
  for (const e of entries) dist[e.rating] = (dist[e.rating] || 0) + 1;

  const ratings = entries.map(e => e.rating);
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  const low = entries.filter(e => e.rating <= 4);
  const neutral = entries.filter(e => e.rating >= 5 && e.rating <= 6);
  const high = entries.filter(e => e.rating >= 7);

  // Date range
  const dates = entries.map(e => new Date(e.timestamp)).sort((a, b) => a.getTime() - b.getTime());
  const earliest = dates[0]?.toISOString().split('T')[0] || 'N/A';
  const latest = dates[dates.length - 1]?.toISOString().split('T')[0] || 'N/A';

  return { dist, avg, low, neutral, high, earliest, latest, total: entries.length };
}

function clusterLow(entries: RatingEntry[], failures: FailureCapture[]): ClusterSummary {
  // Match failures to low ratings by timestamp proximity or content
  const matchedFailures: FailureCapture[] = [];
  for (const f of failures) {
    if (f.rating !== undefined && f.rating <= 4) {
      matchedFailures.push(f);
    }
  }
  return { label: 'Low Ratings (1-4)', count: entries.length, entries, failures: matchedFailures };
}

function clusterHigh(entries: RatingEntry[]): ClusterSummary {
  return { label: 'High Ratings (8-10)', count: entries.length, entries, failures: [] };
}

// ── AI Pattern Extraction ──

async function extractPatterns(cluster: ClusterSummary, direction: 'stop' | 'more'): Promise<string> {
  const summaries = cluster.entries
    .filter(e => e.sentiment_summary)
    .map(e => `- [${e.rating}/10] ${e.sentiment_summary}`)
    .join('\n');

  const failureContext = cluster.failures.length > 0
    ? '\n\nDETAILED FAILURE CONTEXTS:\n' + cluster.failures
        .map(f => `--- ${f.title} ---\n${f.content.slice(0, 500)}`)
        .join('\n\n')
    : '';

  const systemPrompt = direction === 'stop'
    ? `You analyze patterns in negative AI assistant feedback. Given a list of low ratings with context, identify 3-7 specific, actionable behavioral patterns the assistant should STOP doing. Be concrete — not "be better" but "stop claiming tasks are complete without running verification commands." Output as a numbered list. Each item: one sentence describing the pattern, then one sentence describing the fix.`
    : `You analyze patterns in positive AI assistant feedback. Given a list of high ratings with context, identify 3-7 specific behavioral patterns the assistant should DO MORE of. Be concrete — not "be good" but "continue providing thorough investigation with evidence before drawing conclusions." Output as a numbered list. Each item: one sentence describing what worked, then one sentence on how to replicate it.`;

  const userPrompt = `${cluster.count} interactions in this cluster:\n\n${summaries}${failureContext}`;

  const result = await inference({
    systemPrompt,
    userPrompt,
    level: 'fast',
    timeout: 45000,
  });

  if (!result.success) {
    return `(Inference failed: ${result.error})`;
  }
  return result.output;
}

// ── Draft Steering Rule Generation ──

async function draftSteeringRules(stopPatterns: string, lowCluster: ClusterSummary): Promise<string> {
  if (lowCluster.count === 0) return '(No low ratings — no draft rules generated)';

  const failureEvidence = lowCluster.failures.length > 0
    ? '\n\nFAILURE EVIDENCE:\n' + lowCluster.failures
        .map(f => `- ${f.title}: ${f.content.slice(0, 300)}`)
        .join('\n')
    : '';

  const systemPrompt = `You convert AI behavioral patterns into steering rules. Each rule follows this EXACT format:

## [Rule Title in Title Case]

Statement
: [One imperative sentence describing the rule]

Bad
: [Concrete example of the wrong behavior — describe the full interaction: what user asked, what AI did wrong, what happened as a result]

Correct
: [Concrete example of the right behavior — same scenario but done correctly]

Generate 2-4 rules from the patterns provided. Be extremely specific and concrete — reference real scenarios like QuickBooks API calls, OAuth tokens, MCP servers, file operations, etc. The rules should be actionable behavioral guardrails, not vague advice.`;

  const userPrompt = `PATTERNS TO CONVERT:\n\n${stopPatterns}${failureEvidence}`;

  const result = await inference({
    systemPrompt,
    userPrompt,
    level: 'fast',
    timeout: 45000,
  });

  if (!result.success) {
    return `(Draft rule generation failed: ${result.error})`;
  }
  return result.output;
}

// ── Report Generation ──

function formatDistribution(dist: Record<number, number>, total: number): string {
  const bar = (n: number) => {
    const pct = Math.round((n / total) * 100);
    const blocks = Math.round(pct / 3);
    return '#'.repeat(blocks).padEnd(33) + ` ${n} (${pct}%)`;
  };

  let out = '';
  for (let i = 1; i <= 10; i++) {
    out += `  ${String(i).padStart(2)}: ${bar(dist[i] || 0)}\n`;
  }
  return out;
}

// ── Main ──

async function main() {
  console.log('Mining ratings for feedback patterns...\n');

  // Load data
  let entries = loadRatings();
  const failures = loadFailures();
  const hwm = loadHWM();
  let freshOnly = false;

  // Apply filters in priority order: --since > --all > high-water-mark
  if (SINCE_DAYS > 0) {
    const cutoff = new Date(Date.now() - SINCE_DAYS * 24 * 60 * 60 * 1000);
    entries = entries.filter(e => new Date(e.timestamp) >= cutoff);
    console.log(`Filtered to last ${SINCE_DAYS} days: ${entries.length} entries\n`);
  } else if (!ANALYZE_ALL && hwm) {
    const cutoff = new Date(hwm.last_analyzed_timestamp);
    const before = entries.length;
    entries = entries.filter(e => new Date(e.timestamp) > cutoff);
    freshOnly = true;
    console.log(`High-water-mark: last run ${hwm.last_run.split('T')[0]} (analyzed ${hwm.entries_analyzed} entries)`);
    console.log(`Fresh ratings since: ${hwm.last_analyzed_timestamp.split('T')[0]} → ${entries.length} new (of ${before} total)\n`);
    if (entries.length === 0) {
      console.log('No new ratings since last analysis. Use --all to reprocess everything.');
      process.exit(0);
    }
  } else if (ANALYZE_ALL) {
    console.log(`--all: Analyzing all ${entries.length} ratings (ignoring high-water-mark)\n`);
  }

  if (entries.length === 0) {
    console.log('No rating entries found.');
    process.exit(0);
  }

  // Compute stats
  const stats = computeStats(entries);

  console.log(`=== RATINGS OVERVIEW ===`);
  console.log(`Entries: ${stats.total} | Range: ${stats.earliest} to ${stats.latest}`);
  console.log(`Average: ${stats.avg.toFixed(1)} | Low (1-4): ${stats.low.length} | Neutral (5-6): ${stats.neutral.length} | High (7-10): ${stats.high.length}`);
  console.log(`Failure captures found: ${failures.length}\n`);
  console.log(`Distribution:\n${formatDistribution(stats.dist, stats.total)}`);

  if (DRY_RUN) {
    // Print top low-rating summaries
    if (stats.low.length > 0) {
      console.log('\n--- LOW RATING SAMPLES ---');
      for (const e of stats.low.slice(0, 10)) {
        console.log(`  [${e.rating}] ${e.sentiment_summary || e.comment || '(no summary)'}`);
      }
    }
    if (stats.high.length > 0) {
      console.log('\n--- HIGH RATING SAMPLES ---');
      for (const e of stats.high.filter(e => e.rating >= 8).slice(0, 10)) {
        console.log(`  [${e.rating}] ${e.sentiment_summary || e.comment || '(no summary)'}`);
      }
    }
    console.log('\n(Dry run — no AI inference or report saved)');
    process.exit(0);
  }

  // Cluster and analyze
  const lowCluster = clusterLow(stats.low, failures);
  const highCluster = clusterHigh(stats.high.filter(e => e.rating >= 8));

  console.log('\nRunning AI pattern extraction...\n');

  let stopPatterns = '(No low ratings to analyze)';
  let morePatterns = '(No high ratings to analyze)';

  if (lowCluster.count > 0) {
    console.log(`Analyzing ${lowCluster.count} low ratings + ${lowCluster.failures.length} failure captures...`);
    stopPatterns = await extractPatterns(lowCluster, 'stop');
  }

  if (highCluster.count > 0) {
    console.log(`Analyzing ${highCluster.count} high ratings...`);
    morePatterns = await extractPatterns(highCluster, 'more');
  }

  // Generate draft steering rules from "stop" patterns
  let draftRules = '(No patterns to convert to rules)';
  if (lowCluster.count > 0 && stopPatterns !== '(No low ratings to analyze)') {
    console.log('Generating draft steering rules...');
    draftRules = await draftSteeringRules(stopPatterns, lowCluster);
  }

  // Build report
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const scopeLabel = freshOnly ? 'incremental (new only)' : ANALYZE_ALL ? 'full (--all)' : 'full (first run)';

  const report = `# Ratings Analysis Report

**Generated:** ${now.toISOString()}
**Period:** ${stats.earliest} to ${stats.latest}
**Entries analyzed:** ${stats.total}
**Scope:** ${scopeLabel}
**Failure captures reviewed:** ${failures.length}

## Overview

| Metric | Value |
|--------|-------|
| Total ratings | ${stats.total} |
| Average | ${stats.avg.toFixed(1)} |
| Low (1-4) | ${stats.low.length} (${Math.round(stats.low.length / stats.total * 100)}%) |
| Neutral (5-6) | ${stats.neutral.length} (${Math.round(stats.neutral.length / stats.total * 100)}%) |
| High (7-10) | ${stats.high.length} (${Math.round(stats.high.length / stats.total * 100)}%) |

## Distribution

\`\`\`
${formatDistribution(stats.dist, stats.total)}\`\`\`

## STOP Doing (from ${lowCluster.count} low ratings)

${stopPatterns}

## DO MORE Of (from ${highCluster.count} high ratings)

${morePatterns}

## Raw Low Rating Evidence

${stats.low.slice(0, 20).map(e => `- **[${e.rating}]** ${e.timestamp.split('T')[0]} — ${e.sentiment_summary || e.comment || '(no context)'}`).join('\n')}

## Raw High Rating Evidence

${stats.high.filter(e => e.rating >= 8).slice(0, 20).map(e => `- **[${e.rating}]** ${e.timestamp.split('T')[0]} — ${e.sentiment_summary || e.comment || '(no context)'}`).join('\n')}

## Draft Steering Rules (auto-generated — review before adding to USER/AISTEERINGRULES.md)

${draftRules}

## Failure Capture Titles (${failures.length} total)

${failures.map(f => `- ${f.title}`).join('\n') || '(none)'}

---
*Generated by MineRatings.ts — part of PAIUpgrade skill*
`;

  // Save report
  const synthDir = join(SYNTHESIS_DIR, yearMonth);
  if (!existsSync(synthDir)) mkdirSync(synthDir, { recursive: true });
  const reportPath = join(synthDir, `ratings-analysis-${dateStr}.md`);
  writeFileSync(reportPath, report, 'utf-8');

  // Update high-water-mark with latest timestamp from analyzed entries
  const sortedByTime = [...entries].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const latestTimestamp = sortedByTime[0]?.timestamp || new Date().toISOString();
  saveHWM(latestTimestamp, entries.length);

  console.log(`\n${'='.repeat(60)}`);
  console.log(report);
  console.log(`${'='.repeat(60)}`);
  console.log(`\nReport saved to: ${reportPath}`);
  console.log(`High-water-mark updated: ${latestTimestamp}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
