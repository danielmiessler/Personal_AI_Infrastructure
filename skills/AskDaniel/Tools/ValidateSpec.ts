#!/usr/bin/env bun
/**
 * ValidateSpec.ts - Validates output specifications from AskDaniel
 *
 * Usage:
 *   bun run $PAI_DIR/skills/AskDaniel/Tools/ValidateSpec.ts <spec.md>
 *   bun run $PAI_DIR/skills/AskDaniel/Tools/ValidateSpec.ts --json <spec.md>
 */

import { readFileSync, existsSync } from 'fs';

// Required sections in a valid spec
const REQUIRED_SECTIONS = [
  { name: 'Summary', pattern: /^##?\s*Summary/im },
  { name: 'Problem Statement', pattern: /^##?\s*Problem\s*Statement/im },
  { name: 'Architecture', pattern: /^##?\s*Architecture/im },
  { name: 'Test Strategy', pattern: /^##?\s*Test\s*Strategy/im },
];

// Optional but recommended sections
const RECOMMENDED_SECTIONS = [
  { name: 'CLI Interface', pattern: /^##?\s*CLI\s*Interface/im },
  { name: 'Daniel Principles Compliance', pattern: /^##?\s*Daniel\s*Principles/im },
  { name: 'History / Observability', pattern: /^##?\s*(History|Observability|JSONL)/im },
  { name: 'Acceptance Criteria', pattern: /^##?\s*Acceptance\s*Criteria/im },
];

interface ValidationResult {
  valid: boolean;
  file: string;
  required_sections: { name: string; found: boolean }[];
  recommended_sections: { name: string; found: boolean }[];
  warnings: string[];
  errors: string[];
}

function validateSpec(content: string, filePath: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    file: filePath,
    required_sections: [],
    recommended_sections: [],
    warnings: [],
    errors: [],
  };

  // Check required sections
  for (const section of REQUIRED_SECTIONS) {
    const found = section.pattern.test(content);
    result.required_sections.push({ name: section.name, found });
    if (!found) {
      result.errors.push(`Missing required section: ${section.name}`);
      result.valid = false;
    }
  }

  // Check recommended sections
  for (const section of RECOMMENDED_SECTIONS) {
    const found = section.pattern.test(content);
    result.recommended_sections.push({ name: section.name, found });
    if (!found) {
      result.warnings.push(`Missing recommended section: ${section.name}`);
    }
  }

  // Check for FAIL without mitigation
  const failMatches = content.match(/\|\s*FAIL\s*\|/gi);
  if (failMatches && failMatches.length > 0) {
    // Look for mitigation text near FAILs
    const hasMitigation = /mitigation|address|fix|resolve/i.test(content);
    if (!hasMitigation) {
      result.errors.push(`Found ${failMatches.length} FAIL score(s) without mitigation plan`);
      result.valid = false;
    } else {
      result.warnings.push(`Found ${failMatches.length} FAIL score(s) - ensure mitigations are adequate`);
    }
  }

  // Check for placeholder text
  const placeholders = content.match(/\[(?:TODO|TBD|FIXME|placeholder|fill in)\]/gi);
  if (placeholders && placeholders.length > 0) {
    result.warnings.push(`Found ${placeholders.length} placeholder(s) that need to be filled in`);
  }

  // Check for empty sections (heading followed by another heading or end)
  const emptySection = /^##[^#\n]+\n+##/m.test(content);
  if (emptySection) {
    result.warnings.push('Found potentially empty section(s)');
  }

  // Basic content length check
  if (content.length < 500) {
    result.errors.push('Spec is too short (< 500 chars) - likely incomplete');
    result.valid = false;
  }

  return result;
}

function formatResults(result: ValidationResult, asJson: boolean): string {
  if (asJson) {
    return JSON.stringify(result, null, 2);
  }

  let output = `\n${'='.repeat(60)}\n`;
  output += `Spec Validation: ${result.file}\n`;
  output += `${'='.repeat(60)}\n\n`;

  output += `Status: ${result.valid ? 'VALID' : 'INVALID'}\n\n`;

  output += `Required Sections:\n`;
  for (const section of result.required_sections) {
    const icon = section.found ? '[x]' : '[ ]';
    output += `  ${icon} ${section.name}\n`;
  }

  output += `\nRecommended Sections:\n`;
  for (const section of result.recommended_sections) {
    const icon = section.found ? '[x]' : '[ ]';
    output += `  ${icon} ${section.name}\n`;
  }

  if (result.errors.length > 0) {
    output += `\nErrors:\n`;
    for (const error of result.errors) {
      output += `  - ${error}\n`;
    }
  }

  if (result.warnings.length > 0) {
    output += `\nWarnings:\n`;
    for (const warning of result.warnings) {
      output += `  - ${warning}\n`;
    }
  }

  output += `\n${'='.repeat(60)}\n`;

  return output;
}

function showHelp(): void {
  console.log(`
ValidateSpec - Validates AskDaniel output specifications

Usage:
  bun run ValidateSpec.ts <spec.md>         Validate a spec file
  bun run ValidateSpec.ts --json <spec.md>  Output as JSON
  bun run ValidateSpec.ts --help            Show this help

Required Sections:
  - Summary
  - Problem Statement
  - Architecture
  - Test Strategy

Recommended Sections:
  - CLI Interface
  - Daniel Principles Compliance
  - History / Observability
  - Acceptance Criteria

Exit Codes:
  0 - Spec is valid
  1 - Spec is invalid or file not found
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const asJson = args.includes('--json');
  const filePath = args.filter(a => !a.startsWith('--'))[0];

  if (!filePath) {
    console.error('Error: No spec file provided.');
    process.exit(1);
  }

  if (!existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const content = readFileSync(filePath, 'utf-8');
  const result = validateSpec(content, filePath);
  const output = formatResults(result, asJson);

  console.log(output);
  process.exit(result.valid ? 0 : 1);
}

main().catch(console.error);
