# Asset Management

**Registry of your digital assets, websites, and deployment configurations.**

This file helps your AI understand your digital properties and how to deploy to them correctly.

---

## Websites

### [Site Name]
- **URL:** https://example.com
- **Type:** [Blog / App / API / Landing Page]
- **Framework:** [Next.js / Astro / Hugo / etc.]
- **Hosting:** [Vercel / Cloudflare / AWS / etc.]
- **Repository:** [GitHub URL]
- **Deploy Command:** `[e.g., npm run deploy]`
- **Environment:** [Production / Staging]

### [Another Site]
- **URL:** https://another.example.com
- **Type:** [Type]
- **Framework:** [Framework]
- **Hosting:** [Host]
- **Repository:** [URL]
- **Deploy Command:** `[command]`

---

## Domains

| Domain | Registrar | Expiry | DNS Provider | Notes |
|--------|-----------|--------|--------------|-------|
| example.com | [Registrar] | [Date] | [Cloudflare/etc] | Primary domain |
| example.org | [Registrar] | [Date] | [Provider] | Redirect to .com |

---

## APIs & Services

### [Service Name]
- **URL:** https://api.example.com
- **Type:** REST / GraphQL
- **Auth:** API Key / OAuth / JWT
- **Documentation:** [URL]
- **Rate Limits:** [Limits]

---

## Cloud Resources

### AWS
- **Account ID:** [ID - last 4 digits only for security]
- **Region:** [Primary region]
- **Key Services:** [S3, Lambda, etc.]

### Cloudflare
- **Account:** [Email]
- **Workers:** [List of workers]
- **Pages:** [List of Pages projects]

### Other
- [Service]: [Brief description]

---

## Repositories

| Repository | Purpose | Visibility | Branch Strategy |
|------------|---------|------------|-----------------|
| [repo-name] | [Purpose] | Public/Private | main + feature branches |

---

## Deployment Checklist

Before deploying to any asset:

1. [ ] Verify correct repository (`git remote -v`)
2. [ ] Check branch (should be main/production)
3. [ ] Run tests locally
4. [ ] Review changes
5. [ ] Deploy to staging first (if available)
6. [ ] Verify deployment succeeded
7. [ ] Check live site

---

## Environment Variables

*Store actual values in `.env` files, not here*

| Variable | Purpose | Where Used |
|----------|---------|------------|
| `API_KEY` | External service auth | Backend |
| `DATABASE_URL` | Database connection | Backend |

---

## Backup Strategy

| Asset | Backup Method | Frequency | Location |
|-------|---------------|-----------|----------|
| [Site DB] | [Method] | Daily | [Location] |
| [Code] | Git | Continuous | GitHub |

---

*This file is private. Keep sensitive credentials in `.env` files, not here.*
