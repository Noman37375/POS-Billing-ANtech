import { getAdminSessionOrRedirect } from "@/lib/auth"
import { getAllPosUsers } from "@/lib/db/users"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Plus } from "lucide-react"

export default async function AdminDashboardPage() {
  await getAdminSessionOrRedirect()
  const posUsers = await getAllPosUsers()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">Admin Dashboard</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage POS users and their privileges</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total POS Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{posUsers.length}</div>
            <p className="text-xs text-muted-foreground">Active POS user accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {posUsers.filter((u) => u.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Quick Actions</CardTitle>
            <Link href="/admin/dashboard/users">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Manage POS Users
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Create, edit, and manage POS users. Assign privileges to control access to different modules.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
