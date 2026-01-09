# Verification Checklist - mai-orchestration-core

## Automated Verification

```bash
bun test && bun run typecheck
```

## Manual Verification

### 1. Task Creation

```typescript
import { createFarmTask, createFarmResult } from 'mai-orchestration-core';

const task = createFarmTask('implementation', 'Build feature', 'Feature works');
console.log(task.taskId.startsWith('task-')); // true

const result = createFarmResult(task.taskId, 'agent-1', 'success', 'Done');
console.log(result.status); // 'success'
```

### 2. Agent Registry

```typescript
import { AgentRegistry, createAgentStatus } from 'mai-orchestration-core';

const registry = new AgentRegistry();
registry.set('a1', createAgentStatus('a1', 't1', '/tmp/out'));
console.log(registry.size); // 1
console.log(registry.getActive().length); // 1
```

### 3. Result Aggregation

```typescript
import { aggregateResults, createFarmResult } from 'mai-orchestration-core';

const results = aggregateResults([
  createFarmResult('t1', 'a1', 'success', 'OK'),
  createFarmResult('t2', 'a2', 'failure', 'Error'),
]);
console.log(results.successCount); // 1
console.log(results.failureCount); // 1
```

### 4. Events

```typescript
import { OrchestrationEventEmitter, createTaskQueuedEvent, createFarmTask } from 'mai-orchestration-core';

const emitter = new OrchestrationEventEmitter();
let received = false;
emitter.on({ onEvent: () => { received = true; } });
emitter.emit(createTaskQueuedEvent(createFarmTask('test', 'Test', 'Pass')));
console.log(received); // true
```

## Expected Test Results

| Test Suite | Tests | Status |
|------------|-------|--------|
| types.test.ts | 20+ | PASS |

## Sign-off

- [ ] All tests pass
- [ ] Type check passes
- [ ] Task farming works
- [ ] Agent registry works
- [ ] Result aggregation works
- [ ] Events emit correctly
