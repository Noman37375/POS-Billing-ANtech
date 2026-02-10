"use client"

import { useState } from "react"
import { FileText, Eye } from "lucide-react"

interface InvoiceItem {
  id: string
  partyId: number
  partyName: string
  date: string
  totalAmount: number
  status: string
  items: Array<{ itemId: number; itemName: string; quantity: number; unitPrice: number }>
}

interface InvoicesListProps {
  invoices: InvoiceItem[]
  onUpdateStatus: (invoiceId: string, status: string) => void
}

export function InvoicesList({ invoices, onUpdateStatus }: InvoicesListProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null)

  const handleStatusToggle = (invoiceId: string, currentStatus: string) => {
    const newStatus = currentStatus === "Paid" ? "Draft" : "Paid"
    onUpdateStatus(invoiceId, newStatus)
  }

  return (
    <div className="p-8 max-w-7xl">
      <h2 className="text-3xl font-bold text-foreground mb-8">Invoices</h2>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-foreground">{selectedInvoice.id}</h3>
                <p className="text-sm text-muted-foreground">{new Date(selectedInvoice.date).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-muted-foreground hover:text-foreground text-2xl"
              >
                ×
              </button>
            </div>

            <div className="bg-secondary rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-1">Bill To</p>
              <p className="text-lg font-semibold text-foreground">{selectedInvoice.partyName}</p>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold text-foreground mb-3">Line Items</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left text-foreground">Item</th>
                    <th className="px-4 py-2 text-left text-foreground">Qty</th>
                    <th className="px-4 py-2 text-left text-foreground">Unit Price</th>
                    <th className="px-4 py-2 text-left text-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((item, i) => (
                    <tr key={i} className="border-b border-border hover:bg-muted">
                      <td className="px-4 py-2 text-foreground">{item.itemName}</td>
                      <td className="px-4 py-2 text-foreground">{item.quantity}</td>
                      <td className="px-4 py-2 text-foreground">PKR {item.unitPrice.toLocaleString()}</td>
                      <td className="px-4 py-2 text-foreground font-semibold">
                        PKR {(item.quantity * item.unitPrice).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-secondary rounded-lg p-4 ml-auto w-64 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-foreground">Total:</span>
                <span className="font-bold text-lg text-primary">PKR {selectedInvoice.totalAmount.toLocaleString()}</span>
              </div>
              <div
                className={`text-sm font-semibold px-3 py-1 rounded text-center ${
                  selectedInvoice.status === "Paid"
                    ? "bg-green-100 text-green-700"
                    : selectedInvoice.status === "Draft"
                      ? "bg-gray-100 text-gray-700"
                      : "bg-orange-100 text-orange-700"
                }`}
              >
                {selectedInvoice.status}
              </div>
            </div>

            <button
              onClick={() => setSelectedInvoice(null)}
              className="w-full bg-secondary text-secondary-foreground py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary border-b border-border">
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Invoice ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Customer</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-muted transition-colors">
                  <td className="px-6 py-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-semibold text-foreground">{invoice.id}</span>
                  </td>
                  <td className="px-6 py-4 text-foreground">{invoice.partyName}</td>
                  <td className="px-6 py-4 text-foreground">{new Date(invoice.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-semibold text-foreground">PKR {invoice.totalAmount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleStatusToggle(invoice.id, invoice.status)}
                      className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors ${
                        invoice.status === "Paid"
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : invoice.status === "Draft"
                            ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                      }`}
                    >
                      {invoice.status}
                    </button>
                  </td>
                  <td className="px-6 py-4 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setSelectedInvoice(invoice)}
                      className="p-2 hover:bg-secondary rounded-lg transition-colors text-primary"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
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
