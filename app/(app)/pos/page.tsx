import { createClient } from "@/lib/supabase/server"
import { isSupabaseReady } from "@/lib/supabase/config"
import { mockInventory, mockParties } from "@/lib/supabase/mock"
import { POSNewSaleForm } from "@/components/pos-new-sale-form"

export default async function POSNewSalePage() {
  if (!isSupabaseReady()) {
    return (
      <POSNewSaleForm
        parties={mockParties.map((p) => ({ id: p.id, name: p.name }))}
        inventory={mockInventory.map((i) => ({
          id: i.id,
          name: i.name || "",
          stock: i.stock ?? 0,
          unitPrice: i.unit_price ?? 0,
        }))}
      />
    )
  }

  const { getSessionOrRedirect } = await import("@/lib/auth")
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()
  const [{ data: parties = [] }, { data: inventory = [] }] = await Promise.all([
    supabase.from("parties").select("id, name").eq("type", "Customer").eq("user_id", currentUser.id).order("name"),
    supabase.from("inventory_items").select("id, name, stock, unit_price").eq("user_id", currentUser.id).order("name"),
  ])

  const normalizedInventory = (inventory || []).map((item) => ({
    id: item.id,
    name: (item as { name?: string }).name || "",
    stock: Number((item as { stock?: number }).stock ?? 0),
    unitPrice: Number((item as { unit_price?: number }).unit_price ?? 0),
  }))

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-semibold text-foreground">New Sale</h1>
      <p className="text-xs sm:text-sm text-muted-foreground">Add items, select customer, and complete payment.</p>
      <POSNewSaleForm
        parties={(parties || []).map((p) => ({ id: (p as { id: string }).id, name: (p as { name?: string }).name || "" }))}
        inventory={normalizedInventory}
      />
    </div>
  )
}
