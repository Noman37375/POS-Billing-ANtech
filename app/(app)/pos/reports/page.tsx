import { getStoreSettings } from "../actions"
import { getGrossProfitReport } from "./actions"
import { GrossProfitTable } from "@/components/gross-profit-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, DollarSign, ShoppingBag, BarChart3 } from "lucide-react"

interface ReportsPageProps {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string; timeFrom?: string; timeTo?: string; period?: string }>
}

function fmt(n: number) {
  return n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function GrossProfitReportPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams

  // PKT = UTC+5: calculate today's date in Pakistan time (server may be UTC)
  const nowPKT = new Date(Date.now() + 5 * 60 * 60 * 1000)
  const todayPKT = nowPKT.toISOString().split("T")[0]

  // Defaults: Today, 9 AM → 12 AM (23:59)
  const dateFrom = params.dateFrom ?? todayPKT
  const dateTo = params.dateTo ?? todayPKT
  const timeFrom = params.timeFrom ?? "09:00"
  const timeTo = params.timeTo ?? "23:59"
  const period = params.period ?? "today"

  const [storeSettings, { rows, summary }] = await Promise.all([
    getStoreSettings(),
    getGrossProfitReport(dateFrom, dateTo, timeFrom, timeTo),
  ])
  const storeName = storeSettings?.name || "Store"

  const fmtTime = (t: string) => {
    const [h, m] = t.split(":")
    const hour = parseInt(h)
    const ampm = hour >= 12 ? "PM" : "AM"
    const h12 = hour % 12 || 12
    return `${h12}:${m} ${ampm}`
  }

  const subtitle = `${dateFrom} ${fmtTime(timeFrom)} → ${dateTo} ${fmtTime(timeTo)}`

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Gross Profit Report</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <p className="text-lg font-semibold leading-tight break-words">PKR {fmt(summary.total_sale_amount)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total COGS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-lg font-semibold leading-tight break-words">PKR {fmt(summary.total_purchase_amount)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gross Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className={`text-lg font-semibold leading-tight break-words ${summary.total_gp_value >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                PKR {fmt(summary.total_gp_value)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall GP%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <p className={`text-xl font-semibold ${summary.overall_gp_pct >= 0 ? "" : "text-red-600"}`}>
                {fmt(summary.overall_gp_pct)}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <GrossProfitTable key={`${dateFrom}-${dateTo}-${timeFrom}-${timeTo}-${period}`} data={rows} dateFrom={dateFrom} dateTo={dateTo} timeFrom={timeFrom} timeTo={timeTo} period={period} storeName={storeName} />
    </div>
  )
}
