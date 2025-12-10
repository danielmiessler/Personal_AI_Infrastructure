# GitLab CI/CD Methodology

## Pipeline Philosophy

GitLab CI/CD follows a declarative approach - you define what you want, not how to do it. The pipeline is defined in `.gitlab-ci.yml` at the root of your repository.

## Core Concepts

### Stages
Stages define the order of execution. Jobs in the same stage run in parallel.

```yaml
stages:
  - test
  - build
  - deploy
```

### Jobs
Jobs are the actual work units. Each job runs in an isolated environment.

```yaml
my-job:
  stage: test
  script:
    - npm test
```

### Runners
Runners execute jobs. They can be:
- **Shared**: Available to all projects (default on GitLab.com)
- **Project-specific**: Assigned to specific projects
- **Group**: Available to all projects in a group

## .gitlab-ci.yml Structure

### Minimal Pipeline
```yaml
stages:
  - test
  - build
  - deploy

test:
  stage: test
  image: node:20
  script:
    - npm ci
    - npm test

build:
  stage: build
  image: node:20
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/

deploy:
  stage: deploy
  script:
    - ./deploy.sh
  only:
    - main
```

### Full-Featured Pipeline
```yaml
default:
  image: node:20
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/

variables:
  NODE_ENV: production

stages:
  - install
  - lint
  - test
  - build
  - deploy

install:
  stage: install
  script:
    - npm ci
  artifacts:
    paths:
      - node_modules/
    expire_in: 1 hour

lint:
  stage: lint
  script:
    - npm run lint
  needs:
    - install

test:
  stage: test
  script:
    - npm test
  coverage: '/Coverage: \d+\.\d+%/'
  needs:
    - install

build:
  stage: build
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 week
  needs:
    - install

deploy-staging:
  stage: deploy
  environment:
    name: staging
    url: https://staging.example.com
  script:
    - ./deploy.sh staging
  only:
    - develop

deploy-production:
  stage: deploy
  environment:
    name: production
    url: https://example.com
  script:
    - ./deploy.sh production
  only:
    - main
  when: manual
```

## Key Features

### Caching
Cache dependencies between pipeline runs:
```yaml
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
    - .npm/
```

### Artifacts
Pass files between jobs:
```yaml
build:
  artifacts:
    paths:
      - dist/
    expire_in: 1 week
```

### Dependencies (needs)
Control job execution order:
```yaml
deploy:
  needs:
    - build
    - test
```

### Rules
Control when jobs run:
```yaml
deploy:
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
    - if: $CI_PIPELINE_SOURCE == "schedule"
    - if: $CI_MERGE_REQUEST_ID
      when: never
```

### Environments
Track deployments:
```yaml
deploy:
  environment:
    name: production
    url: https://example.com
    on_stop: stop-production
```

### Services
Run additional containers:
```yaml
test:
  services:
    - postgres:15
    - redis:7
  variables:
    POSTGRES_DB: test
```

## Scheduled Pipelines

Create scheduled pipelines for recurring tasks:

1. **Via UI**: Settings → CI/CD → Schedules
2. **Via API**: Create schedule with cron expression

Common schedules:
- `0 6 * * *` - Daily at 6am UTC
- `0 0 * * 0` - Weekly on Sunday
- `0 0 1 * *` - Monthly on 1st

```yaml
publish:
  stage: deploy
  script:
    - ./publish.sh
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
```

## CI/CD Variables

### Variable Types
- **Project variables**: Settings → CI/CD → Variables
- **Group variables**: Group → Settings → CI/CD → Variables
- **Instance variables**: Admin → CI/CD → Variables (self-hosted)

### Variable Options
- **Protected**: Only available on protected branches
- **Masked**: Hidden in job logs
- **Expanded**: Expand references like $OTHER_VAR

### Predefined Variables
Key variables available in all jobs:
- `CI_COMMIT_SHA` - Commit hash
- `CI_COMMIT_BRANCH` - Branch name
- `CI_PIPELINE_ID` - Pipeline ID
- `CI_JOB_ID` - Job ID
- `CI_PROJECT_DIR` - Project directory
- `CI_REGISTRY_IMAGE` - Container registry path

## Common Patterns

### Node.js Project
```yaml
default:
  image: node:20

stages:
  - test
  - build
  - deploy

test:
  stage: test
  script:
    - npm ci
    - npm test
  cache:
    paths:
      - node_modules/

build:
  stage: build
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
```

### Docker Build
```yaml
build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

### Deploy to Cloudflare
```yaml
deploy:
  stage: deploy
  image: node:20
  script:
    - npm ci
    - npm run build
    - npx wrangler pages deploy dist --project-name my-site
  variables:
    CLOUDFLARE_API_TOKEN: $CF_API_TOKEN
    CLOUDFLARE_ACCOUNT_ID: $CF_ACCOUNT_ID
```

### Matrix Jobs
```yaml
test:
  stage: test
  parallel:
    matrix:
      - NODE_VERSION: ["18", "20", "22"]
  image: node:${NODE_VERSION}
  script:
    - npm test
```

## Troubleshooting

### Common Issues

**Job pending forever**
- Check runner availability
- Verify tags match runner capabilities
- Check runner is active

**Cache not working**
- Verify cache key is consistent
- Check paths are correct
- Ensure cache is not expired

**Artifacts missing**
- Check artifact paths match build output
- Verify artifacts haven't expired
- Check job dependencies

**Variables not available**
- Verify variable is not protected (on unprotected branch)
- Check variable scope (environment)
- Ensure variable is not masked and empty

### Debug Commands

```yaml
debug:
  script:
    - env | sort                    # List all variables
    - pwd && ls -la                 # Check working directory
    - cat .gitlab-ci.yml            # Verify config
    - gitlab-runner --version       # Check runner version
```
