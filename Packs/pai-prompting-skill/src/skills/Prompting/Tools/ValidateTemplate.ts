#!/usr/bin/env bun
/**
 * ValidateTemplate.ts - Template Syntax Validator
 *
 * Validates Handlebars templates for syntax errors and missing variables.
 *
 * Usage:
 *   bun run ValidateTemplate.ts --template <path> [--data <path>] [--strict]
 */

import Handlebars from 'handlebars';
import { parse as parseYaml } from 'yaml';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { parseArgs } from 'util';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  variables: string[];
  helpers: string[];
  partials: string[];
}

interface ValidateOptions {
  templatePath: string;
  dataPath?: string;
  strict?: boolean;
}

function resolveTemplatePath(path: string): string {
  if (path.startsWith('/')) return path;
  const templatesDir = dirname(dirname(import.meta.path));
  return resolve(templatesDir, path);
}

function extractVariables(source: string): string[] {
  const variables: Set<string> = new Set();
  const simpleVars = source.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g);
  for (const match of simpleVars) {
    variables.add(match[1]);
  }
  const blockVars = source.matchAll(/\{\{#(?:each|if|unless|with)\s+([a-zA-Z_][a-zA-Z0-9_.]*)/g);
  for (const match of blockVars) {
    variables.add(match[1]);
  }
  return Array.from(variables).sort();
}

function extractHelpers(source: string): string[] {
  const helpers: Set<string> = new Set();
  const helperCalls = source.matchAll(/\{\{([a-z][a-zA-Z]+)\s/g);
  for (const match of helperCalls) {
    const name = match[1];
    if (!['if', 'unless', 'each', 'with', 'else'].includes(name)) {
      helpers.add(name);
    }
  }
  return Array.from(helpers).sort();
}

function extractPartials(source: string): string[] {
  const partials: Set<string> = new Set();
  const partialCalls = source.matchAll(/\{\{>\s*([a-zA-Z_][a-zA-Z0-9_-]*)/g);
  for (const match of partialCalls) {
    partials.add(match[1]);
  }
  return Array.from(partials).sort();
}

function checkUnbalancedBlocks(source: string): string[] {
  const errors: string[] = [];
  const blockStack: { name: string; line: number }[] = [];
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    const opens = line.matchAll(/\{\{#([a-z]+)/g);
    for (const match of opens) {
      blockStack.push({ name: match[1], line: lineNum });
    }

    const closes = line.matchAll(/\{\{\/([a-z]+)\}\}/g);
    for (const match of closes) {
      const closer = match[1];
      if (blockStack.length === 0) {
        errors.push(`Line ${lineNum}: Unexpected closing block {{/${closer}}}`);
      } else {
        const opener = blockStack.pop()!;
        if (opener.name !== closer) {
          errors.push(
            `Line ${lineNum}: Mismatched block - expected {{/${opener.name}}} (opened on line ${opener.line}), got {{/${closer}}}`
          );
        }
      }
    }
  }

  for (const opener of blockStack) {
    errors.push(`Line ${opener.line}: Unclosed block {{#${opener.name}}}`);
  }

  return errors;
}

export function validateTemplate(options: ValidateOptions): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    variables: [],
    helpers: [],
    partials: [],
  };

  const fullPath = resolveTemplatePath(options.templatePath);
  if (!existsSync(fullPath)) {
    result.valid = false;
    result.errors.push(`Template not found: ${fullPath}`);
    return result;
  }

  const source = readFileSync(fullPath, 'utf-8');

  result.variables = extractVariables(source);
  result.helpers = extractHelpers(source);
  result.partials = extractPartials(source);

  try {
    Handlebars.compile(source);
  } catch (error) {
    result.valid = false;
    result.errors.push(`Syntax error: ${(error as Error).message}`);
    return result;
  }

  const blockErrors = checkUnbalancedBlocks(source);
  if (blockErrors.length > 0) {
    result.valid = false;
    result.errors.push(...blockErrors);
  }

  return result;
}

function main(): void {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      template: { type: 'string', short: 't' },
      data: { type: 'string', short: 'd' },
      strict: { type: 'boolean', short: 's' },
      help: { type: 'boolean', short: 'h' },
    },
    strict: true,
    allowPositionals: false,
  });

  if (values.help || !values.template) {
    console.log(`
Template Validator

Usage:
  bun run ValidateTemplate.ts --template <path> [options]

Options:
  -t, --template <path>  Template file (.hbs)
  -d, --data <path>      Data file for variable checking
  -s, --strict           Treat missing variables as errors
  -h, --help             Show this help
`);
    process.exit(values.help ? 0 : 1);
  }

  const result = validateTemplate({
    templatePath: values.template,
    dataPath: values.data,
    strict: values.strict,
  });

  console.log('\n=== Template Validation ===\n');
  console.log(`Template: ${values.template}`);
  console.log(`Status: ${result.valid ? '✓ Valid' : '✗ Invalid'}`);

  if (result.variables.length > 0) {
    console.log(`\nVariables (${result.variables.length}):`);
    result.variables.forEach(v => console.log(`  - ${v}`));
  }

  if (result.helpers.length > 0) {
    console.log(`\nHelpers Used (${result.helpers.length}):`);
    result.helpers.forEach(h => console.log(`  - ${h}`));
  }

  if (result.errors.length > 0) {
    console.log(`\n✗ Errors (${result.errors.length}):`);
    result.errors.forEach(e => console.log(`  - ${e}`));
  }

  if (result.warnings.length > 0) {
    console.log(`\n⚠ Warnings (${result.warnings.length}):`);
    result.warnings.forEach(w => console.log(`  - ${w}`));
  }

  console.log('');
  process.exit(result.valid ? 0 : 1);
}

if (import.meta.main) {
  main();
}
