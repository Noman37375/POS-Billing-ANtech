# Module 04 — POS (Counter Sales)

**Status:** 🟡 60% Market-Ready  
**Files:** `app/(app)/pos/`, `components/pos-new-sale-form.tsx`, `lib/pdf/generate-pos-receipt.ts`

---

## What Was Done

- [x] New sale form — add items, select customer
- [x] Barcode scan to add item
- [x] Discount field (per item or total)
- [x] Tax field
- [x] Multiple payment methods: Cash, Card, Mixed, Other
- [x] Partial payment (Paying Now / Balance) with credit tracking
- [x] Walk-in customer support (no party required)
- [x] Sales history page
- [x] Thermal receipt PDF generation
- [x] POS settings page
- [x] Payment reconciliation page

---

## What Was Changed / Fixed

| Date | Change | File |
|------|--------|------|
| Recent | Walk-in customer support added | `pos/actions.ts`, `pos-new-sale-form.tsx` |
| Recent | Discount + credit partial payment fixed | `pos-new-sale-form.tsx` |
| Recent | "Invalid Date" bug fixed | `pos/sales/page.tsx` |
| Previous | Draft mode + status change on update | `pos/actions.ts` |

---

## Known Bugs

| # | Bug | Severity | Status |
|---|-----|----------|--------|
| B1 | Transaction atomicity — if receipt save fails, stock is already deducted | 🔴 CRITICAL | ❌ Pending |
| B2 | POS settings not fully connected — some settings don't apply | 🟠 HIGH | ❌ Pending |
| B3 | No confirmation before voiding/cancelling a sale | 🟠 HIGH | ❌ Pending |
| B4 | Receipt PDF missing GST breakdown | 🟠 HIGH | ❌ Pending |
| B5 | Sales history has no search/date filter | 🟠 HIGH | ❌ Pending |

---

## Missing Features (for Market — Pakistani POS)

- [ ] **GST on receipt** — 17% standard sales tax, show on printed receipt
- [ ] **JazzCash / EasyPaisa payment method** — very common in Pakistan
- [ ] **WhatsApp share receipt** — customer wants soft copy on WhatsApp
- [ ] **Customer CNIC** — some businesses record customer ID
- [ ] **Hold/Suspend sale** — cashier can pause and start another sale
- [ ] **Quick keys / shortcuts** — F-keys for common items
- [ ] **Customer-facing display** — show total on second screen
- [ ] **Cash drawer trigger** — open drawer on cash payment
- [ ] **End-of-day report** — daily closing/Z-report for cashier
- [ ] **Shift management** — open/close shift with cash count
- [ ] **Void/Cancel sale with reason** — audit trail
- [ ] **Item quantity keyboard shortcut** — press number then item

---

## Checklist Before Launch

- [ ] Fix transaction atomicity — use Supabase RPC
- [ ] Add GST field to POS settings and show on receipt
- [ ] Add JazzCash/EasyPaisa as payment methods
- [ ] Add search to sales history
- [ ] Add confirmation before cancel/void
- [ ] Test complete sale flow: add items → pay → stock deducted → receipt printed
- [ ] Test partial payment flow — balance shows in customer ledger
- [ ] Test walk-in customer flow

---

## Fix: Transaction Atomicity (CRITICAL)

Create a Supabase RPC function `create_pos_sale` that does everything in one DB transaction:
1. Create `sales_invoices` record
2. Insert `sales_invoice_lines` records
3. Insert `payments` record
4. Deduct stock from `inventory_items`
5. Insert `stock_movements` records
6. Insert `ledger` entry if credit

If any step fails → rollback everything.

**File to create:** Supabase migration with PL/pgSQL function.

---

## Fix: Add GST Support

In `app/(app)/pos/settings/page.tsx`:
- Add "Tax Rate" field (default 17% for Pakistan)
- Add "Show Tax on Receipt" toggle

In `lib/pdf/generate-pos-receipt.ts`:
- Add tax line: "GST (17%): Rs. X"
- Show subtotal, tax, and total separately

---

## FBR Integration (Planned — See Separate Doc)

> Full planning is in [FBR-INTEGRATION.md](./FBR-INTEGRATION.md)

**Flow:** POS sale → optional "Generate FBR Invoice" toggle → POST to FBR DI API → receive 22-digit IRN → print QR code + IRN on receipt.

**Key design decisions already made:**
- FBR is **optional per sale** (toggle on POS form) AND **configurable as default** in POS Settings
- FBR failure must **NOT block the sale** — save locally, retry in background
- Walk-in customer → use default CNIC `0000000000000` for FBR payload
- Requires **static IP** — need to solve for Vercel deployment (static IP proxy)
- Each inventory item will need an **HS Code** field for FBR compliance

**Database columns to add (when implementing):**
- `sales_invoices`: `fbr_irn`, `fbr_status`, `fbr_submitted_at`, `fbr_error`
- `pos_users`: `fbr_ntn`, `fbr_strn`, `fbr_bearer_token`, `fbr_enabled`
- `inventory_items`: `hs_code`, `uom_fbr`
