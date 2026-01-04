# Tier 4: Storage Systems Verification

> Applies to databases, file systems, persistent storage, and any system where data durability is critical

## When to Use

Apply this workflow when the system:
- Persists data to disk or durable storage
- Implements transactions or ACID guarantees
- Replicates data for durability
- Must survive power loss or crashes
- Claims linearizability or serializability

**Includes all Tier 1 + Tier 2 + Tier 3 requirements plus disk fault simulation.**

## Steps

### Step 1: Complete Lower Tiers

First, apply all lower tier checks:
- **Tier 1:** Assertions, bounds, error handling, exhaustive input, deterministic seeds
- **Tier 2:** State transitions, invariants, time simulation, sequence testing
- **Tier 3:** Network faults, crash simulation, convergence testing

### Step 2: Disk Fault Injection

Simulate storage failure modes:

```typescript
interface StorageSimulator {
  // Read faults
  injectReadError(path: string, probability: number): void;
  injectReadLatency(path: string, ms: number): void;
  injectReadCorruption(path: string, probability: number): void;
  
  // Write faults
  injectWriteError(path: string, probability: number): void;
  injectWriteLatency(path: string, ms: number): void;
  injectPartialWrite(path: string, probability: number): void; // Torn writes
  
  // Sync faults
  injectFsyncFailure(probability: number): void;
  
  // Sector faults
  failSector(path: string, offset: number, size: number): void;
  
  // Power loss simulation
  simulatePowerLoss(): void; // Lose all unsynced writes
}

describe('storage faults', () => {
  test('handles read errors', async () => {
    const storage = new StorageSimulator();
    const db = new Database({ storage });
    
    // Write data
    await db.put('key', 'value');
    await db.sync();
    
    // Inject read error
    storage.injectReadError(db.dataPath, 1.0);
    
    // Should fail gracefully, not corrupt
    await expect(db.get('key')).rejects.toThrow(/read error/);
    
    // Clear fault
    storage.injectReadError(db.dataPath, 0);
    
    // Should recover
    expect(await db.get('key')).toBe('value');
  });
  
  test('handles torn writes', async () => {
    const storage = new StorageSimulator();
    const db = new Database({ storage });
    
    await db.put('key', 'original');
    await db.sync();
    
    // Inject partial write (simulates crash mid-write)
    storage.injectPartialWrite(db.dataPath, 1.0);
    
    try {
      await db.put('key', 'new-value-that-is-longer');
    } catch (e) {
      // Expected: write fails
    }
    
    // Simulate restart
    const recovered = new Database({ storage, path: db.path });
    
    // Must recover to consistent state (original OR new, never corrupted)
    const value = await recovered.get('key');
    expect(['original', 'new-value-that-is-longer']).toContain(value);
  });
  
  test('survives power loss', async () => {
    const storage = new StorageSimulator();
    const db = new Database({ storage });
    
    // Committed transaction
    await db.put('committed', 'yes');
    await db.sync();
    
    // Uncommitted transaction
    await db.put('uncommitted', 'maybe');
    // No sync!
    
    // Power loss
    storage.simulatePowerLoss();
    
    // Recover
    const recovered = new Database({ storage, path: db.path });
    
    // Committed data must survive
    expect(await recovered.get('committed')).toBe('yes');
    
    // Uncommitted data may or may not exist, but must be consistent
    const uncommitted = await recovered.get('uncommitted');
    expect([undefined, 'maybe']).toContain(uncommitted);
  });
});
```

### Step 3: Bit Rot and Corruption Detection

Verify checksums detect corruption:

```typescript
describe('corruption detection', () => {
  test('detects bit rot', async () => {
    const storage = new StorageSimulator();
    const db = new Database({ storage });
    
    await db.put('key', 'value');
    await db.sync();
    
    // Corrupt a single byte
    storage.injectReadCorruption(db.dataPath, 1.0);
    
    // Should detect via checksum
    await expect(db.get('key')).rejects.toThrow(/checksum|corrupt/);
  });
  
  test('paired assertions: validate at write AND read', async () => {
    const storage = new StorageSimulator();
    const db = new Database({ storage });
    
    const data = { key: 'value', nested: { array: [1, 2, 3] } };
    
    // Write path: compute checksum
    await db.put('complex', data);
    
    // Read path: verify checksum
    const retrieved = await db.get('complex');
    expect(retrieved).toEqual(data);
    
    // Verify checksum was actually checked (not just returned)
    expect(db.stats.checksumVerifications).toBeGreaterThan(0);
  });
});
```

### Step 4: Write-Ahead Log (WAL) Testing

If using a WAL, verify recovery:

```typescript
describe('WAL recovery', () => {
  test('replays WAL after crash', async () => {
    const storage = new StorageSimulator();
    const db = new Database({ storage, walEnabled: true });
    
    // Write to WAL
    await db.put('key1', 'value1');
    await db.put('key2', 'value2');
    await db.put('key3', 'value3');
    // WAL written but not checkpointed
    
    // Simulate crash
    storage.simulatePowerLoss();
    
    // Recover
    const recovered = new Database({ storage, path: db.path, walEnabled: true });
    
    // WAL should be replayed
    expect(await recovered.get('key1')).toBe('value1');
    expect(await recovered.get('key2')).toBe('value2');
    expect(await recovered.get('key3')).toBe('value3');
  });
  
  test('WAL is idempotent', async () => {
    const storage = new StorageSimulator();
    const db = new Database({ storage, walEnabled: true });
    
    await db.put('counter', 1);
    
    // Crash and recover multiple times
    for (let i = 0; i < 5; i++) {
      storage.simulatePowerLoss();
      db = new Database({ storage, path: db.path, walEnabled: true });
    }
    
    // Counter should still be 1, not 5
    expect(await db.get('counter')).toBe(1);
  });
});
```

### Step 5: Linearizability Testing

Verify linearizability using a history checker:

```typescript
import { LinearizabilityChecker } from './linearizability';

describe('linearizability', () => {
  test('operations are linearizable', async () => {
    const seed = parseInt(process.env.TEST_SEED || '42');
    console.log(`Linearizability test seed: ${seed}`);
    const rng = createSeededRandom(seed);
    
    const db = new Database();
    const history: Operation[] = [];
    
    // Concurrent operations
    const clients = Array.from({ length: 10 }, (_, i) => ({
      id: `client-${i}`,
      operations: [] as Operation[],
    }));
    
    await Promise.all(clients.map(async (client) => {
      for (let i = 0; i < 100; i++) {
        const key = `key-${rng.nextInt(0, 10)}`;
        const op = rng.choice(['read', 'write']);
        
        const start = Date.now();
        let result: any;
        
        if (op === 'write') {
          const value = `${client.id}-${i}`;
          await db.put(key, value);
          result = value;
        } else {
          result = await db.get(key);
        }
        
        const end = Date.now();
        
        history.push({
          client: client.id,
          type: op,
          key,
          value: result,
          start,
          end,
        });
      }
    }));
    
    // Check linearizability
    const checker = new LinearizabilityChecker();
    const isLinearizable = checker.check(history);
    
    if (!isLinearizable) {
      console.log('Non-linearizable history:', checker.getViolation());
    }
    
    expect(isLinearizable).toBe(true);
  });
});
```

### Step 6: VOPR-Style Full Simulation

Combine all faults in a deterministic simulation:

```typescript
describe('full simulation (VOPR-style)', () => {
  test('survives all fault combinations', async () => {
    const seed = parseInt(process.env.TEST_SEED || '12345');
    console.log(`=== VOPR Simulation Seed: ${seed} ===`);
    const rng = createSeededRandom(seed);
    
    const network = new NetworkSimulator();
    const storage = new StorageSimulator();
    const processes = new ProcessSimulator();
    const clock = new SimulatedClock();
    
    const nodes = createCluster(5, { network, storage, processes, clock });
    const nodeIds = nodes.map(n => n.id);
    
    const faults = [
      // Network faults
      () => network.setLatency(rng.choice(nodeIds), rng.choice(nodeIds), rng.nextInt(1, 500)),
      () => network.dropPackets(rng.choice(nodeIds), rng.choice(nodeIds), rng.next() * 0.5),
      () => network.partition(rng.sample(nodeIds, 2), rng.sample(nodeIds, 3)),
      () => network.heal(),
      
      // Process faults
      () => processes.crash(rng.choice(nodeIds)),
      () => processes.restart(rng.choice(nodeIds)),
      
      // Storage faults
      () => storage.injectReadLatency(rng.choice(nodeIds), rng.nextInt(1, 100)),
      () => storage.injectWriteLatency(rng.choice(nodeIds), rng.nextInt(1, 100)),
      () => storage.injectReadError(rng.choice(nodeIds), rng.next() * 0.1),
      () => storage.injectPartialWrite(rng.choice(nodeIds), rng.next() * 0.05),
      () => storage.simulatePowerLoss(),
      
      // Time advancement
      () => clock.advance(rng.nextInt(1, 10_000)),
    ];
    
    const history: Operation[] = [];
    
    for (let tick = 0; tick < 100_000; tick++) {
      // Inject faults (10% chance per tick)
      if (rng.next() < 0.1) {
        const fault = rng.choice(faults);
        try {
          await fault();
        } catch (e) {
          // Some faults may fail (e.g., restart already-running node)
        }
      }
      
      // Random operation
      const node = rng.choice(nodes.filter(n => n.isRunning()));
      if (node) {
        const op = rng.choice(['read', 'write']);
        const key = `key-${rng.nextInt(0, 100)}`;
        
        const start = clock.now();
        try {
          if (op === 'write') {
            const value = `v-${tick}`;
            await node.write(key, value);
            history.push({ type: 'write', key, value, start, end: clock.now(), ok: true });
          } else {
            const value = await node.read(key);
            history.push({ type: 'read', key, value, start, end: clock.now(), ok: true });
          }
        } catch (e) {
          history.push({ type: op, key, start, end: clock.now(), ok: false, error: e.message });
        }
      }
      
      // Check invariants every 1000 ticks
      if (tick % 1000 === 0) {
        await checkClusterInvariants(nodes);
      }
      
      // Time compression: advance clock
      clock.advance(rng.nextInt(1, 100));
    }
    
    // Final recovery
    network.heal();
    storage.clearAllFaults();
    await Promise.all(nodeIds.map(id => processes.restart(id)));
    
    // Wait for convergence
    await waitForConvergence(nodes, 60_000);
    
    // Verify linearizability
    const checker = new LinearizabilityChecker();
    const linearizable = checker.check(history.filter(op => op.ok));
    
    if (!linearizable) {
      console.log('LINEARIZABILITY VIOLATION DETECTED');
      console.log('Seed:', seed);
      console.log('Violation:', checker.getViolation());
      throw new Error('Linearizability violated');
    }
    
    console.log(`=== VOPR Simulation Complete ===`);
    console.log(`Ticks: 100,000`);
    console.log(`Operations: ${history.length}`);
    console.log(`Simulated time: ${clock.now() / 1000 / 60 / 60} hours`);
  });
});
```

## Checklist

Before marking storage code as verified:

**All lower tiers (required):**
- [ ] Tier 1 + Tier 2 + Tier 3 requirements met

**Tier 4 additions:**
- [ ] Read error handling tested
- [ ] Write error handling tested
- [ ] Partial/torn write recovery tested
- [ ] Power loss recovery tested
- [ ] Bit rot / corruption detection tested
- [ ] Checksums validated at write AND read
- [ ] WAL replay tested (if applicable)
- [ ] WAL idempotency verified
- [ ] Linearizability verified
- [ ] Full VOPR-style simulation passing
- [ ] All tests use deterministic seeds
- [ ] Tests run with time compression

## Time Compression Targets

| Real Time | Simulated Time | Use Case |
|-----------|----------------|----------|
| 1 second | 1 hour | Quick sanity check |
| 1 minute | 1 month | CI pipeline |
| 1 hour | 2 years | Nightly deep test |
| 24 hours | 50 years | Release validation |

## Common Issues

### "How do I simulate disk faults?"

Inject at the file system layer:

```typescript
class SimulatedFileSystem implements FileSystem {
  private faults: Map<string, FaultConfig> = new Map();
  
  async read(path: string, offset: number, length: number): Promise<Buffer> {
    const fault = this.faults.get(path);
    if (fault?.readError && Math.random() < fault.readError) {
      throw new Error('Simulated read error');
    }
    // ... actual read
  }
}
```

### "Linearizability checking is expensive"

Use sampling:

```typescript
// Check every Nth operation in long simulations
if (tick % 10_000 === 0) {
  checkLinearizability(history.slice(-10_000));
}
```
