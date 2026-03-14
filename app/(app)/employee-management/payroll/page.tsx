import { requirePrivilege } from "@/lib/auth/privileges"
import { getPayrollRuns } from "../actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Plus } from "lucide-react"
import { PayrollRunsList } from "@/components/payroll-runs-list"
import { requirePrivilege } from "@/lib/auth/privileges"

export default async function PayrollPage() {
  await requirePrivilege("employees_payroll")
  const result = await getPayrollRuns()

  if (result.error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Payroll</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage payroll runs and payments.</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Error loading payroll runs: {result.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const payrollRuns = result.data || []

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Payroll</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Manage payroll runs and payments.</p>
      </div>

      <PayrollRunsList initialRuns={payrollRuns} />
    </div>
  )
}
