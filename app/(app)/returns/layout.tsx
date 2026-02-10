import { requirePrivilege } from "@/lib/auth/privileges"
import { ReturnsSubNav } from "@/components/returns-sub-nav"

export default async function ReturnsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requirePrivilege("returns_refunds")
  return (
    <div className="space-y-4 sm:space-y-6">
      <ReturnsSubNav />
      {children}
    </div>
  )
}
