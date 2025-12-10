# CreatePipeline Workflow

Create a CI/CD pipeline configuration for a project.

## Inputs

- **project_type**: node, python, static, docker
- **stages**: Array of desired stages
- **deploy_target** (optional): cloudflare, aws, docker-registry

## Steps

### 1. Analyze Project

Determine project requirements:
- Language/runtime (Node.js, Python, etc.)
- Build tools (npm, yarn, bun, pip, uv)
- Test framework
- Output artifacts

### 2. Choose Base Template

Select appropriate template based on project type.

### 3. Generate .gitlab-ci.yml

#### Node.js Project
```yaml
default:
  image: node:20

stages:
  - install
  - lint
  - test
  - build
  - deploy

cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/

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
  allow_failure: true

test:
  stage: test
  script:
    - npm test
  needs:
    - install
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'

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
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - if: $CI_MERGE_REQUEST_ID

deploy:
  stage: deploy
  script:
    - echo "Deploy to production"
  environment:
    name: production
  needs:
    - build
    - test
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual
```

#### Python Project
```yaml
default:
  image: python:3.12

stages:
  - install
  - lint
  - test
  - build
  - deploy

cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - .venv/

install:
  stage: install
  script:
    - pip install uv
    - uv venv
    - uv pip install -r requirements.txt
  artifacts:
    paths:
      - .venv/
    expire_in: 1 hour

lint:
  stage: lint
  script:
    - source .venv/bin/activate
    - pip install ruff
    - ruff check .
  needs:
    - install

test:
  stage: test
  script:
    - source .venv/bin/activate
    - pytest --cov
  needs:
    - install
```

#### Static Site
```yaml
default:
  image: node:20

stages:
  - build
  - deploy

build:
  stage: build
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/

pages:
  stage: deploy
  script:
    - mv dist public
  artifacts:
    paths:
      - public
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

### 4. Add Deploy Target Configuration

#### Deploy to Cloudflare Pages
```yaml
deploy:
  stage: deploy
  image: node:20
  script:
    - npm ci
    - npm run build
    - npx wrangler pages deploy dist --project-name $PROJECT_NAME
  variables:
    CLOUDFLARE_API_TOKEN: $CF_API_TOKEN
    CLOUDFLARE_ACCOUNT_ID: $CF_ACCOUNT_ID
```

#### Deploy to Docker Registry
```yaml
docker-build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

### 5. Configure Variables

Required CI/CD variables:
- Deployment credentials
- API tokens
- Environment-specific config

### 6. Test Pipeline

Commit .gitlab-ci.yml and verify:
- All stages run
- Tests pass
- Artifacts created
- Deploy works

## Output

- `.gitlab-ci.yml` at project root
- CI/CD variables documented
- Pipeline running on push

## Best Practices Applied

1. Cache dependencies for speed
2. Use `needs` for parallel execution
3. Separate lint/test/build stages
4. Manual deploy to production
5. Protected variables for secrets
6. Artifact expiration set
