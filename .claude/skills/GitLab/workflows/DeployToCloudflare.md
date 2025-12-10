# DeployToCloudflare Workflow

Set up GitLab CI/CD pipeline to deploy to Cloudflare Pages or Workers.

## Inputs

- **deploy_type**: pages | worker
- **project_name**: Cloudflare project/worker name
- **build_command**: Build command (e.g., npm run build)
- **output_dir**: Build output directory (e.g., dist)

## Steps

### 1. Configure CI/CD Variables

Add these variables in GitLab (Settings → CI/CD → Variables):

| Variable | Value | Options |
|----------|-------|---------|
| `CF_API_TOKEN` | Your Cloudflare API token | Protected, Masked |
| `CF_ACCOUNT_ID` | Your Cloudflare account ID | Protected |

### 2. Add Pipeline Configuration

#### Deploy to Pages
```yaml
stages:
  - build
  - deploy

build:
  stage: build
  image: node:20
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour

deploy-pages:
  stage: deploy
  image: node:20
  script:
    - npm install -g wrangler
    - wrangler pages deploy ${OUTPUT_DIR} --project-name ${PROJECT_NAME}
  variables:
    CLOUDFLARE_API_TOKEN: $CF_API_TOKEN
    CLOUDFLARE_ACCOUNT_ID: $CF_ACCOUNT_ID
    PROJECT_NAME: "my-site"
    OUTPUT_DIR: "dist"
  environment:
    name: production
    url: https://my-site.pages.dev
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

#### Deploy to Workers
```yaml
stages:
  - build
  - deploy

build:
  stage: build
  image: node:20
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour

deploy-worker:
  stage: deploy
  image: node:20
  script:
    - npm install -g wrangler
    - wrangler deploy
  variables:
    CLOUDFLARE_API_TOKEN: $CF_API_TOKEN
    CLOUDFLARE_ACCOUNT_ID: $CF_ACCOUNT_ID
  environment:
    name: production
    url: https://my-worker.workers.dev
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

### 3. Add Preview Deployments

For merge request previews:

```yaml
deploy-preview:
  stage: deploy
  image: node:20
  script:
    - npm install -g wrangler
    - wrangler pages deploy dist --project-name ${PROJECT_NAME} --branch ${CI_COMMIT_REF_NAME}
  variables:
    CLOUDFLARE_API_TOKEN: $CF_API_TOKEN
    CLOUDFLARE_ACCOUNT_ID: $CF_ACCOUNT_ID
    PROJECT_NAME: "my-site"
  environment:
    name: preview/$CI_COMMIT_REF_NAME
    url: https://${CI_COMMIT_REF_SLUG}.my-site.pages.dev
    on_stop: stop-preview
  rules:
    - if: $CI_MERGE_REQUEST_ID

stop-preview:
  stage: deploy
  script:
    - echo "Preview environment stopped"
  environment:
    name: preview/$CI_COMMIT_REF_NAME
    action: stop
  rules:
    - if: $CI_MERGE_REQUEST_ID
      when: manual
```

### 4. Full Production Pipeline

Complete pipeline with all stages:

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

test:
  stage: test
  script:
    - npm test
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
  script:
    - npm install -g wrangler
    - wrangler pages deploy dist --project-name ${PROJECT_NAME} --branch staging
  variables:
    CLOUDFLARE_API_TOKEN: $CF_API_TOKEN
    CLOUDFLARE_ACCOUNT_ID: $CF_ACCOUNT_ID
    PROJECT_NAME: "my-site"
  environment:
    name: staging
    url: https://staging.my-site.pages.dev
  needs:
    - build
    - test
  rules:
    - if: $CI_COMMIT_BRANCH == "develop"

deploy-production:
  stage: deploy
  script:
    - npm install -g wrangler
    - wrangler pages deploy dist --project-name ${PROJECT_NAME}
  variables:
    CLOUDFLARE_API_TOKEN: $CF_API_TOKEN
    CLOUDFLARE_ACCOUNT_ID: $CF_ACCOUNT_ID
    PROJECT_NAME: "my-site"
  environment:
    name: production
    url: https://my-site.pages.dev
  needs:
    - build
    - test
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual
```

## Cloudflare Token Permissions

For Pages deployment, token needs:
- Cloudflare Pages:Edit
- Account:Account Settings:Read

For Workers deployment, add:
- Workers Scripts:Edit
- D1:Edit (if using D1)
- Workers KV Storage:Edit (if using KV)
- Workers R2 Storage:Edit (if using R2)

## Output

- `.gitlab-ci.yml` configured for Cloudflare deployment
- CI/CD variables set securely
- Preview deployments for MRs
- Production deployment on main branch

## Troubleshooting

**"Authentication error"**
- Verify CF_API_TOKEN is set correctly
- Check token permissions
- Ensure variable is not masked (can cause issues)

**"Project not found"**
- Verify project name matches Cloudflare
- Check CF_ACCOUNT_ID is correct
- Ensure Pages project exists

**"Build failed"**
- Check build command
- Verify output directory exists
- Review build logs for errors
