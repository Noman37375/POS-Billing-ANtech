# Module 11 — Barcode Management

**Status:** 🟡 70% Market-Ready  
**Files:** `app/(app)/stock-management/barcode/`, `components/barcode-*.tsx` (5 files)

---

## What Was Done

- [x] Barcode generation for products (Code128, QR)
- [x] Barcode scanning (camera-based via ZXing library)
- [x] Barcode printing
- [x] Unique constraint on barcode column (prevents duplicates)
- [x] Auto-add item to POS when barcode scanned
- [x] Barcode management page

---

## What Was Changed / Fixed

| Date | Change | File |
|------|--------|------|
| Previous | Barcode duplicate race condition fixed — UNIQUE DB constraint added | DB schema + `actions.ts` |

---

## Known Bugs

| # | Bug | Severity | Status |
|---|-----|----------|--------|
| B1 | Camera barcode scanner has no fallback if camera permission denied | 🟡 MEDIUM | ❌ Pending |

---

## Missing Features (for Market)

- [ ] **USB barcode scanner support** — most Pakistani shops use USB scanners, not camera
- [ ] **Manual barcode entry** — type barcode if scanner not working
- [ ] **Batch barcode printing** — print multiple labels at once (e.g., 50 labels for one product)
- [ ] **Label size selector** — different sticker sizes (30x20mm, 50x30mm, etc.)
- [ ] **Price on label** — print price on barcode sticker
- [ ] **Barcode import** — assign existing barcodes from supplier packaging

---

## Checklist Before Launch

- [ ] Test USB barcode scanner in POS (keyboard input mode — most USB scanners emulate keyboard)
- [ ] Add fallback: if camera fails, show text input for manual barcode entry
- [ ] Test barcode scanning speed in POS (should be < 200ms response)
- [ ] Test batch label printing

---

## Fix: USB Barcode Scanner Support

USB barcode scanners work in "keyboard wedge" mode — they type the barcode and press Enter.

The POS form should have a dedicated barcode input that:
1. Is auto-focused when POS opens
2. Listens for Enter key press
3. Looks up the product and adds to cart

This is likely already partially working since there's a barcode input in the POS form. Verify it handles rapid scanning (multiple items scanned quickly).

---

## Fix: Camera Fallback

In `components/barcode-scanner.tsx`:
```typescript
// When camera permission denied or error:
<>
  <p className="text-destructive">Camera not available</p>
  <Input
    placeholder="Type or scan barcode here"
    onKeyDown={(e) => {
      if (e.key === 'Enter') onScan(e.currentTarget.value);
    }}
    autoFocus
  />
</>
```
