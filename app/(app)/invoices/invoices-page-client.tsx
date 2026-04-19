"use client"

import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import Link from "next/link"
import { InvoiceDownloadButton } from "@/components/invoice-download-button"
import { DeleteInvoiceButton } from "@/components/delete-invoice-button"
import { CurrencyDisplay } from "@/components/currency-display"

type Invoice = {
  id: string
  status: string | null
  total: number | null
  created_at: string | null
  party?: { name: string } | null
}

type StatusFilter = "All" | "Paid" | "Credit" | "Pending" | "Draft"

const STATUS_FILTERS: StatusFilter[] = ["All", "Paid", "Credit", "Pending", "Draft"]

const statusVariant = (status: string | null) => {
  if (status === "Paid") return "default"
  if (status === "Credit") return "secondary"
  if (status === "Pending") return "outline"
  return "secondary"
}

export function InvoicesPageClient({ invoices }: { invoices: Invoice[] }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All")

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    invoices.forEach((inv) => {
      const s = inv.status ?? "Draft"
      map[s] = (map[s] ?? 0) + 1
    })
    return map
  }, [invoices])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return invoices.filter((inv) => {
      if (statusFilter !== "All" && (inv.status ?? "Draft") !== statusFilter) return false
      if (!q) return true
      return (
        inv.id.substring(0, 8).toLowerCase().includes(q) ||
        inv.party?.name?.toLowerCase().includes(q)
      )
    })
  }, [invoices, search, statusFilter])

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base sm:text-lg">
            Invoices
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({filtered.length}{filtered.length !== invoices.length ? `/${invoices.length}` : ""})
            </span>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {/* Status filter tabs */}
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
                  {s === "All" ? `All (${invoices.length})` : `${s} (${counts[s] ?? 0})`}
                </button>
              ))}
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Invoice ID or customer..."
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[25%]">Invoice</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[20%]">Customer</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[15%]">Date</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[12%]">Status</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Total</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[13%]">Actions</th>
              </tr>
            </thead>
            <tbody className="[&>tr:not(:last-child)]:border-b">
              {filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-muted/50">
                  <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm">
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-mono">{inv.id.substring(0, 8).toUpperCase()}</span>
                      <span className="text-[10px] text-muted-foreground sm:hidden">
                        {inv.party?.name ?? "—"} · {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell">
                    <span className="truncate block">{inv.party?.name ?? <span className="text-muted-foreground">—</span>}</span>
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell">
                    <span className="truncate block">
                      {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "—"}
                    </span>
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4">
                    <Badge variant={statusVariant(inv.status)} className="text-[10px] sm:text-xs whitespace-nowrap">
                      {inv.status ?? "Draft"}
                    </Badge>
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-foreground text-xs sm:text-sm">
                    <CurrencyDisplay amount={Number(inv.total ?? 0)} />
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Link href={`/invoices/edit/${inv.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                          <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </Link>
                      <InvoiceDownloadButton invoiceId={inv.id} status={inv.status ?? undefined} />
                      <DeleteInvoiceButton invoiceId={inv.id} invoiceNumber={inv.id.substring(0, 8).toUpperCase()} />
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs sm:text-sm px-4">
                    {search || statusFilter !== "All"
                      ? "No invoices match your search or filter."
                      : "No invoices yet. Create your first invoice to see it here."}
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
