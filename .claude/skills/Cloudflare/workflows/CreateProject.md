# CreateProject Workflow

Create a new Cloudflare Pages or Workers project with proper configuration.

## Inputs

- **project_type**: `pages` | `worker`
- **project_name**: Name for the project
- **framework** (Pages): astro, next, hugo, static
- **features** (optional): D1, KV, R2 bindings

## Steps

### 1. Determine Project Type

**For Pages (static/SSR sites):**
- Marketing sites, blogs, documentation
- Frameworks: Astro, Next.js, SvelteKit, Hugo
- Output: Static files or SSR functions

**For Workers (API/Edge):**
- APIs, webhooks, edge logic
- Pure JavaScript/TypeScript
- Output: Single Worker script

### 2. Create Project Structure

**Pages Project:**
```
project-name/
├── src/
│   └── pages/           # Astro/Next pages
├── public/              # Static assets
├── wrangler.toml        # Cloudflare config
├── package.json
└── README.md
```

**Worker Project:**
```
project-name/
├── src/
│   └── index.ts         # Worker entrypoint
├── wrangler.toml        # Cloudflare config
├── package.json
├── tsconfig.json
└── README.md
```

### 3. Configure wrangler.toml

Based on selected features, add bindings:

```toml
name = "{{project_name}}"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Add if D1 selected
[[d1_databases]]
binding = "DB"
database_name = "{{project_name}}-db"
database_id = "TBD"  # Set after creation

# Add if KV selected
[[kv_namespaces]]
binding = "KV"
id = "TBD"  # Set after creation

# Add if R2 selected
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "{{project_name}}-bucket"
```

### 4. Create Resources

Use MCP tools to create required resources:

1. **D1 Database** (if selected):
   - Call `create_d1_database`
   - Update wrangler.toml with database_id

2. **KV Namespace** (if selected):
   - Call `create_kv_namespace`
   - Update wrangler.toml with namespace_id

3. **R2 Bucket** (if selected):
   - Call `create_r2_bucket`
   - Update wrangler.toml with bucket_name

### 5. Initial Deployment

**Pages:**
```bash
npx wrangler pages project create {{project_name}}
npx wrangler pages deploy ./dist
```

**Workers:**
```bash
npx wrangler deploy
```

## Output

- Project directory with proper structure
- wrangler.toml configured with bindings
- Resources created (D1, KV, R2 if selected)
- Initial deployment complete
- README with setup instructions

## MCP Tools Used

- `create_pages_project` (for Pages)
- `create_worker` (for Workers)
- `create_d1_database` (if D1 selected)
- `create_kv_namespace` (if KV selected)
- `create_r2_bucket` (if R2 selected)
