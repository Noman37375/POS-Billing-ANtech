import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requirePrivilege } from "@/lib/auth/privileges"
import { getLedgersByType } from "../actions"
import { CurrencyDisplay } from "@/components/currency-display"
import { LedgersClient } from "./ledgers-client"
import { FileText, ShoppingBag, CreditCard, Users } from "lucide-react"
import Link from "next/link"

export default async function LedgersPage({
  searchParams,
}: {
  searchParams: { type?: string }
}) {
  await requirePrivilege("accounts")

  const type = (searchParams.type as "sale" | "purchase" | "payment" | "customer" | "vendor") || "sale"
  const result = await getLedgersByType(type)

  if (result.error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Ledgers</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">View transactions by type.</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Error loading ledgers: {result.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const ledgerRows = result.data

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Ledgers</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">View transactions by type.</p>
      </div>

      <LedgersClient initialType={type} initialData={ledgerRows} />

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">
            {type === "sale" && "Sales Ledger"}
            {type === "purchase" && "Purchase Ledger"}
            {type === "payment" && "Payment Ledger"}
            {type === "customer" && "Customer Ledgers Summary"}
            {type === "vendor" && "Vendor Ledgers Summary"}
          </CardTitle>
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
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%] text-right">Net</th>
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
                          {row.type === "sale" && <FileText className="w-4 h-4 text-muted-foreground" />}
                          {row.type === "purchase" && <ShoppingBag className="w-4 h-4 text-muted-foreground" />}
                          {row.type === "payment" && <CreditCard className="w-4 h-4 text-muted-foreground" />}
                          {(row.type === "customer" || row.type === "vendor") && (
                            <Users className="w-4 h-4 text-muted-foreground" />
                          )}
                          {row.party_id && (row.type === "customer" || row.type === "vendor") ? (
                            <Link
                              href={`/parties/${row.party_id}/ledger`}
                              className="text-primary hover:underline"
                            >
                              {row.description}
                            </Link>
                          ) : (
                            <span>{row.description}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm w-[15%]">
                        {row.debit > 0 ? <CurrencyDisplay amount={row.debit} /> : "—"}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm w-[15%]">
                        {row.credit > 0 ? <CurrencyDisplay amount={row.credit} /> : "—"}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm font-medium w-[20%]">
                        <CurrencyDisplay amount={row.debit - row.credit} />
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
