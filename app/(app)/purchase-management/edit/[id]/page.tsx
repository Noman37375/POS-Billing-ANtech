import { PurchaseForm } from "@/components/purchase-form"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseReady } from "@/lib/supabase/config"
import { mockInventory, mockParties } from "@/lib/supabase/mock"
import { getPurchaseForEdit } from "@/app/(app)/purchases/actions"
import { notFound } from "next/navigation"
import { requirePrivilege } from "@/lib/auth/privileges"

export default async function PurchaseEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePrivilege("parties")
  const { id } = await params
  const purchaseId = id

  // Fetch purchase data for editing
  const purchaseData = await (async () => {
    if (!isSupabaseReady()) {
      return {
        id: purchaseId,
        partyId: mockParties.filter((p) => p.type === "Vendor")[0]?.id || "",
        status: "Draft",
        taxRate: 18,
        items: [
          {
            itemId: mockInventory[0]?.id || "",
            quantity: 1,
            unitPrice: (mockInventory[0] as { cost_price?: number })?.cost_price ?? mockInventory[0]?.unit_price ?? 0,
          },
        ],
      }
    }
    const result = await getPurchaseForEdit(purchaseId)
    if (result.error || !result.data) return null
    return result.data
  })()

  if (!purchaseData) {
    notFound()
  }

  // Fetch vendors and inventory
  const parties = await (async () => {
    if (!isSupabaseReady())
      return mockParties.filter((p) => p.type === "Vendor").map((p) => ({ id: p.id, name: p.name }))
    const { getSessionOrRedirect } = await import("@/lib/auth")
    const currentUser = await getSessionOrRedirect()
    const supabase = createClient()
    const { data = [] } = await supabase
      .from("parties")
      .select("id, name, type")
      .eq("type", "Vendor")
      .eq("user_id", currentUser.id)
    return (data || []).map((p) => ({ id: p.id, name: p.name || "" }))
  })()

  const inventory = await (async () => {
    if (!isSupabaseReady())
      return mockInventory.map((i) => ({ id: i.id, name: i.name, stock: i.stock, unitPrice: (i as { cost_price?: number }).cost_price ?? i.unit_price }))
    const { getSessionOrRedirect } = await import("@/lib/auth")
    const currentUser = await getSessionOrRedirect()
    const supabase = createClient()
    const { data = [] } = await supabase
      .from("inventory_items")
      .select("id, name, stock, cost_price")
      .eq("user_id", currentUser.id)
    return (data || []).map((item) => ({
      id: item.id,
      name: item.name || "",
      stock: item.stock || 0,
      unitPrice: (item as { cost_price?: number }).cost_price ?? (item as { unit_price?: number }).unit_price ?? 0,
    }))
  })()

  return (
    <PurchaseForm
      parties={parties}
      inventory={inventory}
      purchaseId={purchaseId}
      initialPartyId={purchaseData.partyId}
      initialItems={purchaseData.items}
      initialStatus={purchaseData.status}
      initialTaxRate={purchaseData.taxRate}
    />
  )
}
