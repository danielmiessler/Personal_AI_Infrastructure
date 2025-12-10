# Cloudflare Methodology

## Platform Philosophy

Cloudflare provides edge computing - code runs close to users worldwide. This fundamentally changes how you architect applications:

1. **Edge-First Design** - Compute happens at 300+ data centers, not one origin
2. **Stateless by Default** - Workers are stateless; use D1/KV/R2 for state
3. **Global Distribution** - Automatic, no configuration needed
4. **Cost Efficiency** - Pay for what you use, generous free tiers

## Service Selection Guide

### When to Use Each Service

**Pages** - Static sites, JAMstack, SSR frameworks (Astro, Next.js, SvelteKit)
- Best for: Marketing sites, blogs, documentation, SPAs
- Build: Astro, Hugo, Next.js, or any static generator
- Features: Preview deployments, branch deploys, environment variables

**Workers** - API endpoints, edge functions, request transformation
- Best for: APIs, authentication, data transformation, webhooks
- Language: JavaScript/TypeScript (compiled to V8 isolates)
- Limits: 50MB script size, 128MB memory, configurable CPU time

**D1** - Relational data, SQL queries, ACID transactions
- Best for: User data, application state, relational queries
- Engine: SQLite (serverless, distributed)
- Limits: 2GB per database (free tier), 10GB (paid)

**KV** - High-read, low-write key-value data
- Best for: Configuration, feature flags, session data, caching
- Consistency: Eventually consistent (reads may be stale)
- Speed: Extremely fast reads from edge

**R2** - Large files, object storage, S3-compatible
- Best for: Images, videos, backups, user uploads
- Features: S3 API compatibility, no egress fees
- Access: Via Worker binding or public URL

## Architecture Patterns

### Pattern 1: Static Site with API

```
Pages (frontend) → Worker (API) → D1 (database)
```

### Pattern 2: Full-Stack Application

```
Pages (SSR) → Workers (edge logic) → D1 + KV + R2
```

### Pattern 3: Microservices

```
Worker A → Worker B (service binding)
         → D1 (shared state)
         → KV (shared cache)
```

## Wrangler CLI Reference

### Project Setup
```bash
# Create new Workers project
npx wrangler init my-worker

# Create new Pages project
npx wrangler pages project create my-site

# Login to Cloudflare
npx wrangler login
```

### D1 Database
```bash
# Create database
npx wrangler d1 create my-database

# Run migrations
npx wrangler d1 migrations apply my-database

# Execute SQL
npx wrangler d1 execute my-database --command "SELECT * FROM users"

# Export database
npx wrangler d1 export my-database --output backup.sql
```

### KV Namespace
```bash
# Create namespace
npx wrangler kv:namespace create "MY_KV"

# List keys
npx wrangler kv:key list --namespace-id <id>

# Put value
npx wrangler kv:key put --namespace-id <id> "key" "value"

# Get value
npx wrangler kv:key get --namespace-id <id> "key"
```

### R2 Bucket
```bash
# Create bucket
npx wrangler r2 bucket create my-bucket

# Upload file
npx wrangler r2 object put my-bucket/path/file.txt --file ./local-file.txt

# Download file
npx wrangler r2 object get my-bucket/path/file.txt --file ./downloaded.txt
```

### Deployment
```bash
# Deploy Worker
npx wrangler deploy

# Deploy Pages (from directory)
npx wrangler pages deploy ./dist

# Tail logs
npx wrangler tail
```

## wrangler.toml Configuration

### Basic Worker with Bindings
```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# D1 Database binding
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# KV Namespace binding
[[kv_namespaces]]
binding = "KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# R2 Bucket binding
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "my-bucket"

# Environment variables
[vars]
ENVIRONMENT = "production"

# Secrets (set via wrangler secret put)
# SECRET_KEY = "..." # Don't put secrets in toml!

# Cron triggers
[triggers]
crons = ["0 * * * *", "0 0 * * *"]
```

### Pages Configuration (wrangler.toml)
```toml
name = "my-site"
pages_build_output_dir = "./dist"

# Functions configuration (for Pages Functions)
[build]
command = "npm run build"
```

## Common Patterns

### Worker with D1
```typescript
export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { results } = await env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(1).all();

    return Response.json(results);
  },
};
```

### Worker with KV
```typescript
export interface Env {
  KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Get with cache
    const value = await env.KV.get("key");

    // Put with TTL (1 hour)
    await env.KV.put("key", "value", { expirationTtl: 3600 });

    return new Response(value);
  },
};
```

### Worker with R2
```typescript
export interface Env {
  BUCKET: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Get object
    const object = await env.BUCKET.get("path/to/file.txt");
    if (!object) return new Response("Not found", { status: 404 });

    // Return object with headers
    return new Response(object.body, {
      headers: {
        "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
      },
    });
  },
};
```

## Troubleshooting

### Common Issues

**"Workers Script Startup Exceeded CPU Limit"**
- Move heavy initialization to lazy loading
- Use `waitUntil()` for non-blocking operations

**"KV read returned stale data"**
- KV is eventually consistent
- For strong consistency, use D1 instead

**"D1 query timed out"**
- Add indexes for frequently queried columns
- Limit result sets with LIMIT clause
- Consider splitting large queries

**"Pages build failed"**
- Check build command in dashboard
- Verify build output directory
- Check for missing dependencies

### Debugging

```bash
# View real-time logs
npx wrangler tail

# View deployment logs
npx wrangler pages deployment list

# Check Worker status
npx wrangler whoami
```

## Best Practices

1. **Use TypeScript** - Better tooling, type safety
2. **Environment Variables** - Never hardcode secrets
3. **Structured Logging** - Use console.log with JSON for searchability
4. **Error Handling** - Always return proper HTTP status codes
5. **Rate Limiting** - Implement at Worker level for APIs
6. **Caching** - Use KV or Cache API for repeated computations
7. **Database Indexes** - Critical for D1 performance
8. **Migrations** - Use wrangler migrations for schema changes
