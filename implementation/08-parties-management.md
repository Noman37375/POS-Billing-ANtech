# Module 08 — Parties Management (CRM)

**Status:** 🟡 60% Market-Ready  
**Files:** `app/(app)/parties/`, `lib/db/parties-validation.ts`

---

## What Was Done

- [x] Add / Edit / Delete customers and vendors
- [x] Party type: Customer / Vendor / Both
- [x] Outstanding balance tracking
- [x] Party ledger (transaction history per party)
- [x] Parties reports page
- [x] Party validation helper to prevent orphan records

---

## What Was Changed / Fixed

| Date | Change | File |
|------|--------|------|
| 2026-04 | **Party ledger return entries** — sale return and purchase return transactions now display correctly in party ledger with proper debit/credit signs | `app/(app)/returns/actions.ts`, `app/(app)/accounts-management/ledgers/` |
| Previous | `parties-validation.ts` created — shared party verification | `lib/db/parties-validation.ts` |
| Previous | Fixed data isolation bug — some queries missed `user_id` filter | `parties/actions.ts` |

---

## Known Bugs

| # | Bug | Severity | Status |
|---|-----|----------|--------|
| B1 | Party ledger balance calculation has errors — credits/debits mixed up | 🔴 CRITICAL | ❌ Pending |
| B2 | Party deletion doesn't cascade properly — orphaned ledger entries | 🟡 MEDIUM | ❌ Pending |

---

## Missing Features (for Market)

- [ ] **Search parties** — by name, phone number
- [ ] **Filter by type** — Customer / Vendor / All
- [ ] **Filter ledger by receivable/payable** — show only customers with outstanding balance, or only vendors with payable
- [ ] **Party Balance Report search** — search/filter on party balance report page
- [ ] **Credit limit** — set maximum credit allowed for customer
- [ ] **Credit limit enforcement** — warn/block if customer exceeds limit
- [ ] **WhatsApp number** — separate field for WhatsApp (common in Pakistan)
- [ ] **CNIC field** — optional National ID for customer identification
- [ ] **Party statement PDF** — send account statement to customer
- [ ] **Overdue balance alerts** — flag customers with old unpaid balances
- [ ] **Customer purchase history** — all invoices for a customer

---

## Checklist Before Launch

- [ ] Fix ledger balance calculation (verify debit/credit logic)
- [ ] Add search to parties list
- [ ] Test: create customer, make sale on credit, verify balance updates
- [ ] Test: make payment from customer, verify balance reduces
- [ ] Test: delete party — should soft-delete or block if has transactions
- [ ] Verify ledger shows correct running balance

---

## Fix: Ledger Balance Calculation

**File:** `app/(app)/parties/[id]/ledger/page.tsx` or `parties/actions.ts`

The running balance must follow this rule:
- **Customer ledger:** Sale (invoice) = DEBIT (they owe us). Payment received = CREDIT (reduces their balance).
- **Vendor ledger:** Purchase = CREDIT (we owe them). Payment made = DEBIT (reduces our payable).

Verify the signs are correct in every ledger entry insertion.

---

## Pakistan-Specific: WhatsApp Field

Add `whatsapp_number` column to `parties` table or use the existing `phone` field.

When party has WhatsApp, show a WhatsApp icon button on their profile that opens:
```
https://wa.me/92XXXXXXXXXX?text=Your+balance+is+Rs.+X
```

This is extremely common in Pakistani B2B trade — shop owners share balances via WhatsApp.
