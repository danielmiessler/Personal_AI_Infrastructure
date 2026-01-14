# 🦀 PAI Core (Rust Port)

**Adversarial-Grade Intelligence Fabric for Personal AI Infrastructure.**

PAI Core is a high-performance, security-hardened Rust implementation of the core PAI (Personal AI Infrastructure) logic. It serves as the "pure Rust" engine for agent orchestration, safety enforcement, and memory management within the Agency ecosystem.

## 🛡️ Security Manifesto

Designed for mission-critical operations, PAI Core implements a multi-layered security architecture:

- **Command Whitelisting**: `VerificationOracle` restricts shell execution to a strict whitelist of safe commands (`ls`, `git`, `cargo`, `exit`), preventing arbitrary command injection.
- **SSRF Protection**: Internal network probing is blocked by restricting HTTP oracles to external HTTPS endpoints.
- **Automated PII Redaction**: `PrivacyGuard` scans all outgoing content for sensitive patterns (API keys, Bearer tokens, internal IPs) and redacts them automatically.
- **Path Traversal Shield**: `SessionManager` and `MemoryManager` sanitize all session and file IDs to prevent unauthorized filesystem access.
- **Black Swan Resilience**: Implementation of snapshot size limits, recursion depth checks for hooks, and stress-tested concurrency locks.

## ⚡ Performance Specification

Optimized for high-concurrency "swarm" environments:

- **Async I/O**: Full non-blocking I/O using `tokio::fs` for all persistence and logging modules.
- **Granular Concurrency**: `AlgorithmEngine` uses thread-safe `RwLock` and `Atomic` primitives for high-throughput state transitions without global mutex bottlenecks.
- **Regex Optimization**: Global regex patterns are pre-compiled once using `OnceLock` to eliminate overhead in hot loops.
- **Zero-Waste Hooks**: `HookManager` minimizes memory overhead by only cloning event payloads when a modification is actually requested.

## 🏗️ Intelligence Fabric Architecture

The core is organized into modular "threads" of intelligence:

- **Algorithm**: The deterministic state machine driving the PAI lifecycle (Observe → Think → Plan → Build → Execute → Verify → Learn).
- **Prosody**: A linguistic cleaning and emotion detection engine for high-fidelity speech synthesis.
- **Telos**: Deep context management for core user values and missions.
- **Swarm**: Aggregation logic for multi-agent consensus using Pareto-optimal selection.
- **Observability**: Structured telemetry streaming for real-time dashboard integration.

## 🧪 Quality & Reliability

- **83 Passing Tests**: 100% pass rate on integration and unit tests.
- **Stress-Tested**: Verified under high lock contention and deeply nested JSON scenarios.
- **Idiomatic Rust**: 100% `cargo clippy` compliant with strict error handling (`thiserror`).

---
*Part of the Personal AI Infrastructure (PAI) Project.*
