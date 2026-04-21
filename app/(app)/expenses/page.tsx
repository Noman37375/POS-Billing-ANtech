import { requirePrivilege } from "@/lib/auth/privileges"
import { getExpenses } from "./actions"
import { ExpensesClient } from "./expenses-client"

export default async function ExpensesPage() {
  await requirePrivilege("accounts")

  const today = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().split("T")[0]
  const monthStart = `${today.substring(0, 7)}-01`

  const result = await getExpenses(monthStart, today)

  return (
    <ExpensesClient
      initialExpenses={result.data || []}
      initialDateFrom={monthStart}
      initialDateTo={today}
    />
  )
}
