# mai-project-system

System hooks and parsers for the PAI Project Management methodology. Provides transcript parsing, state extraction, and session continuity through the PreCompact hook.

## Features

- **Transcript Parser**: Parse Claude Code JSONL transcripts to extract tool calls, decisions, and messages
- **Todo Extractor**: Extract TodoWrite state from transcripts
- **Agent Extractor**: Track spawned agents (Task tool usage)
- **Local MD Writer**: Generate CLAUDE.local.md for session continuity
- **PreCompact Hook**: Automatically save session state before context compaction

## Installation

```bash
bun add mai-project-system
```

Or link locally:

```bash
bun link
```

## Usage

### Parsing Transcripts

```typescript
import { parseTranscript, getModifiedFiles, getToolUsageSummary } from 'mai-project-system';

const transcript = parseTranscript(jsonlContent);

// Get files modified during the session
const modified = getModifiedFiles(transcript);

// Get tool usage statistics
const usage = getToolUsageSummary(transcript);
```

### Extracting Todo State

```typescript
import {
  extractTodoState,
  getCurrentTask,
  calculateTodoProgress,
  formatTodosAsMarkdown
} from 'mai-project-system';

const todos = extractTodoState(transcript);
const current = getCurrentTask(todos);
const progress = calculateTodoProgress(todos);
const markdown = formatTodosAsMarkdown(todos);
```

### Extracting Agent Info

```typescript
import {
  extractAgentInfo,
  getRunningAgents,
  getAgentSummary
} from 'mai-project-system';

const agents = extractAgentInfo(transcript);
const running = getRunningAgents(agents);
const summary = getAgentSummary(agents);
```

### Writing CLAUDE.local.md

```typescript
import { writeLocalMd, buildLocalMdOptions } from 'mai-project-system';

const options = buildLocalMdOptions(
  sessionId,
  todos,
  modifiedFiles,
  decisions,
  agents
);

writeLocalMd('/path/to/CLAUDE.local.md', options);
```

## PreCompact Hook

The PreCompact hook automatically saves session state before context compaction.

### Registration

Add to your Claude Code settings:

```json
{
  "hooks": {
    "PreCompact": [
      {
        "command": "bun run /path/to/mai-project-system/src/hooks/pre-compact.ts"
      }
    ]
  }
}
```

### Hook Input

The hook receives JSON from stdin:

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/path/to/project",
  "trigger": "auto"
}
```

### Hook Output

The hook writes CLAUDE.local.md to the project's working directory with:
- Session ID and timestamp
- Current task and step
- Modified files
- Recent decisions
- Spawned agents
- Resume instructions

## Design Philosophy

All operations are **DETERMINISTIC** - no LLM calls. This ensures:
- Consistent output for the same input
- Fast execution (no API latency)
- Predictable behavior
- Testable code

## Dependencies

- `mai-project-core`: Templates for CLAUDE.local.md generation

## License

MIT
