"use client"

import { TrendingUp, Users, AlertCircle, DollarSign, Package, BookUser } from "lucide-react"
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
  const outstandingReceivables = invoices
    .filter((inv) => inv.status === "Draft" || inv.status === "Pending")
    .reduce((sum, inv) => sum + inv.totalAmount, 0)
  const totalStockValue = inventory.reduce((sum, item) => sum + item.stock * item.unitPrice, 0)
  const customerCount = parties.filter((p) => p.type === "Customer").length
  const vendorCount = parties.filter((p) => p.type === "Vendor").length

  const now = new Date()
  const monthName = now.toLocaleString("en-PK", { month: "long", year: "numeric" })

  const kpis = [
    {
      title: "Total Sales",
      value: formatCurrency(totalSalesYTD),
      sub: "Month to date",
      icon: TrendingUp,
      accent: "border-t-2 border-t-emerald-500",
      iconCls: "bg-emerald-500/10 text-emerald-500",
    },
    {
      title: "Gross Profit",
      value: formatCurrency(grossProfit),
      sub: `${grossProfitPercent}% margin`,
      icon: DollarSign,
      accent: "border-t-2 border-t-sky-500",
      iconCls: "bg-sky-500/10 text-sky-500",
    },
    {
      title: "Total Customers",
      value: totalCustomers.toString(),
      sub: "Registered",
      icon: Users,
      accent: "border-t-2 border-t-violet-500",
      iconCls: "bg-violet-500/10 text-violet-500",
    },
    {
      title: "Receivables",
      value: formatCurrency(outstandingReceivables),
      sub: "Outstanding",
      icon: AlertCircle,
      accent: "border-t-2 border-t-amber-500",
      iconCls: "bg-amber-500/10 text-amber-500",
    },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground tracking-tight">Dashboard</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{monthName}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.title}
              className={`bg-card rounded-xl border border-border ${kpi.accent} p-4 space-y-3 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{kpi.title}</p>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${kpi.iconCls}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground leading-tight truncate">{kpi.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.sub}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Inventory Items</p>
            <p className="text-xl font-bold text-foreground">{inventory.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              Stock value: <span className="font-semibold text-foreground">{formatCurrency(totalStockValue)}</span>
            </p>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
            <BookUser className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Total Parties</p>
            <p className="text-xl font-bold text-foreground">{parties.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Customers: <span className="font-semibold text-foreground">{customerCount}</span>
              <span className="mx-1.5 opacity-40">·</span>
              Vendors: <span className="font-semibold text-foreground">{vendorCount}</span>
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
