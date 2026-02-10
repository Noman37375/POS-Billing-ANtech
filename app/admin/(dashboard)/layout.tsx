import type { ReactNode } from "react"
import { AdminHeader } from "@/components/admin-header"
import { AdminSidebar } from "@/components/admin-sidebar"
import { getAdminSessionOrRedirect } from "@/lib/auth"
import { Toaster } from "@/components/ui/sonner"

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const admin = await getAdminSessionOrRedirect("/admin/login")

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/40 to-background flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader adminEmail={admin.email} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto w-full space-y-4 sm:space-y-6">{children}</div>
        </main>
      </div>
      <Toaster />
    </div>
  )
}
