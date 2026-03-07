"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExportButtons } from "@/components/export-buttons"
import type { GrossProfitRow } from "@/app/(app)/pos/reports/actions"

interface GrossProfitTableProps {
  data: GrossProfitRow[]
  dateFrom?: string
  dateTo?: string
  timeFrom?: string
  timeTo?: string
  storeName?: string
}

function fmt(n: number) {
  return n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtPct(n: number) {
  return fmt(n) + "%"
}

function formatReportDateTime(d?: string, t?: string, type: "from" | "to" = "from") {
  if (!d) return "ALL"
  const [datePart] = d.split("T")
  const [y, m, day] = datePart.split("-")
  const time = t || (type === "from" ? "09:00" : "23:59")
  const [hStr, minStr] = time.split(":")
  const hour = parseInt(hStr)
  const ampm = hour >= 12 ? "PM" : "AM"
  const h12 = String(hour % 12 || 12).padStart(2, "0")
  return `${day}/${m}/${y} ${h12}:${minStr}:00 ${ampm}`
}

export function GrossProfitTable({ data, dateFrom, dateTo, timeFrom, timeTo, storeName }: GrossProfitTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const form = e.currentTarget
      const from = (form.elements.namedItem("dateFrom") as HTMLInputElement)?.value
      const to = (form.elements.namedItem("dateTo") as HTMLInputElement)?.value
      const tf = (form.elements.namedItem("timeFrom") as HTMLInputElement)?.value
      const tt = (form.elements.namedItem("timeTo") as HTMLInputElement)?.value
      const params = new URLSearchParams(searchParams.toString())
      if (from) params.set("dateFrom", from)
      else params.delete("dateFrom")
      if (to) params.set("dateTo", to)
      else params.delete("dateTo")
      if (tf) params.set("timeFrom", tf)
      else params.delete("timeFrom")
      if (tt) params.set("timeTo", tt)
      else params.delete("timeTo")
      router.push(`/pos/reports?${params.toString()}`)
    },
    [router, searchParams],
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

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <CardTitle className="text-base sm:text-lg">Item-wise Gross Profit</CardTitle>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
          <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="gp-dateFrom" className="text-xs">From Date</Label>
              <Input id="gp-dateFrom" name="dateFrom" type="date" defaultValue={dateFrom} className="h-8 w-36" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gp-timeFrom" className="text-xs">Time</Label>
              <Input id="gp-timeFrom" name="timeFrom" type="time" defaultValue={timeFrom ?? "09:00"} className="h-8 w-28" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gp-dateTo" className="text-xs">To Date</Label>
              <Input id="gp-dateTo" name="dateTo" type="date" defaultValue={dateTo} className="h-8 w-36" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gp-timeTo" className="text-xs">Time</Label>
              <Input id="gp-timeTo" name="timeTo" type="time" defaultValue={timeTo ?? "23:59"} className="h-8 w-28" />
            </div>
            <Button type="submit" size="sm">
              Apply
            </Button>
          </form>
          <ExportButtons
            data={exportData}
            columns={exportColumns}
            filename={`gross-profit-${new Date().toISOString().split("T")[0]}`}
            title="Gross Profit Report"
            printStoreName={storeName}
            printReportParams={`From Date: ${formatReportDateTime(dateFrom, timeFrom, "from")} AND To Date: ${formatReportDateTime(dateTo, timeTo, "to")} AND From Barcode: ALL AND To Barcode: ALL AND Vendor: ALL AND Location: ${storeName || "ALL"} AND Brand: ALL AND Department: ALL AND Order By: G.P. Value AND Type: Descending AND All Record(s): No AND Party`}
            printLocation={storeName}
          />
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 pt-0">
        {data.length === 0 ? (
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
