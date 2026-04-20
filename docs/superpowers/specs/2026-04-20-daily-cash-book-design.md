# Daily Cash Book (Bahi Khata) — Design Spec
**Date:** 2026-04-20  
**Status:** Approved

---

## Decisions Summary

| Question | Decision |
|----------|----------|
| Layout | C — 4 summary cards + filter tabs + chronological table with running balance |
| Opening Balance | Auto (yesterday's closing) + manual override per date |
| Expenses | View only for now (no expense entry) — add later |
| Close Day | No — read-only report only |
| Date Navigation | Single day default + ◀▶ arrows + date picker + quick buttons (Aaj, Kal, Is Hafta, Is Mahine) |
| Architecture | Approach 3 — pull from existing tables + `cash_book_settings` for opening balance override |

---

## Data Model

### New Table: `cash_book_settings`
```sql
CREATE TABLE cash_book_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES pos_users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  opening_balance_override NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);
ALTER TABLE cash_book_settings DISABLE ROW LEVEL SECURITY;
```

### Data Sources (No new tables)

| Transaction Type | Source Table | Direction | Label |
|-----------------|--------------|-----------|-------|
| POS Sales (cash) | `payments` JOIN `sales_invoices` WHERE source='pos' | Cash IN | POS Sale |
| Customer payment received | `payments` JOIN `sales_invoices` WHERE source='manual' | Cash IN | Payment Received |
| Vendor payment made | `purchase_payments` | Cash OUT | Vendor Payment |
| Refund given to customer | `refunds` JOIN `returns` WHERE type='sale' | Cash OUT | Refund Given |
| Purchase return refund received | `refunds` JOIN `returns` WHERE type='purchase' | Cash IN | Purchase Return |

---

## Opening Balance Logic

```
IF cash_book_settings.opening_balance_override EXISTS for (user_id, date):
    opening_balance = override_value
ELSE:
    opening_balance = SUM(all Cash IN before date) - SUM(all Cash OUT before date)
```

Closing Balance = Opening Balance + Cash IN (today) - Cash OUT (today)

---

## Page Structure

**URL:** `/accounts-management/cash-book`

### Header
- Title: "Daily Cash Book — Bahi Khata"
- Date Navigation:
  - Quick buttons: `Aaj` | `Kal` | `Is Hafta` | `Is Mahine`
  - ◀ Pichla Din | [Date Picker] | Agla Din ▶
- Print button (top right)
- Opening Balance override button (pencil icon next to Opening card)

### Summary Cards (4)
```
[ Opening Balance ]  [ Cash IN ↑ ]  [ Cash OUT ↓ ]  [ Closing Balance ]
  ₨ 5,000 (auto)      ₨ 28,500        ₨ 12,200          ₨ 21,300
  ✏ Override                                              Net: +₨16,300
```

### Filter Tabs
`All Transactions` | `Cash IN` | `Cash OUT`

### Transaction Table
Columns: Time | Description | Party | Category | Amount | Running Balance

Category badges:
- `SALE` — green (POS sale)
- `RECV` — green (customer payment received)
- `PAID` — red (vendor payment)
- `REFUND` — red (refund given)
- `PUR-RET` — green (purchase return received)

### Date Range Mode
When "Is Hafta" or "Is Mahine" is selected:
- Summary cards show totals for the range
- Table shows all transactions for the range (no running balance column)
- Print generates range report

---

## Print Output

```
═══════════════════════════════════════
        [Store Name]
     Daily Cash Book — Bahi Khata
         Date: 20 April 2026
═══════════════════════════════════════
Opening Balance:              ₨  5,000
─────────────────────────────────────
Cash IN:                      ₨ 28,500
  POS Sales          24,500
  Payments Recv.      4,000
─────────────────────────────────────
Cash OUT:                     ₨ 12,200
  Vendor Payments     5,000
  Refunds Given       2,200
  Expenses            5,000
─────────────────────────────────────
CLOSING BALANCE:              ₨ 21,300
═══════════════════════════════════════
[Transaction detail table below]
```

---

## Files To Create/Modify

| File | Action |
|------|--------|
| `lib/db/migration-cash-book.sql` | New — cash_book_settings table |
| `app/(app)/accounts-management/cash-book/page.tsx` | New — server component, data fetch |
| `app/(app)/accounts-management/cash-book/cash-book-client.tsx` | New — client component (tabs, date nav, table) |
| `app/(app)/accounts-management/actions.ts` | Add getCashBook() server action |
| `app/(app)/accounts-management/layout.tsx` | Add "Cash Book" nav link |

---

## Key Constraints

- Read-only — no data modification except opening balance override
- Date range: single day default, up to 1 month range
- Data never resets — all historical records always available
- Pulling from existing tables — zero data duplication
- Print must work without internet (pure HTML/CSS)
