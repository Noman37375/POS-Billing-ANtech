import { requirePrivilege } from "@/lib/auth/privileges"
import { getAllSettings } from "@/app/(app)/settings/actions"
import { AppearanceForm } from "@/components/settings/appearance-form"

export default async function AppearancePage() {
  await requirePrivilege("dashboard")
  const settings = await getAllSettings()
  return <AppearanceForm settings={settings} />
}
