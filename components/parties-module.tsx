"use client"

import type React from "react"
import { useState } from "react"
import { Plus, Phone, User } from "lucide-react"

interface Party {
  id: number
  name: string
  phone: string
  type: string
  balance: number
}

interface PartiesModuleProps {
  parties: Party[]
  onAddParty: (party: Omit<Party, "id" | "balance">) => void
}

export function PartiesModule({ parties, onAddParty }: PartiesModuleProps) {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    type: "Customer",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name && formData.phone) {
      onAddParty(formData)
      setFormData({ name: "", phone: "", type: "Customer" })
      setShowForm(false)
    }
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-foreground">Parties Management</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-2 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Party
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-lg">
            <h3 className="text-xl font-bold text-foreground mb-4">Add New Party</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Party Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter party name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>Customer</option>
                  <option>Vendor</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Add Party
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
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Phone</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {parties.map((party) => (
                <tr key={party.id} className="hover:bg-muted transition-colors">
                  <td className="px-6 py-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">{party.name}</span>
                  </td>
                  <td className="px-6 py-4 text-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    {party.phone}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        party.type === "Customer" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {party.type}
                    </span>
                  </td>
                  <td className={`px-6 py-4 font-semibold ${party.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                    PKR {party.balance.toLocaleString()}
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
