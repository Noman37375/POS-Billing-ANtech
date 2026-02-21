import type { InvoiceForPrint } from "@/lib/types/pos"

const CURRENCY = "PKR"

function formatMoney(amount: number) {
  return `${CURRENCY} ${amount.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`
}

function escapeHtml(s: string) {
  const div = typeof document !== "undefined" ? document.createElement("div") : null
  if (!div) return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  div.textContent = s
  return div.innerHTML
}

/**
 * Print A4 invoice — opens browser print dialog (not a PDF download)
 */
export async function printA4Invoice(data: InvoiceForPrint) {
  const invoiceNumber = data.invoiceNumber || data.id.substring(0, 8).toUpperCase()
  const storeName = data.store?.name || ""
  const storeAddress = data.store?.address || ""
  const storePhone = data.store?.phone || ""
  const cashier = data.cashier || ""
  const dateStr = data.date
    ? new Date(data.date).toLocaleDateString("en-PK", { day: "2-digit", month: "long", year: "numeric" })
    : ""
  const timeStr = data.date
    ? new Date(data.date).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true })
    : ""

  const paymentMethod =
    data.payments && data.payments.length > 0
      ? [...new Set(data.payments.map((p) => p.method))].join(", ")
      : "—"

  let itemRowsHTML = ""
  data.items.forEach((item, i) => {
    itemRowsHTML += `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${i + 1}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(item.name)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatMoney(item.unitPrice)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${formatMoney(item.lineTotal)}</td>
      </tr>`
  })

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${escapeHtml(invoiceNumber)}</title>
  <style>
    @page { size: A4; margin: 15mm 20mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #111; background: #fff; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <table width="100%" style="margin-bottom:24px;">
    <tr>
      <td style="vertical-align:top;">
        ${storeName ? `<div style="font-size:22px;font-weight:800;color:#1d4ed8;margin-bottom:4px;">${escapeHtml(storeName)}</div>` : ""}
        ${storeAddress ? `<div style="font-size:11px;color:#6b7280;">${escapeHtml(storeAddress)}</div>` : ""}
        ${storePhone ? `<div style="font-size:11px;color:#6b7280;">Tel: ${escapeHtml(storePhone)}</div>` : ""}
      </td>
      <td style="text-align:right;vertical-align:top;">
        <div style="font-size:26px;font-weight:900;color:#1d4ed8;letter-spacing:1px;">INVOICE</div>
        <table style="margin-top:8px;margin-left:auto;">
          <tr>
            <td style="font-size:11px;color:#6b7280;padding-right:8px;">Invoice No:</td>
            <td style="font-size:12px;font-weight:700;">${escapeHtml(invoiceNumber)}</td>
          </tr>
          <tr>
            <td style="font-size:11px;color:#6b7280;padding-right:8px;">Date:</td>
            <td style="font-size:12px;">${escapeHtml(dateStr)}</td>
          </tr>
          <tr>
            <td style="font-size:11px;color:#6b7280;padding-right:8px;">Time:</td>
            <td style="font-size:12px;">${escapeHtml(timeStr)}</td>
          </tr>
          ${cashier ? `<tr><td style="font-size:11px;color:#6b7280;padding-right:8px;">Cashier:</td><td style="font-size:12px;">${escapeHtml(cashier)}</td></tr>` : ""}
        </table>
      </td>
    </tr>
  </table>

  <!-- Bill To -->
  ${data.party ? `
  <div style="margin-bottom:20px;padding:12px 16px;background:#f8fafc;border-left:4px solid #1d4ed8;border-radius:4px;">
    <div style="font-size:10px;text-transform:uppercase;color:#6b7280;letter-spacing:1px;margin-bottom:4px;">Bill To</div>
    <div style="font-size:14px;font-weight:700;">${escapeHtml(data.party.name)}</div>
    ${data.party.phone ? `<div style="font-size:11px;color:#6b7280;">Phone: ${escapeHtml(data.party.phone)}</div>` : ""}
  </div>` : ""}

  <!-- Items Table -->
  <table width="100%" style="border-collapse:collapse;margin-bottom:20px;">
    <thead>
      <tr style="background:#1d4ed8;color:#fff;">
        <th style="padding:10px;text-align:left;font-size:12px;width:40px;">#</th>
        <th style="padding:10px;text-align:left;font-size:12px;">Item</th>
        <th style="padding:10px;text-align:center;font-size:12px;width:70px;">Qty</th>
        <th style="padding:10px;text-align:right;font-size:12px;width:120px;">Unit Price</th>
        <th style="padding:10px;text-align:right;font-size:12px;width:120px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRowsHTML}
    </tbody>
  </table>

  <!-- Totals -->
  <table style="margin-left:auto;width:260px;margin-bottom:24px;">
    <tr>
      <td style="padding:5px 10px;font-size:12px;color:#6b7280;">Subtotal:</td>
      <td style="padding:5px 10px;font-size:12px;text-align:right;">${formatMoney(data.subtotal)}</td>
    </tr>
    ${data.tax > 0 ? `<tr>
      <td style="padding:5px 10px;font-size:12px;color:#6b7280;">Tax:</td>
      <td style="padding:5px 10px;font-size:12px;text-align:right;">${formatMoney(data.tax)}</td>
    </tr>` : ""}
    <tr style="border-top:2px solid #1d4ed8;">
      <td style="padding:10px;font-size:15px;font-weight:800;">TOTAL:</td>
      <td style="padding:10px;font-size:15px;font-weight:800;text-align:right;color:#1d4ed8;">${formatMoney(data.total)}</td>
    </tr>
  </table>

  <!-- Payment Info -->
  <div style="padding:10px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;font-size:12px;margin-bottom:24px;">
    <strong>Payment Method:</strong> ${escapeHtml(paymentMethod)} &nbsp;|&nbsp;
    <strong>Status:</strong> ${escapeHtml(data.status)}
  </div>

  <!-- Footer -->
  <div style="text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px;">
    Thank you for your business!
  </div>
</body>
</html>`

  const win = window.open("", "_blank")
  if (!win) {
    console.error("Popup blocked — allow popups to print")
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
    win.close()
  }, 300)
}
