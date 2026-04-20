import { requirePrivilege } from "@/lib/auth/privileges"
import { getAllSettings } from "@/app/(app)/settings/actions"
import { NotificationsForm } from "@/components/settings/notifications-form"

export default async function NotificationsPage() {
  await requirePrivilege("dashboard")
  const settings = await getAllSettings()
  return <NotificationsForm settings={settings} />
}
