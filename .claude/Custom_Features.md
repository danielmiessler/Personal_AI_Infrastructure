# Custom Features - PAI Environment

This document tracks custom features and modifications added to the PAI (Personal AI Infrastructure) environment.

## Energy & Carbon Footprint Tracking

**Added:** 2025-12-07
**Status:** ✅ Active
**Toggle:** `PAI_ENV_METRICS=1` in settings.json

### Overview

Real-time energy consumption and carbon footprint tracking for LLM usage, integrated into both the Claude Code status line and Observability dashboard.

### Features

**Status Line Display (when enabled):**
```
💰 Cost: $X.XX  ⚡ Energy: X.XX Wh  🌍 Carbon: X.XXg CO₂
```

**Observability Dashboard:**
- 2x2 grid showing: Total Tokens, Cost, Energy, Carbon
- Automatic calculation based on model usage (Haiku/Sonnet/Opus)
- Color-coded cards with gradient backgrounds

### Technical Implementation

#### Calculation Methodology

Based on MIT research ([arxiv.org/abs/2310.03003](https://arxiv.org/abs/2310.03003)):
- **Formula:** Carbon = Energy (kWh) × Carbon Intensity (gCO2/kWh)
- **Energy:** Tokens × Model Energy per Token × PUE

**Model Energy Consumption (per token in Wh):**
- Haiku (~20B params): 0.0003 Wh
- Sonnet (~70B params): 0.0007 Wh
- Opus (~2T params): 0.001 Wh

**Constants:**
- PUE (Power Usage Effectiveness): 1.2
- Carbon Intensity: 240 gCO2/kWh (EU average, configurable)

#### Files Modified

**Status Line:**
- `.claude/statusline-command.sh` - Updated LINE 3 to show Cost/Energy/Carbon
- `.claude/lib/energy-calculations.sh` - New calculation library

**Observability Dashboard:**
- `.claude/skills/Observability/apps/client/src/components/widgets/TokenUsageWidget.vue`
  - Added energy and carbon summary cards
  - Added `calculateEnergyAndCarbon()` function
  - Added formatting functions: `formatEnergy()`, `formatCarbon()`
  - Updated CSS for 2x2 grid layout with color-coded cards
- `.claude/skills/Observability/apps/client/src/components/LivePulseChart.vue`
  - Added energy and carbon display in top right corner
  - Added computed properties for real-time calculation
  - Added `formatEnergy()` and `formatCarbon()` helpers

**Hooks:**
- `.claude/hooks/capture-all-events.ts` - Updated to use local timezone instead of hardcoded LA timezone
  - Changed `timestamp_pst` to `timestamp_local`
  - Auto-detects system timezone using `Intl.DateTimeFormat().resolvedOptions().timeZone`

**Settings:**
- `.claude/settings.json` - Added environment variables:
  - `PAI_ENV_METRICS=1` - Enable/disable environmental metrics
  - `PAI_CARBON_INTENSITY=240` - Carbon intensity in gCO2/kWh (configurable by region)

### Configuration

**Enable environmental metrics:**
```json
{
  "env": {
    "PAI_ENV_METRICS": "1",
    "PAI_CARBON_INTENSITY": "240"
  }
}
```

**Carbon Intensity Values by Region:**
- EU: 240 gCO2/kWh
- US West: 240 gCO2/kWh
- US East: 429 gCO2/kWh
- Global Average: 400 gCO2/kWh

**Disable environmental metrics:**
```json
{
  "env": {
    "PAI_ENV_METRICS": "0"
  }
}
```

### Research Sources

1. **MIT Study:** [Power, Latency and Cost of LLM Inference Systems](https://arxiv.org/abs/2310.03003)
   - LLaMA 65B: 3-4 Joules per token
   - Energy scales with model sharding
   - Power capping saves 23% energy with 6.7% performance impact

2. **Google 2025 Data:** [AI Footprint Update](https://www.sustainabilitybynumbers.com/p/ai-footprint-august-2025)
   - Median query: 0.24 Wh, 0.03g CO₂ (current)
   - 44-fold reduction in emissions over 12 months

3. **Hugging Face:** [CO₂ Emissions Analysis](https://huggingface.co/blog/leaderboard-emissions-analysis)
   - Reasoning models: 50x more CO₂ than concise models

4. **Academic Research:**
   - [Quantifying LLM Inference Energy](https://arxiv.org/abs/2507.11417)
   - [Frontiers: Energy Costs of AI Communication](https://www.frontiersin.org/journals/communication/articles/10.3389/fcomm.2025.1572947/full)

### Model Accuracy

Our calculations are **conservative estimates** based on:
- ✅ Peer-reviewed research (MIT, arxiv.org/abs/2310.03003)
- ✅ Industry-standard PUE (1.2 for modern data centers)
- ✅ Regional carbon intensity data
- ⚠️ Anthropic parameter counts are unofficial estimates
- ⚠️ Assumes similar architecture to LLaMA models

**Validation:** MIT measured LLaMA 65B at 3-4 J/token (0.00083-0.00111 Wh/token). Our Opus estimate (0.001 Wh/token) aligns with their findings.

### Usage Examples

**Example 1: 100K tokens with Sonnet**
- Energy: 100,000 × 0.0007 × 1.2 = 84 Wh
- Carbon: 0.084 kWh × 240 = 20.16g CO₂

**Example 2: Daily usage (1M tokens, mixed models)**
- Haiku (300K): 300,000 × 0.0003 × 1.2 = 108 Wh
- Sonnet (600K): 600,000 × 0.0007 × 1.2 = 504 Wh
- Opus (100K): 100,000 × 0.001 × 1.2 = 120 Wh
- **Total:** 732 Wh (0.732 kWh) = 175.68g CO₂

### Environmental Impact Context

**What does 175g CO₂ equal?**
- 🚗 Driving a car 1 km (0.6 miles)
- 💡 Running a 60W bulb for 12 hours
- ☕ Making 10 cups of coffee

### Future Enhancements

- [ ] Add real-time energy tracking per session
- [ ] Historical energy/carbon trends chart
- [ ] Per-agent energy breakdown
- [ ] Custom carbon intensity profiles
- [ ] Integration with Anthropic API for actual model metrics
- [ ] Power capping recommendations
- [ ] Carbon offset calculator

### Troubleshooting

**Metrics not showing:**
1. Check `PAI_ENV_METRICS=1` in `.claude/settings.json`
2. Ensure `bc` is installed: `which bc`
3. Restart Claude Code session

**Inaccurate values:**
1. Verify `PAI_CARBON_INTENSITY` matches your region
2. Check model detection in status line
3. Review token counts with `ccusage`

---

**Last Updated:** 2025-12-07
**Version:** 1.0.0
