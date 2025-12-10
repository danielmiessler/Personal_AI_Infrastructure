---
name: GitLab
description: GitLab platform knowledge and CI/CD automation. USE WHEN user needs to configure CI/CD pipelines, manage repositories, set up scheduled jobs, configure runners, manage secrets, or automate deployments. Foundational skill for all GitLab services.
---

# GitLab

Foundational platform skill providing knowledge and workflows for GitLab CI/CD and repository management.

## Workflow Routing

| Workflow | When to Use | Output |
|----------|-------------|--------|
| CreatePipeline | Setting up CI/CD for a project | .gitlab-ci.yml with stages and jobs |
| ScheduledJobs | Need automated recurring tasks | Scheduled pipeline configuration |
| DeployToCloudflare | Deploy to Cloudflare via CI | Pipeline with Cloudflare deployment |
| DebugPipeline | Troubleshooting failed pipelines | Diagnosis and fixes |
| ManageSecrets | Configure CI/CD variables | Secrets configured securely |

## Examples

### Example 1: Create CI/CD pipeline
```
User: "Set up CI/CD for this Node.js project"
Skill loads: GitLab → CreatePipeline workflow
Output: .gitlab-ci.yml with test, build, deploy stages
```

### Example 2: Schedule content publishing
```
User: "Run deployment every day at 6am"
Skill loads: GitLab → ScheduledJobs workflow
Output: Scheduled pipeline configured with cron
```

### Example 3: Debug failed pipeline
```
User: "My pipeline is failing on the deploy stage"
Skill loads: GitLab → DebugPipeline workflow
Output: Root cause identified, fix applied
```

### Example 4: Configure secrets
```
User: "Add API keys for deployment"
Skill loads: GitLab → ManageSecrets workflow
Output: CI/CD variables configured, masked and protected
```

## Features Covered

### CI/CD Pipelines
- Pipeline configuration (.gitlab-ci.yml)
- Stages and jobs
- Parallel execution
- Dependencies and artifacts
- Cache management
- Environment variables

### Scheduled Pipelines
- Cron-based scheduling
- Pipeline variables
- Target branches
- Active/inactive management

### Runners
- Shared vs. project runners
- Docker executor
- Shell executor
- Tags and selection

### Variables & Secrets
- CI/CD variables
- Protected variables
- Masked variables
- Environment scoping
- Group-level variables

### Merge Requests
- MR pipelines
- Review apps
- Approvals
- Merge when pipeline succeeds

## MCP Tools Available

When the GitLab MCP server is configured, these tools are available:

**Projects:** list_projects, get_project, create_project
**Pipelines:** list_pipelines, get_pipeline, trigger_pipeline, retry_pipeline
**Jobs:** list_jobs, get_job, retry_job, cancel_job
**Variables:** list_variables, create_variable, update_variable, delete_variable
**Schedules:** list_schedules, create_schedule, update_schedule
**Branches:** list_branches, create_branch, delete_branch
**Merge Requests:** list_merge_requests, create_merge_request, merge_merge_request

## Integration

- Works with Cloudflare skill (deployment pipelines)
- Works with Content Publishing skill (scheduled publishing)
- Works with Security skill (security scanning in CI)
- Provides CI/CD for any project

## GitLab.com vs Self-Hosted

This skill works with both:
- **GitLab.com**: Default, no extra config
- **Self-hosted**: Set GITLAB_API_URL environment variable

## Best Practices

1. **Use stages logically**: test → build → deploy
2. **Cache dependencies**: Speed up pipeline runs
3. **Use artifacts**: Pass data between jobs
4. **Protect secrets**: Use masked, protected variables
5. **Pin versions**: Lock runner images and tools
6. **Fail fast**: Run lint/tests early in pipeline
