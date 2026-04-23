"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Plus } from "lucide-react"
import { createParty } from "@/app/(app)/parties/actions"
import { createInventoryItem } from "@/app/(app)/stock-management/inventory/actions"

export function AddCustomerDialog() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState("Customer")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set("type", type)
    setError("")
    startTransition(async () => {
      const result = await createParty(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError("") }}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
          <Users className="w-4 h-4" />
          Add Customer
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Customer / Vendor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="qd-name">Name</Label>
            <Input id="qd-name" name="name" placeholder="Full name" required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qd-phone">Phone</Label>
            <Input id="qd-phone" name="phone" placeholder="03XX-XXXXXXX" required />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Customer">Customer</SelectItem>
                <SelectItem value="Vendor">Vendor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Saving…" : "Add"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AddItemDialog() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const raw = new FormData(e.currentTarget)
    const salePrice = raw.get("sale_price") as string
    const formData = new FormData()
    formData.set("name", raw.get("name") as string)
    formData.set("cost_price", raw.get("cost_price") as string)
    formData.set("cash_price", salePrice)
    formData.set("credit_price", salePrice)
    formData.set("supplier_price", salePrice)
    formData.set("stock", raw.get("stock") as string || "0")
    setError("")
    startTransition(async () => {
      const result = await createInventoryItem(formData)
      if (result && "error" in result && result.error) {
        setError(result.error as string)
      } else {
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError("") }}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="qi-name">Item Name</Label>
            <Input id="qi-name" name="name" placeholder="e.g. Sugar 1kg" required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qi-cost">Cost Price (PKR)</Label>
              <Input id="qi-cost" name="cost_price" type="number" min="0.01" step="0.01" placeholder="0" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qi-sale">Sale Price (PKR)</Label>
              <Input id="qi-sale" name="sale_price" type="number" min="0.01" step="0.01" placeholder="0" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qi-stock">Opening Stock</Label>
            <Input id="qi-stock" name="stock" type="number" min="0" step="0.01" placeholder="0" />
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2">
            Sale price applies to cash, credit &amp; supplier tiers. Edit item later for separate tiers.
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Saving…" : "Add Item"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
