"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

export function ThemeSync({ theme }: { theme: string }) {
  const { setTheme } = useTheme()
  useEffect(() => {
    setTheme(theme)
  }, [theme, setTheme])
  return null
}
