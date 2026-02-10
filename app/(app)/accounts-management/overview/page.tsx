import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requirePrivilege } from "@/lib/auth/privileges"
import { getAccountsOverview } from "../actions"
import { CurrencyDisplay } from "@/components/currency-display"
import { DollarSign, TrendingUp, ShoppingBag, ShoppingCart, CreditCard, Users } from "lucide-react"

export default async function AccountsOverviewPage() {
  await requirePrivilege("accounts")

  const result = await getAccountsOverview()

  if (result.error || !result.data) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Accounts Overview</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Summary dashboard for accounts and finance.</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Error loading overview: {result.error || "Unknown error"}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const overview = result.data

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Accounts Overview</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Summary dashboard for accounts and finance.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Receivables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              <p className="text-2xl sm:text-3xl font-semibold text-amber-600">
                <CurrencyDisplay amount={overview.totalReceivables} />
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Amount customers owe</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-red-600" />
              <p className="text-2xl sm:text-3xl font-semibold text-red-600">
                <CurrencyDisplay amount={overview.totalPayables} />
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Amount owed to vendors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Position</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <p
                className={`text-2xl sm:text-3xl font-semibold ${
                  overview.totalReceivables - overview.totalPayables >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                <CurrencyDisplay amount={overview.totalReceivables - overview.totalPayables} />
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Receivables - Payables</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <p className="text-2xl font-semibold text-foreground">
                <CurrencyDisplay amount={overview.totalSales} />
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">All sales invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-purple-600" />
              <p className="text-2xl font-semibold text-foreground">
                <CurrencyDisplay amount={overview.totalPurchases} />
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">All purchase invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              <p className="text-2xl font-semibold text-foreground">
                <CurrencyDisplay amount={overview.totalCustomerPayments + overview.totalVendorPayments} />
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Customer: <CurrencyDisplay amount={overview.totalCustomerPayments} /> | Vendor:{" "}
              <CurrencyDisplay amount={overview.totalVendorPayments} />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Party Counts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <p className="text-2xl font-semibold text-foreground">{overview.customerCount}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-purple-600" />
              <p className="text-2xl font-semibold text-foreground">{overview.vendorCount}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total vendors</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
