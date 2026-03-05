import type { ReactNode } from "react"
import { ReceiptText } from "lucide-react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen grid md:grid-cols-[1fr_1fr]">

      {/* Left Panel — Brand visual only, no text clutter */}
      <div className="hidden md:flex flex-col items-center justify-center bg-gradient-to-br from-primary via-primary to-primary/80 relative overflow-hidden">

        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full border border-white/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full border border-white/10" />

        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center text-center text-primary-foreground space-y-5">
          <div className="w-20 h-20 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl">
            <ReceiptText className="w-10 h-10 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight">AN-Tech POS</p>
            <p className="text-sm opacity-60 mt-1 font-medium tracking-widest uppercase">Billing System</p>
          </div>
        </div>

        {/* Bottom tag */}
        <p className="absolute bottom-8 text-xs text-white/30 tracking-wider">
          AN-Tech Solutions
        </p>
      </div>

      {/* Right Panel — Pure form, nothing else */}
      <div className="flex items-center justify-center bg-background px-8 py-12">
        <div className="w-full max-w-[360px]">
          {children}
        </div>
      </div>

    </div>
  )
}
