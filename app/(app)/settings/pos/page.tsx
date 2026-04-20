import { requirePrivilege } from "@/lib/auth/privileges"
import { getAllSettings } from "@/app/(app)/settings/actions"
import { POSPreferencesForm } from "@/components/settings/pos-preferences-form"

export default async function POSPreferencesPage() {
  await requirePrivilege("pos")
  const settings = await getAllSettings()
  return <POSPreferencesForm settings={settings} />
}
