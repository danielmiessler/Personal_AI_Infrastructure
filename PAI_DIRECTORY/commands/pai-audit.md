#!/usr/bin/env bun
/**
 * # PAI System Audit
 *
 * ## Purpose
 * Performs a comprehensive audit of all PAI commands across multiple directories.
 * Scans for structural issues, duplicates, missing files, and generates a full system report.
 *
 * ## Usage
 * ```bash
 * # Full system audit
 * bun ${PAI_DIR}/commands/pai-audit.md
 * 
 * # Audit with detailed output
 * bun ${PAI_DIR}/commands/pai-audit.md --verbose
 * 
 * # Audit specific directory
 * bun ${PAI_DIR}/commands/pai-audit.md --dir /path/to/commands
 * 
 * # Generate JSON report
 * bun ${PAI_DIR}/commands/pai-audit.md --json > audit-report.json
 * ```
 *
 * ## Audit Scope
 * - `${PAI_DIR}/commands/` - Main PAI commands
 * - `~/.config/ai/commands/` - User commands (if exists)
 * - Validates structure, detects duplicates, checks patterns
 * - Reports on command distribution and health
 */

import { readdirSync, statSync, existsSync } from 'fs';
import { join, basename, dirname } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';

interface AuditResult {
  directories: DirectoryAudit[];
  summary: AuditSummary;
  duplicates: DuplicateReport[];
  issues: SystemIssue[];
  timestamp: string;
}

interface DirectoryAudit {
  path: string;
  exists: boolean;
  commandCount: number;
  commands: CommandAudit[];
}

interface CommandAudit {
  name: string;
  path: string;
  type: 'Instructional' | 'Executable' | 'Hybrid' | 'Unknown';
  status: '✅ Correct' | '⚠️ Warning' | '❌ Broken';
  issues: string[];
  size: number;
  lastModified: Date;
}

interface AuditSummary {
  totalCommands: number;
  correctCommands: number;
  warningCommands: number;
  brokenCommands: number;
  duplicateCommands: number;
  totalDirectories: number;
  healthScore: number;
}

interface DuplicateReport {
  commandName: string;
  locations: string[];
}

interface SystemIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  location?: string;
}

function getCommandDirectories(): string[] {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.claude');
  const userDir = join(homedir(), '.config', 'ai', 'commands');
  
  return [
    join(paiDir, 'commands'),
    userDir
  ];
}

function auditDirectory(dirPath: string): DirectoryAudit {
  const audit: DirectoryAudit = {
    path: dirPath,
    exists: existsSync(dirPath),
    commandCount: 0,
    commands: []
  };

  if (!audit.exists) {
    return audit;
  }

  try {
    const files = readdirSync(dirPath);
    const commandFiles = files.filter(file => 
      file.endsWith('.md') || file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.sh')
    );

    audit.commandCount = commandFiles.length;

    for (const file of commandFiles) {
      const filePath = join(dirPath, file);
      const commandAudit = auditCommand(filePath);
      audit.commands.push(commandAudit);
    }
  } catch (error) {
    // Directory exists but can't read it
    audit.commandCount = -1;
  }

  return audit;
}

function auditCommand(filePath: string): CommandAudit {
  let audit: CommandAudit = {
    name: basename(filePath),
    path: filePath,
    type: 'Unknown',
    status: '❌ Broken',
    issues: [],
    size: 0,
    lastModified: new Date()
  };

  try {
    const stats = statSync(filePath);
    audit.size = stats.size;
    audit.lastModified = stats.mtime;

    // Use pai-diagnostics to analyze the command
    const diagnosticsPath = join(dirname(filePath), 'pai-diagnostics.md');
    if (existsSync(diagnosticsPath)) {
      try {
        const result = execSync(`bun ${diagnosticsPath} ${filePath}`, {
          encoding: 'utf-8',
          timeout: 5000
        });

        // Parse the diagnostic output (simplified)
        if (result.includes('✅ Correct')) {
          audit.status = '✅ Correct';
          audit.type = result.includes('Hybrid') ? 'Hybrid' :
                      result.includes('Executable') ? 'Executable' : 'Instructional';
        } else if (result.includes('⚠️ Warning')) {
          audit.status = '⚠️ Warning';
          audit.type = 'Executable';
        }
      } catch (error) {
        // Diagnostics failed, do basic analysis
        audit.issues.push('Diagnostics failed - doing basic analysis');
        audit = basicCommandAnalysis(filePath, audit);
      }
    } else {
      // No diagnostics available, do basic analysis
      audit = basicCommandAnalysis(filePath, audit);
    }

  } catch (error) {
    audit.issues.push(`Error accessing file: ${error.message}`);
  }

  return audit;
}

function basicCommandAnalysis(filePath: string, audit: CommandAudit): CommandAudit {
  try {
    const content = require('fs').readFileSync(filePath, 'utf-8');
    const firstLine = content.split('\n')[0] || '';

    if (firstLine.startsWith('#!')) {
      audit.type = 'Executable';
      if (content.includes('/**') && content.includes('*/')) {
        audit.type = 'Hybrid';
        audit.status = '✅ Correct';
      } else {
        audit.status = '⚠️ Warning';
        audit.issues.push('Missing JSDoc documentation');
      }
    } else {
      audit.type = 'Instructional';
      audit.status = '✅ Correct';
    }
  } catch (error) {
    audit.issues.push(`Basic analysis failed: ${error.message}`);
  }

  return audit;
}

function findDuplicates(directories: DirectoryAudit[]): DuplicateReport[] {
  const commandMap = new Map<string, string[]>();
  const duplicates: DuplicateReport[] = [];

  for (const dir of directories) {
    for (const cmd of dir.commands) {
      const baseName = cmd.name.replace(/\.(md|ts|js|sh)$/, '');
      if (!commandMap.has(baseName)) {
        commandMap.set(baseName, []);
      }
      commandMap.get(baseName)!.push(cmd.path);
    }
  }

  for (const [name, locations] of commandMap) {
    if (locations.length > 1) {
      duplicates.push({ commandName: name, locations });
    }
  }

  return duplicates;
}

function generateSummary(directories: DirectoryAudit[], duplicates: DuplicateReport[]): AuditSummary {
  let totalCommands = 0;
  let correctCommands = 0;
  let warningCommands = 0;
  let brokenCommands = 0;

  for (const dir of directories) {
    if (dir.exists) {
      totalCommands += dir.commandCount;
      for (const cmd of dir.commands) {
        if (cmd.status === '✅ Correct') correctCommands++;
        else if (cmd.status === '⚠️ Warning') warningCommands++;
        else brokenCommands++;
      }
    }
  }

  const healthScore = totalCommands > 0 
    ? Math.round((correctCommands / totalCommands) * 100)
    : 0;

  return {
    totalCommands,
    correctCommands,
    warningCommands,
    brokenCommands,
    duplicateCommands: duplicates.length,
    totalDirectories: directories.filter(d => d.exists).length,
    healthScore
  };
}

function performAudit(): AuditResult {
  const directories = getCommandDirectories().map(auditDirectory);
  const duplicates = findDuplicates(directories);
  const summary = generateSummary(directories, duplicates);
  const issues: SystemIssue[] = [];

  // Generate system-level issues
  if (summary.brokenCommands > 0) {
    issues.push({
      type: 'error',
      message: `${summary.brokenCommands} commands have structural issues`
    });
  }

  if (summary.duplicateCommands > 0) {
    issues.push({
      type: 'warning',
      message: `${summary.duplicateCommands} duplicate commands found`
    });
  }

  if (summary.healthScore < 80) {
    issues.push({
      type: 'warning',
      message: `System health score is ${summary.healthScore}% (below 80%)`
    });
  }

  return {
    directories,
    summary,
    duplicates,
    issues,
    timestamp: new Date().toISOString()
  };
}

function printAuditReport(result: AuditResult, verbose: boolean = false, jsonOutput: boolean = false) {
  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log('\n' + '='.repeat(70));
  console.log('🔍 PAI System Audit Report');
  console.log('='.repeat(70));
  console.log(`📅 Generated: ${new Date(result.timestamp).toLocaleString()}`);
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Total Commands: ${result.summary.totalCommands}`);
  console.log(`   ✅ Correct: ${result.summary.correctCommands}`);
  console.log(`   ⚠️ Warnings: ${result.summary.warningCommands}`);
  console.log(`   ❌ Broken: ${result.summary.brokenCommands}`);
  console.log(`   🔄 Duplicates: ${result.summary.duplicateCommands}`);
  console.log(`   🏥 Health Score: ${result.summary.healthScore}%`);

  // Directory breakdown
  console.log('\n📁 Directories:');
  for (const dir of result.directories) {
    const status = dir.exists ? '✅' : '❌';
    console.log(`   ${status} ${dir.path} (${dir.commandCount} commands)`);
    
    if (verbose && dir.exists && dir.commands.length > 0) {
      for (const cmd of dir.commands) {
        console.log(`      ${cmd.status} ${cmd.name} (${cmd.type})`);
        if (cmd.issues.length > 0) {
          cmd.issues.forEach(issue => console.log(`         • ${issue}`));
        }
      }
    }
  }

  // Duplicates
  if (result.duplicates.length > 0) {
    console.log('\n🔄 Duplicate Commands:');
    for (const dup of result.duplicates) {
      console.log(`   📝 ${dup.commandName}:`);
      dup.locations.forEach(loc => console.log(`      • ${loc}`));
    }
  }

  // Issues
  if (result.issues.length > 0) {
    console.log('\n🚨 System Issues:');
    for (const issue of result.issues) {
      const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`   ${icon} ${issue.message}`);
      if (issue.location) {
        console.log(`      Location: ${issue.location}`);
      }
    }
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const jsonOutput = args.includes('--json');
  const customDir = args.find(arg => arg.startsWith('--dir='))?.split('=')[1];

  if (customDir) {
    // Audit specific directory
    const audit = auditDirectory(customDir);
    console.log(`Auditing directory: ${customDir}`);
    console.log(`Commands found: ${audit.commandCount}`);
    if (verbose) {
      audit.commands.forEach(cmd => {
        console.log(`  ${cmd.status} ${cmd.name} (${cmd.type})`);
      });
    }
    return;
  }

  const result = performAudit();
  printAuditReport(result, verbose, jsonOutput);

  // Exit with appropriate code based on health
  if (result.summary.brokenCommands > 0) {
    process.exit(1);
  } else if (result.summary.warningCommands > 0 || result.summary.duplicateCommands > 0) {
    process.exit(2);
  } else {
    process.exit(0);
  }
}

main();
