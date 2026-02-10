import type { InvoiceForPrint } from "@/lib/types/pos"
import QRCode from "qrcode"

const CURRENCY = "PKR"

function formatMoney(amount: number) {
  return `${CURRENCY} ${amount.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-PK", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
}

export async function printStandardInvoice(data: InvoiceForPrint) {
  const dateStr = data.date ? formatDate(data.date) : ""
  const timeStr = data.date ? formatTime(data.date) : ""
  const transactionId = data.transactionId || `TXN-${data.id.substring(0, 8).toUpperCase()}`
  const invoiceNumber = data.invoiceNumber || data.id.substring(0, 8).toUpperCase()

  // Store info with fallbacks
  const storeName = data.store?.name || "InvoSync"
  const storeAddress = data.store?.address || ""
  const storePhone = data.store?.phone || ""
  const storeEmail = data.store?.email || ""
  const cashier = data.cashier || "—"

  // Payment method(s)
  const paymentMethods = data.payments && data.payments.length > 0
    ? [...new Set(data.payments.map((p) => p.method))].join(", ")
    : "—"

  // Items table rows
  const itemsRows = data.items
    .map(
      (item) =>
        `<tr>
          <td>${escapeHtml(item.name)}</td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-right">${formatMoney(item.unitPrice)}</td>
          <td class="text-right">${formatMoney(item.lineTotal)}</td>
        </tr>`,
    )
    .join("")

  // Current date/time for footer
  const now = new Date()
  const printedOn = `${formatDate(now.toISOString())}, ${formatTime(now.toISOString())}`

  // Generate QR code as data URL
  let qrCodeDataUrl = ""
  try {
    qrCodeDataUrl = await QRCode.toDataURL(transactionId, {
      width: 100,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })
  } catch (error) {
    console.error("Failed to generate QR code:", error)
    // Fallback: will show text if QR generation fails
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${escapeHtml(invoiceNumber)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page {
      size: 5.5in 8.5in;
      margin: 0.25in;
    }
    body {
      font-family: 'Courier New', monospace, system-ui, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #000;
      max-width: 5in;
      margin: 0 auto;
      padding: 8px;
    }
    .header {
      text-align: center;
      margin-bottom: 8px;
    }
    .logo {
      width: 50px;
      height: 50px;
      margin: 0 auto 6px;
      background: #3b82f6;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 16px;
      border-radius: 4px;
    }
    .store-name {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .store-info {
      font-size: 10px;
      color: #333;
      margin-bottom: 2px;
    }
    .separator {
      border-top: 1px dashed #000;
      margin: 8px 0;
      width: 100%;
    }
    .transaction-details {
      display: flex;
      flex-direction: column;
      gap: 3px;
      margin-bottom: 4px;
    }
    .transaction-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
    }
    .transaction-label {
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
      font-size: 10px;
    }
    th, td {
      padding: 4px 6px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      font-weight: bold;
      background: #f5f5f5;
      border-bottom: 2px solid #000;
    }
    .text-center {
      text-align: center;
    }
    .text-right {
      text-align: right;
    }
    .totals {
      display: flex;
      flex-direction: column;
      gap: 3px;
      margin: 6px 0;
      font-size: 10px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
    }
    .total-final {
      font-size: 12px;
      font-weight: bold;
      margin-top: 4px;
      padding-top: 4px;
      border-top: 2px solid #000;
    }
    .payment-method {
      display: flex;
      justify-content: space-between;
      margin: 6px 0;
      font-size: 10px;
    }
    .payment-label {
      font-weight: bold;
    }
    .qr-box {
      width: 120px;
      height: 120px;
      margin: 8px auto;
      border: 2px solid #000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #f9f9f9;
      font-size: 9px;
      text-align: center;
      padding: 8px;
    }
    .qr-label {
      font-weight: bold;
      margin-bottom: 4px;
    }
    .qr-code {
      font-size: 8px;
      word-break: break-all;
      color: #666;
    }
    .qr-image {
      width: 100px;
      height: 100px;
      object-fit: contain;
    }
    .footer {
      text-align: center;
      margin-top: 10px;
      font-size: 9px;
    }
    .footer-title {
      font-weight: bold;
      font-size: 11px;
      margin-bottom: 4px;
    }
    .footer-text {
      margin: 2px 0;
      color: #555;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .separator {
        border-top: 1px dashed #000;
      }
    }
  </style>
</head>
<body>
  <!-- Header: Logo + Store Info -->
  <div class="header">
    <div class="logo">POS</div>
    <div class="store-name">${escapeHtml(storeName)}</div>
    ${storeAddress ? `<div class="store-info">${escapeHtml(storeAddress)}</div>` : ""}
    ${storePhone ? `<div class="store-info">${escapeHtml(storePhone)}</div>` : ""}
    ${storeEmail ? `<div class="store-info">${escapeHtml(storeEmail)}</div>` : ""}
  </div>

  <div class="separator"></div>

  <!-- Transaction Details -->
  <div class="transaction-details">
    <div class="transaction-row">
      <span class="transaction-label">INVOICE #:</span>
      <span>${escapeHtml(invoiceNumber)}</span>
    </div>
    <div class="transaction-row">
      <span class="transaction-label">TRANSACTION ID:</span>
      <span>${escapeHtml(transactionId)}</span>
    </div>
    <div class="transaction-row">
      <span class="transaction-label">DATE:</span>
      <span>${escapeHtml(dateStr)}</span>
    </div>
    <div class="transaction-row">
      <span class="transaction-label">TIME:</span>
      <span>${escapeHtml(timeStr)}</span>
    </div>
    <div class="transaction-row">
      <span class="transaction-label">CASHIER:</span>
      <span>${escapeHtml(cashier)}</span>
    </div>
  </div>

  <div class="separator"></div>

  <!-- Items Table -->
  <table>
    <thead>
      <tr>
        <th>ITEM</th>
        <th class="text-center">QTY</th>
        <th class="text-right">PRICE</th>
        <th class="text-right">TOTAL</th>
      </tr>
    </thead>
    <tbody>${itemsRows}</tbody>
  </table>

  <div class="separator"></div>

  <!-- Totals -->
  <div class="totals">
    <div class="total-row">
      <span>SUBTOTAL:</span>
      <span>${formatMoney(data.subtotal)}</span>
    </div>
    <div class="total-row">
      <span>TAX:</span>
      <span>${formatMoney(data.tax)}</span>
    </div>
    <div class="total-row total-final">
      <span>TOTAL:</span>
      <span>${formatMoney(data.total)}</span>
    </div>
  </div>

  <div class="separator"></div>

  <!-- Payment Method -->
  <div class="payment-method">
    <span class="payment-label">PAYMENT METHOD:</span>
    <span>${escapeHtml(paymentMethods)}</span>
  </div>

  <!-- QR Code -->
  <div class="qr-box">
    <div class="qr-label">QR CODE</div>
    ${
      qrCodeDataUrl
        ? `<img src="${qrCodeDataUrl}" alt="QR Code" class="qr-image" />`
        : `<div class="qr-code">${escapeHtml(transactionId)}</div>`
    }
  </div>

  <div class="separator"></div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-title">THANK YOU FOR YOUR BUSINESS!</div>
    <div class="footer-text">Please keep this receipt for your records</div>
    ${storePhone ? `<div class="footer-text">For support, contact: ${escapeHtml(storePhone)}</div>` : ""}
    <div class="footer-text" style="margin-top: 6px;">Printed on: ${escapeHtml(printedOn)}</div>
  </div>
</body>
</html>`

  const win = window.open("", "_blank")
  if (!win) {
    console.error("Popup blocked - please allow popups to print")
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
    win.close()
  }, 250)
}

function escapeHtml(s: string) {
  const div = typeof document !== "undefined" ? document.createElement("div") : null
  if (!div) return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  div.textContent = s
  return div.innerHTML
}
