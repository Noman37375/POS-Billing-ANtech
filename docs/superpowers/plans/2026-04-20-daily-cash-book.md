# Daily Cash Book (Bahi Khata) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Daily Cash Book page under Accounts Management that shows all cash movements (sales, payments, refunds) for any date or date range, with an opening balance that auto-calculates from history but can be manually overridden.

**Architecture:** Pull cash data from existing tables (`payments`, `purchase_payments`, `refunds`) — no new movement table. One new `cash_book_settings` table stores opening balance overrides per date. Server action queries all sources, merges, sorts by time, and returns structured entries with running balance.

**Tech Stack:** Next.js App Router (Server Component page + Client Component), Supabase, shadcn/ui, TypeScript

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `lib/db/migration-cash-book.sql` | Create | cash_book_settings table |
| `app/(app)/accounts-management/actions.ts` | Modify | Add getCashBook() + upsertOpeningOverride() |
| `app/(app)/accounts-management/cash-book/page.tsx` | Create | Server component — fetch data, render |
| `app/(app)/accounts-management/cash-book/cash-book-client.tsx` | Create | Client component — date nav, tabs, table, print |
| `components/sidebar.tsx` | Modify | Add "Cash Book" nav link under Accounts Management |

---

## Task 1: DB Migration — cash_book_settings table

**Files:**
- Create: `lib/db/migration-cash-book.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Migration: Daily Cash Book — opening balance override
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS cash_book_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES pos_users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  opening_balance_override NUMERIC(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_cash_book_settings_user_date ON cash_book_settings(user_id, date);

DROP TRIGGER IF EXISTS update_cash_book_settings_updated_at ON cash_book_settings;
CREATE TRIGGER update_cash_book_settings_updated_at
  BEFORE UPDATE ON cash_book_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE cash_book_settings DISABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Run in Supabase SQL Editor**

Copy the SQL above and run it in the Supabase dashboard SQL Editor. Verify the table appears in Table Editor.

- [ ] **Step 3: Commit**

```bash
git add lib/db/migration-cash-book.sql
git commit -m "feat: add cash_book_settings migration for opening balance override"
```

---

## Task 2: Types — CashBookEntry interface

**Files:**
- Modify: `app/(app)/accounts-management/actions.ts` (add types at top)

- [ ] **Step 1: Add types to actions.ts after existing interfaces**

Open `app/(app)/accounts-management/actions.ts` and add after the existing interface definitions (after `AccountsReport`):

```typescript
export type CashBookCategory = "SALE" | "RECV" | "PAID" | "REFUND" | "PUR-RET"

export interface CashBookEntry {
  id: string
  time: string        // "HH:MM" format
  description: string
  party_name: string
  category: CashBookCategory
  amount: number      // always positive
  direction: "in" | "out"
  running_balance: number
}

export interface CashBookData {
  opening_balance: number
  opening_balance_is_override: boolean
  cash_in: number
  cash_out: number
  closing_balance: number
  entries: CashBookEntry[]
  date_from: string   // ISO date "YYYY-MM-DD"
  date_to: string     // ISO date "YYYY-MM-DD"
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(app)/accounts-management/actions.ts
git commit -m "feat: add CashBookEntry and CashBookData types"
```

---

## Task 3: Server Action — getCashBook()

**Files:**
- Modify: `app/(app)/accounts-management/actions.ts` (add function at bottom)

- [ ] **Step 1: Add getCashBook action at bottom of actions.ts**

```typescript
export async function getCashBook(
  dateFrom: string,
  dateTo: string
): Promise<{ error: string | null; data: CashBookData | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()
  const userId = currentUser.effectiveUserId

  try {
    // ── 1. Opening balance ────────────────────────────────────────────────
    // Check for manual override on the first date
    const { data: settingsRow } = await supabase
      .from("cash_book_settings")
      .select("opening_balance_override")
      .eq("user_id", userId)
      .eq("date", dateFrom)
      .maybeSingle()

    let opening_balance = 0
    let opening_balance_is_override = false

    if (settingsRow?.opening_balance_override != null) {
      opening_balance = Number(settingsRow.opening_balance_override)
      opening_balance_is_override = true
    } else {
      // Auto: sum all cash movements BEFORE dateFrom
      const { data: prevPayments } = await supabase
        .from("payments")
        .select("amount")
        .eq("user_id", userId)
        .lt("created_at", `${dateFrom}T00:00:00`)

      const { data: prevPurchasePayments } = await supabase
        .from("purchase_payments")
        .select("amount")
        .eq("user_id", userId)
        .lt("created_at", `${dateFrom}T00:00:00`)

      const { data: prevRefunds } = await supabase
        .from("refunds")
        .select("amount, returns!inner(type)")
        .eq("user_id", userId)
        .lt("created_at", `${dateFrom}T00:00:00`)

      const prevIn = (prevPayments || []).reduce((s, r) => s + Number(r.amount || 0), 0)
      const prevOut = (prevPurchasePayments || []).reduce((s, r) => s + Number(r.amount || 0), 0)

      let prevRefundIn = 0
      let prevRefundOut = 0
      ;(prevRefunds || []).forEach((r: any) => {
        if (r.returns?.type === "purchase") prevRefundIn += Number(r.amount || 0)
        else prevRefundOut += Number(r.amount || 0)
      })

      opening_balance = prevIn + prevRefundIn - prevOut - prevRefundOut
    }

    // ── 2. Fetch today's transactions ─────────────────────────────────────
    const startTs = `${dateFrom}T00:00:00`
    const endTs = `${dateTo}T23:59:59`

    // Customer payments received (Cash IN: SALE for POS, RECV for manual)
    const { data: payments } = await supabase
      .from("payments")
      .select(`
        id, amount, created_at, reference,
        sales_invoices!inner(source, parties(name))
      `)
      .eq("user_id", userId)
      .gte("created_at", startTs)
      .lte("created_at", endTs)
      .order("created_at", { ascending: true })

    // Vendor payments made (Cash OUT: PAID)
    const { data: purchasePayments } = await supabase
      .from("purchase_payments")
      .select(`
        id, amount, created_at, reference,
        purchase_invoices!inner(parties(name))
      `)
      .eq("user_id", userId)
      .gte("created_at", startTs)
      .lte("created_at", endTs)
      .order("created_at", { ascending: true })

    // Refunds (sale return = Cash OUT: REFUND, purchase return = Cash IN: PUR-RET)
    const { data: refunds } = await supabase
      .from("refunds")
      .select(`
        id, amount, created_at,
        returns!inner(type, parties(name))
      `)
      .eq("user_id", userId)
      .gte("created_at", startTs)
      .lte("created_at", endTs)
      .order("created_at", { ascending: true })

    // ── 3. Build entries list ─────────────────────────────────────────────
    const rawEntries: Array<Omit<CashBookEntry, "running_balance">> = []

    ;(payments || []).forEach((p: any) => {
      const source = p.sales_invoices?.source
      const partyName = p.sales_invoices?.parties?.name || "Walk-in"
      rawEntries.push({
        id: p.id,
        time: new Date(p.created_at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: false }),
        description: source === "pos" ? `POS Sale — ${partyName}` : `Payment Received — ${partyName}`,
        party_name: partyName,
        category: source === "pos" ? "SALE" : "RECV",
        amount: Number(p.amount || 0),
        direction: "in",
      })
    })

    ;(purchasePayments || []).forEach((p: any) => {
      const partyName = p.purchase_invoices?.parties?.name || "Vendor"
      rawEntries.push({
        id: p.id,
        time: new Date(p.created_at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: false }),
        description: `Vendor Payment — ${partyName}`,
        party_name: partyName,
        category: "PAID",
        amount: Number(p.amount || 0),
        direction: "out",
      })
    })

    ;(refunds || []).forEach((r: any) => {
      const returnType = r.returns?.type
      const partyName = r.returns?.parties?.name || "Customer"
      const isPurchaseReturn = returnType === "purchase"
      rawEntries.push({
        id: r.id,
        time: new Date(r.created_at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: false }),
        description: isPurchaseReturn ? `Purchase Return — ${partyName}` : `Refund Given — ${partyName}`,
        party_name: partyName,
        category: isPurchaseReturn ? "PUR-RET" : "REFUND",
        amount: Number(r.amount || 0),
        direction: isPurchaseReturn ? "in" : "out",
      })
    })

    // Sort all entries by time string (HH:MM)
    rawEntries.sort((a, b) => a.time.localeCompare(b.time))

    // ── 4. Calculate running balance ──────────────────────────────────────
    let running = opening_balance
    const entries: CashBookEntry[] = rawEntries.map((e) => {
      running = e.direction === "in" ? running + e.amount : running - e.amount
      return { ...e, running_balance: running }
    })

    // ── 5. Summary totals ─────────────────────────────────────────────────
    const cash_in = entries.filter((e) => e.direction === "in").reduce((s, e) => s + e.amount, 0)
    const cash_out = entries.filter((e) => e.direction === "out").reduce((s, e) => s + e.amount, 0)
    const closing_balance = opening_balance + cash_in - cash_out

    return {
      error: null,
      data: {
        opening_balance,
        opening_balance_is_override,
        cash_in,
        cash_out,
        closing_balance,
        entries,
        date_from: dateFrom,
        date_to: dateTo,
      },
    }
  } catch (err: any) {
    return { error: err.message || "Failed to load cash book", data: null }
  }
}
```

- [ ] **Step 2: Add upsertOpeningOverride action at bottom of actions.ts**

```typescript
export async function upsertOpeningOverride(
  date: string,
  amount: number,
  notes?: string
): Promise<{ error: string | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { error } = await supabase
    .from("cash_book_settings")
    .upsert(
      {
        user_id: currentUser.effectiveUserId,
        date,
        opening_balance_override: amount,
        notes: notes || null,
      },
      { onConflict: "user_id,date" }
    )

  return { error: error?.message || null }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(app)/accounts-management/actions.ts
git commit -m "feat: add getCashBook and upsertOpeningOverride server actions"
```

---

## Task 4: Cash Book Client Component

**Files:**
- Create: `app/(app)/accounts-management/cash-book/cash-book-client.tsx`

- [ ] **Step 1: Create the client component file**

```tsx
"use client"

import { useState, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Printer, Pencil, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { getCashBook, upsertOpeningOverride } from "../actions"
import type { CashBookData, CashBookEntry, CashBookCategory } from "../actions"
import { CurrencyDisplay } from "@/components/currency-display"

// ── Helpers ──────────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0]
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-PK", {
    day: "numeric", month: "short", year: "numeric",
  })
}

const CATEGORY_CONFIG: Record<CashBookCategory, { label: string; color: string }> = {
  SALE:    { label: "SALE",    color: "bg-emerald-100 text-emerald-700" },
  RECV:    { label: "RECV",    color: "bg-blue-100 text-blue-700" },
  PAID:    { label: "PAID",    color: "bg-red-100 text-red-700" },
  REFUND:  { label: "REFUND",  color: "bg-orange-100 text-orange-700" },
  "PUR-RET": { label: "PUR-RET", color: "bg-purple-100 text-purple-700" },
}

type TabFilter = "all" | "in" | "out"
type QuickRange = "today" | "yesterday" | "week" | "month"

// ── Main Component ────────────────────────────────────────────────────────────

interface CashBookClientProps {
  initialData: CashBookData
  initialDateFrom: string
  initialDateTo: string
}

export function CashBookClient({ initialData, initialDateFrom, initialDateTo }: CashBookClientProps) {
  const [data, setData] = useState<CashBookData>(initialData)
  const [dateFrom, setDateFrom] = useState(initialDateFrom)
  const [dateTo, setDateTo] = useState(initialDateTo)
  const [activeTab, setActiveTab] = useState<TabFilter>("all")
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [overrideAmount, setOverrideAmount] = useState("")
  const [overrideNotes, setOverrideNotes] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const isSingleDay = dateFrom === dateTo

  // ── Data refresh ────────────────────────────────────────────────────────────

  const refresh = useCallback((from: string, to: string) => {
    startTransition(async () => {
      const result = await getCashBook(from, to)
      if (result.error) {
        toast.error(result.error)
      } else if (result.data) {
        setData(result.data)
        setDateFrom(from)
        setDateTo(to)
        setActiveTab("all")
      }
    })
  }, [])

  // ── Quick range buttons ─────────────────────────────────────────────────────

  const applyQuickRange = (range: QuickRange) => {
    const today = toISODate(new Date())
    if (range === "today") {
      refresh(today, today)
    } else if (range === "yesterday") {
      const yday = addDays(today, -1)
      refresh(yday, yday)
    } else if (range === "week") {
      const d = new Date()
      const day = d.getDay()
      const monday = new Date(d)
      monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
      refresh(toISODate(monday), today)
    } else if (range === "month") {
      const d = new Date()
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1)
      refresh(toISODate(firstDay), today)
    }
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goBack = () => {
    if (isSingleDay) {
      const prev = addDays(dateFrom, -1)
      refresh(prev, prev)
    }
  }

  const goForward = () => {
    const today = toISODate(new Date())
    if (isSingleDay && dateFrom < today) {
      const next = addDays(dateFrom, 1)
      refresh(next, next)
    }
  }

  // ── Opening balance override ────────────────────────────────────────────────

  const openOverrideDialog = () => {
    setOverrideAmount(data.opening_balance_is_override ? String(data.opening_balance) : "")
    setOverrideNotes("")
    setOverrideOpen(true)
  }

  const handleOverrideSave = () => {
    const amount = Number(overrideAmount)
    if (isNaN(amount) || overrideAmount === "") {
      toast.error("Enter a valid amount")
      return
    }
    startTransition(async () => {
      const result = await upsertOpeningOverride(dateFrom, amount, overrideNotes || undefined)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Opening balance updated")
        setOverrideOpen(false)
        refresh(dateFrom, dateTo)
      }
    })
  }

  // ── Print ───────────────────────────────────────────────────────────────────

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const dateLabel = isSingleDay
      ? formatDisplayDate(dateFrom)
      : `${formatDisplayDate(dateFrom)} — ${formatDisplayDate(dateTo)}`

    const rows = data.entries.map((e) => `
      <tr>
        <td>${e.time}</td>
        <td>${e.description}</td>
        <td>${e.category}</td>
        <td style="text-align:right; color:${e.direction === "in" ? "#16a34a" : "#dc2626"}">
          ${e.direction === "in" ? "+" : "-"}${e.amount.toLocaleString("en-PK")}
        </td>
        ${isSingleDay ? `<td style="text-align:right; font-weight:600">${e.running_balance.toLocaleString("en-PK")}</td>` : ""}
      </tr>
    `).join("")

    printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Cash Book</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
  h2 { text-align: center; margin-bottom: 4px; }
  .subtitle { text-align: center; color: #666; margin-bottom: 16px; }
  .summary { display: flex; gap: 24px; justify-content: center; margin-bottom: 16px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; }
  .summary-item { text-align: center; }
  .summary-item .label { font-size: 10px; color: #888; text-transform: uppercase; }
  .summary-item .value { font-size: 16px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
  td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
  .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #888; }
  @media print { button { display: none; } }
</style></head><body>
  <h2>Daily Cash Book — Bahi Khata</h2>
  <p class="subtitle">${dateLabel}</p>
  <div class="summary">
    <div class="summary-item"><div class="label">Opening</div><div class="value">₨ ${data.opening_balance.toLocaleString("en-PK")}</div></div>
    <div class="summary-item"><div class="label">Cash In</div><div class="value" style="color:#16a34a">+${data.cash_in.toLocaleString("en-PK")}</div></div>
    <div class="summary-item"><div class="label">Cash Out</div><div class="value" style="color:#dc2626">-${data.cash_out.toLocaleString("en-PK")}</div></div>
    <div class="summary-item"><div class="label">Closing</div><div class="value" style="color:#2563eb">₨ ${data.closing_balance.toLocaleString("en-PK")}</div></div>
  </div>
  <table>
    <thead><tr>
      <th>Time</th><th>Description</th><th>Type</th><th style="text-align:right">Amount</th>
      ${isSingleDay ? "<th style='text-align:right'>Balance</th>" : ""}
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Printed: ${new Date().toLocaleString("en-PK")} | Design By: GENTEC www.nentersoft.com | (92) 300 213 88 68</div>
</body></html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 300)
  }

  // ── Filtered entries ────────────────────────────────────────────────────────

  const filteredEntries: CashBookEntry[] = activeTab === "all"
    ? data.entries
    : data.entries.filter((e) => (activeTab === "in" ? e.direction === "in" : e.direction === "out"))

  const today = toISODate(new Date())
  const isToday = isSingleDay && dateFrom === today

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Date Navigation ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Quick range buttons */}
        <div className="flex gap-1">
          {(["today", "yesterday", "week", "month"] as QuickRange[]).map((r) => (
            <Button
              key={r}
              size="sm"
              variant="outline"
              className="text-xs h-8"
              onClick={() => applyQuickRange(r)}
              disabled={isPending}
            >
              {r === "today" ? "Aaj" : r === "yesterday" ? "Kal" : r === "week" ? "Is Hafta" : "Is Mahine"}
            </Button>
          ))}
        </div>

        {/* Day navigation */}
        <div className="flex items-center gap-1 ml-auto">
          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={goBack} disabled={isPending}>
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-1">
            <Input
              type="date"
              value={dateFrom}
              max={today}
              onChange={(e) => {
                if (e.target.value) refresh(e.target.value, e.target.value)
              }}
              className="h-8 w-36 text-sm"
            />
            {!isSingleDay && (
              <>
                <span className="text-sm text-muted-foreground">—</span>
                <Input
                  type="date"
                  value={dateTo}
                  max={today}
                  min={dateFrom}
                  onChange={(e) => {
                    if (e.target.value) refresh(dateFrom, e.target.value)
                  }}
                  className="h-8 w-36 text-sm"
                />
              </>
            )}
          </div>

          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={goForward}
            disabled={isPending || isToday || !isSingleDay}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <Button size="sm" variant="outline" className="h-8" onClick={handlePrint} disabled={isPending}>
            <Printer className="w-4 h-4 mr-1" />
            Print
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Opening Balance */}
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              Opening Balance
              {isSingleDay && (
                <button onClick={openOverrideDialog} className="ml-auto hover:text-foreground">
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-bold text-foreground">
              <CurrencyDisplay amount={data.opening_balance} />
            </p>
            {data.opening_balance_is_override && (
              <p className="text-xs text-orange-600 mt-0.5">Manual override</p>
            )}
          </CardContent>
        </Card>

        {/* Cash In */}
        <Card className="border-emerald-200">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-emerald-600 uppercase tracking-wide">
              Cash In ↑
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-bold text-emerald-600">
              +<CurrencyDisplay amount={data.cash_in} />
            </p>
          </CardContent>
        </Card>

        {/* Cash Out */}
        <Card className="border-red-200">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-red-600 uppercase tracking-wide">
              Cash Out ↓
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-bold text-red-600">
              -<CurrencyDisplay amount={data.cash_out} />
            </p>
          </CardContent>
        </Card>

        {/* Closing Balance */}
        <Card className="border-blue-200">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-blue-600 uppercase tracking-wide">
              Closing Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-bold text-blue-600">
              <CurrencyDisplay amount={data.closing_balance} />
            </p>
            <p className={`text-xs mt-0.5 ${data.cash_in >= data.cash_out ? "text-emerald-600" : "text-red-600"}`}>
              Net: {data.cash_in >= data.cash_out ? "+" : ""}<CurrencyDisplay amount={data.cash_in - data.cash_out} />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filter Tabs + Table ── */}
      <Card>
        <CardHeader className="pb-0 pt-4 px-4">
          <div className="flex items-center gap-1 border-b">
            {([
              { key: "all", label: `All (${data.entries.length})` },
              { key: "in",  label: `Cash IN (${data.entries.filter(e => e.direction === "in").length})` },
              { key: "out", label: `Cash OUT (${data.entries.filter(e => e.direction === "out").length})` },
            ] as { key: TabFilter; label: string }[]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {isPending ? "Loading..." : "No transactions found for this period."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium w-16">Time</th>
                    <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Description</th>
                    <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium w-24">Type</th>
                    <th className="text-right px-4 py-2 text-xs text-muted-foreground font-medium w-28">Amount</th>
                    {isSingleDay && (
                      <th className="text-right px-4 py-2 text-xs text-muted-foreground font-medium w-28">Balance</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry, idx) => {
                    const cat = CATEGORY_CONFIG[entry.category]
                    return (
                      <tr key={entry.id} className={`border-b last:border-0 ${idx % 2 === 0 ? "" : "bg-muted/20"}`}>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{entry.time}</td>
                        <td className="px-4 py-2.5 text-sm">{entry.description}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${cat.color}`}>
                            {cat.label}
                          </span>
                        </td>
                        <td className={`px-4 py-2.5 text-right font-medium text-sm ${
                          entry.direction === "in" ? "text-emerald-600" : "text-red-600"
                        }`}>
                          {entry.direction === "in" ? "+" : "-"}<CurrencyDisplay amount={entry.amount} />
                        </td>
                        {isSingleDay && (
                          <td className="px-4 py-2.5 text-right text-sm font-semibold">
                            <CurrencyDisplay amount={entry.running_balance} />
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Opening Balance Override Dialog ── */}
      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Set Opening Balance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Opening Balance (₨)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={overrideAmount}
                onChange={(e) => setOverrideAmount(e.target.value)}
                placeholder="Amount in cash drawer"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Count the cash in your drawer and enter the amount.
                Auto-calculated was: ₨ {data.opening_balance_is_override ? "overridden" : data.opening_balance.toLocaleString("en-PK")}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                type="text"
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                placeholder="e.g. 200 rupay pocket mein the"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleOverrideSave} disabled={isPending || overrideAmount === ""}>
              {isPending ? "Saving..." : "Save Opening Balance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(app)/accounts-management/cash-book/cash-book-client.tsx
git commit -m "feat: add CashBookClient component with date nav, tabs, table, print, override dialog"
```

---

## Task 5: Server Page Component

**Files:**
- Create: `app/(app)/accounts-management/cash-book/page.tsx`

- [ ] **Step 1: Create page.tsx**

```tsx
import { requirePrivilege } from "@/lib/auth/privileges"
import { getCashBook } from "../actions"
import { CashBookClient } from "./cash-book-client"
import { Card, CardContent } from "@/components/ui/card"

export default async function CashBookPage() {
  await requirePrivilege("accounts")

  const today = new Date().toISOString().split("T")[0]
  const result = await getCashBook(today, today)

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Daily Cash Book — Bahi Khata</h1>
          <p className="text-sm text-muted-foreground">All cash movements for any day or date range.</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Error loading cash book: {result.error || "Unknown error"}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Daily Cash Book — Bahi Khata</h1>
        <p className="text-sm text-muted-foreground">All cash movements for any day or date range.</p>
      </div>
      <CashBookClient
        initialData={result.data}
        initialDateFrom={today}
        initialDateTo={today}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(app)/accounts-management/cash-book/page.tsx
git commit -m "feat: add Cash Book server page component"
```

---

## Task 6: Sidebar Navigation Link

**Files:**
- Modify: `components/sidebar.tsx` line ~143-148

- [ ] **Step 1: Add Cash Book to accounts-management children array**

Find this section in `components/sidebar.tsx`:

```tsx
{ href: "/accounts-management/overview", label: "Overview", icon: BarChart3, privilege: "accounts" as ModulePrivilege },
{ href: "/accounts-management/ledgers", label: "Ledgers", icon: BookOpen, privilege: "accounts" as ModulePrivilege },
{ href: "/accounts-management/customer-ledgers", label: "Customer Ledgers", icon: Users, privilege: "accounts" as ModulePrivilege },
{ href: "/accounts-management/vendor-ledgers", label: "Vendor Ledgers", icon: ShoppingBag, privilege: "accounts" as ModulePrivilege },
{ href: "/accounts-management/reports", label: "Reports", icon: FileTextIcon, privilege: "accounts" as ModulePrivilege },
```

Replace with (add Cash Book entry — import `BookCheck` from lucide-react at top of file):

```tsx
{ href: "/accounts-management/overview", label: "Overview", icon: BarChart3, privilege: "accounts" as ModulePrivilege },
{ href: "/accounts-management/cash-book", label: "Cash Book", icon: BookCheck, privilege: "accounts" as ModulePrivilege },
{ href: "/accounts-management/ledgers", label: "Ledgers", icon: BookOpen, privilege: "accounts" as ModulePrivilege },
{ href: "/accounts-management/customer-ledgers", label: "Customer Ledgers", icon: Users, privilege: "accounts" as ModulePrivilege },
{ href: "/accounts-management/vendor-ledgers", label: "Vendor Ledgers", icon: ShoppingBag, privilege: "accounts" as ModulePrivilege },
{ href: "/accounts-management/reports", label: "Reports", icon: FileTextIcon, privilege: "accounts" as ModulePrivilege },
```

Also add `BookCheck` to the lucide-react import at the top of `components/sidebar.tsx`.

- [ ] **Step 2: Commit**

```bash
git add components/sidebar.tsx
git commit -m "feat: add Cash Book link to Accounts Management sidebar"
```

---

## Task 7: Verify end-to-end

- [ ] **Step 1: Run dev server**

```bash
npm run dev
```

- [ ] **Step 2: Check these scenarios**

1. Navigate to **Accounts Management → Cash Book**
2. Verify today's transactions show (if any exist in DB)
3. Click **Kal** — verify yesterday's data loads
4. Click **Is Hafta** — verify running balance column disappears (range mode)
5. Click **Print** — verify print window opens with correct data
6. Click pencil icon on Opening Balance — enter a number, save — verify card updates
7. Navigate to a different date and back — verify override is date-specific
8. Verify **◀** and **▶** arrows work for day-by-day navigation

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: Daily Cash Book (Bahi Khata) — complete implementation"
```
