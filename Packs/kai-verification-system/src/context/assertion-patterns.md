# Assertion Patterns by Language

> Ready-to-use assertion templates for common scenarios

## TypeScript / JavaScript

### Basic Assertion Function

```typescript
function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// With context
function assertWithContext(
  condition: boolean,
  message: string,
  context: Record<string, unknown>
): asserts condition {
  if (!condition) {
    const contextStr = Object.entries(context)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(', ');
    throw new Error(`Assertion failed: ${message} [${contextStr}]`);
  }
}
```

### Pre-conditions

```typescript
function divide(a: number, b: number): number {
  // Type assertions
  assert(typeof a === 'number', `a must be number, got ${typeof a}`);
  assert(typeof b === 'number', `b must be number, got ${typeof b}`);
  
  // Value assertions
  assert(Number.isFinite(a), `a must be finite, got ${a}`);
  assert(Number.isFinite(b), `b must be finite, got ${b}`);
  assert(b !== 0, 'divisor cannot be zero');
  
  return a / b;
}
```

### Post-conditions

```typescript
function sqrt(n: number): number {
  assert(n >= 0, `sqrt requires non-negative input, got ${n}`);
  
  const result = Math.sqrt(n);
  
  // Post-condition
  assert(Number.isFinite(result), `result must be finite`);
  assert(result >= 0, `result must be non-negative`);
  assert(Math.abs(result * result - n) < 1e-10, `result² must equal input`);
  
  return result;
}
```

### Invariants

```typescript
class BankAccount {
  private balance: number;
  
  private checkInvariants(): void {
    assert(this.balance >= 0, `balance cannot be negative: ${this.balance}`);
    assert(Number.isFinite(this.balance), `balance must be finite`);
  }
  
  constructor(initial: number) {
    assert(initial >= 0, 'initial balance must be non-negative');
    this.balance = initial;
    this.checkInvariants();
  }
  
  withdraw(amount: number): void {
    assert(amount > 0, 'amount must be positive');
    assert(amount <= this.balance, 'insufficient funds');
    
    this.balance -= amount;
    this.checkInvariants();
  }
  
  deposit(amount: number): void {
    assert(amount > 0, 'amount must be positive');
    
    const before = this.balance;
    this.balance += amount;
    
    assert(this.balance === before + amount, 'deposit arithmetic error');
    this.checkInvariants();
  }
}
```

### Positive and Negative Space

```typescript
function authorize(user: User, action: Action): void {
  // Positive: what IS allowed
  assert(user.isActive, 'user must be active');
  assert(user.hasPermission(action), `user lacks permission for ${action}`);
  
  // Negative: what is NEVER allowed
  assert(
    !(user.role === 'guest' && action.isDestructive),
    'guests cannot perform destructive actions'
  );
  assert(
    !(user.role === 'admin' && !user.mfaVerified),
    'admin actions require MFA'
  );
}
```

### Bounded Loops

```typescript
function processQueue<T>(queue: T[], process: (item: T) => void): void {
  const MAX_ITERATIONS = 10_000;
  let iterations = 0;
  
  while (queue.length > 0) {
    assert(
      iterations++ < MAX_ITERATIONS,
      `loop exceeded ${MAX_ITERATIONS} iterations`
    );
    
    const item = queue.shift()!;
    process(item);
  }
}

// With explicit bound parameter
function processBounded<T>(
  items: Iterable<T>,
  process: (item: T) => void,
  maxItems = 10_000
): void {
  let count = 0;
  for (const item of items) {
    assert(count++ < maxItems, `exceeded ${maxItems} items`);
    process(item);
  }
}
```

### Array/Collection Assertions

```typescript
function assertNonEmpty<T>(arr: T[], name: string): asserts arr is [T, ...T[]] {
  assert(arr.length > 0, `${name} must not be empty`);
}

function assertLength<T>(arr: T[], expected: number, name: string): void {
  assert(
    arr.length === expected,
    `${name} must have length ${expected}, got ${arr.length}`
  );
}

function assertUnique<T>(arr: T[], name: string): void {
  const unique = new Set(arr);
  assert(
    unique.size === arr.length,
    `${name} contains duplicates`
  );
}

function assertSorted<T>(arr: T[], name: string, compare = (a: T, b: T) => a < b): void {
  for (let i = 1; i < arr.length; i++) {
    assert(
      !compare(arr[i], arr[i - 1]),
      `${name} is not sorted at index ${i}`
    );
  }
}
```

### Type Narrowing Assertions

```typescript
function assertDefined<T>(value: T | undefined | null, name: string): asserts value is T {
  assert(value !== undefined && value !== null, `${name} must be defined`);
}

function assertString(value: unknown, name: string): asserts value is string {
  assert(typeof value === 'string', `${name} must be string, got ${typeof value}`);
}

function assertNumber(value: unknown, name: string): asserts value is number {
  assert(typeof value === 'number', `${name} must be number, got ${typeof value}`);
  assert(!Number.isNaN(value), `${name} must not be NaN`);
}

function assertObject(value: unknown, name: string): asserts value is Record<string, unknown> {
  assert(typeof value === 'object', `${name} must be object`);
  assert(value !== null, `${name} must not be null`);
}
```

## Python

### Basic Assertion

```python
def assert_that(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(f"Assertion failed: {message}")

# With context
def assert_with_context(condition: bool, message: str, **context) -> None:
    if not condition:
        ctx = ", ".join(f"{k}={v!r}" for k, v in context.items())
        raise AssertionError(f"Assertion failed: {message} [{ctx}]")
```

### Pre/Post-conditions with Decorators

```python
from functools import wraps
from typing import Callable, TypeVar

T = TypeVar('T')

def precondition(check: Callable[..., bool], message: str):
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            assert check(*args, **kwargs), f"Precondition failed: {message}"
            return func(*args, **kwargs)
        return wrapper
    return decorator

def postcondition(check: Callable[[T], bool], message: str):
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            result = func(*args, **kwargs)
            assert check(result), f"Postcondition failed: {message}"
            return result
        return wrapper
    return decorator

# Usage
@precondition(lambda x: x >= 0, "input must be non-negative")
@postcondition(lambda r: r >= 0, "result must be non-negative")
def sqrt(x: float) -> float:
    return x ** 0.5
```

### Invariant Class

```python
class Invariant:
    def check(self) -> None:
        raise NotImplementedError
    
    def __enter__(self):
        self.check()
        return self
    
    def __exit__(self, *args):
        self.check()

class BankAccount:
    def __init__(self, balance: float):
        self._balance = balance
        self._check_invariants()
    
    def _check_invariants(self) -> None:
        assert self._balance >= 0, f"balance cannot be negative: {self._balance}"
        assert isinstance(self._balance, (int, float)), "balance must be numeric"
    
    def withdraw(self, amount: float) -> None:
        assert amount > 0, "amount must be positive"
        assert amount <= self._balance, "insufficient funds"
        
        self._balance -= amount
        self._check_invariants()
```

### Bounded Iteration

```python
from typing import Iterable, Iterator, TypeVar

T = TypeVar('T')

def bounded(iterable: Iterable[T], max_items: int = 10_000) -> Iterator[T]:
    for i, item in enumerate(iterable):
        if i >= max_items:
            raise AssertionError(f"Exceeded {max_items} iterations")
        yield item

# Usage
for item in bounded(potentially_infinite_iterator):
    process(item)
```

## Go

### Basic Assertion

```go
func assert(condition bool, format string, args ...interface{}) {
    if !condition {
        panic(fmt.Sprintf("Assertion failed: "+format, args...))
    }
}

// Recoverable assertion for tests
func assertTest(t *testing.T, condition bool, format string, args ...interface{}) {
    t.Helper()
    if !condition {
        t.Fatalf("Assertion failed: "+format, args...)
    }
}
```

### Pre/Post-conditions

```go
func Divide(a, b float64) float64 {
    // Pre-conditions
    assert(!math.IsNaN(a), "a must not be NaN")
    assert(!math.IsNaN(b), "b must not be NaN")
    assert(b != 0, "divisor cannot be zero")
    
    result := a / b
    
    // Post-condition
    assert(!math.IsNaN(result), "result must not be NaN")
    assert(!math.IsInf(result, 0), "result must not be infinite")
    
    return result
}
```

### Invariants with Defer

```go
type Account struct {
    balance int64
}

func (a *Account) checkInvariants() {
    assert(a.balance >= 0, "balance cannot be negative: %d", a.balance)
}

func (a *Account) Withdraw(amount int64) error {
    defer a.checkInvariants()
    
    assert(amount > 0, "amount must be positive")
    if amount > a.balance {
        return errors.New("insufficient funds")
    }
    
    a.balance -= amount
    return nil
}
```

## Rust

### Basic Assertion Macros

```rust
macro_rules! assert_with_context {
    ($cond:expr, $msg:expr, $($arg:tt)*) => {
        if !$cond {
            panic!("Assertion failed: {} [{}]", $msg, format!($($arg)*));
        }
    };
}

// Usage
assert_with_context!(
    balance >= 0,
    "balance cannot be negative",
    "balance={}, account={}", balance, account_id
);
```

### Pre/Post with Debug Assertions

```rust
fn divide(a: f64, b: f64) -> f64 {
    // Pre-conditions (debug only)
    debug_assert!(!a.is_nan(), "a must not be NaN");
    debug_assert!(!b.is_nan(), "b must not be NaN");
    debug_assert!(b != 0.0, "divisor cannot be zero");
    
    let result = a / b;
    
    // Post-condition
    debug_assert!(result.is_finite(), "result must be finite");
    
    result
}
```

### Invariants with Drop

```rust
struct InvariantChecker<'a, T: Invariant> {
    value: &'a T,
}

trait Invariant {
    fn check_invariants(&self);
}

impl<'a, T: Invariant> Drop for InvariantChecker<'a, T> {
    fn drop(&mut self) {
        self.value.check_invariants();
    }
}

impl Account {
    fn withdraw(&mut self, amount: i64) -> Result<(), Error> {
        let _checker = InvariantChecker { value: self };
        
        assert!(amount > 0, "amount must be positive");
        if amount > self.balance {
            return Err(Error::InsufficientFunds);
        }
        
        self.balance -= amount;
        Ok(())
    } // _checker dropped here, checks invariants
}
```

## Common Patterns (All Languages)

### Conservation Check

```typescript
// Money, energy, items - things that should be conserved
function transfer(from: Account, to: Account, amount: number): void {
  const totalBefore = from.balance + to.balance;
  
  from.balance -= amount;
  to.balance += amount;
  
  const totalAfter = from.balance + to.balance;
  assert(totalBefore === totalAfter, 'conservation violated');
}
```

### Monotonic Progress

```typescript
// Values that should only increase (or decrease)
function append(log: Log, entry: Entry): void {
  const sizeBefore = log.size;
  
  log.entries.push(entry);
  
  assert(log.size > sizeBefore, 'log size must increase');
  assert(log.size === sizeBefore + 1, 'log size increased by wrong amount');
}
```

### Mutual Exclusion

```typescript
// States that cannot coexist
function validateState(state: SystemState): void {
  assert(
    !(state.isRunning && state.isStopped),
    'cannot be both running and stopped'
  );
  assert(
    !(state.isInitializing && state.isReady),
    'cannot be both initializing and ready'
  );
}
```

### Sequence Assertions

```typescript
// Operations that must happen in order
function processLifecycle(entity: Entity): void {
  assert(entity.state === 'created', 'must start in created state');
  
  entity.initialize();
  assert(entity.state === 'initialized', 'initialize must transition to initialized');
  
  entity.start();
  assert(entity.state === 'running', 'start must transition to running');
}
```
