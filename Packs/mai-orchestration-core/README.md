# mai-orchestration-core

Core types for multi-agent task orchestration in the PAI methodology.

## Features

- **Task Farming**: Types for defining and managing distributed tasks
- **Agent Registry**: Track agent status across the orchestration lifecycle
- **Result Aggregation**: Combine results from multiple agents
- **Event System**: Monitor orchestration progress with events

## Installation

```bash
bun add mai-orchestration-core
```

## Usage

### Task Farming

```typescript
import {
  createFarmTask,
  createFarmResult,
  sortByPriority,
} from 'mai-orchestration-core';

// Create a task
const task = createFarmTask('implementation', 'Build authentication', 'Users can log in', {
  context: ['/src/auth.ts'],
  priority: 'high',
  timeout: 30000,
});

// Create a result
const result = createFarmResult(task.taskId, 'agent-1', 'success', 'Authentication built', {
  artifacts: ['/src/auth.ts', '/src/auth.test.ts'],
  duration: 15000,
});
```

### Agent Registry

```typescript
import {
  AgentRegistry,
  createAgentStatus,
  markAgentRunning,
  markAgentComplete,
} from 'mai-orchestration-core';

const registry = new AgentRegistry();

// Track an agent
let status = createAgentStatus('agent-1', 'task-1', '/tmp/output.txt');
registry.set('agent-1', status);

// Update status
status = markAgentRunning(status);
registry.set('agent-1', status);

// Get active agents
const active = registry.getActive();
```

### Result Aggregation

```typescript
import {
  ResultAggregator,
  aggregateResults,
  isOverallSuccess,
  formatResultsMarkdown,
} from 'mai-orchestration-core';

const aggregator = new ResultAggregator();
aggregator.add(result1);
aggregator.add(result2);

const results = aggregator.aggregate();

if (isOverallSuccess(results)) {
  console.log('All tasks succeeded!');
}

// Generate markdown report
const report = formatResultsMarkdown(results);
```

### Events

```typescript
import {
  OrchestrationEventEmitter,
  createTaskQueuedEvent,
  LoggingEventHandler,
} from 'mai-orchestration-core';

const emitter = new OrchestrationEventEmitter();

// Add logging handler
emitter.on(new LoggingEventHandler());

// Custom handler
emitter.on({
  onEvent: (event) => {
    if (event.type === 'task_completed') {
      console.log(`Task ${event.result.taskId} finished`);
    }
  },
});

// Emit events
emitter.emit(createTaskQueuedEvent(task));
```

## Task Types

| Type | Description |
|------|-------------|
| `implementation` | Write or modify code |
| `test` | Write or run tests |
| `review` | Review code or documents |
| `research` | Investigate or explore |

## Agent Status

| Status | Description |
|--------|-------------|
| `queued` | Task assigned, waiting to start |
| `running` | Agent actively working |
| `complete` | Task finished successfully |
| `failed` | Task failed |

## Event Types

| Event | Description |
|-------|-------------|
| `task_queued` | Task added to queue |
| `task_started` | Agent started task |
| `task_progress` | Progress update (0-100) |
| `task_completed` | Task finished |
| `task_failed` | Task failed |
| `batch_completed` | All tasks in batch done |

## Dependencies

None - this is a standalone types package.

## License

MIT
