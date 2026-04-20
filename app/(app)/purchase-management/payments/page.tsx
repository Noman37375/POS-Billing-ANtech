import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { isSupabaseReady } from "@/lib/supabase/config"
import { requirePrivilege } from "@/lib/auth/privileges"
import { getAllPurchasePayments, getPurchases, getPaidPurchases } from "@/app/(app)/purchases/actions"
import { PurchasePaymentDialog } from "@/components/purchase-payment-dialog"
import { CurrencyDisplay } from "@/components/currency-display"
import { PaymentsPageClient } from "./payments-page-client"

export default async function VendorPaymentsPage() {
  await requirePrivilege("purchases")

  const [payments, purchases, paidPurchases] = await Promise.all([
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
    (async () => {
      if (!isSupabaseReady()) return []
      const result = await getPaidPurchases()
      return result.data || []
    })(),
  ])

  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const totalPaid = paidPurchases.reduce((sum, p) => sum + Number(p.paid || 0), 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Vendor Payments</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage payments for purchase invoices.</p>
        </div>
        <PurchasePaymentDialog
          purchases={purchases.map((p) => {
            // Calculate paid amount for this purchase
            const purchasePayments = payments.filter(
              (payment) => payment.purchaseInvoiceId === p.id
            )
            const paid = purchasePayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
            const balance = Number(p.total || 0) - paid

            return {
              id: p.id,
              purchaseNumber: p.purchaseNumber,
              vendorName: p.vendorName,
              total: Number(p.total || 0),
              status: p.status || "Draft",
              paid,
              balance,
            }
          })}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Total Paid</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-2xl sm:text-3xl font-bold text-emerald-600">
              <CurrencyDisplay amount={totalPaid} />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{paidPurchases.length} invoice(s) paid</p>
          </CardContent>
        </Card>

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
      </div>

      <PaymentsPageClient payments={payments as any} paidPurchases={paidPurchases as any} />
    </div>
  )
}
