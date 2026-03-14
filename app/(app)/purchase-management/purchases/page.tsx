import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { isSupabaseReady } from "@/lib/supabase/config"
import { Button } from "@/components/ui/button"
import { Pencil, Plus } from "lucide-react"
import Link from "next/link"
import { CurrencyDisplay } from "@/components/currency-display"
import { requirePrivilege } from "@/lib/auth/privileges"
import { getPurchases } from "@/app/(app)/purchases/actions"
import { DeletePurchaseButton } from "@/components/delete-purchase-button"
import { PurchaseDownloadButton } from "@/components/purchase-download-button"

export default async function PurchasesListPage() {
  await requirePrivilege("purchases")

  const purchases = await (async () => {
    if (!isSupabaseReady()) return []
    const result = await getPurchases()
    return result.data || []
  })()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Purchases</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage vendor purchase invoices.</p>
        </div>
        <Link href="/purchase-management/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Purchase
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Recent purchases</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%]">Purchase</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[25%]">Vendor</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[15%]">Date</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Status</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Total</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[10%]">Actions</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-muted/50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm w-[20%]">
                      <div className="flex flex-col min-w-0 overflow-hidden">
                        <span className="truncate break-words">{purchase.purchaseNumber}</span>
                        <span className="text-[10px] text-muted-foreground sm:hidden truncate">
                          {purchase.vendorName}
                        </span>
                        <span className="text-[10px] text-muted-foreground sm:hidden truncate">
                          {purchase.date ? new Date(purchase.date).toLocaleDateString() : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[25%]">
                      <span className="truncate block">{purchase.vendorName}</span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[15%]">
                      <span className="truncate block">
                        {purchase.date ? new Date(purchase.date).toLocaleDateString() : "—"}
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 w-[15%]">
                      <Badge
                        variant={
                          purchase.status === "Paid"
                            ? "default"
                            : purchase.status === "Draft"
                              ? "secondary"
                              : "secondary"
                        }
                        className="text-[10px] sm:text-xs whitespace-nowrap"
                      >
                        {purchase.status || "Draft"}
                      </Badge>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-foreground text-xs sm:text-sm w-[15%]">
                      <span className="truncate block">
                        <CurrencyDisplay amount={Number(purchase.total || 0)} />
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 w-[10%]">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <PurchaseDownloadButton purchaseId={purchase.id} status={purchase.status} />
                        <Link href={`/purchase-management/edit/${purchase.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                            <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </Link>
                        <DeletePurchaseButton purchaseId={purchase.id} purchaseNumber={purchase.purchaseNumber} />
                      </div>
                    </td>
                  </tr>
                ))}
                {(!purchases || purchases.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                      No purchases yet. Create your first purchase to see it here.
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
