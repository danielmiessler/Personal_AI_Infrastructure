# SyncUsage Workflow

**Purpose:** Sync real-time usage data from AI service APIs and dashboards.

---

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Syncing usage data from AI service dashboards"}' \
  > /dev/null 2>&1 &
```

---

## Reality Check

Most AI services **do not provide usage APIs** with standard API keys:

| Service | API Access | Workaround |
|---------|------------|------------|
| OpenAI | Needs Admin Key | Dashboard or middleware |
| Anthropic | Needs Admin Key | Dashboard (Claude Max = subscription) |
| Perplexity | No API | Dashboard only |
| xAI/Grok | No API | Dashboard only |
| Google | Needs Service Account | AI Studio dashboard |

---

## Sync Methods

### Method 1: Open All Dashboards (Quick Check)

```bash
bun run ~/.claude/skills/BudgetMonitor/Tools/ScrapeDashboards.ts all
```

This opens all dashboards in browser tabs for manual verification.

### Method 2: API Fetch (Where Available)

```bash
bun run ~/.claude/skills/BudgetMonitor/Tools/FetchUsage.ts
```

This queries APIs that work with configured keys.

### Method 3: Manual Entry

After checking dashboards, update `~/.claude/BUDGET/usage.jsonl`:

```bash
echo '{"timestamp":"2026-01-30T14:00:00Z","service":"openai","cost_usd":45.23,"source":"dashboard"}' >> ~/.claude/BUDGET/usage.jsonl
```

Or edit `~/.claude/BUDGET/TRACKER.md` directly.

---

## Dashboard URLs

| Service | Dashboard URL |
|---------|---------------|
| OpenAI | https://platform.openai.com/usage |
| Anthropic | https://console.anthropic.com/settings/usage |
| Perplexity | https://www.perplexity.ai/settings/api |
| xAI/Grok | https://console.x.ai/usage |
| Google AI Studio | https://aistudio.google.com/app/plan |

---

## Future: Middleware Tracking

For per-request tracking without admin APIs, we need middleware in the PAI inference layer:

```typescript
// In Tools/Inference.ts - wrap API calls
async function trackUsage(provider: string, response: any) {
  if (response.usage) {
    appendFileSync(USAGE_PATH, JSON.stringify({
      timestamp: new Date().toISOString(),
      service: provider,
      tokens_input: response.usage.prompt_tokens,
      tokens_output: response.usage.completion_tokens,
      model: response.model
    }) + '\n');
  }
}
```

This would capture costs at the source rather than polling dashboards.

---

## Recommended Routine

### Daily (via MorningBrief)
- Quick budget check via dashboard
- Note any services approaching limits

### Weekly
- Run `bun run ~/.claude/skills/BudgetMonitor/Tools/ScrapeDashboards.ts all`
- Update TRACKER.md with actual figures
- Regenerate dashboard: `bun run ~/.claude/skills/BudgetMonitor/Tools/Dashboard.ts`

### Monthly
- Archive to `~/.claude/BUDGET/history/YYYY-MM.jsonl`
- Review trends
- Adjust budgets as needed
