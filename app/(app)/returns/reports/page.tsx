import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { isSupabaseReady } from "@/lib/supabase/config"
import { CurrencyDisplay } from "@/components/currency-display"
import { requirePrivilege } from "@/lib/auth/privileges"
import { getReturns, getReturnById } from "../actions"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface ReturnsReportsPageProps {
  searchParams: Promise<{ returnId?: string; type?: string; dateFrom?: string; dateTo?: string; partyId?: string }>
}

export default async function ReturnsReportsPage({ searchParams }: ReturnsReportsPageProps) {
  await requirePrivilege("returns_refunds")

  const params = await searchParams
  const returnId = params.returnId

  // If returnId is provided, show detailed view
  if (returnId) {
    const returnDetails = await (async () => {
      if (!isSupabaseReady()) return null
      return await getReturnById(returnId)
    })()

    if (!returnDetails) {
      return (
        <div className="space-y-4 sm:space-y-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Return Not Found</h1>
          <Link href="/returns/reports">
            <Button variant="outline">Back to Returns List</Button>
          </Link>
        </div>
      )
    }

    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Return Details</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">View complete return information and refunds.</p>
          </div>
          <Link href="/returns/reports">
            <Button variant="outline">Back to List</Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Return Information</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Return Number</p>
                <p className="text-sm font-medium">{returnDetails.return_number}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <Badge variant={returnDetails.type === "sale" ? "default" : "secondary"}>
                  {returnDetails.type === "sale" ? "Sale Return" : "Purchase Return"}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Party</p>
                <p className="text-sm font-medium">{returnDetails.party?.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge
                  variant={
                    returnDetails.status === "Completed"
                      ? "default"
                      : returnDetails.status === "Cancelled"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {returnDetails.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-medium">
                  {returnDetails.created_at ? new Date(returnDetails.created_at).toLocaleString() : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Refunded</p>
                <p className="text-sm font-medium">
                  <CurrencyDisplay amount={returnDetails.total_refunded} />
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-2">Return Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 px-4">Item</th>
                      <th className="py-2 px-4">Quantity</th>
                      <th className="py-2 px-4">Price</th>
                      <th className="py-2 px-4">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnDetails.lines.map((line) => (
                      <tr key={line.id} className="border-b">
                        <td className="py-2 px-4">{line.item?.name || "—"}</td>
                        <td className="py-2 px-4">{line.quantity}</td>
                        <td className="py-2 px-4">
                          <CurrencyDisplay amount={line.unit_price} />
                        </td>
                        <td className="py-2 px-4">
                          <CurrencyDisplay amount={line.line_total} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {returnDetails.refunds.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-2">Refunds</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="py-2 px-4">Date</th>
                        <th className="py-2 px-4">Method</th>
                        <th className="py-2 px-4">Amount</th>
                        <th className="py-2 px-4">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnDetails.refunds.map((refund) => (
                        <tr key={refund.id} className="border-b">
                          <td className="py-2 px-4">
                            {refund.created_at ? new Date(refund.created_at).toLocaleString() : "—"}
                          </td>
                          <td className="py-2 px-4">
                            <Badge variant="outline">{refund.method}</Badge>
                          </td>
                          <td className="py-2 px-4">
                            <CurrencyDisplay amount={refund.amount} />
                          </td>
                          <td className="py-2 px-4">{refund.reference || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="border-t pt-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-muted-foreground">Subtotal</p>
                <p className="text-sm font-medium">
                  <CurrencyDisplay amount={returnDetails.subtotal} />
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tax</p>
                <p className="text-sm font-medium">
                  <CurrencyDisplay amount={returnDetails.tax} />
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-semibold">
                  <CurrencyDisplay amount={returnDetails.total} />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // List view
  const returns = await (async () => {
    if (!isSupabaseReady()) return []
    return await getReturns(
      params.type as "sale" | "purchase" | undefined,
      params.dateFrom,
      params.dateTo,
      params.partyId,
    )
  })()

  const saleReturns = returns.filter((r) => r.type === "sale")
  const purchaseReturns = returns.filter((r) => r.type === "purchase")
  const totalSaleReturns = saleReturns.reduce((sum, r) => sum + r.total, 0)
  const totalPurchaseReturns = purchaseReturns.reduce((sum, r) => sum + r.total, 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Returns List/Reports</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">View all returns and summary statistics.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Sales Returns Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Returns</span>
                <span className="text-sm font-medium">{saleReturns.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Amount</span>
                <span className="text-sm font-semibold">
                  <CurrencyDisplay amount={totalSaleReturns} />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Purchase Returns Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Returns</span>
                <span className="text-sm font-medium">{purchaseReturns.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Amount</span>
                <span className="text-sm font-semibold">
                  <CurrencyDisplay amount={totalPurchaseReturns} />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">All Returns</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Return #</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[10%]">Type</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[20%]">Party</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[15%]">Date</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Status</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Total</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[10%]">Actions</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {returns.map((returnItem) => (
                  <tr key={returnItem.id} className="hover:bg-muted/50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm w-[15%]">
                      <span className="truncate block">{returnItem.return_number}</span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 w-[10%]">
                      <Badge variant={returnItem.type === "sale" ? "default" : "secondary"} className="text-[10px] sm:text-xs">
                        {returnItem.type === "sale" ? "Sale" : "Purchase"}
                      </Badge>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[20%]">
                      <span className="truncate block">{returnItem.party?.name || "—"}</span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[15%]">
                      <span className="truncate block">
                        {returnItem.created_at ? new Date(returnItem.created_at).toLocaleDateString() : "—"}
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 w-[15%]">
                      <Badge
                        variant={
                          returnItem.status === "Completed"
                            ? "default"
                            : returnItem.status === "Cancelled"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-[10px] sm:text-xs whitespace-nowrap"
                      >
                        {returnItem.status || "Draft"}
                      </Badge>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-foreground text-xs sm:text-sm w-[15%]">
                      <span className="truncate block">
                        <CurrencyDisplay amount={returnItem.total} />
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 w-[10%]">
                      <Link href={`/returns/reports?returnId=${returnItem.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {(!returns || returns.length === 0) && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                      No returns found.
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
