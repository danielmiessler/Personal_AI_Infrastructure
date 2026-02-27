#!/usr/bin/env bun
/**
 * RoutingStats.ts - ComplexityRouter Efficiency Dashboard
 *
 * Phase 1: Cache-adjusted costs, adherence tracking, efficiency signals
 * Phase 2: Sub-agent overhead display (when sub_* fields present in JSONL)
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

// ── Cache Read Pricing (per million tokens — ~10% of base input rate) ──
const CACHE_READ_PRICING = {
  HAIKU:  { input: 0.08 },
  SONNET: { input: 0.30 },
  OPUS:   { input: 1.50 },
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
  // Phase 2: sub-agent fields (optional — additive, old entries remain valid)
  sub_input_tokens?: number;
  sub_output_tokens?: number;
  sub_cache_tokens?: number;
  sub_models?: string[];
}

interface TierStats {
  count: number;
  total_input: number;
  total_output: number;
  total_cache: number;
  modelCounts: Record<string, number>;
}

// ── Tier rank for adherence icon logic ──
const TIER_RANK: Record<string, number> = { HAIKU: 0, SONNET: 1, OPUS: 2 };
const TIER_SHORT: Record<string, string> = { HAIKU: 'haiku', SONNET: 'sonnet', OPUS: 'opus' };

// ── File Path ──
function getMetricsPath(): string {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.claude');
  return join(paiDir, 'MEMORY', 'STATE', 'routing-metrics.jsonl');
}

// ── Load & Parse ──
function loadEntries(): MetricsEntry[] {
  const metricsPath = getMetricsPath();
  if (!existsSync(metricsPath)) return [];

  const entries: MetricsEntry[] = [];
  const lines = readFileSync(metricsPath, 'utf-8').split('\n').filter(l => l.trim());
  for (const line of lines) {
    try { entries.push(JSON.parse(line) as MetricsEntry); } catch { /* skip malformed */ }
  }
  return entries;
}

// ── Cost Calculation (per entry, cache-adjusted) ──
function computeCost(entry: MetricsEntry): number {
  const tier = (entry.tier?.toUpperCase() as Tier) || 'SONNET';
  const pricing = (PRICING as Record<string, { input: number; output: number }>)[tier] ?? PRICING.SONNET;
  const cacheP = (CACHE_READ_PRICING as Record<string, { input: number }>)[tier] ?? CACHE_READ_PRICING.SONNET;
  return (entry.input_tokens / 1e6) * pricing.input
       + (entry.output_tokens / 1e6) * pricing.output
       + ((entry.cache_read_input_tokens ?? 0) / 1e6) * cacheP.input;
}

function computeBaselineCost(entry: MetricsEntry): number {
  return (entry.input_tokens / 1e6) * PRICING.SONNET.input
       + (entry.output_tokens / 1e6) * PRICING.SONNET.output
       + ((entry.cache_read_input_tokens ?? 0) / 1e6) * CACHE_READ_PRICING.SONNET.input;
}

// ── Model → Tier mapping ──
function modelToTier(model: string): Tier {
  const m = model.toLowerCase();
  if (m.includes('haiku')) return 'HAIKU';
  if (m.includes('opus')) return 'OPUS';
  return 'SONNET';
}

// ── Bar Chart ──
function bar(fraction: number, width: number = 24): string {
  const filled = Math.round(Math.max(0, Math.min(1, fraction)) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

// ── Format Numbers ──
function fmt(n: number): string { return n.toLocaleString('en-US'); }

function fmtUSD(n: number): string {
  if (Math.abs(n) < 0.005) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function fmtK(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

// ── Section Divider ──
function section(title: string): void {
  const width = 44;
  const dashes = '─'.repeat(Math.max(0, width - 4 - title.length));
  console.log(`── ${title} ${dashes}`);
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
    HAIKU:  { count: 0, total_input: 0, total_output: 0, total_cache: 0, modelCounts: {} },
    SONNET: { count: 0, total_input: 0, total_output: 0, total_cache: 0, modelCounts: {} },
    OPUS:   { count: 0, total_input: 0, total_output: 0, total_cache: 0, modelCounts: {} },
  };

  let actualCost = 0;
  let baselineCost = 0;
  let adherentCount = 0;
  let subInputTotal = 0;
  let subOutputTotal = 0;
  let subCacheTotal = 0;
  let hasSubAgentData = false;

  for (const entry of entries) {
    const tier = (entry.tier?.toUpperCase() || 'SONNET') as string;
    if (!stats[tier]) {
      stats[tier] = { count: 0, total_input: 0, total_output: 0, total_cache: 0, modelCounts: {} };
    }

    const s = stats[tier];
    s.count++;
    s.total_input += entry.input_tokens ?? 0;
    s.total_output += entry.output_tokens ?? 0;
    s.total_cache += entry.cache_read_input_tokens ?? 0;

    const model = entry.model || 'unknown';
    s.modelCounts[model] = (s.modelCounts[model] ?? 0) + 1;

    actualCost += computeCost(entry);
    baselineCost += computeBaselineCost(entry);

    // Adherence: model tier matches router's tier recommendation
    if (modelToTier(model) === tier) adherentCount++;

    // Sub-agent data (Phase 2 — optional fields)
    if (entry.sub_input_tokens != null) {
      hasSubAgentData = true;
      subInputTotal += entry.sub_input_tokens ?? 0;
      subOutputTotal += entry.sub_output_tokens ?? 0;
      subCacheTotal += entry.sub_cache_tokens ?? 0;
    }
  }

  const total = entries.length;
  const adherencePct = total > 0 ? Math.round((adherentCount / total) * 100) : 0;

  // ── Header ──
  console.log('ComplexityRouter — Efficiency Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Prompts tracked: ${fmt(total)}`);
  console.log('');

  // ── Tier Distribution ──
  section('TIER DISTRIBUTION');
  for (const tier of ['HAIKU', 'SONNET', 'OPUS']) {
    const s = stats[tier];
    if (!s || s.count === 0) continue;
    const pct = Math.round((s.count / total) * 100);
    console.log(`  ${tier.padEnd(7)} ${bar(s.count / total)}  ${String(pct).padStart(3)}% (${s.count})`);
  }
  console.log('');

  // ── Routing Adherence ──
  section('ROUTING ADHERENCE');
  for (const tier of ['HAIKU', 'SONNET', 'OPUS']) {
    const s = stats[tier];
    if (!s || s.count === 0) continue;

    // Group actual models by their tier
    const byModelTier: Record<string, number> = {};
    for (const [model, cnt] of Object.entries(s.modelCounts)) {
      const mt = modelToTier(model);
      byModelTier[mt] = (byModelTier[mt] ?? 0) + cnt;
    }

    // Display: expected tier first, then others
    const parts: string[] = [];
    for (const mt of ['HAIKU', 'SONNET', 'OPUS'] as Tier[]) {
      const cnt = byModelTier[mt] ?? 0;
      if (cnt === 0) continue;
      let icon: string;
      if (mt === tier) {
        icon = '✓';
      } else {
        // Higher rank = more expensive model used (⚠), lower rank = cheaper used (↓)
        icon = (TIER_RANK[mt] ?? 1) > (TIER_RANK[tier] ?? 1) ? '⚠' : '↓';
      }
      parts.push(`→ ${(TIER_SHORT[mt] ?? mt.toLowerCase()).padEnd(6)} ${cnt}/${s.count} ${icon}`);
    }
    console.log(`  ${tier.padEnd(7)} ${parts.join('   ')}`);
  }
  console.log('');
  console.log(`  Overall adherence: ${adherentCount}/${total} (${adherencePct}%)  ← key router health metric`);
  console.log('');

  // ── Token Calibration ──
  section('TOKEN CALIBRATION');
  for (const tier of ['HAIKU', 'SONNET', 'OPUS']) {
    const s = stats[tier];
    if (!s || s.count === 0) continue;
    const avgIn = Math.round(s.total_input / s.count);
    const avgOut = Math.round(s.total_output / s.count);
    const avgCache = Math.round(s.total_cache / s.count);
    console.log(`  ${tier.padEnd(7)} avg: ${fmt(avgIn)} in / ${fmt(avgOut)} out  (cache: ${fmtK(avgCache)} avg)`);
  }
  console.log('');

  // ── Cost (cache-adjusted) ──
  section('COST (cache-adjusted)');
  if (hasSubAgentData) {
    // Phase 2: show sub-agent breakdown (assume Opus rates for sub-agent overhead)
    const subCost = (subInputTotal / 1e6) * PRICING.OPUS.input
                  + (subOutputTotal / 1e6) * PRICING.OPUS.output
                  + (subCacheTotal / 1e6) * CACHE_READ_PRICING.OPUS.input;
    const trueTotal = actualCost + subCost;
    const savings = baselineCost - trueTotal;
    const savingsPct = baselineCost > 0 ? Math.round((savings / baselineCost) * 100) : 0;
    console.log(`  Top-level only:       ${fmtUSD(actualCost)}`);
    console.log(`  Sub-agent overhead:   ${fmtUSD(subCost)}  ← previously invisible`);
    console.log(`  True total:           ${fmtUSD(trueTotal)}`);
    console.log(`  Baseline (Sonnet):    ${fmtUSD(baselineCost)}`);
    console.log(`  True savings:         ${fmtUSD(savings)} (${savingsPct}%)`);
  } else {
    // Phase 1: top-level costs only
    const savings = baselineCost - actualCost;
    const savingsPct = baselineCost > 0 ? Math.round((savings / baselineCost) * 100) : 0;
    console.log(`  Actual (routing + cache):    ${fmtUSD(actualCost)}`);
    console.log(`  Without routing (Sonnet):    ${fmtUSD(baselineCost)}  ← includes cache at Sonnet rates`);
    console.log(`  Savings:                     ${fmtUSD(savings)} (${savingsPct}%)`);
  }
  console.log('');

  // ── Efficiency Signals ──
  section('EFFICIENCY SIGNALS');
  const signals: string[] = [];

  const haikuStats = stats['HAIKU'];
  const opusStats = stats['OPUS'];

  if (adherencePct < 60) {
    if (haikuStats && haikuStats.count > 0) {
      const haikuByTier: Record<string, number> = {};
      for (const [model, cnt] of Object.entries(haikuStats.modelCounts)) {
        const mt = modelToTier(model);
        haikuByTier[mt] = (haikuByTier[mt] ?? 0) + cnt;
      }
      const haikuAdherent = haikuByTier['HAIKU'] ?? 0;
      const haikuPct = Math.round((haikuAdherent / haikuStats.count) * 100);
      signals.push(`⚠ HAIKU hints followed only ${haikuPct}% — algorithm not spawning Task(haiku) for simple prompts`);
    } else {
      signals.push(`⚠ Overall adherence ${adherencePct}% — router hints not being followed by model selection`);
    }
  }

  if (opusStats && opusStats.count > 0) {
    const opusAvgIn = Math.round(opusStats.total_input / opusStats.count);
    if (opusAvgIn < 1000) {
      signals.push(`⚠ Opus top-level tokens low (${fmt(opusAvgIn)} avg) — sub-agents carry real cost`);
    }
  }

  if (haikuStats && haikuStats.count > 0) {
    const haikuAvgIn = Math.round(haikuStats.total_input / haikuStats.count);
    if (haikuAvgIn > 2000) {
      signals.push(`⚠ HAIKU tier avg tokens (${fmt(haikuAvgIn)}) high — some prompts may be mis-classified`);
    } else {
      signals.push(`✓ HAIKU tier tokens (${fmt(haikuAvgIn)} avg) appropriate for simple prompts`);
    }
  }

  if (adherencePct >= 60) {
    signals.push(`✓ Router adherence ${adherencePct}% — model selection broadly aligns with tier hints`);
  }

  if (signals.length === 0) {
    signals.push('✓ No anomalies detected — router operating normally');
  }

  for (const sig of signals) {
    console.log(`  ${sig}`);
  }
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
