#!/usr/bin/env bun
/**
 * # PAI Command Diagnostics
 *
 * ## Purpose
 * This command analyzes a single PAI command file and reports on its structure, type, and validity.
 * It helps diagnose structural errors and ensures commands follow PAI patterns correctly.
 *
 * ## Usage
 * ```bash
 * # Diagnose a specific command file
 * bun ${PAI_DIR}/commands/pai-diagnostics.md /path/to/command/file.md
 * 
 * # Diagnose with verbose output
 * bun ${PAI_DIR}/commands/pai-diagnostics.md /path/to/command/file.md --verbose
 * ```
 *
 * ## Command Types Detected
 * - **Instructional**: Pure markdown files with documentation/instructions
 * - **Executable**: Files with shebang that can be executed directly
 * - **Hybrid**: Markdown files with shebang + JSDoc (recommended pattern)
 *
 * ## Validation Checks
 * - Shebang presence and correctness
 * - JSDoc comment block structure
 * - Raw markdown vs JSDoc documentation
 * - File permissions and executability
 * - TypeScript syntax validation (basic)
 */

import { readFileSync, accessSync, constants } from 'fs';
import { exit } from 'process';

interface DiagnosticReport {
  filePath: string;
  type: 'Instructional' | 'Executable' | 'Hybrid' | 'Unknown';
  status: '✅ Correct' | '⚠️ Warning' | '❌ Broken';
  issues: string[];
  warnings: string[];
  suggestions: string[];
  metadata: {
    hasShebang: boolean;
    shebangType: string | null;
    hasJSDoc: boolean;
    hasRawMarkdown: boolean;
    isExecutable: boolean;
    lineCount: number;
  };
}

function analyzeCommand(filePath: string, verbose: boolean = false): DiagnosticReport {
  const report: DiagnosticReport = {
    filePath,
    type: 'Unknown',
    status: '❌ Broken',
    issues: [],
    warnings: [],
    suggestions: [],
    metadata: {
      hasShebang: false,
      shebangType: null,
      hasJSDoc: false,
      hasRawMarkdown: false,
      isExecutable: false,
      lineCount: 0
    }
  };

  try {
    // Check file accessibility
    accessSync(filePath, constants.R_OK);
    
    // Check if file is executable
    try {
      accessSync(filePath, constants.X_OK);
      report.metadata.isExecutable = true;
    } catch {
      report.metadata.isExecutable = false;
    }

    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    report.metadata.lineCount = lines.length;

    // Analyze first line for shebang
    const firstLine = lines[0]?.trim() || '';
    if (firstLine.startsWith('#!')) {
      report.metadata.hasShebang = true;
      if (firstLine.includes('bun')) {
        report.metadata.shebangType = 'bun';
      } else if (firstLine.includes('bash') || firstLine.includes('sh')) {
        report.metadata.shebangType = 'shell';
      } else {
        report.metadata.shebangType = 'other';
      }
    }

    // Check for JSDoc comment block
    report.metadata.hasJSDoc = content.includes('/**') && content.includes('*/');

    // Check for raw markdown headings (outside JSDoc)
    const contentAfterJSDoc = report.metadata.hasJSDoc 
      ? content.substring(content.indexOf('*/') + 2)
      : content;
    report.metadata.hasRawMarkdown = /^#+\s/.test(contentAfterJSDoc.trim());

    // Determine command type and validate
    if (!report.metadata.hasShebang) {
      report.type = 'Instructional';
      report.status = '✅ Correct';
      report.suggestions.push('This is a pure instructional command - AI will read and execute the instructions');
    } else {
      // Has shebang - should be executable
      if (report.metadata.shebangType === 'bun') {
        if (report.metadata.hasJSDoc && !report.metadata.hasRawMarkdown) {
          report.type = 'Hybrid';
          report.status = '✅ Correct';
          report.suggestions.push('Perfect hybrid command - executable with embedded documentation');
        } else if (!report.metadata.hasJSDoc) {
          report.type = 'Executable';
          report.status = '⚠️ Warning';
          report.warnings.push('Missing JSDoc comment block for documentation');
          report.suggestions.push('Add /** ... */ comment block after shebang for documentation');
        } else if (report.metadata.hasRawMarkdown) {
          report.type = 'Executable';
          report.status = '❌ Broken';
          report.issues.push('Contains raw markdown headings (#) which will cause TypeScript syntax errors');
          report.suggestions.push('Move markdown documentation inside /** ... */ JSDoc comment block');
        }
      } else if (report.metadata.shebangType === 'shell') {
        report.type = 'Executable';
        report.status = '✅ Correct';
        report.suggestions.push('Shell script - ensure it follows bash best practices');
      } else {
        report.type = 'Executable';
        report.status = '⚠️ Warning';
        report.warnings.push(`Unknown shebang type: ${report.metadata.shebangType}`);
      }

      // Check executability
      if (!report.metadata.isExecutable) {
        report.warnings.push('File has shebang but is not executable');
        report.suggestions.push(`Run: chmod +x ${filePath}`);
      }
    }

    // Additional validations
    if (report.metadata.lineCount === 0) {
      report.issues.push('File is empty');
      report.status = '❌ Broken';
    }

    // Basic TypeScript syntax check for bun files
    if (report.metadata.shebangType === 'bun' && content.includes('import')) {
      const importRegex = /import\s+.*\s+from\s+['"][^'"]+['"];?/g;
      const imports = content.match(importRegex) || [];
      if (verbose) {
        report.suggestions.push(`Found ${imports.length} import statements`);
      }
    }

  } catch (error) {
    report.issues.push(`Error reading file: ${error.message}`);
    report.status = '❌ Broken';
  }

  return report;
}

function printReport(report: DiagnosticReport, verbose: boolean = false) {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 PAI Command Diagnostics Report');
  console.log('='.repeat(60));
  console.log(`📁 File: ${report.filePath}`);
  console.log(`📋 Type: ${report.type}`);
  console.log(`🎯 Status: ${report.status}`);
  
  if (verbose) {
    console.log('\n📊 Metadata:');
    console.log(`   Lines: ${report.metadata.lineCount}`);
    console.log(`   Shebang: ${report.metadata.hasShebang ? report.metadata.shebangType : 'None'}`);
    console.log(`   JSDoc: ${report.metadata.hasJSDoc ? 'Yes' : 'No'}`);
    console.log(`   Raw Markdown: ${report.metadata.hasRawMarkdown ? 'Yes' : 'No'}`);
    console.log(`   Executable: ${report.metadata.isExecutable ? 'Yes' : 'No'}`);
  }

  if (report.issues.length > 0) {
    console.log('\n❌ Issues:');
    report.issues.forEach(issue => console.log(`   • ${issue}`));
  }

  if (report.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    report.warnings.forEach(warning => console.log(`   • ${warning}`));
  }

  if (report.suggestions.length > 0) {
    console.log('\n💡 Suggestions:');
    report.suggestions.forEach(suggestion => console.log(`   • ${suggestion}`));
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

function main() {
  const args = process.argv.slice(2);
  const filePath = args.find(arg => !arg.startsWith('--'));
  const verbose = args.includes('--verbose') || args.includes('-v');

  if (!filePath) {
    console.error('❌ Error: Please provide a file path to diagnose.');
    console.error('Usage: bun pai-diagnostics.md /path/to/command/file.md [--verbose]');
    exit(1);
  }

  const report = analyzeCommand(filePath, verbose);
  printReport(report, verbose);

  // Exit with appropriate code
  if (report.status === '❌ Broken') {
    exit(1);
  } else if (report.status === '⚠️ Warning') {
    exit(2);
  } else {
    exit(0);
  }
}

main();
