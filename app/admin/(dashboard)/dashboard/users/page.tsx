import { getAdminSessionOrRedirect } from "@/lib/auth"
import { fetchPosUsers } from "./actions"
import { AdminPosUsersList } from "@/components/admin-pos-users-list"

export default async function AdminUsersPage() {
  await getAdminSessionOrRedirect()
  const posUsers = await fetchPosUsers()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">POS Users Management</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Create and manage POS users with full privilege control</p>
        </div>
      </div>

      <AdminPosUsersList initialUsers={posUsers} />
    </div>
  )
}
