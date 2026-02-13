import jsPDF from "jspdf"

/**
 * Generate POS Receipt for Carbon Copy (NCR) / Thermal Printer
 *
 * Optimized for:
 * - 80mm thermal printers (common POS printers)
 * - Carbon copy NCR paper (multi-part)
 * - High legibility in small format
 *
 * Dimensions:
 * - Width: 80mm (standard thermal printer width)
 * - Height: Variable based on content
 * - Margins: Minimal for maximum usable space
 */

export interface POSReceiptData {
  id: string
  invoiceNumber: string
  date: string
  transactionId?: string
  party?: { name: string; phone?: string } | null
  items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number }>
  subtotal: number
  tax: number
  total: number
  status?: string
  payments?: Array<{ method: string; amount: number; reference?: string }>
  cashier?: string
  store?: { name: string; address?: string; phone?: string; email?: string }
  currency?: string
}

export async function generatePOSReceipt(data: POSReceiptData) {
  // Use smaller page size for thermal printer (80mm = ~226 points)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 297], // 80mm wide, max height (will be trimmed)
  })

  const pageWidth = 80
  const marginX = 2 // Minimal left/right margin
  const contentWidth = pageWidth - 2 * marginX
  let yPos = 2

  // Currency setup
  const currency = data.currency || "PKR"
  const currencySymbols: Record<string, string> = {
    PKR: "₨",
    USD: "$",
    EUR: "€",
    GBP: "£",
  }
  const symbol = currencySymbols[currency] || "₨"

  const formatCurrency = (amount: number): string => {
    return `${symbol} ${amount.toFixed(2)}`
  }

  // ==================== HEADER ====================

  // Store name (centered, bold, larger)
  if (data.store?.name) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    const lines = doc.splitTextToSize(data.store.name, contentWidth)
    doc.text(lines, marginX, yPos, { align: "center" })
    yPos += lines.length * 4
  }

  // Store address and contact (small, centered)
  if (data.store?.address || data.store?.phone) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(40, 40, 40)

    if (data.store.address) {
      const addressLines = doc.splitTextToSize(data.store.address, contentWidth)
      doc.text(addressLines, pageWidth / 2, yPos, { align: "center" })
      yPos += addressLines.length * 2.5
    }

    if (data.store.phone) {
      doc.text(`Tel: ${data.store.phone}`, pageWidth / 2, yPos, { align: "center" })
      yPos += 2.5
    }
  }

  // Divider line
  yPos += 1
  doc.setDrawColor(100, 100, 100)
  doc.line(marginX, yPos, pageWidth - marginX, yPos)
  yPos += 2

  // ==================== RECEIPT DETAILS ====================

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(0, 0, 0)

  // Invoice number and date
  doc.text(`Inv#: ${data.invoiceNumber}`, marginX, yPos)
  yPos += 3

  const invoiceDate = new Date(data.date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })
  const invoiceTime = new Date(data.date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
  doc.text(`${invoiceDate} ${invoiceTime}`, marginX, yPos)
  yPos += 3

  // Customer name (if available)
  if (data.party?.name) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    const custLines = doc.splitTextToSize(`Customer: ${data.party.name}`, contentWidth)
    doc.text(custLines, marginX, yPos)
    yPos += custLines.length * 2.5
  }

  // Divider
  yPos += 1
  doc.setDrawColor(100, 100, 100)
  doc.line(marginX, yPos, pageWidth - marginX, yPos)
  yPos += 2

  // ==================== ITEMS TABLE ====================

  doc.setFont("helvetica", "bold")
  doc.setFontSize(7)
  doc.setTextColor(0, 0, 0)

  // Table headers
  const colPositions = {
    item: marginX,
    qty: marginX + 35,
    price: marginX + 50,
    total: marginX + 65,
  }

  doc.text("Item", colPositions.item, yPos)
  doc.text("Qty", colPositions.qty, yPos)
  doc.text("Price", colPositions.price, yPos)
  doc.text("Total", colPositions.total, yPos)
  yPos += 2.5

  // Divider under headers
  doc.setDrawColor(150, 150, 150)
  doc.line(marginX, yPos, pageWidth - marginX, yPos)
  yPos += 2

  // Items
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.setTextColor(20, 20, 20)

  for (const item of data.items) {
    // Item name (may wrap)
    const itemLines = doc.splitTextToSize(item.name || "Item", 33)
    doc.text(itemLines[0], colPositions.item, yPos)

    // Quantity (right-aligned)
    const qtyStr = item.quantity.toString()
    doc.text(qtyStr, colPositions.qty, yPos, { align: "right" })

    // Unit price (right-aligned)
    const priceStr = formatCurrency(item.unitPrice)
    doc.text(priceStr, colPositions.price, yPos, { align: "right" })

    // Line total (right-aligned)
    const totalStr = formatCurrency(item.lineTotal)
    doc.text(totalStr, colPositions.total, yPos, { align: "right" })

    yPos += 2.5

    // If item name wrapped, add extra line
    if (itemLines.length > 1) {
      for (let i = 1; i < itemLines.length; i++) {
        doc.text(itemLines[i], colPositions.item, yPos)
        yPos += 2.5
      }
    }
  }

  // Divider
  yPos += 1
  doc.setDrawColor(100, 100, 100)
  doc.line(marginX, yPos, pageWidth - marginX, yPos)
  yPos += 2

  // ==================== TOTALS ====================

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(0, 0, 0)

  // Subtotal
  doc.text("Subtotal:", marginX, yPos)
  doc.text(formatCurrency(data.subtotal), pageWidth - marginX, yPos, { align: "right" })
  yPos += 2.5

  // Tax (if applicable)
  if (data.tax > 0) {
    doc.text(`Tax (${((data.tax / data.subtotal) * 100).toFixed(0)}%):`, marginX, yPos)
    doc.text(formatCurrency(data.tax), pageWidth - marginX, yPos, { align: "right" })
    yPos += 2.5
  }

  // Divider before total
  doc.setDrawColor(100, 100, 100)
  doc.line(marginX, yPos, pageWidth - marginX, yPos)
  yPos += 1.5

  // Total (bold, larger)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text("TOTAL:", marginX, yPos)
  doc.text(formatCurrency(data.total), pageWidth - marginX, yPos, { align: "right" })
  yPos += 3

  // ==================== PAYMENT METHOD ====================

  if (data.payments && data.payments.length > 0) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(40, 40, 40)

    // Divider
    doc.setDrawColor(150, 150, 150)
    doc.line(marginX, yPos, pageWidth - marginX, yPos)
    yPos += 2

    doc.text("Payment Method:", marginX, yPos)
    yPos += 2.5

    for (const payment of data.payments) {
      doc.text(`${payment.method}: ${formatCurrency(payment.amount)}`, marginX + 2, yPos)
      yPos += 2.5
      if (payment.reference) {
        doc.text(`Ref: ${payment.reference}`, marginX + 2, yPos)
        yPos += 2
      }
    }
  }

  // ==================== FOOTER ====================

  yPos += 2
  doc.setDrawColor(150, 150, 150)
  doc.line(marginX, yPos, pageWidth - marginX, yPos)
  yPos += 2

  // Cashier and transaction info
  if (data.cashier || data.transactionId) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(60, 60, 60)

    if (data.cashier) {
      doc.text(`Cashier: ${data.cashier}`, marginX, yPos)
      yPos += 2.5
    }

    if (data.transactionId) {
      const txnLines = doc.splitTextToSize(`Txn: ${data.transactionId}`, contentWidth)
      doc.text(txnLines, marginX, yPos)
      yPos += txnLines.length * 2
    }
  }

  // Thank you message
  yPos += 2
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text("Thank You!", pageWidth / 2, yPos, { align: "center" })
  yPos += 3

  // Store email/website (small)
  if (data.store?.email) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(6)
    doc.setTextColor(120, 120, 120)
    doc.text(data.store.email, pageWidth / 2, yPos, { align: "center" })
  }

  // Download the PDF
  doc.save(`receipt-${data.invoiceNumber}.pdf`)
}

/**
 * Generate POS Receipt for display/printing via browser print dialog
 * (Alternative to direct PDF download)
 */
export function generatePOSReceiptHTML(data: POSReceiptData): string {
  const currency = data.currency || "PKR"
  const currencySymbols: Record<string, string> = {
    PKR: "₨",
    USD: "$",
    EUR: "€",
    GBP: "£",
  }
  const symbol = currencySymbols[currency] || "₨"

  const formatCurrency = (amount: number): string => `${symbol} ${amount.toFixed(2)}`

  const invoiceDate = new Date(data.date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })
  const invoiceTime = new Date(data.date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })

  const taxPercent = data.subtotal > 0 ? ((data.tax / data.subtotal) * 100).toFixed(0) : "0"

  let itemsHTML = ""
  for (const item of data.items) {
    itemsHTML += `
      <tr>
        <td>${item.name}</td>
        <td style="text-align: right;">${item.quantity}</td>
        <td style="text-align: right;">${formatCurrency(item.unitPrice)}</td>
        <td style="text-align: right;">${formatCurrency(item.lineTotal)}</td>
      </tr>
    `
  }

  let paymentsHTML = ""
  if (data.payments && data.payments.length > 0) {
    paymentsHTML = `
      <div style="margin-top: 10px; border-top: 1px solid #999; padding-top: 8px;">
        <h4 style="margin: 0 0 5px 0; font-size: 11px;">Payment Method:</h4>
        ${data.payments
          .map(
            (p) => `
          <div style="font-size: 10px; margin: 2px 0;">
            ${p.method}: ${formatCurrency(p.amount)}
            ${p.reference ? `<br/><span style="font-size: 8px;">Ref: ${p.reference}</span>` : ""}
          </div>
        `,
          )
          .join("")}
      </div>
    `
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Receipt #${data.invoiceNumber}</title>
      <style>
        @media print {
          * {
            margin: 0;
            padding: 0;
          }
          body {
            width: 80mm;
            font-family: 'Courier New', monospace;
            font-size: 10px;
          }
          .receipt {
            width: 80mm;
            margin: 0;
            padding: 2mm;
          }
        }

        body {
          font-family: 'Courier New', monospace;
          font-size: 10px;
          line-height: 1.4;
          background: #f5f5f5;
        }

        .receipt {
          width: 80mm;
          background: white;
          margin: 20px auto;
          padding: 2mm;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }

        .header {
          text-align: center;
          border-bottom: 1px solid #999;
          padding-bottom: 5px;
          margin-bottom: 8px;
        }

        .store-name {
          font-weight: bold;
          font-size: 12px;
          margin-bottom: 3px;
        }

        .store-contact {
          font-size: 8px;
          color: #666;
        }

        .invoice-info {
          font-size: 9px;
          margin: 5px 0;
        }

        .customer {
          margin: 5px 0;
          font-weight: bold;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0;
          font-size: 9px;
        }

        th {
          border-bottom: 1px solid #999;
          padding: 3px 0;
          text-align: left;
          font-weight: bold;
        }

        td {
          padding: 2px 0;
        }

        .totals {
          border-top: 1px solid #999;
          border-bottom: 2px solid #000;
          padding: 5px 0;
          margin: 5px 0;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          margin: 3px 0;
        }

        .total-amount {
          font-weight: bold;
          font-size: 11px;
        }

        .footer {
          text-align: center;
          margin-top: 8px;
          font-size: 8px;
          color: #666;
          border-top: 1px dashed #999;
          padding-top: 5px;
        }

        .thank-you {
          font-weight: bold;
          font-size: 10px;
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <!-- Header -->
        <div class="header">
          ${data.store?.name ? `<div class="store-name">${data.store.name}</div>` : ""}
          ${data.store?.address ? `<div class="store-contact">${data.store.address}</div>` : ""}
          ${data.store?.phone ? `<div class="store-contact">Tel: ${data.store.phone}</div>` : ""}
        </div>

        <!-- Invoice Info -->
        <div class="invoice-info">
          <div>Inv#: ${data.invoiceNumber}</div>
          <div>${invoiceDate} ${invoiceTime}</div>
          ${data.transactionId ? `<div>Txn: ${data.transactionId}</div>` : ""}
        </div>

        <!-- Customer -->
        ${data.party?.name ? `<div class="customer">Customer: ${data.party.name}</div>` : ""}

        <!-- Items Table -->
        <table>
          <thead>
            <tr>
              <th style="width: 45%;">Item</th>
              <th style="width: 15%; text-align: right;">Qty</th>
              <th style="width: 20%; text-align: right;">Price</th>
              <th style="width: 20%; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <!-- Totals -->
        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(data.subtotal)}</span>
          </div>
          ${
            data.tax > 0
              ? `
            <div class="total-row">
              <span>Tax (${taxPercent}%):</span>
              <span>${formatCurrency(data.tax)}</span>
            </div>
          `
              : ""
          }
          <div class="total-row total-amount">
            <span>TOTAL:</span>
            <span>${formatCurrency(data.total)}</span>
          </div>
        </div>

        <!-- Payments -->
        ${paymentsHTML}

        <!-- Footer -->
        <div class="footer">
          ${data.cashier ? `<div>Cashier: ${data.cashier}</div>` : ""}
          <div class="thank-you">Thank You!</div>
          ${data.store?.email ? `<div>${data.store.email}</div>` : ""}
        </div>
      </div>

      <script>
        window.addEventListener('load', function() {
          window.print();
        });
      </script>
    </body>
    </html>
  `
}
