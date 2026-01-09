#!/usr/bin/env bun
/**
 * ContentCalendar - Manage content planning and scheduling across multiple sites
 *
 * Migrated from PAIv1 ContentPublishing skill with enhancements:
 * - Multi-site support
 * - Keyword queue integration
 * - Better type exports for programmatic use
 *
 * Usage (CLI):
 *   bun run calendar.ts list [--site=SITE] [--month=YYYY-MM]
 *   bun run calendar.ts add "Title" --site=SITE --date=YYYY-MM-DD [--keyword-id=ID]
 *   bun run calendar.ts update ID --status=STATUS
 *   bun run calendar.ts init --site=SITE
 *
 * Usage (Module):
 *   import { Calendar } from './calendar';
 *   const calendar = new Calendar('/path/to/site');
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { CalendarEntry, CalendarStatus } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface CalendarData {
  site: string;
  entries: CalendarEntry[];
  lastUpdated: string;
}

export interface AddEntryParams {
  title: string;
  scheduledDate: string;
  site: string;
  keywordId?: string;
  status?: CalendarStatus;
  articlePath?: string;
}

export interface ListParams {
  site?: string;
  month?: string;
  status?: CalendarStatus;
}

// ============================================================================
// Calendar Class
// ============================================================================

export class Calendar {
  private calendarPath: string;
  private site: string;

  constructor(sitePath: string, site: string) {
    this.site = site;
    this.calendarPath = join(sitePath, 'content-calendar.json');
  }

  /**
   * Load calendar data from file
   */
  load(): CalendarData {
    if (!existsSync(this.calendarPath)) {
      return {
        site: this.site,
        entries: [],
        lastUpdated: new Date().toISOString()
      };
    }

    return JSON.parse(readFileSync(this.calendarPath, 'utf-8'));
  }

  /**
   * Save calendar data to file
   */
  save(data: CalendarData): void {
    const dir = dirname(this.calendarPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    data.lastUpdated = new Date().toISOString();
    writeFileSync(this.calendarPath, JSON.stringify(data, null, 2));
  }

  /**
   * Generate unique entry ID
   */
  private generateId(): string {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 6);
    return `cal-${date}-${rand}`;
  }

  /**
   * Add a new calendar entry
   */
  add(params: AddEntryParams): CalendarEntry {
    const data = this.load();

    const entry: CalendarEntry = {
      id: this.generateId(),
      title: params.title,
      scheduledDate: params.scheduledDate,
      status: params.status || 'draft',
      site: params.site,
      keywordId: params.keywordId,
      articlePath: params.articlePath
    };

    data.entries.push(entry);
    this.save(data);

    return entry;
  }

  /**
   * Update an existing entry
   */
  update(id: string, updates: Partial<CalendarEntry>): CalendarEntry | null {
    const data = this.load();
    const entry = data.entries.find(e => e.id === id);

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
  get(id: string): CalendarEntry | null {
    const data = this.load();
    return data.entries.find(e => e.id === id) || null;
  }

  /**
   * List entries with optional filters
   */
  list(params: ListParams = {}): CalendarEntry[] {
    const data = this.load();
    let entries = data.entries;

    if (params.site) {
      entries = entries.filter(e => e.site === params.site);
    }

    if (params.month) {
      entries = entries.filter(e => e.scheduledDate.startsWith(params.month!));
    }

    if (params.status) {
      entries = entries.filter(e => e.status === params.status);
    }

    // Sort by scheduled date
    return entries.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  }

  /**
   * Get entries scheduled for today
   */
  getToday(): CalendarEntry[] {
    const today = new Date().toISOString().split('T')[0];
    return this.list({ month: today.substring(0, 7) }).filter(
      e => e.scheduledDate === today && e.status === 'scheduled'
    );
  }

  /**
   * Get next N scheduled entries
   */
  getUpcoming(limit: number = 5): CalendarEntry[] {
    const today = new Date().toISOString().split('T')[0];
    return this.list({ status: 'scheduled' })
      .filter(e => e.scheduledDate >= today)
      .slice(0, limit);
  }

  /**
   * Delete an entry
   */
  delete(id: string): boolean {
    const data = this.load();
    const index = data.entries.findIndex(e => e.id === id);

    if (index === -1) {
      return false;
    }

    data.entries.splice(index, 1);
    this.save(data);

    return true;
  }

  /**
   * Initialize calendar with sample entry
   */
  init(): void {
    if (existsSync(this.calendarPath)) {
      throw new Error('Calendar already exists');
    }

    const template: CalendarData = {
      site: this.site,
      entries: [
        {
          id: 'cal-example-001',
          title: 'Example: Getting Started Article',
          scheduledDate: new Date().toISOString().split('T')[0],
          status: 'draft',
          site: this.site
        }
      ],
      lastUpdated: new Date().toISOString()
    };

    this.save(template);
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

function formatList(entries: CalendarEntry[]): string {
  if (entries.length === 0) {
    return '\nNo calendar entries found.\n';
  }

  let output = '\n' + '='.repeat(80) + '\n';
  output += 'CONTENT CALENDAR\n';
  output += '='.repeat(80) + '\n\n';

  // Group by status
  const byStatus = {
    draft: entries.filter(e => e.status === 'draft'),
    scheduled: entries.filter(e => e.status === 'scheduled'),
    published: entries.filter(e => e.status === 'published'),
    failed: entries.filter(e => e.status === 'failed')
  };

  const icons: Record<CalendarStatus, string> = {
    draft: '📝',
    scheduled: '📅',
    published: '✅',
    failed: '❌'
  };

  for (const [status, statusEntries] of Object.entries(byStatus)) {
    if (statusEntries.length === 0) continue;

    output += `${icons[status as CalendarStatus]} ${status.toUpperCase()} (${statusEntries.length})\n`;
    output += '-'.repeat(40) + '\n';

    for (const entry of statusEntries) {
      output += `  ${entry.scheduledDate} | ${entry.title}\n`;
      output += `           ID: ${entry.id} | Site: ${entry.site}\n`;
      if (entry.keywordId) {
        output += `           Keyword: ${entry.keywordId}\n`;
      }
      output += '\n';
    }
  }

  output += `Total: ${entries.length} entries\n`;
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
Content Calendar - Manage content planning across multiple sites

Usage:
  bun run calendar.ts list [--site=SITE] [--month=YYYY-MM]
  bun run calendar.ts add "Title" --site=SITE --date=YYYY-MM-DD [--keyword-id=ID]
  bun run calendar.ts update ID --status=STATUS
  bun run calendar.ts init --site=SITE

Examples:
  bun run calendar.ts init --site=pispy
  bun run calendar.ts list --site=pispy
  bun run calendar.ts add "Best Outdoor Cameras 2026" --site=pispy --date=2026-01-15
  bun run calendar.ts update cal-20260109-abc1 --status=published
`);
    process.exit(0);
  }

  // Default site path (can be overridden)
  const sitePath = flags.path || process.cwd();
  const site = flags.site || 'default';

  const calendar = new Calendar(sitePath, site);

  switch (command) {
    case 'init': {
      try {
        calendar.init();
        console.log(`\n✅ Created content-calendar.json for site: ${site}`);
      } catch (e) {
        console.error(`\n⚠️  ${(e as Error).message}`);
        process.exit(1);
      }
      break;
    }

    case 'list': {
      const entries = calendar.list({
        site: flags.site,
        month: flags.month,
        status: flags.status as CalendarStatus
      });
      console.log(formatList(entries));
      break;
    }

    case 'add': {
      const title = args[1];
      if (!title || title.startsWith('--')) {
        console.error('❌ Title required: add "Title" --site=SITE --date=YYYY-MM-DD');
        process.exit(1);
      }

      if (!flags.site) {
        console.error('❌ Site required: --site=SITE');
        process.exit(1);
      }

      const date = flags.date || new Date().toISOString().split('T')[0];
      const entry = calendar.add({
        title,
        scheduledDate: date,
        site: flags.site,
        keywordId: flags['keyword-id'],
        status: (flags.status as CalendarStatus) || 'draft'
      });

      console.log(`\n✅ Added: ${entry.title}`);
      console.log(`   ID: ${entry.id}`);
      console.log(`   Date: ${entry.scheduledDate}`);
      console.log(`   Site: ${entry.site}`);
      break;
    }

    case 'update': {
      const id = args[1];
      if (!id || id.startsWith('--')) {
        console.error('❌ ID required: update ID --status=STATUS');
        process.exit(1);
      }

      const updates: Partial<CalendarEntry> = {};
      if (flags.status) updates.status = flags.status as CalendarStatus;
      if (flags.title) updates.title = flags.title;
      if (flags.date) updates.scheduledDate = flags.date;
      if (flags['article-path']) updates.articlePath = flags['article-path'];

      const entry = calendar.update(id, updates);
      if (!entry) {
        console.error(`\n❌ Entry not found: ${id}`);
        process.exit(1);
      }

      console.log(`\n✅ Updated: ${entry.title}`);
      console.log(`   Status: ${entry.status}`);
      break;
    }

    case 'delete': {
      const id = args[1];
      if (!id) {
        console.error('❌ ID required: delete ID');
        process.exit(1);
      }

      if (calendar.delete(id)) {
        console.log(`\n✅ Deleted: ${id}`);
      } else {
        console.error(`\n❌ Entry not found: ${id}`);
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

// Export for module use
export { Calendar as default };
