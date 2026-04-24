import { createClient } from "@/lib/supabase/server"
import { isSupabaseReady } from "@/lib/supabase/config"
import { mockInventory, mockParties } from "@/lib/supabase/mock"
import { POSNewSaleForm } from "@/components/pos-new-sale-form"
import { requirePrivilege } from "@/lib/auth/privileges"
import { getSessionOrRedirect } from "@/lib/auth"
import { getPOSSaleForEdit, getOrCreateWalkInParty } from "@/app/(app)/pos/actions"

export default async function POSNewSalePage({
  searchParams,
}: {
  searchParams: Promise<{ itemId?: string; autoAdd?: string; editDraft?: string }>
}) {
  await requirePrivilege("pos")
  const params = await searchParams
  const initialItemId = params?.itemId ?? null
  const autoAdd = params?.autoAdd === "true"
  const editDraftId = params?.editDraft ?? null

  if (!isSupabaseReady()) {
    return (
      <POSNewSaleForm
        parties={mockParties.map((p) => ({ id: p.id, name: p.name }))}
        inventory={mockInventory.map((i) => ({
          id: i.id,
          name: i.name || "",
          stock: i.stock ?? 0,
          unitPrice: (i as { selling_price?: number }).selling_price ?? i.unit_price ?? 0,
        }))}
        initialItemId={initialItemId}
        autoAdd={autoAdd}
      />
    )
  }

  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()
  const [{ data: parties = [] }, { data: inventory = [] }, walkIn] = await Promise.all([
    supabase.from("parties").select("id, name, address").eq("type", "Customer").eq("user_id", currentUser.effectiveUserId).order("name"),
    supabase.from("inventory_items").select("id, name, stock, selling_price, cash_price, credit_price, supplier_price, cost_price").eq("user_id", currentUser.effectiveUserId).order("name"),
    getOrCreateWalkInParty(),
  ])

  const normalizedInventory = (inventory || []).map((item) => ({
    id: item.id,
    name: (item as { name?: string }).name || "",
    stock: Number((item as { stock?: number }).stock ?? 0),
    unitPrice: Number((item as { cash_price?: number }).cash_price ?? (item as { selling_price?: number }).selling_price ?? 0),
    cashPrice: Number((item as { cash_price?: number }).cash_price ?? (item as { selling_price?: number }).selling_price ?? 0),
    creditPrice: Number((item as { credit_price?: number }).credit_price ?? (item as { selling_price?: number }).selling_price ?? 0),
    supplierPrice: Number((item as { supplier_price?: number }).supplier_price ?? (item as { selling_price?: number }).selling_price ?? 0),
    costPrice: Number((item as { cost_price?: number }).cost_price ?? 0),
  }))

  // Load draft for editing if editDraft param is set
  let initialSale: { invoiceId: string; partyId: string; taxRate: number; items: Array<{ itemId: string; quantity: number; unitPrice: number }> } | undefined
  if (editDraftId) {
    const editResult = await getPOSSaleForEdit(editDraftId)
    if (editResult.data) initialSale = editResult.data
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-semibold text-foreground">{initialSale ? "Edit Draft" : "New Sale"}</h1>
      <p className="text-xs sm:text-sm text-muted-foreground">{initialSale ? "Modify the draft sale and save." : "Add items, select customer, and complete payment."}</p>
      <POSNewSaleForm
        parties={(parties || []).map((p) => ({ id: (p as { id: string }).id, name: (p as { name?: string }).name || "", address: (p as { address?: string | null }).address ?? null }))}
        inventory={normalizedInventory}
        initialItemId={initialItemId}
        autoAdd={autoAdd}
        initialSale={initialSale}
        walkInPartyId={walkIn.id}
        isOwner={currentUser.role === "pos_user"}
      />
    </div>
  )
}
