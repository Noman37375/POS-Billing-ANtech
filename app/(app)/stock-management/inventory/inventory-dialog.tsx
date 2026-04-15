"use client"

import { useActionState, useEffect, useState, useRef } from "react"
import { Plus, Pencil } from "lucide-react"
import { createInventoryItem, updateInventoryItem } from "./actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getCategoriesForSelect } from "./fetch-categories"
import { getUnitsForSelect } from "./fetch-units"
import { BarcodeInput } from "@/components/barcode-input"

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

  const defaultTrigger = (
    <Button>
      <Plus className="w-4 h-4 mr-2" />
      Add Item
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit inventory item" : "Add inventory item"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4" key={isEdit ? `edit-${item?.id}` : `new-${open}`}>
          {isEdit && <input type="hidden" name="id" value={item.id} />}
          <input type="hidden" name="category_id" value={selectedCategory} />
          <input type="hidden" name="unit_id" value={selectedUnit} />
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Consulting hours" defaultValue={item?.name || ""} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                name="stock"
                type="number"
                min={0}
                step="0.01"
                placeholder="10"
                defaultValue={item?.stock || ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost_price">Cost Price (PKR)</Label>
              <Input
                id="cost_price"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="1500"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                required
              />
            </div>
          </div>

          {/* SELLING AMOUNTS BY CUSTOMER TYPE */}
          <div className="border-t pt-4 mt-4">
            <h4 className="font-semibold text-sm mb-3 text-foreground">Selling Amounts by Customer Type</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cash_price">Cash Amount (PKR)</Label>
                <Input
                  id="cash_price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="2500"
                  value={cashPrice}
                  onChange={(e) => setCashPrice(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">For direct/cash payments</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="credit_price">Credit Amount (PKR)</Label>
                <Input
                  id="credit_price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="2800"
                  value={creditPrice}
                  onChange={(e) => setCreditPrice(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">For Udhaar/credit sales</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier_price">Supplier Amount (PKR)</Label>
                <Input
                  id="supplier_price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="2000"
                  value={supplierPrice}
                  onChange={(e) => setSupplierPrice(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">For supplier-type customers</p>
              </div>
            </div>
          </div>

          {/* PROFIT TRACKING (AUTO-CALCULATED FOR ALL TYPES) */}
          <div className="border-t pt-4 mt-4 bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
            <h4 className="font-semibold text-sm mb-3 text-foreground">Profit Tracking (Auto-Calculated)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* CASH PROFIT */}
              <div className="space-y-2 p-2 bg-white dark:bg-slate-800 rounded border border-border">
                <Label className="text-xs font-semibold">💵 Cash Profit</Label>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">%:</span> <span className="text-primary font-semibold">{parseFloat(costPrice) > 0 && parseFloat(cashPrice) > 0 ? Math.round(((parseFloat(cashPrice) - parseFloat(costPrice)) / parseFloat(costPrice)) * 100 * 100) / 100 : 0}%</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">PKR:</span> <span className="text-green-600 font-semibold">PKR {parseFloat(costPrice) > 0 && parseFloat(cashPrice) > 0 ? (parseFloat(cashPrice) - parseFloat(costPrice)).toFixed(2) : "0.00"}</span>
                  </p>
                </div>
              </div>

              {/* CREDIT PROFIT */}
              <div className="space-y-2 p-2 bg-white dark:bg-slate-800 rounded border border-border">
                <Label className="text-xs font-semibold">📱 Credit Profit</Label>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">%:</span> <span className="text-primary font-semibold">{parseFloat(costPrice) > 0 && parseFloat(creditPrice) > 0 ? Math.round(((parseFloat(creditPrice) - parseFloat(costPrice)) / parseFloat(costPrice)) * 100 * 100) / 100 : 0}%</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">PKR:</span> <span className="text-green-600 font-semibold">PKR {parseFloat(costPrice) > 0 && parseFloat(creditPrice) > 0 ? (parseFloat(creditPrice) - parseFloat(costPrice)).toFixed(2) : "0.00"}</span>
                  </p>
                </div>
              </div>

              {/* SUPPLIER PROFIT */}
              <div className="space-y-2 p-2 bg-white dark:bg-slate-800 rounded border border-border">
                <Label className="text-xs font-semibold">🏢 Supplier Profit</Label>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">%:</span> <span className="text-primary font-semibold">{parseFloat(costPrice) > 0 && parseFloat(supplierPrice) > 0 ? Math.round(((parseFloat(supplierPrice) - parseFloat(costPrice)) / parseFloat(costPrice)) * 100 * 100) / 100 : 0}%</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">PKR:</span> <span className="text-green-600 font-semibold">PKR {parseFloat(costPrice) > 0 && parseFloat(supplierPrice) > 0 ? (parseFloat(supplierPrice) - parseFloat(costPrice)).toFixed(2) : "0.00"}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minimum_stock">Minimum Stock</Label>
              <Input
                id="minimum_stock"
                name="minimum_stock"
                type="number"
                min={0}
                step="0.01"
                placeholder="5"
                defaultValue={item?.minimum_stock || ""}
              />
              <p className="text-xs text-muted-foreground">Alert when stock falls below this level</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maximum_stock">Maximum Stock</Label>
              <Input
                id="maximum_stock"
                name="maximum_stock"
                type="number"
                min={0}
                step="0.01"
                placeholder="100"
                defaultValue={item?.maximum_stock || ""}
              />
              <p className="text-xs text-muted-foreground">Optional: Maximum stock capacity</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category_id">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={!mounted || categories.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={mounted && categories.length > 0 ? "Select category" : "Loading..."} />
                </SelectTrigger>
                {mounted && (
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                )}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_id">Unit</Label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit} disabled={!mounted || units.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={mounted && units.length > 0 ? "Select unit" : "Loading..."} />
                </SelectTrigger>
                {mounted && (
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name} {unit.symbol && `(${unit.symbol})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                )}
              </Select>
            </div>
          </div>
          <div className="space-y-2">
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
          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Saving..." : isEdit ? "Update item" : "Save item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
