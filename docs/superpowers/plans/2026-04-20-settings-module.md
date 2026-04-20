# Settings Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the POS sub-tab Settings page with a full top-level Settings module at `/settings/*`, each section as its own sub-page, all data stored in Supabase (zero localStorage for settings).

**Architecture:** Settings layout provides an internal left sub-nav. Each section is a server page that fetches data via `getAllSettings()`, passes it to a client form component that calls a typed server action on submit. All data stored in the existing `user_settings` key-value table (no DB migration needed — just new keys).

**Tech Stack:** Next.js App Router, Supabase (user_settings key-value table), next-themes, React server actions, shadcn/ui, sonner toasts.

---

## File Map

**Create:**
- `app/(app)/settings/actions.ts` — all settings server actions + types
- `app/(app)/settings/layout.tsx` — wraps all settings pages with internal sub-nav
- `app/(app)/settings/settings-nav.tsx` — client component for active-state nav links
- `app/(app)/settings/page.tsx` — redirect to /settings/store
- `app/(app)/settings/store/page.tsx`
- `app/(app)/settings/invoice/page.tsx`
- `app/(app)/settings/tax/page.tsx`
- `app/(app)/settings/pos/page.tsx`
- `app/(app)/settings/appearance/page.tsx`
- `app/(app)/settings/notifications/page.tsx`
- `app/(app)/settings/security/page.tsx`
- `app/(app)/settings/advanced/page.tsx`
- `components/settings/store-profile-form.tsx`
- `components/settings/invoice-settings-form.tsx`
- `components/settings/tax-settings-form.tsx`
- `components/settings/pos-preferences-form.tsx`
- `components/settings/appearance-form.tsx`
- `components/settings/notifications-form.tsx`
- `components/settings/security-form.tsx`
- `components/theme-sync.tsx`

**Modify:**
- `components/header.tsx` — replace `<SettingsDialog />` with a Link icon button to `/settings/store`
- `components/sidebar.tsx` — remove "Settings" child from POS collapsible; add `isActive` for `/settings`
- `app/(app)/pos/settings/page.tsx` — redirect to `/settings/advanced`
- `app/(app)/layout.tsx` — add `<ThemeSync>` component
- `components/settings-dialog.tsx` — remove (or keep only as dead file; header no longer imports it)

---

## Task 1: Settings Server Actions

**Files:**
- Create: `app/(app)/settings/actions.ts`

- [ ] **Step 1: Create the actions file**

```typescript
// app/(app)/settings/actions.ts
"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getSessionOrRedirect } from "@/lib/auth"

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppSettings = {
  // Store Profile
  store_name?: string
  store_address?: string
  store_city?: string
  store_phone?: string
  store_email?: string
  store_ntn?: string
  store_strn?: string
  store_logo_url?: string
  // Invoice & Receipt
  invoice_prefix?: string
  invoice_start_number?: string
  show_discount_col?: string
  show_tax_col?: string
  show_unit_col?: string
  show_ntn_strn?: string
  invoice_footer?: string
  // Tax & Finance
  gst_rate?: string
  tax_mode?: string
  currency_symbol?: string
  // POS Preferences
  default_payment_method?: string
  require_customer?: string
  allow_below_cost?: string
  // Appearance
  theme?: string
  // Notifications
  low_stock_threshold?: string
  email_notifications?: string
}

const ALL_KEYS: (keyof AppSettings)[] = [
  "store_name", "store_address", "store_city", "store_phone", "store_email",
  "store_ntn", "store_strn", "store_logo_url",
  "invoice_prefix", "invoice_start_number", "show_discount_col", "show_tax_col",
  "show_unit_col", "show_ntn_strn", "invoice_footer",
  "gst_rate", "tax_mode", "currency_symbol",
  "default_payment_method", "require_customer", "allow_below_cost",
  "theme",
  "low_stock_threshold", "email_notifications",
]

// ─── Read ──────────────────────────────────────────────────────────────────────

export async function getAllSettings(): Promise<AppSettings> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data } = await supabase
    .from("user_settings")
    .select("key, value")
    .eq("user_id", currentUser.effectiveUserId)
    .in("key", ALL_KEYS)

  const settings: AppSettings = {}
  ;(data || []).forEach(({ key, value }: { key: string; value: string }) => {
    ;(settings as any)[key] = value
  })
  return settings
}

// ─── Internal helper ──────────────────────────────────────────────────────────

async function upsertSettings(
  userId: string,
  updates: Record<string, string | null>,
) {
  const supabase = createClient()
  const toUpsert: { user_id: string; key: string; value: string }[] = []
  const toDelete: string[] = []

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "") {
      toDelete.push(key)
    } else {
      toUpsert.push({ user_id: userId, key, value })
    }
  }

  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from("user_settings")
      .upsert(toUpsert, { onConflict: "user_id,key" })
    if (error) return { error: error.message }
  }
  if (toDelete.length > 0) {
    await supabase
      .from("user_settings")
      .delete()
      .eq("user_id", userId)
      .in("key", toDelete)
  }
  return { error: null }
}

// ─── Update actions ───────────────────────────────────────────────────────────

export async function updateStoreProfile(data: {
  store_name: string
  store_address?: string
  store_city?: string
  store_phone?: string
  store_email?: string
  store_ntn?: string
  store_strn?: string
}) {
  const currentUser = await getSessionOrRedirect()
  if (!data.store_name?.trim()) return { error: "Store name is required" }

  const result = await upsertSettings(currentUser.effectiveUserId, {
    store_name: data.store_name.trim(),
    store_address: data.store_address?.trim() || null,
    store_city: data.store_city?.trim() || null,
    store_phone: data.store_phone?.trim() || null,
    store_email: data.store_email?.trim() || null,
    store_ntn: data.store_ntn?.trim() || null,
    store_strn: data.store_strn?.trim() || null,
  })

  if (result?.error) return { error: result.error }
  revalidatePath("/settings/store")
  return { error: null }
}

export async function updateInvoiceSettings(data: {
  invoice_prefix: string
  invoice_start_number: string
  show_discount_col: boolean
  show_tax_col: boolean
  show_unit_col: boolean
  show_ntn_strn: boolean
  invoice_footer: string
}) {
  const currentUser = await getSessionOrRedirect()

  const result = await upsertSettings(currentUser.effectiveUserId, {
    invoice_prefix: data.invoice_prefix.trim() || "INV-",
    invoice_start_number: data.invoice_start_number || "1",
    show_discount_col: String(data.show_discount_col),
    show_tax_col: String(data.show_tax_col),
    show_unit_col: String(data.show_unit_col),
    show_ntn_strn: String(data.show_ntn_strn),
    invoice_footer: data.invoice_footer.trim() || null,
  })

  if (result?.error) return { error: result.error }
  revalidatePath("/settings/invoice")
  return { error: null }
}

export async function updateTaxSettings(data: {
  gst_rate: string
  tax_mode: string
  currency_symbol: string
}) {
  const currentUser = await getSessionOrRedirect()

  const result = await upsertSettings(currentUser.effectiveUserId, {
    gst_rate: data.gst_rate || "17",
    tax_mode: data.tax_mode || "Exclusive",
    currency_symbol: data.currency_symbol || "PKR",
  })

  if (result?.error) return { error: result.error }
  revalidatePath("/settings/tax")
  return { error: null }
}

export async function updatePOSPreferences(data: {
  default_payment_method: string
  require_customer: boolean
  allow_below_cost: boolean
}) {
  const currentUser = await getSessionOrRedirect()

  const result = await upsertSettings(currentUser.effectiveUserId, {
    default_payment_method: data.default_payment_method || "Cash",
    require_customer: String(data.require_customer),
    allow_below_cost: String(data.allow_below_cost),
  })

  if (result?.error) return { error: result.error }
  revalidatePath("/settings/pos")
  return { error: null }
}

export async function updateAppearance(theme: string) {
  const currentUser = await getSessionOrRedirect()

  const result = await upsertSettings(currentUser.effectiveUserId, {
    theme: theme || "system",
  })

  if (result?.error) return { error: result.error }
  revalidatePath("/settings/appearance")
  return { error: null }
}

export async function updateNotifications(data: {
  low_stock_threshold: string
  email_notifications: boolean
}) {
  const currentUser = await getSessionOrRedirect()

  const result = await upsertSettings(currentUser.effectiveUserId, {
    low_stock_threshold: data.low_stock_threshold || "10",
    email_notifications: String(data.email_notifications),
  })

  if (result?.error) return { error: result.error }
  revalidatePath("/settings/notifications")
  return { error: null }
}
```

- [ ] **Step 2: Commit**
```bash
git add app/(app)/settings/actions.ts
git commit -m "feat: settings module server actions"
```

---

## Task 2: Settings Layout + Sub-Nav

**Files:**
- Create: `app/(app)/settings/settings-nav.tsx`
- Create: `app/(app)/settings/layout.tsx`
- Create: `app/(app)/settings/page.tsx`

- [ ] **Step 1: Create the client nav component**

```tsx
// app/(app)/settings/settings-nav.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_ITEMS = [
  { href: "/settings/store", label: "Store Profile" },
  { href: "/settings/invoice", label: "Invoice & Receipt" },
  { href: "/settings/tax", label: "Tax & Finance" },
  { href: "/settings/pos", label: "POS Preferences" },
  { href: "/settings/appearance", label: "Appearance" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/advanced", label: "Advanced Settings" },
]

export function SettingsNav() {
  const pathname = usePathname()
  return (
    <aside className="w-52 flex-shrink-0">
      <nav className="space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 2: Create the layout**

```tsx
// app/(app)/settings/layout.tsx
import { ReactNode } from "react"
import { SettingsNav } from "./settings-nav"

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Manage your store and application preferences.
        </p>
      </div>
      <div className="flex gap-6">
        <SettingsNav />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create index redirect**

```tsx
// app/(app)/settings/page.tsx
import { redirect } from "next/navigation"

export default function SettingsPage() {
  redirect("/settings/store")
}
```

- [ ] **Step 4: Commit**
```bash
git add app/(app)/settings/
git commit -m "feat: settings layout with sub-nav"
```

---

## Task 3: Store Profile Page + Form

**Files:**
- Create: `components/settings/store-profile-form.tsx`
- Create: `app/(app)/settings/store/page.tsx`

- [ ] **Step 1: Create the client form**

```tsx
// components/settings/store-profile-form.tsx
"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateStoreProfile } from "@/app/(app)/settings/actions"
import type { AppSettings } from "@/app/(app)/settings/actions"
import { toast } from "sonner"

export function StoreProfileForm({ settings }: { settings: AppSettings }) {
  const [storeName, setStoreName] = useState(settings.store_name ?? "")
  const [address, setAddress] = useState(settings.store_address ?? "")
  const [city, setCity] = useState(settings.store_city ?? "")
  const [phone, setPhone] = useState(settings.store_phone ?? "")
  const [email, setEmail] = useState(settings.store_email ?? "")
  const [ntn, setNtn] = useState(settings.store_ntn ?? "")
  const [strn, setStrn] = useState(settings.store_strn ?? "")
  const [pending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateStoreProfile({
        store_name: storeName,
        store_address: address,
        store_city: city,
        store_phone: phone,
        store_email: email,
        store_ntn: ntn,
        store_strn: strn,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Store profile saved")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Store Profile</CardTitle>
        <CardDescription>
          Your business information. Appears on invoices and receipts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="storeName">Store Name <span className="text-destructive">*</span></Label>
            <Input
              id="storeName"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g. Fizzy Drinks"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Shop 12, Main Bazaar"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Lahore"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 03001234567"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. store@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ntn">NTN (National Tax Number)</Label>
            <Input
              id="ntn"
              value={ntn}
              onChange={(e) => setNtn(e.target.value)}
              placeholder="e.g. 1234567-8"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="strn">STRN (Sales Tax Reg. Number)</Label>
            <Input
              id="strn"
              value={strn}
              onChange={(e) => setStrn(e.target.value)}
              placeholder="e.g. 03-11-9999-999-99"
            />
          </div>
        </div>
        <div className="pt-2">
          <Button onClick={handleSave} disabled={pending || !storeName.trim()}>
            {pending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create the server page**

```tsx
// app/(app)/settings/store/page.tsx
import { requirePrivilege } from "@/lib/auth/privileges"
import { getAllSettings } from "@/app/(app)/settings/actions"
import { StoreProfileForm } from "@/components/settings/store-profile-form"

export default async function StoreSettingsPage() {
  await requirePrivilege("dashboard")
  const settings = await getAllSettings()
  return <StoreProfileForm settings={settings} />
}
```

- [ ] **Step 3: Commit**
```bash
git add app/(app)/settings/store/ components/settings/store-profile-form.tsx
git commit -m "feat: settings store profile page"
```

---

## Task 4: Invoice & Receipt Page + Form

**Files:**
- Create: `components/settings/invoice-settings-form.tsx`
- Create: `app/(app)/settings/invoice/page.tsx`

- [ ] **Step 1: Create the client form**

```tsx
// components/settings/invoice-settings-form.tsx
"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateInvoiceSettings } from "@/app/(app)/settings/actions"
import type { AppSettings } from "@/app/(app)/settings/actions"
import { toast } from "sonner"

export function InvoiceSettingsForm({ settings }: { settings: AppSettings }) {
  const [prefix, setPrefix] = useState(settings.invoice_prefix ?? "INV-")
  const [startNumber, setStartNumber] = useState(settings.invoice_start_number ?? "1")
  const [showDiscount, setShowDiscount] = useState(settings.show_discount_col !== "false")
  const [showTax, setShowTax] = useState(settings.show_tax_col !== "false")
  const [showUnit, setShowUnit] = useState(settings.show_unit_col !== "false")
  const [showNtnStrn, setShowNtnStrn] = useState(settings.show_ntn_strn === "true")
  const [footer, setFooter] = useState(settings.invoice_footer ?? "")
  const [pending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateInvoiceSettings({
        invoice_prefix: prefix,
        invoice_start_number: startNumber,
        show_discount_col: showDiscount,
        show_tax_col: showTax,
        show_unit_col: showUnit,
        show_ntn_strn: showNtnStrn,
        invoice_footer: footer,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Invoice settings saved")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice & Receipt</CardTitle>
        <CardDescription>Control how invoices and receipts are formatted.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="prefix">Invoice Prefix</Label>
            <Input
              id="prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="INV-"
            />
            <p className="text-xs text-muted-foreground">e.g. INV- → INV-0001</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="startNumber">Starting Number</Label>
            <Input
              id="startNumber"
              type="number"
              min="1"
              value={startNumber}
              onChange={(e) => setStartNumber(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium">Show on Invoice</p>
          {[
            { label: "Discount Column", value: showDiscount, setter: setShowDiscount },
            { label: "Tax Column", value: showTax, setter: setShowTax },
            { label: "Unit Column", value: showUnit, setter: setShowUnit },
            { label: "NTN / STRN Number", value: showNtnStrn, setter: setShowNtnStrn },
          ].map(({ label, value, setter }) => (
            <div key={label} className="flex items-center justify-between">
              <Label className="font-normal">{label}</Label>
              <Switch checked={value} onCheckedChange={setter} />
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="footer">Invoice Footer Text</Label>
          <Textarea
            id="footer"
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
            placeholder="e.g. Thank you for your business! All sales are final."
            rows={3}
          />
        </div>

        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create the server page**

```tsx
// app/(app)/settings/invoice/page.tsx
import { requirePrivilege } from "@/lib/auth/privileges"
import { getAllSettings } from "@/app/(app)/settings/actions"
import { InvoiceSettingsForm } from "@/components/settings/invoice-settings-form"

export default async function InvoiceSettingsPage() {
  await requirePrivilege("dashboard")
  const settings = await getAllSettings()
  return <InvoiceSettingsForm settings={settings} />
}
```

- [ ] **Step 3: Commit**
```bash
git add app/(app)/settings/invoice/ components/settings/invoice-settings-form.tsx
git commit -m "feat: settings invoice & receipt page"
```

---

## Task 5: Tax & Finance Page + Form

**Files:**
- Create: `components/settings/tax-settings-form.tsx`
- Create: `app/(app)/settings/tax/page.tsx`

- [ ] **Step 1: Create the client form**

```tsx
// components/settings/tax-settings-form.tsx
"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateTaxSettings } from "@/app/(app)/settings/actions"
import type { AppSettings } from "@/app/(app)/settings/actions"
import { toast } from "sonner"

export function TaxSettingsForm({ settings }: { settings: AppSettings }) {
  const [gstRate, setGstRate] = useState(settings.gst_rate ?? "17")
  const [taxMode, setTaxMode] = useState(settings.tax_mode ?? "Exclusive")
  const [currency, setCurrency] = useState(settings.currency_symbol ?? "PKR")
  const [pending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateTaxSettings({
        gst_rate: gstRate,
        tax_mode: taxMode,
        currency_symbol: currency,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Tax settings saved")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax & Finance</CardTitle>
        <CardDescription>Configure GST and currency settings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gstRate">GST Rate (%)</Label>
            <Input
              id="gstRate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={gstRate}
              onChange={(e) => setGstRate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Pakistan standard GST is 17%</p>
          </div>
          <div className="space-y-2">
            <Label>Tax Mode</Label>
            <Select value={taxMode} onValueChange={setTaxMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Exclusive">Exclusive (tax added on top)</SelectItem>
                <SelectItem value="Inclusive">Inclusive (tax included in price)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Currency Symbol</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PKR">PKR</SelectItem>
                <SelectItem value="Rs.">Rs.</SelectItem>
                <SelectItem value="₨">₨</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create the server page**

```tsx
// app/(app)/settings/tax/page.tsx
import { requirePrivilege } from "@/lib/auth/privileges"
import { getAllSettings } from "@/app/(app)/settings/actions"
import { TaxSettingsForm } from "@/components/settings/tax-settings-form"

export default async function TaxSettingsPage() {
  await requirePrivilege("dashboard")
  const settings = await getAllSettings()
  return <TaxSettingsForm settings={settings} />
}
```

- [ ] **Step 3: Commit**
```bash
git add app/(app)/settings/tax/ components/settings/tax-settings-form.tsx
git commit -m "feat: settings tax & finance page"
```

---

## Task 6: POS Preferences Page + Form

**Files:**
- Create: `components/settings/pos-preferences-form.tsx`
- Create: `app/(app)/settings/pos/page.tsx`

- [ ] **Step 1: Create the client form**

```tsx
// components/settings/pos-preferences-form.tsx
"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updatePOSPreferences } from "@/app/(app)/settings/actions"
import type { AppSettings } from "@/app/(app)/settings/actions"
import { toast } from "sonner"

export function POSPreferencesForm({ settings }: { settings: AppSettings }) {
  const [defaultPayment, setDefaultPayment] = useState(
    settings.default_payment_method ?? "Cash"
  )
  const [requireCustomer, setRequireCustomer] = useState(
    settings.require_customer === "true"
  )
  const [allowBelowCost, setAllowBelowCost] = useState(
    settings.allow_below_cost === "true"
  )
  const [pending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      const result = await updatePOSPreferences({
        default_payment_method: defaultPayment,
        require_customer: requireCustomer,
        allow_below_cost: allowBelowCost,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("POS preferences saved")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>POS Preferences</CardTitle>
        <CardDescription>Control POS sale behavior.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Default Payment Method</Label>
          <Select value={defaultPayment} onValueChange={setDefaultPayment}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="JazzCash">JazzCash</SelectItem>
              <SelectItem value="EasyPaisa">EasyPaisa</SelectItem>
              <SelectItem value="Card">Card</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Require Customer Selection</Label>
              <p className="text-xs text-muted-foreground">
                If off, walk-in customer is allowed without selecting a party
              </p>
            </div>
            <Switch checked={requireCustomer} onCheckedChange={setRequireCustomer} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Allow Selling Below Cost Price</Label>
              <p className="text-xs text-muted-foreground">
                If off, a warning toast is shown when item is sold at a loss
              </p>
            </div>
            <Switch checked={allowBelowCost} onCheckedChange={setAllowBelowCost} />
          </div>
        </div>

        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create the server page**

```tsx
// app/(app)/settings/pos/page.tsx
import { requirePrivilege } from "@/lib/auth/privileges"
import { getAllSettings } from "@/app/(app)/settings/actions"
import { POSPreferencesForm } from "@/components/settings/pos-preferences-form"

export default async function POSPreferencesPage() {
  await requirePrivilege("pos")
  const settings = await getAllSettings()
  return <POSPreferencesForm settings={settings} />
}
```

- [ ] **Step 3: Commit**
```bash
git add app/(app)/settings/pos/ components/settings/pos-preferences-form.tsx
git commit -m "feat: settings POS preferences page"
```

---

## Task 7: Appearance Page + Form

**Files:**
- Create: `components/settings/appearance-form.tsx`
- Create: `app/(app)/settings/appearance/page.tsx`
- Create: `components/theme-sync.tsx`
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Create ThemeSync component**

```tsx
// components/theme-sync.tsx
"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

export function ThemeSync({ theme }: { theme: string }) {
  const { setTheme } = useTheme()
  useEffect(() => {
    setTheme(theme)
  }, [theme, setTheme])
  return null
}
```

- [ ] **Step 2: Add ThemeSync to app layout**

In `app/(app)/layout.tsx`, add the import and component:

```tsx
// app/(app)/layout.tsx
import type { ReactNode } from "react"
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { getSessionOrRedirect } from "@/lib/auth"
import { BarcodeScanToPOS } from "@/components/barcode-scan-to-pos"
import { Toaster } from "@/components/ui/sonner"
import { BackupReminder } from "@/components/backup-reminder"
import { getBackupStatus } from "@/app/(app)/backup/actions"
import { getAllSettings } from "@/app/(app)/settings/actions"
import { ThemeSync } from "@/components/theme-sync"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionOrRedirect("/login")
  const businessName = user.name || "InvoSync"

  const [{ backup_due }, settings] = await Promise.all([
    getBackupStatus(),
    getAllSettings(),
  ])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/40 to-background">
      <ThemeSync theme={settings.theme ?? "system"} />
      <Sidebar user={user} />
      <div className="flex flex-col min-h-screen lg:ml-72">
        <Header businessName={businessName} userEmail={user.email} />
        <BackupReminder show={backup_due} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto w-full space-y-4 sm:space-y-6">{children}</div>
        </main>
      </div>
      <BarcodeScanToPOS />
      <Toaster />
    </div>
  )
}
```

- [ ] **Step 3: Create appearance form**

```tsx
// components/settings/appearance-form.tsx
"use client"

import { useState, useTransition } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateAppearance } from "@/app/(app)/settings/actions"
import type { AppSettings } from "@/app/(app)/settings/actions"
import { toast } from "sonner"

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
]

export function AppearanceForm({ settings }: { settings: AppSettings }) {
  const [selectedTheme, setSelectedTheme] = useState(settings.theme ?? "system")
  const [pending, startTransition] = useTransition()
  const { setTheme } = useTheme()

  const handleSave = () => {
    startTransition(async () => {
      setTheme(selectedTheme)
      const result = await updateAppearance(selectedTheme)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Appearance saved")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose how the app looks. Saved to your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Theme</Label>
          <div className="flex gap-3">
            {THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setSelectedTheme(t.value)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  selectedTheme === t.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted border-border"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Create server page**

```tsx
// app/(app)/settings/appearance/page.tsx
import { requirePrivilege } from "@/lib/auth/privileges"
import { getAllSettings } from "@/app/(app)/settings/actions"
import { AppearanceForm } from "@/components/settings/appearance-form"

export default async function AppearancePage() {
  await requirePrivilege("dashboard")
  const settings = await getAllSettings()
  return <AppearanceForm settings={settings} />
}
```

- [ ] **Step 5: Commit**
```bash
git add components/theme-sync.tsx app/(app)/layout.tsx app/(app)/settings/appearance/ components/settings/appearance-form.tsx
git commit -m "feat: settings appearance page + Supabase theme sync"
```

---

## Task 8: Notifications Page + Form

**Files:**
- Create: `components/settings/notifications-form.tsx`
- Create: `app/(app)/settings/notifications/page.tsx`

- [ ] **Step 1: Create the client form**

```tsx
// components/settings/notifications-form.tsx
"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateNotifications } from "@/app/(app)/settings/actions"
import type { AppSettings } from "@/app/(app)/settings/actions"
import { toast } from "sonner"

export function NotificationsForm({ settings }: { settings: AppSettings }) {
  const [threshold, setThreshold] = useState(settings.low_stock_threshold ?? "10")
  const [emailNotifications, setEmailNotifications] = useState(
    settings.email_notifications === "true"
  )
  const [pending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateNotifications({
        low_stock_threshold: threshold,
        email_notifications: emailNotifications,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Notification settings saved")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Configure alerts and notification preferences.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="threshold">Low Stock Alert Threshold</Label>
          <Input
            id="threshold"
            type="number"
            min="0"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="w-32"
          />
          <p className="text-xs text-muted-foreground">
            Alert when stock falls below this quantity
          </p>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div>
            <Label className="font-medium">Email Notifications</Label>
            <p className="text-xs text-muted-foreground">
              Receive email alerts for important events
            </p>
          </div>
          <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
        </div>

        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create server page**

```tsx
// app/(app)/settings/notifications/page.tsx
import { requirePrivilege } from "@/lib/auth/privileges"
import { getAllSettings } from "@/app/(app)/settings/actions"
import { NotificationsForm } from "@/components/settings/notifications-form"

export default async function NotificationsPage() {
  await requirePrivilege("dashboard")
  const settings = await getAllSettings()
  return <NotificationsForm settings={settings} />
}
```

- [ ] **Step 3: Commit**
```bash
git add app/(app)/settings/notifications/ components/settings/notifications-form.tsx
git commit -m "feat: settings notifications page"
```

---

## Task 9: Security Page + Form

**Files:**
- Create: `components/settings/security-form.tsx`
- Create: `app/(app)/settings/security/page.tsx`

- [ ] **Step 1: Create the client form**

The password change action already exists in `settings-dialog.tsx` as an inline function. Extract and reuse the Supabase auth `updateUser` call.

```tsx
// components/settings/security-form.tsx
"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export function SecurityForm() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pending, startTransition] = useTransition()

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All fields are required")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        toast.error(error.message)
      } else {
        toast.success("Password updated successfully")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>Change your account password.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-sm">
        <div className="space-y-2">
          <Label htmlFor="currentPwd">Current Password</Label>
          <Input
            id="currentPwd"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPwd">New Password</Label>
          <Input
            id="newPwd"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPwd">Confirm New Password</Label>
          <Input
            id="confirmPwd"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <Button onClick={handleChangePassword} disabled={pending}>
          {pending ? "Updating..." : "Update Password"}
        </Button>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create server page**

```tsx
// app/(app)/settings/security/page.tsx
import { requirePrivilege } from "@/lib/auth/privileges"
import { SecurityForm } from "@/components/settings/security-form"

export default async function SecurityPage() {
  await requirePrivilege("dashboard")
  return <SecurityForm />
}
```

- [ ] **Step 3: Commit**
```bash
git add app/(app)/settings/security/ components/settings/security-form.tsx
git commit -m "feat: settings security page"
```

---

## Task 10: Advanced Settings Page (Move Existing)

**Files:**
- Create: `app/(app)/settings/advanced/page.tsx`
- Modify: `app/(app)/pos/settings/page.tsx` → redirect

- [ ] **Step 1: Create advanced settings page**

```tsx
// app/(app)/settings/advanced/page.tsx
import { requirePrivilege } from "@/lib/auth/privileges"
import { getUserPrintFormat, getStoreSettings } from "@/app/(app)/pos/actions"
import { ComprehensivePOSSettings } from "@/components/comprehensive-pos-settings"

export default async function AdvancedSettingsPage() {
  await requirePrivilege("pos")
  const [printFormat, storeSettings] = await Promise.all([
    getUserPrintFormat(),
    getStoreSettings(),
  ])
  return (
    <ComprehensivePOSSettings
      currentPrintFormat={printFormat}
      currentStoreSettings={storeSettings}
    />
  )
}
```

- [ ] **Step 2: Redirect old POS settings page**

```tsx
// app/(app)/pos/settings/page.tsx
import { redirect } from "next/navigation"

export default function PosSettingsPage() {
  redirect("/settings/advanced")
}
```

- [ ] **Step 3: Commit**
```bash
git add app/(app)/settings/advanced/ app/(app)/pos/settings/page.tsx
git commit -m "feat: move POS settings to /settings/advanced"
```

---

## Task 11: Sidebar — Remove Settings from POS

**Files:**
- Modify: `components/sidebar.tsx`

- [ ] **Step 1: Remove Settings child from POS group and add isActive for /settings**

In `components/sidebar.tsx`, find the POS children array and remove the Settings entry:

```tsx
// Find this block in allNavItems (the POS children):
children: [
  { href: "/pos", label: "New Sale", icon: ShoppingCart, privilege: "pos" as ModulePrivilege },
  { href: "/pos/sales", label: "Sales", icon: Receipt, privilege: "pos" as ModulePrivilege },
  { href: "/pos/payments", label: "Customer Payments", icon: CreditCard, privilege: "pos" as ModulePrivilege },
  // DELETE this line:
  // { href: "/pos/settings", label: "Settings", icon: Settings, privilege: "pos" as ModulePrivilege },
  { href: "/pos/reports", label: "Gross Profit", icon: TrendingUp, privilege: "pos" as ModulePrivilege },
],
```

Also update `isActive` for the `/pos` parent to no longer exclude `/pos/settings`:

```tsx
// Find this block in isActive():
if (href === "/pos") {
  if (
    pathname.startsWith("/pos/sales") ||
    pathname.startsWith("/pos/payments") ||
    pathname.startsWith("/pos/reports")
    // removed: || pathname.startsWith("/pos/settings")
  ) {
    return false
  }
  return pathname.startsWith("/pos")
}
```

Also update the `isOpen` guard for POS in the same function — remove `/pos/settings` from the list:

```tsx
// Find this in the render section:
if (pathname.startsWith("/pos/sales") || pathname.startsWith("/pos/payments") || pathname.startsWith("/pos/reports")) {
  return false
}
```

Add isActive for settings group. In the `isActive` function, add:

```tsx
if (href === "/settings-group") return pathname.startsWith("/users") || pathname.startsWith("/backup") || pathname.startsWith("/settings")
```

Also update the `useEffect` for settingsOpen:

```tsx
useEffect(() => {
  if (pathname.startsWith("/users") || pathname.startsWith("/backup") || pathname.startsWith("/settings")) {
    setSettingsOpen(true)
  }
}, [pathname])
```

- [ ] **Step 2: Commit**
```bash
git add components/sidebar.tsx
git commit -m "feat: remove Settings from POS nav, wire Settings group to /settings/*"
```

---

## Task 12: Header — Gear Icon Navigates to Settings

**Files:**
- Modify: `components/header.tsx`

- [ ] **Step 1: Replace SettingsDialog with a navigation link**

In `components/header.tsx`, find the SettingsDialog import and usage:

```tsx
// Remove this import:
// import { SettingsDialog } from "@/components/settings-dialog"

// Add this import instead:
import Link from "next/link"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
```

Replace `<SettingsDialog />` with:

```tsx
<Link href="/settings/store">
  <Button variant="ghost" size="icon" aria-label="Settings">
    <Settings className="w-5 h-5 text-muted-foreground" />
  </Button>
</Link>
```

- [ ] **Step 2: Commit**
```bash
git add components/header.tsx
git commit -m "feat: gear icon navigates to /settings/store"
```

---

## Task 13: Remove SettingsDialog localStorage Usage

**Files:**
- Modify or delete: `components/settings-dialog.tsx`

Since the dialog is no longer used (gear icon now navigates to settings), it can be deleted. First verify no other file imports it:

- [ ] **Step 1: Check for other imports**
```bash
grep -r "settings-dialog" app/ components/ --include="*.tsx" --include="*.ts"
```
Expected output: only `header.tsx` (which we already updated in Task 12). If no other imports, delete the file.

- [ ] **Step 2: Delete the file**
```bash
rm components/settings-dialog.tsx
```

- [ ] **Step 3: Commit**
```bash
git add -A
git commit -m "chore: remove settings-dialog (replaced by /settings route)"
```

---

## Task 14: End-to-End Verification

- [ ] **Step 1: Start dev server**
```bash
npm run dev
```

- [ ] **Step 2: Verify each route loads without errors**
  - Navigate to `/settings` → should redirect to `/settings/store`
  - Click each sub-nav link: Store Profile, Invoice & Receipt, Tax & Finance, POS Preferences, Appearance, Notifications, Security, Advanced Settings
  - Each page should load with current saved values pre-filled

- [ ] **Step 3: Test saving**
  - Store Profile: change store name, click Save → toast "Store profile saved"
  - Appearance: switch to Dark → toast "Appearance saved" → theme changes immediately → refresh page → dark theme persists (ThemeSync reads from DB)

- [ ] **Step 4: Verify sidebar**
  - POS collapsible: Settings child is gone
  - Settings collapsible: opens when navigating to `/settings/*`

- [ ] **Step 5: Verify gear icon**
  - Click gear icon in header → navigates to `/settings/store`

- [ ] **Step 6: Verify Advanced Settings**
  - Navigate to `/settings/advanced` → ComprehensivePOSSettings renders
  - Old URL `/pos/settings` → redirects to `/settings/advanced`

- [ ] **Step 7: Final commit**
```bash
git add -A
git commit -m "feat: settings module complete — all sub-pages, Supabase storage, theme sync"
```
