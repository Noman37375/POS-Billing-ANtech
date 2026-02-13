"use client"

import { useState, useTransition, useEffect } from "react"
import { Plus } from "lucide-react"
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
  const [selectedItem, setSelectedItem] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [unitPrice, setUnitPrice] = useState(0)
  const [invoiceLines, setInvoiceLines] = useState<Array<{ id: string; item_id: string; quantity: number; unit_price: number; item?: { name: string } }>>([])
  const [taxRate, setTaxRate] = useState(18)
  const [refunds, setRefunds] = useState<Array<{ amount: number; method: string; reference?: string }>>([])
  const [refundAmount, setRefundAmount] = useState("")
  const [refundMethod, setRefundMethod] = useState("Cash")
  const [refundReference, setRefundReference] = useState("")
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()

  const selectedInvoice = purchaseInvoices.find((inv) => inv.id === purchaseInvoiceId)

  // Fetch invoice lines when invoice is selected and auto-populate items
  useEffect(() => {
    if (purchaseInvoiceId && open) {
      supabase
        .from("purchase_invoice_lines")
        .select(
          `
          id,
          item_id,
          quantity,
          unit_price,
          inventory_items:item_id (
            id,
            name
          )
        `,
        )
        .eq("purchase_invoice_id", purchaseInvoiceId)
        .then(({ data, error }) => {
          if (!error && data) {
            const lines = data as any
            setInvoiceLines(lines)
            
            // Automatically populate items from invoice lines
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

  // Get inventory items for selection
  const [inventoryItems, setInventoryItems] = useState<Array<{ id: string; name: string }>>([])
  useEffect(() => {
    if (open) {
      supabase
        .from("inventory_items")
        .select("id, name")
        .then(({ data }) => {
          if (data) setInventoryItems(data)
        })
    }
  }, [open, supabase])

  const addItem = () => {
    if (!selectedItem || quantity <= 0 || unitPrice <= 0) {
      toast.error("Please select an item and enter valid quantity and cost price")
      return
    }

    const line = invoiceLines.find((l) => l.item_id === selectedItem)
    setItems((prev) => [
      ...prev,
      {
        itemId: selectedItem,
        quantity,
        unitPrice,
        purchaseInvoiceLineId: line?.id,
      },
    ])
    setSelectedItem("")
    setQuantity(1)
    setUnitPrice(0)
    toast.success("Item added")
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const addRefund = () => {
    if (!refundAmount || Number(refundAmount) <= 0) {
      toast.error("Please enter a valid refund amount")
      return
    }

    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const tax = subtotal * (taxRate / 100)
    const total = subtotal + tax
    const totalRefunded = refunds.reduce((sum, r) => sum + r.amount, 0)

    if (totalRefunded + Number(refundAmount) > total) {
      toast.error(`Refund amount exceeds return total. Maximum: ${(total - totalRefunded).toLocaleString()}`)
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

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax

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
        taxRate,
        refunds: refunds.length > 0 ? refunds : undefined,
      })

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Purchase return created successfully")
        setOpen(false)
        setPurchaseInvoiceId("")
        setPartyId("")
        setItems([])
        setRefunds([])
        setInvoiceLines([])
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
          <div className="space-y-2">
            <Label htmlFor="invoice">Purchase Invoice</Label>
            <Select value={purchaseInvoiceId} onValueChange={setPurchaseInvoiceId}>
              <SelectTrigger id="invoice">
                <SelectValue placeholder="Select purchase invoice" />
              </SelectTrigger>
              <SelectContent>
                {purchaseInvoices.map((inv) => {
                  const party = inv.parties || vendors.find((v) => v.id === inv.parties?.id)
                  return (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.id.substring(0, 8).toUpperCase()} - {party?.name || "Unknown"} -{" "}
                      <CurrencyDisplay amount={inv.total} />
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {selectedInvoice && (
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Select value={partyId} onValueChange={setPartyId}>
                <SelectTrigger id="vendor">
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
            </div>
          )}

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
                                setItems((prev) =>
                                  prev.map((itm, i) => (i === idx ? { ...itm, quantity: newQty } : itm))
                                )
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
                              setItems((prev) =>
                                prev.map((itm, i) => (i === idx ? { ...itm, unitPrice: Number(e.target.value) } : itm))
                              )
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

          <div className="space-y-2">
            <Label htmlFor="taxRate">Tax Rate (%)</Label>
            <Input
              id="taxRate"
              type="number"
              min="0"
              max="100"
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Subtotal:</span>
              <CurrencyDisplay amount={subtotal} />
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span>Tax:</span>
              <CurrencyDisplay amount={tax} />
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total:</span>
              <CurrencyDisplay amount={total} />
            </div>
          </div>

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
              <Select value={refundMethod} onValueChange={setRefundMethod}>
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
              <Input
                type="text"
                placeholder="Reference"
                value={refundReference}
                onChange={(e) => setRefundReference(e.target.value)}
                className="w-32"
              />
              <Button onClick={addRefund} size="sm">
                Add Refund
              </Button>
            </div>
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
