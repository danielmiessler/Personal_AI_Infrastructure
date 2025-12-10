# ScheduledJobs Workflow

Configure scheduled pipelines for automated recurring tasks.

## Inputs

- **schedule_name**: Human-readable name
- **cron_expression**: When to run (cron format)
- **branch**: Target branch
- **variables** (optional): Pipeline variables

## Steps

### 1. Determine Schedule

Common cron expressions:
- `0 6 * * *` - Daily at 6:00 AM UTC
- `0 0 * * 1` - Weekly on Monday at midnight
- `0 0 1 * *` - Monthly on the 1st at midnight
- `*/30 * * * *` - Every 30 minutes
- `0 */4 * * *` - Every 4 hours

### 2. Add Schedule Job to Pipeline

Add job that only runs on schedule:

```yaml
scheduled-task:
  stage: deploy
  script:
    - ./run-scheduled-task.sh
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
```

### 3. Create Schedule via API

Using GitLab API or MCP tool:

```
create_schedule:
  project_id: "{{project_id}}"
  description: "{{schedule_name}}"
  ref: "{{branch}}"
  cron: "{{cron_expression}}"
  cron_timezone: "America/Los_Angeles"
  active: true
```

### 4. Add Schedule Variables (optional)

Variables specific to scheduled runs:

```
create_schedule_variable:
  schedule_id: "{{schedule_id}}"
  key: "SCHEDULED_RUN"
  value: "true"
```

## Common Patterns

### Daily Content Publishing
```yaml
publish-scheduled:
  stage: deploy
  script:
    - npm ci
    - npm run publish-scheduled
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule" && $PUBLISH_TYPE == "daily"
```

Schedule: `0 6 * * *` (6 AM daily)
Variable: `PUBLISH_TYPE=daily`

### Weekly Reports
```yaml
weekly-report:
  stage: build
  script:
    - ./generate-report.sh
    - ./send-report.sh
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule" && $REPORT_TYPE == "weekly"
```

Schedule: `0 9 * * 1` (9 AM Monday)
Variable: `REPORT_TYPE=weekly`

### Nightly Builds
```yaml
nightly-build:
  stage: build
  script:
    - npm ci
    - npm run build
    - npm run integration-tests
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule" && $BUILD_TYPE == "nightly"
```

Schedule: `0 2 * * *` (2 AM daily)
Variable: `BUILD_TYPE=nightly`

### Database Backup
```yaml
backup:
  stage: deploy
  script:
    - ./backup-database.sh
    - ./upload-to-r2.sh
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule" && $TASK == "backup"
```

Schedule: `0 3 * * *` (3 AM daily)
Variable: `TASK=backup`

### Cache Warmup
```yaml
warmup:
  stage: deploy
  script:
    - curl -X POST $WARMUP_URL
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule" && $TASK == "warmup"
```

Schedule: `0 5 * * *` (5 AM daily)

## Managing Schedules

### List Schedules
```
list_schedules:
  project_id: "{{project_id}}"
```

### Update Schedule
```
update_schedule:
  schedule_id: "{{schedule_id}}"
  cron: "0 8 * * *"
  active: true
```

### Disable Schedule
```
update_schedule:
  schedule_id: "{{schedule_id}}"
  active: false
```

### Delete Schedule
```
delete_schedule:
  schedule_id: "{{schedule_id}}"
```

## Output

- Schedule created in GitLab
- Pipeline job configured for schedule trigger
- Variables set for scheduled runs

## Cron Reference

```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12)
│ │ │ │ ┌───────────── day of week (0-6, Sun=0)
│ │ │ │ │
* * * * *
```

### Examples
- `0 0 * * *` - Midnight daily
- `0 12 * * *` - Noon daily
- `0 0 * * 0` - Midnight Sunday
- `0 0 1 * *` - Midnight on 1st of month
- `*/15 * * * *` - Every 15 minutes
- `0 9-17 * * 1-5` - Every hour 9AM-5PM weekdays

## Timezone

Schedules use the timezone specified. Common options:
- `UTC` (default)
- `America/Los_Angeles`
- `America/New_York`
- `Europe/London`
- `Asia/Tokyo`
