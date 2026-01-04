# Deterministic Simulation Testing Patterns

> Implementation patterns for time compression, fault injection, and reproducible testing

## Core Concept

Deterministic Simulation Testing (DST) replaces real I/O with simulated I/O:

```
┌─────────────────────────────────────────────────────┐
│                   Your System                        │
├─────────────────────────────────────────────────────┤
│              Abstraction Layer                       │
│   (Clock, Network, Storage, Random)                  │
├─────────────────────────────────────────────────────┤
│  Production          │        Simulation            │
│  ───────────         │        ──────────            │
│  Real Clock          │        Simulated Clock       │
│  Real Network        │        Simulated Network     │
│  Real Disk           │        Simulated Disk        │
│  Math.random()       │        Seeded PRNG           │
└─────────────────────────────────────────────────────┘
```

**Key insight:** Same code runs in both environments. Only the abstraction layer changes.

## Time Simulation

### Simulated Clock

```typescript
interface Clock {
  now(): number;
  setTimeout(callback: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

class RealClock implements Clock {
  now(): number { return Date.now(); }
  setTimeout(cb: () => void, ms: number): number { return setTimeout(cb, ms) as any; }
  clearTimeout(id: number): void { clearTimeout(id); }
}

class SimulatedClock implements Clock {
  private currentTime = 0;
  private timers: Map<number, { time: number; callback: () => void }> = new Map();
  private nextTimerId = 1;

  now(): number {
    return this.currentTime;
  }

  setTimeout(callback: () => void, ms: number): number {
    const id = this.nextTimerId++;
    this.timers.set(id, { time: this.currentTime + ms, callback });
    return id;
  }

  clearTimeout(id: number): void {
    this.timers.delete(id);
  }

  // Advance time and fire ready timers
  advance(ms: number): void {
    const targetTime = this.currentTime + ms;
    
    while (this.currentTime < targetTime) {
      // Find next timer
      let nextTimer: { id: number; timer: { time: number; callback: () => void } } | null = null;
      
      for (const [id, timer] of this.timers) {
        if (timer.time <= targetTime) {
          if (!nextTimer || timer.time < nextTimer.timer.time) {
            nextTimer = { id, timer };
          }
        }
      }
      
      if (nextTimer && nextTimer.timer.time <= targetTime) {
        this.currentTime = nextTimer.timer.time;
        this.timers.delete(nextTimer.id);
        nextTimer.timer.callback();
      } else {
        this.currentTime = targetTime;
      }
    }
  }

  // Advance to next timer (useful for testing)
  advanceToNextTimer(): boolean {
    let earliest: number | null = null;
    
    for (const timer of this.timers.values()) {
      if (earliest === null || timer.time < earliest) {
        earliest = timer.time;
      }
    }
    
    if (earliest !== null) {
      this.advance(earliest - this.currentTime);
      return true;
    }
    return false;
  }
}
```

### Time Compression

```typescript
// Compress 1 year of simulated time into seconds of real time
async function runTimeCompressedSimulation(
  system: System,
  clock: SimulatedClock,
  simulatedDurationMs: number,
  stepMs = 1000
): Promise<void> {
  let simulated = 0;
  
  while (simulated < simulatedDurationMs) {
    // Advance simulated clock
    clock.advance(stepMs);
    simulated += stepMs;
    
    // Let system process
    await system.tick();
    
    // Check invariants
    system.checkInvariants();
    
    // Progress reporting
    if (simulated % (24 * 60 * 60 * 1000) === 0) {
      console.log(`Simulated ${simulated / (24 * 60 * 60 * 1000)} days`);
    }
  }
}

// Usage: simulate 1 year
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
await runTimeCompressedSimulation(system, clock, ONE_YEAR_MS);
```

## Seeded Randomness

### Deterministic PRNG

```typescript
// Mulberry32 - simple, fast, deterministic
function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

class SeededRandom {
  private rng: () => number;
  
  constructor(seed: number) {
    this.rng = mulberry32(seed);
  }
  
  // [0, 1)
  next(): number {
    return this.rng();
  }
  
  // [min, max)
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }
  
  // Random element from array
  choice<T>(arr: T[]): T {
    return arr[this.nextInt(0, arr.length)];
  }
  
  // Random sample of n elements
  sample<T>(arr: T[], n: number): T[] {
    const copy = [...arr];
    const result: T[] = [];
    for (let i = 0; i < n && copy.length > 0; i++) {
      const idx = this.nextInt(0, copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  }
  
  // Shuffle array in place
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  
  // Boolean with probability p
  chance(p: number): boolean {
    return this.next() < p;
  }
  
  // Random string
  nextString(length: number, charset = 'abcdefghijklmnopqrstuvwxyz0123456789'): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset[this.nextInt(0, charset.length)];
    }
    return result;
  }
}

// Usage
const seed = parseInt(process.env.TEST_SEED || String(Date.now()));
console.log(`Seed: ${seed}`);
const rng = new SeededRandom(seed);
```

## Network Simulation

### Network Simulator

```typescript
type NodeId = string;
type Message = { from: NodeId; to: NodeId; payload: unknown };

interface NetworkConfig {
  latencyMs?: number;
  latencyJitterMs?: number;
  dropRate?: number;
  reorderRate?: number;
  duplicateRate?: number;
}

class NetworkSimulator {
  private configs: Map<string, NetworkConfig> = new Map();
  private partitions: Set<string>[] = [];
  private inFlight: { message: Message; deliverAt: number }[] = [];
  
  constructor(private clock: SimulatedClock, private rng: SeededRandom) {}
  
  private getKey(from: NodeId, to: NodeId): string {
    return `${from}->${to}`;
  }
  
  // Configure link between nodes
  configure(from: NodeId, to: NodeId, config: NetworkConfig): void {
    this.configs.set(this.getKey(from, to), config);
  }
  
  // Check if nodes can communicate
  private canCommunicate(from: NodeId, to: NodeId): boolean {
    for (const partition of this.partitions) {
      const fromIn = partition.has(from);
      const toIn = partition.has(to);
      if (fromIn !== toIn) return false; // Different partitions
    }
    return true;
  }
  
  // Create network partition
  partition(groupA: NodeId[], groupB: NodeId[]): void {
    this.partitions.push(new Set(groupA));
    this.partitions.push(new Set(groupB));
  }
  
  // Heal all partitions
  heal(): void {
    this.partitions = [];
  }
  
  // Send message
  send(message: Message): void {
    if (!this.canCommunicate(message.from, message.to)) {
      return; // Dropped due to partition
    }
    
    const config = this.configs.get(this.getKey(message.from, message.to)) || {};
    
    // Drop?
    if (config.dropRate && this.rng.chance(config.dropRate)) {
      return;
    }
    
    // Calculate delivery time
    const baseLatency = config.latencyMs || 1;
    const jitter = config.latencyJitterMs 
      ? this.rng.nextInt(0, config.latencyJitterMs) 
      : 0;
    const deliverAt = this.clock.now() + baseLatency + jitter;
    
    // Add to in-flight
    this.inFlight.push({ message, deliverAt });
    
    // Duplicate?
    if (config.duplicateRate && this.rng.chance(config.duplicateRate)) {
      this.inFlight.push({ 
        message: { ...message }, 
        deliverAt: deliverAt + this.rng.nextInt(1, 100) 
      });
    }
  }
  
  // Get messages ready for delivery
  receive(nodeId: NodeId): Message[] {
    const now = this.clock.now();
    const ready: Message[] = [];
    
    this.inFlight = this.inFlight.filter(({ message, deliverAt }) => {
      if (message.to === nodeId && deliverAt <= now) {
        ready.push(message);
        return false;
      }
      return true;
    });
    
    // Reorder?
    const config = this.configs.get(`*->${nodeId}`);
    if (config?.reorderRate) {
      this.rng.shuffle(ready);
    }
    
    return ready;
  }
}
```

## Storage Simulation

### Disk Simulator

```typescript
interface StorageConfig {
  readLatencyMs?: number;
  writeLatencyMs?: number;
  readErrorRate?: number;
  writeErrorRate?: number;
  corruptionRate?: number;
  partialWriteRate?: number;
}

class StorageSimulator {
  private data: Map<string, Buffer> = new Map();
  private configs: Map<string, StorageConfig> = new Map();
  private unsynced: Set<string> = new Set();
  
  constructor(private clock: SimulatedClock, private rng: SeededRandom) {}
  
  configure(path: string, config: StorageConfig): void {
    this.configs.set(path, config);
  }
  
  async read(path: string): Promise<Buffer> {
    const config = this.configs.get(path) || {};
    
    // Latency
    if (config.readLatencyMs) {
      await this.delay(config.readLatencyMs);
    }
    
    // Error?
    if (config.readErrorRate && this.rng.chance(config.readErrorRate)) {
      throw new Error('Simulated read error');
    }
    
    const data = this.data.get(path);
    if (!data) {
      throw new Error('File not found');
    }
    
    // Corruption?
    if (config.corruptionRate && this.rng.chance(config.corruptionRate)) {
      const corrupted = Buffer.from(data);
      const pos = this.rng.nextInt(0, corrupted.length);
      corrupted[pos] ^= 0xFF; // Flip bits
      return corrupted;
    }
    
    return Buffer.from(data); // Return copy
  }
  
  async write(path: string, data: Buffer): Promise<void> {
    const config = this.configs.get(path) || {};
    
    // Latency
    if (config.writeLatencyMs) {
      await this.delay(config.writeLatencyMs);
    }
    
    // Error?
    if (config.writeErrorRate && this.rng.chance(config.writeErrorRate)) {
      throw new Error('Simulated write error');
    }
    
    // Partial write (torn write)?
    if (config.partialWriteRate && this.rng.chance(config.partialWriteRate)) {
      const partial = data.slice(0, this.rng.nextInt(1, data.length));
      this.data.set(path, partial);
      this.unsynced.add(path);
      throw new Error('Simulated partial write');
    }
    
    this.data.set(path, Buffer.from(data));
    this.unsynced.add(path);
  }
  
  async sync(path: string): Promise<void> {
    this.unsynced.delete(path);
  }
  
  async syncAll(): Promise<void> {
    this.unsynced.clear();
  }
  
  // Simulate power loss - lose all unsynced data
  simulatePowerLoss(): void {
    for (const path of this.unsynced) {
      // Revert to last synced state or remove
      this.data.delete(path);
    }
    this.unsynced.clear();
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      this.clock.setTimeout(resolve, ms);
    });
  }
}
```

## Process Simulation

### Crash/Restart Simulator

```typescript
interface Process {
  id: string;
  isRunning(): boolean;
  start(): Promise<void>;
  stop(): void;
  getState(): unknown;
  restoreState(state: unknown): Promise<void>;
}

class ProcessSimulator {
  private processes: Map<string, Process> = new Map();
  private savedStates: Map<string, unknown> = new Map();
  
  register(process: Process): void {
    this.processes.set(process.id, process);
  }
  
  crash(processId: string): void {
    const process = this.processes.get(processId);
    if (process?.isRunning()) {
      // Save state before crash (simulates what's on disk)
      this.savedStates.set(processId, process.getState());
      process.stop();
    }
  }
  
  async restart(processId: string): Promise<void> {
    const process = this.processes.get(processId);
    if (process && !process.isRunning()) {
      const savedState = this.savedStates.get(processId);
      if (savedState) {
        await process.restoreState(savedState);
      }
      await process.start();
    }
  }
  
  async crashAndRestart(processId: string, delayMs: number, clock: SimulatedClock): Promise<void> {
    this.crash(processId);
    clock.advance(delayMs);
    await this.restart(processId);
  }
}
```

## Combined Simulation Harness

### Full VOPR-Style Simulator

```typescript
interface SimulationConfig {
  seed: number;
  nodes: number;
  ticks: number;
  faultProbability: number;
}

class Simulator {
  private rng: SeededRandom;
  private clock: SimulatedClock;
  private network: NetworkSimulator;
  private storage: StorageSimulator;
  private processes: ProcessSimulator;
  private nodes: Node[] = [];
  private history: Operation[] = [];

  constructor(private config: SimulationConfig) {
    console.log(`=== Simulation Seed: ${config.seed} ===`);
    this.rng = new SeededRandom(config.seed);
    this.clock = new SimulatedClock();
    this.network = new NetworkSimulator(this.clock, this.rng);
    this.storage = new StorageSimulator(this.clock, this.rng);
    this.processes = new ProcessSimulator();
  }

  async run(): Promise<SimulationResult> {
    // Initialize nodes
    for (let i = 0; i < this.config.nodes; i++) {
      const node = new Node({
        id: `node-${i}`,
        clock: this.clock,
        network: this.network,
        storage: this.storage,
      });
      this.nodes.push(node);
      this.processes.register(node);
      await node.start();
    }

    // Main simulation loop
    for (let tick = 0; tick < this.config.ticks; tick++) {
      // Maybe inject fault
      if (this.rng.chance(this.config.faultProbability)) {
        await this.injectRandomFault();
      }

      // Random operation
      await this.performRandomOperation();

      // Advance time
      this.clock.advance(this.rng.nextInt(1, 100));

      // Check invariants periodically
      if (tick % 1000 === 0) {
        this.checkInvariants();
      }
    }

    // Final verification
    await this.finalVerification();

    return {
      seed: this.config.seed,
      ticks: this.config.ticks,
      operations: this.history.length,
      simulatedTimeMs: this.clock.now(),
    };
  }

  private async injectRandomFault(): Promise<void> {
    const faults = [
      () => this.network.partition(
        this.rng.sample(this.nodes.map(n => n.id), 2),
        this.rng.sample(this.nodes.map(n => n.id), 3)
      ),
      () => this.network.heal(),
      () => this.processes.crash(this.rng.choice(this.nodes).id),
      () => this.processes.restart(this.rng.choice(this.nodes).id),
      () => this.storage.simulatePowerLoss(),
      () => this.network.configure(
        this.rng.choice(this.nodes).id,
        this.rng.choice(this.nodes).id,
        { dropRate: this.rng.next() * 0.5 }
      ),
    ];

    const fault = this.rng.choice(faults);
    try {
      await fault();
    } catch (e) {
      // Some faults may fail (e.g., restart already-running)
    }
  }

  private async performRandomOperation(): Promise<void> {
    const runningNodes = this.nodes.filter(n => n.isRunning());
    if (runningNodes.length === 0) return;

    const node = this.rng.choice(runningNodes);
    const op = this.rng.choice(['read', 'write']);
    const key = `key-${this.rng.nextInt(0, 100)}`;

    const start = this.clock.now();
    try {
      if (op === 'write') {
        const value = `v-${this.clock.now()}`;
        await node.write(key, value);
        this.history.push({ type: 'write', key, value, start, end: this.clock.now(), ok: true });
      } else {
        const value = await node.read(key);
        this.history.push({ type: 'read', key, value, start, end: this.clock.now(), ok: true });
      }
    } catch (e) {
      this.history.push({ type: op, key, start, end: this.clock.now(), ok: false });
    }
  }

  private checkInvariants(): void {
    for (const node of this.nodes) {
      if (node.isRunning()) {
        node.checkInvariants();
      }
    }
  }

  private async finalVerification(): Promise<void> {
    // Heal all faults
    this.network.heal();
    this.storage.syncAll();
    
    // Restart all nodes
    for (const node of this.nodes) {
      if (!node.isRunning()) {
        await this.processes.restart(node.id);
      }
    }

    // Wait for convergence
    // ... (implement based on system semantics)

    // Check linearizability of history
    // ... (implement checker)
  }
}
```

## Best Practices

### 1. Design for Testability

```typescript
// BAD: Hard-coded dependencies
class Service {
  async process() {
    const now = Date.now();
    const data = await fetch(url);
    await fs.writeFile(path, data);
  }
}

// GOOD: Injectable dependencies
class Service {
  constructor(
    private clock: Clock,
    private http: HttpClient,
    private storage: Storage
  ) {}
  
  async process() {
    const now = this.clock.now();
    const data = await this.http.get(url);
    await this.storage.write(path, data);
  }
}
```

### 2. Always Print Seeds

```typescript
test('fuzzing', () => {
  const seed = getSeed();
  console.log(`Seed: ${seed}`); // ALWAYS
  
  try {
    runTest(seed);
  } catch (e) {
    console.error(`FAILED with seed: ${seed}`);
    throw e;
  }
});
```

### 3. Make Failures Reproducible

```typescript
// Run with: TEST_SEED=12345 npm test
const seed = parseInt(process.env.TEST_SEED || String(Date.now()));
```

### 4. Assertions in Simulation

Check invariants frequently during simulation:

```typescript
for (let tick = 0; tick < maxTicks; tick++) {
  doStuff();
  
  // Check every N ticks
  if (tick % 100 === 0) {
    checkAllInvariants();
  }
}
```
