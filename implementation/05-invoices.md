# Module 05 — Invoices (Manual Sales)

**Status:** 🟡 60% Market-Ready  
**Files:** `app/(app)/invoices/`, `components/invoice-form.tsx`, `lib/pdf/generate-invoice-pdf.ts`

---

## What Was Done

- [x] Create / Edit invoices
- [x] Draft and finalized status
- [x] Line items with quantity and price
- [x] Discount per invoice
- [x] Tax per invoice
- [x] Customer linking (party)
- [x] Payment tracking on invoice
- [x] PDF generation (A4 format)
- [x] Invoice list page
- [x] Invoice status tracking

---

## What Was Changed / Fixed

| Date | Change | File |
|------|--------|------|
| Previous | Edit draft mode — mode selector + status change on update fixed | `invoices/actions.ts` |
| Previous | Party validation extracted to shared helper | `lib/db/parties-validation.ts` |

---

## Known Bugs

| # | Bug | Severity | Status |
|---|-----|----------|--------|
| B1 | Invoice state machine not enforced — invalid transitions allowed | 🟡 MEDIUM | ❌ Pending |
| B2 | No search/filter on invoice list | 🟠 HIGH | ❌ Pending |
| B3 | No confirmation before delete | 🟠 HIGH | ❌ Pending |

---

## Missing Features (for Market)

- [ ] **Invoice search** — by customer name, invoice #, date range
- [ ] **Filter by status** — Draft / Paid / Unpaid / Partially Paid
- [ ] **Invoice number format** — custom prefix like "INV-2024-001"
- [ ] **Due date on invoice** — credit period tracking
- [ ] **Overdue invoice alerts** — highlight invoices past due date
- [ ] **Email invoice** to customer
- [ ] **Invoice notes/terms** — "Terms: Net 30"
- [ ] **Recurring invoices** — for regular customers
- [ ] **Invoice template selection** — different designs

---

## Checklist Before Launch

- [ ] Enforce invoice state machine (Draft → Finalized → Cancelled, no backwards)
- [ ] Add search + filter to invoice list
- [ ] Add confirmation before delete
- [ ] Add invoice number auto-generation with custom prefix
- [ ] Test invoice creation to payment flow
- [ ] Test invoice edit (draft only, finalized should not be editable)
- [ ] Verify stock is deducted when invoice is finalized

---

## Fix: Invoice State Machine

**File:** `app/(app)/invoices/actions.ts`

```typescript
// Add state transition validator
const VALID_TRANSITIONS = {
  draft: ['finalized', 'cancelled'],
  finalized: ['cancelled'], // can cancel a finalized invoice
  cancelled: [], // terminal state — no transitions allowed
};

function validateStatusTransition(from: string, to: string) {
  if (!VALID_TRANSITIONS[from]?.includes(to)) {
    throw new Error(`Invalid status change: ${from} → ${to}`);
  }
}
```

---

## Fix: Invoice Search + Filter

Add to `app/(app)/invoices/page.tsx`:
- Search input with debounce (search by party name or invoice number)
- Status filter dropdown: All / Draft / Paid / Unpaid
- Date range picker: From — To

Query filter in `invoices/actions.ts`:
```typescript
let query = supabase.from('sales_invoices').select(...).eq('user_id', user.id);
if (search) query = query.ilike('party.name', `%${search}%`);
if (status) query = query.eq('status', status);
if (dateFrom) query = query.gte('created_at', dateFrom);
if (dateTo) query = query.lte('created_at', dateTo);
```
