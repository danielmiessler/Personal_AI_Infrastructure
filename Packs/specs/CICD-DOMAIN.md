# CI/CD Domain Specification

**Version**: 1.0.0
**Status**: Draft
**Last Updated**: 2026-01-07
**Phase**: 4

---

## Overview

The CI/CD domain provides a unified interface for continuous integration and deployment operations across different platforms. It abstracts the differences between GitHub Actions, GitLab CI, and other CI/CD systems behind a common `CICDProvider` interface.

### Goals
- Unified interface for pipeline management, triggering, and monitoring
- Seamless transition between home (GitHub) and work (GitLab) environments
- Support viewing logs, artifacts, and run history
- Enable workflow automation across platforms

### Non-Goals
- Pipeline/workflow definition authoring (YAML generation)
- Full deployment management (separate domain)
- Secrets management within CI (use kai-secrets-core)
- Container registry operations (separate domain)

### Design Decisions

**Why "CICD" not "Pipelines"?**

"CI/CD" is the industry-standard umbrella term. GitHub uses "Actions/Workflows", GitLab uses "Pipelines", but both serve CI/CD purposes. The domain uses "Pipeline" for the workflow definition and "Run" for executions.

**Why not include deployment?**

Deployment is a larger concern that may involve Kubernetes, serverless, or traditional infrastructure. CI/CD focuses on the build/test/package phase. Deployment can be a separate Platform domain or integrated later.

**What about Jenkins/CircleCI?**

GitHub and GitLab cover home and work needs. Additional adapters can be added following the same pattern. The mock adapter enables testing without any real CI system.

---

## Pack Structure

```
kai-cicd-core/              # Interface + discovery + shared utilities
kai-github-cicd-adapter/    # GitHub Actions integration
kai-gitlab-cicd-adapter/    # GitLab CI/CD integration
kai-mock-cicd-adapter/      # Mock adapter for testing (REQUIRED)
kai-cicd-skill/             # User-facing workflows
```

**Future adapters** (not implemented in Phase 4):
- `kai-jenkins-adapter` - Jenkins integration
- `kai-circleci-adapter` - CircleCI integration

---

## kai-cicd-core

### Purpose
Defines the CICDProvider interface and shared utilities for CI/CD operations. Provides adapter discovery, configuration loading, and error classes.

### Directory Structure

```
kai-cicd-core/
├── README.md
├── VERIFY.md
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Public exports
│   ├── interfaces/
│   │   ├── index.ts
│   │   └── CICDProvider.ts         # Provider interface
│   ├── types/
│   │   ├── Pipeline.ts             # Pipeline/workflow definition
│   │   ├── Run.ts                  # Pipeline execution
│   │   ├── Job.ts                  # Job within a run
│   │   └── Artifact.ts             # Build artifacts
│   ├── discovery/
│   │   ├── AdapterLoader.ts        # Discovery with caching
│   │   ├── ConfigLoader.ts         # Configuration loading
│   │   └── ProviderFactory.ts      # Provider instantiation
│   └── utils/
│       ├── errors.ts               # Domain-specific errors
│       ├── logger.ts               # Audit logging
│       └── retry.ts                # Retry with exponential backoff
└── tests/
    ├── interfaces.test.ts
    ├── discovery.test.ts
    └── fixtures.ts
```

### Provider Interface

```typescript
// src/interfaces/CICDProvider.ts

export interface CICDProvider {
  /** Provider identifier */
  readonly name: string;

  /** Provider version */
  readonly version: string;

  // Pipeline operations
  listPipelines(repo: string): Promise<Pipeline[]>;
  getPipeline(repo: string, pipelineId: string): Promise<Pipeline>;

  // Run operations
  listRuns(repo: string, options?: RunQuery): Promise<Run[]>;
  getRun(repo: string, runId: string): Promise<Run>;
  triggerRun(repo: string, pipelineId: string, options?: TriggerOptions): Promise<Run>;
  cancelRun(repo: string, runId: string): Promise<void>;
  retryRun(repo: string, runId: string): Promise<Run>;

  // Job operations
  listJobs(repo: string, runId: string): Promise<Job[]>;
  getJobLogs(repo: string, jobId: string): Promise<string>;
  retryJob?(repo: string, runId: string, jobId: string): Promise<void>;

  // Artifact operations
  listArtifacts(repo: string, runId: string): Promise<Artifact[]>;
  downloadArtifact(repo: string, artifactId: string): Promise<Buffer>;

  // Health check
  healthCheck(): Promise<HealthStatus>;
}

// Pipeline types
export interface Pipeline {
  id: string;
  name: string;
  path: string;              // e.g., ".github/workflows/ci.yml"
  repo: string;
  defaultBranch?: string;
  metadata?: Record<string, unknown>;
}

export interface Run {
  id: string;
  pipelineId: string;
  pipelineName: string;
  repo: string;
  status: RunStatus;
  conclusion?: RunConclusion;
  branch: string;
  commit: string;
  commitMessage?: string;
  triggeredBy: string;
  triggerEvent: string;      // push, pull_request, schedule, manual
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;         // seconds
  url: string;
  metadata?: Record<string, unknown>;
}

export type RunStatus = 'pending' | 'queued' | 'running' | 'completed';
export type RunConclusion = 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out';

export interface Job {
  id: string;
  runId: string;
  name: string;
  status: JobStatus;
  conclusion?: RunConclusion;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  runner?: string;
  steps?: Step[];
  metadata?: Record<string, unknown>;
}

export type JobStatus = 'pending' | 'queued' | 'running' | 'completed';

export interface Step {
  name: string;
  status: JobStatus;
  conclusion?: RunConclusion;
  number: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface Artifact {
  id: string;
  runId: string;
  name: string;
  sizeBytes: number;
  createdAt: Date;
  expiresAt?: Date;
  downloadUrl?: string;
}

export interface RunQuery {
  pipelineId?: string;
  branch?: string;
  status?: RunStatus | RunStatus[];
  limit?: number;
  offset?: number;
}

export interface TriggerOptions {
  branch?: string;
  inputs?: Record<string, string>;   // Workflow inputs
  commitSha?: string;
}

export interface HealthStatus {
  healthy: boolean;
  message?: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}
```

### Domain Errors

```typescript
// src/utils/errors.ts

export class CICDError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider?: string
  ) {
    super(message);
    this.name = 'CICDError';
  }
}

export class PipelineNotFoundError extends CICDError {
  constructor(pipelineId: string, provider?: string) {
    super(`Pipeline not found: ${pipelineId}`, 'PIPELINE_NOT_FOUND', provider);
    this.name = 'PipelineNotFoundError';
  }
}

export class RunNotFoundError extends CICDError {
  constructor(runId: string, provider?: string) {
    super(`Run not found: ${runId}`, 'RUN_NOT_FOUND', provider);
    this.name = 'RunNotFoundError';
  }
}

export class JobNotFoundError extends CICDError {
  constructor(jobId: string, provider?: string) {
    super(`Job not found: ${jobId}`, 'JOB_NOT_FOUND', provider);
    this.name = 'JobNotFoundError';
  }
}

export class ArtifactNotFoundError extends CICDError {
  constructor(artifactId: string, provider?: string) {
    super(`Artifact not found: ${artifactId}`, 'ARTIFACT_NOT_FOUND', provider);
    this.name = 'ArtifactNotFoundError';
  }
}

export class AuthenticationError extends CICDError {
  constructor(message: string, provider?: string) {
    super(message, 'AUTHENTICATION_ERROR', provider);
    this.name = 'AuthenticationError';
  }
}

export class ConfigurationError extends CICDError {
  constructor(message: string, provider?: string) {
    super(message, 'CONFIGURATION_ERROR', provider);
    this.name = 'ConfigurationError';
  }
}

export class AdapterNotFoundError extends CICDError {
  constructor(adapter: string) {
    super(`Adapter not found: ${adapter}`, 'ADAPTER_NOT_FOUND');
    this.name = 'AdapterNotFoundError';
  }
}

export class RateLimitError extends CICDError {
  constructor(retryAfter?: number, provider?: string) {
    super(
      `Rate limit exceeded${retryAfter ? `. Retry after ${retryAfter}s` : ''}`,
      'RATE_LIMIT',
      provider
    );
    this.name = 'RateLimitError';
  }
}
```

---

## kai-github-cicd-adapter

### Purpose
Implements CICDProvider using GitHub Actions REST API. Provides workflow management, run triggering, and artifact handling.

### Adapter Manifest

```yaml
# adapter.yaml
name: github
version: 1.0.0
domain: cicd
interface: CICDProvider
entry: ./src/GitHubCICDAdapter.ts
description: GitHub Actions CI/CD adapter

config:
  required: []  # Token from keychain or GITHUB_TOKEN env
  optional:
    - apiUrl: https://api.github.com

requires:
  runtime: bun >= 1.0
  platform: [darwin, linux, win32]

integrations:
  cicd: true
  kubernetes: true
  local: true
```

### GitHub-to-CICD Mapping

| CICD Type | GitHub Equivalent | API Endpoint |
|-----------|-------------------|--------------|
| Pipeline | Workflow | `/repos/{owner}/{repo}/actions/workflows` |
| Run | Workflow Run | `/repos/{owner}/{repo}/actions/runs` |
| Job | Job | `/repos/{owner}/{repo}/actions/runs/{id}/jobs` |
| Artifact | Artifact | `/repos/{owner}/{repo}/actions/artifacts` |

### Status Mapping

| GitHub Status | RunStatus |
|---------------|-----------|
| queued | queued |
| in_progress | running |
| completed | completed |
| waiting | pending |
| pending | pending |

| GitHub Conclusion | RunConclusion |
|-------------------|---------------|
| success | success |
| failure | failure |
| cancelled | cancelled |
| skipped | skipped |
| timed_out | timed_out |

### Implementation Notes

- **Authentication**: Token from keychain (`github-token` / `claude-code`) or `GITHUB_TOKEN` env
- **Rate limiting**: 5000 req/hour for authenticated requests, implement backoff on 403
- **Pagination**: Use Link headers, default 30 items per page
- **Repo format**: Accept `owner/repo` or full URL, normalize internally
- **Triggering**: Use workflow_dispatch event, requires workflow to support it

---

## kai-gitlab-cicd-adapter

### Purpose
Implements CICDProvider using GitLab CI/CD REST API. Provides pipeline management, job handling, and artifact access.

### Adapter Manifest

```yaml
# adapter.yaml
name: gitlab
version: 1.0.0
domain: cicd
interface: CICDProvider
entry: ./src/GitLabCICDAdapter.ts
description: GitLab CI/CD adapter

config:
  required:
    - host        # GitLab instance URL (e.g., gitlab.com)
  optional:
    - apiVersion: v4

requires:
  runtime: bun >= 1.0
  platform: [darwin, linux, win32]

integrations:
  cicd: true
  kubernetes: true
  local: true
```

### GitLab-to-CICD Mapping

| CICD Type | GitLab Equivalent | API Endpoint |
|-----------|-------------------|--------------|
| Pipeline | Pipeline definition | `.gitlab-ci.yml` detection |
| Run | Pipeline | `/projects/{id}/pipelines` |
| Job | Job | `/projects/{id}/pipelines/{id}/jobs` |
| Artifact | Job artifact | `/projects/{id}/jobs/{id}/artifacts` |

### Status Mapping

| GitLab Status | RunStatus |
|---------------|-----------|
| created, waiting_for_resource, preparing | pending |
| pending | queued |
| running | running |
| success, failed, canceled, skipped | completed |

| GitLab Status (completion) | RunConclusion |
|----------------------------|---------------|
| success | success |
| failed | failure |
| canceled | cancelled |
| skipped | skipped |

### Implementation Notes

- **Authentication**: Token from keychain (`gitlab-token` / `claude-code`) or `GITLAB_TOKEN` env
- **Project ID**: Accept numeric ID or `namespace/project` encoded path
- **Pipeline triggering**: Use pipeline triggers or pipeline API with ref
- **Artifacts**: Download as zip, individual files via path
- **Rate limiting**: Varies by instance, implement backoff on 429

---

## kai-mock-cicd-adapter

### Purpose
Provides a mock CICDProvider for testing skills and integration tests without requiring real CI/CD systems.

### Adapter Manifest

```yaml
# adapter.yaml
name: mock
version: 1.0.0
domain: cicd
interface: CICDProvider
entry: ./src/MockCICDAdapter.ts
description: Mock adapter for testing

config:
  required: []
  optional:
    - pipelines: []        # Pre-populated pipelines
    - runs: []             # Pre-populated runs
    - jobs: []             # Pre-populated jobs
    - artifacts: []        # Pre-populated artifacts
    - simulateLatency: 0   # Simulated latency in ms
    - failureRate: 0       # Percentage of requests to fail (0-100)

requires:
  runtime: bun >= 1.0
  platform: [darwin, linux, win32]

integrations:
  cicd: true
  kubernetes: false
  local: true
```

### Test Helpers

```typescript
// Test helper methods on MockCICDAdapter

class MockCICDAdapter implements CICDProvider {
  // Standard interface methods...

  // Test helpers
  setPipelines(pipelines: Pipeline[]): void;
  addPipeline(pipeline: Pipeline): void;
  clearPipelines(): void;

  setRuns(runs: Run[]): void;
  addRun(run: Run): void;
  updateRun(runId: string, updates: Partial<Run>): void;
  clearRuns(): void;

  setJobs(jobs: Job[]): void;
  addJob(job: Job): void;
  clearJobs(): void;

  setArtifacts(artifacts: Artifact[]): void;
  addArtifact(artifact: Artifact, content: Buffer): void;
  clearArtifacts(): void;

  setFailureRate(rate: number): void;
  setLatency(ms: number): void;

  getCallLog(): MethodCall[];
  clearCallLog(): void;
}
```

---

## kai-cicd-skill

### Purpose
Provides user-facing workflows for CI/CD operations that work across any CICDProvider backend.

### SKILL.md

```yaml
---
name: CICD
description: CI/CD pipeline management across GitHub Actions, GitLab CI. USE WHEN pipelines, workflows, builds, deployments, CI status, run logs, artifacts.
---

# CICD Skill

Unified CI/CD management across multiple platforms. Works with GitHub Actions (personal/OSS) or GitLab CI (enterprise).

## Workflow Routing

| Workflow | When to Use | Output |
|----------|-------------|--------|
| ListPipelines | "show workflows", "list pipelines" | Pipeline list |
| ListRuns | "recent builds", "pipeline status", "CI history" | Run list |
| TriggerRun | "run pipeline", "trigger build", "start workflow" | New run |
| RunStatus | "build status", "check CI", "is it green?" | Run details |
| ViewLogs | "show logs", "why did it fail?", "job output" | Log content |
| ListArtifacts | "build artifacts", "download output" | Artifact list |

## CLI Tools

```bash
# List pipelines/workflows
bun run Tools/pipelines.ts <repo> [--format table|json]

# List runs
bun run Tools/runs.ts <repo> [--pipeline <id>] [--branch main] [--limit 10]

# Get run details
bun run Tools/run.ts <repo> <run-id>

# Trigger a run
bun run Tools/trigger.ts <repo> <pipeline-id> [--branch main] [--input key=value]

# Cancel a run
bun run Tools/cancel.ts <repo> <run-id>

# View job logs
bun run Tools/logs.ts <repo> <job-id>

# List artifacts
bun run Tools/artifacts.ts <repo> <run-id>

# Download artifact
bun run Tools/download.ts <repo> <artifact-id> [--output ./artifact.zip]

# Health check
bun run Tools/health.ts
```

## Configuration

Configured via `providers.yaml`:

```yaml
domains:
  cicd:
    primary: github        # Default backend
    fallback: gitlab       # If primary fails
    adapters:
      github:
        # Token from GITHUB_TOKEN env or keychain
      gitlab:
        host: gitlab.com
        # Token from GITLAB_TOKEN env or keychain
```
```

### Workflows

1. **ListPipelines.md** - List available workflows/pipelines
2. **ListRuns.md** - View recent pipeline runs with status
3. **TriggerRun.md** - Trigger a new pipeline run
4. **RunStatus.md** - Get detailed status of a specific run
5. **ViewLogs.md** - View job logs for debugging
6. **ListArtifacts.md** - List and download build artifacts

---

## Implementation Checklist

### Phase 4.1: kai-cicd-core
- [ ] Create package structure (README.md, package.json, tsconfig.json)
- [ ] Create src/index.ts with public exports
- [ ] Define CICDProvider interface in src/interfaces/
- [ ] Define Pipeline, Run, Job, Artifact types
- [ ] Implement adapter discovery with 60s caching
- [ ] Implement cache invalidation function
- [ ] Implement config loading with precedence
- [ ] Implement provider factory
- [ ] Implement retry utility with exponential backoff
- [ ] Add domain-specific error classes
- [ ] Add audit logging
- [ ] Write unit tests for each module
- [ ] Create VERIFY.md and verify all items

### Phase 4.2: kai-github-cicd-adapter
- [ ] Create package structure
- [ ] Create adapter.yaml manifest
- [ ] Implement GitHubCICDAdapter class
- [ ] Implement GitHub-to-CICD type mapping
- [ ] Implement pagination handling
- [ ] Implement rate limit handling with backoff
- [ ] Use keychain/env for token auth
- [ ] Write unit tests with mocked GitHub API
- [ ] Create VERIFY.md and verify all items

### Phase 4.3: kai-gitlab-cicd-adapter
- [ ] Create package structure
- [ ] Create adapter.yaml manifest
- [ ] Implement GitLabCICDAdapter class
- [ ] Implement GitLab-to-CICD type mapping
- [ ] Handle project ID encoding
- [ ] Implement pagination handling
- [ ] Implement rate limit handling with backoff
- [ ] Use keychain/env for token auth
- [ ] Write unit tests with mocked GitLab API
- [ ] Create VERIFY.md and verify all items

### Phase 4.4: kai-mock-cicd-adapter
- [ ] Create package structure
- [ ] Create adapter.yaml manifest
- [ ] Implement MockCICDAdapter class with test helpers
- [ ] Implement setPipelines/addPipeline/clearPipelines methods
- [ ] Implement setRuns/addRun/updateRun/clearRuns methods
- [ ] Implement setJobs/setArtifacts methods
- [ ] Implement simulated latency
- [ ] Implement simulated failures
- [ ] Implement call logging for verification
- [ ] Create tests/fixtures.ts with factory functions
- [ ] Write unit tests
- [ ] Create VERIFY.md and verify all items

### Phase 4.5: kai-cicd-skill
- [ ] Create package structure
- [ ] Create SKILL.md with workflow routing
- [ ] Create CLI tools in Tools/
- [ ] Create workflow documentation in Workflows/
- [ ] Write integration tests using mock adapter
- [ ] Create VERIFY.md and verify all items

### Phase 4.6: Integration Testing
- [ ] End-to-end test: skill → core → mock adapter
- [ ] End-to-end test: skill → core → GitHub adapter (requires token)
- [ ] End-to-end test: skill → core → GitLab adapter (requires token)
- [ ] Verify fallback chain works
- [ ] Verify audit logging captures all operations
- [ ] Test retry behavior with flaky mock adapter
- [ ] Update SESSION-CONTEXT.md with Phase 4 completion

---

## Related Specifications

- [ARCHITECTURE-OVERVIEW.md](./ARCHITECTURE-OVERVIEW.md) - System architecture
- [SECRETS-DOMAIN.md](./SECRETS-DOMAIN.md) - Reference implementation (Phase 1)
- [NETWORK-DOMAIN.md](./NETWORK-DOMAIN.md) - Reference implementation (Phase 2)
- [ISSUES-DOMAIN.md](./ISSUES-DOMAIN.md) - Reference implementation (Phase 3)
- [DOMAIN-TEMPLATE.md](./DOMAIN-TEMPLATE.md) - Generic domain template

---

## Changelog

### 1.0.0 - 2026-01-07
- Initial specification
