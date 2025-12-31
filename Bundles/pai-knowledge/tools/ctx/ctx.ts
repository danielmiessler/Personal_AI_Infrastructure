#!/usr/bin/env bun

/**
 * ctx - Context Management CLI for PAI
 *
 * Manages a markdown-based knowledge vault with semantic search,
 * taxonomy-driven tagging, and cultivation workflows.
 *
 * Commands:
 *   search    Search notes by tag or text
 *   read      Read a note's content
 *   write     Write a new note to the vault
 *   tags      List all tags in the vault
 *   embed     Build/update vector embeddings (future)
 *   semantic  Semantic search (future)
 */

import { parseArgs } from "util";
import { homedir } from "os";
import { join, basename, dirname } from "path";
import { existsSync, mkdirSync, writeFileSync, readFileSync, renameSync, unlinkSync } from "fs";
import { searchNotes, SearchOptions, ScopeFilter, parseSince } from "./lib/search";
import { readNote } from "./lib/read";
import { writeNote, WriteOptions } from "./lib/write";
import { listTags, addTagToNote, removeTagFromNote, resolveNotePath, suggestParaClassification } from "./lib/tags";
import { parseNote, parseNoteContent, generateFrontmatter } from "./lib/parse";
import { getConfig } from "./lib/config";
import { buildEmbeddings, semanticSearch, getEmbeddingStats, ScopeFilter as EmbedScopeFilter, SemanticSearchOptions } from "./lib/embed";
import { rebuildTagIndex, getTagIndexStats, isTagIndexAvailable } from "./lib/tag-index";
import {
  toIndexedResults,
  toSemanticIndexedResults,
  formatIndexTable,
  formatIndexJson,
  saveSearchIndex,
  loadSearchIndex,
  loadBySelection,
  formatLoadSummary,
  parseSelection,
  SearchIndex,
  IndexedResult,
} from "./lib/index";
import {
  loadTaxonomy,
  listTaxonomies,
  getDefaultTaxonomy,
  validateTag,
  validateTags,
  suggestFix,
  TaxonomySchema,
} from "./lib/taxonomy";
import {
  loadMigrationRules,
  getDefaultRules,
  migrateTag,
  applyMigration,
  getRulesForPhase,
  MigrationPhase,
  MigrationRules,
} from "./lib/migration";
import {
  inferTags,
  inferFromContent,
  inferFromSource,
  SourceType,
} from "./lib/inference";
import {
  findDuplicateClusters,
  generateConsolidationRules,
  formatConsolidationRulesYaml,
  TagWithCount,
} from "./lib/tag-similarity";
import {
  prepareMigration,
  executeMigration,
  finalizeMigration,
  abortMigration,
  getMigrationStatus,
  cleanupMigrationBranches,
  listMigrationBranches,
  MigrationState,
} from "./lib/git-migration";
import {
  findLargeFiles,
  findBrokenLinks,
  findOrphans,
  calculateStorage,
  generateHealthReport,
  cleanCache,
  formatBytes,
  LargeFile,
  BrokenLink,
  OrphanNote,
  StorageStats,
  HealthReport,
} from "./lib/maintain";
import {
  getParaHelp,
  getZkHelp,
  getLuhmannHelp,
  getFabricHelp,
  getMethodologyHelp,
  getAvailableMethodologies,
  getWeaveParaHelp,
  getWeaveZkHelp,
} from "./lib/methodology-help";
import {
  startFlashcardSession,
  startFlashcardSessionFromPaths,
  getCurrentNote,
  nextNote,
  prevNote,
  markCompleted,
  markSkipped,
  renderFlashcard,
  renderFlashcardWithConnections,
  renderZettelkastenFlashcard,
  suggestConnections,
  addTag,
  removeTag,
  parseFilterOptions,
  detectMultipleIdeas,
  generateAtomicSplitSuggestion,
  suggestConnectionType,
  FlashcardSession,
  FlashcardNote,
  ConnectionSuggestion,
  FilterOptions,
} from "./lib/flashcard";
import {
  generateSessionSummary,
  formatSessionSummary,
  calculateGrowthMetrics,
  formatGrowthMetrics,
  analyzeIdentitySignals,
  formatIdentitySignals,
  generateHealthReport as generateKnowledgeHealthReport,
  formatHealthReport as formatKnowledgeHealthReport,
  archiveWithLineage,
  SessionSummary,
  GrowthMetrics,
  IdentitySignal,
  HealthReport as KnowledgeHealthReport,
} from "./lib/legacy";
import {
  loadPracticeState,
  savePracticeState,
  recordPracticeCompletion,
  getPracticeStatus,
  getAllPracticeStatuses,
  getOverduePractices,
  formatPracticeStatus,
  formatAllPracticeStatuses,
  formatOverdueNudge,
  getCompletionMessage,
  PRACTICE_CADENCES,
  PracticeType,
  PracticeStatus,
} from "./lib/practices";
import {
  startSession,
  endSession,
  hasActiveSession,
  getActiveSession,
  getSessionIndicator,
  formatSessionStatus,
  generateSessionTag,
  resumeSession,
  getInterruptedSession,
  canResumeSession,
} from "./lib/session-awareness";
import {
  createSweepSession,
  loadSweepSession,
  saveSweepSession,
  clearSweepSession,
  archiveCurrentSession,
  hasActiveSweepSession,
  resolveNoteRef,
  updateQueueItemPath,
  getSweepProgress,
  markItemDeleted,
  markItemDone,
} from "./lib/sweep-session";
import {
  createDerivedNote,
  getDerivedNoteName,
  processWithFabric,
  weaveWithFabric,
  RECOMMENDED_PATTERNS,
} from "./lib/fabric-weave";
import {
  createSessionNote,
  calculateDurationMinutes,
  SessionMetadata,
} from "./lib/session-notes";
import {
  findLargeFiles as findLargeMdFiles,
  findPoorlyNamedNotes,
  parseTimeFilter,
  renameNote,
  formatSize,
  LargeFile as LargeMdFile,
  PoorlyNamedNote,
  suggestNamesForNotes,
  formatNameSuggestion,
  NameSuggestion,
  checkNoteNameAndSuggest,
  generateNamingSummary,
  detectContentSource,
} from "./lib/sweep-enhancements";
import {
  getSweepOverviewStats,
  formatOverviewStats,
} from "./lib/sweep-overview";

// ============================================================================
// Help System
// ============================================================================

const HELP = `
ctx - Context Management CLI for PAI

USAGE:
  ctx <command> [options]
  ctx help [topic]           Show help for specific topic

COMMANDS:
  search     Search notes by tag or text (discovery phase)
  semantic   Semantic search using embeddings (discovery phase)
  load       Load notes from last search by selection (injection phase)
  read       Read a specific note's content
  write      Write a new note to the vault
  rename     Rename a note (updates filename and internal links)
  archive    Archive a note (adds status/archived tag)
  clean      Clean markdown artifacts from a note
  tag        Add or remove tags from notes
  tags       List all tags in the vault
  incoming   List notes waiting to be processed (#incoming tag)
  context    Load context for a project (shortcut for tag search)
  embed      Build/update vector embeddings
  config     Show current configuration
  taxonomy   Manage tag taxonomies (list, info, switch)
  validate   Validate vault notes against taxonomy
  stats      Tag statistics and coverage reports
  suggest-tags  Suggest tags for a note using AI inference
  graph      Knowledge graph analysis (clusters, orphans, suggest-links)
  maintain   Vault maintenance (clean-suffixes, clean-tests)
  help       Show detailed help (see topics below)

CULTIVATION PRACTICES (6 Horizons):
  sweep      🧹 Daily inbox triage (5-15 min)
  weave      🧵 Weekly connection building (30 min)
  dive       🔬 Deep topic exploration (1-2 hours, as needed)
  survey     🗺️ Monthly landscape review (1 hour)
  compass    🧭 Quarterly direction check (half-day)
  mirror     🪞 Annual reflection (full day)

CULTIVATION TOOLS:
  session    Manage cultivation sessions (start, status, resume)
  cultivate  Cultivation backlog and insights
  practice   Practice status and streaks

SEARCH OPTIONS:
  --tag, -t <tag>        Filter by tag (can use multiple, AND logic)
  --any-tag <tag>        Filter by tag (can use multiple, OR logic)
  --not-tag <tag>        Exclude notes with this tag
  --dimension, -d <dim>  Filter by dimension (notes with any tag in dimension)
  --type <type>          Filter by type (transcript, meeting, wisdom, note, etc.)
  --text, -x <query>     Full-text search
  --recent, -r <n>       Limit to N most recent notes
  --format <fmt>         Output format: list, index (table), json (for Claude)
  --since <when>         Filter by capture date (frontmatter generation_date)
                         - "7d", "2w", "1m" - relative (days/weeks/months)
                         - "today", "yesterday", "this week", "this month"
                         - "2025-12-01" - ISO date
  --modified <when>      Filter by file modification time (same formats as --since)
  --created <when>       Filter by file creation time (same formats as --since)
  --untagged             Find notes without tags
  --scope <scope>        Scope filter: work (default), private, all

SEMANTIC OPTIONS:
  <query>                Natural language search query
  --limit, -l <n>        Limit results (default: 10)
  --format <fmt>         Output format: list (default), index (numbered for load)
  --scope <scope>        Scope filter: work (default), private, all
  --tag, -t <tag>        Filter to notes with this tag (can use multiple, AND logic)
  --any-tag <tag>        Filter to notes with any of these tags (OR logic)
  --doc, -d <pattern>    Filter by document name pattern (glob: * = any, ? = single char)

LOAD OPTIONS (from last search):
  <selection>            Numbers to load: "all", "1,2,5", "1-5", "1,3-5,10"
  --tag <tag>            Load by tag (can use multiple, AND logic)
  --any-tag <tag>        Load by tag (can use multiple, OR logic)
  --type <type>          Load by type: transcript, meeting, note, wisdom, etc.
  --since <date>         Load notes from date (YYYY-MM-DD)

CONTEXT OPTIONS:
  <project>              Project name (searches project/<name> tag)
  --recent, -r <n>       Limit results (default: 20)
  --format <fmt>         Output format: list (default), index (numbered)

TAG OPTIONS:
  tag add <note> <tag>      Add a tag to a note
  tag remove <note> <tag>   Remove a tag from a note
  tag migrate [options]     Migrate tags to new taxonomy
    --dry-run               Preview changes without modifying (SAFE)
    --preview <tags>        Preview migration for specific tags (SAFE)
    --execute               Actually run the migration (MODIFIES FILES)
    --phase <phase>         Run specific phase: garbage, system, prefixes, consolidate

  Note selectors:
    - Index from last search: ctx tag add 3 architecture
    - Note name: ctx tag add "My Note" project/pai
    - Full path: ctx tag add /path/to/note.md todo

TAXONOMY OPTIONS:
  taxonomy list             List available taxonomies
  taxonomy info [name]      Show taxonomy details (default: active)
  taxonomy validate <tags>  Validate tags against taxonomy
  taxonomy suggest <tag>    Suggest fix for invalid tag

VALIDATE OPTIONS:
  --missing-required        Report notes missing required dimensions
  --invalid                 Report notes with invalid tags
  --recent <n>             Limit to N most recent notes
  --format <fmt>           Output format: list (default), json

STATS OPTIONS:
  ctx stats tags           Show tag usage counts
    --by-dimension         Group by taxonomy dimension
  ctx stats coverage       Show dimension coverage report
  ctx stats legacy         Knowledge base health report (permanent notes, hubs, orphans)

SWEEP OPTIONS:
  ctx sweep [--limit <n>]      Show inbox notes for triage (default view)
  ctx sweep <ids>              Review specific notes (e.g., 1,3,5 or all)
  --stats                      Show stats only (no note listing)
  --no-stats                   Skip stats header
  --suggest-names              Show notes needing better names
  --auto                       Bulk process inbox (titles + tags)
  --auto-rename                Auto-rename with high-confidence suggestions
  --dry-run                    Preview changes without applying
  --confidence <level>         Filter: high (>=0.85), medium (>=0.70), all
  --health                     Run vault health dashboard
  --orphans                    Find orphan notes (no incoming/outgoing links)
  --broken-links               Find broken internal links
  --storage                    Storage usage report
  --cache-cleanup              Clean stale cache files

MAINTAIN SUBCOMMANDS:
  ctx maintain health          Vault health dashboard
  ctx maintain large-files     Find large files in vault
  ctx maintain broken-links    Find broken internal links
  ctx maintain orphans         Find orphan notes
  ctx maintain storage         Storage usage report
  ctx maintain cache-cleanup   Clean stale cache files
  ctx maintain clean-suffixes  Remove legacy -Telegram/-Raw suffixes [--execute]
  ctx maintain clean-tests     Delete test fixture notes [--execute]

RENAME / ARCHIVE / CLEAN:
  ctx rename <path> --to "New Name"    Rename note and update links
  ctx archive <id|path>                Add status/archived tag [--move]
  ctx clean <path>                     Clean markdown artifacts from note

EXAMPLES:
  # Two-phase context retrieval
  ctx search --tag project/pai --format index    # Discovery: numbered list
  ctx semantic "deployment" --format index       # Discovery: semantic search
  ctx load 1,2,5                                 # Injection: load selected
  ctx load all                                   # Injection: load everything
  ctx load --type transcript                     # Injection: filter by type
  ctx load --tag architecture                    # Injection: filter by tag

  # Semantic search with filters (NEW)
  ctx semantic "what did John say" --tag project/acme
  ctx semantic "architecture concerns" --doc "2025-12-08-Architecture*"
  ctx semantic "compliance" --tag project/acme --tag compliance

  # Project context
  ctx context pai --format index                 # Discovery + numbered
  ctx context my-project --recent 10

  # Basic search
  ctx search --tag meeting-notes --tag person/john_smith
  ctx search --text "kubernetes" --not-tag incoming
  ctx incoming --recent 20

  # Read/Write
  ctx read "2024-06-10-Meeting"
  ctx write "My Note" --tags "incoming,project/pai"

  # Embeddings
  ctx embed --verbose
  ctx semantic "deployment strategies"

  # Tag management
  ctx tag add 3 architecture                 # Add tag to note #3 from last search
  ctx tag add "My Note" project/pai          # Add tag by note name
  ctx tag remove 3 incoming                  # Remove tag from note

  # Taxonomy management
  ctx taxonomy list                          # List available taxonomies
  ctx taxonomy info                          # Show current taxonomy details
  ctx taxonomy validate "type/fleeting,topic/ai"  # Validate tags

  # Tag migration
  ctx tag migrate --preview "raw,ai,incoming"     # Preview specific tag migrations
  ctx tag migrate --dry-run                       # Preview all migration rules
  ctx tag migrate --execute --phase garbage       # Run garbage cleanup phase

  # Sweep (daily inbox triage)
  ctx sweep                                       # Show inbox overview + stats
  ctx sweep 1,3,5                                 # Review specific notes
  ctx sweep --auto --dry-run                      # Preview auto-processing
  ctx sweep --auto --confidence high              # Apply high-confidence fixes
  ctx sweep --suggest-names                       # Show notes needing names

  # Maintenance
  ctx maintain health                             # Vault health dashboard
  ctx maintain clean-suffixes                     # Preview suffix cleanup
  ctx maintain clean-suffixes --execute           # Apply suffix cleanup
  ctx maintain clean-tests --execute              # Delete test fixtures

  # Note operations
  ctx rename "/path/to/note.md" --to "Better Name"
  ctx archive 3                                   # Archive note #3 from search
  ctx clean "/path/to/note.md"                    # Clean markdown artifacts

HELP TOPICS:
  ctx help concepts          Learn about Zettelkasten, PARA, and the 11 dimensions
  ctx help examples          Practical workflow examples and use cases
  ctx help search            Detailed search and filtering guide
  ctx help cultivation       Cultivation workflow and best practices
  ctx help taxonomy          Understanding and managing taxonomies
  ctx help tutorial          Interactive getting started guide
`;

const HELP_CONCEPTS = `
┌────────────────────────────────────────────────────────────────────────────┐
│                        CTX KNOWLEDGE MANAGEMENT CONCEPTS                   │
└────────────────────────────────────────────────────────────────────────────┘

This tool implements a hybrid knowledge management system combining three
powerful methodologies:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 ZETTELKASTEN (German: "slip box")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A method for networked thought based on atomic notes and organic connections:

  Atomic Notes     Each note contains ONE idea, fully expressed
                   Makes notes reusable and recombineable
                   Easier to find and understand later

  Progressive      #incoming → #fleeting → #permanent
  Refinement       Raw capture → Quick notes → Polished insights
                   Notes evolve as understanding deepens

  Links Are        The value is in the CONNECTIONS between notes
  Everything       Use wiki-links [[like this]] liberally
                   Backlinks show how ideas relate
                   Emergent structure beats rigid hierarchy

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 PARA METHOD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Organize by actionability, not by topic:

  Projects         Active work with clear outcomes and deadlines
                   #project/pai, #project/acme
                   Archive when complete

  Areas            Ongoing responsibilities without end dates
                   #area/engineering, #area/leadership
                   Maintain indefinitely

  Resources        Reference material for potential future use
                   #resource/ai, #resource/security
                   Passive knowledge base

  Archive          Inactive projects and outdated information
                   #status/archived
                   Keep for reference, exclude from searches

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏷️  THE 11 DIMENSIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each note is described by tags across multiple dimensions:

  Required         Every note needs these for findability:
  Dimensions
                   type/*        What kind of note?
                                 transcript, meeting, wisdom, note

                   status/*      Where in the lifecycle?
                                 incoming, fleeting, permanent, archived

                   source/*      Where did this come from?
                                 telegram, meeting, book, article

  Organizational   At least one for context:
  Dimensions
                   project/*     Active work items
                   area/*        Ongoing responsibilities
                   resource/*    Reference topics

  Descriptive      Zero or more for richness:
  Dimensions
                   topic/*       What domains? (ai, security, leadership)
                   person/*      Who's involved?
                   company/*     Which organization?
                   tool/*        Technologies mentioned
                   location/*    Geographic context

  Special          Meta-organization:
  Dimensions
                   scope/*       work vs private (privacy boundary)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌱 NOTE LIFECYCLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Notes flow through stages as they're refined:

  1. Capture      Quick save with #incoming, #status/incoming
                  Get it out of your head fast
                  Don't worry about quality yet

  2. Cultivate    Process with #status/fleeting
                  Add tags, extract key insights
                  Split into atomic notes if needed
                  Use: ctx cultivate backlog

  3. Connect      Link with #status/permanent
                  Add wiki-links to related notes
                  Write in your own words
                  Use: ctx graph suggest-links

  4. Create       Synthesize into new permanent notes
                  Combine insights into new understanding
                  Write longer-form content
                  Build on your network of knowledge

WHY THIS WORKS:

  Zettelkasten gives you the METHOD (atomic notes + links)
  PARA gives you the STRUCTURE (organize by actionability)
  11 Dimensions give you FINDABILITY (multi-faceted tags)
  Note lifecycle gives you the WORKFLOW (capture to connect to create)

NEXT STEPS:
  ctx help examples         See these concepts in practice
  ctx help cultivation      Deep dive on the cultivation workflow
  ctx help taxonomy         Understanding tag schemas
`;

const HELP_EXAMPLES = `
┌────────────────────────────────────────────────────────────────────────────┐
│                        WORKFLOW EXAMPLES & USE CASES                       │
└────────────────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 SCENARIO 1: Starting Your Day
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Goal: Process inbox and load context for today's work

  # 1. Check what needs processing
  $ ctx incoming --recent 20

  # 2. Cultivate new notes (add tags, extract insights)
  $ ctx cultivate backlog --limit 5

  # 3. Load context for your project
  $ ctx context my-project --format index
  [1] 2025-12-08 - Architecture Discussion (transcript)
  [2] 2025-12-07 - Compliance Requirements (meeting)
  [3] 2025-12-05 - ML Model Notes (note)

  # 4. Inject selected notes into your AI session
  $ ctx load 1,2
  Loaded 2 notes (4,823 tokens)
  Your AI now has project context!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 SCENARIO 2: Research & Discovery
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Goal: Find all notes related to a specific topic or question

  # Natural language semantic search
  $ ctx semantic "what did we decide about the deployment strategy"

  # Combine semantic search with filters
  $ ctx semantic "security concerns" --tag project/acme

  # Search within specific documents
  $ ctx semantic "compliance" --doc "2025-12-08-Architecture*"

  # Complex tag-based search
  $ ctx search --tag topic/security --tag project/pai \\
      --not-tag status/archived --format index

  # Time-bounded search
  $ ctx search --tag area/engineering --since "this week"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌱 SCENARIO 3: Cultivation Workflow
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Goal: Transform raw captures into valuable permanent notes

  # Start a cultivation session
  $ ctx session start

  # See what needs processing
  $ ctx cultivate backlog --limit 10
  [1] Long meeting transcript (3,492 words)
  [2] Telegram message dump (834 words)
  [3] Quick voice note (127 words)

  # AI suggests splitting large notes
  $ ctx cultivate daily-split
  Analyzes notes, suggests atomic splits
  You approve/reject suggestions
  Auto-creates split notes with proper tags

  # Get AI insights on a note
  $ ctx cultivate insights 1
  Key themes identified
  Action items extracted
  Related notes suggested
  Tag recommendations

  # Add tags to processed notes
  $ ctx tag add 1 "topic/architecture,status/permanent"

  # Find connection opportunities
  $ ctx graph suggest-links 1
  Shows related notes
  Suggests wiki-links to add
  Reveals knowledge clusters

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏗️  SCENARIO 4: Project Context Management
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Goal: Gather and inject all relevant notes for a project

  # Quick project context load
  $ ctx context pai --format index
  $ ctx load all

  # More selective project search
  $ ctx search --tag project/pai --tag topic/architecture \\
      --not-tag status/archived --format index
  [1-10 results shown...]

  # Load only meetings from the last week
  $ ctx load --type meeting --since "7d"

  # Load transcripts and notes together
  $ ctx load --any-tag type/transcript,type/note

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 SCENARIO 5: Knowledge Graph Exploration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Goal: Discover connections and knowledge clusters

  # Find knowledge clusters
  $ ctx graph clusters
  Cluster 1: AI/ML Project (12 notes)
    High interconnection around topic/ai
  Cluster 2: Security Work (8 notes)
    Centered on project/security-audit

  # Find isolated notes that need connecting
  $ ctx graph orphans
  [1] 2025-12-01 - Random Thought (0 connections)
  [2] 2025-11-28 - Quick Note (1 connection)

  # Get suggestions for linking a note
  $ ctx graph suggest-links 1
  Suggested connections for "Architecture Discussion":
    [2] "Deployment Strategy" (3 shared tags)
    [5] "Security Requirements" (89% semantic similarity)
    [8] "Team Meeting Notes" (linked by person/john)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏷️  SCENARIO 6: Tag Management
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Goal: Maintain clean, consistent tagging

  # Get AI tag suggestions for a note
  $ ctx suggest-tags 1
  Analyzing "Architecture Discussion"...
  Suggested tags:
    - topic/architecture (high confidence)
    - topic/security (medium confidence)
    - tool/kubernetes (mentioned 5 times)

  # Validate tags against your taxonomy
  $ ctx validate --invalid --recent 20
  Found 3 notes with invalid tags:
    [1] Uses "arch" - Did you mean "topic/architecture"?
    [2] Uses "k8s" - Did you mean "tool/kubernetes"?

  # Migrate old tags to new taxonomy
  $ ctx tag migrate --preview "raw,arch,k8s"
  Would migrate:
    raw to status/incoming (garbage cleanup)
    arch to topic/architecture (consolidation)
    k8s to tool/kubernetes (consolidation)

  $ ctx tag migrate --execute --phase consolidate
  Runs migration, updates all affected notes

  # Check tag coverage
  $ ctx stats coverage
  Dimension Coverage Report:
    type/*     : 100% (456/456 notes)
    status/*   : 98%  (448/456 notes) - 8 missing
    source/*   : 95%  (433/456 notes)
    project/*  : 67%  (305/456 notes)

KEY PATTERNS TO LEARN:

  1. Two-phase workflow: SEARCH then LOAD
     First, discover what you need (numbered index)
     Then, inject selected notes into your AI session

  2. Combine filters for precision
     Tags + semantic search + time bounds = powerful queries

  3. Cultivate regularly
     Don't let #incoming pile up
     5-10 notes per day keeps knowledge flowing

  4. Let the graph emerge
     Don't force structure upfront
     Add connections as you see them
     Use graph tools to find opportunities

NEXT STEPS:
  ctx help cultivation      Deep dive on cultivation workflow
  ctx help search           Complete search and filtering reference
  ctx help tutorial         Interactive walkthrough
`;

const HELP_SEARCH = `
┌────────────────────────────────────────────────────────────────────────────┐
│                     SEARCH & FILTERING COMPLETE GUIDE                      │
└────────────────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 TAG-BASED SEARCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # Single tag
  $ ctx search --tag project/pai

  # Multiple tags (AND logic - note must have ALL tags)
  $ ctx search --tag project/pai --tag topic/architecture

  # Any tag (OR logic - note must have AT LEAST ONE tag)
  $ ctx search --any-tag topic/ai,topic/ml,topic/security

  # Exclude tags
  $ ctx search --tag project/pai --not-tag status/archived

  # Search by dimension (any tag in dimension)
  $ ctx search --dimension topic
  Finds notes with topic/ai, topic/security, topic/*, etc.

  # Search by type (shorthand for type/* dimension)
  $ ctx search --type transcript
  Same as: --tag type/transcript

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 TIME-BASED FILTERING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # Relative time
  $ ctx search --since "7d"              # Last 7 days
  $ ctx search --since "2w"              # Last 2 weeks
  $ ctx search --since "1m"              # Last 1 month

  # Natural language
  $ ctx search --since "today"
  $ ctx search --since "yesterday"
  $ ctx search --since "this week"
  $ ctx search --since "this month"

  # Absolute date
  $ ctx search --since "2025-12-01"

  # Different time dimensions
  $ ctx search --since "7d"              # Frontmatter generation_date
  $ ctx search --modified "7d"           # File modification time
  $ ctx search --created "7d"            # File creation time

  # Combine with tags
  $ ctx search --tag project/pai --since "this week"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 SEMANTIC SEARCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # Natural language query
  $ ctx semantic "what did we decide about deployments"

  # Combine with tag filters
  $ ctx semantic "security concerns" --tag project/pai

  # Filter by document name pattern
  $ ctx semantic "architecture" --doc "2025-12-*"
  $ ctx semantic "meeting notes" --doc "*-Meeting-*"

  # Limit results
  $ ctx semantic "kubernetes" --limit 5

  # Multiple tag filters (AND logic)
  $ ctx semantic "compliance" --tag project/pai --tag topic/security

  # Setup (run once, update periodically)
  $ ctx embed --verbose

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 FULL-TEXT SEARCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # Search content (case-insensitive substring match)
  $ ctx search --text "kubernetes"

  # Combine with tags
  $ ctx search --text "deployment" --tag project/pai

  # Full-text + time filter
  $ ctx search --text "security" --since "this month"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 OUTPUT FORMATS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # Simple list (default)
  $ ctx search --tag project/pai
  Prints note names, one per line

  # Numbered index (for loading)
  $ ctx search --tag project/pai --format index
  [1] 2025-12-08 - Architecture Discussion
  [2] 2025-12-07 - Team Meeting
  [3] 2025-12-05 - Design Notes

  # JSON (for programmatic use)
  $ ctx search --tag project/pai --format json
  Full structured data with paths, tags, etc.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 SCOPE FILTERING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # Work only (default - excludes #scope/private)
  $ ctx search --tag topic/ai
  $ ctx search --tag topic/ai --scope work

  # Private only
  $ ctx search --tag topic/ai --scope private

  # Everything
  $ ctx search --tag topic/ai --scope all

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️  SPECIAL FILTERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # Find untagged notes
  $ ctx search --untagged

  # Limit results
  $ ctx search --tag project/pai --recent 10

  # Incoming notes (shortcut)
  $ ctx incoming
  Same as: ctx search --tag incoming --recent 50

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 LOADING FROM SEARCH RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # Two-phase workflow
  $ ctx search --tag project/pai --format index    # Phase 1: Discovery
  [1] Note A
  [2] Note B
  [3] Note C

  $ ctx load 1,2                                   # Phase 2: Injection
  Loads selected notes into AI context

  # Load all from last search
  $ ctx load all

  # Load by number selection
  $ ctx load 1,2,5           # Specific indices
  $ ctx load 1-5             # Range
  $ ctx load 1,3-5,10        # Mixed

  # Load with filters (from last search)
  $ ctx load --type transcript        # Only transcripts
  $ ctx load --tag topic/security     # Only notes with tag
  $ ctx load --since "7d"             # Only from last week

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 SEARCH PATTERNS & TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. Start broad, then narrow
     $ ctx search --tag project/pai
     Too many? Add more filters:
     $ ctx search --tag project/pai --tag topic/architecture --since "1w"

  2. Use semantic search for questions
     $ ctx semantic "what did John say about the timeline"
     Better than keyword search when you don't know exact terms

  3. Combine tag and semantic search
     $ ctx semantic "deployment concerns" --tag project/pai --since "2w"
     Powerful combo: meaning + structure + time

  4. Use --format index for everything you'll load
     $ ctx search --tag project/pai --format index
     $ ctx load 1,3,5
     Fast workflow for context injection

  5. Exclude archived content by default
     $ ctx search --tag project/pai --not-tag status/archived
     Keep searches focused on active work

  6. Find gaps with --untagged
     $ ctx search --untagged --recent 20
     Catch notes that need processing

NEXT STEPS:
  ctx help examples         See search in real workflows
  ctx help cultivation      Processing found notes
  ctx help concepts         Understanding the tag system
`;

const HELP_CULTIVATION = `
┌────────────────────────────────────────────────────────────────────────────┐
│                      CULTIVATION WORKFLOW GUIDE                            │
└────────────────────────────────────────────────────────────────────────────┘

Cultivation is the practice of transforming raw captures into valuable,
connected permanent notes. This is where Zettelkasten magic happens.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌱 THE CULTIVATION CYCLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. CAPTURE    Get it out of your head (#incoming)
  2. REVIEW     What's in my backlog? (ctx cultivate backlog)
  3. PROCESS    Add structure and tags (ctx suggest-tags, ctx tag add)
  4. ATOMIZE    Split large notes (ctx cultivate daily-split)
  5. ENRICH     Extract insights (ctx cultivate insights)
  6. CONNECT    Link to other notes (ctx graph suggest-links)
  7. PROMOTE    Mark as #status/permanent

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 STARTING A SESSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  $ ctx session start
  Started cultivation session
  Tracks which notes you've processed
  Shows progress and stats
  Resume anytime with 'ctx session status'

  $ ctx session status
  Active session: 12 notes processed, 18 remaining
  See your progress
  Pick up where you left off

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 REVIEWING YOUR BACKLOG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  $ ctx cultivate backlog
  [1] 2025-12-15-Meeting-Transcript (3,492 words, #incoming)
      Long, needs splitting
      No tags beyond #incoming

  [2] 2025-12-14-Telegram-Dump (834 words, #incoming)
      Medium length, processable
      Contains action items

  [3] 2025-12-10-Quick-Note (127 words, #status/fleeting)
      Short, ready for tagging
      Mentions 2 people

  # Focus on recent notes
  $ ctx cultivate backlog --limit 5

  # See older items
  $ ctx cultivate backlog --limit 20

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✂️  ATOMIZING LARGE NOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The Zettelkasten principle: one note = one idea

  $ ctx cultivate daily-split

  Analyzing: 2025-12-15-Meeting-Transcript (3,492 words)

  Suggested splits:
    "Architecture Decision - Microservices" (487 words)
       Tags: topic/architecture, project/pai, status/permanent

    "Action Items - Deploy Timeline" (203 words)
       Tags: type/action-items, project/pai, status/fleeting

    "Discussion - Security Concerns" (612 words)
       Tags: topic/security, project/pai, status/fleeting

  Accept suggestions? [y/n/edit]

  What it does:
    Analyzes note content with AI
    Identifies distinct topics/themes
    Suggests atomic note splits
    Recommends appropriate tags
    Creates new notes with proper frontmatter
    Adds [[wiki-links]] between parent and children

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 EXTRACTING INSIGHTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  $ ctx cultivate insights 1

  Analyzing: "Meeting Discussion"

  KEY THEMES:
    Deployment strategy shift to blue-green
    Security compliance requirements
    Team capacity concerns

  ACTION ITEMS:
    [ ] Update deployment runbook
    [ ] Schedule security audit
    [ ] Hire additional engineer

  MENTIONED:
    People: John, Alice, Bob
    Tools: Kubernetes, Terraform, DataDog
    Projects: Acme Corp, PAI

  SUGGESTED TAGS:
    topic/deployment, topic/security, tool/kubernetes

  RELATED NOTES (semantic similarity):
    [12] "Deployment Architecture" (87% similar)
    [23] "Security Audit Notes" (81% similar)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏷️  ADDING TAGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # Get AI suggestions first
  $ ctx suggest-tags 1
  Suggested: type/meeting, project/pai, topic/architecture, person/john

  # Add multiple tags at once
  $ ctx tag add 1 "type/meeting,project/pai,topic/architecture"

  # Add one at a time
  $ ctx tag add 1 type/meeting
  $ ctx tag add 1 project/pai

  # Validate your tags
  $ ctx taxonomy validate "type/meeting,project/pai"
  All tags valid

  # Fix invalid tags
  $ ctx taxonomy suggest "arch"
  Did you mean: topic/architecture?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 CREATING CONNECTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  $ ctx graph suggest-links 1

  Suggested connections for "Architecture Discussion":

  BY SHARED TAGS (3 shared):
    [2] "Deployment Strategy"
        Shared: project/pai, topic/architecture, tool/kubernetes

  BY SEMANTIC SIMILARITY:
    [5] "Security Requirements" (89% similar)
        Both discuss compliance and audit requirements

  BY SHARED PEOPLE:
    [8] "Team Meeting Notes" (person/john, person/alice)

  RECOMMENDATIONS:
    Add: [[Deployment Strategy]] to section 2
    Add: [[Security Requirements]] when discussing compliance
    Consider: Merge similar content with [2] if redundant

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 COMPLETE WORKFLOW EXAMPLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # Morning routine: 30 minutes of cultivation

  # 1. Start session
  $ ctx session start

  # 2. See what needs work
  $ ctx cultivate backlog --limit 10

  # 3. Split large notes first
  $ ctx cultivate daily-split
  Process 1-2 large notes into atomic pieces

  # 4. Tag 3-5 medium notes
  $ ctx suggest-tags 1
  $ ctx tag add 1 "type/meeting,project/pai,topic/architecture"
  $ ctx tag add 1 status/permanent  # Promote from fleeting

  $ ctx suggest-tags 2
  $ ctx tag add 2 "type/note,topic/security"
  $ ctx tag add 2 status/permanent

  # 5. Extract insights from 1-2 notes
  $ ctx cultivate insights 3
  Read AI analysis, add action items to task manager

  # 6. Create connections
  $ ctx graph suggest-links 1
  Open note in Obsidian, add [[wiki-links]]

  # 7. Check progress
  $ ctx session status
  Session progress: 5 notes processed today

  # 8. Verify no mistakes
  $ ctx validate --invalid --recent 10
  Fix any tag errors

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 TRACKING PROGRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # How many notes need work?
  $ ctx incoming --recent 100 | wc -l

  # What's my tag coverage?
  $ ctx stats coverage
  Dimension Coverage:
    type/*     : 100%
    status/*   : 98% - 8 notes missing status
    source/*   : 95%
    project/*  : 67% - Consider adding project context

  # Tag usage patterns
  $ ctx stats tags --by-dimension
  Most used tags:
    project/pai: 87 notes
    topic/ai: 64 notes
    type/meeting: 52 notes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💎 CULTIVATION BEST PRACTICES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Cultivate daily (even just 15 minutes)
    Prevents backlog buildup
    Keeps ideas fresh in your mind

  Split first, tag second
    Large notes are hard to tag accurately
    Atomic notes have clear tags

  Use AI suggestions, but verify
    AI is good at pattern matching
    You understand the context better

  Don't over-tag
    3-7 tags is usually enough
    Required: type/*, status/*, source/*
    Organizational: project/* or area/*
    Descriptive: 1-3 topic/* tags

  Promote to permanent deliberately
    #status/fleeting = "I've processed this but might revise"
    #status/permanent = "This is polished and valuable"
    Most notes stay fleeting (and that's fine!)

  Link as you cultivate
    Don't defer linking to "later"
    Fresh in your mind = better connections

  Track your sessions
    Session stats show progress
    Motivating to see notes processed count

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 ADVANCED TECHNIQUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Batch Processing:
    $ ctx incoming --format index
    $ for i in {1..5}; do
        ctx suggest-tags $i
        ctx tag add $i "tags..."
      done

  Smart Filtering:
    # Focus on recent, unprocessed work notes
    $ ctx search --tag incoming --scope work --since "7d" --format index

    # Find large notes that need splitting
    $ ctx search --tag incoming | xargs -I {} wc -w "{}"

  Validation Workflow:
    # After batch tagging, validate
    $ ctx validate --invalid --recent 20
    # Fix issues
    $ ctx validate --missing-required --recent 20

NEXT STEPS:
  ctx help examples         See cultivation in real workflows
  ctx help taxonomy         Understanding tag structure
  ctx tutorial              Interactive walkthrough
`;

const HELP_TAXONOMY = `
┌────────────────────────────────────────────────────────────────────────────┐
│                     TAXONOMY SYSTEM GUIDE                                  │
└────────────────────────────────────────────────────────────────────────────┘

A taxonomy defines your tag vocabulary and structure. It's the schema for
organizing your knowledge.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 ANATOMY OF A TAXONOMY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Taxonomies are JSON files defining:
    Dimensions (categories of tags)
    Required vs optional dimensions
    Valid tags within each dimension
    Default tags for new notes

  Location: ~/.claude/context/taxonomies/*.json

  Structure:
    {
      "name": "work-taxonomy",
      "version": "1.2.0",
      "dimensions": {
        "type": {
          "required": true,
          "tags": ["transcript", "meeting", "note", "wisdom", "..."]
        },
        "status": {
          "required": true,
          "tags": ["incoming", "fleeting", "permanent", "archived"]
        },
        ...
      }
    }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏷️  THE 11 DIMENSIONS (WORK TAXONOMY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  REQUIRED DIMENSIONS (every note must have one tag from each):

    type/*        Nature of content
                  transcript, meeting, wisdom, note, article, book
                  Helps filter by content type

    status/*      Lifecycle stage
                  incoming, fleeting, permanent, archived
                  Tracks processing state

    source/*      Origin of content
                  telegram, meeting, book, article, conversation
                  Maintains provenance

  ORGANIZATIONAL DIMENSIONS (at least one required):

    project/*     Active work with deadlines
                  project/pai, project/acme
                  Short-term, completable

    area/*        Ongoing responsibilities
                  area/engineering, area/leadership
                  Long-term, maintained indefinitely

    resource/*    Reference topics
                  resource/ai, resource/security
                  Knowledge base

  DESCRIPTIVE DIMENSIONS (optional, 0 or more):

    topic/*       Subject matter domains
                  topic/ai, topic/security, topic/kubernetes
                  What is this about?

    person/*      People mentioned or involved
                  person/john, person/alice
                  Track collaborators and sources

    company/*     Organizations mentioned
                  company/anthropic, company/openai
                  Business context

    tool/*        Technologies and tools
                  tool/kubernetes, tool/terraform
                  Technical stack

    location/*    Geographic context
                  location/sf, location/remote
                  Where events occurred

  META DIMENSIONS:

    scope/*       Privacy boundary
                  scope/work, scope/private
                  Controls visibility

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 VIEWING TAXONOMIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # List available taxonomies
  $ ctx taxonomy list
  Available taxonomies:
    work-taxonomy (active)
    personal-taxonomy
    research-taxonomy

  # Show current taxonomy details
  $ ctx taxonomy info

  Taxonomy: work-taxonomy v1.2.0

  Required dimensions:
    type/*        (8 tags)
    status/*      (4 tags)
    source/*      (6 tags)

  Organizational (need at least 1):
    project/*     (12 tags)
    area/*        (5 tags)
    resource/*    (8 tags)

  Descriptive (optional):
    topic/*       (23 tags)
    person/*      (15 tags)
    tool/*        (18 tags)
    ...

  # Show specific taxonomy
  $ ctx taxonomy info research-taxonomy

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ VALIDATING TAGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # Validate specific tags
  $ ctx taxonomy validate "type/meeting,project/pai,topic/ai"
  All tags valid

  $ ctx taxonomy validate "type/meeting,arch,k8s"
  Invalid tags:
    arch - Not in taxonomy. Did you mean: topic/architecture?
    k8s - Not in taxonomy. Did you mean: tool/kubernetes?

  # Get suggestions for invalid tag
  $ ctx taxonomy suggest "arch"
  Suggestions for "arch":
    1. topic/architecture (edit distance: 4)
    2. resource/architecture (edit distance: 5)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 VALIDATING YOUR VAULT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # Find notes with invalid tags
  $ ctx validate --invalid
  Found 3 notes with invalid tags:

  [1] 2025-12-15-Meeting.md
      arch - Did you mean: topic/architecture?
      k8s - Did you mean: tool/kubernetes?

  [2] 2025-12-10-Notes.md
      raw - Not in taxonomy

  # Find notes missing required dimensions
  $ ctx validate --missing-required
  Found 5 notes missing required dimensions:

  [1] 2025-12-15-Quick-Note.md
      Missing: type/*, source/*

  [2] 2025-12-12-Thoughts.md
      Missing: status/*

  # Limit validation to recent notes
  $ ctx validate --invalid --recent 20
  $ ctx validate --missing-required --recent 50

  # JSON output for scripting
  $ ctx validate --invalid --format json

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 TAG MIGRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  When you update your taxonomy, migrate old tags to new structure:

  # Preview migration for specific tags
  $ ctx tag migrate --preview "raw,arch,k8s"
  Would migrate:
    raw to status/incoming (garbage cleanup)
    arch to topic/architecture (consolidation)
    k8s to tool/kubernetes (consolidation)

  # Preview all migrations (dry run)
  $ ctx tag migrate --dry-run
  Phase 1: Garbage cleanup
    raw to status/incoming (23 notes)
    tmp to status/fleeting (5 notes)

  Phase 2: System tags
    meeting to type/meeting (15 notes)

  Phase 3: Prefix normalization
    ai to topic/ai (42 notes)
    architecture to topic/architecture (18 notes)

  Phase 4: Consolidation & Hierarchy
    k8s to tool/kubernetes (8 notes)        ← consolidation
    llm to topic/ai/llm (12 notes)          ← hierarchy
    rag to topic/ai/rag (5 notes)           ← hierarchy

  Hierarchy rules map flat tags to their parent context:
    llm → topic/ai/llm       (knows llm belongs under ai)
    rag → topic/ai/rag       (context-aware nesting)
    ea → topic/architecture/enterprise

  # Run specific migration phase
  $ ctx tag migrate --execute --phase garbage
  $ ctx tag migrate --execute --phase system
  $ ctx tag migrate --execute --phase prefixes
  $ ctx tag migrate --execute --phase consolidate

  # Run full migration (requires --execute flag)
  $ ctx tag migrate --execute
  Runs all phases in order
  Creates backup before modifying
  Always dry-run first!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 TAG STATISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # Tag usage counts
  $ ctx stats tags
  Most used tags:
    project/pai: 87 notes
    topic/ai: 64 notes
    type/meeting: 52 notes
    type/transcript: 48 notes
    ...

  # Group by dimension
  $ ctx stats tags --by-dimension

  type/*:
    transcript: 48 notes
    meeting: 52 notes
    note: 125 notes

  topic/*:
    ai: 64 notes
    security: 38 notes
    architecture: 29 notes

  project/*:
    pai: 87 notes
    acme: 43 notes

  # Dimension coverage
  $ ctx stats coverage

  Dimension Coverage Report:
    type/*     : 100% (456/456 notes)
    status/*   : 98%  (448/456 notes) - 8 missing
    source/*   : 95%  (433/456 notes) - 23 missing
    project/*  : 67%  (305/456 notes)
    topic/*    : 85%  (388/456 notes)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 TAXONOMY DESIGN PRINCIPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Start simple, grow organically
    Don't design a perfect taxonomy upfront
    Add tags as you need them
    Refactor when patterns emerge

  Required dimensions ensure findability
    type/*, status/*, source/* answer basic questions
    "What is it? Where is it in the process? Where did it come from?"

  PARA provides actionability
    project/*, area/*, resource/* organize by utility
    "Is this active work, maintenance, or reference?"

  Descriptive tags add richness
    topic/*, person/*, tool/* enable multi-faceted search
    Don't over-tag, but capture key dimensions

  Use validation to maintain quality
    Weekly: ctx validate --invalid --recent 50
    Fix errors as they appear
    Prevents taxonomy drift

  Migrate when refactoring
    Taxonomy evolution is normal
    Use migration tools to update historical notes
    Maintain consistency over time

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏗️  CREATING YOUR OWN TAXONOMY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. Copy the work-taxonomy template
     $ cp ~/.claude/context/taxonomies/work-taxonomy.json \\
          ~/.claude/context/taxonomies/my-taxonomy.json

  2. Edit dimensions and tags
     Keep required dimensions (type, status, source)
     Customize organizational dimensions (project, area, resource)
     Add/remove descriptive dimensions as needed

  3. Test with a few notes
     $ ctx taxonomy validate "your,test,tags" --taxonomy my-taxonomy

  4. Switch to new taxonomy (if needed)
     Edit ~/.claude/context/config.json
     Set "activeTaxonomy": "my-taxonomy"

  5. Migrate existing notes
     $ ctx tag migrate --dry-run
     $ ctx tag migrate --execute

NEXT STEPS:
  ctx help concepts         Understand the tag philosophy
  ctx help cultivation      Using tags in your workflow
  ctx help examples         See taxonomies in action
`;

const HELP_TUTORIAL = `
┌────────────────────────────────────────────────────────────────────────────┐
│                        GETTING STARTED TUTORIAL                            │
└────────────────────────────────────────────────────────────────────────────┘

Welcome! This tutorial will walk you through the complete ctx workflow.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 BEFORE YOU START
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Requirements:
    Obsidian vault configured in ~/.claude/context/config.json
    Notes captured (via ingest or manual creation)
    ctx installed and working

  Check your setup:
    $ ctx config
    Verify vault path is correct

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌱 STEP 1: CAPTURE (Getting Notes Into Your Vault)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Method 1: Ingest from Telegram
    $ ingest telegram --recent 10
    Captures messages from your channels
    Auto-tagged with #incoming

  Method 2: Manual note creation
    $ ctx write "My First Note" --tags "incoming,type/note"
    Creates note in vault
    Opens in your editor

  Method 3: Direct creation in Obsidian
    Just create a note
    Add #incoming tag
    ctx will find it

  Check what you captured:
    $ ctx incoming --recent 10
    Shows all notes tagged #incoming

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏷️  STEP 2: CULTIVATE (Adding Structure)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Start a session:
    $ ctx session start
    Tracks your progress

  See your backlog:
    $ ctx cultivate backlog --limit 5
    [1] 2025-12-15-Meeting-Transcript (3,492 words)
    [2] 2025-12-14-Quick-Thought (127 words)
    ...

  Get AI tag suggestions:
    $ ctx suggest-tags 1
    Suggested: type/meeting, project/pai, topic/architecture

  Add tags:
    $ ctx tag add 1 "type/meeting,project/pai,topic/architecture"
    Tags added

  Promote to permanent:
    $ ctx tag add 1 status/permanent

  Repeat for notes 2-5, then check progress:
    $ ctx session status
    See how many notes processed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✂️  STEP 3: ATOMIZE (Splitting Large Notes)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  For large notes (over 1000 words), split into atomic notes:

    $ ctx cultivate daily-split

    Analyzing: 2025-12-15-Meeting-Transcript

    Suggested splits:
      "Architecture Decision" (487 words)
      "Action Items" (203 words)
      "Security Discussion" (612 words)

    Accept? [y/n]
    Type 'y' to create split notes

  Result:
    Original note preserved
    3 new atomic notes created
    Wiki-links connect them
    Tags automatically applied

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 STEP 4: SEARCH (Finding Your Notes)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Search by tag:
    $ ctx search --tag project/pai --format index
    [1] Architecture Discussion
    [2] Deployment Notes
    [3] Security Requirements

  Semantic search:
    $ ctx semantic "what did we decide about deployments" --format index
    [1] Deployment Strategy (91% match)
    [2] Architecture Discussion (87% match)

  Time-based search:
    $ ctx search --tag project/pai --since "this week" --format index

  Complex search:
    $ ctx search --tag project/pai --tag topic/architecture \\
        --not-tag status/archived --format index

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💉 STEP 5: LOAD (Injecting Context into AI)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  After searching, load selected notes:

    # Load specific indices
    $ ctx load 1,2,3
    Loaded 3 notes (4,823 tokens)

    # Load all from search
    $ ctx load all

    # Load with filters
    $ ctx load --type transcript
    $ ctx load --tag topic/architecture

  Now your AI has context!
    Notes are in the AI's context window
    AI can reference specific details
    Answers are grounded in your knowledge

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 STEP 6: CONNECT (Building Your Knowledge Graph)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Find connection opportunities:
    $ ctx graph suggest-links 1

    Suggested connections for "Architecture Discussion":
      [2] "Deployment Strategy" (3 shared tags)
      [5] "Security Requirements" (89% similar)

    Add these links:
      [[Deployment Strategy]] in section 2
      [[Security Requirements]] when discussing compliance

  Open note in Obsidian and add the suggested [[wiki-links]]

  Find knowledge clusters:
    $ ctx graph clusters
    See how your notes group together

  Find isolated notes:
    $ ctx graph orphans
    Notes with few connections that might need linking

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 STEP 7: MAINTAIN (Keeping Quality High)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Weekly maintenance routine:

  1. Validate recent notes
     $ ctx validate --invalid --recent 50
     $ ctx validate --missing-required --recent 50

  2. Check tag coverage
     $ ctx stats coverage

  3. Review orphaned notes
     $ ctx graph orphans --recent 20

  4. Cultivate inbox
     $ ctx incoming | wc -l
     Aim for under 20 incoming notes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 DAILY WORKFLOW SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Morning (15 minutes):
    $ ctx cultivate backlog --limit 5
    $ ctx suggest-tags 1
    $ ctx tag add 1 "tags..."
    Process 3-5 notes

  During work (as needed):
    $ ctx context my-project --format index
    $ ctx load all
    Inject project context into AI

  Afternoon (10 minutes):
    $ ctx cultivate daily-split
    Split 1-2 large notes

  Evening (optional):
    $ ctx graph suggest-links <note>
    Add connections to today's notes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Deep Dives:
    ctx help concepts         Understand the philosophy
    ctx help examples         See real-world workflows
    ctx help search           Master search and filtering
    ctx help cultivation      Advanced cultivation techniques
    ctx help taxonomy         Customize your tag system

  Practice:
    Start with 5-10 notes, practice the full workflow
    Build habits: 15 minutes daily cultivation
    Let your system grow organically

  Questions?
    ctx help <topic>          Topic-specific help
    ctx <command> --help      Command-specific options

You're ready to build your second brain!
`;

const HELP_TAGS = `
┌────────────────────────────────────────────────────────────────────────────┐
│                         TAG INTELLIGENCE GUIDE                             │
└────────────────────────────────────────────────────────────────────────────┘

Tags are the metadata API for your knowledge. This guide covers the complete
tag lifecycle from capture to migration.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 THE TAG LIFECYCLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  CAPTURE → VALIDATE → SUGGEST → GROOM → MIGRATE

  Each phase builds on the previous, ensuring your taxonomy stays clean
  and useful as your vault grows.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📥 CAPTURE: Tag Inference at Ingestion
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  When content is ingested, tags are inferred automatically:

  Caption Override:
    Tags in caption take priority
    $ ingest direct --tags "project/pai,topic/ai"
    These tags are used as-is

  Inline Hints:
    #hashtag        → Adds tag (e.g., #kubernetes → topic/kubernetes)
    @person         → Adds person tag (e.g., @john → person/john)
    ~scope          → Sets scope (e.g., ~private → scope/private)

  AI Topic Extraction:
    When <3 tags provided, AI suggests additional topics
    Based on content analysis
    Respects your taxonomy structure

  Voice Fuzzy Matching:
    Spoken tags are fuzzy-matched to existing tags
    "ProjectPie" → project/pai (70% similarity threshold)
    Unmatched tags flagged for review

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ VALIDATE: Quality Gates
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Check tags against your taxonomy:

  Find Invalid Tags:
    $ ctx validate --invalid --recent 20
    Shows notes with tags not in taxonomy

  Find Missing Required:
    $ ctx validate --missing-required --recent 20
    Required dimensions: type/*, source/*, status/*

  Validate Specific Tags:
    $ ctx taxonomy validate "type/meeting,project/pai,random-tag"
    Returns: Valid + Invalid lists

  Coverage Report:
    $ ctx stats coverage
    Shows percentage of notes with each dimension

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 SUGGEST: Tag Intelligence
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Get AI-powered tag suggestions:

  For Existing Notes:
    $ ctx suggest-tags <note>
    AI analyzes content and suggests appropriate tags
    Respects your taxonomy structure

  Fix Invalid Tags:
    $ ctx taxonomy suggest "AI"
    Suggestion: AI → topic/ai
    Handles case, prefix, typo corrections

  Usage Patterns:
    $ ctx stats tags --by-dimension
    Shows most-used tags per dimension
    Helps identify your tagging patterns

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧹 GROOM: Find and Consolidate Duplicates
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Find duplicate/similar tags:

  Discover Clusters:
    $ ctx tag duplicates
    Cluster 1: agentic (canonical, 45 uses)
      ├── agents (12 uses) - 91% similar
      └── agent (3 uses) - 95% similar

  Similarity Signals:
    Alias match (1.0):   k8s ↔ kubernetes
    Stem match (0.85+):  agents ↔ agentic
    Typo/spelling (0.7): kubernets ↔ kubernetes

  Generate Migration Rules:
    $ ctx tag duplicates --generate-rules > rules.yaml
    Creates YAML for automated consolidation

  Preview Rules:
    $ ctx tag migrate --rules rules.yaml --dry-run

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔀 MIGRATE: Evolve Your Taxonomy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Safely migrate tags across your vault:

  Preview Specific Tags:
    $ ctx tag migrate --preview "raw,ai,incoming"
    raw → type/fleeting
    ai → topic/ai
    incoming → status/inbox

  Preview All Rules:
    $ ctx tag migrate --dry-run
    Shows complete transformation plan

  Staged Execution (requires --execute):
    $ ctx tag migrate --execute --phase garbage      # Remove junk tags
    $ ctx tag migrate --execute --phase system       # Apply replacements
    $ ctx tag migrate --execute --phase prefixes     # Add dimension prefixes
    $ ctx tag migrate --execute --phase consolidate  # Merge duplicates

  Git Safety:
    Migration uses Git branches for rollback
    $ ctx tag migrate --prepare --filter "tag:status/inbox"
    $ ctx tag migrate --execute
    $ git diff  # Review changes
    $ ctx tag migrate --finalize  # or --abort

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 MONITORING: Tag Health Metrics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Track tag health over time:

  Tag Usage Stats:
    $ ctx stats tags
    Shows count per tag, sorted by usage

  Dimension Coverage:
    $ ctx stats coverage
    type/*   : 100% (all notes)
    status/* : 98%  (8 missing)
    source/* : 95%
    project/*: 67%

  Tags By Dimension:
    $ ctx stats tags --by-dimension
    Groups tags into their dimensions

BEST PRACTICES:

  1. Validate after bulk imports
     $ ctx validate --invalid --recent 50

  2. Groom monthly
     $ ctx tag duplicates --threshold 0.75

  3. Migrate cautiously
     Always --dry-run first
     Use staged execution for large vaults

  4. Required dimensions matter
     Every note needs: type/*, source/*, status/*
     Enforces discoverability

NEXT STEPS:
  ctx help taxonomy         Understand the 11 dimensions
  ctx help cultivation      Using tags in your workflow
  ctx help examples         See tag workflows in action
`;

const HELP_TOPICS: Record<string, string> = {
  concepts: HELP_CONCEPTS,
  examples: HELP_EXAMPLES,
  search: HELP_SEARCH,
  cultivation: HELP_CULTIVATION,
  taxonomy: HELP_TAXONOMY,
  tutorial: HELP_TUTORIAL,
  tags: HELP_TAGS,
  // Methodology help (from methodology-help.ts)
  para: getParaHelp(),
  zk: getZkHelp(),
  zettelkasten: getZkHelp(),
  luhmann: getLuhmannHelp(),
  fabric: getFabricHelp(),
};

function handleHelp(args: string[]) {
  const topic = args[0];

  if (!topic) {
    console.log(HELP);
    return;
  }

  const helpContent = HELP_TOPICS[topic.toLowerCase()];

  if (!helpContent) {
    console.error(`Unknown help topic: ${topic}`);
    console.log("\nAvailable topics:");
    console.log("  concepts       Learn about Zettelkasten, PARA, and the 11 dimensions");
    console.log("  examples       Practical workflow examples and use cases");
    console.log("  search         Detailed search and filtering guide");
    console.log("  cultivation    Cultivation workflow and best practices");
    console.log("  taxonomy       Understanding and managing taxonomies");
    console.log("  tags           Tag lifecycle: inference, validation, grooming, migration");
    console.log("  tutorial       Interactive getting started guide");
    console.log("");
    console.log("Methodology refreshers:");
    console.log("  para           PARA method - organize by actionability");
    console.log("  zk             Zettelkasten - atomic notes and linking");
    console.log("  luhmann        Luhmann's slip-box approach");
    console.log("  fabric         Fabric patterns for weave processing");
    process.exit(1);
  }

  console.log(helpContent);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    process.exit(0);
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  try {
    switch (command) {
      case "search":
        await handleSearch(commandArgs);
        break;
      case "read":
        await handleRead(commandArgs);
        break;
      case "write":
        await handleWrite(commandArgs);
        break;
      case "tags":
        await handleTags(commandArgs);
        break;
      case "tag":
        await handleTag(commandArgs);
        break;
      case "config":
        await handleConfig();
        break;
      case "embed":
        await handleEmbed(commandArgs);
        break;
      case "semantic":
        await handleSemantic(commandArgs);
        break;
      case "context":
        await handleContext(commandArgs);
        break;
      case "incoming":
        await handleIncoming(commandArgs);
        break;
      case "load":
        await handleLoad(commandArgs);
        break;
      case "taxonomy":
        await handleTaxonomy(commandArgs);
        break;
      case "validate":
        await handleValidate(commandArgs);
        break;
      case "stats":
        await handleStats(commandArgs);
        break;
      case "suggest-tags":
        await handleSuggestTags(commandArgs);
        break;
      case "session":
        await handleSession(commandArgs);
        break;
      case "cultivate":
        await handleCultivate(commandArgs);
        break;
      case "graph":
        await handleGraph(commandArgs);
        break;
      case "maintain":
        await handleMaintain(commandArgs);
        break;
      case "practice":
        await handlePractice(commandArgs);
        break;
      case "sweep":
        await handleSweep(commandArgs);
        break;
      case "done":
      case "ok":
        await handleDone(commandArgs);
        break;
      case "weave":
        await handleWeave(commandArgs);
        break;
      case "dive":
        await handleDive(commandArgs);
        break;
      case "survey":
        await handleSurvey(commandArgs);
        break;
      case "compass":
        await handleCompass(commandArgs);
        break;
      case "mirror":
        await handleMirror(commandArgs);
        break;
      case "rename":
        await handleRename(commandArgs);
        break;
      case "delete":
        await handleDelete(commandArgs);
        break;
      case "archive":
        await handleArchive(commandArgs);
        break;
      case "extract":
      case "wisdom":
        await handleExtract(commandArgs);
        break;
      case "clean":
        await handleClean(commandArgs);
        break;
      case "help":
        handleHelp(commandArgs);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log("Run 'ctx --help' for usage.");
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

async function handleSearch(args: string[]) {
  // Handle --help flag
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`ctx search - Search notes in vault

USAGE:
  ctx search [options] [text]

OPTIONS:
  --tag, -t <tag>      Filter by tag (AND logic, repeatable)
  --any-tag <tag>      Filter by tag (OR logic, repeatable)
  --not-tag, -x <tag>  Exclude notes with tag
  --dimension, -d <dim> Filter by dimension (type, status, topic, etc.)
  --text <query>       Full-text search
  --type <type>        Filter by content type
  --recent, -r <n>     Limit to N most recent
  --since <date>       Notes since date (7d, 2w, 1m, YYYY-MM-DD)
  --modified <date>    Notes modified since date
  --created <date>     Notes created since date
  --scope, -s <scope>  Scope: work (default), private, all
  --format, -f <fmt>   Output: list (default), index, json
  --untagged           Only notes without tags

EXAMPLES:
  ctx search --tag project/pai               # Notes with tag
  ctx search --tag topic/ai -r 10            # Recent AI notes
  ctx search "architecture"                  # Text search
  ctx search --dimension status              # Notes with status/* tag
  ctx search --since 7d --format index       # Recent, numbered
`);
    return;
  }

  const options: SearchOptions = {
    tags: [],
    text: undefined,
    recent: undefined,
    untagged: false,
    notTags: [],
    scope: "work",  // Default: exclude private content
  };
  let format: "list" | "index" | "json" = "list";
  let filterType: string | undefined;
  const anyTags: string[] = [];  // OR logic tags
  const dimensions: string[] = [];  // Dimension filters

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "--tag":
      case "-t":
        options.tags.push(args[++i]);
        break;
      case "--any-tag":
        anyTags.push(args[++i]);
        break;
      case "--not-tag":
      case "--exclude-tag":
      case "-x":
        options.notTags!.push(args[++i]);
        break;
      case "--type":
        filterType = args[++i];
        break;
      case "--dimension":
      case "-d":
        dimensions.push(args[++i]);
        break;
      case "--text":
        options.text = args[++i];
        break;
      case "--recent":
      case "-r":
        options.recent = parseInt(args[++i], 10);
        break;
      case "--untagged":
        options.untagged = true;
        break;
      case "--format":
      case "-f":
        const formatArg = args[++i]?.toLowerCase();
        if (formatArg === "list" || formatArg === "index" || formatArg === "json") {
          format = formatArg;
        } else {
          console.error(`Invalid format: ${formatArg}. Use: list, index, or json`);
          process.exit(1);
        }
        break;
      case "--scope":
      case "-s":
        const scopeArg = args[++i]?.toLowerCase();
        if (scopeArg === "work" || scopeArg === "private" || scopeArg === "all") {
          options.scope = scopeArg as ScopeFilter;
        } else {
          console.error(`Invalid scope: ${scopeArg}. Use: work, private, or all`);
          process.exit(1);
        }
        break;
      case "--since":
        const sinceValue = args[++i];
        const sinceDate = parseSince(sinceValue);
        if (sinceDate) {
          options.since = sinceDate;
        } else {
          console.error(`Invalid --since value: ${sinceValue}`);
          console.error(`Use: 7d, 2w, 1m, today, yesterday, "this week", "this month", or YYYY-MM-DD`);
          process.exit(1);
        }
        break;
      case "--modified":
        const modifiedValue = args[++i];
        const modifiedDate = parseSince(modifiedValue);
        if (modifiedDate) {
          options.modified = modifiedDate;
        } else {
          console.error(`Invalid --modified value: ${modifiedValue}`);
          console.error(`Use: 7d, 2w, 1m, today, yesterday, "this week", "this month", or YYYY-MM-DD`);
          process.exit(1);
        }
        break;
      case "--created":
        const createdValue = args[++i];
        const createdDate = parseSince(createdValue);
        if (createdDate) {
          options.created = createdDate;
        } else {
          console.error(`Invalid --created value: ${createdValue}`);
          console.error(`Use: 7d, 2w, 1m, today, yesterday, "this week", "this month", or YYYY-MM-DD`);
          process.exit(1);
        }
        break;
      default:
        // Treat as text search if no flag
        if (!arg.startsWith("-")) {
          options.text = arg;
        }
        break;
    }
    i++;
  }

  let results = await searchNotes(options);

  // Apply anyTags filter (OR logic) if specified
  if (anyTags.length > 0) {
    results = results.filter(r =>
      anyTags.some(tag => r.tags.some(t => t.includes(tag)))
    );
  }

  // Apply dimension filter (REQ-OBS-TAX-003)
  // Notes must have at least one tag from each specified dimension
  if (dimensions.length > 0) {
    results = results.filter(r => {
      return dimensions.every(dim => {
        const prefix = `${dim}/`;
        return r.tags.some(tag => tag.startsWith(prefix));
      });
    });
  }

  if (results.length === 0) {
    console.log("No notes found matching criteria.");
    return;
  }

  // Format output based on --format flag
  if (format === "index" || format === "json") {
    let queryParts: string[] = [];
    if (options.tags.length > 0) queryParts.push(`#${options.tags.join(" #")}`);
    if (anyTags.length > 0) queryParts.push(`any:${anyTags.map(t => `#${t}`).join("|")}`);
    if (dimensions.length > 0) queryParts.push(`dim:${dimensions.join(",")}`);
    if (options.text) queryParts.push(options.text);
    const query = queryParts.length > 0 ? queryParts.join(" ") : "search";
    let indexedResults = toIndexedResults(results);

    // Filter by type if specified
    if (filterType) {
      indexedResults = indexedResults.filter(r => r.type === filterType);
      // Re-index after filtering
      indexedResults = indexedResults.map((r, i) => ({ ...r, index: i + 1 }));
    }

    if (indexedResults.length === 0) {
      console.log(`No notes found matching type: ${filterType}`);
      return;
    }

    // Save for subsequent load command
    const searchIndex: SearchIndex = {
      query: filterType ? `${query} [type:${filterType}]` : query,
      timestamp: new Date().toISOString(),
      tagMatches: indexedResults,
      semanticMatches: [],
    };
    await saveSearchIndex(searchIndex);

    if (format === "json") {
      console.log(formatIndexJson(indexedResults, [], query));
    } else {
      console.log(formatIndexTable(indexedResults, [], query));
    }
  } else {
    // Default list format - also filter by type
    let filteredResults = results;
    if (filterType) {
      // Need to detect type for filtering in list mode
      const indexed = toIndexedResults(results);
      const filteredIndexed = indexed.filter(r => r.type === filterType);
      const filteredNames = new Set(filteredIndexed.map(r => r.name));
      filteredResults = results.filter(r => filteredNames.has(r.name));
    }

    if (filteredResults.length === 0) {
      console.log(`No notes found matching type: ${filterType}`);
      return;
    }

    console.log(`Found ${filteredResults.length} note(s):\n`);
    for (const note of filteredResults) {
      const tagsStr = note.tags.length > 0 ? ` [${note.tags.join(", ")}]` : "";
      console.log(`  ${note.name}${tagsStr}`);
    }
  }
}

async function handleRead(args: string[]) {
  if (args.length === 0) {
    console.error("Usage: ctx read <note-name>");
    process.exit(1);
  }

  const noteName = args[0];
  const content = await readNote(noteName);
  console.log(content);
}

async function handleWrite(args: string[]) {
  if (args.length === 0) {
    console.error("Usage: ctx write <title> [--tags <tags>] [--content <text>]");
    console.error("   or: ctx write --title <title> --tag <tag> --content <text>");
    process.exit(1);
  }

  const options: WriteOptions = {
    title: "",
    tags: [],
    content: "",
  };

  // If first arg is not a flag, treat it as the title
  let i = 0;
  if (!args[0].startsWith("-")) {
    options.title = args[0];
    i = 1;
  }

  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "--title":
        options.title = args[++i];
        break;
      case "--tags":
        options.tags = args[++i].split(",").map(t => t.trim());
        break;
      case "--tag":
      case "-t":
        options.tags.push(args[++i]);
        break;
      case "--content":
      case "-c":
        options.content = args[++i];
        break;
      default:
        break;
    }
    i++;
  }

  if (!options.title) {
    console.error("Error: Title is required");
    process.exit(1);
  }

  // Read from stdin if no content provided
  if (!options.content) {
    const stdin = await Bun.stdin.text();
    if (stdin.trim()) {
      options.content = stdin.trim();
    }
  }

  const filePath = await writeNote(options);
  console.log(`Created: ${filePath}`);
}

async function handleTags(args: string[]) {
  const showCounts = args.includes("--counts") || args.includes("-c");
  const tags = await listTags(showCounts);

  if (showCounts) {
    console.log("Tag usage:\n");
    for (const [tag, count] of Object.entries(tags).sort((a, b) => (b[1] as number) - (a[1] as number))) {
      console.log(`  ${tag}: ${count}`);
    }
  } else {
    console.log("Tags in vault:\n");
    for (const tag of Object.keys(tags).sort()) {
      console.log(`  ${tag}`);
    }
  }
}

async function handleTag(args: string[]) {
  const action = args[0];

  // Handle migrate subcommand separately
  if (action === "migrate") {
    await handleTagMigrate(args.slice(1));
    return;
  }

  // Handle duplicates subcommand
  if (action === "duplicates") {
    await handleTagDuplicates(args.slice(1));
    return;
  }

  // Handle bulk operations
  if (action === "add-bulk" || action === "remove-bulk") {
    await handleTagBulk(action, args.slice(1));
    return;
  }

  if (args.length < 2) {
    console.error("Usage: ctx tag <action> [options]");
    console.error("");
    console.error("Actions:");
    console.error("  add <note> <tag>      Add a tag to a note");
    console.error("  remove <note> <tag>   Remove a tag from a note");
    console.error("  add-bulk <tag> --filter <filter>     Add tag to multiple notes");
    console.error("  remove-bulk <tag> --filter <filter>  Remove tag from multiple notes");
    console.error("  migrate [options]     Migrate tags to new taxonomy");
    console.error("  duplicates [options]  Find duplicate/similar tags");
    console.error("");
    console.error("Note selectors:");
    console.error("  - Index from last search: ctx tag add 3 architecture");
    console.error("  - Note name: ctx tag add \"My Note\" project/pai");
    console.error("  - Full path: ctx tag add /path/to/note.md todo");
    console.error("");
    console.error("Bulk filter syntax:");
    console.error("  --filter \"tag:project/pai\"           Notes with specific tag");
    console.error("  --filter \"recent:10\"                 N most recent notes");
    console.error("  --filter \"since:2025-12-01\"          Notes since date");
    console.error("  --filter \"dimension:topic\"           Notes with any tag in dimension");
    console.error("  --dry-run                            Preview without modifying");
    console.error("");
    console.error("Migration options:");
    console.error("  --dry-run              Preview changes without modifying");
    console.error("  --phase <phase>        Run specific phase: garbage, system, prefixes, consolidate");
    console.error("  --rules <file>         Use custom rules file");
    console.error("  --preview <tags>       Preview migration for specific tags");
    process.exit(1);
  }

  const noteSelector = args[1];
  const tag = args[2];

  if (!tag) {
    console.error("Error: Tag is required");
    console.error("Usage: ctx tag add <note> <tag>");
    process.exit(1);
  }

  // Resolve note path (supports index, name, or path)
  const notePath = await resolveNotePath(noteSelector);
  const noteName = notePath.split("/").pop()?.replace(".md", "") || noteSelector;

  switch (action) {
    case "add": {
      const result = await addTagToNote(notePath, tag);
      if (result.added) {
        console.log(`✅ Added #${tag} to "${noteName}"`);
      } else {
        console.log(`ℹ️  Tag #${tag} already exists on "${noteName}"`);
      }
      break;
    }
    case "remove": {
      const result = await removeTagFromNote(notePath, tag);
      if (result.removed) {
        console.log(`✅ Removed #${tag} from "${noteName}"`);
      } else {
        console.log(`ℹ️  Tag #${tag} not found on "${noteName}"`);
      }
      break;
    }
    default:
      console.error(`Unknown tag action: ${action}`);
      console.error("Use: add, remove, migrate");
      process.exit(1);
  }
}

async function handleTagMigrate(args: string[]) {
  let dryRun = false;
  let execute = false;
  let phase: MigrationPhase | undefined;
  let rulesFile: string | undefined;
  let previewTags: string | undefined;
  // Git workflow flags (REQ-MIG-011)
  let prepare = false;
  let finalize = false;
  let abort = false;
  let status = false;
  let cleanup = false;
  let cleanupDays: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") {
      dryRun = true;
    } else if (args[i] === "--execute") {
      execute = true;
    } else if (args[i] === "--prepare") {
      prepare = true;
    } else if (args[i] === "--finalize") {
      finalize = true;
    } else if (args[i] === "--abort") {
      abort = true;
    } else if (args[i] === "--status") {
      status = true;
    } else if (args[i] === "--cleanup") {
      cleanup = true;
      // Check for optional days argument
      if (args[i + 1] && !args[i + 1].startsWith("--")) {
        cleanupDays = parseInt(args[++i], 10);
      }
    } else if (args[i] === "--phase") {
      const phaseArg = args[++i];
      if (["garbage", "system", "prefixes", "consolidate"].includes(phaseArg)) {
        phase = phaseArg as MigrationPhase;
      } else {
        console.error(`Invalid phase: ${phaseArg}. Use: garbage, system, prefixes, consolidate`);
        process.exit(1);
      }
    } else if (args[i] === "--rules") {
      rulesFile = args[++i];
    } else if (args[i] === "--preview") {
      previewTags = args[++i];
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(`ctx tag migrate - Migrate tags to new taxonomy

USAGE:
  ctx tag migrate [options]

PREVIEW OPTIONS (SAFE):
  --dry-run              Preview changes without modifying files
  --preview <tags>       Preview migration for specific tags

EXECUTION OPTIONS (MODIFIES FILES):
  --execute              Actually run the migration
  --phase <phase>        Run specific phase only
                         Phases: garbage, system, prefixes, consolidate
  --rules <file>         Use custom rules file (default: default-rules)

GIT WORKFLOW (REQ-MIG-011):
  --prepare              Create migration branch and commit pre-migration state
  --execute              Apply migration changes (after --prepare)
  --finalize             Merge migration branch back to original
  --abort                Discard changes and delete migration branch
  --status               Show current migration status
  --cleanup [days]       Delete merged migration branches older than N days (default: 30)

PHASES:
  garbage     Remove junk tags (fabric-extraction, cookie banners, etc.)
  system      Apply direct replacements (raw → type/fleeting, etc.)
  prefixes    Add prefixes to bare tags (ai → topic/ai)
  consolidate Merge duplicates and apply hierarchy

EXAMPLES:
  # Simple preview
  ctx tag migrate --dry-run                    # Preview all changes
  ctx tag migrate --preview "raw,ai,incoming"  # Test specific tags

  # Direct execution (with backup)
  ctx tag migrate --execute --phase garbage    # Run garbage phase only
  ctx tag migrate --execute                    # Run full migration

  # Git-backed workflow (recommended for large migrations)
  ctx tag migrate --prepare                    # Start migration branch
  ctx tag migrate --execute                    # Apply changes
  git diff                                     # Review changes
  ctx tag migrate --finalize                   # Merge and complete
  ctx tag migrate --abort                      # Or discard if unhappy
`);
      return;
    }
  }

  // Handle git workflow commands first (REQ-MIG-011)
  if (status) {
    const migrationStatus = await getMigrationStatus();
    if (migrationStatus.state === MigrationState.NONE) {
      console.log("No migration in progress.");
    } else {
      console.log("Migration Status:");
      console.log(`  State: ${migrationStatus.state}`);
      console.log(`  Branch: ${migrationStatus.branchName || "N/A"}`);
      console.log(`  Original branch: ${migrationStatus.originalBranch || "N/A"}`);
      console.log(`  Files: ${migrationStatus.files?.length || 0}`);
      console.log(`  Timestamp: ${migrationStatus.timestamp || "N/A"}`);
    }
    return;
  }

  if (cleanup) {
    const days = cleanupDays ?? 30;
    console.log(`Cleaning up merged migration branches older than ${days} days...`);
    const result = await cleanupMigrationBranches({ olderThanDays: days, dryRun });
    if (dryRun) {
      console.log("\nDry run - would delete:");
      result.branchesDeleted.forEach(b => console.log(`  ${b}`));
    } else {
      console.log("\nDeleted branches:");
      result.branchesDeleted.forEach(b => console.log(`  ${b}`));
    }
    if (result.branchesPreserved.length > 0) {
      console.log("\nPreserved (not merged or too recent):");
      result.branchesPreserved.forEach(b => console.log(`  ${b}`));
    }
    return;
  }

  if (prepare) {
    console.log("Preparing Git-backed migration...");
    try {
      const result = await prepareMigration({ dryRun });
      if (dryRun) {
        console.log("\nDry run - would create:");
        console.log(`  Branch: ${result.branchName}`);
        console.log(`  Files to track: ${result.filesToTrack.length}`);
      } else {
        console.log(`\n✅ Migration prepared`);
        console.log(`  Branch: ${result.branchName}`);
        console.log(`  Pre-migration snapshot committed`);
        console.log(`\nNext: Run 'ctx tag migrate --execute' to apply changes`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
    return;
  }

  if (finalize) {
    console.log("Finalizing migration...");
    try {
      const result = await finalizeMigration({ dryRun });
      if (dryRun) {
        console.log("\nDry run - would finalize migration");
      } else {
        console.log(`\n✅ Migration finalized`);
        console.log(`  Commit: ${result.commitHash}`);
        console.log(`  Returned to: ${result.returnedToBranch}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
    return;
  }

  if (abort) {
    console.log("Aborting migration...");
    try {
      const result = await abortMigration({ dryRun });
      if (dryRun) {
        console.log("\nDry run - would abort migration");
        console.log(`  Files to restore: ${result.filesRestored}`);
      } else {
        console.log(`\n✅ Migration aborted`);
        console.log(`  Files restored: ${result.filesRestored}`);
        console.log(`  Returned to: ${result.returnedToBranch}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
    return;
  }

  // Safety check: require explicit --execute flag for destructive operations
  // This prevents accidental vault-wide migrations from "just checking" the command
  if (!dryRun && !previewTags && !execute) {
    console.log(`ctx tag migrate - Migrate tags to new taxonomy

⚠️  This command modifies files. Use --execute to run, or --dry-run to preview.

SAFE OPTIONS (preview only):
  ctx tag migrate --dry-run                    # Preview all migration rules
  ctx tag migrate --preview "raw,ai,incoming"  # Test specific tags

EXECUTE (modifies vault):
  ctx tag migrate --execute                    # Run full migration
  ctx tag migrate --execute --phase garbage    # Run specific phase

GIT WORKFLOW (recommended):
  ctx tag migrate --prepare                    # Create migration branch
  ctx tag migrate --execute                    # Apply changes
  ctx tag migrate --finalize                   # Or --abort

Run 'ctx tag migrate --help' for full options.
`);
    return;
  }

  // Load rules
  let rules: MigrationRules;
  try {
    if (rulesFile) {
      rules = await loadMigrationRules(rulesFile);
    } else {
      rules = await getDefaultRules();
    }
  } catch (error) {
    console.error(`Error loading rules: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  // Apply phase filter if specified
  if (phase) {
    rules = getRulesForPhase(rules, phase);
  }

  // Preview mode - test specific tags
  if (previewTags) {
    const tags = previewTags.split(",").map(t => t.trim());
    console.log(`Migration preview for: ${tags.join(", ")}\n`);

    for (const tag of tags) {
      const result = migrateTag(tag, rules);
      if (result.action === "unchanged") {
        console.log(`  ${tag} → (unchanged)`);
      } else if (result.action === "removed") {
        console.log(`  ${tag} → [REMOVED] (${result.rule})`);
      } else {
        console.log(`  ${tag} → ${result.migrated.join(", ")} (${result.action})`);
      }
    }
    return;
  }

  // Dry run mode - would need to scan vault and show changes
  if (dryRun) {
    console.log("DRY RUN - Showing migration rules that would be applied\n");
    if (phase) {
      console.log(`Phase: ${phase}\n`);
    }

    // Show summary of rules
    if (rules.replacements) {
      console.log("Replacements:");
      for (const [from, to] of Object.entries(rules.replacements)) {
        console.log(`  ${from} → ${to}`);
      }
      console.log();
    }

    if (rules.consolidations) {
      console.log("Consolidations:");
      for (const c of rules.consolidations) {
        console.log(`  [${c.sources.join(", ")}] → ${c.target}`);
      }
      console.log();
    }

    if (rules.removals?.exact) {
      console.log("Exact removals:");
      for (const tag of rules.removals.exact) {
        console.log(`  ${tag}`);
      }
      console.log();
    }

    if (rules.removals?.patterns) {
      console.log("Pattern removals:");
      for (const pattern of rules.removals.patterns) {
        console.log(`  /${pattern}/`);
      }
      console.log();
    }

    console.log("To apply these changes, run without --dry-run");
    return;
  }

  // FULL VAULT MIGRATION EXECUTION
  // REQ-MIGRATE-010: Migration report with statistics
  // REQ-MIGRATE-011: Rollback support via backup
  // REQ-MIGRATE-012: Incremental migration (track progress)
  // REQ-MIGRATE-015: Post-migration validation

  console.log("\n🚀 Starting vault migration...");
  if (phase) {
    console.log(`Phase: ${phase}`);
  }
  console.log(`Rules: ${rulesFile || "default-rules"}`);
  console.log();

  // Get config
  const config = getConfig();
  const vaultPath = config.vaultPath;

  // 1. Scan all notes in vault
  console.log("📂 Scanning vault...");
  const allNotes = await searchNotes({
    tags: [],
    scope: "all", // Include all notes (work + private)
  });
  console.log(`Found ${allNotes.length} notes\n`);

  if (allNotes.length === 0) {
    console.log("No notes to migrate.");
    return;
  }

  // 2. Create backup directory with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupDir = join(homedir(), ".claude", "context", "migrations", "backups", `backup-${timestamp}`);

  console.log(`💾 Creating backup at: ${backupDir}`);
  mkdirSync(backupDir, { recursive: true });

  // 3. Initialize migration statistics
  interface MigrationStats {
    totalNotes: number;
    notesModified: number;
    notesUnchanged: number;
    notesSkipped: number;
    totalTagsProcessed: number;
    tagChanges: Record<string, number>; // Rule -> count
    errors: Array<{ file: string; error: string }>;
    startTime: Date;
    endTime?: Date;
  }

  const stats: MigrationStats = {
    totalNotes: allNotes.length,
    notesModified: 0,
    notesUnchanged: 0,
    notesSkipped: 0,
    totalTagsProcessed: 0,
    tagChanges: {},
    errors: [],
    startTime: new Date(),
  };

  // 4. Process each note
  console.log("\n🔄 Migrating tags in notes...");

  for (let i = 0; i < allNotes.length; i++) {
    const note = allNotes[i];
    const progress = `[${i + 1}/${allNotes.length}]`;

    try {
      // Read current note content
      const rawContent = readFileSync(note.path, "utf-8");
      const parsed = parseNoteContent(rawContent);

      // Get existing frontmatter tags
      const existingTags = Array.isArray(parsed.frontmatter.tags)
        ? (parsed.frontmatter.tags as string[])
        : typeof parsed.frontmatter.tags === "string"
          ? (parsed.frontmatter.tags as string).split(/\s+/).filter(Boolean)
          : [];

      if (existingTags.length === 0) {
        console.log(`${progress} ${note.name} - no tags, skipping`);
        stats.notesSkipped++;
        continue;
      }

      // Apply migration to tags
      const migration = applyMigration(existingTags, rules);

      // Check if tags changed
      const tagsChanged = JSON.stringify(existingTags.sort()) !== JSON.stringify(migration.tags.sort());

      if (!tagsChanged) {
        console.log(`${progress} ${note.name} - no changes`);
        stats.notesUnchanged++;
        continue;
      }

      // Backup original file
      const backupPath = join(backupDir, basename(note.path));
      writeFileSync(backupPath, rawContent, "utf-8");

      // Update frontmatter with migrated tags
      const newFrontmatter = {
        ...parsed.frontmatter,
        tags: migration.tags,
      };

      // Generate new content
      const newContent = generateFrontmatter(newFrontmatter) + "\n\n" + parsed.content;

      // Write updated content
      writeFileSync(note.path, newContent, "utf-8");

      // Track statistics
      stats.notesModified++;
      stats.totalTagsProcessed += existingTags.length;

      // Record rule usage
      for (const change of migration.changes) {
        if (change.action !== "unchanged" && change.rule) {
          stats.tagChanges[change.rule] = (stats.tagChanges[change.rule] || 0) + 1;
        }
      }

      // Show summary of changes
      const changes = migration.changes
        .filter(c => c.action !== "unchanged")
        .map(c => `${c.original} → ${c.migrated.length > 0 ? c.migrated.join(", ") : "[removed]"}`)
        .join("; ");

      console.log(`${progress} ${note.name} - updated (${changes})`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`${progress} ${note.name} - ERROR: ${errorMsg}`);
      stats.errors.push({
        file: note.path,
        error: errorMsg,
      });
    }
  }

  stats.endTime = new Date();

  // 5. Generate migration report
  console.log("\n📊 Generating migration report...");

  const reportPath = join(homedir(), ".claude", "context", "migrations", `migration-report-${timestamp}.txt`);

  const duration = stats.endTime.getTime() - stats.startTime.getTime();
  const durationSec = (duration / 1000).toFixed(2);

  const reportLines = [
    "═══════════════════════════════════════════════════════════════",
    "VAULT TAG MIGRATION REPORT",
    "═══════════════════════════════════════════════════════════════",
    "",
    `Date: ${stats.startTime.toISOString()}`,
    `Duration: ${durationSec}s`,
    `Rules: ${rulesFile || "default-rules"}`,
    phase ? `Phase: ${phase}` : "",
    "",
    "SUMMARY:",
    `  Total notes scanned: ${stats.totalNotes}`,
    `  Notes modified: ${stats.notesModified}`,
    `  Notes unchanged: ${stats.notesUnchanged}`,
    `  Notes skipped (no tags): ${stats.notesSkipped}`,
    `  Total tags processed: ${stats.totalTagsProcessed}`,
    `  Errors: ${stats.errors.length}`,
    "",
    "BACKUP LOCATION:",
    `  ${backupDir}`,
    "",
    "TAG CHANGES BY RULE:",
  ];

  if (Object.keys(stats.tagChanges).length > 0) {
    const sortedRules = Object.entries(stats.tagChanges)
      .sort((a, b) => b[1] - a[1])
      .map(([rule, count]) => `  ${count}x ${rule}`);
    reportLines.push(...sortedRules);
  } else {
    reportLines.push("  (no tag changes applied)");
  }

  if (stats.errors.length > 0) {
    reportLines.push("", "ERRORS:");
    for (const err of stats.errors) {
      reportLines.push(`  ${err.file}: ${err.error}`);
    }
  }

  reportLines.push("", "═══════════════════════════════════════════════════════════════");

  const report = reportLines.filter(Boolean).join("\n");
  writeFileSync(reportPath, report, "utf-8");

  // 6. Display final summary
  console.log("\n✅ Migration complete!\n");
  console.log(report);
  console.log(`\n📄 Report saved to: ${reportPath}`);

  // 7. Post-migration validation (REQ-MIGRATE-015)
  if (stats.notesModified > 0) {
    console.log("\n🔍 Running post-migration validation...");

    let validationErrors = 0;

    // Re-scan modified notes to verify they parse correctly
    for (let i = 0; i < allNotes.length; i++) {
      const note = allNotes[i];
      try {
        const content = readFileSync(note.path, "utf-8");
        const parsed = parseNoteContent(content);

        // Verify tags are valid arrays
        if (parsed.frontmatter.tags && !Array.isArray(parsed.frontmatter.tags)) {
          console.error(`  ⚠️  ${note.name}: tags field is not an array`);
          validationErrors++;
        }
      } catch (error) {
        console.error(`  ⚠️  ${note.name}: failed to parse - ${error instanceof Error ? error.message : error}`);
        validationErrors++;
      }
    }

    if (validationErrors === 0) {
      console.log("  ✓ All migrated notes validated successfully");
    } else {
      console.error(`  ⚠️  ${validationErrors} validation errors found`);
      console.error(`  💾 Backup available at: ${backupDir}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Tag Duplicates (REQ-TAG-SIM-007)
// ═══════════════════════════════════════════════════════════════════════════

async function handleTagDuplicates(args: string[]) {
  let generateRules = false;
  let threshold = 0.7;
  let outputFormat: "text" | "yaml" | "json" = "text";

  // Parse args
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--generate-rules":
        generateRules = true;
        break;
      case "--threshold":
        threshold = parseFloat(args[++i]);
        if (isNaN(threshold) || threshold < 0 || threshold > 1) {
          console.error("Threshold must be between 0 and 1");
          process.exit(1);
        }
        break;
      case "--format":
        const fmt = args[++i];
        if (!["text", "yaml", "json"].includes(fmt)) {
          console.error("Format must be: text, yaml, or json");
          process.exit(1);
        }
        outputFormat = fmt as "text" | "yaml" | "json";
        break;
      case "--help":
      case "-h":
        console.log(`ctx tag duplicates - Find duplicate/similar tags in vault

USAGE:
  ctx tag duplicates [options]

OPTIONS:
  --threshold <n>     Similarity threshold (0-1, default: 0.7)
  --generate-rules    Output as migration consolidation rules
  --format <fmt>      Output format: text (default), yaml, json

EXAMPLES:
  ctx tag duplicates                          # Show duplicate clusters
  ctx tag duplicates --threshold 0.8          # Higher threshold (fewer matches)
  ctx tag duplicates --generate-rules > rules.yaml  # Generate migration rules

SIGNALS:
  Similarity is computed from:
  - Stem match: agents ↔ agentic (same root word)
  - Alias match: k8s ↔ kubernetes (known aliases)
  - Levenshtein: kubernetes ↔ kubernete (typos)
`);
        return;
      default:
        if (!arg.startsWith("-")) continue;
        console.error(`Unknown option: ${arg}`);
        process.exit(1);
    }
  }

  // Get all tags with counts
  const tagCounts = await listTags(true) as Record<string, number>;
  const vaultTags: TagWithCount[] = Object.entries(tagCounts).map(([tag, count]) => ({
    tag,
    count,
  }));

  if (vaultTags.length === 0) {
    console.log("No tags found in vault.");
    return;
  }

  console.log(`\nScanning ${vaultTags.length} tags for duplicates (threshold: ${threshold})...\n`);

  // Find clusters
  const clusters = findDuplicateClusters(vaultTags, threshold);

  if (clusters.length === 0) {
    console.log("No duplicate tag clusters found.");
    return;
  }

  // Output based on format
  if (generateRules || outputFormat === "yaml") {
    console.log(formatConsolidationRulesYaml(clusters));
    return;
  }

  if (outputFormat === "json") {
    console.log(JSON.stringify(clusters, null, 2));
    return;
  }

  // Text format (default)
  console.log(`Duplicate Tag Clusters Found: ${clusters.length}\n`);

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];
    const canonicalCount = vaultTags.find(t => t.tag === cluster.canonical)?.count || 0;

    console.log(`${i + 1}. ${cluster.canonical} (canonical, ${canonicalCount} uses)`);

    for (const dup of cluster.duplicates) {
      const dupCount = vaultTags.find(t => t.tag === dup)?.count || 0;
      const similarity = cluster.avgScore.toFixed(2);
      console.log(`   ├── ${dup} (${dupCount} uses) - similarity: ${similarity}`);
    }
    console.log();
  }

  console.log(`Run: ctx tag duplicates --generate-rules > consolidation-rules.yaml`);
  console.log(`Then: ctx tag migrate --rules consolidation-rules.yaml --dry-run`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Tag Bulk Operations (REQ-OBS-TAX-010)
// ═══════════════════════════════════════════════════════════════════════════

async function handleTagBulk(action: "add-bulk" | "remove-bulk", args: string[]) {
  const tag = args[0];
  let filter: string | undefined;
  let dryRun = false;

  // Parse args
  let i = 1;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "--filter":
      case "-f":
        filter = args[++i];
        break;
      case "--dry-run":
        dryRun = true;
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        process.exit(1);
    }
    i++;
  }

  if (!tag || !filter) {
    console.error(`Usage: ctx tag ${action} <tag> --filter <filter> [--dry-run]`);
    console.error("");
    console.error("Filter syntax:");
    console.error("  tag:<tagname>         Notes with specific tag");
    console.error("  recent:<n>            N most recent notes");
    console.error("  since:<date>          Notes since date (YYYY-MM-DD)");
    console.error("  dimension:<dim>       Notes with any tag in dimension");
    console.error("");
    console.error("Examples:");
    console.error(`  ctx tag ${action} "session/cultivation-2025-12-16" --filter "recent:10"`);
    console.error(`  ctx tag ${action} "status/archived" --filter "tag:status/processed"`);
    process.exit(1);
  }

  // Parse filter
  const filterParts = filter.split(":");
  if (filterParts.length !== 2) {
    console.error(`Invalid filter format: ${filter}`);
    console.error("Use: tag:<tag>, recent:<n>, since:<date>, or dimension:<dim>");
    process.exit(1);
  }

  const [filterType, filterValue] = filterParts;

  // Build search options based on filter
  const searchOpts: SearchOptions = {
    tags: [],
    scope: "all",
  };

  switch (filterType) {
    case "tag":
      searchOpts.tags.push(filterValue);
      break;
    case "recent":
      searchOpts.recent = parseInt(filterValue);
      break;
    case "since":
      const sinceDate = parseSince(filterValue);
      if (!sinceDate) {
        console.error(`Invalid date: ${filterValue}`);
        process.exit(1);
      }
      searchOpts.since = sinceDate;
      break;
    case "dimension":
      // Will filter after search
      break;
    default:
      console.error(`Unknown filter type: ${filterType}`);
      process.exit(1);
  }

  // Get matching notes
  let results = await searchNotes(searchOpts);

  // Apply dimension filter if needed
  if (filterType === "dimension") {
    const prefix = `${filterValue}/`;
    results = results.filter(r => r.tags.some(t => t.startsWith(prefix)));
  }

  if (results.length === 0) {
    console.log("No notes match the filter.");
    return;
  }

  const isAdd = action === "add-bulk";
  const verb = isAdd ? "add" : "remove";
  const pastVerb = isAdd ? "Added" : "Removed";

  if (dryRun) {
    console.log(`\n🔍 DRY RUN - Would ${verb} #${tag} to ${results.length} notes:\n`);
    for (const note of results.slice(0, 20)) {
      const hasTag = note.tags.includes(tag);
      const status = isAdd
        ? (hasTag ? "(already has tag)" : "")
        : (hasTag ? "" : "(doesn't have tag)");
      console.log(`   ${note.name} ${status}`);
    }
    if (results.length > 20) {
      console.log(`   ... and ${results.length - 20} more`);
    }
    console.log(`\nRun without --dry-run to apply changes.`);
    return;
  }

  // Apply the changes
  console.log(`\n${isAdd ? "Adding" : "Removing"} #${tag} ${isAdd ? "to" : "from"} ${results.length} notes...\n`);

  let modified = 0;
  let skipped = 0;

  for (const note of results) {
    try {
      if (isAdd) {
        const result = await addTagToNote(note.path, tag);
        if (result.added) {
          modified++;
          console.log(`  ✅ ${note.name}`);
        } else {
          skipped++;
        }
      } else {
        const result = await removeTagFromNote(note.path, tag);
        if (result.removed) {
          modified++;
          console.log(`  ✅ ${note.name}`);
        } else {
          skipped++;
        }
      }
    } catch (err) {
      console.error(`  ❌ ${note.name}: ${err}`);
    }
  }

  console.log(`\n${pastVerb} #${tag} ${isAdd ? "to" : "from"} ${modified} notes (${skipped} skipped)`);
}

async function handleConfig() {
  const config = getConfig();
  console.log("Current configuration:\n");
  console.log(`  Vault path: ${config.vaultPath}`);
  console.log(`  Meta path: ${config.metaPath}`);
  console.log(`  Embeddings DB: ${config.embeddingsDb}`);
}

async function handleEmbed(args: string[]) {
  const force = args.includes("--force") || args.includes("-f");
  const verbose = args.includes("--verbose") || args.includes("-v");
  const showStats = args.includes("--stats");
  const showHelp = args.includes("--help") || args.includes("-h");
  const tagsOnly = args.includes("--tags-only");
  const embeddingsOnly = args.includes("--embeddings-only");

  if (showHelp) {
    console.log(`ctx embed - Build and manage vault indexes

USAGE:
  ctx embed                      Build/update tag index + embeddings
  ctx embed --force              Rebuild everything from scratch
  ctx embed --stats              View index statistics

OPTIONS:
  --stats              Show index statistics (tags + embeddings)
  --force, -f          Force rebuild all indexes
  --verbose, -v        Show detailed progress
  --tags-only          Only build tag index (fast, no API calls)
  --embeddings-only    Only build embeddings (skip tag index)

EXAMPLES:
  ctx embed                      # Update all indexes incrementally
  ctx embed --stats              # Check current state
  ctx embed --tags-only          # Quick tag index rebuild (~10-30s)
  ctx embed --force --verbose    # Full rebuild with progress
`);
    return;
  }

  if (showStats) {
    // Show tag index stats
    const tagIndexAvailable = await isTagIndexAvailable();
    console.log("Tag Index:\n");
    if (tagIndexAvailable) {
      const tagStats = await getTagIndexStats();
      console.log(`  Notes indexed: ${tagStats.totalNotes}`);
      console.log(`  Tag entries: ${tagStats.totalTags}`);
      console.log(`  Unique tags: ${tagStats.uniqueTags}`);
      console.log(`  Last updated: ${tagStats.lastUpdated?.toLocaleString() || "Never"}`);
    } else {
      console.log(`  Status: Not built (run 'ctx embed' to build)`);
    }

    // Show embedding stats
    const stats = await getEmbeddingStats();
    console.log("\nVector Embeddings:\n");
    console.log(`  Total notes: ${stats.totalNotes}`);
    console.log(`  Total chunks: ${stats.totalChunks}`);
    console.log(`  Last updated: ${stats.lastUpdated?.toLocaleString() || "Never"}`);
    return;
  }

  // Build tag index first (fast, no API calls)
  if (!embeddingsOnly) {
    console.log("Building tag index...\n");
    const tagResult = await rebuildTagIndex({ verbose });
    console.log(`Tag index: ${tagResult.processed} notes, ${tagResult.tags} tags indexed`);
    if (tagResult.errors > 0) {
      console.log(`  Errors: ${tagResult.errors}`);
    }
    console.log();
  }

  // Build embeddings (slower, requires API)
  if (!tagsOnly) {
    console.log("Building embeddings...\n");
    const result = await buildEmbeddings({ force, verbose });
    console.log(`\nEmbeddings: ${result.processed} processed, ${result.skipped} skipped`);
    if (result.errors > 0) {
      console.log(`  Errors: ${result.errors}`);
    }
  }

  console.log("\nDone!");
}

async function handleSemantic(args: string[]) {
  if (args.length === 0 || args[0].startsWith("-")) {
    console.error("Usage: ctx semantic <query> [--limit <n>] [--scope <scope>] [--format index|json]");
    console.error("       [--tag <tag>] [--doc <pattern>]");
    console.error("\nExamples:");
    console.error("  ctx semantic \"what did John say\" --tag project/acme");
    console.error("  ctx semantic \"architecture\" --doc \"2025-12-08-Architecture*\"");
    process.exit(1);
  }

  const query = args[0];
  let limit = 10;
  let scope: EmbedScopeFilter = "work"; // Default: exclude private
  let format: "list" | "index" | "json" = "list";
  const tags: string[] = [];
  const anyTags: string[] = [];  // OR logic tags
  let docPattern: string | undefined;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--limit" || args[i] === "-l") {
      limit = parseInt(args[++i], 10);
    } else if (args[i] === "--scope" || args[i] === "-s") {
      const scopeArg = args[++i]?.toLowerCase();
      if (scopeArg === "work" || scopeArg === "private" || scopeArg === "all") {
        scope = scopeArg as EmbedScopeFilter;
      }
    } else if (args[i] === "--format" || args[i] === "-f") {
      const formatArg = args[++i]?.toLowerCase();
      if (formatArg === "list" || formatArg === "index" || formatArg === "json") {
        format = formatArg;
      }
    } else if (args[i] === "--tag" || args[i] === "-t") {
      tags.push(args[++i]);
    } else if (args[i] === "--any-tag") {
      anyTags.push(args[++i]);
    } else if (args[i] === "--doc" || args[i] === "-d") {
      docPattern = args[++i];
    }
  }

  const searchOptions: SemanticSearchOptions = {
    limit,
    scope,
    tags: tags.length > 0 ? tags : undefined,
    docPattern,
  };

  let results = await semanticSearch(query, searchOptions);

  // Apply anyTags filter (OR logic) if specified
  if (anyTags.length > 0) {
    results = results.filter(r =>
      anyTags.some(tag => r.tags?.some(t => t.includes(tag)))
    );
  }

  if (results.length === 0) {
    const hint = tags.length > 0 || anyTags.length > 0 || docPattern
      ? " (check your filters)"
      : " Have you run 'ctx embed' first?";
    console.log(`No results found.${hint}`);
    return;
  }

  // Build query string for display (include filters)
  let displayQuery = `"${query}"`;
  if (tags.length > 0) {
    displayQuery += ` [tags: ${tags.map(t => `#${t}`).join(", ")}]`;
  }
  if (anyTags.length > 0) {
    displayQuery += ` [any: ${anyTags.map(t => `#${t}`).join("|")}]`;
  }
  if (docPattern) {
    displayQuery += ` [doc: ${docPattern}]`;
  }

  // Format output based on --format flag
  if (format === "index" || format === "json") {
    const indexedResults = toSemanticIndexedResults(results);

    // Save for subsequent load command
    const searchIndex: SearchIndex = {
      query: displayQuery,
      timestamp: new Date().toISOString(),
      tagMatches: [],
      semanticMatches: indexedResults,
    };
    await saveSearchIndex(searchIndex);
    
    if (format === "json") {
      console.log(formatIndexJson([], indexedResults, displayQuery));
    } else {
      console.log(formatIndexTable([], indexedResults, displayQuery));
    }
  } else {
    // Default list format
    console.log(`Top ${results.length} results for: ${displayQuery}\n`);
    for (const result of results) {
      const similarity = (result.similarity * 100).toFixed(1);
      console.log(`  [${similarity}%] ${result.noteName}`);
      // Show snippet of matching content
      const snippet = result.content.slice(0, 100).replace(/\n/g, " ").trim();
      console.log(`          ${snippet}...`);
    }
  }
}

async function handleContext(args: string[]) {
  if (args.length === 0 || args[0].startsWith("-")) {
    console.error("Usage: ctx context <project-name> [--recent <n>] [--scope <scope>] [--format index|json]");
    console.error("\nExamples:");
    console.error("  ctx context pai");
    console.error("  ctx context pai --format json     # JSON for Claude to format");
    console.error("  ctx context pai --format index    # Numbered table");
    console.error("  ctx context my-project --recent 10");
    console.error("  ctx context pai --scope all       # Include private notes");
    process.exit(1);
  }

  const projectName = args[0];
  let recent = 20; // Default to 20 recent notes
  let scope: ScopeFilter = "work"; // Default: exclude private
  let format: "list" | "index" | "json" = "list";

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--recent" || args[i] === "-r") {
      recent = parseInt(args[++i], 10);
    } else if (args[i] === "--scope" || args[i] === "-s") {
      const scopeArg = args[++i]?.toLowerCase();
      if (scopeArg === "work" || scopeArg === "private" || scopeArg === "all") {
        scope = scopeArg as ScopeFilter;
      }
    } else if (args[i] === "--format" || args[i] === "-f") {
      const formatArg = args[++i]?.toLowerCase();
      if (formatArg === "list" || formatArg === "index" || formatArg === "json") {
        format = formatArg;
      }
    }
  }

  // Search for project tag
  const projectTag = `project/${projectName}`;
  const results = await searchNotes({
    tags: [projectTag],
    recent,
    scope,
  });

  if (results.length === 0) {
    console.log(`No notes found with tag: #${projectTag}`);
    console.log("\nAvailable project tags:");
    const tags = await listTags(true);
    const projectTags = Object.keys(tags).filter((t) => t.startsWith("project/"));
    for (const tag of projectTags.slice(0, 10)) {
      console.log(`  #${tag} (${tags[tag]} notes)`);
    }
    return;
  }

  // Format output based on --format flag
  if (format === "index" || format === "json") {
    const query = `#${projectTag}`;
    const indexedResults = toIndexedResults(results);
    
    // Save for subsequent load command
    const searchIndex: SearchIndex = {
      query,
      timestamp: new Date().toISOString(),
      tagMatches: indexedResults,
      semanticMatches: [],
    };
    await saveSearchIndex(searchIndex);
    
    if (format === "json") {
      console.log(formatIndexJson(indexedResults, [], query));
    } else {
      console.log(formatIndexTable(indexedResults, [], query));
    }
  } else {
    // Default list format
    console.log(`Context for #${projectTag} (${results.length} notes):\n`);
    for (const note of results) {
      const otherTags = note.tags.filter((t) => t !== projectTag && !t.includes("incoming"));
      const tagsStr = otherTags.length > 0 ? ` [${otherTags.slice(0, 3).join(", ")}]` : "";
      console.log(`  ${note.name}${tagsStr}`);
    }
    console.log(`\nTo read a note: ctx read "<note-name>"`);
  }
}

async function handleIncoming(args: string[]) {
  let recent: number | undefined;
  let scope: ScopeFilter = "work"; // Default: exclude private

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--recent" || args[i] === "-r") {
      recent = parseInt(args[++i], 10);
    } else if (args[i] === "--scope" || args[i] === "-s") {
      const scopeArg = args[++i]?.toLowerCase();
      if (scopeArg === "work" || scopeArg === "private" || scopeArg === "all") {
        scope = scopeArg as ScopeFilter;
      }
    }
  }

  // Search for notes with #incoming tag
  const results = await searchNotes({
    tags: ["incoming"],
    recent,
    scope,
  });

  if (results.length === 0) {
    console.log("No incoming notes waiting to be processed.");
    return;
  }

  console.log(`Incoming notes waiting to be processed (${results.length}):\n`);
  for (const note of results) {
    // Show other tags besides "incoming"
    const otherTags = note.tags.filter((t) => t !== "incoming");
    const tagsStr = otherTags.length > 0 ? ` [${otherTags.join(", ")}]` : "";
    const dateStr = note.date ? ` (${note.date})` : "";
    console.log(`  ${note.name}${tagsStr}${dateStr}`);
  }

  console.log(`\nTo process: read the note, apply fabric pattern, update tags.`);
  console.log(`Example: ctx read "<note>" | fabric -p extract_wisdom`);
}

async function handleLoad(args: string[]) {
  if (args.length === 0) {
    console.error("Usage: ctx load <selection> [--tag <tag>] [--any-tag <tag>] [--type <type>] [--since <date>]");
    console.error("\nSelection formats:");
    console.error("  all         - Load all results from last search");
    console.error("  1,2,5       - Load specific items by number");
    console.error("  1-5         - Load range of items");
    console.error("  1,3-5,10    - Combined selection");
    console.error("\nFilters:");
    console.error("  --tag <tag>     - Filter by tag (can use multiple, AND logic)");
    console.error("  --any-tag <tag> - Filter by tag (can use multiple, OR logic)");
    console.error("  --type <type>   - Filter by type (transcript, meeting, note, wisdom, etc.)");
    console.error("  --since <date>  - Filter by date (YYYY-MM-DD)");
    console.error("\nRun 'ctx search --format index' or 'ctx semantic <query> --format index' first.");
    process.exit(1);
  }

  let selection = "";
  let filterType: string | undefined;
  let filterSince: string | undefined;
  const filterTags: string[] = [];
  const filterAnyTags: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--tag") {
      filterTags.push(args[++i]);
    } else if (args[i] === "--any-tag") {
      filterAnyTags.push(args[++i]);
    } else if (args[i] === "--type" || args[i] === "-t") {
      filterType = args[++i];
    } else if (args[i] === "--since" || args[i] === "-s") {
      filterSince = args[++i];
    } else if (!args[i].startsWith("-")) {
      selection = args[i];
    }
  }

  // If only filters provided, use "all" as selection base
  if (!selection && (filterType || filterSince || filterTags.length > 0 || filterAnyTags.length > 0)) {
    selection = "all";
  }

  if (!selection) {
    console.error("Error: No selection provided. Use 'all', '1,2,5', '1-5', etc.");
    process.exit(1);
  }

  try {
    const result = await loadBySelection(selection, {
      type: filterType,
      since: filterSince,
      tags: filterTags.length > 0 ? filterTags : undefined,
      anyTags: filterAnyTags.length > 0 ? filterAnyTags : undefined,
    });

    // Calculate total size
    const totalSize = Buffer.byteLength(result.content, "utf-8");

    // Output summary to stderr so content can be piped
    console.error(formatLoadSummary(result.loaded, totalSize));
    console.error("");

    // Output actual content to stdout
    console.log(result.content);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

async function handleTaxonomy(args: string[]) {
  const subcommand = args[0];

  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    console.log(`ctx taxonomy - Manage tag taxonomies

USAGE:
  ctx taxonomy <subcommand> [options]

SUBCOMMANDS:
  list              List available taxonomies
  info [name]       Show taxonomy details (default: active taxonomy)
  validate <tags>   Validate tags against taxonomy
  suggest <tag>     Suggest fix for invalid tag

EXAMPLES:
  ctx taxonomy list
  ctx taxonomy info
  ctx taxonomy info default
  ctx taxonomy validate "type/fleeting,source/telegram,status/inbox"
  ctx taxonomy suggest "AI"
`);
    return;
  }

  switch (subcommand) {
    case "list": {
      const taxonomies = listTaxonomies();
      if (taxonomies.length === 0) {
        console.log("No taxonomies found in ~/.claude/context/taxonomies/");
        return;
      }
      console.log("Available taxonomies:\n");
      for (const name of taxonomies) {
        const marker = name === "default" ? " (active)" : "";
        console.log(`  ${name}${marker}`);
      }
      break;
    }

    case "info": {
      const name = args[1] || "default";
      try {
        const taxonomy = await loadTaxonomy(name);
        console.log(`Taxonomy: ${taxonomy.name} (v${taxonomy.version})\n`);
        console.log(taxonomy.description.trim());
        console.log(`\nDimensions (${taxonomy.dimensions.length}):\n`);
        for (const dim of taxonomy.dimensions) {
          const required = dim.required ? " [required]" : "";
          const defaultVal = dim.default ? ` (default: ${dim.default})` : "";
          console.log(`  ${dim.name} (${dim.prefix.replace(/\|/g, ", ")})${required}${defaultVal}`);
          console.log(`    Type: ${dim.type}`);
          if (dim.type === "closed" && dim.values) {
            console.log(`    Values: ${dim.values.join(", ")}`);
          }
          if (dim.type === "open" && dim.pattern) {
            console.log(`    Pattern: ${dim.pattern}`);
          }
          if (dim.examples && dim.examples.length > 0) {
            console.log(`    Examples: ${dim.examples.slice(0, 3).join(", ")}`);
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
      break;
    }

    case "validate": {
      const tagsArg = args[1];
      if (!tagsArg) {
        console.error("Usage: ctx taxonomy validate <tags>");
        console.error("Example: ctx taxonomy validate \"type/fleeting,source/telegram\"");
        process.exit(1);
      }

      const tags = tagsArg.split(",").map(t => t.trim());
      const taxonomy = await getDefaultTaxonomy();
      const result = validateTags(tags, taxonomy);

      if (result.valid.length > 0) {
        console.log("✅ Valid tags:");
        for (const tag of result.valid) {
          console.log(`   ${tag}`);
        }
      }

      if (result.invalid.length > 0) {
        console.log("\n❌ Invalid tags:");
        for (const tag of result.invalid) {
          console.log(`   ${tag}`);
        }
      }

      if (result.missing.length > 0) {
        console.log("\n⚠️  Missing required dimensions:");
        for (const dim of result.missing) {
          console.log(`   ${dim}`);
        }
      }

      // Exit with error if any invalid or missing
      if (result.invalid.length > 0 || result.missing.length > 0) {
        process.exit(1);
      }
      break;
    }

    case "suggest": {
      const tag = args[1];
      if (!tag) {
        console.error("Usage: ctx taxonomy suggest <tag>");
        console.error("Example: ctx taxonomy suggest \"AI\"");
        process.exit(1);
      }

      const taxonomy = await getDefaultTaxonomy();
      const suggestion = suggestFix(tag, taxonomy);

      if (suggestion) {
        console.log(`Suggestion: ${tag} → ${suggestion}`);
      } else {
        console.log(`No valid suggestion found for: ${tag}`);
        process.exit(1);
      }
      break;
    }

    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.error("Use: list, info, validate, suggest");
      process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Validate Command (REQ-OBS-TAX-007, REQ-OBS-TAX-008)
// ═══════════════════════════════════════════════════════════════════════════

async function handleValidate(args: string[]) {
  let missingRequired = false;
  let invalid = false;
  let recent: number | undefined;
  let format: "list" | "json" = "list";

  // Parse args
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "--missing-required":
        missingRequired = true;
        break;
      case "--invalid":
        invalid = true;
        break;
      case "--recent":
      case "-r":
        recent = parseInt(args[++i]);
        break;
      case "--format":
      case "-f":
        format = args[++i] as "list" | "json";
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        process.exit(1);
    }
    i++;
  }

  // Default: show both if neither specified
  if (!missingRequired && !invalid) {
    missingRequired = true;
    invalid = true;
  }

  // Load taxonomy
  const taxonomy = await getDefaultTaxonomy();

  // Search all notes
  const results = await searchNotes({
    tags: [],
    scope: "all",
    recent,
  });

  // Validate each note
  interface ValidationIssue {
    note: string;
    path: string;
    invalid: string[];
    missing: string[];
  }

  const issues: ValidationIssue[] = [];
  let totalNotes = 0;
  let notesWithIssues = 0;

  for (const note of results) {
    totalNotes++;
    const validation = validateTags(note.tags, taxonomy);

    const noteIssues: ValidationIssue = {
      note: note.name,
      path: note.path,
      invalid: [],
      missing: [],
    };

    if (invalid && validation.invalid.length > 0) {
      noteIssues.invalid = validation.invalid;
    }

    if (missingRequired && validation.missing.length > 0) {
      noteIssues.missing = validation.missing;
    }

    if (noteIssues.invalid.length > 0 || noteIssues.missing.length > 0) {
      issues.push(noteIssues);
      notesWithIssues++;
    }
  }

  // Output
  if (format === "json") {
    console.log(JSON.stringify({
      totalNotes,
      notesWithIssues,
      issues,
    }, null, 2));
  } else {
    console.log(`\nVault Validation Report`);
    console.log("═".repeat(50));
    console.log(`Total notes: ${totalNotes}`);
    console.log(`Notes with issues: ${notesWithIssues}`);

    if (issues.length === 0) {
      console.log("\n✓ All notes pass validation");
    } else {
      if (missingRequired) {
        const withMissing = issues.filter(i => i.missing.length > 0);
        if (withMissing.length > 0) {
          console.log(`\n⚠️  Notes missing required dimensions (${withMissing.length}):`);
          for (const issue of withMissing.slice(0, 20)) {
            console.log(`   ${issue.note}: missing ${issue.missing.join(", ")}`);
          }
          if (withMissing.length > 20) {
            console.log(`   ... and ${withMissing.length - 20} more`);
          }
        }
      }

      if (invalid) {
        const withInvalid = issues.filter(i => i.invalid.length > 0);
        if (withInvalid.length > 0) {
          console.log(`\n❌ Notes with invalid tags (${withInvalid.length}):`);
          for (const issue of withInvalid.slice(0, 20)) {
            console.log(`   ${issue.note}: ${issue.invalid.join(", ")}`);
          }
          if (withInvalid.length > 20) {
            console.log(`   ... and ${withInvalid.length - 20} more`);
          }
        }
      }
    }

    console.log("");
  }

  // Exit with error if issues found
  if (notesWithIssues > 0) {
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Stats Command (REQ-OBS-TAX-004, REQ-OBS-TAX-006)
// ═══════════════════════════════════════════════════════════════════════════

async function handleStats(args: string[]) {
  const subcommand = args[0];

  if (!subcommand) {
    console.error("Usage: ctx stats <tags|coverage|legacy> [options]");
    console.error("  ctx stats tags [--by-dimension]    Tag usage statistics");
    console.error("  ctx stats coverage                 Dimension coverage report");
    console.error("  ctx stats legacy                   Knowledge base health report");
    process.exit(1);
  }

  switch (subcommand) {
    case "tags":
      await handleStatsTags(args.slice(1));
      break;
    case "coverage":
      await handleStatsCoverage(args.slice(1));
      break;
    case "legacy":
      await handleStatsLegacy(args.slice(1));
      break;
    default:
      console.error(`Unknown stats subcommand: ${subcommand}`);
      console.error("Use: tags, coverage, legacy");
      process.exit(1);
  }
}

async function handleStatsTags(args: string[]) {
  let byDimension = false;

  for (const arg of args) {
    if (arg === "--by-dimension") {
      byDimension = true;
    }
  }

  // Get all notes
  const results = await searchNotes({ tags: [], scope: "all" });

  // Count tags
  const tagCounts = new Map<string, number>();
  for (const note of results) {
    for (const tag of note.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  if (byDimension) {
    const taxonomy = await getDefaultTaxonomy();

    console.log("\nTag Statistics by Dimension");
    console.log("─".repeat(40));

    for (const dim of taxonomy.dimensions) {
      const prefix = dim.prefix.split("|")[0];
      const dimTags = [...tagCounts.entries()]
        .filter(([tag]) => tag.startsWith(prefix))
        .sort((a, b) => b[1] - a[1]);

      if (dimTags.length > 0) {
        console.log(`\n${dim.name}/ (${dimTags.length} unique)`);
        for (const [tag, count] of dimTags.slice(0, 10)) {
          const value = tag.slice(prefix.length);
          console.log(`  ${value}: ${count}`);
        }
        if (dimTags.length > 10) {
          console.log(`  ... and ${dimTags.length - 10} more`);
        }
      }
    }
  } else {
    console.log("\nTag Usage Statistics");
    console.log("─".repeat(40));
    console.log(`Total unique tags: ${tagCounts.size}`);
    console.log(`\nTop 20 tags:`);

    const sorted = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [tag, count] of sorted.slice(0, 20)) {
      console.log(`  ${tag}: ${count}`);
    }
  }

  console.log("");
}

async function handleStatsCoverage(args: string[]) {
  const taxonomy = await getDefaultTaxonomy();
  const results = await searchNotes({ tags: [], scope: "all" });
  const totalNotes = results.length;

  console.log("\nDimension Coverage Report");
  console.log("─".repeat(50));
  console.log(`Total notes: ${totalNotes}`);
  console.log("");

  for (const dim of taxonomy.dimensions) {
    const prefix = dim.prefix.split("|")[0];
    const notesWithDim = results.filter(note =>
      note.tags.some(tag => tag.startsWith(prefix))
    ).length;

    const percentage = totalNotes > 0 ? (notesWithDim / totalNotes * 100).toFixed(1) : "0.0";
    const bar = "█".repeat(Math.round(notesWithDim / totalNotes * 20)) +
                "░".repeat(20 - Math.round(notesWithDim / totalNotes * 20));
    const required = dim.required ? " [required]" : "";

    console.log(`${dim.name.padEnd(12)} ${bar} ${percentage.padStart(5)}% (${notesWithDim}/${totalNotes})${required}`);
  }

  console.log("");
}

async function handleStatsLegacy(args: string[]) {
  console.log("\nGenerating knowledge base health report...\n");
  const report = await generateKnowledgeHealthReport();
  const formatted = formatKnowledgeHealthReport(report);
  console.log(formatted);
}

// ═══════════════════════════════════════════════════════════════════════════
// suggest-tags Command (REQ-OBS-TAX-009)
// ═══════════════════════════════════════════════════════════════════════════

async function handleSuggestTags(args: string[]) {
  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    console.log(`
ctx suggest-tags - Suggest tags for a note using AI inference

USAGE:
  ctx suggest-tags <note>          Suggest tags for a note
  ctx suggest-tags 3               Use index from last search
  ctx suggest-tags "My Note"       Use note name pattern

OPTIONS:
  --verbose, -v    Show inference sources and reasoning
  --json           Output as JSON

EXAMPLES:
  ctx suggest-tags 1
  ctx suggest-tags "2025-12-16-Meeting"
  ctx suggest-tags 3 --verbose
`);
    return;
  }

  const config = await getConfig();
  const taxonomy = await getDefaultTaxonomy();

  // Parse arguments
  const verbose = args.includes("--verbose") || args.includes("-v");
  const jsonOutput = args.includes("--json");
  const noteRef = args.filter(a => !a.startsWith("-"))[0];

  if (!noteRef) {
    console.error("Error: Note reference required");
    console.log("Usage: ctx suggest-tags <note-index-or-name>");
    process.exit(1);
  }

  // Resolve note path
  let notePath: string | null = null;
  let noteTitle = noteRef;

  // Check if it's a numeric index
  if (/^\d+$/.test(noteRef)) {
    const index = parseInt(noteRef, 10);
    const searchIndex = await loadSearchIndex();
    if (!searchIndex) {
      console.error("Error: No previous search. Run ctx search first or provide note name.");
      process.exit(1);
    }
    // Search in both tagMatches and semanticMatches
    const allResults = [...(searchIndex.tagMatches || []), ...(searchIndex.semanticMatches || [])];
    const item = allResults.find(r => r.index === index);
    if (!item) {
      console.error(`Error: Index ${index} not found in last search results`);
      process.exit(1);
    }
    notePath = item.path;
    noteTitle = item.name;
  } else {
    // Try to resolve by name
    notePath = await resolveNotePath(noteRef, config.vaultPath);
    if (!notePath) {
      console.error(`Error: Note not found: ${noteRef}`);
      process.exit(1);
    }
  }

  // Read the note
  let noteContent: string;
  try {
    noteContent = await readNote(notePath);
  } catch (err) {
    console.error(`Error: Could not read note: ${notePath}`);
    process.exit(1);
  }

  // Extract current tags from frontmatter
  const currentTags: string[] = [];
  const frontmatterMatch = noteContent.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const tagsMatch = frontmatterMatch[1].match(/tags:\s*\[(.*?)\]/);
    if (tagsMatch) {
      currentTags.push(...tagsMatch[1].split(",").map(t => t.trim().replace(/['"]/g, "")));
    }
  }

  // Detect source from current tags or default to cli
  let source: SourceType = "cli";
  for (const tag of currentTags) {
    if (tag.startsWith("source/")) {
      const sourceVal = tag.replace("source/", "");
      if (["telegram", "clipboard", "voice", "web", "file", "screenshot", "cli"].includes(sourceVal)) {
        source = sourceVal as SourceType;
        break;
      }
    }
  }

  // Run inference
  const inference = inferTags(
    {
      content: noteContent,
      source,
      existingTags: currentTags,
    },
    taxonomy
  );

  // Calculate suggested additions (tags not already present)
  const suggestedAdditions = inference.tags.filter(t => !currentTags.includes(t));

  // Calculate confidence based on inference source
  const getConfidence = (tag: string): number => {
    if (inference.sources.explicit.includes(tag)) return 1.0;
    if (inference.sources.hint.includes(tag)) return 0.95;
    if (inference.sources.sourceInferred.includes(tag)) return 0.90;
    if (inference.sources.contentInferred.includes(tag)) return 0.85;
    if (inference.sources.defaults.includes(tag)) return 0.80;
    return 0.70;
  };

  // Output
  if (jsonOutput) {
    console.log(JSON.stringify({
      note: noteTitle,
      path: notePath,
      currentTags,
      suggestedAdditions: suggestedAdditions.map(tag => ({
        tag,
        confidence: getConfidence(tag),
        source: inference.sources.explicit.includes(tag) ? "explicit" :
                inference.sources.hint.includes(tag) ? "hint" :
                inference.sources.sourceInferred.includes(tag) ? "source" :
                inference.sources.contentInferred.includes(tag) ? "content" :
                inference.sources.defaults.includes(tag) ? "default" : "unknown"
      })),
      allTags: inference.tags,
    }, null, 2));
    return;
  }

  console.log(`\nSuggested tags for: ${noteTitle}`);
  console.log("─".repeat(50));

  console.log(`\nCurrent tags: ${currentTags.length > 0 ? currentTags.join(", ") : "(none)"}`);

  if (suggestedAdditions.length > 0) {
    console.log("\nSuggested additions:");
    for (const tag of suggestedAdditions) {
      const conf = getConfidence(tag);
      const confStr = (conf * 100).toFixed(0);
      const source = inference.sources.sourceInferred.includes(tag) ? "source detection" :
                     inference.sources.contentInferred.includes(tag) ? "content analysis" :
                     inference.sources.defaults.includes(tag) ? "required default" : "inference";
      console.log(`  ${tag} (${confStr}% confidence) - ${source}`);
    }
  } else {
    console.log("\n✓ Note already has comprehensive tags");
  }

  if (verbose) {
    console.log("\n\nInference breakdown:");
    console.log("─".repeat(50));
    if (inference.sources.explicit.length > 0) {
      console.log(`  Explicit: ${inference.sources.explicit.join(", ")}`);
    }
    if (inference.sources.hint.length > 0) {
      console.log(`  From hints: ${inference.sources.hint.join(", ")}`);
    }
    if (inference.sources.sourceInferred.length > 0) {
      console.log(`  From source: ${inference.sources.sourceInferred.join(", ")}`);
    }
    if (inference.sources.contentInferred.length > 0) {
      console.log(`  From content: ${inference.sources.contentInferred.join(", ")}`);
    }
    if (inference.sources.defaults.length > 0) {
      console.log(`  Defaults added: ${inference.sources.defaults.join(", ")}`);
    }
    if (inference.conflicts.length > 0) {
      console.log(`  Conflicts resolved: ${inference.conflicts.join(", ")}`);
    }
  }

  // Suggest command to apply
  if (suggestedAdditions.length > 0) {
    console.log("\nTo apply suggestions:");
    for (const tag of suggestedAdditions.slice(0, 3)) {
      console.log(`  ctx tag add "${noteTitle}" ${tag}`);
    }
    if (suggestedAdditions.length > 3) {
      console.log(`  ... and ${suggestedAdditions.length - 3} more`);
    }
  }

  console.log("");
}

// ═══════════════════════════════════════════════════════════════════════════
// session Command (REQ-CULT-WF-001, REQ-CULT-WF-010)
// ═══════════════════════════════════════════════════════════════════════════

const SESSION_FILE = join(homedir(), ".cache", "ctx", "current-session.json");

interface SessionState {
  tag: string;
  name: string;
  startedAt: string;
  practice?: PracticeType;
  endedAt?: string;
}

function loadSession(): SessionState | null {
  if (!existsSync(SESSION_FILE)) return null;
  try {
    return JSON.parse(readFileSync(SESSION_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function saveSession(session: SessionState): void {
  const dir = join(homedir(), ".cache", "ctx");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));
}

function clearSession(): void {
  if (existsSync(SESSION_FILE)) {
    const fs = require("fs");
    fs.unlinkSync(SESSION_FILE);
  }
}

async function handleSession(args: string[]) {
  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    console.log(`
ctx session - Manage cultivation sessions

USAGE:
  ctx session start <name> [--practice <type>]  Start a new session
  ctx session end                               End current session
  ctx session status                            Show current/resumable session
  ctx session resume                            Resume interrupted session (<24h)

PRACTICE TYPES:
  sweep    Daily inbox triage
  weave    Weekly connection building
  dive     Deep focused exploration
  survey   Monthly landscape view
  compass  Quarterly alignment check
  mirror   Annual reflection

EXAMPLES:
  ctx session start lifeos
  ctx session start deep-research --practice dive
  ctx session end
  ctx session status

The session tag format is: session/<name>-<YYYY-MM-DD-HHMM>
This tag can be applied to notes captured during the session.

When a session with --practice ends, practice completion is recorded.
`);
    return;
  }

  const subcommand = args[0];

  switch (subcommand) {
    case "start": {
      // Parse --practice flag
      const practiceIndex = args.indexOf("--practice");
      let practice: PracticeType | undefined;
      if (practiceIndex !== -1 && args[practiceIndex + 1]) {
        const practiceArg = args[practiceIndex + 1];
        const validPractices: PracticeType[] = ["sweep", "weave", "dive", "survey", "compass", "mirror"];
        if (validPractices.includes(practiceArg as PracticeType)) {
          practice = practiceArg as PracticeType;
        } else {
          console.error(`Invalid practice type: ${practiceArg}`);
          console.log(`Valid types: ${validPractices.join(", ")}`);
          process.exit(1);
        }
      }

      // Get session name (exclude flags)
      const nameArgs = args.slice(1).filter((a, i) =>
        !a.startsWith("-") && args[i] !== "--practice" && args[i - 1] !== "--practice"
      );
      const name = nameArgs.join("-") || "default";

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 16).replace("T", "-").replace(":", "");
      const tag = `session/${name}-${dateStr}`;

      const session: SessionState = {
        tag,
        name,
        startedAt: now.toISOString(),
        practice,
      };
      saveSession(session);

      console.log(`\n✓ Session started: ${tag}`);
      if (practice) {
        const cadence = PRACTICE_CADENCES[practice];
        console.log(`  Practice: ${cadence.emoji} ${cadence.name} (${practice})`);
      }
      console.log(`\nTo apply this tag to captures:`);
      console.log(`  ingest direct --tags "${tag}" ...`);
      console.log(`  ctx tag add <note> ${tag}`);
      console.log("");
      break;
    }

    case "end": {
      const session = loadSession();
      if (!session) {
        console.log("\nNo active session to end.");
        console.log("Start one with: ctx session start <name>");
        console.log("");
        return;
      }

      const config = getConfig();
      const endedAt = new Date().toISOString();
      const durationMinutes = calculateDurationMinutes(session.startedAt, endedAt);

      // Create session note in vault
      const sessionMetadata: SessionMetadata = {
        tag: session.tag,
        name: session.name,
        topic: session.name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), // Title case
        practice: session.practice,
        startedAt: session.startedAt,
        endedAt,
        durationMinutes,
      };

      try {
        const notePath = createSessionNote(sessionMetadata, config.vaultPath);
        console.log(`\n📝 Session note created: Sessions/${session.tag.replace("session/", "")}.md`);
      } catch (err) {
        console.error(`\n⚠️ Could not create session note: ${err}`);
      }

      // Record practice completion if linked
      if (session.practice) {
        recordPracticeCompletion(session.practice);
        const message = getCompletionMessage(session.practice);
        console.log(`\n${message}`);
      }

      console.log(`\n✓ Session ended: ${session.tag}`);
      console.log(`  Duration: ${durationMinutes} minutes`);
      if (session.practice) {
        console.log(`  Practice recorded: ${session.practice}`);
      }

      clearSession();
      console.log("");
      break;
    }

    case "status": {
      // Check both old session system and new session-awareness
      const oldSession = loadSession();
      const newSession = getActiveSession();

      if (!oldSession && !newSession) {
        console.log("\nNo active session.");
        console.log("Start one with: ctx session start <name>");
        console.log("Or implicitly via: ctx weave");
      } else if (newSession) {
        // Use new session-awareness system
        console.log("\n" + formatSessionStatus());
      } else if (oldSession) {
        // Fallback to old session system
        const started = new Date(oldSession.startedAt);
        const ago = Math.round((Date.now() - started.getTime()) / 60000);
        console.log(`\nActive session: ${oldSession.tag}`);
        console.log(`Started: ${ago} minutes ago`);
        if (oldSession.practice) {
          const cadence = PRACTICE_CADENCES[oldSession.practice];
          console.log(`Practice: ${cadence.emoji} ${cadence.name}`);
        }
      }
      console.log("");
      break;
    }

    case "resume": {
      // Check for active session first
      if (hasActiveSession()) {
        console.log("\n⚠️  Session already active.");
        console.log(formatSessionStatus());
        console.log("\nEnd it first with: ctx session end");
        console.log("");
        return;
      }

      // Check for resumable session
      if (!canResumeSession()) {
        const interrupted = getInterruptedSession();
        if (interrupted) {
          console.log("\n⚠️  Session too old to resume (>24h).");
          console.log(`  Was: ${interrupted.tag}`);
        } else {
          console.log("\nNo session to resume.");
        }
        console.log("\nStart a new session with:");
        console.log("  ctx weave              (weekly cultivation)");
        console.log("  ctx dive <topic>       (focused exploration)");
        console.log("  ctx session start <name>");
        console.log("");
        return;
      }

      // Resume the session
      try {
        const session = resumeSession();
        console.log(`\n✓ Session resumed: ${session.tag}`);
        console.log(`  Practice: ${session.emoji} ${session.practice}`);
        console.log(`  Originally started: ${new Date(session.startedAt).toLocaleString()}`);
        console.log("\nContinue your work - all captures will use this session tag.");
        console.log("");
      } catch (err) {
        console.error(`\n⚠️  Could not resume session: ${err instanceof Error ? err.message : err}`);
        console.log("");
      }
      break;
    }

    default:
      console.error(`Unknown session subcommand: ${subcommand}`);
      console.log("Run 'ctx session --help' for usage.");
      process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// cultivate Command (REQ-BACKLOG-001 through REQ-BACKLOG-012)
// ═══════════════════════════════════════════════════════════════════════════

async function handleCultivate(args: string[]) {
  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    console.log(`
ctx cultivate - Cultivation tools for knowledge processing

USAGE:
  ctx cultivate backlog [options]      Scan and cluster inbox notes
  ctx cultivate daily-split <pattern>  Split daily notes into atomic notes
  ctx cultivate insights [options]     Analyze interest patterns over time
  ctx cultivate review [options]       Interactive flashcard review mode

BACKLOG OPTIONS:
  --limit, -l <n>    Limit notes to scan (default: 100)
  --dry-run          Show analysis without making changes

DAILY-SPLIT OPTIONS:
  <pattern>          Glob pattern for daily notes (e.g., "2025-12-*.md")
  --dry-run          Preview splits without creating notes

INSIGHTS OPTIONS:
  --recent <n>       Analyze last N days (default: 30)
  --legacy           Show growth trends and synthesis rate metrics
  --identity         Show identity signals (focus, emerging, core, neglected)

REVIEW OPTIONS (FLASHCARD MODE):
  --since <date>     Notes captured since date (7d, 2w, 1m, today, YYYY-MM-DD)
  --session <tag>    Filter by session tag
  --source <source>  Filter by source dimension (e.g., telegram)
  --tag, -t <tag>    Filter by tag (can use multiple)
  --limit, -l <n>    Maximum notes to review
  --scope <scope>    Scope filter: work (default), private, all
  --json             Output as JSON (non-interactive mode)

EXAMPLES:
  ctx cultivate backlog --limit 50
  ctx cultivate daily-split "2025-12-*.md" --dry-run
  ctx cultivate insights --recent 30
  ctx cultivate review --since 7d --limit 10
  ctx cultivate review --source telegram --tag project/pai
`);
    return;
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);

  switch (subcommand) {
    case "backlog":
      await handleCultivateBacklog(subArgs);
      break;
    case "daily-split":
      await handleCultivateDailySplit(subArgs);
      break;
    case "insights":
      await handleCultivateInsights(subArgs);
      break;
    case "review":
      await handleCultivateReview(subArgs);
      break;
    default:
      console.error(`Unknown cultivate subcommand: ${subcommand}`);
      console.log("Run 'ctx cultivate --help' for usage.");
      process.exit(1);
  }
}

async function handleCultivateBacklog(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx cultivate backlog - Scan and cluster inbox notes

USAGE:
  ctx cultivate backlog [options]

OPTIONS:
  --limit, -l <n>    Limit notes to scan (default: 100)
  --dry-run          Show analysis without making changes

Scans notes with status/inbox tag and clusters them by topic
using semantic similarity. Suggests cultivation sessions.
`);
    return;
  }

  const dryRun = args.includes("--dry-run");
  let limit = 100;
  const limitIdx = args.findIndex(a => a === "--limit" || a === "-l");
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    limit = parseInt(args[limitIdx + 1], 10);
  }

  console.log(`\nScanning inbox notes (limit: ${limit})...`);

  // Search for inbox notes
  const results = await searchNotes({
    tags: ["status/inbox"],
    anyTags: ["incoming", "raw"],  // Also include legacy tags
    scope: "all",
    limit,
  });

  console.log(`Found ${results.length} inbox notes`);

  if (results.length === 0) {
    console.log("No inbox notes to process.");
    console.log("\nClusters: 0 (empty inbox)");
    if (dryRun) {
      console.log("\n[DRY RUN] No changes needed.");
    }
    return;
  }

  // Group by topic tags
  const topicClusters = new Map<string, typeof results>();
  const unclustered: typeof results = [];

  for (const note of results) {
    const topicTags = note.tags.filter(t => t.startsWith("topic/"));
    if (topicTags.length > 0) {
      const mainTopic = topicTags[0];
      if (!topicClusters.has(mainTopic)) {
        topicClusters.set(mainTopic, []);
      }
      topicClusters.get(mainTopic)!.push(note);
    } else {
      unclustered.push(note);
    }
  }

  // Sort clusters by size
  const sortedClusters = [...topicClusters.entries()].sort((a, b) => b[1].length - a[1].length);

  console.log(`\nClusters identified:`);
  let i = 1;
  for (const [topic, notes] of sortedClusters.slice(0, 10)) {
    console.log(`  ${i}. ${topic} (${notes.length} notes)`);
    i++;
  }
  if (unclustered.length > 0) {
    console.log(`  ${i}. (uncategorized) (${unclustered.length} notes)`);
  }

  if (dryRun) {
    console.log(`\n[DRY RUN] No changes made.`);
  }

  // Suggest sessions
  if (sortedClusters.length > 0) {
    console.log(`\nSuggested cultivation sessions:`);
    for (const [topic, notes] of sortedClusters.slice(0, 3)) {
      const topicName = topic.replace("topic/", "");
      console.log(`  ctx session start "${topicName}" → ${notes.length} notes to process`);
    }
  }

  console.log("");
}

async function handleCultivateDailySplit(args: string[]) {
  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    console.log(`
ctx cultivate daily-split - Split daily notes into atomic notes

USAGE:
  ctx cultivate daily-split <pattern> [options]

OPTIONS:
  --dry-run    Preview splits without creating notes

Parses daily notes and splits them into atomic notes, one per entry.
Each atomic note gets proper taxonomy tags and links back to source.

EXAMPLES:
  ctx cultivate daily-split "2025-12-01-Daily.md" --dry-run
  ctx cultivate daily-split "2025-12-*.md"
`);
    return;
  }

  const dryRun = args.includes("--dry-run");
  const pattern = args.find(a => !a.startsWith("-"));

  if (!pattern) {
    console.error("Error: Pattern required");
    process.exit(1);
  }

  console.log(`\nScanning for daily notes matching: ${pattern}`);
  console.log(`[DRY RUN: ${dryRun}]`);

  // For now, just show what would happen
  // Full implementation would:
  // 1. Find matching files
  // 2. Parse each file for entries (timestamps, bullets, sections)
  // 3. Create atomic notes with proper frontmatter
  // 4. Link back to source

  console.log(`\nDaily split would:`);
  console.log(`  1. Find notes matching "${pattern}"`);
  console.log(`  2. Parse entries (timestamps, bullets, sections)`);
  console.log(`  3. Create atomic notes with taxonomy tags`);
  console.log(`  4. Link back to source daily note`);

  if (dryRun) {
    console.log(`\n[DRY RUN] No notes created.`);
  }

  console.log("");
}

async function handleCultivateInsights(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx cultivate insights - Analyze interest patterns over time

USAGE:
  ctx cultivate insights [options]

OPTIONS:
  --recent <n>    Analyze last N days (default: 30)
  --legacy        Show growth trends and synthesis rate metrics
  --identity      Show identity signals (focus, emerging, core, neglected)

Shows topic trends, emerging interests, and abandoned topics
based on your capture patterns over time.

EXAMPLES:
  ctx cultivate insights --recent 30
  ctx cultivate insights --legacy
  ctx cultivate insights --identity
`);
    return;
  }

  const showLegacy = args.includes("--legacy");
  const showIdentity = args.includes("--identity");

  // If --legacy flag provided, show growth metrics
  if (showLegacy) {
    let days = 30;
    const recentIdx = args.findIndex(a => a === "--recent");
    if (recentIdx !== -1 && args[recentIdx + 1]) {
      days = parseInt(args[recentIdx + 1], 10);
    }

    console.log(`\nCalculating growth metrics (${days} days)...\n`);
    const metrics = await calculateGrowthMetrics(days);
    const formatted = formatGrowthMetrics(metrics);
    console.log(formatted);
    return;
  }

  // If --identity flag provided, show identity signals
  if (showIdentity) {
    console.log(`\nAnalyzing knowledge identity signals...\n`);
    const signals = await analyzeIdentitySignals();
    const formatted = formatIdentitySignals(signals);
    console.log(formatted);
    return;
  }

  // Default behavior: simple topic count analysis
  let recentDays = 90;
  const recentIdx = args.findIndex(a => a === "--recent");
  if (recentIdx !== -1 && args[recentIdx + 1]) {
    recentDays = parseInt(args[recentIdx + 1], 10);
  }

  console.log(`\nInterest Analysis (last ${recentDays} days)`);
  console.log("─".repeat(50));

  // Search for recent notes
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - recentDays);
  const sinceStr = sinceDate.toISOString().slice(0, 10);

  const results = await searchNotes({
    tags: [],
    scope: "all",
    since: sinceStr,
  });

  console.log(`Total notes: ${results.length}`);

  // Count topics
  const topicCounts = new Map<string, number>();
  for (const note of results) {
    for (const tag of note.tags) {
      if (tag.startsWith("topic/")) {
        topicCounts.set(tag, (topicCounts.get(tag) || 0) + 1);
      }
    }
  }

  // Sort by count
  const sortedTopics = [...topicCounts.entries()].sort((a, b) => b[1] - a[1]);

  console.log(`\nTop topics:`);
  for (const [topic, count] of sortedTopics.slice(0, 10)) {
    const bar = "█".repeat(Math.min(count, 20));
    console.log(`  ${topic.padEnd(25)} ${bar} ${count}`);
  }

  // Show capture trends by week
  const weekCounts = new Map<string, number>();
  for (const note of results) {
    const weekStart = getWeekStart(new Date(note.date));
    weekCounts.set(weekStart, (weekCounts.get(weekStart) || 0) + 1);
  }

  const sortedWeeks = [...weekCounts.entries()].sort();
  console.log(`\nCapture trend by week:`);
  for (const [week, count] of sortedWeeks.slice(-8)) {
    const bar = "█".repeat(Math.min(Math.round(count / 5), 20));
    console.log(`  ${week} ${bar} ${count}`);
  }

  console.log("");
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

async function handleCultivateReview(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx cultivate review - Interactive flashcard review mode

USAGE:
  ctx cultivate review [options]

OPTIONS:
  --since <date>     Notes captured since date (7d, 2w, 1m, today, YYYY-MM-DD)
  --session <tag>    Filter by session tag
  --source <source>  Filter by source dimension (e.g., telegram)
  --tag, -t <tag>    Filter by tag (can use multiple)
  --limit, -l <n>    Maximum notes to review
  --scope <scope>    Scope filter: work (default), private, all
  --json             Output as JSON (non-interactive mode)

DESCRIPTION:
  Presents captured notes one at a time in flashcard mode with:
  - Current tags displayed
  - Connection suggestions (shared tags + semantic similarity)
  - Keyboard navigation: [n]ext [p]rev [t]ags [l]ink [s]kip [d]one [q]uit

EXAMPLES:
  ctx cultivate review --since 7d --limit 10
  ctx cultivate review --source telegram --tag project/pai
  ctx cultivate review --session 2025-12-15 --json
`);
    return;
  }

  const isJson = args.includes("--json");
  const filterOpts = parseFilterOptions(args);

  // Start flashcard session
  const session = await startFlashcardSession(filterOpts);

  if (session.notes.length === 0) {
    console.log("No notes found matching filters.");
    return;
  }

  if (isJson) {
    // Non-interactive JSON mode with Zettelkasten analysis
    const note = getCurrentNote(session);
    if (!note) {
      console.log(JSON.stringify({ total: 0, notes: [] }, null, 2));
      return;
    }

    // Get connection suggestions
    const connections = await suggestConnections(note);

    // Analyze for multiple ideas (REQ-ZK-002)
    const atomicAnalysis = detectMultipleIdeas(note.content);

    // Add suggested connection types (REQ-ZK-001)
    const connectionPrompts = connections.map((conn) => ({
      target: conn.noteName,
      similarity: conn.score,
      suggestedType: suggestConnectionType(note, conn),
      sharedTags: conn.sharedTags || [],
    }));

    const output = {
      total: session.notes.length,
      currentIndex: session.currentIndex,
      note: {
        name: note.name,
        path: note.path,
        tags: note.tags,
        preview: note.preview,
        captureDate: note.captureDate?.toISOString(),
      },
      zettelkasten: {
        atomicAnalysis: {
          hasMultipleIdeas: atomicAnalysis.hasMultipleIdeas,
          ideaCount: atomicAnalysis.ideaCount,
          reason: atomicAnalysis.reason,
          splitSuggestions: atomicAnalysis.hasMultipleIdeas
            ? generateAtomicSplitSuggestion(note.content)
            : [],
        },
        connectionPrompts,
      },
    };

    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Interactive mode with Zettelkasten intelligence
  console.log(`\n📚 Flashcard Review Session`);
  console.log(`Found ${session.notes.length} notes to review\n`);

  // For now, display first flashcard as a demo
  const note = getCurrentNote(session);
  if (note) {
    // Get connection suggestions
    const connections = await suggestConnections(note);

    // Analyze for multiple ideas (REQ-ZK-002)
    const atomicAnalysis = detectMultipleIdeas(note.content);

    // Use new Zettelkasten display (REQ-ZK-005)
    const display = renderZettelkastenFlashcard(session, connections, atomicAnalysis);
    console.log(display);
    console.log("\n💡 Interactive mode coming soon!");
    console.log("Use --json flag for non-interactive output with full Zettelkasten analysis.\n");
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Graph Commands - Ephemeral Knowledge Graph Analysis
// ═══════════════════════════════════════════════════════════════════════════

async function handleGraph(args: string[]) {
  // Only show main help if no subcommand provided
  if (args.length === 0 || (args.length === 1 && (args[0] === "--help" || args[0] === "-h"))) {
    console.log(`
ctx graph - Ephemeral Knowledge Graph Analysis

USAGE:
  ctx graph <subcommand> [options]

SUBCOMMANDS:
  clusters      Find topic clusters in your notes
  orphans       Find notes with no connections
  suggest-links Suggest potential links between notes
  connections   Show connections for a specific note

Graph analysis is computed on-demand from your markdown content.
No persistent graph database - always reflects current vault state.

EXAMPLES:
  ctx graph clusters --recent 100     # Find clusters in recent notes
  ctx graph orphans                   # Find isolated notes
  ctx graph suggest-links 3           # Suggest links for note #3
  ctx graph connections "My Note"     # Show all connections for a note
`);
    return;
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);

  switch (subcommand) {
    case "clusters":
      await handleGraphClusters(subArgs);
      break;
    case "orphans":
      await handleGraphOrphans(subArgs);
      break;
    case "suggest-links":
      await handleGraphSuggestLinks(subArgs);
      break;
    case "connections":
      await handleGraphConnections(subArgs);
      break;
    default:
      console.error(`Unknown graph subcommand: ${subcommand}`);
      console.log("Run 'ctx graph --help' for usage.");
      process.exit(1);
  }
}

async function handleGraphClusters(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx graph clusters - Find topic clusters

USAGE:
  ctx graph clusters [options]

OPTIONS:
  --recent, -r <n>   Limit to N most recent notes (default: 100)
  --min-size <n>     Minimum cluster size (default: 3)

Identifies clusters of related notes based on shared tags and topics.
Useful for finding themes in your knowledge base.
`);
    return;
  }

  let recent = 100;
  let minSize = 3;

  const recentIdx = args.findIndex(a => a === "--recent" || a === "-r");
  if (recentIdx !== -1 && args[recentIdx + 1]) {
    recent = parseInt(args[recentIdx + 1], 10);
  }

  const minIdx = args.findIndex(a => a === "--min-size");
  if (minIdx !== -1 && args[minIdx + 1]) {
    minSize = parseInt(args[minIdx + 1], 10);
  }

  console.log(`\nAnalyzing clusters (recent ${recent} notes, min size ${minSize})...`);

  const results = await searchNotes({
    tags: [],
    scope: "all",
    limit: recent,
  });

  console.log(`Found ${results.length} notes`);

  // Build tag co-occurrence matrix
  const tagNotes = new Map<string, Set<string>>();
  const noteTags = new Map<string, Set<string>>();

  for (const note of results) {
    const noteId = note.name;
    noteTags.set(noteId, new Set(note.tags));

    for (const tag of note.tags) {
      if (!tagNotes.has(tag)) {
        tagNotes.set(tag, new Set());
      }
      tagNotes.get(tag)!.add(noteId);
    }
  }

  // Cluster by topic tags
  const topicClusters = new Map<string, string[]>();
  for (const [tag, notes] of tagNotes.entries()) {
    if (tag.startsWith("topic/") && notes.size >= minSize) {
      topicClusters.set(tag, [...notes]);
    }
  }

  // Sort by size
  const sorted = [...topicClusters.entries()].sort((a, b) => b[1].length - a[1].length);

  console.log(`\nClusters found: ${sorted.length}`);
  console.log("─".repeat(50));

  for (const [topic, notes] of sorted.slice(0, 15)) {
    console.log(`\n${topic} (${notes.length} notes)`);
    for (const note of notes.slice(0, 5)) {
      console.log(`  • ${note}`);
    }
    if (notes.length > 5) {
      console.log(`  ... and ${notes.length - 5} more`);
    }
  }

  console.log("");
}

async function handleGraphOrphans(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx graph orphans - Find notes with no connections

USAGE:
  ctx graph orphans [options]

OPTIONS:
  --recent, -r <n>   Limit to N most recent notes (default: 200)

Finds notes that have:
- No topic tags
- No person tags
- No project tags
- No wiki-links to other notes

These are candidates for cultivation or archiving.
`);
    return;
  }

  let recent = 200;
  const recentIdx = args.findIndex(a => a === "--recent" || a === "-r");
  if (recentIdx !== -1 && args[recentIdx + 1]) {
    recent = parseInt(args[recentIdx + 1], 10);
  }

  console.log(`\nFinding orphan notes (recent ${recent})...`);

  const results = await searchNotes({
    tags: [],
    scope: "all",
    limit: recent,
  });

  const orphans: typeof results = [];

  for (const note of results) {
    const hasTopic = note.tags.some(t => t.startsWith("topic/"));
    const hasPerson = note.tags.some(t => t.startsWith("person/"));
    const hasProject = note.tags.some(t => t.startsWith("project/"));

    // Note is orphan if it lacks semantic connections
    if (!hasTopic && !hasPerson && !hasProject) {
      orphans.push(note);
    }
  }

  console.log(`\nOrphan notes: ${orphans.length} / ${results.length}`);
  console.log("─".repeat(50));

  if (orphans.length === 0) {
    console.log("No orphan notes found. Your vault is well-connected!");
    return;
  }

  // Group by status
  const byStatus = new Map<string, typeof orphans>();
  for (const note of orphans) {
    const status = note.tags.find(t => t.startsWith("status/")) || "status/unknown";
    if (!byStatus.has(status)) {
      byStatus.set(status, []);
    }
    byStatus.get(status)!.push(note);
  }

  for (const [status, notes] of byStatus.entries()) {
    console.log(`\n${status} (${notes.length} orphans)`);
    for (const note of notes.slice(0, 5)) {
      console.log(`  • ${note.name}`);
    }
    if (notes.length > 5) {
      console.log(`  ... and ${notes.length - 5} more`);
    }
  }

  console.log(`\nTip: Use 'ctx cultivate backlog' to process these notes.`);
  console.log("");
}

async function handleGraphSuggestLinks(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx graph suggest-links - Suggest potential links between notes

USAGE:
  ctx graph suggest-links <note>

Analyzes a note and suggests other notes that might be related.
Uses tag similarity and semantic search to find connections.

EXAMPLES:
  ctx graph suggest-links 3              # Use index from last search
  ctx graph suggest-links "My Note"      # Use note name
`);
    return;
  }

  const noteRef = args.find(a => !a.startsWith("-"));
  if (!noteRef) {
    console.error("Error: Note reference required");
    console.log("Usage: ctx graph suggest-links <note-index-or-name>");
    process.exit(1);
  }

  // Resolve note path
  let notePath: string | null = null;
  const config = await getConfig();

  // Try as index first
  const index = parseInt(noteRef, 10);
  if (!isNaN(index)) {
    const searchIndex = loadSearchIndex();
    if (searchIndex) {
      const allResults = [...(searchIndex.tagMatches || []), ...(searchIndex.semanticMatches || [])];
      const item = allResults.find(r => r.index === index);
      if (item) {
        notePath = item.path;
      }
    }
  }

  // Try as name
  if (!notePath) {
    notePath = await resolveNotePath(noteRef, config.VAULT_PATH);
  }

  if (!notePath) {
    console.error(`Could not find note: ${noteRef}`);
    process.exit(1);
  }

  console.log(`\nFinding connections for: ${notePath.split("/").pop()}`);
  console.log("─".repeat(50));

  // Read the note to get its tags
  const noteContent = await readNote(notePath);
  const frontmatterMatch = noteContent.match(/^---\n([\s\S]*?)\n---/);
  const noteTags: string[] = [];

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const tagsMatch = frontmatter.match(/tags:\s*\n((?:\s*-\s*[^\n]+\n?)*)/);
    if (tagsMatch) {
      const tagLines = tagsMatch[1].split("\n");
      for (const line of tagLines) {
        const tagMatch = line.match(/^\s*-\s*(.+)/);
        if (tagMatch) {
          noteTags.push(tagMatch[1].trim());
        }
      }
    }
  }

  console.log(`\nNote tags: ${noteTags.slice(0, 5).join(", ") || "(none)"}`);

  // Find notes with shared tags
  if (noteTags.length > 0) {
    const topicTags = noteTags.filter(t => t.startsWith("topic/"));
    const personTags = noteTags.filter(t => t.startsWith("person/"));
    const projectTags = noteTags.filter(t => t.startsWith("project/"));

    if (topicTags.length > 0) {
      console.log(`\nRelated by topic:`);
      const related = await searchNotes({
        anyTags: topicTags,
        scope: "all",
        limit: 10,
      });
      const filtered = related.filter(r => r.path !== notePath);
      for (const note of filtered.slice(0, 5)) {
        const sharedTags = note.tags.filter(t => topicTags.includes(t));
        console.log(`  → ${note.name} [${sharedTags.join(", ")}]`);
      }
    }

    if (personTags.length > 0) {
      console.log(`\nRelated by person:`);
      const related = await searchNotes({
        anyTags: personTags,
        scope: "all",
        limit: 10,
      });
      const filtered = related.filter(r => r.path !== notePath);
      for (const note of filtered.slice(0, 5)) {
        console.log(`  → ${note.name}`);
      }
    }

    if (projectTags.length > 0) {
      console.log(`\nRelated by project:`);
      const related = await searchNotes({
        anyTags: projectTags,
        scope: "all",
        limit: 10,
      });
      const filtered = related.filter(r => r.path !== notePath);
      for (const note of filtered.slice(0, 5)) {
        console.log(`  → ${note.name}`);
      }
    }
  }

  // Try semantic search if we have content
  const bodyContent = noteContent.replace(/^---[\s\S]*?---\n?/, "").trim();
  if (bodyContent.length > 50) {
    console.log(`\nSemantically similar (by content):`);
    try {
      const semanticResults = await semanticSearch(bodyContent.slice(0, 500), {
        limit: 6,
        scope: "all",
      });
      const filtered = semanticResults.filter(r => r.path !== notePath);
      for (const result of filtered.slice(0, 5)) {
        console.log(`  → ${result.name} (${(result.score * 100).toFixed(0)}% similar)`);
      }
    } catch {
      console.log("  (embeddings not available - run 'ctx embed' first)");
    }
  }

  console.log("");
}

async function handleGraphConnections(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx graph connections - Show all connections for a note

USAGE:
  ctx graph connections <note>

Shows inbound and outbound connections for a note:
- Wiki-links to and from other notes
- Shared tags with other notes
- Semantic similarity matches
`);
    return;
  }

  const noteRef = args.find(a => !a.startsWith("-"));
  if (!noteRef) {
    console.error("Error: Note reference required");
    console.log("Usage: ctx graph connections <note-index-or-name>");
    process.exit(1);
  }

  // For now, delegate to suggest-links (same logic)
  console.log("Note: 'connections' shows the same analysis as 'suggest-links'");
  await handleGraphSuggestLinks(args);
}


// ============================================================================
// Maintenance Commands
// ============================================================================

async function handleMaintain(args: string[]) {
  // Show help if no subcommand provided
  if (args.length === 0 || (args.length === 1 && (args[0] === "--help" || args[0] === "-h"))) {
    console.log(`
ctx maintain - Vault Maintenance and Health Checks

USAGE:
  ctx maintain <subcommand> [options]

SUBCOMMANDS:
  health         Overall vault health dashboard (combines all checks)
  large-files    Find large files in vault
  broken-links   Find broken [[wikilinks]]
  orphans        Find notes with no connections
  storage        Storage usage report
  cache-cleanup  Clean embedding and search cache
  clean-suffixes Remove legacy -Telegram-Raw, -Telegram, -Raw from filenames
  clean-tests    Remove test fixture notes ([TEST-*] in filename)

EXAMPLES:
  ctx maintain health                    # Full health dashboard
  ctx maintain large-files --threshold 5 # Find files > 5MB
  ctx maintain broken-links              # Check for broken links
  ctx maintain orphans                   # Find isolated notes
  ctx maintain storage                   # Storage analysis
  ctx maintain cache-cleanup --dry-run   # Preview cache cleanup
  ctx maintain clean-suffixes            # Preview suffix cleanup
  ctx maintain clean-suffixes --execute  # Actually rename files
  ctx maintain clean-tests               # Preview test fixture cleanup
  ctx maintain clean-tests --execute     # Actually delete test files
`);
    return;
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);

  switch (subcommand) {
    case "health":
      await handleMaintainHealth(subArgs);
      break;
    case "large-files":
      await handleMaintainLargeFiles(subArgs);
      break;
    case "broken-links":
      await handleMaintainBrokenLinks(subArgs);
      break;
    case "orphans":
      await handleMaintainOrphans(subArgs);
      break;
    case "storage":
      await handleMaintainStorage(subArgs);
      break;
    case "cache-cleanup":
      await handleMaintainCacheCleanup(subArgs);
      break;
    case "clean-suffixes":
      await handleMaintainCleanSuffixes(subArgs);
      break;
    case "clean-tests":
      await handleMaintainCleanTests(subArgs);
      break;
    default:
      console.error(`Unknown maintain subcommand: ${subcommand}`);
      console.log("Run 'ctx maintain --help' for usage.");
      process.exit(1);
  }
}

async function handleMaintainHealth(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx maintain health - Overall vault health dashboard

USAGE:
  ctx maintain health

Displays a comprehensive health report including:
- Large files (> 1MB)
- Broken wikilinks
- Orphaned notes
- Storage statistics

This combines all maintenance checks into one dashboard.
`);
    return;
  }

  console.log("\n🔍 Generating vault health report...\n");

  const report = await generateHealthReport();

  console.log("═".repeat(60));
  console.log("VAULT HEALTH REPORT");
  console.log(`Generated: ${report.timestamp.toISOString()}`);
  console.log("═".repeat(60));

  // Large Files
  console.log("\n📦 LARGE FILES (> 1MB)");
  console.log("─".repeat(60));
  if (report.largeFiles.length === 0) {
    console.log("✓ No large files found");
  } else {
    console.log(`Found ${report.largeFiles.length} large files:\n`);
    for (const file of report.largeFiles.slice(0, 10)) {
      const type = file.isBinary ? "[BINARY]" : "[TEXT]";
      console.log(`  ${type} ${file.name}`);
      console.log(`      ${formatBytes(file.size)} - ${file.path}`);
    }
    if (report.largeFiles.length > 10) {
      console.log(`  ... and ${report.largeFiles.length - 10} more`);
    }
  }

  // Broken Links
  console.log("\n🔗 BROKEN WIKILINKS");
  console.log("─".repeat(60));
  if (report.brokenLinks.length === 0) {
    console.log("✓ No broken links found");
  } else {
    console.log(`Found ${report.brokenLinks.length} broken links:\n`);
    const bySource = new Map<string, BrokenLink[]>();
    for (const link of report.brokenLinks) {
      if (!bySource.has(link.sourceName)) {
        bySource.set(link.sourceName, []);
      }
      bySource.get(link.sourceName)!.push(link);
    }

    let count = 0;
    for (const [source, links] of bySource.entries()) {
      if (count >= 10) break;
      console.log(`  ${source}:`);
      for (const link of links.slice(0, 3)) {
        console.log(`    → [[${link.brokenLink}]] (line ${link.lineNumber})`);
      }
      if (links.length > 3) {
        console.log(`    ... and ${links.length - 3} more`);
      }
      count++;
    }
    if (bySource.size > 10) {
      console.log(`  ... and ${bySource.size - 10} more notes with broken links`);
    }
  }

  // Orphans
  console.log("\n🏝️  ORPHANED NOTES");
  console.log("─".repeat(60));
  if (report.orphans.length === 0) {
    console.log("✓ No orphaned notes found");
  } else {
    console.log(`Found ${report.orphans.length} orphaned notes:\n`);
    for (const orphan of report.orphans.slice(0, 10)) {
      const tags = orphan.tags.length > 0 ? ` [${orphan.tags.join(", ")}]` : " [no tags]";
      const age = Math.floor((Date.now() - orphan.mtime.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`  • ${orphan.name}${tags}`);
      console.log(`    Modified ${age} days ago`);
    }
    if (report.orphans.length > 10) {
      console.log(`  ... and ${report.orphans.length - 10} more`);
    }
  }

  // Storage
  console.log("\n💾 STORAGE OVERVIEW");
  console.log("─".repeat(60));
  console.log(`Total Size: ${formatBytes(report.storageStats.totalSize)}`);
  console.log(`Total Files: ${report.storageStats.fileCount}`);

  console.log("\nBy Extension:");
  const sortedExts = [...report.storageStats.byExtension.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 5);
  for (const [ext, stats] of sortedExts) {
    console.log(`  ${ext.padEnd(15)} ${stats.count.toString().padStart(6)} files  ${formatBytes(stats.size).padStart(10)}`);
  }

  console.log("\n" + "═".repeat(60));
  console.log("SUMMARY");
  console.log("═".repeat(60));
  const issues = report.largeFiles.length + report.brokenLinks.length + report.orphans.length;
  if (issues === 0) {
    console.log("✅ Vault is in good health!");
  } else {
    console.log(`⚠️  Found ${issues} potential issues:`);
    if (report.largeFiles.length > 0) {
      console.log(`   • ${report.largeFiles.length} large files`);
    }
    if (report.brokenLinks.length > 0) {
      console.log(`   • ${report.brokenLinks.length} broken links`);
    }
    if (report.orphans.length > 0) {
      console.log(`   • ${report.orphans.length} orphaned notes`);
    }
  }
  console.log("");
}

async function handleMaintainLargeFiles(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx maintain large-files - Find large files in vault

USAGE:
  ctx maintain large-files [--threshold MB]

OPTIONS:
  --threshold <MB>   Size threshold in megabytes (default: 1)

Finds files larger than the specified threshold. Useful for
identifying files that may need archiving or optimization.
`);
    return;
  }

  let threshold = 1;
  const thresholdIdx = args.findIndex(a => a === "--threshold");
  if (thresholdIdx !== -1 && args[thresholdIdx + 1]) {
    threshold = parseFloat(args[thresholdIdx + 1]);
  }

  console.log(`\n🔍 Scanning for files larger than ${threshold}MB...\n`);

  const largeFiles = await findLargeFiles(threshold);

  if (largeFiles.length === 0) {
    console.log(`✓ No files larger than ${threshold}MB found`);
    return;
  }

  console.log(`Found ${largeFiles.length} large files:\n`);
  console.log("─".repeat(80));
  console.log(`${"Size".padEnd(12)} ${"Type".padEnd(10)} ${"File".padEnd(30)} Path`);
  console.log("─".repeat(80));

  for (const file of largeFiles) {
    const size = formatBytes(file.size).padEnd(12);
    const type = (file.isBinary ? "BINARY" : "TEXT").padEnd(10);
    const name = file.name.length > 30 ? file.name.substring(0, 27) + "..." : file.name.padEnd(30);
    console.log(`${size} ${type} ${name} ${file.path}`);
  }

  console.log("\n" + "─".repeat(80));
  const totalSize = largeFiles.reduce((sum, f) => sum + f.size, 0);
  console.log(`Total: ${formatBytes(totalSize)} across ${largeFiles.length} files\n`);
}

async function handleMaintainBrokenLinks(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx maintain broken-links - Find broken [[wikilinks]]

USAGE:
  ctx maintain broken-links

Scans all markdown files for [[wikilinks]] that point to
non-existent notes. Helps identify notes that need to be
created or links that need to be fixed.
`);
    return;
  }

  console.log("\n🔍 Scanning for broken wikilinks...\n");

  const brokenLinks = await findBrokenLinks();

  if (brokenLinks.length === 0) {
    console.log("✓ No broken links found");
    return;
  }

  console.log(`Found ${brokenLinks.length} broken links:\n`);
  console.log("─".repeat(80));

  // Group by source note
  const bySource = new Map<string, BrokenLink[]>();
  for (const link of brokenLinks) {
    if (!bySource.has(link.sourceName)) {
      bySource.set(link.sourceName, []);
    }
    bySource.get(link.sourceName)!.push(link);
  }

  for (const [source, links] of bySource.entries()) {
    console.log(`\n${source} (${links.length} broken links):`);
    for (const link of links) {
      console.log(`  → [[${link.brokenLink}]] at line ${link.lineNumber}`);
    }
  }

  console.log("\n" + "─".repeat(80));
  console.log(`Total: ${brokenLinks.length} broken links in ${bySource.size} notes\n`);
}

async function handleMaintainOrphans(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx maintain orphans - Find orphaned notes

USAGE:
  ctx maintain orphans

Finds notes that have:
- No incoming wikilinks from other notes
- No outgoing wikilinks to other notes
- No topic/person/project tags

These notes may benefit from better integration into
your knowledge graph.
`);
    return;
  }

  console.log("\n🔍 Scanning for orphaned notes...\n");

  const orphans = await findOrphans();

  if (orphans.length === 0) {
    console.log("✓ No orphaned notes found");
    return;
  }

  console.log(`Found ${orphans.length} orphaned notes:\n`);
  console.log("─".repeat(80));
  console.log(`${"Note".padEnd(40)} ${"Tags".padEnd(30)} Last Modified`);
  console.log("─".repeat(80));

  for (const orphan of orphans) {
    const name = orphan.name.length > 40 ? orphan.name.substring(0, 37) + "..." : orphan.name.padEnd(40);
    const tags = orphan.tags.length > 0
      ? orphan.tags.join(", ").substring(0, 30)
      : "(no tags)";
    const age = Math.floor((Date.now() - orphan.mtime.getTime()) / (1000 * 60 * 60 * 24));
    const modified = `${age} days ago`;

    console.log(`${name} ${tags.padEnd(30)} ${modified}`);
  }

  console.log("\n" + "─".repeat(80));
  console.log(`Total: ${orphans.length} orphaned notes\n`);
}

async function handleMaintainStorage(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx maintain storage - Storage usage report

USAGE:
  ctx maintain storage

Provides detailed storage statistics including:
- Total vault size
- Breakdown by file type
- Breakdown by directory
- Largest files

Helps understand vault storage usage patterns.
`);
    return;
  }

  console.log("\n🔍 Calculating storage statistics...\n");

  const stats = await calculateStorage();

  console.log("═".repeat(60));
  console.log("STORAGE REPORT");
  console.log("═".repeat(60));
  console.log(`Total Size: ${formatBytes(stats.totalSize)}`);
  console.log(`Total Files: ${stats.fileCount}`);

  console.log("\n📁 BY FILE TYPE");
  console.log("─".repeat(60));
  const sortedExts = [...stats.byExtension.entries()]
    .sort((a, b) => b[1].size - a[1].size);

  console.log(`${"Extension".padEnd(15)} ${"Files".padStart(8)} ${"Size".padStart(12)} ${"% of Total".padStart(12)}`);
  console.log("─".repeat(60));

  for (const [ext, data] of sortedExts) {
    const percentage = ((data.size / stats.totalSize) * 100).toFixed(1);
    console.log(
      `${ext.padEnd(15)} ${data.count.toString().padStart(8)} ${formatBytes(data.size).padStart(12)} ${(percentage + "%").padStart(12)}`
    );
  }

  console.log("\n📂 BY DIRECTORY (Top 10)");
  console.log("─".repeat(60));
  const sortedDirs = [...stats.byDirectory.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 10);

  console.log(`${"Directory".padEnd(30)} ${"Files".padStart(8)} ${"Size".padStart(12)}`);
  console.log("─".repeat(60));

  for (const [dir, data] of sortedDirs) {
    const dirName = dir.length > 30 ? "..." + dir.substring(dir.length - 27) : dir.padEnd(30);
    console.log(`${dirName} ${data.count.toString().padStart(8)} ${formatBytes(data.size).padStart(12)}`);
  }

  console.log("\n📦 LARGEST FILES (Top 20)");
  console.log("─".repeat(60));
  console.log(`${"Size".padEnd(12)} ${"Type".padEnd(8)} File`);
  console.log("─".repeat(60));

  for (const file of stats.largestFiles) {
    const type = file.isBinary ? "BINARY" : "TEXT";
    console.log(`${formatBytes(file.size).padEnd(12)} ${type.padEnd(8)} ${file.name}`);
  }

  console.log("\n" + "═".repeat(60));
  console.log("");
}

async function handleMaintainCacheCleanup(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx maintain cache-cleanup - Clean embedding and search cache

USAGE:
  ctx maintain cache-cleanup [--dry-run]

OPTIONS:
  --dry-run   Preview what would be deleted without actually deleting

Removes cached embedding files from the _meta/embeddings directory.
The cache will be rebuilt on next use if needed.
`);
    return;
  }

  const dryRun = args.includes("--dry-run");

  console.log(`\n🔍 ${dryRun ? "Previewing" : "Cleaning"} cache...\n`);

  const result = await cleanCache(dryRun);

  if (result.removedFiles.length === 0) {
    console.log("✓ No cache files found");
    return;
  }

  console.log(`${dryRun ? "Would remove" : "Removed"} ${result.removedFiles.length} cache files:`);
  console.log("─".repeat(60));

  for (const file of result.removedFiles.slice(0, 20)) {
    console.log(`  • ${file}`);
  }

  if (result.removedFiles.length > 20) {
    console.log(`  ... and ${result.removedFiles.length - 20} more`);
  }

  console.log("\n" + "─".repeat(60));
  console.log(`${dryRun ? "Would free" : "Freed"}: ${formatBytes(result.savedBytes)}\n`);

  if (dryRun) {
    console.log("Run without --dry-run to actually delete the cache files.");
  }
}

async function handleMaintainCleanSuffixes(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx maintain clean-suffixes - Remove legacy suffixes from note filenames

USAGE:
  ctx maintain clean-suffixes [--execute]

OPTIONS:
  --execute   Actually rename files (default is dry-run preview)
  --dry-run   Preview mode - show what would be renamed (default)

LEGACY SUFFIXES REMOVED:
  -Telegram-Raw   From Telegram ingest with raw processing
  -Telegram       From Telegram source marker
  -Raw            From raw processing stage marker

These suffixes are now redundant because:
- Source is recorded in frontmatter (source: telegram)
- Raw is the default state - no suffix needed

EXAMPLES:
  ctx maintain clean-suffixes            # Preview what would change
  ctx maintain clean-suffixes --execute  # Actually rename files
`);
    return;
  }

  const shouldExecute = args.includes("--execute");
  const includeTests = args.includes("--include-tests");

  console.log(`\n🔍 Scanning for legacy suffixes...\n`);

  // Always scan first (dry-run) to get the full list
  const { cleanLegacySuffixes } = await import("./lib/maintain");
  const allResults = await cleanLegacySuffixes(true); // Always dry-run first

  if (allResults.length === 0) {
    console.log("✓ No files with legacy suffixes found");
    return;
  }

  // Filter out test notes (unless --include-tests flag)
  const filteredResults = includeTests
    ? allResults
    : allResults.filter(r => !r.oldName.includes("[TEST-"));

  const testCount = allResults.length - filteredResults.length;

  if (filteredResults.length === 0) {
    console.log("✓ No files with legacy suffixes found");
    if (testCount > 0) {
      console.log(`  (${testCount} test fixtures excluded, use --include-tests to include)`);
    }
    return;
  }

  // Calculate summary stats
  const bySuffix = {
    "-Telegram-Raw": 0,
    "-Telegram": 0,
    "-Raw": 0,
  };

  let oldestDate = "9999-99-99";
  let newestDate = "0000-00-00";

  for (const result of filteredResults) {
    if (result.oldName.endsWith("-Telegram-Raw.md")) bySuffix["-Telegram-Raw"]++;
    else if (result.oldName.endsWith("-Telegram.md")) bySuffix["-Telegram"]++;
    else if (result.oldName.endsWith("-Raw.md")) bySuffix["-Raw"]++;

    // Extract date from filename (YYYY-MM-DD prefix)
    const dateMatch = result.oldName.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      if (dateMatch[1] < oldestDate) oldestDate = dateMatch[1];
      if (dateMatch[1] > newestDate) newestDate = dateMatch[1];
    }
  }

  // Show summary view
  console.log("═".repeat(60));
  console.log("SUFFIX CLEANUP SUMMARY");
  console.log("═".repeat(60));
  console.log(`\nTotal files to rename: ${filteredResults.length}`);
  if (testCount > 0) {
    console.log(`  (${testCount} test fixtures excluded)`);
  }

  console.log("\nBy suffix type:");
  if (bySuffix["-Telegram-Raw"] > 0) console.log(`  -Telegram-Raw  ${bySuffix["-Telegram-Raw"]} files`);
  if (bySuffix["-Telegram"] > 0) console.log(`  -Telegram      ${bySuffix["-Telegram"]} files`);
  if (bySuffix["-Raw"] > 0) console.log(`  -Raw           ${bySuffix["-Raw"]} files`);

  console.log(`\nDate range: ${oldestDate} to ${newestDate}`);

  console.log("\nExamples (3 of " + filteredResults.length + "):");
  console.log("─".repeat(60));
  for (const result of filteredResults.slice(0, 3)) {
    // Show just the title part, not the full filename
    const title = result.oldName.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-Telegram-Raw\.md$|-Telegram\.md$|-Raw\.md$/, "");
    console.log(`  "${title}"`);
  }
  console.log("─".repeat(60));

  if (!shouldExecute) {
    console.log("\n⏸️  WAITING FOR APPROVAL");
    console.log("\nThis is a preview. No files have been changed.");
    console.log("\nTo apply these changes, run:");
    console.log("  ctx maintain clean-suffixes --execute\n");
  } else {
    // Actually rename the filtered files
    const { renameSync } = await import("fs");
    let renamed = 0;
    for (const result of filteredResults) {
      try {
        renameSync(result.oldPath, result.newPath);
        renamed++;
      } catch (error) {
        console.error(`  ⚠️  Failed to rename: ${result.oldName}`);
      }
    }
    console.log(`\n✅ Renamed ${renamed} files\n`);
  }
}

async function handleMaintainCleanTests(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx maintain clean-tests - Remove test fixture notes from vault

USAGE:
  ctx maintain clean-tests [--execute]

OPTIONS:
  --execute   Actually delete files (default is preview)

IDENTIFIES TEST NOTES BY:
  - Filename contains [TEST-*] pattern
  - These are typically automated test fixtures

⚠️  WARNING: This permanently deletes files!

EXAMPLES:
  ctx maintain clean-tests            # Preview what would be deleted
  ctx maintain clean-tests --execute  # Actually delete test files
`);
    return;
  }

  const shouldExecute = args.includes("--execute");

  console.log(`\n🔍 Scanning for test fixture notes...\n`);

  const { getConfig, validateVault } = await import("./lib/config");
  const { readdir, stat, unlink } = await import("fs/promises");
  const { join, basename } = await import("path");

  validateVault();
  const config = getConfig();
  const vaultPath = config.vaultPath;

  interface TestFile {
    name: string;
    path: string;
    size: number;
  }

  const testFiles: TestFile[] = [];

  async function scanDir(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.name.startsWith(".") || entry.name === "_meta" || entry.name === "attachments") {
        continue;
      }

      if (entry.isDirectory()) {
        await scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        // Check for [TEST-*] pattern in filename
        if (entry.name.includes("[TEST-")) {
          const stats = await stat(fullPath);
          testFiles.push({
            name: entry.name,
            path: fullPath,
            size: stats.size,
          });
        }
      }
    }
  }

  await scanDir(vaultPath);

  if (testFiles.length === 0) {
    console.log("✓ No test fixture notes found");
    return;
  }

  // Calculate stats
  const totalSize = testFiles.reduce((sum, f) => sum + f.size, 0);
  const sizeKB = (totalSize / 1024).toFixed(1);

  // Show summary
  console.log("═".repeat(60));
  console.log("TEST FIXTURE CLEANUP SUMMARY");
  console.log("═".repeat(60));
  console.log(`\nTotal test files: ${testFiles.length}`);
  console.log(`Total size: ${sizeKB} KB`);

  console.log("\nExamples (3 of " + testFiles.length + "):");
  console.log("─".repeat(60));
  for (const file of testFiles.slice(0, 3)) {
    const title = file.name.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
    console.log(`  "${title}"`);
  }
  console.log("─".repeat(60));

  if (!shouldExecute) {
    console.log("\n⏸️  WAITING FOR APPROVAL");
    console.log("\n⚠️  This will PERMANENTLY DELETE these files!");
    console.log("\nTo delete these test fixtures, run:");
    console.log("  ctx maintain clean-tests --execute\n");
  } else {
    let deleted = 0;
    for (const file of testFiles) {
      try {
        await unlink(file.path);
        deleted++;
      } catch (error) {
        console.error(`  ⚠️  Failed to delete: ${file.name}`);
      }
    }
    console.log(`\n✅ Deleted ${deleted} test fixture files\n`);
  }
}

// ============================================================================
// Practice Commands (Cultivation Practices v1.1)
// ============================================================================

async function handlePractice(args: string[]) {
  const subcommand = args[0];
  const subArgs = args.slice(1);

  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    console.log(`
ctx practice - Cultivation practice tracking

USAGE:
  ctx practice <subcommand>

SUBCOMMANDS:
  status    Show status of all practices
  due       Show only overdue practices

CULTIVATION PRACTICES:
  🧹 Sweep    Daily inbox triage (5-15 min)
  🧵 Weave    Weekly connection building (30 min)
  🔬 Dive     Deep focused exploration (1-2+ hrs)
  🗺️ Survey   Monthly landscape view (1 hr)
  🧭 Compass  Quarterly alignment check (half-day)
  🪞 Mirror   Annual reflection (full day)

EXAMPLES:
  ctx practice status    # Show all practice statuses
  ctx practice due       # Show overdue practices

Run each practice directly:
  ctx sweep              # Start daily sweep
  ctx weave              # Start weekly weave
`);
    return;
  }

  switch (subcommand) {
    case "status":
      handlePracticeStatus(subArgs);
      break;
    case "due":
      handlePracticeDue(subArgs);
      break;
    default:
      console.error(`Unknown practice subcommand: ${subcommand}`);
      console.log("Run 'ctx practice --help' for usage.");
      process.exit(1);
  }
}

function handlePracticeStatus(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx practice status - Show status of all cultivation practices

USAGE:
  ctx practice status [--json]

OPTIONS:
  --json    Output as JSON
`);
    return;
  }

  const json = args.includes("--json");

  if (json) {
    const statuses = getAllPracticeStatuses();
    console.log(JSON.stringify(statuses, null, 2));
    return;
  }

  console.log("\n" + formatAllPracticeStatuses() + "\n");
}

function handlePracticeDue(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx practice due - Show only overdue practices

USAGE:
  ctx practice due [--json]

OPTIONS:
  --json    Output as JSON
`);
    return;
  }

  const json = args.includes("--json");
  const overdue = getOverduePractices();

  if (json) {
    console.log(JSON.stringify(overdue, null, 2));
    return;
  }

  if (overdue.length === 0) {
    console.log("\n✅ All practices current!\n");
    return;
  }

  console.log("\n⚠️  OVERDUE PRACTICES");
  console.log("─".repeat(50));
  for (const status of overdue) {
    console.log(formatPracticeStatus(status));
  }
  console.log("");
}

async function handleSweep(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx sweep - Daily inbox triage practice (🧹)

USAGE:
  ctx sweep [options]              # Show inbox notes with IDs and tags
  ctx sweep <selection>            # Review selected notes in flashcard mode
  ctx sweep all                    # Review all notes in flashcard mode
  ctx sweep none                   # Mark sweep complete without review
  ctx sweep next                   # Continue to next note in active session
  ctx sweep status                 # Show current sweep session progress
  ctx sweep clear                  # End session (archives for history)
  ctx sweep clear --force          # Discard session without archiving

SELECTION:
  ctx sweep 1,2,5                  # Review specific notes by ID
  ctx sweep 1-5                    # Review range of notes
  ctx sweep 1,3-5,10               # Mixed selection
  ctx sweep all                    # Review all inbox notes
  ctx sweep none                   # Skip review, mark complete

OPTIONS:
  --limit, -l <n>          Maximum notes to show (default: 20)
  --priority, -p [level]   Filter to priority notes only (high, low, or any)
  --oldest-first           Sort by date ascending (oldest first, default: newest first)
  --stats                  Show only overview stats (no table)
  --no-stats               Skip overview stats, show only table
  --since-last             Only notes modified since last sweep
  --since <date>           Filter by date (yesterday, YYYY-MM-DD, YYYYMMDD)
  --include-large          Also find large markdown files (>100KB)
  --large-threshold <KB>   Custom threshold for large files (default: 100)
  --include-poorly-named   Also find notes with generic names (Photo-*, Clipboard-*, etc.)
  --all                    Include all categories (inbox + large + poorly-named)
  --flashcard              Output single note as JSON (for machine-readable integration)

NAMING:
  --suggest-names          Suggest names for poorly-named notes (batch mode)
  --auto-rename            Auto-rename notes with high-confidence suggestions
  --dry-run                Preview renames without applying (use with --auto-rename)

AUTO MODE (bulk processing):
  --auto                   Process inbox notes automatically (titles + tags)
  --confidence <level>     Filter by confidence: high (>=85%), medium (>=70%), all
  --dry-run                Preview auto changes without applying

METHODOLOGY CHECKS:
  --no-para                Hide PARA classification guidance (shown by default)

  Note: PARA guidance is automatic during sweep. Use --no-para to disable.
  For Zettelkasten/atomic checks, use 'ctx weave --atomic' (weekly practice).

VAULT MAINTENANCE:
  --health                 Show vault health dashboard
  --orphans                Find notes with no connections
  --broken-links           Find broken [[wikilinks]]
  --storage                Show storage usage report
  --cache-cleanup          Clean embedding cache (add --dry-run to preview)

WORKFLOW:
  1. Run 'ctx sweep' to see inbox notes with IDs and tags (bulk triage)
  2. Run 'ctx sweep all' or 'ctx sweep 1,3,7' to start flashcard review
  3. Process each note (done, skip, delete, rename, etc.)
  4. Run 'ctx sweep next' to continue to next note
  5. Session tracks progress (ctx sweep status) until complete

EXAMPLES:
  ctx sweep                        # Show inbox with IDs and tags
  ctx sweep --priority             # Show only priority-tagged notes
  ctx sweep -p high                # Show only high priority notes
  ctx sweep 1,2,5                  # Review notes 1, 2, 5 in flashcard mode
  ctx sweep all                    # Review all in flashcard mode
  ctx sweep none                   # Complete without review
  ctx sweep 1 --flashcard          # Get single note as JSON for integration
  ctx sweep --suggest-names        # Suggest names for poorly-named notes
  ctx sweep --auto-rename --dry-run # Preview auto-renames
  ctx sweep --auto --dry-run       # Preview auto mode (titles + tags)
  ctx sweep --auto --confidence high  # Auto-apply high confidence only
  ctx sweep --health               # Show vault health dashboard
`);
    return;
  }

  // Handle "status" subcommand - show sweep session progress (REQ-SESSION-005)
  if (args[0] === "status") {
    console.log(getSweepProgress());
    return;
  }

  // Handle "clear" subcommand - end sweep session
  // Default: archive session for history. Use --force to truly discard.
  if (args[0] === "clear") {
    if (!hasActiveSweepSession()) {
      console.log("No active sweep session to clear");
      return;
    }

    const forceDiscard = args.includes("--force") || args.includes("-f");

    if (forceDiscard) {
      // Truly discard without archiving
      clearSweepSession();
      console.log("🗑️ Sweep session discarded (not archived)");
    } else {
      // Default: archive for history
      archiveCurrentSession();
      console.log("📁 Sweep session archived for insights");
      console.log("   (Use --force to discard without archiving)");
    }
    return;
  }

  // Handle "prev" subcommand - go back to previous item in active session
  if (args[0] === "prev" || args[0] === "previous") {
    const session = loadSweepSession();
    if (!session) {
      console.log("No active sweep session. Run 'ctx sweep all' to start one.");
      return;
    }

    // Find previous item (any status except deleted - can revisit done/skipped items)
    const prevItem = [...session.queue]
      .reverse()
      .find((item) => item.index < session.currentIndex && item.status !== "deleted");

    if (!prevItem) {
      console.log("Already at the first note in session (or all previous notes were deleted).");
      return;
    }

    // Update current index
    session.currentIndex = prevItem.index;
    saveSweepSession(session);

    // Load note metadata
    let noteMeta: { date: string; tags: string[] };
    try {
      const parsed = await parseNote(prevItem.path);
      noteMeta = {
        date: parsed.date || "",
        tags: parsed.tags || [],
      };
    } catch (err) {
      console.log(`Note not found: ${prevItem.name}`);
      return;
    }

    console.log(`\n🔍 Going back to note ${prevItem.index} of ${session.totalCount}...\n`);

    // Convert to IndexedResult format
    const indexedResult: IndexedResult = {
      index: prevItem.index,
      path: prevItem.path,
      name: prevItem.name,
      date: noteMeta.date,
      type: "note",
      tags: noteMeta.tags,
      score: 1,
    };

    await processSweepFlashcards([indexedResult], args.slice(1));
    return;
  }

  // Handle "next" subcommand - continue to next item in active session
  if (args[0] === "next") {
    const session = loadSweepSession();
    if (!session) {
      console.log("No active sweep session. Run 'ctx sweep all' to start one.");
      return;
    }

    // Find next pending item (compare item.index, not array idx)
    const nextItem = session.queue.find(
      (item) => item.index >= session.currentIndex && item.status === "pending"
    );

    if (!nextItem) {
      // Session complete - archive for historical insights
      const record = recordPracticeCompletion("sweep");
      console.log("\n🎉 Sweep session complete!");
      console.log(`   Processed: ${session.doneCount} done, ${session.skippedCount} skipped, ${session.deletedCount || 0} deleted`);
      console.log(`   Total sweeps: ${record.totalCount}`);
      if (record.streak > 1) {
        console.log(`   Streak: ${record.streak} days`);
      }
      archiveCurrentSession();
      console.log("   📁 Session archived for insights");
      return;
    }

    // Update current index
    session.currentIndex = nextItem.index;
    saveSweepSession(session);

    // Load note metadata directly (no embedding search needed - we have the path)
    let noteMeta: { date: string; tags: string[] };
    try {
      const parsed = await parseNote(nextItem.path);
      noteMeta = {
        date: parsed.date || "",
        tags: parsed.tags || [],
      };
    } catch (err) {
      console.log(`Note not found: ${nextItem.name}`);
      return;
    }

    // Count ALL pending items (including current), not just items after current
    const remaining = session.queue.filter(
      (item) => item.status === "pending"
    ).length;

    console.log(`\n🔍 Reviewing note ${nextItem.index} of ${session.totalCount}...\n`);

    // Convert to IndexedResult format
    const indexedResult: IndexedResult = {
      index: nextItem.index,
      path: nextItem.path,
      name: nextItem.name,
      date: noteMeta.date,
      type: "note",
      tags: noteMeta.tags,
      score: 1,
    };

    await processSweepFlashcards([indexedResult], args.slice(1));

    console.log("─".repeat(60));
    if (remaining > 1) {
      // More than just the current note pending
      console.log(`\n📋 ${remaining} notes pending (including this one)\n`);
    } else if (remaining === 1) {
      console.log(`\n📋 This is the last pending note\n`);
    }
    console.log(`Continue: ctx sweep next`);
    console.log(`Status:   ctx sweep status`);
    console.log(`End:      ctx sweep clear`);
    console.log("");
    return;
  }

  // Check for selection argument (first non-option arg that isn't a value for an option)
  // Filter out args that follow option flags like --limit, --since, etc.
  const optionsWithValues = ["--limit", "-l", "--since", "--large-threshold", "--priority", "-p", "--confidence"];
  const selectionArg = args.find((a, i) => {
    // Skip if it starts with -
    if (a.startsWith("-")) return false;
    // Skip if previous arg was an option that takes a value
    if (i > 0 && optionsWithValues.includes(args[i - 1])) return false;
    // Match selection patterns
    return a === "all" || a === "none" || a === "status" || /^[\d,\-]+$/.test(a);
  });

  // Handle selection mode - process notes from previous sweep
  if (selectionArg) {
    if (selectionArg === "none") {
      // Mark complete without review
      const record = recordPracticeCompletion("sweep");
      console.log("\n" + getCompletionMessage("sweep"));
      console.log(`   Total sweeps: ${record.totalCount}`);
      if (record.streak > 1) {
        console.log(`   Streak: ${record.streak} days`);
      }
      console.log("");
      return;
    }

    // Load previous sweep results
    const index = await loadSearchIndex();
    if (!index || index.query !== "sweep") {
      console.log("No previous sweep results. Run 'ctx sweep' first to see inbox notes.");
      return;
    }

    const allResults = index.tagMatches;
    if (allResults.length === 0) {
      console.log("Previous sweep had no results.");
      return;
    }

    // Parse selection
    const selectedIndices = parseSelection(selectionArg, allResults.length);
    if (selectedIndices.length === 0) {
      console.log("No valid selection. Use numbers like '1,2,5' or 'all'.");
      return;
    }

    const selectedResults = selectedIndices.map(i => allResults[i - 1]).filter(Boolean);

    // Handle --flashcard flag for JSON output (single note integration)
    // This should NOT create a new session - it's for inspection only
    const flashcardMode = args.includes("--flashcard");
    if (flashcardMode) {
      if (selectedResults.length !== 1) {
        console.error(JSON.stringify({ error: "--flashcard requires exactly one note selection" }));
        process.exit(1);
      }
      // Output flashcard without modifying session
      await outputFlashcardJson(selectedResults[0]);
      return;
    }

    // Create sweep session for index-based command resolution (REQ-SESSION-001)
    // Only create session for interactive mode, not --flashcard inspection
    const sessionNotes = selectedResults.map(r => ({ path: r.path, name: r.name }));
    const sweepSession = createSweepSession(sessionNotes);
    console.log(`📋 Sweep session created: ${selectedResults.length} notes queued\n`);

    // Process FIRST note only, pass remaining queue back
    const firstNote = selectedResults[0];
    const remainingNotes = selectedResults.slice(1);

    // Show the flashcard for first note
    console.log(`\n🔍 Reviewing note 1 of ${selectedResults.length}...\n`);
    await processSweepFlashcards([firstNote], args);

    // If there are more notes, output session progress and next command
    if (remainingNotes.length > 0) {
      const session = loadSweepSession();
      console.log("─".repeat(60));
      if (session) {
        const deletedCount = session.deletedCount || 0;
        console.log(`\n📊 SESSION: ✅ ${session.doneCount} done | ⏭️ ${session.skippedCount} skipped | 🗑️ ${deletedCount} deleted | ⏳ ${remainingNotes.length} pending\n`);
      } else {
        console.log(`\n📋 REMAINING IN QUEUE: ${remainingNotes.length} more notes\n`);
      }
      console.log(`Continue: ctx sweep next`);
      console.log(`Status:   ctx sweep status`);
      console.log(`End:      ctx sweep clear`);
      console.log("");
    }
    return;
  }

  // Parse options
  let limit = 20;
  let sinceDate: Date | null = null;
  let includeLarge = args.includes("--include-large") || args.includes("--all");
  let includePoorlyNamed = args.includes("--include-poorly-named") || args.includes("--all");
  let largeThreshold = 100; // KB

  // Methodology check options
  // PARA is ON by default during sweep (daily triage = classification)
  const enablePara = !args.includes("--no-para");
  // Atomic/ZK checks are for weave (weekly connection building), not sweep
  const anyMethodologyChecks = enablePara;

  // Vault maintenance options (from ctx maintain)
  const showHealth = args.includes("--health");
  const showOrphans = args.includes("--orphans");
  const showBrokenLinks = args.includes("--broken-links");
  const showStorage = args.includes("--storage");
  const doCacheCleanup = args.includes("--cache-cleanup");

  // Naming options
  const suggestNames = args.includes("--suggest-names");
  const autoRename = args.includes("--auto-rename");
  const dryRun = args.includes("--dry-run");

  // Auto mode options
  const autoMode = args.includes("--auto");
  let confidenceLevel: "high" | "medium" | "all" = "high"; // default to high confidence
  const confidenceIdx = args.findIndex((a) => a === "--confidence");
  if (confidenceIdx !== -1 && args[confidenceIdx + 1]) {
    const level = args[confidenceIdx + 1].toLowerCase();
    if (level === "high" || level === "medium" || level === "all") {
      confidenceLevel = level;
    }
  }

  // Overview stats options
  const statsOnly = args.includes("--stats");
  const noStats = args.includes("--no-stats");
  const oldestFirst = args.includes("--oldest-first");

  // Priority filter option
  let priorityFilter: "high" | "low" | "any" | null = null;
  const priorityIdx = args.findIndex((a) => a === "--priority" || a === "-p");
  if (priorityIdx !== -1) {
    const nextArg = args[priorityIdx + 1];
    if (nextArg === "high" || nextArg === "low") {
      priorityFilter = nextArg;
    } else {
      // --priority without value = any priority
      priorityFilter = "any";
    }
  }

  // If suggest-names is used, force include poorly-named
  if (suggestNames || autoRename) {
    includePoorlyNamed = true;
  }

  const limitIdx = args.findIndex((a) => a === "--limit" || a === "-l");
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    limit = parseInt(args[limitIdx + 1], 10);
  }

  const thresholdIdx = args.findIndex((a) => a === "--large-threshold");
  if (thresholdIdx !== -1 && args[thresholdIdx + 1]) {
    largeThreshold = parseInt(args[thresholdIdx + 1], 10);
  }

  // Time filters
  if (args.includes("--since-last")) {
    try {
      sinceDate = parseTimeFilter("last", "sweep");
      console.log(`📅 Filtering to notes since last sweep: ${sinceDate.toLocaleDateString()}`);
    } catch (e) {
      console.log("ℹ️  No previous sweep recorded, showing all notes");
    }
  }

  const sinceIdx = args.findIndex((a) => a === "--since");
  if (sinceIdx !== -1 && args[sinceIdx + 1]) {
    sinceDate = parseTimeFilter(args[sinceIdx + 1]);
    console.log(`📅 Filtering to notes since: ${sinceDate.toLocaleDateString()}`);
  }

  const config = getConfig();

  // Handle maintenance flags (short-circuit normal sweep)
  if (showHealth) {
    console.log("\n🏥 Vault Health Dashboard\n");
    await handleMaintainHealth([]);
    return;
  }

  if (showOrphans) {
    console.log("\n🔗 Finding Orphan Notes...\n");
    await handleMaintainOrphans([]);
    return;
  }

  if (showBrokenLinks) {
    console.log("\n🔗 Finding Broken Links...\n");
    await handleMaintainBrokenLinks([]);
    return;
  }

  if (showStorage) {
    console.log("\n📊 Storage Usage Report\n");
    await handleMaintainStorage([]);
    return;
  }

  if (doCacheCleanup) {
    console.log("\n🧹 Cache Cleanup\n");
    await handleMaintainCacheCleanup(dryRun ? ["--dry-run"] : []);
    return;
  }

  // Handle --auto mode (bulk processing)
  if (autoMode) {
    const { processAutoMode, formatProgressOutput, formatSummaryOutput } = await import(
      "./lib/sweep-auto"
    );

    console.log(`\n🤖 AUTO MODE - ${dryRun ? "DRY RUN" : "APPLYING CHANGES"}`);
    console.log(`   Confidence: ${confidenceLevel} (>= ${confidenceLevel === "high" ? "85" : confidenceLevel === "medium" ? "70" : "0"}%)`);
    console.log("────────────────────────────────────────────────────────\n");

    // Get inbox notes to process
    let notesToProcess = await searchNotes({
      vaultPath: config.vaultPath,
      tags: ["status/inbox"],
      excludeTags: ["status/archived"],
      recent: limit,
    });

    // Apply time filter if set
    if (sinceDate) {
      notesToProcess = notesToProcess.filter((r) => r.modifiedAt && new Date(r.modifiedAt) >= sinceDate!);
    }

    if (notesToProcess.length === 0) {
      console.log("✨ No inbox notes to process!");
      return;
    }

    const indexedNotes = toIndexedResults(notesToProcess);
    console.log(`Processing ${indexedNotes.length} inbox notes...\n`);

    const result = await processAutoMode(indexedNotes, {
      confidence: confidenceLevel,
      dryRun,
      limit,
      vaultPath: config.vaultPath,
    }, (current, total, noteResult) => {
      console.log(formatProgressOutput(current, total, noteResult));
    });

    console.log("\n" + formatSummaryOutput(result, dryRun));
    return;
  }

  // Show overview stats (unless --no-stats)
  // Uses status/inbox tag search for consistency with sweep
  if (!noStats) {
    const overviewStats = await getSweepOverviewStats();
    console.log("\n" + formatOverviewStats(overviewStats));

    // If --stats only, exit after showing stats
    if (statsOnly) {
      return;
    }

    console.log(""); // Blank line before table
  }

  console.log("🧹 Starting Sweep...\n");

  // === Category 1: Inbox notes ===
  let inboxResults = await searchNotes({
    vaultPath: config.vaultPath,
    tags: ["status/inbox"],
    excludeTags: ["status/archived"],
    recent: limit,
  });

  // Apply time filter if set
  if (sinceDate) {
    inboxResults = inboxResults.filter((r) => r.modifiedAt && new Date(r.modifiedAt) >= sinceDate!);
  }

  // Apply priority filter if set
  if (priorityFilter) {
    inboxResults = inboxResults.filter((r) => {
      const tags = r.tags || [];
      if (priorityFilter === "high") {
        return tags.includes("priority/high");
      } else if (priorityFilter === "low") {
        return tags.includes("priority/low");
      } else {
        // "any" - has any priority tag
        return tags.includes("priority/high") || tags.includes("priority/low");
      }
    });
    const levelDesc = priorityFilter === "any" ? "priority" : `${priorityFilter} priority`;
    console.log(`🎯 Filtering to ${levelDesc} notes (${inboxResults.length} found)\n`);
  }

  // === Category 2: Large files (optional) ===
  let largeFiles: LargeMdFile[] = [];
  if (includeLarge) {
    largeFiles = await findLargeMdFiles(config.vaultPath, { thresholdKB: largeThreshold });
    if (sinceDate) {
      largeFiles = largeFiles.filter((f) => f.mtime >= sinceDate!);
    }
  }

  // === Category 3: Poorly named notes (optional) ===
  let poorlyNamed: PoorlyNamedNote[] = [];
  if (includePoorlyNamed) {
    poorlyNamed = await findPoorlyNamedNotes(config.vaultPath);
    if (sinceDate) {
      poorlyNamed = poorlyNamed.filter((n) => n.mtime >= sinceDate!);
    }
  }

  // Display summary
  const totalItems = inboxResults.length + largeFiles.length + poorlyNamed.length;

  if (totalItems === 0) {
    console.log("✨ Nothing to sweep!\n");
    const record = recordPracticeCompletion("sweep");
    console.log(getCompletionMessage("sweep"));
    if (record.streak > 1) {
      console.log(`   Streak: ${record.streak} days\n`);
    }
    return;
  }

  // Apply sort order (default: newest first, --oldest-first reverses)
  if (oldestFirst) {
    inboxResults.reverse();
    poorlyNamed.reverse();
    largeFiles.reverse();
  }

  // Convert inbox results to indexed format for display
  const indexedResults = toIndexedResults(inboxResults);

  // Display indexed table with IDs and tags
  console.log("🧹 SWEEP - Inbox Triage");
  console.log("─".repeat(80));
  console.log(formatSweepHeader());
  console.log("─".repeat(80));

  for (const result of indexedResults) {
    console.log(formatSweepRow(result));
  }

  // Show additional categories if present
  if (largeFiles.length > 0) {
    console.log(`\n📦 LARGE FILES (${largeFiles.length}) - use --suggest-names to process`);
  }
  if (poorlyNamed.length > 0) {
    console.log(`🏷️ POORLY NAMED (${poorlyNamed.length}) - use --suggest-names to process`);
  }

  console.log("\n" + "─".repeat(80));
  console.log(`Total: ${indexedResults.length} inbox notes`);

  // Save results to cache for selection
  const sweepIndex: SearchIndex = {
    query: "sweep",
    timestamp: new Date().toISOString(),
    tagMatches: indexedResults,
    semanticMatches: [],
  };
  await saveSearchIndex(sweepIndex);

  // === Handle --suggest-names mode ===
  if ((suggestNames || autoRename) && poorlyNamed.length > 0) {
    const batchSize = Math.min(limit, poorlyNamed.length);
    console.log(`\n📝 GENERATING NAME SUGGESTIONS (batch: ${batchSize}/${poorlyNamed.length})...\n`);
    if (poorlyNamed.length > limit) {
      console.log(`   Use --limit ${poorlyNamed.length} to process all\n`);
    }

    const suggestions = await suggestNamesForNotes(poorlyNamed, { limit });

    // Display suggestions
    console.log("NAME SUGGESTIONS:");
    console.log("─".repeat(50));

    const highConfidence = suggestions.filter((s) => s.confidence === "high");
    const mediumConfidence = suggestions.filter((s) => s.confidence === "medium");
    const lowConfidence = suggestions.filter((s) => s.confidence === "low");

    if (highConfidence.length > 0) {
      console.log(`\n🎯 HIGH CONFIDENCE (${highConfidence.length}) - Pattern matched`);
      for (let i = 0; i < highConfidence.length; i++) {
        console.log(formatNameSuggestion(highConfidence[i], i));
      }
    }

    if (mediumConfidence.length > 0) {
      console.log(`\n💡 MEDIUM CONFIDENCE (${mediumConfidence.length}) - First line`);
      for (let i = 0; i < mediumConfidence.length; i++) {
        console.log(formatNameSuggestion(mediumConfidence[i], i));
      }
    }

    if (lowConfidence.length > 0) {
      console.log(`\n❓ NO SUGGESTION (${lowConfidence.length}) - Manual review needed`);
      for (const s of lowConfidence.slice(0, 5)) {
        console.log(`   • ${s.currentName}`);
      }
      if (lowConfidence.length > 5) {
        console.log(`   ... and ${lowConfidence.length - 5} more`);
      }
    }

    console.log("\n" + "─".repeat(50));

    // === Handle --auto-rename mode ===
    if (autoRename) {
      const toRename = highConfidence.filter((s) => s.suggestedName);
      if (toRename.length === 0) {
        console.log("ℹ️  No high-confidence renames to apply.");
      } else {
        console.log(`\n${dryRun ? "🔍 DRY RUN - " : ""}AUTO-RENAMING ${toRename.length} notes...`);

        for (const s of toRename) {
          try {
            const result = await renameNote(s.path, s.suggestedName!, config.vaultPath, { dryRun });
            if (dryRun) {
              console.log(`   Would rename: ${s.currentName} → ${s.suggestedName}`);
            } else {
              console.log(`   ✓ Renamed: ${s.currentName} → ${s.suggestedName}`);
              if (result.updatedLinks.length > 0) {
                console.log(`     Updated ${result.updatedLinks.length} links`);
              }
            }
          } catch (err) {
            console.log(`   ✗ Failed: ${s.currentName} - ${err instanceof Error ? err.message : err}`);
          }
        }
      }
    } else {
      console.log("\nTo auto-rename high-confidence suggestions:");
      console.log("  ctx sweep --auto-rename --dry-run   # Preview");
      console.log("  ctx sweep --auto-rename             # Apply");
    }

    return;
  }

  // Show selection instructions
  console.log("\nNEXT STEPS:");
  console.log("  ctx sweep 1,3,5     # Review specific notes in flashcard mode");
  console.log("  ctx sweep all       # Review all notes in flashcard mode");
  console.log("  ctx sweep none      # Mark complete without detailed review");
  console.log("");
}

/**
 * Format header for sweep table
 */
function formatSweepHeader(): string {
  return " #  │ Date       │ Type       │ Title                                    │ Tags";
}

/**
 * Format a single row in sweep table
 */
function formatSweepRow(result: IndexedResult): string {
  const num = result.index.toString().padStart(2);
  const date = result.date;
  const type = result.type.padEnd(10);
  const title = truncateSweep(result.name.replace(/^[\d-]+/, "").trim() || result.name, 40).padEnd(40);
  const tags = result.tags.slice(0, 3).join(", ");

  return `${num}  │ ${date} │ ${type} │ ${title} │ ${tags}`;
}

function truncateSweep(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

/**
 * Output single note as JSON for machine-readable integration
 * Used with --flashcard flag for Claude Code integration
 */
async function outputFlashcardJson(result: IndexedResult) {
  const { getDefaultTaxonomy, matchTitlePatterns, suggestTagsFromPatterns } = await import(
    "./lib/taxonomy"
  );

  // Read the note content
  const content = readFileSync(result.path, "utf-8");
  const name = basename(result.path, ".md");

  // Extract content preview (first 500 chars, skip frontmatter)
  const contentWithoutFrontmatter = content.replace(/^---[\s\S]*?---\n?/, "").trim();
  const preview = contentWithoutFrontmatter.slice(0, 500) + (contentWithoutFrontmatter.length > 500 ? "..." : "");

  // Extract current tags from frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  let currentTags: string[] = [];
  if (frontmatterMatch) {
    const tagsMatch = frontmatterMatch[1].match(/tags:\s*\[(.*?)\]/s);
    if (tagsMatch) {
      currentTags = tagsMatch[1].split(",").map(t => t.trim().replace(/['"]/g, "")).filter(Boolean);
    } else {
      // Try YAML list format
      const yamlTagsMatch = frontmatterMatch[1].match(/tags:\s*\n((?:\s+-\s+.+\n?)+)/);
      if (yamlTagsMatch) {
        currentTags = yamlTagsMatch[1].split("\n").map(t => t.replace(/^\s+-\s+/, "").trim()).filter(Boolean);
      }
    }
  }

  // Load dimensional taxonomy for suggestions
  let taxonomy = null;
  try {
    taxonomy = await getDefaultTaxonomy();
  } catch (e) {
    // Taxonomy unavailable, continue without suggestions
  }

  // Generate title suggestion using dimensional taxonomy title patterns
  let suggestedName: string | null = null;
  let suggestionMethod: string | null = null;
  let suggestionPattern: string | null = null;
  let confidence: "high" | "medium" | "low" | "none" = "none";

  if (taxonomy) {
    // First try pattern extraction on full content (patterns may be in frontmatter metadata)
    const titleResult = matchTitlePatterns(content, taxonomy);
    if (titleResult) {
      suggestedName = titleResult.title;
      suggestionMethod = "pattern";
      suggestionPattern = titleResult.pattern || null;
      confidence = "high";
    } else {
      // For first-line fallback, use content without frontmatter
      const cleanTitleResult = matchTitlePatterns(contentWithoutFrontmatter, taxonomy);
      if (cleanTitleResult) {
        suggestedName = cleanTitleResult.title;
        suggestionMethod = "pattern";
        suggestionPattern = cleanTitleResult.pattern || null;
        confidence = "high";
      } else {
        // Try first line as fallback
        const firstLine = contentWithoutFrontmatter.split("\n")[0]?.trim();
        if (firstLine && firstLine.length > 3 && firstLine !== "Untitled" && firstLine !== "---") {
          suggestedName = firstLine.slice(0, 60);
          suggestionMethod = "first-line";
          confidence = "medium";
        }
      }
    }
  }

  // Generate tag suggestions using dimensional taxonomy
  let suggestedTags: string[] = [];
  if (taxonomy) {
    suggestedTags = suggestTagsFromPatterns(content, taxonomy, currentTags);
    // Remove tags that are already present
    suggestedTags = suggestedTags.filter(t => !currentTags.includes(t));
  }

  // Determine recommended action based on note state
  let recommendedAction = "done";
  let recommendationReason = "Note looks ready - accept suggestions and move on";

  // Check for long article patterns (read time mentions)
  const hasReadTime = /\d+\s*min(ute)?\s*read/i.test(content);
  const hasArticleLink = /https?:\/\/[^\s]+/.test(contentWithoutFrontmatter);

  if (hasReadTime && hasArticleLink && preview.length > 200) {
    recommendedAction = "extract";
    recommendationReason = "Long article detected - queue for wisdom extraction";
  } else if (confidence === "high" && suggestedName) {
    recommendedAction = "done";
    recommendationReason = "High-confidence name suggestion - accept and move on";
  } else if (suggestedTags.length > 2) {
    recommendedAction = "done";
    recommendationReason = "Good tag suggestions - accept and move on";
  }

  // Detect content source and URL
  const { detectContentSource } = await import("./lib/sweep-enhancements");
  const contentSource = detectContentSource(content);

  // Build output JSON
  const output = {
    id: result.index,
    path: result.path,
    current_name: name,
    suggested_name: suggestedName,
    suggestion_method: suggestionMethod,
    suggestion_pattern: suggestionPattern,
    content_preview: preview,
    current_tags: currentTags,
    suggested_tags: suggestedTags,
    confidence,
    content_source: contentSource?.name || null,
    source_url: contentSource?.url || null,
    recommended_action: recommendedAction,
    recommendation_reason: recommendationReason,
    available_actions: [
      { keyword: "done", description: "Accept suggestions and move on" },
      { keyword: "priority high|low", description: "Set priority (high or low)" },
      { keyword: "because [reason]", description: "Record why you saved this" },
      { keyword: "extract", description: "Queue for wisdom extraction" },
      { keyword: "skip", description: "Come back to this later" },
      { keyword: "rename", description: "Accept the suggested name" },
      { keyword: "archive", description: "Archive the note" },
      { keyword: "quit", description: "Exit sweep" },
    ],
  };

  console.log(JSON.stringify(output, null, 2));
}

/**
 * Process selected notes in flashcard mode
 */
async function processSweepFlashcards(results: IndexedResult[], args: string[]) {
  const config = getConfig();

  // Import markdown cleanup function for preview
  const { cleanMarkdownArtifacts } = await import("../ingest/lib/process");

  // Methodology check options
  // PARA is ON by default during sweep (daily triage = classification)
  const enablePara = !args.includes("--no-para");
  // Atomic/ZK checks are for weave (weekly connection building), not sweep
  const anyMethodologyChecks = enablePara;

  // Get session for total count (we process one note at a time but show position in full queue)
  const session = loadSweepSession();
  const sessionTotal = session?.totalCount || results.length;

  for (const result of results) {
    // Use the result's queue index for position, session total for denominator
    const notePosition = result.index || 1;

    // Read the note content
    const content = readFileSync(result.path, "utf-8");
    const name = basename(result.path, ".md");

    // Extract full tags from frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    let fullTags: string[] = [];
    if (frontmatterMatch) {
      const tagsMatch = frontmatterMatch[1].match(/tags:\s*\[(.*?)\]/s);
      if (tagsMatch) {
        fullTags = tagsMatch[1].split(",").map(t => t.trim().replace(/['"]/g, "")).filter(Boolean);
      } else {
        const yamlTagsMatch = frontmatterMatch[1].match(/tags:\s*\n((?:\s+-\s+.+\n?)+)/);
        if (yamlTagsMatch) {
          fullTags = yamlTagsMatch[1].split("\n").map(t => t.replace(/^\s+-\s+/, "").trim()).filter(Boolean);
        }
      }
    }

    // Categorize tags
    const people = fullTags.filter(t => t.startsWith("person/")).map(t => t.replace("person/", ""));
    const scope = fullTags.filter(t => t.startsWith("scope/")).map(t => t.replace("scope/", ""));
    const priority = fullTags.find(t => t.startsWith("priority/"))?.replace("priority/", "");
    const actions = fullTags.filter(t => t.startsWith("action/")).map(t => t.replace("action/", ""));
    const otherTags = fullTags.filter(t =>
      !t.startsWith("person/") && !t.startsWith("scope/") && !t.startsWith("source/") &&
      !t.startsWith("status/") && !t.startsWith("para/") && !t.startsWith("type/") &&
      !t.startsWith("priority/") && !t.startsWith("action/")
    );

    // Extract capture_intent from frontmatter (if present)
    let captureIntent: string | undefined;
    if (frontmatterMatch) {
      const intentMatch = frontmatterMatch[1].match(/capture_intent:\s*["']?(.+?)["']?\s*$/m);
      if (intentMatch) {
        captureIntent = intentMatch[1].trim();
      }
    }

    // Check if note needs renaming
    const nameCheck = await checkNoteNameAndSuggest(result.path, content, result.tags);

    // Get PARA validation
    const existingPara = result.tags.find((t: string) => t.startsWith("para/"));
    const contentTags = result.tags.filter((t: string) => !t.startsWith("para/"));
    const contentSuggestions = enablePara ? suggestParaClassification(content, contentTags) : [];
    const topMatch = contentSuggestions[0];

    // === HEADER (conversational) ===
    console.log("═".repeat(60));
    console.log(`  📥 Note ${notePosition} of ${sessionTotal}`);
    console.log("═".repeat(60));

    // === NAME SECTION ===
    console.log("");
    console.log(`  📛 NAME`);
    console.log(`     Current:   ${name}`);
    if (nameCheck.needsRename && nameCheck.suggestedName) {
      // Build source info string
      let sourceInfo = "";
      if (nameCheck.method === "pattern" && nameCheck.pattern) {
        sourceInfo = ` (via pattern: ${nameCheck.pattern})`;
      } else if (nameCheck.method === "tags") {
        sourceInfo = " (via tags)";
      }
      console.log(`     Suggested: ${nameCheck.suggestedName}${sourceInfo}`);
    } else if (nameCheck.needsRename) {
      console.log(`     ⚠️ Needs better name (${nameCheck.reason})`);
    }

    // === CLASSIFICATION SECTION ===
    // Only show if PARA is enabled or there's scope/people info
    const hasClassificationInfo = enablePara || scope.length > 0 || people.length > 0;
    if (hasClassificationInfo) {
      console.log("");
      console.log(`  📁 CLASSIFICATION`);
      // PARA (only show if --no-para is not set)
      if (enablePara) {
        if (topMatch) {
          if (existingPara) {
            const existingCategory = existingPara.split("/")[1];
            if (topMatch.category === existingCategory) {
              console.log(`     PARA:      ${existingPara}`);
            } else {
              console.log(`     PARA:      ${existingPara} → suggested: ${topMatch.category}`);
            }
          } else {
            console.log(`     PARA:      (none) → suggested: ${topMatch.category}`);
          }
        } else if (existingPara) {
          console.log(`     PARA:      ${existingPara}`);
        }
      }
      // Scope + People
      const scopeStr = scope.length > 0 ? scope.join(", ") : "(none)";
      console.log(`     Scope:     ${scopeStr}${people.length > 0 ? `  │  Person: ${people.join(", ")}` : ""}`);
    }

    // === TAGS SECTION (two categories) ===
    console.log("");
    console.log(`  🏷️  TAGS`);
    // On note: existing tags from frontmatter
    const onNoteTagsStr = otherTags.length > 0 ? otherTags.join(", ") : "(none)";
    console.log(`     On note:   ${onNoteTagsStr}`);
    // Suggested: new tags to add (from dimensional taxonomy)
    // Import dimensional taxonomy for tag suggestions
    const { getDefaultTaxonomy, suggestTagsFromPatterns } = await import("./lib/taxonomy");
    let suggestedTags: string[] = [];
    try {
      const dimTaxonomy = await getDefaultTaxonomy();
      suggestedTags = suggestTagsFromPatterns(content, dimTaxonomy, fullTags);
    } catch (e) {
      // Fallback: use empty suggestions if taxonomy unavailable
      suggestedTags = [];
    }
    // Filter out tags already on the note
    const newSuggestedTags = suggestedTags.filter((t: string) => !fullTags.includes(t));
    if (newSuggestedTags.length > 0) {
      console.log(`     Suggested: ${newSuggestedTags.map((t: string) => `+${t}`).join(", ")}`);
    }

    // === METADATA SECTION ===
    // Priority (if set)
    if (priority) {
      const priorityIcon = priority === "high" ? "🔥" : "💤";
      console.log(`  ${priorityIcon} PRIORITY: ${priority}`);
    }
    // Queued actions (if any)
    if (actions.length > 0) {
      console.log(`  ⏳ QUEUED:   ${actions.join(", ")}`);
    }
    // Capture intent
    if (captureIntent) {
      console.log(`  💭 INTENT:   "${captureIntent}"`);
    }
    // Content source with URL
    const contentSource = detectContentSource(content);
    if (contentSource) {
      console.log(`  ${contentSource.icon} SOURCE:   ${contentSource.name}`);
      if (contentSource.url) {
        console.log(`     🔗 ${contentSource.url}`);
      }
    }

    // === SUMMARY (at bottom, after metadata) ===
    console.log("");
    console.log("─".repeat(60));
    const contentWithoutFrontmatter = content.replace(/^---[\s\S]*?---\n?/, "").trim();
    // Clean RTF/Pandoc artifacts for readable preview
    const cleanedContent = cleanMarkdownArtifacts(contentWithoutFrontmatter);
    const preview = cleanedContent.slice(0, 400);
    if (preview.length > 0) {
      console.log(`📝 SUMMARY:\n${preview}${cleanedContent.length > 400 ? "..." : ""}`);
    }
    console.log("─".repeat(60));

    // === ACTIONS (natural language with keywords) ===
    console.log("");
    console.log("What would you like to do?");
    console.log("  • done       - Accept suggestions and move on");
    console.log("  • priority   - Set priority: \"priority high\" or \"priority low\"");
    console.log("  • because    - Record why: \"because [reason]\"");
    console.log("  • extract    - Queue for wisdom extraction");
    console.log("  • skip       - Come back to this later");
    console.log("  • rename     - Accept the suggested name");
    console.log("  • archive    - Archive the note");
    console.log("  • quit       - Exit sweep");
    console.log("═".repeat(60));
    console.log("");
  }

  // After reviewing, suggest next steps
  console.log("═".repeat(60));
  console.log("\n✅ Review complete\n");

  // Suggest continuing with more notes
  console.log("NEXT STEPS:");
  console.log("  ctx sweep              # Show next batch of inbox notes");
  console.log("  ctx sweep --auto --dry-run  # Preview bulk auto-processing");
  console.log("");
}

/**
 * Handle the 'done' command - mark a note as reviewed without changes
 * Removes status/inbox tag to indicate the note has been processed
 */
async function handleDone(args: string[]) {
  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    console.log(`
ctx done - Mark note as reviewed (removes status/inbox)

USAGE:
  ctx done <index>       Mark note by index from last sweep/search
  ctx done <path>        Mark note by file path

OPTIONS:
  --apply, -a            Apply all suggestions (name, tags) from flashcard
                         Renames file to suggested name
                         Adds suggested tags to frontmatter
  --reason, -r <text>    Record why you saved this note (capture intent)
                         Stored as 'capture_intent' in frontmatter
                         Surfaces during weave for connection context
  --priority, -p <level> Set importance: high or low
                         Adds priority/high or priority/low tag
  --source, -s <name>    Set content source (overrides auto-detection)
                         Stored as 'content_source' in frontmatter

EXAMPLES:
  ctx done 1             Mark first note from last sweep as done
  ctx done 1 --apply     Apply suggestions and mark as done
  ctx done 1,3,5         Mark multiple notes as done
  ctx done 1-5           Mark range of notes as done
  ctx done 1 --reason "Has useful API patterns"
  ctx done 1 -r "Reference for Q1 planning"
  ctx done 1 --priority high
  ctx done 1 -p low
  ctx done 1 --source "TLDR Newsletter"

This removes the status/inbox tag, indicating the note has been
reviewed and needs no changes. Use 'skip' during sweep to defer.

CONTENT SOURCE:
  Source is auto-detected from URLs in the note content (TLDR, HN,
  Reddit, etc.). Use --source to override or set manually.

CAPTURE INTENT:
  When you save a note, you know WHY it's valuable. A week later
  during weave, that context is gone. Use --reason to preserve it:

  ctx done 1 -r "Contradicts Mike's approach - discuss at standup"
`);
    return;
  }

  // Parse --apply / -a flag (apply suggestions)
  const applySuggestions = args.includes("--apply") || args.includes("-a");
  if (applySuggestions) {
    args = args.filter(a => a !== "--apply" && a !== "-a");
  }

  // Parse --reason / -r flag
  let reason: string | undefined;
  const reasonIdx = args.findIndex(a => a === "--reason" || a === "-r");
  if (reasonIdx !== -1 && args[reasonIdx + 1]) {
    reason = args[reasonIdx + 1];
    // Remove --reason and its value from args
    args.splice(reasonIdx, 2);
  }

  // Parse --priority / -p flag
  let priority: "high" | "low" | undefined;
  const priorityIdx = args.findIndex(a => a === "--priority" || a === "-p");
  if (priorityIdx !== -1 && args[priorityIdx + 1]) {
    const val = args[priorityIdx + 1].toLowerCase();
    if (val === "high" || val === "low") {
      priority = val;
    } else {
      console.log(`⚠️  Invalid priority: ${val}. Use 'high' or 'low'.`);
    }
    // Remove --priority and its value from args
    args.splice(priorityIdx, 2);
  }

  // Parse --source / -s flag (manual override for content source)
  let source: string | undefined;
  const sourceIdx = args.findIndex(a => a === "--source" || a === "-s");
  if (sourceIdx !== -1 && args[sourceIdx + 1]) {
    source = args[sourceIdx + 1];
    // Remove --source and its value from args
    args.splice(sourceIdx, 2);
  }

  // Parse the arguments - could be indices, ranges, or paths
  const targets = args.join(",").split(",").map(t => t.trim()).filter(Boolean);

  // Load last search results for index resolution
  const cacheDir = join(homedir(), ".cache", "ctx");
  const cacheFile = join(cacheDir, "last-search.json");

  let lastSearch: { query: string; tagMatches?: Array<{ path: string; name: string; tags: string[] }>; results?: Array<{ path: string; name: string; tags: string[] }> } | null = null;
  if (existsSync(cacheFile)) {
    try {
      lastSearch = JSON.parse(readFileSync(cacheFile, "utf-8"));
    } catch {
      // Ignore parse errors
    }
  }

  let processedCount = 0;
  let errorCount = 0;

  for (const target of targets) {
    // Check if it's a range (e.g., "1-5")
    const rangeMatch = target.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]);
      const end = parseInt(rangeMatch[2]);
      for (let i = start; i <= end; i++) {
        const result = await markNoteAsDone(i.toString(), lastSearch, reason, priority, source, applySuggestions);
        if (result.success) processedCount++;
        else errorCount++;
      }
      continue;
    }

    // Single index or path
    const result = await markNoteAsDone(target, lastSearch, reason, priority, source, applySuggestions);
    if (result.success) processedCount++;
    else errorCount++;
  }

  if (processedCount > 0) {
    console.log(`\n✅ Marked ${processedCount} note(s) as done (status/inbox removed)`);
  }
  if (errorCount > 0) {
    console.log(`⚠️  ${errorCount} note(s) could not be processed`);
  }
}

async function markNoteAsDone(
  target: string,
  lastSearch: { query: string; tagMatches?: Array<{ path: string; name: string; tags: string[] }>; results?: Array<{ path: string; name: string; tags: string[] }> } | null,
  reason?: string,
  priority?: "high" | "low",
  manualSource?: string,
  applySuggestions?: boolean
): Promise<{ success: boolean; error?: string }> {
  let notePath: string;
  let noteName: string;
  let sessionIndex: number | null = null;  // Track for session update
  const config = getConfig();

  // Check if target is a number (index)
  if (/^\d+$/.test(target)) {
    // First try sweep session (REQ-SESSION-002)
    const sessionPath = resolveNoteRef(target, config.vaultPath);
    if (sessionPath) {
      notePath = sessionPath;
      noteName = basename(notePath, ".md");
      sessionIndex = parseInt(target, 10);  // Track index for session update
    } else {
      // Fallback to last-search.json cache
      const index = parseInt(target) - 1; // 1-indexed
      // Support both tagMatches (sweep) and results (search) cache formats
      const searchResults = lastSearch?.tagMatches || lastSearch?.results;
      if (!searchResults || index < 0 || index >= searchResults.length) {
        console.error(`Error: Index ${target} not found in sweep session or last search results`);
        return { success: false, error: "Index not found" };
      }
      notePath = searchResults[index].path;
      noteName = searchResults[index].name || basename(notePath, ".md");
    }
  } else {
    // Assume it's a path or name
    notePath = target;
    if (!existsSync(notePath)) {
      // Try to find it in vault
      const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
      if (vaultPath) {
        const tryPath = join(vaultPath, target.endsWith(".md") ? target : `${target}.md`);
        if (existsSync(tryPath)) {
          notePath = tryPath;
        } else {
          console.error(`Error: Note not found: ${target}`);
          return { success: false, error: "Note not found" };
        }
      }
    }
    noteName = basename(notePath, ".md");
  }

  // Read the note
  if (!existsSync(notePath)) {
    console.error(`Error: File not found: ${notePath}`);
    // Mark as deleted in session so sweep can continue
    if (sessionIndex !== null) {
      markItemDeleted(sessionIndex);
    }
    return { success: false, error: "File not found" };
  }

  const content = readFileSync(notePath, "utf-8");

  // Check if it has status/inbox tag
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    console.log(`  ⚠️  "${noteName}" has no frontmatter`);
    return { success: false, error: "No frontmatter" };
  }

  // Check for status/inbox in tags
  if (!content.includes("status/inbox")) {
    console.log(`  ℹ️  "${noteName}" already processed (no status/inbox)`);
    // Still mark as done in session so sweep can continue
    if (sessionIndex !== null) {
      markItemDone(sessionIndex);
    }
    return { success: true }; // Not an error, just already done
  }

  // Remove status/inbox from tags and add capture_intent if provided
  let updatedContent = content;
  let newNotePath = notePath;

  // Apply suggestions if --apply flag is set
  if (applySuggestions) {
    const { getDefaultTaxonomy, matchTitlePatterns, suggestTagsFromPatterns } = await import(
      "./lib/taxonomy"
    );

    try {
      const taxonomy = await getDefaultTaxonomy();

      // Generate name suggestion using dimensional taxonomy title patterns
      const contentWithoutFrontmatter = content.replace(/^---[\s\S]*?---\n?/, "").trim();
      let suggestedName: string | null = null;

      // Try to match title patterns
      const titleResult = matchTitlePatterns(content, taxonomy);
      if (titleResult) {
        suggestedName = titleResult.title;
      } else {
        // Try again with frontmatter removed
        const cleanTitleResult = matchTitlePatterns(contentWithoutFrontmatter, taxonomy);
        if (cleanTitleResult) {
          suggestedName = cleanTitleResult.title;
        }
      }

      // Apply suggested name (rename file)
      if (suggestedName) {
        // Preserve date prefix if present (YYYY-MM-DD-)
        const datePrefix = noteName.match(/^(\d{4}-\d{2}-\d{2})-/)?.[1];
        const newName = datePrefix ? `${datePrefix}-${suggestedName}` : suggestedName;

        // Sanitize filename for cross-platform compatibility (Windows, Mac, Linux)
        // Remove: < > : " / \ | ? * ' ` # and smart quotes ' ' " "
        const sanitizedName = newName
          .replace(/[<>:"/\\|?*'`#''""]/g, "")
          .replace(/\s+/g, " ")
          .trim();
        const noteDir = dirname(notePath);
        newNotePath = join(noteDir, `${sanitizedName}.md`);

        // Only rename if different and target doesn't exist
        if (newNotePath !== notePath && !existsSync(newNotePath)) {
          renameSync(notePath, newNotePath);
          console.log(`  📛 Renamed: ${sanitizedName}`);
          notePath = newNotePath;
        }
      }

      // Generate and apply suggested tags using dimensional taxonomy
      const currentTags: string[] = [];

      // Handle both YAML list format and inline format
      const inlineTagsMatch = frontmatterMatch[1].match(/tags:\s*\[(.*?)\]/s);
      const listTagsMatch = frontmatterMatch[1].match(/tags:\s*\n((?:\s+-\s+.*\n?)+)/);

      if (inlineTagsMatch) {
        currentTags.push(...inlineTagsMatch[1].split(",").map(t => t.trim().replace(/['"]/g, "")).filter(Boolean));
      } else if (listTagsMatch) {
        const tagLines = listTagsMatch[1].match(/-\s+(.+)/g) || [];
        currentTags.push(...tagLines.map(t => t.replace(/^-\s+/, "").replace(/['"]/g, "").trim()).filter(Boolean));
      }

      const suggestedTags = suggestTagsFromPatterns(content, taxonomy, currentTags);
      const newTags = suggestedTags.filter((t: string) => !currentTags.includes(t));

      if (newTags.length > 0) {
        if (inlineTagsMatch) {
          // Handle inline format: tags: [tag1, tag2]
          updatedContent = updatedContent.replace(
            /tags:\s*\[(.*?)\]/s,
            (match, tagList) => {
              const existingTags = tagList.split(",").map((t: string) => t.trim()).filter((t: string) => t !== "");
              newTags.forEach((tag: string) => {
                if (!existingTags.some((et: string) => et.replace(/['"]/g, "") === tag)) {
                  existingTags.push(`"${tag}"`);
                }
              });
              return `tags: [${existingTags.join(", ")}]`;
            }
          );
        } else if (listTagsMatch) {
          // Handle YAML list format: tags:\n  - tag1\n  - tag2
          updatedContent = updatedContent.replace(
            /tags:\s*\n((?:\s+-\s+.*\n?)+)/,
            (match, tagList) => {
              const newTagLines = newTags.map((tag: string) => `  - ${tag}`).join("\n");
              return match.trimEnd() + "\n" + newTagLines + "\n";
            }
          );
        }
        console.log(`  🏷️  Added tags: ${newTags.map((t: string) => `+${t}`).join(", ")}`);
      }
    } catch (e) {
      console.warn(`  ⚠️  Could not apply suggestions: ${e}`);
    }
  }

  // Add capture_intent to frontmatter if reason provided
  if (reason) {
    // Insert capture_intent before the closing --- of frontmatter
    const frontmatterEnd = content.indexOf("\n---", 4); // Find second ---
    if (frontmatterEnd > 0) {
      // Check if capture_intent already exists
      if (content.includes("capture_intent:")) {
        // Update existing capture_intent
        updatedContent = updatedContent.replace(
          /capture_intent:.*$/m,
          `capture_intent: "${reason.replace(/"/g, '\\"')}"`
        );
      } else {
        // Insert new capture_intent before closing ---
        const beforeClose = updatedContent.substring(0, frontmatterEnd);
        const afterClose = updatedContent.substring(frontmatterEnd);
        updatedContent = beforeClose + `\ncapture_intent: "${reason.replace(/"/g, '\\"')}"` + afterClose;
      }
      console.log(`  💡 Capture intent: "${reason}"`);
    }
  }

  // Add content_source to frontmatter (manual override or auto-detected)
  let contentSourceName = manualSource;
  if (!contentSourceName) {
    // Auto-detect from content if no manual source provided
    const detected = detectContentSource(content);
    if (detected) {
      contentSourceName = detected.name;
    }
  }
  if (contentSourceName) {
    // Find frontmatter end position
    const frontmatterEnd = updatedContent.indexOf("\n---", 4);
    if (frontmatterEnd > 0) {
      // Check if content_source already exists
      if (updatedContent.includes("content_source:")) {
        // Update existing content_source
        updatedContent = updatedContent.replace(
          /content_source:.*$/m,
          `content_source: "${contentSourceName.replace(/"/g, '\\"')}"`
        );
      } else {
        // Insert new content_source before closing ---
        const beforeClose = updatedContent.substring(0, frontmatterEnd);
        const afterClose = updatedContent.substring(frontmatterEnd);
        updatedContent = beforeClose + `\ncontent_source: "${contentSourceName.replace(/"/g, '\\"')}"` + afterClose;
      }
      console.log(`  📰 Content source: ${contentSourceName}`);
    }
  }

  // Add priority tag if provided
  if (priority) {
    const priorityTag = `priority/${priority}`;
    // Check if priority tag already exists
    if (!updatedContent.includes(priorityTag)) {
      // Add to array format: tags: [...]
      updatedContent = updatedContent.replace(
        /tags:\s*\[(.*?)\]/s,
        (match, tagList) => {
          const tags = tagList.split(",").map((t: string) => t.trim()).filter((t: string) => t !== "");
          // Remove any existing priority tags first
          const filteredTags = tags.filter((t: string) => !t.replace(/['"]/g, "").startsWith("priority/"));
          filteredTags.push(`"${priorityTag}"`);
          return `tags: [${filteredTags.join(", ")}]`;
        }
      );
      // Handle YAML list format - add to tags section
      if (!updatedContent.match(/tags:\s*\[/)) {
        // Find the tags section and add priority tag
        const tagsMatch = updatedContent.match(/^tags:\s*$/m);
        if (tagsMatch) {
          const insertPoint = updatedContent.indexOf(tagsMatch[0]) + tagsMatch[0].length;
          updatedContent = updatedContent.slice(0, insertPoint) + `\n  - "${priorityTag}"` + updatedContent.slice(insertPoint);
        }
      }
      console.log(`  🎯 Priority: ${priority}`);
    }
  }

  // Handle array format: tags: [tag1, status/inbox, tag2] - remove status/inbox
  updatedContent = updatedContent.replace(
    /tags:\s*\[(.*?)\]/s,
    (match, tagList) => {
      const tags = tagList.split(",").map((t: string) => t.trim()).filter((t: string) => {
        const cleaned = t.replace(/['"]/g, "");
        return cleaned !== "status/inbox" && cleaned !== "";
      });
      return `tags: [${tags.join(", ")}]`;
    }
  );

  // Handle YAML list format
  updatedContent = updatedContent.replace(
    /^(\s*-\s*["']?)status\/inbox["']?\s*$/gm,
    ""
  );

  // Clean up empty lines in frontmatter
  updatedContent = updatedContent.replace(/\n{3,}/g, "\n\n");

  writeFileSync(notePath, updatedContent, "utf-8");
  console.log(`  ✅ "${noteName}" marked as done`);

  // Update sweep session if this was an indexed action (REQ-SESSION-002)
  if (sessionIndex !== null) {
    markItemDone(sessionIndex);
  }

  return { success: true };
}

/**
 * Handle the 'extract' command - flag a note for async wisdom extraction
 * Adds action/extract-wisdom tag for later processing by ctx process
 */
async function handleExtract(args: string[]) {
  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    console.log(`
ctx extract - Flag note for async wisdom extraction

USAGE:
  ctx extract <index>      Flag note by index from last sweep/search
  ctx extract <path>       Flag note by file path

ALIASES:
  ctx wisdom               Same as ctx extract

WHAT IT DOES:
  1. Adds 'action/extract-wisdom' tag to the note
  2. Extracts source URL from note content (if present)
  3. Stores source_url in frontmatter for later processing

ASYNC PROCESSING:
  Flagged notes are processed by 'ctx process' which:
  - Fetches full article content via the source URL
  - Runs Fabric extract_article_wisdom pattern
  - Creates a NEW linked literature note with extracted wisdom
  - Removes action/extract-wisdom tag from original

This enables non-blocking wisdom extraction during sweep.
Flag notes now, process them later in batch.

EXAMPLES:
  ctx extract 1            Flag first note from last sweep
  ctx extract 1,3,5        Flag multiple notes
  ctx extract 1-5          Flag range of notes

SEE ALSO:
  ctx process              Process all flagged notes
  ctx search --tag action/extract-wisdom  Find flagged notes
`);
    return;
  }

  // Load last search results from cache
  const cacheDir = join(process.env.HOME || "", ".cache", "ctx");
  const cacheFile = join(cacheDir, "last-search.json");
  let lastSearch: { query: string; tagMatches?: Array<{ path: string; name: string; tags: string[] }>; results?: Array<{ path: string; name: string; tags: string[] }> } | null = null;

  if (existsSync(cacheFile)) {
    try {
      lastSearch = JSON.parse(readFileSync(cacheFile, "utf-8"));
    } catch (e) {
      // Ignore cache read errors
    }
  }

  // Parse targets (can be comma-separated or range)
  const targetArg = args.join(" ");
  const targets = targetArg.split(",").map(t => t.trim()).filter(t => t);

  let processedCount = 0;
  let errorCount = 0;

  for (const target of targets) {
    // Handle range: 1-5
    const rangeMatch = target.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]);
      const end = parseInt(rangeMatch[2]);
      for (let i = start; i <= end; i++) {
        const result = await flagNoteForExtraction(i.toString(), lastSearch);
        if (result.success) processedCount++;
        else errorCount++;
      }
      continue;
    }

    // Single index or path
    const result = await flagNoteForExtraction(target, lastSearch);
    if (result.success) processedCount++;
    else errorCount++;
  }

  if (processedCount > 0) {
    console.log(`\n✅ Flagged ${processedCount} note(s) for wisdom extraction`);
    console.log(`   Run 'ctx process' to extract wisdom from flagged notes`);
  }
  if (errorCount > 0) {
    console.log(`⚠️  ${errorCount} note(s) could not be flagged`);
  }
}

async function flagNoteForExtraction(
  target: string,
  lastSearch: { query: string; tagMatches?: Array<{ path: string; name: string; tags: string[] }>; results?: Array<{ path: string; name: string; tags: string[] }> } | null
): Promise<{ success: boolean; error?: string }> {
  let notePath: string | null = null;
  let noteName: string;

  const config = getConfig();

  // Try to resolve from sweep session first (like ctx rename does)
  // This ensures we get the updated path after renames
  if (/^\d+$/.test(target)) {
    notePath = resolveNoteRef(target, config.vaultPath);
  }

  // If not resolved from session, try last-search cache
  if (!notePath && /^\d+$/.test(target)) {
    const index = parseInt(target) - 1; // 1-indexed
    const searchResults = lastSearch?.tagMatches || lastSearch?.results;
    if (searchResults && index >= 0 && index < searchResults.length) {
      notePath = searchResults[index].path;
    }
  }

  // If still not resolved and it's a number, error
  if (!notePath && /^\d+$/.test(target)) {
    console.error(`Error: Index ${target} not found in sweep session or last search`);
    return { success: false, error: "Index not found" };
  }

  // If not a number, assume it's a path
  if (!notePath) {
    notePath = target;
    if (!existsSync(notePath)) {
      const vaultPath = config.vaultPath;
      if (vaultPath) {
        const tryPath = join(vaultPath, target.endsWith(".md") ? target : `${target}.md`);
        if (existsSync(tryPath)) {
          notePath = tryPath;
        } else {
          console.error(`Error: Note not found: ${target}`);
          return { success: false, error: "Note not found" };
        }
      }
    }
  }

  noteName = basename(notePath, ".md");

  // Read the note
  if (!existsSync(notePath)) {
    console.error(`Error: File not found: ${notePath}`);
    return { success: false, error: "File not found" };
  }

  const content = readFileSync(notePath, "utf-8");

  // Check if already flagged
  if (content.includes("action/extract-wisdom")) {
    console.log(`  ℹ️  "${noteName}" already flagged for extraction`);
    return { success: true };
  }

  // Check for frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    console.log(`  ⚠️  "${noteName}" has no frontmatter`);
    return { success: false, error: "No frontmatter" };
  }

  let updatedContent = content;

  // Extract source URL from content (look for tracking URLs like tldrnewsletter.com)
  const urlPatterns = [
    /\[.*?\]\((https?:\/\/[^\s)]+)\)/g,  // Markdown links
    /(https?:\/\/tracking\.tldrnewsletter\.com\/[^\s)]+)/g,  // TLDR tracking URLs
    /(https?:\/\/[^\s)]+)/g,  // Any URL
  ];

  let sourceUrl: string | undefined;
  for (const pattern of urlPatterns) {
    const match = content.match(pattern);
    if (match && match[0]) {
      // Extract URL from markdown link format if present
      const urlMatch = match[0].match(/\((https?:\/\/[^\s)]+)\)/) || match[0].match(/(https?:\/\/[^\s)]+)/);
      if (urlMatch) {
        sourceUrl = urlMatch[1];
        break;
      }
    }
  }

  // Add source_url to frontmatter if found
  if (sourceUrl && !content.includes("source_url:")) {
    const frontmatterEnd = content.indexOf("\n---", 4);
    if (frontmatterEnd > 0) {
      const beforeClose = updatedContent.substring(0, frontmatterEnd);
      const afterClose = updatedContent.substring(frontmatterEnd);
      updatedContent = beforeClose + `\nsource_url: "${sourceUrl}"` + afterClose;
      console.log(`  🔗 Source URL extracted: ${sourceUrl.substring(0, 50)}...`);
    }
  }

  // Add action/extract-wisdom tag
  const actionTag = "action/extract-wisdom";

  // Handle array format: tags: [...]
  if (updatedContent.match(/tags:\s*\[/)) {
    updatedContent = updatedContent.replace(
      /tags:\s*\[(.*?)\]/s,
      (match, tagList) => {
        const tags = tagList.split(",").map((t: string) => t.trim()).filter((t: string) => t !== "");
        tags.push(`"${actionTag}"`);
        return `tags: [${tags.join(", ")}]`;
      }
    );
  } else if (updatedContent.match(/^tags:\s*$/m)) {
    // Handle YAML list format - find tags section and add
    const tagsMatch = updatedContent.match(/^tags:\s*$/m);
    if (tagsMatch) {
      const insertPoint = updatedContent.indexOf(tagsMatch[0]) + tagsMatch[0].length;
      updatedContent = updatedContent.slice(0, insertPoint) + `\n  - "${actionTag}"` + updatedContent.slice(insertPoint);
    }
  } else {
    // No tags section - add one before closing ---
    const frontmatterEnd = updatedContent.indexOf("\n---", 4);
    if (frontmatterEnd > 0) {
      const beforeClose = updatedContent.substring(0, frontmatterEnd);
      const afterClose = updatedContent.substring(frontmatterEnd);
      updatedContent = beforeClose + `\ntags: ["${actionTag}"]` + afterClose;
    }
  }

  writeFileSync(notePath, updatedContent, "utf-8");
  console.log(`  🔬 "${noteName}" flagged for wisdom extraction`);

  return { success: true };
}

async function handleWeave(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx weave - Weekly connection building practice (🧵)

USAGE:
  ctx weave [--project <name>] [--limit N]
  ctx weave --fabric <pattern> <note>  Process note through Fabric pattern
  ctx weave done                        End weave session
  ctx weave resume                      Resume interrupted weave session

OPTIONS:
  --project, -p <name>   Filter to project (e.g., pai)
  --limit, -l <n>        Maximum notes to process (default: 10)
  --fabric, -f <pattern> Process note with Fabric pattern (creates derived note)
  --fabric-list          List recommended Fabric patterns for weave

METHODOLOGY GUIDANCE:
  --para                 Show PARA guidance for connection decisions
  --zk                   Show Zettelkasten linking principles
  --all-methods          Enable all methodology guidance

SESSION MANAGEMENT:
  Weave sessions start implicitly when you run any weave command.
  All work is tagged with the session tag (e.g., session/weave-2025-12-23-1030).
  Use "ctx weave done" to end the session and create a session note.

WHAT IT DOES:
  1. Finds notes with few incoming/outgoing links
  2. Suggests connections using semantic similarity
  3. Processes notes through Fabric patterns (--fabric)
  4. Records practice completion when done

RESEARCH:
  Use PAI Research skill separately (/research <topic>).
  Results bubble back into active dive sessions.

EXAMPLES:
  ctx weave                          # Start session, find orphan notes
  ctx weave --para                   # With PARA guidance
  ctx weave --zk                     # With Zettelkasten principles
  ctx weave --fabric extract_wisdom note.md  # Process with Fabric
  ctx weave --fabric-list            # Show recommended patterns
  ctx weave done                     # End session
`);
    return;
  }

  // Handle "resume" subcommand - resume interrupted session
  if (args[0] === "resume") {
    if (hasActiveSession()) {
      const session = getActiveSession()!;
      if (session.practice === "weave") {
        console.log("\n✓ Weave session already active.");
        console.log(formatSessionStatus());
      } else {
        console.log(`\n⚠️  A ${session.practice} session is already active.`);
        console.log("End it first with: ctx session end");
      }
      return;
    }

    const interrupted = getInterruptedSession();
    if (!interrupted || interrupted.practice !== "weave") {
      console.log("\nNo weave session to resume.");
      if (interrupted) {
        console.log(`  (Found ${interrupted.practice} session - use 'ctx session resume')`);
      }
      console.log("\nStart a new weave session with: ctx weave");
      return;
    }

    if (!canResumeSession()) {
      console.log("\n⚠️  Weave session too old to resume (>24h).");
      console.log(`  Was: ${interrupted.tag}`);
      console.log("\nStart a new weave session with: ctx weave");
      return;
    }

    const session = resumeSession();
    console.log(`\n✓ Weave session resumed: ${session.tag}`);
    console.log(`  Originally started: ${new Date(session.startedAt).toLocaleString()}`);
    console.log("\nContinue your weave - finding orphan notes...\n");
    // Fall through to normal weave behavior
  }

  // Handle "done" subcommand - end session
  if (args[0] === "done") {
    if (!hasActiveSession()) {
      console.log("No active weave session to end.");
      return;
    }

    // Get session info before ending
    const activeSession = getActiveSession()!;
    const config = getConfig();

    // End the session
    const result = endSession();

    // Create session note in vault
    const sessionMetadata: SessionMetadata = {
      tag: result.tag,
      name: result.tag.replace("session/", ""),
      topic: "weave",
      practice: "weave",
      startedAt: activeSession.startedAt,
      endedAt: new Date().toISOString(),
      durationMinutes: result.durationMinutes,
    };

    const notePath = createSessionNote(sessionMetadata, config.vaultPath);
    const noteRelPath = notePath.replace(config.vaultPath + "/", "");

    console.log(`\n✓ Session ended: ${result.tag}`);
    console.log(`  Duration: ${result.durationMinutes} minutes`);
    console.log(`  Session note: ${noteRelPath}`);
    recordPracticeCompletion("weave");
    console.log(getCompletionMessage("weave", { n: 0 }));
    return;
  }

  // Handle --fabric-list
  if (args.includes("--fabric-list")) {
    console.log("\nRecommended Fabric patterns for weave:\n");
    for (const pattern of RECOMMENDED_PATTERNS) {
      console.log(`  • ${pattern}`);
    }
    console.log("\nUsage: ctx weave --fabric <pattern> <note.md>");
    return;
  }

  // Methodology guidance flags
  const enablePara = args.includes("--para") || args.includes("--all-methods");
  const enableZk = args.includes("--zk") || args.includes("--all-methods");

  // Handle --fabric processing
  const fabricIdx = args.findIndex(a => a === "--fabric" || a === "-f");
  if (fabricIdx !== -1) {
    const pattern = args[fabricIdx + 1];
    const notePath = args[fabricIdx + 2];

    if (!pattern) {
      console.error("Error: --fabric requires a pattern name");
      console.log("Use --fabric-list to see available patterns");
      process.exit(1);
    }
    if (!notePath) {
      console.error("Error: --fabric requires a note path");
      process.exit(1);
    }

    // Ensure session is active (implicit start)
    let session = getActiveSession();
    if (!session) {
      session = startSession("weave");
      console.log(`\nStarted weave session: ${session.tag}\n`);
    }

    const indicator = getSessionIndicator();
    console.log(`${indicator} Processing ${notePath} with ${pattern}...`);

    const config = getConfig();
    const fullPath = notePath.startsWith("/") ? notePath : join(config.vaultPath, notePath);

    if (!existsSync(fullPath)) {
      console.error(`Note not found: ${fullPath}`);
      process.exit(1);
    }

    const result = await weaveWithFabric(fullPath, pattern);

    if (result.success) {
      console.log(`${indicator} Created: ${basename(result.derivedPath)}`);
      console.log(`  Source preserved: ${result.sourceNoteName}.md`);
    } else {
      console.error(`${indicator} Error: ${result.error}`);
    }
    return;
  }

  // Parse args
  let limit = 10;
  let projectFilter: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "--limit" || args[i] === "-l") && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if ((args[i] === "--project" || args[i] === "-p") && args[i + 1]) {
      projectFilter = args[i + 1];
      i++;
    }
  }

  const config = getConfig();

  // Ensure session is active (implicit start)
  let session = getActiveSession();
  if (!session) {
    session = startSession("weave");
    console.log(`\nStarted weave session: ${session.tag}\n`);
  }

  const indicator = getSessionIndicator();
  console.log(`${indicator} 🧵 Starting Weave...\n`);

  // Display methodology guidance if requested
  if (enablePara || enableZk) {
    console.log("─".repeat(60));
    console.log("METHODOLOGY GUIDANCE");
    console.log("─".repeat(60));

    if (enablePara) {
      console.log("");
      console.log(getWeaveParaHelp());
    }

    if (enableZk) {
      console.log("");
      console.log(getWeaveZkHelp());
    }

    console.log("");
    console.log("─".repeat(60));
    console.log("");
  }

  // Find orphan notes
  console.log(`${indicator} Finding orphan notes...`);
  const orphans = await findOrphans(config.vaultPath);

  let candidates = orphans;
  if (projectFilter) {
    // Filter to project (would need tag filtering in real impl)
    console.log(`Filtering to project/${projectFilter}...`);
  }

  candidates = candidates.slice(0, limit);

  if (candidates.length === 0) {
    console.log("✨ No orphan notes found! Your knowledge is well-connected.\n");
    const record = recordPracticeCompletion("weave");
    console.log(getCompletionMessage("weave", { n: 0 }));
    return;
  }

  console.log(`Found ${candidates.length} notes needing connections.\n`);

  let connectionsFound = 0;

  for (const orphan of candidates) {
    console.log("─".repeat(60));
    console.log(`\n📄 ${orphan.relativePath}`);
    console.log(`   Incoming links: ${orphan.incomingLinks}`);
    console.log(`   Outgoing links: ${orphan.outgoingLinks}`);

    // Get suggestions
    const suggestions = await suggestConnections(
      join(config.vaultPath, orphan.relativePath),
      config.vaultPath
    );

    if (suggestions.length > 0) {
      console.log("\n   Suggested connections:");
      for (const sugg of suggestions.slice(0, 3)) {
        console.log(`   ${sugg.confidence > 0.7 ? "🔗" : "🔍"} [[${sugg.targetNote}]]`);
        console.log(`      ${sugg.reason}`);
        connectionsFound++;
      }
    } else {
      console.log("\n   No strong connections found");
    }
  }

  // Record completion
  const record = recordPracticeCompletion("weave");
  console.log("\n" + "─".repeat(60));
  console.log(`\n${getCompletionMessage("weave", { n: connectionsFound })}`);
  console.log(`   Notes reviewed: ${candidates.length}`);
  console.log(`   Connections suggested: ${connectionsFound}`);
  console.log(`   Total weaves: ${record.totalCount}`);
  if (record.streak > 1) {
    console.log(`   Streak: ${record.streak} weeks`);
  }
  console.log("");
}

async function handleRename(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx rename - Rename a note and update wiki-links

USAGE:
  ctx rename <path> --to "New Name" [--dry-run] [--strip-date]

OPTIONS:
  --to <name>    The new name for the note (required)
  --dry-run      Preview changes without modifying files
  --strip-date   Remove the date prefix instead of preserving it

BEHAVIOR:
  - Date prefixes (YYYY-MM-DD-) are preserved by default
  - If original is "2025-12-28-Note.md" and you rename to "Better Name"
    → Result: "2025-12-28-Better Name.md"
  - Use --strip-date to remove the date prefix

WHAT IT DOES:
  1. Renames the note file to the new name
  2. Updates all wiki-links in other notes that reference it
  3. Preserves display text in links: [[old|display]] → [[new|display]]

EXAMPLES:
  ctx rename Photo-2025-12-23.md --to "Holiday dinner"
  ctx rename ~/vault/Clipboard-123.md --to "Meeting notes" --dry-run
  ctx rename 2025-12-28-Note.md --to "Plain Name" --strip-date
`);
    return;
  }

  // Parse args
  const toIdx = args.findIndex((a) => a === "--to");
  if (toIdx === -1 || !args[toIdx + 1]) {
    console.error("Error: --to <name> is required");
    console.log("Run 'ctx rename --help' for usage.");
    process.exit(1);
  }

  let newName = args[toIdx + 1];
  const dryRun = args.includes("--dry-run");
  const stripDate = args.includes("--strip-date");

  // Get the path (first arg that's not a flag)
  const notePath = args.find((a) => !a.startsWith("--") && a !== newName);
  if (!notePath) {
    console.error("Error: Note path is required");
    console.log("Run 'ctx rename --help' for usage.");
    process.exit(1);
  }

  const config = getConfig();

  // Try to resolve from sweep session first (REQ-SESSION-002)
  let resolvedPath = resolveNoteRef(notePath, config.vaultPath);
  const oldPath = resolvedPath; // Store for session update after rename

  // Fallback to traditional path resolution if no session or not found
  if (!resolvedPath) {
    resolvedPath = notePath;
    if (!notePath.startsWith("/") && !notePath.startsWith("~")) {
      resolvedPath = join(config.vaultPath, notePath);
    }
    resolvedPath = resolvedPath.replace("~", homedir());

    // Add .md if not present
    if (!resolvedPath.endsWith(".md")) {
      resolvedPath += ".md";
    }
  }

  // Preserve date prefix from original filename unless --strip-date is used
  const originalFilename = basename(resolvedPath, ".md");
  const datePrefix = originalFilename.match(/^(\d{4}-\d{2}-\d{2})-/);
  const newNameHasDate = /^\d{4}-\d{2}-\d{2}-/.test(newName);

  if (datePrefix && !newNameHasDate && !stripDate) {
    // Original has date prefix, new name doesn't - preserve it
    newName = `${datePrefix[1]}-${newName}`;
  }

  console.log(`\n📝 Renaming note...`);
  console.log(`   From: ${basename(resolvedPath, ".md")}`);
  console.log(`   To:   ${newName}`);

  if (dryRun) {
    console.log(`   Mode: DRY RUN (no changes will be made)\n`);
  }

  try {
    const result = await renameNote(resolvedPath, newName, config.vaultPath, { dryRun });

    if (dryRun) {
      console.log(`✓ Would rename: ${basename(result.oldPath)} → ${basename(result.newPath)}`);
      if (result.updatedLinks.length > 0) {
        console.log(`✓ Would update ${result.updatedLinks.length} wiki-links:`);
        for (const path of result.updatedLinks.slice(0, 5)) {
          console.log(`   - ${basename(path, ".md")}`);
        }
        if (result.updatedLinks.length > 5) {
          console.log(`   ... and ${result.updatedLinks.length - 5} more`);
        }
      }
    } else {
      console.log(`\n✅ Renamed successfully!`);
      console.log(`   New path: ${result.newPath}`);
      if (result.updatedLinks.length > 0) {
        console.log(`   Updated ${result.updatedLinks.length} wiki-links`);
      }

      // Update sweep session with new path (REQ-SESSION-003)
      if (oldPath) {
        updateQueueItemPath(oldPath, result.newPath);
      }
    }
    console.log("");
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// ============================================================================
// Delete Handler
// ============================================================================

async function handleDelete(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx delete - Permanently delete a note from the vault

USAGE:
  ctx delete <path|index> [options]

OPTIONS:
  --force, -f    Skip confirmation prompt
  --help, -h     Show this help

BEHAVIOR:
  - Prompts for confirmation before deleting (unless --force)
  - Supports sweep session index resolution (e.g., "ctx delete 1")
  - Updates sweep session to mark item as deleted
  - THIS CANNOT BE UNDONE

EXAMPLES:
  ctx delete 1                    # Delete note at index 1 (during sweep)
  ctx delete 1 --force            # Delete without confirmation
  ctx delete "Photo-2025-12.md"   # Delete by filename
  ctx delete ~/vault/old-note.md  # Delete by full path
`);
    return;
  }

  const force = args.includes("--force") || args.includes("-f");

  // Get the path (first arg that's not a flag)
  const noteRef = args.find((a) => !a.startsWith("--") && a !== "-f");
  if (!noteRef) {
    console.error("Error: Note path or index is required");
    console.log("Run 'ctx delete --help' for usage.");
    process.exit(1);
  }

  const config = getConfig();

  // Try to resolve from sweep session first (REQ-DELETE-001)
  let resolvedPath = resolveNoteRef(noteRef, config.vaultPath);
  let sessionIndex: number | null = null;

  // Check if this was a numeric index for session update later
  const asNumber = parseInt(noteRef.trim(), 10);
  if (!isNaN(asNumber) && String(asNumber) === noteRef.trim()) {
    sessionIndex = asNumber;
  }

  // Fallback to traditional path resolution if no session or not found
  if (!resolvedPath) {
    resolvedPath = noteRef;
    if (!noteRef.startsWith("/") && !noteRef.startsWith("~")) {
      resolvedPath = join(config.vaultPath, noteRef);
    }
    resolvedPath = resolvedPath.replace("~", homedir());

    // Add .md if not present
    if (!resolvedPath.endsWith(".md")) {
      resolvedPath += ".md";
    }
  }

  // Check if file exists
  if (!existsSync(resolvedPath)) {
    console.error(`Error: Note not found: ${noteRef}`);
    process.exit(1);
  }

  const noteName = basename(resolvedPath);

  // Confirmation prompt (unless --force)
  if (!force) {
    console.log(`\n🗑️  Delete note: ${noteName}`);
    console.log(`   Path: ${resolvedPath}`);
    console.log(`\n   ⚠️  This cannot be undone!`);

    const rl = await import("readline");
    const readline = rl.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      readline.question("\n   Delete this note? [y/N] ", resolve);
    });
    readline.close();

    if (answer.toLowerCase() !== "y") {
      console.log("\n   Deletion cancelled.\n");
      return;
    }
  }

  try {
    // Delete the file
    unlinkSync(resolvedPath);

    console.log(`\n✅ Deleted: ${noteName}`);

    // Update sweep session if this was an indexed delete (REQ-DELETE-003)
    if (sessionIndex !== null) {
      markItemDeleted(sessionIndex);
      console.log(`   Session updated: index ${sessionIndex} marked as deleted`);
    }

    console.log("");
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// ============================================================================
// Archive Handler
// ============================================================================

async function handleArchive(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx archive - Archive a note by adding status/archived tag

USAGE:
  ctx archive <path|id>              Archive a note
  ctx archive <path|id> --dry-run    Preview without changes

OPTIONS:
  --dry-run      Preview changes without modifying files
  --move         Also move to Archive folder (not implemented yet)

WHAT IT DOES:
  1. Adds the status/archived tag to the note's frontmatter
  2. Removes status/inbox tag if present
  3. Optionally moves to Archive folder (with --move)

EXAMPLES:
  ctx archive Photo-2025-12-23.md           Archive a note
  ctx archive ~/vault/old-note.md --dry-run Preview archive
`);
    return;
  }

  const dryRun = args.includes("--dry-run");

  // Get the path (first arg that's not a flag)
  const notePath = args.find((a) => !a.startsWith("--"));
  if (!notePath) {
    console.error("Error: Note path is required");
    console.log("Run 'ctx archive --help' for usage.");
    process.exit(1);
  }

  const config = getConfig();

  // Resolve path relative to vault if needed
  let resolvedPath = notePath;
  if (!notePath.startsWith("/") && !notePath.startsWith("~")) {
    resolvedPath = join(config.vaultPath, notePath);
  }
  resolvedPath = resolvedPath.replace("~", homedir());

  // Add .md if not present
  if (!resolvedPath.endsWith(".md")) {
    resolvedPath += ".md";
  }

  // Check if file exists
  if (!existsSync(resolvedPath)) {
    console.error(`Error: Note not found: ${resolvedPath}`);
    process.exit(1);
  }

  console.log(`\n📦 Archiving note...`);
  console.log(`   Path: ${basename(resolvedPath, ".md")}`);

  if (dryRun) {
    console.log(`   Mode: DRY RUN (no changes will be made)\n`);
  }

  try {
    // Read the current content
    const content = readFileSync(resolvedPath, "utf-8");

    // Parse frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      console.error("Error: Note has no frontmatter");
      process.exit(1);
    }

    const frontmatter = frontmatterMatch[1];
    let updatedFrontmatter = frontmatter;

    // Check if already archived
    if (frontmatter.includes("status/archived")) {
      console.log("ℹ️  Note is already archived");
      return;
    }

    // Add status/archived tag
    // Handle YAML list format: tags:\n  - tag1\n  - tag2
    const yamlListMatch = frontmatter.match(/tags:\s*\n((?:\s+-\s+.+\n?)+)/);
    if (yamlListMatch) {
      // Remove status/inbox if present
      updatedFrontmatter = updatedFrontmatter.replace(/\s+-\s+status\/inbox\n?/g, "\n");
      // Add status/archived at the end of tags list
      const tagsSection = updatedFrontmatter.match(/tags:\s*\n((?:\s+-\s+.+\n?)+)/);
      if (tagsSection) {
        const updatedTags = tagsSection[0].trimEnd() + "\n  - status/archived\n";
        updatedFrontmatter = updatedFrontmatter.replace(/tags:\s*\n(?:\s+-\s+.+\n?)+/, updatedTags);
      }
    } else {
      // Handle inline format: tags: [tag1, tag2]
      const inlineMatch = frontmatter.match(/tags:\s*\[(.*?)\]/);
      if (inlineMatch) {
        let tags = inlineMatch[1];
        // Remove status/inbox
        tags = tags.replace(/status\/inbox,?\s*/g, "").replace(/,\s*$/, "");
        // Add status/archived
        tags = tags ? `${tags}, status/archived` : "status/archived";
        updatedFrontmatter = updatedFrontmatter.replace(/tags:\s*\[.*?\]/, `tags: [${tags}]`);
      } else {
        // No tags section, add one
        updatedFrontmatter += "\ntags:\n  - status/archived";
      }
    }

    // Update the content
    const updatedContent = content.replace(/^---\n[\s\S]*?\n---/, `---\n${updatedFrontmatter}\n---`);

    if (dryRun) {
      console.log(`✓ Would add status/archived tag`);
      if (frontmatter.includes("status/inbox")) {
        console.log(`✓ Would remove status/inbox tag`);
      }
    } else {
      writeFileSync(resolvedPath, updatedContent);
      console.log(`\n✅ Archived successfully!`);
      console.log(`   Added: status/archived`);
      if (frontmatter.includes("status/inbox")) {
        console.log(`   Removed: status/inbox`);
      }
    }
    console.log("");
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// ============================================================================
// Clean Handler - Clean markdown artifacts from notes
// ============================================================================

async function handleClean(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx clean - Clean markdown artifacts from notes

USAGE:
  ctx clean <path>              Clean a single note
  ctx clean <path> --dry-run    Preview without changes

OPTIONS:
  --dry-run      Preview changes without modifying files

WHAT IT CLEANS:
  - Pandoc/RTF class attributes: {.underline}, {.class-name}
  - Style attributes: {style="..."}
  - Double brackets: [[text]] -> [text] (preserves wikilinks)
  - Empty brackets: []
  - RTF backslash continuations
  - Excessive newlines (3+ -> 2)

EXAMPLES:
  ctx clean Photo-2025-12-23.md           Clean a note
  ctx clean ~/vault/messy-note.md --dry-run Preview cleanup
`);
    return;
  }

  const dryRun = args.includes("--dry-run");

  // Get the path (first arg that's not a flag)
  const notePath = args.find((a) => !a.startsWith("--"));
  if (!notePath) {
    console.error("Error: Note path is required");
    console.log("Run 'ctx clean --help' for usage.");
    process.exit(1);
  }

  const config = getConfig();

  // Resolve path relative to vault if needed
  let resolvedPath = notePath;
  if (!notePath.startsWith("/") && !notePath.startsWith("~")) {
    resolvedPath = join(config.vaultPath, notePath);
  }
  resolvedPath = resolvedPath.replace("~", homedir());

  // Add .md if not present
  if (!resolvedPath.endsWith(".md")) {
    resolvedPath += ".md";
  }

  // Check if file exists
  if (!existsSync(resolvedPath)) {
    console.error(`Error: Note not found: ${resolvedPath}`);
    process.exit(1);
  }

  console.log(`\n🧹 Cleaning markdown artifacts...`);
  console.log(`   Path: ${basename(resolvedPath, ".md")}`);

  if (dryRun) {
    console.log(`   Mode: DRY RUN (no changes will be made)\n`);
  }

  try {
    // Read the current content
    const content = readFileSync(resolvedPath, "utf-8");

    // Import and apply the cleaning function
    const { cleanMarkdownArtifacts } = await import("../ingest/lib/process");
    const cleanedContent = cleanMarkdownArtifacts(content);

    // Count changes
    const changes: string[] = [];
    if (content.match(/\{\.[\w-]+\}/g)) changes.push("class attributes");
    if (content.match(/\{[^}]*style="[^"]*"[^}]*\}/g)) changes.push("style attributes");
    if (content.match(/\[\[([^\]]+)\]\](?!\()/g)) changes.push("double brackets");
    if (content.match(/\[\]\s*/g)) changes.push("empty brackets");
    if (content.match(/\\\n/g)) changes.push("backslash continuations");
    if (content.match(/\n{3,}/g)) changes.push("excessive newlines");

    if (content === cleanedContent) {
      console.log("✨ Note is already clean - no changes needed");
      return;
    }

    if (dryRun) {
      console.log(`✓ Would clean: ${changes.join(", ")}`);
      console.log(`✓ Characters: ${content.length} -> ${cleanedContent.length}`);
    } else {
      writeFileSync(resolvedPath, cleanedContent);
      console.log(`\n✅ Cleaned successfully!`);
      console.log(`   Removed: ${changes.join(", ")}`);
      console.log(`   Characters: ${content.length} -> ${cleanedContent.length}`);
    }
    console.log("");
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// ============================================================================
// Dive Handler (20,000 ft - Deep exploration, as-needed, 1-2 hours)
// ============================================================================

async function handleDive(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx dive - Deep exploration practice (🔬)

USAGE:
  ctx dive <topic>                     Start deep dive on topic
  ctx dive --fabric <pattern> <note>   Process note through Fabric pattern
  ctx dive done                        End dive session
  ctx dive resume                      Resume interrupted dive session

OPTIONS:
  --limit, -l <n>        Maximum notes to find (default: 20)
  --fabric, -f <pattern> Process note with Fabric pattern (creates derived note)
  --fabric-list          List recommended Fabric patterns

SESSION MANAGEMENT:
  Dive sessions start when you specify a topic.
  Session tag includes topic: session/dive-<topic>-2025-12-24-1030
  All work is tagged with the session tag.
  Use "ctx dive done" to end the session and create a session note.

RESEARCH INTEGRATION:
  Use PAI Research skill (/research <topic>) during your dive session.
  Research results are ingested with your active session tag, keeping
  all research connected to your dive topic.

WHAT IT DOES:
  1. Finds all notes related to the topic (semantic search)
  2. Enables full 7-phase HITL workflow (Load→Survey→Extract→Connect→Draft→Create→Archive)
  3. Processes notes through Fabric patterns
  4. Creates synthesized permanent notes

EXAMPLES:
  ctx dive "knowledge architecture"     # Start dive session on topic
  ctx dive --fabric extract_wisdom note.md  # Process with Fabric
  ctx dive done                         # End session
`);
    return;
  }

  // Handle "resume" subcommand - resume interrupted session
  if (args[0] === "resume") {
    if (hasActiveSession()) {
      const session = getActiveSession()!;
      if (session.practice === "dive") {
        console.log("\n✓ Dive session already active.");
        console.log(formatSessionStatus());
      } else {
        console.log(`\n⚠️  A ${session.practice} session is already active.`);
        console.log("End it first with: ctx session end");
      }
      return;
    }

    const interrupted = getInterruptedSession();
    if (!interrupted || interrupted.practice !== "dive") {
      console.log("\nNo dive session to resume.");
      if (interrupted) {
        console.log(`  (Found ${interrupted.practice} session - use 'ctx session resume')`);
      }
      console.log("\nStart a new dive session with: ctx dive <topic>");
      return;
    }

    if (!canResumeSession()) {
      console.log("\n⚠️  Dive session too old to resume (>24h).");
      console.log(`  Was: ${interrupted.tag}`);
      console.log("\nStart a new dive session with: ctx dive <topic>");
      return;
    }

    const session = resumeSession();
    const topic = session.tag.replace(/session\/dive-(.+)-\d{4}-\d{2}-\d{2}-\d{4}/, "$1");
    console.log(`\n✓ Dive session resumed: ${session.tag}`);
    console.log(`  Topic: ${topic}`);
    console.log(`  Originally started: ${new Date(session.startedAt).toLocaleString()}`);
    console.log("\nContinue your dive - your session context is restored.\n");
    return;
  }

  // Handle "done" subcommand - end session
  if (args[0] === "done") {
    if (!hasActiveSession()) {
      console.log("No active dive session to end.");
      return;
    }

    const activeSession = getActiveSession()!;
    const config = getConfig();
    const result = endSession();

    const sessionMetadata: SessionMetadata = {
      tag: result.tag,
      name: result.tag.replace("session/", ""),
      topic: activeSession.tag.replace(/session\/dive-(.+)-\d{4}-\d{2}-\d{2}-\d{4}/, "$1"),
      practice: "dive",
      startedAt: activeSession.startedAt,
      endedAt: new Date().toISOString(),
      durationMinutes: result.durationMinutes,
    };

    const notePath = createSessionNote(sessionMetadata, config.vaultPath);
    const noteRelPath = notePath.replace(config.vaultPath + "/", "");

    console.log(`\n✓ Dive session ended: ${result.tag}`);
    console.log(`  Duration: ${result.durationMinutes} minutes`);
    console.log(`  Session note: ${noteRelPath}`);
    recordPracticeCompletion("dive");
    console.log(getCompletionMessage("dive", { n: 0 }));
    return;
  }

  // Handle --fabric-list
  if (args.includes("--fabric-list")) {
    console.log("\nRecommended Fabric patterns for dive:\n");
    for (const pattern of RECOMMENDED_PATTERNS) {
      console.log(`  • ${pattern}`);
    }
    console.log("\nUsage: ctx dive --fabric <pattern> <note.md>");
    return;
  }

  // Handle --fabric processing (same as weave)
  const fabricIdx = args.findIndex(a => a === "--fabric" || a === "-f");
  if (fabricIdx !== -1) {
    const pattern = args[fabricIdx + 1];
    const notePath = args[fabricIdx + 2];

    if (!pattern || pattern.startsWith("--")) {
      console.error("Error: --fabric requires a pattern name");
      process.exit(1);
    }
    if (!notePath || notePath.startsWith("--")) {
      console.error("Error: --fabric requires a note path");
      process.exit(1);
    }

    let session = getActiveSession();
    if (!session) {
      console.log("Note: Starting dive session. Use 'ctx dive <topic>' for topic-focused sessions.");
      session = startSession("dive");
      console.log(`Started dive session: ${session.tag}\n`);
    }

    const indicator = getSessionIndicator();
    console.log(`${indicator} Processing with Fabric pattern: ${pattern}`);

    const config = getConfig();
    const fullPath = notePath.startsWith("/") ? notePath : join(config.vaultPath, notePath);

    const result = await weaveWithFabric(fullPath, pattern);
    if (!result.success) {
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }

    console.log(`\n✓ Created derived note: ${basename(result.derivedPath)}`);
    console.log(`  Pattern: ${pattern}`);
    console.log(`  Source preserved: ${result.sourceNoteName}`);
    return;
  }

  // Get topic from args (required for starting a dive)
  const topic = args.find(a => !a.startsWith("--") && !a.startsWith("-"));

  if (!topic) {
    console.error("Error: Topic required. Usage: ctx dive <topic>");
    console.log("Run 'ctx dive --help' for usage.");
    process.exit(1);
  }

  // Start topic-focused dive session
  const sanitizedTopic = topic.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const session = startSession("dive", sanitizedTopic);

  console.log(`\n🔬 Starting dive session: ${session.tag}`);
  console.log(`   Topic: "${topic}"`);
  console.log("");

  // Find notes related to topic using semantic search
  const config = getConfig();
  console.log(`${getSessionIndicator()} Searching for notes related to "${topic}"...`);
  console.log("");

  try {
    const results = await semanticSearch(topic, config.vaultPath, {
      limit: 20,
      threshold: 0.3,
    });

    if (results.length === 0) {
      console.log("No related notes found. Consider:");
      console.log(`  • Broadening your topic`);
      console.log(`  • Using 'ctx search --tag topic/${sanitizedTopic}'`);
      return;
    }

    console.log(`📚 RELATED NOTES (${results.length} found):`);
    console.log("─".repeat(60));

    const indexed = toSemanticIndexedResults(results);
    console.log(formatIndexTable(indexed));
    saveSearchIndex({ results: indexed, type: "semantic", timestamp: new Date().toISOString() });

    console.log("\n🔬 DIVE WORKFLOW (7-Phase HITL):");
    console.log("─".repeat(60));
    console.log("  1. LOAD     - Review notes above, select relevant ones (ctx load 1,2,3)");
    console.log("  2. SURVEY   - Find existing knowledge to enhance");
    console.log("  3. EXTRACT  - Identify key concepts from sources");
    console.log("  4. CONNECT  - Map relationships, find patterns");
    console.log("  5. DRAFT    - Synthesize outline with citations");
    console.log("  6. CREATE   - Generate permanent note");
    console.log("  7. ARCHIVE  - Mark sources as cultivated");
    console.log("");
    console.log("💡 TOOLS:");
    console.log(`  ctx dive --fabric extract_wisdom <note>  # Process with Fabric`);
    console.log(`  /research <topic>                        # PAI research (results tagged with session)`);
    console.log(`  ctx dive done                            # End session`);
    console.log("");

  } catch (error) {
    console.error(`Error searching: ${error instanceof Error ? error.message : error}`);
  }
}

// ============================================================================
// Survey Handler (30,000 ft - Monthly review, 1 hour)
// ============================================================================

async function handleSurvey(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx survey - Monthly landscape review practice (🗺️)

USAGE:
  ctx survey                    Show vault health and growth metrics
  ctx survey --clusters         Show topic clusters
  ctx survey --orphans          Show orphan notes needing connection
  ctx survey --growth           Show knowledge growth trends

OPTIONS:
  --clusters             Show topic clusters and density
  --orphans              Show orphan notes (no links)
  --growth               Show growth metrics over time
  --recent <days>        Limit analysis to recent notes (default: 90)
  --health               Run full vault health analysis (slow on large vaults)

WHAT IT DOES:
  1. Reviews overall vault health (orphans, broken links, inbox age)
  2. Shows topic clusters and their density
  3. Identifies neglected areas
  4. Tracks knowledge growth patterns

EXAMPLES:
  ctx survey                    # Full landscape review
  ctx survey --clusters         # Focus on topic clusters
  ctx survey --orphans          # Find notes needing connection
`);
    return;
  }

  console.log("\n🗺️ SURVEY: Monthly Landscape Review");
  console.log("═".repeat(60));
  console.log("");

  // Full health report (optional - slow on large vaults)
  if (args.includes("--health") || args.includes("--orphans")) {
    console.log("📊 VAULT HEALTH:");
    console.log("─".repeat(40));

    try {
      const report = await generateHealthReport();

      const totalNotes = report.storageStats.fileCount;
      const orphanCount = report.orphans.length;
      const brokenLinkCount = report.brokenLinks.length;

      console.log(`  Total notes:     ${totalNotes}`);
      console.log(`  Orphan notes:    ${orphanCount} (${totalNotes > 0 ? ((orphanCount / totalNotes) * 100).toFixed(1) : 0}%)`);
      console.log(`  Broken links:    ${brokenLinkCount}`);
      console.log(`  Storage used:    ${formatBytes(report.storageStats.totalSize)}`);
      console.log("");

      // Show orphans if requested
      if (args.includes("--orphans") && report.orphans.length > 0) {
        console.log("🔗 ORPHAN NOTES (needing connections):");
        console.log("─".repeat(40));
        for (const orphan of report.orphans.slice(0, 10)) {
          console.log(`  • ${orphan.name}`);
        }
        if (orphanCount > 10) {
          console.log(`  ... and ${orphanCount - 10} more`);
        }
        console.log("");
      }
    } catch (error) {
      console.error(`Error generating health report: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Topic clusters
  if (args.includes("--clusters")) {
    console.log("🏷️ TOPIC CLUSTERS:");
    console.log("─".repeat(40));
    console.log("  (Use 'ctx stats coverage' for tag distribution)");
    console.log("");
  }

  // Practice tracking - always show
  console.log("📅 PRACTICE STATUS:");
  console.log("─".repeat(40));
  const practices = ["sweep", "weave", "dive", "survey", "compass", "mirror"] as const;
  for (const practice of practices) {
    const status = getPracticeStatus(practice);
    const emoji = status.isOverdue ? "⚠️" : "✓";
    const lastDone = status.lastCompleted
      ? new Date(status.lastCompleted).toLocaleDateString()
      : "never";
    console.log(`  ${emoji} ${practice.padEnd(8)} Last: ${lastDone}`);
  }
  console.log("");

  // Survey prompts
  console.log("🔭 LANDSCAPE QUESTIONS:");
  console.log("─".repeat(40));
  console.log("  1. What topics are growing? What's neglected?");
  console.log("  2. Are there orphan notes that should connect?");
  console.log("  3. What knowledge gaps do you see?");
  console.log("");

  // Suggest next actions
  console.log("💡 SUGGESTED ACTIONS:");
  console.log("─".repeat(40));
  console.log("  • Run 'ctx survey --health' for full vault analysis");
  console.log("  • Run 'ctx stats coverage' for topic distribution");
  console.log("  • Run 'ctx graph orphans' to find unconnected notes");
  console.log("");

  // Record survey completion
  recordPracticeCompletion("survey");
  console.log(getCompletionMessage("survey", { n: 0 }));
}

// ============================================================================
// Compass Handler (40,000 ft - Quarterly direction check, half-day)
// ============================================================================

async function handleCompass(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx compass - Quarterly direction check practice (🧭)

USAGE:
  ctx compass                   Check alignment with aspirations
  ctx compass --identity        Show identity signals from knowledge patterns
  ctx compass --bias            Check for knowledge biases

OPTIONS:
  --identity             Analyze knowledge patterns for identity signals
  --bias                 Check for topic imbalances and blind spots
  --quarter <Q1|Q2|Q3|Q4> Focus on specific quarter

WHAT IT DOES:
  1. Reviews topic distribution against aspirations
  2. Identifies emerging focus areas
  3. Surfaces potential biases in knowledge capture
  4. Checks alignment between actions and goals

STRATEGIC QUESTIONS:
  • "Are your current aspirations still true?"
  • "What identity patterns have emerged?"
  • "What are you NOT capturing that you should be?"

EXAMPLES:
  ctx compass                   # Full direction check
  ctx compass --identity        # Focus on identity signals
  ctx compass --bias            # Check for blind spots
`);
    return;
  }

  console.log("\n🧭 COMPASS: Quarterly Direction Check");
  console.log("═".repeat(60));
  console.log("");

  const config = getConfig();

  console.log("📊 KNOWLEDGE DISTRIBUTION (Last 90 days):");
  console.log("─".repeat(40));

  try {
    // Get tag distribution - listTags returns Record<string, number>
    const tagCounts = await listTags(true);

    // Convert to array and filter topic tags
    const topicTags = Object.entries(tagCounts)
      .filter(([name]) => name.startsWith("topic/"))
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    if (topicTags.length === 0) {
      console.log("  No topic/ tags found in vault");
    } else {
      const totalCount = Object.values(tagCounts).reduce((sum, c) => sum + c, 0);
      const maxCount = topicTags[0]?.count || 1;

      for (const tag of topicTags) {
        const bar = "█".repeat(Math.ceil((tag.count / maxCount) * 20));
        const pct = ((tag.count / totalCount) * 100).toFixed(0);
        console.log(`  ${tag.name.replace("topic/", "").padEnd(20)} ${bar} ${pct}%`);
      }
    }
  } catch (error) {
    console.log("  (Tag analysis unavailable)");
  }
  console.log("");

  // Identity signals
  if (args.includes("--identity")) {
    console.log("🪞 IDENTITY SIGNALS:");
    console.log("─".repeat(40));
    console.log("  Core focus:     Based on consistent capture patterns");
    console.log("  Emerging:       Topics growing rapidly");
    console.log("  Neglected:      Previously active, now dormant");
    console.log("");
    console.log("  (Full identity analysis requires more data)");
    console.log("");
  }

  // Bias check
  if (args.includes("--bias")) {
    console.log("⚠️ POTENTIAL BLIND SPOTS:");
    console.log("─".repeat(40));
    console.log("  • Review topics you aspire to but rarely capture");
    console.log("  • Check if work topics dominate personal growth areas");
    console.log("  • Consider what sources you're NOT consuming");
    console.log("");
  }

  console.log("🎯 COMPASS QUESTIONS:");
  console.log("─".repeat(40));
  console.log("  1. Does this distribution reflect your aspirations?");
  console.log("  2. What important topics are missing?");
  console.log("  3. Are you building the knowledge you'll need in 5 years?");
  console.log("");

  recordPracticeCompletion("compass");
  console.log(getCompletionMessage("compass", { n: 0 }));
}

// ============================================================================
// Mirror Handler (50,000 ft - Annual reflection, full day)
// ============================================================================

async function handleMirror(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ctx mirror - Annual reflection practice (🪞)

USAGE:
  ctx mirror                    Start annual reflection
  ctx mirror --year <YYYY>      Reflect on specific year
  ctx mirror --legacy           Focus on legacy and contribution

OPTIONS:
  --year <YYYY>          Focus on specific year (default: current)
  --legacy               Emphasize legacy and lasting contributions
  --stats                Include vault statistics (slow on large vaults)
  --export               Export reflection summary

WHAT IT DOES:
  1. Reviews entire year's knowledge journey
  2. Identifies transformation and growth
  3. Surfaces your evolving identity
  4. Examines legacy and contributions

REFLECTION QUESTIONS:
  • "Who was I becoming this year?"
  • "What knowledge fundamentally changed me?"
  • "What will I be grateful I captured?"
  • "What legacy am I building?"

EXAMPLES:
  ctx mirror                    # Full annual reflection
  ctx mirror --year 2024        # Reflect on 2024
  ctx mirror --legacy           # Focus on contributions
`);
    return;
  }

  const year = args.find(a => /^\d{4}$/.test(a)) || new Date().getFullYear().toString();

  console.log(`\n🪞 MIRROR: Annual Reflection (${year})`);
  console.log("═".repeat(60));
  console.log("");

  console.log("📅 YEAR IN REVIEW:");
  console.log("─".repeat(40));

  // Vault stats (optional - slow on large vaults)
  if (args.includes("--stats")) {
    try {
      const report = await generateHealthReport();
      console.log(`  Total knowledge base: ${report.storageStats.fileCount} notes`);
      console.log(`  Storage: ${formatBytes(report.storageStats.totalSize)}`);
    } catch (error) {
      console.log(`  (Unable to get vault stats: ${error instanceof Error ? error.message : error})`);
    }
  } else {
    console.log(`  Year: ${year}`);
    console.log(`  (Run with --stats for vault metrics)`);
  }
  console.log("");

  // Practice consistency - always show
  console.log("🌱 CULTIVATION CONSISTENCY:");
  console.log("─".repeat(40));
  const practices = ["sweep", "weave", "dive", "survey", "compass"] as const;
  for (const practice of practices) {
    const status = getPracticeStatus(practice);
    console.log(`  ${practice.padEnd(8)} Total: ${status.record.totalCount} sessions`);
  }
  console.log("");

  // Legacy focus
  if (args.includes("--legacy")) {
    console.log("🏛️ LEGACY & CONTRIBUTION:");
    console.log("─".repeat(40));
    console.log("  • What permanent notes capture your original thinking?");
    console.log("  • What synthesized frameworks did you create?");
    console.log("  • What knowledge would you want preserved?");
    console.log("");
  }

  console.log("🪞 REFLECTION PROMPTS:");
  console.log("─".repeat(40));
  console.log("  1. How has your thinking evolved this year?");
  console.log("  2. What knowledge changed how you see the world?");
  console.log("  3. What are you becoming through this practice?");
  console.log("  4. What would you tell yourself a year ago?");
  console.log("");

  console.log("💡 NEXT STEPS:");
  console.log("─".repeat(40));
  console.log("  • Create a 'Year in Review' synthesized note");
  console.log("  • Update your aspirations for next year");
  console.log("  • Archive completed projects");
  console.log("  • Set intentions for next year's knowledge journey");
  console.log("");

  recordPracticeCompletion("mirror");
  console.log(getCompletionMessage("mirror", { n: 0 }));
}

main();
