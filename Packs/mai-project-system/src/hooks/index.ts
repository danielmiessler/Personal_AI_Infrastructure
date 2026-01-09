/**
 * Hook exports for mai-project-system
 *
 * Note: The pre-compact hook is an executable script, not a module export.
 * It reads from stdin and writes to stdout/files.
 *
 * To use the hook, register it in Claude Code settings:
 *
 * ```json
 * {
 *   "hooks": {
 *     "PreCompact": [
 *       {
 *         "command": "bun run /path/to/mai-project-system/src/hooks/pre-compact.ts"
 *       }
 *     ]
 *   }
 * }
 * ```
 */

// Re-export parsers and writers for programmatic use
export * from '../parsers/index.ts';
export * from '../writers/index.ts';
