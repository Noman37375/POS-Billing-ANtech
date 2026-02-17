import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requirePrivilege } from "@/lib/auth/privileges"
import { getCustomerLedgers } from "../actions"
import { CurrencyDisplay } from "@/components/currency-display"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ExportButtons } from "@/components/export-buttons"

export default async function CustomerLedgersPage() {
  await requirePrivilege("accounts")

  const result = await getCustomerLedgers()

  if (result.error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Customer Ledgers</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">View customer balances and ledgers.</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Error loading customer ledgers: {result.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const customerLedgers = result.data
  const totalReceivables = customerLedgers.filter((c) => c.balance > 0).reduce((sum, c) => sum + c.balance, 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Customer Ledgers</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">View customer balances and ledgers.</p>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Total Receivables</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="text-2xl sm:text-3xl font-bold text-amber-600">
            <CurrencyDisplay amount={totalReceivables} />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {customerLedgers.filter((c) => c.balance > 0).length} customer(s) with outstanding balance
          </p>
        </CardContent>
      </Card>

      {/* Customer Ledgers Table */}
      <Card>
        <CardHeader className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-base sm:text-lg">Customer List</CardTitle>
          <ExportButtons
            data={customerLedgers.map((customer) => ({
              name: customer.name,
              phone: customer.phone || "",
              balance: customer.balance,
            }))}
            columns={[
              { key: "name", header: "Customer Name" },
              { key: "phone", header: "Phone" },
              { key: "balance", header: "Balance" },
            ]}
            filename={`customer-ledgers-${new Date().toISOString().split("T")[0]}`}
            title="Customer Ledgers"
          />
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[30%]">Customer Name</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%]">Phone</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%] text-right">Balance</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[30%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {customerLedgers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  customerLedgers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-muted/50">
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm w-[30%]">
                        {customer.name}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm w-[20%]">
                        {customer.phone}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm w-[20%]">
                        <div className="flex items-center justify-end gap-2">
                          <p
                            className={`font-medium ${
                              customer.balance > 0
                                ? "text-amber-600"
                                : customer.balance < 0
                                  ? "text-red-600"
                                  : "text-foreground"
                            }`}
                          >
                            <CurrencyDisplay amount={customer.balance} />
                          </p>
                          {customer.balance > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Receivable
                            </Badge>
                          )}
                          {customer.balance < 0 && (
                            <Badge variant="outline" className="text-xs">
                              Overpaid
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm w-[30%]">
                        <Link href={`/parties/${customer.id}/ledger`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            View Ledger
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
