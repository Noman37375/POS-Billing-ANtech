"use client"

import { useState } from "react"
import { FileDown, FileSpreadsheet, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface ExportColumn {
  key: string
  header: string
}

interface ExportButtonsProps {
  data: Record<string, any>[]
  columns: ExportColumn[]
  filename: string
  title?: string
}

export function ExportButtons({ data, columns, filename, title }: ExportButtonsProps) {
  const [pdfLoading, setPdfLoading] = useState(false)

  const handleExportPDF = async () => {
    setPdfLoading(true)
    try {
      const jsPDF = (await import("jspdf")).default
      const autoTable = (await import("jspdf-autotable")).default

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 20
      let yPos = margin

      // Title
      if (title) {
        doc.setFontSize(18)
        doc.setTextColor(59, 130, 246)
        doc.setFont("helvetica", "bold")
        doc.text(title, pageWidth / 2, yPos + 10, { align: "center" })
        yPos += 25
      }

      // Date
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100, 100, 100)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos)
      yPos += 10

      // Table
      const tableData = data.map((row) =>
        columns.map((col) => {
          const val = row[col.key]
          if (val === null || val === undefined) return "—"
          if (typeof val === "number") {
            return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          }
          return String(val)
        })
      )

      autoTable(doc, {
        startY: yPos,
        head: [columns.map((col) => col.header)],
        body: tableData,
        theme: "striped",
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 9,
          cellPadding: 4,
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 4,
          textColor: [40, 40, 40],
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: margin, right: margin },
        styles: {
          lineColor: [200, 200, 200],
          lineWidth: 0.5,
        },
      })

      doc.save(`${filename}.pdf`)
      toast.success("PDF exported successfully")
    } catch (error) {
      toast.error("Failed to export PDF")
      console.error(error)
    } finally {
      setPdfLoading(false)
    }
  }

  const handleExportExcel = () => {
    try {
      const headers = columns.map((col) => col.header).join(",")
      const rows = data.map((row) =>
        columns
          .map((col) => {
            const val = row[col.key]
            if (val === null || val === undefined) return ""
            const str = String(val)
            // Escape quotes and wrap in quotes if contains comma/quote/newline
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`
            }
            return str
          })
          .join(",")
      )
      const csv = "\uFEFF" + headers + "\n" + rows.join("\n")

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${filename}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast.success("Excel file exported successfully")
    } catch (error) {
      toast.error("Failed to export Excel")
      console.error(error)
    }
  }

  if (!data || data.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={pdfLoading} className="gap-1.5 text-xs">
        {pdfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
        PDF
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1.5 text-xs">
        <FileSpreadsheet className="w-3.5 h-3.5" />
        Excel
      </Button>
    </div>
  )
}
