"use client"

import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import InventoryDialog from "./inventory-dialog"
import { DeleteInventoryButton } from "@/components/delete-inventory-button"
import { RestoreInventoryButton } from "@/components/restore-inventory-button"
import { CurrencyDisplay } from "@/components/currency-display"

type InventoryItem = {
  id: string
  name: string
  stock: number | null
  cost_price?: number | null
  selling_price?: number | null
  cash_price?: number | null
  credit_price?: number | null
  supplier_price?: number | null
  profit_percentage?: number | null
  category_id?: string | null
  unit_id?: string | null
  barcode?: string | null
  minimum_stock?: number | null
  maximum_stock?: number | null
  categories?: { name: string } | { name: string }[] | null
}

type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock"

function getStockStatus(stock: number, minStock: number | null) {
  if (stock === 0) return { label: "Out of Stock", variant: "destructive" as const }
  if (minStock !== null && stock < minStock) return { label: "Low Stock", variant: "destructive" as const }
  return { label: "In Stock", variant: "default" as const }
}

export function InventoryPageClient({ items, tab }: { items: InventoryItem[]; tab: "active" | "archived" }) {
  const [search, setSearch] = useState("")
  const [stockFilter, setStockFilter] = useState<StockFilter>("all")

  const counts = useMemo(() => {
    let inStock = 0, lowStock = 0, outOfStock = 0
    items.forEach((item) => {
      const s = Number(item.stock ?? 0)
      const min = item.minimum_stock != null ? Number(item.minimum_stock) : null
      if (s === 0) outOfStock++
      else if (min !== null && s < min) lowStock++
      else inStock++
    })
    return { inStock, lowStock, outOfStock }
  }, [items])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return items.filter((item) => {
      if (q) {
        const catName = Array.isArray(item.categories)
          ? item.categories[0]?.name ?? ""
          : (item.categories as { name?: string } | null)?.name ?? ""
        const matches =
          item.name?.toLowerCase().includes(q) ||
          item.barcode?.toLowerCase().includes(q) ||
          catName.toLowerCase().includes(q)
        if (!matches) return false
      }
      if (stockFilter === "all") return true
      const s = Number(item.stock ?? 0)
      const min = item.minimum_stock != null ? Number(item.minimum_stock) : null
      if (stockFilter === "out_of_stock") return s === 0
      if (stockFilter === "low_stock") return s > 0 && min !== null && s < min
      if (stockFilter === "in_stock") return s > 0 && (min === null || s >= min)
      return true
    })
  }, [items, search, stockFilter])

  const filterButtons: { key: StockFilter; label: string }[] = [
    { key: "all", label: `All (${items.length})` },
    { key: "in_stock", label: `In Stock (${counts.inStock})` },
    { key: "low_stock", label: `Low (${counts.lowStock})` },
    { key: "out_of_stock", label: `Out (${counts.outOfStock})` },
  ]

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base sm:text-lg">
            {tab === "archived" ? "Archived Items" : "Items"}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({filtered.length}{filtered.length !== items.length ? `/${items.length}` : ""})
            </span>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {tab === "active" && (
              <div className="flex items-center gap-1">
                {filterButtons.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setStockFilter(key)}
                    className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${
                      stockFilter === key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Name, barcode, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 w-48 sm:w-64 text-xs"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[18%]">Item</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[8%]">Stock</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden md:table-cell w-[10%]">Cost</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden lg:table-cell w-[10%]">💵 Cash</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden lg:table-cell w-[10%]">📱 Credit</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden xl:table-cell w-[10%]">🏢 Supplier</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[10%]">Value</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[12%]">Actions</th>
              </tr>
            </thead>
            <tbody className="[&>tr:not(:last-child)]:border-b">
              {filtered.map((item) => {
                const stock = Number(item.stock ?? 0)
                const minStock = item.minimum_stock != null ? Number(item.minimum_stock) : null
                const costPrice = Number(item.cost_price ?? 0)
                const cashPrice = Number(item.cash_price ?? item.selling_price ?? 0)
                const creditPrice = Number(item.credit_price ?? cashPrice)
                const supplierPrice = Number(item.supplier_price ?? cashPrice)
                const stockValue = stock * cashPrice
                const status = getStockStatus(stock, minStock)
                const catName = Array.isArray(item.categories)
                  ? item.categories[0]?.name ?? ""
                  : (item.categories as { name?: string } | null)?.name ?? ""

                return (
                  <tr key={item.id} className="hover:bg-muted/50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm">
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{item.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          {catName && <Badge variant="outline" className="text-[10px]">{catName}</Badge>}
                          {item.barcode && <span className="text-[10px] text-muted-foreground">BC: {item.barcode}</span>}
                        </div>
                        <div className="flex items-center gap-2 md:hidden mt-1">
                          <span className="text-[10px] text-muted-foreground">💵 <CurrencyDisplay amount={cashPrice} /></span>
                        </div>
                        <span className="text-[10px] text-muted-foreground sm:hidden">Value: <CurrencyDisplay amount={stockValue} /></span>
                      </div>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <span>{stock}</span>
                        {tab === "active" && status.label !== "In Stock" && (
                          <Badge variant={status.variant} className="text-[10px] whitespace-nowrap">{status.label}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden md:table-cell">
                      <CurrencyDisplay amount={costPrice} />
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden lg:table-cell">
                      <CurrencyDisplay amount={cashPrice} />
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden lg:table-cell">
                      <CurrencyDisplay amount={creditPrice} />
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden xl:table-cell">
                      <CurrencyDisplay amount={supplierPrice} />
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-foreground text-xs sm:text-sm hidden sm:table-cell">
                      <CurrencyDisplay amount={stockValue} />
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4">
                      <div className="flex items-center gap-1 sm:gap-2">
                        {tab === "active" ? (
                          <>
                            <InventoryDialog
                              item={{
                                id: item.id,
                                name: item.name,
                                stock,
                                cost_price: costPrice,
                                cash_price: cashPrice,
                                credit_price: creditPrice,
                                supplier_price: supplierPrice,
                                category_id: item.category_id ?? null,
                                unit_id: item.unit_id ?? null,
                                barcode: item.barcode ?? null,
                                minimum_stock: item.minimum_stock != null ? Number(item.minimum_stock) : null,
                                maximum_stock: item.maximum_stock != null ? Number(item.maximum_stock) : null,
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground text-xs sm:text-sm px-4">
                    {search || stockFilter !== "all"
                      ? "No items match your search or filter."
                      : tab === "archived"
                      ? "No archived items."
                      : "No items yet. Add your first service or SKU."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
