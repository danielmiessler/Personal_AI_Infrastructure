#!/usr/bin/env bun
/**
 * SystemFileGuard.hook.ts - Protect locally-patched SYSTEM files (PreToolUse)
 *
 * PURPOSE:
 * When editing or writing a SYSTEM-tier file that has an active local patch
 * tracked in LOCAL_PATCHES.md, prompts the user to confirm. Prevents
 * accidental overwrite of local patches by the model.
 *
 * TRIGGER: PreToolUse (matcher: Edit, Write)
 *
 * BEHAVIOR:
 * - Reads LOCAL_PATCHES.md to find active patch entries
 * - Extracts tracked file paths from "**File:**" lines
 * - If target file matches an active patch → ask user to confirm
 * - If target file is not patched → continue silently
 *
 * PERFORMANCE: <5ms (reads one file, simple string matching)
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getPaiDir } from './lib/paths';

interface HookInput {
  tool_name: string;
  tool_input: {
    file_path?: string;
    command?: string;
  };
}

function getActivePatchedFiles(paiDir: string): string[] {
  const localPatchesPath = join(paiDir, 'LOCAL_PATCHES.md');
  if (!existsSync(localPatchesPath)) return [];

  try {
    const content = readFileSync(localPatchesPath, 'utf-8');

    // Split into sections; only look at "## Active Patches" section
    const activeSection = content.split(/^## Active Patches/m)[1];
    if (!activeSection) return [];

    // Stop at next h2 section
    const sectionEnd = activeSection.indexOf('\n## ');
    const activeContent = sectionEnd >= 0 ? activeSection.slice(0, sectionEnd) : activeSection;

    // Extract file paths from "**File:**" or "**Files:**" lines
    const files: string[] = [];
    const fileMatches = activeContent.matchAll(/\*\*Files?:\*\*\s*`([^`]+)`/g);
    for (const match of fileMatches) {
      files.push(match[1]);
    }

    // Also extract from comma-separated "**Files:**" entries
    const multiFileMatches = activeContent.matchAll(/\*\*Files?:\*\*\s*`([^`]+)`(?:,\s*`([^`]+)`)?/g);
    for (const match of multiFileMatches) {
      if (match[1]) files.push(match[1]);
      if (match[2]) files.push(match[2]);
    }

    return [...new Set(files)]; // Dedupe
  } catch {
    return [];
  }
}

function normalizeToRelative(filePath: string, paiDir: string): string {
  // Convert absolute path to relative from PAI_DIR
  if (filePath.startsWith(paiDir + '/')) {
    return filePath.slice(paiDir.length + 1);
  }
  return filePath;
}

function main() {
  try {
    const input = JSON.parse(readFileSync('/dev/stdin', 'utf-8')) as HookInput;
    const targetPath = input.tool_input?.file_path;

    if (!targetPath) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    const paiDir = getPaiDir();
    const relativePath = normalizeToRelative(targetPath, paiDir);
    const patchedFiles = getActivePatchedFiles(paiDir);

    // Check if this file (or a matching file) has an active patch
    const matchedPatch = patchedFiles.find(pf => {
      return relativePath === pf || relativePath.endsWith('/' + pf) || pf.endsWith('/' + relativePath);
    });

    if (matchedPatch) {
      console.log(JSON.stringify({
        decision: "ask",
        message: `⚠️ SYSTEM FILE WITH LOCAL PATCH: "${matchedPatch}" has an active local patch tracked in LOCAL_PATCHES.md. Editing this file may need patch tracking updates. Proceed?`
      }));
    } else {
      console.log(JSON.stringify({ continue: true }));
    }
  } catch (err) {
    // Fail-open: if we can't parse input, allow the operation
    console.error(`SystemFileGuard error: ${err}`);
    console.log(JSON.stringify({ continue: true }));
  }
}

main();
