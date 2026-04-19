"use client"

import { useState, useTransition, useEffect } from "react"
import { setUserPrintFormat, setStoreSettings } from "@/app/(app)/pos/actions"
import type { PrintFormat, StoreSettings } from "@/app/(app)/pos/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { useTheme } from "next-themes"
import { Receipt, Palette, Bell, Database, Download, Upload, MapPin } from "lucide-react"

interface ComprehensivePOSSettingsProps {
  defaultFormat: PrintFormat
  defaultStoreSettings: StoreSettings
}

export function ComprehensivePOSSettings({
  defaultFormat,
  defaultStoreSettings,
}: ComprehensivePOSSettingsProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [format, setFormat] = useState<PrintFormat>(defaultFormat)
  const [storeName, setStoreName] = useState(defaultStoreSettings.name || "")
  const [storeAddress, setStoreAddress] = useState(defaultStoreSettings.address || "")
  const [storePhone, setStorePhone] = useState(defaultStoreSettings.phone || "")
  const [storeEmail, setStoreEmail] = useState(defaultStoreSettings.email || "")
  const [defaultTaxRate, setDefaultTaxRate] = useState(18)
  const [notifications, setNotifications] = useState(true)
  const [pending, startTransition] = useTransition()

  // Load settings from localStorage on mount
  useEffect(() => {
    setMounted(true)
    if (typeof window !== "undefined") {
      setDefaultTaxRate(Number(localStorage.getItem("defaultTaxRate")) || 18)
      setNotifications(localStorage.getItem("notifications") !== "false")
    }
  }, [])

  const handleSave = () => {
    startTransition(async () => {
      // Save POS print format
      const formatResult = await setUserPrintFormat(format)
      if (formatResult.error) {
        toast.error(formatResult.error)
        return
      }

      // Save store settings
      const storeResult = await setStoreSettings({
        name: storeName,
        address: storeAddress || undefined,
        phone: storePhone || undefined,
        email: storeEmail || undefined,
      })
      if (storeResult.error) {
        toast.error(storeResult.error)
        return
      }

      // Save application settings to localStorage
      localStorage.setItem("defaultTaxRate", defaultTaxRate.toString())
      localStorage.setItem("notifications", notifications.toString())

      toast.success("All settings saved successfully!")
    })
  }

  const handleExport = () => {
    toast.info("Export functionality coming soon!")
  }

  const handleImport = () => {
    toast.info("Import functionality coming soon!")
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* POS SETTINGS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Print Format</h3>
        </div>
        <div className="space-y-2">
          <Label>Default invoice print format</Label>
          <Select
            value={format}
            onValueChange={(v) => setFormat(v as PrintFormat)}
            disabled={pending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pos_ncr">NCR Carbon Copy (80mm)</SelectItem>
              <SelectItem value="a4">A4 (Full Page)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            <strong>NCR Carbon Copy:</strong> 80mm receipt — prints 2 copies (Original + Duplicate)
            <br />
            <strong>A4:</strong> Full-size A4 document — opens browser print dialog
          </p>
        </div>
      </div>

      <Separator />

      {/* STORE INFORMATION */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Store Information</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Store details will appear on printed invoices and receipts.
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="store-name">Store Name *</Label>
            <Input
              id="store-name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Your Store Name"
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="store-address">Address</Label>
            <Input
              id="store-address"
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              placeholder="123 Business Street, City, State 12345"
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="store-phone">Phone</Label>
            <Input
              id="store-phone"
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
              placeholder="Tel: (555) 123-4567"
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="store-email">Email</Label>
            <Input
              id="store-email"
              type="email"
              value={storeEmail}
              onChange={(e) => setStoreEmail(e.target.value)}
              placeholder="contact@yourstore.com"
              disabled={pending}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* INVOICE SETTINGS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Invoice Settings</h3>
        </div>
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
            disabled={pending}
            className="max-w-xs"
          />
        </div>
      </div>

      <Separator />

      {/* APPEARANCE SETTINGS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Appearance</h3>
        </div>
        <div className="space-y-2">
          <Label htmlFor="theme">Theme</Label>
          <Select
            value={theme || "light"}
            onValueChange={(value) => setTheme(value as "light" | "dark")}
            disabled={pending || !mounted}
          >
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

      {/* NOTIFICATIONS */}
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
          <Switch
            id="notifications"
            checked={notifications}
            onCheckedChange={setNotifications}
            disabled={pending}
          />
        </div>
      </div>

      <Separator />

      {/* DATA MANAGEMENT */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Data Management</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button variant="outline" onClick={handleExport} disabled={pending}>
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          <Button variant="outline" onClick={handleImport} disabled={pending}>
            <Upload className="w-4 h-4 mr-2" />
            Import Data
          </Button>
        </div>
      </div>

      {/* SAVE BUTTON */}
      <div className="pt-4 border-t">
        <Button onClick={handleSave} disabled={pending} size="lg">
          {pending ? "Saving…" : "Save All Settings"}
        </Button>
      </div>
    </div>
  )
}
