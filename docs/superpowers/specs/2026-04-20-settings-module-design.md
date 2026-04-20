# Settings Module — Design Spec
**Date:** 2026-04-20  
**Status:** Approved

---

## Overview

Move Settings from a POS sub-tab into a dedicated top-level sidebar module. Each settings section becomes its own sub-page (`/settings/*`). The gear icon in the top navbar becomes a shortcut to `/settings/store`.

---

## Sidebar Structure

```
Settings (main module, icon: Settings)
├── Store Profile          /settings/store
├── Invoice & Receipt      /settings/invoice
├── Tax & Finance          /settings/tax
├── POS Preferences        /settings/pos
├── Appearance             /settings/appearance
├── Notifications          /settings/notifications
├── Security               /settings/security
├── User Management        /users            (existing, stays)
├── Backup & Data          /backup           (existing, stays)
└── Advanced Settings      /settings/advanced  (existing ComprehensivePOSSettings, moved here)
```

**Changes to existing nav:**
- Remove `Settings` child from POS collapsible group
- Add `Settings` as a new top-level collapsible (like Employees & Payroll)
- Gear icon in header → navigates to `/settings/store`

---

## Pages & Fields

### 1. Store Profile — `/settings/store`
| Field | Type | Required |
|-------|------|----------|
| Store Name | Text | Yes |
| Address | Text | No |
| City | Text | No |
| Phone | Text | No |
| Email | Email | No |
| NTN (National Tax Number) | Text | No |
| STRN (Sales Tax Reg. Number) | Text | No |
| Logo | Image upload | No |

---

### 2. Invoice & Receipt — `/settings/invoice`
| Field | Type | Default |
|-------|------|---------|
| Invoice Prefix | Text | `INV-` |
| Invoice Starting Number | Number | `1` |
| Print Format | Select: Thermal 80mm / A4 | `A4` |
| Show Discount Column | Toggle | On |
| Show Tax Column | Toggle | On |
| Show Unit Column | Toggle | On |
| Show NTN/STRN on Invoice | Toggle | Off |
| Invoice Footer Text | Textarea | Empty |

---

### 3. Tax & Finance — `/settings/tax`
| Field | Type | Default |
|-------|------|---------|
| GST Rate (%) | Number 0–100 | `17` |
| Tax Mode | Select: Inclusive / Exclusive | `Exclusive` |
| Currency Symbol | Select: PKR / Rs. | `PKR` |

---

### 4. POS Preferences — `/settings/pos`
| Field | Type | Default |
|-------|------|---------|
| Default Payment Method | Select: Cash / JazzCash / EasyPaisa / Card | `Cash` |
| Require Customer Selection | Toggle | Off (Walk-in allowed) |
| Allow Selling Below Cost Price | Toggle | Off |

---

### 5. Appearance — `/settings/appearance`
| Field | Type | Default |
|-------|------|---------|
| Theme | Select: Light / Dark / System | `System` |

---

### 6. Notifications — `/settings/notifications`
| Field | Type | Default |
|-------|------|---------|
| Low Stock Alert Threshold | Number | `10` |
| Email Notifications | Toggle | Off |

---

### 7. Security — `/settings/security`
- Change Password form: Current Password, New Password, Confirm New Password
- Calls existing `updatePassword` server action

---

### 8. Advanced Settings — `/settings/advanced`
- Existing `ComprehensivePOSSettings` component moved here as-is
- Remove from `/pos/settings`

---

### 9. User Management — `/users` (existing, no change)
### 10. Backup & Data — `/backup` (existing, no change)

---

## Data Storage

**All settings → Supabase `store_settings` table** (per user, keyed by `user_id`)

New columns to add to `store_settings`:
```sql
-- Store Profile
city          TEXT
ntn           TEXT
strn          TEXT
logo_url      TEXT

-- Invoice & Receipt
invoice_prefix        TEXT DEFAULT 'INV-'
invoice_start_number  INTEGER DEFAULT 1
show_discount_col     BOOLEAN DEFAULT TRUE
show_tax_col          BOOLEAN DEFAULT TRUE
show_unit_col         BOOLEAN DEFAULT TRUE
show_ntn_strn         BOOLEAN DEFAULT FALSE
invoice_footer        TEXT

-- Tax & Finance
gst_rate        NUMERIC(5,2) DEFAULT 17
tax_mode        TEXT DEFAULT 'Exclusive'   -- 'Inclusive' | 'Exclusive'
currency_symbol TEXT DEFAULT 'PKR'

-- POS Preferences
default_payment_method     TEXT DEFAULT 'Cash'
require_customer           BOOLEAN DEFAULT FALSE
allow_below_cost           BOOLEAN DEFAULT FALSE

-- Notifications
low_stock_threshold        INTEGER DEFAULT 10
email_notifications        BOOLEAN DEFAULT FALSE
```

**Theme** → Supabase `store_settings` table (column: `theme TEXT DEFAULT 'system'`)  
**Password** → Supabase Auth (existing)

**Zero localStorage usage for settings.** All persisted in Supabase.

---

## Layout Pattern (each settings page)

```
/settings/[section]

┌─────────────────────────────────────────────┐
│ Settings > Store Profile                    │
│ [breadcrumb]                                │
├─────────────────────────────────────────────┤
│ [Section Title]                             │
│ [Description]                               │
│                                             │
│ [Form fields]                               │
│                                             │
│             [Save Changes]                  │
└─────────────────────────────────────────────┘
```

Each page is a separate server component that fetches current settings, renders a client form component, and saves via a server action.

---

## Server Actions

All in `app/(app)/settings/actions.ts`:
- `getStoreSettings()` — fetch all settings for current user
- `updateStoreProfile(data)` — save store profile fields
- `updateInvoiceSettings(data)` — save invoice/receipt fields
- `updateTaxSettings(data)` — save tax/finance fields
- `updatePOSPreferences(data)` — save POS prefs
- `updateNotificationSettings(data)` — save notification prefs

Existing `getStoreSettings()` / `setStoreSettings()` in `/pos/actions.ts` stay as-is (used by Advanced Settings page). New actions in `settings/actions.ts` handle the new sections.

---

## File Structure

```
app/(app)/settings/
├── layout.tsx              ← settings sub-nav layout
├── store/page.tsx
├── invoice/page.tsx
├── tax/page.tsx
├── pos/page.tsx
├── appearance/page.tsx
├── notifications/page.tsx
├── security/page.tsx
├── advanced/page.tsx       ← moves ComprehensivePOSSettings here
└── actions.ts

components/settings/
├── store-profile-form.tsx
├── invoice-settings-form.tsx
├── tax-settings-form.tsx
├── pos-preferences-form.tsx
├── appearance-form.tsx
├── notifications-form.tsx
└── security-form.tsx
```

---

## Migration

```sql
-- Add new columns to existing store_settings table
ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS ntn TEXT,
  ADD COLUMN IF NOT EXISTS strn TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS invoice_prefix TEXT DEFAULT 'INV-',
  ADD COLUMN IF NOT EXISTS invoice_start_number INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS show_discount_col BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_tax_col BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_unit_col BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_ntn_strn BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS invoice_footer TEXT,
  ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) DEFAULT 17,
  ADD COLUMN IF NOT EXISTS tax_mode TEXT DEFAULT 'Exclusive',
  ADD COLUMN IF NOT EXISTS currency_symbol TEXT DEFAULT 'PKR',
  ADD COLUMN IF NOT EXISTS default_payment_method TEXT DEFAULT 'Cash',
  ADD COLUMN IF NOT EXISTS require_customer BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allow_below_cost BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'system';
```

---

## Out of Scope (Future)
- WhatsApp number / receipt sharing
- FBR / POS integration
- Branch management
- Language (Urdu)
- Two-factor authentication
