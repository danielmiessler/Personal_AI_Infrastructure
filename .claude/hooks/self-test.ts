#!/usr/bin/env bun
/**
 * PAI Self-Test - Health Check System
 *
 * Validates that PAI core guarantees are working correctly.
 * Run: bun ${PAI_DIR}/hooks/self-test.ts
 *
 * Tests:
 * 1. PAI_DIR resolves correctly
 * 2. Core directories exist
 * 3. CORE skill loads
 * 4. Settings.json is valid
 * 5. Agents exist
 * 6. Hooks are executable
 * 7. Voice server (optional)
 */

import { existsSync, readFileSync, accessSync, constants, readdirSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';

// For self-test, always use the repo we're testing (not system PAI_DIR)
// This allows testing the PAI repo independently of installed Kai system
// Use cwd() since the user runs this from the PAI repo root: cd ~/Projects/PAI && bun .claude/hooks/self-test.ts
const REPO_ROOT = process.cwd();
const PAI_DIR = join(REPO_ROOT, '.claude');
const HOOKS_DIR = join(PAI_DIR, 'hooks');
const SKILLS_DIR = join(PAI_DIR, 'skills');
const AGENTS_DIR = join(PAI_DIR, 'agents');
const HISTORY_DIR = join(PAI_DIR, 'history');

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const results: TestResult[] = [];

function test(name: string, testFn: () => boolean | 'warn', passMsg: string, failMsg: string): void {
  try {
    const result = testFn();
    if (result === 'warn') {
      results.push({ name, status: 'warn', message: passMsg });
    } else if (result) {
      results.push({ name, status: 'pass', message: passMsg });
    } else {
      results.push({ name, status: 'fail', message: failMsg });
    }
  } catch (error) {
    results.push({
      name,
      status: 'fail',
      message: `${failMsg}: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

console.log('\n🏥 PAI Health Check\n');
console.log('='.repeat(60));

// Test 1: PAI_DIR resolves
test(
  'PAI_DIR Resolution',
  () => PAI_DIR.length > 0 && existsSync(PAI_DIR),
  `PAI_DIR: ${PAI_DIR}`,
  `PAI_DIR not found: ${PAI_DIR}`
);

// Test 2: Core directories exist
test(
  'Hooks Directory',
  () => existsSync(HOOKS_DIR),
  `Found: ${HOOKS_DIR}`,
  `Missing: ${HOOKS_DIR}`
);

test(
  'Skills Directory',
  () => existsSync(SKILLS_DIR),
  `Found: ${SKILLS_DIR}`,
  `Missing: ${SKILLS_DIR}`
);

test(
  'Agents Directory',
  () => existsSync(AGENTS_DIR),
  `Found: ${AGENTS_DIR}`,
  `Missing: ${AGENTS_DIR}`
);

test(
  'History Directory',
  () => existsSync(HISTORY_DIR),
  `Found: ${HISTORY_DIR}`,
  `Missing: ${HISTORY_DIR}`
);

// Test 3: CORE skill loads
test(
  'CORE Skill',
  () => {
    const coreSkill = join(SKILLS_DIR, 'CORE/SKILL.md');
    if (!existsSync(coreSkill)) return false;
    const content = readFileSync(coreSkill, 'utf-8');
    return content.includes('CORE IDENTITY') || content.includes('Personal AI Infrastructure');
  },
  'CORE skill loads correctly',
  'CORE skill missing or malformed'
);

// Test 4: Settings.json valid
test(
  'Settings Configuration',
  () => {
    const settingsPath = join(PAI_DIR, 'settings.json');
    if (!existsSync(settingsPath)) return false;
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    return settings && settings.hooks && settings.permissions;
  },
  'settings.json valid',
  'settings.json missing or invalid'
);

// Test 5: Agents exist
test(
  'Agents',
  () => {
    const agents = readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
    return agents.length > 0;
  },
  `Found ${readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md')).length} agent(s)`,
  'No agents found'
);

// Test 6: Hooks are executable
test(
  'Hook Executability',
  () => {
    const criticalHooks = [
      'capture-all-events.ts',
      'load-core-context.ts',
    ];

    for (const hook of criticalHooks) {
      const hookPath = join(HOOKS_DIR, hook);
      if (!existsSync(hookPath)) return false;

      // Check if executable (on Unix) or readable
      try {
        accessSync(hookPath, constants.R_OK);
      } catch {
        return false;
      }
    }
    return true;
  },
  'Critical hooks are accessible',
  'Some hooks missing or not accessible'
);

// Test 7: PAI paths library exists
test(
  'PAI Paths Library',
  () => {
    const pathsLib = join(HOOKS_DIR, 'lib/pai-paths.ts');
    return existsSync(pathsLib);
  },
  'Path resolution library present',
  'PAI paths library missing'
);

// Test 8: Voice server (optional - warning if not running)
test(
  'Voice Server',
  async () => {
    try {
      const response = await fetch('http://localhost:3000/health', {
        signal: AbortSignal.timeout(2000)
      });
      return response.ok;
    } catch {
      return 'warn';
    }
  },
  'Voice server responding',
  'Voice server not responding (optional feature)'
);

// Test 9: .env file exists (template check)
test(
  'Environment Configuration',
  () => {
    const envExample = join(PAI_DIR, '.env.example');
    const envFile = join(PAI_DIR, '.env');
    return existsSync(envExample) || existsSync(envFile);
  },
  'Environment config present',
  'No .env.example or .env found'
);

// Test 10: PAI_CONTRACT exists
test(
  'PAI Contract',
  () => {
    // PAI_CONTRACT.md is in repo root
    const contractPath = join(REPO_ROOT, 'PAI_CONTRACT.md');
    return existsSync(contractPath);
  },
  'PAI contract document present',
  'PAI_CONTRACT.md missing'
);

// Print results
console.log('\n');
let passCount = 0;
let failCount = 0;
let warnCount = 0;

for (const result of results) {
  const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️ ' : '❌';
  const color = result.status === 'pass' ? '\x1b[32m' : result.status === 'warn' ? '\x1b[33m' : '\x1b[31m';
  const reset = '\x1b[0m';

  console.log(`${icon} ${color}${result.name}${reset}: ${result.message}`);

  if (result.status === 'pass') passCount++;
  else if (result.status === 'fail') failCount++;
  else warnCount++;
}

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Results: ${passCount} passed, ${failCount} failed, ${warnCount} warnings\n`);

if (failCount === 0) {
  console.log('🎉 PAI is healthy! All core guarantees working.\n');
  if (warnCount > 0) {
    console.log('ℹ️  Warnings are for optional features (like voice server).\n');
  }
  process.exit(0);
} else {
  console.log('🔧 PAI has issues. Check failed tests above.\n');
  console.log('📖 See PAI_CONTRACT.md for what should work out of box.\n');
  console.log('🐛 Report core guarantee failures at:');
  console.log('   https://github.com/danielmiessler/Personal_AI_Infrastructure/issues\n');
  process.exit(1);
}
