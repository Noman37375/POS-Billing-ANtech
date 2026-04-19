# Module 03 — Stock Management / Inventory

**Status:** 🟡 65% Market-Ready  
**Files:** `app/(app)/stock-management/`, `lib/db/stock-movements.ts`, `lib/db/inventory-pricing.ts`

---

## What Was Done

- [x] Add / Edit / Delete products
- [x] Product categories
- [x] Units of measurement (kg, L, piece, etc.)
- [x] Multi-tier pricing: cost price, cash price, credit price, supplier price
- [x] Profit % and profit value auto-calculation
- [x] Minimum stock / maximum stock fields
- [x] Barcode per product
- [x] Stock movement audit trail (`stock_movements` table)
- [x] Inventory reports page
- [x] Archive products (soft delete)
- [x] `lib/db/inventory-pricing.ts` helper for consistent price fetching

---

## What Was Changed / Fixed

| Date | Change | File |
|------|--------|------|
| Recent (8 phases) | Complete multi-tier pricing system implemented | `lib/db/inventory-pricing.ts` |
| Previous | Barcode duplicate race condition fixed (UNIQUE constraint) | DB + `actions.ts` |
| Previous | Added pagination helper to prevent timeout on large lists | `lib/db/pagination-helper.ts` |

---

## Known Bugs

| # | Bug | Severity | Status |
|---|-----|----------|--------|
| B1 | Stock silent failure — deduction can fail without user knowing | 🔴 CRITICAL | ❌ Pending |
| B2 | Stock count in `inventory_items` can drift from `stock_movements` sum | 🟡 MEDIUM | ❌ Pending |
| B3 | No search/filter on inventory list | 🟠 HIGH | ❌ Pending |
| B4 | No confirmation dialog before delete | 🟠 HIGH | ❌ Pending |

---

## Missing Features (for Market)

- [ ] **Search inventory** — by name, barcode, category
- [ ] **Filter by category / low stock / archived**
- [ ] **Confirmation dialog before delete** — "Are you sure?"
- [ ] **Stock adjustment** — manual +/- without a sale/purchase reason (damage, theft, shrinkage)
- [ ] **Bulk import** — CSV upload for adding many products at once
- [ ] **Product images** — photo of item
- [ ] **SKU / item code** — internal code separate from barcode
- [ ] **Stock valuation report** — total inventory worth at cost price vs sale price
- [ ] **Expiry date tracking** — for FMCG items (Pakistani shops sell a lot of perishables)
- [ ] **Reorder point notification** — email/alert when stock hits minimum

---

## Checklist Before Launch

- [ ] Fix silent stock failure in `lib/db/stock-movements.ts`
- [ ] Add search and category filter to inventory list
- [ ] Add confirmation dialog on delete
- [ ] Add manual stock adjustment feature
- [ ] Test stock movements are recorded for all sale/purchase/return operations
- [ ] Verify stock sync between `inventory_items.stock` and sum of `stock_movements`

---

## Fix: Silent Stock Failure (CRITICAL)

**File:** `lib/db/stock-movements.ts` around line 34-36

Current problem: error is caught and logged to console, but the caller never knows.

```typescript
// WRONG — currently:
catch (error) {
  console.error('Stock movement failed:', error);
  // sale continues even though stock wasn't deducted!
}

// FIX — should be:
catch (error) {
  console.error('Stock movement failed:', error);
  throw new Error(`Stock movement failed: ${error.message}`);
}
```

Then in POS/Invoice actions, wrap in try-catch and return error to user.

---

## Fix: Stock Consistency Check

Add a Supabase function (RPC) or cron job that periodically validates:
```sql
SELECT id, name, stock, 
  (SELECT COALESCE(SUM(quantity_change), 0) FROM stock_movements WHERE item_id = i.id) AS calculated_stock
FROM inventory_items i
WHERE stock != calculated_stock;
```

Run this weekly and flag discrepancies to admin.
