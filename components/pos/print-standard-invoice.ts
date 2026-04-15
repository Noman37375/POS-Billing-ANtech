import type { InvoiceForPrint } from "@/lib/types/pos"

function esc(s: string): string {
  const div = typeof document !== "undefined" ? document.createElement("div") : null
  if (!div) return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  div.textContent = s
  return div.innerHTML
}

function fmtNum(n: number): string {
  return n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr)
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function fmtTime(dateStr: string): string {
  const d = new Date(dateStr)
  let h = d.getHours()
  const min = String(d.getMinutes()).padStart(2, "0")
  const ampm = h >= 12 ? "pm" : "am"
  h = h % 12 || 12
  return `${h}:${min} ${ampm}`
}

function fmtTimeFull(dateStr: string): string {
  const d = new Date(dateStr)
  let h = d.getHours()
  const min = String(d.getMinutes()).padStart(2, "0")
  const sec = String(d.getSeconds()).padStart(2, "0")
  const ampm = h >= 12 ? "PM" : "AM"
  h = h % 12 || 12
  return `${String(h).padStart(2, "0")}:${min}:${sec}${ampm}`
}

function buildCopy(data: InvoiceForPrint, copyLabel: "Customer Copy" | "Merchant Copy"): string {
  const storeName  = data.store?.name    || ""
  const storeAddr  = data.store?.address || ""
  const storePhone = data.store?.phone   || ""
  const cashier    = data.cashier        || ""
  const invNo      = data.invoiceNumber  || data.id.substring(0, 8).toUpperCase()
  const dateStr    = data.date ? fmtDate(data.date) : ""
  const timeStr    = data.date ? fmtTime(data.date) : ""
  const printDate  = data.date ? fmtDate(data.date) : ""
  const printTime  = data.date ? fmtTimeFull(data.date) : ""

  const discount   = Number(data.discount || 0)
  const cashPaid   = data.payments && data.payments.length > 0
    ? data.payments.reduce((s, p) => s + Number(p.amount || 0), 0)
    : (data.status === "Pending" || data.status === "Draft" || data.status === "Credit") ? 0 : data.total
  const payMethod  = data.payments && data.payments.length > 0
    ? [...new Set(data.payments.map((p) => p.method))].join(" / ")
    : "Cash"
  const remainingBalance = data.total - cashPaid
  const isDraft   = data.status === "Draft"
  const isCredit  = data.status === "Credit"
  const isPending = (data.status === "Pending" || isCredit) && remainingBalance > 0

  const itemCount  = data.items.length
  const totalQty   = data.items.reduce((s, i) => s + i.quantity, 0)

  // Build item rows — no alternating background, tight padding like real thermal paper
  let itemRows = ""
  data.items.forEach((item, idx) => {
    itemRows += `
      <tr style="border-bottom:0.5px solid #e0e0e0;">
        <td style="padding:0.3mm 0.5mm;text-align:left;vertical-align:top;color:#000;">${idx + 1}</td>
        <td style="padding:0.3mm 0.5mm;text-align:left;vertical-align:top;color:#000;word-break:break-word;">${esc(item.name)}</td>
        <td style="padding:0.3mm 0.5mm;text-align:right;vertical-align:top;color:#000;">${item.quantity}</td>
        <td style="padding:0.3mm 0.5mm;text-align:right;vertical-align:top;color:#000;">${fmtNum(item.unitPrice)}</td>
        <td style="padding:0.3mm 0.5mm;text-align:right;vertical-align:top;font-weight:700;color:#000;">${fmtNum(item.lineTotal)}</td>
      </tr>`
  })

  return `
  <div class="receipt">

    <!-- COPY LABEL -->
    <div style="text-align:center;font-size:7.5px;border:1px solid #000;padding:1px 5px;margin-bottom:1.5mm;display:inline-block;float:right;color:#000;font-weight:700;letter-spacing:0.5px;">
      ${copyLabel}
    </div>
    <div style="clear:both;"></div>

    <!-- STORE NAME -->
    <div style="text-align:center;font-size:15px;font-weight:900;letter-spacing:0.3px;margin-bottom:0.8mm;color:#000;">
      ${esc(storeName)}
    </div>

    <!-- STORE ADDRESS & PHONE -->
    ${storeAddr ? `<div style="text-align:center;font-size:8px;line-height:1.4;margin-bottom:0.4mm;color:#000;">Address: ${esc(storeAddr)}</div>` : ""}
    ${storePhone ? `<div style="text-align:center;font-size:8px;margin-bottom:1mm;color:#000;">Contact Number : ${esc(storePhone)}</div>` : ""}

    <!-- SALES RECEIPT BAR -->
    <div style="background:#000;color:#fff;text-align:center;font-weight:700;font-size:9.5px;padding:2px 0;margin:1.5mm 0;">
      ${isDraft ? "Draft Invoice" : isCredit ? "Credit Sale (Udhaar)" : "Sales Receipt"}
    </div>

    <!-- BILL INFO -->
    <table style="width:100%;font-size:8px;margin-bottom:0.8mm;color:#000;" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0.3mm 0;color:#000;">Bill No: <strong style="color:#000;">${esc(invNo)}</strong></td>
        <td style="padding:0.3mm 0;text-align:right;color:#000;">${cashier ? `User: <strong style="color:#000;">${esc(cashier)}</strong>` : ""}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:0.3mm 0;color:#000;">Date &amp; Time: ${esc(dateStr)} - ${esc(timeStr)}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:0.3mm 0;color:#000;">Customer Contact #: ${data.party?.phone ? esc(data.party.phone) : ""}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:0.3mm 0;color:#000;">Customer Name: ${data.party?.name ? esc(data.party.name) : ""}</td>
      </tr>
      ${data.party?.address ? `<tr>
        <td colspan="2" style="padding:0.3mm 0;color:#000;">Customer Address: ${esc(data.party.address)}</td>
      </tr>` : ""}
    </table>

    <!-- ITEMS TABLE -->
    <table style="width:100%;border-collapse:collapse;font-size:8px;color:#000;table-layout:fixed;" cellpadding="0" cellspacing="0">
      <colgroup>
        <col style="width:6%">
        <col style="width:38%">
        <col style="width:12%">
        <col style="width:20%">
        <col style="width:24%">
      </colgroup>
      <thead>
        <tr style="border-top:1.5px solid #000;border-bottom:1.5px solid #000;">
          <th style="padding:1mm 0.5mm;text-align:left;font-weight:700;color:#000;">Sr</th>
          <th style="padding:1mm 0.5mm;text-align:left;font-weight:700;color:#000;">Description</th>
          <th style="padding:1mm 0.5mm;text-align:right;font-weight:700;color:#000;">Qty</th>
          <th style="padding:1mm 0.5mm;text-align:right;font-weight:700;color:#000;">Rate</th>
          <th style="padding:1mm 0.5mm;text-align:right;font-weight:700;color:#000;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <!-- SUMMARY ROW -->
    <div style="border-top:1.5px solid #000;border-bottom:1px dashed #000;font-size:8px;padding:0.5mm 0.5mm;margin-top:0;color:#000;">
      No. Of Item(s) ${itemCount} &nbsp;&nbsp; Total Qty: ${totalQty}
    </div>

    <!-- TOTALS (right-aligned) -->
    <table style="width:100%;font-size:9px;margin-top:0.5mm;color:#000;" cellpadding="0" cellspacing="0">
      ${data.tax > 0 ? `
      <tr>
        <td></td>
        <td style="text-align:right;padding:0.3mm 0.5mm;color:#000;">Subtotal:</td>
        <td style="text-align:right;padding:0.3mm 0.5mm;min-width:18mm;color:#000;">${fmtNum(data.subtotal)}</td>
      </tr>
      <tr>
        <td></td>
        <td style="text-align:right;padding:0.3mm 0.5mm;color:#000;">Tax:</td>
        <td style="text-align:right;padding:0.3mm 0.5mm;color:#000;">${fmtNum(data.tax)}</td>
      </tr>` : ""}
      ${discount > 0 ? `
      <tr>
        <td></td>
        <td style="text-align:right;padding:0.3mm 0.5mm;color:#000;">Discount:</td>
        <td style="text-align:right;padding:0.3mm 0.5mm;color:#000;">-${fmtNum(discount)}</td>
      </tr>` : ""}
      <tr>
        <td></td>
        <td style="text-align:right;padding:0.3mm 0.5mm;font-weight:700;font-size:9.5px;color:#000;">Net Amount:</td>
        <td style="text-align:right;padding:0.3mm 0.5mm;font-weight:700;font-size:9.5px;color:#000;">${fmtNum(data.total)}</td>
      </tr>
      ${cashPaid > 0 ? `
      <tr>
        <td></td>
        <td style="text-align:right;padding:0.3mm 0.5mm;font-weight:700;font-size:9.5px;color:#000;">${esc(payMethod)} Paid:</td>
        <td style="text-align:right;padding:0.3mm 0.5mm;font-weight:700;font-size:9.5px;color:#000;">${fmtNum(cashPaid)}</td>
      </tr>` : ""}
      <tr>
        <td colspan="3"><div style="border-top:1px dashed #000;margin:1mm 0;"></div></td>
      </tr>
      <tr>
        <td></td>
        <td style="text-align:right;padding:0.3mm 0.5mm;font-weight:700;font-size:9.5px;color:#000;">Remaining Balance:</td>
        <td style="text-align:right;padding:0.3mm 0.5mm;font-weight:700;font-size:9.5px;color:#000;">${fmtNum(remainingBalance)}</td>
      </tr>
    </table>

    <!-- DASHED SEPARATOR -->
    <div style="border-top:1px dashed #000;margin:1.5mm 0;"></div>

    <!-- TERMS -->
    <div style="font-size:7.5px;line-height:1.4;color:#000;">
      <div style="color:#000;">1- Only Products can be exchanged within 7 days of sales.</div>
      <div style="color:#000;">2- Check your Product Before Leave Counter.</div>
      <div style="color:#000;">3- Damage Product no Exchange Or Return.</div>
      <div style="margin-top:0.8mm;font-weight:700;color:#000;">*Note: No Exchange No Return Without Sale Receipt</div>
    </div>

    <!-- BARCODE AREA -->
    <div style="text-align:center;margin:2mm 0 1mm;">
      <div style="font-family:'Libre Barcode 128 Text',monospace;font-size:36px;line-height:1;letter-spacing:0;color:#000;">
        ${esc(invNo)}
      </div>
      <div style="font-size:7.5px;margin-top:0.5mm;color:#000;">* ${esc(invNo)} *</div>
    </div>

    <!-- PRINT DATE / TIME -->
    <div style="display:flex;justify-content:space-between;font-size:7.5px;border-top:1px dashed #999;padding-top:1mm;color:#000;">
      <span style="color:#000;">Print Date: ${esc(printDate)}</span>
      <span style="color:#000;">Print Time: ${esc(printTime)}</span>
    </div>

  </div>`
}

/**
 * NCR Carbon Copy — prints ORIGINAL + DUPLICATE (2 copies, one per page)
 */
export async function printStandardInvoice(data: InvoiceForPrint) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${esc(data.invoiceNumber || data.id.substring(0, 8).toUpperCase())}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128+Text&display=swap" rel="stylesheet">
  <style>
    @page {
      size: auto;
      margin: 2mm 5mm;
    }
    @media print {
      body {
        width: 100%;
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page-break { page-break-after: always; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; color: #000; }
    a, a:visited, a:hover { color: #000 !important; text-decoration: none; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 8.5px;
      color: #000;
      background: #fff;
      width: 100%;
      margin: 0;
    }
    .receipt {
      width: 100%;
      padding: 1mm 3mm 2mm 3mm;
    }
    .page-break {
      page-break-after: always;
      height: 0;
      display: block;
    }
  </style>
</head>
<body>
  ${buildCopy(data, "Customer Copy")}
  <div class="page-break"></div>
  ${buildCopy(data, "Merchant Copy")}
</body>
</html>`

  const win = window.open("", "_blank")
  if (!win) {
    console.error("Popup blocked — please allow popups to print")
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
    win.close()
  }, 600)
}
