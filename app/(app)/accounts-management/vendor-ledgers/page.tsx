import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requirePrivilege } from "@/lib/auth/privileges"
import { getVendorLedgers } from "../actions"
import { CurrencyDisplay } from "@/components/currency-display"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default async function VendorLedgersPage() {
  await requirePrivilege("accounts")

  const result = await getVendorLedgers()

  if (result.error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Vendor Ledgers</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">View vendor balances and ledgers.</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Error loading vendor ledgers: {result.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const vendorLedgers = result.data
  const totalPayables = vendorLedgers.filter((v) => v.balance > 0).reduce((sum, v) => sum + v.balance, 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Vendor Ledgers</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">View vendor balances and ledgers.</p>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Total Payables</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="text-2xl sm:text-3xl font-bold text-red-600">
            <CurrencyDisplay amount={totalPayables} />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {vendorLedgers.filter((v) => v.balance > 0).length} vendor(s) with outstanding balance
          </p>
        </CardContent>
      </Card>

      {/* Vendor Ledgers Table */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Vendor List</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[30%]">Vendor Name</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%]">Phone</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%] text-right">Balance</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[30%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {vendorLedgers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                      No vendors found.
                    </td>
                  </tr>
                ) : (
                  vendorLedgers.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-muted/50">
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm w-[30%]">
                        {vendor.name}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm w-[20%]">
                        {vendor.phone}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm w-[20%]">
                        <div className="flex items-center justify-end gap-2">
                          <p
                            className={`font-medium ${
                              vendor.balance > 0
                                ? "text-red-600"
                                : vendor.balance < 0
                                  ? "text-emerald-600"
                                  : "text-foreground"
                            }`}
                          >
                            <CurrencyDisplay amount={vendor.balance} />
                          </p>
                          {vendor.balance > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Payable
                            </Badge>
                          )}
                          {vendor.balance < 0 && (
                            <Badge variant="outline" className="text-xs">
                              Overpaid
                            </Badge>
                          )}
                        </div>
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
