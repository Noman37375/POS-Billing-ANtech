import { requirePrivilege } from "@/lib/auth/privileges"
import { EmployeeManagementSubNav } from "@/components/employee-management-sub-nav"

export default async function EmployeeManagementLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requirePrivilege("employees_payroll")
  return (
    <div className="space-y-4 sm:space-y-6">
      <EmployeeManagementSubNav />
      {children}
    </div>
  )
}
