#!/usr/bin/env bun
/**
 * Query metrics from the configured observability provider
 */

import { getObservabilityProvider, type QueryResult } from 'mai-observability-core';

function parseArgs() {
  const args = process.argv.slice(2);
  const options: {
    query?: string;
    time?: Date;
    start?: Date;
    end?: Date;
    step?: number;
    format: 'table' | 'json';
  } = { format: 'table' };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--time') {
      options.time = new Date(args[++i]);
    } else if (arg === '--start') {
      options.start = parseDuration(args[++i]);
    } else if (arg === '--end') {
      options.end = parseDuration(args[++i]);
    } else if (arg === '--step') {
      options.step = parseInt(args[++i], 10);
    } else if (arg === '--format') {
      options.format = args[++i] as 'table' | 'json';
    } else if (!arg.startsWith('-')) {
      options.query = arg;
    }
  }

  return options;
}

function parseDuration(duration: string): Date {
  const now = Date.now();
  const match = duration.match(/^(\d+)(h|m|s|d)$/);
  if (match) {
    const [, num, unit] = match;
    const ms = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    }[unit] || 1000;
    return new Date(now - parseInt(num, 10) * ms);
  }
  return new Date(duration);
}

function formatResult(result: QueryResult, format: 'table' | 'json') {
  if (format === 'json') {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.resultType === 'vector' && result.samples) {
    console.log('METRIC\t\t\t\tVALUE\t\tTIMESTAMP');
    console.log('-'.repeat(70));
    for (const sample of result.samples) {
      const labels = Object.entries(sample.metric)
        .map(([k, v]) => `${k}="${v}"`)
        .join(', ');
      console.log(`{${labels.substring(0, 30)}}\t${sample.value}\t\t${sample.timestamp.toISOString()}`);
    }
  } else if (result.resultType === 'matrix' && result.series) {
    for (const series of result.series) {
      const labels = Object.entries(series.metric)
        .map(([k, v]) => `${k}="${v}"`)
        .join(', ');
      console.log(`\n{${labels}}`);
      console.log('TIMESTAMP\t\t\tVALUE');
      console.log('-'.repeat(40));
      for (const v of series.values) {
        console.log(`${v.timestamp.toISOString()}\t${v.value}`);
      }
    }
  } else if (result.resultType === 'scalar') {
    console.log(`Scalar: ${result.scalarValue}`);
  } else if (result.resultType === 'string') {
    console.log(`String: ${result.stringValue}`);
  }
}

async function main() {
  const options = parseArgs();

  if (!options.query) {
    console.error('Usage: bun run Tools/query.ts <query> [--start <duration>] [--step <seconds>] [--format table|json]');
    process.exit(1);
  }

  try {
    const provider = await getObservabilityProvider();

    let result: QueryResult;
    if (options.start && options.step) {
      // Range query
      result = await provider.rangeQuery(options.query, {
        start: options.start,
        end: options.end ?? new Date(),
        step: options.step,
      });
    } else {
      // Instant query
      result = await provider.instantQuery(options.query, {
        time: options.time,
      });
    }

    formatResult(result, options.format);
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

main();
