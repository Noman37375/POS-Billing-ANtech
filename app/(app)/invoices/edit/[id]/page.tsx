import { InvoiceForm } from "@/components/invoice-form"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseReady } from "@/lib/supabase/config"
import { mockInventory, mockParties, mockInvoices } from "@/lib/supabase/mock"
import { getInvoiceForEdit } from "@/app/(app)/invoices/actions"
import { notFound } from "next/navigation"
import { requirePrivilege } from "@/lib/auth/privileges"

export default async function InvoiceEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePrivilege("invoices_create")
  const { id } = await params
  const invoiceId = id

  // Fetch invoice data for editing
  const invoiceData = await (async () => {
    if (!isSupabaseReady()) {
      // Mock mode - return mock invoice data
      const mockInvoice = mockInvoices.find((inv) => inv.id === invoiceId)
      if (!mockInvoice) return null
      return {
        id: mockInvoice.id,
        partyId: mockParties[0]?.id || "",
        status: mockInvoice.status || "Draft",
        taxRate: 18,
        items: [
          {
            itemId: mockInventory[0]?.id || "",
            quantity: 1,
            unitPrice: (mockInventory[0] as { selling_price?: number })?.selling_price ?? mockInventory[0]?.unit_price ?? 0,
          },
        ],
      }
    }
    const result = await getInvoiceForEdit(invoiceId)
    if (result.error || !result.data) return null
    return result.data
  })()

  if (!invoiceData) {
    notFound()
  }

  // Fetch parties and inventory
  const parties = await (async () => {
    if (!isSupabaseReady()) return mockParties.map((p) => ({ id: p.id, name: p.name }))
    const { getSessionOrRedirect } = await import("@/lib/auth")
    const currentUser = await getSessionOrRedirect()
    const supabase = createClient()
    const { data = [] } = await supabase.from("parties").select("id, name").eq("user_id", currentUser.effectiveUserId)
    return (data || []).map((p) => ({ id: p.id, name: p.name || "" }))
  })()

  const inventory = await (async () => {
    if (!isSupabaseReady())
      return mockInventory.map((i) => ({ id: i.id, name: i.name, stock: i.stock, unitPrice: (i as { selling_price?: number }).selling_price ?? i.unit_price }))
    const { getSessionOrRedirect } = await import("@/lib/auth")
    const currentUser = await getSessionOrRedirect()
    const supabase = createClient()
    const { data = [] } = await supabase
      .from("inventory_items")
      .select("id, name, stock, selling_price")
      .eq("user_id", currentUser.effectiveUserId)
    return (data || []).map((item) => ({
      id: item.id,
      name: item.name || "",
      stock: item.stock || 0,
      unitPrice: (item as { selling_price?: number }).selling_price ?? (item as { unit_price?: number }).unit_price ?? 0,
    }))
  })()

  return (
    <InvoiceForm
      parties={parties}
      inventory={inventory}
      invoiceId={invoiceId}
      initialPartyId={invoiceData.partyId}
      initialItems={invoiceData.items}
      initialStatus={invoiceData.status}
      initialTaxRate={invoiceData.taxRate}
    />
  )
}

