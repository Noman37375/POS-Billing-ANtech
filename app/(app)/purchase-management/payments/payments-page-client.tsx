"use client"

import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CurrencyDisplay } from "@/components/currency-display"
import { DeletePurchasePaymentButton } from "@/components/delete-purchase-payment-button"
import { ExportButtons } from "@/components/export-buttons"

type PaidPurchase = {
  id: string
  purchaseNumber: string
  vendorName: string
  total: number
  paid: number
  balance: number
  date: string | null
}

type Payment = {
  id: string
  purchaseNumber: string
  vendorName: string
  amount: number | null
  method: string
  createdAt: string
}

export function PaymentsPageClient({
  payments,
  paidPurchases,
}: {
  payments: Payment[]
  paidPurchases: PaidPurchase[]
}) {
  const [purchaseSearch, setPurchaseSearch] = useState("")
  const [paymentSearch, setPaymentSearch] = useState("")

  const filteredPurchases = useMemo(() => {
    const q = purchaseSearch.toLowerCase().trim()
    if (!q) return paidPurchases
    return paidPurchases.filter(
      (p) =>
        p.purchaseNumber?.toLowerCase().includes(q) ||
        p.vendorName?.toLowerCase().includes(q)
    )
  }, [paidPurchases, purchaseSearch])

  const filteredPayments = useMemo(() => {
    const q = paymentSearch.toLowerCase().trim()
    if (!q) return payments
    return payments.filter(
      (p) =>
        p.purchaseNumber?.toLowerCase().includes(q) ||
        p.vendorName?.toLowerCase().includes(q) ||
        p.method?.toLowerCase().includes(q)
    )
  }, [payments, paymentSearch])

  return (
    <>
      {/* Paid Purchases */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base sm:text-lg">
              Paid Purchases
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filteredPurchases.length}{filteredPurchases.length !== paidPurchases.length ? `/${paidPurchases.length}` : ""})
              </span>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Purchase # or vendor..."
                value={purchaseSearch}
                onChange={(e) => setPurchaseSearch(e.target.value)}
                className="h-8 pl-8 w-44 sm:w-56 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Purchase</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[20%]">Vendor</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[12%]">Total</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[12%]">Paid</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[12%]">Balance</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[15%]">Date</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[14%]">Status</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-muted/50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm w-[15%]">
                      <div className="flex flex-col min-w-0 overflow-hidden">
                        <span className="truncate break-words">{purchase.purchaseNumber}</span>
                        <span className="text-[10px] text-muted-foreground sm:hidden truncate">{purchase.vendorName}</span>
                      </div>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[20%]">
                      <span className="truncate block">{purchase.vendorName}</span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm w-[12%]">
                      <CurrencyDisplay amount={purchase.total} />
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-emerald-600 text-xs sm:text-sm w-[12%]">
                      <CurrencyDisplay amount={purchase.paid} />
                    </td>
                    <td className={`py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[12%] ${purchase.balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      <CurrencyDisplay amount={purchase.balance} />
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[15%]">
                      <span className="truncate block">
                        {purchase.date ? new Date(purchase.date).toLocaleDateString() : "—"}
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[14%]">
                      <Badge variant={purchase.balance === 0 ? "default" : "outline"} className="text-[10px] sm:text-xs whitespace-nowrap">
                        {purchase.balance === 0 ? "Fully Paid" : "Partial"}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {filteredPurchases.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                      {purchaseSearch ? "No purchases match your search." : "No paid purchases yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base sm:text-lg">
              Payment History
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filteredPayments.length}{filteredPayments.length !== payments.length ? `/${payments.length}` : ""})
              </span>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Vendor, purchase #, method..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="h-8 pl-8 w-48 sm:w-64 text-xs"
                />
              </div>
              <ExportButtons
                data={filteredPayments.map((p) => ({
                  purchase: p.purchaseNumber,
                  vendor: p.vendorName,
                  amount: p.amount,
                  method: p.method,
                  date: new Date(p.createdAt).toLocaleDateString(),
                }))}
                columns={[
                  { key: "purchase", header: "Purchase" },
                  { key: "vendor", header: "Vendor" },
                  { key: "amount", header: "Amount" },
                  { key: "method", header: "Method" },
                  { key: "date", header: "Date" },
                ]}
                filename={`vendor-payments-${new Date().toISOString().split("T")[0]}`}
                title="Vendor Payments"
              />
            </div>
          </div>
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
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-muted/50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm w-[15%]">
                      <div className="flex flex-col min-w-0 overflow-hidden">
                        <span className="truncate break-words">{payment.purchaseNumber}</span>
                        <span className="text-[10px] text-muted-foreground sm:hidden truncate">{payment.vendorName}</span>
                        <span className="text-[10px] text-muted-foreground sm:hidden truncate">{payment.method}</span>
                      </div>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[20%]">
                      <span className="truncate block">{payment.vendorName}</span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-foreground text-xs sm:text-sm w-[15%]">
                      <CurrencyDisplay amount={Number(payment.amount ?? 0)} />
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
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                      {paymentSearch ? "No payments match your search." : "No payments yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
