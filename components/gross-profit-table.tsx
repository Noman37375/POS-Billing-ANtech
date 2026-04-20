"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ExportButtons } from "@/components/export-buttons"
import { Skeleton } from "@/components/ui/skeleton"
import type { GrossProfitRow } from "@/app/(app)/pos/reports/actions"

type PeriodType = "today" | "week" | "month" | "year" | "custom"

interface GrossProfitTableProps {
  data: GrossProfitRow[]
  dateFrom?: string
  dateTo?: string
  timeFrom?: string
  timeTo?: string
  period?: string
  storeName?: string
  baseUrl?: string
}

function fmt(n: number) {
  return n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtPct(n: number) {
  return fmt(n) + "%"
}

function fmtDatePrint(d?: string): string {
  if (!d) return "—"
  const [y, m, day] = d.split("-")
  return `${day}/${m}/${y}`
}

function fmtTimePrint(t: string): string {
  const [h, m] = t.split(":")
  const hour = parseInt(h)
  const ampm = hour >= 12 ? "PM" : "AM"
  const h12 = hour % 12 || 12
  return `${h12}:${m} ${ampm}`
}

function toDateStr(d: Date): string {
  // Use PKT (UTC+5) so date is correct even after 7 PM PKT (midnight UTC)
  const pkt = new Date(d.getTime() + 5 * 60 * 60 * 1000)
  return pkt.toISOString().split("T")[0]
}

function getPresetDates(period: PeriodType): { dateFrom: string; dateTo: string } {
  const today = new Date()
  const todayStr = toDateStr(today)
  switch (period) {
    case "today":
      return { dateFrom: todayStr, dateTo: todayStr }
    case "week": {
      const day = today.getDay() // 0=Sun
      const diff = day === 0 ? -6 : 1 - day // Monday
      const monday = new Date(today)
      monday.setDate(today.getDate() + diff)
      return { dateFrom: toDateStr(monday), dateTo: todayStr }
    }
    case "month": {
      const first = new Date(today.getFullYear(), today.getMonth(), 1)
      return { dateFrom: toDateStr(first), dateTo: todayStr }
    }
    case "year": {
      const first = new Date(today.getFullYear(), 0, 1)
      return { dateFrom: toDateStr(first), dateTo: todayStr }
    }
    default:
      return { dateFrom: "", dateTo: "" }
  }
}

export function GrossProfitTable({ data, dateFrom, dateTo, timeFrom, timeTo, period, storeName, baseUrl }: GrossProfitTableProps) {
  const router = useRouter()
  const navBase = baseUrl ?? "/pos/reports"
  const [isPending, startTransition] = useTransition()

  const [activePeriod, setActivePeriod] = useState<PeriodType>((period as PeriodType) || "today")
  const [fromDate, setFromDate] = useState(dateFrom ?? "")
  const [toDate, setToDate] = useState(dateTo ?? "")
  const [fromTime, setFromTime] = useState(timeFrom ?? "09:00")
  const [toTime, setToTime] = useState(timeTo ?? "23:59")

  // Whether this period uses a time filter
  const showTime = activePeriod === "today" || activePeriod === "custom"

  // When a preset is chosen, update inputs immediately + navigate
  const handlePeriodChange = useCallback(
    (value: string) => {
      const p = value as PeriodType
      setActivePeriod(p)
      if (p === "custom") return // just show inputs for user to fill
      const { dateFrom: df, dateTo: dt } = getPresetDates(p)
      setFromDate(df)
      setToDate(dt)
      // Today keeps 9AM-23:59; week/month/year use full day (no time restriction)
      const tf = p === "today" ? "09:00" : "00:00"
      const tt = "23:59"
      setFromTime(tf)
      setToTime(tt)
      const params = new URLSearchParams()
      params.set("period", p)
      params.set("dateFrom", df)
      params.set("dateTo", dt)
      params.set("timeFrom", tf)
      params.set("timeTo", tt)
      startTransition(() => {
        router.push(`${navBase}?${params.toString()}`)
      })
    },
    [router],
  )

  // Apply button — navigate with current input values
  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const params = new URLSearchParams()
      params.set("period", activePeriod)
      if (fromDate) params.set("dateFrom", fromDate)
      if (toDate) params.set("dateTo", toDate)
      if (fromTime) params.set("timeFrom", fromTime)
      if (toTime) params.set("timeTo", toTime)
      startTransition(() => {
        router.push(`${navBase}?${params.toString()}`)
      })
    },
    [router, startTransition, activePeriod, fromDate, toDate, fromTime, toTime],
  )

  // Grand total row
  const totals = data.reduce(
    (acc, row) => ({
      total_sale_qty: acc.total_sale_qty + row.total_sale_qty,
      sale_amount: acc.sale_amount + row.sale_amount,
      purchase_amount: acc.purchase_amount + row.purchase_amount,
      gp_value: acc.gp_value + row.gp_value,
    }),
    { total_sale_qty: 0, sale_amount: 0, purchase_amount: 0, gp_value: 0 },
  )
  const grandGpPctPurchase =
    totals.purchase_amount > 0 ? (totals.gp_value / totals.purchase_amount) * 100 : totals.gp_value !== 0 ? 100 : 0
  const grandGpPctSale = totals.sale_amount > 0 ? (totals.gp_value / totals.sale_amount) * 100 : 0

  const exportData = data.map((row) => ({
    barcode: row.barcode ?? "",
    item_name: row.item_name,
    total_sale_qty: row.total_sale_qty,
    avg_price: row.avg_price,
    sale_amount: row.sale_amount,
    purchase_price: row.purchase_price,
    purchase_amount: row.purchase_amount,
    gp_value: row.gp_value,
    gp_pct_purchase: row.gp_pct_purchase,
    gp_pct_sale: row.gp_pct_sale,
  }))

  const exportColumns = [
    { key: "barcode", header: "Bar Code" },
    { key: "item_name", header: "Item" },
    { key: "total_sale_qty", header: "T.Sale Qty" },
    { key: "avg_price", header: "Avg Price" },
    { key: "sale_amount", header: "Sale Amt" },
    { key: "purchase_price", header: "Purchase Price" },
    { key: "purchase_amount", header: "Purchase Amt" },
    { key: "gp_value", header: "G.P.Value" },
    { key: "gp_pct_purchase", header: "GP% Purchase" },
    { key: "gp_pct_sale", header: "GP% Sale" },
  ]

  function buildPrintHtml(paramsText: string): string {
    const fullTitle = storeName ? `${storeName} Gross Profit Report` : "Gross Profit Report"
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    const n = (v: number) => v.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const gpColor = (v: number) => (v >= 0 ? "color:#059669;font-weight:600;" : "color:#dc2626;font-weight:600;")

    const headCols = ["Bar Code","Item","T.Sale Qty","Avg Price","Sale Amt","Purchase Price","Purchase Amt","G.P.Value","GP% Purchase","GP% Sale"]
    const thStyle = "border:1px solid #ddd;padding:6px 8px;font-size:10px;font-weight:600;background:#f5f5f5;white-space:nowrap;"
    const tdBase = "border:1px solid #ddd;padding:5px 8px;font-size:10px;"
    const tdR = tdBase + "text-align:right;"

    const headerRow = headCols.map((h, i) => `<th style="${thStyle}${i > 1 ? "text-align:right;" : ""}">${esc(h)}</th>`).join("")

    const bodyRows = data.map((row) => `
      <tr>
        <td style="${tdBase}color:#666;">${esc(row.barcode ?? "—")}</td>
        <td style="${tdBase}font-weight:500;">${esc(row.item_name)}</td>
        <td style="${tdR}">${row.total_sale_qty}</td>
        <td style="${tdR}">${n(row.avg_price)}</td>
        <td style="${tdR}">${n(row.sale_amount)}</td>
        <td style="${tdR}">${n(row.purchase_price)}</td>
        <td style="${tdR}">${n(row.purchase_amount)}</td>
        <td style="${tdR}${gpColor(row.gp_value)}">${n(row.gp_value)}</td>
        <td style="${tdR}">${n(row.gp_pct_purchase)}%</td>
        <td style="${tdR}">${n(row.gp_pct_sale)}%</td>
      </tr>`).join("")

    const grandTotalRow = `
      <tr style="background:#f0f0f0;border-top:2px solid #aaa;">
        <td colspan="2" style="${tdBase}font-weight:700;">Grand Total</td>
        <td style="${tdR}font-weight:700;">${totals.total_sale_qty}</td>
        <td style="${tdR}color:#999;">—</td>
        <td style="${tdR}font-weight:700;">${n(totals.sale_amount)}</td>
        <td style="${tdR}color:#999;">—</td>
        <td style="${tdR}font-weight:700;">${n(totals.purchase_amount)}</td>
        <td style="${tdR}${gpColor(totals.gp_value)}font-weight:700;">${n(totals.gp_value)}</td>
        <td style="${tdR}font-weight:700;">${n(grandGpPctPurchase)}%</td>
        <td style="${tdR}font-weight:700;">${n(grandGpPctSale)}%</td>
      </tr>`

    const today = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(fullTitle)}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 16px; }
    .report-title { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 6px; }
    .report-params { font-size: 9px; color: #333; margin-bottom: 12px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    .note { font-size: 9px; color: #666; font-style: italic; margin-bottom: 16px; }
    .footer { margin-top: 16px; font-size: 9px; color: #555; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
    .footer-center { text-align: center; }
    @media print { body { margin: 10px; } }
  </style>
</head>
<body>
  <div class="report-title">${esc(fullTitle)}</div>
  <div class="report-params"><strong>Report Parameters</strong><br>${esc(paramsText).replace(/\n/g, "<br>")}</div>
  <table>
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${bodyRows}${grandTotalRow}</tbody>
  </table>
  <p class="note">Note: All Column values calculate on Last cost rate.</p>
  <div class="footer">
    <span>User Name: ADMIN</span>
    <span class="footer-center">${today}<br>Design By: AN-Tech Solutions</span>
    <span>Page 1</span>
  </div>
</body>
</html>`
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <CardTitle className="text-base sm:text-lg shrink-0">Item-wise Gross Profit</CardTitle>

          <div className="flex flex-col gap-2 items-start sm:items-end">
            {/* Period selector + export buttons row */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={activePeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Date</SelectItem>
                </SelectContent>
              </Select>

              {(() => {
                const periodLabel: Record<string, string> = {
                  today: "Daily Report",
                  week: "Weekly Report",
                  month: "Monthly Report",
                  year: "Yearly Report",
                  custom: "Custom Report",
                }
                const label = periodLabel[activePeriod] ?? "Gross Profit Report"
                const dateRange = fromDate === toDate
                  ? `Date: ${fmtDatePrint(fromDate)}`
                  : `From: ${fmtDatePrint(fromDate)}  —  To: ${fmtDatePrint(toDate)}`
                const timeRange = showTime
                  ? `\nTime: ${fmtTimePrint(fromTime)}  to  ${fmtTimePrint(toTime)}`
                  : ""
                const locationLine = storeName ? `\nLocation: ${storeName}` : ""
                const params = `${label}\n${dateRange}${timeRange}${locationLine}`
                return (
                  <ExportButtons
                    data={exportData}
                    columns={exportColumns}
                    filename={`gross-profit-${new Date().toISOString().split("T")[0]}`}
                    title="Gross Profit Report"
                    printStoreName={storeName}
                    printReportParams={params}
                    printLocation={storeName}
                    printHtml={data.length > 0 ? buildPrintHtml(params) : undefined}
                  />
                )
              })()}
            </div>

            {/* Date inputs always visible; time inputs only for Today / Custom */}
            <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="gp-dateFrom" className="text-xs">From Date</Label>
                <Input id="gp-dateFrom" name="dateFrom" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-8 w-36" />
              </div>
              {showTime && (
                <div className="space-y-1">
                  <Label htmlFor="gp-timeFrom" className="text-xs">Time</Label>
                  <Input id="gp-timeFrom" name="timeFrom" type="time" value={fromTime} onChange={e => setFromTime(e.target.value)} className="h-8 w-28" />
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="gp-dateTo" className="text-xs">To Date</Label>
                <Input id="gp-dateTo" name="dateTo" type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-8 w-36" />
              </div>
              {showTime && (
                <div className="space-y-1">
                  <Label htmlFor="gp-timeTo" className="text-xs">Time</Label>
                  <Input id="gp-timeTo" name="timeTo" type="time" value={toTime} onChange={e => setToTime(e.target.value)} className="h-8 w-28" />
                </div>
              )}
              <Button type="submit" size="sm" className="self-end">
                Apply
              </Button>
            </form>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 pt-0">
        {isPending ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  {["Bar Code","Item","T.Sale Qty","Avg Price","Sale Amt","Purchase Price","Purchase Amt","G.P.Value","GP% Purchase","GP% Sale"].map((h) => (
                    <th key={h} className="py-2.5 px-3 text-xs font-medium whitespace-nowrap">
                      <Skeleton className="h-3 w-16" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 9 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2 px-3"><Skeleton className="h-3 w-14" /></td>
                    <td className="py-2 px-3"><Skeleton className="h-3 w-36" /></td>
                    <td className="py-2 px-3 text-right"><Skeleton className="h-3 w-10 ml-auto" /></td>
                    <td className="py-2 px-3 text-right"><Skeleton className="h-3 w-14 ml-auto" /></td>
                    <td className="py-2 px-3 text-right"><Skeleton className="h-3 w-16 ml-auto" /></td>
                    <td className="py-2 px-3 text-right"><Skeleton className="h-3 w-16 ml-auto" /></td>
                    <td className="py-2 px-3 text-right"><Skeleton className="h-3 w-16 ml-auto" /></td>
                    <td className="py-2 px-3 text-right"><Skeleton className="h-3 w-16 ml-auto" /></td>
                    <td className="py-2 px-3 text-right"><Skeleton className="h-3 w-12 ml-auto" /></td>
                    <td className="py-2 px-3 text-right"><Skeleton className="h-3 w-12 ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No sales data found for the selected period.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2.5 px-3 text-xs font-medium whitespace-nowrap">Bar Code</th>
                    <th className="py-2.5 px-3 text-xs font-medium">Item</th>
                    <th className="py-2.5 px-3 text-xs font-medium text-right whitespace-nowrap">T.Sale Qty</th>
                    <th className="py-2.5 px-3 text-xs font-medium text-right whitespace-nowrap">Avg Price</th>
                    <th className="py-2.5 px-3 text-xs font-medium text-right whitespace-nowrap">Sale Amt</th>
                    <th className="py-2.5 px-3 text-xs font-medium text-right whitespace-nowrap">Purchase Price</th>
                    <th className="py-2.5 px-3 text-xs font-medium text-right whitespace-nowrap">Purchase Amt</th>
                    <th className="py-2.5 px-3 text-xs font-medium text-right whitespace-nowrap">G.P.Value</th>
                    <th className="py-2.5 px-3 text-xs font-medium text-right whitespace-nowrap">GP% Purchase</th>
                    <th className="py-2.5 px-3 text-xs font-medium text-right whitespace-nowrap">GP% Sale</th>
                  </tr>
                </thead>
                <tbody className="[&>tr:not(:last-child)]:border-b">
                  {data.map((row) => (
                    <tr key={row.item_id} className="hover:bg-muted/50">
                      <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">
                        {row.barcode ?? "—"}
                      </td>
                      <td className="py-2 px-3 text-xs font-medium">{row.item_name}</td>
                      <td className="py-2 px-3 text-xs text-right">{row.total_sale_qty}</td>
                      <td className="py-2 px-3 text-xs text-right">{fmt(row.avg_price)}</td>
                      <td className="py-2 px-3 text-xs text-right">{fmt(row.sale_amount)}</td>
                      <td className="py-2 px-3 text-xs text-right">{fmt(row.purchase_price)}</td>
                      <td className="py-2 px-3 text-xs text-right">{fmt(row.purchase_amount)}</td>
                      <td
                        className={`py-2 px-3 text-xs text-right font-medium ${
                          row.gp_value >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {fmt(row.gp_value)}
                      </td>
                      <td className="py-2 px-3 text-xs text-right">{fmtPct(row.gp_pct_purchase)}</td>
                      <td className="py-2 px-3 text-xs text-right">{fmtPct(row.gp_pct_sale)}</td>
                    </tr>
                  ))}

                  {/* Grand Total Row */}
                  <tr className="border-t-2 border-foreground/20 bg-muted/40 font-semibold">
                    <td className="py-2.5 px-3 text-xs" colSpan={2}>
                      Grand Total
                    </td>
                    <td className="py-2.5 px-3 text-xs text-right">{totals.total_sale_qty}</td>
                    <td className="py-2.5 px-3 text-xs text-right text-muted-foreground">—</td>
                    <td className="py-2.5 px-3 text-xs text-right">{fmt(totals.sale_amount)}</td>
                    <td className="py-2.5 px-3 text-xs text-right text-muted-foreground">—</td>
                    <td className="py-2.5 px-3 text-xs text-right">{fmt(totals.purchase_amount)}</td>
                    <td
                      className={`py-2.5 px-3 text-xs text-right ${
                        totals.gp_value >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {fmt(totals.gp_value)}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-right">{fmtPct(grandGpPctPurchase)}</td>
                    <td className="py-2.5 px-3 text-xs text-right">{fmtPct(grandGpPctSale)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">
              Note: All Column values calculate on Last cost rate.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
