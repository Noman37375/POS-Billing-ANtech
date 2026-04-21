"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateHardwareSettings } from "@/app/(app)/settings/actions"
import type { AppSettings } from "@/app/(app)/settings/actions"
import { toast } from "sonner"

export function HardwareForm({ settings }: { settings: AppSettings }) {
  const [printerType, setPrinterType] = useState(settings.hw_printer_type ?? "none")
  const [printerIp, setPrinterIp] = useState(settings.hw_printer_ip ?? "")
  const [printerPort, setPrinterPort] = useState(settings.hw_printer_port ?? "9100")
  const [cashDrawer, setCashDrawer] = useState(settings.hw_cash_drawer === "true")
  const [barcodePrefix, setBarcodePrefix] = useState(settings.hw_barcode_prefix ?? "")
  const [barcodeSuffix, setBarcodeSuffix] = useState(settings.hw_barcode_suffix ?? "")
  const [pending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateHardwareSettings({
        hw_printer_type: printerType,
        hw_printer_ip: printerIp,
        hw_printer_port: printerPort,
        hw_cash_drawer: cashDrawer,
        hw_barcode_prefix: barcodePrefix,
        hw_barcode_suffix: barcodeSuffix,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Hardware settings saved")
      }
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Receipt Printer</CardTitle>
          <CardDescription>Configure your thermal or network printer connection.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Printer Type</Label>
            <Select value={printerType} onValueChange={setPrinterType}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (No printer)</SelectItem>
                <SelectItem value="usb">USB Printer</SelectItem>
                <SelectItem value="network">Network Printer (IP)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {printerType === "network" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="printerIp">Printer IP Address</Label>
                <Input
                  id="printerIp"
                  value={printerIp}
                  onChange={(e) => setPrinterIp(e.target.value)}
                  placeholder="e.g. 192.168.1.100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="printerPort">Port</Label>
                <Input
                  id="printerPort"
                  value={printerPort}
                  onChange={(e) => setPrinterPort(e.target.value)}
                  placeholder="9100"
                />
                <p className="text-xs text-muted-foreground">Default port for ESC/POS printers is 9100</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cash Drawer</CardTitle>
          <CardDescription>Auto-open cash drawer on cash sales.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Enable Cash Drawer</Label>
              <p className="text-xs text-muted-foreground">
                Opens cash drawer automatically after each cash payment
              </p>
            </div>
            <Switch checked={cashDrawer} onCheckedChange={setCashDrawer} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Barcode Scanner</CardTitle>
          <CardDescription>Configure scanner prefix/suffix if your scanner adds extra characters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="barcodePrefix">Prefix (optional)</Label>
              <Input
                id="barcodePrefix"
                value={barcodePrefix}
                onChange={(e) => setBarcodePrefix(e.target.value)}
                placeholder="Characters before barcode"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcodeSuffix">Suffix (optional)</Label>
              <Input
                id="barcodeSuffix"
                value={barcodeSuffix}
                onChange={(e) => setBarcodeSuffix(e.target.value)}
                placeholder="Characters after barcode"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Leave blank if your scanner sends clean barcodes (most do)
          </p>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={pending}>
        {pending ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  )
}
