---
provenance: template
---

> 💰 SAMPLE TEMPLATE — Replace with your own data via /interview or by editing this file. Real Pulse Finance dashboards populate from here once you've run the Finances interview.

# FINANCES — Sample Template

This directory holds your personal finance context. LifeOS reads these files to power Pulse's Finance dashboard, surface obligations in your daily brief, and ground answers about your money in real (private) data.

## What lives here

- `FINANCES.md` — top-level overview (net worth snapshot, monthly cash flow, current focus)
- `INCOME.md` — income sources, frequencies, expected amounts
- `EXPENSES.md` — recurring expense categories with budgets
- `INVESTMENTS.md` — investment accounts and allocations
- `ACCOUNTS.md` — bank, credit, and brokerage accounts (no real account numbers — use last-4 only)
- `GOALS.md` — financial goals with target amounts and dates
- `TAXES.md` — tax overview, estimated quarterlies, deductions to track
- `obligations.yaml` — recurring bills (subscriptions, insurance, loans)
- `vendors.yaml` — known vendors you pay or get paid by
- `schema.yaml` — schema definitions for finances data (structural reference)

## How to populate

Two paths:

1. **Run the Finances interview** — `/interview finances` walks you through each file conversationally and writes the results back here.
2. **Edit directly** — open each file, replace every `$X`, `Sample Bank`, and `Sample Vendor` placeholder with your real values. Keep the structure; Pulse depends on the field names.

## Privacy

This directory is part of your private USER tree. It is never bundled into public LifeOS releases. Treat it like your password manager: real numbers go here, but it stays on your machine.

## Sample placeholder conventions

- `$X` — any dollar amount
- `$X,XXX` — larger dollar amount
- `$X.XX` — precise dollar amount
- `Sample Bank` / `Sample Vendor` / `Sample Account` — replace with the real entity name
- `XXXX` — last four digits of an account or card

---

*This is a sample template. Replace every placeholder with your own data before relying on Pulse Finance views.*
