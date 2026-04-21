"use server"

import { createClient } from "@/lib/supabase/server"
import { getSessionOrRedirect } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Electricity",
  "Gas / Fuel",
  "Internet / Phone",
  "Salaries & Wages",
  "Transport",
  "Repairs & Maintenance",
  "Supplies & Stationery",
  "Marketing & Advertising",
  "Bank Charges",
  "Miscellaneous",
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number] | string

export interface Expense {
  id: string
  date: string
  category: string
  description: string | null
  amount: number
  payment_method: string
  reference: string | null
  created_at: string
}

export async function getExpenses(
  dateFrom?: string,
  dateTo?: string
): Promise<{ error: string | null; data: Expense[] }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  let q = supabase
    .from("expenses")
    .select("id, date, category, description, amount, payment_method, reference, created_at")
    .eq("user_id", currentUser.effectiveUserId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })

  if (dateFrom) q = q.gte("date", dateFrom)
  if (dateTo) q = q.lte("date", dateTo)

  const { data, error } = await q.limit(500)
  if (error) return { error: error.message, data: [] }
  return { error: null, data: (data || []) as Expense[] }
}

export async function createExpense(input: {
  date: string
  category: string
  description?: string
  amount: number
  payment_method?: string
  reference?: string
}): Promise<{ error: string | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { error } = await supabase.from("expenses").insert({
    user_id: currentUser.effectiveUserId,
    date: input.date,
    category: input.category,
    description: input.description || null,
    amount: input.amount,
    payment_method: input.payment_method || "Cash",
    reference: input.reference || null,
  })

  if (error) return { error: error.message }
  revalidatePath("/expenses")
  revalidatePath("/accounts-management/pl-statement")
  return { error: null }
}

export async function updateExpense(
  id: string,
  input: {
    date: string
    category: string
    description?: string
    amount: number
    payment_method?: string
    reference?: string
  }
): Promise<{ error: string | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { error } = await supabase
    .from("expenses")
    .update({
      date: input.date,
      category: input.category,
      description: input.description || null,
      amount: input.amount,
      payment_method: input.payment_method || "Cash",
      reference: input.reference || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", currentUser.effectiveUserId)

  if (error) return { error: error.message }
  revalidatePath("/expenses")
  revalidatePath("/accounts-management/pl-statement")
  return { error: null }
}

export async function deleteExpense(id: string): Promise<{ error: string | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", currentUser.effectiveUserId)

  if (error) return { error: error.message }
  revalidatePath("/expenses")
  revalidatePath("/accounts-management/pl-statement")
  return { error: null }
}

export async function getExpenseSummary(
  dateFrom: string,
  dateTo: string
): Promise<{ error: string | null; data: { totalExpenses: number; byCategory: Record<string, number> } | null }> {
  const { error, data } = await getExpenses(dateFrom, dateTo)
  if (error) return { error, data: null }

  const totalExpenses = data.reduce((sum, e) => sum + Number(e.amount), 0)
  const byCategory: Record<string, number> = {}
  for (const e of data) {
    byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount)
  }

  return { error: null, data: { totalExpenses, byCategory } }
}
