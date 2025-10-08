#!/usr/bin/env bun
/**
 * # PAI Command Indexer
 *
 * ## Purpose
 * Generates and maintains a searchable index of all PAI commands.
 * Creates pai-index.json with metadata, descriptions, and usage patterns.
 *
 * ## Usage
 * ```bash
 * # Generate full index
 * bun ${PAI_DIR}/commands/pai-index.md --generate
 * 
 * # Update existing index
 * bun ${PAI_DIR}/commands/pai-index.md --update
 * 
 * # Search commands
 * bun ${PAI_DIR}/commands/pai-index.md --search "keyword"
 * 
 * # List all commands
 * bun ${PAI_DIR}/commands/pai-index.md --list
 * ```
 *
 * ## Index Features
 * - Command metadata (type, purpose, usage)
 * - Full-text search capabilities
 * - Dependency tracking
 * - Last modified timestamps
 * - Health status indicators
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { join, basename, extname } from 'path';
import { homedir } from 'os';

interface CommandIndex {
  metadata: IndexMetadata;
  commands: CommandEntry[];
  statistics: IndexStatistics;
}

interface IndexMetadata {
  version: string;
  generated: string;
  directories: string[];
  totalCommands: number;
}

interface CommandEntry {
  name: string;
  path: string;
  type: 'instructional' | 'executable' | 'hybrid' | 'shell';
  extension: string;
  purpose: string;
  description: string;
  usage: string[];
  tags: string[];
  dependencies: string[];
  lastModified: string;
  size: number;
  health: 'healthy' | 'warning' | 'broken';
  executable: boolean;
}

interface IndexStatistics {
  byType: Record<string, number>;
  byHealth: Record<string, number>;
  totalSize: number;
  averageSize: number;
  lastUpdated: string;
}

function getCommandDirectories(): string[] {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.claude');
  return [
    join(paiDir, 'commands'),
    join(homedir(), '.config', 'ai', 'commands')
  ].filter(existsSync);
}

function extractCommandMetadata(filePath: string): Partial<CommandEntry> {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const metadata: Partial<CommandEntry> = {
    purpose: '',
    description: '',
    usage: [],
    tags: [],
    dependencies: []
  };

  // Extract from JSDoc comments
  const jsdocMatch = content.match(/\/\*\*([\s\S]*?)\*\//);
  if (jsdocMatch) {
    const jsdocContent = jsdocMatch[1];
    
    // Extract purpose
    const purposeMatch = jsdocContent.match(/##?\s*Purpose\s*\n\s*([^\n]+)/i);
    if (purposeMatch) {
      metadata.purpose = purposeMatch[1].trim();
    }
    
    // Extract description  
    const descMatch = jsdocContent.match(/##?\s*Description\s*\n\s*([^\n]+)/i);
    if (descMatch) {
      metadata.description = descMatch[1].trim();
    }
    
    // Extract usage examples
    const usageMatch = jsdocContent.match(/##?\s*Usage\s*\n([\s\S]*?)(?=\n\s*##|\*\/)/i);
    if (usageMatch) {
      const usageText = usageMatch[1];
      const codeBlocks = usageText.match(/```[\s\S]*?```/g) || [];
      metadata.usage = codeBlocks.map(block => 
        block.replace(/```\w*\n?/, '').replace(/```$/, '').trim()
      );
    }
  }

  // Extract from markdown headers (for instructional commands)
  if (!metadata.purpose) {
    const purposeMatch = content.match(/##?\s*Purpose\s*\n([^\n]+)/i);
    if (purposeMatch) {
      metadata.purpose = purposeMatch[1].trim();
    }
  }

  // Extract dependencies (import statements)
  const importMatches = content.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g) || [];
  metadata.dependencies = importMatches.map(imp => 
    imp.match(/from\s+['"]([^'"]+)['"]/)?.[1] || ''
  ).filter(Boolean);

  // Extract tags from comments
  const tagMatches = content.match(/@tags?\s+([^\n]+)/gi) || [];
  metadata.tags = tagMatches.flatMap(match => 
    match.replace(/@tags?\s+/i, '').split(/[,\s]+/).filter(Boolean)
  );

  return metadata;
}

function analyzeCommand(filePath: string): CommandEntry {
  const stats = statSync(filePath);
  const name = basename(filePath, extname(filePath));
  const extension = extname(filePath);
  const content = readFileSync(filePath, 'utf-8');
  const firstLine = content.split('\n')[0] || '';
  
  // Determine type
  let type: CommandEntry['type'] = 'instructional';
  let executable = false;
  
  if (firstLine.startsWith('#!')) {
    executable = true;
    if (extension === '.md') {
      type = 'hybrid';
    } else if (extension === '.sh') {
      type = 'shell';
    } else {
      type = 'executable';
    }
  }
  
  // Determine health
  let health: CommandEntry['health'] = 'healthy';
  if (executable && !content.includes('/**')) {
    health = 'warning'; // Missing documentation
  }
  if (executable && content.includes('# ') && !content.includes('/**')) {
    health = 'broken'; // Raw markdown in executable
  }
  
  const metadata = extractCommandMetadata(filePath);
  
  return {
    name,
    path: filePath,
    type,
    extension,
    purpose: metadata.purpose || `${name} command`,
    description: metadata.description || `${name} command description`,
    usage: metadata.usage || [`bun ${filePath}`],
    tags: metadata.tags || [],
    dependencies: metadata.dependencies || [],
    lastModified: stats.mtime.toISOString(),
    size: stats.size,
    health,
    executable
  };
}

function generateIndex(): CommandIndex {
  const directories = getCommandDirectories();
  const commands: CommandEntry[] = [];
  
  for (const dir of directories) {
    const files = readdirSync(dir);
    const commandFiles = files.filter(file => 
      /\.(md|ts|js|sh)$/.test(file) && !file.startsWith('.')
    );
    
    for (const file of commandFiles) {
      const filePath = join(dir, file);
      try {
        const command = analyzeCommand(filePath);
        commands.push(command);
      } catch (error) {
        console.warn(`Warning: Could not analyze ${filePath}: ${error.message}`);
      }
    }
  }
  
  // Generate statistics
  const byType: Record<string, number> = {};
  const byHealth: Record<string, number> = {};
  let totalSize = 0;
  
  for (const cmd of commands) {
    byType[cmd.type] = (byType[cmd.type] || 0) + 1;
    byHealth[cmd.health] = (byHealth[cmd.health] || 0) + 1;
    totalSize += cmd.size;
  }
  
  const statistics: IndexStatistics = {
    byType,
    byHealth,
    totalSize,
    averageSize: commands.length > 0 ? Math.round(totalSize / commands.length) : 0,
    lastUpdated: new Date().toISOString()
  };
  
  return {
    metadata: {
      version: '1.0.0',
      generated: new Date().toISOString(),
      directories,
      totalCommands: commands.length
    },
    commands: commands.sort((a, b) => a.name.localeCompare(b.name)),
    statistics
  };
}

function saveIndex(index: CommandIndex, outputPath?: string) {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.claude');
  const indexPath = outputPath || join(paiDir, 'pai-index.json');
  
  writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`✅ Index saved to: ${indexPath}`);
  console.log(`📊 Indexed ${index.metadata.totalCommands} commands`);
}

function loadIndex(): CommandIndex | null {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.claude');
  const indexPath = join(paiDir, 'pai-index.json');
  
  if (!existsSync(indexPath)) {
    return null;
  }
  
  try {
    const content = readFileSync(indexPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`Warning: Could not load index: ${error.message}`);
    return null;
  }
}

function searchCommands(query: string, index: CommandIndex): CommandEntry[] {
  const searchTerm = query.toLowerCase();
  
  return index.commands.filter(cmd => 
    cmd.name.toLowerCase().includes(searchTerm) ||
    cmd.purpose.toLowerCase().includes(searchTerm) ||
    cmd.description.toLowerCase().includes(searchTerm) ||
    cmd.tags.some(tag => tag.toLowerCase().includes(searchTerm))
  );
}

function printCommandList(commands: CommandEntry[], detailed: boolean = false) {
  console.log(`\n📋 Found ${commands.length} commands:\n`);
  
  for (const cmd of commands) {
    const healthIcon = cmd.health === 'healthy' ? '✅' : 
                      cmd.health === 'warning' ? '⚠️' : '❌';
    const typeIcon = cmd.type === 'hybrid' ? '🔗' :
                     cmd.type === 'executable' ? '⚡' :
                     cmd.type === 'shell' ? '🐚' : '📄';
    
    console.log(`${healthIcon} ${typeIcon} ${cmd.name}`);
    console.log(`   ${cmd.purpose}`);
    
    if (detailed) {
      console.log(`   📁 ${cmd.path}`);
      console.log(`   🏷️  ${cmd.tags.join(', ') || 'No tags'}`);
      console.log(`   📏 ${cmd.size} bytes`);
      console.log(`   📅 ${new Date(cmd.lastModified).toLocaleDateString()}`);
    }
    console.log();
  }
}

function printStatistics(index: CommandIndex) {
  console.log('\n📊 PAI Command Statistics:');
  console.log('='.repeat(30));
  console.log(`Total Commands: ${index.metadata.totalCommands}`);
  console.log(`Directories: ${index.metadata.directories.length}`);
  console.log(`Total Size: ${(index.statistics.totalSize / 1024).toFixed(1)} KB`);
  console.log(`Average Size: ${(index.statistics.averageSize / 1024).toFixed(1)} KB`);
  
  console.log('\nBy Type:');
  for (const [type, count] of Object.entries(index.statistics.byType)) {
    console.log(`  ${type}: ${count}`);
  }
  
  console.log('\nBy Health:');
  for (const [health, count] of Object.entries(index.statistics.byHealth)) {
    const icon = health === 'healthy' ? '✅' : health === 'warning' ? '⚠️' : '❌';
    console.log(`  ${icon} ${health}: ${count}`);
  }
  
  console.log(`\nLast Updated: ${new Date(index.statistics.lastUpdated).toLocaleString()}`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--generate')) {
    console.log('🔄 Generating PAI command index...');
    const index = generateIndex();
    saveIndex(index);
    printStatistics(index);
    return;
  }
  
  if (args.includes('--update')) {
    console.log('🔄 Updating PAI command index...');
    const index = generateIndex();
    saveIndex(index);
    console.log('✅ Index updated successfully');
    return;
  }
  
  const searchQuery = args.find(arg => arg.startsWith('--search='))?.split('=')[1];
  if (searchQuery) {
    const index = loadIndex();
    if (!index) {
      console.error('❌ No index found. Run with --generate first.');
      process.exit(1);
    }
    
    const results = searchCommands(searchQuery, index);
    console.log(`🔍 Search results for "${searchQuery}":`);
    printCommandList(results, true);
    return;
  }
  
  if (args.includes('--list')) {
    const index = loadIndex();
    if (!index) {
      console.error('❌ No index found. Run with --generate first.');
      process.exit(1);
    }
    
    const detailed = args.includes('--detailed');
    printCommandList(index.commands, detailed);
    printStatistics(index);
    return;
  }
  
  // Default: show help
  console.log(`
🔍 PAI Command Indexer

Usage:
  bun pai-index.md --generate          Generate new index
  bun pai-index.md --update            Update existing index  
  bun pai-index.md --list              List all commands
  bun pai-index.md --list --detailed   List with details
  bun pai-index.md --search=keyword    Search commands

Examples:
  bun pai-index.md --generate
  bun pai-index.md --search=finance
  bun pai-index.md --list --detailed
`);
}

main();
