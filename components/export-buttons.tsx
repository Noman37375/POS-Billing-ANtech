"use client"

import { FileSpreadsheet, Printer } from "lucide-react"
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
  /** Store name for print header (e.g. "Sadaf Store Gross Profit Report") */
  printStoreName?: string
  /** Report parameters text for print (e.g. "From Date: ... To Date: ...") */
  printReportParams?: string
  /** User name for print footer */
  printUserName?: string
  /** Location for report params (e.g. "Sadaf Store") */
  printLocation?: string
}

function escapeHtml(s: string): string {
  const div = document.createElement("div")
  div.textContent = s
  return div.innerHTML
}

function formatCell(val: unknown): string {
  if (val === null || val === undefined) return "—"
  if (typeof val === "number") {
    return val.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return String(val)
}

export function ExportButtons({
  data,
  columns,
  filename,
  title,
  printStoreName,
  printReportParams,
  printUserName = "ADMIN",
  printLocation,
}: ExportButtonsProps) {
  const handlePrint = () => {
    try {
      const reportTitle = title || "Report"
      const fullTitle = printStoreName ? `${printStoreName} ${reportTitle}` : reportTitle
      const paramsText =
        printReportParams ||
        `From Date: ${new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "medium" })} AND To Date: ${new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "medium" })} AND From Barcode: ALL AND To Barcode: ALL AND Vendor: ALL AND Location: ${printLocation || "ALL"} AND Brand: ALL AND Department: ALL AND Order By: G.P. Value AND Type: Descending AND All Record(s): No AND Party`

      const headerRow = columns.map((col) => `<th style="border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:11px;background:#f5f5f5;">${escapeHtml(col.header)}</th>`).join("")
      const bodyRows = data
        .map(
          (row) =>
            `<tr>${columns
              .map((col) => {
                const val = row[col.key]
                const text = formatCell(val)
                const isNum = typeof val === "number"
                return `<td style="border:1px solid #ddd;padding:5px 8px;font-size:10px;${isNum ? "text-align:right;" : ""}">${escapeHtml(text)}</td>`
              })
              .join("")}</tr>`
        )
        .join("")

      const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(fullTitle)}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #000; margin: 16px; }
    .report-title { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 12px; }
    .report-params { font-size: 10px; color: #333; margin-bottom: 14px; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .footer { margin-top: 20px; font-size: 10px; color: #555; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
    .footer-left { }
    .footer-center { text-align: center; }
    .footer-right { text-align: right; }
    @media print { body { margin: 12px; } }
  </style>
</head>
<body>
  <div class="report-title">${escapeHtml(fullTitle)}</div>
  <div class="report-params"><strong>Report Parameters</strong><br>${escapeHtml(paramsText)}</div>
  <table>
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <div class="footer">
    <span class="footer-left">User Name: ${escapeHtml(printUserName)}</span>
AN-Tech Solutions    <span class="footer-right">Page 1</span>
  </div>
</body>
</html>`

      // Use a hidden iframe for printing to avoid popup blockers
      const iframe = document.createElement("iframe")
      iframe.style.position = "fixed"
      iframe.style.right = "0"
      iframe.style.bottom = "0"
      iframe.style.width = "0"
      iframe.style.height = "0"
      iframe.style.border = "0"
      document.body.appendChild(iframe)

      const frameDoc = iframe.contentWindow?.document
      if (!frameDoc) {
        document.body.removeChild(iframe)
        toast.error("Failed to open print view")
        return
      }

      frameDoc.open()
      frameDoc.write(printContent)
      frameDoc.close()

      iframe.onload = () => {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
        // Clean up iframe after a small delay
        setTimeout(() => {
          document.body.removeChild(iframe)
        }, 1000)
      }

      toast.success("Print dialog opened")
    } catch (error) {
      toast.error("Failed to print")
      console.error(error)
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
      <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
        <Printer className="w-3.5 h-3.5" />
        Print
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1.5 text-xs">
        <FileSpreadsheet className="w-3.5 h-3.5" />
        Excel
      </Button>
    </div>
  )
}
