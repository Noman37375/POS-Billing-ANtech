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
import { createRefund, getRefunds } from "@/app/(app)/returns/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { CurrencyDisplay } from "@/components/currency-display"
import type { Return, RefundMethod } from "@/lib/types/return"

interface RefundDialogProps {
  returns: Return[]
}

export function RefundDialog({ returns }: RefundDialogProps) {
  const [open, setOpen] = useState(false)
  const [returnId, setReturnId] = useState("")
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<RefundMethod>("Cash")
  const [reference, setReference] = useState("")
  const [pending, startTransition] = useTransition()
  const [existingRefunds, setExistingRefunds] = useState<Array<{ amount: number }>>([])
  const [loadingRefunds, setLoadingRefunds] = useState(false)
  const router = useRouter()

  const selectedReturn = returns.find((r) => r.id === returnId)

  // Fetch existing refunds when return is selected
  useEffect(() => {
    if (returnId && open) {
      setLoadingRefunds(true)
      getRefunds(returnId).then((result) => {
        if (result) {
          setExistingRefunds(result.map((r) => ({ amount: r.amount })))
        }
        setLoadingRefunds(false)
      })
    } else {
      setExistingRefunds([])
    }
  }, [returnId, open])

  // Calculate outstanding refund amount
  const returnTotal = selectedReturn ? Number(selectedReturn.total || 0) : 0
  const refundedAmount = existingRefunds.reduce((sum, r) => sum + Number(r.amount || 0), 0)
  const outstandingAmount = returnTotal - refundedAmount
  const maxRefundAmount = outstandingAmount > 0 ? outstandingAmount : 0

  const handleSubmit = () => {
    if (!returnId || !amount || Number(amount) <= 0) {
      toast.error("Please select a return and enter a valid amount")
      return
    }

    const refundAmount = Number(amount)
    if (refundAmount > maxRefundAmount) {
      toast.error(`Refund amount cannot exceed outstanding amount of ${maxRefundAmount.toLocaleString()}`)
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
      const result = await createRefund({
        return_id: returnId,
        amount: refundAmount,
        method,
        reference: reference || undefined,
      })

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Refund processed successfully")
        setOpen(false)
        setReturnId("")
        setAmount("")
        setMethod("Cash")
        setReference("")
        setExistingRefunds([])
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Process Refund
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
          <DialogDescription>Record a refund payment for a return.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="return">Return</Label>
            <Select value={returnId} onValueChange={setReturnId}>
              <SelectTrigger id="return">
                <SelectValue placeholder="Select return" />
              </SelectTrigger>
              <SelectContent>
                {returns.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">No returns available</div>
                ) : (
                  returns.map((ret) => (
                    <SelectItem key={ret.id} value={ret.id}>
                      {ret.return_number} - {ret.party?.name || "Unknown"} ({ret.type === "sale" ? "Sale" : "Purchase"})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedReturn && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Total: <CurrencyDisplay amount={selectedReturn.total} /> | Type: {selectedReturn.type === "sale" ? "Sale" : "Purchase"}
                </p>
                {refundedAmount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Refunded: <CurrencyDisplay amount={refundedAmount} /> | Outstanding: <CurrencyDisplay amount={outstandingAmount} />
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
              max={maxRefundAmount > 0 ? maxRefundAmount : undefined}
              step="0.01"
              value={amount}
              onChange={(e) => {
                const value = e.target.value
                const numValue = Number(value)
                if (value === "" || (numValue > 0 && numValue <= maxRefundAmount)) {
                  setAmount(value)
                } else if (numValue > maxRefundAmount) {
                  toast.error(`Amount cannot exceed outstanding amount of ${maxRefundAmount.toLocaleString()}`)
                }
              }}
              placeholder={`Max: ${maxRefundAmount > 0 ? maxRefundAmount.toLocaleString() : "0"}`}
            />
            {selectedReturn && maxRefundAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                Maximum refund amount: <CurrencyDisplay amount={maxRefundAmount} />
              </p>
            )}
            {selectedReturn && maxRefundAmount <= 0 && (
              <p className="text-xs text-amber-600">This return is already fully refunded</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Payment Method</Label>
            <Select value={method} onValueChange={(v) => { setMethod(v as RefundMethod); setReference("") }}>
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
              placeholder={method === "JazzCash" || method === "EasyPaisa" ? `${method} Transaction ID` : "Refund reference number"}
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
            disabled={pending || !returnId || !amount || !method || returns.length === 0 || ((method === "JazzCash" || method === "EasyPaisa") && !reference.trim())}
          >
            {pending ? "Processing..." : "Process Refund"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
