import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { isSupabaseReady } from "@/lib/supabase/config"
import { mockInventory } from "@/lib/supabase/mock"
import InventoryDialog from "./inventory-dialog"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import { DeleteInventoryButton } from "@/components/delete-inventory-button"
import { RestoreInventoryButton } from "@/components/restore-inventory-button"
import { CurrencyDisplay } from "@/components/currency-display"
import { requirePrivilege } from "@/lib/auth/privileges"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default async function InventoryPage({ searchParams }: { searchParams: { tab?: string } }) {
  // Check if user has inventory privilege
  await requirePrivilege("inventory")

  const tab = searchParams?.tab === "archived" ? "archived" : "active"

  const items = await (async () => {
    if (!isSupabaseReady()) return mockInventory
    const { getSessionOrRedirect } = await import("@/lib/auth")
    const currentUser = await getSessionOrRedirect()
    const supabase = createClient()
    const { data = [] } = await supabase
      .from("inventory_items")
      .select("id, name, stock, cost_price, selling_price, category_id, unit_id, barcode, minimum_stock, maximum_stock, created_at, categories:category_id(name), units:unit_id(name, symbol)")
      .eq("user_id", currentUser.id)
      .eq("is_archived", tab === "archived")
      .order("created_at", { ascending: false })
    return data
  })()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Inventory</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Track stock and pricing for every SKU/service.</p>
        </div>
        {tab === "active" && <InventoryDialog />}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <Link
          href="/stock-management/inventory"
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            tab === "active"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Active
        </Link>
        <Link
          href="/stock-management/inventory?tab=archived"
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            tab === "archived"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Archived
        </Link>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">{tab === "archived" ? "Archived Items" : "Items"}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%]">Item</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[10%]">Stock</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden md:table-cell w-[12%]">Cost Price</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden md:table-cell w-[12%]">Selling Price</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden lg:table-cell w-[12%]">Gross Profit</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden lg:table-cell w-[10%]">Gross Profit %</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[12%]">Stock Value</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[12%]">Actions</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {(items || []).map((item) => {
                  const stock = Number(item.stock || 0)
                  const minStock = item.minimum_stock !== null ? Number(item.minimum_stock) : null
                  const costPrice = Number((item as { cost_price?: number }).cost_price ?? (item as { unit_price?: number }).unit_price ?? 0)
                  const sellingPrice = Number((item as { selling_price?: number }).selling_price ?? (item as { unit_price?: number }).unit_price ?? 0)
                  const grossProfit = sellingPrice - costPrice
                  const grossProfitPercent = sellingPrice > 0 ? Math.round((grossProfit / sellingPrice) * 100) : 0
                  const stockValue = stock * sellingPrice

                  // Determine stock status
                  let stockStatus: { label: string; variant: "default" | "destructive" | "secondary" | "outline" } = {
                    label: "In Stock",
                    variant: "default"
                  }

                  if (stock === 0) {
                    stockStatus = { label: "Out of Stock", variant: "destructive" }
                  } else if (minStock !== null && stock < minStock) {
                    stockStatus = { label: "Low Stock", variant: "destructive" }
                  } else {
                    stockStatus = { label: "In Stock", variant: "default" }
                  }

                  return (
                    <tr key={item.id} className="hover:bg-muted/50">
                      <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm w-[20%]">
                        <div className="flex flex-col min-w-0 overflow-hidden">
                          <span className="truncate break-words">{item.name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            {item.categories && (
                              <Badge variant="outline" className="text-[10px]">
                                {(item.categories as { name: string }).name || (Array.isArray(item.categories) && item.categories[0]?.name) || ""}
                              </Badge>
                            )}
                            {item.barcode && (
                              <span className="text-[10px] text-muted-foreground">BC: {item.barcode}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 md:hidden mt-1">
                            <span className="text-[10px] text-muted-foreground">
                              Cost: <CurrencyDisplay amount={costPrice} /> | Sell: <CurrencyDisplay amount={sellingPrice} />
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground sm:hidden">
                            Value: <CurrencyDisplay amount={stockValue} />
                          </span>
                        </div>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm w-[10%]">
                        <div className="flex items-center gap-2">
                          <span className="whitespace-nowrap">{item.stock}</span>
                          {tab === "active" && stockStatus.label !== "In Stock" && (
                            <Badge variant={stockStatus.variant} className="text-[10px] whitespace-nowrap">
                              {stockStatus.label}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden md:table-cell w-[12%]">
                        <span className="truncate block">
                          <CurrencyDisplay amount={costPrice} />
                        </span>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden md:table-cell w-[12%]">
                        <span className="truncate block">
                          <CurrencyDisplay amount={sellingPrice} />
                        </span>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden lg:table-cell w-[12%]">
                        <span className="truncate block">
                          <CurrencyDisplay amount={grossProfit} />
                        </span>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden lg:table-cell w-[10%]">
                        <span className="truncate block">{grossProfitPercent}%</span>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-foreground text-xs sm:text-sm hidden sm:table-cell w-[12%]">
                        <span className="truncate block">
                          <CurrencyDisplay amount={stockValue} />
                        </span>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 w-[12%]">
                        <div className="flex items-center gap-1 sm:gap-2">
                          {tab === "active" ? (
                            <>
                              <InventoryDialog
                                item={{
                                  id: item.id,
                                  name: item.name,
                                  stock: Number(item.stock || 0),
                                  cost_price: costPrice,
                                  selling_price: sellingPrice,
                                  category_id: item.category_id,
                                  unit_id: item.unit_id,
                                  barcode: item.barcode,
                                  minimum_stock: item.minimum_stock !== null ? Number(item.minimum_stock) : null,
                                  maximum_stock: item.maximum_stock !== null ? Number(item.maximum_stock) : null,
                                }}
                                trigger={
                                  <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                                    <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </Button>
                                }
                              />
                              <DeleteInventoryButton itemId={item.id} itemName={item.name} />
                            </>
                          ) : (
                            <RestoreInventoryButton itemId={item.id} itemName={item.name} />
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {(!items || items.length === 0) && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                      {tab === "archived" ? "No archived items." : "No items yet. Add your first service or SKU."}
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
