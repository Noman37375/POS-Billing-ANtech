import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle } from "lucide-react"
import { isSupabaseReady } from "@/lib/supabase/config"
import { requirePrivilege } from "@/lib/auth/privileges"
import { getAllCustomerPayments, getUnpaidPOSSales, getPaidSales } from "@/app/(app)/pos/actions"
import { CustomerPaymentDialog } from "@/components/customer-payment-dialog"
import { CurrencyDisplay } from "@/components/currency-display"
import { DeleteCustomerPaymentButton } from "@/components/delete-customer-payment-button"
import { ExportButtons } from "@/components/export-buttons"

export default async function CustomerPaymentsPage() {
  await requirePrivilege("pos")

  const [payments, unpaidSales, paidSales] = await Promise.all([
    (async () => {
      if (!isSupabaseReady()) return []
      const result = await getAllCustomerPayments()
      return result.data || []
    })(),
    (async () => {
      if (!isSupabaseReady()) return []
      const result = await getUnpaidPOSSales()
      return result.data || []
    })(),
    (async () => {
      if (!isSupabaseReady()) return []
      const result = await getPaidSales()
      return result.data || []
    })(),
  ])

  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const totalReceived = paidSales.reduce((sum, s) => sum + Number(s.paid || 0), 0)

  // Group outstanding balance by customer
  const outstandingByCustomer = unpaidSales.reduce<Record<string, { name: string; balance: number; invoices: number }>>((acc, s) => {
    const name = s.customerName || "Walk-in"
    const bal = Number(s.balance ?? s.total ?? 0)
    if (!acc[name]) acc[name] = { name, balance: 0, invoices: 0 }
    acc[name].balance += bal
    acc[name].invoices += 1
    return acc
  }, {})
  const outstandingList = Object.values(outstandingByCustomer).sort((a, b) => b.balance - a.balance)
  const totalOutstanding = outstandingList.reduce((sum, c) => sum + c.balance, 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Customer Payments</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage payments for POS sales invoices.</p>
        </div>
        <CustomerPaymentDialog
          sales={unpaidSales.map((s) => ({
            id: s.id,
            invoiceNumber: s.invoiceNumber,
            customerName: s.customerName,
            total: Number(s.total || 0),
            status: s.status || "Draft",
            paid: s.paid,
            balance: s.balance,
          }))}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Total Received</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-2xl sm:text-3xl font-bold text-emerald-600">
              <CurrencyDisplay amount={totalReceived} />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{paidSales.length} invoice(s) with payments</p>
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

        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Outstanding Receivables
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
              <CurrencyDisplay amount={totalOutstanding} />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{unpaidSales.length} unpaid invoice(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding by Customer */}
      {outstandingList.length > 0 && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Outstanding by Customer</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 sm:py-3 px-4 text-xs sm:text-sm">Customer</th>
                    <th className="py-2 sm:py-3 px-4 text-xs sm:text-sm text-right">Invoices</th>
                    <th className="py-2 sm:py-3 px-4 text-xs sm:text-sm text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="[&>tr:not(:last-child)]:border-b">
                  {outstandingList.map((c) => (
                    <tr key={c.name} className="hover:bg-muted/50">
                      <td className="py-2 sm:py-3 px-4 font-medium text-xs sm:text-sm">{c.name}</td>
                      <td className="py-2 sm:py-3 px-4 text-xs sm:text-sm text-right text-muted-foreground">{c.invoices}</td>
                      <td className="py-2 sm:py-3 px-4 text-xs sm:text-sm text-right font-semibold text-amber-600 dark:text-amber-400">
                        <CurrencyDisplay amount={c.balance} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paid Sales */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Paid Sales</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Invoice</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[20%]">Customer</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[12%]">Total</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[12%]">Paid</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[12%]">Balance</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[15%]">Date</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[14%]">Status</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {paidSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-muted/50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm w-[15%]">
                      <div className="flex flex-col min-w-0 overflow-hidden">
                        <span className="truncate break-words">{sale.invoiceNumber}</span>
                        <span className="text-[10px] text-muted-foreground sm:hidden truncate">
                          {sale.customerName}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[20%]">
                      <span className="truncate block">{sale.customerName}</span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm w-[12%]">
                      <span className="truncate block">
                        <CurrencyDisplay amount={sale.total} />
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-emerald-600 text-xs sm:text-sm w-[12%]">
                      <span className="truncate block">
                        <CurrencyDisplay amount={sale.paid} />
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm w-[12%]">
                      <span className={`truncate block ${sale.balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        <CurrencyDisplay amount={sale.balance} />
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[15%]">
                      <span className="truncate block">
                        {sale.date ? new Date(sale.date).toLocaleDateString() : "\u2014"}
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[14%]">
                      <Badge variant={sale.balance === 0 ? "default" : "outline"} className="text-[10px] sm:text-xs whitespace-nowrap">
                        {sale.balance === 0 ? "Fully Paid" : "Partial"}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {(!paidSales || paidSales.length === 0) && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                      No paid sales yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card>
        <CardHeader className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-base sm:text-lg">Payment History</CardTitle>
          <ExportButtons
            data={payments.map((payment) => ({
              invoice: payment.invoiceNumber,
              customer: payment.customerName,
              amount: payment.amount,
              method: payment.method,
              date: new Date(payment.createdAt).toLocaleDateString(),
            }))}
            columns={[
              { key: "invoice", header: "Invoice" },
              { key: "customer", header: "Customer" },
              { key: "amount", header: "Amount" },
              { key: "method", header: "Method" },
              { key: "date", header: "Date" },
            ]}
            filename={`customer-payments-${new Date().toISOString().split("T")[0]}`}
            title="Customer Payments"
          />
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Invoice</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[20%]">Customer</th>
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
                        <span className="truncate break-words">{payment.invoiceNumber}</span>
                        <span className="text-[10px] text-muted-foreground sm:hidden truncate">
                          {payment.customerName}
                        </span>
                        <span className="text-[10px] text-muted-foreground sm:hidden truncate">
                          {payment.method}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[20%]">
                      <span className="truncate block">{payment.customerName}</span>
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
                        {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : "\u2014"}
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 w-[10%]">
                      <DeleteCustomerPaymentButton paymentId={payment.id} />
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
