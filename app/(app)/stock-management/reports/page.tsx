import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { requirePrivilege } from "@/lib/auth/privileges"
import { getStockLevels, getStockMovements, getInventoryValueAnalysis } from "./actions"
import { CurrencyDisplay } from "@/components/currency-display"
import { AlertCircle, TrendingUp, Package, ArrowDown, ArrowUp, XCircle } from "lucide-react"
import { InventoryReportClient } from "@/components/inventory-report-client"

export default async function InventoryReportsPage() {
  // Check if user has inventory_report privilege
  await requirePrivilege("inventory_report")

  const [stockLevels, movements, valueAnalysis] = await Promise.all([
    getStockLevels(),
    getStockMovements(),
    getInventoryValueAnalysis(),
  ])

  const lowStockItems = stockLevels.filter((item) => item.isLowStock)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Inventory Reports</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Comprehensive inventory analysis and stock tracking.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <p className="text-2xl font-semibold">
                <CurrencyDisplay amount={valueAnalysis.totalValue} />
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <p className="text-2xl font-semibold">{valueAnalysis.totalItems}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <p className="text-2xl font-semibold">{valueAnalysis.outOfStockCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <p className="text-2xl font-semibold">{valueAnalysis.lowStockCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Movements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ArrowUp className="w-5 h-5 text-purple-600" />
              <p className="text-2xl font-semibold">{movements.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Levels */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">Item</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">Stock</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell">Cost Price</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell">Value</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">Status</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {stockLevels.slice(0, 20).map((item) => (
                  <tr key={item.id} className="hover:bg-muted/50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm">
                      {item.name}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm">{item.stock}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell">
                      <CurrencyDisplay amount={item.unitPrice} />
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell">
                      <CurrencyDisplay amount={item.value} />
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                      {item.isOutOfStock ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Out of Stock
                        </Badge>
                      ) : item.isLowStock ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-[10px]">
                          In Stock
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Value Analysis by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Value Analysis by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {valueAnalysis.byCategory.map((category, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{category.name}</p>
                  <p className="text-sm text-muted-foreground">{category.count} items</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    <CurrencyDisplay amount={category.value} />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {valueAnalysis.totalValue > 0
                      ? ((category.value / valueAnalysis.totalValue) * 100).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stock Movement History */}
      <InventoryReportClient initialMovements={movements} />
    </div>
  )
}
