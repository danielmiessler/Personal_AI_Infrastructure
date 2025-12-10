# DeployApplication Workflow

Deploy application to Cloudflare Pages or Workers.

## Inputs

- **project_type**: `pages` | `worker`
- **project_name**: Name of the project
- **environment** (optional): production | preview

## Steps

### For Pages Deployment

#### 1. Build Application

Run the build command from package.json:
```bash
npm run build
```

Verify build output exists (typically `dist/` or `out/`).

#### 2. Deploy to Pages

**Via MCP tool:**
```
create_pages_deployment:
  project_name: "{{project_name}}"
  branch: "main"  # or preview branch
```

**Via wrangler:**
```bash
npx wrangler pages deploy ./dist --project-name {{project_name}}
```

#### 3. Verify Deployment

Check deployment status via MCP:
```
list_pages_deployments:
  project_name: "{{project_name}}"
  environment: "production"
```

### For Worker Deployment

#### 1. Validate Configuration

Ensure wrangler.toml has:
- `name` - Worker name
- `main` - Entry point
- `compatibility_date` - API version

#### 2. Deploy Worker

**Via wrangler:**
```bash
npx wrangler deploy
```

**Via MCP tool:**
```
create_worker:
  script_name: "{{project_name}}"
  script_content: "{{bundled_code}}"
  compatibility_date: "2024-01-01"
  bindings: [...]  # D1, KV, R2 bindings
```

#### 3. Configure Routes (if needed)

```
create_worker_route:
  zone_id: "{{zone_id}}"
  pattern: "api.example.com/*"
  script_name: "{{project_name}}"
```

#### 4. Set Up Cron Triggers (if needed)

```
update_worker_cron_triggers:
  script_name: "{{project_name}}"
  cron_expressions: ["0 * * * *"]
```

### 3. Post-Deployment

#### Verify Deployment
- Pages: Visit `{{project_name}}.pages.dev`
- Workers: Visit route or `{{project_name}}.workers.dev`

#### Monitor Logs
```bash
npx wrangler tail
```

#### Rollback (if needed)
- Pages: Use dashboard to rollback
- Workers: Redeploy previous version

## CI/CD Integration

### GitLab CI Example
```yaml
deploy:
  stage: deploy
  script:
    - npm ci
    - npm run build
    - npx wrangler pages deploy ./dist --project-name $PROJECT_NAME
  only:
    - main
  variables:
    CLOUDFLARE_API_TOKEN: $CF_API_TOKEN
    CLOUDFLARE_ACCOUNT_ID: $CF_ACCOUNT_ID
```

### GitHub Actions Example
```yaml
- name: Deploy to Cloudflare Pages
  uses: cloudflare/pages-action@v1
  with:
    apiToken: ${{ secrets.CF_API_TOKEN }}
    accountId: ${{ secrets.CF_ACCOUNT_ID }}
    projectName: my-project
    directory: dist
```

## Output

- Deployment triggered
- Deployment URL returned
- Status verified

## Troubleshooting

**Build fails:**
- Check build command in wrangler.toml
- Verify all dependencies installed
- Check for TypeScript errors

**Deployment fails:**
- Verify API token permissions
- Check account ID is correct
- Review wrangler logs

**Routes not working:**
- Verify zone ID is correct
- Check route pattern syntax
- Ensure Worker is deployed

## MCP Tools Used

- `create_pages_deployment` (Pages)
- `list_pages_deployments` (verification)
- `create_worker` (Workers)
- `create_worker_route` (Workers)
- `update_worker_cron_triggers` (Workers)
