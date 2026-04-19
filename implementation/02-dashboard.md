# Module 02 — Dashboard

**Status:** 🔴 45% Market-Ready  
**Files:** `app/(app)/dashboard/page.tsx`

---

## What Was Done

- [x] Total stock investment display
- [x] Daily sales summary
- [x] Top selling products (chart)
- [x] Recent invoices list
- [x] Recharts integration for visualizations
- [x] Dark/light theme support

---

## What Was Changed / Fixed

| Date | Change | File |
|------|--------|------|
| Previous | Fixed N+1 query — added pagination limits to dashboard queries | `app/(app)/dashboard/page.tsx` |

---

## Known Bugs

| # | Bug | Severity | Status |
|---|-----|----------|--------|
| B1 | Profit calculation doesn't account for returns — shows wrong net profit | 🔴 CRITICAL | ❌ Pending |
| B2 | "Today's Sales" resets at midnight UTC, not Pakistan time (UTC+5) | 🟠 HIGH | ❌ Pending |
| B3 | Low stock alerts missing — no notification when stock < minimum | 🟠 HIGH | ❌ Pending |

---

## Missing Features (for Market)

- [ ] **Low stock alerts** — red badge on items below `minimum_stock`
- [ ] **Monthly/yearly comparison charts** — this month vs last month
- [ ] **Outstanding balance summary** — how much customers owe
- [ ] **Vendor payables summary** — how much we owe suppliers
- [ ] **Quick actions** — "New Sale", "Add Item", "Add Customer" buttons
- [ ] **Timezone fix** — use PKT (UTC+5:30... actually Pakistan is UTC+5)
- [ ] **Profit & Loss snapshot** — gross profit, expenses, net profit
- [ ] **Top customers** — who buys the most

---

## Checklist Before Launch

- [ ] Fix UTC vs PKT timezone issue
- [ ] Add low stock alerts widget
- [ ] Add outstanding receivables/payables widget
- [ ] Test dashboard with 1000+ records (performance)
- [ ] Add date range selector (Today / This Week / This Month)

---

## Fix: Timezone (Priority HIGH)

In `app/(app)/dashboard/page.tsx`, all `new Date()` calls need to be converted to PKT.

```typescript
// Add this utility
function getPKTStartOfDay() {
  const now = new Date();
  const pkt = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
  pkt.setHours(0, 0, 0, 0);
  return pkt;
}
```

---

## Fix: Low Stock Alert Widget (Priority HIGH)

Query: `inventory_items` where `stock <= minimum_stock` and `minimum_stock > 0`.

Show as a dismissible alert card at top of dashboard with item count and link to inventory.
