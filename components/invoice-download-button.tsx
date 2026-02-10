"use client"

import { useState, useTransition } from "react"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getInvoiceForPDF } from "@/app/(app)/invoices/actions"
import { generateInvoicePDF } from "@/lib/pdf/generate-invoice-pdf"
import { toast } from "sonner"
import { useCurrency } from "@/contexts/currency-context"

interface InvoiceDownloadButtonProps {
  invoiceId: string
  status?: string
}

export function InvoiceDownloadButton({ invoiceId, status }: InvoiceDownloadButtonProps) {
  const [pending, startTransition] = useTransition()
  const { currency } = useCurrency()

  const handleDownload = () => {
    // Prevent download for draft invoices
    if (status === "Draft") {
      toast.error("Draft invoices cannot be downloaded. Please mark as Paid first.")
      return
    }

    startTransition(async () => {
      try {
        const result = await getInvoiceForPDF(invoiceId)
        if (result.error || !result.data) {
          toast.error(result.error || "Failed to fetch invoice data")
          return
        }

        // Double check status before generating PDF
        if (result.data.status === "Draft") {
          toast.error("Draft invoices cannot be downloaded. Please mark as Paid first.")
          return
        }

        await generateInvoicePDF({ ...result.data, currency })
        toast.success("Invoice PDF downloaded successfully")
      } catch (error) {
        toast.error("Failed to generate PDF")
        console.error(error)
      }
    })
  }

  // Hide button for draft invoices
  if (status === "Draft") {
    return null
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={pending}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Download PDF
        </>
      )}
    </Button>
  )
}

