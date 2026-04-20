// Return & Refund types

export type ReturnType = "sale" | "purchase"
export type ReturnStatus = "Draft" | "Completed" | "Cancelled"
export type RefundMethod = "Cash" | "Card" | "JazzCash" | "EasyPaisa" | "Mixed" | "Other"

export interface Return {
  id: string
  return_number: string
  type: ReturnType
  sales_invoice_id: string | null
  purchase_invoice_id: string | null
  party_id: string
  subtotal: number
  tax: number
  total: number
  status: ReturnStatus
  created_at: string
  updated_at: string
  party?: {
    id: string
    name: string
    phone: string
  }
  sales_invoice?: {
    id: string
    total: number
  }
  purchase_invoice?: {
    id: string
    total: number
  }
}

export interface ReturnLine {
  id: string
  return_id: string
  item_id: string
  quantity: number
  unit_price: number
  line_total: number
  sales_invoice_line_id: string | null
  purchase_invoice_line_id: string | null
  created_at: string
  item?: {
    id: string
    name: string
  }
}

export interface Refund {
  id: string
  return_id: string
  amount: number
  method: RefundMethod
  reference: string | null
  created_at: string
  return?: Return
}

export interface CreateSaleReturnInput {
  sales_invoice_id: string
  party_id: string
  items: Array<{
    itemId: string
    quantity: number
    unitPrice: number
    salesInvoiceLineId?: string
  }>
  taxRate?: number
  refunds?: Array<{
    amount: number
    method: RefundMethod
    reference?: string
  }>
}

export interface CreatePurchaseReturnInput {
  purchase_invoice_id: string
  party_id: string
  items: Array<{
    itemId: string
    quantity: number
    unitPrice: number
    purchaseInvoiceLineId?: string
  }>
  taxRate?: number
  refunds?: Array<{
    amount: number
    method: RefundMethod
    reference?: string
  }>
}

export interface CreateRefundInput {
  return_id: string
  amount: number
  method: RefundMethod
  reference?: string
}

export interface ReturnWithDetails extends Return {
  lines: ReturnLine[]
  refunds: Refund[]
  total_refunded: number
}
