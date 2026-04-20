"use client"

import { useMemo, useState, useTransition, useEffect, useRef } from "react"
import { Plus, Trash2, Save, PackagePlus, UserPlus, Search } from "lucide-react"
import { createPurchase, updatePurchase, quickCreateInventoryItem, quickCreateVendor, type PurchaseItemInput } from "@/app/(app)/purchases/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { useCurrency } from "@/contexts/currency-context"
import { getCategoriesForSelect } from "@/app/(app)/stock-management/inventory/fetch-categories"
import { getUnitsForSelect } from "@/app/(app)/stock-management/inventory/fetch-units"
import { BarcodeInput } from "@/components/barcode-input"

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
  inventory: initialInventory,
  purchaseId,
  initialPartyId,
  initialItems,
  initialStatus,
  initialTaxRate,
}: PurchaseFormProps) {
  const isEdit = !!purchaseId
  const [localInventory, setLocalInventory] = useState<InventoryOption[]>(initialInventory)
  const [partyId, setPartyId] = useState(initialPartyId || "")
  const [items, setItems] = useState<Array<{ itemId: string; quantity: number; unitPrice?: number }>>(() => {
    if (initialItems) {
      return initialItems.map((item) => {
        const invItem = initialInventory.find((i) => i.id === item.itemId)
        return {
          ...item,
          unitPrice: (item as any).unitPrice || invItem?.unitPrice || 0,
        }
      })
    }
    return []
  })
  const [status, setStatus] = useState(initialStatus || "Draft")
  const [selectedItem, setSelectedItem] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [unitPrice, setUnitPrice] = useState(0)

  // Vendor search state
  const [vendorSearch, setVendorSearch] = useState("")
  const [showVendorDropdown, setShowVendorDropdown] = useState(false)
  const vendorSearchRef = useRef<HTMLDivElement>(null)

  // Item search state
  const [itemSearch, setItemSearch] = useState("")
  const [showItemDropdown, setShowItemDropdown] = useState(false)
  const itemSearchRef = useRef<HTMLDivElement>(null)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ error?: string; success?: string }>({})
  const { formatCurrency } = useCurrency()

  // New vendor dialog state
  const [localParties, setLocalParties] = useState<PartyOption[]>(parties)
  const [newVendorOpen, setNewVendorOpen] = useState(false)
  const [newVendorName, setNewVendorName] = useState("")
  const [newVendorPhone, setNewVendorPhone] = useState("")
  const [newVendorAddress, setNewVendorAddress] = useState("")
  const [creatingVendor, setCreatingVendor] = useState(false)

  // New item dialog state
  const [newItemOpen, setNewItemOpen] = useState(false)
  const [newItemName, setNewItemName] = useState("")
  const [newItemCost, setNewItemCost] = useState(0)
  const [newItemCategory, setNewItemCategory] = useState("__none__")
  const [newItemUnit, setNewItemUnit] = useState("__none__")
  const [newItemBarcode, setNewItemBarcode] = useState("")
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [units, setUnits] = useState<{ id: string; name: string; symbol?: string | null }[]>([])
  const [creatingItem, setCreatingItem] = useState(false)

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (vendorSearchRef.current && !vendorSearchRef.current.contains(e.target as Node)) {
        setShowVendorDropdown(false)
      }
      if (itemSearchRef.current && !itemSearchRef.current.contains(e.target as Node)) {
        setShowItemDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Load categories + units when dialog opens
  useEffect(() => {
    if (newItemOpen && categories.length === 0) {
      Promise.all([getCategoriesForSelect(), getUnitsForSelect()]).then(([cats, uns]) => {
        setCategories(cats)
        setUnits(uns)
      })
    }
  }, [newItemOpen])

  useEffect(() => {
    if (initialPartyId) {
      setPartyId(initialPartyId)
      const p = parties.find((v) => v.id === initialPartyId)
      if (p) setVendorSearch(p.name)
    }
    if (initialItems) setItems(initialItems)
    if (initialStatus) setStatus(initialStatus)
  }, [initialPartyId, initialItems, initialStatus, parties])

  // Auto-fill unit price when item is selected
  useEffect(() => {
    if (selectedItem) {
      const invItem = localInventory.find((i) => i.id === selectedItem)
      if (invItem) setUnitPrice(invItem.unitPrice)
    }
  }, [selectedItem, localInventory])

  const filteredVendors = localParties.filter((p) =>
    p.name.toLowerCase().includes(vendorSearch.toLowerCase())
  )
  const filteredItems = localInventory.filter((i) =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase())
  )
  const addLine = () => {
    if (!selectedItem || quantity <= 0 || unitPrice <= 0) {
      toast.error("Please select an item and enter valid quantity and cost price")
      return
    }

    const selectedInventoryItem = localInventory.find((i) => i.id === selectedItem)
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
    setItemSearch("")
    setQuantity(1)
    setUnitPrice(0)
    toast.success("Item added to purchase")
  }

  const removeLine = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index))

  const computed = useMemo(() => {
    const detailed = items.map((line) => {
      const inv = localInventory.find((i) => i.id === line.itemId)
      const price = line.unitPrice || inv?.unitPrice || 0
      return {
        ...line,
        name: inv?.name || "",
        unitPrice: price,
        amount: price * line.quantity,
      }
    })
    const subtotal = detailed.reduce((sum, line) => sum + line.amount, 0)
    return { detailed, subtotal, total: subtotal }
  }, [localInventory, items])

  const handleCreateNewVendor = async () => {
    if (!newVendorName.trim() || !newVendorPhone.trim()) {
      toast.error("Name and phone are required")
      return
    }
    setCreatingVendor(true)
    const result = await quickCreateVendor(newVendorName.trim(), newVendorPhone.trim(), newVendorAddress || undefined)
    setCreatingVendor(false)
    if (result.error || !result.data) {
      toast.error(result.error || "Failed to create vendor")
      return
    }
    setLocalParties((prev) => [...prev, result.data!])
    setPartyId(result.data.id)
    setNewVendorOpen(false)
    setNewVendorName("")
    setNewVendorPhone("")
    setNewVendorAddress("")
    toast.success(`"${result.data.name}" added as vendor`)
  }

  const handleCreateNewItem = async () => {
    if (!newItemName.trim()) { toast.error("Item name is required"); return }
    setCreatingItem(true)
    const result = await quickCreateInventoryItem(newItemName.trim(), newItemCost, {
      categoryId: newItemCategory !== "__none__" ? newItemCategory : undefined,
      unitId: newItemUnit !== "__none__" ? newItemUnit : undefined,
      barcode: newItemBarcode || undefined,
    })
    setCreatingItem(false)
    if (result.error || !result.data) {
      toast.error(result.error || "Failed to create item")
      return
    }
    setLocalInventory((prev) => [...prev, result.data!])
    setSelectedItem(result.data.id)
    setItemSearch(result.data.name)
    setUnitPrice(result.data.unitPrice)
    setNewItemOpen(false)
    setNewItemName("")
    setNewItemCost(0)
    setNewItemCategory("__none__")
    setNewItemUnit("__none__")
    setNewItemBarcode("")
    toast.success(`"${result.data.name}" added to inventory`)
  }

  const handleSave = () => {
    setMessage({})

    startTransition(async () => {
      const payload: PurchaseItemInput[] = computed.detailed.map((line) => ({
        itemId: line.itemId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      }))

      const result = isEdit
        ? await updatePurchase(purchaseId, { partyId, items: payload, status, taxRate: 0 })
        : await createPurchase({ partyId, items: payload, taxRate: 0, status })

      if (result?.error) {
        setMessage({ error: result.error })
        toast.error(result.error)
      } else {
        setMessage({ success: isEdit ? "Purchase updated" : "Purchase saved" })
        toast.success(isEdit ? "Purchase updated successfully!" : "Purchase created successfully!")
        if (!isEdit) {
          setItems([])
          setPartyId("")
          setVendorSearch("")
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
              <div className="flex items-center justify-between">
                <Label>Vendor</Label>
                <button
                  type="button"
                  onClick={() => setNewVendorOpen(true)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <UserPlus className="w-3 h-3" />
                  New Vendor
                </button>
              </div>
              <div className="relative" ref={vendorSearchRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search vendor..."
                  value={vendorSearch}
                  onChange={(e) => { setVendorSearch(e.target.value); setShowVendorDropdown(true); if (!e.target.value) setPartyId("") }}
                  onFocus={() => setShowVendorDropdown(true)}
                  className="pl-9"
                />
                {showVendorDropdown && vendorSearch && filteredVendors.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                    {filteredVendors.slice(0, 20).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        onClick={() => { setPartyId(p.id); setVendorSearch(p.name); setShowVendorDropdown(false) }}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
                {showVendorDropdown && vendorSearch && filteredVendors.length === 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md px-3 py-2 text-sm text-muted-foreground">
                    No vendors found
                  </div>
                )}
              </div>
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
                <div className="flex items-center justify-between">
                  <Label>Item</Label>
                  <button
                    type="button"
                    onClick={() => setNewItemOpen(true)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <PackagePlus className="w-3 h-3" />
                    New Item
                  </button>
                </div>
                <div className="relative" ref={itemSearchRef}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search item..."
                    value={itemSearch}
                    onChange={(e) => { setItemSearch(e.target.value); setShowItemDropdown(true); if (!e.target.value) { setSelectedItem(""); setUnitPrice(0) } }}
                    onFocus={() => setShowItemDropdown(true)}
                    className="pl-9"
                  />
                  {showItemDropdown && itemSearch && filteredItems.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                      {filteredItems.slice(0, 20).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex justify-between"
                          onClick={() => { setSelectedItem(item.id); setItemSearch(item.name); setUnitPrice(item.unitPrice); setShowItemDropdown(false) }}
                        >
                          <span>{item.name}</span>
                          <span className="text-muted-foreground text-xs">Stock: {item.stock}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {showItemDropdown && itemSearch && filteredItems.length === 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md px-3 py-2 text-sm text-muted-foreground">
                      No items found
                    </div>
                  )}
                </div>
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
              <div className="flex justify-between text-lg font-bold text-primary">
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

      {/* Quick Create New Item Dialog */}
      <Dialog open={newItemOpen} onOpenChange={setNewItemOpen}>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Add New Item to Inventory</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 space-y-4 py-2 pr-1">
            <div className="space-y-2">
              <Label>Item Name *</Label>
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g. Basmati Rice 5kg"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Cost Price</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={newItemCost || ""}
                onChange={(e) => setNewItemCost(Number(e.target.value) || 0)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">Stock = 0 — will be updated after purchase is saved</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder={categories.length ? "Select" : "Loading..."} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={newItemUnit} onValueChange={setNewItemUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder={units.length ? "Select" : "Loading..."} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}{u.symbol ? ` (${u.symbol})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Barcode (optional)</Label>
              <BarcodeInput
                value={newItemBarcode}
                onChange={setNewItemBarcode}
                placeholder="Scan or leave empty to auto-generate"
                disabled={creatingItem}
                simpleMode={true}
              />
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 pt-2">
            <Button variant="outline" onClick={() => setNewItemOpen(false)} disabled={creatingItem}>Cancel</Button>
            <Button onClick={handleCreateNewItem} disabled={creatingItem || !newItemName.trim()}>
              {creatingItem ? "Creating..." : "Create & Select"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Vendor Dialog */}
      <Dialog open={newVendorOpen} onOpenChange={setNewVendorOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="vName">Name <span className="text-destructive">*</span></Label>
              <Input
                id="vName"
                placeholder="e.g. Al-Madina Traders"
                value={newVendorName}
                onChange={(e) => setNewVendorName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vPhone">Phone <span className="text-destructive">*</span></Label>
              <Input
                id="vPhone"
                placeholder="e.g. 03001234567"
                value={newVendorPhone}
                onChange={(e) => setNewVendorPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vAddress">Address</Label>
              <Input
                id="vAddress"
                placeholder="Optional"
                value={newVendorAddress}
                onChange={(e) => setNewVendorAddress(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewVendorOpen(false)} disabled={creatingVendor}>Cancel</Button>
            <Button onClick={handleCreateNewVendor} disabled={creatingVendor}>
              {creatingVendor ? "Creating..." : "Create & Select"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
