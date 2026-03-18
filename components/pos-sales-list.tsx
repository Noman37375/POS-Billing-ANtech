"use client"

import { useState } from "react"
import { Printer, Loader2, Eye, Search, X } from "lucide-react"
import { getUserPrintFormat, getInvoiceForPrint } from "@/app/(app)/pos/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useCurrency } from "@/contexts/currency-context"
import type { Sale } from "@/lib/types/pos"
import { toast } from "sonner"

interface POSSalesListProps {
  sales: Sale[]
}

export function POSSalesList({ sales }: POSSalesListProps) {
  const { formatCurrency } = useCurrency()
  const [printPendingId, setPrintPendingId] = useState<string | null>(null)
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const filtered = search.trim()
    ? sales.filter((sale) => {
        const invNo = sale.id.substring(0, 8).toUpperCase()
        const q = search.trim().toUpperCase()
        const customer = (sale.party?.name ?? "").toUpperCase()
        return invNo.includes(q) || customer.includes(q)
      })
    : sales

  const handleReprint = async (invoiceId: string) => {
    setPrintPendingId(invoiceId)
    try {
      const format = await getUserPrintFormat()
      const invoiceResult = await getInvoiceForPrint(invoiceId)
      if (invoiceResult.error || !invoiceResult.data) {
        toast.error(invoiceResult.error ?? "Failed to load invoice")
        return
      }
      if (format === "a4") {
        const { printA4Invoice } = await import("@/components/pos/print-a4-invoice")
        await printA4Invoice(invoiceResult.data)
      } else {
        const { printStandardInvoice } = await import("@/components/pos/print-standard-invoice")
        await printStandardInvoice(invoiceResult.data)
      }
      toast.success("Print dialog opened")
    } catch (e) {
      console.error(e)
      toast.error("Print failed")
    } finally {
      setPrintPendingId(null)
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-PK", { dateStyle: "short", timeStyle: "short" })

  return (
    <div className="space-y-4">
      {/* SEARCH BAR */}
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search invoice # or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 pr-8 h-9 text-sm"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted border-b">
              <th className="px-4 py-2 text-left">Invoice #</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Customer</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-right w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {search ? `No invoices found for "${search}".` : "No POS sales found for the selected period."}
                </td>
              </tr>
            ) : (
              filtered.map((sale) => (
                <tr key={sale.id} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-2 font-mono text-xs font-semibold">{sale.id.substring(0, 8).toUpperCase()}</td>
                  <td className="px-4 py-2">{formatDate(sale.created_at)}</td>
                  <td className="px-4 py-2">{sale.party?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurrency(sale.total)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        sale.status === "Paid"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : sale.status === "Draft"
                            ? "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                            : sale.status === "Credit"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}
                    >
                      {sale.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Dialog
                        open={viewInvoiceId === sale.id}
                        onOpenChange={(open) => setViewInvoiceId(open ? sale.id : null)}
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="View">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Invoice #{sale.id.substring(0, 8).toUpperCase()}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2 text-sm">
                            <p>
                              <strong>Date:</strong> {formatDate(sale.created_at)}
                            </p>
                            <p>
                              <strong>Customer:</strong> {sale.party?.name ?? "—"}
                            </p>
                            <p>
                              <strong>Subtotal:</strong> {formatCurrency(sale.subtotal)}
                            </p>
                            <p>
                              <strong>Tax:</strong> {formatCurrency(sale.tax)}
                            </p>
                            <p>
                              <strong>Total:</strong> {formatCurrency(sale.total)}
                            </p>
                            <p>
                              <strong>Status:</strong> {sale.status}
                            </p>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Reprint"
                        disabled={printPendingId !== null}
                        onClick={() => handleReprint(sale.id)}
                      >
                        {printPendingId === sale.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Printer className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
