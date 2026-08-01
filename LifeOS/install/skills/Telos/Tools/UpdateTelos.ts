#!/usr/bin/env bun
/**
 * update-telos - Update TELOS life context with automatic backups and change tracking
 *
 * This command manages updates to the TELOS life context files, ensuring:
 * - Automatic timestamped backups before any modification
 * - Change tracking in updates.md
 * - Complete version history
 *
 * Usage:
 *   update-telos <file> "<content>" "<change-description>" [--section "<heading>"]
 *
 * Example:
 *   update-telos BOOKS.md "- Project Hail Mary by Andy Weir" "Added new favorite book"
 *   update-telos TELOS.md "### Capture\n\nOne gesture..." "Added capture ideal state" --section "Ideal State"
 *
 * Without --section, content appends at EOF (above a trailing italic footer when
 * the file has one). With --section, content lands at the END of the named
 * section — TELOS.md is section-structured, so an EOF append would file an
 * Ideal State entry under Changelog. Fails closed when the section is absent.
 *
 * Files that can be updated:
 * - BELIEFS.md - Core beliefs and world model
 * - BOOKS.md - Favorite books
 * - CHALLENGES.md - Current challenges
 * - FRAMES.md - Mental frames and perspectives
 * - GOALS.md - Life goals
 * - LESSONS.md - Lessons learned
 * - MISSION.md - Life mission
 * - MODELS.md - Mental models
 * - MOVIES.md - Favorite movies
 * - NARRATIVES.md - Personal narratives
 * - PREDICTIONS.md - Predictions about the future
 * - PROBLEMS.md - Problems to solve
 * - PROJECTS.md - Active projects
 * - STRATEGIES.md - Strategies being employed
 * - TELOS.md - Main TELOS document
 * - TRAUMAS.md - Past traumas
 * - WISDOM.md - Accumulated wisdom
 * - WRONG.md - Things I was wrong about
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { getPrincipal } from '../../../hooks/lib/identity';

const TELOS_DIR = join(process.env.HOME!, '.claude', 'LIFEOS', 'USER', 'TELOS');
const BACKUPS_DIR = join(TELOS_DIR, 'Backups');
// Changelog file: prefer whichever casing already exists (older installs used
// 'Updates.md'; the docs and scaffold use 'updates.md'), so case-sensitive
// filesystems never fork the changelog into two files (public issue #1452).
// When neither exists it is created lazily as lowercase 'updates.md'.
function resolveUpdatesFile(): string {
  const lower = join(TELOS_DIR, 'updates.md');
  const upper = join(TELOS_DIR, 'Updates.md');
  if (existsSync(lower)) return lower;
  if (existsSync(upper)) return upper;
  return lower;
}

// Valid TELOS files
const VALID_FILES = [
  'BELIEFS.md', 'BOOKS.md', 'CHALLENGES.md', 'FRAMES.md', 'GOALS.md',
  'LESSONS.md', 'MISSION.md', 'MODELS.md', 'MOVIES.md', 'NARRATIVES.md',
  'PREDICTIONS.md', 'PROBLEMS.md', 'PROJECTS.md', 'STRATEGIES.md',
  'TELOS.md', 'TRAUMAS.md', 'WISDOM.md', 'WRONG.md'
];

function getLocalTimestamp(): string {
  const now = new Date();
  const principal = getPrincipal();
  const timezone = principal.timezone || 'UTC';
  const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));

  const year = localTime.getFullYear();
  const month = String(localTime.getMonth() + 1).padStart(2, '0');
  const day = String(localTime.getDate()).padStart(2, '0');
  const hours = String(localTime.getHours()).padStart(2, '0');
  const minutes = String(localTime.getMinutes()).padStart(2, '0');
  const seconds = String(localTime.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function getLocalDateForLog(): string {
  const now = new Date();
  const principal = getPrincipal();
  const timezone = principal.timezone || 'UTC';
  const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));

  const year = localTime.getFullYear();
  const month = String(localTime.getMonth() + 1).padStart(2, '0');
  const day = String(localTime.getDate()).padStart(2, '0');
  const hours = String(localTime.getHours()).padStart(2, '0');
  const minutes = String(localTime.getMinutes()).padStart(2, '0');
  const seconds = String(localTime.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} (${timezone})`;
}

/**
 * Insert `content` at the END of the section whose heading starts with
 * `section` (case-insensitive, hashes stripped — so "Ideal State" matches
 * "## Ideal State (The IDEAL in ...)"). A section ends at the next heading of
 * the same or higher level, or at a standalone `---` divider, whichever comes
 * first. Returns null when the section is not found so the caller can fail
 * closed rather than silently appending to the wrong place.
 */
export function insertIntoSection(fileContent: string, section: string, content: string): string | null {
  const lines = fileContent.split('\n');
  const wanted = section.replace(/^#+\s*/, '').trim().toLowerCase();

  let startIdx = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.*)$/);
    if (m && m[2].trim().toLowerCase().startsWith(wanted)) {
      startIdx = i;
      level = m[1].length;
      break;
    }
  }
  if (startIdx === -1) return null;

  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+/);
    if (m && m[1].length <= level) { endIdx = i; break; }
    if (lines[i].trim() === '---') { endIdx = i; break; }
  }

  // Back up over trailing blank lines so the insert sits flush with the last
  // content line, then re-open one blank line of separation.
  let insertAt = endIdx;
  while (insertAt > startIdx + 1 && lines[insertAt - 1].trim() === '') insertAt--;

  const needsTrailingBlank = lines[insertAt] !== undefined && lines[insertAt].trim() !== '';
  const block = ['', ...content.split('\n'), ...(needsTrailingBlank ? [''] : [])];
  lines.splice(insertAt, 0, ...block);
  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);

  const sectionFlag = args.indexOf('--section');
  let section: string | undefined;
  if (sectionFlag !== -1) {
    section = args[sectionFlag + 1];
    if (!section) {
      console.error('❌ --section requires a heading name');
      process.exit(1);
    }
    args.splice(sectionFlag, 2);
  }

  if (args.length < 3) {
    console.error('❌ Usage: update-telos <file> "<content>" "<change-description>" [--section "<heading>"]');
    console.error('\nExample: update-telos BOOKS.md "- New Book Title" "Added favorite book"');
    console.error('\nValid files:', VALID_FILES.join(', '));
    process.exit(1);
  }

  const [filename, content, changeDescription] = args;

  // Validate filename
  if (!VALID_FILES.includes(filename)) {
    console.error(`❌ Invalid file: ${filename}`);
    console.error(`Valid files: ${VALID_FILES.join(', ')}`);
    process.exit(1);
  }

  const targetFile = join(TELOS_DIR, filename);

  // A valid file that isn't scaffolded yet is created as a minimal starter
  // instead of hard-failing — the scaffold ships only a subset of VALID_FILES,
  // and this tool is the sole sanctioned write path (public issue #1452).
  if (!existsSync(targetFile)) {
    const title = filename.replace('.md', '');
    mkdirSync(TELOS_DIR, { recursive: true });
    writeFileSync(targetFile, `# ${title}\n`, 'utf-8');
    console.log(`✅ Created starter file: ${filename}`);
  }

  // Step 1: Create timestamped backup
  const timestamp = getLocalTimestamp();
  const backupFilename = filename.replace('.md', `-${timestamp}.md`);
  const backupPath = join(BACKUPS_DIR, backupFilename);

  try {
    mkdirSync(BACKUPS_DIR, { recursive: true });
    copyFileSync(targetFile, backupPath);
    console.log(`✅ Backup created: ${backupFilename}`);
    // Rolling window: keep the 3 newest backups per file. Git is the durable
    // history; these only cover the gap before the next repo sync (79 stale
    // backups accumulated by 2026-07-12 before this prune existed).
    const prefix = filename.replace('.md', '-');
    const stale = readdirSync(BACKUPS_DIR)
      .filter((f) => f.startsWith(prefix) && f.endsWith('.md'))
      .sort()
      .slice(0, -3);
    for (const f of stale) rmSync(join(BACKUPS_DIR, f));
  } catch (error) {
    console.error(`❌ Failed to create backup: ${error}`);
    process.exit(1);
  }

  // Step 2: Update the target file. TELOS templates end with a `---` +
  // italic-commentary footer; new entries belong in the content list ABOVE
  // that footer, not after it (public issue #1452). Files without the footer
  // shape keep the plain EOF append.
  try {
    const currentContent = readFileSync(targetFile, 'utf-8');
    let updatedContent: string;
    if (section) {
      const sectioned = insertIntoSection(currentContent, section, content);
      if (sectioned === null) {
        console.error(`❌ Section not found in ${filename}: "${section}"`);
        console.error('   Nothing written. Backup remains at Backups/' + backupFilename);
        process.exit(1);
      }
      writeFileSync(targetFile, sectioned, 'utf-8');
      console.log(`✅ Updated: ${filename} (inside section "${section}")`);
      logChange(filename, changeDescription, backupFilename, section);
      return;
    }
    const footerIdx = currentContent.lastIndexOf('\n---\n');
    const footer = footerIdx === -1 ? '' : currentContent.slice(footerIdx);
    if (footerIdx !== -1 && /\n---\n\s*\*[\s\S]*\*\s*$/.test(footer)) {
      const body = currentContent.slice(0, footerIdx).trimEnd();
      updatedContent = body + '\n' + content + '\n' + footer.replace(/^\n/, '\n');
    } else {
      updatedContent = currentContent.trimEnd() + '\n' + content + '\n';
    }
    writeFileSync(targetFile, updatedContent, 'utf-8');
    console.log(`✅ Updated: ${filename}`);
  } catch (error) {
    console.error(`❌ Failed to update file: ${error}`);
    process.exit(1);
  }

  logChange(filename, changeDescription, backupFilename);
}

// Step 3: Update updates.md with change log
function logChange(filename: string, changeDescription: string, backupFilename: string, section?: string) {
  try {
    const logTimestamp = getLocalDateForLog();
    const logEntry = `
## ${logTimestamp}

- **File Modified**: ${filename}${section ? ` (section: ${section})` : ''}
- **Change Type**: Content Addition
- **Description**: ${changeDescription}
- **Backup Location**: \`Backups/${backupFilename}\`

`;

    const updatesFile = resolveUpdatesFile();
    // Create-instead-of-throw: fresh installs ship no changelog file (#1452).
    if (!existsSync(updatesFile)) {
      writeFileSync(updatesFile, '# TELOS Updates\n\nChangelog of TELOS file updates, newest first.\n', 'utf-8');
    }
    const updatesContent = readFileSync(updatesFile, 'utf-8');

    // Insert the new entry after "## Future Changes" section
    const futureChangesMarker = '## Future Changes';
    const insertPosition = updatesContent.indexOf(futureChangesMarker);

    if (insertPosition !== -1) {
      const beforeMarker = updatesContent.substring(0, insertPosition + futureChangesMarker.length);
      const afterMarker = updatesContent.substring(insertPosition + futureChangesMarker.length);

      // Find the end of the "Document all changes below..." line
      const nextLineBreak = afterMarker.indexOf('\n');
      const headerSection = afterMarker.substring(0, nextLineBreak + 1);
      const changesList = afterMarker.substring(nextLineBreak + 1);

      const updatedUpdates = beforeMarker + headerSection + logEntry + changesList;
      writeFileSync(updatesFile, updatedUpdates, 'utf-8');
      console.log(`✅ Change logged in updates.md`);
    } else {
      // Fallback: just append
      const updatedUpdates = updatesContent.trimEnd() + '\n' + logEntry;
      writeFileSync(updatesFile, updatedUpdates, 'utf-8');
      console.log(`✅ Change logged in updates.md (appended)`);
    }
  } catch (error) {
    console.error(`❌ Failed to update updates.md: ${error}`);
    process.exit(1);
  }

  console.log('\n🎯 TELOS update complete!');
  console.log(`   File: ${filename}`);
  console.log(`   Backup: Backups/${backupFilename}`);
  console.log(`   Change: ${changeDescription}`);
}

if (import.meta.main) main();
