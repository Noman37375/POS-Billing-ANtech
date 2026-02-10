import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { isSupabaseReady } from "@/lib/supabase/config"
import { mockInventory } from "@/lib/supabase/mock"
import InventoryDialog from "./inventory-dialog"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import { DeleteInventoryButton } from "@/components/delete-inventory-button"
import { CurrencyDisplay } from "@/components/currency-display"
import { requirePrivilege } from "@/lib/auth/privileges"

export default async function InventoryPage() {
  // Check if user has inventory privilege
  await requirePrivilege("inventory")
  const items = await (async () => {
    if (!isSupabaseReady()) return mockInventory
    const { getSessionOrRedirect } = await import("@/lib/auth")
    const currentUser = await getSessionOrRedirect()
    const supabase = createClient()
    const { data = [] } = await supabase
      .from("inventory_items")
      .select("id, name, stock, unit_price, category_id, unit_id, barcode, minimum_stock, maximum_stock, created_at, categories:category_id(name), units:unit_id(name, symbol)")
      .eq("user_id", currentUser.id)
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
        <InventoryDialog />
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[30%]">Item</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Stock</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[20%]">Unit Price</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[20%]">Stock Value</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Actions</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {(items || []).map((item) => {
                  const stock = Number(item.stock || 0)
                  const minStock = item.minimum_stock !== null ? Number(item.minimum_stock) : null
                  
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
                      <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm w-[30%]">
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
                          <div className="flex items-center gap-2 sm:hidden mt-1">
                            <span className="text-[10px] text-muted-foreground">
                              Price: <CurrencyDisplay amount={Number(item.unit_price || 0)} />
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground sm:hidden">
                            Value: <CurrencyDisplay amount={(Number(item.stock || 0) * Number(item.unit_price || 0))} />
                          </span>
                        </div>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm w-[15%]">
                        <div className="flex items-center gap-2">
                          <span className="whitespace-nowrap">{item.stock}</span>
                          {stockStatus.label !== "In Stock" && (
                            <Badge variant={stockStatus.variant} className="text-[10px] whitespace-nowrap">
                              {stockStatus.label}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[20%]">
                        <span className="truncate block">
                          <CurrencyDisplay amount={Number(item.unit_price || 0)} />
                        </span>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-foreground text-xs sm:text-sm hidden sm:table-cell w-[20%]">
                        <span className="truncate block">
                          <CurrencyDisplay amount={(Number(item.stock || 0) * Number(item.unit_price || 0))} />
                        </span>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 w-[15%]">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <InventoryDialog
                            item={{
                              id: item.id,
                              name: item.name,
                              stock: Number(item.stock || 0),
                              unit_price: Number(item.unit_price || 0),
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
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {(!items || items.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                      No items yet. Add your first service or SKU.
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
