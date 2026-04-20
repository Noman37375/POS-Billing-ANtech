# Module 04b — POS Sale Form Improvements

**Status:** 📋 PLANNED — Ready to implement  
**Parent Module:** [04-pos-sales.md](./04-pos-sales.md)  
**Files:** `components/pos-new-sale-form.tsx`, `app/(app)/pos/actions.ts`

---

## Research Summary (Industry Standards)

| Feature | Industry Standard | Pakistani Market | Our Approach |
|---------|------------------|------------------|--------------|
| Per-item discount | ✅ All major POS (Odoo inline is best UX) | ❌ None explicitly | Odoo-style inline column |
| Discount mode (% vs PKR) | % most common, PKR amount on receipt | Not documented | Toggle % / PKR |
| Below-cost protection | Soft warning (hard block only as addon) | ❌ None | Soft warning (red highlight) |
| Margin visibility | Manager-only reports, rare cashier-facing | ❌ None | Optional, owner role only |
| Price tier auto-update | Not common — our unique feature | ❌ None | All items update on tier change |

---

## What Was There Before

- `priceType` dropdown (Cash / Credit / Supplier) — only applied to NEW items being added
- Single global discount field at bottom (PKR amount only)
- No per-item discount
- No margin visibility
- No below-cost protection

---

## Changes To Implement

### Change 1: Price Tier → Auto-Update All Items in Cart

**Current behavior:** Changing Cash → Credit only affects the NEXT item added. Existing items in cart keep old price.

**New behavior:** When user changes price tier, ALL items in cart immediately update their price to the new tier.

**UX detail:** Show a small badge on each row showing which tier the price is from (Cash / Credit / Supplier). If a tier price is not set for an item, falls back to unit price.

**Code location:** `components/pos-new-sale-form.tsx`
- Add `useEffect` on `priceType` change → iterate all items → update `unitPrice` from inventory data

---

### Change 2: Per-Item Discount Column (Inline — Odoo Style)

**UX:** Add a `Disc` column directly in the cart table. User types directly — no modal, no popup.

**Discount mode toggle:** Top-right corner of the form header area:
```
Discount: [%] [PKR]   ← toggle buttons
```
This applies to ALL per-item discount inputs.

**Per-item discount field behavior:**
- In `%` mode: user types `10` → means 10% off that item
- In `PKR` mode: user types `50` → means Rs. 50 off that item
- Both update the `Amount` column live

**Validation:**
- If discount makes price go **below cost price** → field turns red + tooltip "Below cost price!"
- Does NOT block — cashier can still proceed (soft warning)
- If no cost price set for item → no warning (can't compare)

**Cart table new structure:**
```
| Item | Qty | Price | Disc | Amount | Margin |
```

---

### Change 3: Below-Cost Soft Warning

**Trigger:** When `(unitPrice - discountPerUnit) < costPrice`

**Visual:** Discount input field turns red border + small warning icon.

**Tooltip:** "Selling below cost price (Cost: Rs. X)"

**No block** — cashier/owner can still complete sale. This is industry standard.

**Code:** Needs `costPrice` to be included in `InventoryOption` type and passed from server.

---

### Change 4: Margin Column (Owner/Manager Role Only)

**Visible only if:** User role is `pos_user` (owner). Hidden for `sub_pos_user` (cashier/manager).

**Calculation per row:**
```
margin% = ((unitPrice - discountPerUnit - costPrice) / unitPrice) * 100
```

**Display:**
- Positive margin → green text `+43%`
- Negative margin (below cost) → red text `-12% ⚠`
- No cost price set → `—` (dash)

**Toggle:** Small checkbox in form header "Show Margin" — owner can hide it if customer is nearby.

---

### Change 5: Receipt Shows PKR Discount Amount

**On printed receipt:** Show discount as PKR amount, not percentage.

```
Dettol Soap x2          Rs. 300
  - Discount             Rs. -30
                        -------
                        Rs. 270
```

Industry standard: customers care about rupee saved, not percentage.

---

## Data Model Changes

### `InventoryOption` type — add `costPrice`
```typescript
type InventoryOption = {
  id: string
  name: string
  stock: number
  unitPrice: number
  cashPrice?: number
  creditPrice?: number
  supplierPrice?: number
  costPrice?: number   // ← ADD THIS
}
```

### Cart item state — add `discount`
```typescript
items: Array<{
  itemId: string
  quantity: number
  unitPrice: number
  priceType?: "cash" | "credit" | "supplier"
  discount?: number        // ← ADD: value in selected mode (% or PKR)
  discountAmount?: number  // ← ADD: calculated PKR amount (for display + totals)
}>
```

### New state variables
```typescript
const [discountMode, setDiscountMode] = useState<"percent" | "pkr">("percent")
const [showMargin, setShowMargin] = useState(false) // owner only
```

---

## Computed Logic Changes

```typescript
// Per-item computed (inside useMemo)
const detailed = items.map((line) => {
  const inv = inventory.find((i) => i.id === line.itemId)
  const discountAmt = line.discountMode === "percent"
    ? (line.unitPrice * line.quantity) * ((line.discount ?? 0) / 100)
    : (line.discount ?? 0)
  const amount = (line.unitPrice * line.quantity) - discountAmt
  const costPrice = inv?.costPrice ?? 0
  const costTotal = costPrice * line.quantity
  const margin = costPrice > 0 ? ((amount - costTotal) / amount) * 100 : null
  const belowCost = costPrice > 0 && (line.unitPrice - (discountAmt / line.quantity)) < costPrice
  return { ...line, name: inv?.name, amount, discountAmt, margin, belowCost }
})

// Total discount = sum of all per-item discounts + global bill discount
const totalItemDiscount = detailed.reduce((sum, l) => sum + l.discountAmt, 0)
const total = subtotal + tax - totalItemDiscount - globalDiscount
```

---

## UI Layout Plan

```
┌─────────────────────────────────────────────────────────────────────┐
│ Point of Sale                          Discount: [%▣] [PKR]         │
│                               □ Show Margin  (visible: owner only)  │
├────────────────────────────────────────────────────────────────────┤
│ Customer [___________] Address [____________]  Tax [__]  [Cash ▼]  │
│                                                                     │
│ Add Item: [Search item_______] [Qty] [+ Add]                       │
│                                                                     │
│ ┌──────────────┬─────┬──────────┬──────────┬──────────┬──────────┐ │
│ │ Item         │ Qty │ Price    │ Disc     │ Amount   │ Margin   │ │
│ ├──────────────┼─────┼──────────┼──────────┼──────────┼──────────┤ │
│ │ Dettol Soap  │  2  │  150     │ 10%  🟢  │  270.00  │ +43% 🟢  │ │
│ │ Rice 5kg     │  1  │   80     │ 50%  🔴⚠ │   40.00  │ -12% 🔴  │ │
│ └──────────────┴─────┴──────────┴──────────┴──────────┴──────────┘ │
│                                                                     │
│ Subtotal:  Rs. 350.00        Mode [Sale ▼]  Payment [Cash ▼]       │
│ Discount:  Rs.  70.00        [Bill Disc: 0]                         │
│ Tax:       Rs.   0.00                                               │
│ Total:     Rs. 280.00        [Complete Sale]                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Checklist

- [ ] Add `costPrice` to `InventoryOption` type and inventory fetch query
- [ ] Add `discountMode` state (% / PKR toggle)
- [ ] Add `showMargin` state (owner only — check user role)
- [ ] Price tier change → auto-update all items in cart
- [ ] Add `discount` field to cart item state
- [ ] Add Disc column to cart table (inline input)
- [ ] Below-cost detection → red highlight on disc input
- [ ] Margin column (conditional on showMargin + owner role)
- [ ] Update `computed` useMemo to include per-item discount in totals
- [ ] Keep global bill discount field (for extra total-level discount)
- [ ] Pass per-item discounts to `createPOSSale` action
- [ ] Receipt: show PKR discount amount per item

---

## Implementation Order

1. Type changes + inventory fetch (costPrice)
2. State + computed logic
3. Price tier auto-update
4. UI: discount mode toggle + disc column + below-cost warning
5. UI: margin column (conditional)
6. Wire to createPOSSale action
7. Receipt update
