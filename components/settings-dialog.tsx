"use client"

import { useState, useEffect } from "react"
import { Settings, Receipt, DollarSign, Bell, Download, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "next-themes"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { useCurrency } from "@/contexts/currency-context"

export function SettingsDialog() {
  const [open, setOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const { currency, setCurrency } = useCurrency()
  const [defaultTaxRate, setDefaultTaxRate] = useState(18)
  const [notifications, setNotifications] = useState(true)

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setDefaultTaxRate(Number(localStorage.getItem("defaultTaxRate")) || 18)
      setNotifications(localStorage.getItem("notifications") !== "false")
    }
  }, [])

  const handleSave = () => {
    // Here you can save settings to localStorage or database
    localStorage.setItem("defaultTaxRate", defaultTaxRate.toString())
    localStorage.setItem("notifications", notifications.toString())
    // Currency is already saved by the context when setCurrency is called

    toast.success("Settings saved successfully!")
    setOpen(false)
  }

  const handleExport = () => {
    toast.info("Export functionality coming soon!")
  }

  const handleImport = () => {
    toast.info("Import functionality coming soon!")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Application Settings
          </DialogTitle>
          <DialogDescription>Manage your application preferences and settings.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">

          {/* Invoice Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Invoice Settings</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultTaxRate">Default Tax Rate (%)</Label>
                <Input
                  id="defaultTaxRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={defaultTaxRate}
                  onChange={(e) => setDefaultTaxRate(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={(value) => setCurrency(value as "PKR" | "USD" | "EUR" | "GBP")}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PKR">PKR - Pakistani Rupee</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Appearance */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Appearance</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select value={theme || "light"} onValueChange={(value) => setTheme(value as "light" | "dark")}>
                <SelectTrigger id="theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Notifications</h3>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive email alerts for important events</p>
              </div>
              <Switch id="notifications" checked={notifications} onCheckedChange={setNotifications} />
            </div>
          </div>

          <Separator />

          {/* Data Management */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Data Management</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" onClick={handleExport} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button variant="outline" onClick={handleImport} className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Import Data
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

