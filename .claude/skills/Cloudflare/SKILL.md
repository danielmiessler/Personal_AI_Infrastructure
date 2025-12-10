---
name: Cloudflare
description: Cloudflare platform knowledge and operations. USE WHEN user needs to deploy to Cloudflare Pages, manage Workers, set up D1 databases, configure KV storage, use R2 object storage, manage DNS, or configure WAF rules. Foundational skill for all Cloudflare services.
---

# Cloudflare

Foundational platform skill providing knowledge and workflows for all Cloudflare services.

## Workflow Routing

| Workflow | When to Use | Output |
|----------|-------------|--------|
| CreateProject | Setting up new Pages or Workers project | Project scaffold with deployment config |
| SetupD1Database | Need SQLite database for application | D1 database with schema and migrations |
| ConfigureStorage | Need KV or R2 storage | Storage setup with Worker bindings |
| DeployApplication | Deploy to Cloudflare | Deployment via wrangler or CI/CD |
| ConfigureDomain | Custom domain setup | DNS records, SSL, custom domain config |
| DebugDeployment | Troubleshooting deployments | Logs, traces, common issue diagnosis |

## Examples

### Example 1: Deploy a static site to Pages
```
User: "Deploy this Astro site to Cloudflare Pages"
Skill loads: Cloudflare → CreateProject workflow
Output: Pages project created, build settings configured, deployment triggered
```

### Example 2: Create a D1 database
```
User: "I need a database for my app"
Skill loads: Cloudflare → SetupD1Database workflow
Output: D1 database created, schema applied, Worker binding configured
```

### Example 3: Set up KV for caching
```
User: "Set up KV storage for session data"
Skill loads: Cloudflare → ConfigureStorage workflow
Output: KV namespace created, TTL configured, Worker binding ready
```

### Example 4: Configure custom domain
```
User: "Point mysite.com to my Pages project"
Skill loads: Cloudflare → ConfigureDomain workflow
Output: DNS records created, SSL provisioned, domain verified
```

## Services Covered

### Pages (Static Sites & SSR)
- Project creation and deployment
- Build configuration
- Custom domains
- Environment variables
- Preview deployments

### Workers (Serverless Functions)
- Script deployment
- Route configuration
- Cron triggers (scheduled)
- Bindings (KV, D1, R2)
- Durable Objects

### D1 (SQLite Database)
- Database creation
- Schema management
- Migrations
- Query execution
- Backups and exports

### KV (Key-Value Storage)
- Namespace management
- Key operations (get, put, delete)
- TTL and expiration
- Bulk operations

### R2 (Object Storage)
- Bucket management
- CORS configuration
- Public access
- S3-compatible API tokens

### DNS & Security
- Zone management
- DNS record CRUD
- WAF rules
- SSL certificates
- Cache management

## MCP Tools Available

When the Cloudflare MCP server is configured, these tools are available:

**Pages:** list_pages_projects, create_pages_project, create_pages_deployment, add_pages_domain
**Workers:** list_workers, create_worker, list_worker_routes, create_worker_route, update_worker_cron_triggers
**D1:** list_d1_databases, create_d1_database, query_d1_database, get_d1_schema
**KV:** list_kv_namespaces, create_kv_namespace, list_kv_keys, get_kv_value, put_kv_value
**R2:** list_r2_buckets, create_r2_bucket, configure_r2_cors, create_r2_api_token
**DNS:** list_zones, list_dns_records, create_dns_record, update_dns_record
**Security:** list_waf_rules, create_security_rule, purge_cache

## Integration

- Works with GitLab skill (CI/CD pipelines for deployment)
- Works with Content Publishing skill (scheduled publishing)
- Works with Security skill (WAF configuration)
- Provides bindings for D1, KV, R2 to Workers

## Cost Optimization

Free tier limits (stay within these for hobby projects):
- **Pages:** 500 builds/month, unlimited sites
- **Workers:** 100,000 requests/day, 10ms CPU/request
- **D1:** 5M rows read/day, 100K rows written/day
- **KV:** 100K reads/day, 1K writes/day
- **R2:** 10GB storage, 1M Class A ops/month
