"use client"

import { useState, useTransition } from "react"
import { Plus, UserCog, Edit, Trash2, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PosUser } from "@/lib/types/user"
import { AdminPosUserDialog } from "@/components/admin-pos-user-dialog"
import { removePosUser } from "@/app/admin/(dashboard)/dashboard/users/actions"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface AdminPosUsersListProps {
  initialUsers: PosUser[]
}

export function AdminPosUsersList({ initialUsers }: AdminPosUsersListProps) {
  const [users, setUsers] = useState<PosUser[]>(initialUsers)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<PosUser | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleCreate = () => {
    setEditingUser(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (user: PosUser) => {
    setEditingUser(user)
    setIsDialogOpen(true)
  }

  const handleDelete = (userId: string) => {
    setDeletingUserId(userId)
  }

  const confirmDelete = () => {
    if (!deletingUserId) return

    startTransition(async () => {
      const result = await removePosUser(deletingUserId)
      if (result.success) {
        setUsers(users.filter((u) => u.id !== deletingUserId))
        toast.success("POS user deleted successfully")
      } else {
        toast.error(result.error || "Failed to delete POS user")
      }
      setDeletingUserId(null)
    })
  }

  const handleUserSaved = (savedUser: PosUser) => {
    if (editingUser) {
      // Update existing user
      setUsers(users.map((u) => (u.id === savedUser.id ? savedUser : u)))
    } else {
      // Add new user
      setUsers([...users, savedUser])
    }
    setIsDialogOpen(false)
    setEditingUser(null)
  }

  const getPrivilegeCount = (privileges: PosUser["privileges"]) => {
    return Object.values(privileges).filter((v) => v === true).length
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>POS Users</CardTitle>
            <Button onClick={handleCreate} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create POS User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCog className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No POS users created yet</p>
              <p className="text-sm mt-2">Click "Create POS User" to add a new POS user</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">{user.name || user.email}</h3>
                      {user.is_active ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {getPrivilegeCount(user.privileges)} privilege(s) assigned
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AdminPosUserDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        user={editingUser}
        onUserSaved={handleUserSaved}
      />

      <AlertDialog open={deletingUserId !== null} onOpenChange={(open) => !open && setDeletingUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete POS User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this POS user? This action cannot be undone. Make sure the user has no sub-users first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isPending} className="bg-destructive text-destructive-foreground">
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
