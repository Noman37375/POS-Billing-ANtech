"use client"

import { useState, useTransition, useEffect, useRef, useMemo } from "react"
import { Plus, X } from "lucide-react"
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
import { createCustomerPayment, getCustomerPayments } from "@/app/(app)/pos/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface SaleOption {
  id: string
  invoiceNumber: string
  customerName: string
  total: number
  status: string
  paid?: number
  balance?: number
}

interface CustomerPaymentDialogProps {
  sales: SaleOption[]
  trigger?: React.ReactNode
}

export function CustomerPaymentDialog({ sales, trigger }: CustomerPaymentDialogProps) {
  const [open, setOpen] = useState(false)
  const [invoiceId, setInvoiceId] = useState("")
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("Cash")
  const [reference, setReference] = useState("")
  const [pending, startTransition] = useTransition()
  const [existingPayments, setExistingPayments] = useState<Array<{ amount: number }>>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [invoiceQuery, setInvoiceQuery] = useState("")
  const [showInvoiceResults, setShowInvoiceResults] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const invoiceInputRef = useRef<HTMLInputElement>(null)
  const invoiceDropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Filter to show only unpaid sales (Draft/Pending with outstanding balance)
  const availableSales = sales.filter(
    (s) => (s.status === "Draft" || s.status === "Pending") && (s.balance ?? s.total) > 0
  )

  const selectedSale = availableSales.find((s) => s.id === invoiceId)
  const selectedLabel = selectedSale
    ? `${selectedSale.invoiceNumber} - ${selectedSale.customerName} (${selectedSale.status})`
    : ""

  const filteredSales = useMemo(() => {
    const q = invoiceQuery.trim().toLowerCase()
    if (!q) return availableSales
    return availableSales.filter(
      (s) =>
        s.invoiceNumber.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q)
    )
  }, [availableSales, invoiceQuery])

  const handleInvoiceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showInvoiceResults) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightIndex((prev) => Math.min(prev + 1, filteredSales.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (filteredSales[highlightIndex]) {
        setInvoiceId(filteredSales[highlightIndex].id)
        setInvoiceQuery("")
        setShowInvoiceResults(false)
      }
    } else if (e.key === "Escape") {
      setShowInvoiceResults(false)
    }
  }

  useEffect(() => {
    if (invoiceDropdownRef.current && showInvoiceResults) {
      const el = invoiceDropdownRef.current.children[highlightIndex] as HTMLElement
      el?.scrollIntoView({ block: "nearest" })
    }
  }, [highlightIndex, showInvoiceResults])

  // Fetch existing payments when sale is selected
  useEffect(() => {
    if (invoiceId && open) {
      setLoadingPayments(true)
      getCustomerPayments(invoiceId).then((result) => {
        if (result.data) {
          setExistingPayments(result.data)
        }
        setLoadingPayments(false)
      })
    } else {
      setExistingPayments([])
    }
  }, [invoiceId, open])

  // Calculate outstanding amount (total - existing payments)
  const totalAmount = selectedSale ? Number(selectedSale.total || 0) : 0
  const paidAmount = existingPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const outstandingAmount = totalAmount - paidAmount
  const maxPaymentAmount = outstandingAmount > 0 ? outstandingAmount : 0

  const handleSubmit = () => {
    if (!invoiceId || !amount || Number(amount) <= 0) {
      toast.error("Please select a sales invoice and enter a valid amount")
      return
    }

    const paymentAmount = Number(amount)
    if (paymentAmount > maxPaymentAmount) {
      toast.error(`Payment amount cannot exceed outstanding amount of ${maxPaymentAmount.toLocaleString()}`)
      return
    }

    if (!method) {
      toast.error("Please select a payment method")
      return
    }

    startTransition(async () => {
      const result = await createCustomerPayment({
        invoiceId,
        amount: Number(amount),
        method,
        reference: reference || undefined,
      })

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Payment added successfully")
        setOpen(false)
        setInvoiceId("")
        setInvoiceQuery("")
        setAmount("")
        setMethod("Cash")
        setReference("")
        setExistingPayments([])
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setInvoiceId(""); setInvoiceQuery(""); setShowInvoiceResults(false) } }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Customer Payment</DialogTitle>
          <DialogDescription>Record a payment for a sales invoice.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sale">Sales Invoice</Label>
            <div className="relative">
              <Input
                ref={invoiceInputRef}
                id="sale"
                placeholder="Search by invoice # or customer..."
                value={invoiceQuery || selectedLabel}
                onChange={(e) => {
                  setInvoiceQuery(e.target.value)
                  setHighlightIndex(0)
                  setShowInvoiceResults(e.target.value.length > 0)
                  if (!e.target.value) setInvoiceId("")
                }}
                onFocus={() => {
                  if (!invoiceId) setShowInvoiceResults(true)
                }}
                onKeyDown={handleInvoiceKeyDown}
                autoComplete="off"
              />
              {invoiceId && (
                <button
                  type="button"
                  onClick={() => {
                    setInvoiceId("")
                    setInvoiceQuery("")
                    setShowInvoiceResults(false)
                    invoiceInputRef.current?.focus()
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              {showInvoiceResults && (
                <div
                  ref={invoiceDropdownRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto"
                >
                  {filteredSales.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No invoice found</div>
                  ) : (
                    filteredSales.map((sale, index) => (
                      <button
                        key={sale.id}
                        type="button"
                        onClick={() => {
                          setInvoiceId(sale.id)
                          setInvoiceQuery("")
                          setShowInvoiceResults(false)
                        }}
                        className={`w-full px-3 py-2 text-left text-sm border-b last:border-b-0 ${
                          index === highlightIndex
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        <span className="font-mono font-semibold">{sale.invoiceNumber}</span>
                        {" — "}{sale.customerName}
                        <span className={`ml-1 text-xs ${sale.status === "Draft" ? "text-gray-500" : "text-amber-600"}`}>
                          ({sale.status})
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedSale && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Total: {selectedSale.total.toLocaleString()} | Status: {selectedSale.status}
                </p>
                {paidAmount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Paid: {paidAmount.toLocaleString()} | Outstanding: {outstandingAmount.toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              min="0.01"
              max={maxPaymentAmount > 0 ? maxPaymentAmount : undefined}
              step="0.01"
              value={amount}
              onChange={(e) => {
                const value = e.target.value
                const numValue = Number(value)
                if (value === "" || (numValue > 0 && numValue <= maxPaymentAmount)) {
                  setAmount(value)
                } else if (numValue > maxPaymentAmount) {
                  toast.error(`Amount cannot exceed outstanding amount of ${maxPaymentAmount.toLocaleString()}`)
                }
              }}
              placeholder={`Max: ${maxPaymentAmount > 0 ? maxPaymentAmount.toLocaleString() : "0"}`}
            />
            {selectedSale && maxPaymentAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                Maximum payment amount: {maxPaymentAmount.toLocaleString()}
              </p>
            )}
            {selectedSale && maxPaymentAmount <= 0 && (
              <p className="text-xs text-amber-600">
                This sale is already fully paid
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger id="method">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="Mixed">Mixed</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Reference (Optional)</Label>
            <Input
              id="reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Payment reference number"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={pending || !invoiceId || !amount || !method || availableSales.length === 0}
          >
            {pending ? "Adding..." : "Add Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
