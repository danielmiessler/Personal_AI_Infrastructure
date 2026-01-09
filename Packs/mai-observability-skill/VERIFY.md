# Observability Skill Verification

Complete this checklist to verify successful installation.

---

## Directory Structure

- [ ] `$PAI_DIR/skills/Observability/` exists
- [ ] `$PAI_DIR/skills/Observability/SKILL.md` exists
- [ ] `$PAI_DIR/skills/Observability/Tools/` contains 7 .ts files
- [ ] `$PAI_DIR/skills/Observability/Config/` contains observability.yaml

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

echo "Checking directories..."
ls -la "$PAI_DIR/skills/Observability/"
echo ""
echo "Tools:"
ls "$PAI_DIR/skills/Observability/Tools/"
echo ""
echo "Config:"
ls "$PAI_DIR/skills/Observability/Config/"
```

---

## Configuration

- [ ] Prometheus URL configured in providers.yaml

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

# Check if observability domain is configured
grep -A 10 "observability:" "$PAI_DIR/providers.yaml" && echo "Configuration found" || echo "Configuration missing"
```

---

## Connection Test

- [ ] Health check succeeds

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
bun run "$PAI_DIR/skills/Observability/Tools/health.ts"
```

**Expected:**
```
Provider: prometheus v1.x.x
Status: HEALTHY
Latency: <ms>
```

---

## Tool Tests

### Query Tool
- [ ] Can run instant query

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
bun run "$PAI_DIR/skills/Observability/Tools/query.ts" 'up'
```

### Alerts Tool
- [ ] Can list alerts

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
bun run "$PAI_DIR/skills/Observability/Tools/alerts.ts"
```

### Rules Tool
- [ ] Can list alert rules

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
bun run "$PAI_DIR/skills/Observability/Tools/rules.ts"
```

### Targets Tool
- [ ] Can list scrape targets

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
bun run "$PAI_DIR/skills/Observability/Tools/targets.ts"
```

### Metrics Tool
- [ ] Can list metric names

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
bun run "$PAI_DIR/skills/Observability/Tools/metrics.ts" --limit 10
```

### Labels Tool
- [ ] Can list label values

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
bun run "$PAI_DIR/skills/Observability/Tools/labels.ts" job
```

---

## Functional Tests

### Range Query
- [ ] Can query time series data

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
bun run "$PAI_DIR/skills/Observability/Tools/query.ts" 'up' --start 1h --step 60
```

### Filtered Alerts
- [ ] Can filter alerts by state

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
bun run "$PAI_DIR/skills/Observability/Tools/alerts.ts" --state firing
```

### Filtered Targets
- [ ] Can filter targets by health

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
bun run "$PAI_DIR/skills/Observability/Tools/targets.ts" --health down
```

### JSON Output
- [ ] Tools support JSON output format

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
bun run "$PAI_DIR/skills/Observability/Tools/alerts.ts" --format json
```

---

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure | - |
| Configuration present | - |
| Health check passes | - |
| Query tool works | - |
| Alerts tool works | - |
| Rules tool works | - |
| Targets tool works | - |
| Metrics tool works | - |
| Labels tool works | - |
| Range queries work | - |
| Filtering works | - |
| JSON output works | - |

**All checks must pass for installation to be complete.**

---

## Quick Full Test

Run all verifications at once:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
TOOLS="$PAI_DIR/skills/Observability/Tools"

echo "=== Observability Skill Verification ==="
echo ""

echo "1. Health check..."
bun run "$TOOLS/health.ts" && echo "Health OK" || echo "Health FAILED"
echo ""

echo "2. Query (instant)..."
bun run "$TOOLS/query.ts" 'up' | head -5 && echo "Query OK" || echo "Query FAILED"
echo ""

echo "3. Alerts..."
bun run "$TOOLS/alerts.ts" | head -5 && echo "Alerts OK" || echo "Alerts FAILED"
echo ""

echo "4. Targets..."
bun run "$TOOLS/targets.ts" | head -5 && echo "Targets OK" || echo "Targets FAILED"
echo ""

echo "5. Metrics..."
bun run "$TOOLS/metrics.ts" --limit 5 | head -5 && echo "Metrics OK" || echo "Metrics FAILED"
echo ""

echo "6. Labels..."
bun run "$TOOLS/labels.ts" job | head -5 && echo "Labels OK" || echo "Labels FAILED"
echo ""

echo "7. Rules..."
bun run "$TOOLS/rules.ts" | head -5 && echo "Rules OK" || echo "Rules FAILED"
echo ""

echo "=== Verification Complete ==="
```

---

## Troubleshooting

### Connection refused
- Verify Prometheus is running and accessible
- Check the `prometheusUrl` in providers.yaml
- Ensure network connectivity (firewall, VPN, k8s port-forward)

### Authentication errors
- If Prometheus requires auth, configure the `auth` section in providers.yaml
- Verify token/credentials are correct

### No data returned
- Verify Prometheus has active targets scraping
- Check that the metric names match your Prometheus configuration

### Tool not found / module errors
- Run `bun install` in the skill directory
- Verify mai-observability-core is installed
