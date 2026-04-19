# FBR Digital Invoicing Integration — Planning Document

**Status:** 📋 PLANNING ONLY — Implementation pending  
**Priority:** Medium (not a launch blocker — implement after core bugs fixed)  
**API Version:** DI API v1.12 (latest as of 2025)  
**Related Module:** POS Sales (same as invoices — one system)

---

## What is FBR Integration?

FBR (Federal Board of Revenue) requires all registered businesses (STRN holders) to transmit every sales invoice to their central server in real-time. FBR validates the invoice and returns a **22-digit Invoice Reference Number (IRN)** which must be printed on the receipt along with a QR code.

This is managed by **PRAL** (Pakistan Revenue Automation Ltd) — FBR's IT arm.

---

## Is This Mandatory for Your Users?

| Business Type | Required? | Deadline |
|--------------|-----------|----------|
| STN/STRN registered corporations | ✅ Yes | June 1, 2025 |
| STRN registered non-corporate | ✅ Yes | July 1, 2025 |
| Unregistered small shops | ❌ No | N/A |
| Tier-1 retailers (old system) | ✅ Yes | Already mandated |

**Your POS users:** Mostly small shopkeepers — many will be unregistered (no STRN). So FBR integration should be **optional** — only activate if the business has an STRN.

---

## Technical Flow (How It Will Work in Our POS)

```
[User creates sale in POS]
         |
[Is FBR enabled in settings?]
    /           \
  NO             YES
  |               |
[Save locally]  [Build FBR JSON payload]
[Print receipt]  |
                [POST → FBR DI API]
                 |
                [FBR returns IRN (22-digit)]
                 |
                [Save IRN to sale record]
                 |
                [Generate QR code from IRN]
                 |
                [Print receipt with IRN + QR]
```

---

## API Details

### Endpoint
| Environment | URL |
|-------------|-----|
| **Sandbox** | `https://gw.fbr.gov.pk/di_data/v1/di/postinvoicedata_sb` |
| **Production** | `https://gw.fbr.gov.pk/di_data/v1/di/postinvoicedata` |
| **Validate (no record)** | `https://gw.fbr.gov.pk/di_data/v1/di/validateinvoicedata_sb` |

### Authentication
- **Type:** Bearer Token
- **Header:** `Authorization: Bearer <token>`
- **Token validity:** 5 years
- **Where to get:** FBR IRIS portal → `iris.fbr.gov.pk` → API Integration tab
- **⚠️ CRITICAL:** Requires **static IP address** — our server's IP must be whitelisted by PRAL before any API call works

---

## JSON Payload Structure

```json
{
  "invoiceType": "Sale Invoice",
  "invoiceDate": "2025-06-30",
  "sellerNTNCNIC": "7654321",
  "sellerBusinessName": "Ahmed Electronics",
  "sellerProvince": "Punjab",
  "sellerAddress": "123 Mall Road, Lahore",
  "buyerNTNCNIC": "3520112345678",
  "buyerBusinessName": "Walk-in Customer",
  "buyerProvince": "Punjab",
  "buyerAddress": "Lahore",
  "buyerRegistrationType": "Unregistered",
  "invoiceRefNo": "POS-2025-00001",
  "scenarioId": "SN026",
  "items": [
    {
      "hsCode": "8471.3000",
      "productDescription": "Laptop Dell",
      "rate": "17%",
      "uoM": "Numbers, pieces, units",
      "quantity": 1,
      "valueSalesExcludingST": 85000.00,
      "salesTaxApplicable": 14450.00,
      "totalValues": 99450.00,
      "saleType": "Goods at standard rate",
      "fixedNotifiedValueOrRetailPrice": 0,
      "sroScheduleNo": "",
      "sroItemSerialNo": "",
      "salesTaxWithheldAtSource": 0,
      "extraTax": "",
      "furtherTax": 0,
      "fedPayable": 0,
      "discount": 0
    }
  ]
}
```

### API Response
```json
{
  "statusCode": "00",
  "invoiceNumber": "1234567890123456789012",
  "exception": null
}
```
- `statusCode: "00"` = Success
- `statusCode: "01"` = Error (check `exception` field)
- `invoiceNumber` = 22-digit **IRN** — save this to database

---

## What Must Show on Receipt After FBR Integration

| Field | Example |
|-------|---------|
| Seller NTN | NTN: 1234567 |
| Seller STRN | STRN: 3012345678901 |
| FBR Invoice Number (IRN) | 1234567890123456789012 |
| QR Code (1×1 inch) | Encodes the IRN |
| FBR Logo | Official logo |
| Buyer NTN/CNIC | 3520112345678 (for walk-in, any CNIC or default) |
| GST breakdown | Subtotal / GST 17% / Total |
| Date & Time | 2025-06-30 14:30:00 |

---

## Tax Scenarios — Which Ones We Need

For a general retail POS, we mainly need these scenarios:

| Scenario | When to Use |
|----------|-------------|
| **SN026** | Standard rate goods sold to end consumers (retail) — **most common** |
| **SN027** | Third Schedule goods (fixed retail price printed on pack) |
| **SN028** | Reduced rate goods (Eighth Schedule) |
| **SN006** | Exempt goods (zero ST) |
| **SN007** | Zero-rated goods |

For now, **SN026 covers 90%+ of retail sales**. Others can be added later.

---

## Database Changes Needed

```sql
-- Add FBR fields to sales_invoices table
ALTER TABLE sales_invoices ADD COLUMN fbr_enabled BOOLEAN DEFAULT false;
ALTER TABLE sales_invoices ADD COLUMN fbr_irn VARCHAR(22);
ALTER TABLE sales_invoices ADD COLUMN fbr_submitted_at TIMESTAMP;
ALTER TABLE sales_invoices ADD COLUMN fbr_status VARCHAR(20); -- 'pending', 'submitted', 'failed'
ALTER TABLE sales_invoices ADD COLUMN fbr_error TEXT;

-- Add FBR settings to pos_users or settings table
ALTER TABLE pos_users ADD COLUMN fbr_ntn VARCHAR(20);
ALTER TABLE pos_users ADD COLUMN fbr_strn VARCHAR(20);
ALTER TABLE pos_users ADD COLUMN fbr_bearer_token TEXT; -- store encrypted
ALTER TABLE pos_users ADD COLUMN fbr_enabled BOOLEAN DEFAULT false;
ALTER TABLE pos_users ADD COLUMN fbr_scenario_id VARCHAR(10) DEFAULT 'SN026';

-- Add HS code to inventory items (needed for FBR)
ALTER TABLE inventory_items ADD COLUMN hs_code VARCHAR(20);
ALTER TABLE inventory_items ADD COLUMN uom_fbr VARCHAR(50); -- FBR unit of measure
```

---

## New Files to Create (When Implementing)

```
lib/
├── fbr/
│   ├── fbr-client.ts          ← API calls to FBR endpoint
│   ├── fbr-payload-builder.ts ← Build JSON payload from our sale data
│   ├── fbr-qr-generator.ts    ← Generate QR from IRN
│   └── fbr-types.ts           ← TypeScript interfaces for FBR API

app/(app)/pos/
├── settings/
│   └── page.tsx               ← Add FBR settings section (NTN, STRN, token, enable/disable)

components/
└── fbr-invoice-toggle.tsx     ← Checkbox on POS form "Generate FBR Invoice"
```

---

## Changes to Existing Files (When Implementing)

### 1. `app/(app)/pos/actions.ts`
After sale is saved locally:
```typescript
if (posSettings.fbr_enabled) {
  const payload = buildFBRPayload(sale, posSettings);
  const result = await submitToFBR(payload);
  if (result.statusCode === '00') {
    await saveFBRIRN(sale.id, result.invoiceNumber);
  } else {
    // Log failure but don't block the sale
    await saveFBRError(sale.id, result.exception);
  }
}
```

### 2. `lib/pdf/generate-pos-receipt.ts`
If IRN is present:
```typescript
if (sale.fbr_irn) {
  // Add FBR logo
  // Add IRN number
  // Add QR code from IRN
  // Add NTN/STRN of seller
  // Add buyer NTN/CNIC
  // Show GST breakdown
}
```

### 3. `components/pos-new-sale-form.tsx`
Add optional toggle:
```tsx
<div className="flex items-center gap-2">
  <Switch
    checked={generateFBRInvoice}
    onCheckedChange={setGenerateFBRInvoice}
    disabled={!posSettings.fbr_enabled}
  />
  <Label>Generate FBR Invoice</Label>
</div>
```

---

## POS Settings — FBR Section (UI Plan)

In `app/(app)/pos/settings/page.tsx`, add a new "FBR Integration" section:

```
┌─────────────────────────────────────────┐
│ FBR Digital Invoicing                   │
├─────────────────────────────────────────┤
│ Enable FBR Integration    [Toggle OFF]  │
│                                         │
│ NTN Number         [__________]         │
│ STRN Number        [__________]         │
│ Business Name      [__________]         │
│ Province           [Select ▼]           │
│ Business Address   [__________]         │
│                                         │
│ Default Tax Scenario  [SN026 ▼]         │
│ Default GST Rate      [17%    ]         │
│                                         │
│ API Bearer Token   [••••••••] [Show]    │
│ API Mode           ○ Sandbox  ● Live    │
│                                         │
│ Auto-generate FBR invoice on every sale │
│                              [Toggle]   │
└─────────────────────────────────────────┘
```

---

## Important Gotchas for Implementation

1. **Static IP required** — Vercel functions have dynamic IPs by default. Need to either:
   - Use a static IP proxy service (e.g., Quotaguard Static via Vercel Marketplace)
   - Or use a dedicated server/VPS as FBR API relay
   
2. **`extraTax` must be `""` not `0`** — FBR validation fails if you send `0` for inapplicable fields

3. **Never print receipt before IRN returned** — QR code depends on it

4. **FBR API can be slow** — average 2 seconds. Show loading state during submission

5. **Offline handling** — if FBR API is down, save sale locally and retry. FBR allows queued submission

6. **HS codes per product** — each inventory item needs an HS code for FBR. This is a big UX challenge — need to help users find their HS codes

7. **Buyer CNIC for walk-in** — FBR requires buyer NTN/CNIC even for unregistered buyers. Use a generic CNIC (e.g., `0000000000000`) for anonymous walk-in customers, or ask cashier to enter buyer CNIC

8. **`invoiceRefNo` must be globally unique** — use UUID or `POS-{userId}-{timestamp}-{sequence}`

---

## Sandbox Testing Process

Before going live, PRAL requires you to test all 28 scenarios in sandbox:

1. Get sandbox token from IRIS portal
2. Test SN026 (our main scenario) first
3. Submit test results to PRAL
4. PRAL reviews and issues production token

For our app, we only need to test SN026 initially since most retail users will use standard rate.

---

## Pre-Integration Checklist (Before Starting Dev)

- [ ] User (business owner) has NTN registered with FBR
- [ ] User has STRN (Sales Tax Registration Number)
- [ ] Server has a static IP (check Vercel static IP solution)
- [ ] FBR IRIS portal access — get sandbox Bearer token
- [ ] Understand which HS codes apply to user's products
- [ ] Test with sandbox before touching production

---

## Official Resources

| Resource | URL |
|----------|-----|
| FBR DI API Technical Spec v1.12 | https://download1.fbr.gov.pk/Docs/20257301172130815TechnicalDocumentationforDIAPIV1.12.pdf |
| FBR POS Technical Assistance | https://fbr.gov.pk/pos-technical-assistance/163085/163087 |
| FBR IRIS Portal (credentials) | https://iris.fbr.gov.pk |
| FBR Invoice Verification | https://www.fbr.gov.pk/pos-invoice-verification/163085/163142 |
| PRAL Support | sales@pral.com.pk / 051-111-772-772 |
| Tax Asaan App (buyer verification) | Android/iOS — "Tax Asaan" |
| Scenario Testing Guide | https://logiclayer.com.pk/blog/fbr-invoice-scenario-testing-guide |

---

## Summary: What Changes in POS Flow

**Before FBR:**
```
Cashier adds items → Enters payment → Sale saved → Receipt printed
```

**After FBR (for STRN-registered businesses):**
```
Cashier adds items → Enters payment → [Optional: toggle FBR invoice]
→ Sale saved locally → POST to FBR API → Receive IRN
→ Generate QR from IRN → Print receipt with IRN + QR + NTN/STRN
```

**Key design decision:** FBR failure should NOT block the sale. If FBR API is down, save the sale, mark FBR status as "pending", and retry in background. Sales must not be blocked by third-party API availability.
