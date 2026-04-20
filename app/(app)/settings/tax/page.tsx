import { requirePrivilege } from "@/lib/auth/privileges"
import { getAllSettings } from "@/app/(app)/settings/actions"
import { TaxSettingsForm } from "@/components/settings/tax-settings-form"

export default async function TaxSettingsPage() {
  await requirePrivilege("dashboard")
  const settings = await getAllSettings()
  return <TaxSettingsForm settings={settings} />
}
