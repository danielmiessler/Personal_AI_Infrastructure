/**
 * mai-project-system
 *
 * System hooks and parsers for the PAI Project Management methodology.
 * Provides transcript parsing, state extraction, and session continuity.
 *
 * @packageDocumentation
 */

// Parser exports
export type {
  ToolCall,
  ParsedTranscript,
  TodoItem,
  SpawnedAgent,
} from './parsers/index.ts';

export {
  parseTranscript,
  getModifiedFiles,
  getReadFiles,
  getToolUsageSummary,
  extractTodoState,
  getCurrentTask,
  getPendingTasks,
  getCompletedTasks,
  calculateTodoProgress,
  formatTodosAsMarkdown,
  extractAgentInfo,
  getRunningAgents,
  getCompletedAgents,
  formatAgentsAsMarkdown,
  getAgentSummary,
} from './parsers/index.ts';

// Writer exports
export type {
  LocalMdOptions,
} from './writers/index.ts';

export {
  writeLocalMd,
  readLocalMd,
  localMdExists,
  generateResumeInstructions,
  buildLocalMdOptions,
} from './writers/index.ts';
