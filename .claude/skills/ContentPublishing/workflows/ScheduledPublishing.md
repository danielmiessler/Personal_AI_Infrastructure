# ScheduledPublishing Workflow

Set up GitLab CI scheduled pipelines to publish content at specific times.

## Trigger Phrases
- "schedule this post for"
- "publish on [date]"
- "set up scheduled publishing"
- "automate content release"

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| article_path | Yes | Path to the article to schedule |
| publish_date | Yes | Target publish date (YYYY-MM-DD) |
| publish_time | No | Target time (HH:MM UTC, default: 09:00) |
| gitlab_project | Yes | GitLab project for the content repo |

## Workflow Steps

### Step 1: Prepare Article for Scheduling

Move article to scheduled location with metadata:

```bash
# Article structure for scheduling
content/
├── blog/
│   └── scheduled/
│       └── 2025-01-15_article-slug/
│           ├── index.md
│           └── images/
```

**Frontmatter for scheduled posts**:
```yaml
---
title: "Article Title"
description: "Meta description"
date: 2025-01-15T09:00:00Z  # Exact publish time
scheduled: true              # Flag for CI to check
publish_at: "2025-01-15"    # Human-readable date
draft: false
---
```

### Step 2: GitLab CI Configuration

**Using GitLab skill** - Create or update `.gitlab-ci.yml`:

```yaml
stages:
  - check
  - publish
  - deploy

variables:
  CONTENT_DIR: "content/blog/scheduled"

# Check for articles due for publishing
check:scheduled:
  stage: check
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
  script:
    - |
      TODAY=$(date +%Y-%m-%d)
      echo "Checking for articles scheduled for $TODAY"

      # Find articles scheduled for today
      for dir in $CONTENT_DIR/*/; do
        if [[ -d "$dir" ]]; then
          SCHEDULED_DATE=$(basename "$dir" | cut -d'_' -f1)
          if [[ "$SCHEDULED_DATE" == "$TODAY" ]]; then
            echo "PUBLISH_ARTICLE=$dir" >> publish.env
            echo "Found article to publish: $dir"
          fi
        fi
      done
  artifacts:
    reports:
      dotenv: publish.env

# Move scheduled article to published location
publish:article:
  stage: publish
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
  needs:
    - job: check:scheduled
      artifacts: true
  script:
    - |
      if [[ -n "$PUBLISH_ARTICLE" ]]; then
        SLUG=$(basename "$PUBLISH_ARTICLE" | cut -d'_' -f2-)
        MONTH=$(date +%m-%B | tr '[:upper:]' '[:lower:]')
        YEAR=$(date +%Y)

        TARGET="content/blog/$YEAR/$MONTH/$SLUG"

        # Move to published location
        mkdir -p "content/blog/$YEAR/$MONTH"
        mv "$PUBLISH_ARTICLE" "$TARGET"

        # Update frontmatter - remove scheduled flag
        sed -i 's/scheduled: true/scheduled: false/' "$TARGET/index.md"

        # Commit changes
        git config user.email "ci@example.com"
        git config user.name "GitLab CI"
        git add .
        git commit -m "Scheduled publish: $SLUG"
        git push origin HEAD:main

        echo "Published: $SLUG"
      else
        echo "No articles scheduled for today"
      fi

# Trigger Cloudflare Pages rebuild
deploy:pages:
  stage: deploy
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
  needs:
    - job: publish:article
  script:
    - |
      # Trigger Cloudflare Pages deploy hook (if configured)
      if [[ -n "$CF_DEPLOY_HOOK" ]]; then
        curl -X POST "$CF_DEPLOY_HOOK"
        echo "Triggered Cloudflare Pages deploy"
      fi
```

### Step 3: Create GitLab Schedule

**Using GitLab skill** - Create scheduled pipeline:

```bash
# GitLab API call to create schedule
curl --request POST \
  --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  --form "description=Daily content publish check" \
  --form "ref=main" \
  --form "cron=0 9 * * *" \
  --form "cron_timezone=UTC" \
  --form "active=true" \
  "https://gitlab.com/api/v4/projects/$PROJECT_ID/pipeline_schedules"
```

**Schedule options**:
| Frequency | Cron | Description |
|-----------|------|-------------|
| Daily 9am UTC | `0 9 * * *` | Check every day |
| Weekdays only | `0 9 * * 1-5` | Skip weekends |
| Weekly Monday | `0 9 * * 1` | Weekly publish |

### Step 4: Verify Schedule

Confirm the schedule is active:

```bash
# List pipeline schedules
curl --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "https://gitlab.com/api/v4/projects/$PROJECT_ID/pipeline_schedules"
```

## Output

- Article moved to scheduled directory
- GitLab CI pipeline configured
- Scheduled pipeline created
- Confirmation of publish date/time

## Alternative: Simple Approach

For simpler setups without CI:

1. **Draft flag method**:
   - Keep article with `draft: true`
   - Use scheduled pipeline to flip to `draft: false`
   - Push change to trigger deploy

2. **Date-based visibility**:
   - Set future `date` in frontmatter
   - Configure static site generator to hide future-dated posts
   - Posts appear automatically when date arrives

## Integration Points

- **GitLab skill**: Creates/manages pipeline schedules
- **Cloudflare skill**: Triggers Pages deployment
- **CreateArticle**: Prepares articles for scheduling

## Monitoring

Track scheduled publishes:

```bash
# View upcoming scheduled articles
ls -la content/blog/scheduled/

# Check pipeline schedule runs
curl --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "https://gitlab.com/api/v4/projects/$PROJECT_ID/pipeline_schedules/$SCHEDULE_ID/pipelines"
```

## Tips

1. **Time zones**: Always use UTC in automation
2. **Buffer time**: Schedule for 9am, not midnight (allows morning fixes)
3. **Test first**: Run pipeline manually before relying on schedule
4. **Notifications**: Set up GitLab notifications for pipeline failures
5. **Backup plan**: Know how to publish manually if automation fails
