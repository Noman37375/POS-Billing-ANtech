"use client"

import { TrendingUp, Users, AlertCircle, DollarSign } from "lucide-react"
import { useCurrency } from "@/contexts/currency-context"

interface DashboardProps {
  parties: Array<{ id: number; name: string; type: string }>
  inventory: Array<{ id: number; stock: number; unitPrice: number }>
  invoices: Array<{ totalAmount: number; status: string }>
  grossProfit?: number
  grossProfitPercent?: number
}

export function Dashboard({ parties, inventory, invoices, grossProfit = 0, grossProfitPercent = 0 }: DashboardProps) {
  const { formatCurrency } = useCurrency()
  const totalSalesYTD = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
  const totalCustomers = parties.filter((p) => p.type === "Customer").length
  // Calculate outstanding receivables from Draft invoices (unpaid)
  const outstandingReceivables = invoices
    .filter((inv) => inv.status === "Draft")
    .reduce((sum, inv) => sum + inv.totalAmount, 0)

  const kpis = [
    {
      title: "Total Sales (MTD)",
      value: formatCurrency(totalSalesYTD),
      icon: TrendingUp,
      color: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    },
    {
      title: "Gross Profit",
      value: `${formatCurrency(grossProfit)} (${grossProfitPercent}%)`,
      icon: DollarSign,
      color: "bg-green-50 text-green-700 ring-1 ring-green-200",
    },
    {
      title: "Total Customers",
      value: totalCustomers,
      icon: Users,
      color: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    },
    {
      title: "Outstanding Receivables",
      value: formatCurrency(outstandingReceivables),
      icon: AlertCircle,
      color: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    },
  ]

  const totalStockValue = inventory.reduce((sum, item) => sum + item.stock * item.unitPrice, 0)
  const customerCount = parties.filter((p) => p.type === "Customer").length
  const vendorCount = parties.filter((p) => p.type === "Vendor").length

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">Dashboard</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Quick pulse of InvoSync health</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon
          return (
            <div
              key={index}
              className="bg-card/90 backdrop-blur rounded-xl sm:rounded-2xl shadow-lg border border-border/70 p-4 sm:p-5 lg:p-6 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{kpi.title}</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-semibold text-foreground break-words">{kpi.value}</p>
                </div>
                <div className={`${kpi.color} p-2 sm:p-3 rounded-lg sm:rounded-xl inline-flex flex-shrink-0`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Stats */}
      <div className="bg-card/90 backdrop-blur rounded-xl sm:rounded-2xl shadow-lg border border-border/70 p-4 sm:p-5 lg:p-6 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Quick Stats</h3>
          <span className="text-[10px] sm:text-xs text-muted-foreground">Live snapshot</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-lg sm:rounded-xl border border-border/70 p-3 sm:p-4 bg-muted/30">
            <p className="text-xs sm:text-sm text-muted-foreground">Total Inventory Items</p>
            <p className="text-xl sm:text-2xl font-semibold text-foreground mt-1">{inventory.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
              Stock Value: <span className="font-semibold text-foreground">{formatCurrency(totalStockValue)}</span>
            </p>
          </div>
          <div className="rounded-lg sm:rounded-xl border border-border/70 p-3 sm:p-4 bg-muted/30">
            <p className="text-xs sm:text-sm text-muted-foreground">Total Parties</p>
            <p className="text-xl sm:text-2xl font-semibold text-foreground mt-1">{parties.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
              Customers: <span className="font-semibold text-foreground">{customerCount}</span> | Vendors:{" "}
              <span className="font-semibold text-foreground">{vendorCount}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
