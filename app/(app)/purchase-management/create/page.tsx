import { PurchaseForm } from "@/components/purchase-form"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseReady } from "@/lib/supabase/config"
import { mockInventory, mockParties } from "@/lib/supabase/mock"
import { requirePrivilege } from "@/lib/auth/privileges"

export default async function PurchaseCreatePage() {
  await requirePrivilege("purchases")

  if (!isSupabaseReady()) {
    return (
      <PurchaseForm
        parties={mockParties.filter((p) => p.type === "Vendor").map((p) => ({ id: p.id, name: p.name }))}
        inventory={mockInventory.map((i) => ({ id: i.id, name: i.name, stock: i.stock, unitPrice: (i as { cost_price?: number }).cost_price ?? i.unit_price }))}
      />
    )
  }

  const { getSessionOrRedirect } = await import("@/lib/auth")
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()
  const [{ data: parties = [] }, { data: inventory = [] }] = await Promise.all([
    supabase.from("parties").select("id, name, type").eq("type", "Vendor").eq("user_id", currentUser.effectiveUserId),
    supabase.from("inventory_items").select("id, name, stock, cost_price").eq("user_id", currentUser.effectiveUserId),
  ])

  const normalizedInventory = (inventory || []).map((item) => ({
    id: item.id,
    name: item.name || "",
    stock: item.stock || 0,
    unitPrice: (item as { cost_price?: number }).cost_price ?? (item as { unit_price?: number }).unit_price ?? 0,
  }))

  return (
    <PurchaseForm
      parties={(parties || []).map((p) => ({ id: p.id, name: p.name || "" }))}
      inventory={normalizedInventory}
    />
  )
}
