#!/usr/bin/env bun
// @ts-nocheck
/**
 * Assertion Density Analyzer
 * 
 * Analyzes source files to check assertion density per function.
 * Target: minimum 2 assertions per function.
 * 
 * Usage:
 *   bun assertion-density.ts <file-or-directory>
 *   bun assertion-density.ts --stdin < file.ts
 *   bun assertion-density.ts src/ --min 2 --format json
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

interface FunctionInfo {
  name: string;
  line: number;
  assertions: number;
  file: string;
}

interface AnalysisResult {
  file: string;
  functions: FunctionInfo[];
  totalFunctions: number;
  totalAssertions: number;
  passingFunctions: number;
  failingFunctions: number;
  averageDensity: number;
}

interface Options {
  minAssertions: number;
  format: 'text' | 'json';
  verbose: boolean;
}

// Patterns that count as assertions
const ASSERTION_PATTERNS = [
  /\bassert\s*\(/g,
  /\bassertEquals?\s*\(/g,
  /\bassertThat\s*\(/g,
  /\bassertTrue\s*\(/g,
  /\bassertFalse\s*\(/g,
  /\bassertNull\s*\(/g,
  /\bassertNotNull\s*\(/g,
  /\bassertDefined\s*\(/g,
  /\bassertNever\s*\(/g,
  /\bassertThrows?\s*\(/g,
  /\bexpect\s*\([^)]+\)\s*\.\s*(toBe|toEqual|toThrow|toMatch|toContain|toBeDefined|toBeNull|toBeTruthy|toBeFalsy)/g,
  /\bconsole\.assert\s*\(/g,
  /\binvariant\s*\(/g,
  /\bprecondition\s*\(/g,
  /\bpostcondition\s*\(/g,
  /\brequire\s*\([^,]+,/g,  // Solidity-style require(condition, message)
  /\bensure\s*\(/g,
  /\bverify\s*\(/g,
  /\bcheck\s*\(/g,
  /\bdebug_assert\s*!/g,   // Rust
  /\bassert!\s*\(/g,        // Rust
  /\bassert_eq!\s*\(/g,     // Rust
];

// Function definition patterns
const FUNCTION_PATTERNS = [
  // TypeScript/JavaScript
  /(?:async\s+)?function\s+(\w+)\s*\(/g,
  /(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*{/g,
  /(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)/g,
  /(\w+)\s*:\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)/g,
  // Method definitions
  /(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/g,
  // Arrow functions assigned to const/let/var
  /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,
];

function countAssertions(code: string): number {
  let count = 0;
  for (const pattern of ASSERTION_PATTERNS) {
    const matches = code.match(new RegExp(pattern.source, 'g'));
    if (matches) {
      count += matches.length;
    }
  }
  return count;
}

function extractFunctions(code: string, file: string): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  const lines = code.split('\n');
  
  let currentFunction: { name: string; startLine: number; braceDepth: number; code: string } | null = null;
  let braceDepth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    
    // Check for function start
    if (currentFunction === null) {
      for (const pattern of FUNCTION_PATTERNS) {
        const regex = new RegExp(pattern.source);
        const match = line.match(regex);
        if (match && match[1]) {
          // Skip common non-function matches
          const name = match[1];
          if (['if', 'for', 'while', 'switch', 'catch', 'with'].includes(name)) continue;
          if (name.startsWith('_')) continue; // Skip private/internal
          
          currentFunction = {
            name,
            startLine: lineNumber,
            braceDepth: 0,
            code: '',
          };
          break;
        }
      }
    }
    
    // Track braces
    if (currentFunction !== null) {
      currentFunction.code += line + '\n';
      
      for (const char of line) {
        if (char === '{') currentFunction.braceDepth++;
        if (char === '}') currentFunction.braceDepth--;
      }
      
      // Function ended
      if (currentFunction.braceDepth <= 0 && currentFunction.code.includes('{')) {
        const assertions = countAssertions(currentFunction.code);
        functions.push({
          name: currentFunction.name,
          line: currentFunction.startLine,
          assertions,
          file,
        });
        currentFunction = null;
      }
    }
  }
  
  return functions;
}

function analyzeFile(filePath: string): AnalysisResult {
  const code = readFileSync(filePath, 'utf-8');
  const functions = extractFunctions(code, filePath);
  
  const totalAssertions = functions.reduce((sum, f) => sum + f.assertions, 0);
  const passingFunctions = functions.filter(f => f.assertions >= 2).length;
  
  return {
    file: filePath,
    functions,
    totalFunctions: functions.length,
    totalAssertions,
    passingFunctions,
    failingFunctions: functions.length - passingFunctions,
    averageDensity: functions.length > 0 ? totalAssertions / functions.length : 0,
  };
}

function analyzeDirectory(dirPath: string, extensions: string[]): AnalysisResult[] {
  const results: AnalysisResult[] = [];
  
  function walk(dir: string): void {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip common non-source directories
        if (['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry)) {
          continue;
        }
        walk(fullPath);
      } else if (stat.isFile()) {
        const ext = extname(entry);
        if (extensions.includes(ext)) {
          results.push(analyzeFile(fullPath));
        }
      }
    }
  }
  
  walk(dirPath);
  return results;
}

function formatText(results: AnalysisResult[], options: Options): string {
  const lines: string[] = [];
  let totalFunctions = 0;
  let totalPassing = 0;
  let totalFailing = 0;
  
  for (const result of results) {
    if (result.failingFunctions > 0 || options.verbose) {
      lines.push(`\n📄 ${result.file}`);
      lines.push(`   Functions: ${result.totalFunctions}, Assertions: ${result.totalAssertions}, Avg: ${result.averageDensity.toFixed(1)}`);
      
      for (const fn of result.functions) {
        const status = fn.assertions >= options.minAssertions ? '✅' : '❌';
        const level = fn.assertions >= options.minAssertions ? '' : ' ⚠️  BELOW MINIMUM';
        
        if (fn.assertions < options.minAssertions || options.verbose) {
          lines.push(`   ${status} ${fn.name} (line ${fn.line}): ${fn.assertions} assertions${level}`);
        }
      }
    }
    
    totalFunctions += result.totalFunctions;
    totalPassing += result.passingFunctions;
    totalFailing += result.failingFunctions;
  }
  
  lines.unshift('');
  lines.unshift(`   Failing: ${totalFailing} (${((totalFailing / totalFunctions) * 100).toFixed(1)}%)`);
  lines.unshift(`   Passing: ${totalPassing} (${((totalPassing / totalFunctions) * 100).toFixed(1)}%)`);
  lines.unshift(`   Total functions: ${totalFunctions}`);
  lines.unshift(`   Files analyzed: ${results.length}`);
  lines.unshift(`   Minimum required: ${options.minAssertions} assertions per function`);
  lines.unshift('📊 Assertion Density Analysis');
  
  if (totalFailing > 0) {
    lines.push('');
    lines.push(`⚠️  ${totalFailing} function(s) below minimum assertion density`);
    lines.push('   Run with --verbose to see all functions');
  } else {
    lines.push('');
    lines.push('✅ All functions meet minimum assertion density');
  }
  
  return lines.join('\n');
}

function formatJson(results: AnalysisResult[], options: Options): string {
  const summary = {
    minRequired: options.minAssertions,
    filesAnalyzed: results.length,
    totalFunctions: results.reduce((sum, r) => sum + r.totalFunctions, 0),
    totalAssertions: results.reduce((sum, r) => sum + r.totalAssertions, 0),
    passingFunctions: results.reduce((sum, r) => sum + r.passingFunctions, 0),
    failingFunctions: results.reduce((sum, r) => sum + r.failingFunctions, 0),
    files: results,
  };
  
  return JSON.stringify(summary, null, 2);
}

// Main
function main(): void {
  const args = process.argv.slice(2);
  
  const options: Options = {
    minAssertions: 2,
    format: 'text',
    verbose: false,
  };
  
  let target = '';
  let useStdin = false;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--min' && args[i + 1]) {
      options.minAssertions = parseInt(args[++i], 10);
    } else if (arg === '--format' && args[i + 1]) {
      options.format = args[++i] as 'text' | 'json';
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--stdin') {
      useStdin = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Assertion Density Analyzer

Usage:
  bun assertion-density.ts <file-or-directory>
  bun assertion-density.ts --stdin < file.ts
  
Options:
  --min <n>      Minimum assertions per function (default: 2)
  --format <fmt> Output format: text, json (default: text)
  --verbose, -v  Show all functions, not just failing
  --stdin        Read from stdin
  --help, -h     Show this help
      `);
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      target = arg;
    }
  }
  
  let results: AnalysisResult[] = [];
  
  if (useStdin) {
    const code = readFileSync(0, 'utf-8'); // fd 0 = stdin
    const functions = extractFunctions(code, 'stdin');
    const totalAssertions = functions.reduce((sum, f) => sum + f.assertions, 0);
    const passingFunctions = functions.filter(f => f.assertions >= options.minAssertions).length;
    
    results = [{
      file: 'stdin',
      functions,
      totalFunctions: functions.length,
      totalAssertions,
      passingFunctions,
      failingFunctions: functions.length - passingFunctions,
      averageDensity: functions.length > 0 ? totalAssertions / functions.length : 0,
    }];
  } else if (!target) {
    console.error('Error: No file or directory specified');
    console.error('Usage: bun assertion-density.ts <file-or-directory>');
    process.exit(1);
  } else {
    const stat = statSync(target);
    
    if (stat.isDirectory()) {
      results = analyzeDirectory(target, ['.ts', '.js', '.tsx', '.jsx', '.mjs', '.cjs']);
    } else {
      results = [analyzeFile(target)];
    }
  }
  
  const output = options.format === 'json' 
    ? formatJson(results, options)
    : formatText(results, options);
  
  console.log(output);
  
  // Exit with error if any functions fail
  const totalFailing = results.reduce((sum, r) => sum + r.failingFunctions, 0);
  if (totalFailing > 0) {
    process.exit(1);
  }
}

main();
