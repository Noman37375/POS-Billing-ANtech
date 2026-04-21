"use client"

import { TrendingUp, Users, AlertCircle, DollarSign, AlertTriangle, ShoppingCart, Package, Plus } from "lucide-react"
import { useCurrency } from "@/contexts/currency-context"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

interface DashboardProps {
  parties: Array<{ id: number; name: string; type: string }>
  inventory: Array<{ id: number; stock: number; unitPrice: number }>
  invoices: Array<{ totalAmount: number; status: string }>
  grossProfit?: number
  grossProfitPercent?: number
  period?: string
  lowStockItems?: Array<{ id: string; name: string; stock: number; minimum_stock: number }>
}

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
]

export function Dashboard({
  parties,
  inventory,
  invoices,
  grossProfit = 0,
  grossProfitPercent = 0,
  period = "month",
  lowStockItems = [],
}: DashboardProps) {
  const { formatCurrency } = useCurrency()
  const router = useRouter()

  const totalSales = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
  const totalCustomers = parties.filter((p) => p.type === "Customer").length
  const outstandingReceivables = invoices
    .filter((inv) => inv.status === "Draft" || inv.status === "Partial")
    .reduce((sum, inv) => sum + inv.totalAmount, 0)

  const kpis = [
    {
      title: `Total Sales (${PERIODS.find((p) => p.value === period)?.label ?? "MTD"})`,
      value: formatCurrency(totalSales),
      icon: TrendingUp,
      color: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800",
    },
    {
      title: "Gross Profit",
      value: `${formatCurrency(grossProfit)} (${grossProfitPercent}%)`,
      icon: DollarSign,
      color: "bg-green-50 text-green-700 ring-1 ring-green-200 dark:bg-green-950 dark:text-green-300 dark:ring-green-800",
    },
    {
      title: "Total Customers",
      value: totalCustomers,
      icon: Users,
      color: "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-800",
    },
    {
      title: "Outstanding Receivables",
      value: formatCurrency(outstandingReceivables),
      icon: AlertCircle,
      color: "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800",
    },
  ]

  const totalStockValue = inventory.reduce((sum, item) => sum + item.stock * item.unitPrice, 0)
  const customerCount = parties.filter((p) => p.type === "Customer").length
  const vendorCount = parties.filter((p) => p.type === "Vendor").length

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header + Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">Dashboard</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Quick pulse of your business</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => router.push(`/dashboard?period=${p.value}`)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === p.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Link href="/stock-management/inventory?filter=low_stock">
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950 transition-colors">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {lowStockItems.length} item{lowStockItems.length > 1 ? "s" : ""} low on stock
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 truncate">
                {lowStockItems.slice(0, 3).map((i) => `${i.name} (${i.stock})`).join(", ")}
                {lowStockItems.length > 3 ? ` +${lowStockItems.length - 3} more` : ""}
              </p>
            </div>
            <span className="text-xs text-amber-600 dark:text-amber-400 flex-shrink-0">View →</span>
          </div>
        </Link>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link href="/pos">
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <ShoppingCart className="w-4 h-4" />
            New Sale
          </button>
        </Link>
        <Link href="/stock-management/inventory">
          <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </Link>
        <Link href="/purchase-management/create">
          <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
            <Package className="w-4 h-4" />
            New Purchase
          </button>
        </Link>
        <Link href="/parties/add">
          <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
            <Users className="w-4 h-4" />
            Add Customer
          </button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon
          return (
            <div
              key={index}
              className="bg-card/90 backdrop-blur rounded-xl shadow-lg border border-border/70 p-4 sm:p-5 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{kpi.title}</p>
                  <p className="text-sm sm:text-base font-semibold text-foreground leading-tight break-words">{kpi.value}</p>
                </div>
                <div className={`${kpi.color} p-2 sm:p-3 rounded-lg inline-flex flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Stats */}
      <div className="bg-card/90 backdrop-blur rounded-xl shadow-lg border border-border/70 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Quick Stats</h3>
          <span className="text-[10px] sm:text-xs text-muted-foreground">Live snapshot</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/70 p-3 sm:p-4 bg-muted/30">
            <p className="text-xs sm:text-sm text-muted-foreground">Total Inventory Items</p>
            <p className="text-xl sm:text-2xl font-semibold text-foreground mt-1">{inventory.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
              Stock Value: <span className="font-semibold text-foreground">{formatCurrency(totalStockValue)}</span>
            </p>
          </div>
          <div className="rounded-xl border border-border/70 p-3 sm:p-4 bg-muted/30">
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
