import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { isSupabaseReady } from "@/lib/supabase/config"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CurrencyDisplay } from "@/components/currency-display"
import { requirePrivilege } from "@/lib/auth/privileges"
import { getRefunds, getReturns } from "../actions"
import { RefundDialog } from "@/components/refund-dialog"

interface RefundsPageProps {
  searchParams: Promise<{ returnId?: string; dateFrom?: string; dateTo?: string }>
}

export default async function RefundsPage({ searchParams }: RefundsPageProps) {
  await requirePrivilege("returns_refunds")

  const params = await searchParams
  const refunds = await (async () => {
    if (!isSupabaseReady()) return []
    return await getRefunds(params.returnId, params.dateFrom, params.dateTo)
  })()

  // Get returns for the dialog
  const returns = await (async () => {
    if (!isSupabaseReady()) return []
    return await getReturns()
  })()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Refund Processing</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage refunds for returns and track payment processing.</p>
        </div>
        <RefundDialog returns={returns} />
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Refunds</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%]">Return #</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[20%]">Type</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[20%]">Party</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Method</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Amount</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[10%]">Date</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {refunds.map((refund) => (
                  <tr key={refund.id} className="hover:bg-muted/50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm w-[20%]">
                      <div className="flex flex-col min-w-0 overflow-hidden">
                        <span className="truncate break-words">{refund.return?.return_number || "—"}</span>
                        <span className="text-[10px] text-muted-foreground sm:hidden truncate">
                          {refund.return?.type === "sale" ? "Sale" : "Purchase"}
                        </span>
                        <span className="text-[10px] text-muted-foreground sm:hidden truncate">
                          {refund.created_at ? new Date(refund.created_at).toLocaleDateString() : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[20%]">
                      <Badge variant={refund.return?.type === "sale" ? "default" : "secondary"} className="text-[10px] sm:text-xs">
                        {refund.return?.type === "sale" ? "Sale" : "Purchase"}
                      </Badge>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[20%]">
                      <span className="truncate block">{refund.return?.party?.name || "—"}</span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 w-[15%]">
                      <Badge variant="outline" className="text-[10px] sm:text-xs">
                        {refund.method}
                      </Badge>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-foreground text-xs sm:text-sm w-[15%]">
                      <span className="truncate block">
                        <CurrencyDisplay amount={refund.amount} />
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[10%]">
                      <span className="truncate block">
                        {refund.created_at ? new Date(refund.created_at).toLocaleDateString() : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!refunds || refunds.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                      No refunds yet. Process your first refund to see it here.
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
