"use client"

import { useState } from "react"
import { Printer, Loader2, Eye, Search, X, Pencil } from "lucide-react"
import { useRouter } from "next/navigation"
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
import type { Sale, InvoiceForPrint } from "@/lib/types/pos"
import { toast } from "sonner"

interface POSSalesListProps {
  sales: Sale[]
}

export function POSSalesList({ sales }: POSSalesListProps) {
  const { formatCurrency } = useCurrency()
  const [printPendingId, setPrintPendingId] = useState<string | null>(null)
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null)
  const [viewInvoiceData, setViewInvoiceData] = useState<InvoiceForPrint | null>(null)
  const [viewInvoiceLoading, setViewInvoiceLoading] = useState(false)
  const [search, setSearch] = useState("")
  const router = useRouter()

  const filtered = search.trim()
    ? sales.filter((sale) => {
        const invNo = sale.id.substring(0, 8).toUpperCase()
        const q = search.trim().toUpperCase()
        const customer = (sale.party?.name ?? "").toUpperCase()
        return invNo.includes(q) || customer.includes(q)
      })
    : sales

  const handleViewOpen = async (saleId: string) => {
    setViewInvoiceId(saleId)
    setViewInvoiceLoading(true)
    setViewInvoiceData(null)
    try {
      const result = await getInvoiceForPrint(saleId)
      if (result.data) setViewInvoiceData(result.data)
    } catch {
      // silently fall back to summary view
    } finally {
      setViewInvoiceLoading(false)
    }
  }

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
                      {sale.status === "Draft" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit Draft"
                          onClick={() => router.push(`/pos?editDraft=${sale.id}`)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      <Dialog
                        open={viewInvoiceId === sale.id}
                        onOpenChange={(open) => {
                          if (open) {
                            handleViewOpen(sale.id)
                          } else {
                            setViewInvoiceId(null)
                            setViewInvoiceData(null)
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="View">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Invoice #{sale.id.substring(0, 8).toUpperCase()}</DialogTitle>
                          </DialogHeader>
                          {viewInvoiceLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="space-y-4 text-sm">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <p className="text-muted-foreground text-xs">Date</p>
                                  <p className="font-medium">{formatDate(sale.created_at)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs">Customer</p>
                                  <p className="font-medium">{sale.party?.name ?? "Walk-in"}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs">Status</p>
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                    sale.status === "Paid" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                      : sale.status === "Credit" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                      : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                                  }`}>{sale.status}</span>
                                </div>
                              </div>

                              {viewInvoiceData?.items && viewInvoiceData.items.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-2">Items</p>
                                  <div className="rounded-lg border overflow-hidden">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="bg-muted border-b">
                                          <th className="px-3 py-2 text-left font-medium">Item</th>
                                          <th className="px-3 py-2 text-right font-medium">Qty</th>
                                          <th className="px-3 py-2 text-right font-medium">Price</th>
                                          <th className="px-3 py-2 text-right font-medium">Total</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {viewInvoiceData.items.map((item, i) => (
                                          <tr key={i} className="border-b last:border-b-0">
                                            <td className="px-3 py-2">{item.name}</td>
                                            <td className="px-3 py-2 text-right">{item.quantity}</td>
                                            <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                                            <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.lineTotal)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              <div className="border-t pt-3 space-y-1">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Subtotal</span>
                                  <span>{formatCurrency(sale.subtotal)}</span>
                                </div>
                                {sale.tax > 0 && (
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Tax</span>
                                    <span>{formatCurrency(sale.tax)}</span>
                                  </div>
                                )}
                                {viewInvoiceData?.discount != null && viewInvoiceData.discount > 0 && (
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Discount</span>
                                    <span>-{formatCurrency(viewInvoiceData.discount)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-semibold text-sm pt-1 border-t">
                                  <span>Total</span>
                                  <span>{formatCurrency(sale.total)}</span>
                                </div>
                              </div>

                              {viewInvoiceData?.payments && viewInvoiceData.payments.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Payments</p>
                                  {viewInvoiceData.payments.map((p, i) => (
                                    <div key={i} className="flex justify-between text-xs">
                                      <span className="text-muted-foreground">{p.method}{p.reference ? ` (${p.reference})` : ""}</span>
                                      <span className="font-medium text-emerald-600">{formatCurrency(Number(p.amount))}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
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
