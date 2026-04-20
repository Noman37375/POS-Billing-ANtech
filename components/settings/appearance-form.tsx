"use client"

import { useState, useTransition } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateAppearance } from "@/app/(app)/settings/actions"
import type { AppSettings } from "@/app/(app)/settings/actions"
import { toast } from "sonner"

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
]

export function AppearanceForm({ settings }: { settings: AppSettings }) {
  const [selectedTheme, setSelectedTheme] = useState(settings.theme ?? "system")
  const [pending, startTransition] = useTransition()
  const { setTheme } = useTheme()

  const handleSave = () => {
    startTransition(async () => {
      setTheme(selectedTheme)
      const result = await updateAppearance(selectedTheme)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Appearance saved")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose how the app looks. Saved to your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Theme</Label>
          <div className="flex gap-3">
            {THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setSelectedTheme(t.value)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  selectedTheme === t.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted border-border"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  )
}
