# PAI Session Context

Last updated: 2025-12-09

## Repository Locations

| Repo | Path | Purpose |
|------|------|---------|
| PAI (Private) | `~/src/pai/Personal_AI_Infrastructure` | Personal AI Infrastructure - skills, config, history |
| FORGE | `~/src/FORGE` | Work project directory |
| Cloudflare MCP | `~/src/cloudflare_mcp` | Extended Cloudflare MCP server (51+ tools) |

## Branch Strategy

| Branch | Purpose | Use For |
|--------|---------|---------|
| `joey-all` | Personal branch | Personal projects, experiments |
| `forge-all` | Work branch | Day job related work |

**Workflow**: Commit to `joey-all` first, then `git cherry-pick` to `forge-all` for shared code.

## Environment Configuration

All sensitive data in `~/.config/.env`:
```bash
CF_API_TOKEN        # Cloudflare API token
CF_ACCOUNT_ID       # Cloudflare account ID
CLOUDFLARE_MCP_PATH # Path to cloudflare_mcp repo
GITLAB_TOKEN        # GitLab API token (mikmattley namespace)
```

## Skills Created (Phase 1)

### Foundational Skills
- **Cloudflare** - Pages, Workers, D1, KV, R2 platform knowledge
- **GitLab** - CI/CD pipelines, scheduled jobs, deployment automation

### Workflow Skills
- **ContentPublishing** - Content lifecycle (planning, writing, scheduling, analytics)
  - Composes Cloudflare + GitLab skills
  - Workflows: QuarterlyPlan, CreateArticle, ScheduledPublishing, ReviewPerformance

## MCP Servers

Cloudflare MCP extended with:
- 10 Workers tools
- 7 D1 database tools
- 9 KV storage tools
- 9 R2 storage tools

GitLab hosted at: `gitlab.com:mikmattley/cloudflare-mcp.git`

## Next Steps (Phase 2)

1. Security workflow skill (if needed)
2. BMAD Orchestrator skill
3. Test ContentPublishing workflows with real content

## Quick Commands

```bash
# Switch to PAI repo
cd ~/src/pai/Personal_AI_Infrastructure

# Check branch
git branch

# Commit to both branches
git add . && git commit -m "message"
git checkout forge-all && git cherry-pick <hash>
git push origin joey-all forge-all
git checkout joey-all
```
