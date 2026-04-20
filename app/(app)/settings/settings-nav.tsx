"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_ITEMS = [
  { href: "/settings/store", label: "Store Profile" },
  { href: "/settings/invoice", label: "Invoice & Receipt" },
  { href: "/settings/tax", label: "Tax & Finance" },
  { href: "/settings/pos", label: "POS Preferences" },
  { href: "/settings/appearance", label: "Appearance" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/advanced", label: "Advanced Settings" },
]

export function SettingsNav() {
  const pathname = usePathname()
  return (
    <aside className="w-52 flex-shrink-0">
      <nav className="space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
