"use client"

import type React from "react"
import { useState } from "react"
import { Plus, Package } from "lucide-react"

interface InventoryItem {
  id: number
  name: string
  stock: number
  unitPrice: number
}

interface InventoryModuleProps {
  inventory: InventoryItem[]
  onAddItem: (item: Omit<InventoryItem, "id">) => void
}

export function InventoryModule({ inventory, onAddItem }: InventoryModuleProps) {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    stock: "",
    unitPrice: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name && formData.stock && formData.unitPrice) {
      onAddItem({
        name: formData.name,
        stock: Number.parseInt(formData.stock),
        unitPrice: Number.parseInt(formData.unitPrice),
      })
      setFormData({ name: "", stock: "", unitPrice: "" })
      setShowForm(false)
    }
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-foreground">Inventory Management</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-2 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-lg">
            <h3 className="text-xl font-bold text-foreground mb-4">Add New Inventory Item</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Item Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter item name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Stock Quantity</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter stock quantity"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Unit Price (PKR)</label>
                <input
                  type="number"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter unit price"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Add Item
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary border-b border-border">
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Item Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Current Stock</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Unit Price</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Stock Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {inventory.map((item) => (
                <tr key={item.id} className="hover:bg-muted transition-colors">
                  <td className="px-6 py-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">{item.name}</span>
                  </td>
                  <td className="px-6 py-4 text-foreground font-medium">{item.stock}</td>
                  <td className="px-6 py-4 text-foreground">PKR {item.unitPrice.toLocaleString()}</td>
                  <td className="px-6 py-4 font-semibold text-green-600">
                    PKR {(item.stock * item.unitPrice).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
