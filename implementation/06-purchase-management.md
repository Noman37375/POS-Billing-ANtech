# Module 06 — Purchase Management

**Status:** 🟡 55% Market-Ready  
**Files:** `app/(app)/purchase-management/`, `lib/pdf/generate-purchase-pdf.ts`

---

## What Was Done

- [x] Create / Edit purchase orders
- [x] Line items with quantity and cost price
- [x] Vendor linking (party)
- [x] Payment tracking for purchases (vendor payables)
- [x] Purchase PDF generation
- [x] Purchase list page
- [x] Purchase reports page
- [x] Stock is increased when purchase is finalized

---

## What Was Changed / Fixed

| Date | Change | File |
|------|--------|------|
| Previous | Party validation shared helper created | `lib/db/parties-validation.ts` |
| Previous | Cost price fetching centralized | `lib/db/inventory-pricing.ts` |

---

## Known Bugs

| # | Bug | Severity | Status |
|---|-----|----------|--------|
| B1 | No search/filter on purchase list | 🟠 HIGH | ❌ Pending |
| B2 | No confirmation before delete | 🟠 HIGH | ❌ Pending |
| B3 | Stock increase not atomic — partial failure risk | 🔴 CRITICAL | ❌ Pending |

---

## Missing Features (for Market)

- [ ] **GRN (Goods Received Note)** — confirm delivery before stock is added
- [ ] **Purchase return flow** from purchase list directly
- [ ] **Vendor invoice matching** — match purchase order with vendor invoice #
- [ ] **Search purchases** — by vendor, date, amount
- [ ] **Filter by payment status** — Paid / Unpaid / Partial
- [ ] **Cost price auto-update** — when buying at new price, ask to update item cost
- [ ] **Multi-warehouse** — track which store/location received goods (future)

---

## Checklist Before Launch

- [ ] Fix transaction atomicity for stock increase
- [ ] Add search + filter to purchase list
- [ ] Add confirmation before delete
- [ ] Test complete purchase flow: create PO → add payment → stock increases
- [ ] Test partial payment flow
- [ ] Verify vendor ledger is updated correctly

---

## Fix: Cost Price Update Prompt

When finalizing a purchase and the purchase cost price is different from the item's current cost price, show a dialog:

> "The purchase price for [Item Name] is Rs. 150, but the current cost price is Rs. 120. Do you want to update the cost price?"

This is very common in Pakistani trade where supplier prices change frequently.
