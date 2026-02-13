"use client"

import { useMemo, useState, useTransition, useEffect } from "react"
import { Plus, Trash2, Save } from "lucide-react"
import { createInvoice, updateInvoice, type InvoiceItemInput } from "@/app/(app)/invoices/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useCurrency } from "@/contexts/currency-context"

type PartyOption = { id: string; name: string }
type InventoryOption = { id: string; name: string; stock: number; unitPrice: number }

interface InvoiceFormProps {
  parties: PartyOption[]
  inventory: InventoryOption[]
  invoiceId?: string
  initialPartyId?: string
  initialItems?: Array<{ itemId: string; quantity: number }>
  initialStatus?: string
  initialTaxRate?: number
}

export function InvoiceForm({
  parties,
  inventory,
  invoiceId,
  initialPartyId,
  initialItems,
  initialStatus,
  initialTaxRate,
}: InvoiceFormProps) {
  const isEdit = !!invoiceId
  const [partyId, setPartyId] = useState(initialPartyId || "")
  const [items, setItems] = useState<Array<{ itemId: string; quantity: number }>>(initialItems || [])
  const [status, setStatus] = useState(initialStatus || "Draft")
  const [taxRate, setTaxRate] = useState(initialTaxRate || 18)
  const [selectedItem, setSelectedItem] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ error?: string; success?: string }>({})
  const { formatCurrency } = useCurrency()

  useEffect(() => {
    if (initialPartyId) setPartyId(initialPartyId)
    if (initialItems) setItems(initialItems)
    if (initialStatus) setStatus(initialStatus)
    if (initialTaxRate !== undefined) setTaxRate(initialTaxRate)
  }, [initialPartyId, initialItems, initialStatus, initialTaxRate])

  const addLine = () => {
    if (!selectedItem || quantity <= 0) {
      toast.error("Please select an item and enter a valid quantity")
      return
    }

    const selectedInventoryItem = inventory.find((i) => i.id === selectedItem)
    if (!selectedInventoryItem) {
      toast.error("Selected item not found")
      return
    }

    // Check if item already exists in the line items
    const existingItemIndex = items.findIndex((item) => item.itemId === selectedItem)
    const existingQuantity = existingItemIndex >= 0 ? items[existingItemIndex].quantity : 0
    const totalQuantity = existingQuantity + quantity

    // In edit mode, existing quantities are already deducted from stock, so add them back for validation
    const originalQuantity = isEdit
      ? (initialItems?.find((item) => item.itemId === selectedItem)?.quantity || 0)
      : 0
    const availableStock = selectedInventoryItem.stock + (isEdit && existingItemIndex < 0 ? originalQuantity : 0)

    // Validate stock availability
    if (totalQuantity > availableStock) {
      toast.error(
        `Insufficient stock! Current stock available: ${availableStock}. You are trying to add ${totalQuantity} units.`,
        {
          description: `Item: ${selectedInventoryItem.name}`,
        },
      )
      return
    }

    // If item already exists, update quantity; otherwise add new item
    if (existingItemIndex >= 0) {
      setItems((prev) =>
        prev.map((item, idx) => (idx === existingItemIndex ? { ...item, quantity: totalQuantity } : item)),
      )
    } else {
      setItems((prev) => [...prev, { itemId: selectedItem, quantity }])
    }

    setSelectedItem("")
    setQuantity(1)
    toast.success("Item added to invoice")
  }

  const removeLine = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index))

  const computed = useMemo(() => {
    const detailed = items.map((line) => {
      const inv = inventory.find((i) => i.id === line.itemId)
      return {
        ...line,
        name: inv?.name || "",
        unitPrice: inv?.unitPrice || 0,
        amount: (inv?.unitPrice || 0) * line.quantity,
      }
    })
    const subtotal = detailed.reduce((sum, line) => sum + line.amount, 0)
    const tax = subtotal * (taxRate / 100)
    const total = subtotal + tax
    return { detailed, subtotal, tax, total }
  }, [inventory, items, taxRate])

  const handleSave = () => {
    setMessage({})

    // Final validation before saving - check all items have sufficient stock
    for (const line of computed.detailed) {
      const invItem = inventory.find((i) => i.id === line.itemId)
      if (!invItem) continue

      // In edit mode, existing quantities are already deducted from stock, so add them back for validation
      const originalQuantity = isEdit
        ? (initialItems?.find((item) => item.itemId === line.itemId)?.quantity || 0)
        : 0
      const availableStock = invItem.stock + (isEdit ? originalQuantity : 0)

      if (line.quantity > availableStock) {
        toast.error(
          `Insufficient stock for ${line.name}! Current stock: ${availableStock}, Required: ${line.quantity}`,
        )
        return
      }
    }

    startTransition(async () => {
      const payload: InvoiceItemInput[] = computed.detailed.map((line) => ({
        itemId: line.itemId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      }))

      const result = isEdit
        ? await updateInvoice(invoiceId, { partyId, items: payload, status, taxRate })
        : await createInvoice({ partyId, items: payload, taxRate })

      if (result?.error) {
        setMessage({ error: result.error })
        toast.error(result.error)
      } else {
        setMessage({ success: isEdit ? "Invoice updated" : "Invoice saved" })
        toast.success(isEdit ? "Invoice updated successfully!" : "Invoice created successfully!")
        if (!isEdit) {
          setItems([])
          setPartyId("")
        }
      }
    })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">{isEdit ? "Edit Invoice" : "Create Invoice"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="party">Customer</Label>
              <Select value={partyId} onValueChange={setPartyId}>
                <SelectTrigger id="party">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {parties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                className="w-full"
              />
            </div>
            {isEdit && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Line items</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-secondary p-4 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="item">Item</Label>
                <Select value={selectedItem} onValueChange={setSelectedItem}>
                  <SelectTrigger id="item">
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} (Stock: {item.stock})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qty">
                  Quantity
                  {selectedItem && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (Max: {inventory.find((i) => i.id === selectedItem)?.stock || 0})
                    </span>
                  )}
                </Label>
                <Input
                  id="qty"
                  type="number"
                  min={1}
                  max={selectedItem ? inventory.find((i) => i.id === selectedItem)?.stock || 0 : undefined}
                  value={quantity}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    const maxStock = selectedItem ? inventory.find((i) => i.id === selectedItem)?.stock || 0 : 0
                    if (val > maxStock) {
                      toast.error(`Maximum quantity allowed: ${maxStock}`, {
                        description: `Current stock available for this item`,
                      })
                      setQuantity(maxStock)
                    } else {
                      setQuantity(val)
                    }
                  }}
                />
              </div>
              <div className="flex items-end">
                <Button type="button" className="w-full" onClick={addLine} disabled={!selectedItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add item
                </Button>
              </div>
            </div>

            {computed.detailed.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary border-b">
                      <th className="px-4 py-3 text-left">Item</th>
                      <th className="px-4 py-3 text-left">Qty</th>
                      <th className="px-4 py-3 text-left">Selling Price</th>
                      <th className="px-4 py-3 text-left">Amount</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {computed.detailed.map((line, idx) => {
                      const invItem = inventory.find((i) => i.id === line.itemId)
                      const availableStock = invItem?.stock || 0
                      const isOverStock = line.quantity > availableStock
                      return (
                        <tr key={`${line.itemId}-${idx}`} className={isOverStock ? "bg-red-50 dark:bg-red-950/20" : ""}>
                          <td className="px-4 py-3 font-medium">
                            {line.name}
                            {isOverStock && (
                              <span className="text-xs text-red-600 dark:text-red-400 ml-2">
                                (Stock: {availableStock})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={isOverStock ? "text-red-600 dark:text-red-400 font-semibold" : ""}>
                              {line.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-3">{formatCurrency(line.unitPrice)}</td>
                          <td className="px-4 py-3 font-semibold">{formatCurrency(line.amount)}</td>
                          <td className="px-4 py-3 text-center">
                            <Button variant="ghost" size="icon" onClick={() => removeLine(idx)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {computed.detailed.length > 0 && (
            <div className="bg-secondary rounded-lg p-4 space-y-2 max-w-sm ml-auto">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold">{formatCurrency(computed.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax ({taxRate}%)</span>
                <span className="font-semibold">{formatCurrency(computed.tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-primary pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(computed.total)}</span>
              </div>
            </div>
          )}

          {message.error && <p className="text-sm text-red-600">{message.error}</p>}
          {message.success && <p className="text-sm text-green-600">{message.success}</p>}

          <Button
            type="button"
            className="w-full md:w-auto"
            onClick={handleSave}
            disabled={pending || !partyId || !items.length}
          >
            <Save className="w-4 h-4 mr-2" />
            {pending ? (isEdit ? "Updating..." : "Saving...") : isEdit ? "Update invoice" : "Save invoice"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
