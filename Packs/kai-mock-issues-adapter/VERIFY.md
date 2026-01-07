# Verification Checklist - kai-mock-issues-adapter

## Prerequisites
- [x] Bun runtime installed
- [x] Package dependencies installed (`bun install`)

## Core Functionality
- [x] Implements IssuesProvider interface
- [x] createIssue creates new issues
- [x] getIssue retrieves issues by ID
- [x] updateIssue modifies existing issues
- [x] deleteIssue removes issues
- [x] listIssues with filtering and pagination
- [x] searchIssues with text search
- [x] listProjects returns projects
- [x] getProject retrieves project by ID
- [x] listLabels returns labels
- [x] addLabel adds label to issue
- [x] removeLabel removes label from issue
- [x] healthCheck returns healthy status

## Test Helpers
- [x] setIssues replaces all issues
- [x] addIssue adds single issue
- [x] clearIssues removes all issues
- [x] setProjects sets projects
- [x] setLabels sets labels
- [x] setFailureRate configures failure rate
- [x] setLatency configures latency
- [x] getCallLog returns method calls
- [x] clearCallLog resets call log

## Simulated Behavior
- [x] Configurable latency
- [x] Configurable failure rate
- [x] Health check never fails (even with high failure rate)

## Error Handling
- [x] Throws IssueNotFoundError for missing issues
- [x] Throws ProjectNotFoundError for missing projects
- [x] Throws LabelNotFoundError for missing labels
- [x] Throws ProviderError on simulated failures

## Tests
- [x] Unit tests pass: `bun test`
- [ ] Type checking passes: `bun run typecheck`

## Integration
- [x] adapter.yaml manifest is valid
- [ ] Works with kai-issues-core discovery
