# Module 12 — Settings & Backup

**Status:** 🔴 40% Market-Ready  
**Files:** `app/(app)/pos/settings/`, `app/(app)/backup/`, `components/settings-dialog.tsx`, `components/comprehensive-pos-settings.tsx`

---

## What Was Done

- [x] POS settings page (partial — some settings not connected)
- [x] Weekly automated backup via cron job (`/api/cron/weekly-backup`)
- [x] Backup management page
- [x] Database backup download
- [x] `comprehensive-pos-settings.tsx` component (recently created)

---

## What Was Changed / Fixed

| Date | Change | File |
|------|--------|------|
| 2026-04 | **Global business name update** — "AN-Tech Solutions" replaced with user's business name ("AN-Tech Solutions" → custom) throughout app header and print footer | `components/settings-dialog.tsx`, layout files |
| Recent | `comprehensive-pos-settings.tsx` created | `components/comprehensive-pos-settings.tsx` |
| Recent | `app/(app)/pos/settings/page.tsx` modified | `app/(app)/pos/settings/page.tsx` |

---

## Known Bugs

| # | Bug | Severity | Status |
|---|-----|----------|--------|
| B1 | POS settings not fully connected — thermal printer settings, tax rate settings don't apply to receipt | 🟠 HIGH | ❌ Pending |

---

## Missing Features (for Market)

### Company Profile
- [ ] **Store name** on receipts (currently hardcoded or missing)
- [ ] **Store address** on receipts
- [ ] **Store phone** on receipts
- [ ] **Store logo** on receipts
- [ ] **NTN/STRN number** — for businesses registered with FBR (required on invoices)

### Tax Settings
- [ ] **GST rate** — configurable (17% standard, but some items have different rates)
- [ ] **Tax-inclusive vs exclusive** — price includes tax or not
- [ ] **Tax registration number** (NTN/STRN) shown on invoice

### Invoice/Receipt Settings
- [ ] **Invoice prefix** — "INV-", "BILL-", custom
- [ ] **Invoice footer text** — "Thank you for your business!"
- [ ] **Show/hide columns** on printed invoice
- [ ] **Thermal vs A4** — select default receipt format

### Currency
- [ ] **Currency symbol** — Rs. / PKR (seems done via currency context)
- [ ] **Decimal places** — 0 or 2 for PKR

---

## Checklist Before Launch

- [ ] Connect POS settings to receipt generation
- [ ] Add company profile fields (name, address, phone, NTN)
- [ ] Add NTN/STRN field (important for FBR-registered businesses)
- [ ] Add GST rate setting and connect to POS/invoice
- [ ] Test backup download works
- [ ] Test restore from backup

---

## Fix: Connect Settings to Receipt

**File:** `lib/pdf/generate-pos-receipt.ts`

Instead of hardcoded values, fetch from settings:
```typescript
const settings = await getPOSSettings(userId);
// Then use:
settings.store_name
settings.store_address  
settings.store_phone
settings.ntn_number
settings.tax_rate
settings.receipt_footer
```

Create a `pos_settings` table or `user_settings` JSON column in `pos_users`:
```sql
ALTER TABLE pos_users ADD COLUMN settings JSONB DEFAULT '{}';
```
