# DayOrchestrator - Setup & Usage

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
cd ~/Personal_AI_Infrastructure
bun add date-fns
```

**Note:** If you get a 401 error, this is a temporary npm registry issue. Try again later or use:
```bash
npm install date-fns  # fallback if bun fails
```

### 2. Verify Installation

```bash
# Test morning workflow
bun .claude/Skills/DayOrchestrator/workflows/morning-launch.ts

# Test evening workflow
bun .claude/Skills/DayOrchestrator/workflows/evening-close.ts

# Test week review
bun .claude/Skills/DayOrchestrator/workflows/week-review.ts
```

### 3. Create Output Directories

```bash
mkdir -p ~/PAI_Output
mkdir -p ~/PAI_Habits
mkdir -p ~/PAI_Habits/weekly-reviews
```

## 📋 Daily Usage

### Morning (6:00-7:00 AM)

```bash
/morning
```

Or say:
```
MARC, buenos días
MARC, empezar día
Morning launch
```

**What happens:**
- Detects day type (even/odd)
- Launches 5-7 parallel agents
- Prepares all work for the day
- Generates checklist
- Output ready in ~/PAI_Output/YYYY-MM-DD/

**Your job after:**
1. Review prepared files (5 min)
2. Personalize finals if needed (5 min)
3. Execute (send emails/applications) (10 min)

**Total time:** 20 min vs 2-3 hours manual

### Evening (22:00-23:00)

```bash
/evening
```

Or say:
```
MARC, cerrar día
MARC, buenas noches
Evening close
```

**What happens:**
- Auto-detects your activity (commits, files)
- Asks ONE question: "Hábitos cumplidos?"
- You answer: "todos" / "todos menos 2" / "1,3,4,5"
- Generates learning automatically
- Prepares tomorrow
- Saves to ~/PAI_Habits/YYYY-MM-DD.md

**Your job:**
- Answer 1 question (10 seconds)
- Review briefing (2 min)

**Total time:** 2 min vs 15-20 min manual

### Sunday Evening

```bash
/weekreview
```

**What happens:**
- Reads last 7 days
- Calculates metrics
- Identifies patterns
- Compares with last week
- Generates insights
- Recommends adjustments

**Output:** ~/PAI_Habits/weekly-reviews/YYYY-WXX.md

## 🎯 Expected Daily Flow

```
06:00  Wake up, gym (Habit 1) ✅
07:00  Shower, coffee
07:15  /morning → Launch workflows
07:20  While agents work: breakfast, emails
07:30  Review agent outputs
07:40  Personalize finals
08:00  START EXECUTION
       - Send applications (even days)
       - Send outreach (odd days)
       - Execute deep work
12:00  Lunch
14:00  Continue execution
18:00  Finish work
22:00  /evening → Close day
22:05  Review briefing, plan tomorrow
22:30  Disconnect, read, sleep prep
23:00  Sleep
```

## 📊 Tracking Outputs

### Daily Outputs
- `~/PAI_Output/YYYY-MM-DD/morning-briefing.md`
- `~/PAI_Output/YYYY-MM-DD/evening-briefing.md`
- `~/PAI_Output/YYYY-MM-DD/applications/` (even days)
- `~/PAI_Output/YYYY-MM-DD/outreach/` (odd days)
- `~/PAI_Output/YYYY-MM-DD/posts/` (Tue/Thu)

### Habit Tracking
- `~/PAI_Habits/YYYY-MM-DD.md` (daily)
- `~/PAI_Habits/weekly-reviews/YYYY-WXX.md` (weekly)

## 🔧 Troubleshooting

### "date-fns not found"
```bash
bun add date-fns
```

### "PAI_Output directory doesn't exist"
```bash
mkdir -p ~/PAI_Output ~/PAI_Habits
```

### "Agents not launching"
- Check you're in correct directory
- Verify Task tool is available
- Check model quotas

### "Voice input not working"
- Voice integration requires Whisper Flow setup
- For now, use text input
- See `/capture` command for future voice setup

## 🎨 Customization

Edit `~/.config/pai/day-orchestrator.json` to customize:
- Which agents launch automatically
- Parallel execution limit
- Default models
- Voice settings

## 🚦 Success Metrics

After 1 week, you should see:
- ✅ 90%+ reduction in manual commands
- ✅ 5-7 applications/outreach per day automatic
- ✅ 2-4 hours saved daily
- ✅ Perfect habit tracking consistency

After 1 month:
- ✅ 100+ hours saved
- ✅ 20-30 applications sent
- ✅ 50-60 outreach completed
- ✅ Habit streak visible and strong

## 📚 Next Steps

1. Run `/morning` tomorrow morning
2. Let agents work in parallel
3. Review and execute prepared work
4. Run `/evening` tomorrow night
5. Track habits with 1 simple answer
6. Repeat daily

**The system works if you work the system.**

---

**Questions?** Ask MARC: "How does DayOrchestrator work?"
