import { requirePrivilege } from "@/lib/auth/privileges"
import { POSSubNav } from "@/components/pos-sub-nav"

export default async function POSLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requirePrivilege("pos")
  return (
    <div className="space-y-4 sm:space-y-6">
      <POSSubNav />
      {children}
    </div>
  )
}
