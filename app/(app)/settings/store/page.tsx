import { requirePrivilege } from "@/lib/auth/privileges"
import { getAllSettings } from "@/app/(app)/settings/actions"
import { StoreProfileForm } from "@/components/settings/store-profile-form"

export default async function StoreSettingsPage() {
  await requirePrivilege("dashboard")
  const settings = await getAllSettings()
  return <StoreProfileForm settings={settings} />
}
