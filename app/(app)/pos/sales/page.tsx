import { getPOSSales } from "../actions"
import { getGrossProfitReport } from "../reports/actions"
import { getStoreSettings } from "../actions"
import { POSSalesList } from "@/components/pos-sales-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { POSSalesFilters } from "@/components/pos-sales-filters"
import { ExportButtons } from "@/components/export-buttons"
import { GrossProfitTable } from "@/components/gross-profit-table"
import { TrendingUp, DollarSign, ShoppingBag, BarChart3 } from "lucide-react"
import Link from "next/link"
import { requirePrivilege } from "@/lib/auth/privileges"

interface POSSalesPageProps {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string; tab?: string; timeFrom?: string; timeTo?: string; period?: string }>
}

function fmt(n: number) {
  return n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })
}

export default async function POSSalesPage({ searchParams }: POSSalesPageProps) {
  await requirePrivilege("pos")
  const params = await searchParams
  const dateFrom = params.dateFrom
  const dateTo = params.dateTo
  const tab = params.tab ?? "sales"

  // PKT = UTC+5
  const nowPKT = new Date(Date.now() + 5 * 60 * 60 * 1000)
  const todayPKT = nowPKT.toISOString().split("T")[0]
  const timeFrom = params.timeFrom ?? "00:00"
  const timeTo = params.timeTo ?? "23:59"
  const period = params.period ?? "today"

  const [sales, storeSettings] = await Promise.all([
    tab === "sales" ? getPOSSales(dateFrom, dateTo) : Promise.resolve([]),
    getStoreSettings(),
  ])

  const gpData = tab === "gp"
    ? await getGrossProfitReport(params.dateFrom ?? todayPKT, params.dateTo ?? todayPKT, timeFrom, timeTo)
    : { rows: [], summary: { total_sale_amount: 0, total_purchase_amount: 0, total_gp_value: 0, overall_gp_pct: 0 } }

  const storeName = storeSettings?.name || "Store"

  const tabClass = (t: string) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      tab === t
        ? "border-primary text-primary"
        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
    }`

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Sales</h1>
      <p className="text-xs sm:text-sm text-muted-foreground">POS sales list and gross profit report.</p>

      {/* Tab Navigation */}
      <div className="flex gap-0 border-b mt-4 mb-4">
        <Link href="/pos/sales?tab=sales" className={tabClass("sales")}>Sales List</Link>
        <Link href="/pos/sales?tab=gp" className={tabClass("gp")}>Gross Profit</Link>
      </div>

      {tab === "sales" && (
        <Card>
          <CardHeader className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-base sm:text-lg">POS Sales</CardTitle>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <POSSalesFilters dateFrom={dateFrom} dateTo={dateTo} />
              <ExportButtons
                data={sales.map((sale) => ({
                  date: fmtDate(sale.created_at),
                  customer: sale.party?.name || "Walk-in Customer",
                  total: sale.total,
                  status: sale.status,
                }))}
                columns={[
                  { key: "date", header: "Date" },
                  { key: "customer", header: "Customer" },
                  { key: "total", header: "Total" },
                  { key: "status", header: "Status" },
                ]}
                filename={`pos-sales-${new Date().toISOString().split("T")[0]}`}
                title="POS Sales Report"
                printStoreName={storeName}
                printReportParams={`From Date: ${dateFrom ? fmtDate(dateFrom + "T00:00:00") : "ALL"} AND To Date: ${dateTo ? fmtDate(dateTo + "T00:00:00") : "ALL"} AND Party: ALL`}
              />
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <POSSalesList sales={sales} />
          </CardContent>
        </Card>
      )}

      {tab === "gp" && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <p className="text-lg font-semibold leading-tight">PKR {fmt(gpData.summary.total_sale_amount)}</p>
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
                  <p className="text-lg font-semibold leading-tight">PKR {fmt(gpData.summary.total_purchase_amount)}</p>
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
                  <p className={`text-lg font-semibold leading-tight ${gpData.summary.total_gp_value >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    PKR {fmt(gpData.summary.total_gp_value)}
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
                  <p className={`text-xl font-semibold ${gpData.summary.overall_gp_pct >= 0 ? "" : "text-red-600"}`}>
                    {fmt(gpData.summary.overall_gp_pct)}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <GrossProfitTable
            key={`${params.dateFrom}-${params.dateTo}-${timeFrom}-${timeTo}-${period}`}
            data={gpData.rows}
            dateFrom={params.dateFrom ?? todayPKT}
            dateTo={params.dateTo ?? todayPKT}
            timeFrom={timeFrom}
            timeTo={timeTo}
            period={period}
            storeName={storeName}
            baseUrl="/pos/sales?tab=gp"
          />
        </div>
      )}
    </div>
  )
}
