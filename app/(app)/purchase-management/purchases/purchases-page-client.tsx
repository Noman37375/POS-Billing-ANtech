"use client"

import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import Link from "next/link"
import { CurrencyDisplay } from "@/components/currency-display"
import { DeletePurchaseButton } from "@/components/delete-purchase-button"
import { PurchaseDownloadButton } from "@/components/purchase-download-button"

type Purchase = {
  id: string
  purchaseNumber: string
  vendorName: string
  date: string | null
  status: string | null
  total: number | null
}

type StatusFilter = "All" | "Paid" | "Unpaid" | "Draft"
const STATUS_FILTERS: StatusFilter[] = ["All", "Paid", "Unpaid", "Draft"]

export function PurchasesPageClient({ purchases }: { purchases: Purchase[] }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All")

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    purchases.forEach((p) => {
      const s = p.status ?? "Draft"
      map[s] = (map[s] ?? 0) + 1
    })
    return map
  }, [purchases])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return purchases.filter((p) => {
      if (statusFilter !== "All" && (p.status ?? "Draft") !== statusFilter) return false
      if (!q) return true
      return (
        p.purchaseNumber?.toLowerCase().includes(q) ||
        p.vendorName?.toLowerCase().includes(q)
      )
    })
  }, [purchases, search, statusFilter])

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base sm:text-lg">
            Purchases
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({filtered.length}{filtered.length !== purchases.length ? `/${purchases.length}` : ""})
            </span>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  {s === "All" ? `All (${purchases.length})` : `${s} (${counts[s] ?? 0})`}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Purchase # or vendor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 w-44 sm:w-56 text-xs"
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%]">Purchase</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[25%]">Vendor</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[15%]">Date</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Status</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Total</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[10%]">Actions</th>
              </tr>
            </thead>
            <tbody className="[&>tr:not(:last-child)]:border-b">
              {filtered.map((purchase) => (
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
                      variant={purchase.status === "Paid" ? "default" : "secondary"}
                      className="text-[10px] sm:text-xs whitespace-nowrap"
                    >
                      {purchase.status ?? "Draft"}
                    </Badge>
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-foreground text-xs sm:text-sm w-[15%]">
                    <CurrencyDisplay amount={Number(purchase.total ?? 0)} />
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 w-[10%]">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <PurchaseDownloadButton purchaseId={purchase.id} status={purchase.status ?? undefined} />
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs sm:text-sm px-4">
                    {search || statusFilter !== "All"
                      ? "No purchases match your search or filter."
                      : "No purchases yet. Create your first purchase to see it here."}
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
