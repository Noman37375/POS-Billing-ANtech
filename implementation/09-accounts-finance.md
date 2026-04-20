# Module 09 — Accounts & Finance

**Status:** 🔴 45% Market-Ready  
**Files:** `app/(app)/accounts-management/`

---

## What Was Done

- [x] Accounts overview page
- [x] Customer ledgers (A/R — Accounts Receivable)
- [x] Vendor ledgers (A/P — Accounts Payable)
- [x] General ledger page
- [x] Accounts reports page
- [x] **Cash Book** — moved to main nav as standalone module (not sub-module of Accounts)

---

## What Was Changed / Fixed

| Date | Change | File |
|------|--------|------|
| 2026-04 | **Cash Book implemented** — running balance, date range filter (Today/Yesterday/This Week/This Month/Custom), all cash in/out entries; promoted to main nav module | `app/(app)/accounts-management/cash-book/` |
| 2026-04 | **Cash Book date filter** — dropdown with Today, Yesterday, This Week (Mon–Sun), This Month, Custom date range | `app/(app)/accounts-management/cash-book/` |
| 2026-04 | **Account Ledger search** — search by party name on ledger list page | `app/(app)/accounts-management/ledgers/` |

---

## Known Bugs

| # | Bug | Severity | Status |
|---|-----|----------|--------|
| B1 | Profit calculation doesn't subtract returns — inflated profit | 🔴 CRITICAL | ❌ Pending |
| B2 | No daily cash book — can't reconcile cash on hand | 🟠 HIGH | ✅ Fixed (Cash Book implemented as main nav module) |

---

## Missing Features (for Market — HIGH PRIORITY)

- [ ] **Profit & Loss Statement** — monthly/yearly P&L with revenue, COGS, gross profit, expenses, net profit
- [ ] **Daily Cash Book** — all cash in/out for the day (most important for Pakistani shopkeepers)
- [ ] **Balance Sheet** — assets, liabilities, equity snapshot
- [ ] **Expense tracking** — rent, electricity, salaries as expense entries
- [ ] **Bank account tracking** — separate cash and bank balances
- [ ] **Cash flow statement** — where money came from and went
- [ ] **Chart of Accounts** — proper double-entry accounting structure
- [ ] **Export to Excel** — accountants want Excel, not just PDF
- [ ] **Tax report** — GST collected, GST paid (for FBR filing)

---

## Pakistan-Specific Accounting Needs

Pakistani SME shopkeepers primarily need:
1. **Bahi khata (ledger)** — who owes what (parties ledger) ✅ Partial
2. **Daily cash position** — how much cash is in hand/drawer ❌ Missing
3. **Monthly sales summary** — total sales, total purchases, gross profit ❌ Missing (basic)
4. **Salary expense record** — monthly payroll expense ✅ (via payroll module)

They typically do NOT need full double-entry accounting unless they have an accountant.

---

## Checklist Before Launch

- [ ] Fix profit calculation to exclude returns
- [ ] Add basic P&L report (Sales - COGS = Gross Profit)
- [ ] Add daily cash book / end-of-day cash summary
- [ ] Add expense entry form (rent, electricity, misc)
- [ ] Verify customer ledger shows correct balance
- [ ] Verify vendor ledger shows correct payables
- [ ] Test accounts report with real data

---

## Fix: Profit Calculation

**Current (broken):** Total Sales - Total Cost Price of Items Sold
**Correct formula:**
```
Gross Profit = (Total Sales - Total Returns) - (Total COGS for items sold, not returned)
Net Profit = Gross Profit - Total Expenses (salaries, rent, etc.)
```

Add returns subtraction to all profit calculations throughout the system.

---

## Priority: Daily Cash Book

This is the single most requested feature by Pakistani shopkeepers.

Create `app/(app)/accounts-management/cash-book/page.tsx` showing:
- Opening balance (yesterday's closing)
- All cash receipts today (POS cash sales, customer payments)
- All cash payments today (vendor payments, expenses)
- Closing balance = Opening + Receipts - Payments
