#!/usr/bin/env bun
/**
 * KeywordQueue - Manage keyword queue for content generation
 *
 * This module handles the keyword queue that drives article generation.
 * Keywords are discovered, scored, prioritized, and consumed by the
 * article generation pipeline.
 *
 * Usage (CLI):
 *   bun run keyword-queue.ts list [--site=SITE] [--status=STATUS]
 *   bun run keyword-queue.ts add "keyword1, keyword2" --topic="Article topic" --site=SITE
 *   bun run keyword-queue.ts next --site=SITE
 *   bun run keyword-queue.ts update ID --status=STATUS
 *   bun run keyword-queue.ts priority
 *
 * Usage (Module):
 *   import { KeywordQueue } from './keyword-queue';
 *   const queue = new KeywordQueue('/path/to/site');
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { KeywordEntry, KeywordStatus, KeywordSource, KeywordScore, KeywordMetrics } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface QueueData {
  site: string;
  keywords: KeywordEntry[];
  lastUpdated: string;
}

export interface AddKeywordParams {
  keywords: string[];
  topic: string;
  site: string;
  source?: KeywordSource;
  priority?: number;
  seasonal?: {
    event: string;
    eventDate: string;
    publishDeadline: string;
  };
  metrics?: KeywordMetrics;
}

export interface ListParams {
  site?: string;
  status?: KeywordStatus;
  limit?: number;
}

// ============================================================================
// Priority Scoring
// ============================================================================

/**
 * Calculate priority score from keyword metrics
 * Lower number = higher priority (1 is highest)
 */
export function calculatePriority(scores: KeywordScore): number {
  const weighted =
    (100 - scores.trendScore) * 0.3 +
    (100 - scores.competitionScore) * 0.25 +
    (100 - scores.commercialIntent) * 0.25 +
    (100 - scores.seasonalBonus) * 0.1 +
    scores.recencyPenalty * 0.1;

  return Math.max(1, Math.min(10, Math.round(weighted / 10)));
}

/**
 * Default scoring when no metrics available
 */
export function defaultScore(): KeywordScore {
  return {
    trendScore: 50,
    competitionScore: 50,
    commercialIntent: 50,
    seasonalBonus: 0,
    recencyPenalty: 0
  };
}

// ============================================================================
// KeywordQueue Class
// ============================================================================

export class KeywordQueue {
  private queuePath: string;
  private site: string;

  constructor(sitePath: string, site: string) {
    this.site = site;
    this.queuePath = join(sitePath, 'keywords.json');
  }

  /**
   * Load queue data from file
   */
  load(): QueueData {
    if (!existsSync(this.queuePath)) {
      return {
        site: this.site,
        keywords: [],
        lastUpdated: new Date().toISOString()
      };
    }

    return JSON.parse(readFileSync(this.queuePath, 'utf-8'));
  }

  /**
   * Save queue data to file
   */
  save(data: QueueData): void {
    const dir = dirname(this.queuePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    data.lastUpdated = new Date().toISOString();
    writeFileSync(this.queuePath, JSON.stringify(data, null, 2));
  }

  /**
   * Generate unique keyword ID
   */
  private generateId(): string {
    const date = new Date().toISOString().split('T')[0];
    const count = this.load().keywords.filter(k =>
      k.id.startsWith(`kw-${date}`)
    ).length + 1;

    return `kw-${date}-${String(count).padStart(3, '0')}`;
  }

  /**
   * Add a new keyword entry
   */
  add(params: AddKeywordParams): KeywordEntry {
    const data = this.load();

    // Check for duplicates (by primary keyword)
    const primaryKeyword = params.keywords[0]?.toLowerCase();
    const duplicate = data.keywords.find(k =>
      k.keywords[0]?.toLowerCase() === primaryKeyword && k.status !== 'completed'
    );

    if (duplicate) {
      throw new Error(`Duplicate keyword already in queue: ${primaryKeyword} (${duplicate.id})`);
    }

    const entry: KeywordEntry = {
      id: this.generateId(),
      keywords: params.keywords,
      topic: params.topic,
      priority: params.priority || 5,
      status: 'pending',
      added: new Date().toISOString(),
      source: params.source || 'manual',
      seasonal: params.seasonal,
      metrics: params.metrics
    };

    data.keywords.push(entry);
    this.save(data);

    return entry;
  }

  /**
   * Add multiple keywords (batch)
   */
  addBatch(entries: AddKeywordParams[]): KeywordEntry[] {
    const added: KeywordEntry[] = [];

    for (const params of entries) {
      try {
        added.push(this.add(params));
      } catch (e) {
        // Skip duplicates in batch mode
        console.warn(`Skipping: ${(e as Error).message}`);
      }
    }

    return added;
  }

  /**
   * Update an existing entry
   */
  update(id: string, updates: Partial<KeywordEntry>): KeywordEntry | null {
    const data = this.load();
    const entry = data.keywords.find(k => k.id === id);

    if (!entry) {
      return null;
    }

    Object.assign(entry, updates);
    this.save(data);

    return entry;
  }

  /**
   * Get a single entry by ID
   */
  get(id: string): KeywordEntry | null {
    const data = this.load();
    return data.keywords.find(k => k.id === id) || null;
  }

  /**
   * List entries with optional filters
   */
  list(params: ListParams = {}): KeywordEntry[] {
    const data = this.load();
    let keywords = data.keywords;

    if (params.status) {
      keywords = keywords.filter(k => k.status === params.status);
    }

    // Sort by priority (lower = higher priority), then by date added
    keywords = keywords.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.added.localeCompare(b.added);
    });

    if (params.limit) {
      keywords = keywords.slice(0, params.limit);
    }

    return keywords;
  }

  /**
   * Get the next keyword to process
   */
  next(): KeywordEntry | null {
    const pending = this.list({ status: 'pending', limit: 1 });
    return pending[0] || null;
  }

  /**
   * Claim a keyword for processing (atomically mark as in_progress)
   */
  claim(): KeywordEntry | null {
    const next = this.next();
    if (!next) return null;

    return this.update(next.id, { status: 'in_progress' });
  }

  /**
   * Mark a keyword as completed
   */
  complete(id: string): KeywordEntry | null {
    return this.update(id, { status: 'completed' });
  }

  /**
   * Mark a keyword as failed
   */
  fail(id: string): KeywordEntry | null {
    return this.update(id, { status: 'failed' });
  }

  /**
   * Delete an entry
   */
  delete(id: string): boolean {
    const data = this.load();
    const index = data.keywords.findIndex(k => k.id === id);

    if (index === -1) {
      return false;
    }

    data.keywords.splice(index, 1);
    this.save(data);

    return true;
  }

  /**
   * Recalculate priorities for all pending keywords
   */
  reprioritize(scoreFn?: (entry: KeywordEntry) => KeywordScore): void {
    const data = this.load();

    for (const entry of data.keywords) {
      if (entry.status !== 'pending') continue;

      const scores = scoreFn ? scoreFn(entry) : defaultScore();
      entry.priority = calculatePriority(scores);
    }

    this.save(data);
  }

  /**
   * Get queue statistics
   */
  stats(): { pending: number; in_progress: number; completed: number; failed: number; total: number } {
    const data = this.load();
    return {
      pending: data.keywords.filter(k => k.status === 'pending').length,
      in_progress: data.keywords.filter(k => k.status === 'in_progress').length,
      completed: data.keywords.filter(k => k.status === 'completed').length,
      failed: data.keywords.filter(k => k.status === 'failed').length,
      total: data.keywords.length
    };
  }

  /**
   * Check for seasonal keywords approaching deadline
   */
  getUrgent(daysAhead: number = 7): KeywordEntry[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    return this.list({ status: 'pending' }).filter(k =>
      k.seasonal && k.seasonal.publishDeadline <= cutoffStr
    );
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

function formatList(keywords: KeywordEntry[]): string {
  if (keywords.length === 0) {
    return '\nNo keywords in queue.\n';
  }

  let output = '\n' + '='.repeat(80) + '\n';
  output += 'KEYWORD QUEUE\n';
  output += '='.repeat(80) + '\n\n';

  const statusIcons: Record<KeywordStatus, string> = {
    pending: '⏳',
    in_progress: '🔄',
    completed: '✅',
    failed: '❌'
  };

  for (const kw of keywords) {
    output += `${statusIcons[kw.status]} [P${kw.priority}] ${kw.keywords[0]}\n`;
    output += `   ID: ${kw.id} | Source: ${kw.source}\n`;
    output += `   Topic: ${kw.topic.slice(0, 60)}${kw.topic.length > 60 ? '...' : ''}\n`;
    if (kw.keywords.length > 1) {
      output += `   Related: ${kw.keywords.slice(1).join(', ')}\n`;
    }
    if (kw.seasonal) {
      output += `   Seasonal: ${kw.seasonal.event} (deadline: ${kw.seasonal.publishDeadline})\n`;
    }
    output += '\n';
  }

  return output;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Parse flags
  const flags: Record<string, string> = {};
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      flags[key] = value || 'true';
    }
  }

  if (!command || command === '--help') {
    console.log(`
Keyword Queue - Manage keywords for content generation

Usage:
  bun run keyword-queue.ts list [--status=STATUS]
  bun run keyword-queue.ts add "keyword1, keyword2" --topic="Topic" --site=SITE
  bun run keyword-queue.ts next
  bun run keyword-queue.ts claim
  bun run keyword-queue.ts update ID --status=STATUS
  bun run keyword-queue.ts stats

Examples:
  bun run keyword-queue.ts add "best spy cameras, hidden cameras 2026" --topic="Review of best spy cameras for home security" --site=pispy
  bun run keyword-queue.ts list --status=pending
  bun run keyword-queue.ts next
  bun run keyword-queue.ts update kw-2026-01-09-001 --status=completed
`);
    process.exit(0);
  }

  const sitePath = flags.path || process.cwd();
  const site = flags.site || 'default';

  const queue = new KeywordQueue(sitePath, site);

  switch (command) {
    case 'list': {
      const keywords = queue.list({
        status: flags.status as KeywordStatus,
        limit: flags.limit ? parseInt(flags.limit) : undefined
      });
      console.log(formatList(keywords));
      break;
    }

    case 'add': {
      const keywordsArg = args[1];
      if (!keywordsArg || keywordsArg.startsWith('--')) {
        console.error('❌ Keywords required: add "keyword1, keyword2" --topic="Topic"');
        process.exit(1);
      }

      if (!flags.topic) {
        console.error('❌ Topic required: --topic="Article topic description"');
        process.exit(1);
      }

      const keywords = keywordsArg.split(',').map(k => k.trim());
      try {
        const entry = queue.add({
          keywords,
          topic: flags.topic,
          site,
          source: (flags.source as KeywordSource) || 'manual',
          priority: flags.priority ? parseInt(flags.priority) : undefined
        });

        console.log(`\n✅ Added: ${entry.keywords[0]}`);
        console.log(`   ID: ${entry.id}`);
        console.log(`   Priority: ${entry.priority}`);
      } catch (e) {
        console.error(`\n❌ ${(e as Error).message}`);
        process.exit(1);
      }
      break;
    }

    case 'next': {
      const next = queue.next();
      if (next) {
        console.log(`\nNext keyword: ${next.keywords[0]}`);
        console.log(`   ID: ${next.id}`);
        console.log(`   Topic: ${next.topic}`);
        console.log(`   Priority: ${next.priority}`);
      } else {
        console.log('\nNo pending keywords in queue.');
      }
      break;
    }

    case 'claim': {
      const claimed = queue.claim();
      if (claimed) {
        console.log(`\n✅ Claimed: ${claimed.keywords[0]}`);
        console.log(`   ID: ${claimed.id}`);
        console.log(`   Topic: ${claimed.topic}`);
      } else {
        console.log('\nNo pending keywords to claim.');
      }
      break;
    }

    case 'update': {
      const id = args[1];
      if (!id || id.startsWith('--')) {
        console.error('❌ ID required: update ID --status=STATUS');
        process.exit(1);
      }

      const updates: Partial<KeywordEntry> = {};
      if (flags.status) updates.status = flags.status as KeywordStatus;
      if (flags.priority) updates.priority = parseInt(flags.priority);
      if (flags.topic) updates.topic = flags.topic;

      const entry = queue.update(id, updates);
      if (!entry) {
        console.error(`\n❌ Keyword not found: ${id}`);
        process.exit(1);
      }

      console.log(`\n✅ Updated: ${entry.keywords[0]}`);
      console.log(`   Status: ${entry.status}`);
      break;
    }

    case 'complete': {
      const id = args[1];
      if (!id) {
        console.error('❌ ID required: complete ID');
        process.exit(1);
      }

      const entry = queue.complete(id);
      if (entry) {
        console.log(`\n✅ Completed: ${entry.keywords[0]}`);
      } else {
        console.error(`\n❌ Keyword not found: ${id}`);
        process.exit(1);
      }
      break;
    }

    case 'stats': {
      const stats = queue.stats();
      console.log('\n📊 Queue Statistics');
      console.log('-'.repeat(30));
      console.log(`   Pending:     ${stats.pending}`);
      console.log(`   In Progress: ${stats.in_progress}`);
      console.log(`   Completed:   ${stats.completed}`);
      console.log(`   Failed:      ${stats.failed}`);
      console.log('-'.repeat(30));
      console.log(`   Total:       ${stats.total}`);
      break;
    }

    case 'urgent': {
      const days = flags.days ? parseInt(flags.days) : 7;
      const urgent = queue.getUrgent(days);
      if (urgent.length > 0) {
        console.log(`\n⚠️  ${urgent.length} seasonal keywords due within ${days} days:`);
        console.log(formatList(urgent));
      } else {
        console.log(`\n✅ No urgent seasonal keywords within ${days} days.`);
      }
      break;
    }

    case 'delete': {
      const id = args[1];
      if (!id) {
        console.error('❌ ID required: delete ID');
        process.exit(1);
      }

      if (queue.delete(id)) {
        console.log(`\n✅ Deleted: ${id}`);
      } else {
        console.error(`\n❌ Keyword not found: ${id}`);
        process.exit(1);
      }
      break;
    }

    default:
      console.error(`❌ Unknown command: ${command}`);
      process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export { KeywordQueue as default };
