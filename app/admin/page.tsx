import { redirect } from "next/navigation"
import { getAdminSession } from "@/lib/auth/admin-session"

export default async function AdminPage() {
  const admin = await getAdminSession()
  
  if (admin) {
    redirect("/admin/dashboard")
  } else {
    redirect("/admin/login")
  }
}
