# AuditMcp Workflow

**Purpose:** Audit MCP configuration for issues, sprawl, and missing requirements.

## Execution Steps

1. **Check global MCPs**
   ```bash
   cat ~/.claude/.mcp.json
   ```
   - Warn if more than Joplin + GitLab are global
   - These should be minimal

2. **Check project MCPs**
   ```bash
   cat .mcp.json 2>/dev/null
   ```
   - List what's configured
   - Verify each has a matching template

3. **Verify required env vars**
   - For each configured MCP (global + project)
   - Check that required env vars exist in `~/.config/.env`
   - Report any missing

4. **Check for orphaned configs**
   - MCPs in project that aren't in templates (custom/unknown)
   - MCPs that might be duplicated between global and project

5. **Suggest improvements**
   - MCPs that should be project-level but are global
   - Missing MCPs that might be useful based on project type

## Audit Report Format

```
=== MCP AUDIT REPORT ===

✓ Global MCPs: OK (2 configured: joplin, gitlab)

✓ Project MCPs: 1 configured
  - unifi: OK

⚠ Environment Variables:
  - CLOUDFLARE_MCP_PATH: MISSING (needed if you add cloudflare)

✓ No orphaned configurations

Suggestions:
  - This appears to be an infrastructure project
  - Consider adding: cloudflare (if managing DNS/Pages)
```

## Common Issues

### Too Many Global MCPs
```
⚠ Global MCPs: 5 configured (recommend max 2)
  - joplin: OK (should be global)
  - gitlab: OK (should be global)
  - cloudflare: Should be project-level
  - brightdata: Should be project-level
  - playwright: Should be project-level

Action: Move cloudflare, brightdata, playwright to project-level configs
```

### Missing Env Vars
```
✗ Environment Variables:
  - UNIFI_PASSWORD: MISSING
  - BRIGHTDATA_API_KEY: MISSING

Action: Add missing vars to ~/.config/.env
```

### Unknown MCP
```
⚠ Unknown MCP in project config: custom-server
  - Not found in templates
  - Consider creating a template if reusable

Action: Create template or document custom config
```

## Notes

- Run this periodically to prevent MCP sprawl
- Global MCPs load every session (performance impact)
- Missing env vars cause silent failures
