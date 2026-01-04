# Tier 3: Distributed Systems Verification

> Applies to microservices, message queues, multi-node systems, and any system with network communication

## When to Use

Apply this workflow when the system:
- Communicates over a network (HTTP, gRPC, WebSocket, TCP)
- Has multiple processes or services
- Uses message queues or event buses
- Requires coordination between nodes
- Handles partial failures (some nodes up, some down)

**Includes all Tier 1 + Tier 2 requirements plus network fault simulation.**

## Steps

### Step 1: Complete Tier 1 + Tier 2

First, apply all lower tier checks:
- **Tier 1:** Assertions, bounds, error handling, exhaustive input, deterministic seeds
- **Tier 2:** State transitions, invariants, time simulation, sequence testing

### Step 2: Network Fault Injection

Simulate all network failure modes:

```typescript
interface NetworkSimulator {
  // Latency injection
  setLatency(from: NodeId, to: NodeId, ms: number): void;
  setLatencyRange(from: NodeId, to: NodeId, minMs: number, maxMs: number): void;
  
  // Packet manipulation
  dropPackets(from: NodeId, to: NodeId, probability: number): void;
  reorderPackets(from: NodeId, to: NodeId, probability: number): void;
  duplicatePackets(from: NodeId, to: NodeId, probability: number): void;
  
  // Partitions
  partition(groupA: NodeId[], groupB: NodeId[]): void;
  heal(): void;
  
  // Asymmetric failures
  blockDirection(from: NodeId, to: NodeId): void; // A can't reach B, but B can reach A
}

describe('under network faults', () => {
  test('handles high latency', async () => {
    const network = new NetworkSimulator();
    const [nodeA, nodeB] = createCluster(2, { network });
    
    // Inject 500ms latency
    network.setLatency(nodeA.id, nodeB.id, 500);
    
    // System should still function (with higher latency)
    const start = Date.now();
    await nodeA.sendTo(nodeB.id, { type: 'ping' });
    const elapsed = Date.now() - start;
    
    expect(elapsed).toBeGreaterThanOrEqual(500);
  });
  
  test('handles packet loss', async () => {
    const network = new NetworkSimulator();
    const [nodeA, nodeB] = createCluster(2, { network });
    
    // 50% packet loss
    network.dropPackets(nodeA.id, nodeB.id, 0.5);
    
    // Should eventually succeed with retries
    const result = await nodeA.sendWithRetry(nodeB.id, { type: 'important' });
    expect(result.success).toBe(true);
  });
  
  test('survives network partition', async () => {
    const network = new NetworkSimulator();
    const nodes = createCluster(5, { network });
    
    // Partition: [0,1,2] vs [3,4]
    network.partition(
      [nodes[0].id, nodes[1].id, nodes[2].id],
      [nodes[3].id, nodes[4].id]
    );
    
    // Majority partition should continue operating
    await nodes[0].write('key', 'value');
    expect(await nodes[1].read('key')).toBe('value');
    
    // Minority partition should reject writes (if using quorum)
    await expect(nodes[3].write('key2', 'value2'))
      .rejects.toThrow(/quorum|partition/);
    
    // Heal partition
    network.heal();
    
    // All nodes should eventually converge
    await waitForConvergence(nodes);
    expect(await nodes[4].read('key')).toBe('value');
  });
});
```

### Step 3: Process Crash Simulation

Simulate nodes crashing and restarting:

```typescript
interface ProcessSimulator {
  crash(nodeId: NodeId): void;
  restart(nodeId: NodeId): Promise<void>;
  crashAndRestart(nodeId: NodeId, afterMs: number): Promise<void>;
}

describe('crash recovery', () => {
  test('recovers from single node crash', async () => {
    const processes = new ProcessSimulator();
    const nodes = createCluster(3, { processes });
    
    // Write data
    await nodes[0].write('key', 'value');
    await waitForReplication(nodes);
    
    // Crash node 0
    processes.crash(nodes[0].id);
    
    // Other nodes should still serve reads
    expect(await nodes[1].read('key')).toBe('value');
    expect(await nodes[2].read('key')).toBe('value');
    
    // Restart node 0
    await processes.restart(nodes[0].id);
    
    // Node 0 should recover state
    expect(await nodes[0].read('key')).toBe('value');
  });
  
  test('handles rapid crash/restart cycles', async () => {
    const seed = parseInt(process.env.TEST_SEED || '42');
    console.log(`Seed: ${seed}`);
    const rng = createSeededRandom(seed);
    
    const processes = new ProcessSimulator();
    const nodes = createCluster(5, { processes });
    
    // Random operations with random crashes
    for (let i = 0; i < 1000; i++) {
      const op = rng.choice(['write', 'read', 'crash', 'restart']);
      const nodeIdx = rng.nextInt(0, 5);
      
      try {
        switch (op) {
          case 'write':
            await nodes[nodeIdx].write(`key-${i}`, `value-${i}`);
            break;
          case 'read':
            await nodes[nodeIdx].read(`key-${rng.nextInt(0, i + 1)}`);
            break;
          case 'crash':
            processes.crash(nodes[nodeIdx].id);
            break;
          case 'restart':
            await processes.restart(nodes[nodeIdx].id);
            break;
        }
      } catch (e) {
        // Expected: operations fail during crashes
        // Unexpected: invariant violations
        if (e.message.includes('invariant')) throw e;
      }
      
      // Check global invariants
      await checkClusterInvariants(nodes);
    }
  });
});
```

### Step 4: Eventual Consistency Verification

For eventually consistent systems, verify convergence:

```typescript
async function waitForConvergence(
  nodes: Node[],
  timeoutMs = 30_000,
  checkIntervalMs = 100
): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeoutMs) {
    const states = await Promise.all(nodes.map(n => n.getState()));
    
    // Check if all states are equal
    const first = JSON.stringify(states[0]);
    const allEqual = states.every(s => JSON.stringify(s) === first);
    
    if (allEqual) {
      console.log(`Converged after ${Date.now() - start}ms`);
      return;
    }
    
    await sleep(checkIntervalMs);
  }
  
  throw new Error(`Failed to converge within ${timeoutMs}ms`);
}

describe('eventual consistency', () => {
  test('all replicas converge after partition heals', async () => {
    const network = new NetworkSimulator();
    const nodes = createCluster(3, { network });
    
    // Partition node 2
    network.partition([nodes[0].id, nodes[1].id], [nodes[2].id]);
    
    // Write to majority
    await nodes[0].write('key', 'value-from-majority');
    
    // Heal
    network.heal();
    
    // Should converge
    await waitForConvergence(nodes);
    
    // All nodes should have same value
    const values = await Promise.all(nodes.map(n => n.read('key')));
    expect(new Set(values).size).toBe(1);
  });
});
```

### Step 5: Ordering and Causality

Verify causal ordering is preserved:

```typescript
describe('causal ordering', () => {
  test('writes are seen in causal order', async () => {
    const nodes = createCluster(3);
    
    // Node 0 writes A
    await nodes[0].write('x', 'A');
    
    // Node 0 writes B (causally after A)
    await nodes[0].write('x', 'B');
    
    // Any node that sees B must have seen A first
    // (or see B directly, never see A after B)
    const history = await nodes[1].getWriteHistory('x');
    
    const indexA = history.indexOf('A');
    const indexB = history.indexOf('B');
    
    if (indexA !== -1 && indexB !== -1) {
      expect(indexA).toBeLessThan(indexB);
    }
  });
});
```

### Step 6: Fuzzing with Combined Faults

Combine all fault types with seeded randomness:

```typescript
describe('chaos testing', () => {
  test('survives combined faults', async () => {
    const seed = parseInt(process.env.TEST_SEED || '12345');
    console.log(`Chaos test seed: ${seed}`);
    const rng = createSeededRandom(seed);
    
    const network = new NetworkSimulator();
    const processes = new ProcessSimulator();
    const clock = new SimulatedClock();
    const nodes = createCluster(5, { network, processes, clock });
    
    const faults = [
      () => network.setLatency(rng.choice(nodeIds), rng.choice(nodeIds), rng.nextInt(1, 1000)),
      () => network.dropPackets(rng.choice(nodeIds), rng.choice(nodeIds), rng.next()),
      () => network.partition(rng.sample(nodeIds, 2), rng.sample(nodeIds, 3)),
      () => network.heal(),
      () => processes.crash(rng.choice(nodeIds)),
      () => processes.restart(rng.choice(nodeIds)),
      () => clock.advance(rng.nextInt(1, 10_000)),
    ];
    
    for (let i = 0; i < 10_000; i++) {
      // Random fault
      if (rng.next() < 0.1) {
        const fault = rng.choice(faults);
        await fault();
      }
      
      // Random operation
      const op = rng.choice(['read', 'write']);
      const node = rng.choice(nodes);
      
      try {
        if (op === 'write') {
          await node.write(`key-${rng.nextInt(0, 100)}`, `value-${i}`);
        } else {
          await node.read(`key-${rng.nextInt(0, 100)}`);
        }
      } catch (e) {
        // Expected failures during faults
      }
      
      // Invariants must ALWAYS hold
      await checkClusterInvariants(nodes);
    }
    
    // Final convergence
    network.heal();
    await Promise.all(nodeIds.map(id => processes.restart(id)));
    await waitForConvergence(nodes);
  });
});
```

## Checklist

Before marking distributed code as verified:

**Tier 1 + Tier 2 (all required):**
- [ ] All lower tier requirements met

**Tier 3 additions:**
- [ ] Latency injection tested
- [ ] Packet loss tested
- [ ] Packet reordering tested
- [ ] Network partition tested (split-brain)
- [ ] Asymmetric partition tested
- [ ] Single node crash recovery tested
- [ ] Multiple node crash recovery tested
- [ ] Rapid crash/restart cycles tested
- [ ] Eventual consistency verified (if applicable)
- [ ] Causal ordering verified (if applicable)
- [ ] Combined fault chaos testing
- [ ] All tests use deterministic seeds

## Common Issues

### "How do I inject network faults in real code?"

Use dependency injection:

```typescript
interface NetworkClient {
  send(to: string, message: Message): Promise<Response>;
}

// Production
class HttpClient implements NetworkClient { ... }

// Testing
class SimulatedClient implements NetworkClient {
  constructor(private simulator: NetworkSimulator) {}
}
```

### "Chaos tests are slow"

Use time compression and limit iterations:

```typescript
// Fast mode for CI
const iterations = process.env.CI ? 1_000 : 100_000;
```
