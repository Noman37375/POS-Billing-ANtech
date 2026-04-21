"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Printer, TrendingUp, TrendingDown, DollarSign, ShoppingBag, Receipt } from "lucide-react"
import { getPLStatement, type PLStatement } from "../actions"
import { CurrencyDisplay } from "@/components/currency-display"
import { toast } from "sonner"

type QuickPeriod = "mtd" | "ytd" | "q1" | "q2" | "q3" | "q4" | "custom"

function getPKTDate(): string {
  return new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().split("T")[0]
}

function formatDisplayDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-PK", {
    day: "numeric", month: "short", year: "numeric",
  })
}

interface PLStatementClientProps {
  initialData: PLStatement | null
  initialError: string | null
  initialDateFrom: string
  initialDateTo: string
}

export function PLStatementClient({ initialData, initialError, initialDateFrom, initialDateTo }: PLStatementClientProps) {
  const [data, setData] = useState<PLStatement | null>(initialData)
  const [error, setError] = useState<string | null>(initialError)
  const [dateFrom, setDateFrom] = useState(initialDateFrom)
  const [dateTo, setDateTo] = useState(initialDateTo)
  const [period, setPeriod] = useState<QuickPeriod>("mtd")
  const [isPending, startTransition] = useTransition()

  const today = getPKTDate()
  const currentYear = new Date().getFullYear()

  const applyPeriod = (p: QuickPeriod, from?: string, to?: string) => {
    let f = from ?? dateFrom
    let t = to ?? dateTo
    const y = currentYear
    if (p === "mtd") {
      f = `${today.substring(0, 7)}-01`
      t = today
    } else if (p === "ytd") {
      f = `${y}-01-01`
      t = today
    } else if (p === "q1") {
      f = `${y}-01-01`; t = `${y}-03-31`
    } else if (p === "q2") {
      f = `${y}-04-01`; t = `${y}-06-30`
    } else if (p === "q3") {
      f = `${y}-07-01`; t = `${y}-09-30`
    } else if (p === "q4") {
      f = `${y}-10-01`; t = `${y}-12-31`
    }
    setPeriod(p)
    setDateFrom(f)
    setDateTo(t)
    refresh(f, t)
  }

  const refresh = (from: string, to: string) => {
    startTransition(async () => {
      const result = await getPLStatement(from, to)
      if (result.error) {
        setError(result.error)
        toast.error(result.error)
      } else {
        setData(result.data)
        setError(null)
      }
    })
  }

  const handlePrint = () => {
    if (!data) return
    const win = window.open("", "_blank")
    if (!win) return
    const dateLabel = `${formatDisplayDate(data.dateFrom)} — ${formatDisplayDate(data.dateTo)}`
    const fmt = (n: number) => n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    win.document.write(`<!DOCTYPE html><html><head><title>P&L Statement</title>
<style>
  body{font-family:Arial,sans-serif;font-size:12px;padding:24px;max-width:600px;margin:0 auto}
  h2{text-align:center;margin-bottom:4px}
  .sub{text-align:center;color:#666;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;margin-bottom:12px}
  td{padding:6px 8px}
  .label{color:#555}
  .amount{text-align:right;font-weight:600}
  .total td{border-top:2px solid #000;font-weight:700;font-size:13px}
  .section-head{background:#f1f5f9;font-weight:700;padding:6px 8px}
  .indent{padding-left:20px;color:#555}
  .green{color:#16a34a}
  .red{color:#dc2626}
  .footer{margin-top:20px;text-align:center;font-size:10px;color:#888}
</style></head><body>
<h2>Profit & Loss Statement</h2>
<p class="sub">${dateLabel}</p>
<table>
  <tr><td class="section-head" colspan="2">Revenue</td></tr>
  <tr><td class="label">Sales Revenue</td><td class="amount">₨ ${fmt(data.revenue)}</td></tr>
  ${data.salesReturns > 0 ? `<tr><td class="label indent">Less: Sales Returns</td><td class="amount red">(${fmt(data.salesReturns)})</td></tr>` : ""}
  <tr class="total"><td>Net Revenue</td><td class="amount">₨ ${fmt(data.netRevenue)}</td></tr>

  <tr><td class="section-head" colspan="2">Cost of Goods Sold</td></tr>
  <tr><td class="label">Cost of Goods Sold (COGS)</td><td class="amount red">(${fmt(data.cogs)})</td></tr>

  <tr class="total"><td>Gross Profit</td><td class="amount ${data.grossProfit >= 0 ? "green" : "red"}">₨ ${fmt(data.grossProfit)} (${data.grossProfitPct}%)</td></tr>

  ${data.totalExpenses > 0 ? `
  <tr><td class="section-head" colspan="2">Operating Expenses</td></tr>
  <tr><td class="label">Total Expenses</td><td class="amount red">(${fmt(data.totalExpenses)})</td></tr>
  <tr class="total"><td>Net Profit</td><td class="amount ${data.netProfit >= 0 ? "green" : "red"}">₨ ${fmt(data.netProfit)} (${data.netProfitPct}%)</td></tr>
  ` : ""}
</table>
<div class="footer">Transactions: ${data.invoiceCount} invoices${data.returnCount > 0 ? `, ${data.returnCount} returns` : ""} | Printed: ${new Date().toLocaleString("en-PK")}</div>
</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 300)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Profit & Loss Statement</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Revenue, COGS, and gross profit for a period.</p>
      </div>

      {/* Period Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={period} onValueChange={(v) => applyPeriod(v as QuickPeriod)} disabled={isPending}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mtd">This Month</SelectItem>
            <SelectItem value="ytd">Year to Date</SelectItem>
            <SelectItem value="q1">Q1 (Jan–Mar)</SelectItem>
            <SelectItem value="q2">Q2 (Apr–Jun)</SelectItem>
            <SelectItem value="q3">Q3 (Jul–Sep)</SelectItem>
            <SelectItem value="q4">Q4 (Oct–Dec)</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          max={dateTo}
          onChange={(e) => { if (e.target.value) { setPeriod("custom"); setDateFrom(e.target.value) } }}
          className="h-8 w-36 text-sm"
        />
        <span className="text-sm text-muted-foreground">—</span>
        <Input
          type="date"
          value={dateTo}
          max={today}
          min={dateFrom}
          onChange={(e) => { if (e.target.value) { setPeriod("custom"); setDateTo(e.target.value) } }}
          className="h-8 w-36 text-sm"
        />
        <Button size="sm" variant="default" className="h-8" onClick={() => refresh(dateFrom, dateTo)} disabled={isPending}>
          {isPending ? "Loading..." : "Apply"}
        </Button>
        <Button size="sm" variant="outline" className="h-8 ml-auto" onClick={handlePrint} disabled={isPending || !data}>
          <Printer className="w-4 h-4 mr-1" />
          Print
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>
      )}

      {data && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Revenue
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-xl font-bold"><CurrencyDisplay amount={data.revenue} /></p>
                <p className="text-xs text-muted-foreground mt-0.5">{data.invoiceCount} invoices</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  COGS
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-xl font-bold text-amber-600"><CurrencyDisplay amount={data.cogs} /></p>
                <p className="text-xs text-muted-foreground mt-0.5">Cost of goods sold</p>
              </CardContent>
            </Card>

            <Card className={data.grossProfit >= 0 ? "border-emerald-200" : "border-red-200"}>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className={`text-xs uppercase tracking-wide flex items-center gap-1 ${data.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {data.grossProfit >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  Gross Profit
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className={`text-xl font-bold ${data.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  <CurrencyDisplay amount={data.grossProfit} />
                </p>
                <p className={`text-xs mt-0.5 font-medium ${data.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {data.grossProfitPct}% margin
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Returns</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-xl font-bold text-red-600"><CurrencyDisplay amount={data.salesReturns} /></p>
                <p className="text-xs text-muted-foreground mt-0.5">{data.returnCount} return(s)</p>
              </CardContent>
            </Card>
          </div>

          {/* Net Profit KPI when expenses exist */}
          {data.totalExpenses > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card className="border-red-200 dark:border-red-800">
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs text-red-600 uppercase tracking-wide flex items-center gap-1">
                    <Receipt className="w-3.5 h-3.5" />
                    Operating Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <p className="text-xl font-bold text-red-600"><CurrencyDisplay amount={data.totalExpenses} /></p>
                  <p className="text-xs text-muted-foreground mt-0.5">All expense categories</p>
                </CardContent>
              </Card>
              <Card className={data.netProfit >= 0 ? "border-emerald-200" : "border-red-200"}>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className={`text-xs uppercase tracking-wide flex items-center gap-1 ${data.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {data.netProfit >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    Net Profit
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <p className={`text-xl font-bold ${data.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    <CurrencyDisplay amount={data.netProfit} />
                  </p>
                  <p className={`text-xs mt-0.5 font-medium ${data.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {data.netProfitPct}% net margin
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* P&L Statement Table */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">
                P&L Statement — {formatDisplayDate(data.dateFrom)} to {formatDisplayDate(data.dateTo)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              <table className="w-full text-sm">
                <tbody>
                  {/* Revenue Section */}
                  <tr className="bg-muted/50">
                    <td colSpan={2} className="px-4 py-2 font-semibold text-sm uppercase tracking-wide text-muted-foreground">Revenue</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-2.5">Sales Revenue</td>
                    <td className="px-4 py-2.5 text-right font-medium"><CurrencyDisplay amount={data.revenue} /></td>
                  </tr>
                  {data.salesReturns > 0 && (
                    <tr className="border-b">
                      <td className="px-4 py-2.5 pl-8 text-muted-foreground">Less: Sales Returns</td>
                      <td className="px-4 py-2.5 text-right text-red-600">(<CurrencyDisplay amount={data.salesReturns} />)</td>
                    </tr>
                  )}
                  <tr className="border-b border-2">
                    <td className="px-4 py-2.5 font-semibold">Net Revenue</td>
                    <td className="px-4 py-2.5 text-right font-semibold"><CurrencyDisplay amount={data.netRevenue} /></td>
                  </tr>

                  {/* COGS Section */}
                  <tr className="bg-muted/50">
                    <td colSpan={2} className="px-4 py-2 font-semibold text-sm uppercase tracking-wide text-muted-foreground">Cost of Goods Sold</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-2.5">Cost of Goods Sold (COGS)</td>
                    <td className="px-4 py-2.5 text-right text-amber-600">(<CurrencyDisplay amount={data.cogs} />)</td>
                  </tr>

                  {/* Gross Profit */}
                  <tr className={`border-t-2 border-b ${data.grossProfit >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-red-50 dark:bg-red-950/30"}`}>
                    <td className="px-4 py-3 font-bold text-base">
                      Gross Profit
                      <span className={`ml-2 text-sm font-normal ${data.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        ({data.grossProfitPct}% margin)
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-bold text-base ${data.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      <CurrencyDisplay amount={data.grossProfit} />
                    </td>
                  </tr>

                  {/* Expenses + Net Profit (only if expenses exist) */}
                  {data.totalExpenses > 0 && (
                    <>
                      <tr className="bg-muted/50">
                        <td colSpan={2} className="px-4 py-2 font-semibold text-sm uppercase tracking-wide text-muted-foreground">Operating Expenses</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-2.5">Total Operating Expenses</td>
                        <td className="px-4 py-2.5 text-right text-red-600">(<CurrencyDisplay amount={data.totalExpenses} />)</td>
                      </tr>
                      <tr className={`border-t-2 ${data.netProfit >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-red-50 dark:bg-red-950/30"}`}>
                        <td className="px-4 py-3 font-bold text-base">
                          Net Profit
                          <span className={`ml-2 text-sm font-normal ${data.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            ({data.netProfitPct}% net margin)
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-bold text-base ${data.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          <CurrencyDisplay amount={data.netProfit} />
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {!data && !error && !isPending && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            No data available for the selected period.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
