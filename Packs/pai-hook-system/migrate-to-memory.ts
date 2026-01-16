#!/usr/bin/env bun
// Migration script: history/ → MEMORY/ structure
// Migrates data from v2.1.0 flat structure to v2.1.1+ three-tier architecture

import { existsSync, renameSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const paiDir = process.env.PAI_DIR || join(homedir(), '.claude');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  PAI MEMORY Migration: history/ → MEMORY/');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Check if migration is needed
const oldHistoryDir = join(paiDir, 'history');
const newMemoryDir = join(paiDir, 'MEMORY');

if (!existsSync(oldHistoryDir)) {
  console.log('✓ No old history/ directory found - nothing to migrate');
  process.exit(0);
}

// Create MEMORY structure
console.log('1. Creating MEMORY directory structure...');
const memoryDirs = [
  'Work',
  'Learning/OBSERVE',
  'Learning/THINK',
  'Learning/PLAN',
  'Learning/BUILD',
  'Learning/EXECUTE',
  'Learning/VERIFY',
  'Learning/ALGORITHM',
  'History/sessions',
  'History/learnings',
  'History/research',
  'History/decisions',
  'History/raw-outputs',
  'State',
  'Signals',
];

for (const dir of memoryDirs) {
  const fullPath = join(newMemoryDir, dir);
  if (!existsSync(fullPath)) {
    mkdirSync(fullPath, { recursive: true });
  }
}
console.log('   ✓ Created MEMORY structure\n');

// Migrate data
console.log('2. Migrating data from history/ to MEMORY/History/...');

const migrations = [
  { from: 'history/sessions', to: 'MEMORY/History/sessions' },
  { from: 'history/learnings', to: 'MEMORY/History/learnings' },
  { from: 'history/research', to: 'MEMORY/History/research' },
];

let filesMoved = 0;

for (const { from, to } of migrations) {
  const fromPath = join(paiDir, from);
  const toPath = join(paiDir, to);

  if (!existsSync(fromPath)) {
    console.log(`   ⊘ ${from} - not found, skipping`);
    continue;
  }

  const files = readdirSync(fromPath);

  if (files.length === 0) {
    console.log(`   ⊘ ${from} - empty, skipping`);
    continue;
  }

  for (const file of files) {
    const fromFile = join(fromPath, file);
    const toFile = join(toPath, file);

    // Handle directories (month folders like 2026-01/)
    if (statSync(fromFile).isDirectory()) {
      // Create month directory in new location
      if (!existsSync(toFile)) {
        mkdirSync(toFile, { recursive: true });
      }

      // Move all files from month directory
      const monthFiles = readdirSync(fromFile);
      for (const monthFile of monthFiles) {
        renameSync(join(fromFile, monthFile), join(toFile, monthFile));
        filesMoved++;
      }
    } else {
      // Move individual file
      renameSync(fromFile, toFile);
      filesMoved++;
    }
  }

  console.log(`   ✓ ${from} → ${to}`);
}

console.log(`   Total files moved: ${filesMoved}\n`);

// Optional: Remove old history directory
console.log('3. Cleanup old history/ directory...');
try {
  // Check if history dir is now empty
  const remaining = readdirSync(oldHistoryDir);
  if (remaining.length === 0 || remaining.every(f => f.startsWith('.'))) {
    // Safe to remove
    console.log('   ⚠ Old history/ directory is empty');
    console.log('   Run manually to remove: rm -rf ' + oldHistoryDir);
  } else {
    console.log(`   ⚠ Old history/ directory still has ${remaining.length} items`);
    console.log('   Review manually before removing');
  }
} catch (e) {
  console.log('   ⚠ Could not check history/ directory');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  ✅ Migration Complete');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('Next steps:');
console.log('1. Start a new Claude Code session');
console.log('2. Verify MEMORY system is capturing:');
console.log('   ls $PAI_DIR/MEMORY/History/sessions/');
console.log('3. Check raw event logs:');
console.log('   ls $PAI_DIR/MEMORY/History/raw-outputs/\n');
