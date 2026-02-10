"use client"

import { useActionState } from "react"
import { adminSignIn } from "@/app/admin/login/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

const initialState = { error: "" }

export function AdminAuthForm() {
  const [state, formAction, pending] = useActionState(async (_prev, formData) => {
    const result = await adminSignIn(formData)
    if (result?.error) {
      return { error: result.error }
    }
    return initialState
  }, initialState)

  return (
    <Card className="border-border shadow-lg shadow-black/5">
      <CardHeader className="space-y-1 pb-6">
        <h1 className="text-3xl font-bold text-foreground">Admin Login</h1>
        <p className="text-sm text-muted-foreground">Sign in to manage POS users</p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          {state.error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <AlertCircle className="w-4 h-4" />
              <span>{state.error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground font-medium">
              Email
            </Label>
            <Input
              name="email"
              id="email"
              type="email"
              placeholder="admin@example.com"
              required
              className="h-11 bg-background border-border focus:border-primary focus:ring-primary/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground font-medium">
              Password
            </Label>
            <Input
              name="password"
              id="password"
              type="password"
              placeholder="••••••••"
              minLength={6}
              required
              className="h-11 bg-background border-border focus:border-primary focus:ring-primary/20"
            />
          </div>

          <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={pending}>
            {pending ? "Please wait..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
