"use client"

import { useMemo, useState, useTransition, useEffect } from "react"
import { Plus, Trash2, Save } from "lucide-react"
import { createPurchase, updatePurchase, type PurchaseItemInput } from "@/app/(app)/purchases/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useCurrency } from "@/contexts/currency-context"

type PartyOption = { id: string; name: string }
type InventoryOption = { id: string; name: string; stock: number; unitPrice: number }

interface PurchaseFormProps {
  parties: PartyOption[]
  inventory: InventoryOption[]
  purchaseId?: string
  initialPartyId?: string
  initialItems?: Array<{ itemId: string; quantity: number; unitPrice?: number }>
  initialStatus?: string
  initialTaxRate?: number
}

export function PurchaseForm({
  parties,
  inventory,
  purchaseId,
  initialPartyId,
  initialItems,
  initialStatus,
  initialTaxRate,
}: PurchaseFormProps) {
  const isEdit = !!purchaseId
  const [partyId, setPartyId] = useState(initialPartyId || "")
  const [items, setItems] = useState<Array<{ itemId: string; quantity: number; unitPrice?: number }>>(() => {
    // Initialize with unit prices from inventory if not provided
    if (initialItems) {
      return initialItems.map((item) => {
        const invItem = inventory.find((i) => i.id === item.itemId)
        return {
          ...item,
          unitPrice: (item as any).unitPrice || invItem?.unitPrice || 0,
        }
      })
    }
    return []
  })
  const [status, setStatus] = useState(initialStatus || "Draft")
  const [taxRate, setTaxRate] = useState(initialTaxRate || 18)
  const [selectedItem, setSelectedItem] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [unitPrice, setUnitPrice] = useState(0)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ error?: string; success?: string }>({})
  const { formatCurrency } = useCurrency()

  useEffect(() => {
    if (initialPartyId) setPartyId(initialPartyId)
    if (initialItems) setItems(initialItems)
    if (initialStatus) setStatus(initialStatus)
    if (initialTaxRate !== undefined) setTaxRate(initialTaxRate)
  }, [initialPartyId, initialItems, initialStatus, initialTaxRate])

  // Update unit price when item is selected
  useEffect(() => {
    if (selectedItem) {
      const invItem = inventory.find((i) => i.id === selectedItem)
      if (invItem) {
        setUnitPrice(invItem.unitPrice)
      }
    }
  }, [selectedItem, inventory])

  const addLine = () => {
    if (!selectedItem || quantity <= 0 || unitPrice <= 0) {
      toast.error("Please select an item and enter valid quantity and cost price")
      return
    }

    const selectedInventoryItem = inventory.find((i) => i.id === selectedItem)
    if (!selectedInventoryItem) {
      toast.error("Selected item not found")
      return
    }

    // Check if item already exists in the line items
    const existingItemIndex = items.findIndex((item) => item.itemId === selectedItem)
    const totalQuantity = existingItemIndex >= 0 ? items[existingItemIndex].quantity + quantity : quantity

    // If item already exists, update quantity; otherwise add new item
    if (existingItemIndex >= 0) {
      setItems((prev) =>
        prev.map((item, idx) =>
          idx === existingItemIndex ? { ...item, quantity: totalQuantity, unitPrice } : item,
        ),
      )
    } else {
      setItems((prev) => [...prev, { itemId: selectedItem, quantity, unitPrice }])
    }

    setSelectedItem("")
    setQuantity(1)
    setUnitPrice(0)
    toast.success("Item added to purchase")
  }

  const removeLine = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index))

  const computed = useMemo(() => {
    const detailed = items.map((line) => {
      const inv = inventory.find((i) => i.id === line.itemId)
      const price = line.unitPrice || inv?.unitPrice || 0
      return {
        ...line,
        name: inv?.name || "",
        unitPrice: price,
        amount: price * line.quantity,
      }
    })
    const subtotal = detailed.reduce((sum, line) => sum + line.amount, 0)
    const tax = subtotal * (taxRate / 100)
    const total = subtotal + tax
    return { detailed, subtotal, tax, total }
  }, [inventory, items, taxRate])

  const handleSave = () => {
    setMessage({})

    startTransition(async () => {
      const payload: PurchaseItemInput[] = computed.detailed.map((line) => ({
        itemId: line.itemId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      }))

      const result = isEdit
        ? await updatePurchase(purchaseId, { partyId, items: payload, status, taxRate })
        : await createPurchase({ partyId, items: payload, taxRate, status })

      if (result?.error) {
        setMessage({ error: result.error })
        toast.error(result.error)
      } else {
        setMessage({ success: isEdit ? "Purchase updated" : "Purchase saved" })
        toast.success(isEdit ? "Purchase updated successfully!" : "Purchase created successfully!")
        if (!isEdit) {
          setItems([])
          setPartyId("")
          setStatus("Draft")
        }
      }
    })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">{isEdit ? "Edit Purchase" : "Create Purchase"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="party">Vendor</Label>
              <Select value={partyId} onValueChange={setPartyId}>
                <SelectTrigger id="party">
                  <SelectValue placeholder="Select vendor" />
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
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Line items</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-secondary p-4 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="item">Item</Label>
                <Select value={selectedItem} onValueChange={setSelectedItem}>
                  <SelectTrigger id="item">
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qty">Quantity</Label>
                <Input
                  id="qty"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitPrice">Cost Price</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-end">
                <Button type="button" className="w-full" onClick={addLine} disabled={!selectedItem || unitPrice <= 0}>
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
                      <th className="px-4 py-3 text-left">Cost Price</th>
                      <th className="px-4 py-3 text-left">Amount</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {computed.detailed.map((line, idx) => (
                      <tr key={`${line.itemId}-${idx}`}>
                        <td className="px-4 py-3 font-medium">{line.name}</td>
                        <td className="px-4 py-3">{line.quantity}</td>
                        <td className="px-4 py-3">{formatCurrency(line.unitPrice)}</td>
                        <td className="px-4 py-3 font-semibold">{formatCurrency(line.amount)}</td>
                        <td className="px-4 py-3 text-center">
                          <Button variant="ghost" size="icon" onClick={() => removeLine(idx)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
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
            {pending ? (isEdit ? "Updating..." : "Saving...") : isEdit ? "Update purchase" : "Save purchase"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
