"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { lookupItemByBarcode } from "@/app/(app)/stock-management/barcode/actions"

/**
 * Listens for barcode scanner input when focus is not in an input/textarea.
 * On scan (rapid keypress + Enter), looks up item by barcode and redirects to New Sale with item selected.
 */
export function BarcodeScanToPOS() {
  const router = useRouter()
  const bufferRef = useRef("")
  const lastKeyTimeRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable
      if (isInput) return

      const now = Date.now()
      if (e.key === "Enter") {
        const barcode = bufferRef.current.trim()
        bufferRef.current = ""
        if (barcode.length >= 2) {
          e.preventDefault()
          lookupItemByBarcode(barcode).then((result) => {
            if (!result.error && result.item) {
              router.push(`/pos?itemId=${encodeURIComponent(result.item.id)}`)
            }
          })
        }
        return
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const elapsed = now - lastKeyTimeRef.current
        if (elapsed > 80) bufferRef.current = e.key
        else bufferRef.current += e.key
        lastKeyTimeRef.current = now
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
          bufferRef.current = ""
        }, 120)
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => {
      window.removeEventListener("keydown", handleKeyPress)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [router])

  return null
}
