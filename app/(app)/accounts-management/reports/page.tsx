import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requirePrivilege } from "@/lib/auth/privileges"
import { getAccountsReports } from "../actions"
import { CurrencyDisplay } from "@/components/currency-display"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Eye, TrendingUp, DollarSign } from "lucide-react"

export default async function AccountsReportsPage() {
  await requirePrivilege("accounts")

  const result = await getAccountsReports()

  if (result.error || !result.data) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Accounts Reports</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Financial reports and summaries.</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Error loading reports: {result.error || "Unknown error"}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const reports = result.data

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Accounts Reports</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Financial reports and summaries.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              Total Receivables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-semibold text-amber-600">
              <CurrencyDisplay amount={reports.totalReceivables} />
            </p>
            <p className="text-xs text-muted-foreground mt-1">{reports.receivables.length} customer(s) with outstanding balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-red-600" />
              Total Payables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-semibold text-red-600">
              <CurrencyDisplay amount={reports.totalPayables} />
            </p>
            <p className="text-xs text-muted-foreground mt-1">{reports.payables.length} vendor(s) with outstanding balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Receivables Report */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Receivables Report</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[30%]">Customer Name</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%]">Phone</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%] text-right">Outstanding</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[30%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {reports.receivables.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                      No outstanding receivables.
                    </td>
                  </tr>
                ) : (
                  reports.receivables.map((customer) => (
                    <tr key={customer.id} className="hover:bg-muted/50">
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm w-[30%]">
                        {customer.name}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm w-[20%]">
                        {customer.phone}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm w-[20%]">
                        <p className="font-medium text-amber-600">
                          <CurrencyDisplay amount={customer.balance} />
                        </p>
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

      {/* Payables Report */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Payables Report</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[30%]">Vendor Name</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%]">Phone</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%] text-right">Outstanding</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[30%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {reports.payables.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                      No outstanding payables.
                    </td>
                  </tr>
                ) : (
                  reports.payables.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-muted/50">
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm w-[30%]">
                        {vendor.name}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm w-[20%]">
                        {vendor.phone}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm w-[20%]">
                        <p className="font-medium text-red-600">
                          <CurrencyDisplay amount={vendor.balance} />
                        </p>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm w-[30%]">
                        <Link href={`/parties/${vendor.id}/ledger`}>
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
