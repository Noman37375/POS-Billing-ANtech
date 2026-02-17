import type { InvoiceForPrint } from "@/lib/types/pos"

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
  return date.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true })
}

/**
 * Generate POS Carbon Copy (NCR) Invoice
 * Proper format for thermal printers and carbon copy machines
 * Width: 3-4 inches (80-100mm) - standard POS machine size
 */
export async function printStandardInvoice(data: InvoiceForPrint) {
  const dateStr = data.date ? formatDate(data.date) : ""
  const timeStr = data.date ? formatTime(data.date) : ""
  const invoiceNumber = data.invoiceNumber || data.id.substring(0, 8).toUpperCase()

  // Store info with fallbacks
  const storeName = data.store?.name || "STORE"
  const storeAddress = data.store?.address || ""
  const storePhone = data.store?.phone || ""
  const cashier = data.cashier || "—"

  // Payment method(s)
  const paymentMethods = data.payments && data.payments.length > 0
    ? [...new Set(data.payments.map((p) => p.method))].join(", ")
    : "—"

  // Build items rows
  let itemsHTML = ""
  for (const item of data.items) {
    const qty = item.quantity || 0
    const unitPrice = item.unitPrice || 0
    const lineTotal = item.lineTotal || 0
    itemsHTML += `
      <div class="item-row">
        <div class="item-name">${escapeHtml(item.name)}</div>
        <div class="qty">${qty}</div>
        <div class="price">${formatMoney(unitPrice)}</div>
        <div class="total">${formatMoney(lineTotal)}</div>
      </div>
    `
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${escapeHtml(invoiceNumber)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: 80mm auto;
      margin: 0;
      padding: 0;
    }

    @media print {
      body {
        width: 80mm;
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page-break {
        page-break-after: always;
      }
    }

    body {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      line-height: 1.3;
      width: 80mm;
      margin: 0 auto;
      padding: 0;
      color: #000;
      background: #fff;
      font-weight: 600;
    }

    .receipt {
      width: 80mm;
      padding: 2mm;
      text-align: center;
    }

    .header {
      border-bottom: 1px dashed #000;
      padding-bottom: 3mm;
      margin-bottom: 3mm;
    }

    .store-name {
      font-weight: bold;
      font-size: 12px;
      margin-bottom: 1.5mm;
    }

    .store-details {
      font-size: 9px;
      line-height: 1.2;
      margin-bottom: 1.5mm;
      font-weight: 600;
    }

    .invoice-info {
      font-size: 10px;
      margin-bottom: 2mm;
      border-bottom: 1px dashed #000;
      padding: 2mm;
      text-align: left;
      font-weight: 600;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 1mm 0;
      font-size: 10px;
    }

    .label {
      font-weight: bold;
    }

    .items-section {
      margin: 2mm 0;
      border: 1px solid #000;
      padding: 0;
    }

    .item-header {
      display: grid;
      grid-template-columns: 1fr 35px 40px 40px;
      gap: 0;
      font-weight: bold;
      font-size: 11px;
      padding: 1.5mm 2mm;
      border-bottom: 1px solid #000;
      background: #fff;
    }

    .item-header-col1 {
      text-align: left;
    }

    .item-header-col2 {
      text-align: center;
    }

    .item-header-col3 {
      text-align: right;
    }

    .item-header-col4 {
      text-align: right;
    }

    .item-row {
      display: grid;
      grid-template-columns: 1fr 35px 40px 40px;
      gap: 0;
      border-bottom: 1px solid #ccc;
      padding: 1.5mm 2mm;
      font-size: 10px;
      font-weight: 600;
      align-items: start;
    }

    .item-row:last-child {
      border-bottom: 1px solid #000;
    }

    .item-name {
      text-align: left;
      word-wrap: break-word;
      overflow-wrap: break-word;
      font-size: 11px;
      font-weight: 500;
      grid-column: 1;
    }

    .item-numbers {
      display: contents;
    }

    .qty {
      text-align: center;
      font-size: 10px;
      font-weight: 500;
    }

    .price {
      text-align: right;
      font-size: 10px;
      font-weight: 500;
    }

    .total {
      text-align: right;
      font-size: 10px;
      font-weight: bold;
    }

    .totals-section {
      margin: 2mm 0;
      padding: 1.5mm 0;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 2mm 0;
      margin-left: 2mm;
      margin-right: 2mm;
      font-size: 11px;
      font-weight: 700;
    }

    .subtotal {
      border-top: 1px solid #000;
      padding-top: 3mm;
    }

    .final-total {
      font-size: 13px;
      font-weight: bold;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      padding: 3mm 0;
      margin: 3mm 0;
      letter-spacing: 0.5px;
    }

    .payment-section {
      margin: 2mm 0;
      padding: 2mm;
      font-size: 10px;
      border-bottom: 1px dashed #000;
      font-weight: 600;
    }

    .footer {
      text-align: center;
      margin: 2mm 0;
      font-size: 10px;
      padding-bottom: 2mm;
      font-weight: 600;
    }

    .thank-you {
      font-weight: bold;
      margin: 1.5mm 0;
    }

    .copy-mark {
      font-size: 9px;
      color: #666;
      margin-top: 5mm;
      padding-top: 3mm;
      border-top: 1px dashed #999;
      text-align: center;
    }
  </style>
</head>
<body>
  <!-- MERCHANT COPY -->
  <div class="receipt">
    <div class="header">
      <div class="store-name">${escapeHtml(storeName)}</div>
      <div class="store-details">
        ${storeAddress ? escapeHtml(storeAddress) + '<br>' : ''}
        ${storePhone ? escapeHtml(storePhone) : ''}
      </div>
    </div>

    <div class="invoice-info">
      <div class="info-row">
        <span class="label">INV #:</span>
        <span>${escapeHtml(invoiceNumber)}</span>
      </div>
      <div class="info-row">
        <span class="label">DATE:</span>
        <span>${escapeHtml(dateStr)}</span>
      </div>
      <div class="info-row">
        <span class="label">TIME:</span>
        <span>${escapeHtml(timeStr)}</span>
      </div>
      ${data.party?.name ? `<div class="info-row">
        <span class="label">CUSTOMER:</span>
        <span>${escapeHtml(data.party.name)}</span>
      </div>` : ''}
      <div class="info-row">
        <span class="label">CASHIER:</span>
        <span>${escapeHtml(cashier)}</span>
      </div>
    </div>

    <div class="items-section">
      <div class="item-header">
        <div class="item-header-col1">ITEM</div>
        <div class="item-header-col2">QTY</div>
        <div class="item-header-col3">PRICE</div>
        <div class="item-header-col4">TOTAL</div>
      </div>
      ${itemsHTML}
    </div>

    <div class="totals-section">
      <div class="total-row subtotal">
        <span class="label">SUBTOTAL:</span>
        <span>${formatMoney(data.subtotal)}</span>
      </div>
      ${data.tax > 0 ? `<div class="total-row">
        <span class="label">TAX:</span>
        <span>${formatMoney(data.tax)}</span>
      </div>` : ''}
      <div class="total-row final-total">
        <span>TOTAL</span>
        <span>${formatMoney(data.total)}</span>
      </div>
    </div>

    <div class="payment-section">
      <div class="label">Payment: ${escapeHtml(paymentMethods)}</div>
    </div>

    <div class="footer">
      <div class="thank-you">THANK YOU!</div>
      <div>*** MERCHANT COPY ***</div>
    </div>
  </div>

  <!-- PAGE BREAK FOR CUSTOMER COPY -->
  <div class="page-break"></div>

  <!-- CUSTOMER COPY -->
  <div class="receipt">
    <div class="header">
      <div class="store-name">${escapeHtml(storeName)}</div>
      <div class="store-details">
        ${storeAddress ? escapeHtml(storeAddress) + '<br>' : ''}
        ${storePhone ? escapeHtml(storePhone) : ''}
      </div>
    </div>

    <div class="invoice-info">
      <div class="info-row">
        <span class="label">INV #:</span>
        <span>${escapeHtml(invoiceNumber)}</span>
      </div>
      <div class="info-row">
        <span class="label">DATE:</span>
        <span>${escapeHtml(dateStr)}</span>
      </div>
      <div class="info-row">
        <span class="label">TIME:</span>
        <span>${escapeHtml(timeStr)}</span>
      </div>
      ${data.party?.name ? `<div class="info-row">
        <span class="label">CUSTOMER:</span>
        <span>${escapeHtml(data.party.name)}</span>
      </div>` : ''}
    </div>

    <div class="items-section">
      <div class="item-header">
        <div class="item-header-col1">ITEM</div>
        <div class="item-header-col2">QTY</div>
        <div class="item-header-col3">PRICE</div>
        <div class="item-header-col4">TOTAL</div>
      </div>
      ${itemsHTML}
    </div>

    <div class="totals-section">
      <div class="total-row subtotal">
        <span class="label">SUBTOTAL:</span>
        <span>${formatMoney(data.subtotal)}</span>
      </div>
      ${data.tax > 0 ? `<div class="total-row">
        <span class="label">TAX:</span>
        <span>${formatMoney(data.tax)}</span>
      </div>` : ''}
      <div class="total-row final-total">
        <span>TOTAL</span>
        <span>${formatMoney(data.total)}</span>
      </div>
    </div>

    <div class="payment-section">
      <div class="label">Payment: ${escapeHtml(paymentMethods)}</div>
    </div>

    <div class="footer">
      <div class="thank-you">THANK YOU!</div>
      <div>*** CUSTOMER COPY ***</div>
      <div style="font-size: 8px; margin-top: 2mm;">Please retain for your records</div>
    </div>
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
