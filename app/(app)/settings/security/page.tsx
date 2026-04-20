import { requirePrivilege } from "@/lib/auth/privileges"
import { SecurityForm } from "@/components/settings/security-form"

export default async function SecurityPage() {
  await requirePrivilege("dashboard")
  return <SecurityForm />
}
