# GitLab CI/CD Templates Library

Production-ready CI/CD templates for common project types and deployment targets.

## Usage

### Option 1: Include via GitLab Include Directive (Recommended)

Reference templates directly from your GitLab repository:

```yaml
# .gitlab-ci.yml
include:
  - project: 'your-group/mai-gitlab-skill'
    ref: main
    file: '/Templates/nodejs.yml'
```

### Option 2: Include from Local Path

If templates are in the same repository:

```yaml
include:
  - local: '/ci/templates/nodejs.yml'
```

### Option 3: Copy and Customize

Copy the template content directly into your `.gitlab-ci.yml` and modify as needed.

## Available Templates

| Template | Description | Primary Image |
|----------|-------------|---------------|
| `nodejs.yml` | Node.js/Bun projects with lint, test, build | `oven/bun:1` |
| `python.yml` | Python with Poetry, pytest, mypy | `python:3.12-slim` |
| `docker.yml` | Docker build and push to GitLab Registry | `docker:24` |
| `cloudflare-pages.yml` | Cloudflare Pages deployment | `node:20-alpine` |
| `cloudflare-worker.yml` | Cloudflare Worker deployment | `node:20-alpine` |
| `security-scan.yml` | Security scanning (SAST, secrets, deps) | Various |
| `helm-deploy.yml` | Kubernetes/Helm deployment | `alpine/helm:3.14` |

## Common Variables Reference

### Global Variables (Available in All Templates)

| Variable | Description | Default |
|----------|-------------|---------|
| `CI_COMMIT_REF_SLUG` | Branch/tag name (URL-safe) | Auto |
| `CI_COMMIT_SHA` | Full commit SHA | Auto |
| `CI_COMMIT_SHORT_SHA` | Short commit SHA (8 chars) | Auto |
| `CI_PROJECT_NAME` | Project name | Auto |
| `CI_REGISTRY_IMAGE` | Container registry path | Auto |

### Template-Specific Variables

#### nodejs.yml
| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Node environment | `production` |
| `BUN_VERSION` | Bun version (image tag) | `1` |

#### python.yml
| Variable | Description | Default |
|----------|-------------|---------|
| `PYTHON_VERSION` | Python version | `3.12` |
| `POETRY_VERSION` | Poetry version | `1.8.0` |

#### docker.yml
| Variable | Description | Default |
|----------|-------------|---------|
| `DOCKER_BUILD_CONTEXT` | Build context path | `.` |
| `DOCKERFILE_PATH` | Dockerfile location | `Dockerfile` |
| `DOCKER_BUILD_ARGS` | Additional build args | `` |

#### cloudflare-pages.yml / cloudflare-worker.yml
| Variable | Description | Required |
|----------|-------------|----------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token | Yes |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | Yes |
| `CF_PAGES_PROJECT` | Pages project name | Yes (pages) |

#### security-scan.yml
| Variable | Description | Default |
|----------|-------------|---------|
| `SECURITY_FAIL_ON` | Minimum severity to fail | `critical` |

#### helm-deploy.yml
| Variable | Description | Required |
|----------|-------------|----------|
| `KUBE_CONTEXT` | Kubernetes context | Yes |
| `HELM_RELEASE` | Helm release name | `${CI_PROJECT_NAME}` |
| `HELM_NAMESPACE` | Target namespace | `default` |

## Extending Templates

Use GitLab's `extends` keyword to build on hidden jobs:

```yaml
include:
  - local: '/Templates/nodejs.yml'

# Extend the base deploy template
deploy-production:
  extends: .deploy
  script:
    - bun run deploy:production
  environment:
    name: production
    url: https://myapp.example.com
```

## Combining Templates

Include multiple templates for complex pipelines:

```yaml
include:
  - local: '/Templates/nodejs.yml'
  - local: '/Templates/security-scan.yml'
  - local: '/Templates/cloudflare-pages.yml'

# Your custom jobs here
```

## Best Practices

1. **Use Variables**: Define environment-specific values in GitLab CI/CD settings
2. **Protected Variables**: Mark secrets as protected and masked
3. **Caching**: Templates include sensible cache defaults; adjust `cache:key` for your needs
4. **Artifacts**: Review artifact expiration times for your storage constraints
5. **Manual Gates**: Use `when: manual` for production deployments

## Integration with mai-security-tools

The `security-scan.yml` template is designed to integrate with the mai-security-tools pack. For enhanced scanning:

```yaml
include:
  - local: '/Templates/security-scan.yml'

# Override with mai-security-tools integration
secrets-scan:
  script:
    - mai-security scan secrets --format gitlab-ci
```

## Troubleshooting

### Cache Not Working
- Verify `cache:key` is unique per branch
- Check runner cache configuration
- Consider using `cache:policy: pull-push`

### Artifacts Too Large
- Adjust `expire_in` values
- Use `.gitignore`-style patterns in `paths`
- Consider external artifact storage

### Permission Denied
- Check runner executor (Docker vs Shell)
- Verify CI/CD variable permissions
- Ensure protected branch settings align

## Contributing

When adding new templates:
1. Follow existing naming conventions
2. Include comprehensive comments
3. Provide sensible defaults
4. Document all variables
5. Test with real projects before merging
