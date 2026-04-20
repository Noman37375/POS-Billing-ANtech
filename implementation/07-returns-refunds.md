# Module 07 — Returns & Refunds

**Status:** 🔴 40% Market-Ready  
**Files:** `app/(app)/returns/`, `components/sales-return-dialog.tsx`, `components/purchase-return-dialog.tsx`, `components/refund-dialog.tsx`

---

## What Was Done

- [x] Sales return — customer returns item (stock comes back)
- [x] Purchase return — we return item to vendor (stock goes out)
- [x] Refund processing dialog
- [x] Returns reports page
- [x] Returns dashboard

---

## What Was Changed / Fixed

| Date | Change | File |
|------|--------|------|
| 2026-04 | **Silent refund failure fix** — `createSaleReturn` and `createPurchaseReturn` now return a user-visible error instead of swallowing refund failures with `console.error` | `app/(app)/returns/actions.ts` |
| 2026-04 | **Party ledger balance fix** — return transactions now correctly visualized in party ledger (debit/credit signs corrected for sale returns and purchase returns) | `app/(app)/returns/actions.ts`, `app/(app)/accounts-management/ledgers/` |

---

## Known Bugs (CRITICAL — All Must Fix Before Launch)

| # | Bug | Severity | Status |
|---|-----|----------|--------|
| B1 | Returns do NOT update original invoice status — invoice shows "Paid" even after return | 🔴 CRITICAL | ❌ Pending |
| B2 | Returned items not marked on invoice line items — can return same item twice | 🔴 CRITICAL | ❌ Pending |
| B3 | Refund amount not validated — can refund more than original payment | 🔴 CRITICAL | ❌ Pending |
| B4 | Customer ledger not updated after return | 🔴 CRITICAL | ✅ Fixed (party ledger balance corrected for return entries) |
| B5 | Stock movement not always recorded for returns | 🟠 HIGH | ❌ Pending |

---

## Missing Features (for Market)

- [ ] **Search on Sale Returns list** — by customer, date, amount
- [ ] **Search on Purchase Returns list** — by vendor, date, amount
- [ ] **Filter returns by date range** — standard date picker filter
- [ ] **Partial return** — return only some items from invoice, not all
- [ ] **Return reason** — why was it returned (defective, wrong item, etc.)
- [ ] **Return receipt/PDF** — give customer a return receipt
- [ ] **Return within X days policy** — block returns older than 7/14/30 days
- [ ] **Exchange instead of refund** — swap item for different item
- [ ] **Return history on invoice** — show all returns linked to an invoice

---

## Checklist Before Launch

- [ ] Fix: Return MUST update original invoice status to "Partially Returned" or "Returned"
- [ ] Fix: Track which line items have been returned and how many
- [ ] Fix: Validate refund amount <= original payment amount
- [ ] Fix: Update customer/vendor ledger on return
- [ ] Fix: Record stock movement for every return
- [ ] Test: Return 1 item from 3-item invoice — invoice status updates correctly
- [ ] Test: Try to double-return same item — should be blocked

---

## Fix: Invoice Status After Return (CRITICAL)

**File:** `app/(app)/returns/actions.ts` — add after return is created:

```typescript
// After sales return is saved:
// 1. Check if ALL items on invoice have been returned
const allReturned = await checkAllItemsReturned(invoiceId);
// 2. Update invoice status
await supabase
  .from('sales_invoices')
  .update({ status: allReturned ? 'returned' : 'partially_returned' })
  .eq('id', invoiceId);
// 3. Update customer ledger — reduce their balance
await updateCustomerLedger(customerId, -returnAmount, 'sales_return', returnId);
```

---

## Fix: Prevent Double Return

Add `returned_quantity` column to `sales_invoice_lines` table:
```sql
ALTER TABLE sales_invoice_lines ADD COLUMN returned_quantity INTEGER DEFAULT 0;
```

When processing return, check:
```typescript
if (returnQty > (lineItem.quantity - lineItem.returned_quantity)) {
  throw new Error('Cannot return more than original quantity');
}
// Then update:
await supabase.from('sales_invoice_lines')
  .update({ returned_quantity: lineItem.returned_quantity + returnQty })
  .eq('id', lineItemId);
```
