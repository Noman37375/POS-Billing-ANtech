import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export interface InvoicePDFData {
  id: string
  invoiceNumber: string
  date: string
  party: { name: string; phone?: string } | null
  subtotal: number
  tax: number
  total: number
  status: string
  items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number }>
  currency?: string
}

// Helper function to convert number to words
function numberToWords(num: number): string {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ]
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

  const convert = (n: number): string => {
    if (n === 0) return ""
    if (n < 20) return ones[n]
    if (n < 100) {
      const ten = Math.floor(n / 10)
      const one = n % 10
      return tens[ten] + (one !== 0 ? " " + ones[one] : "")
    }
    if (n < 1000) {
      const hundred = Math.floor(n / 100)
      const remainder = n % 100
      return ones[hundred] + " Hundred" + (remainder !== 0 ? " " + convert(remainder) : "")
    }
    if (n < 100000) {
      const thousand = Math.floor(n / 1000)
      const remainder = n % 1000
      return convert(thousand) + " Thousand" + (remainder !== 0 ? " " + convert(remainder) : "")
    }
    if (n < 10000000) {
      const lakh = Math.floor(n / 100000)
      const remainder = n % 100000
      return convert(lakh) + " Lakh" + (remainder !== 0 ? " " + convert(remainder) : "")
    }
    const crore = Math.floor(n / 10000000)
    const remainder = n % 10000000
    return convert(crore) + " Crore" + (remainder !== 0 ? " " + convert(remainder) : "")
  }

  const wholePart = Math.floor(num)
  if (wholePart === 0) return "Zero"
  const result = convert(wholePart).trim()
  return result.charAt(0).toUpperCase() + result.slice(1)
}

export async function generateInvoicePDF(data: InvoicePDFData) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  let yPos = margin

  // Get currency from data or default to PKR
  const currency = data.currency || "PKR"
  const currencySymbols: Record<string, string> = {
    PKR: "PKR",
    USD: "$",
    EUR: "€",
    GBP: "£",
  }
  const currencyNames: Record<string, string> = {
    PKR: "Pakistani Rupees",
    USD: "US Dollars",
    EUR: "Euros",
    GBP: "British Pounds",
  }
  const symbol = currencySymbols[currency] || "PKR"
  const currencyName = currencyNames[currency] || "Pakistani Rupees"

  const formatCurrency = (amount: number): string => {
    const formatted = amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    if (currency === "PKR") {
      return `${symbol} ${formatted}`
    } else {
      return `${symbol}${formatted}`
    }
  }

  // Logo on top right
  try {
    const logoResponse = await fetch("/placeholder-logo.png")
    if (logoResponse.ok) {
      const logoBlob = await logoResponse.blob()
      const logoArrayBuffer = await logoBlob.arrayBuffer()
      const logoBase64 = btoa(String.fromCharCode(...new Uint8Array(logoArrayBuffer)))
      doc.addImage(`data:image/png;base64,${logoBase64}`, "PNG", pageWidth - margin - 40, yPos, 40, 40)
    }
  } catch (error) {
    // Fallback if logo fails
  }

  // Invoice Title - Centered
  doc.setFontSize(24)
  doc.setTextColor(59, 130, 246)
  doc.setFont("helvetica", "bold")
  doc.text("Invoice", pageWidth / 2, yPos + 20, { align: "center" })
  yPos += 35

  // Invoice Details Section (Right side)
  const detailsX = pageWidth - margin - 60
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("Invoice Details", detailsX, yPos)
  yPos += 7

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  doc.text(`Invoice No.: ${data.invoiceNumber}`, detailsX, yPos)
  yPos += 6
  const invoiceDate = new Date(data.date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
  doc.text(`Date: ${invoiceDate}`, detailsX, yPos)
  yPos += 6

  // Status Badge
  const statusColor =
    data.status === "Paid" ? [34, 197, 94] : data.status === "Draft" ? [156, 163, 175] : [249, 115, 22]
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2])
  doc.roundedRect(detailsX, yPos - 4, 50, 7, 2, 2, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text(data.status.toUpperCase(), detailsX + 25, yPos, { align: "center" })
  yPos += 10

  // Bill To Section (Left side)
  if (data.party) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0)
    doc.text("Bill To", margin, yPos)
    yPos += 7

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    doc.text(data.party.name, margin, yPos)
    yPos += 6
    if (data.party.phone) {
      doc.text(`Phone: ${data.party.phone}`, margin, yPos)
      yPos += 6
    }
    yPos += 10
  }

  // Line Items Table
  const tableData = data.items.map((item, index) => {
    const unitPrice = item.unitPrice || 0
    return [
      (index + 1).toString(),
      item.name || "Unknown",
      item.quantity?.toString() || "0",
      unitPrice > 0 ? formatCurrency(unitPrice) : formatCurrency(0),
    ]
  })

  autoTable(doc, {
    startY: yPos,
    head: [["#", "Item Name", "Quantity", "Price/ Unit"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 10,
      cellPadding: 5,
      halign: "left",
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 5,
      textColor: [40, 40, 40],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 18, halign: "center" },
      1: { cellWidth: "auto", halign: "left" },
      2: { cellWidth: 30, halign: "center" },
      3: { cellWidth: 50, halign: "right" },
    },
    margin: { left: margin, right: margin },
    styles: {
      lineColor: [200, 200, 200],
      lineWidth: 0.5,
    },
    tableWidth: "wrap",
  })

  // Get final Y position after table
  const finalY = (doc as any).lastAutoTable.finalY || yPos + 50
  let currentY = finalY + 15

  // Total for items (left side) - showing grand total
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text(`Total: ${formatCurrency(data.total)}`, margin, currentY)
  currentY += 20

  // Amount in Words (Left side) - using grand total
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("Invoice Amount In Words", margin, currentY)
  currentY += 7
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  const totalAmount = Math.round(data.total)
  const amountInWords = numberToWords(totalAmount)
  doc.text(`${amountInWords} ${currencyName} only`, margin, currentY)
  currentY += 15

  // Terms and Conditions (Left side)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("Terms And Conditions", margin, currentY)
  currentY += 7
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  doc.text("Thank you for doing business with us.", margin, currentY)
  currentY += 20

  // Payment Summary (Right side)
  const summaryX = pageWidth - margin - 70
  currentY = finalY + 15

  // Blue header bar
  doc.setFillColor(59, 130, 246)
  doc.rect(summaryX, currentY - 8, 70, 8, "F")
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(255, 255, 255)
  doc.text("Total", summaryX + 35, currentY - 2, { align: "center" })
  currentY += 5

  // Payment details
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  doc.text(`Total: ${formatCurrency(data.total)}`, summaryX, currentY)
  currentY += 7

  // Calculate received and balance based on status
  const received = data.status === "Paid" ? data.total : data.status === "Draft" ? 0 : data.total * 0.7
  const balance = data.total - received

  doc.text(`Received: ${formatCurrency(received)}`, summaryX, currentY)
  currentY += 7
  doc.text(`Balance: ${formatCurrency(balance)}`, summaryX, currentY)
  currentY += 15

  // Signature section (Right side)
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 60, 60)
  doc.text("For Invoice & Billing SaaS", summaryX, currentY)
  currentY += 5
  doc.setFont("helvetica", "bold")
  doc.text("Authorized Signature", summaryX, currentY)

  // Generate filename
  const filename = `Invoice-${data.invoiceNumber}-${new Date(data.date).toISOString().split("T")[0]}.pdf`

  // Save PDF
  doc.save(filename)
}

