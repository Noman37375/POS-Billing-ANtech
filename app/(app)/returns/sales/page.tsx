import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { isSupabaseReady } from "@/lib/supabase/config"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { CurrencyDisplay } from "@/components/currency-display"
import { requirePrivilege } from "@/lib/auth/privileges"
import { getReturns } from "../actions"
import { SalesReturnDialog } from "@/components/sales-return-dialog"

interface SalesReturnsPageProps {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string; partyId?: string }>
}

export default async function SalesReturnsPage({ searchParams }: SalesReturnsPageProps) {
  await requirePrivilege("returns_refunds")

  const params = await searchParams
  const salesReturns = await (async () => {
    if (!isSupabaseReady()) return []
    return await getReturns("sale", params.dateFrom, params.dateTo, params.partyId)
  })()

  // Get sales invoices for the dialog
  const salesInvoices = await (async () => {
    if (!isSupabaseReady()) return []
    const supabase = createClient()
    const { data } = await supabase
      .from("sales_invoices")
      .select(
        `
        id,
        total,
        created_at,
        parties:party_id (
          id,
          name,
          phone
        )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(100)
    return data || []
  })()

  // Get customers for the dialog
  const customers = await (async () => {
    if (!isSupabaseReady()) return []
    const supabase = createClient()
    const { data } = await supabase.from("parties").select("id, name, phone").eq("type", "Customer")
    return data || []
  })()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Sales Returns</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage customer return requests and process refunds.</p>
        </div>
        <SalesReturnDialog salesInvoices={salesInvoices} customers={customers} />
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Sales Returns</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%]">Return #</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[25%]">Customer</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[15%]">Date</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Status</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Total</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[10%]">Actions</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {salesReturns.map((returnItem) => (
                  <tr key={returnItem.id} className="hover:bg-muted/50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm w-[20%]">
                      <div className="flex flex-col min-w-0 overflow-hidden">
                        <span className="truncate break-words">{returnItem.return_number}</span>
                        <span className="text-[10px] text-muted-foreground sm:hidden truncate">
                          {returnItem.party?.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground sm:hidden truncate">
                          {returnItem.created_at ? new Date(returnItem.created_at).toLocaleDateString() : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[25%]">
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
                {(!salesReturns || salesReturns.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                      No sales returns yet. Create your first return to see it here.
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
