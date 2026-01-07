#!/usr/bin/env bun
/**
 * Artifacts CLI Tool
 *
 * Usage:
 *   bun run artifacts.ts <repo> <run-id>
 *                        [--download <artifact-id>]
 *                        [--output <path>]
 *                        [--format table|json]
 */

import { getCICDProvider, type Artifact } from 'kai-cicd-core';
import { writeFile } from 'fs/promises';

function parseArgs(args: string[]): {
  repo?: string;
  runId?: string;
  download?: string;
  output?: string;
  format: 'table' | 'json';
} {
  const result: ReturnType<typeof parseArgs> = { format: 'table' };
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg.startsWith('--')) {
      switch (arg) {
        case '--download':
          result.download = next;
          i++;
          break;
        case '--output':
          result.output = next;
          i++;
          break;
        case '--format':
          result.format = next as 'table' | 'json';
          i++;
          break;
      }
    } else {
      positional.push(arg);
    }
  }

  result.repo = positional[0];
  result.runId = positional[1];

  return result;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatTable(artifacts: Artifact[]): string {
  if (artifacts.length === 0) {
    return 'No artifacts found.';
  }

  const lines = ['ID\t\t\tSize\t\tName'];
  lines.push('-'.repeat(70));

  for (const artifact of artifacts) {
    const id = artifact.id.slice(0, 16).padEnd(16);
    const size = formatSize(artifact.sizeBytes).padEnd(10);
    const name = artifact.name.slice(0, 40);
    lines.push(`${id}\t${size}\t${name}`);
  }

  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.repo || !args.runId) {
    console.error('Usage: bun run artifacts.ts <repo> <run-id> [options]');
    console.error('');
    console.error('Options:');
    console.error('  --download <id>     Download specific artifact');
    console.error('  --output <path>     Output path for download (default: artifact name)');
    console.error('  --format <fmt>      Output format (table, json)');
    console.error('');
    console.error('Examples:');
    console.error('  bun run artifacts.ts owner/repo 12345');
    console.error('  bun run artifacts.ts owner/repo 12345 --download artifact-id');
    console.error('  bun run artifacts.ts owner/repo 12345 --download artifact-id --output ./build.zip');
    process.exit(1);
  }

  try {
    const provider = await getCICDProvider();

    if (args.download) {
      // Download specific artifact
      const data = await provider.downloadArtifact(args.repo, args.download);

      // Get artifact info for default filename
      const artifacts = await provider.listArtifacts(args.repo, args.runId);
      const artifact = artifacts.find(a => a.id === args.download);
      const filename = args.output || artifact?.name || `artifact-${args.download}.zip`;

      await writeFile(filename, data);
      console.log(`Downloaded artifact to: ${filename} (${formatSize(data.length)})`);
    } else {
      // List artifacts
      const artifacts = await provider.listArtifacts(args.repo, args.runId);

      if (args.format === 'json') {
        console.log(JSON.stringify(artifacts, null, 2));
      } else {
        console.log(formatTable(artifacts));
      }
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
