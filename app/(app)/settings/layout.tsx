import { ReactNode } from "react"
import { SettingsNav } from "./settings-nav"

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Manage your store and application preferences.
        </p>
      </div>
      <div className="flex gap-6">
        <SettingsNav />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}
