import { requirePrivilege } from "@/lib/auth/privileges"
import { getAllSettings } from "@/app/(app)/settings/actions"
import { HardwareForm } from "@/components/settings/hardware-form"

export default async function HardwarePage() {
  await requirePrivilege("dashboard")
  const settings = await getAllSettings()
  return <HardwareForm settings={settings} />
}
