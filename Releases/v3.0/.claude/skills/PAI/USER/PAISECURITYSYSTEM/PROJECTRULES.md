# Project-Specific Rules

**Special security rules for specific projects**

---

## Example: Deploy-Only Project

Use this template when a project should deploy via a specific tool (e.g., Wrangler, Vercel CLI) but never via `git push`.

### DEPLOYMENT RULES (ABSOLUTE)

| Property | Value |
|----------|-------|
| **Location** | `${PROJECTS_DIR}/my-project/` |
| **GitHub Repo** | github.com/username/my-project (PUBLIC - README only) |
| **Deployment** | Cloudflare Pages via Wrangler ONLY |
| **Source Code** | STAYS LOCAL - NEVER pushed to GitHub |

### WHY

The repo is PUBLIC. The source code contains components and configurations that should not be exposed publicly. GitHub is used ONLY for the README.

### DEPLOYMENT COMMAND (THE ONLY WAY)

```bash
cd ${PROJECTS_DIR}/my-project
bun run build
npx wrangler pages deploy dist --project-name=my-project
```

### PRE-PUSH HOOK

A pre-push hook blocks all pushes to GitHub:
- Location: `${PROJECTS_DIR}/my-project/.githooks/pre-push`
- Bypass (README updates ONLY): `git push --no-verify`

### ENFORCEMENT

1. NEVER run `git push` in the project directory
2. "Deploy" = Wrangler/Vercel/etc., NOT git push
3. The pre-push hook will block attempts, but DON'T RELY ON IT
4. If you need to update the README, use `git push --no-verify` ONLY

---

## Adding New Project Rules

When a project has special security requirements:

1. Add a section to this file
2. Document the rule clearly
3. Explain WHY the rule exists
4. Provide the CORRECT way to do things
5. Note any incidents that led to the rule
