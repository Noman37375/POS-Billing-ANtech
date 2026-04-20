"use client"

import { useActionState, useEffect, useState, useRef } from "react"
import { Plus, Pencil } from "lucide-react"
import { createInventoryItem, updateInventoryItem } from "./actions"
import { quickCreateCategory } from "@/app/(app)/stock-management/categories/actions"
import { quickCreateUnit } from "@/app/(app)/stock-management/units/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getCategoriesForSelect } from "./fetch-categories"
import { getUnitsForSelect } from "./fetch-units"
import { BarcodeInput } from "@/components/barcode-input"
import { toast } from "sonner"

const initialState = { error: "" }

interface InventoryItem {
  id: string
  name: string
  stock: number
  cost_price: number
  selling_price?: number // deprecated, keep for migration
  cash_price?: number
  credit_price?: number
  supplier_price?: number
  profit_percentage?: number
  profit_value?: number
  category_id?: string | null
  unit_id?: string | null
  barcode?: string | null
  minimum_stock?: number | null
  maximum_stock?: number | null
}

interface Category {
  id: string
  name: string
}

interface Unit {
  id: string
  name: string
  symbol?: string | null
}

interface InventoryDialogProps {
  item?: InventoryItem | null
  trigger?: React.ReactNode
}

export default function InventoryDialog({ item, trigger }: InventoryDialogProps) {
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("__none__")
  const [selectedUnit, setSelectedUnit] = useState<string>("__none__")
  const [barcode, setBarcode] = useState<string>("")
  const [costPrice, setCostPrice] = useState<string>("")
  const [cashPrice, setCashPrice] = useState<string>("")
  const [creditPrice, setCreditPrice] = useState<string>("")
  const [supplierPrice, setSupplierPrice] = useState<string>("")
  const [mounted, setMounted] = useState(false)
  const wasPendingRef = useRef(false)
  const isEdit = !!item

  // Inline new category dialog
  const [newCatOpen, setNewCatOpen] = useState(false)
  const [newCatName, setNewCatName] = useState("")
  const [creatingCat, setCreatingCat] = useState(false)

  // Inline new unit dialog
  const [newUnitOpen, setNewUnitOpen] = useState(false)
  const [newUnitName, setNewUnitName] = useState("")
  const [newUnitSymbol, setNewUnitSymbol] = useState("")
  const [creatingUnit, setCreatingUnit] = useState(false)

  // Handle mounting to prevent hydration issues
  useEffect(() => {
    setMounted(true)
    if (item?.category_id) {
      setSelectedCategory(item.category_id)
    } else {
      setSelectedCategory("__none__")
    }
    if (item?.unit_id) {
      setSelectedUnit(item.unit_id)
    } else {
      setSelectedUnit("__none__")
    }
  }, [item?.category_id, item?.unit_id])

  useEffect(() => {
    if (open && mounted) {
      Promise.all([getCategoriesForSelect(), getUnitsForSelect()]).then(([categoriesData, unitsData]) => {
        setCategories(categoriesData)
        setUnits(unitsData)
      })
    }
  }, [open, mounted])

  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      try {
        // Add category_id, unit_id and barcode to formData
        // Handle special "__none__" value for clearing category
        if (selectedCategory && selectedCategory !== "__none__") {
          formData.append("category_id", selectedCategory)
        } else {
          // Explicitly set empty to clear category
          formData.append("category_id", "")
        }
        // Handle unit_id
        if (selectedUnit && selectedUnit !== "__none__") {
          formData.append("unit_id", selectedUnit)
        } else {
          formData.append("unit_id", "")
        }
        // Add barcode from state
        if (barcode) {
          formData.append("barcode", barcode)
        } else {
          formData.append("barcode", "")
        }

        // Add multi-tier pricing fields
        if (costPrice) {
          formData.append("cost_price", costPrice)
        }
        if (cashPrice) {
          formData.append("cash_price", cashPrice)
        }
        if (creditPrice) {
          formData.append("credit_price", creditPrice)
        }
        if (supplierPrice) {
          formData.append("supplier_price", supplierPrice)
        }

        const result = isEdit ? await updateInventoryItem(formData) : await createInventoryItem(formData)

        if (result?.error) {
          return { error: result.error }
        }

        return { error: "" }
      } catch (error) {
        console.error("Form submission error:", error)
        return { error: error instanceof Error ? error.message : "An unexpected error occurred" }
      }
    },
    initialState,
  )

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      // Reset to item's category and unit when opening for edit, or "__none__" for new item
      setSelectedCategory(item?.category_id || "__none__")
      setSelectedUnit(item?.unit_id || "__none__")
      setBarcode(item?.barcode || "")

      // Set price fields (handle both new and old field names for migration)
      setCostPrice(String(item?.cost_price || ""))
      setCashPrice(String(item?.cash_price || item?.selling_price || ""))
      setCreditPrice(String(item?.credit_price || ""))
      setSupplierPrice(String(item?.supplier_price || ""))
    } else {
      // Reset when dialog closes
      setSelectedCategory("__none__")
      setSelectedUnit("__none__")
      setBarcode("")
      setCostPrice("")
      setCashPrice("")
      setCreditPrice("")
      setSupplierPrice("")
      setCategories([])
      setUnits([])
    }
  }, [open, item?.category_id, item?.unit_id, item?.barcode, item?.cost_price, item?.cash_price, item?.credit_price, item?.supplier_price, item?.selling_price])
  
  // Track pending state to detect when submission completes
  useEffect(() => {
    wasPendingRef.current = pending
  }, [pending])

  // Close dialog on successful submission
  useEffect(() => {
    // Only close if:
    // 1. We were pending (submitting) and now we're not (submission completed)
    // 2. There's no error (success)
    // 3. Dialog is open
    if (wasPendingRef.current && !pending && !state.error && open) {
      const timer = setTimeout(() => {
        setOpen(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [pending, state.error, open])

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) { toast.error("Category name is required"); return }
    setCreatingCat(true)
    const result = await quickCreateCategory(newCatName.trim())
    setCreatingCat(false)
    if (result.error || !result.data) { toast.error(result.error || "Failed"); return }
    setCategories((prev) => [...prev, result.data!])
    setSelectedCategory(result.data.id)
    setNewCatOpen(false)
    setNewCatName("")
    toast.success(`Category "${result.data.name}" created`)
  }

  const handleCreateUnit = async () => {
    if (!newUnitName.trim()) { toast.error("Unit name is required"); return }
    setCreatingUnit(true)
    const result = await quickCreateUnit(newUnitName.trim(), newUnitSymbol || undefined)
    setCreatingUnit(false)
    if (result.error || !result.data) { toast.error(result.error || "Failed"); return }
    setUnits((prev) => [...prev, result.data!])
    setSelectedUnit(result.data.id)
    setNewUnitOpen(false)
    setNewUnitName("")
    setNewUnitSymbol("")
    toast.success(`Unit "${result.data.name}" created`)
  }

  const defaultTrigger = (
    <Button>
      <Plus className="w-4 h-4 mr-2" />
      Add Item
    </Button>
  )

  const calcProfit = (selling: string, cost: string) => {
    const s = parseFloat(selling), c = parseFloat(cost)
    if (!s || !c || c <= 0) return { pct: 0, val: "0.00" }
    return { pct: Math.round(((s - c) / c) * 10000) / 100, val: (s - c).toFixed(2) }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-w-[calc(100%-2rem)] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-3 border-b">
          <DialogTitle>{isEdit ? "Edit inventory item" : "Add inventory item"}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col flex-1 overflow-hidden" key={isEdit ? `edit-${item?.id}` : `new-${open}`}>
          {isEdit && <input type="hidden" name="id" value={item.id} />}
          <input type="hidden" name="category_id" value={selectedCategory} />
          <input type="hidden" name="unit_id" value={selectedUnit} />

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

            {/* Name + Stock + Cost */}
            <div className="space-y-2">
              <Label htmlFor="name">Item Name</Label>
              <Input id="name" name="name" placeholder="e.g. Basmati Rice 5kg" defaultValue={item?.name || ""} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Input id="stock" name="stock" type="number" min={0} step="0.01" placeholder="0" defaultValue={item?.stock || ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost_price">Cost Price (PKR)</Label>
                <Input id="cost_price" type="number" min="0" step="0.01" placeholder="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} required />
              </div>
            </div>

            {/* Selling Prices */}
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Selling Prices by Customer Type</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cash_price" className="text-xs">Cash (PKR)</Label>
                  <Input id="cash_price" type="number" min="0" step="0.01" placeholder="0" value={cashPrice} onChange={(e) => setCashPrice(e.target.value)} required />
                  <p className="text-[10px] text-muted-foreground">Direct/cash sales</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="credit_price" className="text-xs">Credit (PKR)</Label>
                  <Input id="credit_price" type="number" min="0" step="0.01" placeholder="0" value={creditPrice} onChange={(e) => setCreditPrice(e.target.value)} required />
                  <p className="text-[10px] text-muted-foreground">Udhaar/credit sales</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="supplier_price" className="text-xs">Supplier (PKR)</Label>
                  <Input id="supplier_price" type="number" min="0" step="0.01" placeholder="0" value={supplierPrice} onChange={(e) => setSupplierPrice(e.target.value)} required />
                  <p className="text-[10px] text-muted-foreground">Supplier customers</p>
                </div>
              </div>
            </div>

            {/* Profit Preview */}
            {costPrice && (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-3">
                <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2 uppercase tracking-wide">Profit Preview</h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { label: "Cash", val: cashPrice },
                    { label: "Credit", val: creditPrice },
                    { label: "Supplier", val: supplierPrice },
                  ].map(({ label, val }) => {
                    const p = calcProfit(val, costPrice)
                    return (
                      <div key={label} className="bg-white dark:bg-slate-800 rounded p-2 border border-border text-center">
                        <p className="text-muted-foreground font-medium">{label}</p>
                        <p className={`font-bold ${p.pct >= 0 ? "text-emerald-600" : "text-red-500"}`}>{p.pct}%</p>
                        <p className={`text-[10px] ${p.pct >= 0 ? "text-emerald-600" : "text-red-500"}`}>PKR {p.val}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Min/Max Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="minimum_stock">Min Stock</Label>
                <Input id="minimum_stock" name="minimum_stock" type="number" min={0} step="0.01" placeholder="5" defaultValue={item?.minimum_stock || ""} />
                <p className="text-xs text-muted-foreground">Alert threshold</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maximum_stock">Max Stock</Label>
                <Input id="maximum_stock" name="maximum_stock" type="number" min={0} step="0.01" placeholder="100" defaultValue={item?.maximum_stock || ""} />
                <p className="text-xs text-muted-foreground">Optional capacity</p>
              </div>
            </div>

            {/* Category + Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Category</Label>
                  <button type="button" onClick={() => setNewCatOpen(true)} className="text-xs text-primary hover:underline">+ New</button>
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={!mounted || categories.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={mounted && categories.length > 0 ? "Select" : "Loading..."} />
                  </SelectTrigger>
                  {mounted && (
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  )}
                </Select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Unit</Label>
                  <button type="button" onClick={() => setNewUnitOpen(true)} className="text-xs text-primary hover:underline">+ New</button>
                </div>
                <Select value={selectedUnit} onValueChange={setSelectedUnit} disabled={!mounted || units.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={mounted && units.length > 0 ? "Select" : "Loading..."} />
                  </SelectTrigger>
                  {mounted && (
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {units.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}{u.symbol ? ` (${u.symbol})` : ""}</SelectItem>)}
                    </SelectContent>
                  )}
                </Select>
              </div>
            </div>

            {/* Barcode */}
            <div className="space-y-1.5">
              <BarcodeInput
                value={barcode}
                onChange={setBarcode}
                placeholder="Scan barcode or leave empty to auto-generate"
                disabled={pending}
                simpleMode={true}
              />
            </div>

            {state.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600 font-medium">{state.error}</p>
              </div>
            )}
          </div>

          {/* Sticky footer */}
          <DialogFooter className="flex-shrink-0 px-6 py-4 border-t bg-background">
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Saving..." : isEdit ? "Update item" : "Save item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* New Category Dialog */}
    <Dialog open={newCatOpen} onOpenChange={setNewCatOpen}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="catName">Name</Label>
            <Input id="catName" placeholder="e.g. Beverages" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setNewCatOpen(false)} disabled={creatingCat}>Cancel</Button>
          <Button onClick={handleCreateCategory} disabled={creatingCat}>{creatingCat ? "Creating..." : "Create & Select"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* New Unit Dialog */}
    <Dialog open={newUnitOpen} onOpenChange={setNewUnitOpen}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader><DialogTitle>New Unit</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="unitName">Name</Label>
            <Input id="unitName" placeholder="e.g. Kilogram" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="unitSymbol">Symbol <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input id="unitSymbol" placeholder="e.g. kg" value={newUnitSymbol} onChange={(e) => setNewUnitSymbol(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setNewUnitOpen(false)} disabled={creatingUnit}>Cancel</Button>
          <Button onClick={handleCreateUnit} disabled={creatingUnit}>{creatingUnit ? "Creating..." : "Create & Select"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
