"use client"

import { useState, useTransition, useEffect, useRef } from "react"
import { Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createPurchaseReturn } from "@/app/(app)/returns/actions"
import type { RefundMethod } from "@/lib/types/return"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { CurrencyDisplay } from "@/components/currency-display"

interface PurchaseInvoice {
  id: string
  total: number
  created_at: string
  parties?: {
    id: string
    name: string
    phone: string
  }
}

interface Vendor {
  id: string
  name: string
  phone: string
}

interface PurchaseReturnDialogProps {
  purchaseInvoices: PurchaseInvoice[]
  vendors: Vendor[]
}

export function PurchaseReturnDialog({ purchaseInvoices, vendors }: PurchaseReturnDialogProps) {
  const [open, setOpen] = useState(false)
  const [purchaseInvoiceId, setPurchaseInvoiceId] = useState("")
  const [partyId, setPartyId] = useState("")
  const [items, setItems] = useState<Array<{ itemId: string; quantity: number; unitPrice: number; purchaseInvoiceLineId?: string }>>([])
  const [invoiceLines, setInvoiceLines] = useState<Array<{ id: string; item_id: string; quantity: number; unit_price: number; item?: { name: string } }>>([])
  const [refunds, setRefunds] = useState<Array<{ amount: number; method: RefundMethod; reference?: string }>>([])
  const [refundAmount, setRefundAmount] = useState("")
  const [refundMethod, setRefundMethod] = useState<RefundMethod>("Cash")
  const [refundReference, setRefundReference] = useState("")

  // Invoice search state
  const [invoiceSearch, setInvoiceSearch] = useState("")
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false)
  const invoiceSearchRef = useRef<HTMLDivElement>(null)

  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()

  const selectedInvoice = purchaseInvoices.find((inv) => inv.id === purchaseInvoiceId)
  const selectedVendor = vendors.find((v) => v.id === partyId)

  // Filter invoices by search
  const filteredInvoices = purchaseInvoices.filter((inv) => {
    const q = invoiceSearch.toLowerCase()
    const partyName = inv.parties?.name?.toLowerCase() || ""
    const invoiceShortId = inv.id.substring(0, 8).toUpperCase()
    return invoiceShortId.toLowerCase().includes(q) || partyName.includes(q)
  })

  // Close invoice dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (invoiceSearchRef.current && !invoiceSearchRef.current.contains(e.target as Node)) {
        setShowInvoiceDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Fetch invoice lines when invoice is selected and auto-populate items
  useEffect(() => {
    if (purchaseInvoiceId && open) {
      supabase
        .from("purchase_invoice_lines")
        .select(`id, item_id, quantity, unit_price, inventory_items:item_id (id, name)`)
        .eq("purchase_invoice_id", purchaseInvoiceId)
        .then(({ data, error }) => {
          if (!error && data) {
            const lines = data as any
            setInvoiceLines(lines)
            const autoItems = lines.map((line: any) => ({
              itemId: line.item_id,
              quantity: Number(line.quantity || 0),
              unitPrice: Number(line.unit_price || 0),
              purchaseInvoiceLineId: line.id,
            }))
            setItems(autoItems)
            const invoice = purchaseInvoices.find((inv) => inv.id === purchaseInvoiceId)
            if (invoice?.parties) {
              setPartyId(invoice.parties.id)
            }
          }
        })
    } else {
      setInvoiceLines([])
      setItems([])
    }
  }, [purchaseInvoiceId, open, purchaseInvoices, supabase])

  // Get inventory items for manual item name lookup
  const [inventoryItems, setInventoryItems] = useState<Array<{ id: string; name: string }>>([])
  useEffect(() => {
    if (open) {
      supabase.from("inventory_items").select("id, name").then(({ data }) => {
        if (data) setInventoryItems(data)
      })
    }
  }, [open, supabase])

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

  const addRefund = () => {
    if (!refundAmount || Number(refundAmount) <= 0) {
      toast.error("Please enter a valid refund amount")
      return
    }
    if ((refundMethod === "JazzCash" || refundMethod === "EasyPaisa") && !refundReference.trim()) {
      toast.error(`Transaction ID is required for ${refundMethod}`)
      return
    }
    const totalRefunded = refunds.reduce((sum, r) => sum + r.amount, 0)
    if (totalRefunded + Number(refundAmount) > subtotal) {
      toast.error(`Refund amount exceeds return total. Maximum: ${(subtotal - totalRefunded).toLocaleString()}`)
      return
    }
    setRefunds((prev) => [...prev, { amount: Number(refundAmount), method: refundMethod, reference: refundReference }])
    setRefundAmount("")
    setRefundReference("")
    toast.success("Refund added")
  }

  const removeRefund = (index: number) => {
    setRefunds((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    if (!purchaseInvoiceId || !partyId || items.length === 0) {
      toast.error("Please select invoice, vendor, and add at least one item")
      return
    }
    startTransition(async () => {
      const result = await createPurchaseReturn({
        purchase_invoice_id: purchaseInvoiceId,
        party_id: partyId,
        items,
        taxRate: 0,
        refunds: refunds.length > 0 ? refunds : undefined,
      })
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Purchase return created successfully")
        setOpen(false)
        setPurchaseInvoiceId("")
        setInvoiceSearch("")
        setPartyId("")
        setItems([])
        setRefunds([])
        setInvoiceLines([])
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setInvoiceSearch(""); setPurchaseInvoiceId(""); setPartyId(""); setItems([]); setRefunds([]); setInvoiceLines([]) } }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Purchase Return
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Return</DialogTitle>
          <DialogDescription>Process a return for a purchase invoice.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">

          {/* Invoice Search */}
          <div className="space-y-2">
            <Label>Purchase Invoice</Label>
            <div className="relative" ref={invoiceSearchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by invoice ID or vendor name..."
                value={invoiceSearch}
                onChange={(e) => { setInvoiceSearch(e.target.value); setShowInvoiceDropdown(true) }}
                onFocus={() => setShowInvoiceDropdown(true)}
                className="pl-9"
              />
              {showInvoiceDropdown && invoiceSearch && filteredInvoices.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-52 overflow-y-auto">
                  {filteredInvoices.slice(0, 30).map((inv) => (
                    <button
                      key={inv.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex justify-between items-center"
                      onClick={() => {
                        setPurchaseInvoiceId(inv.id)
                        setInvoiceSearch(`${inv.id.substring(0, 8).toUpperCase()} — ${inv.parties?.name || "Unknown"}`)
                        setShowInvoiceDropdown(false)
                      }}
                    >
                      <span className="font-mono text-xs mr-2">{inv.id.substring(0, 8).toUpperCase()}</span>
                      <span className="flex-1">{inv.parties?.name || "Unknown"}</span>
                      <span className="text-muted-foreground ml-2"><CurrencyDisplay amount={inv.total} /></span>
                    </button>
                  ))}
                </div>
              )}
              {showInvoiceDropdown && invoiceSearch && filteredInvoices.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md px-3 py-2 text-sm text-muted-foreground">
                  No invoices found
                </div>
              )}
            </div>
            {selectedInvoice && (
              <p className="text-xs text-muted-foreground">
                Selected: <span className="font-medium text-foreground">{selectedInvoice.id.substring(0, 8).toUpperCase()}</span>
                {" — "}{selectedInvoice.parties?.name}{" — "}<CurrencyDisplay amount={selectedInvoice.total} />
              </p>
            )}
          </div>

          {/* Vendor (auto-filled or selectable) */}
          {selectedInvoice && (
            <div className="space-y-2">
              <Label>Vendor</Label>
              {selectedVendor ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md text-sm">
                  <span className="font-medium">{selectedVendor.name}</span>
                  <span className="text-muted-foreground">— {selectedVendor.phone}</span>
                </div>
              ) : (
                <Select value={partyId} onValueChange={setPartyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name} - {vendor.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Return Items */}
          <div className="space-y-2">
            <Label>Return Items</Label>
            {items.length > 0 ? (
              <div className="mt-2 space-y-2">
                {items.map((item, idx) => {
                  const invoiceLine = invoiceLines.find((l) => l.item_id === item.itemId)
                  const itemName = invoiceLine?.inventory_items
                    ? (Array.isArray(invoiceLine.inventory_items) ? invoiceLine.inventory_items[0] : invoiceLine.inventory_items)?.name
                    : inventoryItems.find((i) => i.id === item.itemId)?.name || "Unknown"
                  const maxQuantity = invoiceLine ? Number(invoiceLine.quantity || 0) : item.quantity
                  return (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                      <div className="flex-1">
                        <div className="font-medium">{itemName}</div>
                        <div className="text-xs text-muted-foreground">
                          Original: {maxQuantity} @ <CurrencyDisplay amount={item.unitPrice} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <Label className="text-xs">Return Qty</Label>
                          <Input
                            type="number"
                            min="0.01"
                            max={maxQuantity}
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQty = Number(e.target.value)
                              if (newQty >= 0 && newQty <= maxQuantity) {
                                setItems((prev) => prev.map((itm, i) => (i === idx ? { ...itm, quantity: newQty } : itm)))
                              }
                            }}
                            className="w-20 h-8"
                          />
                        </div>
                        <div className="flex flex-col">
                          <Label className="text-xs">Cost Price</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => {
                              setItems((prev) => prev.map((itm, i) => (i === idx ? { ...itm, unitPrice: Number(e.target.value) } : itm)))
                            }}
                            className="w-24 h-8"
                          />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeItem(idx)} className="mt-5">
                          Remove
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a purchase invoice to load items automatically</p>
            )}
          </div>

          {/* Totals */}
          <div className="border-t pt-4">
            <div className="flex justify-between font-semibold">
              <span>Total:</span>
              <CurrencyDisplay amount={subtotal} />
            </div>
          </div>

          {/* Refunds */}
          <div className="space-y-2 border-t pt-4">
            <Label>Refunds (Optional)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Amount"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="flex-1"
              />
              <Select value={refundMethod} onValueChange={(v) => { setRefundMethod(v as RefundMethod); setRefundReference("") }}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="JazzCash">JazzCash</SelectItem>
                  <SelectItem value="EasyPaisa">EasyPaisa</SelectItem>
                  <SelectItem value="Mixed">Mixed</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="text"
                placeholder={refundMethod === "JazzCash" || refundMethod === "EasyPaisa" ? "Txn ID *" : "Reference"}
                value={refundReference}
                onChange={(e) => setRefundReference(e.target.value)}
                className={`w-32 ${refundMethod === "JazzCash" || refundMethod === "EasyPaisa" ? "border-orange-300 focus:border-orange-500" : ""}`}
              />
              <Button onClick={addRefund} size="sm">
                Add Refund
              </Button>
            </div>
            {(refundMethod === "JazzCash" || refundMethod === "EasyPaisa") && (
              <p className="text-xs text-orange-600">Transaction ID is required for {refundMethod}</p>
            )}
            {refunds.length > 0 && (
              <div className="mt-2 space-y-1">
                {refunds.map((refund, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                    <span>
                      <CurrencyDisplay amount={refund.amount} /> - {refund.method}
                      {refund.reference && ` (${refund.reference})`}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => removeRefund(idx)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending || !purchaseInvoiceId || !partyId || items.length === 0}>
            {pending ? "Creating..." : "Create Return"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
