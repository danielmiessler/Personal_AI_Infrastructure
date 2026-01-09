# PipelineOverview Workflow

**Purpose:** List available pipelines/workflows in a repository to understand CI/CD capabilities.

**Triggers:** "all pipelines", "available workflows", "what pipelines exist", "list workflows", "show CI/CD", "what can I run"

---

## Steps

1. **Determine repository context**
   - Extract repo from user request
   - If not specified, infer from current working directory

2. **List all pipelines**
   ```bash
   bun run Tools/pipelines.ts <repo> [--format table|json]
   ```

3. **Present pipeline overview**
   - Show pipeline ID/name, display name, and path
   - Group by type if apparent (CI, Deploy, Release, etc.)
   - Note which are manually triggerable

---

## Examples

**Example 1: List all workflows**
```
User: "What pipelines are available?"

Process:
1. Run: bun run Tools/pipelines.ts owner/repo
2. Return: Formatted pipeline list

Output:
ID                  Name                        Path
--------------------------------------------------------------------------------
ci.yml              CI                          .github/workflows/ci.yml
deploy.yml          Deploy                      .github/workflows/deploy.yml
release.yml         Release                     .github/workflows/release.yml
codeql.yml          CodeQL Analysis             .github/workflows/codeql.yml
```

**Example 2: Understand repository CI/CD**
```
User: "Show me the CI/CD setup for this repo"

Process:
1. List pipelines: bun run Tools/pipelines.ts owner/repo
2. Categorize by apparent purpose:
   - CI/Testing: ci.yml, test.yml
   - Deployment: deploy.yml, deploy-staging.yml
   - Release: release.yml, publish.yml
   - Security: codeql.yml, security-scan.yml
3. Return: Organized overview with descriptions

Output:
CI/CD Overview for owner/repo

Testing:
  - CI (ci.yml) - Main continuous integration pipeline

Deployment:
  - Deploy (deploy.yml) - Environment deployment workflow

Release:
  - Release (release.yml) - Version release automation

Security:
  - CodeQL Analysis (codeql.yml) - Automated security scanning
```

**Example 3: JSON format for scripting**
```
User: "Get pipelines as JSON"

Process:
1. Run: bun run Tools/pipelines.ts owner/repo --format json
2. Return: Raw JSON array

Output:
[
  {
    "id": "ci.yml",
    "name": "CI",
    "path": ".github/workflows/ci.yml"
  },
  ...
]
```

**Example 4: Find deployment pipelines**
```
User: "What deployment options do I have?"

Process:
1. List all pipelines: bun run Tools/pipelines.ts owner/repo
2. Filter to deployment-related pipelines (by name/path keywords)
3. Return: Deployment pipelines with any known input parameters

Output:
Deployment Pipelines:

1. deploy.yml (Deploy)
   - Can deploy to: staging, production
   - Accepts inputs: DEPLOY_ENV, VERSION

2. deploy-preview.yml (Deploy Preview)
   - Creates preview deployments for PRs
```

**Example 5: Cross-reference with recent runs**
```
User: "Which pipelines have been active recently?"

Process:
1. List pipelines: bun run Tools/pipelines.ts owner/repo
2. Get recent runs: bun run Tools/runs.ts owner/repo --limit 50
3. Cross-reference to show activity
4. Return: Pipelines with last run status

Output:
Pipeline            Last Run        Status      When
--------------------------------------------------------------------------------
CI                  abc12345        success     2 hours ago
Deploy              def67890        success     1 day ago
Release             -               -           No recent runs
CodeQL Analysis     ghi11223        success     3 days ago
```

---

## Error Handling

- **No pipelines found** -> Check if repo uses CI/CD; suggest common locations
- **Repository not found** -> Verify repo name and access permissions
- **No workflow permissions** -> May lack read access to workflows

---

## Notes

- Pipeline ID format varies by provider:
  - GitHub Actions: workflow filename (e.g., "ci.yml")
  - GitLab CI: pipeline name or numeric ID
- Not all pipelines are manually triggerable (some are event-only)
- Path shows the workflow definition file location
- For GitHub: workflows are in `.github/workflows/`
- For GitLab: pipelines are defined in `.gitlab-ci.yml`
- Some workflows may be disabled; they still appear in the list
