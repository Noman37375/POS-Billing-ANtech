import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { requirePrivilege } from "@/lib/auth/privileges"
import { getSessionOrRedirect } from "@/lib/auth"
import { getPartyBalances } from "../actions"
import { CurrencyDisplay } from "@/components/currency-display"
import { isSupabaseReady } from "@/lib/supabase/config"
import { mockParties } from "@/lib/supabase/mock"
import { Button } from "@/components/ui/button"
import { FileText, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { ExportButtons } from "@/components/export-buttons"

export default async function PartyReportsPage() {
  await requirePrivilege("parties")

  const currentUser = await getSessionOrRedirect()
  const parties = await (async () => {
    if (!isSupabaseReady()) return mockParties
    const supabase = createClient()
    const { data = [] } = await supabase
      .from("parties")
      .select("id, name, type, created_at")
      .eq("user_id", currentUser.id)
      .order("name", { ascending: true })
    return data
  })()

  const balances = await getPartyBalances()

  // Calculate totals
  const customers = parties.filter((p) => p.type === "Customer")
  const vendors = parties.filter((p) => p.type === "Vendor")
  const totalReceivable = customers.reduce((sum, c) => sum + (balances[c.id] || 0), 0)
  const totalPayable = vendors.reduce((sum, v) => sum + (balances[v.id] || 0), 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/parties">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Party Balance Report</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Overview of all parties and their balances.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Receivable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-amber-600">
              <CurrencyDisplay amount={totalReceivable} />
            </p>
            <p className="text-xs text-muted-foreground mt-1">{customers.length} customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-red-600">
              <CurrencyDisplay amount={totalPayable} />
            </p>
            <p className="text-xs text-muted-foreground mt-1">{vendors.length} vendors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-semibold ${
                totalReceivable - totalPayable > 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              <CurrencyDisplay amount={totalReceivable - totalPayable} />
            </p>
            <p className="text-xs text-muted-foreground mt-1">Receivable - Payable</p>
          </CardContent>
        </Card>
      </div>

      {/* Parties Table */}
      <Card>
        <CardHeader className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-base sm:text-lg">All Parties</CardTitle>
          <ExportButtons
            data={parties.map((party) => ({
              name: party.name,
              type: party.type,
              balance: balances[party.id] || 0,
              status: balances[party.id] === 0 ? "Settled" : party.type === "Customer" ? (balances[party.id] > 0 ? "Receivable" : "Overpaid") : (balances[party.id] > 0 ? "Payable" : "Overpaid"),
            }))}
            columns={[
              { key: "name", header: "Name" },
              { key: "type", header: "Type" },
              { key: "balance", header: "Balance" },
              { key: "status", header: "Status" },
            ]}
            filename={`party-balances-${new Date().toISOString().split("T")[0]}`}
            title="Party Balance Report"
          />
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[25%]">Name</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Type</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%] text-right">Balance</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%]">Status</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%]">Actions</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {parties.map((party) => {
                  const balance = balances[party.id] || 0
                  const isCustomer = party.type === "Customer"
                  const hasBalance = balance !== 0

                  return (
                    <tr key={party.id} className="hover:bg-muted/50">
                      <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm w-[25%]">
                        {party.name}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 w-[15%]">
                        <Badge
                          variant={party.type === "Customer" ? "default" : "secondary"}
                          className="text-[10px] sm:text-xs whitespace-nowrap"
                        >
                          {party.type}
                        </Badge>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm w-[20%]">
                        <span
                          className={`font-medium ${
                            isCustomer
                              ? balance > 0
                                ? "text-amber-600"
                                : balance < 0
                                  ? "text-red-600"
                                  : "text-muted-foreground"
                              : balance > 0
                                ? "text-red-600"
                                : balance < 0
                                  ? "text-emerald-600"
                                  : "text-muted-foreground"
                          }`}
                        >
                          {hasBalance ? <CurrencyDisplay amount={balance} /> : "—"}
                        </span>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 w-[20%]">
                        {isCustomer ? (
                          balance > 0 ? (
                            <Badge variant="outline" className="text-xs text-amber-600">
                              Receivable
                            </Badge>
                          ) : balance < 0 ? (
                            <Badge variant="outline" className="text-xs text-red-600">
                              Overpaid
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Settled
                            </Badge>
                          )
                        ) : balance > 0 ? (
                          <Badge variant="outline" className="text-xs text-red-600">
                            Payable
                          </Badge>
                        ) : balance < 0 ? (
                          <Badge variant="outline" className="text-xs text-emerald-600">
                            Overpaid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Settled
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 w-[20%]">
                        <Link href={`/parties/${party.id}/ledger`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" title="View Ledger">
                            <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
                {(!parties || parties.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                      No parties found.
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
