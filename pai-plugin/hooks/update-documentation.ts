#!/usr/bin/env bun
/**
 * Pre-commit Documentation Updater - Enhanced Version
 *
 * Analyzes staged git changes and automatically updates relevant documentation
 * files including README.md and documentation/*.md with ACTUAL CONTENT UPDATES,
 * not just timestamps.
 *
 * This runs as part of the pre-commit hook to ensure documentation stays
 * in sync with code changes.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  linesAdded: number;
  linesDeleted: number;
}

interface ChangeAnalysis {
  changedFiles: string[];
  fileChanges: FileChange[];
  affectedAreas: Map<string, FileChange[]>;  // area -> files that changed
  needsReadmeUpdate: boolean;
  needsDocUpdate: Map<string, boolean>;
  changeSummary: string;
}

/**
 * Get list of staged files with their change types
 */
function getStagedFilesDetailed(): FileChange[] {
  try {
    // Get diff stats for staged files
    const output = execSync('git diff --cached --numstat', {
      encoding: 'utf-8',
    });

    const changes: FileChange[] = [];

    for (const line of output.trim().split('\n')) {
      if (!line) continue;

      const parts = line.split('\t');
      if (parts.length !== 3) continue;

      const linesAdded = parts[0] === '-' ? 0 : parseInt(parts[0]);
      const linesDeleted = parts[1] === '-' ? 0 : parseInt(parts[1]);
      const path = parts[2];

      // Determine type
      let type: 'added' | 'modified' | 'deleted' = 'modified';
      if (linesAdded > 0 && linesDeleted === 0) {
        type = 'added';
      } else if (linesAdded === 0 && linesDeleted > 0) {
        type = 'deleted';
      }

      changes.push({
        path,
        type,
        linesAdded,
        linesDeleted,
      });
    }

    return changes;
  } catch (error) {
    console.error('Error getting staged files:', error);
    return [];
  }
}

/**
 * Get simple list of staged file paths
 */
function getStagedFiles(): string[] {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=d', {
      encoding: 'utf-8',
    });
    return output.trim().split('\n').filter(f => f.length > 0);
  } catch (error) {
    console.error('Error getting staged files:', error);
    return [];
  }
}

/**
 * Generate a human-readable summary of changes
 */
function generateChangeSummary(fileChanges: FileChange[]): string {
  const added = fileChanges.filter(f => f.type === 'added').length;
  const modified = fileChanges.filter(f => f.type === 'modified').length;
  const deleted = fileChanges.filter(f => f.type === 'deleted').length;

  const parts: string[] = [];
  if (added > 0) parts.push(`${added} added`);
  if (modified > 0) parts.push(`${modified} modified`);
  if (deleted > 0) parts.push(`${deleted} deleted`);

  return parts.join(', ');
}

/**
 * Analyze changed files to determine what documentation needs updating
 */
function analyzeChanges(fileChanges: FileChange[]): ChangeAnalysis {
  const affectedAreas = new Map<string, FileChange[]>();
  const needsDocUpdate = new Map<string, boolean>();

  // Group files by area
  for (const change of fileChanges) {
    const { path } = change;

    // Skip if this IS a documentation file being changed
    if (path.startsWith('documentation/') || path === 'README.md' ||
        path === 'hooks/update-documentation.ts') {
      continue;
    }

    // Map files to affected areas and group by area
    if (path.startsWith('skills/')) {
      if (!affectedAreas.has('skills')) affectedAreas.set('skills', []);
      affectedAreas.get('skills')!.push(change);
      needsDocUpdate.set('documentation/skills-system.md', true);
    } else if (path.startsWith('commands/')) {
      if (!affectedAreas.has('commands')) affectedAreas.set('commands', []);
      affectedAreas.get('commands')!.push(change);
      needsDocUpdate.set('documentation/command-system.md', true);
    } else if (path.startsWith('hooks/')) {
      if (!affectedAreas.has('hooks')) affectedAreas.set('hooks', []);
      affectedAreas.get('hooks')!.push(change);
      needsDocUpdate.set('documentation/hook-system.md', true);
    } else if (path.startsWith('agents/')) {
      if (!affectedAreas.has('agents')) affectedAreas.set('agents', []);
      affectedAreas.get('agents')!.push(change);
      needsDocUpdate.set('documentation/agent-system.md', true);
    } else if (path.startsWith('voice-server/')) {
      if (!affectedAreas.has('voice')) affectedAreas.set('voice', []);
      affectedAreas.get('voice')!.push(change);
      needsDocUpdate.set('documentation/voice-system.md', true);
    } else if (path === 'package.json' || path === 'bun.lockb') {
      if (!affectedAreas.has('dependencies')) affectedAreas.set('dependencies', []);
      affectedAreas.get('dependencies')!.push(change);
    } else if (path === '.mcp.json') {
      if (!affectedAreas.has('mcp-servers')) affectedAreas.set('mcp-servers', []);
      affectedAreas.get('mcp-servers')!.push(change);
    } else if (path === 'settings.json') {
      if (!affectedAreas.has('settings')) affectedAreas.set('settings', []);
      affectedAreas.get('settings')!.push(change);
    }
  }

  // Always update README if there are changes (to add update entry)
  const needsReadmeUpdate = fileChanges.length > 0;

  const changeSummary = generateChangeSummary(fileChanges);

  return {
    changedFiles: fileChanges.map(f => f.path),
    fileChanges,
    affectedAreas,
    needsReadmeUpdate,
    needsDocUpdate,
    changeSummary,
  };
}

/**
 * Update README.md Recent Updates section with new entry
 */
function updateReadme(analysis: ChangeAnalysis): boolean {
  const readmePath = join(process.cwd(), 'README.md');

  if (!existsSync(readmePath)) {
    console.log(`${colors.yellow}⚠️  README.md not found, skipping update${colors.reset}`);
    return false;
  }

  try {
    let content = readFileSync(readmePath, 'utf-8');

    // Get current date
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    // Build a description of what changed
    const areaNames = Array.from(analysis.affectedAreas.keys());

    let updateDescription = '';

    if (areaNames.length === 0) {
      updateDescription = `Documentation and maintenance updates (${analysis.changeSummary})`;
    } else {
      // Create bullet points for each area
      const bullets: string[] = [];

      for (const [area, changes] of analysis.affectedAreas) {
        const added = changes.filter(c => c.type === 'added').length;
        const modified = changes.filter(c => c.type === 'modified').length;
        const deleted = changes.filter(c => c.type === 'deleted').length;

        let desc = `**${area.charAt(0).toUpperCase() + area.slice(1)}:** `;
        const parts: string[] = [];
        if (added > 0) parts.push(`${added} new`);
        if (modified > 0) parts.push(`${modified} updated`);
        if (deleted > 0) parts.push(`${deleted} removed`);
        desc += parts.join(', ');

        bullets.push(`- ${desc}`);
      }

      updateDescription = bullets.join('\n');
    }

    // Create the new update entry
    const newEntry = `
<details>
<summary><strong>📅 ${dateStr} - Automated Documentation Update</strong></summary>

${updateDescription}

*Updated by pre-commit hook: ${analysis.changeSummary}*

</details>
`;

    // Find the insertion point - after the TIP box and before first <details>
    const tipEndPattern = /> \*\*✨ v\d+\.\d+\.\d+ NEW:.*?\n\n/s;
    const detailsStartPattern = /<details>\s*<summary><strong>📅/;

    // Find where to insert (right after the tip box, before first details)
    const tipMatch = content.match(tipEndPattern);
    if (tipMatch) {
      const insertPos = tipMatch.index! + tipMatch[0].length;
      content = content.slice(0, insertPos) + newEntry + '\n' + content.slice(insertPos);
    } else {
      // Fallback: insert after "Recent Updates" heading
      const headingPattern = /## 🚀 \*\*Recent Updates\*\*\n\n/;
      const headingMatch = content.match(headingPattern);
      if (headingMatch) {
        const insertPos = headingMatch.index! + headingMatch[0].length;
        content = content.slice(0, insertPos) + newEntry + '\n' + content.slice(insertPos);
      } else {
        console.log(`${colors.yellow}⚠️  Could not find insertion point in README${colors.reset}`);
        return false;
      }
    }

    writeFileSync(readmePath, content, 'utf-8');
    console.log(`${colors.green}✅ Updated README.md with new entry${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.yellow}⚠️  Error updating README:${colors.reset}`, error);
    return false;
  }
}

/**
 * Update documentation files with content about what changed
 */
function updateDocumentation(analysis: ChangeAnalysis): string[] {
  const updatedFiles: string[] = [];

  for (const [docFile, shouldUpdate] of analysis.needsDocUpdate) {
    if (!shouldUpdate) continue;

    const docPath = join(process.cwd(), docFile);

    if (!existsSync(docPath)) {
      console.log(`${colors.yellow}⚠️  ${docFile} not found, skipping${colors.reset}`);
      continue;
    }

    try {
      let content = readFileSync(docPath, 'utf-8');

      // Get current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];

      // Determine which area this doc covers
      const area = docFile.includes('skills') ? 'skills' :
                   docFile.includes('command') ? 'commands' :
                   docFile.includes('hook') ? 'hooks' :
                   docFile.includes('agent') ? 'agents' :
                   docFile.includes('voice') ? 'voice' : null;

      if (area && analysis.affectedAreas.has(area)) {
        const changes = analysis.affectedAreas.get(area)!;

        // Build update section content
        const changeLines: string[] = [];
        changeLines.push(`\n## Recent Changes (${dateStr})\n`);

        for (const change of changes) {
          const emoji = change.type === 'added' ? '➕' :
                       change.type === 'modified' ? '✏️' : '🗑️';
          changeLines.push(`- ${emoji} \`${change.path}\` (${change.type})`);
          if (change.linesAdded > 0 || change.linesDeleted > 0) {
            changeLines.push(`  - +${change.linesAdded} / -${change.linesDeleted} lines`);
          }
        }

        const updateContent = changeLines.join('\n');

        // Add the updates section before the final "Last Updated" comment
        const lastUpdatedPattern = /\n---\n<!-- Last Updated: .*? -->\n$/;
        if (lastUpdatedPattern.test(content)) {
          // Insert before the last updated section
          content = content.replace(
            lastUpdatedPattern,
            `\n${updateContent}\n\n---\n<!-- Last Updated: ${dateStr} -->\n`
          );
        } else {
          // Append at the end
          content = content.trimEnd() + `\n${updateContent}\n\n---\n<!-- Last Updated: ${dateStr} -->\n`;
        }
      } else {
        // Just update the timestamp
        const lastUpdatedPattern = /<!-- Last Updated: .*? -->/;
        const lastUpdatedLine = `<!-- Last Updated: ${dateStr} -->`;

        if (lastUpdatedPattern.test(content)) {
          content = content.replace(lastUpdatedPattern, lastUpdatedLine);
        } else {
          content = content.trimEnd() + `\n\n---\n${lastUpdatedLine}\n`;
        }
      }

      writeFileSync(docPath, content, 'utf-8');
      updatedFiles.push(docFile);
      console.log(`${colors.green}✅ Updated ${docFile} with change details${colors.reset}`);
    } catch (error) {
      console.error(`${colors.yellow}⚠️  Error updating ${docFile}:${colors.reset}`, error);
    }
  }

  return updatedFiles;
}

/**
 * Stage updated documentation files
 */
function stageFiles(files: string[]): void {
  if (files.length === 0) return;

  try {
    const filesToStage = files.join(' ');
    execSync(`git add ${filesToStage}`, { stdio: 'inherit' });
    console.log(`${colors.cyan}📝 Staged updated documentation files${colors.reset}`);
  } catch (error) {
    console.error(`${colors.yellow}⚠️  Error staging files:${colors.reset}`, error);
  }
}

/**
 * Main execution
 */
function main(): number {
  console.log(`\n${colors.blue}📚 Checking for documentation updates...${colors.reset}`);

  // Get staged files with details
  const fileChanges = getStagedFilesDetailed();

  if (fileChanges.length === 0) {
    console.log(`${colors.green}✅ No staged files to process${colors.reset}`);
    return 0;
  }

  // Filter out documentation files to avoid circular updates
  const nonDocChanges = fileChanges.filter(f =>
    !f.path.startsWith('documentation/') &&
    f.path !== 'README.md' &&
    f.path !== 'hooks/update-documentation.ts'
  );

  if (nonDocChanges.length === 0) {
    console.log(`${colors.green}✅ Only documentation files changed, no updates needed${colors.reset}`);
    return 0;
  }

  console.log(`${colors.cyan}📋 Analyzing ${nonDocChanges.length} changed files...${colors.reset}`);

  // Analyze what changed
  const analysis = analyzeChanges(fileChanges);

  if (analysis.affectedAreas.size === 0 && !analysis.needsReadmeUpdate) {
    console.log(`${colors.green}✅ No documentation areas affected${colors.reset}`);
    return 0;
  }

  if (analysis.affectedAreas.size > 0) {
    console.log(`${colors.cyan}🔍 Affected areas: ${Array.from(analysis.affectedAreas.keys()).join(', ')}${colors.reset}`);
  }

  const updatedFiles: string[] = [];

  // Update README if needed
  if (analysis.needsReadmeUpdate) {
    if (updateReadme(analysis)) {
      updatedFiles.push('README.md');
    }
  }

  // Update documentation files
  const docFiles = updateDocumentation(analysis);
  updatedFiles.push(...docFiles);

  // Stage all updated files
  if (updatedFiles.length > 0) {
    stageFiles(updatedFiles);
    console.log(`${colors.green}✅ Documentation updated successfully${colors.reset}`);
    console.log(`${colors.cyan}   Updated files: ${updatedFiles.join(', ')}${colors.reset}\n`);
  } else {
    console.log(`${colors.green}✅ No documentation updates required${colors.reset}\n`);
  }

  return 0;
}

// Run the script
process.exit(main());
