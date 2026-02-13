"use client"

import { useState } from "react"
import { useActionState } from "react"
import { signIn } from "@/app/(auth)/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { AlertCircle, Eye, EyeOff } from "lucide-react"

const initialState = { error: "" }

export function AuthForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [state, formAction, pending] = useActionState(async (_prev, formData) => {
    const result = await signIn(formData)
    if (result?.error) {
      return { error: result.error }
    }
    return initialState
  }, initialState)

  return (
    <Card className="border-border shadow-lg shadow-black/5">
      <CardHeader className="space-y-1 pb-6">
        <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to manage your invoices</p>
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
              placeholder="you@business.com"
              required
              className="h-11 bg-background border-border focus:border-primary focus:ring-primary/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground font-medium">
              Password
            </Label>
            <div className="relative">
              <Input
                name="password"
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                minLength={6}
                required
                className="h-11 bg-background border-border focus:border-primary focus:ring-primary/20 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-11 w-10 rounded-l-none text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={pending}>
            {pending ? "Please wait..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

