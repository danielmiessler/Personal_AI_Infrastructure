# ConfigureDomain Workflow

Configure custom domain for Cloudflare Pages or Workers.

## Inputs

- **domain**: The custom domain (e.g., example.com, app.example.com)
- **project_name**: Pages project or Worker name
- **project_type**: `pages` | `worker`

## Steps

### 1. Verify Zone Exists

Check if domain is managed by Cloudflare:
```
list_zones
```

Look for the root domain. If not found, zone must be added first.

### 2. Get Zone ID

From the zone list, extract the zone_id for the domain.

### For Pages

#### 3a. Add Domain to Pages Project

```
add_pages_domain:
  project_name: "{{project_name}}"
  domain_name: "{{domain}}"
```

This returns validation instructions.

#### 4a. Verify Domain Ownership

Cloudflare automatically handles verification for domains in your account.

For external domains, add the TXT record:
```
create_dns_record:
  zone_id: "{{zone_id}}"
  type: "TXT"
  name: "{{validation_name}}"
  content: "{{validation_value}}"
```

#### 5a. Check Domain Status

```
list_pages_domains:
  project_name: "{{project_name}}"
```

Wait for status to show "active".

### For Workers

#### 3b. Create DNS Record

For Workers, create a CNAME or route:

**Option A: CNAME to workers.dev**
```
create_dns_record:
  zone_id: "{{zone_id}}"
  type: "CNAME"
  name: "api"
  content: "{{worker_name}}.workers.dev"
  proxied: true
```

**Option B: Route Pattern**
```
create_worker_route:
  zone_id: "{{zone_id}}"
  pattern: "api.example.com/*"
  script_name: "{{worker_name}}"
```

### 4. Configure SSL

SSL is automatic for proxied domains. Verify settings:
```
get_zone_settings
```

Ensure SSL mode is "Full" or "Full (Strict)".

### 5. Verify Configuration

Test the domain:
- Pages: Visit https://{{domain}}
- Worker: Visit https://{{domain}}/test-endpoint

## DNS Record Examples

### Root Domain (apex)
```
Type: A
Name: @
Content: 192.0.2.1  (Cloudflare anycast)
Proxied: Yes
```

### Subdomain
```
Type: CNAME
Name: www
Content: {{project_name}}.pages.dev
Proxied: Yes
```

### Multiple Subdomains
```
# API
Type: CNAME
Name: api
Content: api-worker.workers.dev
Proxied: Yes

# App
Type: CNAME
Name: app
Content: app-project.pages.dev
Proxied: Yes
```

## Common Configurations

### Apex + WWW to Pages
```
# Apex
add_pages_domain: example.com

# WWW redirect (in Pages settings or via redirect rule)
```

### API Subdomain to Worker
```
create_worker_route:
  pattern: "api.example.com/*"
  script_name: "api-worker"
```

### Wildcard Subdomain
```
create_worker_route:
  pattern: "*.api.example.com/*"
  script_name: "multi-tenant-api"
```

## Output

- Domain added to project
- DNS records configured
- SSL provisioned
- Domain active and accessible

## Troubleshooting

**Domain shows "pending":**
- DNS propagation takes time (up to 24h)
- Verify CNAME/A record is correct
- Check nameservers are Cloudflare

**SSL errors:**
- Ensure domain is proxied (orange cloud)
- Check SSL mode matches origin
- Wait for certificate provisioning

**404 errors:**
- Verify route pattern matches request
- Check Pages build output
- Confirm Worker is deployed

## MCP Tools Used

- `list_zones`
- `list_dns_records`
- `create_dns_record`
- `add_pages_domain` (Pages)
- `create_worker_route` (Workers)
- `get_zone_settings`
