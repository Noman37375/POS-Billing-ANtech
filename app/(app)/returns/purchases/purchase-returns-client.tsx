"use client"

import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CurrencyDisplay } from "@/components/currency-display"

type ReturnItem = {
  id: string
  return_number: string
  party?: { name: string } | null
  created_at: string | null
  status: string | null
  total: number
}

type StatusFilter = "All" | "Completed" | "Pending" | "Cancelled" | "Draft"
const STATUS_FILTERS: StatusFilter[] = ["All", "Completed", "Pending", "Cancelled", "Draft"]

export function PurchaseReturnsClient({ returns }: { returns: ReturnItem[] }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All")

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    returns.forEach((r) => {
      const s = r.status ?? "Draft"
      map[s] = (map[s] ?? 0) + 1
    })
    return map
  }, [returns])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return returns.filter((r) => {
      if (statusFilter !== "All" && (r.status ?? "Draft") !== statusFilter) return false
      if (!q) return true
      return (
        r.return_number?.toLowerCase().includes(q) ||
        r.party?.name?.toLowerCase().includes(q)
      )
    })
  }, [returns, search, statusFilter])

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base sm:text-lg">
            Purchase Returns
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({filtered.length}{filtered.length !== returns.length ? `/${returns.length}` : ""})
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
                  {s === "All" ? `All (${returns.length})` : `${s} (${counts[s] ?? 0})`}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Return # or vendor..."
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%]">Return #</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[25%]">Vendor</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[15%]">Date</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Status</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Total</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[10%]">Actions</th>
              </tr>
            </thead>
            <tbody className="[&>tr:not(:last-child)]:border-b">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-muted/50">
                  <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm w-[20%]">
                    <div className="flex flex-col min-w-0 overflow-hidden">
                      <span className="truncate break-words">{r.return_number}</span>
                      <span className="text-[10px] text-muted-foreground sm:hidden truncate">{r.party?.name}</span>
                      <span className="text-[10px] text-muted-foreground sm:hidden truncate">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[25%]">
                    <span className="truncate block">{r.party?.name || "—"}</span>
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[15%]">
                    <span className="truncate block">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                    </span>
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 w-[15%]">
                    <Badge
                      variant={
                        r.status === "Completed" ? "default" : r.status === "Cancelled" ? "destructive" : "secondary"
                      }
                      className="text-[10px] sm:text-xs whitespace-nowrap"
                    >
                      {r.status ?? "Draft"}
                    </Badge>
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-foreground text-xs sm:text-sm w-[15%]">
                    <CurrencyDisplay amount={r.total} />
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 w-[10%]">
                    <Link href={`/returns/reports?returnId=${r.id}`}>
                      <Button variant="ghost" size="sm" className="text-xs">View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs sm:text-sm px-4">
                    {search || statusFilter !== "All"
                      ? "No returns match your search or filter."
                      : "No purchase returns yet. Create your first return to see it here."}
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
