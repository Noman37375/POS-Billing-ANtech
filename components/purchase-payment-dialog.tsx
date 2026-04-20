"use client"

import { useState, useTransition, useEffect } from "react"
import { Plus } from "lucide-react"
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
import { createPurchasePayment, getPurchasePayments } from "@/app/(app)/purchases/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface PurchaseOption {
  id: string
  purchaseNumber: string
  vendorName: string
  total: number
  status: string
  paid?: number
  balance?: number
}

interface PurchasePaymentDialogProps {
  purchases: PurchaseOption[]
  trigger?: React.ReactNode
}

export function PurchasePaymentDialog({ purchases, trigger }: PurchasePaymentDialogProps) {
  const [open, setOpen] = useState(false)
  const [purchaseInvoiceId, setPurchaseInvoiceId] = useState("")
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("Cash")
  const [reference, setReference] = useState("")
  const [pending, startTransition] = useTransition()
  const [existingPayments, setExistingPayments] = useState<Array<{ amount: number }>>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const router = useRouter()

  // Filter to show only unpaid purchases (Draft/Pending with outstanding balance)
  const availablePurchases = purchases.filter(
    (p) => (p.status === "Draft" || p.status === "Pending") && (p.balance ?? p.total) > 0
  )

  const selectedPurchase = availablePurchases.find((p) => p.id === purchaseInvoiceId)

  // Fetch existing payments when purchase is selected
  useEffect(() => {
    if (purchaseInvoiceId && open) {
      setLoadingPayments(true)
      getPurchasePayments(purchaseInvoiceId).then((result) => {
        if (result.data) {
          setExistingPayments(result.data)
        }
        setLoadingPayments(false)
      })
    } else {
      setExistingPayments([])
    }
  }, [purchaseInvoiceId, open])

  // Calculate outstanding amount (total - existing payments)
  const totalAmount = selectedPurchase ? Number(selectedPurchase.total || 0) : 0
  const paidAmount = existingPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const outstandingAmount = totalAmount - paidAmount
  const maxPaymentAmount = outstandingAmount > 0 ? outstandingAmount : 0

  const handleSubmit = () => {
    if (!purchaseInvoiceId || !amount || Number(amount) <= 0) {
      toast.error("Please select a purchase invoice and enter a valid amount")
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

    if ((method === "JazzCash" || method === "EasyPaisa") && !reference.trim()) {
      toast.error(`Transaction ID is required for ${method}`)
      return
    }

    startTransition(async () => {
      const result = await createPurchasePayment({
        purchaseInvoiceId,
        amount: Number(amount),
        method,
        reference: reference || undefined,
      })

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Payment added successfully")
        setOpen(false)
        setPurchaseInvoiceId("")
        setAmount("")
        setMethod("Cash")
        setReference("")
        setExistingPayments([])
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
          <DialogTitle>Add Vendor Payment</DialogTitle>
          <DialogDescription>Record a payment for a purchase invoice.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="purchase">Purchase Invoice</Label>
            <Select value={purchaseInvoiceId} onValueChange={setPurchaseInvoiceId}>
              <SelectTrigger id="purchase">
                <SelectValue placeholder="Select purchase invoice" />
              </SelectTrigger>
              <SelectContent>
                {availablePurchases.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No unpaid purchases available
                  </div>
                ) : (
                  availablePurchases.map((purchase) => (
                    <SelectItem key={purchase.id} value={purchase.id}>
                      {purchase.purchaseNumber} - {purchase.vendorName} ({purchase.status})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedPurchase && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Total: {selectedPurchase.total.toLocaleString()} | Status: {selectedPurchase.status}
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
            {selectedPurchase && maxPaymentAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                Maximum payment amount: {maxPaymentAmount.toLocaleString()}
              </p>
            )}
            {selectedPurchase && maxPaymentAmount <= 0 && (
              <p className="text-xs text-amber-600">
                This purchase is already fully paid
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Payment Method</Label>
            <Select value={method} onValueChange={(v) => { setMethod(v); setReference("") }}>
              <SelectTrigger id="method">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="JazzCash">JazzCash</SelectItem>
                <SelectItem value="EasyPaisa">EasyPaisa</SelectItem>
                <SelectItem value="Mixed">Mixed</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">
              {method === "JazzCash" || method === "EasyPaisa" ? "Transaction ID *" : "Reference (Optional)"}
            </Label>
            <Input
              id="reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={method === "JazzCash" || method === "EasyPaisa" ? `${method} Transaction ID` : "Payment reference number"}
              className={method === "JazzCash" || method === "EasyPaisa" ? "border-orange-300 focus:border-orange-500" : ""}
            />
            {(method === "JazzCash" || method === "EasyPaisa") && (
              <p className="text-xs text-orange-600">Enter the Transaction ID from the {method} transfer receipt</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={pending || !purchaseInvoiceId || !amount || !method || availablePurchases.length === 0 || ((method === "JazzCash" || method === "EasyPaisa") && !reference.trim())}
          >
            {pending ? "Adding..." : "Add Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
