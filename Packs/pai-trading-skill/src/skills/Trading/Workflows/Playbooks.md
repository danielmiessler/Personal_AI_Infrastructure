# Playbooks Workflow

**Trigger:** "playbook", "show setups", "list playbooks", "add setup", "edit playbook"

Manage the playbook library in `Data/Playbooks.yaml`. List, view, add, and edit playbook setups.

---

## Steps

### 1. Determine Action

Ask David what they want to do:
- **List** — Show all playbook names and categories
- **View** — Show full details of a specific playbook
- **Add** — Create a new playbook setup
- **Edit** — Modify an existing playbook

### 2a. List Playbooks

Read `Data/Playbooks.yaml` and display a summary table:

| # | Name | ID | Category | Timeframe |
|---|------|----|----------|-----------|
| 1 | Opening Range Breakout (ORB) | orb | momentum | 9:30-10:00 range |
| 2 | VWAP Reclaim | vwap-reclaim | mean-reversion | 10:00+ |
| 3 | First Pullback (Bull Flag) | first-pullback | momentum | 9:45-11:00 |
| 4 | Red to Green | red-to-green | reversal | First 2 hours |
| 5 | Breakdown Short | breakdown-short | momentum | Any |

### 2b. View Playbook

Show full details for a specific playbook:
- Description
- Criteria (all conditions that must be true)
- Entry rules
- Stop rules
- Target rules
- Notes and tips

### 2c. Add New Playbook

Ask David for each field:

1. **Name** — Descriptive name (e.g., "Gap and Go")
2. **ID** — Short kebab-case id (e.g., "gap-and-go")
3. **Category** — momentum, mean-reversion, reversal, or other
4. **Timeframe** — When this setup works best
5. **Description** — 2-3 sentence overview
6. **Criteria** — List of conditions (what must be true)
7. **Entry rules** — How to enter
8. **Stop rules** — Where to place the stop
9. **Target rules** — Profit targets and scale-out plan
10. **Notes** — Tips and warnings

Append the new playbook to `Data/Playbooks.yaml`.

### 2d. Edit Playbook

1. Show the current playbook content
2. Ask which fields to modify
3. Update the specific fields in `Data/Playbooks.yaml`

---

## Building Your Playbook Library

The 5 starter playbooks are based on SMB Capital's training. As you discover your own edge, add new setups:

**Discovery Process:**
1. Notice a pattern in your winning trades (via WeeklyReview)
2. Define the criteria — what was true every time this worked?
3. Define entry/stop/target rules
4. Paper trade or small-size test for 2 weeks
5. If it has positive expectancy, add it to the playbook

**What Makes a Good Playbook:**
- Clear, objective criteria (not "it looks good")
- Defined entry with a specific trigger
- Predetermined stop (before you enter)
- At least 2:1 R:R on the target
- Repeatable — you can recognize it in real-time

---

## Notes

- Keep your playbook library focused — 5-8 setups is plenty
- Master a few setups rather than having 20 mediocre ones
- Review playbook performance monthly in the WeeklyReview
- "The best traders have a small number of plays they execute extremely well" — Mike Bellafiore
