"use client"

import { useState, useTransition } from "react"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getPurchaseForPDF } from "@/app/(app)/purchases/actions"
import { generatePurchaseInvoicePDF } from "@/lib/pdf/generate-purchase-pdf"
import { toast } from "sonner"
import { useCurrency } from "@/contexts/currency-context"

interface PurchaseDownloadButtonProps {
  purchaseId: string
  status?: string
}

export function PurchaseDownloadButton({ purchaseId, status }: PurchaseDownloadButtonProps) {
  const [pending, startTransition] = useTransition()
  const { currency } = useCurrency()

  const handleDownload = () => {
    if (status === "Draft") {
      toast.error("Draft purchases cannot be downloaded. Please mark as Paid first.")
      return
    }

    startTransition(async () => {
      try {
        const result = await getPurchaseForPDF(purchaseId)
        if (result.error || !result.data) {
          toast.error(result.error || "Failed to fetch purchase data")
          return
        }

        if (result.data.status === "Draft") {
          toast.error("Draft purchases cannot be downloaded. Please mark as Paid first.")
          return
        }

        await generatePurchaseInvoicePDF({
          id: result.data.id,
          invoiceNumber: result.data.purchaseNumber,
          date: result.data.date,
          party: result.data.party,
          subtotal: result.data.subtotal,
          tax: result.data.tax,
          total: result.data.total,
          status: result.data.status,
          items: result.data.items,
          currency,
        })
        toast.success("Purchase Invoice PDF downloaded successfully")
      } catch (error) {
        toast.error("Failed to generate PDF")
        console.error(error)
      }
    })
  }

  if (status === "Draft") {
    return null
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={pending}
      variant="ghost"
      size="icon"
      className="h-8 w-8 sm:h-10 sm:w-10"
      title="Download PDF"
    >
      {pending ? (
        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
      ) : (
        <Download className="w-3 h-3 sm:w-4 sm:h-4" />
      )}
    </Button>
  )
}
