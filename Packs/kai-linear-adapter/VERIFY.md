# Verification Checklist - kai-linear-adapter

## Prerequisites
- [ ] Bun runtime installed
- [ ] Linear API key stored in keychain: `security add-generic-password -s "linear-api-key" -a "claude-code" -w "<key>"`
- [ ] Valid Linear team ID configured

## Core Functionality
- [ ] Implements IssuesProvider interface
- [ ] createIssue creates issue via GraphQL
- [ ] getIssue retrieves issue by ID
- [ ] updateIssue modifies issue
- [ ] deleteIssue removes issue
- [ ] listIssues filters by status, priority, project
- [ ] searchIssues searches issues
- [ ] listProjects returns team projects
- [ ] getProject retrieves project by ID
- [ ] listLabels returns team labels
- [ ] addLabel adds label to issue
- [ ] removeLabel removes label from issue
- [ ] healthCheck verifies API connectivity

## Mapping
- [ ] Linear state types -> IssueStatus
- [ ] Linear priority -> IssuePriority
- [ ] Labels for type detection (bug, feature, etc.)

## Authentication
- [ ] API key retrieved from macOS Keychain
- [ ] Clear error message when key not found
- [ ] Handles 401 with token refresh retry

## Error Handling
- [ ] Throws IssueNotFoundError for missing issues
- [ ] Throws ProjectNotFoundError for missing projects
- [ ] Uses retry with exponential backoff
- [ ] Handles rate limiting (429)

## Tests
- [ ] Unit tests pass with mocked client
- [ ] Integration tests pass with real Linear (manual)

## Integration
- [ ] adapter.yaml manifest is valid
- [ ] Works with kai-issues-core discovery
- [ ] Works with providers.yaml configuration
