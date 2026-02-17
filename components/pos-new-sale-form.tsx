"use client"

import { useMemo, useState, useTransition, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Loader2, Printer, X } from "lucide-react"
import { createPOSSale, getUserPrintFormat, getInvoiceForPrint } from "@/app/(app)/pos/actions"
import { getInvoiceForPDF } from "@/app/(app)/invoices/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useCurrency } from "@/contexts/currency-context"
import type { PaymentMethod } from "@/lib/types/pos"
type PartyOption = { id: string; name: string }
type InventoryOption = { id: string; name: string; stock: number; unitPrice: number }

interface POSNewSaleFormProps {
  parties: PartyOption[]
  inventory: InventoryOption[]
  initialItemId?: string | null
  autoAdd?: boolean
}

export function POSNewSaleForm({ parties, inventory, initialItemId, autoAdd }: POSNewSaleFormProps) {
  const [partyId, setPartyId] = useState("")
  const [items, setItems] = useState<Array<{ itemId: string; quantity: number }>>([])
  const [taxRate, setTaxRate] = useState(18)
  const [selectedItem, setSelectedItem] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash")
  const [pending, startTransition] = useTransition()
  const [printPending, setPrintPending] = useState(false)
  const [lastInvoiceId, setLastInvoiceId] = useState<string | null>(null)
  const [showCustomerResults, setShowCustomerResults] = useState(false)
  const [showItemResults, setShowItemResults] = useState(false)
  const [customerQuery, setCustomerQuery] = useState("")
  const [itemQuery, setItemQuery] = useState("")
  const customerInputRef = useRef<HTMLInputElement>(null)
  const itemInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { formatCurrency } = useCurrency()

  const selectedPartyName = partyId ? parties.find((p) => p.id === partyId)?.name ?? "" : ""
  const selectedItemName = selectedItem
    ? (() => {
        const inv = inventory.find((i) => i.id === selectedItem)
        return inv ? `${inv.name} (Stock: ${inv.stock})` : ""
      })()
    : ""

  // Helper to add an item by ID with quantity 1 (used by both barcode flows)
  const addItemById = useCallback(
    (itemId: string) => {
      const inv = inventory.find((i) => i.id === itemId)
      if (!inv) return
      if (inv.stock <= 0) {
        toast.error(`${inv.name} is out of stock`)
        return
      }
      setItems((prev) => {
        const existingIdx = prev.findIndex((i) => i.itemId === itemId)
        const currentQty = existingIdx >= 0 ? prev[existingIdx].quantity : 0
        if (currentQty + 1 > inv.stock) {
          toast.error(`Insufficient stock for ${inv.name}. Available: ${inv.stock}`)
          return prev
        }
        if (existingIdx >= 0) {
          return prev.map((item, i) =>
            i === existingIdx ? { ...item, quantity: item.quantity + 1 } : item
          )
        }
        return [...prev, { itemId, quantity: 1 }]
      })
      toast.success(`Added 1x ${inv.name}`)
    },
    [inventory]
  )

  // Listen for barcode scans from the global BarcodeScanToPOS component (same-page event)
  useEffect(() => {
    const handleBarcodeScan = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.itemId) {
        addItemById(detail.itemId)
      }
    }
    window.addEventListener("pos-barcode-scan", handleBarcodeScan)
    return () => window.removeEventListener("pos-barcode-scan", handleBarcodeScan)
  }, [addItemById])

  // Handle item from URL params (cross-page redirect from barcode scan on non-POS pages)
  const processedInitialRef = useRef(false)
  useEffect(() => {
    if (initialItemId && inventory.some((i) => i.id === initialItemId) && !processedInitialRef.current) {
      processedInitialRef.current = true
      if (autoAdd) {
        addItemById(initialItemId)
      } else {
        setSelectedItem(initialItemId)
      }
      router.replace("/pos", { scroll: false })
    }
  }, [initialItemId, inventory, router, autoAdd, addItemById])

  // Auto-print when sale is completed
  useEffect(() => {
    if (lastInvoiceId) {
      const autoPrint = async () => {
        setPrintPending(true)
        try {
          const format = await getUserPrintFormat()
          if (format === "a4") {
            const invoiceResult = await getInvoiceForPDF(lastInvoiceId)
            if (invoiceResult.error || !invoiceResult.data) return
            const { generateInvoicePDF } = await import("@/lib/pdf/generate-invoice-pdf")
            await generateInvoicePDF({ ...invoiceResult.data, currency: undefined })
          } else {
            const invoiceResult = await getInvoiceForPrint(lastInvoiceId)
            if (invoiceResult.error || !invoiceResult.data) return
            const { printStandardInvoice } = await import("@/components/pos/print-standard-invoice")
            await printStandardInvoice(invoiceResult.data)
          }
        } finally {
          setPrintPending(false)
        }
      }
      const timer = setTimeout(autoPrint, 300)
      return () => clearTimeout(timer)
    }
  }, [lastInvoiceId])

  const computed = useMemo(() => {
    const detailed = items.map((line) => {
      const inv = inventory.find((i) => i.id === line.itemId)
      return {
        ...line,
        name: inv?.name ?? "",
        unitPrice: inv?.unitPrice ?? 0,
        amount: (inv?.unitPrice ?? 0) * line.quantity,
      }
    })
    const subtotal = detailed.reduce((sum, line) => sum + line.amount, 0)
    const tax = subtotal * (taxRate / 100)
    const total = subtotal + tax
    return { detailed, subtotal, tax, total }
  }, [inventory, items, taxRate])

  const addLine = () => {
    if (!selectedItem || quantity <= 0) {
      toast.error("Select an item and enter quantity")
      return
    }
    const inv = inventory.find((i) => i.id === selectedItem)
    if (!inv) return
    const existingIdx = items.findIndex((i) => i.itemId === selectedItem)
    const newQty = existingIdx >= 0 ? items[existingIdx].quantity + quantity : quantity
    if (newQty > inv.stock) {
      toast.error(`Insufficient stock. Available: ${inv.stock}`)
      return
    }
    if (existingIdx >= 0) {
      setItems((prev) =>
        prev.map((item, i) => (i === existingIdx ? { ...item, quantity: newQty } : item)),
      )
    } else {
      setItems((prev) => [...prev, { itemId: selectedItem, quantity }])
    }
    setSelectedItem("")
    setQuantity(1)
    toast.success("Item added")
  }

  const removeLine = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCompleteSale = () => {
    if (!partyId || computed.detailed.length === 0) {
      toast.error("Select customer and add at least one item")
      return
    }
    startTransition(async () => {
      const result = await createPOSSale({
        partyId,
        items: computed.detailed.map((line) => ({
          itemId: line.itemId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
        taxRate,
        payments: [{ amount: computed.total, method: paymentMethod }],
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Sale completed")
      setLastInvoiceId(result.data?.invoiceId ?? null)
      setItems([])
      setPartyId("")
    })
  }

  const handlePrint = async () => {
    if (!lastInvoiceId) return
    setPrintPending(true)
    try {
      const format = await getUserPrintFormat()
      if (format === "a4") {
        // A4 format: use existing getInvoiceForPDF (returns InvoicePDFData)
        const invoiceResult = await getInvoiceForPDF(lastInvoiceId)
        if (invoiceResult.error || !invoiceResult.data) {
          toast.error(invoiceResult.error ?? "Failed to load invoice")
          return
        }
        const { generateInvoicePDF } = await import("@/lib/pdf/generate-invoice-pdf")
        await generateInvoicePDF({ ...invoiceResult.data, currency: undefined })
        toast.success("PDF downloaded")
      } else {
        // Standard format: use getInvoiceForPrint (returns InvoiceForPrint with store, cashier, payments)
        const invoiceResult = await getInvoiceForPrint(lastInvoiceId)
        if (invoiceResult.error || !invoiceResult.data) {
          toast.error(invoiceResult.error ?? "Failed to load invoice")
          return
        }
        const { printStandardInvoice } = await import("@/components/pos/print-standard-invoice")
        await printStandardInvoice(invoiceResult.data)
        toast.success("Open print dialog to print standard invoice")
      }
    } catch (e) {
      console.error(e)
      toast.error("Print failed")
    } finally {
      setPrintPending(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg">Point of Sale</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Customer</Label>
            <div className="relative">
              <Input
                ref={customerInputRef}
                placeholder="Search customer..."
                value={customerQuery || selectedPartyName || ""}
                onChange={(e) => {
                  setCustomerQuery(e.target.value)
                  setShowCustomerResults(e.target.value.length > 0)
                  if (!e.target.value) setPartyId("")
                }}
                onFocus={() => customerQuery && setShowCustomerResults(true)}
              />
              {partyId && (
                <button
                  onClick={() => {
                    setPartyId("")
                    setCustomerQuery("")
                    setShowCustomerResults(false)
                    customerInputRef.current?.focus()
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {showCustomerResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto">
                  {parties
                    .filter((p) => p.name.toLowerCase().includes(customerQuery.toLowerCase()))
                    .length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No customer found</div>
                  ) : (
                    parties
                      .filter((p) => p.name.toLowerCase().includes(customerQuery.toLowerCase()))
                      .map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setPartyId(p.id)
                            setCustomerQuery("")
                            setShowCustomerResults(false)
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-muted text-sm border-b last:border-b-0"
                        >
                          {p.name}
                        </button>
                      ))
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tax rate (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Add item</Label>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Input
                ref={itemInputRef}
                placeholder="Search item..."
                value={itemQuery || selectedItemName || ""}
                onChange={(e) => {
                  setItemQuery(e.target.value)
                  setShowItemResults(e.target.value.length > 0)
                  if (!e.target.value) setSelectedItem("")
                }}
                onFocus={() => itemQuery && setShowItemResults(true)}
              />

              {showItemResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto">
                  {inventory
                    .filter(
                      (item) =>
                        item.stock > 0 &&
                        item.name.toLowerCase().includes(itemQuery.toLowerCase())
                    )
                    .length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No item found</div>
                  ) : (
                    inventory
                      .filter(
                        (item) =>
                          item.stock > 0 &&
                          item.name.toLowerCase().includes(itemQuery.toLowerCase())
                      )
                      .map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedItem(item.id)
                            setItemQuery("")
                            setShowItemResults(false)
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-muted text-sm border-b last:border-b-0"
                        >
                          {item.name} (Stock: {item.stock})
                        </button>
                      ))
                  )}
                </div>
              )}
            </div>
            <Input
              type="number"
              min={1}
              max={selectedItem ? inventory.find((i) => i.id === selectedItem)?.stock ?? 0 : undefined}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="w-24"
            />
            <Button type="button" onClick={addLine} disabled={!selectedItem}>
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {computed.detailed.length > 0 && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b">
                  <th className="px-4 py-2 text-left">Item</th>
                  <th className="px-4 py-2 text-left">Qty</th>
                  <th className="px-4 py-2 text-left">Selling Price</th>
                  <th className="px-4 py-2 text-left">Amount</th>
                  <th className="px-4 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {computed.detailed.map((line, idx) => (
                  <tr key={`${line.itemId}-${idx}`} className="border-b">
                    <td className="px-4 py-2">{line.name}</td>
                    <td className="px-4 py-2">{line.quantity}</td>
                    <td className="px-4 py-2">{formatCurrency(line.unitPrice)}</td>
                    <td className="px-4 py-2 font-medium">{formatCurrency(line.amount)}</td>
                    <td className="px-4 py-2">
                      <Button variant="ghost" size="icon" onClick={() => removeLine(idx)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {computed.detailed.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1 max-w-xs">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-medium">{formatCurrency(computed.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax ({taxRate}%)</span>
                <span className="font-medium">{formatCurrency(computed.tax)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(computed.total)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Payment</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Mixed">Mixed</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCompleteSale}
                disabled={pending || !partyId}
                className="w-full sm:w-auto"
              >
                {pending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Completing...
                  </>
                ) : (
                  "Complete Sale"
                )}
              </Button>
            </div>
          </div>
        )}

        {lastInvoiceId && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <span className="text-sm">Sale completed. Invoice: {lastInvoiceId.substring(0, 8).toUpperCase()}</span>
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={printPending}>
              {printPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLastInvoiceId(null)}>
              New sale
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
