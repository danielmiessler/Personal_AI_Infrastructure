# mai-orchestration-framework

Execution engine for multi-agent task orchestration in the PAI methodology.

## Features

- **Orchestrator Engine**: Queue, execute, and monitor tasks
- **Agent Dispatcher**: Route tasks to appropriate agents
- **Batch Execution**: Run multiple tasks with parallelism control
- **Event System**: Monitor orchestration progress
- **State Persistence**: Survive context compaction

## Installation

```bash
bun add mai-orchestration-framework
```

## Usage

### Basic Task Execution

```typescript
import { Orchestrator, createFarmTask } from 'mai-orchestration-framework';

const orchestrator = new Orchestrator();

// Create and queue a task
const task = createFarmTask('implementation', 'Build authentication', 'Users can log in', {
  context: ['/src/auth.ts'],
  priority: 'high',
});

orchestrator.queueTask(task);

// Execute the task
const result = await orchestrator.executeTask(task.taskId);
console.log(result.status); // 'success' or 'failure'
```

### Batch Execution

```typescript
const tasks = [
  createFarmTask('test', 'Unit tests', 'All pass'),
  createFarmTask('test', 'Integration tests', 'All pass'),
  createFarmTask('review', 'Code review', 'Approved'),
];

// Queue all tasks
const taskIds = orchestrator.queueBatch(tasks);

// Execute with options
const results = await orchestrator.executeBatch(taskIds, {
  parallel: 3,      // Max concurrent tasks
  failFast: false,  // Continue on failure
  timeout: 60000,   // Overall timeout
});

if (isOverallSuccess(results)) {
  console.log('All tasks succeeded!');
}
```

### Event Monitoring

```typescript
import { LoggingEventHandler } from 'mai-orchestration-framework';

// Add logging handler
orchestrator.on(new LoggingEventHandler());

// Or custom handler
orchestrator.on({
  onEvent: (event) => {
    switch (event.type) {
      case 'task_started':
        console.log(`Task ${event.taskId} started by ${event.agentId}`);
        break;
      case 'task_completed':
        console.log(`Task ${event.result.taskId} completed: ${event.result.status}`);
        break;
      case 'batch_completed':
        console.log(`Batch done: ${event.results.summary}`);
        break;
    }
  },
});
```

### Agent Dispatcher

```typescript
import { AgentDispatcher } from 'mai-orchestration-framework';

const dispatcher = new AgentDispatcher('/tmp/outputs');

// Select best agent for task type
const agent = dispatcher.selectAgent('implementation');

// Get capacity info
const { total, used, available } = dispatcher.getTotalCapacity();

// Register custom agent
dispatcher.registerAgent({
  id: 'specialized',
  name: 'Specialized Agent',
  capabilities: ['review'],
  maxConcurrent: 5,
  currentLoad: 0,
});
```

### State Persistence

```typescript
// Save state before compaction
const state = orchestrator.getState();
// state can be serialized to CLAUDE.local.md

// After compaction, restore
const newOrchestrator = new Orchestrator();
newOrchestrator.restoreState(state);
```

## Relationship to kai-council-framework

```
kai-council-framework      →  DECISIONS (perspectives → synthesis)
mai-orchestration-framework →  EXECUTION (tasks → results)

Workflow:
1. Council decides what to build (kai-council-framework)
2. Orchestration farms out the work (mai-orchestration-framework)
3. Council reviews the results (kai-council-framework)
```

## Default Agents

| Agent | Capabilities | Max Concurrent |
|-------|-------------|----------------|
| general-purpose | All types | 5 |
| bash | implementation, test | 3 |
| explore | research, review | 5 |

## Batch Options

| Option | Description | Default |
|--------|-------------|---------|
| `parallel` | Max concurrent tasks | 3 |
| `failFast` | Stop on first failure | false |
| `timeout` | Overall timeout (ms) | none |

## Dependencies

- `mai-orchestration-core`: Core types
- `mai-project-system`: State persistence integration

## License

MIT
