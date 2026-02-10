import { getSessionOrRedirect } from "@/lib/auth"
import { fetchUsers } from "./actions"
import { UsersList } from "@/components/users-list"

export default async function UsersPage() {
  const user = await getSessionOrRedirect()

  // Only admin can access this page
  if (user.role !== "pos_user") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Only admin users can access user management.</p>
        </div>
      </div>
    )
  }

  const users = await fetchUsers()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">User Management</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage sub-users and their privileges</p>
        </div>
      </div>

      <UsersList initialUsers={users} />
    </div>
  )
}
