"use client"

import { useState } from "react"
import { Keyboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ShortcutItem {
  keys: string[]
  description: string
  context?: string
}

interface ShortcutCategory {
  title: string
  shortcuts: ShortcutItem[]
}

const shortcutCategories: ShortcutCategory[] = [
  {
    title: "POS - Point of Sale",
    shortcuts: [
      {
        keys: ["F3"],
        description: "Focus on item search field",
        context: "Press anytime to quickly jump to the item search input",
      },
      {
        keys: ["F7"],
        description: "Print last invoice",
        context: "After completing a sale, press to open print dialog",
      },
      {
        keys: ["Shift", "→"],
        description: "Move to next input field",
        context: "Customer → Tax Rate → Item → Quantity → Add Button",
      },
      {
        keys: ["Shift", "←"],
        description: "Move to previous input field",
        context: "Navigate backwards through form fields",
      },
      {
        keys: ["Shift", "↑/↓"],
        description: "Navigate between input fields",
        context: "Up/Down arrows work the same as left/right",
      },
      {
        keys: ["↑", "↓"],
        description: "Navigate dropdown options",
        context: "Use in Customer or Item search dropdowns",
      },
      {
        keys: ["Enter"],
        description: "Select highlighted option",
        context: "Confirm selection in dropdown menus",
      },
      {
        keys: ["Escape"],
        description: "Close dropdown",
        context: "Dismiss the search dropdown without selecting",
      },
    ],
  },
  {
    title: "General Navigation",
    shortcuts: [
      {
        keys: ["Tab"],
        description: "Move to next focusable element",
        context: "Standard browser navigation",
      },
      {
        keys: ["Shift", "Tab"],
        description: "Move to previous focusable element",
        context: "Reverse tab navigation",
      },
    ],
  },
]

function ShortcutKey({ children }: { children: string }) {
  return (
    <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded-md shadow-sm min-w-[28px] text-center inline-block">
      {children}
    </kbd>
  )
}

export function ShortcutsDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-4 py-3 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Keyboard className="w-5 h-5" />
          <span className="font-medium">Keyboard Shortcuts</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            These shortcuts help you use the app faster and more efficiently. Keyboard navigation is quicker than using a mouse!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {shortcutCategories.map((category) => (
            <div key={category.title} className="space-y-3">
              <h3 className="font-semibold text-base border-b pb-2">{category.title}</h3>
              <div className="space-y-3">
                {category.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-1 min-w-[120px] flex-shrink-0">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center gap-1">
                          <ShortcutKey>{key}</ShortcutKey>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground text-xs">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{shortcut.description}</p>
                      {shortcut.context && (
                        <p className="text-xs text-muted-foreground mt-0.5">{shortcut.context}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            💡 Tip: Learning these shortcuts can make your workflow 2x faster!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
