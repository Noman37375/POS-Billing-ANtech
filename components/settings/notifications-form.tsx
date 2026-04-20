"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateNotifications } from "@/app/(app)/settings/actions"
import type { AppSettings } from "@/app/(app)/settings/actions"
import { toast } from "sonner"

export function NotificationsForm({ settings }: { settings: AppSettings }) {
  const [threshold, setThreshold] = useState(settings.low_stock_threshold ?? "10")
  const [emailNotifications, setEmailNotifications] = useState(
    settings.email_notifications === "true"
  )
  const [pending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateNotifications({
        low_stock_threshold: threshold,
        email_notifications: emailNotifications,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Notification settings saved")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Configure alerts and notification preferences.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="threshold">Low Stock Alert Threshold</Label>
          <Input
            id="threshold"
            type="number"
            min="0"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="w-32"
          />
          <p className="text-xs text-muted-foreground">
            Alert when stock falls below this quantity
          </p>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div>
            <Label className="font-medium">Email Notifications</Label>
            <p className="text-xs text-muted-foreground">
              Receive email alerts for important events
            </p>
          </div>
          <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
        </div>

        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  )
}
