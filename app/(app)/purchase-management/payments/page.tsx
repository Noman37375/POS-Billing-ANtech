import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { isSupabaseReady } from "@/lib/supabase/config"
import { requirePrivilege } from "@/lib/auth/privileges"
import { getAllPurchasePayments, getPurchases, deletePurchasePayment } from "@/app/(app)/purchases/actions"
import { PurchasePaymentDialog } from "@/components/purchase-payment-dialog"
import { CurrencyDisplay } from "@/components/currency-display"
import { DeletePurchasePaymentButton } from "@/components/delete-purchase-payment-button"

export default async function VendorPaymentsPage() {
  await requirePrivilege("parties")

  const [payments, purchases] = await Promise.all([
    (async () => {
      if (!isSupabaseReady()) return []
      const result = await getAllPurchasePayments()
      return result.data || []
    })(),
    (async () => {
      if (!isSupabaseReady()) return []
      const result = await getPurchases()
      return result.data || []
    })(),
  ])

  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Vendor Payments</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage payments for purchase invoices.</p>
        </div>
        <PurchasePaymentDialog
          purchases={purchases.map((p) => ({
            id: p.id,
            purchaseNumber: p.purchaseNumber,
            vendorName: p.vendorName,
            total: Number(p.total || 0),
            status: p.status || "Draft",
          }))}
        />
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Total Payments</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="text-2xl sm:text-3xl font-bold">
            <CurrencyDisplay amount={totalPayments} />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{payments.length} payment(s) recorded</p>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Payment History</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Purchase</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[20%]">Vendor</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Amount</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[15%]">Method</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[15%]">Date</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[10%]">Actions</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-muted/50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm w-[15%]">
                      <div className="flex flex-col min-w-0 overflow-hidden">
                        <span className="truncate break-words">{payment.purchaseNumber}</span>
                        <span className="text-[10px] text-muted-foreground sm:hidden truncate">
                          {payment.vendorName}
                        </span>
                        <span className="text-[10px] text-muted-foreground sm:hidden truncate">
                          {payment.method}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[20%]">
                      <span className="truncate block">{payment.vendorName}</span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-foreground text-xs sm:text-sm w-[15%]">
                      <span className="truncate block">
                        <CurrencyDisplay amount={Number(payment.amount || 0)} />
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[15%]">
                      <Badge variant="outline" className="text-[10px] sm:text-xs whitespace-nowrap">
                        {payment.method}
                      </Badge>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[15%]">
                      <span className="truncate block">
                        {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : "—"}
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 w-[10%]">
                      <DeletePurchasePaymentButton paymentId={payment.id} />
                    </td>
                  </tr>
                ))}
                {(!payments || payments.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                      No payments yet. Add your first payment to see it here.
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
