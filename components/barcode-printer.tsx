"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Printer } from "lucide-react"
import jsPDF from "jspdf"
import JsBarcode from "jsbarcode"

interface Item {
  id: string
  name: string
  barcode?: string | null
  stock?: number
  unitPrice?: number
}

interface BarcodePrinterProps {
  itemsWithBarcode: Item[]
}

export function BarcodePrinter({ itemsWithBarcode }: BarcodePrinterProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
  }

  const handlePrint = () => {
    if (selectedItems.size === 0) {
      return
    }

    const selected = itemsWithBarcode.filter((item) => selectedItems.has(item.id))
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const labelWidth = 50
    const labelHeight = 25
    const margin = 10
    const spacing = 5

    let x = margin
    let y = margin
    let itemsPerPage = 0
    const maxItemsPerPage = Math.floor((pageHeight - 2 * margin) / (labelHeight + spacing))

    selected.forEach((item, index) => {
      if (!item.barcode) return // Skip items without barcode
      
      if (itemsPerPage >= maxItemsPerPage) {
        doc.addPage()
        x = margin
        y = margin
        itemsPerPage = 0
      }

      // Create canvas for barcode
      const canvas = document.createElement("canvas")
      JsBarcode(canvas, item.barcode, {
        format: "CODE128",
        width: 2,
        height: 40,
        displayValue: true,
      })

      const imgData = canvas.toDataURL("image/png")
      const imgWidth = labelWidth - 10
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      // Add barcode image
      doc.addImage(imgData, "PNG", x + 5, y, imgWidth, imgHeight)

      // Add item name
      doc.setFontSize(8)
      doc.text(item.name.substring(0, 20), x + labelWidth / 2, y + imgHeight + 5, {
        align: "center",
        maxWidth: labelWidth - 5,
      })

      // Move to next position
      x += labelWidth + spacing
      if (x + labelWidth > pageWidth - margin) {
        x = margin
        y += labelHeight + spacing
        itemsPerPage++
      }
    })

    doc.save("barcode-labels.pdf")
    setSelectedItems(new Set())
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Print Barcode Labels</CardTitle>
          {selectedItems.size > 0 && (
            <Button onClick={handlePrint} size="sm">
              <Printer className="w-4 h-4 mr-2" />
              Print {selectedItems.size} Label(s)
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {itemsWithBarcode.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {itemsWithBarcode.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-2 flex-1">
                  <Checkbox checked={selectedItems.has(item.id)} onCheckedChange={() => toggleItem(item.id)} />
                  <span className="font-medium">{item.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{item.barcode || "N/A"}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">No items with barcodes found.</div>
        )}
      </CardContent>
    </Card>
  )
}
