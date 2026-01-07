# Verification Checklist - kai-joplin-issues-adapter

## Prerequisites
- [ ] Bun runtime installed
- [ ] Joplin Desktop running with Web Clipper enabled
- [ ] API token stored in keychain: `security add-generic-password -s "joplin-token" -a "claude-code" -w "<token>"`

## Core Functionality
- [ ] Implements IssuesProvider interface
- [ ] createIssue creates todo note with tags
- [ ] getIssue retrieves note and maps to issue
- [ ] updateIssue modifies note and tags
- [ ] deleteIssue removes note
- [ ] listIssues filters by status, type, priority, project
- [ ] searchIssues searches todo notes
- [ ] listProjects returns notebooks
- [ ] getProject retrieves notebook by ID
- [ ] listLabels returns tags (excluding type/priority)
- [ ] addLabel adds tag to note
- [ ] removeLabel removes tag from note
- [ ] healthCheck verifies Joplin connectivity

## Mapping
- [ ] Note todo_completed -> Issue status
- [ ] Tags -> Issue type (task, bug, feature, story, epic)
- [ ] Tags -> Issue priority (p0, p1, p2, p3)
- [ ] Tags -> Issue labels (other tags)
- [ ] Notebook -> Project
- [ ] todo_due -> dueDate

## Authentication
- [ ] Token retrieved from macOS Keychain
- [ ] Clear error message when token not found
- [ ] Clear error message when Joplin not running

## Error Handling
- [ ] Throws IssueNotFoundError for missing notes
- [ ] Throws ProjectNotFoundError for missing notebooks
- [ ] Throws LabelNotFoundError for missing tags
- [ ] Uses retry with exponential backoff

## Tests
- [ ] Unit tests pass with mocked client
- [ ] Integration tests pass with real Joplin (manual)

## Integration
- [ ] adapter.yaml manifest is valid
- [ ] Works with kai-issues-core discovery
- [ ] Works with providers.yaml configuration
