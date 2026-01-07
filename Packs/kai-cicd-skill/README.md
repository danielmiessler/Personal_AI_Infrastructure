# kai-cicd-skill

User-facing skill for CI/CD pipeline management. Provides CLI tools and workflows for managing pipelines across GitHub Actions, GitLab CI, and other CI/CD platforms.

## Installation

```bash
bun add kai-cicd-skill
```

## CLI Tools

### List Pipelines

```bash
bun run Tools/pipelines.ts owner/repo
bun run Tools/pipelines.ts owner/repo --format json
```

### List Runs

```bash
bun run Tools/runs.ts owner/repo
bun run Tools/runs.ts owner/repo --status running
bun run Tools/runs.ts owner/repo --branch main --limit 5
bun run Tools/runs.ts owner/repo --format json
```

### Get Run Details

```bash
bun run Tools/run.ts owner/repo 12345
```

### Trigger Pipeline

```bash
bun run Tools/trigger.ts owner/repo my-workflow
bun run Tools/trigger.ts owner/repo my-workflow --branch develop
bun run Tools/trigger.ts owner/repo my-workflow --input DEPLOY_ENV=staging
```

### View Job Logs

```bash
bun run Tools/logs.ts owner/repo 67890
```

### Manage Artifacts

```bash
# List artifacts
bun run Tools/artifacts.ts owner/repo 12345

# Download artifact
bun run Tools/artifacts.ts owner/repo 12345 --download artifact-id --output ./build.zip
```

### Health Check

```bash
bun run Tools/health.ts
```

## Configuration

Configure in `~/.config/kai/providers.yaml` or `./providers.yaml`:

```yaml
domains:
  cicd:
    primary: github
    adapters:
      github:
        # Uses GITHUB_TOKEN env or keychain
      gitlab:
        host: gitlab.com
        # Uses GITLAB_TOKEN env or keychain
```

## Related

- [kai-cicd-core](../kai-cicd-core) - Core interfaces and types
- [kai-github-cicd-adapter](../kai-github-cicd-adapter) - GitHub Actions adapter
- [kai-gitlab-cicd-adapter](../kai-gitlab-cicd-adapter) - GitLab CI adapter
- [kai-mock-cicd-adapter](../kai-mock-cicd-adapter) - Mock adapter for testing
