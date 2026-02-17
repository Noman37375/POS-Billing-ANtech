"use client"

import { useEffect, useRef, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { lookupItemByBarcode } from "@/app/(app)/stock-management/barcode/actions"
import { toast } from "sonner"

/**
 * Global barcode scanner listener.
 * Detects rapid keypress patterns (barcode scanners type much faster than humans).
 * Works even when focus is inside input fields — clears the garbage text from the input after detection.
 * On successful scan:
 *   - If already on /pos page: dispatches a custom "pos-barcode-scan" event for the POS form to handle directly.
 *   - If on any other page: redirects to /pos?itemId=X&autoAdd=true
 * Disabled on /stock-management/barcode page so manual barcode entry is not interrupted.
 */
export function BarcodeScanToPOS() {
  const router = useRouter()
  const pathname = usePathname()
  const bufferRef = useRef("")
  const lastKeyTimeRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const keyTimestamps = useRef<number[]>([])

  const isStockManagement = pathname?.startsWith("/stock-management")
  const isOnPOS = pathname === "/pos"

  const handleBarcodeLookup = useCallback(
    async (barcode: string, inputEl: HTMLInputElement | null) => {
      const result = await lookupItemByBarcode(barcode)
      if (result.error || !result.item) {
        toast.error(`Item not found for barcode: ${barcode}`)
        return
      }

      // If we're already on the POS page, dispatch a custom event so the form can add the item directly
      if (isOnPOS) {
        window.dispatchEvent(
          new CustomEvent("pos-barcode-scan", {
            detail: { itemId: result.item.id, itemName: result.item.name },
          })
        )
      } else {
        // Navigate to POS with the item
        router.push(`/pos?itemId=${encodeURIComponent(result.item.id)}&autoAdd=true`)
      }
    },
    [isOnPOS, router]
  )

  useEffect(() => {
    if (isStockManagement) return

    const handleKeyPress = (e: KeyboardEvent) => {
      const now = Date.now()
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable

      if (e.key === "Enter") {
        const barcode = bufferRef.current.trim()
        const timestamps = keyTimestamps.current

        // Reset
        bufferRef.current = ""
        keyTimestamps.current = []
        if (timeoutRef.current) clearTimeout(timeoutRef.current)

        // Need at least 3 chars typed rapidly to consider it a barcode scan
        if (barcode.length >= 3 && timestamps.length >= 3) {
          // Calculate average time between keypresses
          let totalGap = 0
          for (let i = 1; i < timestamps.length; i++) {
            totalGap += timestamps[i] - timestamps[i - 1]
          }
          const avgGap = totalGap / (timestamps.length - 1)

          // Barcode scanners typically have < 50ms between keys; humans are > 100ms
          if (avgGap < 60) {
            e.preventDefault()
            e.stopPropagation()

            // If the barcode was typed into an input field, clear it
            if (isInput && target.tagName === "INPUT") {
              const inputEl = target as HTMLInputElement
              // Remove the barcode text that was accidentally typed
              const currentVal = inputEl.value
              if (currentVal.endsWith(barcode)) {
                inputEl.value = currentVal.slice(0, -barcode.length)
                // Trigger React's onChange
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                  window.HTMLInputElement.prototype,
                  "value"
                )?.set
                nativeInputValueSetter?.call(inputEl, currentVal.slice(0, -barcode.length))
                inputEl.dispatchEvent(new Event("input", { bubbles: true }))
              }
            }

            handleBarcodeLookup(barcode, isInput ? (target as HTMLInputElement) : null)
            return
          }
        }
        // Not a barcode scan — let Enter pass through normally
        return
      }

      // Track single character keys (not modifier combos)
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const elapsed = now - lastKeyTimeRef.current

        if (elapsed > 300) {
          // Long gap — start fresh buffer
          bufferRef.current = e.key
          keyTimestamps.current = [now]
        } else {
          bufferRef.current += e.key
          keyTimestamps.current.push(now)
        }

        lastKeyTimeRef.current = now

        // Clear buffer after inactivity
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
          bufferRef.current = ""
          keyTimestamps.current = []
        }, 300)
      }
    }

    // Use capture phase to intercept before input fields process the Enter key
    window.addEventListener("keydown", handleKeyPress, true)
    return () => {
      window.removeEventListener("keydown", handleKeyPress, true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [isStockManagement, handleBarcodeLookup])

  return null
}
