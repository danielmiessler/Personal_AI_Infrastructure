#!/usr/bin/env bun
/**
 * RoutingStats.ts - ComplexityRouter Effectiveness Dashboard
 *
 * Reads MEMORY/STATE/routing-metrics.jsonl and renders:
 * - Tier distribution (HAIKU / SONNET / OPUS)
 * - Average token counts per tier
 * - Estimated cost savings vs always-Sonnet baseline
 *
 * Usage:
 *   bun skills/PAI/Tools/RoutingStats.ts
 *   bun skills/PAI/Tools/RoutingStats.ts --json
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ── Pricing (per million tokens) ──
const PRICING = {
  HAIKU:  { input: 0.80,  output: 4.00  },
  SONNET: { input: 3.00,  output: 15.00 },
  OPUS:   { input: 15.00, output: 75.00 },
} as const;

type Tier = keyof typeof PRICING;

interface MetricsEntry {
  timestamp: string;
  session_id: string;
  tier: string;
  prompt_chars: number;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
}

interface TierStats {
  count: number;
  total_input: number;
  total_output: number;
  total_cache: number;
  cost: number;
}

// ── File Path ──
function getMetricsPath(): string {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.claude');
  return join(paiDir, 'MEMORY', 'STATE', 'routing-metrics.jsonl');
}

// ── Load & Parse ──
function loadEntries(): MetricsEntry[] {
  const metricsPath = getMetricsPath();
  if (!existsSync(metricsPath)) {
    return [];
  }

  const entries: MetricsEntry[] = [];
  const lines = readFileSync(metricsPath, 'utf-8').split('\n').filter(l => l.trim());

  for (const line of lines) {
    try {
      entries.push(JSON.parse(line) as MetricsEntry);
    } catch {
      // Skip malformed lines
    }
  }

  return entries;
}

// ── Cost Calculation ──
function calcCost(inputTokens: number, outputTokens: number, tier: Tier): number {
  const p = PRICING[tier];
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}

// ── Bar Chart ──
function bar(fraction: number, width: number = 24): string {
  const filled = Math.round(fraction * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// ── Format Numbers ──
function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}

// ── Main Report ──
function renderReport(entries: MetricsEntry[]): void {
  if (entries.length === 0) {
    console.log('ComplexityRouter — No data yet');
    console.log('');
    console.log('Send some prompts and routing-metrics.jsonl will populate automatically.');
    console.log(`Metrics file: ${getMetricsPath()}`);
    return;
  }

  // Aggregate by tier
  const stats: Record<string, TierStats> = {
    HAIKU:  { count: 0, total_input: 0, total_output: 0, total_cache: 0, cost: 0 },
    SONNET: { count: 0, total_input: 0, total_output: 0, total_cache: 0, cost: 0 },
    OPUS:   { count: 0, total_input: 0, total_output: 0, total_cache: 0, cost: 0 },
  };

  const modelCounts: Record<string, number> = {};

  for (const entry of entries) {
    const tier = entry.tier?.toUpperCase() as string;
    if (!stats[tier]) {
      stats[tier] = { count: 0, total_input: 0, total_output: 0, total_cache: 0, cost: 0 };
    }

    const s = stats[tier];
    s.count++;
    s.total_input += entry.input_tokens ?? 0;
    s.total_output += entry.output_tokens ?? 0;
    s.total_cache += entry.cache_read_input_tokens ?? 0;

    const pricingTier = (PRICING as Record<string, { input: number; output: number }>)[tier] || PRICING.SONNET;
    s.cost += (s.total_input / 1_000_000) * pricingTier.input + (s.total_output / 1_000_000) * pricingTier.output;

    const model = entry.model || 'unknown';
    modelCounts[model] = (modelCounts[model] ?? 0) + 1;
  }

  const total = entries.length;

  // ── Header ──
  console.log('ComplexityRouter — Routing Effectiveness');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Prompts tracked: ${fmt(total)}`);
  console.log('');

  // ── Tier Distribution ──
  console.log('Tier Distribution:');
  for (const tier of ['HAIKU', 'SONNET', 'OPUS']) {
    const s = stats[tier];
    if (!s) continue;
    const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
    const b = bar(s.count / total);
    console.log(`  ${tier.padEnd(7)} ${b}  ${String(pct).padStart(3)}% (${s.count})`);
  }
  console.log('');

  // ── Average Tokens ──
  console.log('Avg tokens per prompt (input / output):');
  for (const tier of ['HAIKU', 'SONNET', 'OPUS']) {
    const s = stats[tier];
    if (!s || s.count === 0) continue;
    const avgIn = Math.round(s.total_input / s.count);
    const avgOut = Math.round(s.total_output / s.count);
    console.log(`  ${tier.padEnd(7)} ${fmt(avgIn)} in / ${fmt(avgOut)} out`);
  }
  console.log('');

  // ── Cost Analysis ──
  // Actual cost (with routing)
  let actualCost = 0;
  for (const tier of Object.keys(stats)) {
    const s = stats[tier];
    const pricingTier = (PRICING as Record<string, { input: number; output: number }>)[tier] || PRICING.SONNET;
    actualCost += (s.total_input / 1_000_000) * pricingTier.input + (s.total_output / 1_000_000) * pricingTier.output;
  }

  // Baseline cost (all Sonnet)
  let baselineCost = 0;
  for (const s of Object.values(stats)) {
    baselineCost += (s.total_input / 1_000_000) * PRICING.SONNET.input + (s.total_output / 1_000_000) * PRICING.SONNET.output;
  }

  const savings = baselineCost - actualCost;
  const savingsPct = baselineCost > 0 ? Math.round((savings / baselineCost) * 100) : 0;

  console.log('Estimated cost (Sonnet pricing = $3/$15 per M tokens):');
  console.log(`  Actual (with routing):    ${fmtUSD(actualCost)}`);
  console.log(`  Without routing (Sonnet): ${fmtUSD(baselineCost)}`);
  console.log(`  Savings:                  ${fmtUSD(savings)} (${savingsPct}%)`);
  console.log('');

  // ── Models Observed ──
  const sortedModels = Object.entries(modelCounts).sort((a, b) => b[1] - a[1]);
  const modelParts = sortedModels.map(([m, c]) => `${m} (${Math.round((c / total) * 100)}%)`);
  console.log(`Models observed: ${modelParts.join('  ')}`);
}

// ── JSON Output ──
function renderJson(entries: MetricsEntry[]): void {
  console.log(JSON.stringify(entries, null, 2));
}

// ── Entry Point ──
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');

const entries = loadEntries();
if (jsonMode) {
  renderJson(entries);
} else {
  renderReport(entries);
}
