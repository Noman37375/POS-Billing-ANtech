"use server"

import { createClient } from "@/lib/supabase/server"
import { getSessionOrRedirect } from "@/lib/auth"
import { getPurchases } from "@/app/(app)/purchases/actions"
import { getAllPurchasePayments } from "@/app/(app)/purchases/actions"

export async function getPurchaseSummary() {
  const supabase = createClient()

  // Get all purchases
  const purchasesResult = await getPurchases()
  const purchases = purchasesResult.data || []

  // Get all payments
  const paymentsResult = await getAllPurchasePayments()
  const payments = paymentsResult.data || []

  // Calculate totals (excluding cancelled purchases)
  const totalPurchases = purchases
    .filter((p) => p.status !== "Cancelled")
    .reduce((sum, p) => sum + Number(p.total || 0), 0)

  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)

  const outstandingPayables = totalPurchases - totalPayments
  const totalPurchaseCount = purchases.filter((p) => p.status !== "Cancelled").length

  return {
    totalPurchases,
    totalPayments,
    outstandingPayables,
    totalPurchaseCount,
  }
}

export async function getPurchaseTrends(dateFrom?: string, dateTo?: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  let query = supabase
    .from("purchase_invoices")
    .select("id, total, created_at, status")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })

  if (dateFrom) {
    query = query.gte("created_at", dateFrom)
  }
  if (dateTo) {
    query = query.lte("created_at", dateTo)
  }

  const { data, error } = await query

  if (error) {
    return { error: error.message, data: [] }
  }

  // Group by date
  const trends: Record<string, { count: number; total: number }> = {}

  ;(data || []).forEach((purchase) => {
    if (purchase.status === "Cancelled") return

    const date = new Date(purchase.created_at).toISOString().split("T")[0]
    if (!trends[date]) {
      trends[date] = { count: 0, total: 0 }
    }
    trends[date].count++
    trends[date].total += Number(purchase.total || 0)
  })

  const trendsArray = Object.entries(trends)
    .map(([date, data]) => ({
      date,
      count: data.count,
      total: data.total,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30) // Last 30 days

  return { error: null, data: trendsArray }
}

export async function getTopVendors(limit: number = 10) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data, error } = await supabase
    .from("purchase_invoices")
    .select(
      `
      id,
      total,
      parties:party_id (
        id,
        name
      )
    `,
    )
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })

  if (error) {
    return { error: error.message, data: [] }
  }

  // Group by vendor
  const vendorMap: Record<string, { name: string; count: number; total: number }> = {}

  ;(data || []).forEach((purchase: any) => {
    const partyData = purchase.parties
      ? (Array.isArray(purchase.parties) ? purchase.parties[0] : purchase.parties)
      : null
    const vendorId = partyData?.id || ""
    const vendorName = (partyData as { name?: string })?.name || "Unknown"

    if (!vendorMap[vendorId]) {
      vendorMap[vendorId] = { name: vendorName, count: 0, total: 0 }
    }
    vendorMap[vendorId].count++
    vendorMap[vendorId].total += Number(purchase.total || 0)
  })

  const topVendors = Object.values(vendorMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .map((vendor, index) => ({
      rank: index + 1,
      name: vendor.name,
      purchaseCount: vendor.count,
      totalAmount: vendor.total,
    }))

  return { error: null, data: topVendors }
}

export async function getPurchasePaymentSummary() {
  const supabase = createClient()

  const purchasesResult = await getPurchases()
  const purchases = purchasesResult.data || []

  const paymentsResult = await getAllPurchasePayments()
  const payments = paymentsResult.data || []

  // Group payments by purchase invoice
  const paymentMap: Record<string, number> = {}
  payments.forEach((payment) => {
    const purchaseId = payment.purchaseInvoiceId
    if (!paymentMap[purchaseId]) {
      paymentMap[purchaseId] = 0
    }
    paymentMap[purchaseId] += Number(payment.amount || 0)
  })

  // Create summary
  const summary = purchases
    .filter((p) => p.status !== "Cancelled")
    .map((purchase) => {
      const paymentRecordAmount = paymentMap[purchase.id] || 0
      const totalAmount = Number(purchase.total || 0)
      const purchaseStatus = purchase.status || "Draft"

      // If purchase invoice status is "Paid", consider it as fully paid regardless of payment records
      let paidAmount: number
      let outstanding: number
      let status: string

      if (purchaseStatus === "Paid") {
        // Purchase status is "Paid" - treat as fully paid
        paidAmount = totalAmount
        outstanding = 0
        status = "Paid"
      } else {
        // Calculate based on actual payment records
        paidAmount = paymentRecordAmount
        outstanding = totalAmount - paidAmount

        if (outstanding <= 0) {
          status = "Paid"
        } else if (outstanding === totalAmount) {
          status = "Unpaid"
        } else {
          status = "Partial"
        }
      }

      return {
        purchaseId: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        vendorName: purchase.vendorName,
        totalAmount,
        paidAmount,
        outstanding,
        status,
      }
    })
    .sort((a, b) => b.outstanding - a.outstanding)

  return { error: null, data: summary }
}
