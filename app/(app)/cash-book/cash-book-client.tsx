"use client"

import { useState, useTransition, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Printer, Pencil, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { getCashBook, upsertOpeningOverride } from "../accounts-management/actions"
import type { CashBookData, CashBookEntry, CashBookCategory } from "../accounts-management/actions"
import { CurrencyDisplay } from "@/components/currency-display"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// ── Helpers ──────────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0]
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00")
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-PK", {
    day: "numeric", month: "short", year: "numeric",
  })
}

const CATEGORY_CONFIG: Record<CashBookCategory, { label: string; color: string }> = {
  SALE:      { label: "SALE",    color: "bg-emerald-100 text-emerald-700" },
  RECV:      { label: "RECV",    color: "bg-blue-100 text-blue-700" },
  PAID:      { label: "PAID",    color: "bg-red-100 text-red-700" },
  REFUND:    { label: "REFUND",  color: "bg-orange-100 text-orange-700" },
  "PUR-RET": { label: "PUR-RET", color: "bg-purple-100 text-purple-700" },
}

type TabFilter = "all" | "in" | "out"
type QuickRange = "today" | "yesterday" | "week" | "month" | "custom"

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
  const [quickRange, setQuickRange] = useState<QuickRange>("today")
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [overrideAmount, setOverrideAmount] = useState("")
  const [overrideNotes, setOverrideNotes] = useState("")
  const [isPending, startTransition] = useTransition()

  const isSingleDay = dateFrom === dateTo
  const today = toISODate(new Date())

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

  // ── Quick range ─────────────────────────────────────────────────────────────

  const applyQuickRange = (range: QuickRange) => {
    setQuickRange(range)
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

  // ── Day navigation ──────────────────────────────────────────────────────────

  const goBack = () => {
    if (isSingleDay) { setQuickRange("custom"); refresh(addDays(dateFrom, -1), addDays(dateFrom, -1)) }
  }

  const goForward = () => {
    if (isSingleDay && dateFrom < today) { setQuickRange("custom"); refresh(addDays(dateFrom, 1), addDays(dateFrom, 1)) }
  }

  // ── Opening override ────────────────────────────────────────────────────────

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
        <td style="text-align:right;color:${e.direction === "in" ? "#16a34a" : "#dc2626"}">
          ${e.direction === "in" ? "+" : "-"}${e.amount.toLocaleString("en-PK")}
        </td>
        ${isSingleDay ? `<td style="text-align:right;font-weight:600">${e.running_balance.toLocaleString("en-PK")}</td>` : ""}
      </tr>
    `).join("")

    printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Cash Book</title>
<style>
  body{font-family:Arial,sans-serif;font-size:12px;padding:20px}
  h2{text-align:center;margin-bottom:4px}
  .subtitle{text-align:center;color:#666;margin-bottom:16px}
  .summary{display:flex;gap:24px;justify-content:center;margin-bottom:16px;padding:12px;border:1px solid #e2e8f0;border-radius:6px}
  .summary-item{text-align:center}
  .lbl{font-size:10px;color:#888;text-transform:uppercase}
  .val{font-size:16px;font-weight:700}
  table{width:100%;border-collapse:collapse}
  th{background:#f1f5f9;padding:6px 8px;text-align:left;font-size:11px;text-transform:uppercase}
  td{padding:5px 8px;border-bottom:1px solid #f1f5f9}
  .footer{margin-top:20px;text-align:center;font-size:10px;color:#888}
</style></head><body>
<h2>Daily Cash Book — Bahi Khata</h2>
<p class="subtitle">${dateLabel}</p>
<div class="summary">
  <div class="summary-item"><div class="lbl">Opening</div><div class="val">₨ ${data.opening_balance.toLocaleString("en-PK")}</div></div>
  <div class="summary-item"><div class="lbl">Cash In</div><div class="val" style="color:#16a34a">+${data.cash_in.toLocaleString("en-PK")}</div></div>
  <div class="summary-item"><div class="lbl">Cash Out</div><div class="val" style="color:#dc2626">-${data.cash_out.toLocaleString("en-PK")}</div></div>
  <div class="summary-item"><div class="lbl">Closing</div><div class="val" style="color:#2563eb">₨ ${data.closing_balance.toLocaleString("en-PK")}</div></div>
</div>
<table>
  <thead><tr>
    <th>Time</th><th>Description</th><th>Type</th>
    <th style="text-align:right">Amount</th>
    ${isSingleDay ? "<th style='text-align:right'>Balance</th>" : ""}
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">Printed: ${new Date().toLocaleString("en-PK")} | Design By: AN-Tech Solutions</div>
</body></html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 300)
  }

  // ── Filtered entries ────────────────────────────────────────────────────────

  const filteredEntries: CashBookEntry[] = activeTab === "all"
    ? data.entries
    : data.entries.filter((e) => activeTab === "in" ? e.direction === "in" : e.direction === "out")

  const inCount = data.entries.filter((e) => e.direction === "in").length
  const outCount = data.entries.filter((e) => e.direction === "out").length

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Daily Cash Book — Bahi Khata</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Daily cash flow summary.</p>
      </div>

      {/* Date Navigation */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Quick Range Dropdown */}
        <Select value={quickRange} onValueChange={(v) => applyQuickRange(v as QuickRange)} disabled={isPending}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>

        {/* From — To date inputs */}
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={goBack} disabled={isPending || !isSingleDay}>
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Input
            type="date"
            value={dateFrom}
            max={today}
            onChange={(e) => { if (e.target.value) { setQuickRange("custom"); refresh(e.target.value, e.target.value) } }}
            className="h-8 w-36 text-sm"
          />

          <span className="text-sm text-muted-foreground px-1">—</span>

          <Input
            type="date"
            value={dateTo}
            max={today}
            min={dateFrom}
            onChange={(e) => { if (e.target.value) { setQuickRange("custom"); refresh(dateFrom, e.target.value) } }}
            className="h-8 w-36 text-sm"
          />

          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={goForward} disabled={isPending || !isSingleDay || dateFrom >= today}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Button size="sm" variant="outline" className="h-8 ml-auto" onClick={handlePrint} disabled={isPending}>
          <Printer className="w-4 h-4 mr-1" />
          Print
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              Opening Balance
              {isSingleDay && (
                <button onClick={openOverrideDialog} className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-bold"><CurrencyDisplay amount={data.opening_balance} /></p>
            {data.opening_balance_is_override && (
              <p className="text-xs text-orange-600 mt-0.5">Manual override</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-emerald-200">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-emerald-600 uppercase tracking-wide">Cash In ↑</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-bold text-emerald-600">+<CurrencyDisplay amount={data.cash_in} /></p>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-red-600 uppercase tracking-wide">Cash Out ↓</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-bold text-red-600">-<CurrencyDisplay amount={data.cash_out} /></p>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-blue-600 uppercase tracking-wide">Closing Balance</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-bold text-blue-600"><CurrencyDisplay amount={data.closing_balance} /></p>
            <p className={`text-xs mt-0.5 ${data.cash_in >= data.cash_out ? "text-emerald-600" : "text-red-600"}`}>
              Net: {data.cash_in >= data.cash_out ? "+" : ""}<CurrencyDisplay amount={data.cash_in - data.cash_out} />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs + Table */}
      <Card>
        <CardHeader className="pb-0 pt-3 px-4">
          <div className="flex items-center gap-0 border-b">
            {([
              { key: "all" as TabFilter, label: `All (${data.entries.length})` },
              { key: "in"  as TabFilter, label: `Cash IN (${inCount})` },
              { key: "out" as TabFilter, label: `Cash OUT (${outCount})` },
            ]).map((tab) => (
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
                      <tr key={entry.id} className={`border-b last:border-0 ${idx % 2 === 1 ? "bg-muted/20" : ""}`}>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{entry.time}</td>
                        <td className="px-4 py-2.5">{entry.description}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${cat.color}`}>
                            {cat.label}
                          </span>
                        </td>
                        <td className={`px-4 py-2.5 text-right font-medium ${entry.direction === "in" ? "text-emerald-600" : "text-red-600"}`}>
                          {entry.direction === "in" ? "+" : "-"}<CurrencyDisplay amount={entry.amount} />
                        </td>
                        {isSingleDay && (
                          <td className="px-4 py-2.5 text-right font-semibold">
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

      {/* Opening Balance Override Dialog */}
      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Set Opening Balance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Cash in drawer (₨)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={overrideAmount}
                onChange={(e) => setOverrideAmount(e.target.value)}
                placeholder="Count karo aur amount enter karo"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Auto-calculated: ₨ {data.opening_balance_is_override ? "(overridden)" : data.opening_balance.toLocaleString("en-PK")}
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
            <Button variant="outline" onClick={() => setOverrideOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleOverrideSave} disabled={isPending || overrideAmount === ""}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
