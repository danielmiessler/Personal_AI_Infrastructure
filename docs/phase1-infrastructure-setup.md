# Phase 1 Infrastructure Setup - December 2025

## Repository Locations

### PAI (Personal AI Infrastructure)
- **Path**: `~/src/pai/Personal_AI_Infrastructure`
- **Remote**: `github.com:banjoey/Personal_AI_Infrastructure.git`
- **Branches**:
  - `joey-all` - Personal/home computer branch
  - `forge-all` - Work/day job branch
  - `main` - Upstream (Miessler's original)
- **Purpose**: Charles (PAI) core infrastructure, skills, hooks, commands

### Cloudflare MCP Server
- **Path**: `~/src/cloudflare_mcp`
- **Remotes**:
  - `origin`: `github.com:banjoey/cloudflare_mcp.git`
  - `gitlab`: `gitlab.com:mikmattley/cloudflare-mcp.git`
- **Branch**: `main`
- **Purpose**: MCP server exposing Cloudflare platform as tools

### FORGE (Working Directory)
- **Path**: `~/src/FORGE`
- **Note**: This is a working/development directory, NOT the main repo
- **Skills here should be copied to PAI repo before committing**

## Environment Configuration

### ~/.config/.env
Contains all sensitive tokens:
```bash
export CF_API_TOKEN="..."
export CF_ACCOUNT_ID="..."
export CLOUDFLARE_MCP_PATH="$HOME/src/cloudflare_mcp"
export GITLAB_TOKEN="..."
```

### MCP Server Configuration
Located in PAI: `.claude/.mcp.json`
- Cloudflare MCP: Uses `CLOUDFLARE_MCP_PATH` env var
- GitLab MCP: Uses official `@modelcontextprotocol/server-gitlab`

## Skills Created (Phase 1)

### Cloudflare Skill
- **Location**: `.claude/skills/Cloudflare/`
- **Type**: Foundational (platform)
- **Workflows**: CreateProject, SetupD1Database, DeployApplication, ConfigureDomain
- **Knowledge**: API reference, methodology

### GitLab Skill
- **Location**: `.claude/skills/GitLab/`
- **Type**: Foundational (platform)
- **Workflows**: CreatePipeline, ScheduledJobs, DeployToCloudflare
- **Knowledge**: CI/CD methodology

## Cloudflare MCP Tools (v2.0.0)

51+ tools covering:
- **DNS**: list_zones, list_dns_records, create_dns_record, etc.
- **Pages**: list_pages_projects, create_pages_project, create_pages_deployment, etc.
- **Workers**: list_workers, create_worker, create_worker_route, etc.
- **D1**: list_d1_databases, create_d1_database, query_d1_database, get_d1_schema
- **KV**: list_kv_namespaces, list_kv_keys, get_kv_value, put_kv_value, bulk_write_kv
- **R2**: list_r2_buckets, create_r2_bucket, configure_r2_cors, create_r2_api_token
- **Security**: list_waf_rules, create_security_rule, purge_cache

## GitLab Configuration

- **Instance**: gitlab.com (not self-hosted)
- **Namespace**: mikmattley
- **Token Scopes Needed**: api, read_repository, write_repository

## Workflow for Future Development

1. **Skills**: Create in FORGE, copy to PAI, commit to both branches
2. **Cloudflare MCP**: Develop in ~/src/cloudflare_mcp, push to both GitHub and GitLab
3. **Branch Strategy**:
   - `joey-all`: Personal projects, home computer
   - `forge-all`: Work projects, work computer
   - Both get platform skills (Cloudflare, GitLab)
   - Domain-specific skills may only go to one branch

## Phase 2 Planned

- Content Publishing skill (uses Cloudflare + GitLab skills)
- Migrate pispycameras.com to Cloudflare Pages
- Quarterly content planning workflow

---

**Created**: 2025-12-09
**Session**: Phase 1 skill architecture implementation
