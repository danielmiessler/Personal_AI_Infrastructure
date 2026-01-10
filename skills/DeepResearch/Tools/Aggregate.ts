#!/usr/bin/env bun
/**
 * Aggregate.ts - Combine parallel research outputs into unified report
 *
 * Usage:
 *   bun run $PAI_DIR/skills/DeepResearch/Tools/Aggregate.ts --since "1h"
 *   bun run $PAI_DIR/skills/DeepResearch/Tools/Aggregate.ts --since "30m" --output report.md
 */

import { readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.claude');

interface ResearchOutput {
  filepath: string;
  timestamp: string;
  executor: string;
  agentCompletion: string;
  content: string;
}

function showHelp(): void {
  console.log(`
DeepResearch Aggregate - Combine parallel research outputs into unified report

Usage:
  bun run $PAI_DIR/skills/DeepResearch/Tools/Aggregate.ts [options]

Options:
  --since <time>     Only include files newer than (e.g., "30m", "1h", "2h")
                     Default: "1h"
  --output <file>    Write report to file (default: stdout)
  --help             Show this help

Examples:
  bun run Aggregate.ts --since "1h"
  bun run Aggregate.ts --since "30m" --output /tmp/research-report.md
`);
}

function parseArgs(): { since: string; output: string | null; help: boolean } {
  const args = Bun.argv.slice(2);
  const result = { since: '1h', output: null as string | null, help: false };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--since': result.since = args[++i] || '1h'; break;
      case '--output': result.output = args[++i] || null; break;
      case '--help': case '-h': result.help = true; break;
    }
  }
  return result;
}

function parseSince(since: string): number {
  const match = since.match(/^(\d+)(m|h|d)$/);
  if (!match) {
    console.error(`Invalid --since format: "${since}". Use e.g., "30m", "1h"`);
    process.exit(1);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const now = Date.now();
  switch (unit) {
    case 'm': return now - value * 60 * 1000;
    case 'h': return now - value * 60 * 60 * 1000;
    case 'd': return now - value * 24 * 60 * 60 * 1000;
    default: return now - 60 * 60 * 1000;
  }
}

function getResearchDir(): string {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return join(PAI_DIR, 'history', 'research', yearMonth);
}

function parseYAMLFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return result;
}

function extractAgentOutput(content: string): string {
  const match = content.match(/## Agent Output\n\n([\s\S]*?)(?=\n---|\n## |$)/);
  if (match) return match[1].trim();
  return content.replace(/^---\n[\s\S]*?\n---\n\n/, '').trim();
}

async function findResearchFiles(sinceTimestamp: number): Promise<ResearchOutput[]> {
  const researchDir = getResearchDir();
  if (!existsSync(researchDir)) return [];

  const files = readdirSync(researchDir)
    .filter(f => f.endsWith('.md') && (f.includes('RESEARCH') || f.includes('researcher')))
    .map(f => join(researchDir, f))
    .filter(f => statSync(f).mtime.getTime() >= sinceTimestamp)
    .sort((a, b) => statSync(a).mtime.getTime() - statSync(b).mtime.getTime());

  const outputs: ResearchOutput[] = [];
  for (const filepath of files) {
    try {
      const content = await Bun.file(filepath).text();
      const fm = parseYAMLFrontmatter(content);
      outputs.push({
        filepath,
        timestamp: fm.timestamp || 'unknown',
        executor: fm.executor || 'unknown',
        agentCompletion: fm.agent_completion || '',
        content: extractAgentOutput(content),
      });
    } catch {}
  }
  return outputs;
}

function generateReport(outputs: ResearchOutput[]): string {
  if (outputs.length === 0) {
    return '# Deep Research Report\n\nNo research outputs found in the specified time window.\n';
  }

  const lines: string[] = [
    '# Deep Research Report',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    `**Sources:** ${outputs.length} research outputs`,
    '', '---', '',
    '## Executive Summary', ''
  ];

  for (const o of outputs) {
    const lens = o.executor.replace('researcher-', '').replace('AGENT-', '');
    if (o.agentCompletion) lines.push(`- **${lens}:** ${o.agentCompletion}`);
  }

  lines.push('', '---', '', '## Detailed Findings', '');

  const grouped = new Map<string, ResearchOutput[]>();
  for (const o of outputs) {
    if (!grouped.has(o.executor)) grouped.set(o.executor, []);
    grouped.get(o.executor)!.push(o);
  }

  for (const [executor, items] of grouped) {
    const lens = executor.replace('researcher-', '').replace('AGENT-', '');
    lines.push(`### ${lens.charAt(0).toUpperCase() + lens.slice(1)} Perspective`, '');
    for (const item of items) lines.push(item.content, '');
  }

  lines.push('---', '', '*Generated by DeepResearch Aggregate tool*');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const args = parseArgs();
  if (args.help) { showHelp(); process.exit(0); }

  const outputs = await findResearchFiles(parseSince(args.since));
  const report = generateReport(outputs);

  if (args.output) {
    await Bun.write(args.output, report);
    console.log(`Report written to: ${args.output}`);
  } else {
    console.log(report);
  }
}

main().catch(console.error);
