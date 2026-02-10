import { redirect } from "next/navigation"
import { requirePrivilege } from "@/lib/auth/privileges"

export default async function AccountsManagementPage() {
  await requirePrivilege("accounts")
  redirect("/accounts-management/overview")
}
