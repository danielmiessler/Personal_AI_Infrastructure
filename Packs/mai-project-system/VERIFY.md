# Verification Checklist - mai-project-system

## Automated Verification

```bash
bun test && bun run typecheck
```

## Manual Verification

### 1. Transcript Parsing

```typescript
import { parseTranscript, getModifiedFiles } from 'mai-project-system';

const transcript = parseTranscript(`
{"type":"tool_use","tool":"Edit","params":{"file_path":"/test.ts"}}
{"type":"assistant","content":"I decided to use TypeScript."}
`);

console.log(transcript.toolCalls.length); // Should be 1
console.log(transcript.decisions.length); // Should be 1
console.log(getModifiedFiles(transcript)); // Should include /test.ts
```

### 2. Todo Extraction

```typescript
import { parseTranscript, extractTodoState, calculateTodoProgress } from 'mai-project-system';

const transcript = parseTranscript(`
{"type":"tool_use","tool":"TodoWrite","params":{"todos":[{"content":"Task 1","status":"completed","activeForm":"Done"},{"content":"Task 2","status":"pending","activeForm":"Todo"}]}}
`);

const todos = extractTodoState(transcript);
console.log(todos.length); // Should be 2
console.log(calculateTodoProgress(todos)); // Should be 50
```

### 3. Agent Extraction

```typescript
import { parseTranscript, extractAgentInfo } from 'mai-project-system';

const transcript = parseTranscript(`
{"type":"tool_use","tool":"Task","params":{"description":"Build project","subagent_type":"Bash"}}
`);

const agents = extractAgentInfo(transcript);
console.log(agents.length); // Should be 1
console.log(agents[0].subagentType); // Should be "Bash"
```

### 4. Local MD Writing

```typescript
import { writeLocalMd, readLocalMd } from 'mai-project-system';

writeLocalMd('/tmp/CLAUDE.local.md', {
  timestamp: new Date().toISOString(),
  sessionId: 'test-123',
  currentTask: 'Test task',
  currentStep: 'Testing',
  modifiedFiles: ['/src/index.ts'],
  recentDecisions: ['Use TypeScript'],
  agents: [],
  resumeInstructions: 'Continue testing',
});

console.log(readLocalMd('/tmp/CLAUDE.local.md')); // Should contain session info
```

### 5. PreCompact Hook

```bash
echo '{"session_id":"test","transcript_path":"/tmp/nonexistent.jsonl","cwd":"/tmp","trigger":"manual"}' | bun run src/hooks/pre-compact.ts
```

Expected output:
```json
{"status":"skipped","message":"No transcript found"}
```

## Expected Test Results

| Test Suite | Tests | Status |
|------------|-------|--------|
| transcript.test.ts | 10+ | PASS |
| todo-extractor.test.ts | 10+ | PASS |
| agent-extractor.test.ts | 6+ | PASS |
| local-md.test.ts | 8+ | PASS |

## Sign-off

- [ ] All tests pass
- [ ] Type check passes
- [ ] Hook executes without errors
- [ ] CLAUDE.local.md is generated correctly
