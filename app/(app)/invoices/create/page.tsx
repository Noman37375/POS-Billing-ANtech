import { InvoiceForm } from "@/components/invoice-form"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseReady } from "@/lib/supabase/config"
import { mockInventory, mockParties } from "@/lib/supabase/mock"
import { requirePrivilege } from "@/lib/auth/privileges"

export default async function InvoiceCreatePage() {
  // Check if user has invoices_create privilege
  await requirePrivilege("invoices_create")
  if (!isSupabaseReady()) {
    return (
      <InvoiceForm
        parties={mockParties.map((p) => ({ id: p.id, name: p.name }))}
        inventory={mockInventory.map((i) => ({ id: i.id, name: i.name, stock: i.stock, unitPrice: (i as { selling_price?: number }).selling_price ?? i.unit_price }))}
      />
    )
  }

  const { getSessionOrRedirect } = await import("@/lib/auth")
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()
  const [{ data: parties = [] }, { data: inventory = [] }] = await Promise.all([
    supabase.from("parties").select("id, name").eq("user_id", currentUser.id),
    supabase.from("inventory_items").select("id, name, stock, selling_price").eq("user_id", currentUser.id),
  ])

  const normalizedInventory = (inventory || []).map((item) => ({
    id: item.id,
    name: item.name || "",
    stock: item.stock || 0,
    unitPrice: (item as { selling_price?: number }).selling_price ?? (item as { unit_price?: number }).unit_price ?? 0,
  }))

  return (
    <InvoiceForm
      parties={(parties || []).map((p) => ({ id: p.id, name: p.name || "" }))}
      inventory={normalizedInventory}
    />
  )
}

