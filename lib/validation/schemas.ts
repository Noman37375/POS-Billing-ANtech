import { z } from "zod"

/**
 * Comprehensive Validation Schemas for POS-Billing
 * All user inputs should be validated against these schemas
 */

// ==================== COMMON VALIDATORS ====================

// Email validation
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email format")
  .toLowerCase()
  .trim()

// Phone validation (flexible - supports various formats)
export const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .regex(/^[\d\s\-\+\(\)]*$/, "Phone number can only contain digits, spaces, dashes, and parentheses")
  .min(7, "Phone number must be at least 7 digits")
  .max(20, "Phone number must not exceed 20 characters")
  .transform((val) => val.replace(/\s/g, "")) // Remove spaces

// Password validation
export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(100, "Password must not exceed 100 characters")

// Name validation
export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(255, "Name must not exceed 255 characters")
  .trim()

// Quantity validation (positive number)
export const quantitySchema = z
  .number()
  .positive("Quantity must be greater than 0")
  .refine((val) => val > 0, "Quantity must be greater than 0")

// Price validation (non-negative number)
export const priceSchema = z
  .number()
  .nonnegative("Price must be greater than or equal to 0")
  .max(999999.99, "Price must not exceed 999,999.99")

// Cost price validation (must be > 0)
export const costPriceSchema = z
  .number()
  .positive("Cost price must be greater than 0")
  .max(999999.99, "Cost price must not exceed 999,999.99")

// Selling price validation (must be > 0)
export const sellingPriceSchema = z
  .number()
  .positive("Selling price must be greater than 0")
  .max(999999.99, "Selling price must not exceed 999,999.99")

// Barcode validation
export const barcodeSchema = z
  .string()
  .min(1, "Barcode is required")
  .max(50, "Barcode must not exceed 50 characters")
  .regex(/^[a-zA-Z0-9\-_]*$/, "Barcode can only contain alphanumeric characters, dashes, and underscores")

// SKU validation
export const skuSchema = z
  .string()
  .max(50, "SKU must not exceed 50 characters")
  .regex(/^[a-zA-Z0-9\-_]*$/, "SKU can only contain alphanumeric characters, dashes, and underscores")
  .optional()

// UUID validation
export const uuidSchema = z.string().uuid("Invalid ID format")

// Tax rate validation (0-100%)
export const taxRateSchema = z
  .number()
  .min(0, "Tax rate must be 0 or greater")
  .max(100, "Tax rate must not exceed 100%")
  .default(18)

// ==================== AUTHENTICATION SCHEMAS ====================

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
})

export const changePasswordSchema = z
  .object({
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

// ==================== PARTY (CUSTOMER/VENDOR) SCHEMAS ====================

export const partySchema = z.object({
  id: uuidSchema.optional(),
  name: nameSchema,
  email: emailSchema.optional().or(z.literal("")),
  phone: phoneSchema.optional().or(z.literal("")),
  address: z.string().max(500, "Address must not exceed 500 characters").optional().or(z.literal("")),
  city: z.string().max(100, "City must not exceed 100 characters").optional().or(z.literal("")),
  state: z.string().max(50, "State must not exceed 50 characters").optional().or(z.literal("")),
  zip: z.string().max(20, "ZIP code must not exceed 20 characters").optional().or(z.literal("")),
})

export const createPartySchema = partySchema.omit({ id: true })
export const updatePartySchema = partySchema

// ==================== INVENTORY SCHEMAS ====================

export const inventoryItemSchema = z.object({
  id: uuidSchema.optional(),
  name: nameSchema,
  sku: skuSchema,
  barcode: barcodeSchema.optional().or(z.literal("")),
  description: z.string().max(1000, "Description must not exceed 1000 characters").optional().or(z.literal("")),
  category_id: uuidSchema.optional().or(z.literal("")),
  unit_id: uuidSchema.optional().or(z.literal("")),
  cost_price: costPriceSchema,
  selling_price: sellingPriceSchema,
  stock: quantitySchema.or(z.literal(0)).catch(0),
  minimum_stock: z.number().nonnegative("Minimum stock must be 0 or greater").optional(),
  maximum_stock: z.number().nonnegative("Maximum stock must be 0 or greater").optional(),
})
  .refine((data) => data.selling_price >= data.cost_price, {
    message: "Selling price must be greater than or equal to cost price",
    path: ["selling_price"],
  })
  .refine(
    (data) =>
      data.maximum_stock === undefined ||
      data.minimum_stock === undefined ||
      data.maximum_stock >= data.minimum_stock,
    {
      message: "Maximum stock must be greater than or equal to minimum stock",
      path: ["maximum_stock"],
    },
  )

export const createInventoryItemSchema = inventoryItemSchema.omit({ id: true })
export const updateInventoryItemSchema = inventoryItemSchema

// ==================== INVOICE SCHEMAS ====================

export const invoiceLineItemSchema = z.object({
  itemId: uuidSchema,
  quantity: quantitySchema,
  unitPrice: priceSchema,
})

export const createInvoiceSchema = z.object({
  partyId: uuidSchema,
  items: z.array(invoiceLineItemSchema).min(1, "At least one line item is required"),
  taxRate: taxRateSchema,
  status: z.enum(["Draft", "Pending", "Paid", "Cancelled"]).optional().default("Draft"),
})

export const updateInvoiceSchema = createInvoiceSchema

// ==================== POS SCHEMAS ====================

export const paymentMethodSchema = z.enum(["Cash", "Card", "Mixed", "Other"])

export const posPaymentSchema = z.object({
  amount: z.number().positive("Payment amount must be greater than 0"),
  method: paymentMethodSchema,
  reference: z.string().max(100, "Reference must not exceed 100 characters").optional(),
})

export const createPOSSaleSchema = z.object({
  partyId: uuidSchema,
  items: z.array(invoiceLineItemSchema).min(1, "At least one line item is required"),
  payments: z.array(posPaymentSchema).min(1, "At least one payment is required"),
  taxRate: taxRateSchema,
})

// ==================== PURCHASE SCHEMAS ====================

export const purchaseLineItemSchema = z.object({
  itemId: uuidSchema,
  quantity: quantitySchema,
  unitPrice: priceSchema,
})

export const createPurchaseSchema = z.object({
  partyId: uuidSchema,
  items: z.array(purchaseLineItemSchema).min(1, "At least one line item is required"),
  taxRate: taxRateSchema,
  status: z.enum(["Draft", "Pending", "Paid", "Cancelled"]).optional().default("Draft"),
})

export const updatePurchaseSchema = createPurchaseSchema

// ==================== RETURN SCHEMAS ====================

export const returnLineItemSchema = z.object({
  itemId: uuidSchema,
  quantity: quantitySchema,
  unitPrice: priceSchema,
  salesInvoiceLineId: uuidSchema.optional(),
  purchaseInvoiceLineId: uuidSchema.optional(),
})

export const refundSchema = z.object({
  amount: z.number().positive("Refund amount must be greater than 0"),
  method: paymentMethodSchema,
  reference: z.string().max(100, "Reference must not exceed 100 characters").optional(),
})

export const createSaleReturnSchema = z.object({
  sales_invoice_id: uuidSchema,
  party_id: uuidSchema,
  items: z.array(returnLineItemSchema).min(1, "At least one line item is required"),
  taxRate: taxRateSchema,
  refunds: z.array(refundSchema).optional(),
})

export const createPurchaseReturnSchema = z.object({
  purchase_invoice_id: uuidSchema,
  party_id: uuidSchema,
  items: z.array(returnLineItemSchema).min(1, "At least one line item is required"),
  taxRate: taxRateSchema,
  refunds: z.array(refundSchema).optional(),
})

// ==================== HELPER FUNCTIONS ====================

/**
 * Safely parse and validate data
 * Returns { success: boolean, data?: T, error?: string }
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; error?: string } {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return {
        success: false,
        error: `${firstError.path.join(".")}: ${firstError.message}`,
      }
    }
    return { success: false, error: "Validation failed" }
  }
}

/**
 * Safely parse and validate data (non-throwing version)
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; error?: string } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const firstError = result.error.errors[0]
  return {
    success: false,
    error: `${firstError.path.join(".")}: ${firstError.message}`,
  }
}
