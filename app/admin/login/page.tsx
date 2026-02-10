import { redirect } from "next/navigation"
import { getAdminSession } from "@/lib/auth/admin-session"
import { AdminAuthForm } from "@/components/admin-auth-form"

export default async function AdminLoginPage() {
  // If already logged in as admin, redirect to dashboard
  const admin = await getAdminSession()
  if (admin) {
    redirect("/admin/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/40 to-background p-4">
      <div className="w-full max-w-md">
        <AdminAuthForm />
      </div>
    </div>
  )
}
