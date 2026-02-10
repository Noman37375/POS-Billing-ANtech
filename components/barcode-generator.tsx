"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Pencil, Check, X } from "lucide-react"

interface Item {
  id: string
  name: string
  barcode?: string | null
}

interface BarcodeGeneratorProps {
  itemsWithoutBarcode: Array<{ id: string; name: string }>
  itemsWithBarcode: Item[]
  onGenerate: (itemId: string) => void
  onBulkGenerate: (itemIds: string[]) => void
  onUpdateBarcode?: (itemId: string, newBarcode: string) => void
  isPending: boolean
}

export function BarcodeGenerator({
  itemsWithoutBarcode,
  itemsWithBarcode,
  onGenerate,
  onBulkGenerate,
  onUpdateBarcode,
  isPending,
}: BarcodeGeneratorProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>("")
  const inputRef = useRef<HTMLInputElement>(null)

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
  }

  const handleBulkGenerate = () => {
    if (selectedItems.size > 0) {
      onBulkGenerate(Array.from(selectedItems))
      setSelectedItems(new Set())
    }
  }

  const handleStartEdit = (item: Item) => {
    setEditingItemId(item.id)
    setEditValue(item.barcode || "")
    // Focus input after state update
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
  }

  const handleSaveEdit = () => {
    if (editingItemId && onUpdateBarcode && editValue.trim()) {
      onUpdateBarcode(editingItemId, editValue.trim())
      setEditingItemId(null)
      setEditValue("")
    }
  }

  const handleCancelEdit = () => {
    setEditingItemId(null)
    setEditValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveEdit()
    } else if (e.key === "Escape") {
      handleCancelEdit()
    }
  }

  // Focus input when editing starts
  useEffect(() => {
    if (editingItemId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingItemId])

  // Handle hardware scanner (keyboard input) when editing
  useEffect(() => {
    if (!editingItemId || !inputRef.current) return

    // Listen for rapid input (typical of barcode scanners)
    // Barcode scanners send characters very quickly followed by Enter
    let inputBuffer = ""
    let lastKeyTime = 0
    let isScannerInput = false
    let timeout: NodeJS.Timeout

    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle if we're in edit mode and input is focused
      if (document.activeElement !== inputRef.current) return

      const currentTime = Date.now()

      if (e.key === "Enter") {
        // If scanner input detected (rapid input), auto-fill and save
        if (isScannerInput && inputBuffer.trim()) {
          setEditValue(inputBuffer.trim())
          // Small delay to ensure state is updated, then save
          setTimeout(() => {
            if (editingItemId && onUpdateBarcode) {
              onUpdateBarcode(editingItemId, inputBuffer.trim())
              setEditingItemId(null)
              setEditValue("")
            }
          }, 50)
          e.preventDefault()
          e.stopPropagation()
          inputBuffer = ""
          isScannerInput = false
          return
        }
        // If manual typing, let handleKeyDown handle it (don't prevent default)
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Only capture printable characters, not shortcuts
        const timeSinceLastKey = currentTime - lastKeyTime

        // If more than 50ms passed, reset buffer (user typing manually)
        // If less than 50ms, likely a scanner (very fast input)
        if (timeSinceLastKey > 50) {
          inputBuffer = e.key
          isScannerInput = false // Manual typing detected
        } else {
          inputBuffer += e.key
          isScannerInput = true // Rapid input = scanner
          // Update input value in real-time for scanner input
          if (inputRef.current) {
            inputRef.current.value = inputBuffer
            setEditValue(inputBuffer)
          }
        }

        lastKeyTime = currentTime

        clearTimeout(timeout)
        timeout = setTimeout(() => {
          inputBuffer = ""
          isScannerInput = false
        }, 100) // Reset if no input for 100ms
      }
    }

    window.addEventListener("keypress", handleKeyPress)
    return () => {
      window.removeEventListener("keypress", handleKeyPress)
      clearTimeout(timeout)
    }
  }, [editingItemId, onUpdateBarcode])

  return (
    <div className="space-y-4">
      {/* Items without barcode */}
      {itemsWithoutBarcode.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Items Without Barcode</CardTitle>
              {selectedItems.size > 0 && (
                <Button onClick={handleBulkGenerate} disabled={isPending} size="sm">
                  Generate {selectedItems.size} Barcode(s)
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {itemsWithoutBarcode.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-2 flex-1">
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                    />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onGenerate(item.id)}
                    disabled={isPending}
                  >
                    Generate
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items with barcode */}
      {itemsWithBarcode.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Items With Barcode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {itemsWithBarcode.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 border rounded-lg gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{item.name}</span>
                  </div>
                  {editingItemId === item.id ? (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="h-7 w-32 text-xs"
                        disabled={isPending}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleSaveEdit}
                        disabled={isPending || !editValue.trim()}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleCancelEdit}
                        disabled={isPending}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="secondary" className="font-mono text-xs max-w-[200px] truncate">
                        {item.barcode}
                      </Badge>
                      {onUpdateBarcode && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleStartEdit(item)}
                          disabled={isPending}
                          title="Edit barcode"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {itemsWithoutBarcode.length === 0 && itemsWithBarcode.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No inventory items found.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
