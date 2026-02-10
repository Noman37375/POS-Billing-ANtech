"use client"

import { LogOut, Moon, Sun } from "lucide-react"
import { adminSignOut } from "@/app/admin/login/actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

interface AdminHeaderProps {
  adminEmail: string
}

export function AdminHeader({ adminEmail }: AdminHeaderProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <header className="bg-card/80 backdrop-blur border-b border-border h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-sm">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center overflow-hidden shadow-sm bg-white flex-shrink-0">
          <Image src="/placeholder-logo.png" alt="Logo" width={44} height={44} className="object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm sm:text-lg font-semibold text-foreground leading-snug truncate">Admin Panel</h1>
          <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">POS User Management</p>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="hidden sm:flex h-9 w-9"
        >
          {mounted ? (
            theme === "dark" ? (
              <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            ) : (
              <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            )
          ) : (
            <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          )}
        </Button>
        <Badge variant="secondary" className="hidden lg:inline-flex text-xs">
          {adminEmail}
        </Badge>
        <form action={adminSignOut}>
          <Button variant="ghost" size="icon" type="submit" aria-label="Sign out" className="h-9 w-9 sm:h-10 sm:w-10">
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          </Button>
        </form>
      </div>
    </header>
  )
}
