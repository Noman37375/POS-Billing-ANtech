import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { requirePrivilege } from "@/lib/auth/privileges"
import { getPartyLedger } from "../../actions"
import { CurrencyDisplay } from "@/components/currency-display"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileText, CreditCard } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

export default async function PartyLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePrivilege("parties")
  const { id } = await params

  const result = await getPartyLedger(id)

  if (result.error || !result.data) {
    notFound()
  }

  const { party, ledgerRows } = result.data

  const currentBalance = ledgerRows.length > 0 ? ledgerRows[ledgerRows.length - 1].balance : 0
  const isVendor = party.type === "Vendor"
  
  // Calculate summary stats
  const totalDebits = ledgerRows.reduce((sum, row) => sum + row.debit, 0)
  const totalCredits = ledgerRows.reduce((sum, row) => sum + row.credit, 0)
  const transactionCount = ledgerRows.length
  const invoiceCount = ledgerRows.filter((r) => r.type === "invoice" || r.type === "purchase").length
  const paymentCount = ledgerRows.filter((r) => r.type === "payment").length

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/parties">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">{party.name}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Account Ledger</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p
                className={`text-2xl sm:text-3xl font-semibold ${
                  isVendor
                    ? currentBalance > 0
                      ? "text-red-600"
                      : currentBalance < 0
                        ? "text-emerald-600"
                        : "text-foreground"
                    : currentBalance > 0
                      ? "text-amber-600"
                      : currentBalance < 0
                        ? "text-red-600"
                        : "text-foreground"
                }`}
              >
                <CurrencyDisplay amount={currentBalance} />
              </p>
              {isVendor ? (
                <>
                  {currentBalance > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Payable
                    </Badge>
                  )}
                  {currentBalance < 0 && (
                    <Badge variant="outline" className="text-xs">
                      Overpaid
                    </Badge>
                  )}
                </>
              ) : (
                <>
                  {currentBalance > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Receivable
                    </Badge>
                  )}
                  {currentBalance < 0 && (
                    <Badge variant="outline" className="text-xs">
                      Overpaid
                    </Badge>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total {isVendor ? "Purchases" : "Sales"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">
              <CurrencyDisplay amount={totalDebits} />
            </p>
            <p className="text-xs text-muted-foreground mt-1">{invoiceCount} {isVendor ? "purchases" : "invoices"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">
              <CurrencyDisplay amount={totalCredits} />
            </p>
            <p className="text-xs text-muted-foreground mt-1">{paymentCount} payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{transactionCount}</p>
            <p className="text-xs text-muted-foreground mt-1">All entries</p>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Table */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%]">Date</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[30%]">Description</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%] text-right">Debit</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%] text-right">Credit</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%] text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {ledgerRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  ledgerRows.map((row, index) => (
                    <tr key={`${row.type}-${row.reference_id}-${index}`} className="hover:bg-muted/50">
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm w-[20%]">
                        <div className="flex flex-col">
                          <span>{new Date(row.date).toLocaleDateString()}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(row.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm w-[30%]">
                        <div className="flex items-center gap-2">
                          {row.type === "invoice" || row.type === "purchase" ? (
                            <FileText className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <CreditCard className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span>{row.description}</span>
                        </div>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm w-[15%]">
                        {row.debit > 0 ? <CurrencyDisplay amount={row.debit} /> : "—"}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm w-[15%]">
                        {row.credit > 0 ? <CurrencyDisplay amount={row.credit} /> : "—"}
                      </td>
                      <td
                        className={`py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm font-medium w-[20%] ${
                          isVendor
                            ? row.balance > 0
                              ? "text-red-600"
                              : row.balance < 0
                                ? "text-emerald-600"
                                : "text-foreground"
                            : row.balance > 0
                              ? "text-amber-600"
                              : row.balance < 0
                                ? "text-red-600"
                                : "text-foreground"
                        }`}
                      >
                        <CurrencyDisplay amount={row.balance} />
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
