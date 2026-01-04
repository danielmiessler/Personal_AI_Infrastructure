#!/usr/bin/env bun
// @ts-nocheck
/**
 * Bounds Checker
 * 
 * Analyzes source files to find unbounded loops, queues, and recursion.
 * All iterations should have explicit upper bounds.
 * 
 * Usage:
 *   bun bounds-checker.ts <file-or-directory>
 *   bun bounds-checker.ts src/ --format json
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

interface Issue {
  type: 'unbounded-loop' | 'unbounded-recursion' | 'unbounded-queue' | 'infinite-loop';
  file: string;
  line: number;
  code: string;
  suggestion: string;
}

interface AnalysisResult {
  file: string;
  issues: Issue[];
}

interface Options {
  format: 'text' | 'json';
  verbose: boolean;
}

// Patterns for potentially unbounded constructs
const UNBOUNDED_PATTERNS = [
  {
    type: 'unbounded-loop' as const,
    // while (condition) without MAX_ or limit check
    pattern: /while\s*\((?!.*(?:MAX_|LIMIT_|< \d|<= \d|iterations|count < |i < |idx < ))([^)]+)\)\s*{/g,
    suggestion: 'Add iteration bound: assert(iterations++ < MAX_ITERATIONS)',
  },
  {
    type: 'infinite-loop' as const,
    // while (true) or for (;;)
    pattern: /(?:while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\))\s*{/g,
    suggestion: 'Event loops should document they are intentionally infinite, or add break condition',
  },
  {
    type: 'unbounded-loop' as const,
    // for loop without bound in condition
    pattern: /for\s*\([^;]*;\s*(?!.*(?:< \d|<= \d|< MAX_|< LIMIT_|< items\.|< arr\.|\.length))[^;]*;[^)]*\)\s*{/g,
    suggestion: 'Add explicit upper bound to loop condition',
  },
  {
    type: 'unbounded-queue' as const,
    // .push() without size check
    pattern: /(?<!assert\([^)]*|if\s*\([^)]*\.length[^)]*\)\s*)(\w+)\.(push|enqueue|add)\s*\(/g,
    suggestion: 'Check queue size before push: assert(queue.length < MAX_QUEUE_SIZE)',
  },
];

// Patterns for recursion
const RECURSION_PATTERNS = [
  // Direct recursion: function calls itself
  /function\s+(\w+)\s*\([^)]*\)[^{]*{[^}]*\1\s*\(/,
];

// Patterns that indicate bounds ARE checked
const BOUND_INDICATORS = [
  /MAX_/,
  /LIMIT_/,
  /assert\s*\([^)]*(?:iterations|count|depth|i|idx|index)\s*</,
  /if\s*\([^)]*(?:iterations|count|depth|i|idx|index)\s*(?:>=?|>)\s*(?:MAX_|LIMIT_|\d)/,
  /throw.*(?:exceeded|limit|bound|max)/i,
];

function hasBoundCheck(code: string): boolean {
  return BOUND_INDICATORS.some(pattern => pattern.test(code));
}

function findIssues(code: string, file: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split('\n');
  
  // Check each pattern
  for (const { type, pattern, suggestion } of UNBOUNDED_PATTERNS) {
    const regex = new RegExp(pattern.source, 'gm');
    let match;
    
    while ((match = regex.exec(code)) !== null) {
      // Find line number
      const beforeMatch = code.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;
      
      // Get surrounding context (5 lines after match)
      const contextStart = Math.max(0, lineNumber - 1);
      const contextEnd = Math.min(lines.length, lineNumber + 5);
      const context = lines.slice(contextStart, contextEnd).join('\n');
      
      // Skip if bounds are checked in context
      if (hasBoundCheck(context)) {
        continue;
      }
      
      // Skip queue push if it's clearly bounded by preceding check
      if (type === 'unbounded-queue') {
        const precedingLines = lines.slice(Math.max(0, lineNumber - 3), lineNumber).join('\n');
        if (/(?:if|assert)\s*\([^)]*\.length\s*</.test(precedingLines)) {
          continue;
        }
      }
      
      issues.push({
        type,
        file,
        line: lineNumber,
        code: lines[lineNumber - 1]?.trim() || match[0],
        suggestion,
      });
    }
  }
  
  // Check for unbounded recursion
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for function definitions
    const funcMatch = line.match(/function\s+(\w+)\s*\(/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      
      // Find function body (simplified - assumes balanced braces)
      let braceDepth = 0;
      let funcBody = '';
      let started = false;
      
      for (let j = i; j < Math.min(i + 100, lines.length); j++) {
        const bodyLine = lines[j];
        funcBody += bodyLine + '\n';
        
        for (const char of bodyLine) {
          if (char === '{') {
            braceDepth++;
            started = true;
          }
          if (char === '}') braceDepth--;
        }
        
        if (started && braceDepth === 0) break;
      }
      
      // Check for recursive call
      const recursiveCallPattern = new RegExp(`\\b${funcName}\\s*\\(`, 'g');
      const callMatches = funcBody.match(recursiveCallPattern);
      
      // More than 1 match means it calls itself (first is definition)
      if (callMatches && callMatches.length > 1) {
        // Check for depth parameter or bound check
        const hasDepthParam = /\bdepth\b|\blevel\b|\bmax_?depth\b/i.test(funcBody);
        const hasBoundInRecursion = hasBoundCheck(funcBody);
        
        if (!hasDepthParam && !hasBoundInRecursion) {
          issues.push({
            type: 'unbounded-recursion',
            file,
            line: i + 1,
            code: line.trim(),
            suggestion: `Add depth parameter: ${funcName}(args, depth = 0) with assert(depth < MAX_DEPTH)`,
          });
        }
      }
    }
  }
  
  return issues;
}

function analyzeFile(filePath: string): AnalysisResult {
  const code = readFileSync(filePath, 'utf-8');
  const issues = findIssues(code, filePath);
  
  return { file: filePath, issues };
}

function analyzeDirectory(dirPath: string, extensions: string[]): AnalysisResult[] {
  const results: AnalysisResult[] = [];
  
  function walk(dir: string): void {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry)) {
          continue;
        }
        walk(fullPath);
      } else if (stat.isFile()) {
        const ext = extname(entry);
        if (extensions.includes(ext)) {
          const result = analyzeFile(fullPath);
          if (result.issues.length > 0) {
            results.push(result);
          }
        }
      }
    }
  }
  
  walk(dirPath);
  return results;
}

function formatText(results: AnalysisResult[], options: Options): string {
  const lines: string[] = [];
  let totalIssues = 0;
  
  const issuesByType = {
    'unbounded-loop': 0,
    'unbounded-recursion': 0,
    'unbounded-queue': 0,
    'infinite-loop': 0,
  };
  
  for (const result of results) {
    if (result.issues.length > 0) {
      lines.push(`\n📄 ${result.file}`);
      
      for (const issue of result.issues) {
        const emoji = {
          'unbounded-loop': '🔄',
          'unbounded-recursion': '♻️',
          'unbounded-queue': '📥',
          'infinite-loop': '♾️',
        }[issue.type];
        
        lines.push(`   ${emoji} Line ${issue.line}: ${issue.type}`);
        lines.push(`      Code: ${issue.code}`);
        lines.push(`      Fix: ${issue.suggestion}`);
        
        issuesByType[issue.type]++;
        totalIssues++;
      }
    }
  }
  
  // Summary header
  const header = [
    '🔍 Bounds Analysis',
    `   Files with issues: ${results.length}`,
    `   Total issues: ${totalIssues}`,
    '',
    '   By type:',
  ];
  
  for (const [type, count] of Object.entries(issuesByType)) {
    if (count > 0) {
      header.push(`     - ${type}: ${count}`);
    }
  }
  
  if (totalIssues === 0) {
    header.push('');
    header.push('✅ No unbounded constructs found');
  } else {
    lines.push('');
    lines.push(`⚠️  ${totalIssues} potentially unbounded construct(s) found`);
    lines.push('   Add explicit bounds to prevent runaway loops/recursion');
  }
  
  return [...header, ...lines].join('\n');
}

function formatJson(results: AnalysisResult[]): string {
  const allIssues = results.flatMap(r => r.issues);
  
  const summary = {
    filesWithIssues: results.length,
    totalIssues: allIssues.length,
    byType: {
      'unbounded-loop': allIssues.filter(i => i.type === 'unbounded-loop').length,
      'unbounded-recursion': allIssues.filter(i => i.type === 'unbounded-recursion').length,
      'unbounded-queue': allIssues.filter(i => i.type === 'unbounded-queue').length,
      'infinite-loop': allIssues.filter(i => i.type === 'infinite-loop').length,
    },
    issues: allIssues,
  };
  
  return JSON.stringify(summary, null, 2);
}

// Main
function main(): void {
  const args = process.argv.slice(2);
  
  const options: Options = {
    format: 'text',
    verbose: false,
  };
  
  let target = '';
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--format' && args[i + 1]) {
      options.format = args[++i] as 'text' | 'json';
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Bounds Checker

Usage:
  bun bounds-checker.ts <file-or-directory>
  
Options:
  --format <fmt> Output format: text, json (default: text)
  --verbose, -v  Verbose output
  --help, -h     Show this help

Checks for:
  - Unbounded while loops
  - Unbounded for loops  
  - Infinite loops (while(true), for(;;))
  - Unbounded recursion
  - Queue push without size check
      `);
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      target = arg;
    }
  }
  
  if (!target) {
    console.error('Error: No file or directory specified');
    console.error('Usage: bun bounds-checker.ts <file-or-directory>');
    process.exit(1);
  }
  
  const stat = statSync(target);
  let results: AnalysisResult[];
  
  if (stat.isDirectory()) {
    results = analyzeDirectory(target, ['.ts', '.js', '.tsx', '.jsx', '.mjs', '.cjs']);
  } else {
    const result = analyzeFile(target);
    results = result.issues.length > 0 ? [result] : [];
  }
  
  const output = options.format === 'json'
    ? formatJson(results)
    : formatText(results, options);
  
  console.log(output);
  
  // Exit with error if issues found
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  if (totalIssues > 0) {
    process.exit(1);
  }
}

main();
