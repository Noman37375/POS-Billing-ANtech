// POS models mapping to DB (sales_invoices, sales_invoice_lines, payments)

export type SaleSource = "manual" | "pos"
export type PaymentMethod = "Cash" | "Card" | "JazzCash" | "EasyPaisa" | "Mixed" | "Other"

export interface Sale {
  id: string
  party_id: string
  subtotal: number
  tax: number
  total: number
  status: string
  source: SaleSource
  created_at: string
  updated_at?: string
  party?: { name: string; phone?: string }
  items?: SaleItem[]
  payments?: Payment[]
}

export interface SaleItem {
  id: string
  invoice_id: string
  item_id: string
  quantity: number
  unit_price: number
  line_total: number
  created_at?: string
  item_name?: string
}

export interface Payment {
  id: string
  invoice_id: string
  amount: number
  method: PaymentMethod
  reference?: string | null
  created_at: string
}

export interface InvoiceForPrint {
  id: string
  invoiceNumber: string
  date: string
  party: { name: string; phone?: string; address?: string } | null
  subtotal: number
  discount: number
  tax: number
  total: number
  status: string
  items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number }>
  payments?: Payment[]
  currency?: string
  // Extended fields for standard NCR receipt
  cashier?: string
  store?: {
    name: string
    address?: string
    phone?: string
    email?: string
  }
  transactionId?: string // Same as invoiceNumber or formatted differently
}

// DTOs for creating a POS sale
export interface POSSaleItemInput {
  itemId: string
  quantity: number
  unitPrice: number
}

export interface POSPaymentInput {
  amount: number
  method: PaymentMethod
  reference?: string
}

export interface CreatePOSSaleInput {
  partyId: string
  items: POSSaleItemInput[]
  taxRate?: number
  discount?: number
  payments?: POSPaymentInput[]
  status?: "Draft" | "Credit" | "Paid" | "Pending"
}
