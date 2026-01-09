# JAI Trading Analysis Roadmap

## Completed Phases

### Phase 1: Analysis Pipeline ✓
*Completed: January 2026*

Core analysis intelligence for investment decisions:
- Dealbreaker checks (11 hard-fail conditions)
- Yellow flag detection (weighted warnings)
- Positive factor scoring (catalysts, moats)
- Piotroski F-Score calculation
- Technical analysis (SMA, RSI, MACD, trend detection)
- Insider transaction analysis (role detection, significance scoring)
- `jsa analyze` command with timing signals

### Phase 2: Portfolio & Trading ✓
*Completed: January 2026*

Connect all CLI commands to real data:
- `jsa portfolio` - Real positions from `~/.config/jai/positions.json` + live Finnhub prices
- `jsa brief` - Portfolio data + SPY/QQQ market indices
- `jsa buy/sell` - Analysis pipeline + Alpaca paper trading
- `jsa screen` - Finnhub stock universe with real metrics
- `jsa watchlist` - Persistent file storage
- CLI renamed from `jai` to `jsa` (Joey's Stock Analyzer)

---

## Phase 3: Integration & Automation
*Status: Planning*

### Priority 1: Council Integration

**Goal**: Enable multi-agent investment council for major decisions.

**Dependencies**:
- kai-council-framework (existing pack)

**Tasks**:
- [ ] Integrate council framework into `jsa council` command
- [ ] Define council agents (Warren, Quentin, Nova, Marcus, Taxley, Penelope)
- [ ] Create agent prompts aligned with investment policy
- [ ] Implement consensus/dissent reporting
- [ ] Add council summary to analysis output (optional flag)

**Usage**:
```bash
jsa council NVDA                    # Full council review
jsa council NVDA --question "Should I add to my position?"
jsa analyze NVDA --council          # Include council summary in analysis
```

---

### Priority 2: Discord Notifications (`jsa brief --send`)

**Goal**: Send morning briefs and alerts to Discord.

**Dependencies**:
- jai-finance-core DiscordNotifier (already built)
- Discord webhook configured in `~/.config/jai/`

**Tasks**:
- [ ] Implement `--send` flag for brief command
- [ ] Format brief as Discord embed (portfolio summary, alerts, opportunities)
- [ ] Add alert triggers (stop loss hit, target reached, earnings upcoming)
- [ ] Create alert templates (embed format, colors, buttons)
- [ ] Test webhook delivery

**Usage**:
```bash
jsa brief --send                    # Send brief to Discord
jsa alert AAPL "Near stop loss"     # Manual alert
```

**Configuration**:
```yaml
# ~/.config/jai/notifications.yaml
discord:
  webhook_brief: https://discord.com/api/webhooks/...
  webhook_alerts: https://discord.com/api/webhooks/...
  daily_brief_time: "07:00"
```

---

### Priority 3: Scheduled Automation (GitLab CI/CD)

**Goal**: Automated morning briefs and portfolio monitoring.

**Decision**: Use **GitLab CI/CD scheduling** instead of cron.

**Rationale**:
1. **Portability**: Schedule definitions live in `.gitlab-ci.yml` (infrastructure as code)
2. **Migration**: Moving VPS → local machine just requires registering a new runner
3. **Visibility**: Web UI for run history, logs, manual triggers
4. **Secrets**: GitLab CI/CD variables handle API keys securely
5. **Existing Infrastructure**: Local GitLab runner already installed on VPS

**Tasks**:
- [ ] Create `.gitlab-ci.yml` with scheduled jobs
- [ ] Configure GitLab CI/CD variables for API keys
- [ ] Implement morning brief job (daily, 7:00 AM)
- [ ] Implement portfolio check job (hourly during market hours)
- [ ] Add failure notifications (email or Discord)
- [ ] Document runner setup for future migration

**Pipeline Design**:
```yaml
# .gitlab-ci.yml
stages:
  - brief
  - monitor

morning-brief:
  stage: brief
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
  script:
    - source ~/.config/jai/load-secrets.sh
    - ./src/cli/jsa.ts brief --send
  tags:
    - vps-runner

portfolio-check:
  stage: monitor
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
  script:
    - source ~/.config/jai/load-secrets.sh
    - ./src/cli/jsa.ts portfolio --alerts
  tags:
    - vps-runner
```

**GitLab Schedules**:
| Schedule | Cron | Description |
|----------|------|-------------|
| Morning Brief | `0 7 * * 1-5` | Weekdays at 7:00 AM |
| Market Open Check | `30 9 * * 1-5` | 9:30 AM market open |
| Midday Check | `0 12 * * 1-5` | Noon portfolio check |
| Market Close Check | `0 16 * * 1-5` | 4:00 PM market close |

---

## Future Considerations (Not Scheduled)

### Live Trading
- Currently disabled (paper trading only)
- Joey doesn't use Alpaca for real money
- Would require additional safeguards before enabling

### Position Syncing
- Sync `positions.json` with actual brokerage positions
- Could use Alpaca API or manual import from Schwab/Fidelity

### Earnings Calendar Integration
- Alert before earnings announcements
- Post-earnings analysis automation

### Backtesting Module
- Test analysis signals against historical data
- Measure accuracy of timing signals

---

## Implementation Notes

### GitLab Runner Setup (VPS)

The VPS already has a GitLab runner installed. For reference:

```bash
# Check runner status
sudo gitlab-runner status

# Register runner (if needed on new machine)
sudo gitlab-runner register \
  --url https://gitlab.com/ \
  --registration-token TOKEN \
  --executor shell \
  --tag-list "vps-runner,jai"
```

### Secrets Management

GitLab CI/CD variables (Settings → CI/CD → Variables):
- `FINNHUB_API_KEY` - Market data
- `ALPACA_API_KEY` - Paper trading
- `ALPACA_SECRET_KEY` - Paper trading
- `DISCORD_WEBHOOK_BRIEF` - Morning brief channel
- `DISCORD_WEBHOOK_ALERTS` - Alerts channel

### Shell Executor vs Docker

Using **shell executor** for speed:
- No container spin-up overhead
- Dependencies already installed on VPS
- Near-instant job start (like cron)

If migrating to Docker later:
- Create `Dockerfile` with bun + dependencies
- Push to GitLab Container Registry
- Update `.gitlab-ci.yml` to use image
