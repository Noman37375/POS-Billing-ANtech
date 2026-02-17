import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { requirePrivilege } from "@/lib/auth/privileges"
import { getPurchaseSummary, getPurchaseTrends, getTopVendors, getPurchasePaymentSummary } from "./actions"
import { CurrencyDisplay } from "@/components/currency-display"
import { TrendingUp, ShoppingBag, DollarSign, FileText, AlertCircle } from "lucide-react"
import { ExportButtons } from "@/components/export-buttons"

export default async function PurchaseReportsPage() {
  await requirePrivilege("parties")

  const [summary, trends, topVendors, paymentSummary] = await Promise.all([
    getPurchaseSummary(),
    getPurchaseTrends(),
    getTopVendors(10),
    getPurchasePaymentSummary(),
  ])

  const unpaidCount = paymentSummary.data?.filter((p) => p.status === "Unpaid").length || 0
  const partialCount = paymentSummary.data?.filter((p) => p.status === "Partial").length || 0

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Purchase Reports</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Comprehensive purchase analytics and insights.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              <p className="text-2xl font-semibold">
                <CurrencyDisplay amount={summary.totalPurchases} />
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{summary.totalPurchaseCount} invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <p className="text-2xl font-semibold">
                <CurrencyDisplay amount={summary.totalPayments} />
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Payables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <p className="text-2xl font-semibold">
                <CurrencyDisplay amount={summary.outstandingPayables} />
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {unpaidCount} unpaid, {partialCount} partial
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Purchase Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              <p className="text-2xl font-semibold">{summary.totalPurchaseCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Vendors */}
      <Card>
        <CardHeader>
          <CardTitle>Top Vendors by Purchase Amount</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">Rank</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">Vendor</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">Purchases</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">Total Amount</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {topVendors.data?.map((vendor) => (
                  <tr key={vendor.name} className="hover:bg-muted/50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm">
                      #{vendor.rank}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm">
                      {vendor.name}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm">
                      {vendor.purchaseCount}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-foreground text-xs sm:text-sm">
                      <CurrencyDisplay amount={vendor.totalAmount} />
                    </td>
                  </tr>
                ))}
                {(!topVendors.data || topVendors.data.length === 0) && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                      No vendor data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Purchase Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">Date</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">Count</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">Total</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {trends.data?.slice(0, 15).map((trend) => (
                  <tr key={trend.date} className="hover:bg-muted/50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm">
                      {new Date(trend.date).toLocaleDateString()}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm">{trend.count}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-foreground text-xs sm:text-sm">
                      <CurrencyDisplay amount={trend.total} />
                    </td>
                  </tr>
                ))}
                {(!trends.data || trends.data.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                      No purchase trends available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Purchase vs Payment Summary */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>Purchase Payment Summary</CardTitle>
          <ExportButtons
            data={(paymentSummary.data || []).map((item) => ({
              purchase: item.purchaseNumber,
              vendor: item.vendorName,
              total: item.totalAmount,
              paid: item.paidAmount,
              outstanding: item.outstanding,
              status: item.status,
            }))}
            columns={[
              { key: "purchase", header: "Purchase" },
              { key: "vendor", header: "Vendor" },
              { key: "total", header: "Total" },
              { key: "paid", header: "Paid" },
              { key: "outstanding", header: "Outstanding" },
              { key: "status", header: "Status" },
            ]}
            filename={`purchase-payment-summary-${new Date().toISOString().split("T")[0]}`}
            title="Purchase Payment Summary"
          />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">Purchase</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell">Vendor</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">Total</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">Paid</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">Outstanding</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">Status</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {paymentSummary.data?.slice(0, 20).map((item) => (
                  <tr key={item.purchaseId} className="hover:bg-muted/50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm">
                      <div className="flex flex-col min-w-0 overflow-hidden">
                        <span className="truncate break-words">{item.purchaseNumber}</span>
                        <span className="text-[10px] text-muted-foreground sm:hidden truncate">
                          {item.vendorName}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell">
                      <span className="truncate block">{item.vendorName}</span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm">
                      <CurrencyDisplay amount={item.totalAmount} />
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm">
                      <CurrencyDisplay amount={item.paidAmount} />
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-foreground text-xs sm:text-sm">
                      <CurrencyDisplay amount={item.outstanding} />
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                      <Badge
                        variant={
                          item.status === "Paid"
                            ? "default"
                            : item.status === "Unpaid"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-[10px] sm:text-xs whitespace-nowrap"
                      >
                        {item.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {(!paymentSummary.data || paymentSummary.data.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                      No purchase payment data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
