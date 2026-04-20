import { requirePrivilege } from "@/lib/auth/privileges"
import { getAllSettings } from "@/app/(app)/settings/actions"
import { InvoiceSettingsForm } from "@/components/settings/invoice-settings-form"

export default async function InvoiceSettingsPage() {
  await requirePrivilege("dashboard")
  const settings = await getAllSettings()
  return <InvoiceSettingsForm settings={settings} />
}
