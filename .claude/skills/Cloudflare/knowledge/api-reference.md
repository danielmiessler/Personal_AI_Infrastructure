# Cloudflare API Quick Reference

## Authentication

All API calls require authentication:
- **API Token** (preferred): `Authorization: Bearer <token>`
- **API Key** (legacy): `X-Auth-Email` + `X-Auth-Key`

## Base URL

```
https://api.cloudflare.com/client/v4
```

## Common Endpoints

### Zones
```
GET    /zones                           # List zones
GET    /zones/:zone_id                  # Get zone
GET    /zones/:zone_id/settings         # Get zone settings
PATCH  /zones/:zone_id/settings         # Update zone settings
```

### DNS
```
GET    /zones/:zone_id/dns_records      # List records
POST   /zones/:zone_id/dns_records      # Create record
PUT    /zones/:zone_id/dns_records/:id  # Update record
DELETE /zones/:zone_id/dns_records/:id  # Delete record
```

### Pages
```
GET    /accounts/:account_id/pages/projects              # List projects
POST   /accounts/:account_id/pages/projects              # Create project
GET    /accounts/:account_id/pages/projects/:name        # Get project
DELETE /accounts/:account_id/pages/projects/:name        # Delete project
POST   /accounts/:account_id/pages/projects/:name/deployments  # Deploy
GET    /accounts/:account_id/pages/projects/:name/domains      # List domains
POST   /accounts/:account_id/pages/projects/:name/domains      # Add domain
```

### Workers
```
GET    /accounts/:account_id/workers/scripts             # List workers
PUT    /accounts/:account_id/workers/scripts/:name       # Deploy worker
DELETE /accounts/:account_id/workers/scripts/:name       # Delete worker
GET    /accounts/:account_id/workers/scripts/:name/settings  # Get settings
GET    /zones/:zone_id/workers/routes                    # List routes
POST   /zones/:zone_id/workers/routes                    # Create route
```

### D1
```
GET    /accounts/:account_id/d1/database                 # List databases
POST   /accounts/:account_id/d1/database                 # Create database
GET    /accounts/:account_id/d1/database/:id             # Get database
DELETE /accounts/:account_id/d1/database/:id             # Delete database
POST   /accounts/:account_id/d1/database/:id/query       # Execute SQL
```

### KV
```
GET    /accounts/:account_id/storage/kv/namespaces       # List namespaces
POST   /accounts/:account_id/storage/kv/namespaces       # Create namespace
DELETE /accounts/:account_id/storage/kv/namespaces/:id   # Delete namespace
GET    /accounts/:account_id/storage/kv/namespaces/:id/keys      # List keys
GET    /accounts/:account_id/storage/kv/namespaces/:id/values/:key  # Get value
PUT    /accounts/:account_id/storage/kv/namespaces/:id/values/:key  # Put value
```

### R2
```
GET    /accounts/:account_id/r2/buckets                  # List buckets
POST   /accounts/:account_id/r2/buckets                  # Create bucket
GET    /accounts/:account_id/r2/buckets/:name            # Get bucket
DELETE /accounts/:account_id/r2/buckets/:name            # Delete bucket
GET    /accounts/:account_id/r2/buckets/:name/usage      # Get usage
PUT    /accounts/:account_id/r2/buckets/:name/cors       # Configure CORS
```

## Response Format

All responses follow this structure:
```json
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": { ... },
  "result_info": {
    "page": 1,
    "per_page": 20,
    "total_count": 100
  }
}
```

## Error Codes

| Code | Meaning |
|------|---------|
| 1001 | Invalid request |
| 1003 | Missing required parameter |
| 6003 | Invalid token/authentication |
| 7003 | Zone not found |
| 10000 | Resource not found |
| 10006 | Key not found (KV) |
| 10007 | Bucket not empty (R2) |

## Rate Limits

- Global: 1,200 requests per 5 minutes
- Per-zone: Varies by plan
- D1: 1,000 queries per minute

## Token Permissions

Required permissions by service:

| Service | Permission |
|---------|------------|
| DNS | Zone:DNS:Edit |
| Pages | Cloudflare Pages:Edit |
| Workers | Workers Scripts:Edit |
| D1 | D1:Edit |
| KV | Workers KV Storage:Edit |
| R2 | Workers R2 Storage:Edit |
| WAF | Firewall Services:Edit |
