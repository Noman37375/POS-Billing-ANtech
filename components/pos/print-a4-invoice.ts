import type { InvoiceForPrint } from "@/lib/types/pos"

function esc(s: string): string {
  const div = typeof document !== "undefined" ? document.createElement("div") : null
  if (!div) return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  div.textContent = s
  return div.innerHTML
}

function fmtMoney(n: number): string {
  return n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

function numberToWords(num: number): string {
  const ones = [
    "", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
    "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN",
    "SEVENTEEN", "EIGHTEEN", "NINETEEN",
  ]
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"]

  if (num === 0) return "ZERO"

  function convert(n: number): string {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "")
    if (n < 1000) return ones[Math.floor(n / 100)] + " HUNDRED" + (n % 100 ? " " + convert(n % 100) : "")
    if (n < 100000) return convert(Math.floor(n / 1000)) + " THOUSAND" + (n % 1000 ? " " + convert(n % 1000) : "")
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " LAKH" + (n % 100000 ? " " + convert(n % 100000) : "")
    return convert(Math.floor(n / 10000000)) + " CRORE" + (n % 10000000 ? " " + convert(n % 10000000) : "")
  }

  return convert(Math.floor(num)) + " ONLY"
}

/**
 * A4 Portrait Invoice — Black & White, SHOKIA TRADERS style
 */
export async function printA4Invoice(data: InvoiceForPrint) {
  const invoiceNumber = data.invoiceNumber || data.id.substring(0, 8).toUpperCase()
  const storeName     = data.store?.name    || ""
  const storeAddress  = data.store?.address || ""
  const storePhone    = data.store?.phone   || ""
  const cashier       = data.cashier        || ""
  const dateStr       = data.date ? fmtDate(data.date) : ""
  const timeStr       = data.date ? fmtTime(data.date) : ""

  const discount      = Number(data.discount || 0)
  const grossAmount   = data.subtotal + (data.tax || 0)
  const netAmount     = data.total
  const amountWords   = numberToWords(Math.round(netAmount))

  const payMethod = data.payments && data.payments.length > 0
    ? [...new Set(data.payments.map((p) => p.method))].join(" / ")
    : "Cash"

  // Items table rows
  let itemRows = ""
  data.items.forEach((item, i) => {
    const discPct = 0
    const discAmt = 0
    itemRows += `
      <tr>
        <td class="tc">${i + 1}</td>
        <td class="tl">${esc(item.name)}</td>
        <td class="tc">${item.quantity}</td>
        <td class="tr">${fmtMoney(item.unitPrice)}</td>
        <td class="tc">0.00%</td>
        <td class="tr">0.00</td>
        <td class="tr fw">${fmtMoney(item.lineTotal)}</td>
      </tr>`
  })

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${esc(invoiceNumber)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10px;
      color: #000;
      background: #fff;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }

    /* ── Header ── */
    .store-name  { text-align:center; font-size:20px; font-weight:900; letter-spacing:1px; }
    .store-tag   { text-align:center; font-size:10px; font-weight:600; margin-top:1px; }
    .store-addr  { text-align:center; font-size:9.5px; margin-top:1px; }
    .divider     { border:none; border-top:2px solid #000; margin:4px 0; }
    .divider-sm  { border:none; border-top:1px solid #000; margin:3px 0; }

    /* ── Customer / Bill info row ── */
    .info-row    { width:100%; border-collapse:collapse; margin-bottom:4px; }
    .info-row td { vertical-align:top; padding:1.5px 0; font-size:10px; }
    .bill-box    { border:1px solid #000; padding:3px 6px; font-size:9.5px; }
    .bill-box tr td { padding:1px 3px; }
    .bill-box .lbl { font-weight:700; white-space:nowrap; padding-right:5px; }

    /* ── Items table ── */
    .items { width:100%; border-collapse:collapse; font-size:9.5px; margin-top:3px; table-layout:fixed; }
    .items th {
      border:1px solid #000;
      padding:3px 4px;
      font-weight:700;
      background:#fff;
      text-align:center;
      overflow:hidden;
    }
    .items td { border:1px solid #000; padding:2.5px 4px; overflow:hidden; }
    .tc { text-align:center; }
    .tl { text-align:left; }
    .tr { text-align:right; }
    .fw { font-weight:700; }

    /* ── Totals ── */
    .totals-table { border-collapse:collapse; width:100%; }
    .totals-table td { padding:2px 5px; font-size:10px; border:1px solid #000; }
    .totals-table .lbl { font-weight:600; }
    .totals-table .val { text-align:right; font-weight:600; }
    .totals-table .net { font-weight:800; font-size:11px; }

    /* ── Words ── */
    .words-box {
      border:1px solid #000;
      padding:3px 6px;
      font-size:9.5px;
    }
    .words-box strong { font-weight:700; }

    /* ── Terms ── */
    .terms { font-size:9px; margin-top:5px; line-height:1.6; }

    /* ── Footer ── */
    .footer {
      display:flex;
      justify-content:space-between;
      align-items:flex-end;
      margin-top:6px;
      border-top:1.5px solid #000;
      padding-top:4px;
      font-size:9px;
    }
  </style>
</head>
<body>

  <!-- STORE HEADER -->
  <div class="store-name">${esc(storeName)}</div>
  ${storeAddress ? `<div class="store-tag">${esc(storeAddress)}</div>` : ""}
  ${storePhone   ? `<div class="store-addr">Contact Number : ${esc(storePhone)}</div>` : ""}
  <hr class="divider">

  <!-- CUSTOMER INFO + BILL BOX -->
  <table class="info-row" cellpadding="0" cellspacing="0">
    <tr>
      <td style="width:auto;">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-weight:700;padding-right:6px;white-space:nowrap;">Customer Name:</td>
            <td style="white-space:nowrap;">${data.party?.name ? esc(data.party.name) : ""}</td>
          </tr>
          <tr>
            <td style="font-weight:700;padding-right:6px;white-space:nowrap;">Contact No:</td>
            <td style="white-space:nowrap;">${data.party?.phone ? esc(data.party.phone) : ""}</td>
          </tr>
          ${data.party?.address ? `<tr>
            <td style="font-weight:700;padding-right:6px;white-space:nowrap;">Address:</td>
            <td>${esc(data.party.address)}</td>
          </tr>` : ""}
          ${cashier ? `<tr>
            <td style="font-weight:700;padding-right:6px;white-space:nowrap;">User:</td>
            <td style="white-space:nowrap;">${esc(cashier)}</td>
          </tr>` : ""}
        </table>
      </td>
      <td style="width:1px;"></td>
      <td style="text-align:right;white-space:nowrap;">
        <table class="bill-box" cellpadding="0" cellspacing="0" style="margin-left:auto;">
          <tr>
            <td class="lbl">Bill No:</td>
            <td><strong>${esc(invoiceNumber)}</strong></td>
          </tr>
          <tr>
            <td class="lbl">Date:</td>
            <td>${esc(dateStr)}</td>
          </tr>
          <tr>
            <td class="lbl">Time:</td>
            <td>${esc(timeStr)}</td>
          </tr>
          <tr>
            <td class="lbl">Payment:</td>
            <td>${esc(payMethod)}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <hr class="divider-sm">

  <!-- ITEMS TABLE -->
  <table class="items" cellpadding="0" cellspacing="0">
    <colgroup>
      <col style="width:5%">
      <col style="width:31%">
      <col style="width:8%">
      <col style="width:16%">
      <col style="width:10%">
      <col style="width:12%">
      <col style="width:18%">
    </colgroup>
    <thead>
      <tr>
        <th>S#</th>
        <th style="text-align:left;">Item Name</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Disc%</th>
        <th>Disc Amt</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
    <tfoot>
      <tr>
        <td class="tc fw" colspan="2">Total Items: ${data.items.length}</td>
        <td class="tc fw">${data.items.reduce((s, i) => s + i.quantity, 0)}</td>
        <td colspan="3"></td>
        <td class="tr fw">${fmtMoney(grossAmount)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- BOTTOM ROW: Words+Terms (left) | Totals (right) -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;vertical-align:top;">
    <tr>
      <!-- LEFT: Amount in words + Terms -->
      <td style="vertical-align:top;padding-right:8px;">
        <div class="words-box">
          <strong>Amount In Words:</strong> ${esc(amountWords)}
        </div>
        <div class="terms">
          1. Damage and expiry item are not refundable.<br>
          2. Plz Count Cash Before Leave Counter.
        </div>
      </td>
      <!-- RIGHT: Totals box -->
      <td style="vertical-align:top;width:200px;">
        <table class="totals-table" width="100%" cellpadding="0" cellspacing="0">
          ${data.tax > 0 ? `
          <tr>
            <td class="lbl">Subtotal:</td>
            <td class="val">${fmtMoney(data.subtotal)}</td>
          </tr>
          <tr>
            <td class="lbl">Tax:</td>
            <td class="val">${fmtMoney(data.tax)}</td>
          </tr>` : ""}
          <tr>
            <td class="lbl">Gross Amount:</td>
            <td class="val">${fmtMoney(grossAmount)}</td>
          </tr>
          <tr>
            <td class="lbl">Less Discount:</td>
            <td class="val">${fmtMoney(discount)}</td>
          </tr>
          <tr>
            <td class="lbl net">Net Amount:</td>
            <td class="val net">${fmtMoney(netAmount)}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- FOOTER -->
  <div class="footer">
    <div>
      ${storePhone ? `<strong>Contact No:</strong> ${esc(storePhone)}` : ""}
    </div>
    <div style="text-align:right;">
      <strong>Status:</strong> ${esc(data.status)}
    </div>
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
